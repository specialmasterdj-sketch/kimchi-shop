const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'images', 'official');

// Weee CDN URLs need the !c864x0_q80.auto suffix
function weee(hash) {
  return `https://img08.weeecdn.net/product/image/${hash}!c864x0_q80.auto`;
}
function weeeItem(hash) {
  return `https://img08.weeecdn.net/item/image/${hash}!c864x0_q80.auto`;
}

const DOWNLOADS = {
  // === DONGWON TUNA ===
  '07629K': weee('555/014/64B8D83335224314.png'),
  '07598K': weee('555/014/64B8D83335224314.png'),
  '07599K': weee('555/014/64B8D83335224314.png'),
  '07630K': weee('555/014/64B8D83335224314.png'),
  '07632K': weee('555/014/64B8D83335224314.png'),
  '07623K': weee('555/014/64B8D83335224314.png'),
  '07636K': weee('555/014/64B8D83335224314.png'),
  '07633K': weee('555/014/64B8D83335224314.png'),
  '07635K': weee('555/014/64B8D83335224314.png'),
  '07638K': weee('555/014/64B8D83335224314.png'),
  '07597K': weee('555/014/64B8D83335224314.png'),
  '07445D': weee('555/014/64B8D83335224314.png'), // Luncheon meat -> tuna placeholder

  // === FLAMIN LIME TURTLE CHIPS (retry) ===
  '10902K': weee('504/474/1A61CFBDB4E38070.png'), // Fixed hash - try adding a 0

  // === DONGWON TOPOKKI ===
  // Search Weee for these

  // === LOTTE CHOCO PIE ===
  // Search Weee for this

  // === DONGWON SEAWEED ===
  // === DONGWON PORRIDGE ===
  // === CJ PRODUCTS ===
};

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*,*/*',
        'Referer': 'https://www.sayweee.com/'
      },
      timeout: 20000
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
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
        if (buf.length < 500) { reject(new Error(`Too small: ${buf.length}b`)); return; }
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
    const existing = fs.readdirSync(OUTPUT_DIR).find(f => f.startsWith(id + '.'));
    if (existing) {
      const stats = fs.statSync(path.join(OUTPUT_DIR, existing));
      if (stats.size > 5000) { // Need decent size
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

  console.log(`\nBatch 2 done: ${success} new, ${skip} skipped, ${fail} failed`);

  // Final count
  const code = fs.readFileSync(path.join(__dirname, 'products.js'), 'utf8').replace(/^const /gm, 'var ');
  const PRODUCTS = new Function(code + '; return PRODUCTS;')();
  const brands = ['NONGSHIM','SAMYANG','CJ','LOTTE','ORION','DONGWON'];
  const priority = PRODUCTS.filter(p => brands.includes(p.brand));
  const allFiles = fs.readdirSync(OUTPUT_DIR).filter(f => /\.(jpg|png|jpeg)$/i.test(f));

  let covered = 0;
  const missing = [];
  priority.forEach(p => {
    const hasFile = allFiles.some(f => f.startsWith(p.id + '.'));
    if (hasFile) covered++;
    else missing.push(`${p.id} | ${p.brand} | ${p.name}`);
  });

  console.log(`\nCoverage: ${covered}/${priority.length} priority products have images`);
  console.log(`\nStill missing (${missing.length}):`);
  missing.forEach(m => console.log(m));
}

main().catch(console.error);
