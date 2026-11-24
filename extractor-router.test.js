const test = require('node:test');
const assert = require('node:assert/strict');
const { selectSiteExtractor } = require('../extension/content/extractor-router.js');
const syntheticSite = require('../extension/content/sites/cartoptima-synthetic-demo.js');

test('routes the supported local synthetic fixture to its site module', () => {
  const location = {
    protocol: 'file:',
    pathname: '/Users/demo/cartoptima/extension/fixtures/synthetic-product-success.html'
  };
  assert.equal(selectSiteExtractor(location, syntheticSite), syntheticSite);
});

test('keeps ordinary web pages on the generic safe fallback', () => {
  const location = { protocol: 'https:', pathname: '/products/synthetic-product-success.html' };
  assert.equal(selectSiteExtractor(location, syntheticSite), null);
});

test('keeps unrelated local files on the generic safe fallback', () => {
  const location = { protocol: 'file:', pathname: '/Users/demo/other-product.html' };
  assert.equal(selectSiteExtractor(location, syntheticSite), null);
});
