const api = require('../services/api');
const MODE_NAMES = { dineIn: '店内点单', pickup: '门店自取', delivery: '外卖配送', shipping: '全国邮寄' };
function money(value) { return (Number(value || 0) / 100).toFixed(2); }
function toastError(error) { wx.showToast({ title: (error && error.message) || String(error || '请稍后重试'), icon: 'none', duration: 2600 }); }
function go(path) {
  const tabs = ['home', 'menu', 'orders', 'mine'];
  const route = path.startsWith('/') ? path : '/pages/' + path + '/index';
  if (tabs.some(name => route === '/pages/' + name + '/index')) wx.switchTab({ url: route });
  else wx.navigateTo({ url: route });
}
function confirm(title, content) { return new Promise(resolve => wx.showModal({ title, content, confirmColor: '#60371F', success: r => resolve(r.confirm), fail: () => resolve(false) })); }
async function chooseMode(mode) {
  try {
    const incompatible = api.checkMode(mode);
    if (incompatible.length && !(await confirm('切换履约方式', '以下商品不适用“' + MODE_NAMES[mode] + '”：' + incompatible.join('、') + '。确认从购物车移除这些商品并切换？'))) return false;
    api.setMode(mode, incompatible.length > 0);
    return true;
  } catch (error) { toastError(error); return false; }
}
function pay(id) { go('/pages/payment/index?id=' + encodeURIComponent(id)); }
module.exports = { money, toastError, go, confirm, chooseMode, pay, MODE_NAMES };
