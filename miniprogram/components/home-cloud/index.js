Component({ methods: {
  order(e) { this.triggerEvent('order',{mode:e.currentTarget.dataset.mode || 'pickup',category:e.currentTarget.dataset.category}); },
  wallet() { this.triggerEvent('open',{page:'wallet'}); }
}});
