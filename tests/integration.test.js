// 原生 Page/Component 处理函数集成测试；wx 为本地桩，不替代微信开发者工具渲染或真机验证。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const project = path.resolve(__dirname, '../miniprogram');
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function event(dataset, value) { return { currentTarget: { dataset: dataset || {} }, detail: { value } }; }
function world() {
  const storage = {};
  const calls = [];
  const callbacks = [];
  const controls = { confirm: true, actionIndex: 0 };
  const app = { globalData: { selectedCouponId: null, selectedAddressId: '', fulfillmentDraft: {} } };
  Object.keys(require.cache).forEach(function (filename) { if (filename.startsWith(project + path.sep)) delete require.cache[filename]; });
  global.getApp = function () { return app; };
  function invoke(name, input) { calls.push({ name, input: clone(input || {}) }); if (input && input.success) callbacks.push(Promise.resolve(input.success({}))); }
  global.wx = {
    getStorageSync(key) { return storage[key] ? clone(storage[key]) : undefined; },
    setStorageSync(key, value) { storage[key] = clone(value); },
    showToast(input) { calls.push({ name: 'showToast', input: clone(input) }); },
    showModal(input) { calls.push({ name: 'showModal', input: clone(input) }); if (input.success) callbacks.push(Promise.resolve(input.success({ confirm: controls.confirm, cancel: !controls.confirm, content: 'A06' }))); },
    showActionSheet(input) { calls.push({ name: 'showActionSheet', input: clone(input) }); if (input.success) callbacks.push(Promise.resolve(input.success({ tapIndex: controls.actionIndex }))); },
    setNavigationBarTitle(input) { invoke('setNavigationBarTitle', input); },
    setTabBarBadge(input) { invoke('setTabBarBadge', input); },
    removeTabBarBadge(input) { invoke('removeTabBarBadge', input); },
    navigateTo(input) { invoke('navigateTo', input); },
    switchTab(input) { invoke('switchTab', input); },
    redirectTo(input) { invoke('redirectTo', input); },
    navigateBack(input) { invoke('navigateBack', input); },
    setClipboardData(input) { invoke('setClipboardData', input); }
  };
  function instance(definition, component) {
    const page = { data: clone(definition.data || {}), setData(update) {
      Object.keys(update).forEach(function (key) {
        const fields = key.split('.');
        let target = page.data;
        fields.slice(0, -1).forEach(function (field) { if (!target[field]) target[field] = {}; target = target[field]; });
        target[fields[fields.length - 1]] = update[key];
      });
    } };
    const source = component ? definition.methods : definition;
    Object.keys(source).forEach(function (key) { if (typeof source[key] === 'function') page[key] = source[key].bind(page); });
    return page;
  }
  function loadPage(name, query) {
    let definition;
    global.Page = function (input) { definition = input; };
    const filename = path.join(project, 'pages', name, 'index.js');
    delete require.cache[require.resolve(filename)];
    require(filename);
    const page = instance(definition, false);
    if (page.onLoad) page.onLoad(query || {});
    if (page.onShow) page.onShow();
    return page;
  }
  function loadSpecs(product, onAdd) {
    let definition;
    global.Component = function (input) { definition = input; };
    const filename = path.join(project, 'components/spec-sheet/index.js');
    delete require.cache[require.resolve(filename)];
    require(filename);
    const component = instance(definition, true);
    component.data.product = product;
    component.triggerEvent = function (name, detail) { if (name === 'add') onAdd({ detail }); };
    definition.properties.product.observer.call(component, product);
    return component;
  }
  async function flush() { while (callbacks.length) await Promise.all(callbacks.splice(0)); }
  const api = require('../miniprogram/services/api');
  api.init();
  return { api, app, calls, controls, loadPage, loadSpecs, flush };
}

