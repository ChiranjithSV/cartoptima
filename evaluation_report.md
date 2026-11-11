# Evaluation Report (Week 3 draft)

Test set: `data/test/labeled\_pairs.json` (16 labeled pairs on the SYNTHETIC catalog).
`expected\_match` means "this pair may be shown as a verified price comparison".
Reproduce with `node tests/evaluate.js` and `node tests/run\_tests.js`.

## Results

|Metric|Result|Note|
|-|-|-|
|Precision|1.00 (6 / 6 accepted are correct)|Small test set|
|Recall|1.00 (6 / 6 true matches accepted)|Small test set|
|False-positive rate|0.00 (0 / 10 negatives accepted)|Applies to this test set only, not a real-world guarantee|
|Strength / dosage-form / release-type mismatches rejected|5 / 5 rejected|Includes release-type mismatches for two ingredients|
|Catalog lookup latency|worst of 200 runs: about 3 ms|Target is under 50 ms; Node 22, 20-row catalog|
|Price calculation tests|all pass|See `tests/run\_tests.js`|

## Confusion matrix

||Accepted|Not accepted|
|-|-|-|
|Expected match|6|0|
|Expected no match|0|10|

## Limitations to state in your presentation

* The catalog has 20 synthetic rows, so precision/recall are not meaningful beyond this test set.
* Misspelled ingredients and unknown release types are sent to manual review instead of being accepted.
* Extraction success rate is not yet measured on a real pharmacy page. Add it per website in Week 2/3.
* Add every false positive you find later to this report with the reason and the fix.

