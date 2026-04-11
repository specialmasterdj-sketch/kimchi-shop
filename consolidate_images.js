const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'images', 'official');
const files = fs.readdirSync(dir).filter(f => /\.(jpg|png|jpeg|webp)$/i.test(f));

// Load priority products
const code = fs.readFileSync(path.join(__dirname, 'products.js'), 'utf8').replace(/^const /gm, 'var ');
const PRODUCTS = new Function(code + '; return PRODUCTS;')();
const brands = ['NONGSHIM','SAMYANG','CJ','LOTTE','ORION','DONGWON'];
const priority = PRODUCTS.filter(p => brands.includes(p.brand));

// For each product, find matching files
let consolidated = 0;
let alreadyOk = 0;
let missing = 0;
const missingProducts = [];

// Manual mapping for samyang bowl images
const samyangBowlMap = {
  '08480K': 'samyang_carbo_bowl', // CARBO BULDAK BIG BOWL
  '08158K': 'samyang_original_bowl', // BULDAK BIG BOWL
  '08478K': 'samyang_2x_bowl', // 2X SPICY CUP -> use 2x bowl
  '08485K': 'samyang_cheese_bowl', // CHEESE CUP -> use cheese bowl
};

priority.forEach(p => {
  const id = p.id;

  // Check if we already have a direct ID file (best case)
  const directFiles = files.filter(f => {
    const base = f.replace(/\.(jpg|png|jpeg|webp)$/i, '');
    return base === id;
  });

  if (directFiles.length > 0) {
    // Pick the largest file
    let best = directFiles.sort((a, b) => {
      return fs.statSync(path.join(dir, b)).size - fs.statSync(path.join(dir, a)).size;
    })[0];
    alreadyOk++;
    return;
  }

  // Look for prefixed files like nongshim_08225K.jpg, CJ_cj_1024453.jpg
  const prefixedFiles = files.filter(f => {
    return f.includes(id + '.') || f.includes(id + '_r.');
  });

  // Check samyang bowl mapping
  const bowlKey = samyangBowlMap[id];
  const bowlFiles = bowlKey ? files.filter(f => f.startsWith(bowlKey)) : [];

  const candidates = [...prefixedFiles, ...bowlFiles];

  if (candidates.length > 0) {
    // Pick the largest non-_r file, prefer png over jpg
    let best = candidates
      .filter(f => !f.includes('_r.'))
      .sort((a, b) => {
        const sizeA = fs.statSync(path.join(dir, a)).size;
        const sizeB = fs.statSync(path.join(dir, b)).size;
        return sizeB - sizeA;
      })[0] || candidates[0];

    const ext = path.extname(best);
    const dest = id + ext;

    if (!fs.existsSync(path.join(dir, dest))) {
      fs.copyFileSync(path.join(dir, best), path.join(dir, dest));
      console.log(`COPY ${best} -> ${dest} (${(fs.statSync(path.join(dir, best)).size/1024).toFixed(0)}KB)`);
      consolidated++;
    } else {
      alreadyOk++;
    }
    return;
  }

  missing++;
  missingProducts.push(`${id} | ${p.brand} | ${p.name}`);
});

console.log(`\nConsolidated: ${consolidated}, Already OK: ${alreadyOk}, Still missing: ${missing}`);
console.log(`\nStill missing (${missingProducts.length}):`);
missingProducts.forEach(m => console.log(m));
