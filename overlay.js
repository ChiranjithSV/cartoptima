/*
 * CartOptima - overlay.js
 * Draws the comparison panel inside a Shadow DOM so page CSS cannot break it.
 * All text is inserted with textContent (never innerHTML) so page data cannot inject HTML.
 */
(function (root) {
  root.CartOptima = root.CartOptima || {};

  const CSS = `
    :host { all: initial; }
    .panel { position: fixed; right: 16px; bottom: 16px; width: 360px; max-height: 80vh; overflow: auto;
      background: #fff; color: #1d2433; border: 1px solid #c9d1de; border-radius: 12px;
      box-shadow: 0 8px 28px rgba(0,0,0,.22); font: 14px/1.45 system-ui, Segoe UI, Arial, sans-serif; z-index: 2147483647; }
    .head { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px;
      background: #0f5c4d; color: #fff; border-radius: 12px 12px 0 0; }
    .head b { font-size: 15px; }
    .x { background: none; border: 0; color: #fff; font-size: 20px; cursor: pointer; }
    .body { padding: 12px 14px; }
    .note { font-size: 12px; color: #5a6477; margin: 8px 0 0; }
    .warn { background: #fff4d6; border: 1px solid #f0d27a; border-radius: 8px; padding: 6px 10px; margin: 8px 0; font-size: 13px; }
    .msg { padding: 10px; border-radius: 8px; background: #eef2f7; margin: 6px 0; }
    .card { border: 1px solid #d5dbe6; border-radius: 10px; padding: 10px; margin: 10px 0; }
    .name { font-weight: 600; }
    .price { font-size: 13px; color: #36404f; }
    .save { font-size: 16px; font-weight: 700; color: #0a7a3d; margin-top: 4px; }
    .more { font-size: 15px; font-weight: 700; color: #a15c00; margin-top: 4px; }
    .tag { display: inline-block; font-size: 11px; padding: 1px 7px; border-radius: 999px; margin-left: 6px; }
    .tag.v { background: #dff5e6; color: #0a5c2d; }
    .tag.r { background: #ffecc7; color: #7a4a00; }
    details { margin-top: 6px; font-size: 13px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; margin-top: 4px; }
    td { border-top: 1px solid #e6eaf1; padding: 2px 4px; }
    .btn { margin-top: 8px; padding: 6px 10px; border: 1px solid #0f5c4d; background: #fff; color: #0f5c4d; border-radius: 8px; cursor: pointer; font-size: 13px; }
    .disc { margin-top: 10px; padding: 8px 10px; border-radius: 8px; background: #fdecec; color: #7a1f1f; font-size: 12px; }
  `;

  function el(tag, props, children) {
    const n = document.createElement(tag);
    if (props) {
      for (const k of Object.keys(props)) {
        if (k === "text") n.textContent = props[k];
        else if (k === "class") n.className = props[k];
        else n.setAttribute(k, props[k]);
      }
    }
    (children || []).forEach((c) => c && n.appendChild(c));
    return n;
  }

  const mark = (v) => (v === true ? "match" : v === false ? "MISMATCH" : "unknown");
  const money = (n, cur) => (cur === "INR" ? "₹" : cur === "USD" ? "$" : cur + " ") + Number(n).toFixed(2);

  function summaryText(res, ex) {
    const lines = ["CartOptima price comparison (catalog-based, NOT medical advice)"];
    lines.push("Page product: " + ex.raw_title + " | displayed price: " + ex.displayed_price);
    lines.push("Outcome: " + res.outcome);
    (res.alternatives || []).forEach((a) => {
      lines.push(`- ${a.brand_name || a.generic_name} ${a.strength} ${a.dosage_form}: ${money(a.price, a.currency)} for ${a.pack_quantity} ${a.unit_type}; ` +
        `savings for the same quantity: ${money(a.pricing.absolute_savings, a.currency)} (${a.pricing.percent_savings}%); ` +
        `source: ${a.data_source}; updated ${a.last_updated}`);
    });
    lines.push("Always consult a doctor or pharmacist before switching medicines.");
    return lines.join("\n");
  }

  function altCard(a) {
    const p = a.pricing;
    const cheaper = p && p.is_cheaper;
    const kids = [
      el("div", { class: "name" }, [
        el("span", { text: (a.brand_name || "Generic") + " - " + a.generic_name + " " + a.strength + " " + a.dosage_form }),
        el("span", { class: "tag v", text: "Catalog match" }),
      ]),
      el("div", { class: "price", text: money(a.price, a.currency) + " for " + a.pack_quantity + " " + a.unit_type + "s  (" + money(p.alt_unit_price, a.currency) + " per " + a.unit_type + ")" }),
      cheaper
        ? el("div", { class: "save", text: "Possible saving: " + money(p.absolute_savings, a.currency) + " (" + p.percent_savings + "%) for the same quantity" })
        : el("div", { class: "more", text: "Not cheaper: " + money(Math.abs(p.absolute_savings), a.currency) + " more for the same quantity" }),
    ];
    if (a.stale) kids.push(el("div", { class: "warn", text: "This price record may be outdated (last updated " + a.last_updated + ")." }));
    const rows = [
      ["Ingredient", mark(a.checks.ingredient)], ["Strength", mark(a.checks.strength)],
      ["Dosage form", mark(a.checks.form)], ["Release type", mark(a.checks.release)],
      ["Route", mark(a.checks.route)], ["Price per 10 (yours / this)", money(p.source_price_per_10, a.currency) + " / " + money(p.alt_price_per_10, a.currency)],
      ["Data source", a.data_source], ["Last updated", a.last_updated], ["Product ID", a.product_id],
    ].map((r) => el("tr", null, [el("td", { text: r[0] }), el("td", { text: r[1] })]));
    kids.push(el("details", null, [el("summary", { text: "Why was this matched?" }), el("table", null, rows)]));
    return el("div", { class: "card" }, kids);
  }

  function reviewCard(a) {
    return el("div", { class: "card" }, [
      el("div", { class: "name" }, [
        el("span", { text: (a.brand_name || "Generic") + " - " + a.generic_name + " " + a.strength + " " + a.dosage_form }),
        el("span", { class: "tag r", text: "Manual review" }),
      ]),
      el("div", { class: "price", text: "No price comparison shown: " + a.reasons.join("; ") }),
    ]);
  }

  function render(res, ex) {
    const old = document.getElementById("cartoptima-host");
    if (old) old.remove();
    const host = el("div", { id: "cartoptima-host" });
    const shadow = host.attachShadow({ mode: "open" });
    shadow.appendChild(el("style", { text: CSS }));

    const body = el("div", { class: "body" });
    const close = el("button", { class: "x", "aria-label": "Close", text: "×" });
    close.addEventListener("click", () => host.remove());
    const panel = el("div", { class: "panel" }, [
      el("div", { class: "head" }, [el("b", { text: "CartOptima" }), close]),
      body,
    ]);

    if (res.outcome === "matches_found") {
      body.appendChild(el("div", { text: "Compared with: " + ex.raw_title + " (" + money(ex.displayed_price, ex.displayed_currency || "INR") + ")" }));
      (res.warnings || []).forEach((w) => body.appendChild(el("div", { class: "warn", text: w })));
      res.alternatives.forEach((a) => body.appendChild(altCard(a)));
      if (res.review.length) {
        body.appendChild(el("div", { class: "note", text: "Needs manual verification (no price comparison shown):" }));
        res.review.forEach((a) => body.appendChild(reviewCard(a)));
      }
      const btn = el("button", { class: "btn", text: "Copy summary" });
      btn.addEventListener("click", () => {
        const t = summaryText(res, ex);
        if (navigator.clipboard) navigator.clipboard.writeText(t);
        btn.textContent = "Copied";
      });
      body.appendChild(btn);
    } else {
      const title = {
        no_reliable_match: "No reliable match found",
        review_required: "Manual verification required",
        extraction_failed: "Could not read this page",
      }[res.outcome] || "No result";
      body.appendChild(el("div", { class: "name", text: title }));
      body.appendChild(el("div", { class: "msg", text: res.message }));
      (res.warnings || []).forEach((w) => body.appendChild(el("div", { class: "warn", text: w })));
      (res.review || []).forEach((a) => body.appendChild(reviewCard(a)));
    }

    body.appendChild(el("div", { class: "note", text: "Lookup took " + res.lookup_ms + " ms. Prices come from a local catalog, may be outdated and are not guaranteed." }));
    body.appendChild(el("div", { class: "disc", text: "Price information only, not medical advice. A matching ingredient does not make medicines interchangeable. Consult a doctor or pharmacist before switching medicines." }));

    shadow.appendChild(panel);
    document.documentElement.appendChild(host);
  }

  root.CartOptima.renderPanel = render;
  root.CartOptima.summaryText = summaryText;
})(typeof self !== "undefined" ? self : this);
