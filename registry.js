/* Picks the adapter for the current page (if any). */
(function (root) {
  root.CartOptima = root.CartOptima || {};
  root.CartOptima.getAdapter = function (url) {
    const list = root.CartOptima.adapters || [];
    for (const a of list) if (a.matches(url)) return a;
    return null;
  };
})(typeof self !== "undefined" ? self : this);
