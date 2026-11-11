/*
 * Evaluation on the labeled pair set.
 * expected_match = "this pair may be shown as a verified price comparison".
 * actual_match   = engine returned match_status === "verified_match".
 *
 * Run:  node tests/evaluate.js
 */
const fs = require("fs");
const path = require("path");
const M = require("../extension/core/matcher.js");

function loadCatalog(today) {
  const records = JSON.parse(fs.readFileSync(path.join(__dirname, "../extension/data/catalog.json"), "utf8"));
  const cleaned = M.cleanCatalog(records, today || new Date("2026-11-11"));
  return { cleaned, index: M.buildIndex(cleaned.clean) };
}

function evaluate(today) {
  const { cleaned, index } = loadCatalog(today);
  const byId = new Map(cleaned.clean.map((r) => [r.product_id, r]));
  const pairs = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/test/labeled_pairs.json"), "utf8"));

  let tp = 0, fp = 0, tn = 0, fn = 0;
  const rows = [];
  for (const p of pairs) {
    const s = byId.get(p.source_product_id), c = byId.get(p.candidate_product_id);
    const ev = M.evaluatePair(s, c);
    const actual = ev.match_status === "verified_match";
    if (p.expected_match && actual) tp++;
    else if (!p.expected_match && actual) fp++;
    else if (!p.expected_match && !actual) tn++;
    else fn++;
    rows.push({ case: p.case, expected: p.expected_match, actual, status: ev.match_status, reasons: ev.reasons.join("; ") });
  }
  const precision = tp + fp ? tp / (tp + fp) : null;
  const recall = tp + fn ? tp / (tp + fn) : null;
  const fpr = fp + tn ? fp / (fp + tn) : null;
  return { tp, fp, tn, fn, precision, recall, fpr, rows, cleaned, index };
}

module.exports = { loadCatalog, evaluate };

if (require.main === module) {
  const r = evaluate();
  console.log("Pair | expected | actual | status");
  r.rows.forEach((x) => console.log(`- ${x.case} | ${x.expected} | ${x.actual} | ${x.status}`));
  console.log("\nConfusion matrix (rows = expected, cols = system)");
  console.log("                 accepted  not accepted");
  console.log(`expected match      ${r.tp}          ${r.fn}`);
  console.log(`expected no match   ${r.fp}          ${r.tn}`);
  console.log(`\nPrecision: ${r.precision}`);
  console.log(`Recall: ${r.recall}`);
  console.log(`False-positive rate: ${r.fpr}`);
  console.log("\nCleaning log:", JSON.stringify(r.cleaned.log, null, 2));
  console.log("Note: the set is small, so these numbers apply to this test set only.");
}
