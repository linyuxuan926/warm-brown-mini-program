Component({properties:{items:Array,total:String,count:Number},methods:{
  noop(){},close(){this.triggerEvent('close');},clear(){this.triggerEvent('clear');},change(e){this.triggerEvent('change',{id:e.currentTarget.dataset.id,delta:Number(e.currentTarget.dataset.delta)});},checkout(){this.triggerEvent('checkout');}
}});
