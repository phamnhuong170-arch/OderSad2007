'use strict';

const { Router } = require('express');
const { CartModel, OrderModel, AddressModel, WishlistModel, AlertModel, CouponModel, AnalyticsModel } = require('../database/models');
const { PRODUCTS } = require('../data/db');
const { requireAuth, Validate } = require('../middleware');

const router = Router();

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = require('jsonwebtoken').verify(header.slice(7), process.env.JWT_SECRET || 'techvn_secret_dev');
    } catch (_) {}
  }
  next();
}

const sid = req => req.headers['x-session-id'] || 'default';
const PAYMENT_LABELS = { momo:'MoMo', vnpay:'VNPay', card:'Thẻ tín dụng', cod:'COD', installment:'Trả góp' };

/* ── CART ── */
router.get('/cart', (req, res) => {
  const items = CartModel.getItems(sid(req));
  res.json({ ok: true, data: items, count: items.reduce((s, i) => s + i.qty, 0) });
});

router.post('/cart/add', (req, res) => {
  const { productId, qty = 1 } = req.body || {};
  const p = PRODUCTS.find(x => x.id === Number(productId));
  if (!p) return res.status(404).json({ ok: false, err: 'Sản phẩm không tồn tại!' });
  if (p.stockStatus === 'out') return res.status(400).json({ ok: false, err: 'Sản phẩm đã hết hàng!' });
  const cart = CartModel.add(sid(req), Number(productId), Number(qty));
  AnalyticsModel.track('cart_add', { productId: p.id }, sid(req));
  res.json({ ok: true, cart, count: cart.reduce((s, i) => s + i.qty, 0) });
});

router.patch('/cart/qty', (req, res) => {
  const { productId, qty } = req.body || {};
  const cart = CartModel.updateQty(sid(req), Number(productId), Number(qty));
  res.json({ ok: true, cart });
});

router.delete('/cart/:productId', (req, res) => {
  const cart = CartModel.remove(sid(req), Number(req.params.productId));
  res.json({ ok: true, cart });
});

router.delete('/cart', (req, res) => {
  CartModel.clear(sid(req));
  res.json({ ok: true });
});

router.get('/cart/totals', (req, res) => {
  res.json({ ok: true, data: CartModel.calcTotals(sid(req), req.query.coupon) });
});

router.post('/cart/coupon', (req, res) => {
  const coupon = CouponModel.validate((req.body?.code || '').trim());
  if (!coupon) return res.status(400).json({ ok: false, err: 'Mã không hợp lệ hoặc đã hết hạn!' });
  res.json({ ok: true, coupon });
});

/* ── ORDERS ── */
router.post('/orders', optionalAuth, (req, res) => {
  const sessionId = sid(req);
  const cartItems = CartModel.getItems(sessionId);
  if (!cartItems.length) return res.status(400).json({ ok: false, err: 'Giỏ hàng trống!' });

  const { payment = 'momo', addressId, coupon, delivery = 'standard' } = req.body || {};
  const totals      = CartModel.calcTotals(sessionId, coupon);
  const shippingFee = delivery === 'fast' ? 30_000 : 0;
  const finalTotals = { ...totals, shipping: shippingFee, total: totals.total + shippingFee };

  let addressSnapshot = null;
  if (addressId && req.user) {
    const addrs = AddressModel.getByUser(req.user.id);
    addressSnapshot = addrs.find(a => a.id === Number(addressId)) || null;
  }

  const order = OrderModel.create({
    sessionId, userId: req.user?.id || null, email: req.user?.email || null,
    totals: finalTotals,
    items: cartItems.map(i => ({ product_id: i.product_id, name: i.name, price: i.price, qty: i.qty })),
    payment: PAYMENT_LABELS[payment] || payment,
    coupon: coupon || null, delivery,
    addressId: addressId || null, addressSnapshot,
  });

  if (coupon) CouponModel.use(coupon);
  CartModel.clear(sessionId);
  AnalyticsModel.track('order', { orderId: order.id, total: finalTotals.total }, sessionId, req.user?.id);
  res.status(201).json({ ok: true, order });
});