['dineIn', 'pickup', 'delivery', 'shipping'].forEach(function (mode) {
  test('native page handlers complete ' + mode + ' selection, coupon, payment retry and order progression', async function () {
    const env = world();
    const api = env.api;
    const initialPoints = api.getMember().points;
    const home = env.loadPage('home');
    assert.equal(home.data.theme, 'cat');
    await home.onOrder({ detail: { mode, category: mode === 'shipping' ? 'gift' : 'coffee' } });
    assert.equal(env.calls.at(-1).input.url, '/pages/menu/index');
    const menu = env.loadPage('menu');
    assert.equal(menu.data.mode, mode);
    assert.equal(menu.data.categoryId, mode === 'shipping' ? 'gift' : 'coffee');
    menu.search(event({}, '不可能存在的咖啡名字'));
    assert.equal(menu.data.products.length, 0);
    menu.clearSearch();
    assert.ok(menu.data.products.length);
    menu.category(event({ id: mode === 'shipping' ? 'gift' : 'coffee' }));
    const productId = mode === 'shipping' ? 'p13' : 'p08';
    menu.openProduct(event({ id: productId }));
    const product = menu.data.product;
    assert.ok(product);
    const sheet = env.loadSpecs(product, function (addEvent) { menu.addProduct(addEvent); });
    assert.equal(sheet.data.complete, false, 'required specs initially prevent adding');
    product.specGroups.forEach(function (group) { sheet.select(event({ group: group.id, option: group.id === 'cup' ? 'large' : group.options[0].id })); });
    assert.equal(sheet.data.complete, true);
    sheet.quantity(event({ delta: 1 }));
    sheet.add();
    assert.equal(menu.data.cart.count, 2);
    assert.equal(menu.data.product, null);
    if (mode !== 'shipping') assert.equal(api.getCart().subtotal, 6600);
    menu.checkout();
    assert.equal(env.calls.at(-1).input.url, '/pages/checkout/index');
    const checkout = env.loadPage('checkout');
    assert.ok(checkout.data.quote);
    if (mode === 'dineIn') checkout.input(event({ key: 'tableNumber' }, 'A06'));
    if (mode === 'shipping' || mode === 'delivery') {
      checkout.address();
      const addresses = env.loadPage('addresses', { select: '1' });
      addresses.choose(event({ id: mode === 'shipping' ? 'address-shanghai' : 'address-hangzhou' }));
      checkout.onShow();
      assert.equal(checkout.data.address.id, mode === 'shipping' ? 'address-shanghai' : 'address-hangzhou');
    }
    checkout.coupons();
    const coupons = env.loadPage('coupons', { select: '1' });
    const couponId = mode === 'shipping' ? 'coupon-3' : 'coupon-1';
    assert.ok(coupons.data.coupons.find(function (coupon) { return coupon.id === couponId; }).eligible);
    coupons.select(event({ id: couponId }));
    checkout.onShow();
    assert.equal(checkout.data.quote.discount, mode === 'shipping' ? 1500 : 500);
    checkout.submit();
    const id = checkout.data.orderId;
    assert.ok(id);
    checkout.submit();
    assert.equal(api.getOrders().filter(function (order) { return order.id === id; }).length, 1);
    assert.equal(api.getCart().count, 0);
    assert.equal(api.getCoupons().find(function (coupon) { return coupon.id === couponId; }).status, 'reserved');
    let payment = env.loadPage('payment', { id });
    await payment.result(event({ outcome: 'failure' }));
    await env.flush();
    assert.equal(api.getOrder(id).status, 'pending');
    assert.equal(api.getCoupons().find(function (coupon) { return coupon.id === couponId; }).status, 'reserved');
    assert.match(env.calls.filter(function (call) { return call.name === 'redirectTo'; }).at(-1).input.url, /order-detail/);
    payment = env.loadPage('payment', { id });
    await payment.result(event({ outcome: 'cancel' }));
    assert.equal(api.getOrder(id).status, 'pending');
    payment = env.loadPage('payment', { id });
    await payment.result(event({ outcome: 'success' }));
    assert.match(env.calls.filter(function (call) { return call.name === 'redirectTo'; }).at(-1).input.url, /success/);
    const success = env.loadPage('success', { id });
    assert.equal(success.data.order.id, id);
    assert.equal(api.getCoupons().find(function (coupon) { return coupon.id === couponId; }).status, 'used');
    if (mode === 'pickup') assert.match(success.data.order.pickupCode, /^\d{4}$/);
    const details = env.loadPage('order-detail', { id });
    await details.advance();
    await details.advance();
    assert.equal(details.data.order.status, 'completed');
    assert.equal(api.getMember().points, initialPoints + Math.floor(api.getOrder(id).total / 100));
    const orders = env.loadPage('orders');
    assert.ok(orders.data.orders.some(function (order) { return order.id === id; }));
    const stateBeforeTheme = api.getState();
    const themes = env.loadPage('themes');
    ['cloud', 'dog', 'cat'].forEach(function (theme) { themes.choose(event({ id: theme })); home.onShow(); assert.equal(home.data.theme, theme); });
    assert.deepEqual(api.getState(), stateBeforeTheme);
    assert.equal(env.calls.filter(function (call) { return call.name === 'showToast' && /失败|不足|不存在|无效/.test(call.input.title); }).length, 0);
  });
});

test('native mode confirmation can cancel incompatible change and later remove it explicitly', async function () {
  const env = world();
  const menu = env.loadPage('menu');
  menu.category(event({ id: 'coffee' }));
  menu.openProduct(event({ id: 'p08' }));
  const product = menu.data.product;
  const sheet = env.loadSpecs(product, function (addEvent) { menu.addProduct(addEvent); });
  product.specGroups.forEach(function (group) { sheet.select(event({ group: group.id, option: group.options[0].id })); });
  sheet.add();
  env.controls.actionIndex = 3;
  env.controls.confirm = false;
  menu.switchMode();
  await env.flush();
  assert.equal(env.api.getMode(), 'pickup');
  assert.equal(env.api.getCart().count, 1);
  env.controls.confirm = true;
  menu.switchMode();
  await env.flush();
  assert.equal(env.api.getMode(), 'shipping');
  assert.equal(env.api.getCart().count, 0);
});

test('native checkout exposes invalid delivery address and recovers after reselection', function () {
  const env = world();
  env.api.setMode('delivery');
  env.api.addCart('p11', {}, 1);
  env.app.globalData.selectedAddressId = 'address-shanghai';
  const checkout = env.loadPage('checkout');
  assert.equal(checkout.data.quote, null);
  assert.match(checkout.data.error, /超出演示配送范围/);
  assert.equal(checkout.data.orderId, '');
  const addresses = env.loadPage('addresses', { select: '1' });
  addresses.choose(event({ id: 'address-hangzhou' }));
  checkout.onShow();
  assert.equal(checkout.data.error, '');
  assert.equal(checkout.data.quote.fee, 600);
  checkout.submit();
  assert.equal(env.api.getOrder(checkout.data.orderId).status, 'pending');
});
