// Source/component compiler checks complement the DevTools smoke test; they do not emulate its component loader.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { inspectComponentGraph, componentDefinition } = require('../scripts/lib/component-graph');
const root = path.resolve(__dirname, '../miniprogram');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'warm-brown-components-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  function write(filename, content) {
    const target = path.join(directory, filename);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  function component(route, config = { component: true }, source = 'Component({});', markup = '<view>Visible content</view>') {
    write(route + '.json', JSON.stringify(config));
    write(route + '.js', source);
    write(route + '.wxml', markup);
    write(route + '.wxss', '');
  }
  write('app.json', JSON.stringify({ pages: ['pages/home/index'] }));
  write('pages/home/index.json', JSON.stringify({ usingComponents: { 'home-card': '/components/home-card/index' } }));
  write('pages/home/index.wxml', '<home-card />');
  component('components/home-card/index');
  return { directory, write, component, inspect: () => inspectComponentGraph(directory) };
}

test('every referenced native component has its complete bundle and executes one Component registration', () => {
  const result = inspectComponentGraph(root);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(Array.from(result.components.values(), entry => entry.route).sort(), [
    'components/cart-sheet/index', 'components/home-cat/index', 'components/home-cloud/index',
    'components/home-dog/index', 'components/spec-sheet/index'
  ]);
});

test('component graph rejects incomplete bundles, incorrect component flags and missing registration', t => {
  const env = fixture(t);
  assert.deepEqual(env.inspect().errors, []);
  fs.unlinkSync(path.join(env.directory, 'components/home-card/index.js'));
  assert.match(env.inspect().errors.join('\n'), /missing component file components\/home-card\/index\.js/);
  env.component('components/home-card/index', { component: false }, 'const definition = {};');
  const errors = env.inspect().errors.join('\n');
  assert.match(errors, /component must be true/);
  assert.match(errors, /expected exactly one Component/);
});

test('component graph resolves nested dependencies relative to their owning component', t => {
  const env = fixture(t);
  env.component('components/home-card/index', { component: true, usingComponents: { 'nested-card': '../nested/index' } }, 'Component({});', '<nested-card />');
  assert.match(env.inspect().errors.join('\n'), /missing component file components\/nested\/index/);
  env.component('components/nested/index');
  assert.deepEqual(env.inspect().errors, []);
  assert.equal(env.inspect().components.size, 2);
  env.write('components/nested/index.wxml', '<missing-child />');
  assert.match(env.inspect().errors.join('\n'), /undeclared custom component <missing-child>/);
});

test('component graph reports execution failures before claiming a component is loadable', t => {
  const env = fixture(t);
  env.write('components/home-card/index.js', 'throw new Error("registration crashed");');
  assert.match(env.inspect().errors.join('\n'), /component registration failed: registration crashed/);
});

const compiler = path.resolve(__dirname, '../tools-cache/node_modules/miniprogram-compiler/bin',
  process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux',
  'wcc' + (process.platform === 'win32' ? '.exe' : ''));

test('official WXML compiler emits each home branch, its hero image and order buttons', { skip: !fs.existsSync(compiler) && 'optional official wcc compiler is not installed' }, () => {
  const themes = ['cat', 'cloud', 'dog'];
  const homeConfig = JSON.parse(fs.readFileSync(path.join(root, 'pages/home/index.json'), 'utf8'));
  const templates = ['pages/home/index.wxml', ...themes.map(theme => 'components/home-' + theme + '/index.wxml')];
  const aliases = Object.keys(homeConfig.usingComponents);
  const result = spawnSync(compiler, ['-d', '-cc', ['1', templates[0], aliases.length, ...aliases].join(' '), ...templates, '-gn', '$gwx'], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr);
  const warnings = [];
  const context = { window: {}, console: { log() {}, warn(message) { warnings.push(message); } } };
  vm.createContext(context);
  vm.runInContext(result.stdout, context, { timeout: 2000 });
  function descendants(node) {
    return !node || typeof node !== 'object' ? [] : [node, ...(node.children || []).flatMap(descendants)];
  }
  for (const theme of themes) {
    const homepage = context.$gwx(templates[0])({ ready: true, theme, member: { loggedIn: false } }, {});
    const homeNodes = descendants(homepage);
    assert.equal(homeNodes.filter(node => /^wx-home-/.test(node.tag)).length, 1, theme + ' selects one home component');
    assert.ok(homeNodes.some(node => node.tag === 'wx-home-' + theme), theme + ' selects its registered alias');
    const route = 'components/home-' + theme + '/index';
    const definition = componentDefinition(path.join(root, route + '.js'));
    const tree = context.$gwx(route + '.wxml')(Object.assign({}, definition.data, { loggedIn: false, nickname: '' }), {});
    const nodes = descendants(tree);
    assert.ok(nodes.some(node => node.tag === 'wx-image' && node.attr.src === '/assets/illustrations/' + theme + '-hero.png'), theme + ' renders its hero image');
    assert.ok(nodes.some(node => node.tag === 'wx-button' && node.attr.bindtap === 'order'), theme + ' renders order entry points');
    assert.match(JSON.stringify(tree), /门店自取|到店自取/, theme + ' renders visible service content');
  }
  assert.deepEqual(warnings, []);
});
