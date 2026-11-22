# Data Dictionary

Three groups of data are used. Column names match PRD section 7.

## A. Medicine catalog (`extension/data/catalog.json`, `data/raw/catalog.csv`)

| Column | Type | Description | Null rule |
|--------|------|-------------|-----------|
| `product_id` | String | Unique catalog record ID | Not allowed. Duplicates are quarantined |
| `brand_name` | String | Branded product name, if any | Allowed for generic-only records |
| `generic_name` | String | Active ingredient or combination | Required for comparison. Missing means the record is incomplete and rejected from matching |
| `strength` | String | Strength, for example `500 mg` | Required for a strict match |
| `dosage_form` | String | Tablet, Capsule, Syrup and so on | Required for a strict match |
| `release_type` | String | `immediate-release`, `extended-release`, if known | Unknown values go to manual review, never guessed |
| `route` | String | Oral, topical and so on, if known | Must be compatible where applicable |
| `pack_quantity` | Numeric | Number of units in the pack | Required for unit-price comparison |
| `unit_type` | String | tablet, capsule, ml and so on | Required for unit-price comparison |
| `price` | Numeric | Listed price of the pack | Must be positive and valid |
| `currency` | String | For example `INR` | Required. Different currencies are never compared |
| `therapeutic_category` | String | Category, if available | Optional |
| `source` | String | Where the record came from | Required. Synthetic rows say `SYNTHETIC` |
| `last_updated` | Date (YYYY-MM-DD) | Date the record was updated | Required. Older than 180 days is flagged stale |

## B. Extracted webpage data (built by `normalize.js` `buildExtraction`)

| Column | Type | Description |
|--------|------|-------------|
| `page_url` | String | Product page URL |
| `raw_title` | String | Original title from the page (kept for auditing) |
| `normalized_title` | String | Cleaned title |
| `extracted_ingredient` | String | Ingredient parsed from the page, when available |
| `extracted_strength` | String | Parsed strength, for example `500 mg` |
| `extracted_form` | String | Parsed dosage form |
| `extracted_release` | String | `immediate`, `extended` or empty if not shown |
| `extracted_pack_quantity` | Numeric | Parsed pack quantity |
| `extracted_pack_unit` | String | Unit of the pack, for example `tablet` |
| `displayed_price` | Numeric | Price read from the page |
| `displayed_currency` | String | Currency detected from the price text |
| `extraction_status` | String | `success`, `partial` or `failed` |
| `extraction_timestamp` | Datetime | When the extraction ran |
| `missing_attributes` | List | Attributes that could not be read (shown as warnings) |

## C. Matching and evaluation data (`data/test/labeled_pairs.json`, `docs/evaluation_results.json`)

| Column | Type | Description |
|--------|------|-------------|
| `source_product_id` | String | Original product ID |
| `candidate_product_id` | String | Potential alternative ID |
| `name_similarity` | Numeric | Name similarity score (0 to 1, edit distance) |
| `ingredient_match` | Boolean or unknown | Whether ingredients match |
| `strength_match` | Boolean or unknown | Whether strengths match |
| `form_match` | Boolean or unknown | Whether dosage forms match |
| `release_match` | Boolean or unknown | Whether release types match |
| `route_match` | Boolean or unknown | Whether routes match |
| `pack_comparable` | Boolean | Whether the prices can be compared (same currency and unit type, valid prices) |
| `match_status` | String | `verified_match`, `review_required` or `rejected` |
| `expected_match` | Boolean | Ground-truth label for evaluation |
| `actual_match` | Boolean | System result (`verified_match` counts as true) |

## D. Pair data for the optional analysis (`data/raw/pairs_*.csv`)

| Column | Type | Description |
|--------|------|-------------|
| `pair_id` | String | Unique pair ID |
| `generic_name`, `brand_name` | String | The two products in the pair |
| `strength`, `dosage_form` | String | Shared attributes |
| `therapeutic_category` | String | Category, optional |
| `brand_unit_price`, `generic_unit_price` | Numeric | Price per unit, must be positive |
| `currency` | String | Currency |
| `source` | String | Source of the pair. `SYNTHETIC` means made-up demo data |

Markup % = (brand unit price - generic unit price) / generic unit price x 100.

## Missing-value rule

Missing strengths, ingredients or dosage forms are never replaced with guessed values. Missing critical fields end in `review_required` or `rejected`, never in an automatic match.
