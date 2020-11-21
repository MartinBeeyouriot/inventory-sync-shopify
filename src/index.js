/* eslint-disable camelcase */
const Shopify = require('shopify-api-node');
const csv = require('csv-parser');
const fs = require('fs');
const ignore = require('./ignore.js');
const config = require('./config.js');

const shopify = new Shopify(config.shop);

shopify.on('callLimits', (limits) => console.log(limits));

let locId_1;
let locId_2;
// our file mapping
const rows = [];
// our map from sku to variant / inventory id
const mapSkuToIvenId = {};
const mapSkuToIvenIdDone = new Map();
// our locationid / variant - inventory id / level
const mapLevels = {};
let totalConnected = 0;
let totalUpdated = 0;

const updateLevels = async (sku, inventoryLevel, locationId) => {
  let adjustement = 0;

  if (!mapLevels[locationId]) {
    console.log(`COULDN'T FOUND LOCATION !`);
    return;
  }
  if (!mapLevels[locationId][mapSkuToIvenId[sku]]) {
    console.log(`Will need to link those stock level: ${sku}`);
    await shopify.inventoryLevel.connect({
      inventory_item_id: mapSkuToIvenId[sku],
      location_id: locationId,
    });
    adjustement = inventoryLevel;
    totalConnected += 1;
  }

  const level = mapLevels[locationId][mapSkuToIvenId[sku]];
  if (level && level.available !== inventoryLevel) {
    adjustement = inventoryLevel - level.available;
  }
  if (adjustement !== 0) {
    console.log(
      `updating quantities for: ${sku}, old quantity: ${
        level ? level.available : 0
      }, new quantity: ${inventoryLevel}, adjustement: ${adjustement}`
    );
    await shopify.inventoryLevel.adjust({
      inventory_item_id: mapSkuToIvenId[sku],
      location_id: locationId,
      available_adjustment: adjustement,
    });
    totalUpdated += 1;
  }
};

fs.createReadStream('output.txt')
  .pipe(csv())
  .on('data', (row) => {
    rows.push(row);
  })
  .on('end', () => {
    console.log('CSV file successfully processed');
  });

(async () => {
  let params = { limit: 50 };
  let total = 0;

  const locations = await shopify.location.list(params);
  locations.forEach((location) => {
    if (location.name.toLowerCase().includes('loc_1')) {
      locId_1 = location.id;
    }
    if (location.name.toLowerCase().includes('loc_2')) {
      locId_2 = location.id;
    }
  });
  console.log(`Found locations ... ${locations.length}`);
  console.log(`Loc #1: ${locId_1}, loc #2: ${locId_2}`);

  // RETRIEVING STOCK LEVELS
  console.log(`Retrieving stock levels ...`);
  // Get levels for this specific locations
  let levelsParams = {
    // inventory_item_ids: 23701265481776,23701265481776,23701265481776
    location_ids: `${locId_1}, ${locId_2}`,
  };
  do {
    const levels = await shopify.inventoryLevel.list(levelsParams);
    levels.forEach((level) => {
      if (!mapLevels[level.location_id]) {
        mapLevels[level.location_id] = {};
      }
      mapLevels[level.location_id][level.inventory_item_id] = level;
    });
    total += levels.length;
    levelsParams = levels.nextPageParameters;
  } while (levelsParams !== undefined);
  console.log(`Total stock levels: ${total}`);

  // RETRIEVING PRODUCTS
  console.log(`Retrieving products ...`);
  total = 0;
  do {
    const products = await shopify.product.list(params);

    for (const p of products) {
      for (const variant of p.variants) {
        mapSkuToIvenId[variant.sku.replace(' ', '')] =
          variant.inventory_item_id;
        mapSkuToIvenIdDone.set(variant.sku.replace(' ', ''), false);
      }
    }

    params = products.nextPageParameters;
    total += products.length;
  } while (params !== undefined);

  console.log(`total products: ${total}`);

  // UPDATING STOCK LEVELS
  for (const row of rows) {
    if (!mapSkuToIvenId[row.sku]) {
      if (!ignore.ignoreList.includes(row.sku)) {
        console.log(
          `COULDN'T FOUND SKU: ${row.sku} (maybe add it to ignore list)`
        );
      }
    } else {
      // first location update
      await updateLevels(row.sku, parseInt(row.bali), locId_1);
      // second location update
      await updateLevels(row.sku, parseInt(row.nyc), locId_2);
      mapSkuToIvenIdDone.set(row.sku, true);
    }
  }

  for (const [key, value] of mapSkuToIvenIdDone)
    if (key && !value && !ignore.ignoreList.includes(key))
      console.log(`Didn't found sku in text file: ${key}`);

  console.log(
    `Finished .... connected: ${totalConnected} updated: ${totalUpdated}`
  );
})().catch(console.error);
