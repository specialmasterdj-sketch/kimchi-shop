// Curate KIMCHI Shop products:
// 1. Match with Weee! product catalog (what they sell)
// 2. Add frequently ordered products from invoice system (avgQty >= 2)
// 3. Exclude non-food/household items for online store
// 4. Categorize image sources

const fs = require('fs');
const path = require('path');

// Load Weee! products (540 products from their store)
const weeeProducts = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'AI HQ', 'weee_products.json'), 'utf8'));
// Load our Weee! price reference
const weeePrices = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'AI HQ', 'weee_prices.json'), 'utf8'));

// Load our product catalog
const productsPath = path.join(__dirname, '..', 'kimchi-mart-order', 'products.js');
const productsContent = fs.readFileSync(productsPath, 'utf8');
const vendorsMatch = productsContent.match(/const VENDORS = (\{[\s\S]*\});?\s*$/);
let VENDORS;
eval('VENDORS = ' + vendorsMatch[1]);

// ============ STEP 1: Build Weee! product keyword index ============
const weeeKeywords = [];
[...weeeProducts, ...weeePrices].forEach(wp => {
  const name = wp.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const price = parseFloat((wp.price || '$0').replace('$', ''));
  const words = name.split(/\s+/).filter(w => w.length > 2);
  weeeKeywords.push({ name: wp.name, price, category: wp.category, words });
});

// ============ STEP 2: Flatten our products ============
const allProducts = [];
const seenKeys = new Set();

