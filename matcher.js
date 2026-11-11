/*
 * CartOptima - matcher.js
 * Catalog cleaning, candidate retrieval and STRICT compatibility checks.
 *
 * Safety rules (from the PRD):
 *  - fuzzy similarity only finds candidates, it never proves equivalence
 *  - different strength / dosage form / release type / route  => rejected
 *  - missing or unknown critical field                         => review_required
 *  - missing ingredient                                        => rejected
 *  - nothing is guessed
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./normalize.js"), require("./pricing.js"));
  } else {
    root.CartOptima = root.CartOptima || {};
    Object.assign(root.CartOptima, factory(root.CartOptima, root.CartOptima));
  }
})(typeof self !== "undefined" ? self : this, function (N, P) {
  "use strict";

  const INGREDIENT_FUZZY_MIN = 0.85; // retrieval only
  const NAME_MATCH_MIN = 0.8; // finding the product on the page in the catalog
  const STALE_DAYS = 180;

  // ---------------- catalog cleaning ----------------

  function prepare(r) {
    return Object.assign({}, r, {
      _generic: N.canonicalIngredient(r.generic_name),
      _strength: N.normalizeStrength(r.strength),
      _form: N.normalizeForm(r.dosage_form),
      _release: N.normalizeRelease(r.release_type),
      _route: N.normalizeRoute(r.route),
      _brand: N.nameCore(r.brand_name || ""),
      _gname: N.nameCore(r.generic_name || ""),
    });
  }

  /** Returns { clean, quarantined, log } and never mutates the input. */
  function cleanCatalog(records, today) {
    const now = today || new Date();
    const log = {
      total_input: records.length,
      invalid_price_quarantined: 0,
      duplicates_removed: 0,
      incomplete_records: 0,
      stale_records: 0,
      strengths_standardized: 0,
      aliases_applied: 0,
    };
    const quarantined = [];
    const clean = [];
    const seen = new Set();

    for (const rec of records) {
      if (!rec.product_id || seen.has(rec.product_id)) {
        log.duplicates_removed++;
        quarantined.push({ record: rec, reason: "duplicate product_id" });
        continue;
      }
      if (!P.validPrice(rec.price)) {
        log.invalid_price_quarantined++;
        quarantined.push({ record: rec, reason: "invalid or zero price" });
        continue;
      }
      seen.add(rec.product_id);
      const p = prepare(rec);
      if (p._strength && p._strength !== rec.strength) log.strengths_standardized++;
      if (rec.generic_name && p._generic !== N.normalizeText(rec.generic_name)) log.aliases_applied++;
      p._incomplete = !p._generic || !p._strength || !p._form;
      if (p._incomplete) log.incomplete_records++;
      const d = Date.parse(rec.last_updated);
      p._stale = isNaN(d) ? true : (now - d) / 86400000 > STALE_DAYS;
      if (p._stale) log.stale_records++;
      clean.push(p);
    }
    return { clean, quarantined, log };
  }

  function buildIndex(clean) {
    const byIngredient = new Map();
    for (const r of clean) {
      if (!r._generic) continue;
      if (!byIngredient.has(r._generic)) byIngredient.set(r._generic, []);
      byIngredient.get(r._generic).push(r);
    }
    return { records: clean, byIngredient, ingredients: Array.from(byIngredient.keys()) };
  }

  // ---------------- strict compatibility ----------------

  const eq3 = (a, b) => (a === null || b === null || a === undefined || b === undefined || a === "" || b === "" ? null : a === b);

  function packInfo(r) {
    return { price: r.price, quantity: r.pack_quantity, unit_type: N.normalizeText(r.unit_type) || null, currency: r.currency };
  }

  /**
   * Evaluate one source/candidate pair (both prepared catalog records).
   * Returns the "matching and evaluation" row from the PRD data dictionary.
   */
  function evaluatePair(source, cand) {
    const reasons = [];
    const nameSim = N.similarity(source._brand || source._gname, cand._brand || cand._gname);

    // ingredient
    let ingredient_match;
    if (!source._generic || !cand._generic) {
      ingredient_match = false;
      reasons.push("missing ingredient - cannot be matched");
    } else if (source._generic === cand._generic) {
      ingredient_match = true;
    } else if (N.similarity(source._generic, cand._generic) >= INGREDIENT_FUZZY_MIN) {
      ingredient_match = null;
      reasons.push("ingredient names are similar but not identical - manual verification needed");
    } else {
      ingredient_match = false;
      reasons.push("different ingredient");
    }

    const strength_match = eq3(source._strength, cand._strength);
    if (strength_match === false) reasons.push(`strength differs (${source._strength} vs ${cand._strength})`);
    if (strength_match === null) reasons.push("strength missing");

    const form_match = eq3(source._form, cand._form);
    if (form_match === false) reasons.push(`dosage form differs (${source._form} vs ${cand._form})`);
    if (form_match === null) reasons.push("dosage form missing");

    const release_match = eq3(source._release, cand._release);
    if (release_match === false) reasons.push(`release type differs (${source._release} vs ${cand._release})`);
    if (release_match === null) reasons.push("release type unknown");

    const route_match = eq3(source._route, cand._route);
    if (route_match === false) reasons.push(`route differs (${source._route} vs ${cand._route})`);
    if (route_match === null) reasons.push("route unknown");

    const cmp = P.comparePrices(packInfo(source), packInfo(cand));
    const pack_comparable = cmp.comparable;
    if (!pack_comparable) reasons.push(`price not comparable: ${cmp.reason}`);

    const hard = [ingredient_match, strength_match, form_match, release_match, route_match];
    let match_status;
    if (hard.includes(false)) match_status = "rejected";
    else if (hard.includes(null) || !pack_comparable) match_status = "review_required";
    else match_status = "verified_match";
    if (match_status === "verified_match") reasons.push("ingredient, strength, form, release type and route all match in the catalog");

    return {
      source_product_id: source.product_id,
      candidate_product_id: cand.product_id,
      name_similarity: Math.round(nameSim * 100) / 100,
      ingredient_match, strength_match, form_match, release_match, route_match, pack_comparable,
      match_status,
      reasons,
    };
  }

  // ---------------- locate the page product in the catalog ----------------

  /**
   * extraction = record built by normalize.buildExtraction()
   * Returns { outcome: "source_found" | "review_required" | "no_reliable_match", ... }
   */
  function findSource(extraction, index) {
    const missing = [];
    if (!extraction.extracted_strength) missing.push("strength");
    if (!extraction.extracted_form) missing.push("dosage form");
    if (missing.length) {
      return { outcome: "review_required", reason: "Missing on page: " + missing.join(", ") + ". Cannot match safely.", missing };
    }

    const title = extraction.raw_title;
    const core = N.nameCore(title);
    if (!core) return { outcome: "no_reliable_match", reason: "Could not read a product name." };

    const scored = [];
    for (const r of index.records) {
      if (r._strength !== extraction.extracted_strength) continue;
      if (r._form !== extraction.extracted_form) continue;
      if (extraction.extracted_release && r._release && r._release !== extraction.extracted_release) continue;
      const target = r._brand || r._gname;
      if (!target) continue;
      const s = N.similarity(core, target);
      if (s >= NAME_MATCH_MIN) scored.push({ r, s });
    }
    if (!scored.length) return { outcome: "no_reliable_match", reason: "This product is not in the local catalog." };

    scored.sort((a, b) => b.s - a.s);
    const best = scored.filter((x) => x.s === scored[0].s);
    if (best.length > 1) {
      return { outcome: "review_required", reason: "More than one catalog product fits this page. Verify manually.", ambiguous: best.map((x) => x.r.product_id) };
    }
    const src = best[0].r;
    if (extraction.extracted_ingredient && extraction.extracted_ingredient !== src._generic) {
      return { outcome: "review_required", reason: "Ingredient on the page differs from the catalog record. Verify manually." };
    }
    if (src._incomplete) {
      return { outcome: "review_required", reason: "Catalog record for this product is incomplete." };
    }
    return { outcome: "source_found", source: src, name_similarity: Math.round(best[0].s * 100) / 100 };
  }

  // ---------------- alternatives ----------------

  function retrieveCandidates(source, index) {
    const out = [];
    for (const key of index.ingredients) {
      if (key === source._generic || N.similarity(key, source._generic) >= INGREDIENT_FUZZY_MIN) {
        for (const r of index.byIngredient.get(key)) if (r.product_id !== source.product_id) out.push(r);
      }
    }
    return out;
  }

  function toAlt(c, ev, pricing) {
    return {
      product_id: c.product_id, brand_name: c.brand_name || null, generic_name: c.generic_name,
      strength: c.strength, dosage_form: c.dosage_form, release_type: c.release_type || "unknown",
      pack_quantity: c.pack_quantity, unit_type: c.unit_type, price: c.price, currency: c.currency,
      data_source: c.source, last_updated: c.last_updated, stale: !!c._stale,
      therapeutic_category: c.therapeutic_category || null,
      match_status: ev.match_status, reasons: ev.reasons,
      checks: {
        ingredient: ev.ingredient_match, strength: ev.strength_match, form: ev.form_match,
        release: ev.release_match, route: ev.route_match, pack: ev.pack_comparable,
      },
      pricing: pricing || null,
    };
  }

  /**
   * Full lookup. `extraction` comes from the page; prices for the SOURCE come from
   * the page, alternatives come from the local catalog.
   */
  function lookup(extraction, index) {
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    const finish = (res) => {
      const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
      res.lookup_ms = Math.round((t1 - t0) * 100) / 100;
      return res;
    };

    if (!extraction || extraction.extraction_status === "failed") {
      return finish({ outcome: "extraction_failed", message: "Could not read the product title or price from this page.", alternatives: [], review: [], rejected: [] });
    }

    const found = findSource(extraction, index);
    if (found.outcome !== "source_found") {
      return finish({ outcome: found.outcome, message: found.reason, missing: found.missing || [], alternatives: [], review: [], rejected: [] });
    }

    const src = found.source;
    const pageSource = {
      price: extraction.displayed_price,
      quantity: extraction.extracted_pack_quantity,
      unit_type: extraction.extracted_pack_unit,
      currency: extraction.displayed_currency,
    };

    const verified = [], review = [], rejected = [];
    for (const cand of retrieveCandidates(src, index)) {
      const ev = evaluatePair(src, cand);
      if (ev.match_status === "rejected") { rejected.push(toAlt(cand, ev, null)); continue; }
      const pricing = P.comparePrices(pageSource, packInfo(cand));
      if (ev.match_status === "review_required" || !pricing.comparable) {
        const ev2 = Object.assign({}, ev, { match_status: "review_required" });
        if (!pricing.comparable && ev.match_status === "verified_match") ev2.reasons = ev.reasons.concat("page price: " + pricing.reason);
        review.push(toAlt(cand, ev2, null));
      } else {
        verified.push(toAlt(cand, ev, pricing));
      }
    }
    verified.sort((a, b) => b.pricing.absolute_savings - a.pricing.absolute_savings);

    const warnings = [];
    if (!extraction.extracted_release) warnings.push("Release type not shown on the page; using the catalog record for this product.");
    if (src._stale) warnings.push("Catalog record for this product may be outdated.");

    if (!verified.length) {
      return finish({
        outcome: "no_reliable_match",
        message: "No reliably matched alternative found in the local catalog.",
        source: { product_id: src.product_id, brand_name: src.brand_name, generic_name: src.generic_name, strength: src.strength, dosage_form: src.dosage_form, release_type: src.release_type || "unknown" },
        page_source: pageSource, name_similarity: found.name_similarity,
        alternatives: [], review, rejected, warnings,
      });
    }
    return finish({
      outcome: "matches_found",
      message: "Catalog-based price comparison found. Not medical advice.",
      source: { product_id: src.product_id, brand_name: src.brand_name, generic_name: src.generic_name, strength: src.strength, dosage_form: src.dosage_form, release_type: src.release_type || "unknown" },
      page_source: pageSource, name_similarity: found.name_similarity,
      alternatives: verified, review, rejected, warnings,
    });
  }

  return { cleanCatalog, buildIndex, evaluatePair, findSource, lookup, retrieveCandidates, STALE_DAYS };
});
