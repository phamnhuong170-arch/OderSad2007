# TechVN Backend API

Node.js/Express REST API cho TechVN — tách từ `techvn-backend.js` (browser) sang server thực.

## Cài đặt

```bash
npm install
cp .env.example .env
# Sửa .env theo môi trường
npm run dev     # development (hot reload)
npm start       # production
npm test        # integration tests (cần server đang chạy)
```

## Cấu trúc

```
techvn-backend/
├── src/
│   ├── server.js       # Entry point, middleware stack, route mounting
│   └── test.js         # Integration tests
├── data/
│   └── db.js           # Toàn bộ data (PRODUCTS, SPECS, REVIEWS, COUPONS...)
│                       # + in-memory stores (production → MongoDB/Redis)
├── middleware/
│   └── index.js        # JWT auth, validation, logger, error handler
├── routes/
│   ├── products.js     # /api/products/*
│   ├── auth.js         # /api/auth/*
│   ├── commerce.js     # /api/cart, /api/orders, /api/addresses, /api/wishlist, /api/alerts
│   └── misc.js         # /api/health, /api/analytics/*
├── .env.example
└── package.json
```

## Endpoints

### Products
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/products` | Danh sách sản phẩm · query: `brand`, `cat`, `priceMin`, `priceMax`, `sort`, `q`, `featured`, `page`, `limit` |
| GET | `/api/products/search?q=` | Tìm kiếm full-text |
| GET | `/api/products/suggestions?q=` | Gợi ý autocomplete |
| GET | `/api/products/featured` | Sản phẩm nổi bật |
| GET | `/api/products/specs` | Bảng so sánh thông số |
| GET | `/api/products/categories` | Cây danh mục |
| GET | `/api/products/compare?ids=1,2,3` | So sánh tối đa 4 SP |
| GET | `/api/products/:id` | Chi tiết + reviews + related |
| GET | `/api/products/:id/reviews` | Reviews của sản phẩm |

### Auth
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/auth/register` | Đăng ký · body: `{name, email, phone, password}` |
| POST | `/api/auth/login` | Đăng nhập · body: `{email, password}` |
| POST | `/api/auth/social` | Social login · body: `{provider: 'google'|'facebook'}` |
| POST | `/api/auth/verify` | Xác minh token |
| GET | `/api/auth/me` | Profile user · `Bearer token` |
| PATCH | `/api/auth/me` | Cập nhật profile |

### Cart (dùng header `X-Session-Id`)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/cart` | Lấy giỏ hàng |
| POST | `/api/cart/add` | Thêm sản phẩm · body: `{productId, qty?}` |
| PATCH | `/api/cart/qty` | Cập nhật số lượng · body: `{productId, qty}` |
| DELETE | `/api/cart/:productId` | Xóa sản phẩm |
| DELETE | `/api/cart` | Xóa toàn bộ giỏ |
| GET | `/api/cart/totals?coupon=` | Tính tổng tiền |
| POST | `/api/cart/coupon` | Kiểm tra mã giảm giá |

### Orders
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/orders` | Đặt hàng · body: `{payment, addressId?, coupon?, delivery?}` |
| GET | `/api/orders` | Lịch sử đơn hàng |
| GET | `/api/orders/:id` | Chi tiết đơn hàng |
| PATCH | `/api/orders/:id/cancel` | Hủy đơn hàng |

### Addresses (cần Bearer token)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/addresses` | Danh sách địa chỉ |
| POST | `/api/addresses` | Thêm địa chỉ |
| PATCH | `/api/addresses/:id/select` | Chọn địa chỉ mặc định |
| DELETE | `/api/addresses/:id` | Xóa địa chỉ |

### Wishlist & Alerts (cần Bearer token)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/wishlist` | Danh sách yêu thích |
| POST | `/api/wishlist/toggle` | Thêm/bỏ yêu thích · body: `{productId}` |
| GET | `/api/alerts` | Danh sách price alerts |
| POST | `/api/alerts` | Tạo alert · body: `{productId, targetPrice}` |
| DELETE | `/api/alerts/:id` | Xóa alert |

