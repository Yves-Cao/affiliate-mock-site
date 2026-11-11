(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const money = cents => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  const labels = {
    pending_review: ["待人工审核", "Pending review", "warning"],
    processing: ["支付中", "Processing", "info"],
    paid: ["已支付", "Paid", "ok"],
    failed: ["支付失败", "Payment failed", "danger"],
    timeout: ["已超时", "Timed out", "danger"],
    returned: ["已退回", "Returned", "danger"],
    rejected: ["审核驳回", "Review rejected", "danger"],
    closed: ["已关闭", "Closed", "muted"]
  };
  const methods = { wire: ["银行电汇", "Bank transfer"], wallet: ["电子钱包", "E-wallet"] };
  const notes = {
    pending_review: ["申请已提交，等待人工审核；审核通过后才会进入支付中。", "The request was submitted and is awaiting manual review. Payment starts only after approval."],
    processing: ["支付结果等待渠道返回；手续费仅在成功后确认。", "Awaiting the payment result. Fee is confirmed only after success."],
    paid: ["支付成功，实际到账金额已扣除手续费。", "Payment succeeded. The received amount is net of fee."],
    failed: ["支付失败，申请金额已全额退回可提现余额，不收手续费。", "Payment failed. The full amount was returned and no fee is charged."],
    timeout: ["支付超时，申请金额已全额退回可提现余额，不收手续费。", "Payment timed out. The full amount was returned and no fee is charged."],
    returned: ["CRM或银行已退回本次打款，金额已回到可提现余额。", "CRM or the bank returned the payout. The amount is available again."],
    rejected: ["人工审核未通过，申请金额已全额退回可提现余额，不收手续费。", "Manual review was rejected. The full amount was returned and no fee is charged."],
    closed: ["提现单已关闭，未产生支付。", "The request was closed without payment."]
  };
  const initial = new WeakSet();
  let focusBack = null;

  function records() { return AFF.finance.allWithdrawals(); }
  function settlementIds(row) {
    return [...new Set((row.allocations || [])
      .map(item => item.settlementId || AFF.finance.settlements.find(settlement => settlement.commissionCaseId === item.commissionCaseId)?.statementId)
      .filter(Boolean))];
  }
  function defaults() { return { from: "", to: "", status: "", method: "", search: "" }; }
  function state() {
    AFF.state.withdrawalRecords ||= { filters: defaults(), page: 1, pageSize: 10, filterDrawer: false };
    const s = AFF.state.withdrawalRecords;
    if (!initial.has(s)) {
      s.filters = { ...defaults(), ...s.filters }; s.draft = { ...s.filters };
      s.detail = null; s.error = ""; s.filterDrawer = false; initial.add(s);
    }
    return s;
  }

  function filteredRows() {
    const f = state().filters;
    const query = f.search.trim().toLowerCase();
    return records().filter(row =>
      (!f.from || row.date >= f.from) && (!f.to || row.date <= f.to) &&
      (!f.status || row.status === f.status) && (!f.method || row.method === f.method) &&
      (!query || [row.id, ...settlementIds(row), ...row.allocations.flatMap(item => [item.clientId, item.commissionCaseId, item.sourceId])]
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

  function quickFilters() {
    const s = state();
    return `<div class="client-quick-filters wd-quick-filters">
      <label class="client-quick-field"><span class="sr-only">${t("提现方式", "Withdrawal method")}</span><select data-aff-dd="off" data-withdraw-quick="method" data-withdraw-filter="method" aria-label="${t("提现方式", "Withdrawal method")}">
        <option value="">${t("提现方式：全部", "Withdrawal method: All")}</option>${Object.entries(methods).map(([value, text]) => `<option value="${value}" ${s.filters.method === value ? "selected" : ""}>${t(...text)}</option>`).join("")}
      </select></label>
      <label class="client-quick-field"><span class="sr-only">${t("结算状态", "Settlement status")}</span><select data-aff-dd="off" data-withdraw-quick="status" data-withdraw-filter="status" aria-label="${t("结算状态", "Settlement status")}">
        <option value="">${t("结算状态：全部", "Settlement status: All")}</option>${Object.entries(labels).map(([value, text]) => `<option value="${value}" ${s.filters.status === value ? "selected" : ""}>${t(...text)}</option>`).join("")}
      </select></label>
    </div>`;
  }

  function filterDrawer() {
    const s = state();
    if (!s.filterDrawer) return "";
    return `<div class="aff-drawer-overlay" data-withdraw-action="filter-close"></div><aside class="aff-drawer finance-drawer wd-filter-drawer" role="dialog" aria-modal="true" aria-labelledby="wd-filter-title">
      <header><div><h2 id="wd-filter-title">${t("筛选器", "Filters")}</h2><span>${t("按申请日期、提现状态和关联编号筛选", "Filter by request date, withdrawal status and linked IDs")}</span></div><button class="finance-drawer-close" type="button" data-withdraw-action="filter-close" aria-label="${t("关闭筛选器", "Close filters")}">×</button></header>
      <div class="finance-drawer-body">${filters()}</div>
    </aside>`;
  }

  function table(rows) {
    const s = state();
    const pages = Math.max(1, Math.ceil(rows.length / s.pageSize));
    s.page = Math.max(1, Math.min(s.page, pages));
    const visible = rows.slice((s.page - 1) * s.pageSize, s.page * s.pageSize);
    return `<p class="wd-note">${t("失败不收费", "No fee for failures")}</p><div class="wd-table-scroll" role="region" aria-label="${t("提现记录", "Withdrawal records")}" tabindex="0"><table class="wd-table"><thead><tr>
      ${[t("申请编号", "Request ID"), t("申请日期", "Request date"), t("提现方式", "Method"), t("收款账户", "Receiving account"), t("申请金额", "Requested amount"), t("手续费", "Fee"), t("实际到账", "Received"), t("结算单编号", "Settlement ID"), t("关联来源", "Sources"), t("提现状态", "Withdrawal status"), t("操作", "Action")].map(item => `<th scope="col">${item}</th>`).join("")}
      </tr></thead><tbody>${visible.length ? visible.map(row => `<tr>
        <td>${h(row.id)}</td><td>${h(row.date)}</td><td>${method(row)}</td><td>${h(row.account)}</td>
        <td class="wd-money">${money(row.amount)}</td><td class="wd-money">${row.status === "paid" ? money(row.fee) : ["failed", "timeout", "rejected"].includes(row.status) ? money(0) : `${money(row.estimatedFee)}*`}</td><td class="wd-money">${row.status === "paid" ? money(row.received) : "-"}</td>
        <td>${settlementIds(row).length ? settlementIds(row).map(id => `<button class="wd-settlement-link" type="button" data-withdraw-settlement="${h(id)}">${h(id)}</button>`).join("<br>") : "-"}</td>
        <td>${row.allocations.length} ${t("笔", "lots")}</td><td>${badge(row)}</td>
        <td><div class="wd-row-actions"><button class="button secondary small" type="button" data-withdraw-detail="${row.id}" data-statement-detail="${row.id}">${t("详情", "Details")}</button>${row.id.startsWith("WOD-U") && row.status === "pending_review" ? `<button class="button primary small" type="button" data-withdraw-review="${row.id}" data-review-result="approve">${t("审核通过", "Approve")}</button><button class="button secondary small" type="button" data-withdraw-review="${row.id}" data-review-result="reject">${t("驳回", "Reject")}</button>` : ""}${row.id.startsWith("WOD-U") && row.status === "processing" ? `<button class="button primary small" type="button" data-withdraw-simulate="${row.id}" data-result="paid">${t("模拟成功", "Simulate success")}</button><button class="button secondary small" type="button" data-withdraw-simulate="${row.id}" data-result="failed">${t("模拟失败", "Simulate failure")}</button><button class="button secondary small" type="button" data-withdraw-simulate="${row.id}" data-result="returned">${t("模拟退回", "Simulate return")}</button>` : ""}</div></td>
      </tr>`).join("") : `<tr><td colspan="11" class="wd-empty"><strong>${t("暂无提现记录", "No withdrawal records")}</strong><p>${t("请调整筛选条件后查询。", "Adjust filters and search again.")}</p></td></tr>`}</tbody></table></div>
      ${AFF.pagination.component({ page: s.page, pageSize: s.pageSize, total: rows.length, channel: "withdrawals" })}`;
  }

  function field(label, value) { return `<div><dt>${h(label)}</dt><dd>${h(value)}</dd></div>`; }

  function drawer() {
    const row = records().find(item => item.id === state().detail);
    if (!row) return "";
    return `<div class="aff-drawer-overlay" data-withdraw-action="close"></div><aside class="aff-drawer wd-drawer finance-drawer" role="dialog" aria-modal="true" aria-labelledby="wd-detail-title">
      <header><div><h2 id="wd-detail-title">${t("提现详情", "Withdrawal details")}</h2><span>${row.id}</span></div><button class="wd-close" data-withdraw-action="close" type="button" aria-label="${t("关闭详情", "Close details")}">×</button></header>
      <div class="wd-detail-body">
        <section class="wd-detail-amount"><span>${t("申请金额", "Requested amount")}</span><strong>${money(row.amount)}</strong>${badge(row)}</section>
        <section><h3>${t("支付信息", "Payment information")}</h3><p class="wd-status-note">${h(note(row))}</p><dl class="wd-details">
          ${field(t("申请日期", "Request date"), row.date)}${field(t("提现方式", "Method"), method(row))}
          ${field(t("预估手续费", "Estimated fee"), money(row.estimatedFee))}${field(t("确认手续费", "Confirmed fee"), row.status === "paid" ? money(row.fee) : ["failed", "timeout", "rejected"].includes(row.status) ? money(0) : t("支付成功后确认", "Confirmed after success"))}
          ${field(t("实际到账", "Received"), row.status === "paid" ? money(row.received) : "-")}${field(t("收款账户", "Receiving account"), `${row.receiver} · ${row.account}`)}
          ${field(t("审核状态", "Review status"), row.reviewStatus === "approved" ? t("已通过", "Approved") : row.reviewStatus === "rejected" ? t("已驳回", "Rejected") : t("待审核", "Pending review"))}
          ${row.reviewReason ? field(t("驳回原因", "Review reason"), row.reviewReason) : ""}
          ${field(t("规则版本", "Rule version"), row.ruleVersion)}
          ${field(t("结算单编号", "Statement ID"), row.statementId || "—")}
          ${row.crmPayout ? field(t("CRM打款请求", "CRM payout request"), row.crmPayout.requestId) : ""}
          ${row.crmPayout?.payoutId ? field(t("CRM打款编号", "CRM payout ID"), row.crmPayout.payoutId) : ""}
          ${row.crmPayout ? field(t("CRM处理状态", "CRM processing status"), row.crmPayout.status) : ""}
          ${row.crmPayout ? field(t("CRM状态说明", "CRM status reason"), row.crmPayout.statusReason) : ""}
          ${row.crmPayout?.externalTransactionId ? field(t("外部交易流水", "External transaction"), row.crmPayout.externalTransactionId) : ""}
          ${row.crmPayout ? field(t("请求时间", "Requested at"), row.crmPayout.requestedAt) : ""}
          ${row.crmPayout ? field(t("更新时间", "Updated at"), row.crmPayout.updatedAt) : ""}
          ${row.crmPayout ? field(t("重试次数", "Retry count"), row.crmPayout.retryCount) : ""}
          ${row.crmPayout ? field(t("对账状态", "Reconciliation"), row.crmPayout.reconciliationStatus) : ""}
        </dl></section>
        <section><h3>${t("先进先出分摊", "FIFO allocations")}</h3><div class="wd-table-scroll"><table class="wd-table"><thead><tr><th>${t("来源", "Source")}</th><th>${t("来源编号", "Source ID")}</th><th>${t("结算单编号", "Settlement ID")}</th><th>${t("客户", "Client")}</th><th>${t("佣金案件", "Case")}</th><th>${t("金额", "Amount")}</th></tr></thead><tbody>
          ${row.allocations.map(item => {
            const settlementId = item.settlementId || AFF.finance.settlements.find(settlement => settlement.commissionCaseId === item.commissionCaseId)?.statementId;
            return `<tr><td>${item.source === "guarantee_release" ? t("保证金释放", "Guarantee release") : t("佣金结算", "Commission settlement")}</td><td>${h(item.sourceId)}</td><td>${settlementId ? `<button class="wd-settlement-link" type="button" data-withdraw-settlement="${h(settlementId)}">${h(settlementId)}</button>` : "-"}</td><td>${h(item.clientId)}</td><td>${h(item.commissionCaseId)}</td><td class="wd-money">${money(item.amount)}</td></tr>`;
          }).join("")}
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
    if (AFF.partnerClosure.active()) return "";
    const selected = s.methodChosen && methods[s.method] ? s.method : "";
    let preview = null;
    if (selected) {
      try { preview = AFF.finance.previewWithdrawal(s.amount, selected); } catch {}
    }
    return `<section class="card"><div class="notice-panel"><strong>${t("选择提现方式", "Choose a withdrawal method")}</strong>
      <p>${t("请先选择收款方式；选择后再填写金额、查看手续费并校验提现资格。", "Choose a receiving method first. Then enter an amount, review the fee, and complete eligibility checks.")}</p>
      <dl class="wd-details">
        <div><dt>${t("可提现余额", "Available balance")}</dt><dd>${money(AFF.finance.balance())}</dd></div>
        <div><dt>${t("滚动保证金", "Rolling guarantee")}</dt><dd>${money(AFF.finance.guaranteeRecords.filter(item => ["retained", "frozen"].includes(item.status)).reduce((sum, item) => sum + item.amount, 0))}</dd></div>
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
      <div class="tabs wd-tabs" role="tablist" aria-label="提现页签">
        <button type="button" class="${AFF.state.wdTab !== "records" ? "active" : ""}" data-withdraw-tab="withdraw">${t("出金", "Withdraw")}</button>
        <button type="button" class="${AFF.state.wdTab === "records" ? "active" : ""}" data-withdraw-tab="records">${t("提现记录", "Withdrawal records")}</button>
      </div>
      ${AFF.partnerClosure.withdrawalNotice()}
      ${AFF.state.wdTab !== "records" ? withdrawForm() : `<section class="card wd-records"><div class="wd-heading"><div><h2>${t("提现记录", "Withdrawal records")}</h2><span>${t("按申请日期由近到远排列", "Most recent requests first")}</span></div><div class="wd-heading-actions"><button class="button secondary" type="button" data-withdraw-action="filters">${t("筛选器", "Filters")}</button><button class="button secondary" type="button" data-withdraw-action="reset">${t("重置", "Reset")}</button></div></div>${quickFilters()}${table(filteredRows())}</section>`}
      ${s.detail && AFF.state.wdTab === "records" ? drawer() : ""}${filterDrawer()}
    </div>`;
  }

  function rerender(selector) { render(); if (selector) document.querySelector(selector)?.focus(); }

  document.addEventListener("click", event => {
    if (AFF.state?.route !== "wd") return;
    const target = event.target.closest("[data-withdraw-tab],[data-withdraw-detail],[data-withdraw-settlement],[data-withdraw-action],[data-withdraw-page],[data-withdraw-simulate],[data-withdraw-review],[data-withdraw-method-choice],[data-aff-page]");
    if (!target) return;
    const s = state(), d = target.dataset;
    if (d.withdrawTab) { AFF.state.wdTab = d.withdrawTab; s.detail = null; return rerender(`[data-withdraw-tab="${d.withdrawTab}"]`); }
    if (d.withdrawAction === "filters") {
      s.draft = { ...s.filters };
      s.filterDrawer = true;
      render();
      return document.querySelector(".wd-filter-drawer .finance-drawer-close")?.focus();
    }
    if (d.withdrawAction === "filter-close") {
      s.filterDrawer = false;
      return rerender();
    }
    if (d.withdrawMethodChoice) {
      AFF.state.wdForm.method = d.withdrawMethodChoice;
      AFF.state.wdForm.methodChosen = true;
      return rerender(`[data-withdraw-method-choice="${d.withdrawMethodChoice}"]`);
    }
    if (d.withdrawDetail) { focusBack = `[data-withdraw-detail="${d.withdrawDetail}"]`; s.detail = d.withdrawDetail; return rerender(".wd-close"); }
    if (d.withdrawSettlement) {
      const earnings = AFF.earnings?.state?.();
      if (earnings) {
        earnings.filters = { ...earnings.filters, settlementId: d.withdrawSettlement };
        earnings.draft = { ...earnings.filters };
        earnings.page = 1;
      }
      return navigate("pay");
    }
    if (d.withdrawPage || d.affPage) { s.page = Number(d.withdrawPage || d.affPage); rerender(); AFF.pagination.focusNav("withdrawals"); return; }
    if (d.withdrawSimulate) {
      AFF.finance.setWithdrawalStatus(d.withdrawSimulate, d.result);
      showToast(d.result === "paid" ? t("支付成功，手续费已确认。", "Payment succeeded; fee confirmed.") : t("支付失败，金额已退回且不收费。", "Payment failed; amount returned with no fee."));
      return rerender(`[data-withdraw-simulate="${d.withdrawSimulate}"]`);
    }
    if (d.withdrawReview) {
      const order = d.reviewResult === "approve"
        ? AFF.finance.approveWithdrawal(d.withdrawReview)
        : AFF.finance.rejectWithdrawal(d.withdrawReview);
      if (!order) return showToast(t("该提现单当前不可审核。", "This withdrawal cannot be reviewed in its current state."));
      showToast(d.reviewResult === "approve"
        ? t("审核通过，提现单已进入支付中。", "Approved. The withdrawal is now processing.")
        : t("审核已驳回，金额已退回且不收费。", "Rejected. The amount was returned with no fee."));
      return rerender(`[data-withdraw-review="${d.withdrawReview}"]`);
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
        showToast(t("提现申请已提交，等待人工审核。", "Withdrawal submitted and awaiting manual review."));
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
    if (event.target.matches("[data-withdraw-quick]")) {
      const s = state();
      const key = event.target.dataset.withdrawQuick;
      s.filters[key] = event.target.value;
      s.draft[key] = event.target.value;
      s.page = 1;
      s.detail = null;
      return rerender(`[data-withdraw-quick="${key}"]`);
    }
    if (event.target.matches("[data-withdraw-filter]")) state().draft[event.target.dataset.withdrawFilter] = event.target.value;
    if (event.target.matches("[data-withdraw-method]")) AFF.state.wdForm.method = event.target.value;
    if (event.target.matches("[data-withdraw-amount]") || event.target.matches("[data-withdraw-method]")) return rerender(event.target.matches("[data-withdraw-method]") ? "[data-withdraw-method]" : "[data-withdraw-amount]");
    if (event.target.matches("[data-withdraw-page-size], [data-aff-page-size]")) {
      state().pageSize = Number(event.target.value); state().page = 1;
      return rerender("[data-aff-page-size]");
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
    s.filters = { ...f }; s.draft = { ...f }; s.page = 1; s.filterDrawer = false;
    rerender('[data-withdraw-quick="method"]');
  });

  document.addEventListener("keydown", event => {
    if (AFF.state?.route !== "wd" || event.key !== "Escape") return;
    const s = state();
    if (s.filterDrawer) {
      event.preventDefault();
      s.filterDrawer = false;
      return rerender();
    }
    if (!s.detail) return;
    event.preventDefault(); s.detail = null; rerender(focusBack);
  });

  AFF.withdrawalsUI = { state, records, filteredRows, renderPage };
  AFF.pages.wd = renderPage;
})();
