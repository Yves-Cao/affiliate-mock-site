(() => {
  "use strict";

  if (!document.body.classList.contains("admin-tables")) return;

  const generatedTitles = new WeakMap();
  const sizedTables = new WeakSet();
  const pendingTables = new Set();
  let frame = 0;

  function titleFor(element) {
    if (element.matches('[role="separator"], input, select, textarea') ||
        element.closest(".ac-action-panel")) return;
    const current = element.getAttribute("title");
    if (current && current !== generatedTitles.get(element)) return;
    const text = element.textContent.replace(/\s+/g, " ").trim();
    if (text) {
      element.title = text;
      generatedTitles.set(element, text);
    } else if (generatedTitles.has(element)) {
      element.removeAttribute("title");
      generatedTitles.delete(element);
    }
  }

  function prepareTable(table) {
    if (!table.isConnected) return;
    // Explicit colgroups remain authoritative for resizable tables.
    if (!sizedTables.has(table) && !table.querySelector("colgroup")) {
      const headers = [...(table.tHead?.rows[0]?.cells || [])];
      if (headers.length && headers.every(cell => cell.colSpan === 1)) {
        const minimum = headers.reduce((sum, cell) => {
          const declared = cell.style.width;
          const width = declared.endsWith("px") ? parseFloat(declared) : 0;
          return sum + (width || (cell.textContent.trim() === "操作" ? 160 : 128));
        }, 0);
        const existing = getComputedStyle(table).minWidth;
        table.style.setProperty("--admin-table-min-width",
          `${Math.max(minimum, existing.endsWith("px") ? parseFloat(existing) : 0)}px`);
        table.dataset.adminTableSized = "";
        sizedTables.add(table);
      }
    }
    table.querySelectorAll("th, td").forEach(cell => {
      if (!cell.querySelector(".ac-action-menu")) titleFor(cell);
      cell.querySelectorAll("a, button, code, small, strong, [class*='badge'], .cs-status, .tm-tag, .c360-status, .p360-tag")
        .forEach(titleFor);
    });
  }

  function enqueue(node) {
    if (!node) return;
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element) return;
    const table = element.closest("table");
    if (table) pendingTables.add(table);
    element.querySelectorAll("table").forEach(item => pendingTables.add(item));
    if (!frame && pendingTables.size) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        pendingTables.forEach(prepareTable);
        pendingTables.clear();
      });
    }
  }

  new MutationObserver(records => {
    records.forEach(record => {
      if (record.type === "characterData") enqueue(record.target);
      else {
        enqueue(record.target.closest?.("table"));
        record.addedNodes.forEach(enqueue);
      }
    });
  }).observe(document.body, {childList: true, characterData: true, subtree: true});

  enqueue(document.body);
})();
