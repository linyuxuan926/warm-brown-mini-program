// 原创演示商品；价格、规格加价均以整数分保存。
const ALL_MODES = ['dineIn', 'pickup', 'delivery', 'shipping'];
const FRESH_MODES = ['dineIn', 'pickup', 'delivery'];
const categories = [
  { id: 'popular', name: '人气推荐' },
  { id: 'dessert', name: '下午茶甜品' },
  { id: 'coffee', name: '咖啡饮品' },
  { id: 'bread', name: '烘焙面包' },
  { id: 'gift', name: '常温礼盒' }
];
const size = [{ id: 'size', name: '份量', required: true, options: [
  { id: 'single', name: '单份', extra: 0 }, { id: 'double', name: '双份分享', extra: 1800 }
] }];
const drink = [
  { id: 'temperature', name: '温度', required: true, options: [{ id: 'hot', name: '热', extra: 0 }, { id: 'iced', name: '冰', extra: 0 }] },
  { id: 'cup', name: '杯型', required: true, options: [{ id: 'regular', name: '标准杯', extra: 0 }, { id: 'large', name: '大杯', extra: 500 }] },
  { id: 'sweetness', name: '甜度', required: true, options: [{ id: 'regular', name: '标准糖', extra: 0 }, { id: 'half', name: '半糖', extra: 0 }, { id: 'none', name: '无糖', extra: 0 }] }
];
const gift = [{ id: 'pack', name: '包装', required: true, options: [{ id: 'classic', name: '经典纸盒', extra: 0 }, { id: 'ribbon', name: '缎带礼盒', extra: 800 }] }];
const source = [
  ['p01', 'popular', '暖棕冰拿铁', '浓缩与醇香牛奶，装进一杯好心情。', 2600, 40, '人气 NO.1', FRESH_MODES, drink],
  ['p02', 'popular', '小猫奶油泡芙', '酥脆外壳里，藏着香草奶油。', 2200, 0, '今日售罄', FRESH_MODES, size],
  ['p03', 'popular', '草莓奶油蛋糕', '当季草莓与轻盈奶油的温柔相遇。', 3200, 18, '店长推荐', FRESH_MODES, size],
  ['p04', 'dessert', '云朵香草蛋糕', '香草奶油与松软戚风，一口轻盈。', 3600, 16, '今日新鲜', FRESH_MODES, size],
  ['p05', 'dessert', '抹茶云朵卷', '清香抹茶与绵密蛋糕卷，细腻柔软。', 3500, 14, '', FRESH_MODES, size],
  ['p06', 'dessert', '经典提拉米苏', '可可与咖啡层层交织的醇厚回味。', 3800, 12, '午后甜点', FRESH_MODES, size],
  ['p07', 'coffee', '经典冰美式', '干净明亮，留一缕坚果回甘。', 2000, 60, '', FRESH_MODES, drink],
  ['p08', 'coffee', '燕麦热拿铁', '浓缩咖啡、燕麦奶与烘烤坚果香。', 2800, 50, '温柔首选', FRESH_MODES, drink],
  ['p09', 'coffee', '香橙美式', '轻盈橙香融入咖啡，清爽又明亮。', 3000, 45, '人气饮品', FRESH_MODES, drink],
  ['p10', 'bread', '杏仁黄油可颂', '层层酥脆；独立常温包装，收货后复烤。', 1800, 28, '每日现烤', ALL_MODES, []],
  ['p11', 'bread', '可可巧克力吐司', '柔软吐司与醇厚巧克力，常温密封装。', 2400, 36, '常温可寄', ALL_MODES, []],
  ['p12', 'bread', '海盐贝果', '扎实有嚼劲，回烤后外脆内柔。', 2600, 32, '常温可寄', ALL_MODES, []],
  ['p13', 'gift', '午后烘焙分享盒', '可颂、贝果与脆饼，送一份手作心意。', 8800, 20, '伴手礼', ALL_MODES, gift],
  ['p14', 'gift', '暖棕曲奇铁盒', '三种黄油曲奇，陪你度过温柔午后。', 10800, 18, '全国邮寄', ALL_MODES, gift],
  ['p15', 'gift', '暖棕挂耳咖啡礼盒', '精选挂耳咖啡，让好风味陪你远行。', 12800, 15, '分享好味', ALL_MODES, gift]
];
const products = source.map(function (row) {
  return {
    id: row[0], categoryId: row[1], name: row[2], description: row[3],
    image: '/assets/products/' + row[0] + '.png', price: row[4], stock: row[5],
    tag: row[6], supportedModes: row[7], specGroups: row[8], active: true
  };
});
module.exports = { categories, products, ALL_MODES };
