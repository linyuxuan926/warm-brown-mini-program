const api = require('./services/api');
App({
  globalData: { selectedAddressId: null, selectedCouponId: null, menuCategory: null },
  onLaunch() {
    try { api.init(); } catch (error) {
      console.error('演示数据初始化失败', error);
      wx.showModal({ title: '数据读取失败', content: '请重新启动小程序。若本地数据损坏，可清除开发者工具缓存后重试。', showCancel: false });
    }
  }
});
