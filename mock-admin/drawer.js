/* Affiliate unified drawer runtime (D-01, v1.0.0).
 * One keyboard/focus contract for every right-side drawer:
 *  - Esc closes, inner popovers first (hasInnerLayers hook)
 *  - Tab focus trap
 *  - open focuses the close button (or a given selector); close always returns
 *    focus to the trigger (same for Esc and click)
 *  - optional body scroll lock (off by default, per D-01 Q8 pending)
 * Usage: AFF.drawer.bind(root, { hasInnerLayers, initialFocus, returnFocus })
 *        returnFocus: selector string or () => Element. */
(function () {
  "use strict";

  const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

  function drawerRoot(node) {
    return node && node.closest ? node.closest(".aff-drawer") : null;
  }

  function activeDrawer() {
    return document.querySelector(".aff-drawer:not([hidden])");
  }

  function bind(root, opts) {
    if (!root) return;
    const options = Object.assign({ hasInnerLayers: null, initialFocus: null, returnFocus: null, lockScroll: false }, opts);
    root.__affDrawer = options;
  }

  function onKeydown(event) {
    const root = drawerRoot(event.target) || activeDrawer();
    if (!root) return;
    if (event.key === "Escape") {
      // Inner layers (help popovers, combobox lists, floating tooltips inside the
      // drawer) close first — generic probe, no per-page wiring needed.
      if (hasInnerLayers(root)) return;
      event.preventDefault();
      event.stopPropagation();
      closeViaPage(root);
      return;
    }
    if (event.key === "Tab") {
      const nodes = Array.from(root.querySelectorAll(FOCUSABLE)).filter(n => n.offsetParent !== null || n === document.activeElement);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }

  /* Any visible popover/tooltip/combobox-list living inside the drawer counts as
   * an inner layer and owns the first Escape. */
  function hasInnerLayers(root) {
    if (!root) return false;
    const opts = root.__affDrawer;
    if (opts && typeof opts.hasInnerLayers === "function" && opts.hasInnerLayers(root)) return true;
    return Boolean(root.querySelector('[role="tooltip"]:not([hidden]), [role="dialog"]:not([hidden]), .client-quick-combobox-list:not([hidden]), .aff-dd-list:not([hidden]), .earn-help:not([hidden]), .report-group-menu, [data-rp-inline-tooltip]:not([hidden])'));
  }

  /* Esc contract: reuse the page's own close path. The header close button is the
   * universal escape hatch — its data-* handler already clears state, rerenders
   * and restores focus. onClose() remains for drawers without a close button. */
  function closeViaPage(root) {
    const btn = root.querySelector(".aff-drawer-close, header button[data-rp-action='close'], header button[data-earn-action='close'], header button[data-sc-action='close'], header button[data-withdraw-action='close'], header button[data-sim-close], header .finance-drawer-close");
    if (btn) { btn.click(); return; }
    const opts = root.__affDrawer;
    if (opts && typeof opts.onClose === "function") opts.onClose("escape");
  }

  function returnFocus(root) {
    const opts = root.__affDrawer || {};
    if (!opts.returnFocus) return;
    const target = typeof opts.returnFocus === "function" ? opts.returnFocus() : document.querySelector(opts.returnFocus);
    if (target && target.focus) target.focus();
  }

  function unlockScroll() {
    document.body.style.overflow = "";
  }

  /* After a drawer is (re)rendered into the DOM, call focusIn to apply the
   * open-focus contract. */
  function focusIn(root) {
    if (!root) return;
    const opts = root.__affDrawer || {};
    if (opts.lockScroll) document.body.style.overflow = "hidden";
    const target = opts.initialFocus
      ? (typeof opts.initialFocus === "function" ? root.querySelector(opts.initialFocus()) || root.querySelector(".aff-drawer-close") : root.querySelector(opts.initialFocus) || root.querySelector(".aff-drawer-close"))
      : root.querySelector(".aff-drawer-close");
    if (target && target.focus) target.focus();
  }

  document.addEventListener("keydown", onKeydown, true);

  /* Auto-wiring: after each render pass, any freshly mounted .aff-drawer gets the
   * focus contract applied (open focuses close button / configured target).
   * Pages that need custom hooks re-call AFF.drawer.bind(root, opts) on their own
   * (options survive re-renders via the root element reference). */
  function afterRender() {
    const root = activeDrawer();
    if (!root) return;
    if (root.__affDrawerWired) return;
    root.__affDrawerWired = true;
    focusIn(root);
  }

  new MutationObserver(afterRender).observe(document.documentElement, { childList: true, subtree: true });

  window.AFF = window.AFF || {};
  window.AFF.drawer = {
    bind,
    focusIn,
    version: "1.0.0"
  };
})();
