/*
 * CartOptima tests - no libraries needed.
 * Run:  node tests/run_tests.js
 */
const assert = require("assert");
const N = require("../extension/core/normalize.js");
const P = require("../extension/core/pricing.js");
const M = require("../extension/core/matcher.js");
const { evaluate, loadCatalog } = require("./evaluate.js");

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("  ok   " + name); }
  catch (e) { failed++; console.log("  FAIL " + name + "\n       " + e.message); }
}

const { cleaned, index } = loadCatalog();
const byId = new Map(cleaned.clean.map((r) => [r.product_id, r]));
const lookupTitle = (title, price, pack) =>
  M.lookup(N.buildExtraction("http://localhost/test", { title, priceText: price, packText: pack }), index);

console.log("\nNormalization");
test("case, spaces, punctuation", () => assert.strictEqual(N.normalizeText("  FEBREXA-500  Mg!! "), "febrexa 500 mg"));
test("0.5 g -> 500 mg", () => assert.strictEqual(N.normalizeStrength("0.5 g"), "500 mg"));
test("500mg -> 500 mg", () => assert.strictEqual(N.normalizeStrength("500mg"), "500 mg"));
test("combination strength kept", () => assert.strictEqual(N.normalizeStrength("500 mg/125 mg"), "500 mg/125 mg"));
test("unreadable strength -> null (never guessed)", () => assert.strictEqual(N.normalizeStrength("strong"), null));
test("alias acetaminophen -> paracetamol", () => assert.strictEqual(N.canonicalIngredient("Acetaminophen"), "paracetamol"));
test("release words", () => {
  assert.strictEqual(N.normalizeRelease("Extended-Release"), "extended");
  assert.strictEqual(N.normalizeRelease("SR"), "extended");
  assert.strictEqual(N.normalizeRelease("immediate-release"), "immediate");
  assert.strictEqual(N.normalizeRelease(""), null);
});
test("brand number is not read as pack size", () => assert.strictEqual(N.parseTitle("Febrexa 500 Tablet").pack, null));
test("pack size read from 'Strip of 15 tablets'", () => assert.deepStrictEqual(N.parsePack("Strip of 15 tablets", true), { quantity: 15, unit_type: "tablet" }));
test("price parsing", () => {
  assert.strictEqual(N.parsePrice("₹ 1,234.50"), 1234.5);
  assert.strictEqual(N.parsePrice("Out of stock"), null);
  assert.strictEqual(N.detectCurrency("₹ 30"), "INR");
});

console.log("\nPrice calculations");
test("unit price", () => assert.strictEqual(P.unitPrice(30, 15), 2));
test("price per 10", () => assert.strictEqual(P.pricePer10(22, 10), 22));
test("savings on same quantity (30/15 vs 12/10)", () => {
  const c = P.comparePrices(
    { price: 30, quantity: 15, unit_type: "tablet", currency: "INR" },
    { price: 12, quantity: 10, unit_type: "tablet", currency: "INR" });
  assert.strictEqual(c.comparable, true);
  assert.strictEqual(c.alt_unit_price, 1.2);
  assert.strictEqual(c.alt_cost_for_source_quantity, 18);
  assert.strictEqual(c.absolute_savings, 12);
  assert.strictEqual(c.percent_savings, 40);
});
test("more expensive alternative -> negative savings", () => {
  const c = P.comparePrices(
    { price: 30, quantity: 15, unit_type: "tablet", currency: "INR" },
    { price: 35, quantity: 10, unit_type: "tablet", currency: "INR" });
  assert.strictEqual(c.is_cheaper, false);
  assert.strictEqual(c.absolute_savings, -22.5);
});
test("zero / negative price rejected", () => {
  assert.strictEqual(P.comparePrices({ price: 0, quantity: 10, unit_type: "tablet", currency: "INR" }, { price: 5, quantity: 10, unit_type: "tablet", currency: "INR" }).comparable, false);
  assert.strictEqual(P.unitPrice(-5, 10), null);
});
test("different currency not compared", () => assert.strictEqual(
  P.comparePrices({ price: 30, quantity: 15, unit_type: "tablet", currency: "INR" }, { price: 1, quantity: 10, unit_type: "tablet", currency: "USD" }).comparable, false));
test("different unit type not compared", () => assert.strictEqual(
  P.comparePrices({ price: 30, quantity: 15, unit_type: "tablet", currency: "INR" }, { price: 1, quantity: 10, unit_type: "capsule", currency: "INR" }).comparable, false));

console.log("\nCatalog cleaning");
test("zero-price record quarantined", () => assert.strictEqual(cleaned.log.invalid_price_quarantined, 1));
test("duplicate product_id removed", () => assert.strictEqual(cleaned.log.duplicates_removed, 1));
test("stale record flagged", () => assert.strictEqual(cleaned.log.stale_records, 1));
test("incomplete record flagged, not guessed", () => assert.strictEqual(byId.get("SYN-013")._incomplete, true));

