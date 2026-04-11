const https = require('https');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'images', 'official');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}}, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}}, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function searchWeee(query) {
  const url = 'https://www.sayweee.com/en/search?keyword=' + encodeURIComponent(query);
  const html = await fetchText(url);
  const matches = html.match(/\/en\/product\/[^"'\s]+\/\d+/g);
  return matches ? [...new Set(matches)] : [];
}

async function getImageFromPage(pageUrl) {
  const html = await fetchText(pageUrl);
  const matches = html.match(/https:\/\/img0[0-9]\.weeecdn\.(com|net)\/(item|product)\/image\/[^"'\s\\!]+/g);
  if (matches) {
    const unique = [...new Set(matches.map(u => u.replace(/\\$/, '')))];
    return unique[0];
  }
  return null;
}

async function downloadFile(url, filepath) {
  const data = await fetch(url);
  fs.writeFileSync(filepath, data);
  return data.length;
}

const products = [
  // Remaining DONGWON
  {id: '03803K', brand: 'dongwon', query: 'dongwon tuna extract sauce'},
  {id: '04259K', brand: 'dongwon', query: 'dongwon pumpkin porridge yangban'},
  {id: '04269K', brand: 'dongwon', query: 'dongwon pine nut porridge yangban'},
  {id: '06124K', brand: 'dongwon', query: 'dongwon yangban canned kimchi stir fried'},
  {id: '08624K', brand: 'dongwon', query: 'dongwon beef bone soup 500g'},
  {id: '07307K', brand: 'dongwon', query: 'dongwon seasoned laver perilla oil 12'},
  {id: '07636K', brand: 'dongwon', query: 'dongwon sesame oil tuna can'},
  {id: '07598K', brand: 'dongwon', query: 'dongwon tuna can light standard 4'},
  {id: '07445D', brand: 'dongwon', query: 'dongwon luncheon meat'},
  {id: '07597K', brand: 'dongwon', query: 'dongwon tuna can chunk DHA'},
  {id: '07599K', brand: 'dongwon', query: 'dongwon tuna can large'},
  {id: '07623K', brand: 'dongwon', query: 'dongwon kimchi tuna can'},
  {id: '07629K', brand: 'dongwon', query: 'dongwon tuna can small'},
  {id: '07630K', brand: 'dongwon', query: 'dongwon DHA tuna can'},
  {id: '07632K', brand: 'dongwon', query: 'dongwon hot pepper tuna can'},
  {id: '07633K', brand: 'dongwon', query: 'dongwon vegetables tuna can'},
  {id: '07635K', brand: 'dongwon', query: 'dongwon double hot pepper tuna 4 can'},
  {id: '07638K', brand: 'dongwon', query: 'dongwon fiery hot tuna can'},
  // Remaining PALDO
  {id: '09872K', brand: 'paldo', query: 'paldo pororo apple juice drink'},
  {id: '10935K', brand: 'paldo', query: 'paldo bibimchips snack'},
  // Key ASSI products
  {id: '29097K', brand: 'assi', query: 'assi crushed ramen mozzarella corn dogs'},
  {id: '08090K', brand: 'assi', query: 'assi katsuo udon noodle bowl'},
  {id: '08094K', brand: 'assi', query: 'assi jjajang noodle bowl instant'},
  {id: '10017K', brand: 'assi', query: 'assi roasted barley tea'},
  {id: '10266C', brand: 'assi', query: 'assi honey ginger tea'},
  {id: '10291K', brand: 'assi', query: 'assi ginger tea liquid'},
  {id: '29903K', brand: 'assi', query: 'assi yogurt flavored drink korean'},
  {id: '29904K', brand: 'assi', query: 'assi strawberry yogurt drink korean'},
  {id: '05217K', brand: 'assi', query: 'assi korean bbq marinade sauce beef'},
  {id: '05211K', brand: 'assi', query: 'assi korean bbq sauce ribs galbi'},
  {id: '03432K', brand: 'assi', query: 'assi hot pepper paste gochujang jar'},
  {id: '03470K', brand: 'assi', query: 'assi black bean sauce jjajang'},
  {id: '03524K', brand: 'assi', query: 'assi k-bbq dipping sauce'},
  {id: '05222K', brand: 'assi', query: 'assi korean bbq sauce pork bulgogi'},
  {id: '00097D', brand: 'assi', query: 'assi black rice 30oz'},
  {id: '01139D', brand: 'assi', query: 'assi roasted sesame seeds 30oz'},
  {id: '05038D', brand: 'assi', query: 'assi red pepper powder kimchi gochugaru'},
  {id: '07091K', brand: 'assi', query: 'assi dried seaweed miyeok large'},
  {id: '07102K', brand: 'assi', query: 'assi dried seaweed wakame small'},
  {id: '07152K', brand: 'assi', query: 'assi roasted seasoned laver 8 pack'},
  {id: '07300K', brand: 'assi', query: 'assi roasted seasoned laver 16 20 pack'},
  {id: '07339J', brand: 'assi', query: 'assi sushi nori green laver'},
  {id: '07341J', brand: 'assi', query: 'assi sushi nori gold 100 sheets'},
  {id: '19981D', brand: 'assi', query: 'assi tofu firm'},
  {id: '19982D', brand: 'assi', query: 'assi tofu soft'},
  {id: '19983D', brand: 'assi', query: 'assi tofu silken'},
  {id: '04551K', brand: 'assi', query: 'assi beef bone flavored soup'},
  {id: '04553K', brand: 'assi', query: 'assi seaweed soup abalone'},
  {id: '19902K', brand: 'assi', query: 'assi soft tofu soup sundubu'},
  {id: '19903K', brand: 'assi', query: 'assi soybean paste soup doenjang'},
  {id: '20434K', brand: 'assi', query: 'assi combo fish cake odeng'},
  {id: '20571D', brand: 'assi', query: 'assi pork dumplings mandu'},
  {id: '29100K', brand: 'assi', query: 'assi mozzarella fish cake corn dogs'},
  {id: '02002D', brand: 'assi', query: 'assi rice flour 30oz'},
  {id: '02008D', brand: 'assi', query: 'assi sweet rice flour 30oz'},
  {id: '02032D', brand: 'assi', query: 'assi potato starch 30oz'},
  {id: '05149K', brand: 'assi', query: 'assi sesame oil bottle'},
  {id: '05381K', brand: 'assi', query: 'assi sea salt fine korean'},
  {id: '04300K', brand: 'assi', query: 'assi tablet broth dashida'},
  {id: '04304K', brand: 'assi', query: 'assi beef soup stock'},
  {id: '19560K', brand: 'assi', query: 'assi banchan sliced vegan kimchi'},
  {id: '08022K', brand: 'assi', query: 'assi mak guksoo noodles'},
  {id: '07441D', brand: 'assi', query: 'assi luncheon loaf meat'},
  {id: '19351K', brand: 'assi', query: 'assi sliced pickled radish danmuji'},
  {id: '05027D', brand: 'assi', query: 'assi red pepper powder kimchi 5lb'},
  {id: '04141K', brand: 'assi', query: 'assi beef broth naengmyeon'},
  {id: '04555K', brand: 'assi', query: 'assi soybean paste soup mushroom'},
  {id: '04556K', brand: 'assi', query: 'assi seaweed soup perilla'},
  {id: '19410K', brand: 'assi', query: 'assi seaweed jelly'},
  {id: '20485K', brand: 'assi', query: 'assi banchan seasoned perilla leaf'},
  {id: '29312K', brand: 'assi', query: 'assi seasoned file fish dried'},
  {id: '02164D', brand: 'assi', query: 'assi acorn starch'},
  {id: '05384K', brand: 'assi', query: 'assi sea salt coarse korean'},
  {id: '06194C', brand: 'assi', query: 'assi organic roasted chestnuts'},
  {id: '03471K', brand: 'assi', query: 'assi black bean sauce jjajang 2.2lb'},
  {id: '05037D', brand: 'assi', query: 'assi red pepper powder 3lb'},
  {id: '05039D', brand: 'assi', query: 'assi red pepper powder fine'},
  {id: '05076K', brand: 'assi', query: 'assi sesame oil large'},
  {id: '20486K', brand: 'assi', query: 'assi banchan seasoned green pepper'},
  {id: '20460K', brand: 'assi', query: 'assi rectangular fish cake'},
  {id: '19359K', brand: 'assi', query: 'assi pickled radish gimbap'},
  {id: '04301K', brand: 'assi', query: 'assi tablet broth spicy'},
  {id: '04307K', brand: 'assi', query: 'assi anchovy soup stock'},
  {id: '19341K', brand: 'assi', query: 'assi minced garlic'},
  {id: '05399K', brand: 'assi', query: 'assi sea salt fine 10lb'},
];

async function processProduct(product) {
  const filename = product.brand + '_' + product.id;
  const existingFiles = fs.readdirSync(outDir).filter(f => f.startsWith(filename));
  if (existingFiles.length > 0) {
    return {id: product.id, status: 'exists'};
  }

  try {
    const productUrls = await searchWeee(product.query);
    if (productUrls.length === 0) {
      return {id: product.id, brand: product.brand, status: 'no_search_results', query: product.query};
    }

    for (const relUrl of productUrls.slice(0, 3)) {
      const fullUrl = 'https://www.sayweee.com' + relUrl;
      const imgUrl = await getImageFromPage(fullUrl);
      if (imgUrl) {
        const ext = imgUrl.includes('.png') ? '.png' : imgUrl.includes('.jpeg') ? '.jpeg' : '.jpg';
        const outPath = path.join(outDir, filename + ext);
        const size = await downloadFile(imgUrl, outPath);
        return {id: product.id, status: 'downloaded', size};
      }
    }
    return {id: product.id, brand: product.brand, status: 'no_image_found', query: product.query};
  } catch(e) {
    return {id: product.id, brand: product.brand, status: 'error', msg: e.message};
  }
}

async function main() {
  const results = {downloaded: 0, exists: 0, failed: 0};
  const failures = [];
  for (let i = 0; i < products.length; i += 3) {
    const batch = products.slice(i, i + 3);
    const batchResults = await Promise.all(batch.map(p => processProduct(p)));
    for (const r of batchResults) {
      if (r.status === 'downloaded') {
        results.downloaded++;
        console.log('OK: ' + r.id + ' (' + r.size + ' bytes)');
      } else if (r.status === 'exists') {
        results.exists++;
        console.log('SKIP: ' + r.id);
      } else {
        results.failed++;
        failures.push(r);
        console.log('FAIL: ' + r.id + ' - ' + r.status + ' ' + (r.msg || r.query || ''));
      }
    }
  }
  console.log('\nDone: ' + results.downloaded + ' downloaded, ' + results.exists + ' existing, ' + results.failed + ' failed');
  if (failures.length > 0) {
    console.log('\nFailed products:');
    failures.forEach(f => console.log('  ' + f.brand + '_' + f.id + ': ' + f.status + ' (' + (f.query || f.msg) + ')'));
  }
}

main().catch(console.error);
