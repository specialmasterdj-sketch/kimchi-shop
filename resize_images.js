const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, 'images', 'official');
const OUTPUT_DIR = path.join(__dirname, 'images', 'official', 'resized');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Load priority products
const code = fs.readFileSync(path.join(__dirname, 'products.js'), 'utf8').replace(/^const /gm, 'var ');
const PRODUCTS = new Function(code + '; return PRODUCTS;')();
const brands = ['NONGSHIM', 'SAMYANG', 'CJ', 'LOTTE', 'ORION', 'DONGWON'];
const priority = PRODUCTS.filter(p => brands.includes(p.brand));

async function main() {
  const inputFiles = fs.readdirSync(INPUT_DIR).filter(f => /\.(jpg|png|jpeg|webp)$/i.test(f));

  // Find files that match product IDs
  let processed = 0, failed = 0, skipped = 0;
  const productIds = new Set(priority.map(p => p.id));

  for (const file of inputFiles) {
    const ext = path.extname(file);
    const base = path.basename(file, ext);

    // Only process files whose name matches a product ID
    if (!productIds.has(base)) continue;

    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, `${base}.jpg`);

    // Skip if already resized
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      if (stats.size > 1000) {
        skipped++;
        continue;
      }
    }

    try {
      await sharp(inputPath)
        .resize(500, 500, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .jpeg({ quality: 90 })
        .toFile(outputPath);

      const stats = fs.statSync(outputPath);
      console.log(`OK   ${base} (${(stats.size / 1024).toFixed(0)}KB)`);
      processed++;
    } catch (e) {
      console.log(`FAIL ${base}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nResize complete: ${processed} processed, ${skipped} skipped, ${failed} failed`);

  // Count final coverage
  const resizedFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.jpg'));
  let covered = 0;
  priority.forEach(p => {
    if (resizedFiles.some(f => f === p.id + '.jpg')) covered++;
  });

  console.log(`Final coverage: ${covered}/${priority.length} priority products have resized images`);
  console.log(`Total resized files: ${resizedFiles.length}`);
}

main().catch(console.error);
