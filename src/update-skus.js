/* eslint-disable camelcase */
const config = require('./config.js');
const Shopify = require('shopify-api-node');

const shopify = new Shopify(config.shop);

// This will just output the skus that will be updated.
// To updated the sku live change the value to true.
const updateSkus = false;
const searchValue = 'S20';
const replacementValue = '';

// Log the limits
shopify.on('callLimits', limits => console.log(limits));

// Main function
(async () => {
  let params = { limit: 50 };

  // RETRIEVING PRODUCTS
  console.log(`Retrieving products ...`);
  do {
    const products = await shopify.product.list(params);

    for (const p of products) {
      for (const variant of p.variants) {
        if (variant.sku.includes(searchValue)) {
          const oldSku = variant.sku;
          variant.sku = variant.sku.replace(searchValue, replacementValue);
          console.log(`Updating this sku: ${oldSku} to: ${variant.sku} `);
          if (simulateTest ) shopify.product.update(p.id, p);
        }
      }
    }

    params = products.nextPageParameters;
  } while (params !== undefined);

  console.log(`Finished .... `);
})().catch(console.error);
