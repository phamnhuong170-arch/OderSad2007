'use strict';

/**
 * TechVN — Database Seed
 * Chạy: node database/seed.js
 * Insert toàn bộ dữ liệu gốc từ techvn-backend.js
 */

const { getDB, migrate, run, get, transaction } = require('./connection');

/* ══════════════════════════════════════
   DATA GỐC
══════════════════════════════════════ */
const PRODUCTS_SEED = [
  { name:'iPhone 16 Pro Max',       brand:'Apple',   em:'🍎', badge:'hot',   spec:'A18 Pro · 6.9" · 256GB',           price:34990000, old_price:36990000, price_pct:5,  rating:4.9, rv:1247, cat:'Điện thoại', sku:'APL-IP16PM-256',  stock:142, stock_status:'in',  status:'published', featured:1 },
  { name:'Samsung Galaxy S25 Ultra',brand:'Samsung', em:'📱', badge:'hot',   spec:'SD 8 Elite · 6.9" · 256GB',        price:31990000, old_price:33990000, price_pct:6,  rating:4.8, rv:986,  cat:'Điện thoại', sku:'SAM-S25U-256',    stock:87,  stock_status:'in',  status:'published', featured:1 },
  { name:'Xiaomi 15 Ultra',         brand:'Xiaomi',  em:'📷', badge:'new',   spec:'SD 8 Elite · 6.73" · 512GB',       price:27990000, old_price:null,      price_pct:0,  rating:4.7, rv:542,  cat:'Điện thoại', sku:'XMI-15U-512',     stock:34,  stock_status:'low', status:'published', featured:1 },
  { name:'Samsung Galaxy A56',      brand:'Samsung', em:'💜', badge:'sale',  spec:'Exynos 1580 · 6.7" · 128GB',       price:9990000,  old_price:10990000,  price_pct:9,  rating:4.6, rv:2143, cat:'Điện thoại', sku:'SAM-A56-128',     stock:256, stock_status:'in',  status:'published', featured:1 },
  { name:'Xiaomi Redmi Note 14 Pro',brand:'Xiaomi',  em:'🔴', badge:'shock', spec:'Dimensity 7300 · 6.67" · 256GB',   price:6990000,  old_price:8490000,   price_pct:18, rating:4.5, rv:1876, cat:'Điện thoại', sku:'XMI-RN14P-256',   stock:8,   stock_status:'low', status:'published', featured:0 },
  { name:'OPPO Find X8 Pro',        brand:'OPPO',    em:'🔵', badge:'new',   spec:'Dimensity 9400 · 6.78" · 256GB',   price:19990000, old_price:23490000,  price_pct:15, rating:4.6, rv:387,  cat:'Điện thoại', sku:'OPP-FX8P-256',    stock:0,   stock_status:'out', status:'published', featured:0 },
  { name:'Google Pixel 9 Pro XL',   brand:'Google',  em:'🟡', badge:'new',   spec:'Tensor G4 · 6.8" · 256GB',         price:26990000, old_price:null,      price_pct:0,  rating:4.7, rv:298,  cat:'Điện thoại', sku:'GOG-PX9PX-256',   stock:21,  stock_status:'in',  status:'published', featured:0 },
  { name:'Vivo X200 Pro',           brand:'Vivo',    em:'🟢', badge:'new',   spec:'Dimensity 9400 · 6.78" · 256GB',   price:22990000, old_price:null,      price_pct:0,  rating:4.6, rv:214,  cat:'Điện thoại', sku:'VIV-X200P-256',   stock:45,  stock_status:'in',  status:'published', featured:0 },
];

// Specs: mỗi sản phẩm theo thứ tự index 0-7
const SPECS_ROWS = [
  { label:'Chip',        vals:['A18 Pro (3nm)','SD 8 Elite','SD 8 Elite','Exynos 1580','Dimensity 7300','Dimensity 9400','Tensor G4','Dimensity 9400'] },
  { label:'RAM',         vals:['8 GB','12 GB','12 GB','8 GB','8 GB','12 GB','16 GB','12 GB'] },
  { label:'Màn hình',   vals:['6.9" OLED 120Hz','6.9" AMOLED 120Hz','6.73" AMOLED 120Hz','6.7" AMOLED 120Hz','6.67" AMOLED 120Hz','6.78" AMOLED 120Hz','6.8" LTPO OLED','6.78" AMOLED 120Hz'] },
  { label:'Camera chính',vals:['48 MP','200 MP','200 MP','50 MP','50 MP','50 MP','50 MP','50 MP'] },
  { label:'Pin',         vals:['4685 mAh','5000 mAh','6000 mAh','5000 mAh','5110 mAh','5910 mAh','4700 mAh','6000 mAh'] },
  { label:'Sạc nhanh',  vals:['30W','45W','90W','45W','90W','80W','27W','90W'] },
  { label:'Cập nhật OS',vals:['6 năm','7 năm','4 năm','4 năm','3 năm','4 năm','7 năm','3 năm'] },
];

