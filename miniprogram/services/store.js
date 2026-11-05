// 全工程唯一读写 wx 本地存储的位置。每笔业务先修改克隆，再一次写入完整版本化快照。
const seed = require('../mock/seed');
const STORAGE_KEY = 'warm-brown-demo';
const VERSION = 1;
let current;
let fallback;
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function persist(state) {
  const record = { version: VERSION, data: clone(state) };
  if (typeof wx !== 'undefined' && wx.setStorageSync) wx.setStorageSync(STORAGE_KEY, record);
  else fallback = record;
}
function valid(value) {
  const amount = function (number) { return Number.isSafeInteger(number) && number >= 0; };
  const item = function (row) { return row && typeof row.id === 'string' && typeof row.productId === 'string' && Number.isSafeInteger(row.quantity) && row.quantity > 0 && amount(row.unitPrice) && amount(row.total); };
  return value && typeof value === 'object' && value.member && typeof value.member === 'object' && !Array.isArray(value.member) && amount(value.member.balance) && amount(value.member.points) &&
    Array.isArray(value.products) && value.products.every(function (p) { return p && typeof p.id === 'string' && typeof p.name === 'string' && amount(p.price) && amount(p.stock) && Array.isArray(p.supportedModes) && Array.isArray(p.specGroups) && p.specGroups.every(function (group) { return group && typeof group.id === 'string' && Array.isArray(group.options) && group.options.every(function (option) { return option && typeof option.id === 'string' && amount(option.extra); }); }); }) &&
    Array.isArray(value.orders) && value.orders.every(function (order) { return order && typeof order.id === 'string' && typeof order.createdAt === 'string' && typeof order.number === 'string' && typeof order.mode === 'string' && typeof order.status === 'string' && Array.isArray(order.items) && order.items.every(item) && amount(order.total); }) &&
    Array.isArray(value.cart) && value.cart.every(item) && Array.isArray(value.addresses) && value.addresses.every(function (address) { return address && typeof address.id === 'string'; }) &&
    Array.isArray(value.coupons) && value.coupons.every(function (coupon) { return coupon && typeof coupon.id === 'string' && amount(coupon.threshold) && amount(coupon.discount); });
}
function normalize(raw) {
  const defaults = seed.initialState();
  const state = Object.assign({}, defaults, clone(raw));
  state.member = Object.assign({}, defaults.member, raw.member);
  state.member.loggedIn = Boolean(state.member.loggedIn);
  if (!Number.isSafeInteger(raw.member.totalRecharged) || raw.member.totalRecharged < 0) state.member.totalRecharged = 0;
  state.member.level = state.member.totalRecharged >= 20000 ? 'VIP会员' : '普通会员';
  ['createTokens', 'rechargeTokens'].forEach(function (key) { if (!state[key] || typeof state[key] !== 'object' || Array.isArray(state[key])) state[key] = {}; });
  // 旧版本可能没有流水。用迁移期初记录衔接现存余额，避免虚构历史充值或丢失账户资产。
  [{ key: 'walletTransactions', target: state.member.balance, value: 'balance' }, { key: 'pointsTransactions', target: state.member.points, value: 'points' }].forEach(function (config) {
    const records = Array.isArray(raw[config.key]) ? clone(raw[config.key]).filter(function (tx) { return tx && typeof tx.id === 'string' && Number.isSafeInteger(tx.amount); }) : [];
    const sum = records.reduce(function (total, tx) { return total + tx.amount; }, 0);
    if (sum !== config.target) {
      const opening = { id: 'migration-' + config.key, type: 'opening', amount: config.target - sum, principal: config.key === 'walletTransactions' ? config.target - sum : 0, gift: 0, createdAt: '2000-01-01T00:00:00.000Z', description: '旧版本账户余额衔接记录' };
      opening[config.value] = opening.amount;
      records.unshift(opening);
    }
    state[config.key] = records;
  });
  state.coupons.forEach(function (coupon) {
    const template = seed.offers.filter(function (offer) { return offer.id === coupon.offerId; })[0] || {};
    if (!Array.isArray(coupon.modes)) coupon.modes = clone(template.modes || []);
    if (!Array.isArray(coupon.categories)) coupon.categories = clone(template.categories || []);
    coupon.scopeLabel = coupon.scopeLabel || template.scopeLabel || '全场商品';
    coupon.modeLabel = coupon.modeLabel || template.modeLabel || '全部履约方式';
    coupon.usedAt = coupon.usedAt || '';
    coupon.reservedOrderId = coupon.reservedOrderId || '';
  });
  if (!Array.isArray(raw.claimedOffers)) state.claimedOffers = state.coupons.map(function (coupon) { return coupon.offerId; }).filter(Boolean);
  state.orders.forEach(function (order) {
    if (!Array.isArray(order.timeline)) order.timeline = [{ status: order.status, label: seed.labels[order.status] || '演示订单', time: order.createdAt }];
  });
  let sawDefault = false;
  state.addresses.forEach(function (address) { address.isDefault = Boolean(address.isDefault) && !sawDefault; if (address.isDefault) sawDefault = true; });
  if (!sawDefault && state.addresses.length) state.addresses[0].isDefault = true;
  let sequence = Number.isSafeInteger(state.sequence) ? Math.max(1000, state.sequence) : 1000;
  ['orders', 'addresses', 'coupons', 'walletTransactions', 'pointsTransactions'].forEach(function (key) {
    state[key].forEach(function (entity) { const suffix = /-(\d+)$/.exec(entity.id); if (suffix && Number.isSafeInteger(Number(suffix[1]))) sequence = Math.max(sequence, Number(suffix[1])); });
  });
  state.sequence = sequence;
  if (!['cat', 'cloud', 'dog'].includes(state.theme)) state.theme = 'cat';
  if (!['dineIn', 'pickup', 'delivery', 'shipping'].includes(state.mode)) state.mode = 'pickup';
  return state;
}
function read() {
  if (current) return current;
  let record;
  try { record = typeof wx !== 'undefined' && wx.getStorageSync ? wx.getStorageSync(STORAGE_KEY) : fallback; } catch (error) { record = null; }
  if (record && Number.isInteger(record.version) && valid(record.data)) {
    // 向后兼容新增的顶层字段，已有业务实体始终保留。
    current = normalize(record.data);
  } else {
    const fresh = seed.initialState();
    persist(fresh);
    current = fresh;
  }
  return current;
}
function get() { return clone(read()); }
function transact(callback) {
  const draft = get();
  const result = callback(draft);
  persist(draft); // 若磁盘写入失败，内存状态亦不更新。
  current = draft;
  return clone(result === undefined ? draft : result);
}
function reset() {
  const fresh = seed.initialState();
  persist(fresh);
  current = fresh;
  return get();
}
module.exports = { get, transact, reset, clone, STORAGE_KEY, VERSION };
