'use strict';

require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');

const { logger, errorHandler } = require('./middleware');
const { migrate }  = require('../database/connection');
const productsRouter = require('./routes/products');
const authRouter     = require('./routes/auth');
const commerceRouter = require('./routes/commerce');
const miscRouter     = require('./routes/misc');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ══════════════════════════════════════
   ⚙️ MIDDLEWARE STACK
══════════════════════════════════════ */
// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5500,http://127.0.0.1:5500')
  .split(',').map(s => s.trim());

app.use(cors({
  origin(origin, cb) {
    // Cho phép requests không có origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use(logger);

// Rate limiting — toàn bộ API
const globalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 300_000, // 5 phút
  max:      Number(process.env.RATE_LIMIT_MAX)        || 200,
  message:  { ok: false, err: 'Quá nhiều requests. Vui lòng chờ!' },
  standardHeaders: true,
  legacyHeaders:   false,
});
app.use('/api', globalLimiter);

// Rate limiting chặt hơn cho auth
const authLimiter = rateLimit({
  windowMs: 300_000,
  max:      5,
  message:  { ok: false, err: 'Quá nhiều lần thử đăng nhập. Vui lòng chờ 5 phút!' },
});
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

/* ══════════════════════════════════════
   🛣️ ROUTES
══════════════════════════════════════ */
app.use('/api/products', productsRouter);
app.use('/api/auth',     authRouter);
app.use('/api',          commerceRouter); // cart, orders, addresses, alerts, wishlist
app.use('/api',          miscRouter);     // health, analytics

/* ──────────────────────────────────────
   Root
─────────────────────────────────────── */
app.get('/', (req, res) => {
  res.json({
    name:    'TechVN API',
    version: '1.0.0',
    status:  'running',
    docs:    '/api/health',
    endpoints: {
      products:   'GET  /api/products',
      search:     'GET  /api/products/search?q=iphone',
      detail:     'GET  /api/products/:id',
      specs:      'GET  /api/products/specs',
      categories: 'GET  /api/products/categories',
      compare:    'GET  /api/products/compare?ids=1,2,3',
      register:   'POST /api/auth/register',
      login:      'POST /api/auth/login',
      me:         'GET  /api/auth/me  [Bearer]',
      cart:       'GET  /api/cart  [X-Session-Id]',
      cartAdd:    'POST /api/cart/add',
      orders:     'GET  /api/orders  [Bearer or X-Session-Id]',
      orderPlace: 'POST /api/orders',
      wishlist:   'GET  /api/wishlist  [Bearer]',
      addresses:  'GET  /api/addresses  [Bearer]',
      alerts:     'GET  /api/alerts  [Bearer]',
      analytics:  'GET  /api/analytics/summary',
      health:     'GET  /api/health',
    },
  });
});

/* ──────────────────────────────────────
   404
─────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({ ok: false, err: `Route '${req.method} ${req.path}' không tồn tại!` });
});

/* ──────────────────────────────────────
   Error handler
─────────────────────────────────────── */
app.use(errorHandler);

/* ══════════════════════════════════════
   🚀 START
══════════════════════════════════════ */
// Chạy migration trước khi start server
migrate();

app.listen(PORT, () => {
  console.log('\x1b[36m');
  console.log('╔══════════════════════════════════════╗');
  console.log('║       TechVN API Backend v1.0        ║');
  console.log('╚══════════════════════════════════════╝\x1b[0m');
  console.log(`\x1b[32m✅ Server running: http://localhost:${PORT}\x1b[0m`);
  console.log(`\x1b[33m📌 Env: ${process.env.NODE_ENV || 'development'}\x1b[0m`);
  console.log(`\x1b[34m📖 Docs: http://localhost:${PORT}/\x1b[0m\n`);
});

module.exports = app;
