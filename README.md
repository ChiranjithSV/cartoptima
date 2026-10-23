# CartOptima — Multi-Store Medicine & Grocery Price Comparator

> **Track ID:** PST_DA_007 | **Level:** 2026 Level 2 (Core) | **Duration:** 4 weeks | **PRD version:** v0.1

CartOptima is a browser extension that helps consumers compare medicine prices and find potentially lower-cost alternatives using a **locally stored medicine catalog**. It extracts medicine details from supported e-pharmacy product pages, matches them against a curated database of branded and generic medicines, and calculates possible savings.

## ⚠️ Medical Disclaimer

CartOptima provides **price information, not medical advice**.

- A matching active ingredient alone does **not** mean two medicines are interchangeable.
- Strength, dosage form, release type, route, and other characteristics must also match.
- A match shown by this tool is a catalog-based comparison, **not** clinical confirmation of interchangeability.
- Estimated savings are not guaranteed savings.
- Always consult a qualified healthcare professional before switching medicines.

## Team

| Role | Name |
|------|------|
| Student | Chiranjith S V |
| Student | Sanmeet Mugeri |
| Mentor | Tanishka |

## Problem Statement

Can CartOptima identify appropriately matched, lower-priced medicine alternatives from a local catalog and calculate potential savings, while avoiding unsafe or incorrect matches?

**Hypothesis:** Normalization and catalog-based matching can improve product discovery, while strict matching rules can reduce incorrect suggestions caused by differences in strength, dosage form, or release type.

## Features

### Core (graded)
- Browser extension for supported e-pharmacy product pages
- Extracts medicine title and displayed price from the page DOM
- Parses active ingredient (when available), strength, dosage form, release type, and pack size
- Name normalization (case, spacing, punctuation, common naming variations)
- Local, curated catalog search for potential alternatives
- Strict compatibility checks before any price comparison is shown
- Absolute and percentage savings, plus unit-price normalization (e.g. per tablet / per 10 tablets)
- Clean popup or page overlay
- Clear message when no reliable match is found
- Test dataset with valid matches and deliberately mismatched products

### Good to have
- Multi-pharmacy comparison
- Catalog source and last-updated date display
- Expandable panel showing matching attributes
- Exportable comparison summary
- Warnings when important product information is missing

### Stretch (optional data analysis)
- 500+ branded/generic records or pairs
- Therapeutic-category median markup analysis and box plots (pandas + matplotlib)
- Exact vs fuzzy matching comparison on a labeled dataset
- Documentation of false matches, missing attributes, and coverage limits

## How Matching Works

1. Normalize names before searching.
2. Use fuzzy name similarity (e.g. Fuse.js) **only to find candidates**, never as proof of equivalence.
3. Check ingredient identity and attributes (strength, dosage form, release type, route).
4. Reject incompatible strengths, forms, release types, or routes.
5. Never show a confirmed match if critical fields are missing or contradictory.
6. Record why each candidate was accepted, rejected, or sent for review.

**Possible outcomes:** `Verified match` · `Review required` · `Rejected / No reliable match`

Missing strengths, ingredients, or dosage forms are **never guessed**.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Extension UI | HTML, CSS, JavaScript (Bootstrap 5 optional) |
| Browser integration | Chrome Extension APIs, content scripts |
| Catalog storage | Local JSON (or CSV converted to JSON) |
| Fuzzy matching | Fuse.js or custom scoring |
| Data analysis | Python 3, pandas, matplotlib |
| Testing | JavaScript test scripts, pytest |
| Version control | Git & GitHub |

## Project Structure (planned)

```
cartoptima/
├── extension/
│   ├── manifest.json
│   ├── popup/                  # Popup UI
│   ├── content/                # Content scripts
│   │   └── sites/              # Site-specific extractors (kept separate from matcher)
│   ├── core/
│   │   ├── normalize.js        # Name & unit normalization
│   │   ├── matcher.js          # Candidate retrieval + compatibility checks
│   │   └── pricing.js          # Unit price & savings calculations
│   └── data/
│       └── catalog.json        # Cleaned local catalog
├── data/
│   ├── raw/                    # Raw source data or download scripts
│   ├── cleaned/                # Cleaned catalog (CSV)
│   └── test/                   # Labeled test set (valid + mismatched)
├── analysis/                   # Optional pandas notebooks / scripts
├── tests/                      # JS + Python tests
├── docs/
│   ├── data_dictionary.md
│   ├── cleaning_log.md
│   └── evaluation_report.md
└── README.md
```

## Setup & Installation

> _To be finalized as the extension is built._

```bash
# 1. Clone the repository
git clone <repo-url>
cd cartoptima

# 2. Load the extension in Chrome
#    - Open chrome://extensions
#    - Enable "Developer mode"
#    - Click "Load unpacked" and select the /extension folder

# 3. Run tests (once added)
# npm test
# pytest tests/
```

## Supported Websites

> _To be decided (Week 2). Starting with one explicitly supported pharmacy product page._

| Website | Status | Notes |
|---------|--------|-------|
| TBD | Planned | Must be used only via permitted access methods per site terms |

## Permissions

> _Document the exact extension permissions here once `manifest.json` is finalized._

## Data Sources

Each source will be documented with: name & URL, date collected, last-updated date, record count, license/permitted usage, currency & price type, and known limitations.

| Source | Purpose |
|--------|---------|
| NLEM (India) | Medicine names and classification (not a full price catalog) |
| Jan Aushadhi product/price info | Reference prices (confirm permitted access and currency) |
| Public medicine price datasets | Branded vs generic comparison (verify license) |
| Manually curated CSV | Initial local lookup database |
| Synthetic test records | Testing only, clearly labeled, not real prices |

## Evaluation Metrics

| Metric | Target / Note |
|--------|---------------|
| Catalog lookup latency | < 50 ms on the defined test catalog |
| Precision | Prioritized for safety |
| Recall | Measured without relaxing compatibility checks |
| False-positive rate | Target zero on the defined dosage-mismatch test set |
| Attribute completeness | Reported as a percentage |
| Price normalization accuracy | Validated with known test cases |
| Extraction success rate | Measured per supported website |

> The zero false-positive target applies to the defined test set only and is **not** a guarantee for all real-world use.

## Milestones

| Week | Focus |
|------|-------|
| 1 (Days 1–7) | Repo and extension skeleton, identify permitted sources, catalog schema, small documented sample, normalization + unit tests |
| 2 (Days 8–14) | Content script for one pharmacy, title/price extraction, catalog search and compatibility checks |
| 3 (Days 15–21) | Comparison overlay, normalized prices and savings, mismatch tests, latency measurement, basic evaluation |
| 4 (Days 22–28) | Fix false positives, document sources/limitations, demo and README, optional analysis and charts |

## Known Limitations

- Prices come from a local catalog and may be outdated; source and date are always shown.
- The catalog may not cover every branded product, generic equivalent, or current market price.
- The tool cannot guarantee the lowest price across every pharmacy.
- Pharmacy page layout changes may break extraction for that site.
- Not a substitute for professional medical or pharmacy advice.

## Out of Scope

Prescribing or recommending treatment, replacing medicines on a prescription, claiming medical interchangeability from a name match, purchases/payments/prescription management, scraping sites that prohibit it or bypassing authentication/CAPTCHAs, and guaranteeing the lowest price.

## License

> _To be decided._
