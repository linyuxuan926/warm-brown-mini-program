Component({
  properties: { product: { type: Object, value: null, observer(product) {
    if (!product) return;
    this.setData({ selected: {}, quantity: 1, unitPrice: product.price, subtotal: (product.price / 100).toFixed(2), complete: !(product.specGroups || []).some(g => g.required) });
  }}},
  data: { selected: {}, quantity: 1, subtotal: '0.00', complete: false },
  methods: {
    noop() {}, close() { this.triggerEvent('close'); },
    select(e) { const {group,option} = e.currentTarget.dataset; const selected = Object.assign({}, this.data.selected, {[group]:option}); this.recalculate(selected, this.data.quantity); },
    quantity(e) { const quantity = Math.max(1, Math.min(this.data.product.stock, 99, this.data.quantity + Number(e.currentTarget.dataset.delta))); this.recalculate(this.data.selected, quantity); },
    recalculate(selected, quantity) {
      const product = this.data.product;
      const groups = product.specGroups || [];
      let unitPrice = product.price;
      groups.forEach(g => { const option = g.options.find(o => o.id === selected[g.id]); if (option) unitPrice += option.extra || 0; });
      this.setData({selected, quantity, unitPrice, subtotal: (unitPrice * quantity / 100).toFixed(2), complete: groups.every(g => !g.required || !!selected[g.id])});
    },
    add() { if (this.data.complete) this.triggerEvent('add',{productId:this.data.product.id,specs:this.data.selected,quantity:this.data.quantity}); }
  }
});