console.log("\nStrict compatibility (must all be rejected)");
const status = (a, b) => M.evaluatePair(byId.get(a), byId.get(b)).match_status;
test("strength mismatch 500 vs 650 rejected", () => assert.strictEqual(status("SYN-001", "SYN-004"), "rejected"));
test("strength mismatch 5 vs 10 rejected", () => assert.strictEqual(status("SYN-011", "SYN-017"), "rejected"));
test("dosage form mismatch rejected", () => assert.strictEqual(status("SYN-001", "SYN-005"), "rejected"));
test("release mismatch rejected", () => assert.strictEqual(status("SYN-001", "SYN-006"), "rejected"));
test("release mismatch (metformin) rejected", () => assert.strictEqual(status("SYN-007", "SYN-009"), "rejected"));
test("missing ingredient rejected", () => assert.strictEqual(status("SYN-001", "SYN-013"), "rejected"));
test("unknown release -> review, never verified", () => assert.strictEqual(status("SYN-007", "SYN-010"), "review_required"));
test("misspelled ingredient -> review, never verified", () => assert.strictEqual(status("SYN-001", "SYN-016"), "review_required"));
test("different currency -> review, never verified", () => assert.strictEqual(status("SYN-001", "SYN-018"), "review_required"));
test("compatible pair verified", () => assert.strictEqual(status("SYN-001", "SYN-003"), "verified_match"));

console.log("\nPage lookups");
test("valid comparison with spelling/format variation", () => {
  const r = lookupTitle("FEBREXA-500 MG  TABLET!!", "₹ 30.00", "Strip of 15 tablets");
  assert.strictEqual(r.outcome, "matches_found");
  assert.strictEqual(r.source.product_id, "SYN-001");
});
test("best saving listed first (generic paracetamol)", () => {
  const r = lookupTitle("Febrexa 500mg Tablet", "₹ 30.00", "Strip of 15 tablets");
  assert.strictEqual(r.alternatives[0].product_id, "SYN-002");
  assert.strictEqual(r.alternatives[0].pricing.absolute_savings, 12);
});
test("no alternative with a different strength/release/form is ever shown", () => {
  const r = lookupTitle("Febrexa 500mg Tablet", "₹ 30.00", "Strip of 15 tablets");
  const ids = r.alternatives.map((a) => a.product_id);
  ["SYN-004", "SYN-005", "SYN-006", "SYN-013", "SYN-016", "SYN-018"].forEach((bad) => assert.ok(!ids.includes(bad), bad + " must not be verified"));
});
test("metformin valid comparison", () => {
  const r = lookupTitle("Glucomet 500mg Tablet", "₹ 40.00", "Strip of 20 tablets");
  assert.strictEqual(r.outcome, "matches_found");
  assert.strictEqual(r.alternatives[0].pricing.percent_savings, 65);
  assert.ok(r.review.some((a) => a.product_id === "SYN-010"));
});
test("strength only exists as its own product -> no reliable match", () => assert.strictEqual(lookupTitle("Febrexa 650mg Tablet", "₹ 42.00", "Strip of 15 tablets").outcome, "no_reliable_match"));
test("extended-release page does not match immediate-release products", () => {
  const r = lookupTitle("Febrexa SR 500mg Tablet", "₹ 40.00", "Strip of 10 tablets");
  assert.strictEqual(r.outcome, "no_reliable_match");
  assert.strictEqual(r.alternatives.length, 0);
});
test("unknown product -> no reliable match", () => assert.strictEqual(lookupTitle("Unknownmed 250mg Tablet", "₹ 50.00", "Strip of 10 tablets").outcome, "no_reliable_match"));
test("missing dosage form on page -> review required", () => assert.strictEqual(lookupTitle("Glucomet 500mg", "₹ 40.00", "Strip of 20 tablets").outcome, "review_required"));
test("missing price -> extraction failed", () => assert.strictEqual(lookupTitle("Febrexa 500mg Tablet", "Out of stock", "Strip of 15 tablets").outcome, "extraction_failed"));
test("missing pack size -> no price comparison invented", () => {
  const r = lookupTitle("Febrexa 500mg Tablet", "₹ 30.00", "");
  assert.strictEqual(r.alternatives.length, 0);
});

console.log("\nEvaluation and performance");
const ev = evaluate();
test("false-positive rate is zero on the labeled set", () => assert.strictEqual(ev.fpr, 0));
test("precision is 1 on the labeled set", () => assert.strictEqual(ev.precision, 1));
test("lookup latency under 50 ms (worst of 200 runs)", () => {
  const extraction = N.buildExtraction("http://localhost/t", { title: "Febrexa 500mg Tablet", priceText: "₹ 30.00", packText: "Strip of 15 tablets" });
  let worst = 0;
  for (let i = 0; i < 200; i++) {
    const t0 = process.hrtime.bigint();
    M.lookup(extraction, index);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (ms > worst) worst = ms;
  }
  console.log("       worst lookup: " + worst.toFixed(3) + " ms");
  assert.ok(worst < 50);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
