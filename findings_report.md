# CartOptima: Findings Report (1-2 pages)

**Team:** Chiranjith S V, Sanmeet Mugeri | **Mentor:** Tanishka | **Track:** PST_DA_007

> CartOptima gives price information, not medical advice. A matching ingredient alone does not make two medicines interchangeable.

## 1. Question and approach

Can CartOptima find lower-priced medicine alternatives from a local catalog and calculate savings without making unsafe or incorrect matches? We normalize the product title read from a page, find candidates in a local catalog, apply strict checks (ingredient, strength, dosage form, release type, route), and only then compare unit prices.

## 2. Data

- **Catalog used for testing:** 20 SYNTHETIC records (made-up prices, labeled in the `source` column).
- **Cleaning (see `docs/cleaning_log.md`):** 1 zero price quarantined, 1 duplicate ID handled, 1 incomplete record excluded from strict matching, 1 outdated record flagged, 1 strength standardized, 3 reviewed aliases applied.
- **Real data:** [FILL IN: source name and URL, date collected, number of records, license, currency, limitations]. If no reliable real source was available, say so here.

## 3. Matching results

Labeled test set: 16 pairs (6 should match, 10 should not). The negatives cover wrong strength, wrong dosage form, wrong release type, unknown release type, misspelled and missing ingredient, different currency and different ingredient.

| Method | Precision | Recall | False-positive rate |
|--------|-----------|--------|---------------------|
| Exact text match | 0.75 | 0.50 | 0.10 |
| Fuzzy name only | 0.27 | 0.50 | 0.80 |
| Strict (CartOptima) | 1.00 | 1.00 | 0.00 |

![Matching comparison](figures/matching_comparison.png)

**Interpretation:** fuzzy name matching alone accepts many wrong pairs (different strength, form or release type), which is why we use it only to find candidates. Exact matching misses valid pairs written differently (for example `500mg` vs `500 mg`, or `acetaminophen` vs `paracetamol`). The strict engine, which normalizes first and then applies compatibility rules, gave no false positives on this set. **This applies only to our 16-pair test set and is not a guarantee for real-world use.**

![Confusion matrix](figures/confusion_matrix.png)

## 4. Price calculations

Savings are calculated for the same quantity: the alternative's unit price times the quantity on the page. Example: page price 30 for 15 tablets (unit price 2.00); alternative 12 for 10 tablets (unit price 1.20). Cost of 15 tablets = 18.00, absolute saving = 12.00, percentage saving = 40%. Tests also cover a more expensive alternative (negative saving), zero or negative prices, different currencies and different unit types (not compared).

## 5. Performance and extraction

- **Catalog lookup time:** worst of 200 runs about 2 to 3 ms (target: under 50 ms; excludes page load).
- **Extraction on supported pages:** see `docs/extraction_summary.csv`. On the demo page: 6 pages tried, 5 fully successful, 1 partial (dosage form missing on purpose), 0 failed. [FILL IN: add your real pharmacy page results if you built an adapter.]

## 6. Optional analysis: markup by category

![Markup box plot](figures/markup_boxplot.png)

[FILL IN after running on REAL pairs: which categories have the highest median markup, sample sizes (n), outliers and missing data.] The chart above was made from SYNTHETIC data to test the pipeline and must not be reported as a finding.

![Missing data](figures/missing_data.png)

## 7. Limitations

- Test data is small and synthetic, so scores say little about real coverage.
- Prices come from a local catalog and may be outdated; source and date are always shown.
- Only one supported page so far; layout changes would break that page's adapter.
- Categories with fewer than 10 pairs are not interpreted.
- The tool cannot guarantee the lowest price or medical interchangeability.

## 8. Next steps

Add real catalog data with documented sources, support one real pharmacy page where permitted, enlarge the labeled test set and review every false positive.
