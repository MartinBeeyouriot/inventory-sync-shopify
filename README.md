# Inventory Shopify Sync

### About
This is a small utility to synchronize **[shopify][1]** inventory level per *location*.
*Only 2 locations are supported so far.*
Also small utility to update the shopify skus.

### Installation
```shell
  npm install
```

### Configuration

* Update your credential in src/config.js
  + you can create shopify api keys [here][shopify_api].
  + once you get the keys replace them into the file.
* Update your location ids in src/index.js

### Run
```shell
  node src/index.js
```
  Or `node src/update-skus.js`


---

![alternate text][inventory_img]

[1]: https://www.shopify.com
[shopify_api]: https://shopify.dev/tutorials/authenticate-a-private-app-with-shopify-admin
[inventory_img]: https://mk0wisemerchantlndef.kinstacdn.com/wp-content/uploads/2019/01/ezgif.com-optimize-5.gif "tooltip"