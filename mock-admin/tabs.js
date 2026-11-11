/* Affiliate unified tabs keyboard enhancement (D-05, v1.0.0).
 * Recommendation applied: every role="tablist" gets the auth-tabs keyboard model —
 * ArrowLeft/ArrowRight move focus and activate the tab, Home/End jump to the ends.
 * Tabs themselves stay page-owned (active class / state); this adds the missing
 * keyboard + ARIA wiring uniformly. Tabs without role="tab" are upgraded
 * automatically when their container has role="tablist" (wd-tabs, sim-tabs). */
(function () {
  "use strict";

  function tablistOf(node) {
    return node && node.closest ? node.closest('[role="tablist"]') : null;
  }

  function tabsOf(list) {
    return Array.from(list.querySelectorAll("button")).filter(btn => !btn.disabled);
  }

  function activate(btn) {
    if (btn.getAttribute("role") === "tab" && btn.getAttribute("aria-selected") === "true") {
      btn.focus();
      return;
    }
    btn.focus();
    btn.click();
  }

  function onKeydown(event) {
    const list = tablistOf(event.target);
    if (!list) return;
    const tabs = tabsOf(list);
    if (!tabs.length) return;
    const current = tabs.indexOf(document.activeElement);
    if (current < 0) return;
    let target = -1;
    switch (event.key) {
      case "ArrowRight": target = (current + 1) % tabs.length; break;
      case "ArrowLeft": target = (current - 1 + tabs.length) % tabs.length; break;
      case "Home": target = 0; break;
      case "End": target = tabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    activate(tabs[target]);
  }

  document.addEventListener("keydown", onKeydown);

  /* Upgrade pass: ensure buttons inside a tablist carry role="tab" + aria-selected,
   * mirroring the .active class (runs after every render via MutationObserver). */
  function upgrade() {
    document.querySelectorAll('[role="tablist"]').forEach(list => {
      tabsOf(list).forEach(btn => {
        if (btn.getAttribute("role") !== "tab") btn.setAttribute("role", "tab");
        const selected = btn.classList.contains("active") || btn.getAttribute("aria-selected") === "true";
        btn.setAttribute("aria-selected", String(selected));
        btn.setAttribute("tabindex", selected ? "0" : "-1");
      });
    });
  }

  new MutationObserver(() => upgrade()).observe(document.documentElement, { childList: true, subtree: true });

  window.AFF = window.AFF || {};
  window.AFF.tabs = { version: "1.0.0" };
})();
