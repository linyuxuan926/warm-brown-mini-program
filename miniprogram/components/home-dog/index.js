Component({properties:{loggedIn:Boolean,nickname:String},methods:{
  order(e){this.triggerEvent('order',{mode:e.currentTarget.dataset.mode});},
  open(e){this.triggerEvent('open',{page:e.currentTarget.dataset.page});},
  login(){this.triggerEvent('login');}
}});
