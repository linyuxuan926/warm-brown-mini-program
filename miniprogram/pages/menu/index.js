const api = require('../../services/api');
const ui = require('../../utils/ui');
Page({
  data: { mode: 'pickup', modeName: '', categoryId: 'popular', categories: [], products: [], search: '', cart: {items:[],count:0,subtotal:0}, cartTotal: '0.00', cartVisible: false, product: null, detailText: '', scrollTop: 0 },
  onLoad() { this.setData({categories:api.getCatalog().categories,store:api.getStore()}); },
  onShow() {
    const category = getApp().globalData.menuCategory;
    if (category) { this.setData({categoryId:category,search:''}); getApp().globalData.menuCategory = null; }
    else if (api.getMode() === 'shipping' && this.data.categoryId === 'popular') this.setData({categoryId:'gift',search:''});
    this.refresh();
  },
  refresh() {
    try {
      const mode = api.getMode();
      const cart = api.getCart();
      cart.items = cart.items.map(i => Object.assign({}, i, {priceText:ui.money(i.total)}));
      const products = api.getProducts({categoryId:this.data.search ? undefined : this.data.categoryId,search:this.data.search,mode}).map(p => Object.assign({},p,{priceText:ui.money(p.price),quantity:cart.items.filter(i=>i.productId===p.id).reduce((n,i)=>n+i.quantity,0)}));
      const draft = getApp().globalData.fulfillmentDraft || {};
      const addresses = api.getAddresses();
      const address = addresses.find(a=>a.id === getApp().globalData.selectedAddressId) || addresses.find(a=>a.isDefault) || addresses[0];
      const detailText = mode==='dineIn' ? '桌号：' + (draft.tableNumber || '请填写') : mode==='pickup' ? '取餐：' + (draft.pickupTime || '约20分钟后') : address ? address.city + address.district + ' · ' + address.contact : '请添加收货地址';
      this.setData({mode,modeName:ui.MODE_NAMES[mode],products,cart,cartTotal:ui.money(cart.subtotal),detailText});
      if (cart.count) wx.setTabBarBadge({index:1,text:String(Math.min(cart.count,99))}); else wx.removeTabBarBadge({index:1});
    } catch (error) { ui.toastError(error); }
  },
  category(e) { this.setData({categoryId:e.currentTarget.dataset.id,search:'',scrollTop:0}); this.refresh(); },
  search(e) { this.setData({search:e.detail.value.trim(),scrollTop:0}); this.refresh(); },
  clearSearch() { this.setData({search:''}); this.refresh(); },
  switchMode() {
    const ids=['dineIn','pickup','delivery','shipping'];
    wx.showActionSheet({itemList:ids.map(i=>ui.MODE_NAMES[i]+(i===this.data.mode?' · 当前':'')),success:async r=>{if(await ui.chooseMode(ids[r.tapIndex])){this.setData({categoryId:ids[r.tapIndex]==='shipping'?'gift':'popular',search:''});this.refresh();}}});
  },
  configure() {
    if (this.data.mode === 'dineIn') wx.showModal({title:'填写堂食桌号',editable:true,placeholderText:'例如 A06',content:(getApp().globalData.fulfillmentDraft || {}).tableNumber || '',confirmColor:'#60371F',success:r=>{if(r.confirm){if(!/^[A-Za-z0-9\u4e00-\u9fa5-]{1,12}$/.test(r.content.trim())){ui.toastError(new Error('请输入1～12位有效桌号'));return;}const draft=getApp().globalData.fulfillmentDraft||{};draft.tableNumber=r.content.trim();getApp().globalData.fulfillmentDraft=draft;this.refresh();}}});
    else if(this.data.mode === 'pickup') wx.showActionSheet({itemList:['约20分钟后','约40分钟后','约60分钟后'],success:r=>{const draft=getApp().globalData.fulfillmentDraft||{};draft.pickupTime=['约20分钟后','约40分钟后','约60分钟后'][r.tapIndex];getApp().globalData.fulfillmentDraft=draft;this.refresh();}});
    else ui.go('/pages/addresses/index?select=1');
  },
  openProduct(e) { const product = this.data.products.find(p=>p.id===e.currentTarget.dataset.id); if(product && product.stock>0)this.setData({product}); },
  closeProduct() { this.setData({product:null}); },
  addProduct(e) {
    try { api.addCart(e.detail.productId,e.detail.specs,e.detail.quantity); this.closeProduct(); this.refresh(); wx.showToast({title:'已装进小袋子',icon:'none'}); }
    catch (error) { ui.toastError(error); }
  },
  toggleCart() { this.setData({cartVisible:!this.data.cartVisible}); },
  closeCart() { this.setData({cartVisible:false}); },
  changeCart(e) { try {api.changeCart(e.detail.id,e.detail.delta);this.refresh();}catch(error){ui.toastError(error);} },
  async clearCart() { if(await ui.confirm('清空小袋子','确认移除购物车中的所有商品？')){api.clearCart();this.refresh();} },
  checkout() { if(!this.data.cart.count)return;this.closeCart();ui.go('checkout'); },
  store() { ui.go('store'); }
});
