'use strict';

/* ══════════════════════════════════════
   📦 PRODUCT DATA
   Nguồn: techvn-backend.js (PRODS + PROD_DB + SPECS)
══════════════════════════════════════ */
const PRODUCTS = [
  {
    id: 1, name: 'iPhone 16 Pro Max', brand: 'Apple', em: '🍎',
    badge: 'hot', spec: 'A18 Pro · 6.9" · 256GB',
    price: 34990000, oldPrice: 36990000, pricePct: 5,
    rating: 4.9, rv: 1247, cat: 'Điện thoại',
    sku: 'APL-IP16PM-256', stock: 142, stockStatus: 'in',
    status: 'published', featured: true,
  },
  {
    id: 2, name: 'Samsung Galaxy S25 Ultra', brand: 'Samsung', em: '📱',
    badge: 'hot', spec: 'SD 8 Elite · 6.9" · 256GB',
    price: 31990000, oldPrice: 33990000, pricePct: 6,
    rating: 4.8, rv: 986, cat: 'Điện thoại',
    sku: 'SAM-S25U-256', stock: 87, stockStatus: 'in',
    status: 'published', featured: true,
  },
  {
    id: 3, name: 'Xiaomi 15 Ultra', brand: 'Xiaomi', em: '📷',
    badge: 'new', spec: 'SD 8 Elite · 6.73" · 512GB',
    price: 27990000, oldPrice: null, pricePct: 0,
    rating: 4.7, rv: 542, cat: 'Điện thoại',
    sku: 'XMI-15U-512', stock: 34, stockStatus: 'low',
    status: 'published', featured: true,
  },
  {
    id: 4, name: 'Samsung Galaxy A56', brand: 'Samsung', em: '💜',
    badge: 'sale', spec: 'Exynos 1580 · 6.7" · 128GB',
    price: 9990000, oldPrice: 10990000, pricePct: 9,
    rating: 4.6, rv: 2143, cat: 'Điện thoại',
    sku: 'SAM-A56-128', stock: 256, stockStatus: 'in',
    status: 'published', featured: true,
  },
  {
    id: 5, name: 'Xiaomi Redmi Note 14 Pro', brand: 'Xiaomi', em: '🔴',
    badge: 'shock', spec: 'Dimensity 7300 · 6.67" · 256GB',
    price: 6990000, oldPrice: 8490000, pricePct: 18,
    rating: 4.5, rv: 1876, cat: 'Điện thoại',
    sku: 'XMI-RN14P-256', stock: 8, stockStatus: 'low',
    status: 'published', featured: false,
  },
  {
    id: 6, name: 'OPPO Find X8 Pro', brand: 'OPPO', em: '🔵',
    badge: 'new', spec: 'Dimensity 9400 · 6.78" · 256GB',
    price: 19990000, oldPrice: 23490000, pricePct: 15,
    rating: 4.6, rv: 387, cat: 'Điện thoại',
    sku: 'OPP-FX8P-256', stock: 0, stockStatus: 'out',
    status: 'published', featured: false,
  },
  {
    id: 7, name: 'Google Pixel 9 Pro XL', brand: 'Google', em: '🟡',
    badge: 'new', spec: 'Tensor G4 · 6.8" · 256GB',
    price: 26990000, oldPrice: null, pricePct: 0,
    rating: 4.7, rv: 298, cat: 'Điện thoại',
    sku: 'GOG-PX9PX-256', stock: 21, stockStatus: 'in',
    status: 'published', featured: false,
  },
  {
    id: 8, name: 'Vivo X200 Pro', brand: 'Vivo', em: '🟢',
    badge: 'new', spec: 'Dimensity 9400 · 6.78" · 256GB',
    price: 22990000, oldPrice: null, pricePct: 0,
    rating: 4.6, rv: 214, cat: 'Điện thoại',
    sku: 'VIV-X200P-256', stock: 45, stockStatus: 'in',
    status: 'published', featured: false,
  },
];

const SPECS = [
  { label: 'Chip',         vals: ['A18 Pro (3nm)', 'SD 8 Elite', 'SD 8 Elite', 'Exynos 1580', 'Dimensity 7300', 'Dimensity 9400', 'Tensor G4', 'Dimensity 9400'] },
  { label: 'RAM',          vals: ['8 GB', '12 GB', '12 GB', '8 GB', '8 GB', '12 GB', '16 GB', '12 GB'] },
  { label: 'Màn hình',     vals: ['6.9" OLED 120Hz', '6.9" AMOLED 120Hz', '6.73" AMOLED 120Hz', '6.7" AMOLED 120Hz', '6.67" AMOLED 120Hz', '6.78" AMOLED 120Hz', '6.8" LTPO OLED', '6.78" AMOLED 120Hz'] },
  { label: 'Camera chính', vals: ['48 MP', '200 MP', '200 MP', '50 MP', '50 MP', '50 MP', '50 MP', '50 MP'] },
  { label: 'Pin',          vals: ['4685 mAh', '5000 mAh', '6000 mAh', '5000 mAh', '5110 mAh', '5910 mAh', '4700 mAh', '6000 mAh'] },
  { label: 'Sạc nhanh',   vals: ['30W', '45W', '90W', '45W', '90W', '80W', '27W', '90W'] },
  { label: 'Cập nhật OS', vals: ['6 năm', '7 năm', '4 năm', '4 năm', '3 năm', '4 năm', '7 năm', '3 năm'] },
];

