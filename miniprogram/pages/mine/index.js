const api = require('../../services/api');
const ui = require('../../utils/ui');
const themes = { cat: '猫咪烘焙', cloud: '云朵蛋糕', dog: '小狗咖啡' };
Page({
  data: { member: {}, balanceText: '0.00', couponCount: 0, themeName: '', busy: false, shortcuts: [{ id: 'pending', name: '待支付', icon: 'wallet' }, { id: 'active', name: '进行中', icon: 'coffee' }, { id: 'completed', name: '已完成', icon: 'check' }, { id: 'all', name: '全部订单', icon: 'order' }], entries: [{ route: 'addresses', name: '收货地址', en: 'ADDRESS BOOK', icon: 'address' }, { route: 'member', name: '会员中心', en: 'MEMBER CENTER', icon: 'crown' }, { route: 'wallet', name: '模拟储值', en: 'STORED VALUE', icon: 'wallet' }, { route: 'coupons', name: '领券中心', en: 'COUPONS', icon: 'coupon' }, { route: 'points', name: '积分小铺', en: 'POINTS SHOP', icon: 'points' }, { route: 'themes', name: '首页风格', en: 'YOUR LITTLE WORLD', icon: 'theme' }, { route: 'store', name: '门店信息', en: 'VISIT US', icon: 'store' }, { route: 'about', name: '关于暖棕', en: 'OUR STORY', icon: 'info' }] },
  onShow() { this.refresh(); },
  refresh() { try { const member = api.getMember(); const coupons = api.getCoupons(); this.setData({ member, balanceText: ui.money(member.balance), couponCount: coupons.filter(item => item.status === 'available').length, themeName: themes[api.getTheme()] }); } catch (error) { ui.toastError(error); } },
  login() { try { api.login(); this.refresh(); wx.showToast({ title: '欢迎来到暖棕小屋', icon: 'none' }); } catch (error) { ui.toastError(error); } },
  async logout() { if (await ui.confirm('退出演示账户', '本地订单、余额和地址都会保留，可随时再次演示登录。')) { try { api.logout(); this.refresh(); } catch (error) { ui.toastError(error); } } },
  open(event) { ui.go('/pages/' + event.currentTarget.dataset.route + '/index'); },
  orders(event) { getApp().globalData.orderFilter = event.currentTarget.dataset.filter || 'all'; wx.switchTab({ url: '/pages/orders/index' }); },
  async reset() { if (this.data.busy) return; this.setData({ busy: true }); try { if (!await ui.confirm('重置演示数据', '将清除你的本地下单、储值、地址及模板选择，并恢复初始样例。')) return; if (!await ui.confirm('再次确认重置', '此操作无法撤回。确定恢复最初的演示数据吗？')) return; api.reset(); const app = getApp(); app.globalData.selectedCouponId = null; app.globalData.selectedAddressId = null; delete app.globalData.orderFilter; delete app.globalData.fulfillmentDraft; app.globalData.menuCategory = null; wx.removeTabBarBadge({ index: 1 }); this.refresh(); wx.showToast({ title: '演示数据已恢复', icon: 'none' }); } catch (error) { ui.toastError(error); } finally { this.setData({ busy: false }); } }
});
