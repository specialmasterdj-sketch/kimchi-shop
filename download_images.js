const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUTPUT_DIR = path.join(__dirname, 'images', 'official');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const downloads = [
  // BINGGRAE products
  { id: '11001K', brand: 'BINGGRAE', name: 'Banana Milk', url: 'https://hungry-ninja.ca/cdn/shop/products/Binggrae-Banana-Flavored-Milk-Drink-6x200ml.jpg?v=1677892769' },
  { id: '11025K', brand: 'BINGGRAE', name: 'Strawberry Milk', url: 'https://hungry-ninja.ca/cdn/shop/products/Binggrae-Strawberry-Flavored-Milk-Drink-6x200ml.jpg?v=1677892700' },
  { id: '10999K', brand: 'BINGGRAE', name: 'Coffee Milk', url: 'https://hungry-ninja.ca/cdn/shop/products/BinggraeCoffeeMilk.jpg?v=1677892813' },
  { id: '21206K', brand: 'BINGGRAE', name: 'Melona Coconut', url: 'https://hungry-ninja.ca/cdn/shop/products/BinggraeMelonaCoconut.jpg?v=1680722206' },
  { id: '11001K_taro', brand: 'BINGGRAE', name: 'Taro Milk', url: 'https://hungry-ninja.ca/cdn/shop/files/BinggraeTaro.jpg?v=1689819947' },
  { id: '11003K', brand: 'BINGGRAE', name: 'Milk Assorted', url: 'https://hmartdelivery.com/cdn/shop/products/binggrae-melon-milk-flavored-milk-drink-6-cartons-x-200ml-105241.jpg?v=1695654975' },
  { id: 'melon_milk', brand: 'BINGGRAE', name: 'Melon Milk', url: 'https://d2lnr5mha7bycj.cloudfront.net/product-image/file/large_5a1ce143-17a4-4ac4-9a07-07ceb4f685d1.jpg' },
  { id: 'together', brand: 'BINGGRAE', name: 'Together Ice Cream', url: 'https://img06.weeecdn.com/product/image/542/626/171EB787D195D8B3.png' },

  // BING products (Binggrae from Choripdong)
  { id: 'LB1002', brand: 'BING', name: 'Banana Drink', url: 'https://hungry-ninja.ca/cdn/shop/products/Binggrae-Banana-Flavored-Milk-Drink-6x200ml.jpg?v=1677892769' },
  { id: 'LB1004', brand: 'BING', name: 'Strawberry Drink', url: 'https://hungry-ninja.ca/cdn/shop/products/Binggrae-Strawberry-Flavored-Milk-Drink-6x200ml.jpg?v=1677892700' },
  { id: 'LB1009', brand: 'BING', name: 'Coffee Milk Drink', url: 'https://hmartdelivery.com/cdn/shop/products/binggrae-coffee-flavored-milk-6-x-200ml-459382.jpg?v=1695654974' },
  { id: 'IB1014', brand: 'BING', name: 'Melona Strawberry', url: 'https://chipguanheng.com/wp-content/uploads/Melona-Strawberry-2.jpg' },
  { id: 'IB1019', brand: 'BING', name: 'Melona Ube', url: 'https://hungry-ninja.ca/cdn/shop/products/BinggraeMelonaPurpleYam.jpg?v=1680721708' },
  { id: 'IB1030B', brand: 'BING', name: 'Samanco Strawberry', url: 'https://hungry-ninja.ca/cdn/shop/products/BinggraeSamancoStrawberry-Whole.jpg?v=1680975230' },
  { id: 'IB1013', brand: 'BING', name: 'Melona Melon', url: 'https://hungry-ninja.ca/cdn/shop/products/BinggraeMelonaMelon.jpg?v=1680723228' },
  { id: 'IB1016', brand: 'BING', name: 'Melona Mango', url: 'https://hungry-ninja.ca/cdn/shop/products/BinggraeMelonaMango.jpg?v=1680722835' },
  { id: 'IB1018', brand: 'BING', name: 'Melona Coconut', url: 'https://hungry-ninja.ca/cdn/shop/products/BinggraeMelonaCoconut.jpg?v=1680722206' },
  { id: 'IB1017', brand: 'BING', name: 'Melona Pistachio', url: 'https://chipguanheng.com/wp-content/uploads/Binggrae-Melona-Pistachio.png' },
  { id: 'IB1015', brand: 'BING', name: 'Melona Banana', url: 'https://hungry-ninja.ca/cdn/shop/products/BinggraeMelonaBanana.jpg?v=1680722649' },

  // SEOUL products
  { id: 'LS2021', brand: 'SEOUL', name: 'Strawberry Drink', url: 'https://hmartdelivery.com/cdn/shop/products/seoul-milk-strawberry-flavored-milk-drink-6-packs-x-190ml-517825.jpg?v=1695744299' },
  { id: 'LS2011', brand: 'SEOUL', name: 'Banana Drink', url: 'https://d2lnr5mha7bycj.cloudfront.net/product-image/file/large_2754f00d-8916-49ce-a2c4-c0d41156ce7b.jpg' },
  { id: 'LS2026', brand: 'Seoul', name: 'Chocolate Milk', url: 'https://www.koryomart.co.kr/cdn/shop/files/Nonghyup_SeoulMilk_Chocolate_200ml-2.png?v=1737015209' },
  { id: 'LS2027', brand: 'Seoul', name: 'Mango Milk', url: 'https://www.koryomart.co.kr/cdn/shop/files/Nonghyup_SeoulMilk_Strawberry_200ml-2.png?v=1737015209' },
  { id: 'LS2028', brand: 'Seoul', name: 'Melon Milk', url: 'https://1004gourmet.com/wp-content/uploads/2023/11/8801753102933.jpg' },

  // WOONGJIN products
  { id: '09875K', brand: 'WOONGJIN', name: 'Green Plum 500ml', url: 'https://charm-market.com/cdn/shop/files/LW0012B_71a2d104-8568-4477-b22c-940b9702da34.jpg' },
  { id: '09880K', brand: 'WOONGJIN', name: 'Green Plum 1.5L', url: 'https://www.hanyangmart.com/cdn/shop/products/IMG_4101.jpg?v=1681455241' },
  { id: '09902K', brand: 'WOONGJIN', name: 'Sky Barley 500ml', url: 'https://www.hanyangmart.com/cdn/shop/products/IMG_3364.jpg?v=1679413417' },
  { id: '10660K', brand: 'WOONGJIN', name: 'Teenieping Milk', url: 'https://www.jptradingus.com/wp-content/uploads/DRWJM.1.png' },
  { id: '10662K', brand: 'WOONGJIN', name: 'Teenieping Apple', url: 'https://www.jptradingus.com/wp-content/uploads/DRWJM.2.png' },
  { id: '10663K', brand: 'WOONGJIN', name: 'Teenieping Peach', url: 'https://www.jptradingus.com/wp-content/uploads/DRWJM.1.png' },
  { id: 'morning_rice', brand: 'WOONGJIN', name: 'Morning Rice 500ml', url: 'https://charm-market.com/cdn/shop/files/LW0003_88f643c2-a8a6-497c-a1e1-231cd2891b46.jpg?v=1751596010' },

  // RHEECHUN products (rice)
  { id: '00030D', brand: 'rheechun', name: 'Fancy Variety Rice 15lb', url: 'https://m.media-amazon.com/images/I/711+JzR4TuL._SL1500_.jpg' },
  { id: '00033D', brand: 'rheechun', name: 'Fancy Variety Rice 40lb', url: 'https://m.media-amazon.com/images/I/711+JzR4TuL._SL1500_.jpg' },
  { id: '00035D', brand: 'rheechun', name: 'Fancy Variety Rice 5lb', url: 'https://m.media-amazon.com/images/I/81OwzW3uuvL._SL1500_.jpg' },
  { id: '00025D', brand: 'rheechun', name: 'Premium Sweet Rice 15lb', url: 'https://img06.weeecdn.com/product/image/758/239/3C344FAAF901CEB9.png' },
  { id: '00026D', brand: 'rheechun', name: 'Premium Brown Sweet Rice 15lb', url: 'https://img06.weeecdn.com/product/image/204/545/217803827E151443.png' },
  { id: '00016D', brand: 'rheechun', name: 'Sweet Rice 5lb', url: 'https://img06.weeecdn.com/product/image/758/239/3C344FAAF901CEB9.png' },
  { id: '00024D', brand: 'rheechun', name: 'Premium Grade Brown Rice', url: 'https://m.media-amazon.com/images/I/81YuwMdfMJL._SL1500_.jpg' },
  { id: '00036D', brand: 'rheechun', name: 'Premium Grade Sushi Rice', url: 'https://m.media-amazon.com/images/I/81YuwMdfMJL._SL1500_.jpg' },
  { id: '00012D', brand: 'rheechun', name: 'Extra Fancy Brown Rice 15lb', url: 'https://m.media-amazon.com/images/I/61sgGRjLrgL._SL1500_.jpg' },

  // HANKUKMI products (rice)
  { id: '00004D', brand: 'hankukmi', name: 'Extra Fancy Rice 5lb', url: 'https://m.media-amazon.com/images/I/81GBSjRn15L._SL1500_.jpg' },
  { id: '00003D', brand: 'hankukmi', name: 'Extra Fancy Rice 10lb', url: 'https://m.media-amazon.com/images/I/81GBSjRn15L._SL1500_.jpg' },
  { id: '00014D', brand: 'hankukmi', name: 'Extra Fancy Sweet Rice 5lb', url: 'https://m.media-amazon.com/images/I/81l-qDCJljL._SL1500_.jpg' },
  { id: '00093D', brand: 'hankukmi', name: 'Wild Sweet Rice 5lb', url: 'https://m.media-amazon.com/images/I/81l-qDCJljL._SL1500_.jpg' },
  { id: '00091D', brand: 'hankukmi', name: 'Wild Sweet Rice 50lb', url: 'https://m.media-amazon.com/images/I/81l-qDCJljL._SL1500_.jpg' },

  // THREEELEPHANTS products (rice)
  { id: '01033D', brand: 'threeelephants', name: 'Thai Jasmine Rice 5lb', url: 'https://m.media-amazon.com/images/I/91QQB5iIf2L._SL1500_.jpg' },
  { id: '01030D', brand: 'threeelephants', name: 'Thai Jasmine Rice 50lb', url: 'https://m.media-amazon.com/images/I/51l0-wEK10L._SL1500_.jpg' },
  { id: '01048D', brand: 'threeelephants', name: 'Brown Jasmine Rice 5lb', url: 'https://m.media-amazon.com/images/I/51XZCwqnjOL._SL1500_.jpg' },
  { id: '01047D', brand: 'threeelephants', name: 'Brown Jasmine Rice 15lb', url: 'https://m.media-amazon.com/images/I/51XZCwqnjOL._SL1500_.jpg' },
  { id: '01078D', brand: 'threeelephants', name: 'Broken Jasmine Rice 20lb', url: 'https://m.media-amazon.com/images/I/91QQB5iIf2L._SL1500_.jpg' },

  // CRD / Choripdong products (rice & grains)
  { id: 'CC1003', brand: 'crd', name: 'Sweet Rice 2lb', url: 'https://hmartdelivery.com/cdn/shop/products/choripdong-sweet-rice-2lb-768650.jpg?v=1695655350' },
  { id: 'CC1501', brand: 'crd', name: '7Mixed Grain 5lb', url: 'https://hmartdelivery.com/cdn/shop/products/choripdong-mixed-7-grain-5lb-794755.jpg?v=1763508754' },
  { id: 'CH0100', brand: 'crd', name: 'Chick Peas 2lb', url: 'https://hmartdelivery.com/cdn/shop/files/Photoroom_20251029_20917_p._m..jpg?v=1763828486' },
  { id: 'CH1001', brand: 'crd', name: 'Mixed Beans 4lb', url: 'https://hmartdelivery.com/cdn/shop/files/Photoroom_20251029_20917_p._m..jpg?v=1763828486' },
  { id: 'CS1001', brand: 'crd', name: 'Pearl Barley 2lb', url: 'https://hmartdelivery.com/cdn/shop/products/choripdong-mixed-7-grain-5lb-794755.jpg?v=1763508754' },
  { id: 'CW1002', brand: 'crd', name: 'Green Pea 2lb', url: 'https://hmartdelivery.com/cdn/shop/files/Photoroom_20251029_20917_p._m..jpg?v=1763828486' },
  { id: 'CY1015', brand: 'crd', name: 'Wild Sweet Rice 2lb', url: 'https://hmartdelivery.com/cdn/shop/products/choripdong-sweet-rice-2lb-768650.jpg?v=1695655350' },

  // GOMPYO products (flour/baking)
  { id: '02057K', brand: 'gompyo', name: 'All Purpose Wheat Flour 5.5lb', url: 'https://m.media-amazon.com/images/I/61Sk2bhi64L._SL1500_.jpg' },
  { id: '02054K', brand: 'gompyo', name: 'Strong Wheat Flour 5.5lb', url: 'https://m.media-amazon.com/images/I/81OAfrzNDuL._SL1500_.jpg' },
  { id: '02155K', brand: 'gompyo', name: 'Tempura Batter Mix 2.2lb', url: 'https://hmartdelivery.com/cdn/shop/products/8801176102053.jpg?v=1680719677' },
  { id: '02059K', brand: 'gompyo', name: 'All Purpose Wheat Flour Golden 5.5lb', url: 'https://m.media-amazon.com/images/I/61Sk2bhi64L._SL1500_.jpg' },

  // 8 ELEPHANTS products (rice)
  { id: 'CS1221', brand: '8elephants', name: 'Jasmine Rice 25lb', url: 'https://hmartdelivery.com/cdn/shop/files/Photoroom_20251029_24433_p._m..jpg?v=1761764358' },
  { id: 'CS1226', brand: '8elephants', name: 'Jasmine Rice 5lb', url: 'https://hmartdelivery.com/cdn/shop/files/Photoroom_20251029_24433_p._m..jpg?v=1761764358' },
  { id: 'CS1228', brand: '8elephants', name: 'Jasmine Rice 2lb', url: 'https://hmartdelivery.com/cdn/shop/files/Photoroom_20251029_24433_p._m..jpg?v=1761764358' },
];

