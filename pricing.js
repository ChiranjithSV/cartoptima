/*
 * CartOptima - pricing.js
 * Unit price, absolute savings and percentage savings.
 * Only compares when currency and unit type match and prices are valid.
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

  const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
  const round4 = (x) => Math.round((x + Number.EPSILON) * 10000) / 10000;

  function validPrice(p) {
    return typeof p === "number" && isFinite(p) && p > 0;
  }

  /** price per single unit (tablet, capsule, ml...). null when inputs are invalid. */
  function unitPrice(price, quantity) {
    if (!validPrice(price) || !(typeof quantity === "number" && quantity > 0)) return null;
    return round4(price / quantity);
  }

  /** price per 10 units, handy for tablets/capsules */
  function pricePer10(price, quantity) {
    const u = unitPrice(price, quantity);
    return u === null ? null : round2(u * 10);
  }

  /**
   * src / alt = { price, quantity, unit_type, currency }
   * Compares what the alternative would cost for the SAME quantity as the source pack.
   */
  function comparePrices(src, alt) {
    if (!src || !alt) return { comparable: false, reason: "missing price data" };
    if (!validPrice(src.price) || !validPrice(alt.price))
      return { comparable: false, reason: "invalid or non-positive price" };
    if (!(src.quantity > 0) || !(alt.quantity > 0))
      return { comparable: false, reason: "pack size missing" };
    if (!src.currency || !alt.currency)
      return { comparable: false, reason: "currency unknown" };
    if (src.currency !== alt.currency)
      return { comparable: false, reason: "different currencies" };
    if (!src.unit_type || src.unit_type !== alt.unit_type)
      return { comparable: false, reason: "different unit types" };

    const srcUnit = unitPrice(src.price, src.quantity);
    const altUnit = unitPrice(alt.price, alt.quantity);
    const altCostForSourceQty = altUnit * src.quantity;
    const absolute = src.price - altCostForSourceQty;
    const percent = (absolute / src.price) * 100;
    return {
      comparable: true,
      currency: src.currency,
      unit_type: src.unit_type,
      source_unit_price: srcUnit,
      alt_unit_price: altUnit,
      source_price_per_10: round2(srcUnit * 10),
      alt_price_per_10: round2(altUnit * 10),
      alt_cost_for_source_quantity: round2(altCostForSourceQty),
      absolute_savings: round2(absolute),
      percent_savings: round2(percent),
      is_cheaper: round2(absolute) > 0,
    };
  }

  return { round2, round4, validPrice, unitPrice, pricePer10, comparePrices };
});
