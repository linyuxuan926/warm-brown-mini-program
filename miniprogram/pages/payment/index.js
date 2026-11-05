const api=require('../../services/api');const ui=require('../../utils/ui');
Page({
  data:{order:null,method:'mock',busy:false,error:''},
  onLoad(options){this.orderId=options.id;this.refresh();},
  onShow(){if(this.orderId)this.refresh();},
  refresh(){try{const order=api.getOrder(this.orderId);const member=api.getMember();this.setData({order,totalText:ui.money(order.total),balanceText:ui.money(member.balance),member,modeName:ui.MODE_NAMES[order.mode]});}catch(error){this.setData({error:error.message});}},
  method(e){this.setData({method:e.currentTarget.dataset.method});},
  async result(e){
    if(this.data.busy||!this.data.order)return;
    const outcome=e.currentTarget.dataset.outcome;
    this.setData({busy:true,error:''});
    try{
      const order=api.payOrder(this.orderId,this.data.method,outcome);
      if(order.paidAt){wx.redirectTo({url:'/pages/success/index?id='+order.id});return;}
      await new Promise(resolve=>wx.showModal({title:outcome==='failure'?'这次模拟支付未成功':'已取消本次模拟支付',content:'订单已保留在“待支付”中，可随时继续支付或取消订单。',showCancel:false,confirmText:'查看订单',confirmColor:'#60371F',success:resolve,fail:resolve}));
      wx.redirectTo({url:'/pages/order-detail/index?id='+order.id});
    }catch(error){this.setData({error:error.message});ui.toastError(error);}finally{this.setData({busy:false});this.refresh();}
  },
  order(){if(this.data.order)wx.redirectTo({url:'/pages/order-detail/index?id='+this.orderId});},
  wallet(){ui.go('wallet');},
  login(){api.login();this.refresh();}
});
