/* Regression verification against the user's running WeChat simulator.
 * Uses App.callFunction because this DevTools build can leave
 * App.getCurrentPage unresponsive after a failed component bootstrap.
 * Restores only the temporary cart/theme fields changed by this run.
 */
const fs = require('fs');
const path = require('path');
const Connection = require('../tools-cache/node_modules/miniprogram-automator/out/Connection').default;
const MiniProgram = require('../tools-cache/node_modules/miniprogram-automator/out/MiniProgram').default;

const OUT = path.resolve(__dirname, '../artifacts/screenshots');
const report = { kind: 'native-wechat-devtools-component-regression', startedAt: new Date().toISOString(), checks: [], screenshots: [], errors: [], console: [], automationLimitation: 'App.getCurrentPage hangs in this DevTools session; route, data, and real handlers are accessed with App.callFunction instead.' };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const bounded = (promise, label) => {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' exceeded 10 seconds')), 10000); })]).finally(() => clearTimeout(timer));
};

async function run() {
  let mini;
  let temporaryItem;
  let originalTheme;
  try {
    fs.mkdirSync(OUT, { recursive: true });
    const connection = await bounded(Connection.create('ws://127.0.0.1:' + (process.env.WECHAT_AUTO_PORT || '9420')), 'connect');
    mini = new MiniProgram(connection);
    mini.on('exception', value => report.errors.push({ phase: 'app', value }));
    mini.on('console', value => { if (report.console.length < 100) report.console.push(value); });
    const evaluate = (fn, ...args) => bounded(mini.evaluate(fn, ...args), 'App.callFunction');
    const state = () => evaluate(() => { const page = getCurrentPages().slice(-1)[0]; return { route: page.route, data: page.data }; });
    const go = async (method, route) => {
      await evaluate((method, route) => { wx[method]({ url: route }); return true; }, method, route);
      for (let i = 0; i < 15; i++) {
        await delay(200);
        const current = await state();
        if (current.route === route.replace(/^\//, '')) return current;
      }
      report.navigationFailure = await evaluate(() => ({ pages: getCurrentPages().map(page => ({ route: page.route, data: page.data })), interceptedErrors: globalThis.__nativeErrors || [], lastNavigation: globalThis.__nativeNavigation }));
      throw new Error('Navigation did not reach ' + route + '; page stack: ' + report.navigationFailure.pages.map(page => page.route).join(', '));
    };
    const shot = async name => {
      await delay(500);
      const target = path.join(OUT, name + '.png');
      await bounded(mini.screenshot({ path: target }), 'screenshot');
      const current = await state();
      report.screenshots.push({ name, path: target, route: current.route, size: fs.statSync(target).size });
      console.log('Screenshot:', name, current.route);
    };
    report.toolInfo = await bounded(connection.send('Tool.getInfo'), 'Tool.getInfo');
    await evaluate(() => {
      globalThis.__nativeErrors = [];
      if (!globalThis.__originalNativeConsoleError) globalThis.__originalNativeConsoleError = console.error;
      console.error = function (...args) {
        if (globalThis.__nativeErrors.length < 30) globalThis.__nativeErrors.push(args.map(value => value && typeof value === 'object' ? { message: value.message, stack: value.stack, errMsg: value.errMsg, keys: Object.getOwnPropertyNames(value) } : value));
        return globalThis.__originalNativeConsoleError.apply(console, args);
      };
    });
    report.runtime = await evaluate(() => ({ lazyCodeLoading: __wxConfig.lazyCodeLoading || null, componentTemplates: Object.keys(__wxAppCode__).filter(key => /^components\//.test(key) && /\.wxml$/.test(key)) }));
    if (report.runtime.lazyCodeLoading) throw new Error('Final runtime still has lazyCodeLoading enabled; compile the final app.json first.');
    report.systemInfo = await bounded(mini.systemInfo(), 'systemInfo');
    await go('switchTab', '/pages/home/index');
    originalTheme = (await state()).data.theme;

    for (const theme of ['cat', 'cloud', 'dog']) {
      await go('navigateTo', '/pages/themes/index');
      await evaluate(theme => getCurrentPages().slice(-1)[0].choose({ currentTarget: { dataset: { id: theme } } }), theme);
      const home = await go('switchTab', '/pages/home/index');
      await mini.callWxMethod('hideToast');
      if (!home.data.ready || home.data.theme !== theme) throw new Error('Home style handler failed for ' + theme);
      await shot('home-' + theme);
      report.checks.push({ check: 'native-home-style', theme, ready: home.data.ready, template: report.runtime.componentTemplates.includes('components/home-' + theme + '/index.wxml') });
    }

    const menu = await go('switchTab', '/pages/menu/index');
    const product = menu.data.products.find(item => item.stock > 0);
    if (!product) throw new Error('No available products in the existing fulfillment mode.');
    await evaluate(id => getCurrentPages().slice(-1)[0].openProduct({ currentTarget: { dataset: { id } } }), product.id);
    if ((await state()).data.product.id !== product.id) throw new Error('Product handler did not open the specification sheet.');
    await shot('product-options');
    report.checks.push({ check: 'native-specification-sheet', productId: product.id, requiredGroups: (product.specGroups || []).filter(group => group.required).length, template: report.runtime.componentTemplates.includes('components/spec-sheet/index.wxml') });

    const specs = {};
    (product.specGroups || []).forEach(group => { if (group.options.length) specs[group.id] = group.options[0].id; });
    const before = (await state()).data.cart;
    await evaluate((productId, specs) => getCurrentPages().slice(-1)[0].addProduct({ detail: { productId, specs, quantity: 1 } }), product.id, specs);
    const after = (await state()).data.cart;
    if (after.count !== before.count + 1) throw new Error('Native addProduct did not add exactly one item.');
    temporaryItem = { id: after.items.find(item => item.productId === product.id && JSON.stringify(item.specs) === JSON.stringify(specs)).id, before: before.items.map(item => ({ id: item.id, quantity: item.quantity })), count: before.count, subtotal: before.subtotal };
    await evaluate(() => getCurrentPages().slice(-1)[0].toggleCart());
    await mini.callWxMethod('hideToast');
    await shot('cart-sheet');
    report.checks.push({ check: 'native-cart-sheet', count: after.count, template: report.runtime.componentTemplates.includes('components/cart-sheet/index.wxml') });
    await evaluate(id => { const page = getCurrentPages().slice(-1)[0]; page.changeCart({ detail: { id, delta: -1 } }); page.closeCart(); }, temporaryItem.id);
    const restored = (await state()).data.cart;
    if (restored.count !== temporaryItem.count || restored.subtotal !== temporaryItem.subtotal || JSON.stringify(restored.items.map(item => ({ id: item.id, quantity: item.quantity }))) !== JSON.stringify(temporaryItem.before)) throw new Error('Temporary cart item restoration failed.');
    temporaryItem = null;
    report.checks.push({ check: 'existing-cart-restored', count: restored.count, subtotal: restored.subtotal });
    await shot('menu');

    await go('navigateTo', '/pages/themes/index');
    await evaluate(theme => getCurrentPages().slice(-1)[0].choose({ currentTarget: { dataset: { id: theme } } }), originalTheme);
    await go('switchTab', '/pages/home/index');
    await mini.callWxMethod('hideToast');
    report.checks.push({ check: 'original-home-style-restored', theme: originalTheme });
    report.completed = true;
  } catch (error) {
    report.completed = false;
    report.errors.push({ phase: 'verification', message: error.message, stack: error.stack });
    console.error(error.stack);
    process.exitCode = 1;
  } finally {
    if (mini) {
      if (temporaryItem) {
        try { await bounded(mini.evaluate(id => { const page = getCurrentPages().slice(-1)[0]; if (page.route === 'pages/menu/index') { page.changeCart({ detail: { id, delta: -1 } }); page.closeCart(); } }, temporaryItem.id), 'restore cart'); } catch (error) { report.errors.push({ phase: 'restore-cart', message: error.message }); }
      }
      await mini.disconnect();
    }
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, 'component-regression-report.json'), JSON.stringify(report, null, 2));
    console.log('Report:', path.join(OUT, 'component-regression-report.json'));
  }
}

run();
