const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'images', 'official');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Verified image URLs from official sources
const IMAGE_MAP = {
  // === NONGSHIM - from nongshimusa.com (verified working) ===
  '08180K': 'https://nongshimusa.com/html5/imgs/products/imgs/shin_ramyun.png',
  '08147K': 'https://nongshimusa.com/html5/imgs/products/imgs/shin_ramyun.png',
  '08344K': 'https://nongshimusa.com/html5/imgs/products/imgs/shin_ramyun_black.png',
  '08193K': 'https://nongshimusa.com/html5/imgs/products/imgs/shin_ramyun_black_cup.png',
  '08220K': 'https://nongshimusa.com/html5/imgs/products/imgs/shin_ramyun_cup.png',
  '08213K': 'https://nongshimusa.com/html5/imgs/products/imgs/shin_ramyun_bowl_noodle.png',
  '08212K': 'https://nongshimusa.com/html5/imgs/products/imgs/shin_ramyun_bowl_noodle.png',
  '08358K': 'https://nongshimusa.com/html5/imgs/products/imgs/shin_ramyun_big_bowl.png',
  '08387K': 'https://nongshimusa.com/html5/imgs/products/imgs/shin_ramyun_gold.jpg',
  '08348K': 'https://nongshimusa.com/html5/imgs/products/imgs/chapagetti.png',
  '08229K': 'https://nongshimusa.com/html5/imgs/products/imgs/soon_veggie.png',
  '08801K': 'https://nongshimusa.com/html5/imgs/products/imgs/neoguri_mild.jpg',
  '08224K': 'https://nongshimusa.com/html5/imgs/products/imgs/kimchi_ramyun.jpg',
  '08226K': 'https://nongshimusa.com/html5/imgs/products/imgs/soon_veggie.png',
  '08286K': 'https://nongshimusa.com/html5/imgs/products/imgs/soon_veggie.png',
  '08960K': 'https://nongshimusa.com/html5/imgs/products/imgs/shrimp_cracker.jpg',
  '08915K': 'https://nongshimusa.com/html5/imgs/products/imgs/banana_kick.jpg',
  '09405K': 'https://nongshimusa.com/html5/imgs/products/imgs/onion_ring.jpg',
  '08290K': 'https://nongshimusa.com/html5/imgs/products/imgs/creamy_chicken.jpg',
  '08295K': 'https://nongshimusa.com/html5/imgs/products/imgs/savory_chicken_noodle_soup.jpg',

  // === SAMYANG - from samyangfoods.com ===
  '08479K': 'https://www.samyangfoods.com/upload/product/20211119/20211119163051698420.jpg', // Carbo Buldak
  '08155K': 'https://www.samyangfoods.com/upload/product/20211119/20211119161838703392.jpg', // Buldak Original (3x)
  '08465K': 'https://www.samyangfoods.com/upload/product/20211119/20211119161838703392.jpg', // 2x Spicy
  '08455K': 'https://www.samyangfoods.com/upload/product/20211119/20211119163112669424.jpg', // Samyang Original
  '08482K': 'https://www.samyangfoods.com/upload/product/20220322/20220322165710960754.png', // Quattro Cheese
  '08483K': 'https://www.samyangfoods.com/upload/product/20220322/20220322165805332758.png', // Habanero Lime

  // === SAMYANG from Weee CDN (verified) ===
  '08484K': 'https://img06.weeecdn.com/product/image/163/812/6482C3FEE019CAFA.png', // Carbo Cup

  // === LOTTE from Weee CDN ===
  // We'll try these Weee product image patterns

  // === DONGWON ===

  // === ORION ===
};

