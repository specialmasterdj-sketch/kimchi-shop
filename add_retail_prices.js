// Script to add retail prices from Weee! data to products.js
const fs = require('fs');
const path = require('path');

// Load Weee! prices
const weeePrices = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'AI HQ', 'weee_prices.json'), 'utf8'));

// Load products.js
const productsPath = path.join(__dirname, '..', 'kimchi-mart-order', 'products.js');
const productsContent = fs.readFileSync(productsPath, 'utf8');
const vendorsMatch = productsContent.match(/const VENDORS = (\{[\s\S]*\});?\s*$/);
let VENDORS;
eval('VENDORS = ' + vendorsMatch[1]);

// Build Weee! price index
const weeeIndex = {};
weeePrices.forEach(p => {
  const key = p.name.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  weeeIndex[key] = parseFloat(p.price.replace('$', ''));
});

// Category default prices (based on Weee! averages)
const catDefaults = {
  'rice-grains': 12.99, 'baking-cooking': 5.49, 'noodles-instant': 5.99,
  'sauces-condiments': 6.99, 'oils-seasonings': 8.99, 'seeds-nuts': 7.99,
  'seaweed-laver': 4.99, 'canned-fruits-veg': 3.99, 'canned-processed': 4.49,
  'prepared-foods': 7.99, 'snacks': 4.49, 'sweets-desserts': 5.49,
  'frozen-desserts': 5.99, 'beverages': 3.99, 'fresh-frozen': 7.99,
  'non-food': 5.99, 'dry-goods': 5.49, 'korean-grocery': 5.99,
  'imported-goods': 6.99, 'other': 4.99
};

function parseWeight(sizeStr) {
  if (!sizeStr) return { oz: 16, lbs: 1 };
  const multiMatch = sizeStr.match(/\d+[Xx](\d+(?:\.\d+)?)\s*(LB|OZ|G|KG|ML|L|FL)/i);
  let unitSize = multiMatch ? multiMatch[1] + ' ' + multiMatch[2] : sizeStr;
  const lbMatch = unitSize.match(/(\d+(?:\.\d+)?)\s*LB/i);
  if (lbMatch) return { lbs: parseFloat(lbMatch[1]), oz: parseFloat(lbMatch[1]) * 16 };
  const ozMatch = unitSize.match(/(\d+(?:\.\d+)?)\s*(?:OZ|FL)/i);
  if (ozMatch) return { oz: parseFloat(ozMatch[1]), lbs: parseFloat(ozMatch[1]) / 16 };
  const gMatch = unitSize.match(/(\d+(?:\.\d+)?)\s*[Gg](?:\s|$)/);
  if (gMatch) return { oz: parseFloat(gMatch[1]) / 28.35, lbs: parseFloat(gMatch[1]) / 453.6 };
  return { oz: 16, lbs: 1 };
}

