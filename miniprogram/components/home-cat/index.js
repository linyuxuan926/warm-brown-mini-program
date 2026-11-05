Component({
  data: { letters: [{id:'w',c:'W',r:-22,y:31},{id:'e1',c:'E',r:-15,y:11},{id:'l',c:'L',r:-8,y:0},{id:'c',c:'C',r:0,y:-5},{id:'o',c:'O',r:8,y:0},{id:'m',c:'M',r:15,y:11},{id:'e2',c:'E',r:22,y:31}] },
  methods: {
    order(e) { this.triggerEvent('order', {mode: e.currentTarget.dataset.mode}); },
    member() { this.triggerEvent('open', {page:'member'}); }
  }
});
