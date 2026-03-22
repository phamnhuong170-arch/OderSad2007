'use strict';

/**
 * TechVN — Database Models
 * Tất cả queries được đặt tập trung ở đây
 * Routes import từ đây thay vì dùng in-memory Map
 */

const { all, get, run, transaction } = require('./connection');

/* ══════════════════════════════════════
   📦 PRODUCTS
══════════════════════════════════════ */
const ProductModel = {

  getAll({ brand, cat, priceMin = 0, priceMax = Infinity, sort = 'default',
           featured, q, page = 1, limit = 20 } = {}) {
    let where = ['p.status = ?'];
    let params = ['published'];

    if (q) {
      where.push(`(p.name LIKE ? OR p.brand LIKE ? OR p.spec LIKE ? OR p.sku LIKE ?)`);
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }
    if (brand)    { where.push('p.brand = ?');          params.push(brand); }
    if (cat)      { where.push('p.cat = ?');             params.push(cat); }
    if (priceMin) { where.push('p.price >= ?');          params.push(Number(priceMin)); }
    if (priceMax !== Infinity) { where.push('p.price <= ?'); params.push(Number(priceMax)); }
    if (featured === 'true' || featured === true) { where.push('p.featured = 1'); }

    const ORDER = {
      price_asc:  'p.price ASC',
      price_desc: 'p.price DESC',
      rating:     'p.rating DESC',
      popular:    'p.rv DESC',
      newest:     'p.id DESC',
      default:    'p.id ASC',
    };
    const orderBy = ORDER[sort] || ORDER.default;

    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const offset   = (pageNum - 1) * limitNum;

    const baseSQL = `FROM products p WHERE ${where.join(' AND ')}`;

    const total = get(`SELECT COUNT(*) AS n ${baseSQL}`, params)?.n || 0;
    const items = all(
      `SELECT * ${baseSQL} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    return { items, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) };
  },

  getById(id) {
    const product = get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) return null;

    const reviews = all(
      `SELECT * FROM reviews WHERE product_id = ? AND status = 'approved' ORDER BY helpful DESC`,
      [id]
    );

    const specs = all(
      `SELECT label, value FROM product_specs WHERE product_id = ? ORDER BY sort_order`,
      [id]
    );

    const related = all(
      `SELECT * FROM products WHERE id != ? AND (brand = ? OR cat = ?) AND status = 'published' LIMIT 4`,
      [id, product.brand, product.cat]
    );

    return { ...product, reviews, specs, related };
  },

  search(q, limit = 10) {
    if (!q) return [];
    const like = `%${q}%`;
    return all(
      `SELECT * FROM products WHERE status = 'published'
       AND (name LIKE ? OR brand LIKE ? OR spec LIKE ?)
       LIMIT ?`,
      [like, like, like, limit]
    );
  },

  getSpecs() {
    // Trả về dạng [{label, vals:[...8 products]}]
    const rows = all(`
      SELECT ps.label, ps.value, ps.sort_order, p.id AS prod_id
      FROM product_specs ps
      JOIN products p ON p.id = ps.product_id
      WHERE p.status = 'published'
      ORDER BY ps.sort_order, p.id
    `);

    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.label)) map.set(r.label, { label: r.label, vals: [] });
      map.get(r.label).vals.push(r.value);
    }
    return [...map.values()];
  },

  compare(ids) {
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    return all(`SELECT * FROM products WHERE id IN (${placeholders})`, ids);
  },

  updateStock(id, delta) {
    run(
      `UPDATE products SET stock = MAX(0, stock + ?),
       stock_status = CASE WHEN stock+? <= 0 THEN 'out' WHEN stock+? <= 10 THEN 'low' ELSE 'in' END
       WHERE id = ?`,
      [delta, delta, delta, id]
    );
  },
};

/* ══════════════════════════════════════
   🗂️ CATEGORIES
══════════════════════════════════════ */
const CategoryModel = {

  getTree() {
    const parents = all(
      `SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort_order`
    );
    return parents.map(p => ({
      ...p,
      children: all(
        `SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order`,
        [p.id]
      ),
    }));
  },

  getBySlug(slug) {
    return get('SELECT * FROM categories WHERE slug = ?', [slug]);
  },
};

/* ══════════════════════════════════════
   ⭐ REVIEWS
══════════════════════════════════════ */
const ReviewModel = {

  getByProduct(productId, status = 'approved') {
    const whereStatus = status === 'all' ? '' : 'AND status = ?';
    const params = status === 'all' ? [productId] : [productId, status];
    const rows = all(
      `SELECT * FROM reviews WHERE product_id = ? ${whereStatus} ORDER BY helpful DESC, date DESC`,
      params
    );
    const stats = get(
      `SELECT COUNT(*) AS total, AVG(rating) AS avg_rating
       FROM reviews WHERE product_id = ? AND status = 'approved'`,
      [productId]
    );
    return { rows, total: stats?.total || 0, avgRating: +(stats?.avg_rating || 0).toFixed(1) };
  },

  create({ productId, userId, userName, rating, title, text }) {
    const r = run(
      `INSERT INTO reviews (product_id, user_id, user_name, rating, title, text)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [productId, userId || null, userName, rating, title || '', text]
    );
    return get('SELECT * FROM reviews WHERE id = ?', [r.lastInsertRowid]);
  },

  markHelpful(id) {
    run('UPDATE reviews SET helpful = helpful + 1 WHERE id = ?', [id]);
  },
};