for (const [vendorKey, vendor] of Object.entries(VENDORS)) {
  if (vendorKey === 'rhee_frequent') continue;
  const vendorName = vendor.name.replace(/ - .*$/, '').trim();

  for (const p of vendor.products) {
    const key = `${p.brand}-${p.name}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    allProducts.push({ ...p, vendorName, vendorKey });
  }
}

// ============ STEP 3: Match our products to Weee! ============
function matchScore(ourProduct, weeeItem) {
  const ourWords = (ourProduct.brand + ' ' + ourProduct.name).toLowerCase()
    .replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);

  let matches = 0;
  for (const ow of ourWords) {
    if (weeeItem.words.some(ww => ww.includes(ow) || ow.includes(ww))) matches++;
  }
  return matches / Math.max(ourWords.length, 1);
}

function findBestWeeeMatch(product) {
  let best = null, bestScore = 0;
  for (const wk of weeeKeywords) {
    const score = matchScore(product, wk);
    if (score > bestScore && score >= 0.4) {
      bestScore = score;
      best = wk;
    }
  }
  return best ? { ...best, score: bestScore } : null;
}

// ============ STEP 4: Exclude categories not suitable for online ============
const excludeCategories = new Set([
  // Household/non-food (not grocery)
  'koco-household', 'eden-cookware', 'eden-kitchen-tools', 'eden-cleaning',
  'eden-dispensers', 'eden-storage', 'eden-other',
  'kc-kitchen', 'kc-tableware', 'kc-beauty', 'kc-hair', 'kc-cleaning',
  'kc-household', 'kc-other',
  'non-food', 'l8-household',
  // Alcohol (needs license)
  'ew-soju', 'ew-sake', 'ew-makkoli', 'ew-beer', 'ew-wine', 'ew-fruitwine',
  'lk-liquor'
]);

// Food categories to include
const foodCategories = new Set([
  'rice-grains', 'baking-cooking', 'noodles-instant', 'sauces-condiments',
  'oils-seasonings', 'seeds-nuts', 'seaweed-laver', 'canned-fruits-veg',
  'canned-processed', 'prepared-foods', 'snacks', 'sweets-desserts',
  'frozen-desserts', 'beverages', 'fresh-frozen', 'dry-goods',
  'korean-grocery', 'imported-goods',
  // Vendor-specific food categories
  'noodles', 'rice', 'beverage', 'snack', 'frozen', 'frozen-food',
  'frozen-refrigerated', 'frozen-seafood', 'sauces', 'seasoning', 'paste',
  'pickled', 'pickled-and-sides', 'pickles-sides', 'pickles-and-sides',
  'kimchi', 'seaweed', 'dried', 'dried-goods', 'canned-goods',
  'grains', 'grains-and-beans', 'tea', 'oil', 'salt', 'spice', 'spices',
  'fermented', 'flour-and-powder', 'drink-powder',
  'dumplings', 'rice-cake', 'ramen', 'refrigerated',
  'tofu', 'meat', 'seafood', 'ice-cream', 'pastry', 'bread-and-buns',
  'japan-korea', 'southeast-asian', 'best-spice',
  // CJ categories
  'cj-sauce', 'cj-gochujang', 'cj-doenjang', 'cj-dashida', 'cj-vinegar',
  'cj-oil', 'cj-flour', 'cj-sugar', 'cj-salt', 'cj-syrup', 'cj-premix',
  'cj-rice', 'cj-hetbahn', 'cj-noodle', 'cj-kimchi', 'cj-dumpling',
  'cj-frozen', 'cj-fishcake', 'cj-sausage', 'cj-tofu', 'cj-hmr',
  'cj-beverage', 'cj-laver',
  // Vendor categories
  'ndm-sauce', 'ndm-snack', 'ndm-beverage', 'ndm-ricecake', 'ndm-kimchi',
  'ndm-frozen', 'ndm-noodle', 'ndm-seafood', 'ndm-vegetable', 'ndm-meat',
  'ndm-other',
  'wal-snack', 'wal-beverage', 'wal-noodle', 'wal-sauce', 'wal-canned',
  'wal-frozen-dimsum', 'wal-frozen-dessert', 'wal-frozen-other',
  'wal-frozen-seafood', 'wal-dried', 'wal-preserved', 'wal-rice',
  'wal-deli', 'wal-other', 'wal-lkk',
  'wl-beverage', 'wl-sauce', 'wl-rice', 'wl-noodle', 'wl-frozen',
  'wl-snack', 'wl-canned', 'wl-tofu', 'wl-oil', 'wl-other',
  'lk-snack', 'lk-rice', 'lk-tea', 'lk-coffee', 'lk-icecream',
  'lk-sauce', 'lk-spice', 'lk-seaweed', 'lk-dumpling', 'lk-noodle',
  'lk-ramen', 'lk-readymeal', 'lk-fishcake', 'lk-canned', 'lk-seafood',
  'lk-frozen', 'lk-pickled', 'lk-soup', 'lk-soybean',
  'l8-noodle', 'l8-sauce', 'l8-beverage', 'l8-snack', 'l8-dried',
  'l8-rice', 'l8-frozen', 'l8-canned', 'l8-other',
  'faf-noodle', 'faf-sauce', 'faf-instant', 'faf-snacks', 'faf-seasoning',
  'faf-can-fruit', 'faf-rice', 'faf-canned', 'faf-drinks', 'faf-dried',
  'faf-rice-paper', 'faf-coconut',
  'wis-beverage', 'wis-confection', 'wis-frozen', 'wis-snack',
  'wis-sweets', 'wis-candy',
  'pc-bubbletea', 'pc-ginger', 'pc-jelly', 'pc-noodle', 'pc-coconut', 'pc-rice',
  'tb-beverages', 'tb-bakery', 'tb-snacks', 'tb-chocolate', 'tb-other',
  'tb-seasoning', 'tb-cookies', 'tb-candy', 'tb-desserts', 'tb-dairy',
  'tb-canned', 'tb-noodles', 'tb-mochi', 'tb-nuts', 'tb-frozen',
  'tb-japanese', 'tb-rice',
  'av-vegetable', 'av-leafy-veg', 'av-root-veg', 'av-fruit', 'av-other',
  'fp-fruit', 'fp-vegetable', 'fp-egg', 'fp-other',
  'bh-pork', 'bh-chicken', 'bh-beef', 'bh-seafood',
  'koco-beverage', 'koco-seaweed', 'koco-frozen', 'koco-noodle',
  'koco-sauce', 'koco-other',
  'other'
]);

// ============ STEP 5: Curate products ============
const curated = [];
const stats = { weeeMatch: 0, freqOrder: 0, both: 0, total: 0 };

for (const p of allProducts) {
  // Skip excluded categories
  if (excludeCategories.has(p.category)) continue;

  const weeeMatch = findBestWeeeMatch(p);
  const isFreqOrdered = p.avgQty >= 2;
  const isWeeeProduct = weeeMatch && weeeMatch.score >= 0.4;

  // Include if: matched to Weee! OR frequently ordered (avgQty >= 2)
  if (!isWeeeProduct && !isFreqOrdered) continue;

  // Determine retail price
  let retailPrice = weeeMatch ? weeeMatch.price : null;
  if (!retailPrice || retailPrice <= 0) {
    // Estimate based on category
    retailPrice = estimatePrice(p);
  }

  // Round to retail-friendly price
  retailPrice = roundPrice(retailPrice);

  const source = isWeeeProduct && isFreqOrdered ? 'both' :
                 isWeeeProduct ? 'weee' : 'frequent';

  if (source === 'both') stats.both++;
  else if (source === 'weee') stats.weeeMatch++;
  else stats.freqOrder++;
  stats.total++;

  // Check if image exists
  const imgPath = p.image ? path.join(__dirname, p.image) : '';
  const hasImage = imgPath && fs.existsSync(imgPath);

  curated.push({
    id: p.id,
    brand: p.brand,
    name: cleanName(p.name),
    nameKr: p.nameKr || '',
    size: parseRetailSize(p.size),
    category: mapCategory(p.category),
    price: retailPrice,
    image: p.image || '',
    hasImage,
    vendor: p.vendorName,
    source,
    weeeMatch: weeeMatch ? weeeMatch.name : '',
    weeePrice: weeeMatch ? weeeMatch.price : 0,
    avgQty: p.avgQty || 0
  });
}

// Sort: both > weee > frequent, then by avgQty
curated.sort((a, b) => {
  const order = { both: 0, weee: 1, frequent: 2 };
  if (order[a.source] !== order[b.source]) return order[a.source] - order[b.source];
  return b.avgQty - a.avgQty;
});

// ============ HELPERS ============
function cleanName(name) {
  return name.replace(/[_]/g, ' ')
    .replace(/\(\d+[Xx]\d+.*?\)/g, '')
    .replace(/\(\d+#.*?\)/g, '')
    .replace(/\s+/g, ' ').trim();
}

function parseRetailSize(size) {
  const m = size.match(/\d+[Xx](\d+(?:\.\d+)?\s*(?:LB|OZ|ML|L|G|KG|CT|PCS|EA|FL\.?\s*OZ))/i);
  if (m) return m[1].trim();
  const cs = size.match(/CS\s+\d+[Xx](\d+(?:\.\d+)?\s*(?:LB|OZ|ML|L|G|KG))/i);
  if (cs) return cs[1].trim();
  const s = size.match(/(\d+(?:\.\d+)?\s*(?:LB|OZ|ML|L|G|KG))/i);
  if (s) return s[1].trim();
  return size;
}

function mapCategory(cat) {
  const map = {
    'rice-grains': 'rice', 'rice': 'rice', 'grains': 'rice', 'grains-and-beans': 'rice',
    'noodles-instant': 'ramen', 'noodles': 'ramen', 'ramen': 'ramen',
    'snacks': 'snacks', 'snack': 'snacks', 'sweets-desserts': 'snacks',
    'beverages': 'beverages', 'beverage': 'beverages', 'tea': 'beverages',
    'drink-powder': 'beverages',
    'fresh-frozen': 'frozen', 'frozen': 'frozen', 'frozen-food': 'frozen',
    'frozen-refrigerated': 'frozen', 'frozen-seafood': 'frozen',
    'frozen-desserts': 'frozen', 'ice-cream': 'frozen', 'refrigerated': 'frozen',
    'dumplings': 'frozen',
    'sauces-condiments': 'sauces', 'sauces': 'sauces', 'paste': 'sauces',
    'oils-seasonings': 'seasonings', 'seasoning': 'seasonings', 'spice': 'seasonings',
    'spices': 'seasonings', 'oil': 'seasonings', 'salt': 'seasonings',
    'fermented': 'seasonings',
    'seaweed-laver': 'seaweed', 'seaweed': 'seaweed',
    'kimchi': 'kimchi', 'pickled': 'kimchi', 'pickled-and-sides': 'kimchi',
    'pickles-sides': 'kimchi', 'pickles-and-sides': 'kimchi',
    'prepared-foods': 'prepared', 'rice-cake': 'prepared',
    'bread-and-buns': 'prepared', 'pastry': 'prepared',
    'canned-fruits-veg': 'canned', 'canned-processed': 'canned',
    'canned-goods': 'canned',
    'seeds-nuts': 'nuts', 'dried': 'dried', 'dried-goods': 'dried',
    'dry-goods': 'dried', 'flour-and-powder': 'baking',
    'baking-cooking': 'baking',
    'meat': 'meat', 'seafood': 'seafood',
    'tofu': 'tofu',
  };

  // Check direct map
  if (map[cat]) return map[cat];

  // Check prefix patterns
  for (const [key, val] of Object.entries(map)) {
    if (cat.includes(key)) return val;
  }

  // Vendor-specific mappings
  if (cat.includes('noodle') || cat.includes('ramen')) return 'ramen';
  if (cat.includes('snack') || cat.includes('chocolate') || cat.includes('cookie') || cat.includes('candy')) return 'snacks';
  if (cat.includes('beverage') || cat.includes('tea') || cat.includes('coffee')) return 'beverages';
  if (cat.includes('sauce') || cat.includes('soy')) return 'sauces';
  if (cat.includes('frozen') || cat.includes('dumpling') || cat.includes('fishcake')) return 'frozen';
  if (cat.includes('rice') || cat.includes('hetbahn')) return 'rice';
  if (cat.includes('kimchi') || cat.includes('pickled')) return 'kimchi';
  if (cat.includes('seaweed') || cat.includes('laver')) return 'seaweed';
  if (cat.includes('canned') || cat.includes('can-fruit')) return 'canned';
  if (cat.includes('dried')) return 'dried';
  if (cat.includes('spice') || cat.includes('season')) return 'seasonings';
  if (cat.includes('bakery') || cat.includes('bread') || cat.includes('mochi')) return 'prepared';
  if (cat.includes('vegetable') || cat.includes('fruit') || cat.includes('veg')) return 'produce';
  if (cat.includes('meat') || cat.includes('pork') || cat.includes('chicken') || cat.includes('beef')) return 'meat';
  if (cat.includes('seafood')) return 'seafood';
  if (cat.includes('dairy') || cat.includes('egg')) return 'dairy';
  if (cat.includes('tofu')) return 'tofu';

  return 'other';
}

function estimatePrice(p) {
  const catPrices = {
    rice: 12.99, ramen: 5.99, snacks: 4.49, beverages: 3.99,
    frozen: 7.99, sauces: 6.99, seasonings: 7.99, seaweed: 4.99,
    kimchi: 6.99, prepared: 6.99, canned: 3.99, nuts: 7.99,
    dried: 5.49, baking: 5.49, meat: 9.99, seafood: 12.99,
    tofu: 2.49, produce: 3.99, dairy: 4.99, other: 4.99
  };
  return catPrices[mapCategory(p.category)] || 4.99;
}

function roundPrice(p) {
  const r = Math.round(p * 100) / 100;
  const c = Math.round((r % 1) * 100), d = Math.floor(r);
  if (c >= 75) return d + 0.99;
  if (c >= 50) return d + 0.79;
  if (c >= 25) return d + 0.49;
  return d + 0.29;
}

// ============ OUTPUT ============
// Category summary
const catSummary = {};
curated.forEach(p => {
  if (!catSummary[p.category]) catSummary[p.category] = { count: 0, withImage: 0, needsPhoto: 0 };
  catSummary[p.category].count++;
  if (p.hasImage) catSummary[p.category].withImage++;
  else catSummary[p.category].needsPhoto++;
});

console.log(`\n✅ KIMCHI Shop Curated Product List`);
console.log(`${'─'.repeat(60)}`);
console.log(`   Total curated: ${stats.total} products`);
console.log(`   Weee! matched: ${stats.weeeMatch}`);
console.log(`   Frequently ordered (2+): ${stats.freqOrder}`);
console.log(`   Both (Weee! + frequent): ${stats.both}`);
console.log(`\n📦 By Category:`);

const catNames = {
  ramen: '🍜 Ramen & Noodles', snacks: '🍿 Snacks', beverages: '🧃 Beverages',
  frozen: '❄️ Frozen', rice: '🍚 Rice & Grains', sauces: '🫙 Sauces',
  seasonings: '🧂 Seasonings', seaweed: '🌿 Seaweed', kimchi: '🥬 Kimchi & Banchan',
  prepared: '🍱 Prepared Foods', canned: '🥫 Canned', nuts: '🥜 Nuts & Seeds',
  dried: '📦 Dried Goods', baking: '🧁 Baking', meat: '🥩 Meat',
  seafood: '🦐 Seafood', tofu: '🧊 Tofu', produce: '🥬 Produce',
  dairy: '🥛 Dairy', other: '🛒 Other'
};

for (const [cat, info] of Object.entries(catSummary).sort((a, b) => b[1].count - a[1].count)) {
  const name = catNames[cat] || cat;
  console.log(`   ${name.padEnd(26)} ${String(info.count).padStart(4)} items  (${info.withImage} with img, ${info.needsPhoto} need photo)`);
}

// Products needing photos
const needsPhoto = curated.filter(p => !p.hasImage);
console.log(`\n📸 Products needing manual photography: ${needsPhoto.length}`);

// Save curated products
const catMeta = {
  ramen: { en: 'Ramen & Noodles', kr: '라면 & 면류', es: 'Fideos y Ramen', icon: '🍜' },
  snacks: { en: 'Snacks', kr: '과자 & 스낵', es: 'Snacks', icon: '🍿' },
  beverages: { en: 'Beverages', kr: '음료', es: 'Bebidas', icon: '🧃' },
  frozen: { en: 'Frozen', kr: '냉동식품', es: 'Congelados', icon: '❄️' },
  rice: { en: 'Rice & Grains', kr: '쌀 & 곡물', es: 'Arroz y Granos', icon: '🍚' },
  sauces: { en: 'Sauces', kr: '소스 & 양념', es: 'Salsas', icon: '🫙' },
  seasonings: { en: 'Seasonings', kr: '조미료', es: 'Condimentos', icon: '🧂' },
  seaweed: { en: 'Seaweed', kr: '김 & 해조류', es: 'Algas', icon: '🌿' },
  kimchi: { en: 'Kimchi & Banchan', kr: '김치 & 반찬', es: 'Kimchi', icon: '🥬' },
  prepared: { en: 'Prepared Foods', kr: '즉석식품', es: 'Preparados', icon: '🍱' },
  canned: { en: 'Canned Goods', kr: '통조림', es: 'Enlatados', icon: '🥫' },
  nuts: { en: 'Nuts & Seeds', kr: '견과류', es: 'Nueces', icon: '🥜' },
  dried: { en: 'Dried Goods', kr: '건조식품', es: 'Secos', icon: '📦' },
  baking: { en: 'Baking', kr: '베이킹', es: 'Hornear', icon: '🧁' },
  meat: { en: 'Meat', kr: '육류', es: 'Carnes', icon: '🥩' },
  seafood: { en: 'Seafood', kr: '해산물', es: 'Mariscos', icon: '🦐' },
  tofu: { en: 'Tofu & Soy', kr: '두부', es: 'Tofu', icon: '🧊' },
  produce: { en: 'Produce', kr: '채소 & 과일', es: 'Verduras', icon: '🥬' },
  dairy: { en: 'Dairy', kr: '유제품', es: 'Lácteos', icon: '🥛' },
  other: { en: 'Other', kr: '기타', es: 'Otros', icon: '🛒' }
};

// Write curated products.js
const outputProducts = curated.map(p => ({
  id: p.id, brand: p.brand, name: p.name, nameKr: p.nameKr,
  size: p.size, category: p.category, price: p.price,
  image: p.image, vendor: p.vendor
}));

const output = `// KIMCHI Shop - Curated Product Catalog
// Generated: ${new Date().toISOString()}
// Total: ${outputProducts.length} curated products
// Sources: Weee! matched (${stats.weeeMatch}) + Frequently ordered (${stats.freqOrder}) + Both (${stats.both})
// Prices = Weee! equivalent. K1 members get 5% off, K2 get 10% off.

const CATEGORIES = ${JSON.stringify(catMeta, null, 2)};

const PRODUCTS = ${JSON.stringify(outputProducts, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, 'products_curated.js'), output, 'utf8');

// Write photo-needed list
const photoList = needsPhoto.map(p =>
  `${p.brand}\t${p.name}\t${p.size}\t${p.category}\t${p.source}`
).join('\n');
fs.writeFileSync(path.join(__dirname, 'needs_photo.txt'),
  `KIMCHI Shop - Products Needing Photography\n${'='.repeat(60)}\nBrand\tProduct Name\tSize\tCategory\tSource\n${photoList}`, 'utf8');

console.log(`\n✅ Files saved:`);
console.log(`   products_curated.js - ${outputProducts.length} products for shop`);
console.log(`   needs_photo.txt - ${needsPhoto.length} products needing photos`);
