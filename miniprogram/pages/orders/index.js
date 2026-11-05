const api = require('../../services/api');
const ui = require('../../utils/ui');
const states = { pending: '待支付', preparing: '制作中', ready: '待取餐', delivering: '配送中', toShip: '待发货', shipped: '已发货', completed: '已完成', cancelled: '已取消' };
const modes = { dineIn: '店内点单', pickup: '门店自取', delivery: '外卖配送', shipping: '全国邮寄' };
function stamp(value) { const d = new Date(value); if (isNaN(d.getTime())) return ''; const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
Page({
  data: { filter: 'all', filters: [{ id: 'all', name: '全部' }, { id: 'pending', name: '待支付' }, { id: 'active', name: '进行中' }, { id: 'completed', name: '已完成' }, { id: 'cancelled', name: '已取消' }], orders: [], error: '', busy: false },
  onLoad(query) { if (query.filter) this.setData({ filter: query.filter }); },
  onShow() { const app = getApp(); if (app.globalData.orderFilter) { this.setData({ filter: app.globalData.orderFilter }); delete app.globalData.orderFilter; } this.refresh(); },
  onPullDownRefresh() { this.refresh(); wx.stopPullDownRefresh(); },
  refresh() {
    try {
      const orders = api.getOrders(this.data.filter).map(order => Object.assign({}, order, { statusText: states[order.status] || order.status, modeText: modes[order.mode], dateText: stamp(order.createdAt), totalText: ui.money(order.total), quantity: order.items.reduce((sum, item) => sum + item.quantity, 0), summary: order.items.map(item => item.name).join(' · '), previewItems: order.items.slice(0, 3) }));
      this.setData({ orders, error: '' });
    } catch (error) { this.setData({ error: error.message || '订单读取失败，请重试' }); }
  },
  chooseFilter(event) { this.setData({ filter: event.currentTarget.dataset.id }); this.refresh(); },
  detail(event) { ui.go('/pages/order-detail/index?id=' + encodeURIComponent(event.currentTarget.dataset.id)); },
  pay(event) { ui.pay(event.currentTarget.dataset.id); },
  async cancel(event) { if (this.data.busy) return; this.setData({ busy: true }); try { if (await ui.confirm('取消订单', '取消后将释放占用的优惠券。确定取消这笔订单吗？')) { api.cancelOrder(event.currentTarget.dataset.id); this.refresh(); wx.showToast({ title: '订单已取消', icon: 'none' }); } } catch (error) { ui.toastError(error); } finally { this.setData({ busy: false }); } },
  async reorder(event) { if (this.data.busy) return; this.setData({ busy: true }); try { const result = api.reorder(event.currentTarget.dataset.id); this.refresh(); const skipped = result.skipped || []; if (await ui.confirm('再次购买', '已按当前价格加入 ' + result.added + ' 件商品。' + (skipped.length ? '\n未加入：' + skipped.map(item => typeof item === 'string' ? item : item.name + '（' + (item.reason || '暂不可购买') + '）').join('、') : '') + '\n前往点单页确认商品与规格？')) wx.switchTab({ url: '/pages/menu/index' }); } catch (error) { ui.toastError(error); } finally { this.setData({ busy: false }); } },
  toMenu() { wx.switchTab({ url: '/pages/menu/index' }); }
});