### Analytics & System
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/health` | Server health check |
| GET | `/api/analytics/summary` | Tổng hợp cho admin dashboard |
| POST | `/api/analytics/page` | Track page view |
| POST | `/api/analytics/product` | Track product view |
| POST | `/api/analytics/search` | Track search |

## Headers

| Header | Dùng cho |
|--------|---------|
| `Authorization: Bearer <token>` | Các endpoint cần đăng nhập |
| `X-Session-Id: <uuid>` | Giỏ hàng (không cần đăng nhập) |

## Kết nối với Frontend

Trong `techvn-frontend.html`, thay thế `window.DB.xxx` calls bằng fetch đến API:

```javascript
// Cũ (localStorage):
const products = DB.products.getAll();

// Mới (API):
const res = await fetch('http://localhost:3000/api/products');
const { data } = await res.json();
```

## Production Notes

- **Database**: Thay `Map()` in-memory bằng MongoDB hoặc PostgreSQL
- **Sessions**: Thay cart `Map` bằng Redis với TTL
- **Passwords**: `bcryptjs` đã hash, production dùng bcrypt native
- **JWT**: Đổi `JWT_SECRET` trong `.env` trước khi deploy
- **Rate limiting**: Đang dùng in-memory store — production dùng Redis store cho `express-rate-limit`

## Database (SQLite — node:sqlite built-in)

Không cần cài thêm gì. Node.js 22+ có `node:sqlite` built-in.

```
database/
├── schema.sql      # DDL: 12 bảng + triggers + views + indexes
├── connection.js   # Singleton connection, migrate(), helpers (all/get/run/transaction)
├── seed.js         # Insert toàn bộ dữ liệu gốc
└── models.js       # 12 Model classes: ProductModel, UserModel, CartModel...
```

### Chạy lần đầu

```bash
# 1. Seed DB (tạo schema + insert data)
npm run seed

# 2. Start server (migration chạy tự động khi start)
npm run dev
```

### Schema (12 bảng)

| Bảng | Mô tả |
|------|-------|
| `products` | 8 sản phẩm · price, stock, rating, status, featured |
| `product_specs` | 56 rows · chip/RAM/màn/camera/pin/sạc/OS update |
| `categories` | 23 nodes · cây 2 cấp có slug SEO |
| `users` | Tài khoản · bcrypt hash, level, points |
| `reviews` | Đánh giá · status: approved/pending/flagged |
| `cart_sessions` + `cart_items` | Giỏ hàng theo session, UPSERT qty |
| `orders` + `order_items` | Đơn hàng · snapshot giá + tên SP lúc đặt |
| `addresses` | Địa chỉ giao hàng · is_default tự cập nhật |
| `wishlist` | Yêu thích · composite PK |
| `price_alerts` | Theo dõi giá · tự trigger khi price ≤ target |
| `coupons` | Mã giảm giá · min_order, expiry, use_count |
| `analytics_events` | Tracking · page_view/search/product_view/order |
| `security_log` | Log login/register theo IP |

### Models

```javascript
const { ProductModel, CartModel, OrderModel } = require('./database/models');

// Products
ProductModel.getAll({ brand:'Apple', sort:'price_asc', page:1, limit:10 })
ProductModel.getById(1)   // → { ...product, reviews, specs, related }
ProductModel.search('samsung')
ProductModel.getSpecs()   // → [{label, vals:[...8 products]}]

// Cart (session-based)
CartModel.add(sessionId, productId, qty)
CartModel.calcTotals(sessionId, 'TECHVN10')  // → {subtotal, discount, shipping, total, coupon}

// Orders (transaction-safe)
OrderModel.create({ sessionId, totals, items, payment, ... })
OrderModel.getByUser(userId)

// Etc: UserModel, AddressModel, WishlistModel, AlertModel, CouponModel, AnalyticsModel
```

### Production Migration

Thay SQLite bằng PostgreSQL/MySQL: chỉ cần thay `connection.js` — models và routes không đổi.
