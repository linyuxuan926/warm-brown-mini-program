const store = require('./store');
const seed = require('../mock/seed');
const catalog = require('../mock/catalog');
const valid = require('../utils/validation');
const MODES = catalog.ALL_MODES;
const THEMES = ['cat', 'cloud', 'dog'];
const STATUS_LABELS = seed.labels;
const NOW = function () { return new Date().toISOString(); };
const STORE_INFO = {
  name: '暖棕小屋·梧桐里店', address: '浙江省杭州市西湖区梧桐里18号（虚构演示地址）',
  hours: '每日 09:00—20:00', phone: '0571-88880000',
  deliveryRule: '演示配送范围：浙江省杭州市西湖区、拱墅区、上城区；配送费6元，商品金额满88元免配送费，约30～50分钟送达。',
  shippingRule: '仅限标注可邮寄的常温商品；运费10元，商品金额满128元包邮；24～48小时内演示发货，预计2～4天送达。暂不支持港澳台、新疆、西藏。',
  deliveryFee: 600, deliveryFreeThreshold: 8800, shippingFee: 1000, shippingFreeThreshold: 12800,
  deliveryEstimate: '约30～50分钟', shippingEstimate: '24～48小时内发货，预计2～4天送达',
  isDemo: true
};

function requireMode(mode) { if (MODES.indexOf(mode) === -1) valid.fail('请选择有效的履约方式'); }
function requireLogin(state) { if (!state.member.loggedIn) valid.fail('请先登录演示账户'); }
function nextId(state, prefix) { state.sequence += 1; return prefix + '-' + state.sequence; }
function findProduct(state, id) { return state.products.filter(function (p) { return p.id === id; })[0]; }
function findOrder(state, id) {
  const order = state.orders.filter(function (item) { return item.id === id; })[0];
  if (!order) valid.fail('订单不存在');
  return order;
}
function reservedQuantity(state, productId, exceptOrderId) {
  return state.orders.reduce(function (sum, order) {
    if (order.status !== 'pending' || order.id === exceptOrderId) return sum;
    return sum + order.items.reduce(function (subtotal, item) { return subtotal + (item.productId === productId ? item.quantity : 0); }, 0);
  }, 0);
}
function availableProduct(state, product) {
  const result = store.clone(product);
  result.stock = Math.max(0, product.stock - reservedQuantity(state, product.id));
  return result;
}
function makeItem(product, specs, quantity) {
  if (!product || product.active === false) valid.fail('商品已下架，请移除后重试');
  valid.integer(quantity, '商品数量', 1, 99);
  if (specs === undefined || specs === null) specs = {};
  if (typeof specs !== 'object' || Array.isArray(specs)) valid.fail('商品规格无效');
  const groups = product.specGroups || [];
  const chosen = {};
  const names = [];
  let unitPrice = product.price;
  Object.keys(specs).forEach(function (key) {
    if (!groups.some(function (group) { return group.id === key; })) valid.fail(product.name + '的规格已更新，请重新选择');
  });
  groups.forEach(function (group) {
    const optionId = specs[group.id];
    if (!optionId) { if (group.required) valid.fail('请选择' + group.name); return; }
    const option = group.options.filter(function (item) { return item.id === optionId; })[0];
    if (!option) valid.fail(product.name + '的规格已更新，请重新选择');
    chosen[group.id] = option.id;
    names.push(option.name);
    unitPrice += option.extra;
  });
  valid.integer(unitPrice, '商品单价', 0, 10000000);
  const signature = Object.keys(chosen).sort().map(function (key) { return key + '=' + chosen[key]; }).join('&');
  return { id: product.id + '::' + signature, productId: product.id, name: product.name, image: product.image, categoryId: product.categoryId, specs: chosen, specText: names.join(' / ') || '标准份', quantity, unitPrice, total: unitPrice * quantity };
}
function cartSummary(items) {
  return { items: store.clone(items), count: items.reduce(function (sum, item) { return sum + item.quantity; }, 0), subtotal: items.reduce(function (sum, item) { return sum + item.total; }, 0) };
}
function validateCart(state) {
  if (!state.cart.length) valid.fail('购物车还是空的，先选点喜欢的吧');
  const quantities = {};
  const items = state.cart.map(function (old) {
    const product = findProduct(state, old.productId);
    const item = makeItem(product, old.specs, old.quantity);
    if (product.supportedModes.indexOf(state.mode) === -1) valid.fail(product.name + '不支持当前履约方式');
    quantities[product.id] = (quantities[product.id] || 0) + item.quantity;
    return item;
  });
  Object.keys(quantities).forEach(function (productId) {
    const p = findProduct(state, productId);
    if (quantities[productId] > p.stock - reservedQuantity(state, productId)) valid.fail(p.name + '库存不足，请调整数量');
  });
  return items;
}
function checkAddressRegion(address, mode) {
  if (mode === 'delivery' && !(address.province === '浙江省' && address.city === '杭州市' && ['西湖区', '拱墅区', '上城区'].indexOf(address.district) !== -1)) {
    valid.fail('超出演示配送范围：仅支持浙江省杭州市西湖区、拱墅区、上城区');
  }
  if (mode === 'shipping' && /香港|澳门|台湾|新疆|西藏/.test(address.province)) valid.fail('该地区暂不支持邮寄：港澳台、新疆、西藏不在演示服务范围');
}
function getAddress(state, addressId, mode, required) {
  if (!addressId) { if (required) valid.fail('请先选择收货地址'); return null; }
  const address = state.addresses.filter(function (item) { return item.id === addressId; })[0];
  if (!address) valid.fail('收货地址不存在，请重新选择');
  valid.address(address);
  checkAddressRegion(address, mode);
  return store.clone(address);
}
function couponStatus(coupon) {
  if (coupon.usedAt) return 'used';
  if (coupon.reservedOrderId) return 'reserved';
  if (!coupon.expiresAt || new Date(coupon.expiresAt).getTime() <= Date.now()) return 'expired';
  return 'available';
}
function couponReason(coupon, items, mode) {
  const status = couponStatus(coupon);
  if (status === 'used') return '已使用';
  if (status === 'reserved') return '已被待支付订单占用，取消订单后释放';
  if (status === 'expired') return '优惠券已过期';
  if (coupon.modes.length && coupon.modes.indexOf(mode) === -1) return '仅限' + coupon.modeLabel + '使用';
  if (!items.length) return '请先添加适用商品';
  const amount = eligibleSubtotal(coupon, items);
  if (!amount) return '购物车中没有适用商品（' + coupon.scopeLabel + '）';
  if (amount < coupon.threshold) return '适用商品还差' + ((coupon.threshold - amount) / 100).toFixed(2) + '元可用';
  return '';
}
function eligibleSubtotal(coupon, items) {
  return items.reduce(function (sum, item) { return sum + (!coupon.categories.length || coupon.categories.indexOf(item.categoryId) !== -1 ? item.total : 0); }, 0);
}
function quoteState(state, options, requireAddress) {
  options = options || {};
  const items = validateCart(state);
  if (state.mode === 'delivery' || state.mode === 'shipping') getAddress(state, options.addressId, state.mode, requireAddress);
  const summary = cartSummary(items);
  let discount = 0;
  let couponId = '';
  if (options.couponId) {
    if (typeof options.couponId !== 'string') valid.fail('每笔订单最多使用一张优惠券');
    const coupon = state.coupons.filter(function (item) { return item.id === options.couponId; })[0];
    if (!coupon) valid.fail('优惠券不存在');
    const reason = couponReason(coupon, items, state.mode);
    if (reason) valid.fail(reason);
    couponId = coupon.id;
    discount = Math.min(coupon.discount, eligibleSubtotal(coupon, items));
  }
  let fee = 0;
  if (state.mode === 'delivery' && summary.subtotal < STORE_INFO.deliveryFreeThreshold) fee = STORE_INFO.deliveryFee;
  if (state.mode === 'shipping' && summary.subtotal < STORE_INFO.shippingFreeThreshold) fee = STORE_INFO.shippingFee;
  const total = summary.subtotal - discount + fee;
  valid.integer(total, '订单金额', 0, 100000000);
  return Object.assign(summary, { discount, fee, total, couponId });
}

