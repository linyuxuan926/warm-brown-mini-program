/* Native WeChat DevTools automation. No browser rendering or screenshot mock. */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const Connection = require('../tools-cache/node_modules/miniprogram-automator/out/Connection').default;
const MiniProgram = require('../tools-cache/node_modules/miniprogram-automator/out/MiniProgram').default;

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'artifacts', 'screenshots');
const TOOL = process.env.WECHAT_DEVTOOLS || 'D:\\大\\文件\\微信web开发者工具';
const PORT = Number(process.env.WECHAT_AUTO_PORT || 9420);
const report = { kind: 'native-wechat-devtools', startedAt: new Date().toISOString(), project: ROOT, port: PORT, screenshots: [], checks: [], errors: [], logs: [] };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const bounded = (promise, ms, label) => {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out after ' + ms + ' ms')), ms); })]).finally(() => clearTimeout(timer));
};
fs.mkdirSync(OUT, { recursive: true });

async function attach() {
  let connection;
  try {
    connection = await bounded(Connection.create(`ws://127.0.0.1:${PORT}`), 4000, 'Native automation websocket');
    const info = await bounded(connection.send('Tool.getInfo'), 4000, 'Native Tool.getInfo');
    report.toolInfo = info;
    if (!info.SDKVersion) {
      const error = new Error('Native DevTools websocket is available, but its simulator has not initialized: Tool.getInfo returned ' + JSON.stringify(info) + ' without SDKVersion. This is a native tool/runtime initialization failure, not a port collision.');
      error.code = 'SIMULATOR_NOT_READY';
      throw error;
    }
    const mini = new MiniProgram(connection);
    await mini.checkVersion();
    return mini;
  } catch (error) {
    if (connection) await connection.dispose();
    throw error;
  }
}

