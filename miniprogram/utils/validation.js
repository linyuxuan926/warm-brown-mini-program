function fail(message) { throw new Error(message); }
function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function integer(value, label, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(label + '无效');
  return value;
}
function phone(value) {
  const result = text(value);
  if (!/^1[3-9]\d{9}$/.test(result)) fail('请输入有效的11位手机号');
  return result;
}
function contact(value) {
  const result = text(value);
  if (result.length < 2 || result.length > 20) fail('联系人请填写2～20个字');
  return result;
}
function address(input) {
  input = input || {};
  const result = { contact: contact(input.contact), phone: phone(input.phone) };
  ['province', 'city', 'district'].forEach(function (key) {
    result[key] = text(input[key]);
    if (!result[key] || result[key].length > 30 || /[<>]/.test(result[key])) fail('请完整选择省、市、区');
  });
  result.detail = text(input.detail);
  if (result.detail.length < 5 || result.detail.length > 100) fail('详细地址请填写5～100个字，包含街道和门牌号');
  result.isDefault = Boolean(input.isDefault);
  return result;
}
module.exports = { fail, text, integer, phone, contact, address };