function downloadFile(url, destPath, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*,*/*',
        'Referer': new URL(url).origin
      },
      timeout: 30000
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        let redirectUrl = response.headers.location;
        if (redirectUrl.startsWith('/')) {
          const parsed = new URL(url);
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        downloadFile(redirectUrl, destPath, redirectCount + 1).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(destPath, buffer);
        resolve(buffer.length);
      });
      response.on('error', reject);
    });
    request.on('error', reject);
    request.on('timeout', () => { request.destroy(); reject(new Error('Timeout')); });
  });
}

async function resizeImage(inputPath, outputPath) {
  const resized = await sharp(inputPath)
    .resize(500, 500, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 90 })
    .toFile(outputPath);
  return resized;
}

async function main() {
  const results = { success: [], failed: [] };

  for (const item of downloads) {
    const filename = `${item.brand}_${item.id}`;
    const tempPath = path.join(OUTPUT_DIR, `temp_${filename}.tmp`);
    const finalPath = path.join(OUTPUT_DIR, `${filename}.jpg`);

    process.stdout.write(`[DL] ${item.brand} ${item.name} (${item.id})... `);

    try {
      const size = await downloadFile(item.url, tempPath);
      if (size < 1000) throw new Error('File too small');

      await resizeImage(tempPath, finalPath);
      const finalStats = fs.statSync(finalPath);
      console.log(`OK (${(size/1024).toFixed(0)}KB -> ${(finalStats.size/1024).toFixed(0)}KB)`);
      results.success.push({ id: item.id, brand: item.brand, name: item.name });
    } catch (err) {
      console.log(`FAIL: ${err.message}`);
      results.failed.push({ id: item.id, brand: item.brand, name: item.name, error: err.message });
    } finally {
      try { fs.unlinkSync(tempPath); } catch(e) {}
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Success: ${results.success.length}/${downloads.length}`);
  console.log(`Failed: ${results.failed.length}/${downloads.length}`);
  if (results.failed.length > 0) {
    console.log('\nFailed items:');
    results.failed.forEach(f => console.log(`  ${f.brand} ${f.name} (${f.id}): ${f.error}`));
  }
}

main().catch(console.error);
