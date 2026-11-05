const api = require('../../services/api');
const ui = require('../../utils/ui');
Page({
  data: { store: {}, error: '' },
  onLoad() { this.load(); },
  load() { try { this.setData({ store: api.getStore(), error: '' }); } catch (error) { this.setData({ error: error.message || '门店信息加载失败' }); } },
  copyAddress() { wx.setClipboardData({ data: this.data.store.address }); },
  phoneInfo() { wx.showModal({ title: '虚构演示联系方式', content: this.data.store.phone + '\n此号码仅作课程界面展示，不会自动拨打。真实营业请以实际门店信息为准。', showCancel: false, confirmColor: '#60371F' }); },
  async order(event) { if (await ui.chooseMode(event.currentTarget.dataset.mode)) wx.switchTab({ url: '/pages/menu/index' }); }
});
