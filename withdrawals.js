(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const labels = {
    paid: ["已支付", "Paid", "ok"], processing: ["处理中", "Processing", "info"],
    rejected: ["已拒绝", "Rejected", "danger"], failed: ["支付失败", "Payment failed", "danger"],
    cancelled: ["已取消", "Cancelled", "muted"]
  };
  const reasons = {
    paid: ["款项已完成支付，请以收款账户实际入账为准。", "Payment is complete. Check your receiving account for the actual credit."],
    processing: ["申请正在处理中，支付结果尚未返回。", "The request is being processed. The payment result is not yet available."],
    rejected: ["收款资料未通过核验，请核对账户姓名与收款信息。", "Receiving details could not be verified. Check the account name and receiving information."],
    failed: ["收款账户暂时无法接收款项，需进一步核对收款信息。", "The receiving account could not accept the payment. Receiving details require review."],
    cancelled: ["该笔申请已取消，未完成支付。", "This request was cancelled and no payment was completed."]
  };
  const money = amount => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  const initial = new WeakSet();
  let focusBack = null;
  const sourceStatus = { 已支付: "paid", 处理中: "processing", 已拒绝: "rejected" };
  const baseline = AFF.withdrawals.map((row, index) => ({
    id: `WD202610${String(1001 + index)}`, date: row.date,
    method: row.method === "电汇" ? "wire" : "other",
    amount: Number(row.amount.replace(/[^0-9.]/g, "")), status: sourceStatus[row.status],
    receiver: "A*** P***", account: "**** 6621", sourceNote: row.note, original: true
  }));
  const extra = Array.from({ length: 28 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 9, 26 - index * 2)).toISOString().slice(0, 10);
    return {
      id: `WD${date.replaceAll("-", "")}${String(2001 + index)}`, date,
      method: index % 5 === 0 ? "other" : "wire",
      amount: 350 + (index * 173) % 2400,
      status: ["processing", "paid", "paid", "rejected", "failed", "cancelled"][index % 6],
      receiver: "A*** P***", account: `**** ${index % 3 ? "6621" : "0837"}`, sourceNote: "", original: false
    };
  });
  const records = [...baseline, ...extra].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const defaults = () => ({ from: "", to: "", status: "", method: "", search: "" });
  function state() {
    AFF.state.withdrawalRecords ||= { filters: defaults(), page: 1, pageSize: 10 };
    const s = AFF.state.withdrawalRecords;
    if (!initial.has(s)) {
      s.filters = { ...defaults(), ...s.filters }; s.draft = { ...s.filters };
      s.detail = null; s.error = ""; initial.add(s);
    }
    return s;
  }
  function filteredRows() {
    const f = state().filters;
    return records.filter(row => (!f.from || row.date >= f.from) && (!f.to || row.date <= f.to) &&
      (!f.status || row.status === f.status) && (!f.method || row.method === f.method) &&
      (!f.search || row.id.toLowerCase().includes(f.search.trim().toLowerCase())));
  }
  const method = row => row.method === "wire" ? t("电汇", "Bank transfer") : t("其他", "Other");
  const badge = row => `<span class="tag tag-${labels[row.status][2]}">${t(...labels[row.status])}</span>`;
  function note(row) {
    if (row.original && row.status === "rejected") return t(row.sourceNote, "Profile information is incomplete.");
    if (row.original && row.status === "processing") return t(row.sourceNote, "Payment channel is being confirmed.");
    return t(...reasons[row.status]);
  }
  function options(items, current) {
    return `<option value="">${t("全部", "All")}</option>${Object.entries(items).map(([value, text]) =>
      `<option value="${value}" ${value === current ? "selected" : ""}>${t(...text)}</option>`).join("")}`;
  }
  function filters() {
    const f = state().draft;
    return `<form class="wd-filters" data-withdraw-form novalidate>
      <label><span>${t("申请开始日期", "Request date from")}</span><input type="date" data-withdraw-filter="from" value="${h(f.from)}"></label>
      <label><span>${t("申请结束日期", "Request date to")}</span><input type="date" data-withdraw-filter="to" value="${h(f.to)}"></label>
      <label><span>${t("状态", "Status")}</span><select data-withdraw-filter="status">${options(labels, f.status)}</select></label>
      <label><span>${t("提现方式", "Method")}</span><select data-withdraw-filter="method">${options({ wire: ["电汇", "Bank transfer"], other: ["其他", "Other"] }, f.method)}</select></label>
      <label class="wd-search"><span>${t("申请编号", "Request ID")}</span><input type="search" data-withdraw-filter="search" value="${h(f.search)}" placeholder="${t("搜索申请编号", "Search request ID")}" maxlength="80"></label>
      <div class="wd-filter-actions"><button class="button primary" type="submit">${t("查询", "Search")}</button><button class="button secondary" type="button" data-withdraw-action="reset">${t("重置", "Reset")}</button></div>
      <p id="wd-filter-error" role="alert">${h(state().error)}</p>
    </form>`;
  }
  function table(rows) {
    const s = state();
    const pages = Math.max(1, Math.ceil(rows.length / s.pageSize));
    s.page = Math.max(1, Math.min(s.page, pages));
    const visible = rows.slice((s.page - 1) * s.pageSize, s.page * s.pageSize);
    return `<div class="wd-table-scroll" role="region" aria-label="${t("提现记录", "Withdrawal records")}" tabindex="0"><table class="wd-table"><thead><tr>
      ${[t("申请编号", "Request ID"), t("申请日期", "Request date"), t("提现方式", "Method"), t("收款账户", "Receiving account"), t("申请金额", "Requested amount"), t("状态", "Status"), t("处理说明", "Processing note"), t("操作", "Action")].map(item => `<th scope="col">${item}</th>`).join("")}
      </tr></thead><tbody>${visible.length ? visible.map(row => `<tr><td>${h(row.id)}</td><td>${row.date}</td><td>${method(row)}</td><td>${h(row.account)}</td><td class="wd-money">${money(row.amount)}</td><td>${badge(row)}</td><td class="wd-note">${h(note(row))}</td><td><button class="button secondary small" type="button" data-withdraw-detail="${row.id}">${t("详情", "Details")}</button></td></tr>`).join("") :
      `<tr><td colspan="8" class="wd-empty"><strong>${t("暂无提现记录", "No withdrawal records")}</strong><p>${t("请调整筛选条件后查询。", "Adjust your filters and search again.")}</p></td></tr>`}</tbody></table></div>
      <footer class="table-footer wd-footer"><span>${t("共", "Total")} <b data-withdraw-total>${rows.length}</b> ${t("条记录", "records")}</span><div class="wd-pagination"><label>${t("每页", "Per page")} <select data-withdraw-page-size aria-label="${t("每页条数", "Rows per page")}">${[10, 20, 50].map(size => `<option ${size === s.pageSize ? "selected" : ""}>${size}</option>`).join("")}</select></label><div class="pagination"><button type="button" data-withdraw-page="${s.page - 1}" aria-label="${t("上一页", "Previous page")}" ${s.page <= 1 ? "disabled" : ""}>‹</button><span>${s.page} / ${pages}</span><button type="button" data-withdraw-page="${s.page + 1}" aria-label="${t("下一页", "Next page")}" ${s.page >= pages ? "disabled" : ""}>›</button></div></div></footer>`;
  }
  function field(label, value) {
    return `<div><dt>${h(label)}</dt><dd>${h(value)}</dd></div>`;
  }
  function drawer() {
    const row = records.find(item => item.id === state().detail);
    if (!row) return "";
    const terminal = row.status !== "processing";
    return `<div class="wd-overlay" data-withdraw-action="close"></div><aside class="wd-drawer" role="dialog" aria-modal="true" aria-labelledby="wd-detail-title">
      <header><div><h2 id="wd-detail-title">${t("提现详情", "Withdrawal details")}</h2><span>${row.id}</span></div><button class="wd-close" data-withdraw-action="close" type="button" aria-label="${t("关闭详情", "Close details")}">×</button></header>
      <div class="wd-detail-body"><section class="wd-detail-amount"><span>${t("申请金额", "Requested amount")}</span><strong>${money(row.amount)}</strong>${badge(row)}</section>
      <section><h3>${t("处理状态", "Processing status")}</h3><p class="wd-status-note">${h(note(row))}</p><ol class="wd-timeline"><li><strong>${t("申请已记录", "Request recorded")}</strong><span>${row.date}</span></li><li><strong>${terminal ? t(...labels[row.status]) : t("等待处理结果", "Awaiting processing result")}</strong><span>${terminal ? t("处理时间未提供", "Processing time unavailable") : t("处理完成后更新结果", "The result will be updated after processing")}</span></li></ol></section>
      <section><h3>${t("申请信息", "Request information")}</h3><dl class="wd-details">${field(t("申请编号", "Request ID"), row.id)}${field(t("申请日期", "Request date"), row.date)}${field(t("币种", "Currency"), "USD")}${field(t("提现方式", "Method"), method(row))}${field(t("手续费", "Fee"), t("未提供", "Not provided"))}${field(t("实际到账金额", "Amount received"), t("未提供，以收款记录为准", "Not provided; check receiving records"))}</dl></section>
      <section><h3>${t("收款信息", "Receiving information")}</h3><dl class="wd-details">${field(t("收款人", "Recipient"), row.receiver)}${field(t("收款账户", "Receiving account"), row.account)}</dl></section></div>
      <footer><button class="button secondary" type="button" data-withdraw-action="close">${t("关闭", "Close")}</button></footer></aside>`;
  }
  function renderPage() {
    const s = state();
    return `<div class="wd-page"><div class="tabs wd-tabs"><button type="button" class="${AFF.state.wdTab !== "records" ? "active" : ""}" data-withdraw-tab="withdraw">${t("出金", "Withdraw")}</button><button type="button" class="${AFF.state.wdTab === "records" ? "active" : ""}" data-withdraw-tab="records">${t("提现记录", "Withdrawal records")}</button></div>
      ${AFF.state.wdTab !== "records" ? `<section class="card"><div class="notice-panel"><strong>${t("出金方案确认后开放", "Withdrawals will open after the payment setup is confirmed")}</strong><p>${t("支付渠道与手续费待定；已确认不设最低提现门槛。", "Payment channels and fees are pending confirmation. No minimum withdrawal amount is required.")}</p></div></section>` :
      `<section class="card wd-records"><div class="wd-heading"><h2>${t("提现记录", "Withdrawal records")}</h2><span>${t("按申请日期由近到远排列", "Most recent requests first")}</span></div>${filters()}${table(filteredRows())}</section>`}${s.detail && AFF.state.wdTab === "records" ? drawer() : ""}</div>`;
  }
  function rerender(selector) {
    render();
    if (selector) document.querySelector(selector)?.focus();
  }
  function close() {
    state().detail = null; rerender(focusBack);
  }
  document.addEventListener("click", event => {
    if (AFF.state?.route !== "wd") return;
    const target = event.target.closest("[data-withdraw-tab],[data-withdraw-detail],[data-withdraw-action],[data-withdraw-page]");
    if (!target) return;
    const s = state(), d = target.dataset;
    if (d.withdrawTab) { AFF.state.wdTab = d.withdrawTab; s.detail = null; return rerender(`[data-withdraw-tab="${d.withdrawTab}"]`); }
    if (d.withdrawDetail) { focusBack = `[data-withdraw-detail="${d.withdrawDetail}"]`; s.detail = d.withdrawDetail; return rerender(".wd-close"); }
    if (d.withdrawPage) { s.page = Number(d.withdrawPage); return rerender(".wd-table-scroll"); }
    if (d.withdrawAction === "close") return close();
    if (d.withdrawAction === "reset") { s.filters = defaults(); s.draft = defaults(); s.page = 1; s.error = ""; rerender('[data-withdraw-filter="from"]'); }
  });
  const input = event => {
    if (AFF.state?.route === "wd" && event.target.matches("[data-withdraw-filter]")) state().draft[event.target.dataset.withdrawFilter] = event.target.value;
  };
  document.addEventListener("input", input);
  document.addEventListener("change", event => {
    input(event);
    if (AFF.state?.route !== "wd" || !event.target.matches("[data-withdraw-page-size]")) return;
    state().pageSize = Number(event.target.value); state().page = 1; rerender("[data-withdraw-page-size]");
  });
  function validDate(value) {
    return !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  }
  document.addEventListener("submit", event => {
    if (AFF.state?.route !== "wd" || !event.target.matches("[data-withdraw-form]")) return;
    event.preventDefault();
    const s = state(), f = s.draft;
    s.error = !validDate(f.from) || !validDate(f.to) || f.from && f.to && f.from > f.to
      ? t("请选择有效日期，开始日期不得晚于结束日期。", "Choose valid dates. The start date must not follow the end date.") : "";
    if (s.error) { document.querySelector("#wd-filter-error").textContent = s.error; return; }
    s.filters = { ...f }; s.page = 1; rerender('[data-withdraw-filter="from"]');
  });
  document.addEventListener("keydown", event => {
    if (AFF.state?.route !== "wd" || !state().detail) return;
    if (event.key === "Escape") { event.preventDefault(); return close(); }
    if (event.key !== "Tab") return;
    const buttons = [...document.querySelectorAll(".wd-drawer button")];
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus(); }
    else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus(); }
  });
  window.addEventListener("hashchange", () => { if (AFF.state?.withdrawalRecords) AFF.state.withdrawalRecords.detail = null; });
  AFF.withdrawalsUI = { state, records, filteredRows, renderPage };
  AFF.pages.wd = renderPage;
})();
