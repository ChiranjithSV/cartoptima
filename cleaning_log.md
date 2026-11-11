# Cleaning Log

Generated from `node tests/evaluate.js` on the SYNTHETIC test catalog (20 input rows).
Update the numbers whenever the catalog changes.

|Issue|Action|Impact|
|-|-|-|
|Upper/lower case, extra spaces, punctuation|Normalized with `normalizeText` at match time (original titles kept for audit)|Applied to all records|
|Strength written differently (`500mg` vs `500 mg`)|Normalized with `normalizeStrength`|1 record standardized|
|Ingredient name variants (acetaminophen, metformin hydrochloride, amlodipine besylate)|Reviewed alias dictionary in `normalize.js`|3 aliases applied|
|Misspelled ingredient (`Paracetmol`)|NOT auto-corrected. Treated as "similar but not identical" and sent to manual review|1 record blocked from verified matches|
|Missing ingredient (`SYN-013`)|Marked incomplete, never inferred, rejected from matching|1 record excluded from strict matching|
|Unknown release type (`SYN-010`)|Flagged for manual review, never guessed|1 candidate blocked from verified matches|
|Invalid or zero price (`SYN-014`)|Quarantined|1 row removed|
|Duplicate `product\_id` with conflicting price (`SYN-003`)|First row kept, later row quarantined for review|1 duplicate handled|
|Outdated price (`SYN-012`, last updated 2026-01-15)|Kept, flagged stale (older than 180 days), warning shown in the panel|1 record marked stale|
|Different currency (`SYN-018`)|Kept, but price comparison blocked|1 candidate blocked|

All catalog rows are SYNTHETIC test data, not real prices.

