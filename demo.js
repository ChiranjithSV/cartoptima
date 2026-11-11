/*
 * Site adapter: local DEMO page (demo/product.html served on localhost).
 *
 * Each adapter only knows how to READ one site's page. It never matches or
 * calculates anything, so a layout change breaks only that adapter.
 *
 * To add a real pharmacy later:
 *  1. read its terms of use and use only permitted access
 *  2. copy this file, change `name`, `matches` and the selectors
 *  3. add its domain to manifest.json (content_scripts.matches)
 *  4. register it in registry.js and document it in README "Supported Websites"
 */
(function (root) {
  root.CartOptima = root.CartOptima || {};
  root.CartOptima.adapters = root.CartOptima.adapters || [];
  root.CartOptima.adapters.push({
    name: "CartOptima demo page",
    matches: function (url) {
      return /^http:\/\/(localhost|127\.0\.0\.1)/.test(url);
    },
    extract: function (doc) {
      const text = (sel) => {
        const el = doc.querySelector(sel);
        return el ? el.textContent.trim() : null;
      };
      return {
        title: text("#product-title"),
        priceText: text("#product-price"),
        packText: text("#pack-size"),
        ingredientText: text("#ingredient"),
      };
    },
  });
})(typeof self !== "undefined" ? self : this);