// Additional search-based URLs - we'll try multiple sources
const SEARCH_PRODUCTS = [
  // SAMYANG remaining
  { id: '08480K', query: 'samyang carbo buldak big bowl' },
  { id: '08158K', query: 'samyang buldak ramen big bowl original' },
  { id: '08157K', query: 'samyang buldak ramen cup' },
  { id: '08500K', query: 'samyang carbonara buldak topokki bowl' },
  { id: '08478K', query: 'samyang buldak 2x spicy cup' },
  { id: '08485K', query: 'samyang cheese buldak cup' },
  { id: '08038K', query: 'samyang ramen cup original' },
  { id: '03540K', query: 'samyang buldak hot chicken sauce bottle' },
  { id: '03542K', query: 'samyang carbo hot chicken sauce bottle' },
  { id: '10472K', query: 'samyang wang changgu honey snack' },

  // NONGSHIM remaining
  { id: '08225K', query: 'nongshim shrimp ramen cup' },
  { id: '08294K', query: 'nongshim shrimp ramen bowl mild' },
  { id: '08291K', query: 'nongshim shrimp ramen bowl spicy' },
  { id: '08293K', query: 'nongshim chicken ramen bowl mild' },
  { id: '08916K', query: 'nongshim tako chips octopus' },
  { id: '08917K', query: 'nongshim shrimp chips' },
  { id: '08918K', query: 'nongshim honey twist snack' },
  { id: '08961K', query: 'nongshim shrimp cracker hot spicy' },
  { id: '08962K', query: 'nongshim banana snack small' },
  { id: '08965K', query: 'nongshim sweet potato snack' },
  { id: '09381K', query: 'nongshim shrimp chips small' },
  { id: '09404K', query: 'nongshim shrimp cracker large' },
  { id: '09756K', query: 'nongshim honey twist small' },
  { id: '09845K', query: 'nongshim cuttlefish snack' },

  // LOTTE
  { id: '09961K', query: 'lotte milkis original can' },
  { id: '09923K', query: 'lotte milkis melon can' },
  { id: '10605K', query: 'lotte milkis apple can' },
  { id: '10606K', query: 'lotte milkis banana can' },
  { id: '10607K', query: 'lotte milkis peach can' },
  { id: '09949K', query: 'lotte milkis bottle 500ml' },
  { id: '09963K', query: 'lotte chilsung cider can' },
  { id: '08888K', query: 'lotte pepero original' },
  { id: '09477K', query: 'lotte pepero almond' },
  { id: '09462K', query: 'lotte nude pepero' },
  { id: '09437K', query: 'lotte choco cookie pepero' },
  { id: '09575K', query: 'lotte white cookie pepero' },
  { id: '06937K', query: 'lotte crunchy pepero' },
  { id: '09663K', query: 'lotte choco pie original' },

  // ORION
  { id: '10901K', query: 'orion turtle chips sweet corn' },
  { id: '10902K', query: 'orion turtle chips flamin lime' },
  { id: '10437K', query: 'orion turtle chips choco churros' },
  { id: '10904K', query: 'orion turtle chips truffle' },
  { id: '09582K', query: 'orion o tube cheddar cheese' },

  // DONGWON
  { id: '08526K', query: 'dongwon cheese topokki' },
  { id: '08527K', query: 'dongwon hot spicy topokki' },
  { id: '08545K', query: 'dongwon rapokki' },
  { id: '07598K', query: 'dongwon tuna can light' },
  { id: '07629K', query: 'dongwon tuna can' },

  // CJ
  { id: 'cj_1024453', query: 'bibigo whole cabbage kimchi' },
  { id: 'cj_1021455', query: 'bibigo sliced kimchi jar' },
  { id: 'EC5111', query: 'bibigo wang gyoza pork vegetable' },
  { id: 'EC5113', query: 'bibigo wang gyoza beef vegetable' },
  { id: 'cj_1020313', query: 'bibigo tofu soft' },
];

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*,*/*',
        'Referer': new URL(url).origin
      },
      timeout: 15000
    }, (response) => {
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
        if (buf.length < 1000) {
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
  const entries = Object.entries(IMAGE_MAP);
  console.log(`Phase 1: Downloading ${entries.length} known images...`);
  let success = 0, fail = 0;

  for (const [id, url] of entries) {
    const ext = url.match(/\.(png|jpg|jpeg|webp)/i)?.[1] || 'jpg';
    const filepath = path.join(OUTPUT_DIR, `${id}.${ext}`);

    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      if (stats.size > 1000) {
        console.log(`SKIP ${id} (exists ${(stats.size/1024).toFixed(0)}KB)`);
        success++;
        continue;
      }
    }

    try {
      await downloadFile(url, filepath);
      const stats = fs.statSync(filepath);
      console.log(`OK   ${id} (${(stats.size/1024).toFixed(0)}KB)`);
      success++;
    } catch (e) {
      console.log(`FAIL ${id}: ${e.message} <- ${url}`);
      fail++;
    }
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nPhase 1 done: ${success} ok, ${fail} failed`);
  console.log(`\nPhase 2 needs WebSearch for ${SEARCH_PRODUCTS.length} products - will be handled separately`);

  // List what we have
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => /\.(jpg|png|jpeg|webp)$/i.test(f));
  console.log(`\nTotal files in output dir: ${files.length}`);
  files.forEach(f => {
    const s = fs.statSync(path.join(OUTPUT_DIR, f));
    console.log(`  ${f} (${(s.size/1024).toFixed(0)}KB)`);
  });
}

main().catch(console.error);
