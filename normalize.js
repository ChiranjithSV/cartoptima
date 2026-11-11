/*
 * CartOptima - normalize.js
 * Text / strength / form / release / pack / price parsing.
 * No guessing: when something cannot be read, the function returns null.
 *
 * Works in the browser (attaches to self.CartOptima) and in Node (module.exports).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CartOptima = root.CartOptima || {};
    Object.assign(root.CartOptima, factory());
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Reviewed alias dictionary (add new aliases ONLY after checking them and
  // record the count in docs/cleaning_log.md).
  const ALIASES = {
    acetaminophen: "paracetamol",
    "metformin hydrochloride": "metformin",
    "metformin hcl": "metformin",
    "amlodipine besylate": "amlodipine",
    "amlodipine besilate": "amlodipine",
  };

  const NAME_STOPWORDS = new Set([
    "tablet", "tablets", "tab", "tabs", "capsule", "capsules", "cap", "caps",
    "syrup", "suspension", "injection", "cream", "ointment", "gel", "drops",
    "drop", "strip", "strips", "pack", "of", "bottle", "extended", "sustained",
    "prolonged", "modified", "controlled", "immediate", "release", "ip", "bp",
    "usp",
  ]);

  const FORMS = [
    ["tablet", /\b(tablets?|tabs?)\b/],
    ["capsule", /\b(capsules?|caps?)\b/],
    ["syrup", /\bsyrup\b/],
    ["suspension", /\bsuspension\b/],
    ["injection", /\binjection\b/],
    ["cream", /\bcream\b/],
    ["ointment", /\bointment\b/],
    ["gel", /\bgel\b/],
    ["drops", /\bdrops?\b/],
  ];

  // ---------- basic text ----------

  /** lower-case, strip punctuation, collapse spaces. Keeps digits, "." between digits, "/" and "+". */
  function normalizeText(s) {
    if (s === null || s === undefined) return "";
    return String(s)
      .toLowerCase()
      .replace(/[^a-z0-9.\/+\s]/g, " ")
      .replace(/(?<!\d)\.|\.(?!\d)/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(
          prev[j] + 1,
          cur[j - 1] + 1,
          prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
      prev = cur;
    }
    return prev[n];
  }

  /** 0..1 similarity. Used ONLY to discover candidates, never as proof. */
  function similarity(a, b) {
    if (!a && !b) return 1;
    if (!a || !b) return 0;
    return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  }

  /** brand/product name with numbers, units, forms, release words removed */
  function nameCore(s) {
    const t = normalizeText(s).replace(
      /\d+(?:\.\d+)?\s*(?:(?:mcg|ug|mg|ml|iu|g|%)(?![a-z]))?/g,
      " "
    );
    return t.split(" ").filter((w) => w && !NAME_STOPWORDS.has(w)).join(" ");
  }

  // ---------- ingredient ----------

  function canonicalIngredient(s) {
    if (!s) return "";
    const parts = normalizeText(s)
      .split(/\s*(?:\+|\/|,|\band\b)\s*/)
      .map((p) =>
        p.split(" ").filter((w) => w && !["ip", "bp", "usp"].includes(w)).join(" ")
      )
      .map((p) => ALIASES[p] || p)
      .filter(Boolean)
      .sort();
    return parts.join(" + ");
  }

  // ---------- strength ----------

  function formatNumber(x) {
    return Number(x.toFixed(6)).toString();
  }

  /** "0.5 g" -> "500 mg", "500mg" -> "500 mg", "125 mg/5 ml" -> "125 mg/5 ml". null if unreadable. */
  function normalizeStrength(s) {
    if (s === null || s === undefined) return null;
    const text = String(s).toLowerCase().replace(/,/g, "");
    const re = /(\d+(?:\.\d+)?)\s*(mcg|µg|ug|mg|ml|iu|g|%)(?![a-z])/g;
    const parts = [];
    let m;
    while ((m = re.exec(text)) !== null) {
      let value = parseFloat(m[1]);
      let unit = m[2];
      if (unit === "g") { value *= 1000; unit = "mg"; }
      if (unit === "µg" || unit === "ug") unit = "mcg";
      parts.push(formatNumber(value) + " " + unit);
    }
    return parts.length ? parts.join("/") : null;
  }

  // ---------- form / release / route ----------

  function normalizeForm(s) {
    const t = normalizeText(s);
    if (!t) return null;
    for (const [name, re] of FORMS) if (re.test(t)) return name;
    return null;
  }

  /** returns "immediate", "extended" or null (unknown) */
  function normalizeRelease(s) {
    if (s === null || s === undefined || s === "") return null;
    const t = normalizeText(s);
    if (/(^| )(sr|xr|er|cr|mr|xl|extended|sustained|prolonged|modified|controlled)( |$)/.test(t)) return "extended";
    if (/(^| )(ir|immediate)( |$)/.test(t)) return "immediate";
    return null;
  }

  function normalizeRoute(s) {
    const t = normalizeText(s);
    return t || null;
  }

  // ---------- pack / price ----------

  /**
   * "strip of 15 tablets" -> {quantity:15, unit_type:"tablet"}
   * loose=false (used for product titles): only accepts "of 15 tablets" or plural
   * "15 tablets", so a brand like "Febrexa 500 Tablet" is NOT read as a pack of 500.
   * loose=true (used for a dedicated pack-size element on the page).
   */
  function parsePack(s, loose) {
    const t = normalizeText(s);
    const tab = loose ? "tablets?|tabs?" : "tablets|tabs";
    const cap = loose ? "capsules?|caps?" : "capsules|caps";
    let m = t.match(new RegExp("\\bof\\s+(\\d+)\\s*(?:tablets?|tabs?)\\b")) ||
            t.match(new RegExp("(\\d+)\\s*(?:" + tab + ")\\b"));
    if (m) return { quantity: parseInt(m[1], 10), unit_type: "tablet" };
    m = t.match(new RegExp("\\bof\\s+(\\d+)\\s*(?:capsules?|caps?)\\b")) ||
        t.match(new RegExp("(\\d+)\\s*(?:" + cap + ")\\b"));
    if (m) return { quantity: parseInt(m[1], 10), unit_type: "capsule" };
    m = t.match(/(\d+(?:\.\d+)?)\s*ml\s*(bottle|pack|vial)\b/);
    if (m) return { quantity: parseFloat(m[1]), unit_type: "ml" };
    return null;
  }

  function detectCurrency(s) {
    if (!s) return null;
    if (/₹|\brs\b\.?|\binr\b/i.test(s)) return "INR";
    if (/\$|\busd\b/i.test(s)) return "USD";
    return null;
  }

  /** "₹ 1,234.50" -> 1234.5 ; null if no number */
  function parsePrice(s) {
    if (s === null || s === undefined) return null;
    const cleaned = String(s).replace(/,/g, "").replace(/₹|\brs\b\.?|\binr\b|\$|\busd\b/gi, " ");
    const m = cleaned.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : null;
  }

  // ---------- title + page extraction record ----------

  function parseTitle(rawTitle) {
    const raw = rawTitle || "";
    const normalized = normalizeText(raw);
    return {
      raw_title: raw,
      normalized_title: normalized,
      extracted_strength: normalizeStrength(raw),
      extracted_form: normalizeForm(normalized),
      extracted_release: normalizeRelease(normalized),
      pack: parsePack(normalized),
    };
  }

  /**
   * Builds the "Extracted webpage data" record (PRD data dictionary B).
   * raw = { title, priceText, packText?, ingredientText? } produced by a site adapter.
   */
  function buildExtraction(url, raw, now) {
    const t = parseTitle(raw.title);
    const packFromText = raw.packText ? parsePack(raw.packText, true) : null;
    const pack = packFromText || t.pack;
    const price = raw.priceText ? parsePrice(raw.priceText) : null;
    const missing = [];
    if (!t.extracted_strength) missing.push("strength");
    if (!t.extracted_form) missing.push("dosage form");
    if (!pack) missing.push("pack size");
    if (!t.extracted_release) missing.push("release type");
    let status = "success";
    if (!t.raw_title || price === null || price <= 0) status = "failed";
    else if (!t.extracted_strength || !t.extracted_form || !pack) status = "partial";
    return {
      page_url: url,
      raw_title: t.raw_title,
      normalized_title: t.normalized_title,
      extracted_ingredient: raw.ingredientText ? canonicalIngredient(raw.ingredientText) : null,
      extracted_strength: t.extracted_strength,
      extracted_form: t.extracted_form,
      extracted_release: t.extracted_release,
      extracted_pack_quantity: pack ? pack.quantity : null,
      extracted_pack_unit: pack ? pack.unit_type : null,
      displayed_price: price,
      displayed_currency: detectCurrency(raw.priceText),
      extraction_status: status,
      extraction_timestamp: (now || new Date()).toISOString(),
      missing_attributes: missing,
    };
  }

  return {
    ALIASES,
    normalizeText,
    levenshtein,
    similarity,
    nameCore,
    canonicalIngredient,
    normalizeStrength,
    normalizeForm,
    normalizeRelease,
    normalizeRoute,
    parsePack,
    parsePrice,
    detectCurrency,
    parseTitle,
    buildExtraction,
  };
});
