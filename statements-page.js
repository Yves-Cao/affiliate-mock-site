(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  const cents = value => Math.round(Number(value) * 100);
  const dollars = value => Number((value / 100).toFixed(2));
  const statusLabels = {
    generated: ["已生成", "Generated", "ok"],
    reviewing: ["审核中", "Reviewing", "info"],
    confirmed: ["已确认", "Confirmed", "ok"],
    cancelled: ["已取消", "Cancelled", "danger"]
  };
  let detailReturnFocus = null;

  function monthStart(value) { return `${value.slice(0, 7)}-01`; }
  function timestamp(date = new Date()) {
    return date.toLocaleString("sv-SE", { hour12: false });
  }
  function nextMonthStart(value) {
    const date = new Date(`${monthStart(value)}T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + 1);
    return date.toISOString().slice(0, 10);
  }
  function monthEnd(value) {
    const date = new Date(`${nextMonthStart(value)}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
  }

  function periods() {
    return AFF.finance.statementBatches.map(item => item.id);
  }

  function defaultPeriod() {
    return periods().at(-1) || "";
  }

  function defaults() {
    return { period: defaultPeriod(), status: "", detail: "", downloadConfirm: "", downloads: [], overrides: {} };
  }

  function state() {
    AFF.state.statementsPage = { ...defaults(), ...(AFF.state.statementsPage || {}) };
    if (!Array.isArray(AFF.state.statementsPage.downloads)) AFF.state.statementsPage.downloads = [];
    if (!AFF.state.statementsPage.overrides) AFF.state.statementsPage.overrides = {};
    return AFF.state.statementsPage;
  }

  function availableAt(date) {
    const generated = AFF.finance.availableLots
      .filter(lot => lot.date <= date)
      .reduce((sum, lot) => sum + lot.amount, 0);
    const withdrawn = AFF.finance.allWithdrawals()
      .filter(order => order.date <= date && !["failed", "timeout", "closed", "rejected"].includes(order.status))
      .reduce((sum, order) => sum + order.allocations.reduce((total, item) => total + item.amount, 0), 0);
    return generated - withdrawn;
  }

  function buildStatement(statementId) {
    const source = AFF.finance.statementBatches.find(item => item.id === statementId);
    if (!source) return null;
    const withdrawal = AFF.finance.allWithdrawals().find(item => item.id === source.withdrawalId);
    const status = source.statementStatus || "generated";
    const withdrawalPaid = withdrawal?.status === "paid" ? (withdrawal.amount || 0) : 0;
    const withdrawalProcessing = withdrawal && ["pending_review", "approved", "processing"].includes(withdrawal.status) ? withdrawal.amount : 0;
    const failedReturned = withdrawal && ["failed", "timeout", "returned", "rejected"].includes(withdrawal.status) ? withdrawal.amount : 0;
    const gross = source.grossAmount / 100;
    const tax = source.taxAmount / 100;
    const guaranteeRetained = source.guaranteeAmount / 100;
    const guaranteeReleased = 0;
    const reversalUsed = 0;
    const opening = 0;
    const credited = source.availableAmount / 100;
    const expectedChange = Number((credited - withdrawalPaid / 100 - withdrawalProcessing / 100 + failedReturned / 100).toFixed(2));
    const closing = Math.max(0, Number((opening + expectedChange).toFixed(2)));
    const netChange = Number((closing - opening).toFixed(2));
    const balanced = Math.abs(netChange - expectedChange) < 0.01;
    return {
      period: source.id, statementId: source.id, withdrawalId: source.withdrawalId,
      from: source.settledAt, to: source.settledAt,
      status, version: 1,
      opening, closing, netChange, expectedChange,
      gross, tax, guaranteeRetained, guaranteeReleased, reversalUsed,
      withdrawalPaid: withdrawalPaid / 100, withdrawalProcessing: withdrawalProcessing / 100,
      failedReturned: failedReturned / 100,
      balanced,
      generatedAt: source.settledAt,
      ruleVersion: source.ruleVersion || AFF.finance.configuration.version,
      settlementCount: source.commissionCaseIds.length,
      withdrawalCount: 1
    };
  }

  function records() {
    const s = state();
    return periods()
      .map(buildStatement)
      .filter(Boolean)
      .filter(row => !s.status || row.status === s.status)
      .sort((left, right) => right.period.localeCompare(left.period));
  }

  function selected() {
    const s = state();
    return buildStatement(s.period);
  }

  function tag(status) {
    const item = statusLabels[status] || [status, status, "muted"];
    return `<span class="tag tag-${item[2]}">${h(t(item[0], item[1]))}</span>`;
  }

  function field(name, value) {
    return `<div><dt>${h(name)}</dt><dd>${h(value)}</dd></div>`;
  }

  function csv(row) {
    const headers = ["Period", "Status", "Version", "Opening", "Gross commission", "Tax", "Guarantee retained", "Guarantee released", "Reversal offset", "Withdrawal paid", "Withdrawal processing", "Closing", "Balance check"];
    const values = [row.period, row.status, row.version, row.opening, row.gross, row.tax, row.guaranteeRetained, row.guaranteeReleased, row.reversalUsed, row.withdrawalPaid, row.withdrawalProcessing, row.closing, row.balanced ? "balanced" : "check"];
    return [headers, values].map(list => list.join(",")).join("\n");
  }

  function pdf(row) {
    const lines = [
      "Affiliate CPA Statement",
      `Period: ${row.period}`,
      `Version: ${row.version}`,
      `Opening available: ${row.opening}`,
      `Gross commission: ${row.gross}`,
      `Tax: ${row.tax}`,
      `Guarantee retained: ${row.guaranteeRetained}`,
      `Guarantee released: ${row.guaranteeReleased}`,
      `Reversal offset: ${row.reversalUsed}`,
      `Withdrawal paid: ${row.withdrawalPaid}`,
      `Withdrawal processing: ${row.withdrawalProcessing}`,
      `Closing available: ${row.closing}`,
      `Balance check: ${row.balanced ? "balanced" : "check"}`
    ];
    const content = lines.map((line, index) => `BT /F1 11 Tf 50 ${760 - index * 20} Td (${line.replace(/[\\()]/g, "")}) Tj ET`).join("\n");
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let index = 1; index <= objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return pdf;
  }

  function download(row, format) {
    const downloadedAt = new Date();
    const isPdf = format === "pdf";
    const content = isPdf ? pdf(row) : `\ufeff${csv(row)}`;
    const blob = new Blob([content], { type: isPdf ? "application/pdf" : "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `affiliate-statement-${row.period}-v${row.version}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    const s = state();
    s.downloadConfirm = "";
    s.downloads.unshift({
      id: `DL-${row.period}-${String(s.downloads.length + 1).padStart(3, "0")}`,
      period: row.period, format, version: row.version,
      downloadedAt: timestamp(downloadedAt),
      expiresAt: timestamp(new Date(downloadedAt.getTime() + 86400000)),
      auditId: `AUD-${row.period}-${String(s.downloads.length + 1).padStart(4, "0")}`
    });
    showToast(t("结算单已下载，记录已审计", "Statement downloaded and audited"));
    render();
  }

  function statsCard(row) {
    return `<div class="cards statement-cards">
      <article class="card metric"><span>${t("期初可提现", "Opening available")}</span><strong>${money(row.opening)}</strong><small>${row.from}</small></article>
      <article class="card metric"><span>${t("本期新增可提现", "New available")}</span><strong>${money(row.gross - row.tax - row.guaranteeRetained + row.guaranteeReleased - row.reversalUsed)}</strong><small>${t("结算放行净额", "Net settlement release")}</small></article>
      <article class="card metric"><span>${t("本期提现", "Withdrawals")}</span><strong>${money(row.withdrawalPaid + row.withdrawalProcessing)}</strong><small>${t("成功与支付中", "Paid and processing")}</small></article>
      <article class="card metric"><span>${t("期末可提现", "Closing available")}</span><strong>${money(row.closing)}</strong><small>${row.to}</small></article>
    </div>`;
  }

  function filters() {
    const s = state();
    return `<div class="statement-filters">
      <label><span>${t("结算单编号", "Statement ID")}</span><select data-statement-filter="period">${periods().map(period => `<option value="${period}" ${period === s.period ? "selected" : ""}>${period}</option>`).join("")}</select></label>
      <label><span>${t("状态", "Status")}</span><select data-statement-filter="status"><option value="">${t("全部", "All")}</option>${Object.entries(statusLabels).map(([key, item]) => `<option value="${key}" ${key === s.status ? "selected" : ""}>${t(item[0], item[1])}</option>`).join("")}</select></label>
      <button class="button secondary" type="button" data-statement-action="reset">${t("重置", "Reset")}</button>
    </div>`;
  }

  function table(rows) {
    return `<div class="statement-table-wrap"><table>
      <thead><tr><th>${t("结算单编号", "Statement ID")}</th><th>${t("状态", "Status")}</th><th>${t("期初", "Opening")}</th><th>${t("佣金", "Commission")}</th><th>${t("税费", "Tax")}</th><th>${t("保证金变动", "Guarantee change")}</th><th>${t("冲正", "Reversal")}</th><th>${t("提现", "Withdrawal")}</th><th>${t("期末", "Closing")}</th><th>${t("操作", "Action")}</th></tr></thead>
      <tbody>${rows.length ? rows.map(row => `<tr>
        <td>${row.period}</td><td>${tag(row.status)}</td><td class="numeric">${money(row.opening)}</td><td class="numeric">${money(row.gross)}</td><td class="numeric">${money(row.tax)}</td><td class="numeric">${money(row.guaranteeReleased - row.guaranteeRetained)}</td><td class="numeric">${money(row.reversalUsed)}</td><td class="numeric">${money(row.withdrawalPaid + row.withdrawalProcessing)}</td><td class="numeric">${money(row.closing)}</td>
        <td><div class="wd-row-actions"><button class="button secondary small" type="button" data-statement-detail="${row.period}">${t("详情", "Details")}</button><button class="button secondary small" type="button" data-statement-download="${row.period}" ${["generating", "recalculating", "failed"].includes(row.status) ? "disabled" : ""}>${t("下载", "Download")}</button></div></td>
      </tr>`).join("") : `<tr><td colspan="10" class="finance-empty"><strong>${t("暂无结算单", "No statements")}</strong><p>${t("生成结算单后将在此显示。", "Statements will appear here.")}</p></td></tr>`}</tbody>
    </table></div>`;
  }

  function drawer(row) {
    if (!row) return "";
    return `<div class="aff-drawer-overlay" data-statement-action="close"></div>
      <aside class="aff-drawer finance-drawer" role="dialog" aria-modal="true" aria-labelledby="statement-detail-title">
        <header><div><h2 id="statement-detail-title">${t("结算单详情", "Statement details")}</h2><span>${row.period} · v${row.version} · ${t("USD", "USD")}</span></div><button class="finance-drawer-close" type="button" data-statement-action="close" aria-label="${t("关闭", "Close")}">×</button></header>
        <div class="finance-drawer-body">
          <section><div class="finance-drawer-amount"><span>${t("期末可提现", "Closing available")}</span><strong>${money(row.closing)}</strong>${tag(row.status)}</div>
            <dl class="finance-detail-grid">
              ${field(t("期初可提现", "Opening"), money(row.opening))}${field(t("本期净变动", "Net change"), money(row.netChange))}
              ${field(t("佣金总额", "Gross commission"), money(row.gross))}${field(t("结算税费", "Tax"), money(row.tax))}
              ${field(t("保证金扣留", "Guarantee retained"), money(row.guaranteeRetained))}${field(t("保证金释放", "Guarantee released"), money(row.guaranteeReleased))}
              ${field(t("冲正抵扣", "Reversal offset"), money(row.reversalUsed))}${field(t("提现成功", "Paid withdrawals"), money(row.withdrawalPaid))}
              ${field(t("支付中", "Processing"), money(row.withdrawalProcessing))}${field(t("失败退回", "Failed returned"), money(row.failedReturned))}
            </dl>
          </section>
          <section><h3>${t("生成与审计", "Generation and audit")}</h3><dl class="finance-detail-grid">
            ${field(t("生成时间", "Generated at"), row.generatedAt)}${field(t("规则版本", "Rule version"), row.ruleVersion)}
            ${field(t("结算笔数", "Settlements"), row.settlementCount)}${field(t("提现笔数", "Withdrawals"), row.withdrawalCount)}
            ${field(t("平衡校验", "Balance check"), row.balanced ? t("通过", "Passed") : t("待核对", "Reconciling"))}${field(t("币种", "Currency"), "USD")}
          </dl><p>${t("冲正抵扣优先消耗已扣留保证金；只有超出保证金的部分才会影响可提现余额。", "Reversals first consume retained guarantee; only the excess affects available funds.")}</p></section>
        </div>
        <footer>
          <button class="button secondary" type="button" data-route="pay">${t("佣金明细", "Commissions")}</button>
          <button class="button secondary" type="button" data-route="guarantee">${t("保证金", "Guarantee")}</button>
          <button class="button secondary" type="button" data-route="wd">${t("提现", "Withdrawals")}</button>
          <button class="button primary" type="button" data-statement-download="${row.period}" ${["generating", "recalculating", "failed"].includes(row.status) ? "disabled" : ""}>${t("下载", "Download")}</button>
        </footer>
      </aside>`;
  }

  function downloadConfirm(row) {
    if (!row) return "";
    return `<div class="aff-drawer-overlay" data-statement-action="cancel-download"></div>
      <div class="statement-modal" role="dialog" aria-modal="true" aria-labelledby="statement-download-title">
        <header><h2 id="statement-download-title">${t("下载结算单", "Download statement")}</h2><button type="button" data-statement-action="cancel-download" aria-label="${t("关闭", "Close")}">×</button></header>
        <p>${t("文件包含周期资金摘要。下载记录保留24小时并写入审计。", "The file contains the period summary. Download records expire in 24 hours and are audited.")}</p>
        <dl><div><dt>${t("周期", "Period")}</dt><dd>${row.period}</dd></div><div><dt>${t("版本", "Version")}</dt><dd>v${row.version}</dd></div></dl>
        <footer><button class="button secondary" type="button" data-statement-action="cancel-download">${t("取消", "Cancel")}</button><button class="button secondary" type="button" data-statement-format="csv">${t("下载 CSV", "Download CSV")}</button><button class="button primary" type="button" data-statement-format="pdf">${t("下载 PDF", "Download PDF")}</button></footer>
      </div>`;
  }

  function renderPage() {
    const s = state();
    const rows = records();
    const row = selected();
    return `<div class="statement-page">
      ${AFF.helpers.pageHeader(t("月度结算单", "Monthly statements"), t("按周期核对佣金、税费、保证金、冲正、提现与余额。", "Reconcile commissions, tax, guarantee, reversals, withdrawals, and balances."))}
      ${AFF.partnerClosure.statementsBanner()}
      ${statsCard(row)}
      <section class="card"><div class="panel-header"><h2>${t("结算单列表", "Statement list")}</h2><span class="helper">${t("MVP仅提供结算单；发票/税单后置", "MVP provides statements only; invoices and tax forms are deferred")}</span></div>
        ${filters()}${table(rows)}
      </section>
      <section class="card"><div class="panel-header"><h2>${t("下载记录", "Download records")}</h2><span class="helper">${t("24小时过期", "Expires in 24 hours")}</span></div>
        <div class="statement-table-wrap"><table>
          <thead><tr><th>${t("下载编号", "Download ID")}</th><th>${t("周期", "Period")}</th><th>${t("格式", "Format")}</th><th>${t("版本", "Version")}</th><th>${t("时间", "Time")}</th><th>${t("过期时间", "Expiry")}</th><th>${t("审计编号", "Audit ID")}</th></tr></thead>
          <tbody>${s.downloads.length ? s.downloads.map(item => `<tr><td>${h(item.id)}</td><td>${item.period}</td><td>${item.format.toUpperCase()}</td><td>v${item.version}</td><td>${h(item.downloadedAt)}</td><td>${h(item.expiresAt)}</td><td>${h(item.auditId)}</td></tr>`).join("") : `<tr><td colspan="7" class="finance-empty"><strong>${t("暂无下载记录", "No downloads")}</strong><p>${t("下载结算单后将在此记录。", "Downloads will be recorded here.")}</p></td></tr>`}</tbody>
        </table></div>
      </section>
      ${drawer(rows.find(item => item.period === s.detail))}
      ${downloadConfirm(rows.find(item => item.period === s.downloadConfirm))}
    </div>`;
  }

  document.addEventListener("input", event => {
    if (AFF.state?.route !== "statements" || !event.target.matches("[data-statement-filter]")) return;
    const s = state();
    s[event.target.dataset.statementFilter] = event.target.value;
    s.detail = "";
    s.downloadConfirm = "";
    render();
    document.querySelector(`[data-statement-filter="${event.target.dataset.statementFilter}"]`)?.focus();
  });

  document.addEventListener("click", event => {
    if (AFF.state?.route !== "statements") return;
    const detail = event.target.closest("[data-statement-detail]");
    if (detail) {
      const s = state();
      s.detail = detail.dataset.statementDetail;
      s.downloadConfirm = "";
      render();
      return document.querySelector(".finance-drawer-close")?.focus();
    }
    const downloadButton = event.target.closest("[data-statement-download]");
    if (downloadButton && !downloadButton.disabled) {
      state().downloadConfirm = downloadButton.dataset.statementDownload;
      state().detail = "";
      render();
      return document.querySelector(".statement-modal [data-statement-format='csv']")?.focus();
    }
    const formatButton = event.target.closest("[data-statement-format]");
    if (formatButton) return download(selected(), formatButton.dataset.statementFormat);
    const target = event.target.closest("[data-statement-action]");
    if (!target) return;
    const action = target.dataset.statementAction;
    const s = state();
    if (action === "close" || action === "cancel-download") {
      s.detail = "";
      s.downloadConfirm = "";
      render();
      return document.querySelector(detailReturnFocus || "[data-statement-detail]")?.focus();
    }
    if (action === "reset") {
      AFF.state.statementsPage = defaults();
      render();
      return document.querySelector("[data-statement-filter='period']")?.focus();
    }
  });

  document.addEventListener("keydown", event => {
    if (AFF.state?.route !== "statements" || event.key !== "Escape") return;
    const s = state();
    if (!s.detail && !s.downloadConfirm) return;
    event.preventDefault();
    s.detail = "";
    s.downloadConfirm = "";
    render();
  });

  AFF.statements = { state, periods, records, selected, buildStatement, availableAt };
  AFF.pages.statements = renderPage;
})();
