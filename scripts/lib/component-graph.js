const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const nativeTags = new Set(('ad ad-custom audio block button camera canvas channel-live channel-video checkbox checkbox-group cover-image cover-view editor ' +
  'form functional-page-navigator icon image import include input keyboard-accessory label live-player live-pusher map match-media movable-area movable-view ' +
  'navigation-bar navigator official-account open-container open-data page-container page-meta picker picker-view picker-view-column progress radio radio-group ' +
  'rich-text root-portal scroll-view share-element slider snapshot span sticky-header sticky-section swiper swiper-item switch template text textarea video view ' +
  'voip-room web-view wxs slot').split(/\s+/));

function componentDefinition(filename) {
  const definitions = [];
  const context = {
    Component(definition) { definitions.push(definition); },
    require: createRequire(filename),
    module: { exports: {} },
    exports: {},
    wx: {},
    getApp() { return { globalData: {} }; },
    console
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename, timeout: 1000 });
  if (definitions.length !== 1 || !definitions[0] || typeof definitions[0] !== 'object') {
    throw new Error('expected exactly one Component({...}) registration');
  }
  return definitions[0];
}

function inspectComponentGraph(root) {
  root = path.resolve(root);
  const errors = [];
  const components = new Map();
  const checkedTemplates = new Set();
  const relative = filename => path.relative(root, filename).replace(/\\/g, '/');
  const readConfig = filename => {
    try { return JSON.parse(fs.readFileSync(filename, 'utf8')); }
    catch (error) { errors.push(relative(filename) + ': ' + error.message); return {}; }
  };
  const app = readConfig(path.join(root, 'app.json'));
  const globalAliases = app.usingComponents || {};

  function resolveComponent(owner, target) {
    return target.startsWith('/') ? path.join(root, target.slice(1)) : path.resolve(path.dirname(owner), target);
  }

  function inspectTemplate(base, config) {
    const filename = base + '.wxml';
    if (checkedTemplates.has(filename) || !fs.existsSync(filename)) return;
    checkedTemplates.add(filename);
    const aliases = Object.assign({}, globalAliases, config.usingComponents);
    const source = fs.readFileSync(filename, 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/<wxs\b[^>]*>[\s\S]*?<\/wxs>/g, '');
    for (const tag of new Set(Array.from(source.matchAll(/<([A-Za-z][\w:-]*)\b/g), match => match[1]))) {
      if (!nativeTags.has(tag) && !Object.hasOwn(aliases, tag) && !Object.hasOwn(config.componentGenerics || {}, tag)) {
        errors.push(relative(filename) + ': undeclared custom component <' + tag + '>');
      }
    }
  }

  function inspectDependencies(owner, config) {
    for (const [alias, target] of Object.entries(config.usingComponents || {})) {
      if (typeof target !== 'string' || !target) {
        errors.push(relative(owner) + ': invalid component path for ' + alias);
        continue;
      }
      const base = resolveComponent(owner, target);
      if (path.relative(root, base).startsWith('..' + path.sep) || base === root) {
        errors.push(relative(owner) + ': component escapes miniprogramRoot: ' + target);
        continue;
      }
      if (components.has(base)) continue;
      components.set(base, { route: relative(base), definition: null });
      let complete = true;
      for (const extension of ['.js', '.json', '.wxml', '.wxss']) {
        if (!fs.existsSync(base + extension)) {
          errors.push(relative(owner) + ': missing component file ' + relative(base + extension));
          complete = false;
        }
      }
      if (!complete) continue;
      const child = readConfig(base + '.json');
      if (child.component !== true) errors.push(relative(base + '.json') + ': component must be true');
      try { components.get(base).definition = componentDefinition(base + '.js'); }
      catch (error) { errors.push(relative(base + '.js') + ': component registration failed: ' + error.message); }
      inspectTemplate(base, child);
      inspectDependencies(base + '.json', child);
    }
  }

  inspectDependencies(path.join(root, 'app.json'), app);
  for (const route of app.pages || []) {
    const base = path.join(root, route);
    const config = readConfig(base + '.json');
    inspectTemplate(base, config);
    inspectDependencies(base + '.json', config);
  }
  return { errors, components, templates: checkedTemplates.size };
}

module.exports = { inspectComponentGraph, componentDefinition };
