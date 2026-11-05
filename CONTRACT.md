# Shared implementation contract

Native WeChat Mini Program root: `miniprogram/`. CommonJS, sync service API; errors throw `Error` with readable Chinese messages. Money is integer cents. Do not read/write wx storage outside services/store.js. Pages use native navigationBar and native TabBar.

## Service API (`services/api.js`)

- `init()`, `reset()`
- `getState()` returns cloned persisted state: `{theme, mode, member, addresses, orders, cart, coupons, walletTransactions, pointsTransactions}`.
- `getCatalog()` returns `{categories, products}`. Category `{id,name}`. Product `{id,categoryId,name,description,image,price,stock,tag,supportedModes,specGroups}`. Five categories: popular,dessert,coffee,bread,gift. specGroups: `[{id,name,required,options:[{id,name,extra}]}]` where extra is cents.
- `getProducts({categoryId,search,mode})` returns products (all arguments optional).
- `getTheme()`, `setTheme(id)`; theme cat/cloud/dog.
- `getMode()`, `checkMode(mode)` returns incompatible cart product names; `setMode(mode,removeIncompatible=false)` throws if incompatible and not confirmed.
- `getCart()` returns `{items,count,subtotal}`; item `{id,productId,name,image,specs,specText,quantity,unitPrice,total}`. Specs is mapping groupId to optionId.
- `addCart(productId,specs,quantity)`, `changeCart(itemId,delta)`, `clearCart()`.
- `quote({couponId,addressId})` returns `{subtotal,discount,fee,total,count,items,couponId}` using current mode; no coupon = empty string. UI shows coupon eligibility through getCoupons.
- `createOrder({token,contact,phone,tableNumber,pickupTime,addressId,remark,couponId})` returns order. Required fields depend on persisted mode; one token creates at most one order. Order `{id,number,createdAt,mode,status,items,subtotal,discount,fee,total,contact,phone,tableNumber,pickupTime,address,remark,couponId,pickupCode,timeline}`. status pending,preparing,ready,delivering,toShip,shipped,completed,cancelled.
- `getOrders(filter)` filter all,pending,active,completed,cancelled; `getOrder(id)`.
- `payOrder(id,method,outcome)` method mock/balance; outcome success/cancel/failure. Cancel/failure keep pending and do not consume coupon. success idempotent, debits inventory/balance at most once.
- `cancelOrder(id)`, `advanceOrder(id)` (one legal step), `reorder(id)` returns `{added,skipped}` and uses current product/price/specs/mode.
- `login()` / `logout()` demo account; `getMember()` returns `{loggedIn,nickname,level,balance,points,...}`.
- `recharge(amount,token)` amount 10000/20000/50000; idempotent transaction.
- `getCoupons()` returns owned coupons incl `{id,name,threshold,discount,expiresAt,status,reason}` status available/reserved/used/expired. `getCouponOffers()` returns templates; `claimCoupon(offerId)`, `redeemCoupon(offerId)` (points).
- `saveAddress({id?,contact,phone,province,city,district,detail,isDefault})`, `deleteAddress(id)`, `setDefaultAddress(id)`, `getAddresses()`.
- `getStore()` `{name,address,hours,phone,deliveryRule,shippingRule}`.

Display currency locally with `(value/100).toFixed(2)`; root will provide `utils/ui.js` with `money`, `toastError`, `go`, `confirm`, `chooseMode`, `pay` helpers. `pay(orderId)` navigates to `/pages/payment/index?id=...`.

## Routes

Root owns home, menu, checkout, payment, success. Other page agent owns orders, order-detail, mine, member, wallet, coupons, points, addresses, themes, store, about. All pages at `pages/<name>/index`. addresses query `?select=1` persists chosen id via `getApp().globalData.selectedAddressId` then navigateBack. coupons `?select=1` stores selected id in globalData.selectedCouponId then back; checkout computes eligibility.

## Common classes (app.wxss)

`page`, `section`, `card`, `row`, `between`, `muted`, `small`, `eyebrow`, `serif`, `title`, `subtitle`, `price`, `btn`, `btn-outline`, `btn-small`, `link`, `divider`, `empty`, `field`, `input`, `label`, `badge`, `list-row`, `safe-bottom`, `stack`, `notice`.

## Assets

PNG paths: `/assets/illustrations/cat-hero.png`, `cloud-hero.png`, `dog-hero.png` (transparent wide/tall hero art without embedded title; root adds typography). `/assets/illustrations/{empty-cart,empty-order,empty-coupon}.png`.

`/assets/icons/{pickup,shipping,dineIn,delivery,crown,coupon,points,address,order,user,coffee,cake,bag,arrow,store,theme,info,wallet,logout,check,close,plus,minus}.png`; crown-cream.png for dark card. native TabBar home,menu,orders,mine + -active variants.

Products `/assets/products/{p01..p15}.png`. Assets agent may add more. Main brand: 暖棕小屋 / WARM BROWN. Palette #FAF3E3 #F5EAD7 #FFFCF6 #60371F #3F2A1F #97745A #E7D8C4 #FFF7E8.
