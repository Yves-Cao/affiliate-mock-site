/* Affiliate unified pagination (D-02, v1.0.0 — user-confirmed 1A-8A).
 * One component for every table footer:
 *  - ellipsis page numbers + aria-current (4A: nav landmark)
 *  - SVG prev/next, accessible name 上一页/下一页 (en: Previous/Next page)
 *  - channel: data-aff-page="<n>" on every page button; page-size select
 *    data-aff-page-size (pages opt out with sizes:false)
 *  - total: 共 <b data-aff-total>N</b> 条记录
 *  - page clamping happens here
 * Pages keep their own delegated handlers; the generic channel works with the
 * bundled AFF.pagination.wire() helper for new integrations. */
(function () {
  "use strict";

  const t = (zh, en) => (document.documentElement.dataset.affLang === "en" ? en : zh);
  const SIZES = [10, 20, 50];

  function clamp(page, pages) {
    return Math.min(pages, Math.max(1, page));
  }

  function ellipsis(s, pages) {
    const wanted = [...new Set([1, s.page - 1, s.page, s.page + 1, pages])]
      .filter(value => value > 0 && value <= pages).sort((a, b) => a - b);
    let last = 0;
    return wanted.map(value => {
      const gap = value - last > 1 ? "<span>…</span>" : "";
      last = value;
      return `${gap}<button type="button" class="${s.page === value ? "active" : ""}" data-aff-page="${value}" ${s.page === value ? 'aria-current="page"' : ""}>${value}</button>`;
    }).join("");
  }

  /* component({ page, pageSize, total, channel, sizes })
   * channel: string prefix kept for page-owned state fields (informational only —
   * the DOM channel is always data-aff-page / data-aff-page-size / data-aff-total). */
  function component(options) {
    const opts = Object.assign({ page: 1, pageSize: 10, total: 0, channel: "", sizes: true }, options);
    const pages = Math.max(1, Math.ceil(opts.total / opts.pageSize));
    opts.page = clamp(opts.page, pages);
    const pageSizeSelect = opts.sizes
      ? `<label>${t("每页", "Per page")} <select data-aff-page-size aria-label="${t("每页条数", "Rows per page")}">${SIZES.map(value => `<option ${value === opts.pageSize ? "selected" : ""}>${value}</option>`).join("")}</select></label>`
      : "";
    return `<div class="table-footer aff-pagination-footer" data-aff-pagination="${h(opts.channel)}"><span>${t("共", "Total")} <b data-aff-total>${opts.total}</b> ${t("条记录", "rows")}</span>
      <div class="aff-pagination">${pageSizeSelect}
        <nav class="pagination" aria-label="${t("分页", "Pagination")}"><button type="button" data-aff-page="${clamp(opts.page - 1, pages)}" aria-label="${t("上一页", "Previous page")}" ${opts.page === 1 ? "disabled" : ""}>${svgLeft()}</button>
          ${ellipsis(opts, pages)}
          <button type="button" data-aff-page="${clamp(opts.page + 1, pages)}" aria-label="${t("下一页", "Next page")}" ${opts.page === pages ? "disabled" : ""}>${svgRight()}</button></nav>
      </div></div>`;
  }

  const h = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const svgLeft = () => '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4 6 8l4 4"/></svg>';
  const svgRight = () => '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l4 4-4 4"/></svg>';

  /* Optional generic wiring: listens for data-aff-page clicks + page-size changes
   * inside a footer marked data-aff-pagination="<channel>", calls back with the
   * new page / pageSize. Pages with existing handlers keep them instead. */
  function wire(channel, onPage, onSize) {
    document.addEventListener("click", event => {
      const btn = event.target.closest(`[data-aff-pagination="${channel}"] [data-aff-page]`);
      if (!btn || btn.disabled) return;
      onPage(Number(btn.dataset.affPage));
    });
    if (onSize) {
      document.addEventListener("change", event => {
        const sel = event.target.closest(`[data-aff-pagination="${channel}"] [data-aff-page-size]`);
        if (!sel) return;
        const value = Number(sel.value);
        if (!SIZES.includes(value)) return;
        onSize(value);
      });
    }
  }

  /* Focus contract (4A): after a page change, focus the pagination nav; after a
   * page-size change, focus stays on the select (the page rerender refocuses it). */
  function focusNav(channel) {
    const nav = document.querySelector(`[data-aff-pagination="${channel}"] nav.pagination`);
    if (nav) {
      if (!nav.hasAttribute("tabindex")) nav.setAttribute("tabindex", "-1");
      nav.focus();
    }
  }

  window.AFF = window.AFF || {};
  window.AFF.pagination = { component, wire, focusNav, clamp, version: "1.0.0" };
})();
