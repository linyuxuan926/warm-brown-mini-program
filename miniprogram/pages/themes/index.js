const api = require('../../services/api');
const ui = require('../../utils/ui');
Page({
  data: { theme: 'cat', busy: false },
  onShow() { try { this.setData({ theme: api.getTheme() }); } catch (error) { ui.toastError(error); } },
  choose(event) { if (this.data.busy) return; this.setData({ busy: true }); try { const id = event.currentTarget.dataset.id; api.setTheme(id); this.setData({ theme: id }); wx.showToast({ title: '已保存你的首页风格', icon: 'none' }); } catch (error) { ui.toastError(error); } finally { this.setData({ busy: false }); } },
  home() { wx.switchTab({ url: '/pages/home/index' }); }
});
