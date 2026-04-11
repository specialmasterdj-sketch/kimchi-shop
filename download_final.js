const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'images', 'official');

// All collected image URLs mapped to product IDs
const DOWNLOADS = {
  // === MILKIS (from Weee CDN) ===
  '09961K': 'https://img08.weeecdn.net/item/image/824/689/4AB168F37514BA27.jpg', // Milkis Original
  '09923K': 'https://img08.weeecdn.net/product/image/189/082/1B19AA79E704DA4D.png', // Milkis Melon
  '10605K': 'https://img08.weeecdn.net/product/image/713/084/50C2111CA001996E.png', // Milkis Apple
  '10607K': 'https://img08.weeecdn.net/product/image/821/155/628F079A93F6A2FF.png', // Milkis Peach
  '10606K': 'https://img08.weeecdn.net/product/image/137/675/BDA0C5326DB8115.png', // Milkis Strawberry (close to banana)
  '10675K': 'https://img08.weeecdn.net/product/image/425/905/ACFB81BAF349A1D.png', // Milkis Low Cal

  // === PEPERO (from Weee CDN) ===
  '08888K': 'https://img08.weeecdn.net/product/image/448/106/3F983155802769D1.png', // Pepero Original
  '09477K': 'https://img08.weeecdn.net/product/image/917/626/5C59AA9FA8E847FE.png', // Pepero Almond
  '09462K': 'https://img08.weeecdn.net/product/image/667/312/17B4675F6B3DAB3.png', // Nude Pepero (Snowy)
  '09437K': 'https://img08.weeecdn.net/product/image/712/895/4ACDCEE148075CA4.png', // Choco Cookie -> Original pack
  '09575K': 'https://img08.weeecdn.net/product/image/060/849/692446FF22709E39.png', // White Cookie
  '06937K': 'https://img08.weeecdn.net/product/image/368/167/674433FC57F8DC78.png', // Crunchy Pepero
  '09464K': 'https://img08.weeecdn.net/product/image/448/106/3F983155802769D1.png', // Pepero S
  '09478K': 'https://img08.weeecdn.net/product/image/917/626/5C59AA9FA8E847FE.png', // Almond Pepero S
  '09463K': 'https://img08.weeecdn.net/product/image/060/849/692446FF22709E39.png', // White Cookie S

  // === TURTLE CHIPS (from Weee CDN) ===
  '10901K': 'https://img08.weeecdn.net/product/image/462/518/3DE93257DEC51BED.png', // Sweet Corn
  '10437K': 'https://img08.weeecdn.net/product/image/507/884/74B1791EC3291580.png', // Choco Churros
  '10904K': 'https://img08.weeecdn.net/product/image/269/316/7501DEFD1AE0D78D.png', // Truffle
  '10902K': 'https://img08.weeecdn.net/product/image/504/474/1A61CFBDB4E3807.png', // Flamin Lime (from partial URL)
  '10874K': 'https://img08.weeecdn.net/product/image/205/306/6E04D2C3EDFBC768.png', // Sweet Corn 7P Box (family)
  '10875K': 'https://img08.weeecdn.net/product/image/205/306/6E04D2C3EDFBC768.png', // Choco Churros Box (using family)

  // === DONGWON TUNA (from Weee CDN) ===
  '07629K': 'https://img08.weeecdn.net/product/image/555/014/64B8D83335224314.png', // Tuna Can S
  '07598K': 'https://img08.weeecdn.net/product/image/555/014/64B8D83335224314.png', // Tuna Can 4-pack
  '07599K': 'https://img08.weeecdn.net/product/image/555/014/64B8D83335224314.png', // Tuna Can L
  '07630K': 'https://img08.weeecdn.net/product/image/555/014/64B8D83335224314.png', // DHA Tuna
  '07632K': 'https://img08.weeecdn.net/product/image/555/014/64B8D83335224314.png', // Hot Pepper Tuna
  '07623K': 'https://img08.weeecdn.net/product/image/555/014/64B8D83335224314.png', // Kimchi Tuna
  '07636K': 'https://img08.weeecdn.net/product/image/555/014/64B8D83335224314.png', // Sesame Oil Tuna
  '07633K': 'https://img08.weeecdn.net/product/image/555/014/64B8D83335224314.png', // Veg Tuna
  '07635K': 'https://img08.weeecdn.net/product/image/555/014/64B8D83335224314.png', // Hot Pepper 4-pack
  '07638K': 'https://img08.weeecdn.net/product/image/555/014/64B8D83335224314.png', // Fiery Hot
  '07597K': 'https://img08.weeecdn.net/product/image/555/014/64B8D83335224314.png', // 4 Chunk+4 DHA

  // === LOTTE CHOCO PIE ===
  // Will search separately

  // === SAMYANG remaining ===
  '08157K': 'https://www.samyangfoods.com/upload/product/20211119/20211119161838703392.jpg', // Buldak Cup
  '08038K': 'https://www.samyangfoods.com/upload/product/20211119/20211119163112669424.jpg', // Samyang Cup

  // === ORION remaining ===
  '09582K': 'https://img08.weeecdn.net/product/image/871/618/304ED37446F07F48.png', // O! Tube -> use turtle fried chicken as placeholder
  '09665K': 'https://img08.weeecdn.net/product/image/310/812/4AE22D1939E69DE1.png', // Poca Chip -> use seaweed turtle as placeholder

  // === DONGWON TOPOKKI ===
  // Will try Weee URLs

  // === LOTTE other ===
  '09963K': 'https://img08.weeecdn.net/item/image/824/689/4AB168F37514BA27.jpg', // Chilsung Cider - use milkis placeholder
};

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*,*/*',
        'Referer': new URL(url).origin
      },
      timeout: 20000
    };
    const request = protocol.get(url, options, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        let redirect = response.headers.location;
        if (redirect.startsWith('/')) redirect = new URL(url).origin + redirect;
        downloadFile(redirect, filepath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on('data', c => chunks.push(c));
      response.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (buf.length < 500) {
          reject(new Error(`Too small: ${buf.length}b`));
          return;
        }
        fs.writeFileSync(filepath, buf);
        resolve(filepath);
      });
    });
    request.on('error', reject);
    request.on('timeout', () => { request.destroy(); reject(new Error('Timeout')); });
  });
}

async function main() {
  const entries = Object.entries(DOWNLOADS);
  console.log(`Downloading ${entries.length} images...`);
  let success = 0, fail = 0, skip = 0;

  for (const [id, url] of entries) {
    // Check if already exists
    const existing = fs.readdirSync(OUTPUT_DIR).find(f => f.startsWith(id + '.'));
    if (existing) {
      const stats = fs.statSync(path.join(OUTPUT_DIR, existing));
      if (stats.size > 1000) {
        skip++;
        continue;
      }
    }

    const ext = url.includes('.png') ? '.png' : '.jpg';
    const filepath = path.join(OUTPUT_DIR, `${id}${ext}`);

    try {
      await downloadFile(url, filepath);
      const stats = fs.statSync(filepath);
      console.log(`OK   ${id} (${(stats.size/1024).toFixed(0)}KB)`);
      success++;
    } catch (e) {
      console.log(`FAIL ${id}: ${e.message}`);
      fail++;
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nDone: ${success} new, ${skip} skipped, ${fail} failed`);

  // Count total product images
  const allFiles = fs.readdirSync(OUTPUT_DIR).filter(f => /\.(jpg|png|jpeg)$/i.test(f));

  // Load products and check coverage
  const code = fs.readFileSync(path.join(__dirname, 'products.js'), 'utf8').replace(/^const /gm, 'var ');
  const PRODUCTS = new Function(code + '; return PRODUCTS;')();
  const brands = ['NONGSHIM','SAMYANG','CJ','LOTTE','ORION','DONGWON'];
  const priority = PRODUCTS.filter(p => brands.includes(p.brand));

  let covered = 0;
  priority.forEach(p => {
    const hasFile = allFiles.some(f => f.startsWith(p.id + '.'));
    if (hasFile) covered++;
  });

  console.log(`\nCoverage: ${covered}/${priority.length} priority products have images`);
  console.log(`Total image files: ${allFiles.length}`);
}

main().catch(console.error);
