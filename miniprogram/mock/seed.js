const catalog = require('./catalog');
function clone(value) { return JSON.parse(JSON.stringify(value)); }
const offers = [
  { id: 'offer-welcome', name: '午后小确幸券', threshold: 2500, discount: 500, days: 30, modes: [], categories: [], scopeLabel: '全场商品', modeLabel: '全部履约方式', pointsCost: 0 },
  { id: 'offer-coffee', name: '咖啡时光券', threshold: 3000, discount: 800, days: 20, modes: ['dineIn', 'pickup', 'delivery'], categories: ['coffee'], scopeLabel: '咖啡饮品', modeLabel: '堂食 / 自取 / 外卖', pointsCost: 0 },
  { id: 'offer-gift', name: '邮寄心意券', threshold: 8800, discount: 1500, days: 30, modes: ['shipping'], categories: ['gift', 'popular', 'bread'], scopeLabel: '可邮寄烘焙与礼盒', modeLabel: '全国邮寄', pointsCost: 0 },
  { id: 'offer-teatime', name: '暖棕下午茶券', threshold: 5000, discount: 1000, days: 14, modes: [], categories: [], scopeLabel: '全场商品', modeLabel: '全部履约方式', pointsCost: 0 },
  { id: 'offer-points', name: '积分兑换满减券', threshold: 5000, discount: 1000, days: 30, modes: [], categories: [], scopeLabel: '全场商品', modeLabel: '全部履约方式', pointsCost: 100 }
];
const labels = { pending: '待支付', preparing: '制作中', ready: '待取餐', delivering: '配送中', toShip: '待发货', shipped: '已发货', completed: '已完成', cancelled: '已取消' };
function initialState() {
  const now = Date.now();
  const time = function (days, minutes) { return new Date(now - days * 86400000 - 3600000 + (minutes || 0) * 60000).toISOString(); };
  const products = clone(catalog.products);
  const oneItem = function (productId) {
    const p = products.filter(function (item) { return item.id === productId; })[0];
    const specs = {};
    const names = [];
    p.specGroups.forEach(function (group) { specs[group.id] = group.options[0].id; names.push(group.options[0].name); });
    return { id: p.id + '::' + Object.keys(specs).sort().map(function (key) { return key + '=' + specs[key]; }).join('&'), productId: p.id, name: p.name, image: p.image, specs, specText: names.join(' / ') || '标准份', quantity: 1, unitPrice: p.price, total: p.price, categoryId: p.categoryId };
  };
  const makeOrder = function (suffix, mode, status, productId, days, paymentMethod) {
    const items = [oneItem(productId)];
    const createdAt = time(days);
    const order = { id: 'seed-' + suffix, number: 'WB' + new Date(createdAt).toISOString().slice(0, 10).replace(/-/g, '') + suffix, createdAt, mode, status, items, subtotal: items[0].total, discount: 0, fee: 0, total: items[0].total, contact: '林同学', phone: '13800138000', tableNumber: mode === 'dineIn' ? 'A06' : '', pickupTime: mode === 'pickup' ? '尽快取餐' : '', address: null, remark: '初始演示订单', couponId: '', pickupCode: mode === 'pickup' && status !== 'pending' && status !== 'cancelled' ? '0628' : '', paymentMethod: paymentMethod || '', pointsAwarded: status === 'completed', timeline: [{ status: 'pending', label: '订单已创建', time: createdAt }] };
    if (status === 'completed') {
      order.timeline.push({ status: 'preparing', label: '模拟支付成功 · 制作中', time: time(days, 1) });
      order.timeline.push({ status: 'ready', label: '待取餐', time: time(days, 5) });
      order.timeline.push({ status, label: labels[status], time: time(days, 8) });
      order.completedAt = time(days, 8);
    } else if (status !== 'pending') order.timeline.push({ status, label: labels[status], time: time(days, status === 'cancelled' ? 8 : 1) });
    if (paymentMethod) order.paidAt = time(days, 1);
    return order;
  };
  const orders = [makeOrder('0101', 'pickup', 'pending', 'p11', 0), makeOrder('0102', 'dineIn', 'preparing', 'p10', 0, 'mock'), makeOrder('0103', 'pickup', 'completed', 'p07', 2, 'balance'), makeOrder('0104', 'dineIn', 'cancelled', 'p02', 3)];
  // 已支付的演示商品同步扣减实体库存；待支付订单仅占用库存。
  products.forEach(function (p) { orders.forEach(function (order) { if (order.paidAt) order.items.forEach(function (item) { if (item.productId === p.id) p.stock -= item.quantity; }); }); });
  const coupons = offers.slice(0, 3).map(function (offer, index) {
    return Object.assign({}, clone(offer), { id: 'coupon-' + (index + 1), offerId: offer.id, claimedAt: time(1), expiresAt: new Date(now + offer.days * 86400000).toISOString(), usedAt: '', reservedOrderId: '' });
  });
  return {
    theme: 'cat', mode: 'pickup', sequence: 1000, products,
    member: { id: 'demo-member', loggedIn: false, nickname: '暖棕体验官', level: '普通会员', balance: 12000, points: 320, totalRecharged: 10000 },
    addresses: [
      { id: 'address-hangzhou', contact: '林同学', phone: '13800138000', province: '浙江省', city: '杭州市', district: '西湖区', detail: '文三路128号暖棕公寓2幢101室', isDefault: true },
      { id: 'address-shanghai', contact: '陈同学', phone: '13900139000', province: '上海市', city: '上海市', district: '徐汇区', detail: '田林路88号梧桐公寓3幢502室', isDefault: false }
    ],
    orders, cart: [], coupons,
    walletTransactions: [
      { id: 'wallet-seed-opening', type: 'opening', amount: 3000, principal: 3000, gift: 0, balance: 3000, createdAt: time(7), description: '演示账户初始余额' },
      { id: 'wallet-seed-recharge', type: 'recharge', amount: 11000, principal: 10000, gift: 1000, balance: 14000, createdAt: time(5), description: '演示储值：充100赠10' },
      { id: 'wallet-seed-order', type: 'payment', amount: -2000, principal: 0, gift: 0, balance: 12000, createdAt: time(2, 1), orderId: 'seed-0103', description: '订单余额支付' }
    ],
    pointsTransactions: [
      { id: 'points-seed-opening', type: 'opening', amount: 300, points: 300, createdAt: time(7), description: '演示账户初始积分' },
      { id: 'points-seed-order', type: 'earned', amount: 20, points: 320, createdAt: time(2, 8), orderId: 'seed-0103', description: '订单完成奖励：实付每1元积1分' }
    ],
    createTokens: {}, rechargeTokens: {}, claimedOffers: offers.slice(0, 3).map(function (offer) { return offer.id; })
  };
}
module.exports = { initialState, offers, labels };
