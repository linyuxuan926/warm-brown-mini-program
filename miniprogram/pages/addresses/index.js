const api = require('../../services/api');
const ui = require('../../utils/ui');
function emptyForm() { return { contact: '', phone: '', province: '', city: '', district: '', detail: '', isDefault: false }; }
Page({
  data: { addresses: [], selectMode: false, editing: false, form: emptyForm(), busy: false, selectedId: '' },
  onLoad(query) { this.setData({ selectMode: query.select === '1' }); if (query.select === '1') wx.setNavigationBarTitle({ title: '选择收货地址' }); },
  onShow() { this.refresh(); },
  refresh() { try { const addresses = api.getAddresses().map(item => Object.assign({}, item, { deliveryAvailable: item.province === '浙江省' && item.city === '杭州市' && ['西湖区', '拱墅区', '上城区'].indexOf(item.district) !== -1 })); this.setData({ addresses, selectedId: getApp().globalData.selectedAddressId || '' }); } catch (error) { ui.toastError(error); } },
  add() { this.setData({ form: emptyForm(), editing: true }); },
  edit(event) { const address = this.data.addresses.find(item => item.id === event.currentTarget.dataset.id); if (address) this.setData({ form: Object.assign({}, address), editing: true }); },
  close() { if (!this.data.busy) this.setData({ editing: false }); },
  noop() {},
  input(event) { const field = event.currentTarget.dataset.field; if (['contact', 'phone', 'province', 'city', 'district', 'detail'].indexOf(field) !== -1) this.setData({ ['form.' + field]: event.detail.value }); },
  setDefaultSwitch(event) { this.setData({ 'form.isDefault': event.detail.value }); },
  save() { if (this.data.busy) return; this.setData({ busy: true }); try { api.saveAddress(this.data.form); this.setData({ editing: false }); this.refresh(); wx.showToast({ title: '地址已保存', icon: 'none' }); } catch (error) { ui.toastError(error); } finally { this.setData({ busy: false }); } },
  makeDefault(event) { try { api.setDefaultAddress(event.currentTarget.dataset.id); this.refresh(); wx.showToast({ title: '已设为默认地址', icon: 'none' }); } catch (error) { ui.toastError(error); } },
  async remove(event) { if (this.data.busy) return; const id = event.currentTarget.dataset.id; this.setData({ busy: true }); try { if (!await ui.confirm('删除这个地址', '历史订单中的收货信息会保留，当前地址将从地址簿移除。')) return; api.deleteAddress(id); if (getApp().globalData.selectedAddressId === id) getApp().globalData.selectedAddressId = ''; this.refresh(); } catch (error) { ui.toastError(error); } finally { this.setData({ busy: false }); } },
  choose(event) { if (!this.data.selectMode) return; const id = event.currentTarget.dataset.id; if (!this.data.addresses.some(item => item.id === id)) return; getApp().globalData.selectedAddressId = id; wx.navigateBack(); }
});
