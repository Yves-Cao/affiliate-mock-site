(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const money = cents => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  const labels = {
    processing: ["支付中", "Processing", "info"],
    paid: ["已支付", "Paid", "ok"],
    failed: ["支付失败", "Payment failed", "danger"],
    timeout: ["已超时", "Timed out", "danger"],
    closed: ["已关闭", "Closed", "muted"]
  };
  const methods = { wire: ["银行电汇", "Bank transfer"], wallet: ["电子钱包", "E-wallet"] };
  const notes = {
    processing: ["支付结果等待渠道返回；手续费仅在成功后确认。", "Awaiting the payment result. Fee is confirmed only after success."],
    paid: ["支付成功，实际到账金额已扣除手续费。", "Payment succeeded. The received amount is net of fee."],
    failed: ["支付失败，申请金额已全额退回可提现余额，不收手续费。", "Payment failed. The full amount was returned and no fee is charged."],
    timeout: ["支付超时，申请金额已全额退回可提现余额，不收手续费。", "Payment timed out. The full amount was returned and no fee is charged."],
    closed: ["提现单已关闭，未产生支付。", "The request was closed without payment."]
  };
  const initial = new WeakSet();
  let focusBack = null;

  function records() { return AFF.finance.allWithdrawals(); }
  function defaults() { return { from: "", to: "", status: "", method: "", search: "" }; }
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
    const query = f.search.trim().toLowerCase();
    return records().filter(row =>
      (!f.from || row.date >= f.from) && (!f.to || row.date <= f.to) &&
      (!f.status || row.status === f.status) && (!f.method || row.method === f.method) &&
      (!query || [row.id, ...row.allocations.flatMap(item => [item.clientId, item.commissionCaseId, item.sourceId])]
        .some(value => String(value).toLowerCase().includes(query)))
    );
  }

  const method = row => t(...methods[row.method] || methods.wire);
  const badge = row => `<span class="tag tag-${labels[row.status][2]}">${t(...labels[row.status])}</span>`;
  const note = row => t(...notes[row.status]);
  const options = (entries, current) => `<option value="">${t("全部", "All")}</option>${Object.entries(entries).map(([value, text]) =>
    `<option value="${value}" ${value === current ? "selected" : ""}>${t(...text)}</option>`).join("")}`;

  function filters() {
    const f = state().draft;
    return `<form class="wd-filters" data-withdraw-form novalidate>
      <label><span>${t("申请日期范围", "Request date range")}</span>${AFF.dateRange.component({ id: "withdrawals-range", from: f.from, to: f.to, max: AFF.finance.asOf, placeholder: t("选择申请日期范围", "Select request dates") })}</label>
      <label><span>${t("状态", "Status")}</span><select data-withdraw-filter="status">${options(labels, f.status)}</select></label>
      <label><span>${t("提现方式", "Method")}</span><select data-withdraw-filter="method">${options(methods, f.method)}</select></label>
      <label class="wd-search"><span>${t("搜索", "Search")}</span><input type="search" data-withdraw-filter="search" value="${h(f.search)}" placeholder="${t("订单 / 客户 / 佣金", "Order / client / case")}" maxlength="100"></label>
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
      ${[t("申请编号", "Request ID"), t("申请日期", "Request date"), t("提现方式", "Method"), t("收款账户", "Receiving account"), t("申请金额", "Requested amount"), t("手续费", "Fee"), t("实际到账", "Received"), t("关联来源", "Sources"), t("状态", "Status"), t("操作", "Action")].map(item => `<th scope="col">${item}</th>`).join("")}
      </tr></thead><tbody>${visible.length ? visible.map(row => `<tr>
        <td>${h(row.id)}</td><td>${h(row.date)}</td><td>${method(row)}</td><td>${h(row.account)}</td>
        <td class="wd-money">${money(row.amount)}</td><td class="wd-money">${row.status === "paid" ? money(row.fee) : `${money(row.estimatedFee)}*`}</td><td class="wd-money">${row.status === "paid" ? money(row.received) : "-"}</td>
        <td>${row.allocations.length} ${t("笔", "lots")}</td><td>${badge(row)}</td>
        <td><div class="wd-row-actions"><button class="button secondary small" type="button" data-withdraw-detail="${row.id}">${t("详情", "Details")}</button>${row.id.startsWith("WOD-U") && row.status === "processing" ? `<button class="button primary small" type="button" data-withdraw-simulate="${row.id}" data-result="paid">${t("模拟成功", "Simulate success")}</button><button class="button secondary small" type="button" data-withdraw-simulate="${row.id}" data-result="failed">${t("模拟失败", "Simulate failure")}</button>` : ""}</div></td>
      </tr>`).join("") : `<tr><td colspan="10" class="wd-empty"><strong>${t("暂无提现记录", "No withdrawal records")}</strong><p>${t("请调整筛选条件后查询。", "Adjust filters and search again.")}</p></td></tr>`}</tbody></table></div>
      <footer class="table-footer wd-footer"><span>${t("共", "Total")} <b data-withdraw-total>${rows.length}</b> ${t("条记录", "records")} · ${t("失败不收费", "No fee for failures")}</span><div class="wd-pagination"><label>${t("每页", "Per page")} <select data-withdraw-page-size aria-label="${t("每页条数", "Rows per page")}">${[10, 20, 50].map(size => `<option ${size === s.pageSize ? "selected" : ""}>${size}</option>`).join("")}</select></label><div class="pagination"><button type="button" data-withdraw-page="${s.page - 1}" aria-label="${t("上一页", "Previous page")}" ${s.page <= 1 ? "disabled" : ""}>‹</button><span>${s.page} / ${pages}</span><button type="button" data-withdraw-page="${s.page + 1}" aria-label="${t("下一页", "Next page")}" ${s.page >= pages ? "disabled" : ""}>›</button></div></div></footer>`;
  }

  function field(label, value) { return `<div><dt>${h(label)}</dt><dd>${h(value)}</dd></div>`; }

  function drawer() {
    const row = records().find(item => item.id === state().detail);
    if (!row) return "";
    return `<div class="wd-overlay" data-withdraw-action="close"></div><aside class="wd-drawer" role="dialog" aria-modal="true" aria-labelledby="wd-detail-title">
      <header><div><h2 id="wd-detail-title">${t("提现详情", "Withdrawal details")}</h2><span>${row.id}</span></div><button class="wd-close" data-withdraw-action="close" type="button" aria-label="${t("关闭详情", "Close details")}">×</button></header>
      <div class="wd-detail-body">
        <section class="wd-detail-amount"><span>${t("申请金额", "Requested amount")}</span><strong>${money(row.amount)}</strong>${badge(row)}</section>
        <section><h3>${t("支付信息", "Payment information")}</h3><p class="wd-status-note">${h(note(row))}</p><dl class="wd-details">
          ${field(t("申请日期", "Request date"), row.date)}${field(t("提现方式", "Method"), method(row))}
          ${field(t("预估手续费", "Estimated fee"), money(row.estimatedFee))}${field(t("确认手续费", "Confirmed fee"), row.status === "paid" ? money(row.fee) : t("支付成功后确认", "Confirmed after success"))}
          ${field(t("实际到账", "Received"), row.status === "paid" ? money(row.received) : "-")}${field(t("收款账户", "Receiving account"), `${row.receiver} · ${row.account}`)}
          ${field(t("规则版本", "Rule version"), row.ruleVersion)}
        </dl></section>
        <section><h3>${t("先进先出分摊", "FIFO allocations")}</h3><div class="wd-table-scroll"><table class="wd-table"><thead><tr><th>${t("来源", "Source")}</th><th>${t("来源编号", "Source ID")}</th><th>${t("客户", "Client")}</th><th>${t("佣金案件", "Case")}</th><th>${t("金额", "Amount")}</th></tr></thead><tbody>
          ${row.allocations.map(item => `<tr><td>${item.source === "guarantee_release" ? t("保证金释放", "Guarantee release") : t("佣金结算", "Commission settlement")}</td><td>${h(item.sourceId)}</td><td>${h(item.clientId)}</td><td>${h(item.commissionCaseId)}</td><td class="wd-money">${money(item.amount)}</td></tr>`).join("")}
        </tbody></table></div></section>
      </div>
      <footer><button class="button secondary" data-withdraw-action="close" type="button">${t("关闭", "Close")}</button></footer>
    </aside>`;
  }

  function feeTip() {
    return `<div class="wd-fee-tip"><strong>${t("手续费规则", "Fee rule")}</strong>
      <span>${t("银行电汇：$3 + 0.5%；电子钱包：1%；最低$1，最高$30。", "Bank transfer: $3 + 0.5%; e-wallet: 1%; minimum $1, maximum $30.")}</span>
      <small>${t("演示参考值，可配置。申请金额从余额扣减，手续费从申请金额内扣除；税费已在佣金结算时扣缴，保证金释放后提现不重复扣税。失败或超时不收费。", "Demo reference, configurable. The request debits the balance; the fee is deducted from it. Tax was withheld at settlement and is not charged again. Failures and timeouts are free.")}</small>
    </div>`;
  }

  function methodList(selected) {
    const descriptions = {
      wire: t("手续费$3 + 0.5%，最低$1、最高$30", "Fee: $3 + 0.5%; min $1, max $30"),
      wallet: t("手续费1%，最低$1、最高$30", "Fee: 1%; min $1, max $30")
    };
    return `<div class="wd-method-list" role="list" aria-label="${t("提现方式", "Withdrawal methods")}">
      ${Object.entries(methods).map(([key, text]) => `
        <button type="button" role="listitem" class="wd-method-card ${selected === key ? "selected" : ""}" data-withdraw-method-choice="${key}" aria-pressed="${selected === key}">
          <span>${t(...text)}</span>
          <small>${descriptions[key]}</small>
          ${selected === key ? `<strong aria-hidden="true">✓</strong>` : ""}
        </button>`).join("")}
    </div>`;
  }

  function withdrawForm() {
    const s = AFF.state.wdForm;
    const selected = s.methodChosen && methods[s.method] ? s.method : "";
    let preview = null;
    if (selected) {
      try { preview = AFF.finance.previewWithdrawal(s.amount, selected); } catch {}
    }
    return `<section class="card"><div class="notice-panel"><strong>${t("选择提现方式", "Choose a withdrawal method")}</strong>
      <p>${t("请先选择收款方式；选择后再填写金额、查看手续费并校验提现资格。", "Choose a receiving method first. Then enter an amount, review the fee, and complete eligibility checks.")}</p>
      <dl class="wd-details">
        <div><dt>${t("可提现余额", "Available balance")}</dt><dd>${money(AFF.finance.balance())}</dd></div>
        <div><dt>${t("滚动保证金", "Rolling guarantee")}</dt><dd>${money(AFF.finance.guaranteeRecords.filter(item => item.status === "retained").reduce((sum, item) => sum + item.amount, 0))}</dd></div>
      </dl>
      ${methodList(selected)}
      ${!selected ? `<p class="wd-method-hint">${t("选择方式后，将显示金额输入和手续费试算。", "After choosing a method, amount input and fee preview will appear.")}</p>` : `
        ${!AFF.state.kybCompleted ? `<div class="wd-kyc-inline">
          <div><span class="tag tag-warning">${t("待校验", "Checks required")}</span><strong>${t("首次提现需完成KYC/KYB与收款合规验证", "First withdrawal requires KYC/KYB and receiving checks")}</strong>
            <small>${t("企业需识别受益所有人，≥25%均需KYC；收款账户名与主体一致。", "Companies require KYC for every 25%+ owner; the receiving account name must match the entity.")}</small></div>
          <button class="button primary" type="button" data-withdraw-action="complete-kyc">${t("模拟完成KYC/KYB与收款验证", "Simulate KYC/KYB and receiving verification")}</button>
        </div>` : ""}
        <div class="wd-filter-actions wd-withdraw-controls">
          <label><span>${t("提现金额", "Amount")}</span><input type="number" min="0.01" step="0.01" data-withdraw-amount value="${h(s.amount)}"></label>
          <button class="button primary" type="button" data-withdraw-action="submit-request" ${AFF.state.kybCompleted ? "" : "disabled"}>${t("提交提现申请", "Submit withdrawal")}</button>
        </div>
        ${preview ? `<dl class="wd-details wd-preview"><div><dt>${t("预估手续费", "Estimated fee")}</dt><dd>${money(preview.estimatedFee)}</dd></div><div><dt>${t("预计到账", "Estimated receipt")}</dt><dd>${money(preview.received)}</dd></div></dl>` : `<p class="wd-validation">${t("请输入不高于可提现余额的有效金额。", "Enter a valid amount not exceeding the available balance.")}</p>`}
        ${feeTip()}
      `}
    </div></section>`;
  }


  function renderPage() {
    const s = state();
    AFF.state.wdForm ||= { amount: "100", method: "" };
    return `<div class="wd-page">
      <div class="tabs wd-tabs">
        <button type="button" class="${AFF.state.wdTab !== "records" ? "active" : ""}" data-withdraw-tab="withdraw">${t("出金", "Withdraw")}</button>
        <button type="button" class="${AFF.state.wdTab === "records" ? "active" : ""}" data-withdraw-tab="records">${t("提现记录", "Withdrawal records")}</button>
      </div>
      ${AFF.state.wdTab !== "records" ? withdrawForm() : `<section class="card wd-records"><div class="wd-heading"><h2>${t("提现记录", "Withdrawal records")}</h2><span>${t("按申请日期由近到远排列", "Most recent requests first")}</span></div>${filters()}${table(filteredRows())}</section>`}
      ${s.detail && AFF.state.wdTab === "records" ? drawer() : ""}
    </div>`;
  }

  function rerender(selector) { render(); document.querySelector(selector)?.focus(); }

  document.addEventListener("click", event => {
    if (AFF.state?.route !== "wd") return;
    const target = event.target.closest("[data-withdraw-tab],[data-withdraw-detail],[data-withdraw-action],[data-withdraw-page],[data-withdraw-simulate],[data-withdraw-method-choice]");
    if (!target) return;
    const s = state(), d = target.dataset;
    if (d.withdrawTab) { AFF.state.wdTab = d.withdrawTab; s.detail = null; return rerender(`[data-withdraw-tab="${d.withdrawTab}"]`); }
    if (d.withdrawMethodChoice) {
      AFF.state.wdForm.method = d.withdrawMethodChoice;
      AFF.state.wdForm.methodChosen = true;
      return rerender(`[data-withdraw-method-choice="${d.withdrawMethodChoice}"]`);
    }
    if (d.withdrawDetail) { focusBack = `[data-withdraw-detail="${d.withdrawDetail}"]`; s.detail = d.withdrawDetail; return rerender(".wd-close"); }
    if (d.withdrawPage) { s.page = Number(d.withdrawPage); return rerender(".wd-table-scroll"); }
    if (d.withdrawSimulate) {
      AFF.finance.setWithdrawalStatus(d.withdrawSimulate, d.result);
      showToast(d.result === "paid" ? t("支付成功，手续费已确认。", "Payment succeeded; fee confirmed.") : t("支付失败，金额已退回且不收费。", "Payment failed; amount returned with no fee."));
      return rerender(`[data-withdraw-simulate="${d.withdrawSimulate}"]`);
    }
    if (d.withdrawAction === "close") { s.detail = null; return rerender(focusBack); }
    if (d.withdrawAction === "complete-kyc") {
      AFF.state.kybCompleted = true;
      showToast(t("KYC/KYB与收款验证已通过", "KYC/KYB and receiving verification passed"));
      return rerender("[data-withdraw-amount]");
    }
    if (d.withdrawAction === "submit-request") {
      if (!AFF.state.wdForm.methodChosen || !methods[AFF.state.wdForm.method]) return showToast(t("请先选择提现方式。", "Choose a withdrawal method first."));
      if (!AFF.state.kybCompleted) return showToast(t("请先完成KYC/KYB与收款验证。", "Complete KYC/KYB and receiving verification first."));
      try {
        AFF.finance.createWithdrawal(AFF.state.wdForm.amount, AFF.state.wdForm.method);
        AFF.state.wdTab = "records";
        showToast(t("提现申请已提交，等待支付渠道处理。", "Withdrawal submitted and awaiting processing."));
        return rerender('[data-withdraw-tab="records"]');
      } catch { return showToast(t("提现金额无效或超过可提现余额。", "Invalid amount or insufficient available balance.")); }
    }
    if (d.withdrawAction === "reset") {
      s.filters = defaults(); s.draft = defaults(); s.page = 1; s.error = "";
      return rerender('[data-range-id="withdrawals-range"] [data-range-toggle]');
    }
  });

  document.addEventListener("input", event => {
    if (AFF.state?.route !== "wd") return;
    if (event.target.matches("[data-withdraw-filter]")) state().draft[event.target.dataset.withdrawFilter] = event.target.value;
    if (event.target.matches("[data-withdraw-amount]")) AFF.state.wdForm.amount = event.target.value;
  });

  document.addEventListener("change", event => {
    if (AFF.state?.route !== "wd") return;
    if (event.target.matches("[data-withdraw-filter]")) state().draft[event.target.dataset.withdrawFilter] = event.target.value;
    if (event.target.matches("[data-withdraw-method]")) AFF.state.wdForm.method = event.target.value;
    if (event.target.matches("[data-withdraw-amount]") || event.target.matches("[data-withdraw-method]")) return rerender(event.target.matches("[data-withdraw-method]") ? "[data-withdraw-method]" : "[data-withdraw-amount]");
    if (event.target.matches("[data-withdraw-page-size]")) {
      state().pageSize = Number(event.target.value); state().page = 1;
      return rerender("[data-withdraw-page-size]");
    }
  });
  document.addEventListener("date-range-change", event => {
    if (AFF.state?.route !== "wd" || event.detail.id !== "withdrawals-range") return;
    const s = state();
    s.draft.from = event.detail.from;
    s.draft.to = event.detail.to;
  });

  document.addEventListener("submit", event => {
    if (AFF.state?.route !== "wd" || !event.target.matches("[data-withdraw-form]")) return;
    event.preventDefault();
    const s = state(), f = s.draft;
    s.error = (!f.from || !f.to || f.from > f.to) && (f.from || f.to)
      ? t("请选择有效日期，开始日期不得晚于结束日期。", "Choose valid dates. Start must not follow end.") : "";
    if (s.error) return void (document.querySelector("#wd-filter-error").textContent = s.error);
    s.filters = { ...f }; s.page = 1;
    rerender('[data-range-id="withdrawals-range"] [data-range-toggle]');
  });

  document.addEventListener("keydown", event => {
    if (AFF.state?.route !== "wd" || !state().detail || event.key !== "Escape") return;
    event.preventDefault(); state().detail = null; rerender(focusBack);
  });

  AFF.withdrawalsUI = { state, records, filteredRows, renderPage };
  AFF.pages.wd = renderPage;
})();
