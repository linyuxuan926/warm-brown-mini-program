const api = require('../../services/api');
const ui = require('../../utils/ui');
Page({
  data: { theme: 'cat', member: {}, ready: false },
  onShow() {
    try {
      const theme = api.getTheme();
      this.setData({ theme, member: api.getMember(), ready: true });
      wx.setNavigationBarTitle({ title: { cat: '暖棕小屋·烘焙', cloud: '暖棕小屋·甜品', dog: '暖棕小屋·咖啡' }[theme] });
    } catch (error) { ui.toastError(error); }
  },
  async onOrder(event) {
    const { mode, category } = event.detail;
    if (await ui.chooseMode(mode || api.getMode())) {
      getApp().globalData.menuCategory = category || (mode === 'shipping' ? 'gift' : null);
      ui.go('menu');
    }
  },
  onOpen(event) { ui.go(event.detail.page); },
  onLogin() {
    try { api.login(); this.setData({ member: api.getMember() }); wx.showToast({ title: '欢迎来到暖棕小屋', icon: 'none' }); }
    catch (error) { ui.toastError(error); }
  },
  styles() { ui.go('themes'); }
});
