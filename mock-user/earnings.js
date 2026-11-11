(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const day = 86400000;
  const dateNumber = value => Date.parse(`${value}T00:00:00Z`);
  const shiftDate = (value, amount) => new Date(dateNumber(value) + amount * day).toISOString().slice(0, 10);
  const statusLabels = {
    in_progress: ["进行中", "In progress", "warning"],
    pending: ["待检查", "Pending review", "muted"],
    held: ["结算中", "On hold", "warning"],
    manual_review: ["人工确认中", "Manual review", "warning"],
    settled: ["已结算", "Settled", "ok"],
    approved: ["已入账", "Credited", "ok"],
    rejected: ["已拒绝", "Rejected", "danger"],
    reversed: ["已冲正", "Reversed", "danger"],
    frozen: ["冻结", "Frozen", "danger"]
  };
  const typeLabels = {
    accrual: ["佣金应计", "Commission accrual"],
    settlement: ["佣金结算", "Commission settlement"],
    reversal: ["佣金冲正", "Commission reversal"]
  };
  const caseTypeLabels = {
    qftd_batch: ["有效FTD", "Valid FTD"],
    quality_service: ["质量服务", "Quality service"]
  };
  const riskLabels = {
    none: ["无风险", "No risk", "muted"],
    investigating: ["调查中", "Investigating", "warning"],
    quarantined: ["隔离中", "Quarantined", "danger"],
    released: ["已解除", "Released", "info"]
  };
  const withdrawalStatusLabels = {
    pending_settlement: ["待结算", "Awaiting settlement", "muted"],
    unavailable: ["不可提现", "Not withdrawable", "muted"],
    available: ["可提现", "Available", "info"],
    pending_review: ["提现待审核", "Withdrawal review pending", "warning"],
    processing: ["提现中", "Withdrawal processing", "warning"],
    partial: ["部分提现", "Partially withdrawn", "warning"],
    paid: ["已提现", "Withdrawn", "ok"]
  };
  const holdReasons = [
    ["入金或交易记录仍在核验，佣金暂时保留。", "Deposit or trading records are still being verified, so the commission is on hold."],
    ["身份资料复核尚未完成，佣金暂时保留。", "Identity verification is still under review, so the commission is on hold."],
    ["入金退款或拒付风险仍待确认，佣金暂时保留。", "Deposit refund or chargeback checks are incomplete, so the commission is on hold."],
    ["账户状态需要进一步复核，佣金暂时保留。", "The account requires further review, so the commission is on hold."]
  ];
  const initialized = new WeakSet();
  let returnFocus = null;
  let detailHelpTimer;

  function defaultFilters() {
    return { from: AFF.reporting.from, to: AFF.reporting.now, status: "", withdrawalStatus: "", type: "", caseType: "", riskStatus: "", riskReason: "", settlementId: "" };
  }

  function state() {
    AFF.state.earnings ||= { filters: defaultFilters(), page: 1, pageSize: 10, showCommissionId: true };
    const s = AFF.state.earnings;
    if (!initialized.has(s)) {
      s.filters = { ...defaultFilters(), ...s.filters };
      if (!statusLabels[s.filters.status]) s.filters.status = "";
      if (s.filters.withdrawalStatus && !withdrawalStatusLabels[s.filters.withdrawalStatus]) s.filters.withdrawalStatus = "";
      s.draft = { ...s.filters };
      s.detail = null; s.appeal = false; s.appealDraft = ""; s.error = "";
      s.help = false; s.detailHelp = false;
      s.filterDrawer = false;
      initialized.add(s);
    }
    return s;
  }

  function holdDetails(row) {
    if (row.status !== "held") return null;
    const number = Number(String(row.client?.clientId || "0").replace(/\D/g, ""));
    const startedAt = row.holdStartedAt || row.confirmedAt;
    const totalDays = row.holdDays || 1;
    const elapsedDays = Math.max(0, Math.min(totalDays, Math.floor((dateNumber(AFF.reporting.now) - dateNumber(startedAt)) / day) + 1));
    return {
      startedAt, totalDays, elapsedDays,
      expectedReleaseAt: row.theoreticalReleaseAt || shiftDate(startedAt, totalDays),
      reason: holdReasons[number % holdReasons.length]
    };
  }

  function segmentLabel(row) {
    if (row.caseType === "qftd_batch") return t("有效FTD", "Valid FTD");
    if (row.caseType === "quality_service") return t("质量服务", "Quality service");
    return row.segments.filter(value => value !== "FTD").map(value => value === "QFTD" ? t("有效FTD", "Valid FTD") : value).join(" + ");
  }

  function riskLabel(row) {
    return riskLabels[row.client?.riskHandlingStatus] || riskLabels.none;
  }

  function clientStatusLabel(kind, value) {
    const maps = {
      eligibility: {
        pending_attribution: t("待归属", "Pending attribution"), attributed: t("已归属", "Attributed"),
        kyc_failed: t("KYC失败", "KYC failed"), risk_investigation: t("风险调查中", "Risk investigation"),
        not_new_customer: t("非新客户", "Not a new customer"), fraud_hit: t("欺诈命中", "Fraud hit")
      },
      milestone: {
        pending_attribution: t("注册", "Registration"), pending: t("KYC", "KYC"),
        ftd_in_progress: t("FTD", "FTD"), ftd: t("FTD", "FTD"),
        qftd_in_progress: t("有效FTD", "Valid FTD"), qftd_pending: t("有效FTD", "Valid FTD"), qftd: t("有效FTD", "Valid FTD"),
        quality_in_progress: t("质量服务", "Quality service"), quality_pending: t("质量服务", "Quality service"), quality: t("已完成", "Completed"),
        voided: t("已作废", "Voided")
      },
      fund: {
        not_generated: t("未生成", "Not generated"), pending_review: t("待检查", "Pending review"),
        held: t("结算中", "On hold"), manual_review: t("人工确认中", "Manual review"),
        payable: t("可提现", "Payable"), paid: t("已支付", "Paid"),
        rejected: t("已拒绝", "Rejected"), clawed_back: t("已冲正", "Clawed back"),
        frozen: t("冻结", "Frozen"), settled_partial: t("已结算 / 部分支付", "Settled / partially paid"), disputed: t("争议处理中", "Disputed")
      }
    };
    return maps[kind]?.[value] || value || "—";
  }

  function withdrawalInfo(row) {
    const settlementId = row.settlement?.statementId || row.settlement?.id || "";
    const orders = (AFF.finance?.allWithdrawals?.() || []).filter(order =>
      order.allocations?.some(allocation => allocation.commissionCaseId === row.id)
    );
    const allocated = status => orders
      .filter(order => order.status === status)
      .reduce((sum, order) => sum + order.allocations
        .filter(allocation => allocation.commissionCaseId === row.id)
        .reduce((total, allocation) => total + allocation.amount / 100, 0), 0);
    const paidAmount = allocated("paid");
    const processingAmount = ["pending_review", "processing"]
      .reduce((sum, status) => sum + allocated(status), 0);
    const availableAmount = row.settlement?.availableAmount ? row.settlement.availableAmount / 100 : 0;

    if (!row.settlement) {
      return {
        key: ["rejected", "reversed", "frozen"].includes(row.status) ? "unavailable" : "pending_settlement",
        settlementId, paidAmount, processingAmount
      };
    }
    if (availableAmount > 0 && paidAmount >= availableAmount) return { key: "paid", settlementId, paidAmount, processingAmount };
    if (processingAmount > 0 && paidAmount > 0) return { key: "partial", settlementId, paidAmount, processingAmount };
    if (processingAmount > 0) return { key: "processing", settlementId, paidAmount, processingAmount };
    if (paidAmount > 0) return { key: "partial", settlementId, paidAmount, processingAmount };
    return { key: "available", settlementId, paidAmount, processingAmount };
  }

  function records() {
    return AFF.reporting.rows
      .filter(row => row.clientId && row.commissionCases?.length)
      .flatMap(row => row.commissionCases.map(item => {
        const withdrawal = withdrawalInfo(item);
        return {
          id: item.id,
          date: item.confirmedAt,
          caseType: item.type,
          segments: item.segments,
          type: item.status === "reversed" ? "reversal" : item.status === "settled" ? "settlement" : "accrual",
          status: item.status,
          amount: item.status === "reversed" ? -item.amount : item.amount,
          gross: item.amount,
          settlement: item.settlement,
          guarantee: item.guarantee,
          paidAmount: withdrawal.paidAmount,
          settlementId: item.settlement?.statementId || item.settlement?.id || "",
          withdrawal,
          hold: holdDetails(item),
          client: row
        };
      }))
      .sort((left, right) => right.date.localeCompare(left.date) || left.id.localeCompare(right.id));
  }

  function filteredRows() {
    const f = state().filters;
    const inProgressStatuses = ["pending", "held", "manual_review", "frozen"];
    return records().filter(row =>
      (!f.from || row.date >= f.from) && (!f.to || row.date <= f.to) &&
      (!f.status || (f.status === "in_progress" ? inProgressStatuses.includes(row.status) : row.status === f.status)) &&
      (!f.withdrawalStatus || row.withdrawal?.key === f.withdrawalStatus) &&
      (!f.type || row.type === f.type) &&
      (!f.caseType || row.caseType === f.caseType) &&
      (!f.riskStatus || row.client.riskHandlingStatus === f.riskStatus) &&
      (!f.riskReason || row.client.riskReasonCategory === f.riskReason) &&
      (!f.settlementId || [row.settlementId, row.settlement?.id].filter(Boolean)
        .some(value => value.toLowerCase().includes(f.settlementId.trim().toLowerCase())))
    );
  }

  function totals(rows = filteredRows()) {
    return rows.reduce((sum, row) => {
      const amount = Math.abs(row.amount);
      sum.expected += amount;
      if (row.status in sum) sum[row.status] += amount;
    if (row.status === "settled") {
      sum.approved += row.settlement.availableAmount / 100;
      sum.paid += row.paidAmount;
    }
    sum.tax += row.settlement?.taxAmount ? row.settlement.taxAmount / 100 : 0;
    sum.guarantee += row.settlement?.guaranteeAmount ? row.settlement.guaranteeAmount / 100 : 0;
      if (["investigating", "quarantined"].includes(row.client?.riskHandlingStatus)) sum[row.client.riskHandlingStatus] += amount;
      return sum;
    }, { expected: 0, held: 0, approved: 0, paid: 0, tax: 0, guarantee: 0, rejected: 0, reversed: 0, investigating: 0, quarantined: 0 });
  }

  function money(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  }

  function reason(row) {
    if (row.hold) return t(...row.hold.reason);
    if (["rejected", "reversed"].includes(row.status)) return t(row.client.commissionReason, row.client.commissionReasonEn);
    if (row.status === "settled") return t("佣金已按税费、保证金和可提现余额拆分。", "The commission has been split into tax, guarantee, and available balance.");
    if (row.status === "frozen") {
      const threshold = AFF.finance.configuration.settlementFreezeThresholdDays;
      return t(`结算观察超过${threshold}天，等待人工审核。`, `The settlement observation exceeded ${threshold} days and requires manual review.`);
    }
    return t("佣金资格与结算资料正在核验，尚未完成审核。", "Commission eligibility and settlement details are being verified. Review is not complete.");
  }

  function icon(name) {
    const paths = {
      close: '<path d="m6 6 12 12M6 18 18 6"/>',
      left: '<path d="m14 6-6 6 6 6"/>',
      right: '<path d="m10 6 6 6-6 6"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  }

  function badge(status) {
    const value = statusLabels[status] || statusLabels.pending;
    return `<span class="tag tag-${value[2]}">${t(value[0], value[1])}</span>`;
  }

  function riskBadge(row) {
    const value = riskLabel(row);
    return `<span class="tag tag-${value[2]}">${t(value[0], value[1])}</span>`;
  }

  function withdrawalBadge(row) {
    const value = withdrawalStatusLabels[row.withdrawal?.key] || withdrawalStatusLabels.pending_settlement;
    const settlement = row.withdrawal?.settlementId && ["paid", "partial"].includes(row.withdrawal.key)
      ? `<small>${t("结算单号", "Settlement ID")}：${h(row.withdrawal.settlementId)}</small>`
      : "";
    return `<div class="earn-withdrawal-status"><span class="tag tag-${value[2]}">${t(value[0], value[1])}</span>${settlement}</div>`;
  }

  function riskNextStep(row) {
    const status = row.client?.riskHandlingStatus;
    if (status === "investigating") return `<button class="report-text-button" type="button" data-route="messages">${t("去补充", "Submit info")}</button>`;
    if (status === "quarantined") return `<button class="report-text-button" type="button" data-route="messages">${t("查看消息", "View message")}</button>`;
    if (status === "released") return t("等待结算复核", "Await settlement review");
    return "—";
  }

  function canAppeal(row) {
    return ["rejected", "reversed"].includes(row.status);
  }

  function appealRecord(row) {
    return AFF.state.clientCommissionAppeals?.[row.id];
  }

  function appealButton(row) {
    if (!canAppeal(row)) return "";
    const submitted = appealRecord(row);
    return `<button class="button secondary small" type="button" data-earn-appeal="${h(row.id)}" ${submitted ? "disabled" : ""}>${t(submitted ? "申诉中" : "申诉", submitted ? "Under appeal" : "Appeal")}</button>`;
  }

  function holdRules() {
    return `<p>${t("佣金观察期初始为1天，系统会根据账户风险分延长观察时间。每笔佣金的天数与预计释放日以详情为准，预计日期不代表届时一定可提现。", "The commission observation period starts at 1 day and may be extended based on the account risk score. See each commission for its duration and expected release date. The expected date does not guarantee withdrawal availability.")}</p>
      <dl><div><dt>${t("入金、交易或身份资料待核验", "Deposit, trading or identity checks")}</dt><dd>${t("核验未完成时可能继续结算中，具体天数随复核结果更新。", "An incomplete check may extend the hold. The duration is updated as the review progresses.")}</dd></div>
      <div><dt>${t("退款、拒付或账户异常待复核", "Refund, chargeback or account review")}</dt><dd>${t("可能触发进一步观察；原因与天数不是固定的一一对应关系。", "Further observation may be needed. Each reason does not have a fixed number of hold days.")}</dd></div>
      <div><dt>${t(`观察期超过${AFF.finance.configuration.settlementFreezeThresholdDays}天`, `Observation exceeds ${AFF.finance.configuration.settlementFreezeThresholdDays} days`)}</dt><dd>${t("转为冻结并进入人工审核；释放时间以人工审核结果为准。", "The commission is frozen for manual review. Release timing depends on the review outcome.")}</dd></div></dl>`;
  }

  function helpContent(id) {
    const detail = id === "earn-detail-help";
    return `<section class="earn-help ${detail ? "earn-help-popover" : ""}" id="${id}" ${detail ? `role="tooltip" ${state().detailHelp ? "" : "hidden"}` : ""} aria-label="${t("结算中原因与天数说明", "In-settlement reasons and duration")}">
      <div class="earn-section-heading"><h3>${t("结算中原因与天数说明", "In-settlement reasons and duration")}</h3>${detail ? "" : `<button class="earn-icon-button" type="button" data-earn-action="help" aria-label="${t("关闭说明", "Close explanation")}">${icon("close")}</button>`}</div>
      ${holdRules()}
    </section>`;
  }

  function filterOptions(entries, current) {
    return `<option value="">${t("全部", "All")}</option>${Object.entries(entries).map(([key, value]) =>
      `<option value="${h(key)}" ${current === key ? "selected" : ""}>${h(t(value[0], value[1]))}</option>`
    ).join("")}`;
  }

  function filterFields() {
    const f = state().draft;
    return `<fieldset class="report-fieldset"><legend>${t("佣金流水筛选", "Commission filters")}</legend><div class="report-filter-grid">
      <label class="field"><span>${t("更新日期范围", "Updated date range")}</span>${AFF.dateRange.component({ id: "earnings-filter-range", from: f.from, to: f.to, max: AFF.reporting.now, placeholder: t("选择开始和结束日期", "Select start and end dates") })}</label>
      <label class="field"><span>${t("结算单编号", "Settlement ID")}</span><input type="search" data-earn-filter="settlementId" value="${h(f.settlementId || "")}" placeholder="${h(t("输入结算单编号", "Enter settlement ID"))}" /></label>
      <label class="field"><span>${t("佣金状态", "Commission status")}</span><select data-earn-filter="status">${filterOptions(statusLabels, f.status)}</select></label>
      <label class="field"><span>${t("提现状态", "Withdrawal status")}</span><select data-earn-filter="withdrawalStatus">${filterOptions(withdrawalStatusLabels, f.withdrawalStatus)}</select></label>
      <label class="field"><span>${t("流水类型", "Record type")}</span><select data-earn-filter="type">${filterOptions(typeLabels, f.type)}</select></label>
      <label class="field"><span>${t("佣金案件", "Commission case")}</span><select data-earn-filter="caseType">${filterOptions(caseTypeLabels, f.caseType)}</select></label>
      <label class="field"><span>${t("风险处理", "Risk handling")}</span><select data-earn-filter="riskStatus">${filterOptions(riskLabels, f.riskStatus)}</select></label>
      <label class="field"><span>${t("原因类别", "Reason category")}</span><select data-earn-filter="riskReason"><option value="">${t("全部", "All")}</option>${["资料待核验", "行为待说明", "质量待复核", "支付风险", "集群风险", "其他"].map(value => `<option value="${h(value)}" ${f.riskReason === value ? "selected" : ""}>${h(AFF.dataText(value))}</option>`).join("")}</select></label>
    </div></fieldset><p id="earn-filter-error" class="earn-validation" role="alert">${h(state().error)}</p>`;
  }

  function filterValueLabel(key, value) {
    if (key === "riskReason") return AFF.dataText(value);
    const entries = { status: statusLabels, withdrawalStatus: withdrawalStatusLabels, type: typeLabels, caseType: caseTypeLabels, riskStatus: riskLabels }[key];
    return entries?.[value] ? t(entries[value][0], entries[value][1]) : value;
  }

  function filterChips(s) {
    const labels = {
      status: t("佣金状态", "Commission status"),
      withdrawalStatus: t("提现状态", "Withdrawal status"),
      type: t("流水类型", "Record type"),
      caseType: t("佣金案件", "Commission case"),
      riskStatus: t("风险处理", "Risk handling"),
      riskReason: t("原因类别", "Reason category"),
      settlementId: t("结算单编号", "Settlement ID")
    };
    const items = Object.entries(s.filters).filter(([key, value]) => !["from", "to"].includes(key) && value);
    if (!items.length) return "";
    return `<div class="report-applied">${items.map(([key, value]) => `<button class="chip active" type="button" data-earn-clear="${h(key)}">${h(labels[key] || key)}：${h(filterValueLabel(key, value))} ${icon("close")}</button>`).join("")}<button class="report-text-button" type="button" data-earn-action="clear-filters">${t("清空筛选", "Clear filters")}</button></div>`;
  }

  function quickFilters(s) {
    const quickSelect = (key, title, entries) => `<label class="client-quick-field"><select data-earn-quick="${key}" data-aff-dd-title="${h(title)}" aria-label="${h(title)}">${filterOptions(entries, s.filters[key])}</select></label>`;
    return `<div class="client-quick-filters">
      ${quickSelect("status", t("佣金状态", "Commission status"), statusLabels)}
      ${quickSelect("withdrawalStatus", t("提现状态", "Withdrawal status"), withdrawalStatusLabels)}
      ${quickSelect("riskStatus", t("风险处理", "Risk handling"), riskLabels)}
    </div>`;
  }

  function filterDrawer() {
    const s = state();
    return `<div class="aff-drawer-overlay" data-earn-action="filter-close"></div><aside class="aff-drawer earn-drawer earn-filter-drawer" role="dialog" aria-modal="true" aria-labelledby="earn-filter-title">
      <header><div><h2 id="earn-filter-title">${t("筛选条件", "Filter conditions")}</h2><p>${t("组合条件后查看对应佣金流水", "Combine conditions to view matching commission records")}</p></div><button class="earn-icon-button" type="button" data-earn-action="filter-close" aria-label="${t("关闭", "Close")}">${icon("close")}</button></header>
      <div class="earn-drawer-body">${filterFields()}</div>
      <footer><button class="button secondary" type="button" data-earn-action="filter-reset">${t("重置", "Reset")}</button><button class="button secondary" type="button" data-earn-action="filter-close">${t("取消", "Cancel")}</button><button class="button primary" type="button" data-earn-action="filter-apply">${t("应用", "Apply")}</button></footer>
    </aside>`;
  }

  function tableToolbar(s) {
    const activeCount = Object.entries(s.filters).filter(([key, value]) => !["from", "to"].includes(key) && value).length;
    return `<div class="client-table-header earn-table-header">
      <div class="client-table-title"><strong>${t("佣金流水", "Commission records")}</strong>${filterChips(s)}</div>
      <div class="client-table-tools">
        <button class="button secondary" type="button" data-earn-action="filters">${t("筛选器", "Filters")}${activeCount ? `<span class="report-count">${activeCount}</span>` : ""}</button>
        <button class="button secondary" type="button" data-earn-action="quick-reset">${t("重置", "Reset")}</button>
      </div>
    </div>${quickFilters(s)}`;
  }

  function stats() {
    const finance = AFF.finance.summary();
    const items = [
      ["totalRevenue", t("总收益", "Total revenue"), t("已提现佣金 + 钱包余额 + 全部保证金", "Paid commission + wallet balance + all guarantees"), finance.totalRevenue],
      ["paid", t("已提现", "Withdrawn"), t("已提现金额 + 已提现保证金", "Withdrawn amount + withdrawn guarantees"), finance.paid + finance.paidGuarantee],
      ["held", t("结算中", "In settlement"), t("调查中", "Under investigation"), finance.held],
      ["guarantee", t("保证金", "Guarantee"), "", finance.guarantee]
    ];
    return `<div class="earn-stats">${items.map(([key, title, hint, value]) => `<article class="card earn-stat"><span>${title}</span><strong data-earn-stat="${key}">${money(value)}</strong>${hint ? `<small>${hint}</small>` : ""}</article>`).join("")}</div>`;
  }

  function pagination(total) {
    // Unified component (D-02): ellipsis pages + data-aff-* channel.
    return AFF.pagination.component({ page: state().page, pageSize: state().pageSize, total, channel: "earnings" });
  }

  function table(rows) {
    const s = state();
    const visible = rows.slice((s.page - 1) * s.pageSize, s.page * s.pageSize);
    return `<div class="earn-table-scroll" role="region" aria-label="${t("佣金流水", "Commission records")}" tabindex="0"><table class="earn-table"><thead><tr>
      ${[t("更新日期", "Updated date"), ...(s.showCommissionId ? [t("佣金编号", "Commission ID")] : []), t("客户", "Client"), t("佣金分段", "Commission segment"), t("佣金金额", "Commission amount"), t("佣金状态", "Commission status"), t("提现状态", "Withdrawal status"), t("状态原因", "Status reason"), t("风险处理", "Risk handling"), t("下一步", "Next step"), t("操作", "Action")].map(name => `<th scope="col">${name}</th>`).join("")}
      </tr></thead><tbody>${visible.length ? visible.map(row => `<tr>
        <td>${h(row.date)}</td>${s.showCommissionId ? `<td>${h(row.id)}</td>` : ""}<td><strong>${h(row.client.clientId)}</strong><small>${h(row.client.email)}</small></td>
        <td>${h(segmentLabel(row))}</td><td class="earn-amount ${row.amount < 0 ? "earn-negative" : ""}">${money(row.amount)}</td>
        <td>${badge(row.status)}</td><td class="earn-withdrawal">${withdrawalBadge(row)}</td><td class="earn-reason">${h(reason(row))}${row.hold ? `<small>${t("结算中", "In settlement")} ${row.hold.totalDays} ${t("天", "days")} · ${t("预计释放", "Expected release")} ${row.hold.expectedReleaseAt}</small>` : ""}</td>
        <td>${riskBadge(row)}</td><td>${riskNextStep(row)}</td>
        <td><div class="earn-row-actions"><button class="button secondary small" type="button" data-earn-detail="${h(row.id)}">${t("详情", "Details")}</button>${appealButton(row)}</div></td>
      </tr>`).join("") : `<tr><td class="earn-empty" colspan="${s.showCommissionId ? 11 : 10}"><strong>${t("暂无佣金记录", "No commission records")}</strong><span>${t("请调整筛选条件，或重置后查看。", "Adjust the filters or reset to view records.")}</span></td></tr>`}</tbody></table></div>${pagination(rows.length)}`;
  }

  function field(label, value) {
    return `<div><dt>${h(label)}</dt><dd>${h(value ?? "—")}</dd></div>`;
  }

  function holdSection(row, s) {
    if (!row.hold) return "";
    const hold = row.hold;
    return `<section class="earn-detail-section"><div class="earn-section-heading"><h3>${t("本笔结算中", "This in-settlement item")}</h3><div class="earn-help-anchor"><button class="earn-text-button" type="button" data-earn-action="detail-help" aria-expanded="${s.detailHelp}" aria-controls="earn-detail-help" aria-describedby="earn-detail-help">${t("结算中原因与天数", "In-settlement reasons and duration")} <span aria-hidden="true">?</span></button>${helpContent("earn-detail-help")}</div></div>
      <dl class="earn-detail-grid">${field(t("本次暂扣天数", "Current hold duration"), `${hold.totalDays} ${t("天", "days")}`)}${field(t("已观察", "Elapsed"), `${hold.elapsedDays} ${t("天", "days")}`)}${field(t("暂扣开始日期", "Hold start date"), hold.startedAt)}${field(t("预计释放日期", "Expected release date"), hold.expectedReleaseAt)}</dl>
      <p>${h(reason(row))}</p><p class="earn-muted">${t("预计释放日可能随复核结果调整；审核通过并完成入账后才可纳入可提现余额。", "The expected release date may change after review. Funds become available only after approval and crediting.")}</p>
    </section>`;
  }

  function flow(row) {
    const c = row.client;
    const unavailable = t("处理时间未提供", "Processing time unavailable");
    const steps = [
      { title: t("佣金产生", "Commission accrued"), done: true, date: row.date, text: `${segmentLabel(row)} ${money(Math.abs(row.amount))}` },
      { title: t("结算中观察", "In-settlement observation"), done: Boolean(row.hold), date: row.hold?.startedAt, text: row.hold ? `${row.hold.totalDays} ${t("天，预计释放", "days, expected release")} ${row.hold.expectedReleaseAt}` : t("未提供该环节记录", "No record available for this stage") },
      { title: t("佣金审核", "Commission review"), done: ["settled", "approved", "paid", "rejected", "reversed"].includes(row.status), text: row.status === "settled" ? t("结算检查通过", "Settlement checks passed") : row.status === "rejected" ? t("审核拒绝", "Rejected") : row.status === "reversed" ? t("复核结果为冲正", "Review resulted in reversal") : t("尚未完成", "Not completed") }
    ];
    if (row.status === "settled") steps.push({ title: t("结算分摊", "Settlement split"), done: true, date: row.settlement?.settledAt, text: `${t("可提现")} ${money(row.settlement.availableAmount / 100)} / ${t("税费")} ${money(row.settlement.taxAmount / 100)} / ${t("保证金")} ${money(row.settlement.guaranteeAmount / 100)}` });
    else if (row.status === "rejected") steps.push({ title: t("佣金拒绝", "Commission rejected"), done: true, text: `${t("不计入结算净额", "Excluded from settlement net")} · ${unavailable}` });
      else if (row.status === "reversed") steps.push({ title: t("佣金冲正", "Commission reversed"), done: true, text: `${money(-Math.abs(row.amount))} · ${t("原入账明细与扣回记录未提供", "Original credit and recovery records unavailable")}` });
    else if (row.status === "frozen") {
      const threshold = AFF.finance.configuration.settlementFreezeThresholdDays;
      steps.push({ title: t("冻结与人工审核", "Frozen for manual review"), done: true, text: t(`超过${threshold}天，人工审核结果待定`, `Over ${threshold} days; manual review pending`) });
    }
    else steps.push({ title: t("佣金入账", "Commission credit"), done: false, text: t("尚未到达", "Not reached") });
    return `<ol class="earn-flow">${steps.map(step => `<li class="${step.done ? "complete" : ""}"><div><strong>${step.title}</strong><span>${h(step.text)}</span></div><time>${h(step.date || (step.done ? unavailable : t("—", "—")))}</time></li>`).join("")}</ol>`;
  }

  function drawer() {
    const s = state();
    const row = records().find(item => item.id === s.detail);
    if (!row) return "";
    const c = row.client;
    const appeal = appealRecord(row);
    return `<div class="aff-drawer-overlay" data-earn-action="close"></div><aside class="aff-drawer earn-drawer" role="dialog" aria-modal="true" aria-labelledby="earn-detail-title">
      <header><div><h2 id="earn-detail-title">${t("佣金详情", "Commission details")}</h2><p>${h(row.id)}</p></div><button class="earn-icon-button" type="button" data-earn-action="close" aria-label="${t("关闭", "Close")}">${icon("close")}</button></header>
      <div class="earn-drawer-body">
        <section class="earn-detail-section"><div class="earn-detail-amount"><strong>${money(row.amount)}</strong>${badge(row.status)}${withdrawalBadge(row)}</div><p>${h(reason(row))}</p><dl class="earn-detail-grid">${field(t("佣金编号", "Commission ID"), row.id)}${field(t("结算单编号", "Settlement ID"), row.withdrawal?.settlementId)}${field(t("佣金分段", "Commission segment"), segmentLabel(row))}${field(t("更新日期", "Updated date"), row.date)}${field(t("本案件金额", "Case amount"), money(Math.abs(row.amount)))}${field(t("已支付分摊", "Paid allocation"), money(row.paidAmount))}${field(t("税费", "Tax"), money(row.settlement?.taxAmount / 100 || 0))}${field(t("保证金", "Guarantee"), money(row.settlement?.guaranteeAmount / 100 || 0))}${field(t("结算入账", "Settlement credit"), money(row.settlement?.availableAmount / 100 || 0))}</dl>
          ${canAppeal(row) ? `<p class="earn-muted">${h(c.commissionReasonCode)}</p>` : ""}
        </section>
        ${c.riskHandlingStatus !== "none" ? `<section class="earn-detail-section"><h3>${t("风险处理", "Risk handling")}</h3><dl class="earn-detail-grid">
          ${field(t("处理状态", "Status"), t(...riskLabel(row).slice(0, 2)))}
          ${field(t("原因类别", "Reason category"), AFF.dataText(c.riskReasonCategory))}
          ${field(t("开始时间", "Started at"), c.riskStartedAt)}
          ${field(t("当前状态时间", "Current status time"), c.riskStatusTime)}
          ${field(t("影响范围", "Impact scope"), AFF.dataText(c.riskImpactScope))}
          ${field(t("证据范围", "Evidence scope"), AFF.dataText(c.riskEvidenceScope))}
          ${field(t("下一步", "Next step"), AFF.dataText(c.riskNextStep))}
          ${field(t("预计处理路径", "Handling path"), AFF.dataText(c.riskHandlingPath))}
          ${field(t("申诉路径", "Appeal path"), c.riskHandlingStatus === "released" ? t("暂无", "None") : t("申诉中心", "Appeal center"))}
        </dl><p>${t("调查或隔离期间佣金保留并留痕，但不自动结算、不可提现；解除后需等待结算前检查，不直接入账。", "During investigation or quarantine, commission is retained and audited but not automatically settled or withdrawable. After release it must pass pre-settlement checks before crediting.")}</p></section>` : ""}
        <section class="earn-detail-section"><h3>${t("关联客户", "Related client")}</h3><dl class="earn-detail-grid">
          ${field(t("客户编号", "Client ID"), c.clientId)}${field(t("邮箱", "Email"), c.email)}${field(t("国家/地区", "Country / region"), AFF.countryLabel(c.country))}${field(t("注册平台", "Registration platform"), c.platform)}${field(t("注册日期", "Registered on"), c.registeredAt)}${field(t("客户资格状态", "Eligibility status"), clientStatusLabel("eligibility", c.eligibilityStatus))}${field(t("客户里程碑状态", "Milestone status"), clientStatusLabel("milestone", c.milestoneStatus))}${field(t("资金状态", "Fund status"), clientStatusLabel("fund", c.fundStatus))}${field("FTD", c.ftdAt)}${field(t("有效FTD", "Valid FTD"), c.effectiveAt)}${field(t("质量服务", "Quality service"), c.qualityAt)}${field(t("转化活动", "Conversion campaign"), `${c.campaign} · ${c.campaignCode}`)}${field("Sub ID", c.subId)}
        </dl></section>
        ${holdSection(row, s)}
        <section class="earn-detail-section"><h3>${t("佣金流向", "Commission flow")}</h3>${flow(row)}</section>
        ${appeal ? `<p class="earn-appeal-notice" role="status">${t("申诉已提交，等待复核。原佣金状态和金额保持不变。", "Appeal submitted for review. The original commission status and amount remain unchanged.")}</p>` : ""}
        ${s.appeal && !appeal ? `<section class="earn-detail-section"><h3>${t("佣金申诉", "Commission appeal")}</h3><label class="earn-appeal-label" for="earn-appeal-reason">${t("申诉说明（必填）", "Explanation (required)")}</label><textarea id="earn-appeal-reason" data-earn-appeal-reason rows="5" maxlength="2000" aria-describedby="earn-appeal-error" required>${h(s.appealDraft)}</textarea><p id="earn-appeal-error" class="earn-validation" role="alert">${h(s.appealError || "")}</p><p class="earn-muted">${t("提交申诉不会自动恢复佣金或变更可提现余额。", "Submitting an appeal does not automatically restore the commission or change the available balance.")}</p></section>` : ""}
      </div>
      <footer><button class="button secondary" type="button" data-earn-action="close">${t("关闭", "Close")}</button>${s.appeal && !appeal ? `<button class="button primary" type="button" data-earn-action="submit-appeal">${t("提交申诉", "Submit appeal")}</button>` : appealButton(row)}</footer>
    </aside>`;
  }

  function renderPage() {
    const s = state();
    const rows = filteredRows();
    s.pageSize = [10, 20, 50].includes(Number(s.pageSize)) ? Number(s.pageSize) : 10;
    s.page = Math.min(Math.max(1, Number(s.page) || 1), Math.max(1, Math.ceil(rows.length / s.pageSize)));
    return `<div class="earn-page">${stats()}
      <section class="card earn-panel">${tableToolbar(s)}
        ${table(rows)}
      </section>
      <div class="earn-footnote"><span>${t("时区", "Timezone")} UTC+08:00 · ${t("币种", "Currency")} USD</span><span>${t("数据截至", "Data through")} ${AFF.reporting.now} 23:59</span></div>
      ${s.filterDrawer ? filterDrawer() : ""}
      ${s.detail ? drawer() : ""}
    </div>`;
  }

  function rerender(focus) {
    render();
    if (focus) document.querySelector(focus)?.focus();
  }

  function close() {
    const s = state();
    s.detail = null; s.appeal = false; s.appealDraft = ""; s.appealError = ""; s.detailHelp = false;
    rerender(returnFocus);
  }

  function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(dateNumber(value)) &&
      new Date(dateNumber(value)).toISOString().slice(0, 10) === value;
  }

  function setDetailHelp(open) {
    clearTimeout(detailHelpTimer);
    const popup = document.getElementById("earn-detail-help");
    const trigger = document.querySelector('.earn-help-anchor [data-earn-action="detail-help"]');
    if (!popup || !trigger) return;
    if (open && !popup.hidden) return;
    state().detailHelp = open;
    popup.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    if (!open) return;
    // D-04: unified placement via AFF.tooltip.position with drawer bounds.
    const header = document.querySelector(".earn-drawer > header").getBoundingClientRect();
    const footer = document.querySelector(".earn-drawer > footer").getBoundingClientRect();
    // Pre-clamp height BEFORE positioning (same order as the original engine) so
    // the first-open measurement matches; then position, then fine-tune height.
    popup.style.maxHeight = `${Math.max(100, footer.top - header.bottom - 16)}px`;
    AFF.tooltip.position(popup, trigger, { align: "right", bounds: { top: header.bottom, bottom: footer.top }, gap: 8 });
    const pb = popup.getBoundingClientRect();
    const rect = trigger.getBoundingClientRect();
    const maxH = pb.top >= rect.bottom ? footer.top - 16 - rect.bottom : rect.top - 16 - header.bottom;
    if (pb.height > maxH) popup.style.maxHeight = `${Math.max(80, maxH)}px`;
  }

  function leaveDetailHelp(event) {
    const anchor = event.target.closest(".earn-help-anchor");
    if (!anchor || anchor.contains(event.relatedTarget)) return;
    detailHelpTimer = setTimeout(() => setDetailHelp(false), 120);
  }

  document.addEventListener("pointerover", event => {
    if (event.pointerType === "mouse" && event.target.closest(".earn-help-anchor")) setDetailHelp(true);
  });
  document.addEventListener("pointerout", event => {
    if (event.pointerType === "mouse") leaveDetailHelp(event);
  });
  document.addEventListener("focusin", event => {
    if (event.target.closest(".earn-help-anchor") && event.target.matches(":focus-visible")) setDetailHelp(true);
  });
  document.addEventListener("focusout", leaveDetailHelp);
  document.addEventListener("scroll", event => {
    if (event.target.classList?.contains("earn-drawer-body")) setDetailHelp(false);
  }, true);
  window.addEventListener("resize", () => setDetailHelp(false));

  // Touch browsers do not always promote a tap on a drawer control to the
  // delegated click listener after the help popover repositions. Handle the
  // gesture directly and suppress the compatibility click to avoid toggling
  // twice.
  document.addEventListener("pointerup", event => {
    if (event.pointerType !== "touch" || AFF.state?.route !== "pay") return;
    const trigger = event.target.closest?.('[data-earn-action="detail-help"]');
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    const open = !state().detailHelp;
    setDetailHelp(open);
    if (!open) trigger.blur();
  });

  document.addEventListener("click", event => {
    if (AFF.state?.route !== "pay") return;
    if (!event.target.closest(".earn-help-anchor")) setDetailHelp(false);
    const node = event.target.closest("[data-earn-action], [data-earn-detail], [data-earn-appeal], [data-earn-page], [data-aff-page], [data-earn-clear]");
    if (!node || node.disabled) return;
    const s = state();
    if (node.dataset.earnDetail || node.dataset.earnAppeal) {
      const id = node.dataset.earnDetail || node.dataset.earnAppeal;
      const row = records().find(item => item.id === id);
      if (!row || node.dataset.earnAppeal && (!canAppeal(row) || appealRecord(row))) return;
      returnFocus = `[${node.dataset.earnDetail ? "data-earn-detail" : "data-earn-appeal"}="${CSS.escape(id)}"]`;
      s.detail = id; s.appeal = Boolean(node.dataset.earnAppeal); s.appealDraft = ""; s.appealError = ""; s.detailHelp = false;
      return rerender(s.appeal ? "#earn-appeal-reason" : ".earn-drawer > header button");
    }
    if (node.dataset.earnPage || node.dataset.affPage) {
      s.page = Number(node.dataset.earnPage || node.dataset.affPage);
      rerender();
      AFF.pagination.focusNav("earnings");
      return;
    }
    if (node.dataset.earnClear) {
      delete s.filters[node.dataset.earnClear];
      s.draft = { ...s.filters };
      s.page = 1;
      return rerender();
    }
    const action = node.dataset.earnAction;
    if (action === "close") {
      if (s.filterDrawer) {
        s.filterDrawer = false;
        return rerender(returnFocus);
      }
      return close();
    }
    if (action === "filters") {
      returnFocus = "[data-earn-action='filters']";
      s.filterDrawer = true;
      s.draft = { ...s.filters };
      s.error = "";
      return rerender(".earn-filter-drawer .earn-icon-button");
    }
    if (action === "filter-close") {
      s.filterDrawer = false;
      s.error = "";
      return rerender(returnFocus);
    }
    if (action === "filter-reset" || action === "quick-reset" || action === "clear-filters" || action === "reset") {
      s.filters = defaultFilters(); s.draft = { ...s.filters }; s.error = ""; s.page = 1;
      if (action === "filter-reset") return rerender(".earn-filter-drawer [data-earn-action='filter-reset']");
      s.filterDrawer = false;
      return rerender(action === "quick-reset" ? "[data-earn-action='quick-reset']" : returnFocus);
    }
    if (action === "filter-apply") {
      const f = s.draft;
      s.error = !validDate(f.from) || !validDate(f.to) || f.from > f.to || f.to > AFF.reporting.now
        ? t("请选择有效日期，开始日期不得晚于结束日期，结束日期不得晚于数据截止日。", "Choose valid dates. Start must not follow end, and end must not exceed the data date.")
        : f.status && !statusLabels[f.status] || f.withdrawalStatus && !withdrawalStatusLabels[f.withdrawalStatus] || f.type && !typeLabels[f.type] || f.caseType && !caseTypeLabels[f.caseType] || f.riskStatus && !riskLabels[f.riskStatus]
          ? t("请选择有效的筛选条件。", "Choose valid filter conditions.") : "";
      if (s.error) {
        document.querySelector("#earn-filter-error").textContent = s.error;
        return;
      }
      s.filters = { ...f, settlementId: String(f.settlementId || "").trim() };
      s.filterDrawer = false;
      s.page = 1;
      return rerender(returnFocus);
    }
    if (action === "detail-help") {
      if (s.detailHelp) {
        setDetailHelp(false);
        node.blur();
        return;
      }
      return setDetailHelp(true);
    }
    if (action === "submit-appeal") {
      const row = records().find(item => item.id === s.detail);
      if (!row || !canAppeal(row) || appealRecord(row)) return;
      const explanation = s.appealDraft.trim();
      if (!explanation) {
        s.appealError = t("请填写申诉说明。", "Enter an explanation.");
        document.querySelector("#earn-appeal-error").textContent = s.appealError;
        document.querySelector("#earn-appeal-reason").setAttribute("aria-invalid", "true");
        return document.querySelector("#earn-appeal-reason").focus();
      }
      AFF.state.clientCommissionAppeals ||= {};
      AFF.state.clientCommissionAppeals[row.id] = {
        clientId: row.client.clientId, commissionId: row.id, status: "pending",
        explanation, submittedAt: new Date().toISOString()
      };
      s.appeal = false; s.appealDraft = ""; s.appealError = "";
      showToast(t("申诉已提交，等待复核。", "Appeal submitted for review."));
      return rerender(".earn-drawer > header button");
    }
  });

  const updateDraft = event => {
    if (AFF.state?.route !== "pay") return;
    if (event.target.matches("[data-earn-filter]")) {
      state().draft[event.target.dataset.earnFilter] = event.target.value;
    }
    if (event.target.matches("[data-earn-appeal-reason]")) {
      state().appealDraft = event.target.value;
      state().appealError = "";
      event.target.removeAttribute("aria-invalid");
      const error = document.querySelector("#earn-appeal-error");
      if (error) error.textContent = "";
    }
  };
  document.addEventListener("input", updateDraft);
  document.addEventListener("date-range-change", event => {
    if (AFF.state?.route !== "pay" || event.detail.id !== "earnings-filter-range") return;
    const s = state();
    s.draft.from = event.detail.from;
    s.draft.to = event.detail.to;
  });
  document.addEventListener("change", event => {
    updateDraft(event);
    if (AFF.state?.route !== "pay") return;
    if (event.target.matches("[data-earn-quick]")) {
      const s = state();
      const key = event.target.dataset.earnQuick;
      if (event.target.value) s.filters[key] = event.target.value;
      else delete s.filters[key];
      s.draft = { ...s.filters };
      s.page = 1;
      s.error = "";
      return rerender(`[data-earn-quick="${CSS.escape(key)}"]`);
    }
    if (!event.target.matches("[data-earn-page-size], [data-aff-page-size]")) return;
    state().pageSize = Number(event.target.value); state().page = 1;
    rerender("[data-aff-page-size]");
  });
  document.addEventListener("keydown", event => {
    if (AFF.state?.route !== "pay") return;
    if (event.key === "Escape") {
      if (state().detailHelp) {
        event.preventDefault();
        return setDetailHelp(false);
      }
      if (state().detail) { event.preventDefault(); return close(); }
    }
    if (event.key !== "Tab" || !state().detail) return;
    const nodes = [...document.querySelectorAll(".earn-drawer button:not(:disabled), .earn-drawer textarea")];
    if (event.shiftKey && document.activeElement === nodes[0]) {
      event.preventDefault(); nodes.at(-1)?.focus();
    } else if (!event.shiftKey && document.activeElement === nodes.at(-1)) {
      event.preventDefault(); nodes[0]?.focus();
    }
  });
  window.addEventListener("hashchange", () => {
    if (!AFF.state?.earnings) return;
    AFF.state.earnings.detail = null; AFF.state.earnings.appeal = false;
    AFF.state.earnings.detailHelp = false; AFF.state.earnings.appealDraft = "";
  });

  AFF.earnings = { state, records, filteredRows, totals, holdDetails, holdRules, reason, renderPage };
  AFF.pages.pay = renderPage;
})();