const REVIEWS = [
  { id: 1, prodId: 1, user: 'Nguyễn Văn A', rating: 5, title: 'Máy tuyệt vời',            text: 'Camera A18 Pro chụp ban đêm siêu nét',                            date: '15/03/2026', status: 'approved', helpful: 24 },
  { id: 2, prodId: 1, user: 'Trần Thị B',   rating: 4, title: 'Pin hơi yếu so với Android', text: 'Máy nhanh nhưng pin 30W sạc hơi chậm',                         date: '14/03/2026', status: 'approved', helpful: 18 },
  { id: 3, prodId: 2, user: 'Lê Văn C',     rating: 5, title: 'S25 Ultra hoàn hảo',        text: 'S Pen cải tiến nhiều, AI tính năng thực sự hữu ích',             date: '13/03/2026', status: 'approved', helpful: 31 },
  { id: 4, prodId: 3, user: 'Phạm Thị D',   rating: 5, title: 'Camera Leica đỉnh',         text: 'Xiaomi 15 Ultra camera sensor 1-inch chụp ảnh nghệ',            date: '12/03/2026', status: 'pending',  helpful: 0  },
  { id: 5, prodId: 4, user: 'Hoàng Văn E',  rating: 4, title: 'Tầm giá này là số 1',       text: 'Galaxy A56 màn AMOLED đẹp hơn iPhone ở tầm giá',               date: '11/03/2026', status: 'approved', helpful: 45 },
  { id: 6, prodId: 5, user: 'Vũ Thị F',     rating: 5, title: 'Sạc 90W siêu nhanh',        text: 'Redmi Note 14 Pro sạc đầy trong 35 phút',                       date: '10/03/2026', status: 'flagged',  helpful: 7  },
];

const CATEGORY_TREE = [
  { id: 1, name: '📱 Điện thoại', icon: '📱', count: 247, children: [
    { id: 11, name: 'iPhone',       count: 48 },
    { id: 12, name: 'Samsung',      count: 62 },
    { id: 13, name: 'Xiaomi',       count: 35 },
    { id: 14, name: 'OPPO',         count: 29 },
    { id: 15, name: 'Vivo',         count: 21 },
    { id: 16, name: 'Google Pixel', count: 12 },
  ]},
  { id: 2, name: '💻 Laptop', icon: '💻', count: 183, children: [
    { id: 21, name: 'MacBook', count: 18 },
    { id: 22, name: 'Dell',    count: 34 },
    { id: 23, name: 'ASUS',    count: 29 },
    { id: 24, name: 'HP',      count: 26 },
  ]},
  { id: 3, name: '🎧 Tai nghe', icon: '🎧', count: 124, children: [
    { id: 31, name: 'AirPods',       count: 12 },
    { id: 32, name: 'Sony',          count: 28 },
    { id: 33, name: 'Samsung Buds',  count: 19 },
  ]},
  { id: 4, name: '⌚ Đồng hồ', icon: '⌚', count: 67, children: [
    { id: 41, name: 'Apple Watch',          count: 14 },
    { id: 42, name: 'Samsung Galaxy Watch', count: 11 },
  ]},
  { id: 5, name: '🔌 Phụ kiện', icon: '🔌', count: 312, children: [
    { id: 51, name: 'Sạc',      count: 87  },
    { id: 52, name: 'Ốp lưng',  count: 124 },
    { id: 53, name: 'Cáp',      count: 101 },
  ]},
];

/* ══════════════════════════════════════
   🏷️ COUPONS
══════════════════════════════════════ */
const COUPONS = {
  TECHVN10: { pct: 10, label: 'Giảm 10%',           minOrder: 0,        expiry: '2026-12-31' },
  SALE20:   { pct: 20, label: 'Giảm 20%',           minOrder: 10000000, expiry: '2026-06-30' },
  NEWUSER:  { pct: 15, label: 'Người dùng mới -15%', minOrder: 0,        expiry: '2026-12-31' },
};

/* ══════════════════════════════════════
   🔍 AUTOCOMPLETE SUGGESTIONS
══════════════════════════════════════ */
const AC_SUGGESTIONS = [
  'iPhone 16 Pro Max', 'iPhone 16', 'iPhone 15',
  'Samsung Galaxy S25', 'Samsung Galaxy A56',
  'Xiaomi 15 Ultra', 'Xiaomi Redmi Note 14 Pro',
  'OPPO Find X8 Pro', 'Google Pixel 9', 'Vivo X200 Pro',
  'MacBook Air M4', 'iPad Pro M4', 'AirPods Pro 2',
  'Sony WH-1000XM6', 'Samsung Buds3 Pro',
];

/* ══════════════════════════════════════
   In-memory stores (production → MongoDB/Redis)
══════════════════════════════════════ */
// Lưu runtime — reset khi restart server
// Production: thay bằng DB thực (MongoDB, PostgreSQL...)
const _store = {
  users:    new Map(),   // email → user object
  orders:   new Map(),   // orderId → order
  sessions: new Map(),   // token → {email, exp}
  alerts:   new Map(),   // alertId → alert
  analytics: {
    pageViews:    {},
    productViews: {},
    searches:     [],
    cartEvents:   [],
    orders:       0,
    registrations:0,
  },
};

module.exports = {
  PRODUCTS,
  SPECS,
  REVIEWS,
  CATEGORY_TREE,
  COUPONS,
  AC_SUGGESTIONS,
  _store,
};