const CATEGORIES_SEED = [
  // Parent categories
  { id:1,  name:'📱 Điện thoại', icon:'📱', slug:'dien-thoai',      parent_id:null, count:247, sort_order:1 },
  { id:2,  name:'💻 Laptop',     icon:'💻', slug:'laptop',          parent_id:null, count:183, sort_order:2 },
  { id:3,  name:'🎧 Tai nghe',   icon:'🎧', slug:'tai-nghe',        parent_id:null, count:124, sort_order:3 },
  { id:4,  name:'⌚ Đồng hồ',   icon:'⌚', slug:'dong-ho',         parent_id:null, count:67,  sort_order:4 },
  { id:5,  name:'🔌 Phụ kiện',  icon:'🔌', slug:'phu-kien',        parent_id:null, count:312, sort_order:5 },
  // Children: Điện thoại
  { id:11, name:'iPhone',         icon:'🍎', slug:'iphone',          parent_id:1,    count:48,  sort_order:1 },
  { id:12, name:'Samsung',        icon:'📱', slug:'samsung',          parent_id:1,    count:62,  sort_order:2 },
  { id:13, name:'Xiaomi',         icon:'🔴', slug:'xiaomi',           parent_id:1,    count:35,  sort_order:3 },
  { id:14, name:'OPPO',           icon:'🔵', slug:'oppo',             parent_id:1,    count:29,  sort_order:4 },
  { id:15, name:'Vivo',           icon:'🟢', slug:'vivo',             parent_id:1,    count:21,  sort_order:5 },
  { id:16, name:'Google Pixel',   icon:'🟡', slug:'google-pixel',     parent_id:1,    count:12,  sort_order:6 },
  // Children: Laptop
  { id:21, name:'MacBook',        icon:'💻', slug:'macbook',          parent_id:2,    count:18,  sort_order:1 },
  { id:22, name:'Dell',           icon:'💻', slug:'dell',             parent_id:2,    count:34,  sort_order:2 },
  { id:23, name:'ASUS',           icon:'💻', slug:'asus',             parent_id:2,    count:29,  sort_order:3 },
  { id:24, name:'HP',             icon:'💻', slug:'hp',               parent_id:2,    count:26,  sort_order:4 },
  // Children: Tai nghe
  { id:31, name:'AirPods',        icon:'🎧', slug:'airpods',          parent_id:3,    count:12,  sort_order:1 },
  { id:32, name:'Sony',           icon:'🎧', slug:'sony-headphone',   parent_id:3,    count:28,  sort_order:2 },
  { id:33, name:'Samsung Buds',   icon:'🎧', slug:'samsung-buds',     parent_id:3,    count:19,  sort_order:3 },
  // Children: Đồng hồ
  { id:41, name:'Apple Watch',         icon:'⌚', slug:'apple-watch',          parent_id:4, count:14, sort_order:1 },
  { id:42, name:'Samsung Galaxy Watch',icon:'⌚', slug:'samsung-galaxy-watch', parent_id:4, count:11, sort_order:2 },
  // Children: Phụ kiện
  { id:51, name:'Sạc',     icon:'🔌', slug:'sac',      parent_id:5, count:87,  sort_order:1 },
  { id:52, name:'Ốp lưng', icon:'📱', slug:'op-lung',  parent_id:5, count:124, sort_order:2 },
  { id:53, name:'Cáp',     icon:'🔌', slug:'cap',      parent_id:5, count:101, sort_order:3 },
];

const REVIEWS_SEED = [
  { product_id:1, user_name:'Nguyễn Văn A', rating:5, title:'Máy tuyệt vời',              text:'Camera A18 Pro chụp ban đêm siêu nét',                         date:'2026-03-15', status:'approved', helpful:24 },
  { product_id:1, user_name:'Trần Thị B',   rating:4, title:'Pin hơi yếu so với Android', text:'Máy nhanh nhưng pin 30W sạc hơi chậm',                         date:'2026-03-14', status:'approved', helpful:18 },
  { product_id:2, user_name:'Lê Văn C',     rating:5, title:'S25 Ultra hoàn hảo',          text:'S Pen cải tiến nhiều, AI tính năng thực sự hữu ích',           date:'2026-03-13', status:'approved', helpful:31 },
  { product_id:3, user_name:'Phạm Thị D',   rating:5, title:'Camera Leica đỉnh',           text:'Xiaomi 15 Ultra camera sensor 1-inch chụp ảnh nghệ',           date:'2026-03-12', status:'pending',  helpful:0  },
  { product_id:4, user_name:'Hoàng Văn E',  rating:4, title:'Tầm giá này là số 1',         text:'Galaxy A56 màn AMOLED đẹp hơn iPhone ở tầm giá',              date:'2026-03-11', status:'approved', helpful:45 },
  { product_id:5, user_name:'Vũ Thị F',     rating:5, title:'Sạc 90W siêu nhanh',          text:'Redmi Note 14 Pro sạc đầy trong 35 phút',                     date:'2026-03-10', status:'flagged',  helpful:7  },
];

