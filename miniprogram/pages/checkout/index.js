const api = require('../../services/api');
const ui = require('../../utils/ui');
Page({
  data: {mode:'pickup',modeName:'',items:[],quote:null,address:null,couponId:'',couponName:'选择一张小屋优惠券',error:'',busy:false,orderId:'',form:{contact:'',phone:'',tableNumber:'',pickupTime:'约20分钟后',remark:''},pickupTimes:['约20分钟后','约40分钟后','约60分钟后']},
  onLoad() {
    this.submitToken = 'checkout-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const addresses=api.getAddresses(); const address=addresses.find(a=>a.isDefault)||addresses[0];
    const draft=getApp().globalData.fulfillmentDraft || {};
    this.setData({store:api.getStore(),form:Object.assign({},this.data.form,{contact:address?address.contact:'',phone:address?address.phone:''},draft)});
  },
  onShow() { this.refresh(); },
  refresh() {
    if(this.data.orderId)return;
    const app=getApp();const mode=api.getMode();const addresses=api.getAddresses();
    const address=addresses.find(a=>a.id===app.globalData.selectedAddressId)||addresses.find(a=>a.isDefault)||addresses[0]||null;
    const couponId=app.globalData.selectedCouponId !== null ? app.globalData.selectedCouponId : this.data.couponId;
    this.setData({mode,modeName:ui.MODE_NAMES[mode],address,couponId});
    if(!api.getCart().count){this.setData({items:[],quote:null,error:''});return;}
    try {
      const quote=api.quote({addressId:(mode==='delivery'||mode==='shipping')&&address?address.id:undefined,couponId});
      const coupon=api.getCoupons().find(c=>c.id===couponId);
      this.setData({quote,items:quote.items.map(i=>Object.assign({},i,{priceText:ui.money(i.total)})),subtotalText:ui.money(quote.subtotal),discountText:ui.money(quote.discount),feeText:ui.money(quote.fee),totalText:ui.money(quote.total),couponName:coupon?coupon.name+' · 减 ¥'+ui.money(quote.discount):'选择一张小屋优惠券',error:''});
    } catch(error) {
      const cart=api.getCart();
      this.setData({quote:null,items:cart.items.map(i=>Object.assign({},i,{priceText:ui.money(i.total)})),error:error.message});
    }
  },
  input(e) {const key=e.currentTarget.dataset.key;this.setData({['form.'+key]:e.detail.value});},
  pickup(e){this.setData({'form.pickupTime':this.data.pickupTimes[Number(e.detail.value)]});},
  address(){ui.go('/pages/addresses/index?select=1');},
  coupons(){ui.go('/pages/coupons/index?select=1');},
  removeCoupon(){getApp().globalData.selectedCouponId='';this.setData({couponId:''});this.refresh();},
  store(){ui.go('store');},
  async mode(){const ids=['dineIn','pickup','delivery','shipping'];wx.showActionSheet({itemList:ids.map(id=>ui.MODE_NAMES[id]),success:async r=>{if(await ui.chooseMode(ids[r.tapIndex]))this.refresh();}});},
  submit(){
    if(this.data.busy||this.data.orderId)return;
    this.setData({busy:true});
    try{
      const order=api.createOrder(Object.assign({},this.data.form,{token:this.submitToken,addressId:this.data.address?this.data.address.id:undefined,couponId:this.data.couponId}));
      this.setData({orderId:order.id});getApp().globalData.selectedCouponId=null;
      wx.removeTabBarBadge({index:1});ui.pay(order.id);
    }catch(error){this.setData({error:error.message});ui.toastError(error);}finally{this.setData({busy:false});}
  },
  viewOrder(){ui.go('/pages/order-detail/index?id='+this.data.orderId);},
  menu(){ui.go('menu');}
});
