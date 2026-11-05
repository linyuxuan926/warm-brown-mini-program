const api = require('../../services/api');
const ui = require('../../utils/ui');
const statusNames = { pending: '等待付款', preparing: '正在用心制作', ready: '做好啦，等你来取', delivering: '美好正在路上', toShip: '礼物正在打包', shipped: '包裹已经出发', completed: '这一份暖意，已送达', cancelled: '订单已取消' };
const descriptions = { pending: '完成模拟支付后，我们就开始准备。', preparing: '新鲜制作需要一点时间，谢谢你的耐心。', ready: '请凭订单信息或取餐码到门店领取。', delivering: '演示配送中，无真实骑手或实时轨迹。', toShip: '预计 1–2 个工作日内发货，此处为演示状态。', shipped: '演示物流已发出，无真实运单或物流接口。', completed: '感谢光临暖棕小屋，期待与你再次相遇。', cancelled: '未产生扣款，占用的优惠券已释放。' };
const modes = { dineIn: '店内点单', pickup: '门店自取', delivery: '外卖配送', shipping: '全国邮寄' };
const nextActions = { preparing: '推进为待取餐', ready: '确认完成订单', delivering: '确认配送完成', toShip: '推进为已发货', shipped: '确认收货完成' };
function dateText(value) { if (!value) return ''; const date = new Date(value); if (isNaN(date.getTime())) return String(value); const pad = n => String(n).padStart(2, '0'); return date.getFullYear() + '.' + pad(date.getMonth() + 1) + '.' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()); }
Page({
  data: { order: null, error: '', busy: false },
  onLoad(query) { this.orderId = query.id || ''; },
  onShow() { this.refresh(); },
  refresh() { try { const order = api.getOrder(this.orderId); if (!order) throw new Error('没有找到这笔订单'); const view = Object.assign({}, order, { statusText: statusNames[order.status], description: descriptions[order.status], modeText: modes[order.mode], dateText: dateText(order.createdAt), totalText: ui.money(order.total), subtotalText: ui.money(order.subtotal), discountText: ui.money(order.discount), feeText: ui.money(order.fee), items: order.items.map(item => Object.assign({}, item, { priceText: ui.money(item.unitPrice), totalText: ui.money(item.total === undefined ? item.unitPrice * item.quantity : item.total) })), timeline: (order.timeline || []).map((item, index) => Object.assign({}, item, { id: 'step-' + index, dateText: dateText(item.time) })), nextAction: order.status === 'preparing' && order.mode === 'delivery' ? '推进为配送中' : nextActions[order.status], quantity: order.items.reduce((sum, item) => sum + item.quantity, 0), tracking: order.trackingNumber || 'DEMO' + String(order.number).slice(-10) }); this.setData({ order: view, error: '' }); } catch (error) { this.setData({ order: null, error: error.message || '订单读取失败' }); } },
  pay() { ui.pay(this.orderId); },
  async cancel() { if (this.data.busy) return; this.setData({ busy: true }); try { if (await ui.confirm('取消订单', '确认取消这笔待支付订单？优惠券将解除占用，能否再次使用以有效期为准。')) { api.cancelOrder(this.orderId); this.refresh(); } } catch (error) { ui.toastError(error); } finally { this.setData({ busy: false }); } },
  async advance() { if (this.data.busy) return; this.setData({ busy: true }); try { if (await ui.confirm('演示状态推进', '仅推进一个合法步骤，用于课堂演示。首次完成订单将按规则发放积分。')) { api.advanceOrder(this.orderId); this.refresh(); wx.showToast({ title: '演示状态已更新', icon: 'none' }); } } catch (error) { ui.toastError(error); } finally { this.setData({ busy: false }); } },
  async reorder() { if (this.data.busy) return; this.setData({ busy: true }); try { const result = api.reorder(this.orderId); const skipped = result.skipped || []; wx.showModal({ title: '已重新校验商品', content: '已按当前价格和库存加入 ' + result.added + ' 件商品。' + (skipped.length ? '\n未加入：' + skipped.map(item => typeof item === 'string' ? item : item.name + '（' + (item.reason || '不可购买') + '）').join('、') : '\n请确认规格后结算。'), showCancel: false, confirmColor: '#60371F', success: () => wx.switchTab({ url: '/pages/menu/index' }) }); } catch (error) { ui.toastError(error); } finally { this.setData({ busy: false }); } },
  toOrders() { wx.switchTab({ url: '/pages/orders/index' }); },
  copyNumber() { wx.setClipboardData({ data: this.data.order.number }); }
});