const COUPONS_SEED = [
  { code:'TECHVN10', pct:10, label:'Giảm 10%',            min_order:0,        expiry:'2026-12-31', is_active:1 },
  { code:'SALE20',   pct:20, label:'Giảm 20%',            min_order:10000000, expiry:'2026-06-30', is_active:1 },
  { code:'NEWUSER',  pct:15, label:'Người dùng mới -15%', min_order:0,        expiry:'2026-12-31', is_active:1 },
];

/* ══════════════════════════════════════
   SEED FUNCTIONS
══════════════════════════════════════ */
function seedProducts(db) {
  const insertProd = db.prepare(`
    INSERT OR IGNORE INTO products
      (name, brand, em, badge, spec, price, old_price, price_pct, rating, rv, cat, sku, stock, stock_status, status, featured)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  for (const p of PRODUCTS_SEED) {
    const r = insertProd.run(
      p.name, p.brand, p.em, p.badge, p.spec,
      p.price, p.old_price, p.price_pct,
      p.rating, p.rv, p.cat, p.sku,
      p.stock, p.stock_status, p.status, p.featured
    );
    if (r.changes) count++;
  }
  console.log(`  ✓ products: ${count} rows`);
  return count;
}

function seedSpecs(db) {
  // Lấy product IDs theo thứ tự SKU
  const skuOrder = [
    'APL-IP16PM-256','SAM-S25U-256','XMI-15U-512','SAM-A56-128',
    'XMI-RN14P-256','OPP-FX8P-256','GOG-PX9PX-256','VIV-X200P-256'
  ];
  const prodIds = skuOrder.map(sku => {
    const row = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
    return row?.id;
  }).filter(Boolean);

  if (prodIds.length !== 8) {
    console.warn('  ⚠ specs: products not found, skip');
    return 0;
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO product_specs (product_id, label, value, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  let count = 0;
  for (let specIdx = 0; specIdx < SPECS_ROWS.length; specIdx++) {
    const spec = SPECS_ROWS[specIdx];
    for (let prodIdx = 0; prodIdx < prodIds.length; prodIdx++) {
      const r = insert.run(prodIds[prodIdx], spec.label, spec.vals[prodIdx], specIdx);
      if (r.changes) count++;
    }
  }
  console.log(`  ✓ product_specs: ${count} rows`);
  return count;
}

function seedCategories(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO categories (id, name, icon, slug, parent_id, count, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  let count = 0;
  for (const c of CATEGORIES_SEED) {
    const r = insert.run(c.id, c.name, c.icon, c.slug, c.parent_id, c.count, c.sort_order);
    if (r.changes) count++;
  }
  console.log(`  ✓ categories: ${count} rows`);
  return count;
}

function seedReviews(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO reviews (product_id, user_name, rating, title, text, date, status, helpful)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let count = 0;
  for (const r of REVIEWS_SEED) {
    const res = insert.run(r.product_id, r.user_name, r.rating, r.title, r.text, r.date, r.status, r.helpful);
    if (res.changes) count++;
  }
  console.log(`  ✓ reviews: ${count} rows`);
  return count;
}

function seedCoupons(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO coupons (code, pct, label, min_order, expiry, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  let count = 0;
  for (const c of COUPONS_SEED) {
    const r = insert.run(c.code, c.pct, c.label, c.min_order, c.expiry, c.is_active);
    if (r.changes) count++;
  }
  console.log(`  ✓ coupons: ${count} rows`);
  return count;
}

/* ══════════════════════════════════════
   MAIN
══════════════════════════════════════ */
function runSeed() {
  console.log('\n[Seed] Starting...\n');

  migrate();

  const db = getDB();

  transaction(() => {
    seedProducts(db);
    seedSpecs(db);
    seedCategories(db);
    seedReviews(db);
    seedCoupons(db);
  });

  // Verify
  console.log('\n[Seed] Verification:');
  const tables = ['products','product_specs','categories','reviews','coupons'];
  for (const t of tables) {
    const row = db.prepare(`SELECT COUNT(*) as n FROM ${t}`).get();
    console.log(`  ${t}: ${row.n} rows`);
  }

  console.log('\n[Seed] ✅ Done!\n');
}

runSeed();
