'use strict';

/**
 * TechVN Backend — Integration Test
 * Chạy: node src/test.js
 * Yêu cầu server đang chạy tại PORT
 */

const PORT    = process.env.PORT || 3000;
const BASE    = `http://localhost:${PORT}/api`;
const SESSION = 'test-session-' + Date.now();

let passed = 0, failed = 0;
let authToken = null;

async function req(method, path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': SESSION,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    passed++;
  } catch (e) {
    console.log(`  \x1b[31m✗\x1b[0m ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

async function run() {
  console.log('\x1b[36m\n=== TechVN API Tests ===\x1b[0m\n');

  // ── Health ──────────────────────────────────
  console.log('\x1b[33mHealth\x1b[0m');
  await test('GET /health → 200', async () => {
    const r = await req('GET', '/health');
    assert(r.status === 200, `status=${r.status}`);
    assert(r.data.ok === true);
    assert(r.data.status === 'healthy');
  });

  // ── Products ────────────────────────────────
  console.log('\n\x1b[33mProducts\x1b[0m');
  await test('GET /products → list', async () => {
    const r = await req('GET', '/products');
    assert(r.data.ok);
    assert(Array.isArray(r.data.data));
    assert(r.data.data.length === 8, `expected 8, got ${r.data.data.length}`);
    assert(r.data.meta.total === 8);
  });

  await test('GET /products?sort=price_asc', async () => {
    const r = await req('GET', '/products?sort=price_asc');
    const prices = r.data.data.map(p => p.price);
    for (let i = 1; i < prices.length; i++) assert(prices[i] >= prices[i-1], 'Not sorted asc');
  });

  await test('GET /products?brand=Apple', async () => {
    const r = await req('GET', '/products?brand=Apple');
    assert(r.data.data.every(p => p.brand === 'Apple'), 'Brand filter failed');
  });

  await test('GET /products?priceMax=10000000', async () => {
    const r = await req('GET', '/products?priceMax=10000000');
    assert(r.data.data.every(p => p.price <= 10000000));
  });

  await test('GET /products/search?q=samsung', async () => {
    const r = await req('GET', '/products/search?q=samsung');
    assert(r.data.ok);
    assert(r.data.data.length > 0);
    assert(r.data.data.every(p => p.brand === 'Samsung' || p.name.toLowerCase().includes('samsung')));
  });

  await test('GET /products/1 → detail + reviews + related', async () => {
    const r = await req('GET', '/products/1');
    assert(r.data.ok);
    assert(r.data.data.id === 1);
    assert(Array.isArray(r.data.data.reviews));
    assert(Array.isArray(r.data.data.related));
  });

  await test('GET /products/999 → 404', async () => {
    const r = await req('GET', '/products/999');
    assert(r.status === 404);
    assert(!r.data.ok);
  });

  await test('GET /products/specs → SPECS table', async () => {
    const r = await req('GET', '/products/specs');
    assert(r.data.ok);
    assert(r.data.data.length > 0);
    assert(r.data.data[0].label);
    assert(Array.isArray(r.data.data[0].vals));
  });

  await test('GET /products/categories → tree', async () => {
    const r = await req('GET', '/products/categories');
    assert(r.data.ok);
    assert(r.data.data.length > 0);
    assert(Array.isArray(r.data.data[0].children));
  });

  await test('GET /products/compare?ids=1,2,3', async () => {
    const r = await req('GET', '/products/compare?ids=1,2,3');
    assert(r.data.ok);
    assert(r.data.data.length === 3);
    assert(r.data.specs);
  });

  await test('GET /products/suggestions?q=iphone', async () => {
    const r = await req('GET', '/products/suggestions?q=iphone');
    assert(r.data.ok);
    assert(r.data.data.length > 0);
  });

  // ── Auth ────────────────────────────────────
  console.log('\n\x1b[33mAuth\x1b[0m');
  const testEmail = `test_${Date.now()}@techvn.com`;
  const testPass  = 'TestPass1!';

  await test('POST /auth/register → success', async () => {
    const r = await req('POST', '/auth/register', {
      name: 'Test User', email: testEmail, phone: '0901234567', password: testPass,
    });
    assert(r.status === 201, `status=${r.status}: ${r.data.err}`);
    assert(r.data.ok);
    assert(r.data.token);
    assert(r.data.user.email === testEmail);
    authToken = r.data.token;
  });

  await test('POST /auth/register → duplicate email', async () => {
    const r = await req('POST', '/auth/register', {
      name: 'Test2', email: testEmail, phone: '0901234568', password: testPass,
    });
    assert(r.status === 409, `expected 409, got ${r.status}`);
  });

  await test('POST /auth/register → weak password', async () => {
    const r = await req('POST', '/auth/register', {
      name: 'Test3', email: 'test3@t.com', phone: '0901234569', password: 'weak',
    });
    assert(!r.data.ok);
  });

  await test('POST /auth/login → success', async () => {
    const r = await req('POST', '/auth/login', { email: testEmail, password: testPass });
    assert(r.data.ok, r.data.err);
    assert(r.data.token);
    authToken = r.data.token;
  });

  await test('GET /auth/me → user info', async () => {
    const r = await req('GET', '/auth/me');
    assert(r.data.ok);
    assert(r.data.user.email === testEmail);
    assert(!r.data.user.passwordHash, 'Hash exposed!');
  });

  await test('GET /auth/me → 401 without token', async () => {
    const r = await req('GET', '/auth/me', null, { Authorization: '' });
    assert(r.status === 401);
  });

  // ── Cart ────────────────────────────────────
  console.log('\n\x1b[33mCart\x1b[0m');
  await test('GET /cart → empty', async () => {
    const r = await req('GET', '/cart');
    assert(r.data.ok);
    assert(Array.isArray(r.data.data));
  });

  await test('POST /cart/add → add product 1', async () => {
    const r = await req('POST', '/cart/add', { productId: 1, qty: 2 });
    assert(r.data.ok, r.data.err);
    assert(r.data.cart.length === 1);
    assert(r.data.cart[0].qty === 2);
  });

  await test('POST /cart/add → add product 4', async () => {
    const r = await req('POST', '/cart/add', { productId: 4, qty: 1 });
    assert(r.data.ok);
    assert(r.data.cart.length === 2);
  });

  await test('GET /cart/totals', async () => {
    const r = await req('GET', '/cart/totals');
    assert(r.data.ok);
    assert(r.data.data.subtotal > 0);
    assert(r.data.data.total > 0);
  });

  await test('GET /cart/totals?coupon=TECHVN10', async () => {
    const r = await req('GET', '/cart/totals?coupon=TECHVN10');
    assert(r.data.ok);
    assert(r.data.data.discount > 0, `discount=${r.data.data.discount}`);
  });

  await test('POST /cart/coupon → valid', async () => {
    const r = await req('POST', '/cart/coupon', { code: 'SALE20' });
    assert(r.data.ok);
    assert(r.data.coupon.pct === 20);
  });

  await test('POST /cart/coupon → invalid', async () => {
    const r = await req('POST', '/cart/coupon', { code: 'FAKE999' });
    assert(!r.data.ok);
  });

  await test('PATCH /cart/qty', async () => {
    const r = await req('PATCH', '/cart/qty', { productId: 1, qty: 3 });
    assert(r.data.ok);
    assert(r.data.cart.find(i => i.id === 1).qty === 3);
  });

  // ── Orders ──────────────────────────────────
  console.log('\n\x1b[33mOrders\x1b[0m');
  let orderId;
  await test('POST /orders → place order', async () => {
    const r = await req('POST', '/orders', { payment: 'momo', delivery: 'fast' });
    assert(r.status === 201, `status=${r.status}: ${r.data.err}`);
    assert(r.data.ok);
    assert(r.data.order.id.startsWith('TVN-2026-'));
    orderId = r.data.order.id;
  });

  await test('GET /orders → list', async () => {
    const r = await req('GET', '/orders');
    assert(r.data.ok);
    assert(r.data.data.length > 0);
  });

  await test('GET /orders/:id', async () => {
    const r = await req('GET', `/orders/${orderId}`);
    assert(r.data.ok);
    assert(r.data.data.id === orderId);
    assert(Array.isArray(r.data.data.prods));
  });

  await test('POST /orders → empty cart → 400', async () => {
    const r = await req('POST', '/orders', { payment: 'cod' });
    assert(r.status === 400);
  });

  // ── Addresses ───────────────────────────────
  console.log('\n\x1b[33mAddresses\x1b[0m');
  let addrId;
  await test('POST /addresses', async () => {
    const r = await req('POST', '/addresses', {
      name: 'Nguyễn Test', phone: '0901234567', text: '123 Đường ABC, Quận 1, TP.HCM', tag: 'Nhà riêng',
    });
    assert(r.status === 201, `status=${r.status}: ${r.data.err}`);
    assert(r.data.ok);
    addrId = r.data.address.id;
  });

  await test('GET /addresses', async () => {
    const r = await req('GET', '/addresses');
    assert(r.data.ok);
    assert(r.data.data.length > 0);
  });

  await test('PATCH /addresses/:id/select', async () => {
    const r = await req('PATCH', `/addresses/${addrId}/select`);
    assert(r.data.ok);
  });

  // ── Wishlist ─────────────────────────────────
  console.log('\n\x1b[33mWishlist\x1b[0m');
  await test('POST /wishlist/toggle → add', async () => {
    const r = await req('POST', '/wishlist/toggle', { productId: 1 });
    assert(r.data.ok);
    assert(r.data.added === true);
  });

  await test('GET /wishlist', async () => {
    const r = await req('GET', '/wishlist');
    assert(r.data.ok);
    assert(r.data.data.length === 1);
  });

  await test('POST /wishlist/toggle → remove', async () => {
    const r = await req('POST', '/wishlist/toggle', { productId: 1 });
    assert(r.data.ok);
    assert(r.data.added === false);
  });

  // ── Price Alerts ─────────────────────────────
  console.log('\n\x1b[33mAlerts\x1b[0m');
  await test('POST /alerts', async () => {
    const r = await req('POST', '/alerts', { productId: 1, targetPrice: 30000000 });
    assert(r.status === 201);
    assert(r.data.ok);
  });

  await test('GET /alerts', async () => {
    const r = await req('GET', '/alerts');
    assert(r.data.ok);
    assert(r.data.data.length > 0);
  });

  // ── Analytics ────────────────────────────────
  console.log('\n\x1b[33mAnalytics\x1b[0m');
  await test('POST /analytics/page', async () => {
    const r = await req('POST', '/analytics/page', { page: 'homepage' });
    assert(r.data.ok);
  });

  await test('POST /analytics/search', async () => {
    const r = await req('POST', '/analytics/search', { q: 'iphone 16' });
    assert(r.data.ok);
  });

  await test('GET /analytics/summary', async () => {
    const r = await req('GET', '/analytics/summary');
    assert(r.data.ok);
    assert(r.data.data.products.total === 8);
    assert(typeof r.data.data.orders.total === 'number');
  });

  // ── Summary ──────────────────────────────────
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`\x1b[32m✅ Passed: ${passed}\x1b[0m`);
  if (failed > 0) console.log(`\x1b[31m❌ Failed: ${failed}\x1b[0m`);
  console.log(`Total: ${passed + failed}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
