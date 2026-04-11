const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUTPUT_DIR = path.join(__dirname, 'images', 'official');

// Mapping: product_id -> image path on nongshimusa.com
const productImageMap = {
  // === RAMEN (bags/packs) ===
  '08180K': 'shin_ramyun.png',           // SHIN RAMEN (4P)
  '08147K': 'shin_ramyun.png',           // SHIN RAMEN (10P) - same product, different pack size
  '08348K': 'chapagetti.png',            // CHAPAGETTI NOODLES (4P)
  '08344K': 'shin_ramyun_black.png',     // SHIN RAMEN BLACK (4P)
  '08229K': 'soon_vegie_noodle_soup.png', // SOON RAMEN (4P)
  '08387K': 'shin_ramyun_gold.jpg',      // SHIN RAMEN GOLD (4P)

  // === RAMEN (cups) ===
  '08220K': 'shin_ramyun_cup.png',       // SHIN RAMEN (CUP 6P)
  '08193K': 'shin_ramyun_black_cup.png', // SHIN RAMEN BLACK (CUP 6P)
  '08225K': 'spicy_shrimp_cup.jpg',      // SHRIMP RAMEN (CUP 6P)
  '08286K': '8d1a046038ae5c87f3f9723156a2264b7a83d4c4b16709f12ba342b0e79e8546.png', // SOON RAMEN (CUP 6P)
  '08801K': '49f21be11a747f1c6d55989f695ce1f11b30cfe3b52296cf8a86571e46b78cbc.jpg', // NEOGURI UDON (CUP 6P)

  // === RAMEN (bowls) ===
  '08212K': 'shin_ramyun_bowl_noodle.png', // SHIN RAMEN (BOWL 12P)
  '08358K': 'shin_ramyun_big_bowl.png',   // SHIN RAMEN (BIG BOWL 6P)
  '08213K': 'hot_and_spicy_bowl_noodle.jpg', // HOT & SPICY RAMEN (BOWL)
  '08224K': '4b0a0654df324c07814d3e701d9189662b39420abe8288afe1f5dfd8074fbb75.jpg', // KIMCHI RAMEN (BOWL)
  '08226K': '37d9a926baa48ccf6c716896f2bd4c0d9a0fb45ee5551bf5c14f13b219767611.jpg', // BEEF RAMEN (BOWL)
  '08290K': 'ce96e328c624850f01d9be229d4a7e0da3f1d98dfa6e499c48d72084c287032b.jpg', // CHICKEN RAMEN (BOWL SPICY)
  '08291K': '3b71da3dc18ace810909f6ce83c63b1ae6e0038343d621381e44c3d824b074e9.jpg', // SHRIMP RAMEN (BOWL SPICY)
  '08294K': 'e1bfa22f2c0ea9f0129a261846c9336acba7ca0fc90123442fe9bba8ec1f3038.jpg', // SHRIMP RAMEN (BOWL MILD)
  '08295K': '0b603a61d7c63b2257ab593e048d1a948c0a3dee2307dbeafe1da25f093f749d.jpg', // LOBSTER RAMEN (BOWL)
  '08293K': 'savory_chicken_noodle_soup.jpg', // CHICKEN RAMEN (BOWL MILD)

  // === SNACKS ===
  '08960K': '1217Shrimp-Crackers.jpg',    // SHRIMP CRACKER (S)
  '09404K': '1217Shrimp-Crackers.jpg',    // SHRIMP CRACKER (L)
  '08961K': '1217Shrimp-Crackers-Spicy.jpg', // SHRIMP CRACKER (HOT & SPICY)
  '08915K': 'banana-kick.jpg',            // BANANA FLAVORED SNACK (L)
  '08962K': 'banana-kick.jpg',            // BANANA FLAVORED SNACK (S)
  '08916K': '1217tako-chips.jpg',         // TAKO CHIPS (OCTOPUS FLAVOR L)
  '08917K': 'e2595613403818f4669deb80832f8606bd32f214592f2712e1b1feb1306d86a5.jpg', // SHRIMP FLAVORED CHIPS (L)
  '09381K': 'e2595613403818f4669deb80832f8606bd32f214592f2712e1b1feb1306d86a5.jpg', // SHRIMP FLAVORED CHIPS (S)
  '08918K': 'honey_twist_snack.jpg',      // HONEY TWIST SNACK (L)
  '09756K': 'honey_twist_snack.jpg',      // HONEY TWIST SNACK (S)
  '08965K': '1217SweetPotatoSnack.jpg',   // SWEET POTATO SNACK
  '09405K': 'onion_ring.jpg',             // ONION RINGS SNACK (L)
  '09845K': '1217cuttlefish.jpg',         // CUTTLEFISH SNACK (L)
};

const BASE_URL = 'https://www.nongshimusa.com/html5/imgs/products/imgs/';

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function processImage(buffer, outputPath) {
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
  const entries = Object.entries(productImageMap);
  console.log(`Processing ${entries.length} Nongshim products...`);

  let success = 0;
  let failed = 0;

  for (const [productId, imageFile] of entries) {
    const url = BASE_URL + imageFile;
    const outputPath = path.join(OUTPUT_DIR, `nongshim_${productId}.jpg`);

    try {
      console.log(`Downloading: ${productId} <- ${imageFile}`);
      const buffer = await downloadImage(url);
      await processImage(buffer, outputPath);
      console.log(`  OK: ${outputPath}`);
      success++;
    } catch (err) {
      console.error(`  FAILED: ${productId} - ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! Success: ${success}, Failed: ${failed}`);
}

main();
