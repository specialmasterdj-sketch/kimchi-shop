// Clean product images: remove barcodes, SKU text, wholesale info
// Strategy:
// 1. Analyze each image for text/barcode regions (top/bottom borders)
// 2. Crop to product-only area
// 3. Save cleaned version to images_clean/ folder

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PRODUCTS_FILE = path.join(__dirname, 'products.js');
const CLEAN_DIR = path.join(__dirname, 'images_clean');
const IMAGES_DIR = path.join(__dirname, 'images');

// Load products to get image list
const content = fs.readFileSync(PRODUCTS_FILE, 'utf8');
const prodMatch = content.match(/const PRODUCTS = (\[[\s\S]*\]);/);
const products = JSON.parse(prodMatch[1]);

// Get unique image paths
const imagePaths = [...new Set(products.map(p => p.image).filter(Boolean))];
console.log(`Total images to process: ${imagePaths.length}`);

// Create output directory structure
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}
ensureDir(CLEAN_DIR);

async function analyzeAndClean(imgRelPath) {
  const srcPath = path.join(__dirname, imgRelPath);

  // Skip external URLs and non-local paths
  if (imgRelPath.startsWith('http') || !imgRelPath.startsWith('images/')) return { path: imgRelPath, status: 'skipped' };
  if (!fs.existsSync(srcPath)) return { path: imgRelPath, status: 'missing' };

  // Output to images_clean with same subfolder structure
  const cleanRelPath = imgRelPath.replace('images/', 'images_clean/');
  const destPath = path.join(__dirname, cleanRelPath);
  ensureDir(path.dirname(destPath));

  try {
    const meta = await sharp(srcPath).metadata();
    const { width, height, format } = meta;

    if (!width || !height) return { path: imgRelPath, status: 'invalid' };

    // Detect image type based on aspect ratio and size
    const ratio = width / height;

    // Strategy based on common wholesale catalog layouts:
    // Type A: Wide landscape (ratio > 1.8) - rhee catalog style
    //   Product photo is usually in the LEFT portion, text/barcode on RIGHT
    //   Crop: take left 40-50% of image
    //
    // Type B: Tall portrait (ratio < 0.6) - OCM style
    //   Product photo on top, text/barcode below
    //   Crop: take top 50-60%
    //
    // Type C: Nearly square or moderate (0.6-1.8)
    //   Usually product photo with some border text
    //   Crop: center 80% removing borders
    //
    // Type D: Very small images (< 100px either dimension)
    //   Skip - too small to crop

    if (width < 80 || height < 80) {
      // Too small - just copy
      await sharp(srcPath).toFile(destPath);
      return { path: imgRelPath, status: 'too_small', w: width, h: height };
    }

    let cropBox;

    if (ratio > 2.0) {
      // Very wide - wholesale catalog (rhee style)
      // Product is usually in left 35-45%, right side has text/barcode
      cropBox = {
        left: Math.round(width * 0.02),
        top: Math.round(height * 0.15),
        width: Math.round(width * 0.38),
        height: Math.round(height * 0.75)
      };
    } else if (ratio > 1.5) {
      // Moderately wide - product on left, info on right
      cropBox = {
        left: Math.round(width * 0.02),
        top: Math.round(height * 0.1),
        width: Math.round(width * 0.45),
        height: Math.round(height * 0.8)
      };
    } else if (ratio < 0.5) {
      // Very tall - product on top, text below
      cropBox = {
        left: Math.round(width * 0.05),
        top: Math.round(height * 0.02),
        width: Math.round(width * 0.9),
        height: Math.round(height * 0.5)
      };
    } else if (ratio < 0.7) {
      // Tall - product on top, some text below
      cropBox = {
        left: Math.round(width * 0.05),
        top: Math.round(height * 0.02),
        width: Math.round(width * 0.9),
        height: Math.round(height * 0.65)
      };
    } else {
      // Square-ish - trim borders (remove top/bottom text strips)
      // Remove top 8% and bottom 15% (barcode usually at bottom)
      cropBox = {
        left: Math.round(width * 0.05),
        top: Math.round(height * 0.08),
        width: Math.round(width * 0.9),
        height: Math.round(height * 0.77)
      };
    }

    // Ensure crop dimensions are valid
    cropBox.width = Math.max(10, Math.min(cropBox.width, width - cropBox.left));
    cropBox.height = Math.max(10, Math.min(cropBox.height, height - cropBox.top));

    // Process: crop, resize to 400x400 square with white background, save as JPEG
    await sharp(srcPath)
      .extract(cropBox)
      .resize(400, 400, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .jpeg({ quality: 85 })
      .toFile(destPath.replace(/\.\w+$/, '.jpg'));

    return { path: imgRelPath, status: 'cleaned', ratio: ratio.toFixed(2), w: width, h: height };

  } catch (err) {
    // If processing fails, just copy original
    try {
      await sharp(srcPath)
        .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .jpeg({ quality: 85 })
        .toFile(destPath.replace(/\.\w+$/, '.jpg'));
      return { path: imgRelPath, status: 'resized_only', error: err.message };
    } catch (e2) {
      return { path: imgRelPath, status: 'error', error: e2.message };
    }
  }
}

async function main() {
  console.log(`\nProcessing ${imagePaths.length} images...\n`);

  const stats = { cleaned: 0, resized_only: 0, missing: 0, error: 0, too_small: 0 };
  const errors = [];

  // Process in batches of 20
  const batchSize = 20;
  for (let i = 0; i < imagePaths.length; i += batchSize) {
    const batch = imagePaths.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(analyzeAndClean));

    results.forEach(r => {
      stats[r.status] = (stats[r.status] || 0) + 1;
      if (r.status === 'error') errors.push(r);
    });

    // Progress
    const done = Math.min(i + batchSize, imagePaths.length);
    process.stdout.write(`\r  Processed: ${done}/${imagePaths.length} (${Math.round(done/imagePaths.length*100)}%)`);
  }

  console.log(`\n\n✅ Image cleaning complete!`);
  console.log(`${'─'.repeat(40)}`);
  console.log(`  Cleaned (cropped):  ${stats.cleaned || 0}`);
  console.log(`  Resized only:       ${stats.resized_only || 0}`);
  console.log(`  Too small:          ${stats.too_small || 0}`);
  console.log(`  Missing:            ${stats.missing || 0}`);
  console.log(`  Errors:             ${stats.error || 0}`);

  if (errors.length > 0) {
    console.log(`\nErrors:`);
    errors.slice(0, 10).forEach(e => console.log(`  ${e.path}: ${e.error}`));
  }

  // Now update products.js to point to cleaned images
  console.log(`\nUpdating products.js to use cleaned images...`);

  const updatedProducts = products.map(p => {
    if (!p.image) return p;
    const cleanPath = p.image.replace('images/', 'images_clean/').replace(/\.\w+$/, '.jpg');
    const cleanFullPath = path.join(__dirname, cleanPath);
    if (fs.existsSync(cleanFullPath)) {
      return { ...p, image: cleanPath };
    }
    return p;
  });

  const catMatch = content.match(/const CATEGORIES = (\{[\s\S]*?\});/);
  const cats = catMatch[1];

  const newContent = content.replace(
    /const PRODUCTS = \[[\s\S]*\];/,
    'const PRODUCTS = ' + JSON.stringify(updatedProducts, null, 2) + ';'
  );

  fs.writeFileSync(PRODUCTS_FILE, newContent, 'utf8');
  console.log(`✅ products.js updated with clean image paths`);
}

main().catch(console.error);
