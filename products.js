'use strict';

const { Router } = require('express');
const { ProductModel, CategoryModel, ReviewModel, AnalyticsModel } = require('../database/models');
const { AC_SUGGESTIONS } = require('../data/db');
const { optionalAuth } = require('../middleware');

const router = Router();

/* GET /api/products */
router.get('/', optionalAuth, (req, res) => {
  const result = ProductModel.getAll(req.query);
  AnalyticsModel.track('page_view', { page: 'products' }, req.headers['x-session-id']);
  res.json({ ok: true, data: result.items, meta: { total: result.total, page: result.page, limit: result.limit, pages: result.pages } });
});

/* GET /api/products/search?q= */
router.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ ok: true, data: [] });
  const data = ProductModel.search(q);
  AnalyticsModel.track('search', { q }, req.headers['x-session-id']);
  res.json({ ok: true, data, total: data.length });
});

/* GET /api/products/suggestions?q= */
router.get('/suggestions', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  // Gộp từ DB search + static suggestions
  const dbResults = q ? ProductModel.search(q, 5).map(p => p.name) : [];
  const staticMatches = AC_SUGGESTIONS.filter(s => !q || s.toLowerCase().includes(q));
  const merged = [...new Set([...dbResults, ...staticMatches])].slice(0, 8);
  res.json({ ok: true, data: merged });
});

/* GET /api/products/featured */
router.get('/featured', (req, res) => {
  const result = ProductModel.getAll({ featured: 'true', limit: 20 });
  res.json({ ok: true, data: result.items });
});

/* GET /api/products/specs */
router.get('/specs', (req, res) => {
  res.json({ ok: true, data: ProductModel.getSpecs() });
});

/* GET /api/products/categories */
router.get('/categories', (req, res) => {
  res.json({ ok: true, data: CategoryModel.getTree() });
});

/* GET /api/products/compare?ids=1,2,3 */
router.get('/compare', (req, res) => {
  const ids = (req.query.ids || '').split(',').map(Number).filter(Boolean).slice(0, 4);
  if (!ids.length) return res.status(400).json({ ok: false, err: 'Vui lòng truyền ids!' });
  const products = ProductModel.compare(ids);
  res.json({ ok: true, data: products, specs: ProductModel.getSpecs() });
});

/* GET /api/products/:id */
router.get('/:id', optionalAuth, (req, res) => {
  const id = Number(req.params.id);
  const product = ProductModel.getById(id);
  if (!product) return res.status(404).json({ ok: false, err: 'Sản phẩm không tồn tại!' });
  AnalyticsModel.track('product_view', { productId: id }, req.headers['x-session-id'], req.user?.id);
  res.json({ ok: true, data: product });
});

/* GET /api/products/:id/reviews */
router.get('/:id/reviews', (req, res) => {
  const id     = Number(req.params.id);
  const status = req.query.status || 'approved';
  const result = ReviewModel.getByProduct(id, status);
  res.json({ ok: true, data: result.rows, stats: { total: result.total, avgRating: result.avgRating } });
});

/* POST /api/products/:id/reviews  (cần đăng nhập) */
router.post('/:id/reviews', optionalAuth, (req, res) => {
  const productId = Number(req.params.id);
  const { rating, title, text } = req.body || {};
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ ok: false, err: 'Rating 1-5!' });
  if (!text || text.length < 5) return res.status(400).json({ ok: false, err: 'Nội dung quá ngắn!' });
  const review = ReviewModel.create({
    productId,
    userId:   req.user?.id || null,
    userName: req.user?.name || req.body.userName || 'Ẩn danh',
    rating: Number(rating), title: title || '', text,
  });
  res.status(201).json({ ok: true, data: review });
});

module.exports = router;
