const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUTPUT_DIR = path.join(__dirname, 'images', 'official');

// Mapping: product_id -> { name, imageUrl }
// Sources: samyangamerica.com (clean PNGs) and samyangfoods.com/eng (global site)
const PRODUCT_IMAGE_MAP = {
  // === Multi-pack ramen (from samyangamerica.com) ===
  '08155K': {
    name: 'BULDAK RAMEN (5P)',
    url: 'https://samyangamerica.com/images/products/buldak-multi-original.png'
  },
  '08479K': {
    name: 'CARBO BULDAK RAMEN (5P)',
    url: 'https://samyangamerica.com/images/products/buldak-multi-carbonara.png'
  },
  '08465K': {
    name: '2X SPICY BULDAK RAMEN (5P)',
    url: 'https://samyangamerica.com/images/products/buldak-multi-2x-spicy.png'
  },
  '08483K': {
    name: 'HABANERO LIME BULDAK RAMEN (5P)',
    url: 'https://samyangamerica.com/images/products/buldak-multi-habanero-lime.png'
  },
  '08455K': {
    name: 'SAMYANG RAMEN ORIGINAL (4P)',
    url: 'https://samyangamerica.com/images/products/samyang-multi-original.png'
  },
  // === Sauces (from samyangamerica.com) ===
  '03540K': {
    name: 'BULDAK HOT CHICKEN FLAVOR SAUCE',
    url: 'https://samyangamerica.com/images/products/buldak-sauce-original.png'
  },
  '03542K': {
    name: 'CARBO HOT CHICKEN FLAVOR SAUCE',
    url: 'https://samyangamerica.com/images/products/buldak-sauce-carbonara.png'
  },
  // === Topokki (from samyangamerica.com) ===
  '08500K': {
    name: 'CARBONARA BULDAK TOPOKKI (BIG BOWL)',
    url: 'https://samyangamerica.com/images/products/buldak-hmr-carbonara-topokki.png'
  },
  // === From samyangfoods.com global site ===
  '08480K': {
    name: 'CARBO BULDAK RAMEN (BIG BOWL)',
    url: 'https://www.samyangfoods.com/upload/product/20211119/20211119162929271408.jpg'
  },
  // === Not available on official manufacturer sites ===
  '08158K': {
    name: 'BULDAK RAMEN (BIG BOWL)',
    url: null  // Not found - only Carbonara Big Bowl on official sites
  },
  '08157K': {
    name: 'BULDAK RAMEN (CUP 6P)',
    url: null  // Cup format not on official sites
  },
  '08484K': {
    name: 'CARBO BULDAK RAMEN (CUP 6P)',
    url: null  // Cup format not on official sites
  },
  '08478K': {
    name: 'BULDAK RAMEN 2X SPICY (CUP 6P)',
    url: null  // Cup format not on official sites
  },
  '08038K': {
    name: 'SAMYANG RAMEN (CUP 6P)',
    url: null  // Cup format not on official sites
  },
  '08485K': {
    name: 'CHEESE BULDAK RAMEN (CUP 6P)',
    url: null  // Not found on official sites
  },
  '08482K': {
    name: 'QUATTRO CHEESE BULDAK RAMEN (5P)',
    url: null  // Not found on official sites
  },
  '10472K': {
    name: 'WANG CHANGGU (HONEY DIPPED SNACK)',
    url: null  // Not found on official sites
  },
};

function download(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        return download(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function processImage(buffer, outputPath) {
  // Resize to 500x500 with white background, maintaining aspect ratio
  await sharp(buffer)
    .resize(500, 500, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 90 })
    .toFile(outputPath);
}

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const entries = Object.entries(PRODUCT_IMAGE_MAP);
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const notFound = [];

  for (const [productId, info] of entries) {
    const outputFile = path.join(OUTPUT_DIR, `samyang_${productId}.jpg`);

    if (!info.url) {
      console.log(`[SKIP] ${productId} - ${info.name}: No official image URL found`);
      notFound.push({ id: productId, name: info.name });
      skipped++;
      continue;
    }

    try {
      console.log(`[DOWNLOAD] ${productId} - ${info.name}`);
      console.log(`  URL: ${info.url}`);
      const buffer = await download(info.url);
      console.log(`  Downloaded: ${(buffer.length / 1024).toFixed(1)} KB`);

      await processImage(buffer, outputFile);
      console.log(`  Saved: ${outputFile}`);
      downloaded++;
    } catch (err) {
      console.error(`[FAIL] ${productId} - ${info.name}: ${err.message}`);
      failed++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total products: ${entries.length}`);
  console.log(`Downloaded & processed: ${downloaded}`);
  console.log(`Skipped (no URL): ${skipped}`);
  console.log(`Failed: ${failed}`);

  if (notFound.length > 0) {
    console.log('\nProducts without official images:');
    notFound.forEach(p => console.log(`  - ${p.id}: ${p.name}`));
  }
}

main().catch(console.error);
