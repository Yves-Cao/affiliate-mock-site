/* Affiliate unified popover/menu runtime (D-03, v1.0.0 — user-approved recommendations).
 * One keyboard + pointer contract for every non-dropdown floating layer
 * (topbar menus, listbox pickers with search, inline option panels):
 *  - click / ArrowDown opens; click outside closes
 *  - Escape closes (stopPropagation so only the top layer reacts)
 *  - open focuses the layer's search input (if any) or its trigger
 *  - close returns focus to the trigger
 *  - only one aff-popover open at a time (opening one closes the others)
 * The DOM/visual stays page-owned; this runtime only standardizes behavior via
 * data attributes:
 *   data-aff-popover="<id>"        on the wrapper (trigger + panel)
 *   data-aff-popover-trigger       on the trigger button
 *   data-aff-popover-panel         on the floating panel
 *   data-aff-popover-search        optional search input inside the panel
 * Pages may open/close imperatively via AFF.popover.toggle(id, open). */
(function () {
  "use strict";

  const state = { open: null };          // id of the currently open popover
  const runtimeOwned = new Set();        // ids opened via toggle() (runtime-driven)

  function wrapperOf(id) {
    return document.querySelector(`[data-aff-popover="${id}"]`);
  }

  function parts(id) {
    const wrap = wrapperOf(id);
    if (!wrap) return {};
    return {
      wrap,
      trigger: wrap.querySelector("[data-aff-popover-trigger]"),
      panel: wrap.querySelector("[data-aff-popover-panel]"),
      search: wrap.querySelector("[data-aff-popover-search]")
    };
  }

  function setOpen(id, open) {
    const { wrap, trigger, panel } = parts(id);
    if (!wrap || !panel) return;
    // Idempotence guard: hovering handlers call toggle repeatedly; never re-run
    // when the layer is already in the target state (prevents focus-loop recursion).
    if (panel.hidden === !open) {
      if (open) {
        if (state.open && state.open !== id) setOpen(state.open, false);
        state.open = id;
        trigger?.setAttribute("aria-expanded", "true");
      }
      return;
    }
    if (open) {
      if (state.open && state.open !== id) setOpen(state.open, false);
      state.open = id;
      runtimeOwned.add(id);
      panel.hidden = false;
      trigger?.setAttribute("aria-expanded", "true");
      const { search } = parts(id);
      (search || trigger)?.focus();
    } else {
      if (state.open === id) state.open = null;
      runtimeOwned.delete(id);
      panel.hidden = true;
      trigger?.setAttribute("aria-expanded", "false");
    }
  }

  function toggle(id, force) {
    const { wrap } = parts(id);
    if (!wrap) return;
    const panel = wrap.querySelector("[data-aff-popover-panel]");
    const willOpen = typeof force === "boolean" ? force : panel.hidden;
    // Hover-enhanced menus call toggle(false) from their own outside-click paths;
    // only focus-return when this runtime actually owns the layer.
    const wasOwned = runtimeOwned.has(id);
    setOpen(id, willOpen);
    if (!willOpen && wasOwned) {
      const { trigger } = parts(id);
      trigger?.focus();
    }
  }

  function onDocClick(event) {
    if (!state.open || !runtimeOwned.has(state.open)) return;
    const wrap = wrapperOf(state.open);
    if (wrap && wrap.contains(event.target)) return;
    // Outside click closes WITHOUT stealing focus — focusing the trigger here
    // would loop with hover/focusin enhancers (wallet/account menus).
    const id = state.open;
    setOpen(id, false);
  }

  function onKeydown(event) {
    if (!state.open || !runtimeOwned.has(state.open)) return;
    const wrap = wrapperOf(state.open);
    if (!wrap) return;
    if (event.key === "Escape") {
      event.stopPropagation();
      const id = state.open;
      setOpen(id, false);
      const { trigger } = parts(id);
      trigger?.focus();
      return;
    }
    if (event.key === "ArrowDown" && event.target.hasAttribute?.("data-aff-popover-trigger")) {
      event.preventDefault();
      const { search, panel } = parts(state.open);
      const first = search || panel.querySelector('[role="option"], button, a[href]');
      first?.focus();
    }
  }

  document.addEventListener("click", onDocClick);
  document.addEventListener("keydown", onKeydown, true);

  window.AFF = window.AFF || {};
  window.AFF.popover = { toggle, open: id => toggle(id, true), close: () => state.open && toggle(state.open, false), state, version: "1.0.0" };
})();
