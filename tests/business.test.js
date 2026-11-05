const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const project = path.resolve(__dirname, '../miniprogram');
let disk;
let writes;
let failWrite;
function copy(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
function load(fresh) {
  if (fresh) { disk = {}; writes = 0; failWrite = false; }
  global.wx = {
    getStorageSync(key) { return copy(disk[key]); },
    setStorageSync(key, value) { if (failWrite) throw new Error('模拟存储失败'); writes += 1; disk[key] = copy(value); }
  };
  Object.keys(require.cache).forEach(function (filename) { if (filename.startsWith(project + path.sep)) delete require.cache[filename]; });
  const api = require('../miniprogram/services/api');
  api.init();
  return api;
}
function specs(api, productId, overrides) {
  const product = api.getCatalog().products.find(function (p) { return p.id === productId; });
  const result = {};
  product.specGroups.forEach(function (group) { result[group.id] = group.options[0].id; });
  return Object.assign(result, overrides);
}
function purchase(api, mode, token, options) {
  api.setMode(mode, true);
  api.addCart('p13', specs(api, 'p13'), 1);
  return api.createOrder(Object.assign({ token, tableNumber: 'A06', contact: '林同学', phone: '13800138000', pickupTime: '尽快取餐', addressId: 'address-hangzhou' }, options));
}
function internalStore() { return require('../miniprogram/services/store'); }

test('seed catalog, ledger balances, owned coupons and order status coverage are coherent', function () {
  const api = load(true);
  const cat = api.getCatalog();
  assert.equal(cat.categories.length, 5);
  assert.equal(cat.products.length, 15);
  cat.categories.forEach(function (category) { assert.equal(cat.products.filter(function (p) { return p.categoryId === category.id; }).length, 3); });
  assert.ok(cat.products.filter(function (p) { return p.supportedModes.includes('shipping'); }).length >= 6);
  assert.equal(cat.products.filter(function (p) { return p.stock === 0; }).length, 1);
  const state = api.getState();
  assert.equal(state.member.balance, state.walletTransactions.reduce(function (n, item) { return n + item.amount; }, 0));
  assert.equal(state.member.points, state.pointsTransactions.reduce(function (n, item) { return n + item.amount; }, 0));
  ['pending', 'active', 'completed', 'cancelled'].forEach(function (filter) { assert.ok(api.getOrders(filter).length); });
  assert.equal(api.getCoupons().length, 3);
  assert.equal(api.getAddresses().length, 2);
});

test('specifications are required; same spec merges and different spec changes price', function () {
  const api = load(true);
  assert.throws(function () { api.addCart('p08', {}, 1); }, /请选择温度/);
  api.addCart('p08', specs(api, 'p08'), 1);
  api.addCart('p08', specs(api, 'p08'), 2);
  api.addCart('p08', specs(api, 'p08', { cup: 'large' }), 1);
  const cart = api.getCart();
  assert.equal(cart.items.length, 2);
  assert.equal(cart.count, 4);
  assert.equal(cart.items[0].quantity, 3);
  assert.equal(cart.items[1].unitPrice - cart.items[0].unitPrice, 500);
  assert.equal(cart.subtotal, 11700);
  assert.throws(function () { api.addCart('p08', specs(api, 'p08'), 0.5); }, /数量无效/);
  assert.throws(function () { api.addCart('p02', specs(api, 'p02'), 1); }, /库存不足|售罄/);
});

test('switching incompatible mode requires explicit removal and preserves compatible items', function () {
  const api = load(true);
  api.addCart('p08', specs(api, 'p08'), 1);
  api.addCart('p11', {}, 1);
  assert.deepEqual(api.checkMode('shipping'), ['燕麦热拿铁']);
  const before = api.getState();
  assert.throws(function () { api.setMode('shipping'); }, /确认移除/);
  assert.deepEqual(api.getState(), before);
  api.setMode('shipping', true);
  assert.equal(api.getMode(), 'shipping');
  assert.deepEqual(api.getCart().items.map(function (p) { return p.productId; }), ['p11']);
  assert.ok(api.getProducts({ mode: 'shipping' }).every(function (p) { return p.supportedModes.includes('shipping'); }));
  assert.throws(function () { api.addCart('p08', specs(api, 'p08'), 1); }, /不支持/);
  assert.throws(function () { api.setMode('invalid'); }, /有效的履约方式/);
});

test('four fulfillment modes can pay and complete with correct states and one-time points', function () {
  ['dineIn', 'pickup', 'delivery', 'shipping'].forEach(function (mode) {
    const api = load(true);
    const initialPoints = api.getMember().points;
    const order = purchase(api, mode, 'four-' + mode);
    assert.equal(order.status, 'pending');
    assert.equal(api.getCart().count, 0);
    const stock = api.getState().products.find(function (p) { return p.id === 'p13'; }).stock;
    const paid = api.payOrder(order.id, 'mock', 'success');
    assert.equal(paid.status, mode === 'shipping' ? 'toShip' : 'preparing');
    if (mode === 'pickup') assert.match(paid.pickupCode, /^\d{4}$/);
    assert.equal(api.getState().products.find(function (p) { return p.id === 'p13'; }).stock, stock - 1);
    assert.throws(function () { api.cancelOrder(order.id); }, /仅待支付/);
    const middle = api.advanceOrder(order.id);
    assert.equal(middle.status, mode === 'shipping' ? 'shipped' : mode === 'delivery' ? 'delivering' : 'ready');
    if (mode === 'shipping') assert.match(middle.trackingNumber, /^DEMO/);
    assert.equal(api.advanceOrder(order.id).status, 'completed');
    api.advanceOrder(order.id);
    api.payOrder(order.id, 'mock', 'success');
    assert.equal(api.getMember().points, initialPoints + Math.floor(order.total / 100));
    assert.equal(api.getState().pointsTransactions.filter(function (tx) { return tx.orderId === order.id; }).length, 1);
    assert.equal(api.getState().products.find(function (p) { return p.id === 'p13'; }).stock, stock - 1);
  });
});

test('creation token prevents duplicate orders while preserving a subsequently added cart', function () {
  const api = load(true);
  const first = purchase(api, 'pickup', 'same-token');
  api.addCart('p11', {}, 2);
  const duplicate = api.createOrder({ token: 'same-token' });
  assert.equal(first.id, duplicate.id);
  assert.equal(api.getCart().count, 2);
  assert.equal(api.getOrders().filter(function (o) { return o.id === first.id; }).length, 1);
});

test('pending reservation prevents overbooking; cancel releases inventory', function () {
  const api = load(true);
  internalStore().transact(function (state) { state.products.find(function (p) { return p.id === 'p13'; }).stock = 1; });
  const order = purchase(api, 'dineIn', 'reserve-one');
  assert.equal(api.getCatalog().products.find(function (p) { return p.id === 'p13'; }).stock, 0);
  assert.throws(function () { api.addCart('p13', specs(api, 'p13'), 1); }, /库存不足/);
  api.cancelOrder(order.id);
  api.cancelOrder(order.id);
  assert.equal(api.getCatalog().products.find(function (p) { return p.id === 'p13'; }).stock, 1);
  assert.throws(function () { api.payOrder(order.id, 'mock', 'success'); }, /已取消/);
  assert.throws(function () { api.advanceOrder(order.id); }, /不能推进/);
});

test('payment cancellation and failure retain pending order and coupon reservation for retry', function () {
  const api = load(true);
  const order = purchase(api, 'pickup', 'payment-retry', { couponId: 'coupon-1' });
  assert.equal(api.getCoupons().find(function (c) { return c.id === 'coupon-1'; }).status, 'reserved');
  const stock = api.getState().products.find(function (p) { return p.id === 'p13'; }).stock;
  ['cancel', 'failure'].forEach(function (result) {
    const pending = api.payOrder(order.id, 'mock', result);
    assert.equal(pending.status, 'pending');
    assert.equal(api.getCoupons().find(function (c) { return c.id === 'coupon-1'; }).status, 'reserved');
    assert.equal(api.getState().products.find(function (p) { return p.id === 'p13'; }).stock, stock);
  });
  api.payOrder(order.id, 'mock', 'success');
  assert.equal(api.getCoupons().find(function (c) { return c.id === 'coupon-1'; }).status, 'used');
});

test('cancel order releases coupon and permits a new valid order', function () {
  const api = load(true);
  const order = purchase(api, 'pickup', 'coupon-release', { couponId: 'coupon-1' });
  api.cancelOrder(order.id);
  assert.equal(api.getCoupons().find(function (c) { return c.id === 'coupon-1'; }).status, 'available');
  const again = purchase(api, 'pickup', 'coupon-new-order', { couponId: 'coupon-1' });
  assert.equal(again.discount, 500);
});

test('coupon thresholds, category scope, mode restrictions and expiry are enforced', function () {
  const api = load(true);
  api.addCart('p10', {}, 1);
  assert.throws(function () { api.quote({ couponId: 'coupon-1' }); }, /还差7.00元/);
  assert.throws(function () { api.quote({ couponId: 'coupon-2' }); }, /没有适用商品/);
  api.addCart('p08', specs(api, 'p08', { cup: 'large' }), 1);
  assert.equal(api.quote({ couponId: 'coupon-2' }).discount, 800);
  api.clearCart();
  api.setMode('shipping');
  api.addCart('p13', specs(api, 'p13'), 1);
  assert.throws(function () { api.quote({ couponId: 'coupon-2' }); }, /仅限/);
  assert.equal(api.quote({ couponId: 'coupon-3' }).discount, 1500);
  internalStore().transact(function (state) { state.coupons[2].expiresAt = '2000-01-01T00:00:00.000Z'; });
  assert.throws(function () { api.quote({ couponId: 'coupon-3' }); }, /已过期/);
  assert.throws(function () { api.quote({ couponId: ['coupon-1', 'coupon-2'] }); }, /最多使用一张/);
});

test('fees use product subtotal; delivery and postal region restrictions block submission', function () {
  const api = load(true);
  api.setMode('delivery');
  api.addCart('p11', {}, 1);
  assert.equal(api.quote({ addressId: 'address-hangzhou' }).fee, 600);
  assert.throws(function () { api.quote({ addressId: 'address-shanghai' }); }, /超出演示配送范围/);
  assert.throws(function () { api.createOrder({ token: 'no-address' }); }, /选择收货地址/);
  api.clearCart();
  const free = purchase(api, 'delivery', 'free-delivery', { couponId: 'coupon-1' });
  assert.equal(free.subtotal, 8800);
  assert.equal(free.total, 8300);
  assert.equal(free.fee, 0);
  api.setMode('shipping');
  api.addCart('p11', {}, 1);
  assert.equal(api.quote({ addressId: 'address-shanghai' }).fee, 1000);
  const tibet = api.saveAddress({ contact: '林同学', phone: '13800138000', province: '西藏自治区', city: '拉萨市', district: '城关区', detail: '演示街道18号101室' });
  assert.throws(function () { api.createOrder({ token: 'tibet', addressId: tibet.id }); }, /暂不支持邮寄/);
  api.clearCart();
  api.addCart('p15', specs(api, 'p15'), 1);
  assert.equal(api.quote({ addressId: 'address-shanghai' }).fee, 0);
});

test('contact, phone, table and pickup fields reject invalid input without mutation', function () {
  const api = load(true);
  api.addCart('p11', {}, 1);
  const before = api.getState();
  assert.throws(function () { api.createOrder({ token: 'bad-contact', contact: '林', phone: '123', pickupTime: '尽快取餐' }); }, /联系人/);
  assert.throws(function () { api.createOrder({ token: 'bad-phone', contact: '林同学', phone: '123', pickupTime: '尽快取餐' }); }, /手机号/);
  assert.throws(function () { api.createOrder({ token: 'bad-time', contact: '林同学', phone: '13800138000' }); }, /取餐时间/);
  assert.deepEqual(api.getState(), before);
  api.setMode('dineIn');
  assert.throws(function () { api.createOrder({ token: 'bad-table' }); }, /桌号/);
});

test('balance payment and recharge are atomic and idempotent with matching ledgers', function () {
  const api = load(true);
  assert.throws(function () { api.recharge(10000, 'login-required'); }, /先登录/);
  api.login();
  const recharge = api.recharge(10000, 'recharge-once');
  assert.equal(recharge.principal, 10000);
  assert.equal(recharge.gift, 1000);
  assert.equal(api.getMember().level, 'VIP会员');
  assert.deepEqual(api.recharge(10000, 'recharge-once'), recharge);
  assert.equal(api.getMember().balance, 23000);
  assert.throws(function () { api.recharge(20000, 'recharge-once'); }, /其他金额/);
  const order = purchase(api, 'pickup', 'balance-once');
  const count = writes;
  api.payOrder(order.id, 'balance', 'success');
  assert.equal(writes - count, 1, 'one atomic storage commit per successful payment');
  api.payOrder(order.id, 'balance', 'success');
  const state = api.getState();
  assert.equal(state.member.balance, 14200);
  assert.equal(state.walletTransactions.filter(function (tx) { return tx.orderId === order.id; }).length, 1);
  assert.equal(state.walletTransactions.reduce(function (n, tx) { return n + tx.amount; }, 0), state.member.balance);
});

test('insufficient balance leaves pending state, inventory, coupon and ledger intact', function () {
  const api = load(true);
  api.login();
  api.setMode('pickup');
  api.addCart('p15', specs(api, 'p15'), 2);
  const order = api.createOrder({ token: 'insufficient', contact: '林同学', phone: '13800138000', pickupTime: '尽快取餐', couponId: 'coupon-1' });
  const before = api.getState();
  assert.throws(function () { api.payOrder(order.id, 'balance', 'success'); }, /余额不足/);
  assert.deepEqual(api.getState(), before);
  assert.equal(api.payOrder(order.id, 'mock', 'success').status, 'preparing');
});

test('claiming is idempotent and points redemption deducts with a matching record', function () {
  const api = load(true);
  api.login();
  const offer = api.getCouponOffers().find(function (item) { return !item.pointsCost && !item.claimed; });
  assert.ok(offer);
  const coupon = api.claimCoupon(offer.id);
  assert.equal(api.claimCoupon(offer.id).id, coupon.id);
  assert.equal(api.getCoupons().filter(function (c) { return c.offerId === offer.id; }).length, 1);
  const pointsOffer = api.getCouponOffers().find(function (item) { return item.pointsCost; });
  api.redeemCoupon(pointsOffer.id);
  assert.equal(api.getMember().points, 220);
  const state = api.getState();
  assert.equal(state.pointsTransactions.reduce(function (sum, tx) { return sum + tx.amount; }, 0), state.member.points);
  api.redeemCoupon(pointsOffer.id);
  api.redeemCoupon(pointsOffer.id);
  assert.throws(function () { api.redeemCoupon(pointsOffer.id); }, /积分不足/);
});

test('address CRUD validates, keeps one default, and order saves independent address snapshot', function () {
  const api = load(true);
  assert.throws(function () { api.saveAddress({ contact: '林同学', phone: '13800138000', province: '', city: '', district: '', detail: '街道100号' }); }, /完整选择/);
  assert.throws(function () { api.saveAddress({ contact: '林同学', phone: '13800138000', province: '浙江省', city: '杭州市', district: '西湖区', detail: '1' }); }, /详细地址/);
  const order = purchase(api, 'delivery', 'address-snapshot');
  const original = api.getAddresses().find(function (a) { return a.id === 'address-hangzhou'; });
  api.saveAddress(Object.assign({}, original, { detail: '修改后的街道200号101室', isDefault: false }));
  api.setDefaultAddress('address-shanghai');
  assert.equal(api.getAddresses().filter(function (a) { return a.isDefault; }).length, 1);
  api.deleteAddress('address-shanghai');
  assert.equal(api.getAddresses().filter(function (a) { return a.isDefault; }).length, 1);
  assert.equal(api.getOrder(order.id).address.detail, original.detail);
  api.deleteAddress('address-hangzhou');
  assert.equal(api.getAddresses().length, 0);
  const added = api.saveAddress(Object.assign({}, original, { id: undefined }));
  assert.equal(added.isDefault, true);
});

test('reordering uses current price/spec/mode and does not mutate historical snapshots', function () {
  const api = load(true);
  const order = purchase(api, 'pickup', 'snapshot');
  api.payOrder(order.id, 'mock', 'success');
  internalStore().transact(function (state) { state.products.find(function (p) { return p.id === 'p13'; }).price = 9900; });
  assert.equal(api.reorder(order.id).added, 1);
  assert.equal(api.getCart().items[0].unitPrice, 9900);
  assert.equal(api.getOrder(order.id).items[0].unitPrice, 8800);
  api.clearCart();
  api.setMode('shipping');
  const invalid = api.reorder('seed-0103');
  assert.equal(invalid.added, 0);
  assert.match(invalid.skipped[0], /不支持/);
  internalStore().transact(function (state) { state.products.find(function (p) { return p.id === 'p13'; }).active = false; });
  assert.match(api.reorder(order.id).skipped[0], /下架/);
});

test('themes, addresses, cart, transactions and orders persist across cold startup', function () {
  let api = load(true);
  api.setTheme('dog');
  api.login();
  api.recharge(20000, 'persist-recharge');
  const order = purchase(api, 'shipping', 'persist-order', { addressId: 'address-shanghai', couponId: 'coupon-3' });
  api.addCart('p11', {}, 2);
  const expected = api.getState();
  api = load(false);
  assert.deepEqual(api.getState(), expected);
  assert.equal(api.createOrder({ token: 'persist-order' }).id, order.id);
  const beforeTheme = api.getState();
  ['cat', 'cloud', 'dog'].forEach(function (theme) { api.setTheme(theme); });
  const afterTheme = api.getState();
  beforeTheme.theme = afterTheme.theme;
  assert.deepEqual(afterTheme, beforeTheme);
  assert.throws(function () { api.setTheme('unknown'); }, /不存在/);
});

test('storage failure rolls back every part of the transaction; malformed old storage recovers', function () {
  let api = load(true);
  const order = purchase(api, 'pickup', 'storage-failure', { couponId: 'coupon-1' });
  const before = api.getState();
  failWrite = true;
  assert.throws(function () { api.payOrder(order.id, 'mock', 'success'); }, /存储失败/);
  assert.deepEqual(api.getState(), before);
  failWrite = false;
  api = load(false);
  assert.deepEqual(api.getState(), before);
  api.payOrder(order.id, 'mock', 'success');
  const key = internalStore().STORAGE_KEY;
  disk[key] = { version: 0, data: { broken: true } };
  api = load(false);
  assert.equal(api.getTheme(), 'cat');
  assert.ok(api.getCatalog().products.length);
  assert.equal(disk[key].version, 1);
});

test('search/category are combined predictably and returned objects cannot mutate persisted state', function () {
  const api = load(true);
  assert.equal(api.getProducts({ categoryId: 'coffee', search: '拿铁' }).length, 1);
  assert.equal(api.getProducts({ categoryId: 'gift', search: '拿铁' }).length, 0);
  const member = api.getMember(); member.balance = 999;
  const product = api.getCatalog().products[0]; product.stock = 999;
  assert.equal(api.getMember().balance, 12000);
  assert.notEqual(api.getCatalog().products[0].stock, 999);
});

test('older snapshots preserve business data, repair absent ledger fields and allocate collision-free IDs', function () {
  let api = load(true);
  api.login();
  const created = purchase(api, 'pickup', 'legacy-created');
  api.setTheme('cloud');
  const old = api.getState();
  old.member.balance = 32100;
  old.member.points = 456;
  delete old.member.totalRecharged;
  delete old.sequence;
  delete old.walletTransactions;
  delete old.pointsTransactions;
  delete old.claimedOffers;
  old.createTokens = null;
  old.rechargeTokens = null;
  old.addresses.forEach(function (address) { address.isDefault = true; });
  old.coupons.forEach(function (coupon) { delete coupon.modes; delete coupon.categories; });
  delete old.orders[0].timeline;
  disk[internalStore().STORAGE_KEY] = { version: 0, data: old };
  api = load(false);
  assert.equal(api.getTheme(), 'cloud');
  assert.equal(api.getOrder(created.id).total, created.total);
  assert.equal(api.getMember().balance, 32100);
  assert.equal(api.getMember().points, 456);
  let state = api.getState();
  assert.equal(state.walletTransactions.reduce(function (sum, tx) { return sum + tx.amount; }, 0), 32100);
  assert.equal(state.pointsTransactions.reduce(function (sum, tx) { return sum + tx.amount; }, 0), 456);
  assert.equal(api.getAddresses().filter(function (address) { return address.isDefault; }).length, 1);
  assert.doesNotThrow(function () { api.getCoupons(); });
  const next = purchase(api, 'pickup', 'new-after-migration');
  assert.notEqual(next.id, created.id);
  assert.equal(new Set(api.getOrders().map(function (order) { return order.id; })).size, api.getOrders().length);
  state = api.getState();
  api = load(false);
  assert.deepEqual(api.getState(), state);
});

test('structurally corrupted stored entities recover without exposing nulls to page renderers', function () {
  let api = load(true);
  const bad = api.getState();
  bad.products[0] = null;
  disk[internalStore().STORAGE_KEY] = { version: 1, data: bad };
  api = load(false);
  assert.doesNotThrow(function () { api.getCatalog(); api.getProducts(); api.getOrders(); api.getCoupons(); });
  assert.equal(api.getCatalog().products.length, 15);
});

test('legacy minimal member inherits identity defaults and malformed claim markers become a usable array', function () {
  let api = load(true);
  const legacy = api.getState();
  legacy.member = { balance: 45600, points: 678 };
  legacy.claimedOffers = 'broken-legacy-string';
  disk[internalStore().STORAGE_KEY] = { version: 0, data: legacy };
  api = load(false);
  const member = api.getMember();
  assert.equal(member.balance, 45600);
  assert.equal(member.points, 678);
  assert.equal(member.id, 'demo-member');
  assert.equal(member.nickname, '暖棕体验官');
  assert.equal(member.loggedIn, false);
  assert.ok(Array.isArray(api.getState().claimedOffers));
  assert.ok(api.getCouponOffers().find(function (offer) { return offer.id === 'offer-welcome'; }).claimed);
  api.login();
  const claimed = api.claimCoupon('offer-teatime');
  assert.equal(claimed.offerId, 'offer-teatime');
  assert.equal(api.claimCoupon('offer-teatime').id, claimed.id);
  assert.equal(api.getMember().balance, 45600);
  assert.equal(api.getMember().points, 678);
});
