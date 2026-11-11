(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const money = cents => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  const labels = {
    retained: ["保留中", "Retained", "warning"],
    released: ["已释放", "Released", "ok"],
    used: ["已抵扣", "Used", "danger"],
    frozen: ["结算中", "In settlement", "warning"]
  };
  const types = {
    retained: ["扣留", "Retained"],
    released: ["释放", "Released"],
    used: ["抵扣", "Used"]
  };
  const caseTypeLabels = {
    qftd_batch: ["注册+有效FTD佣金", "Registration + valid FTD commission"],
    quality_service: ["质量服务佣金", "Quality service commission"]
  };
  const reasonLabels = {
    "DEPOSIT-REFUNDED": ["首次入金退款", "First deposit refunded"],
    "DEPOSIT-CHARGEBACK": ["首次入金拒付", "First deposit chargeback"],
    "ELIGIBILITY-REVIEW": ["客户资格复核变更", "Client eligibility review changed"]
  };
  const caseStatusLabels = {
    not_generated: ["未生成", "Not generated"],
    pending: ["待检查", "Pending review"],
    held: ["结算中", "On hold"],
    manual_review: ["人工确认中", "Manual review"],
    approved: ["已审核", "Approved"],
    settled: ["已结算", "Settled"],
    rejected: ["已拒绝", "Rejected"],
    reversed: ["已冲正", "Reversed"],
    frozen: ["结算中", "In settlement"]
  };
  let detailReturnFocus = null;
  const initialized = new WeakSet();

  function state() {
    const defaults = {
      type: "", status: "", dateFrom: "", dateTo: "", releaseFrom: "", releaseTo: "",
      minAmount: "", maxAmount: "", search: "", page: 1, pageSize: 10, detail: null, filterDrawer: false
    };
    AFF.state.guaranteePage ||= { ...defaults };
    const s = AFF.state.guaranteePage;
    if (!initialized.has(s)) {
      Object.assign(s, defaults, s);
      s.draft = { ...defaults, ...s };
      initialized.add(s);
    }
    return s;
  }

  const calculatorCountryNames = {
    VN: "越南", TH: "泰国", ID: "印度尼西亚", ZA: "南非", NG: "尼日利亚", PK: "巴基斯坦",
    EG: "埃及", KW: "科威特", QA: "卡塔尔", KZ: "哈萨克斯坦", SA: "沙特阿拉伯", BD: "孟加拉国"
  };

  AFF.programCalculatorResult = function programCalculatorResult() {
    const input = AFF.state.programCalculator;
    const country = AFF.partnerProgram.commissionCountries.find(item => item.code === input.country) ||
      AFF.partnerProgram.commissionCountries[0];
    const countryName = calculatorCountryNames[country.code] || country.name;
    const tier = [...country.tiers].reverse().find(item =>
      Number(input.netDeposit) >= item.netDeposit && Number(input.volume) >= item.volume && Number(input.days) >= item.days) ||
      { tier: "未达标", basePrice: 0, netDeposit: 300, volume: 1, days: 3 };
    const gross = tier.basePrice * country.coefficient;
    // 税档与Hold天数按ISO码查询，与finance.configuration键一致
    const taxTier = AFF.finance.configuration.countryTax[country.code] || "T2";
    const taxRate = AFF.finance.configuration.taxRates[taxTier].rate;
    const guaranteeRate = AFF.finance.configuration.guaranteeRate;
    const tax = gross * taxRate;
    const guarantee = gross * guaranteeRate;
    const available = gross - tax - guarantee;
    const holdDays = 1 + (AFF.finance.configuration.countryHold[country.code] || 3) +
      (AFF.finance.configuration.paymentHold[input.payment] || 0);
    const releaseDate = new Date(Date.parse(`${AFF.finance.asOf}T00:00:00Z`) + holdDays * 86400000).toISOString().slice(0, 10);
    const guaranteeDate = new Date(Date.parse(`${releaseDate}T00:00:00Z`) + AFF.finance.configuration.guaranteeReleaseDays * 86400000).toISOString().slice(0, 10);
    return { country, countryName, tier, gross, taxTier, taxRate, tax, guarantee, available, holdDays, releaseDate, guaranteeDate, payment: input.payment };
  };

  function records() {
    const s = state();
    const query = s.search.trim().toLowerCase();
    const minAmount = s.minAmount === "" ? null : Math.round(Number(s.minAmount) * 100);
    const maxAmount = s.maxAmount === "" ? null : Math.round(Number(s.maxAmount) * 100);
    return AFF.finance.guaranteeRecords
      .filter(record => !s.type || record.type === s.type)
      .filter(record => !s.status || record.status === s.status)
      .filter(record => !s.dateFrom || record.date >= s.dateFrom)
      .filter(record => !s.dateTo || record.date <= s.dateTo)
      .filter(record => !s.releaseFrom || (record.estimatedReleaseAt && record.estimatedReleaseAt >= s.releaseFrom))
      .filter(record => !s.releaseTo || (record.estimatedReleaseAt && record.estimatedReleaseAt <= s.releaseTo))
      .filter(record => minAmount === null || !Number.isFinite(minAmount) || record.amount >= minAmount)
      .filter(record => maxAmount === null || !Number.isFinite(maxAmount) || record.amount <= maxAmount)
      .filter(record => !query || [record.id, record.clientId, record.commissionCaseId, settlementId(record)].some(value => String(value).toLowerCase().includes(query)))
      .sort((left, right) => right.date.localeCompare(left.date) || left.id.localeCompare(right.id));
  }

  function commissionCase(record) {
    const client = AFF.reporting.rows.find(item => item.clientId === record.clientId);
    return client?.commissionCases?.find(item => item.id === record.commissionCaseId);
  }

  function settlementId(record) {
    return commissionCase(record)?.settlement?.statementId ||
      AFF.finance.settlements.find(item => item.commissionCaseId === record.commissionCaseId)?.statementId ||
      commissionCase(record)?.settlement?.id || "";
  }

  function withdrawalInfo(record) {
    const orders = AFF.finance.allWithdrawals().filter(order => order.allocations?.some(allocation =>
      allocation.sourceId === record.id ||
      (allocation.source === "guarantee_release" && allocation.commissionCaseId === record.commissionCaseId)
    ));
    const paid = orders.filter(order => order.status === "paid")
      .reduce((sum, order) => sum + order.allocations.filter(allocation =>
        allocation.sourceId === record.id || (allocation.source === "guarantee_release" && allocation.commissionCaseId === record.commissionCaseId)
      ).reduce((total, allocation) => total + allocation.amount, 0), 0);
    const processing = orders.filter(order => ["pending_review", "processing"].includes(order.status))
      .reduce((sum, order) => sum + order.allocations.filter(allocation =>
        allocation.sourceId === record.id || (allocation.source === "guarantee_release" && allocation.commissionCaseId === record.commissionCaseId)
      ).reduce((total, allocation) => total + allocation.amount, 0), 0);
    if (record.status !== "released") return { key: "unavailable", settlementId: settlementId(record) };
    if (paid >= record.amount && record.amount > 0) return { key: "paid", settlementId: settlementId(record) };
    if (processing > 0 && paid > 0) return { key: "partial", settlementId: settlementId(record) };
    if (processing > 0) return { key: "processing", settlementId: settlementId(record) };
    return { key: "available", settlementId: settlementId(record) };
  }

  const withdrawalLabels = {
    unavailable: ["不可提现", "Not withdrawable", "muted"],
    available: ["可提现", "Available", "info"],
    processing: ["提现中", "Withdrawal processing", "warning"],
    partial: ["部分提现", "Partially withdrawn", "warning"],
    paid: ["已提现", "Withdrawn", "ok"]
  };

  function withdrawalTag(record) {
    const value = withdrawalLabels[withdrawalInfo(record).key] || withdrawalLabels.unavailable;
    return `<span class="tag tag-${value[2]}">${t(value[0], value[1])}</span>`;
  }

  function filterDrawer() {
    const s = state();
    const f = s.draft || s;
    return `<div class="aff-drawer-overlay" data-guarantee-action="close"></div>
      <aside class="aff-drawer finance-drawer guarantee-filter-drawer" role="dialog" aria-modal="true" aria-labelledby="guarantee-filter-title">
        <header><div><h2 id="guarantee-filter-title">${t("筛选器", "Filters")}</h2><span>${t("按保证金流水筛选", "Filter guarantee ledger")}</span></div><button class="finance-drawer-close" type="button" data-guarantee-action="close" aria-label="${t("关闭筛选器", "Close filters")}">×</button></header>
        <div class="finance-drawer-body"><section>
          <div class="guarantee-filter-grid">
            <label><span>${t("类型", "Type")}</span><select data-guarantee-filter="type"><option value="">${t("全部", "All")}</option>${Object.entries(types).map(([value, text]) => `<option value="${value}" ${f.type === value ? "selected" : ""}>${t(...text)}</option>`).join("")}</select></label>
            <label><span>${t("发生日期范围", "Date range")}</span>${AFF.dateRange.component({ id: "guarantee-date-range", from: f.dateFrom, to: f.dateTo, max: AFF.finance.asOf, placeholder: t("选择发生日期范围", "Select date range") })}</label>
            <label><span>${t("释放日期范围", "Release date range")}</span>${AFF.dateRange.component({ id: "guarantee-release-range", from: f.releaseFrom, to: f.releaseTo, max: AFF.finance.asOf, placeholder: t("选择释放日期范围", "Select release dates") })}</label>
            <label><span>${t("最小金额", "Min amount")}</span><input type="number" min="0" step="0.01" data-guarantee-filter="minAmount" value="${h(f.minAmount)}" placeholder="0.00"></label>
            <label><span>${t("最大金额", "Max amount")}</span><input type="number" min="0" step="0.01" data-guarantee-filter="maxAmount" value="${h(f.maxAmount)}" placeholder="999.99"></label>
            <label><span>${t("搜索", "Search")}</span><input data-guarantee-filter="search" value="${h(f.search)}" placeholder="${t("客户 / 佣金 / 结算单", "Client / commission / settlement")}" maxlength="80"></label>
          </div>
        </section></div>
        <footer><button class="button secondary" type="button" data-guarantee-action="reset">${t("重置", "Reset")}</button><button class="button secondary" type="button" data-guarantee-action="close">${t("取消", "Cancel")}</button><button class="button primary" type="button" data-guarantee-action="apply">${t("应用筛选", "Apply filters")}</button></footer>
      </aside>`;
  }

  function tag(status) {
    return `<span class="tag tag-${labels[status]?.[2] || "muted"}">${t(labels[status]?.[0] || status, labels[status]?.[1] || status)}</span>`;
  }

  function detailField(name, value) {
    return `<div><dt>${h(name)}</dt><dd>${h(value || "-")}</dd></div>`;
  }

  function caseStatusLabel(status) {
    return t(...caseStatusLabels[status] || [status || "-", status || "-"]);
  }

  function detailDrawer() {
    const record = AFF.finance.guaranteeRecords.find(item => item.id === state().detail);
    if (!record) return "";
    const client = AFF.reporting.rows.find(item => item.clientId === record.clientId);
    const commissionCase = client?.commissionCases?.find(item => item.id === record.commissionCaseId);
    const caseType = commissionCase
      ? t(...caseTypeLabels[commissionCase.type] || [commissionCase.type, commissionCase.type])
      : "-";
    const settlement = commissionCase?.settlement;
    const reason = record.reasonCode
      ? t(...reasonLabels[record.reasonCode] || [record.reasonCode, record.reasonCode])
      : "-";
    const frozenReason = record.freezeReasonCode
      ? `${record.freezeReasonCode} · ${t(record.freezeReason, record.freezeReason)}`
      : "-";
    const timeline = [
      { title: t("佣金确认", "Commission confirmed"), date: commissionCase?.confirmedAt, text: `${caseType} · ${money(commissionCase?.amountCents || 0)}` },
      { title: t("保证金扣留", "Guarantee retained"), date: record.retainedAt || record.date, text: `${(record.rate ?? AFF.finance.configuration.guaranteeRate) * 100}% · ${money(record.amount)}` },
      record.type === "used"
        ? { title: t("保证金抵扣", "Guarantee used"), date: record.date, text: reason }
        : { title: t("保证金释放", "Guarantee release"), date: record.estimatedReleaseAt || record.normalReleaseAt, text: record.status === "frozen" ? (reason !== "-" ? reason : frozenReason) : t("释放后进入可提现余额", "Released into the available balance") }
    ];
    return `<div class="aff-drawer-overlay" data-guarantee-action="close"></div>
      <aside class="aff-drawer finance-drawer" role="dialog" aria-modal="true" aria-labelledby="guarantee-detail-title">
        <header>
          <div><h2 id="guarantee-detail-title">${t("保证金详情", "Guarantee details")}</h2><span>${h(record.id)}</span></div>
          <button class="finance-drawer-close" type="button" data-guarantee-action="close" aria-label="${t("关闭详情", "Close details")}">×</button>
        </header>
        <div class="finance-drawer-body">
          <section class="finance-drawer-amount">
            <span>${t("保证金金额", "Guarantee amount")}</span><strong>${money(record.amount)}</strong>${tag(record.status)}
          </section>
          <section>
            <h3>${t("流水信息", "Ledger information")}</h3>
            <dl class="finance-detail-grid">
              ${detailField(t("发生日期", "Date"), record.date)}
              ${detailField(t("类型", "Type"), t(...types[record.type] || [record.type, record.type]))}
              ${detailField(t("客户", "Client"), record.clientId)}
              ${detailField(t("佣金案件", "Commission case"), record.commissionCaseId)}
              ${detailField(t("结算单编号", "Settlement ID"), settlementId(record))}
              ${detailField(t("提现状态", "Withdrawal status"), t(...(withdrawalLabels[withdrawalInfo(record).key] || withdrawalLabels.unavailable).slice(0, 2)))}
              ${detailField(t("扣留比例", "Retention rate"), `${(record.rate ?? AFF.finance.configuration.guaranteeRate) * 100}%`)}
              ${detailField(t("扣留时间", "Retained at"), record.retainedAt)}
              ${detailField(t("正常释放日", "Normal release date"), record.normalReleaseAt)}
              ${detailField(t("预计释放日", "Estimated release date"), record.estimatedReleaseAt)}
              ${detailField(t("抵扣原因", "Use reason"), reason)}
              ${detailField(t("结算中原因", "In-settlement reason"), frozenReason)}
              ${detailField(t("规则版本", "Rule version"), record.ruleVersion)}
            </dl>
          </section>
          <section>
            <h3>${t("关联佣金", "Related commission")}</h3>
            <dl class="finance-detail-grid">
              ${detailField(t("客户", "Client"), client ? `${client.clientId} · ${client.email}` : "-")}
              ${detailField(t("国家/地区", "Country / region"), client ? AFF.countryLabel(client.country) : "")}
              ${detailField(t("资格档", "Tier"), client?.tier)}
              ${detailField(t("佣金分段", "Commission segment"), caseType)}
              ${detailField(t("佣金金额", "Commission amount"), commissionCase ? money(commissionCase.amountCents) : "-")}
              ${detailField(t("佣金状态", "Commission status"), caseStatusLabel(commissionCase?.status))}
              ${detailField(t("结算日期", "Settlement date"), settlement?.settledAt)}
              ${detailField(t("结算净额", "Settlement net"), settlement ? money(settlement.availableAmount) : "-")}
            </dl>
          </section>
          <section>
            <h3>${t("资金路径", "Fund path")}</h3>
            <ol class="finance-detail-timeline">${timeline.map(item => `<li class="${item.date ? "complete" : ""}"><div><strong>${h(item.title)}</strong><span>${h(item.text)}</span></div><time>${h(item.date || "-")}</time></li>`).join("")}</ol>
          </section>
        </div>
        <footer><button class="button secondary" type="button" data-guarantee-action="close">${t("关闭", "Close")}</button></footer>
      </aside>`;
  }

  function renderPage() {
    const s = state();
    const configuration = AFF.finance.configuration;
    const guaranteeRate = `${configuration.guaranteeRate * 100}%`;
    const guaranteeReleaseDays = `${configuration.guaranteeReleaseDays} ${t("自然日", "days")}`;
    const terminationRetentionDays = `${configuration.terminationRetentionDays} ${t("自然日", "days")}`;
    const rows = records();
    const pageCount = Math.max(1, Math.ceil(rows.length / s.pageSize));
    s.page = Math.min(pageCount, Math.max(1, s.page));
    const shown = rows.slice((s.page - 1) * s.pageSize, s.page * s.pageSize);
    const wantedPages = [...new Set([1, s.page - 1, s.page, s.page + 1, pageCount])]
      .filter(page => page >= 1 && page <= pageCount).sort((left, right) => left - right);
    const retained = AFF.finance.guaranteeRecords.filter(item => ["retained", "frozen"].includes(item.status));
    const released = AFF.finance.guaranteeRecords.filter(item => item.status === "released");
    const used = AFF.finance.guaranteeRecords.filter(item => item.status === "used");
    const next = retained.map(item => item.estimatedReleaseAt).sort()[0];
    return `
      ${AFF.helpers.pageHeader("保证金", "滚动保证金扣留、释放、抵扣与终止合作保留规则。", `<button class="button secondary" type="button" data-route="pay">${t("查看收益", "View earnings")}</button>`)}
      <div class="finance-page">
        ${AFF.helpers.cards([
          { label: t("保证金余额", "Guarantee balance"), value: money(retained.reduce((sum, item) => sum + item.amount, 0)), hint: t("下一批释放", "Next release") + "：" + (next || "-") },
          { label: t("累计扣留", "Total retained"), value: money(AFF.finance.guaranteeRecords.reduce((sum, item) => sum + item.amount, 0)), hint: t(`按佣金总额${guaranteeRate}`, `${guaranteeRate} of gross commission`) },
          { label: t("已释放", "Released"), value: money(released.reduce((sum, item) => sum + item.amount, 0)), hint: t("已进入可提现余额", "Credited to balance") },
          { label: t("已抵扣", "Used"), value: money(used.reduce((sum, item) => sum + item.amount, 0)), hint: t("冲正或风险扣款", "Reversal or risk deduction") }
        ])}
        <section class="card">
          <div class="panel-header"><h2>${t("规则说明", "Rules")}</h2><span class="helper">${t("演示参考值，可配置", "Demo reference, configurable")}</span></div>
          <div class="panel-body">
            <div class="finance-rule-grid">
              <div><span>${t("扣留比例", "Rate")}</span><strong>${guaranteeRate}</strong><small>${t("佣金通过结算检查时扣留", "Retained after settlement checks")}</small></div>
              <div><span>${t("正常释放", "Normal release")}</span><strong>${guaranteeReleaseDays}</strong><small>${t("无未结风险自动释放", "Automatic when no open risk")}</small></div>
              <div><span>${t("终止合作保留", "Termination retention")}</span><strong>${terminationRetentionDays}</strong><small>${t("与正常释放期取更晚", "Uses the later date")}</small></div>
              <div><span>${t("释放去向", "Release target")}</span><strong>${t("可提现余额", "Available balance")}</strong><small>${t("不自动打款，不重复扣税", "No auto payout or duplicate tax")}</small></div>
            </div>
          </div>
        </section>
        <section class="card">
          <div class="panel-header guarantee-table-header"><div><h2>${t("保证金流水", "Guarantee ledger")}</h2><span class="helper">${t("数据截至", "As of")} ${AFF.finance.asOf}</span></div><div class="guarantee-table-actions"><button class="button secondary" type="button" data-guarantee-action="filters">${t("筛选器", "Filters")}</button><button class="button secondary" type="button" data-guarantee-action="reset">${t("重置", "Reset")}</button></div></div>
          <div class="client-quick-filters guarantee-quick-filters">
            <label class="client-quick-field"><span class="sr-only">${t("保证金状态", "Guarantee status")}</span><select data-aff-dd="off" data-guarantee-quick="status" data-guarantee-filter="status" aria-label="${t("保证金状态", "Guarantee status")}">
              <option value="">${t("保证金状态：全部", "Guarantee status: All")}</option>
              ${Object.entries(labels).map(([value, text]) => `<option value="${value}" ${s.status === value ? "selected" : ""}>${t(text[0], text[1])}</option>`).join("")}
            </select></label>
          </div>
          <div class="finance-table-wrap">
            <table>
              <thead><tr>
                <th>${t("日期", "Date")}</th><th>${t("流水编号", "Ledger ID")}</th><th>${t("类型", "Type")}</th>
                <th>${t("客户", "Client")}</th><th>${t("佣金案件", "Case")}</th><th>${t("结算单编号", "Settlement ID")}</th><th>${t("金额", "Amount")}</th>
                <th>${t("保证金状态", "Guarantee status")}</th><th>${t("提现状态", "Withdrawal status")}</th><th>${t("预计释放", "Estimated release")}</th><th>${t("规则版本", "Rule version")}</th><th>${t("操作", "Action")}</th>
              </tr></thead>
              <tbody>
                ${shown.length ? shown.map(record => `<tr>
                  <td>${h(record.date)}</td><td>${h(record.id)}</td><td>${t(...types[record.type] || [record.type, record.type])}</td>
                  <td>${h(record.clientId)}</td><td>${h(record.commissionCaseId)}</td><td>${settlementId(record) ? `<button class="finance-link" type="button" data-guarantee-settlement="${h(settlementId(record))}">${h(settlementId(record))}</button>` : "-"}</td><td class="numeric">${money(record.amount)}</td>
                  <td>${tag(record.status)}</td><td>${withdrawalTag(record)}</td><td>${h(record.estimatedReleaseAt || "-")}</td><td>${h(record.ruleVersion)}</td>
                  <td><button class="button secondary small" type="button" data-guarantee-detail="${h(record.id)}">${t("详情", "Details")}</button></td>
                </tr>`).join("") : `<tr><td colspan="12" class="finance-empty"><strong>${t("暂无数据", "No data")}</strong><p>${t("产生保证金记录后将在此显示。", "Records will appear here.")}</p></td></tr>`}
              </tbody>
            </table>
          </div>
          ${AFF.pagination.component({ page: s.page, pageSize: s.pageSize, total: rows.length, channel: "guarantee" })}
        </section>
      </div>
      ${detailDrawer()}${s.filterDrawer ? filterDrawer() : ""}`;
  }

  document.addEventListener("input", event => {
    if (AFF.state?.route !== "guarantee" || !event.target.matches("[data-guarantee-filter]")) return;
    const s = state();
    s.draft[event.target.dataset.guaranteeFilter] = event.target.value;
  });
  document.addEventListener("change", event => {
    if (AFF.state?.route !== "guarantee") return;
    if (event.target.matches("[data-guarantee-quick]")) {
      const s = state();
      s.status = event.target.value;
      s.draft.status = s.status;
      s.page = 1;
      s.detail = null;
      render();
      return;
    }
    if (!event.target.matches("[data-guarantee-page-size], [data-aff-page-size]")) return;
    const s = state();
    s.pageSize = Number(event.target.value);
    s.page = 1;
    s.detail = null;
    render();
    document.querySelector("[data-aff-page-size]")?.focus();
  });
  document.addEventListener("date-range-change", event => {
    if (AFF.state?.route !== "guarantee") return;
    const detail = event.detail;
    if (!["guarantee-date-range", "guarantee-release-range"].includes(detail.id)) return;
    const s = state();
    if (detail.id === "guarantee-date-range") {
      s.draft.dateFrom = detail.from;
      s.draft.dateTo = detail.to;
    } else {
      s.draft.releaseFrom = detail.from;
      s.draft.releaseTo = detail.to;
    }
  });
  document.addEventListener("click", event => {
    if (AFF.state?.route !== "guarantee") return;
    const action = event.target.closest("[data-guarantee-action]")?.dataset.guaranteeAction;
    if (action === "filters") {
      const s = state();
      s.draft = { ...s, ...(s.draft || {}) };
      s.filterDrawer = true;
      render();
      return document.querySelector(".guarantee-filter-drawer .finance-drawer-close")?.focus();
    }
    if (action === "apply") {
      const s = state();
      ["type", "status", "dateFrom", "dateTo", "releaseFrom", "releaseTo", "minAmount", "maxAmount", "search"]
        .forEach(key => { s[key] = s.draft[key] || ""; });
      s.draft = { ...s.draft };
      s.filterDrawer = false;
      s.page = 1;
      s.detail = null;
      render();
      return;
    }
    const reset = event.target.closest("[data-guarantee-action='reset']");
    if (reset) {
      AFF.state.guaranteePage = undefined;
      render();
      return document.querySelector("[data-guarantee-quick='status']")?.focus();
    }
    if (action === "close") {
      const s = state();
      if (s.filterDrawer) {
        s.filterDrawer = false;
        render();
        return;
      }
      s.detail = null;
      render();
      return document.querySelector(detailReturnFocus)?.focus();
    }
    const settlementButton = event.target.closest("[data-guarantee-settlement]");
    if (settlementButton) {
      const earnings = AFF.earnings?.state?.();
      if (earnings) {
        earnings.filters = { ...earnings.filters, settlementId: settlementButton.dataset.guaranteeSettlement };
        earnings.draft = { ...earnings.filters };
        earnings.page = 1;
      }
      return navigate("pay");
    }
    const detailButton = event.target.closest("[data-guarantee-detail]");
    if (detailButton) {
      detailReturnFocus = `[data-guarantee-detail="${CSS.escape(detailButton.dataset.guaranteeDetail)}"]`;
      state().detail = detailButton.dataset.guaranteeDetail;
      render();
      return document.querySelector(".finance-drawer-close")?.focus();
    }
    const pageButton = event.target.closest("[data-guarantee-page], [data-aff-page]");
    if (!pageButton || pageButton.disabled) return;
    state().page = Number(pageButton.dataset.guaranteePage || pageButton.dataset.affPage);
    // D-02 5A: pagination no longer force-closes the open detail drawer.
    render();
    AFF.pagination.focusNav("guarantee");
  });
  document.addEventListener("keydown", event => {
    if (AFF.state?.route !== "guarantee" || event.key !== "Escape") return;
    event.preventDefault();
    const s = state();
    if (s.filterDrawer) {
      s.filterDrawer = false;
      render();
      return;
    }
    if (!s.detail) return;
    s.detail = null;
    render();
    document.querySelector(detailReturnFocus)?.focus();
  });

  AFF.pages.guarantee = renderPage;
})();
