/*
 * CartOptima - content.js
 * Glue only: adapter -> extraction -> catalog lookup -> overlay.
 */
(async function () {
  const C = self.CartOptima;
  const adapter = C.getAdapter(location.href);
  if (!adapter) return; // not a supported page

  let records;
  try {
    const resp = await fetch(chrome.runtime.getURL("data/catalog.json"));
    records = await resp.json();
  } catch (e) {
    console.error("CartOptima: could not load catalog", e);
    return;
  }

  const cleaned = C.cleanCatalog(records);
  const index = C.buildIndex(cleaned.clean);

  function run() {
    const raw = adapter.extract(document);
    const extraction = C.buildExtraction(location.href, raw);
    console.log("CartOptima extraction:", extraction);
    const result = C.lookup(extraction, index);
    console.log("CartOptima result:", result);
    C.renderPanel(result, extraction);
  }

  run();
})();