function findWeeePrice(product) {
  const searchTerms = (product.brand + ' ' + product.name).toLowerCase()
    .replace(/[_()]/g, ' ').replace(/\d+[Xx]\d+/g, '').replace(/\d+#/g, '')
    .replace(/\s+/g, ' ').trim();
  let bestMatch = null, bestScore = 0;
  for (const [key, price] of Object.entries(weeeIndex)) {
    const searchWords = searchTerms.split(' ').filter(w => w.length > 2);
    const keyWords = key.split(' ').filter(w => w.length > 2);
    let matches = 0;
    for (const sw of searchWords) {
      if (keyWords.some(kw => kw.includes(sw) || sw.includes(kw))) matches++;
    }
    const score = matches / Math.max(searchWords.length, 1);
    if (score > bestScore && score >= 0.4) { bestScore = score; bestMatch = price; }
  }
  return bestMatch;
}

function calcPrice(product) {
  const weeePrice = findWeeePrice(product);
  if (weeePrice) return roundPrice(weeePrice);
  const base = catDefaults[product.category] || 4.99;
  const weight = parseWeight(product.size);
  let price = Math.max(base, weight.lbs * 3.5);
  return roundPrice(Math.min(price, 99.99));
}

function roundPrice(p) {
  const r = Math.round(p * 100) / 100;
  const c = Math.round((r % 1) * 100), d = Math.floor(r);
  if (c >= 75) return d + 0.99;
  if (c >= 50) return d + 0.79;
  if (c >= 25) return d + 0.49;
  return d + 0.29;
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

// Build SHOP_PRODUCTS - flat array of all products with retail prices
const allProducts = [];
const seenIds = new Set();
let matched = 0, unmatched = 0;

for (const [vendorKey, vendor] of Object.entries(VENDORS)) {
  if (vendorKey === 'rhee_frequent') continue;
  for (const p of vendor.products) {
    const key = `${p.brand}-${p.name}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenIds.has(key)) continue;
    seenIds.add(key);

    const retailPrice = calcPrice(p);
    if (findWeeePrice(p)) matched++; else unmatched++;

    allProducts.push({
      id: p.id,
      brand: p.brand,
      name: p.name.replace(/[_]/g, ' ').replace(/\(\d+[Xx]\d+.*?\)/g, '').replace(/\(\d+#.*?\)/g, '').trim(),
      nameKr: p.nameKr || '',
      size: parseRetailSize(p.size),
      sizeWholesale: p.size,
      category: p.category,
      price: retailPrice,
      image: p.image || '',
      vendor: vendor.name.replace(/ - .*$/, '').trim()
    });
  }
}

// Sort by category then brand
allProducts.sort((a, b) => a.category.localeCompare(b.category) || a.brand.localeCompare(b.brand));

// Category metadata
const categories = {};
for (const p of allProducts) {
  if (!categories[p.category]) categories[p.category] = { count: 0 };
  categories[p.category].count++;
}

const catNames = {
  'rice-grains': { en: 'Rice & Grains', kr: '쌀 & 곡물', es: 'Arroz y Granos', icon: '🍚' },
  'baking-cooking': { en: 'Baking & Cooking', kr: '베이킹 & 요리', es: 'Hornear', icon: '🧁' },
  'noodles-instant': { en: 'Ramen & Noodles', kr: '라면 & 면류', es: 'Fideos y Ramen', icon: '🍜' },
  'sauces-condiments': { en: 'Sauces & Condiments', kr: '소스 & 양념', es: 'Salsas', icon: '🫙' },
  'oils-seasonings': { en: 'Oils & Seasonings', kr: '오일 & 조미료', es: 'Aceites', icon: '🫒' },
  'seeds-nuts': { en: 'Seeds & Nuts', kr: '견과류', es: 'Nueces', icon: '🥜' },
  'seaweed-laver': { en: 'Seaweed & Laver', kr: '김 & 해조류', es: 'Algas', icon: '🌿' },
  'canned-fruits-veg': { en: 'Canned Goods', kr: '통조림', es: 'Enlatados', icon: '🥫' },
  'canned-processed': { en: 'Canned & Processed', kr: '가공식품', es: 'Procesados', icon: '🏭' },
  'prepared-foods': { en: 'Prepared Foods', kr: '즉석식품', es: 'Preparados', icon: '🍱' },
  'snacks': { en: 'Snacks', kr: '과자 & 스낵', es: 'Snacks', icon: '🍿' },
  'sweets-desserts': { en: 'Sweets & Desserts', kr: '디저트', es: 'Dulces', icon: '🍰' },
  'frozen-desserts': { en: 'Frozen Desserts', kr: '냉동 디저트', es: 'Postres Congelados', icon: '🍦' },
  'beverages': { en: 'Beverages', kr: '음료', es: 'Bebidas', icon: '🧃' },
  'fresh-frozen': { en: 'Fresh & Frozen', kr: '신선 & 냉동', es: 'Congelado', icon: '❄️' },
  'non-food': { en: 'Non-Food', kr: '비식품', es: 'No Alimentario', icon: '🧹' },
  'dry-goods': { en: 'Dry Goods', kr: '건조식품', es: 'Secos', icon: '📦' },
  'korean-grocery': { en: 'Korean Grocery', kr: '한국 식료품', es: 'Coreanos', icon: '🇰🇷' },
  'imported-goods': { en: 'Imported Goods', kr: '수입품', es: 'Importados', icon: '🌍' },
  'other': { en: 'Other', kr: '기타', es: 'Otros', icon: '🛒' }
};

// Generate output JS file
const output = `// KIMCHI Shop - Product Catalog with Retail Prices
// Generated: ${new Date().toISOString()}
// Total: ${allProducts.length} products | Weee! matched: ${matched} | Category-priced: ${unmatched}
// Prices = Weee! equivalent. K1 members get 5% off, K2 get 10% off.

const CATEGORIES = ${JSON.stringify(catNames, null, 2)};

const PRODUCTS = ${JSON.stringify(allProducts, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, 'products.js'), output, 'utf8');

console.log(`✅ products.js created for KIMCHI Shop`);
console.log(`   Total: ${allProducts.length} products`);
console.log(`   Weee! matched: ${matched}`);
console.log(`   Category-priced: ${unmatched}`);
console.log(`\n📦 Categories:`);
for (const [cat, info] of Object.entries(categories).sort((a, b) => b[1].count - a[1].count)) {
  const name = catNames[cat]?.en || cat;
  console.log(`   ${catNames[cat]?.icon || '📦'} ${name.padEnd(22)} ${info.count} products`);
}