/* ══════════════════════════════════════
   👤 USERS
══════════════════════════════════════ */
const UserModel = {

  create({ name, email, phone, avatar, passwordHash, provider = 'email' }) {
    const r = run(
      `INSERT INTO users (name, email, phone, avatar, password_hash, provider)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, phone || null, avatar, passwordHash || null, provider]
    );
    return this.getById(r.lastInsertRowid);
  },

  getByEmail(email) {
    return get('SELECT * FROM users WHERE email = ? COLLATE NOCASE', [email]);
  },

  getById(id) {
    return get('SELECT * FROM users WHERE id = ?', [id]);
  },

  update(id, fields) {
    const allowed = ['name', 'phone', 'avatar', 'level', 'points', 'is_active'];
    const sets    = [];
    const params  = [];
    for (const [k, v] of Object.entries(fields)) {
      if (allowed.includes(k)) { sets.push(`${k} = ?`); params.push(v); }
    }
    if (!sets.length) return;
    params.push(id);
    run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  exists(email) {
    return !!get('SELECT 1 FROM users WHERE email = ? COLLATE NOCASE', [email]);
  },

  computeLevel(userId) {
    const stats = get(
      `SELECT COUNT(*) AS cnt, COALESCE(SUM(total),0) AS spend
       FROM orders WHERE user_id = ? AND status != 'cancelled'`,
      [userId]
    );
    const { cnt = 0, spend = 0 } = stats || {};
    if (spend >= 50_000_000 || cnt >= 10) return '👑 VIP';
    if (spend >= 20_000_000 || cnt >= 5)  return '🥇 Vàng';
    if (spend >= 5_000_000  || cnt >= 2)  return '🥈 Bạc';
    return '🌱 Thành viên';
  },

  computePoints(userId) {
    const r = get(
      `SELECT COALESCE(SUM(total),0) AS spend FROM orders
       WHERE user_id = ? AND status != 'cancelled'`,
      [userId]
    );
    return Math.floor((r?.spend || 0) / 10_000);
  },
};

/* ══════════════════════════════════════
   🛒 CART
══════════════════════════════════════ */
const CartModel = {

  ensureSession(sessionId, userId = null) {
    const exists = get('SELECT 1 FROM cart_sessions WHERE session_id = ?', [sessionId]);
    if (!exists) {
      run(
        `INSERT INTO cart_sessions (session_id, user_id) VALUES (?, ?)`,
        [sessionId, userId || null]
      );
    }
  },

  getItems(sessionId) {
    return all(
      `SELECT ci.*, p.name, p.em, p.price, p.old_price, p.stock_status, p.brand, p.sku
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.session_id = ?`,
      [sessionId]
    );
  },

  getCount(sessionId) {
    return get(
      `SELECT COALESCE(SUM(qty),0) AS cnt FROM cart_items WHERE session_id = ?`,
      [sessionId]
    )?.cnt || 0;
  },

  add(sessionId, productId, qty = 1) {
    this.ensureSession(sessionId);
    // Upsert
    run(
      `INSERT INTO cart_items (session_id, product_id, qty)
       VALUES (?, ?, ?)
       ON CONFLICT(session_id, product_id)
       DO UPDATE SET qty = MIN(qty + excluded.qty, 10)`,
      [sessionId, productId, qty]
    );
    return this.getItems(sessionId);
  },

  updateQty(sessionId, productId, qty) {
    if (qty <= 0) {
      run(`DELETE FROM cart_items WHERE session_id = ? AND product_id = ?`, [sessionId, productId]);
    } else {
      run(
        `UPDATE cart_items SET qty = MIN(?,10) WHERE session_id = ? AND product_id = ?`,
        [qty, sessionId, productId]
      );
    }
    return this.getItems(sessionId);
  },

  remove(sessionId, productId) {
    run(`DELETE FROM cart_items WHERE session_id = ? AND product_id = ?`, [sessionId, productId]);
    return this.getItems(sessionId);
  },

  clear(sessionId) {
    run(`DELETE FROM cart_items WHERE session_id = ?`, [sessionId]);
  },

  calcTotals(sessionId, couponCode = null) {
    const items    = this.getItems(sessionId);
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const coupon   = couponCode
      ? get(`SELECT * FROM coupons WHERE code = ? COLLATE NOCASE AND is_active = 1`, [couponCode])
      : null;
    const discount = coupon ? Math.round(subtotal * coupon.pct / 100) : 0;
    const shipping = (subtotal - discount) >= 5_000_000 ? 0 : 30_000;
    return { subtotal, discount, shipping, total: subtotal - discount + shipping, coupon };
  },
};

/* ══════════════════════════════════════
   📦 ORDERS
══════════════════════════════════════ */
const OrderModel = {

  create({ sessionId, userId, email, totals, items, payment, coupon, delivery, addressId, addressSnapshot }) {
    const orderId = 'TVN-2026-' + String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0');

    transaction(() => {
      run(
        `INSERT INTO orders
          (id, user_id, session_id, email, subtotal, discount, shipping, total, payment, coupon, delivery, address_id, address_snapshot)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          orderId,
          userId || null, sessionId, email || null,
          totals.subtotal, totals.discount, totals.shipping, totals.total,
          payment, coupon || null, delivery,
          addressId || null,
          addressSnapshot ? JSON.stringify(addressSnapshot) : null,
        ]
      );

      const insertItem = require('./connection').getDB().prepare(
        `INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?,?,?,?,?)`
      );
      for (const item of items) {
        insertItem.run(orderId, item.product_id, item.name, item.price, item.qty);
      }
    });

    return this.getById(orderId);
  },

  getById(id) {
    const order = get('SELECT * FROM v_order_summary WHERE id = ?', [id]);
    if (!order) return null;
    const items = all(
      `SELECT oi.*, p.em, p.brand, p.sku
       FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [id]
    );
    return { ...order, items };
  },

  getByUser(userId) {
    return all(
      `SELECT o.*, COUNT(oi.id) AS item_count
       FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = ? GROUP BY o.id ORDER BY o.created_at DESC`,
      [userId]
    );
  },

  getBySession(sessionId) {
    return all(
      `SELECT o.*, COUNT(oi.id) AS item_count
       FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.session_id = ? GROUP BY o.id ORDER BY o.created_at DESC`,
      [sessionId]
    );
  },

  updateStatus(id, status) {
    run(`UPDATE orders SET status = ? WHERE id = ?`, [status, id]);
    return this.getById(id);
  },
};

/* ══════════════════════════════════════
   📍 ADDRESSES
══════════════════════════════════════ */
const AddressModel = {

  getByUser(userId) {
    return all(`SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC`, [userId]);
  },

  create(userId, { name, phone, text, tag = 'Nhà riêng' }) {
    // Bỏ default cũ
    run(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`, [userId]);
    const r = run(
      `INSERT INTO addresses (user_id, name, phone, text, tag, is_default) VALUES (?,?,?,?,?,1)`,
      [userId, name, phone, text, tag]
    );
    return get(`SELECT * FROM addresses WHERE id = ?`, [r.lastInsertRowid]);
  },

  setDefault(userId, id) {
    transaction(() => {
      run(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`, [userId]);
      run(`UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?`, [id, userId]);
    });
  },

  delete(userId, id) {
    const r = run(`DELETE FROM addresses WHERE id = ? AND user_id = ?`, [id, userId]);
    if (r.changes) {
      // Nếu xóa địa chỉ default, set mới nhất làm default
      run(
        `UPDATE addresses SET is_default = 1 WHERE user_id = ?
         AND id = (SELECT id FROM addresses WHERE user_id = ? ORDER BY id DESC LIMIT 1)`,
        [userId, userId]
      );
    }
    return r.changes > 0;
  },
};

/* ══════════════════════════════════════
   ❤️ WISHLIST
══════════════════════════════════════ */
const WishlistModel = {

  get(userId) {
    return all(
      `SELECT p.* FROM wishlist w JOIN products p ON p.id = w.product_id
       WHERE w.user_id = ? ORDER BY w.added_at DESC`,
      [userId]
    );
  },

  toggle(userId, productId) {
    const exists = get(`SELECT 1 FROM wishlist WHERE user_id = ? AND product_id = ?`, [userId, productId]);
    if (exists) {
      run(`DELETE FROM wishlist WHERE user_id = ? AND product_id = ?`, [userId, productId]);
      return { added: false };
    } else {
      run(`INSERT INTO wishlist (user_id, product_id) VALUES (?,?)`, [userId, productId]);
      return { added: true };
    }
  },

  count(userId) {
    return get(`SELECT COUNT(*) AS n FROM wishlist WHERE user_id = ?`, [userId])?.n || 0;
  },
};

/* ══════════════════════════════════════
   🔔 PRICE ALERTS
══════════════════════════════════════ */
const AlertModel = {

  getByUser(userId) {
    return all(
      `SELECT pa.*, p.name, p.em, p.price AS current_price_live
       FROM price_alerts pa JOIN products p ON p.id = pa.product_id
       WHERE pa.user_id = ? ORDER BY pa.added_at DESC`,
      [userId]
    );
  },

  create(userId, productId, targetPrice) {
    const p = get(`SELECT * FROM products WHERE id = ?`, [productId]);
    if (!p) return null;
    const r = run(
      `INSERT INTO price_alerts (user_id, product_id, target_price, current_price)
       VALUES (?,?,?,?)`,
      [userId, productId, targetPrice, p.price]
    );
    return get(`SELECT * FROM price_alerts WHERE id = ?`, [r.lastInsertRowid]);
  },

  delete(userId, id) {
    const r = run(`DELETE FROM price_alerts WHERE id = ? AND user_id = ?`, [id, userId]);
    return r.changes > 0;
  },

  checkTriggered() {
    // Cập nhật alerts nào giá đã giảm đến mức target
    run(`
      UPDATE price_alerts SET status = 'triggered', current_price = (
        SELECT price FROM products WHERE products.id = price_alerts.product_id
      )
      WHERE status = 'watching'
      AND (SELECT price FROM products WHERE products.id = price_alerts.product_id) <= target_price
    `);
    return all(
      `SELECT pa.*, p.name FROM price_alerts pa JOIN products p ON p.id = pa.product_id
       WHERE pa.status = 'triggered'`
    );
  },
};

/* ══════════════════════════════════════
   🏷️ COUPONS
══════════════════════════════════════ */
const CouponModel = {

  validate(code) {
    const coupon = get(
      `SELECT * FROM coupons WHERE code = ? COLLATE NOCASE AND is_active = 1 AND expiry >= date('now')`,
      [code]
    );
    if (!coupon) return null;
    return coupon;
  },

  use(code) {
    run(`UPDATE coupons SET use_count = use_count + 1 WHERE code = ? COLLATE NOCASE`, [code]);
  },

  getAll() {
    return all(`SELECT code, pct, label, min_order, expiry FROM coupons WHERE is_active = 1`);
  },
};

/* ══════════════════════════════════════
   📊 ANALYTICS
══════════════════════════════════════ */
const AnalyticsModel = {

  track(type, payload = {}, sessionId = null, userId = null) {
    run(
      `INSERT INTO analytics_events (type, payload, session_id, user_id) VALUES (?,?,?,?)`,
      [type, JSON.stringify(payload), sessionId, userId || null]
    );
  },

  summary() {
    const orders = get(
      `SELECT COUNT(*) AS total,
       SUM(CASE WHEN status NOT IN ('cancelled') THEN total ELSE 0 END) AS revenue,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
       FROM orders`
    );

    const users = get(`SELECT COUNT(*) AS total FROM users`);

    const products = get(
      `SELECT COUNT(*) AS total,
       SUM(CASE WHEN stock_status='in'  THEN 1 ELSE 0 END) AS in_stock,
       SUM(CASE WHEN stock_status='low' THEN 1 ELSE 0 END) AS low_stock,
       SUM(CASE WHEN stock_status='out' THEN 1 ELSE 0 END) AS out_stock
       FROM products WHERE status='published'`
    );

    const topSearches = all(
      `SELECT JSON_EXTRACT(payload,'$.q') AS q, COUNT(*) AS cnt
       FROM analytics_events WHERE type = 'search'
       GROUP BY q ORDER BY cnt DESC LIMIT 10`
    );

    const topViewed = all(
      `SELECT JSON_EXTRACT(payload,'$.productId') AS prod_id, COUNT(*) AS views
       FROM analytics_events WHERE type = 'product_view'
       GROUP BY prod_id ORDER BY views DESC LIMIT 5`
    );

    const pageViews = all(
      `SELECT JSON_EXTRACT(payload,'$.page') AS page, COUNT(*) AS views
       FROM analytics_events WHERE type = 'page_view'
       GROUP BY page ORDER BY views DESC`
    );

    return { orders, users, products, topSearches, topViewed, pageViews };
  },
};

/* ══════════════════════════════════════
   🔒 SECURITY LOG
══════════════════════════════════════ */
const SecurityModel = {

  log(event, email = null, ip = null, detail = null) {
    run(
      `INSERT INTO security_log (event, email, ip, detail) VALUES (?,?,?,?)`,
      [event, email, ip, detail ? JSON.stringify(detail) : null]
    );
  },

  recent(limit = 50) {
    return all(
      `SELECT * FROM security_log ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
  },
};

module.exports = {
  ProductModel,
  CategoryModel,
  ReviewModel,
  UserModel,
  CartModel,
  OrderModel,
  AddressModel,
  WishlistModel,
  AlertModel,
  CouponModel,
  AnalyticsModel,
  SecurityModel,
};
