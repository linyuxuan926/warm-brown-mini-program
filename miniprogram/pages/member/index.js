const api = require('../../services/api');
const ui = require('../../utils/ui');
function dateText(value) { const d = new Date(value); if (isNaN(d.getTime())) return ''; const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
Page({
  data: { member: {}, balanceText: '0.00', couponCount: 0, records: [] },
  onShow() { this.refresh(); },
  refresh() { try { const state = api.getState(); const member = api.getMember(); this.setData({ member, balanceText: ui.money(member.balance), couponCount: api.getCoupons().filter(item => item.status === 'available').length, records: (state.pointsTransactions || []).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 5).map(item => Object.assign({}, item, { dateText: dateText(item.createdAt), amountText: (item.amount > 0 ? '+' : '') + item.amount })) }); } catch (error) { ui.toastError(error); } },
  login() { try { api.login(); this.refresh(); wx.showToast({ title: '演示会员已登录', icon: 'none' }); } catch (error) { ui.toastError(error); } },
  open(event) { ui.go('/pages/' + event.currentTarget.dataset.route + '/index'); }
});