function init() { return store.get(); }
function reset() { return store.reset(); }
function getState() { return store.get(); }
function getCatalog() {
  const state = store.get();
  return { categories: store.clone(catalog.categories), products: state.products.filter(function (p) { return p.active !== false; }).map(function (p) { return availableProduct(state, p); }) };
}
function getProducts(options) {
  options = options || {};
  const mode = options.mode || store.get().mode;
  requireMode(mode);
  const search = valid.text(options.search).toLowerCase();
  return getCatalog().products.filter(function (p) {
    return (!options.categoryId || p.categoryId === options.categoryId) && (!search || p.name.toLowerCase().indexOf(search) !== -1) && p.supportedModes.indexOf(mode) !== -1;
  });
}
function getTheme() { return store.get().theme; }
function setTheme(id) {
  if (THEMES.indexOf(id) === -1) valid.fail('首页风格不存在');
  return store.transact(function (state) { state.theme = id; return id; });
}
function getMode() { return store.get().mode; }
function incompatibleItems(state, mode) {
  return state.cart.filter(function (item) { const p = findProduct(state, item.productId); return !p || p.active === false || p.supportedModes.indexOf(mode) === -1; });
}
function checkMode(mode) { requireMode(mode); return incompatibleItems(store.get(), mode).map(function (item) { return item.name; }); }
function setMode(mode, removeIncompatible) {
  requireMode(mode);
  return store.transact(function (state) {
    const incompatible = incompatibleItems(state, mode);
    if (incompatible.length && removeIncompatible !== true) valid.fail('以下商品不支持该方式：' + incompatible.map(function (item) { return item.name; }).join('、') + '。请确认移除后再切换');
    state.cart = state.cart.filter(function (item) { return !incompatible.some(function (bad) { return bad.id === item.id; }); });
    state.mode = mode;
    return mode;
  });
}
function getCart() { return cartSummary(store.get().cart); }
function addCart(productId, specs, quantity) {
  quantity = quantity === undefined ? 1 : quantity;
  return store.transact(function (state) {
    const product = findProduct(state, productId);
    const item = makeItem(product, specs, quantity);
    if (product.supportedModes.indexOf(state.mode) === -1) valid.fail(product.name + '不支持当前履约方式');
    const existingTotal = state.cart.reduce(function (sum, row) { return sum + (row.productId === productId ? row.quantity : 0); }, 0);
    if (existingTotal + quantity > product.stock - reservedQuantity(state, productId)) valid.fail(product.name + '库存不足或已售罄');
    const existing = state.cart.filter(function (row) { return row.id === item.id; })[0];
    if (existing) {
      valid.integer(existing.quantity + quantity, '同规格商品数量', 1, 99);
      Object.assign(existing, makeItem(product, specs, existing.quantity + quantity));
    } else state.cart.push(item);
    return cartSummary(state.cart);
  });
}
function changeCart(itemId, delta) {
  valid.integer(delta, '数量变化', -99, 99);
  if (!delta) return getCart();
  return store.transact(function (state) {
    const item = state.cart.filter(function (row) { return row.id === itemId; })[0];
    if (!item) valid.fail('购物车商品不存在');
    const quantity = item.quantity + delta;
    if (quantity <= 0) state.cart = state.cart.filter(function (row) { return row.id !== itemId; });
    else {
      const p = findProduct(state, item.productId);
      const updated = makeItem(p, item.specs, quantity);
      const otherQuantity = state.cart.reduce(function (sum, row) { return sum + (row.productId === p.id && row.id !== item.id ? row.quantity : 0); }, 0);
      if (quantity + otherQuantity > p.stock - reservedQuantity(state, p.id)) valid.fail(p.name + '库存不足');
      if (p.supportedModes.indexOf(state.mode) === -1) valid.fail(p.name + '不支持当前履约方式');
      Object.assign(item, updated);
    }
    return cartSummary(state.cart);
  });
}
function clearCart() { return store.transact(function (state) { state.cart = []; return cartSummary(state.cart); }); }
function quote(options) { return quoteState(store.get(), options, false); }
function createOrder(options) {
  options = options || {};
  const token = valid.text(options.token);
  if (!token || token.length > 160) valid.fail('订单提交标识无效，请返回重试');
  return store.transact(function (state) {
    const previous = Object.prototype.hasOwnProperty.call(state.createTokens, token) ? state.createTokens[token] : null;
    if (previous) return findOrder(state, previous);
    const quoted = quoteState(state, options, true);
    let contact = '';
    let phone = '';
    let tableNumber = '';
    let pickupTime = '';
    let address = null;
    if (state.mode === 'dineIn') {
      tableNumber = valid.text(options.tableNumber);
      if (!/^[\u4e00-\u9fa5A-Za-z0-9 -]{1,12}$/.test(tableNumber)) valid.fail('请填写有效桌号，例如 A06');
    } else if (state.mode === 'pickup') {
      contact = valid.contact(options.contact);
      phone = valid.phone(options.phone);
      pickupTime = valid.text(options.pickupTime);
      if (!pickupTime || pickupTime.length > 40) valid.fail('请选择取餐时间');
    } else {
      address = getAddress(state, options.addressId, state.mode, true);
      contact = address.contact;
      phone = address.phone;
    }
    const remark = valid.text(options.remark);
    if (remark.length > 200) valid.fail('备注最多200个字');
    const id = nextId(state, 'order');
    const createdAt = NOW();
    const order = Object.assign({}, quoted, { id, number: 'WB' + createdAt.slice(0, 10).replace(/-/g, '') + String(state.sequence), createdAt, mode: state.mode, status: 'pending', contact, phone, tableNumber, pickupTime, address, remark, pickupCode: '', timeline: [{ status: 'pending', label: '订单已创建，等待模拟支付', time: createdAt }], pointsAwarded: false });
    if (order.couponId) state.coupons.filter(function (coupon) { return coupon.id === order.couponId; })[0].reservedOrderId = id;
    state.orders.unshift(order);
    Object.defineProperty(state.createTokens, token, { value: id, enumerable: true, configurable: true, writable: true });
    const orderedIds = quoted.items.map(function (item) { return item.id; });
    state.cart = state.cart.filter(function (item) { return orderedIds.indexOf(item.id) === -1; });
    return order;
  });
}
function getOrders(filter) {
  filter = filter || 'all';
  if (['all', 'pending', 'active', 'completed', 'cancelled'].indexOf(filter) === -1) valid.fail('订单筛选条件无效');
  return store.get().orders.filter(function (order) {
    return filter === 'all' || (filter === 'active' ? ['preparing', 'ready', 'delivering', 'toShip', 'shipped'].indexOf(order.status) !== -1 : order.status === filter);
  }).sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
}
function getOrder(id) { return findOrder(store.get(), id); }
function payOrder(id, method, outcome) {
  if (['mock', 'balance'].indexOf(method) === -1) valid.fail('请选择有效支付方式');
  if (['success', 'cancel', 'failure'].indexOf(outcome) === -1) valid.fail('模拟支付结果无效');
  return store.transact(function (state) {
    const order = findOrder(state, id);
    if (order.status === 'cancelled') valid.fail('订单已取消，无法支付');
    if (order.paidAt) return order;
    if (order.status !== 'pending') valid.fail('当前订单状态不支持支付');
    if (outcome !== 'success') {
      order.lastPaymentOutcome = outcome;
      order.timeline.push({ status: 'pending', label: outcome === 'cancel' ? '已取消本次模拟支付，可继续支付' : '模拟支付失败，可重试', time: NOW() });
      return order;
    }
    if (method === 'balance') { requireLogin(state); if (state.member.balance < order.total) valid.fail('演示余额不足，请储值或选择模拟支付'); }
    const quantities = {};
    order.items.forEach(function (item) { quantities[item.productId] = (quantities[item.productId] || 0) + item.quantity; });
    Object.keys(quantities).forEach(function (productId) {
      const p = findProduct(state, productId);
      if (!p || p.active === false || p.supportedModes.indexOf(order.mode) === -1) valid.fail('订单商品已不可售，请取消订单重新选购');
      if (quantities[productId] > p.stock - reservedQuantity(state, productId, id)) valid.fail(p.name + '库存不足，请取消订单重新选购');
    });
    if (order.couponId) {
      const coupon = state.coupons.filter(function (item) { return item.id === order.couponId; })[0];
      if (!coupon || coupon.usedAt || coupon.reservedOrderId !== id) valid.fail('订单优惠券占用状态异常，请取消后重新下单');
      // 建单时有效的优惠券在待支付期间保留资格；取消订单后再按有效期判断。
      coupon.usedAt = NOW();
      coupon.reservedOrderId = '';
      coupon.usedOrderId = id;
    }
    Object.keys(quantities).forEach(function (productId) { findProduct(state, productId).stock -= quantities[productId]; });
    if (method === 'balance') {
      state.member.balance -= order.total;
      state.walletTransactions.unshift({ id: nextId(state, 'wallet'), type: 'payment', amount: -order.total, principal: 0, gift: 0, balance: state.member.balance, createdAt: NOW(), orderId: id, description: '订单余额支付 ' + order.number });
    }
    order.paidAt = NOW();
    order.paymentMethod = method;
    order.lastPaymentOutcome = 'success';
    order.status = order.mode === 'shipping' ? 'toShip' : 'preparing';
    if (order.mode === 'pickup') order.pickupCode = String(1000 + Number(id.split('-').pop()) % 9000);
    order.timeline.push({ status: order.status, label: '模拟支付成功 · ' + STATUS_LABELS[order.status], time: order.paidAt });
    return order;
  });
}
function cancelOrder(id) {
  return store.transact(function (state) {
    const order = findOrder(state, id);
    if (order.status === 'cancelled') return order;
    if (order.status !== 'pending') valid.fail('仅待支付订单支持取消');
    order.status = 'cancelled';
    order.cancelledAt = NOW();
    order.timeline.push({ status: 'cancelled', label: '订单已取消，库存与优惠券占用已释放', time: order.cancelledAt });
    if (order.couponId) {
      const coupon = state.coupons.filter(function (item) { return item.id === order.couponId; })[0];
      if (coupon && coupon.reservedOrderId === id) coupon.reservedOrderId = '';
    }
    return order;
  });
}
function advanceOrder(id) {
  return store.transact(function (state) {
    const order = findOrder(state, id);
    const routes = { dineIn: ['preparing', 'ready', 'completed'], pickup: ['preparing', 'ready', 'completed'], delivery: ['preparing', 'delivering', 'completed'], shipping: ['toShip', 'shipped', 'completed'] };
    if (order.status === 'completed') return order;
    const route = routes[order.mode];
    const position = route ? route.indexOf(order.status) : -1;
    if (!order.paidAt || position < 0 || position === route.length - 1) valid.fail('当前状态不能推进，请先完成模拟支付');
    order.status = route[position + 1];
    const time = NOW();
    order.timeline.push({ status: order.status, label: '演示状态推进 · ' + STATUS_LABELS[order.status], time });
    if (order.status === 'shipped') {
      order.trackingNumber = 'DEMO' + order.number.slice(2);
      order.logistics = '演示物流：暖棕包裹已交寄（虚构单号，不可用于真实查询）';
    }
    if (order.status === 'completed' && !order.pointsAwarded) {
      order.completedAt = time;
      order.pointsAwarded = true;
      const points = Math.floor(order.total / 100);
      state.member.points += points;
      state.pointsTransactions.unshift({ id: nextId(state, 'points'), type: 'earned', amount: points, points: state.member.points, createdAt: time, orderId: id, description: '订单完成奖励：实付每1元积1分' });
    }
    return order;
  });
}
function reorder(id) {
  return store.transact(function (state) {
    const order = findOrder(state, id);
    let added = 0;
    const skipped = [];
    order.items.forEach(function (old) {
      const product = findProduct(state, old.productId);
      try {
        const item = makeItem(product, old.specs, old.quantity);
        if (product.supportedModes.indexOf(state.mode) === -1) valid.fail('不支持当前履约方式');
        const totalInCart = state.cart.reduce(function (sum, row) { return sum + (row.productId === product.id ? row.quantity : 0); }, 0);
        if (totalInCart + item.quantity > product.stock - reservedQuantity(state, product.id)) valid.fail('库存不足或售罄');
        const existing = state.cart.filter(function (row) { return row.id === item.id; })[0];
        if (existing) Object.assign(existing, makeItem(product, old.specs, existing.quantity + item.quantity));
        else state.cart.push(item);
        added += item.quantity;
      } catch (error) { skipped.push(old.name + '：' + error.message); }
    });
    return { added, skipped };
  });
}
function getMember() { return store.get().member; }
function login() { return store.transact(function (state) { state.member.loggedIn = true; return state.member; }); }
function logout() { return store.transact(function (state) { state.member.loggedIn = false; return state.member; }); }
function recharge(amount, token) {
  valid.integer(amount, '储值金额', 10000, 50000);
  if ([10000, 20000, 50000].indexOf(amount) === -1) valid.fail('请选择100、200或500元储值档位');
  token = valid.text(token);
  if (!token || token.length > 160) valid.fail('储值提交标识无效');
  return store.transact(function (state) {
    requireLogin(state);
    if (Object.prototype.hasOwnProperty.call(state.rechargeTokens, token)) {
      const prior = state.walletTransactions.filter(function (tx) { return tx.id === state.rechargeTokens[token]; })[0];
      if (prior && prior.principal !== amount) valid.fail('该储值标识已用于其他金额，请重新提交');
      return prior;
    }
    const gift = { 10000: 1000, 20000: 3000, 50000: 10000 }[amount];
    valid.integer(state.member.balance + amount + gift, '余额', 0, 100000000);
    state.member.balance += amount + gift;
    state.member.totalRecharged += amount;
    if (state.member.totalRecharged >= 20000) state.member.level = 'VIP会员';
    const transaction = { id: nextId(state, 'wallet'), type: 'recharge', amount: amount + gift, principal: amount, gift, balance: state.member.balance, createdAt: NOW(), description: '演示储值：充' + amount / 100 + '赠' + gift / 100 };
    state.walletTransactions.unshift(transaction);
    Object.defineProperty(state.rechargeTokens, token, { value: transaction.id, enumerable: true, configurable: true, writable: true });
    return transaction;
  });
}
function getCoupons() {
  const state = store.get();
  return state.coupons.map(function (coupon) { return Object.assign({}, coupon, { status: couponStatus(coupon), reason: couponReason(coupon, state.cart, state.mode) }); });
}
function getCouponOffers() {
  const state = store.get();
  return seed.offers.map(function (offer) { return Object.assign({}, store.clone(offer), { claimed: !offer.pointsCost && state.claimedOffers.indexOf(offer.id) !== -1 }); });
}
function issueCoupon(state, offer) {
  const coupon = Object.assign({}, store.clone(offer), { id: nextId(state, 'coupon'), offerId: offer.id, claimedAt: NOW(), expiresAt: new Date(Date.now() + offer.days * 86400000).toISOString(), usedAt: '', reservedOrderId: '' });
  state.coupons.unshift(coupon);
  return coupon;
}
function claimCoupon(offerId) {
  return store.transact(function (state) {
    requireLogin(state);
    const offer = seed.offers.filter(function (item) { return item.id === offerId; })[0];
    if (!offer || offer.pointsCost) valid.fail('该券需前往积分小铺兑换');
    if (state.claimedOffers.indexOf(offerId) !== -1) {
      const existing = state.coupons.filter(function (coupon) { return coupon.offerId === offerId; })[0];
      if (existing) return existing;
      valid.fail('该优惠券每个演示账户限领一次');
    }
    state.claimedOffers.push(offerId);
    return issueCoupon(state, offer);
  });
}
function redeemCoupon(offerId) {
  return store.transact(function (state) {
    requireLogin(state);
    const offer = seed.offers.filter(function (item) { return item.id === offerId; })[0];
    if (!offer || !offer.pointsCost) valid.fail('请选择可用积分兑换的优惠券');
    if (state.member.points < offer.pointsCost) valid.fail('积分不足，完成订单可获得积分');
    state.member.points -= offer.pointsCost;
    const coupon = issueCoupon(state, offer);
    state.pointsTransactions.unshift({ id: nextId(state, 'points'), type: 'redeem', amount: -offer.pointsCost, points: state.member.points, createdAt: NOW(), couponId: coupon.id, description: '兑换' + offer.name });
    return coupon;
  });
}
function getAddresses() { return store.get().addresses; }
function saveAddress(input) {
  const fields = valid.address(input);
  return store.transact(function (state) {
    let existing;
    if (input.id) { existing = state.addresses.filter(function (item) { return item.id === input.id; })[0]; if (!existing) valid.fail('地址不存在，请刷新后重试'); }
    const address = Object.assign({}, fields, { id: existing ? existing.id : nextId(state, 'address') });
    if (!state.addresses.length) address.isDefault = true;
    if (address.isDefault) state.addresses.forEach(function (item) { item.isDefault = false; });
    if (existing) state.addresses = state.addresses.map(function (item) { return item.id === address.id ? address : item; });
    else state.addresses.push(address);
    if (!state.addresses.some(function (item) { return item.isDefault; })) state.addresses[0].isDefault = true;
    return address;
  });
}
function deleteAddress(id) {
  return store.transact(function (state) {
    if (!state.addresses.some(function (item) { return item.id === id; })) valid.fail('地址不存在');
    state.addresses = state.addresses.filter(function (item) { return item.id !== id; });
    if (state.addresses.length && !state.addresses.some(function (item) { return item.isDefault; })) state.addresses[0].isDefault = true;
    return state.addresses;
  });
}
function setDefaultAddress(id) {
  return store.transact(function (state) {
    if (!state.addresses.some(function (item) { return item.id === id; })) valid.fail('地址不存在');
    state.addresses.forEach(function (item) { item.isDefault = item.id === id; });
    return state.addresses;
  });
}
function getStore() { return store.clone(STORE_INFO); }

module.exports = { init, reset, getState, getCatalog, getProducts, getTheme, setTheme, getMode, checkMode, setMode, getCart, addCart, changeCart, clearCart, quote, createOrder, getOrders, getOrder, payOrder, cancelOrder, advanceOrder, reorder, login, logout, getMember, recharge, getCoupons, getCouponOffers, claimCoupon, redeemCoupon, saveAddress, deleteAddress, setDefaultAddress, getAddresses, getStore };