async function connect() {
  let lastError;
  try { return await attach(); } catch (error) { lastError = error; }
  if (lastError.code === 'SIMULATOR_NOT_READY') {
    // The SDK itself leaks this connection when checkVersion throws on a
    // missing SDKVersion. Retry with explicit cleanup; do not launch on an
    // already occupied automation port.
    for (let i = 0; i < 12; i++) {
      await delay(1000);
      try { return await attach(); } catch (error) { lastError = error; }
    }
    throw lastError;
  }
  // Use DevTools' bundled Node to invoke its CLI. Direct .bat spawn is disabled
  // by current Node versions on Windows, while this is the same command as cli.bat.
  const child = cp.spawn(path.join(TOOL, 'node.exe'), [path.join(TOOL, 'cli.js'), 'auto', '--project', ROOT, '--auto-port', String(PORT), '--trust-project', '--lang', 'zh'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { const text = String(chunk); process.stdout.write(text); report.logs.push(text); });
  child.on('error', error => report.errors.push({ phase: 'launch', message: error.message }));
  const deadline = Date.now() + 55000;
  while (Date.now() < deadline) {
    try { return await attach(); } catch (error) { lastError = error; await delay(1000); }
  }
  throw lastError || new Error('Native DevTools automation websocket did not become available within 55 seconds.');
}

async function run() {
  let mini;
  try {
    mini = await connect();
    mini.on('exception', error => report.errors.push({ phase: 'app-runtime', value: error }));
    mini.on('console', message => { if (report.logs.length < 80) report.logs.push(message); });
    report.systemInfo = await bounded(mini.systemInfo(), 12000, 'Native simulator system information');
    console.log('Connected to native simulator:', report.systemInfo.model, report.systemInfo.SDKVersion);
    const shot = async name => {
      await delay(650);
      const page = await mini.currentPage();
      const target = path.join(OUT, name + '.png');
      await mini.screenshot({ path: target });
      report.screenshots.push({ name, path: target, route: page && page.path, size: fs.statSync(target).size });
      console.log('Screenshot:', name, page && page.path);
      return page;
    };
    const home = await mini.reLaunch('/pages/home/index');
    await home.waitFor(800);
    report.checks.push({ check: 'home-initializes', data: await home.data() });
    const setTheme = async id => {
      const themePage = await mini.navigateTo('/pages/themes/index');
      await themePage.waitFor(200);
      await themePage.callMethod('choose', { currentTarget: { dataset: { id } } });
      await mini.switchTab('/pages/home/index');
      await mini.callWxMethod('hideToast');
      await delay(250);
    };
    for (const id of ['cat', 'cloud', 'dog']) { await setTheme(id); await shot('home-' + id); }
    await setTheme('cat');

    let menu = await mini.switchTab('/pages/menu/index');
    await menu.waitFor(500);
    let data = await menu.data();
    const product = data.products.find(item => item.stock > 0);
    if (!product) throw new Error('Native menu returned no available products.');
    const specs = {};
    (product.specGroups || []).forEach(group => { if (group.options.length) specs[group.id] = group.options[0].id; });
    await menu.callMethod('openProduct', { currentTarget: { dataset: { id: product.id } } });
    await shot('product-options');
    await menu.callMethod('addProduct', { detail: { productId: product.id, specs, quantity: 1 } });
    await mini.callWxMethod('hideToast');
    await shot('menu');
    data = await menu.data();
    if (!(data.cart.count > 0)) throw new Error('Adding a product did not update the native cart.');
    report.checks.push({ check: 'native-add-to-cart', count: data.cart.count, productId: product.id });
    await menu.callMethod('checkout');
    await delay(500);
    let checkout = await mini.currentPage();
    if (checkout.path !== 'pages/checkout/index') throw new Error('Checkout navigation failed: ' + checkout.path);
    // Exercise the real input handlers with demonstration contact details.
    await checkout.callMethod('input', { currentTarget: { dataset: { key: 'contact' } }, detail: { value: '小屋体验员' } });
    await checkout.callMethod('input', { currentTarget: { dataset: { key: 'phone' } }, detail: { value: '13800138000' } });
    await shot('checkout');
    let quote = await checkout.data('quote');
    if (!quote || quote.total <= 0) throw new Error('Native checkout quote missing or invalid.');
    report.checks.push({ check: 'native-checkout-quote', total: quote.total, count: quote.count });
    await checkout.callMethod('submit');
    await delay(500);
    const payment = await mini.currentPage();
    if (payment.path !== 'pages/payment/index') throw new Error('Payment navigation failed: ' + payment.path);
    await shot('payment');
    await payment.callMethod('result', { currentTarget: { dataset: { outcome: 'success' } } });
    await delay(500);
    const success = await mini.currentPage();
    if (success.path !== 'pages/success/index') throw new Error('Demo payment failed: ' + success.path);
    await shot('order-success');
    const order = await success.data('order');
    report.checks.push({ check: 'native-demo-payment', orderId: order.id, status: order.status, total: order.total });
    await success.callMethod('detail');
    await shot('order-detail');
    await mini.switchTab('/pages/orders/index');
    await shot('orders');
    const member = await mini.navigateTo('/pages/member/index');
    await member.callMethod('login');
    await mini.callWxMethod('hideToast');
    await shot('member');
    await mini.switchTab('/pages/mine/index');
    await shot('mine');
    await mini.switchTab('/pages/home/index');
    report.completed = true;
  } catch (error) {
    report.completed = false;
    report.errors.push({ phase: 'capture', message: error.message, stack: error.stack });
    console.error(error.stack);
    process.exitCode = 1;
    if (mini) {
      try { await mini.screenshot({ path: path.join(OUT, 'failure-native.png') }); } catch (_) {}
    }
  } finally {
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, 'native-report.json'), JSON.stringify(report, null, 2));
    if (mini) await mini.disconnect();
    console.log('Report:', path.join(OUT, 'native-report.json'));
  }
}

run();
