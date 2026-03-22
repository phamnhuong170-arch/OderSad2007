-- ══════════════════════════════════════
--  TechVN — Database Schema
--  Engine: SQLite (node:sqlite built-in)
-- ══════════════════════════════════════

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

-- ─────────────────────────────────────
-- 📦 PRODUCTS
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  brand       TEXT    NOT NULL,
  em          TEXT    NOT NULL DEFAULT '📦',
  badge       TEXT    CHECK(badge IN ('hot','new','sale','shock')) DEFAULT 'new',
  spec        TEXT    NOT NULL DEFAULT '',
  price       INTEGER NOT NULL CHECK(price >= 0),
  old_price   INTEGER,
  price_pct   INTEGER NOT NULL DEFAULT 0,
  rating      REAL    NOT NULL DEFAULT 0 CHECK(rating BETWEEN 0 AND 5),
  rv          INTEGER NOT NULL DEFAULT 0,
  cat         TEXT    NOT NULL DEFAULT 'Điện thoại',
  sku         TEXT    NOT NULL UNIQUE,
  stock       INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  stock_status TEXT   NOT NULL DEFAULT 'in' CHECK(stock_status IN ('in','low','out')),
  status      TEXT    NOT NULL DEFAULT 'published' CHECK(status IN ('published','draft','archived')),
  featured    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_brand  ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_cat    ON products(cat);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);

-- ─────────────────────────────────────
-- 🔧 PRODUCT SPECS (bảng so sánh)
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_specs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label      TEXT    NOT NULL,
  value      TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_specs_product ON product_specs(product_id);

-- ─────────────────────────────────────
-- 🗂️ CATEGORIES
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL,
  icon      TEXT    NOT NULL DEFAULT '📦',
  slug      TEXT    NOT NULL UNIQUE,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  count     INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ─────────────────────────────────────
-- 👤 USERS
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  phone         TEXT,
  avatar        TEXT    NOT NULL DEFAULT 'U',
  password_hash TEXT,
  provider      TEXT    CHECK(provider IN ('email','google','facebook')) DEFAULT 'email',
  level         TEXT    NOT NULL DEFAULT '🌱 Thành viên',
  points        INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─────────────────────────────────────
-- ⭐ REVIEWS
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_name  TEXT    NOT NULL,
  rating     INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  title      TEXT    NOT NULL DEFAULT '',
  text       TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('approved','pending','flagged')),
  helpful    INTEGER NOT NULL DEFAULT 0,
  date       TEXT    NOT NULL DEFAULT (date('now'))
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status  ON reviews(status);

-- ─────────────────────────────────────
-- 🛒 SESSIONS / CARTS
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_sessions (
  session_id TEXT    PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT    NOT NULL REFERENCES cart_sessions(session_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty        INTEGER NOT NULL DEFAULT 1 CHECK(qty BETWEEN 1 AND 10),
  added_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(session_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_session ON cart_items(session_id);

-- ─────────────────────────────────────
-- 📦 ORDERS
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id          TEXT    PRIMARY KEY,  -- TVN-2026-XXXXX
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id  TEXT,
  email       TEXT,
  status      TEXT    NOT NULL DEFAULT 'processing'
              CHECK(status IN ('processing','shipping','delivered','cancelled','returning')),
  subtotal    INTEGER NOT NULL DEFAULT 0,
  discount    INTEGER NOT NULL DEFAULT 0,
  shipping    INTEGER NOT NULL DEFAULT 0,
  total       INTEGER NOT NULL DEFAULT 0,
  payment     TEXT    NOT NULL DEFAULT 'MoMo',
  coupon      TEXT,
  delivery    TEXT    NOT NULL DEFAULT 'standard',
  address_id  INTEGER,
  address_snapshot TEXT,  -- JSON snapshot địa chỉ khi đặt
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   TEXT    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  name       TEXT    NOT NULL,  -- snapshot tên SP
  price      INTEGER NOT NULL,  -- snapshot giá lúc đặt
  qty        INTEGER NOT NULL CHECK(qty >= 1)
);

CREATE INDEX IF NOT EXISTS idx_orders_user    ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items    ON order_items(order_id);

-- ─────────────────────────────────────
-- 📍 ADDRESSES
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS addresses (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  phone      TEXT    NOT NULL,
  text       TEXT    NOT NULL,
  tag        TEXT    NOT NULL DEFAULT 'Nhà riêng',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

-- ─────────────────────────────────────
-- ❤️ WISHLIST
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, product_id)
);

-- ─────────────────────────────────────
-- 🔔 PRICE ALERTS
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_alerts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  target_price  INTEGER NOT NULL,
  current_price INTEGER NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'watching' CHECK(status IN ('watching','triggered','dismissed')),
  added_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, product_id)
);

-- ─────────────────────────────────────
-- 🏷️ COUPONS
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  code       TEXT    PRIMARY KEY COLLATE NOCASE,
  pct        INTEGER NOT NULL CHECK(pct BETWEEN 1 AND 100),
  label      TEXT    NOT NULL,
  min_order  INTEGER NOT NULL DEFAULT 0,
  expiry     TEXT    NOT NULL,
  is_active  INTEGER NOT NULL DEFAULT 1,
  use_count  INTEGER NOT NULL DEFAULT 0
);

-- ─────────────────────────────────────
-- 📊 ANALYTICS
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT    NOT NULL, -- 'page_view','product_view','search','cart_add','order'
  payload    TEXT,             -- JSON
  session_id TEXT,
  user_id    INTEGER,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_type    ON analytics_events(type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);

-- ─────────────────────────────────────
-- 📝 SECURITY LOG
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event      TEXT    NOT NULL,
  email      TEXT,
  ip         TEXT,
  detail     TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────
-- 🔄 Trigger: updated_at tự động
-- ─────────────────────────────────────
CREATE TRIGGER IF NOT EXISTS trg_products_updated
  AFTER UPDATE ON products
  BEGIN UPDATE products SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_users_updated
  AFTER UPDATE ON users
  BEGIN UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_orders_updated
  AFTER UPDATE ON orders
  BEGIN UPDATE orders SET updated_at = datetime('now') WHERE id = NEW.id; END;

-- ─────────────────────────────────────
-- 📊 Views hữu ích
-- ─────────────────────────────────────
CREATE VIEW IF NOT EXISTS v_order_summary AS
  SELECT
    o.id, o.status, o.total, o.payment, o.created_at,
    o.user_id, u.name AS user_name, u.email,
    COUNT(oi.id) AS item_count
  FROM orders o
  LEFT JOIN users u  ON u.id  = o.user_id
  LEFT JOIN order_items oi ON oi.order_id = o.id
  GROUP BY o.id;

CREATE VIEW IF NOT EXISTS v_product_stats AS
  SELECT
    p.id, p.name, p.brand, p.price, p.stock, p.stock_status,
    p.rating, p.rv,
    COUNT(r.id) AS review_count,
    AVG(r.rating) AS avg_rating,
    COUNT(CASE WHEN r.status='pending' THEN 1 END) AS pending_reviews
  FROM products p
  LEFT JOIN reviews r ON r.product_id = p.id
  GROUP BY p.id;
