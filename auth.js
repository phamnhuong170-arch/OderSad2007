'use strict';

const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { UserModel, SecurityModel } = require('../database/models');
const { requireAuth, Validate, signToken } = require('../middleware');

const router = Router();

/* POST /api/auth/register */
router.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body || {};

  const cleanName = Validate.sanitize(name || '').trim();
  if (!cleanName || cleanName.length < 2) return res.status(400).json({ ok: false, err: 'Tên phải ít nhất 2 ký tự!' });
  if (!Validate.email(email))             return res.status(400).json({ ok: false, err: 'Email không hợp lệ!' });
  if (!Validate.phone(phone))             return res.status(400).json({ ok: false, err: 'Số điện thoại không hợp lệ!' });

  const pwCheck = Validate.password(password);
  if (!pwCheck.strong) return res.status(400).json({
    ok: false, err: 'Mật khẩu yếu! Cần: ' + pwCheck.checks.filter(c => !c.test).map(c => c.msg).join(', '),
  });

  if (UserModel.exists(email)) return res.status(409).json({ ok: false, err: 'Email này đã được đăng ký!' });

  const hash = await bcrypt.hash(password, 10);
  const user = UserModel.create({
    name: cleanName, email, phone: Validate.sanitize(phone),
    avatar: cleanName[0].toUpperCase(), passwordHash: hash,
  });

  SecurityModel.log('register', email, req.ip);

  const token = signToken({ id: user.id, email, name: cleanName });
  const { password_hash: _, ...pub } = user;
  res.status(201).json({ ok: true, token, user: pub });
});

/* POST /api/auth/login */
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!Validate.email(email))                  return res.status(400).json({ ok: false, err: 'Email không hợp lệ!' });
  if (!password || password.length < 6)        return res.status(400).json({ ok: false, err: 'Mật khẩu phải ít nhất 6 ký tự!' });

  let stored = UserModel.getByEmail(email);

  // Demo: auto-create nếu chưa có
  if (!stored) {
    const hash = await bcrypt.hash(password, 10);
    stored = UserModel.create({
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim() || 'Người dùng',
      email, avatar: email[0].toUpperCase(), passwordHash: hash,
    });
  } else {
    if (stored.password_hash) {
      const valid = await bcrypt.compare(password, stored.password_hash);
      if (!valid) {
        SecurityModel.log('login_fail', email, req.ip);
        return res.status(401).json({ ok: false, err: 'Mật khẩu không chính xác!' });
      }
    }
  }

  // Refresh level + points từ DB
  const level  = UserModel.computeLevel(stored.id);
  const points = UserModel.computePoints(stored.id);
  UserModel.update(stored.id, { level, points });

  SecurityModel.log('login', email, req.ip);

  const token = signToken({ id: stored.id, email, name: stored.name });
  const { password_hash: _, ...pub } = { ...stored, level, points };
  res.json({ ok: true, token, user: pub });
});

/* POST /api/auth/social */
router.post('/social', (req, res) => {
  const { provider, name: rawName, email: rawEmail } = req.body || {};
  const providers = { google: 'Google', facebook: 'Facebook' };
  if (!providers[provider]) return res.status(400).json({ ok: false, err: 'Provider không hợp lệ!' });

  const email = rawEmail || `social_${provider}_${Date.now()}@techvn.com`;
  const name  = rawName  || `${providers[provider]} User`;

  let user = UserModel.getByEmail(email);
  if (!user) {
    user = UserModel.create({ name, email, avatar: name[0].toUpperCase(), provider });
  }

  const token = signToken({ id: user.id, email, name: user.name });
  const { password_hash: _, ...pub } = user;
  res.json({ ok: true, token, user: pub });
});

/* GET /api/auth/me */
router.get('/me', requireAuth, (req, res) => {
  const user = UserModel.getById(req.user.id);
  if (!user) return res.status(404).json({ ok: false, err: 'Không tìm thấy tài khoản!' });

  const level  = UserModel.computeLevel(user.id);
  const points = UserModel.computePoints(user.id);
  const { password_hash: _, ...pub } = { ...user, level, points };
  res.json({ ok: true, user: pub });
});

/* PATCH /api/auth/me */
router.patch('/me', requireAuth, (req, res) => {
  const { name, phone } = req.body || {};
  const fields = {};
  if (name) {
    const clean = Validate.sanitize(name).trim();
    if (clean.length >= 2) { fields.name = clean; fields.avatar = clean[0].toUpperCase(); }
  }
  if (phone && Validate.phone(phone)) fields.phone = Validate.sanitize(phone);
  if (Object.keys(fields).length) UserModel.update(req.user.id, fields);

  const user = UserModel.getById(req.user.id);
  const { password_hash: _, ...pub } = user;
  res.json({ ok: true, user: pub });
});

/* POST /api/auth/verify */
router.post('/verify', (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ ok: false, err: 'Token không được để trống!' });
  try {
    const jwt     = require('jsonwebtoken');
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'techvn_secret_dev');
    res.json({ ok: true, user: payload });
  } catch {
    res.status(401).json({ ok: false, err: 'Token không hợp lệ hoặc đã hết hạn!' });
  }
});

module.exports = router;
