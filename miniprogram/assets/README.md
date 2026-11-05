# 暖棕小屋原创插画

本目录包含 57 张本地 PNG：56 张为本项目原创矢量绘制后导出的透明插画与图标，另 1 张为固定随机种子生成的低透明度纸张纹理。没有使用参考图截图、网络图片、表情符号或外部图片服务。主线色为 `#60371F`，辅以奶油色、焦糖色和低饱和绿色。

## 用途

- `illustrations/cat-hero.png`：戴泡芙面包圈的猫咪，搭配可颂、甜甜圈、蛋糕、礼盒等小涂鸦。
- `illustrations/cloud-hero.png`：两只戴派对帽、举杯相碰的云朵蛋糕。
- `illustrations/dog-hero.png`：长垂耳小狗和宽口鼻柯基，带有鼻头、笑脸和小舌头。
- `illustrations/empty-cart.png`、`empty-order.png`、`empty-coupon.png`：购物袋、订单和优惠券空状态。
- `icons/`：23 个线稿功能图标及深色会员卡专用的 `crown-cream.png`。
- `icons/dog-delivery.png`、`dog-dineIn.png`、`dog-pickup.png`：狗狗主题的外送纸袋、店内餐盘和咖啡杯自取服务插画。
- `tab/`：首页、点单、订单、我的图标，分别包含普通状态和 `-active` 状态。
- `products/`：15 种独立商品插画，透明底，适合放在奶油色商品卡上。
- `paper-grain.png`：原创 64×64 低透明度纸纹平铺素材，使用固定种子 `20261103` 生成。其内容同步内嵌到 `styles/paper.wxss`，避免依赖 WXSS 本地背景图片 URL 的兼容性。

## 商品图片映射

| 文件 | 插画 |
| --- | --- |
| p01.png | 冰拿铁 |
| p02.png | 猫咪泡芙 |
| p03.png | 草莓奶油切块蛋糕 |
| p04.png | 云朵奶油整蛋糕 |
| p05.png | 抹茶卷 |
| p06.png | 提拉米苏 |
| p07.png | 冰美式 |
| p08.png | 热燕麦拿铁 |
| p09.png | 香橙美式 |
| p10.png | 杏仁可颂 |
| p11.png | 巧克力吐司 |
| p12.png | 海盐贝果 |
| p13.png | 午后烘焙分享盒（可颂、贝果、曲奇） |
| p14.png | 曲奇铁盒 |
| p15.png | 挂耳咖啡礼盒 |

## 重新生成

在项目根目录运行 `python scripts/generate-assets.py`。需要 Python、CairoSVG 和 Pillow。SVG 源图保存在 `scripts/asset-sources/`，不占小程序主包。整体预览输出至 `artifacts/artwork-contact-sheet.png` 和 `artifacts/icon-contact-sheet.png`。PNG 使用带透明度的调色板压缩，保留抗锯齿边缘。

纸纹单独运行 `python scripts/generate-paper.py` 重新生成，需要 Python 与 Pillow；该脚本同步更新 `paper-grain.png` 和 `styles/paper.wxss`。这些依赖只用于素材制作，运行小程序不需要 Python。
