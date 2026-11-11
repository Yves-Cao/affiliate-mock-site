(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const routeLabels = {
    perf: ["业绩数据", "Performance"],
    summary: ["总览数据", "General statistics"],
    clients: ["客户数据", "Client data"]
  };
  const statuses = {
    processing: ["生成中", "Processing", "info"],
    ready: ["已生成", "Ready", "ok"],
    failed: ["生成失败", "Failed", "danger"],
    expired: ["已过期", "Expired", "muted"]
  };

  function seedTasks() {
    return [
      {
        id: "EXP-0002", route: "clients", format: "CSV", status: "failed",
        range: "2026-10-01 — 2026-10-27", rows: 267, createdAt: "2026-11-04 16:20",
        expiresAt: "-", reason: "", auditId: "AUD-EXP-0002"
      },
      {
        id: "EXP-0001", route: "perf", format: "CSV", status: "expired",
        range: "2026-09-01 — 2026-09-30", rows: 312, createdAt: "2026-11-03 10:12",
        expiresAt: "2026-11-04 10:12", reason: "", auditId: "AUD-EXP-0001"
      }
    ];
  }

  function tasks() {
    if (!Array.isArray(AFF.state.exportTasks) || AFF.state.exportSeedVersion !== 2) {
      const custom = Array.isArray(AFF.state.exportTasks)
        ? AFF.state.exportTasks.filter(item => item.id.startsWith("EXP-U"))
        : [];
      AFF.state.exportTasks = [...custom, ...seedTasks()];
      AFF.state.exportSeedVersion = 2;
    }
    return AFF.state.exportTasks;
  }

  function tag(status) {
    const item = statuses[status] || [status, status, "muted"];
    return `<span class="tag tag-${item[2]}">${h(t(item[0], item[1]))}</span>`;
  }

  function settle(task) {
    if (task.status !== "processing" || !task.createdAtMs) return;
    if (Date.now() - task.createdAtMs < 750) return;
    task.status = task.failOnComplete ? "failed" : "ready";
    task.createdAtMs = 0;
    if (task.status === "ready") task.expiresAt = "24小时后";
  }

  function create() {
    if (!["perf", "summary", "clients"].includes(AFF.state.route)) return;
    const snapshot = AFF.reports.exportCsv();
    const existing = tasks();
    const task = {
      id: `EXP-U${String(existing.length + 1).padStart(4, "0")}`,
      route: AFF.state.route,
      format: "CSV",
      status: "processing",
      range: `${AFF.reports.state().filters.from} — ${AFF.reports.state().filters.to}`,
      rows: snapshot.rows,
      createdAt: `${AFF.finance.asOf} ${new Date().toTimeString().slice(0, 8)}`,
      createdAtMs: Date.now(),
      expiresAt: "-",
      reason: "",
      auditId: `AUD-EXP-U${String(existing.length + 1).padStart(4, "0")}`,
      csv: snapshot.csv,
      filename: snapshot.filename,
      failOnComplete: existing.length % 4 === 3
    };
    existing.unshift(task);
    persist();
    showToast(t("导出任务已创建", "Export task created"));
    render();
    setTimeout(() => {
      settle(task);
      persist();
      if (["perf", "summary", "clients", "export"].includes(AFF.state.route)) render();
    }, 800);
    document.querySelector("[data-export-action='create']")?.focus();
  }

  function retry(id) {
    const task = tasks().find(item => item.id === id);
    if (!task || task.status !== "failed") return;
    task.status = "processing";
    task.createdAtMs = Date.now();
    task.failOnComplete = false;
    task.reason = "";
    persist();
    render();
    document.querySelector(`[data-export-task='${id}'] [data-export-action='retry']`)?.focus();
    setTimeout(() => {
      task.status = "ready";
      task.createdAtMs = 0;
      task.expiresAt = "24小时后";
      persist();
      if (["perf", "summary", "clients", "export"].includes(AFF.state.route)) render();
    }, 800);
  }

  function download(id) {
    const task = tasks().find(item => item.id === id);
    if (!task || task.status !== "ready") return;
    const csv = task.csv || AFF.reports.exportCsv().csv;
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = task.filename || `${task.route}-export.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    task.downloads = (task.downloads || 0) + 1;
    persist();
    showToast(t("导出文件已下载", "Export file downloaded"));
    render();
    document.querySelector(`[data-export-task='${id}'] [data-export-action='download']`)?.focus();
  }

  function stats() {
    const rows = tasks();
    return [
      [t("生成中", "Processing"), rows.filter(item => item.status === "processing").length],
      [t("可下载", "Ready"), rows.filter(item => item.status === "ready").length],
      [t("失败", "Failed"), rows.filter(item => item.status === "failed").length],
      [t("已过期", "Expired"), rows.filter(item => item.status === "expired").length]
    ];
  }

  function panel() {
    if (!["perf", "summary", "clients"].includes(AFF.state.route)) return "";
    /* D-EXPORT-PAGE: data pages keep only the create entry + jump link;
     * the task list lives on the standalone export center page. */
    const ready = tasks().filter(item => item.status === "ready").length;
    const failed = tasks().filter(item => item.status === "failed").length;
    return `<section class="card export-entry" aria-label="${t("导出", "Export")}">
      <div class="export-entry-row">
        <span>${t("导出全部匹配记录，不受当前分页限制", "Exports all matched rows, not only the current page")}</span>
        <div class="export-entry-actions">
          ${ready ? `<button class="button secondary small" type="button" data-route="export">${t("可下载", "Ready")} ${ready}</button>` : ""}
          ${failed ? `<button class="button secondary small" type="button" data-route="export">${t("失败", "Failed")} ${failed}</button>` : ""}
          <button class="button secondary small" type="button" data-route="export">${t("导出中心", "Export center")}</button>
          <button class="button primary small" type="button" data-export-action="create">${t("创建导出", "Create export")}</button>
        </div>
      </div>
    </section>`;
  }

  /* D-EXPORT-PAGE (2026-11-07): standalone route aggregating every async
   * export task across sources, with status + source filters. */
  function exportFilter() {
    AFF.state.exportPageFilter ||= { status: "", source: "" };
    return AFF.state.exportPageFilter;
  }

  function page() {
    const rows = tasks();
    rows.forEach(settle);
    const filter = exportFilter();
    const filtered = rows.filter(task =>
      (!filter.status || task.status === filter.status) &&
      (!filter.source || task.route === filter.source));
    const statusOptions = [["", t("全部状态", "All statuses")], ...Object.entries(statuses).map(([key, item]) => [key, t(item[0], item[1])])];
    const sourceOptions = [["", t("全部来源", "All sources")], ...Object.entries(routeLabels).map(([key, item]) => [key, t(...item)])];
    return `<div class="page export-page">
      ${AFF.helpers.pageHeader("导出中心", "集中处理所有页面的异步导出任务；文件24小时后过期，操作全程审计。")}
      <div class="toolbar export-toolbar">
        <label class="field"><span>${t("状态", "Status")}</span>
          <select data-export-filter="status">${statusOptions.map(([value, text]) => `<option value="${h(value)}" ${filter.status === value ? "selected" : ""}>${h(text)}</option>`).join("")}</select>
        </label>
        <label class="field"><span>${t("来源页面", "Source page")}</span>
          <select data-export-filter="source">${sourceOptions.map(([value, text]) => `<option value="${h(value)}" ${filter.source === value ? "selected" : ""}>${h(text)}</option>`).join("")}</select>
        </label>
        <button class="button secondary" type="button" data-export-action="reset-filters">${t("重置", "Reset")}</button>
      </div>
      <div class="export-stats">${stats().map(([label, value]) => `<span>${h(label)}<b>${value}</b></span>`).join("")}</div>
      <div class="export-table-wrap"><table>
        <thead><tr><th>${t("任务编号", "Task ID")}</th><th>${t("页面", "Page")}</th><th>${t("范围", "Range")}</th><th>${t("记录数", "Rows")}</th><th>${t("状态", "Status")}</th><th>${t("创建时间", "Created")}</th><th>${t("过期时间", "Expiry")}</th><th>${t("说明", "Note")}</th><th>${t("操作", "Action")}</th></tr></thead>
        <tbody>${filtered.length ? filtered.map(task => `<tr data-export-task="${h(task.id)}">
          <td>${h(task.id)}<small>${h(task.auditId)}</small></td>
          <td>${h(routeLabels[task.route] ? t(...routeLabels[task.route]) : task.route)}</td>
          <td>${h(task.range)}</td>
          <td>${task.rows}</td>
          <td>${tag(task.status)}</td>
          <td>${h(task.createdAt)}</td>
          <td>${h(task.expiresAt)}</td>
          <td>${task.status === "failed" ? h(task.reason || t("生成失败，可重试", "Failed; retry available")) : task.status === "expired" ? t("文件已过期，请重新创建", "File expired; create again") : t("邮箱等联系方式保持脱敏", "Contact data stays masked")}</td>
          <td><div class="wd-row-actions">
            <button class="button secondary small" type="button" data-export-action="download" data-export-id="${h(task.id)}" ${task.status === "ready" ? "" : "disabled"}>${t("下载", "Download")}</button>
            <button class="button secondary small" type="button" data-export-action="retry" data-export-id="${h(task.id)}" ${task.status === "failed" ? "" : "disabled"}>${t("重试", "Retry")}</button>
          </div></td>
        </tr>`).join("") : `<tr><td colspan="9" class="finance-empty"><strong>${t("暂无导出任务", "No export tasks")}</strong><p>${t("在业绩、客户或总览数据页创建导出，任务会汇总到此处。", "Create exports from performance, client or summary pages; tasks aggregate here.")}</p></td></tr>`}</tbody>
      </table></div>
      <p class="export-footnote">${t("导出文件24小时后过期；创建、下载和失败重试均写入审计。新的导出任务请在各数据页面发起。", "Export files expire after 24 hours; creation, download, and retry are audited. Start new exports from each data page.")}</p>
    </div>`;
  }

  document.addEventListener("click", event => {
    const target = event.target.closest("[data-export-action]");
    if (!target) return;
    const action = target.dataset.exportAction;
    if (action === "create") return create();
    if (action === "download" && !target.disabled) return download(target.dataset.exportId);
    if (action === "retry" && !target.disabled) return retry(target.dataset.exportId);
    if (action === "reset-filters" && AFF.state?.route === "export") {
      AFF.state.exportPageFilter = { status: "", source: "" };
      render();
      document.querySelector("[data-export-filter='status']")?.focus();
    }
  });

  document.addEventListener("change", event => {
    const node = event.target.closest("[data-export-filter]");
    if (!node || AFF.state?.route !== "export") return;
    exportFilter()[node.dataset.exportFilter] = node.value;
    render();
    node.focus();
  });

  AFF.pages.export = page;

  AFF.exportCenter = { panel, page, tasks, create, retry, download };
})();
