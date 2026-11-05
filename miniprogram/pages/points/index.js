const api = require('../../services/api');
const ui = require('../../utils/ui');
function dateText(value) { const d = new Date(value); if (isNaN(d.getTime())) return ''; const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
Page({
  data: { member: {}, offers: [], records: [], busy: false },
  onShow() { this.refresh(); },
  refresh() { try { const member = api.getMember(); const offers = api.getCouponOffers().filter(item => item.pointsCost > 0).map(item => Object.assign({}, item, { discountText: ui.money(item.discount).replace(/\.00$/, ''), thresholdText: ui.money(item.threshold).replace(/\.00$/, ''), enough: member.points >= item.pointsCost })); const records = (api.getState().pointsTransactions || []).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).map(item => Object.assign({}, item, { dateText: dateText(item.createdAt), amountText: (item.amount > 0 ? '+' : '') + item.amount })); this.setData({ member, offers, records }); } catch (error) { ui.toastError(error); } },
  login() { try { api.login(); this.refresh(); wx.showToast({ title: '演示会员已登录', icon: 'none' }); } catch (error) { ui.toastError(error); } },
  async redeem(event) { if (this.data.busy) return; const offer = this.data.offers.find(item => item.id === event.currentTarget.dataset.id); if (!offer) return; this.setData({ busy: true }); try { if (!await ui.confirm('兑换一份小心意', '使用 ' + offer.pointsCost + ' 积分兑换「' + offer.name + '」，兑换后可在领券中心查看。')) return; api.redeemCoupon(offer.id); this.refresh(); wx.showToast({ title: '兑换成功，已放入券包', icon: 'none' }); } catch (error) { ui.toastError(error); } finally { this.setData({ busy: false }); } },
  coupons() { ui.go('/pages/coupons/index'); }
});
