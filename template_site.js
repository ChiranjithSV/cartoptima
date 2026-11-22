/*
 * TEMPLATE for a REAL pharmacy page. This file is NOT loaded by default.
 *
 * BEFORE you use it:
 *   1. Read the website's terms of use. If automated reading is not allowed, do NOT add the site.
 *      Say so in the README (Supported Websites) and keep using the demo page.
 *   2. Never bypass logins, CAPTCHAs or access controls.
 *
 * HOW to enable it:
 *   1. Copy this file to e.g.  extension/content/sites/mypharmacy.js  and fill in the TODOs.
 *   2. In Chrome open a product page, press F12, click the "select element" arrow, click the
 *      product title, and note a stable selector (an id or a clear class). Repeat for price,
 *      pack size and (if shown) the ingredient. Test in the Console:
 *          document.querySelector("YOUR_SELECTOR").textContent
 *   3. In extension/manifest.json add the site to content_scripts.matches
 *      (for example "https://www.example-pharmacy.com/*") and to
 *      web_accessible_resources.matches, and add your new file to the "js" list
 *      BEFORE "content/sites/registry.js".
 *   4. Reload the extension at chrome://extensions and refresh the product page.
 *   5. Record every page you try in docs/extraction_log.csv, then run
 *      python analysis/extraction_rate.py
 */
(function (root) {
  root.CartOptima = root.CartOptima || {};
  root.CartOptima.adapters = root.CartOptima.adapters || [];
  root.CartOptima.adapters.push({
    name: "TODO pharmacy name",
    matches: function (url) {
      return /^https:\/\/(www\.)?TODO-pharmacy-domain\.com\/.*/.test(url); // TODO
    },
    extract: function (doc) {
      const text = (sel) => {
        const el = doc.querySelector(sel);
        return el ? el.textContent.trim() : null;
      };
      return {
        title: text("TODO-title-selector"),
        priceText: text("TODO-price-selector"),
        packText: text("TODO-pack-size-selector"),       // can be null; the title is used then
        ingredientText: text("TODO-ingredient-selector"), // can be null; never guessed
      };
    },
  });
})(typeof self !== "undefined" ? self : this);