router.get('/orders', optionalAuth, (req, res) => {
  const orders = req.user?.id
    ? OrderModel.getByUser(req.user.id)
    : OrderModel.getBySession(sid(req));
  res.json({ ok: true, data: orders, total: orders.length });
});

router.get('/orders/:id', optionalAuth, (req, res) => {
  const order = OrderModel.getById(req.params.id);
  if (!order) return res.status(404).json({ ok: false, err: 'Không tìm thấy đơn hàng!' });
  const isOwner = (req.user && order.user_id === req.user.id) || order.session_id === sid(req);
  if (!isOwner) return res.status(403).json({ ok: false, err: 'Không có quyền!' });
  res.json({ ok: true, data: order });
});

router.patch('/orders/:id/cancel', optionalAuth, (req, res) => {
  const order = OrderModel.getById(req.params.id);
  if (!order) return res.status(404).json({ ok: false, err: 'Không tìm thấy!' });
  if (!['processing', 'shipping'].includes(order.status))
    return res.status(400).json({ ok: false, err: 'Không thể hủy đơn ở trạng thái này!' });
  res.json({ ok: true, order: OrderModel.updateStatus(req.params.id, 'cancelled') });
});

/* ── ADDRESSES ── */
router.get('/addresses', requireAuth, (req, res) => {
  res.json({ ok: true, data: AddressModel.getByUser(req.user.id) });
});

router.post('/addresses', requireAuth, (req, res) => {
  const { name, phone, text, tag = 'Nhà riêng' } = req.body || {};
  const cleanName = Validate.sanitize(name || '').trim();
  const cleanText = Validate.sanitize(text || '').trim();
  if (!cleanName || cleanName.length < 2) return res.status(400).json({ ok: false, err: 'Tên không hợp lệ!' });
  if (!Validate.phone(phone))              return res.status(400).json({ ok: false, err: 'SĐT không hợp lệ!' });
  if (!cleanText || cleanText.length < 10) return res.status(400).json({ ok: false, err: 'Địa chỉ quá ngắn!' });
  res.status(201).json({ ok: true, address: AddressModel.create(req.user.id, { name: cleanName, phone, text: cleanText, tag }) });
});

router.patch('/addresses/:id/select', requireAuth, (req, res) => {
  AddressModel.setDefault(req.user.id, Number(req.params.id));
  res.json({ ok: true });
});

router.delete('/addresses/:id', requireAuth, (req, res) => {
  if (!AddressModel.delete(req.user.id, Number(req.params.id)))
    return res.status(404).json({ ok: false, err: 'Không tìm thấy!' });
  res.json({ ok: true });
});

/* ── WISHLIST ── */
router.get('/wishlist', requireAuth, (req, res) => {
  const data = WishlistModel.get(req.user.id);
  res.json({ ok: true, data, count: data.length });
});

router.post('/wishlist/toggle', requireAuth, (req, res) => {
  const productId = Number(req.body?.productId);
  if (!productId) return res.status(400).json({ ok: false, err: 'productId không hợp lệ!' });
  const result = WishlistModel.toggle(req.user.id, productId);
  res.json({ ok: true, ...result, count: WishlistModel.count(req.user.id) });
});

/* ── ALERTS ── */
router.get('/alerts', requireAuth, (req, res) => {
  res.json({ ok: true, data: AlertModel.getByUser(req.user.id) });
});

router.post('/alerts', requireAuth, (req, res) => {
  const { productId, targetPrice } = req.body || {};
  if (!productId) return res.status(400).json({ ok: false, err: 'productId không hợp lệ!' });
  try {
    const alert = AlertModel.create(req.user.id, Number(productId), Number(targetPrice));
    if (!alert) return res.status(404).json({ ok: false, err: 'Sản phẩm không tồn tại!' });
    res.status(201).json({ ok: true, alert });
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ ok: false, err: 'Đã theo dõi rồi!' });
    throw e;
  }
});

router.delete('/alerts/:id', requireAuth, (req, res) => {
  if (!AlertModel.delete(req.user.id, Number(req.params.id)))
    return res.status(404).json({ ok: false, err: 'Không tìm thấy!' });
  res.json({ ok: true });
});

module.exports = router;
