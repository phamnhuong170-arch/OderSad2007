'use strict';

const { Router } = require('express');
const { AnalyticsModel } = require('../database/models');

const router = Router();

router.get('/health', (req, res) => {
  const up = process.uptime();
  res.json({
    ok: true, status: 'healthy',
    uptime: `${Math.floor(up/3600)}h ${Math.floor((up%3600)/60)}m ${Math.floor(up%60)}s`,
    memory: { used: Math.round(process.memoryUsage().heapUsed/1024/1024)+' MB', total: Math.round(process.memoryUsage().heapTotal/1024/1024)+' MB' },
    version: '1.0.0', env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

router.post('/analytics/page', (req, res) => {
  AnalyticsModel.track('page_view', { page: String(req.body?.page || 'unknown') }, req.headers['x-session-id']);
  res.json({ ok: true });
});

router.post('/analytics/product', (req, res) => {
  const id = Number(req.body?.productId);
  if (!id) return res.status(400).json({ ok: false, err: 'productId không hợp lệ!' });
  AnalyticsModel.track('product_view', { productId: id }, req.headers['x-session-id']);
  res.json({ ok: true });
});

router.post('/analytics/search', (req, res) => {
  const q = String(req.body?.q || '').slice(0, 200);
  if (!q) return res.status(400).json({ ok: false, err: 'q không được trống!' });
  AnalyticsModel.track('search', { q }, req.headers['x-session-id']);
  res.json({ ok: true });
});

router.get('/analytics/summary', (req, res) => {
  res.json({ ok: true, data: AnalyticsModel.summary() });
});

module.exports = router;
