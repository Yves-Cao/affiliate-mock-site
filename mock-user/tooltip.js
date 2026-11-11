/* Affiliate unified tooltip positioning utility (D-04, v1.0.0).
 * One placement algorithm for every floating help/tooltip panel:
 *  - horizontal: align to trigger (left edge by default), clamped to viewport
 *  - vertical: below preferred, flip above when there is more room / below overflows
 *  - optional container bounds (drawer header/footer limits)
 * Panels and their show/hide logic stay page-owned; only the geometry is shared. */
(function () {
  "use strict";

  /* position(panel, trigger, options)
   * options.width    : px, clamped to viewport-24 (default 380)
   * options.align    : "left" (panel's left = trigger's left) | "center"
   * options.bounds   : { top, bottom } px limits (e.g. drawer header/footer)
   * options.gap      : px gap from trigger (default 8)
   * Returns the panel (for chaining). */
  function position(panel, trigger, options) {
    const opts = Object.assign({ width: 380, align: "left", bounds: null, gap: 8 }, options);
    const width = Math.min(opts.width, window.innerWidth - 24);
    panel.style.width = `${width}px`;
    const box = trigger.getBoundingClientRect();
    const left = opts.align === "center"
      ? Math.max(12, Math.min(box.left + box.width / 2 - width / 2, window.innerWidth - width - 12))
      : opts.align === "right"
        ? Math.max(12, Math.min(box.right - width, window.innerWidth - width - 12))
        : Math.max(12, Math.min(box.left, window.innerWidth - width - 12));
    panel.style.left = `${left}px`;
    const topLimit = opts.bounds ? opts.bounds.top + opts.gap : 12;
    const bottomLimit = opts.bounds ? opts.bounds.bottom - opts.gap : window.innerHeight - 12;
    const below = box.bottom + opts.gap;
    const fitsBelow = below + panel.offsetHeight <= bottomLimit;
    const roomAbove = box.top - opts.gap - panel.offsetHeight >= topLimit;
    const showBelow = fitsBelow || !roomAbove;
    let top = showBelow
      ? Math.max(topLimit, Math.min(below, bottomLimit - panel.offsetHeight))
      : Math.max(topLimit, box.top - panel.offsetHeight - opts.gap);
    // Never cover the trigger: when the clamped position still overlaps the
    // trigger's band (full-width touch panels), push below it if any room, else above.
    if (top < box.bottom && top + panel.offsetHeight > box.top) {
      const pushBelow = bottomLimit - (box.bottom + opts.gap) >= 80;
      top = pushBelow
        ? Math.min(box.bottom + opts.gap, bottomLimit - panel.offsetHeight)
        : Math.max(topLimit, box.top - panel.offsetHeight - opts.gap);
    }
    panel.style.top = `${top}px`;
    return panel;
  }

  window.AFF = window.AFF || {};
  window.AFF.tooltip = { position, version: "1.0.0" };
})();
