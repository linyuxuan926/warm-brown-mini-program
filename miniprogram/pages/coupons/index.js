const api = require('../../services/api');
const ui = require('../../utils/ui');
const statusNames = { available: '可使用', reserved: '待支付订单占用', used: '已使用', expired: '已过期' };
function decorate(item) { return Object.assign({}, item, { discountText: ui.money(item.discount).replace(/\.00$/, ''), thresholdText: ui.money(item.threshold).replace(/\.00$/, ''), expiresText: String(item.expiresAt || '').slice(0, 10).replace(/-/g, '.'), statusText: statusNames[item.status] || '', eligible: item.status === 'available' && !item.reason }); }
Page({
  data: { selectMode: false, tab: 'owned', coupons: [], offers: [], member: {}, busy: false, selectedId: '' },
  onLoad(query) { this.setData({ selectMode: query.select === '1', tab: query.select === '1' ? 'owned' : 'offers' }); if (query.select === '1') wx.setNavigationBarTitle({ title: '选择优惠券' }); },
  onShow() { this.refresh(); },
  refresh() { try { const coupons = api.getCoupons().map(decorate); const offers = api.getCouponOffers().filter(item => !item.pointsCost).map(decorate); this.setData({ coupons, offers, member: api.getMember(), selectedId: getApp().globalData.selectedCouponId || '' }); } catch (error) { ui.toastError(error); } },
  chooseTab(event) { this.setData({ tab: event.currentTarget.dataset.id }); },
  login() { try { api.login(); this.refresh(); wx.showToast({ title: '演示会员已登录', icon: 'none' }); } catch (error) { ui.toastError(error); } },
  claim(event) { if (this.data.busy) return; this.setData({ busy: true }); try { api.claimCoupon(event.currentTarget.dataset.id); this.refresh(); wx.showToast({ title: '优惠券已放入口袋', icon: 'none' }); } catch (error) { ui.toastError(error); } finally { this.setData({ busy: false }); } },
  select(event) { const id = event.currentTarget.dataset.id; const coupon = this.data.coupons.find(item => item.id === id); if (!this.data.selectMode) return; if (!coupon || !coupon.eligible) { ui.toastError(new Error(coupon ? coupon.reason || coupon.statusText : '优惠券不存在')); return; } getApp().globalData.selectedCouponId = id; wx.navigateBack(); },
  noCoupon() { getApp().globalData.selectedCouponId = ''; wx.navigateBack(); },
  points() { ui.go('/pages/points/index'); }
});
