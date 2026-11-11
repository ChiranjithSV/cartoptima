# CartOptima: Step-by-Step Procedure (Chrome extension)

Follow these in order. Each week matches the PRD milestones. Tick them off as you go.

## Step 0: Put the starter code in your repo (today)

1. Unzip `cartoptima-starter.zip`. You get a folder `cartoptima/`.
2. Copy everything from it into your cloned `cartoptima` repo folder, **except** `README.md` (keep the one already on GitHub).
3. In a terminal inside the repo folder:
```bash
git pull
git add .
git commit -m "Add starter extension, catalog, tests and docs"
git push
```
No terminal? On GitHub use **Add file > Upload files** and drag the folders in.

## Step 1: Run the tests (needs Node.js)

Install Node.js from nodejs.org (LTS) if you don't have it, then:
```bash
node tests/run_tests.js
node tests/evaluate.js
```
You should see `44 passed, 0 failed`. If not, copy the error message and ask me.

## Step 2: Load the extension in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the `extension` folder.
4. Start the demo page. In a terminal:
```bash
cd demo
python -m http.server 8000
```
5. Open `http://localhost:8000/product.html` in Chrome. The CartOptima panel appears at the bottom right.
6. Click each demo link (valid comparison, strength mismatch, extended release, unknown product, missing dosage form). Take a screenshot of each for your demo and logbook.

If the panel doesn't appear: reload the extension on `chrome://extensions`, refresh the page, and press F12 > Console to read any `CartOptima` messages.

## Step 3: Week 1 (Days 1-7): Foundation

- [ ] Repo, README and starter code pushed
- [ ] Read `extension/core/normalize.js` until you can explain each function
- [ ] Record your data sources in README (the synthetic catalog is already labeled; add any real source only after checking its license and date)
- [ ] Explain the catalog columns (see PRD section 7) in `docs/data_dictionary.md`
- [ ] Add 3 to 5 of your own normalization tests in `tests/run_tests.js`
- [ ] Fill in `docs/cleaning_log.md` with your own numbers if you change the catalog

## Step 4: Week 2 (Days 8-14): One supported page

- [ ] Choose ONE pharmacy page. Read its terms of use first. If scraping is not allowed, keep using the demo page and say so in the README.
- [ ] Copy `extension/content/sites/demo.js` to a new adapter, change `matches` and the selectors (use F12 > Inspect to find the title and price elements)
- [ ] Add the site to `manifest.json` (`matches` and `web_accessible_resources`) and to the README "Supported Websites" table
- [ ] Record extraction success: pages tried vs pages read correctly
- [ ] Add 20 or more real verified catalog rows from permitted sources (record source, date and license for each)

## Step 5: Week 3 (Days 15-21): Overlay, savings and evaluation

- [ ] Check the overlay with 3 or more products, including a pack-size difference
- [ ] Add more labeled pairs to `data/test/labeled_pairs.json`: more strength, form and release mismatches
- [ ] Re-run `node tests/evaluate.js` and update `docs/evaluation_report.md` with the new numbers
- [ ] Review every false positive by hand and write down why it happened

## Step 6: Week 4 (Days 22-28): Fix, document, demo

- [ ] Fix false positives, add a test for each fix
- [ ] Finish README: supported websites, permissions (`manifest.json` currently asks for none), data sources, limitations, demo steps
- [ ] Write the 1 to 2 page findings report with charts (title, labeled axes, units, short interpretation)
- [ ] Record the demo: successful extraction, valid comparison, incompatible product rejected, no-match case
- [ ] Optional stretch: pandas notebook with category-wise median markup (only if the core is finished)

## Working with Sanmeet

- Split the work: one of you takes `core/` and tests, the other takes the overlay, adapters and docs.
- Always `git pull` before you start and `git push` when you finish.
- Don't edit the same file at the same time.

## Safety rules to keep (graded)

1. Fuzzy matching only finds candidates, strict rules decide.
2. Different strength, form, release type or route means rejected.
3. Missing or unknown critical fields mean manual review. Never guess values.
4. Always show source, date and the "not medical advice" disclaimer.
5. Never present savings as guaranteed or a match as medical advice.

## Common errors

| Problem | Fix |
|---------|-----|
| `node` not recognized | Install Node.js, then reopen the terminal |
| Panel doesn't show | Reload extension, refresh page, use the `localhost` URL (not a `file://` path) |
| `Failed to fetch catalog` in console | Check `data/catalog.json` is listed in `web_accessible_resources` |
| Push rejected | Run `git pull` first, then `git push` |
