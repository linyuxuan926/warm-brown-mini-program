const api = require('../../services/api');
const ui = require('../../utils/ui');
function dateText(value) { const d = new Date(value); if (isNaN(d.getTime())) return ''; const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
Page({
  data: { member: {}, balanceText: '0.00', selected: 10000, busy: false, records: [], plans: [{ amount: 10000, title: '100', gift: '赠 10 元', received: '到账 110 元' }, { amount: 20000, title: '200', gift: '赠 30 元', received: '到账 230 元' }, { amount: 50000, title: '500', gift: '赠 100 元', received: '到账 600 元' }] },
  onShow() { this.refresh(); },
  refresh() { try { const member = api.getMember(); const records = (api.getState().walletTransactions || []).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).map(item => Object.assign({}, item, { amountText: (item.amount >= 0 ? '+' : '−') + ui.money(Math.abs(item.amount)), balanceText: ui.money(item.balance), principalText: ui.money(item.principal || 0), giftText: ui.money(item.gift || 0), dateText: dateText(item.createdAt) })); this.setData({ member, balanceText: ui.money(member.balance), records }); } catch (error) { ui.toastError(error); } },
  choose(event) { if (!this.data.busy) { this.setData({ selected: Number(event.currentTarget.dataset.amount) }); this.rechargeToken = ''; } },
  login() { try { api.login(); this.refresh(); wx.showToast({ title: '已登录演示会员', icon: 'none' }); } catch (error) { ui.toastError(error); } },
  async recharge() { if (this.data.busy) return; if (!this.data.member.loggedIn) { ui.toastError(new Error('请先登录演示会员')); return; } this.setData({ busy: true }); const amount = this.data.selected; try { if (!await ui.confirm('确认模拟储值', '演示充值 ¥' + ui.money(amount) + '，仅增加本地演示余额，不收取真实费用。')) return; if (!this.rechargeToken) this.rechargeToken = 'recharge-' + Date.now() + '-' + Math.random().toString(36).slice(2); api.recharge(amount, this.rechargeToken); this.rechargeToken = ''; this.refresh(); wx.showToast({ title: '演示储值已到账', icon: 'none' }); } catch (error) { ui.toastError(error); } finally { this.setData({ busy: false }); } }
});
