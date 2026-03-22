'use strict';

const jwt = require('jsonwebtoken');
const { _store } = require('../data/db');

const JWT_SECRET = process.env.JWT_SECRET || 'techvn_secret_dev';

/* ══════════════════════════════════════
   🔐 JWT AUTH MIDDLEWARE
══════════════════════════════════════ */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, err: 'Chưa đăng nhập!' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, err: 'Token không hợp lệ hoặc đã hết hạn!' });
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET);
    } catch (_) {}
  }
  next();
}

/* ══════════════════════════════════════
   ✅ VALIDATION HELPERS
══════════════════════════════════════ */
const Validate = {
  email(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
  },

  password(pass) {
    const checks = [
      { test: (pass || '').length >= 8,          msg: 'ít nhất 8 ký tự' },
      { test: /[A-Z]/.test(pass || ''),          msg: '1 chữ hoa' },
      { test: /[0-9]/.test(pass || ''),          msg: '1 chữ số' },
      { test: /[^A-Za-z0-9]/.test(pass || ''),  msg: '1 ký tự đặc biệt' },
    ];
    return { strong: checks.every(c => c.test), checks };
  },

  phone(phone) {
    return (phone || '').replace(/\D/g, '').length >= 10;
  },

  sanitize(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>&"'`]/g, c => ({
      '<': '&lt;', '>': '&gt;', '&': '&amp;',
      '"': '&quot;', "'": '&#x27;', '`': '&#x60;',
    }[c]));
  },
};

/* ══════════════════════════════════════
   📊 REQUEST LOGGER
══════════════════════════════════════ */
function logger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const color = res.statusCode >= 500 ? '\x1b[31m'
                : res.statusCode >= 400 ? '\x1b[33m'
                : '\x1b[32m';
    console.log(`${color}[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)\x1b[0m`);
  });
  next();
}

/* ══════════════════════════════════════
   ❌ ERROR HANDLER
══════════════════════════════════════ */
function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    ok: false,
    err: process.env.NODE_ENV === 'production' ? 'Lỗi server!' : err.message,
  });
}

/* ══════════════════════════════════════
   🔑 JWT UTILS
══════════════════════════════════════ */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

module.exports = { requireAuth, optionalAuth, Validate, logger, errorHandler, signToken };
