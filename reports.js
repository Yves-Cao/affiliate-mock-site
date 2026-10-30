(() => {
  const data = AFF.reporting;
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const timeKeys = ["date", "week", "month", "year"];
  const routeKeys = ["perf", "clients", "summary"];
  const presetDays = { today: 1, past7: 7, past30: 30, past90: 90 };
  const previousMetricDefaults = {
    perf: ["clicks", "visitors", "registrations", "ftd", "effective", "quality", "ftdRate", "qualityRate", "expected", "held"],
    summary: ["registrations", "ftd", "effective", "quality", "ftdRate", "qualityRate", "expected", "tax", "guarantee", "available", "paid"]
  };
  const metricDefaults = {
    perf: ["clicks", "visitors", "registrations", "ftd", "effective", "quality", "ftdRate", "effectiveRate", "qualityRate", "expected", "held"],
    summary: ["registrations", "ftd", "effective", "quality", "ftdRate", "effectiveRate", "qualityRate", "expected", "tax", "guarantee", "available", "paid"]
  };
  let returnFocus = null;
  let holdHelpTimer = null;
  const initializedStates = new WeakSet();

  function dateShift(value, days) {
    const date = new Date(`${value}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function range(preset) {
    const now = data.now;
    if (presetDays[preset]) return { from: dateShift(now, 1 - presetDays[preset]), to: now };
    if (preset === "lastWeek") {
      const weekday = (new Date(`${now}T00:00:00Z`).getUTCDay() + 6) % 7;
      return { from: dateShift(now, -weekday - 7), to: dateShift(now, -weekday - 1) };
    }
    if (preset === "lastMonth") {
      const first = `${now.slice(0, 7)}-01`;
      const last = dateShift(first, -1);
      return { from: `${last.slice(0, 7)}-01`, to: last };
    }
    return null;
  }

  function state(route = AFF.state.route) {
    AFF.state.reports ||= {};
    if (!AFF.state.reports[route]) {
      AFF.state.reports[route] = {
        groups: ["date"], filters: range("past30"), preset: "past30",
        columns: [...(metricDefaults[route] || [])], page: 1, pageSize: 10,
        sort: route === "clients" ? "registeredAt" : "date", direction: "desc"
      };
    }
    const value = AFF.state.reports[route];
    if (!initializedStates.has(value)) {
      value.drawer = null; value.client = null; value.picker = false; value.appeal = false; value.appealDraft = "";
      if (!value.columnsCustomized && previousMetricDefaults[route]?.join(",") === value.columns.join(",")) {
        value.columns = [...metricDefaults[route]];
      }
      initializedStates.add(value);
    }
    value.groups = value.groups.filter(key => data.dimensions.some(item => item.key === key)).slice(0, 2);
    value.columns = value.columns.filter(key => data.metrics.some(item => item.key === key));
    if (route !== "clients" && !value.columns.length) value.columns = [...metricDefaults[route]];
    return value;
  }

  function renderPage(focusSelector) {
    clearTimeout(holdHelpTimer);
    render();
    if (focusSelector) document.querySelector(focusSelector)?.focus();
  }

  function label(key) {
    const item = data.dimensions.find(item => item.key === key) || data.metrics.find(item => item.key === key);
    return item ? t(item.label, item.en) : key;
  }

  function format(value, type = "count") {
    if (value === null || value === undefined) return "—";
    if (type === "money") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
    if (type === "rate") return `${(value * 100).toFixed(1)}%`;
    return new Intl.NumberFormat("en-US").format(value);
  }

  function icon(name) {
    const paths = {
      add: '<path d="M12 5v14M5 12h14"/>',
      close: '<path d="m6 6 12 12M6 18 18 6"/>',
      filter: '<path d="M4 4h16l-6 7v7l-4 2v-9z"/>',
      columns: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M9 4v16M15 4v16"/>',
      download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
      left: '<path d="m14 6-6 6 6 6"/>',
      right: '<path d="m10 6 6 6-6 6"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
  }

  function iconButton(action, name, title, extra = "") {
    return `<button class="button secondary report-icon" type="button" data-rp-action="${action}" title="${h(title)}" aria-label="${h(title)}" ${extra}>${icon(name)}</button>`;
  }

  function status(row) {
    const map = {
      pending_attribution: ["注册", "Registration", "muted"],
      pending: ["KYC", "KYC", "muted"],
      ftd_in_progress: ["FTD", "FTD", "warning"],
      ftd: ["FTD", "FTD", "info"],
      qftd_in_progress: ["有效FTD", "Valid FTD", "warning"],
      qftd_pending: ["有效FTD", "Valid FTD", "warning"],
      qftd: ["有效FTD", "Valid FTD", "info"],
      quality_in_progress: ["质量服务", "Quality service", "warning"],
      quality_pending: ["质量服务", "Quality service", "warning"],
      quality: ["已完成", "Completed", "ok"],
      voided: ["已作废", "Voided", "danger"]
    };
    return map[row.milestoneStatus] || map.pending;
  }

  function qualityService(row) {
    return row.qualityAt
      ? [t("已达标", "Qualified"), "Qualified", "ok"]
      : [t("未达标", "Not qualified"), "Not qualified", "muted"];
  }

  function commissionStatus(row) {
    const map = {
      not_generated: ["未生成", "Not generated", "muted"],
      pending_review: ["待检查", "Pending review", "muted"],
      held: ["暂扣中", "On hold", "warning"],
      manual_review: ["人工确认中", "Manual review", "warning"],
      payable: ["可提现", "Payable", "ok"],
      paid: ["已支付", "Paid", "ok"],
      rejected: ["已拒绝", "Rejected", "danger"],
      clawed_back: ["已冲正", "Clawed back", "danger"],
      frozen: ["冻结", "Frozen", "danger"],
      settled_partial: ["已结算 / 部分支付", "Settled / partially paid", "ok"],
      settled_closed: ["已支付 / 已结案", "Paid / closed", "ok"],
      disputed: ["争议处理中", "Disputed", "warning"]
    };
    return map[row.fundStatus] || map.pending_review;
  }

  function heldDaysText(row) {
    const days = [...new Set((row.commissionCases || [])
      .filter(item => item.status === "held" && Number.isFinite(Number(item.holdDays)))
      .map(item => Number(item.holdDays)))];
    if (!days.length) return "";
    return days.length === 1 ? `${days[0]}${t("天", "d")}` : days.join("/") + t("天", "d");
  }

  function heldStatusTooltip(row) {
    const heldCases = (row.commissionCases || []).filter(item => item.status === "held");
    const caseNames = {
      qftd_batch: t("注册+有效FTD佣金", "Registration + valid FTD commission"),
      quality_service: t("质量服务佣金", "Quality service commission")
    };
    return [
      t("暂扣中", "On hold"),
      t("佣金已生成，但仍在动态Hold观察期内；完成观察与结算检查前，暂不可提现。", "The commission has been generated but remains in dynamic hold. It is not withdrawable until observation and settlement checks are complete."),
      ...heldCases.map(item => `${caseNames[item.type] || item.type}：${t("总天数", "Total days")} ${Number(item.holdDays)}${t("天", "d")}`)
    ].join("\n");
  }

  function commissionStatusCell(row) {
    const status = badge(commissionStatus(row));
    const days = row.fundStatus === "held" ? heldDaysText(row) : "";
    return `<div class="report-commission-status ${row.fundStatus === "held" ? "held" : ""}" ${row.fundStatus === "held" ? `data-rp-fund-tooltip="${h(heldStatusTooltip(row))}" tabindex="0" aria-label="${t("暂扣原因与总天数说明", "Hold reason and total duration")}"` : ""}>${status}${days ? `<small>${t("暂扣", "Hold")} ${h(days)}</small>` : ""}</div>`;
  }

  function badge(values) {
    return `<span class="tag tag-${values[2]}">${h(t(values[0], values[1]))}</span>`;
  }

  function canAppeal(row) {
    return row?.commissionId && ["rejected", "clawed_back"].includes(row.commissionStatus);
  }

  function appealRecord(row) {
    return row.commissionCases?.find(item => AFF.state.clientCommissionAppeals?.[item.id])
      ? AFF.state.clientCommissionAppeals[row.commissionCases.find(item => AFF.state.clientCommissionAppeals[item.id]).id]
      : AFF.state.clientCommissionAppeals?.[row.commissionId];
  }

  function appealButton(row) {
    if (!canAppeal(row)) return "";
    return `<button class="button secondary small" type="button" data-rp-appeal="${h(row.clientId)}" ${appealRecord(row) ? "disabled" : ""}>${t(appealRecord(row) ? "申诉中" : "申诉", appealRecord(row) ? "Under appeal" : "Appeal")}</button>`;
  }

  function commissionReason(row) {
    if (!canAppeal(row)) return "";
    return `<p class="report-commission-reason">${h(t(row.commissionReason, row.commissionReasonEn))}</p>`;
  }

  function commissionHelp() {
    return `<div id="rp-commission-help" class="report-commission-help" role="tooltip" hidden>
      <strong>${t("预计佣金与暂扣说明", "Estimated commission and holds")}</strong>
      <p>${t("预计佣金是参考金额，不等于可提现余额，最终以审核和结算结果为准。", "Estimated commission is a reference amount, not an available balance. Final amounts depend on review and settlement.")}</p>
      <p>${t("佣金处于暂扣状态，可能是因为：", "A commission may be on hold because:")}</p>
      <ul><li>${t("仍在佣金观察期内；", "The commission observation period is ongoing;")}</li><li>${t("入金、交易或身份资料仍待核验；", "Deposit, trading or identity details need verification;")}</li><li>${t("退款、拒付或账户异常需要进一步复核。", "Refunds, chargebacks or account issues need further review.")}</li></ul>
      <p>${t("以上为常见原因说明，不代表某笔佣金的具体审核结论。", "These are common reasons, not a review decision about any specific commission.")}</p>
    </div>`;
  }

  function progress(row) {
    if (["not_new_customer", "fraud_hit"].includes(row.eligibilityStatus)) return t("资格拦截", "Eligibility blocked");
    if (!row.effectiveAt || !row.tier || row.tier === "-") return t("未达标", "Not qualified");
    return `${h(row.tier)} · ${t("已达标", "Qualified")}`;
  }

  function tierTooltip(row) {
    const tiers = AFF.partnerProgram.qualificationTiers.map(tier => {
      const price = AFF.partnerProgram.commissionPrice(row.country, tier.tier);
      return `${tier.tier}：净入金$${tier.netDeposit} / ${tier.volume}手 / ${tier.days}天，佣金$${price}`;
    });
    const gross = AFF.partnerProgram.commissionPrice(row.country, row.tier);
    const current = row.qualityAt ? gross : Math.round(gross * 0.75);
    const qualityState = row.qualityAt ? "已达标" : "未达标";
    return [
      `${row.country} · ${t("国家佣金阶梯（参考值）", "Country commission tiers (reference)")}`,
      ...tiers,
      `当前客户：${row.tier}总价$${gross}；质量服务${qualityState}，当前预计$${current}`
    ].join("\n");
  }

  function expectedTooltip(row) {
    if (!row.effectiveAt) {
      return [
        t("有效FTD未达成", "Valid FTD not reached"),
        t("尚未生成佣金案件，预计佣金$0.00。", "No commission case has been generated; expected commission is $0.00.")
      ].join("\n");
    }
    const gross = AFF.partnerProgram.commissionPrice(row.country, row.tier);
    const rateText = row.qualityAt ? "100%" : "75%";
    const qualityText = row.qualityAt ? t("质量服务已达标，按100%计入", "Quality service qualified; 100% included") : t("质量服务未达标，前两段合并佣金按75%计入", "Quality service not qualified; the first merged segment includes 75%");
    return [
      `${t("国家/地区", "Country / region")}：${row.country}`,
      `${t("资格档", "Tier")}：${row.tier}`,
      `${t("国家单价", "Country price")}：${format(gross, "money")}`,
      `${t("阶段比例", "Stage rate")}：${qualityText}`,
      `${t("预计佣金", "Expected commission")}：${format(gross, "money")} × ${rateText} = ${format(row.expected, "money")}`
    ].join("\n");
  }

  function closeCommissionHelp() {
    const help = document.querySelector("#rp-commission-help");
    if (help) help.hidden = true;
    document.querySelector("[data-rp-action='commission-help']")?.setAttribute("aria-expanded", "false");
  }

  function positionCommissionHelp() {
    const help = document.querySelector("#rp-commission-help");
    const button = document.querySelector("[data-rp-action='commission-help']");
    if (!help || help.hidden || !button) return;
    const box = button.getBoundingClientRect();
    const table = button.closest(".report-table-scroll").getBoundingClientRect();
    if (box.right < table.left || box.left > table.right || box.bottom < 0 || box.top > innerHeight) return closeCommissionHelp();
    const width = help.offsetWidth;
    help.style.left = `${Math.max(12, Math.min(box.right - width, innerWidth - width - 12))}px`;
    const below = box.bottom + 8;
    help.style.top = `${Math.max(12, below + help.offsetHeight <= innerHeight - 12 ? below : box.top - help.offsetHeight - 8)}px`;
  }

  function toggleCommissionHelp(button) {
    const help = document.querySelector("#rp-commission-help");
    if (!help) return;
    const open = help.hidden;
    help.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (open) positionCommissionHelp();
  }

  function holdHelp(row) {
    if (row.commissionStatus !== "held" || !row.expected) return badge(commissionStatus(row));
    return `<div class="report-hold-anchor">${badge(commissionStatus(row))}
      <button class="report-hold-button" type="button" data-rp-action="hold-help" aria-label="${t("暂扣规则说明", "Hold rules")}" aria-expanded="false" aria-controls="rp-hold-help" aria-describedby="rp-hold-help">?</button>
      <section id="rp-hold-help" class="report-commission-help report-hold-help" role="tooltip" hidden>
        <strong>${t("暂扣原因与天数说明", "Hold reasons and duration")}</strong>${AFF.earnings.holdRules()}
      </section></div>`;
  }

  function setHoldHelp(open) {
    clearTimeout(holdHelpTimer);
    const popup = document.getElementById("rp-hold-help");
    const trigger = document.querySelector("[data-rp-action='hold-help']");
    if (!popup || !trigger) return;
    if (open && !popup.hidden) return;
    popup.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    if (!open) return;
    const rect = trigger.getBoundingClientRect();
    const drawer = trigger.closest(".report-drawer");
    const topLimit = drawer.querySelector("header").getBoundingClientRect().bottom + 8;
    const bottomLimit = drawer.querySelector("footer").getBoundingClientRect().top - 8;
    popup.style.maxHeight = `${Math.max(80, bottomLimit - topLimit)}px`;
    const above = Math.max(0, rect.top - topLimit - 8);
    const below = Math.max(0, bottomLimit - rect.bottom - 8);
    const showBelow = popup.getBoundingClientRect().height <= below || below >= above;
    popup.style.maxHeight = `${Math.max(80, showBelow ? below : above)}px`;
    const bounds = popup.getBoundingClientRect();
    const top = showBelow ? rect.bottom + 8 : rect.top - bounds.height - 8;
    popup.style.top = `${Math.max(topLimit, Math.min(top, bottomLimit - bounds.height))}px`;
    const leftLimit = Math.max(12, drawer.getBoundingClientRect().left + 12);
    popup.style.left = `${Math.max(leftLimit, Math.min(rect.right - bounds.width, innerWidth - bounds.width - 12))}px`;
  }

  function leaveHoldHelp(event) {
    const anchor = event.target.closest(".report-hold-anchor");
    if (!anchor || anchor.contains(event.relatedTarget)) return;
    holdHelpTimer = setTimeout(() => setHoldHelp(false), 120);
  }

  function filtered(s = state()) {
    let rows = data.filterRows(s.filters);
    if (AFF.state.route === "clients") {
      rows = rows.filter(row => row.clientId);
      const f = s.filters;
      if (f.search) {
        const query = f.search.trim().toLowerCase();
        rows = rows.filter(row => [row.clientId, row.email, row.scenarioCode, row.scenarioLabel].some(value => String(value || "").toLowerCase().includes(query)));
      }
      if (f.kyc) rows = rows.filter(row => row.kyc === f.kyc);
      if (f.stage) rows = rows.filter(row => status(row)[1] === f.stage);
      if (f.commissionStatus) rows = rows.filter(row => row.fundStatus === f.commissionStatus);
      if (f.registeredFrom) rows = rows.filter(row => row.registeredAt?.slice(0, 10) >= f.registeredFrom);
      if (f.registeredTo) rows = rows.filter(row => row.registeredAt?.slice(0, 10) <= f.registeredTo);
      const milestone = { ftd: "ftdAt", effective: "effectiveAt", quality: "qualityAt" }[s.metric];
      if (milestone) rows = rows.filter(row => row[milestone]);
    }
    return rows;
  }

  function ordered(rows, s) {
    return [...rows].sort((a, b) => {
      const stageRank = row => row.qualityAt ? 3 : row.effectiveAt ? 2 : row.ftdAt ? 1 : 0;
      const av = s.sort === "stage" ? stageRank(a) : a.metrics ? (a.metrics[s.sort] ?? a.values[s.groups.indexOf(s.sort)]) : a[s.sort];
      const bv = s.sort === "stage" ? stageRank(b) : b.metrics ? (b.metrics[s.sort] ?? b.values[s.groups.indexOf(s.sort)]) : b[s.sort];
      const result = typeof av === "number" && typeof bv === "number"
        ? av - bv : String(av ?? "").localeCompare(String(bv ?? ""), "zh-CN", { numeric: true });
      return (s.direction === "asc" ? result : -result) || String(a.key || a.clientId).localeCompare(String(b.key || b.clientId));
    });
  }

  function tableRows() {
    const s = state();
    return ordered(AFF.state.route === "clients" ? filtered(s) : data.aggregate(filtered(s), s.groups), s);
  }

  function activeFilters(s) {
    return Object.entries(s.filters).filter(([key, value]) => !["from", "to"].includes(key) && value);
  }

  function filterChips(s) {
    const extraLabels = {
      search: t("客户编号", "Client ID"), kyc: "KYC", stage: t("转化阶段", "Conversion stage"),
      commissionStatus: t("佣金状态", "Commission status"),
      registeredFrom: t("注册开始", "Registered from"), registeredTo: t("注册结束", "Registered to")
    };
    const items = activeFilters(s);
    const valueLabel = (key, value) => {
      if (key === "commissionStatus") return {
        not_generated: t("未生成", "Not generated"), pending_review: t("待检查", "Pending review"),
        held: t("暂扣中", "On hold"), manual_review: t("人工确认中", "Manual review"),
        payable: t("可提现", "Payable"), paid: t("已支付", "Paid"),
        rejected: t("已拒绝", "Rejected"), clawed_back: t("已冲正", "Clawed back"),
        frozen: t("冻结", "Frozen"), disputed: t("争议处理中", "Disputed")
      }[value] || value;
      if (key === "stage") return {
        Registration: t("注册", "Registration"), KYC: "KYC", FTD: "FTD",
        "Valid FTD": t("有效FTD", "Valid FTD"),
        "Quality service": t("质量服务", "Quality service"), Completed: t("已完成", "Completed"),
        Voided: t("已作废", "Voided")
      }[value] || value;
      return value;
    };
    const milestone = AFF.state.route === "clients" && s.metric && s.metric !== "registrations"
      ? `<button class="chip active" type="button" data-rp-action="clear-milestone">${h(label(s.metric))} ${icon("close")}</button>` : "";
    if (!items.length && !milestone) return "";
    return `<div class="report-applied">${items.map(([key, value]) => `<button class="chip active" type="button" data-rp-clear="${h(key)}">${h(extraLabels[key] || label(key))}：${h(valueLabel(key, value))} ${icon("close")}</button>`).join("")}${milestone}
      <button class="report-text-button" type="button" data-rp-action="clear-filters">${t("清空筛选", "Clear filters")}</button></div>`;
  }

  function tableActions(s) {
    return `<div class="report-actions">
      <button class="button secondary" type="button" data-rp-action="filters">${icon("filter")}${t("筛选器", "Filters")}${activeFilters(s).length ? `<span class="report-count">${activeFilters(s).length}</span>` : ""}</button>
      ${AFF.state.route !== "clients" ? iconButton("columns", "columns", t("设置显示列", "Display columns")) : ""}
      <button class="button secondary" type="button" data-rp-action="export">${icon("download")}${t("导出 CSV", "Export CSV")}</button>
    </div>`;
  }

  function controls(s) {
    const periods = [["today", "今日", "Today"], ["past7", "过去7天", "Last 7 days"], ["past30", "过去30天", "Last 30 days"],
      ["past90", "过去90天", "Last 90 days"], ["lastWeek", "上周", "Last week"], ["lastMonth", "上月", "Last month"], ["custom", "自定义", "Custom"]];
    return `<div class="report-controls">
      <div class="report-period"><label for="rp-period">${t("时间范围", "Date range")}</label>
        <select id="rp-period" data-rp-period>${periods.map(([key, zh, en]) => `<option value="${key}" ${s.preset === key ? "selected" : ""}>${t(zh, en)}</option>`).join("")}</select>
        <span>${h(s.filters.from)} — ${h(s.filters.to)}</span>
      </div>
      ${AFF.state.route === "clients" ? tableActions(s) : ""}
    </div>${filterChips(s)}`;
  }

  function groupPicker(s) {
    const atLimit = s.groups.length >= 2;
    const options = data.dimensions.filter(item => !s.groups.includes(item.key) && (!s.groupQuery ||
      `${item.label} ${item.en} ${item.key}`.toLowerCase().includes(s.groupQuery.toLowerCase())));
    return `<div class="report-group-row">
      <span class="report-group-label">${t("分组", "Group by")} <b>${s.groups.length}/2</b></span>
      ${s.groups.map(key => `<button class="chip active" type="button" data-rp-remove-group="${key}" aria-label="${h(t("移除", "Remove"))} ${h(label(key))}">${h(label(key))}${icon("close")}</button>`).join("")}
      <div class="report-picker">
        <button class="button secondary report-add" type="button" data-rp-action="groups" aria-expanded="${!!s.picker}" ${atLimit ? "disabled" : ""} title="${atLimit ? t("最多选择2项", "Select up to 2 dimensions") : t("添加分组", "Add dimension")}">${icon("add")}${t("添加分组", "Add dimension")}</button>
        ${s.picker ? `<div class="report-group-menu" role="dialog" aria-label="${t("选择分组维度", "Choose a dimension")}">
          <input type="search" data-rp-group-search value="${h(s.groupQuery || "")}" placeholder="${t("搜索维度", "Search dimensions")}" aria-label="${t("搜索维度", "Search dimensions")}">
          <div class="report-dimension-options">${dimensionOptions(options, s)}</div>
        </div>` : ""}
      </div>
    </div>`;
  }

  function dimensionOptions(options, s) {
    return options.length ? options.map(item => `<button type="button" data-rp-add-group="${item.key}">
      <span>${h(t(item.label, item.en))}</span>${timeKeys.includes(item.key) && s.groups.some(key => timeKeys.includes(key)) ? `<small>${t("替换时间粒度", "Replace time grain")}</small>` : ""}
      ${["source", "medium", "utmCampaign", "content", "term"].includes(item.key) ? `<small>${h({ source: "utm_source", medium: "utm_medium", utmCampaign: "utm_campaign", content: "utm_content", term: "utm_term" }[item.key])}</small>` : ""}
    </button>`).join("") : `<p class="report-no-options">${t("无匹配维度", "No matching dimensions")}</p>`;
  }

  function summaryCards(rows) {
    const totals = data.totals(rows);
    const keys = ["registrations", "ftd", "effective", "quality", "expected", "tax", "guarantee", "available", "paid"];
    return `<div class="report-stats">${keys.map(key => {
      const item = data.metrics.find(metric => metric.key === key);
      const clickable = ["registrations", "ftd", "effective", "quality"].includes(key);
      return `<article class="card report-stat"><span>${h(label(key))}</span>
        ${clickable ? `<button type="button" data-rp-drill-metric="${key}" class="report-stat-number">${format(totals[key], item.type)}</button>` : `<strong>${format(totals[key], item.type)}</strong>`}
        <small>${t("所选归属周期", "Selected cohort period")}</small></article>`;
    }).join("")}</div>`;
  }

  function heading(key, text, numeric = false, help = "") {
    const s = state();
    return `<th scope="col" class="${numeric ? "numeric" : ""}" aria-sort="${s.sort === key ? (s.direction === "asc" ? "ascending" : "descending") : "none"}"><button type="button" data-rp-sort="${key}">${h(text)}<span aria-hidden="true">${s.sort === key ? (s.direction === "asc" ? "↑" : "↓") : "↕"}</span></button>${help ? `<button class="report-help-button" type="button" data-rp-column-help="${h(help)}" aria-label="${t("查看说明", "View explanation")}">?</button>` : ""}</th>`;
  }

  function columnHelpContent(key) {
    const contents = {
      expected: `<strong>${t("预计佣金", "Expected commission")}</strong><p>${t("佣金总额按客户国家对应的资格档单价确定。有效FTD确认后先展示前两段合并佣金的75%；质量服务达标后追加25%至100%。金额为参考值，最终以审核与结算结果为准。", "The gross amount uses the country-specific tier price. After valid FTD, 75% of the first merged segment is shown; quality service adds the remaining 25%. Amounts are reference values subject to review and settlement.")}</p>`,
      stage: `<strong>${t("转化阶段", "Conversion stage")}</strong><p>${t("完整路径：注册 → KYC → FTD → 有效FTD → 质量服务。表格显示客户下一个待完成阶段；已作废表示资格窗口超时或资格失效。", "Full path: registration → KYC → FTD → valid FTD → quality service. The table shows the next incomplete stage; voided means an expired or invalid qualification.")}</p>`,
      progress: `<strong>${t("达标进度", "Tier progress")}</strong><p>${t("显示客户当前达到的L1-L4佣金阶梯；悬浮在具体进度上可查看该国家各阶梯的净入金、交易量和参考佣金。", "Shows the client's current L1-L4 commission tier. Hover a row to view that country's deposit, trading, and reference commission tiers.")}</p>`,
      commissionStatus: `<strong>${t("资金状态", "Fund status")}</strong><dl>
        <dt>${t("未生成", "Not generated")}</dt><dd>${t("有效FTD未达成，暂无佣金案件。", "Valid FTD is not reached, so no commission case exists.")}</dd>
        <dt>${t("待检查", "Pending review")}</dt><dd>${t("佣金已生成，等待系统检查。", "A commission exists and awaits system checks.")}</dd>
        <dt>${t("暂扣中", "On hold")}</dt><dd>${t("处于动态Hold观察期，暂不可提现。", "In dynamic hold and not yet withdrawable.")}</dd>
        <dt>${t("人工确认中", "Manual review")}</dt><dd>${t("命中人工复核条件，需风控处理。", "Manual review is required by risk controls.")}</dd>
        <dt>${t("可提现 / 已支付", "Payable / paid")}</dt><dd>${t("结算检查通过后进入可提现余额，支付成功后转为已支付。", "After settlement checks, funds become withdrawable and then paid after a successful withdrawal.")}</dd>
        <dt>${t("已拒绝 / 已冲正 / 冻结", "Rejected / reversed / frozen")}</dt><dd>${t("对应资格不成立、入金退款拒付、风险冻结或争议处理。", "These indicate invalid eligibility, refund or chargeback, risk freezing, or a dispute.")}</dd>
      </dl>`
    };
    return contents[key] || "";
  }

  function setFloatingHelp(content, trigger) {
    let panel = document.getElementById("rp-floating-help");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "rp-floating-help";
      panel.className = "report-floating-help";
      panel.role = "tooltip";
      document.body.appendChild(panel);
    }
    panel.innerHTML = content;
    panel.hidden = false;
    const width = Math.min(380, window.innerWidth - 24);
    panel.style.width = `${width}px`;
    const box = trigger.getBoundingClientRect();
    const left = Math.max(12, Math.min(box.left + box.width / 2 - width / 2, window.innerWidth - width - 12));
    const below = box.bottom + 8;
    panel.style.left = `${left}px`;
    panel.style.top = `${below + panel.offsetHeight <= window.innerHeight - 12 ? below : Math.max(12, box.top - panel.offsetHeight - 8)}px`;
  }

  function pagination(total, s) {
    const pages = Math.max(1, Math.ceil(total / s.pageSize));
    s.page = Math.min(pages, Math.max(1, s.page));
    const wanted = [...new Set([1, s.page - 1, s.page, s.page + 1, pages])].filter(value => value > 0 && value <= pages).sort((a, b) => a - b);
    let last = 0;
    return `<div class="table-footer report-footer"><span>${t("共", "Total")} <b data-rp-total>${total}</b> ${t("条记录", "rows")}</span>
      <div class="report-pagination"><label>${t("每页", "Per page")} <select data-rp-page-size aria-label="${t("每页条数", "Rows per page")}">${[10, 20, 50].map(value => `<option ${value === s.pageSize ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <div class="pagination">${iconButton("previous", "left", t("上一页", "Previous page"), s.page === 1 ? "disabled" : "")}
          ${wanted.map(value => { const gap = value - last > 1 ? "<span>…</span>" : ""; last = value; return `${gap}<button type="button" class="${s.page === value ? "active" : ""}" data-rp-page="${value}" ${s.page === value ? 'aria-current="page"' : ""}>${value}</button>`; }).join("")}
          ${iconButton("next", "right", t("下一页", "Next page"), s.page === pages ? "disabled" : "")}</div>
      </div></div>`;
  }

  function reportTable(rows, sourceRows, s) {
    const footer = pagination(rows.length, s);
    const shown = rows.slice((s.page - 1) * s.pageSize, s.page * s.pageSize);
    const metrics = s.columns.map(key => data.metrics.find(item => item.key === key));
    const dimensionHeads = s.groups.length ? s.groups.map(key => heading(key, label(key))).join("") : `<th scope="col">${t("分组", "Group")}</th>`;
    const totals = data.totals(sourceRows);
    const cells = (values, rowKey, total = false) => metrics.map(item => {
      const value = format(values[item.key], item.type);
      return `<td class="numeric">${!total && ["registrations", "ftd", "effective", "quality"].includes(item.key) && values[item.key] > 0
        ? `<button class="report-number-link" type="button" data-rp-row="${h(rowKey)}" data-rp-drill-metric="${item.key}">${value}</button>` : value}</td>`;
    }).join("");
    return `<div class="report-table-scroll" tabindex="0" aria-label="${t("分组数据表", "Grouped data table")}"><table class="report-table">
      <caption class="report-sr-only">${t("分组数据", "Grouped results")}</caption>
      <thead><tr>${dimensionHeads}${metrics.map(item => heading(item.key, t(item.label, item.en), true)).join("")}</tr></thead>
      <tbody>
        ${rows.length && s.groups.length ? `<tr class="report-total"><th scope="row" colspan="${s.groups.length}">${t("总计", "Total")}</th>${cells(totals, "", true)}</tr>` : ""}
        ${shown.map(row => `<tr>${row.values.map((value, index) => `<td class="report-dimension" title="${h(value)}">${h(value)}</td>`).join("")}${cells(row.metrics, row.key)}</tr>`).join("")}
      </tbody></table>
      ${!rows.length ? emptyState() : ""}</div>${footer}`;
  }

  function emptyState() {
    return `<div class="empty-state report-empty"><strong>${t("暂无数据", "No data")}</strong><span>${t("请调整时间范围或筛选条件", "Try another date range or filter")}</span><button class="button secondary" type="button" data-rp-action="reset">${t("重置筛选", "Reset filters")}</button></div>`;
  }

  function customerTable(rows, s) {
    const footer = pagination(rows.length, s);
    const heads = [
      ["clientId", t("客户编号 / 邮箱", "Client / Email")], ["registeredAt", t("注册时间", "Registered")],
      ["country", t("国家/地区", "Country / Region")], ["platform", t("注册平台", "Registration platform")],
      ["campaign", t("转化活动", "Conversion campaign")], ["kyc", t("KYC状态", "KYC status")], ["stage", t("转化阶段", "Conversion stage"), false, "stage"],
      ["quality", t("质量服务", "Quality service")],
      ["expected", t("预计佣金", "Expected commission"), true, "expected"], ["progress", t("达标进度", "Tier progress"), false, "progress"], ["commissionStatus", t("资金状态", "Fund status"), false, "commissionStatus"]
    ];
    return `<div class="report-table-scroll report-client-scroll" tabindex="0" aria-label="${t("客户数据表", "Client data table")}"><table class="report-table report-client-table">
      <colgroup>${heads.map(([key]) => `<col class="report-client-col-${key}">`).join("")}<col class="report-client-col-actions"></colgroup>
      <thead><tr>${heads.map(item => heading(...item)).join("")}<th>${t("操作", "Action")}</th></tr></thead>
      <tbody>${rows.slice((s.page - 1) * s.pageSize, s.page * s.pageSize).map(row => `<tr>
        <td><button class="report-text-button" data-rp-client="${h(row.clientId)}" type="button">${h(row.clientId)}</button><small>${h(row.email)}</small></td>
        <td>${h(row.registeredAt)}</td><td>${h(row.country)}</td><td>${h(row.platform)}</td><td class="report-campaign-cell" title="${h(row.campaign)}">${h(row.campaign)}</td>
        <td>${AFF.helpers.tag(row.kyc)}</td><td>${badge(status(row))}</td><td>${badge(qualityService(row))}</td><td class="numeric report-expected-cell" data-rp-expected-tooltip="${h(expectedTooltip(row))}" tabindex="0" aria-label="${t("预计佣金计算说明", "Expected commission calculation")}">${format(row.expected, "money")}</td>
        <td class="report-progress" data-rp-tier-tooltip="${h(tierTooltip(row))}" tabindex="0" aria-label="${t("国家佣金阶梯", "Country commission tiers")}"><strong>${h(progress(row))}</strong></td>
        <td class="report-commission-cell">${commissionStatusCell(row)}</td><td><div class="report-client-actions"><button class="button secondary small" data-rp-client="${h(row.clientId)}" type="button">${t("详情", "Details")}</button>${appealButton(row)}</div></td>
      </tr>`).join("")}</tbody></table>${rows.length ? "" : emptyState()}</div>${footer}`;
  }

  function selectField(key, value, title, values) {
    return `<label class="field"><span>${h(title)}</span><select data-rp-filter="${key}"><option value="">${t("全部", "All")}</option>${values.map(item => {
      const option = Array.isArray(item) ? item : [item, item];
      return `<option value="${h(option[0])}" ${value === option[0] ? "selected" : ""}>${h(option[1])}</option>`;
    }).join("")}</select></label>`;
  }

  function drawer(s) {
    const isClients = AFF.state.route === "clients";
    const isColumns = s.drawer === "columns";
    const title = isColumns ? t("设置显示列", "Display columns") : t("筛选条件", "Filter conditions");
    const draft = s.draft || {};
    return `<div class="overlay report-overlay" data-rp-action="close"></div><aside class="report-drawer" role="dialog" aria-modal="true" aria-labelledby="rp-drawer-title">
      <header><h2 id="rp-drawer-title">${title}</h2>${iconButton("close", "close", t("关闭", "Close"))}</header>
      <div class="report-drawer-body">
        ${isColumns ? `<div class="report-column-actions"><button class="report-text-button" type="button" data-rp-action="all-columns">${t("全选", "Select all")}</button><button class="report-text-button" type="button" data-rp-action="default-columns">${t("恢复默认", "Restore defaults")}</button></div>
          <div class="report-column-grid">${data.metrics.map(item => `<label><input type="checkbox" data-rp-column="${item.key}" ${(s.draftColumns || []).includes(item.key) ? "checked" : ""}>${h(t(item.label, item.en))}</label>`).join("")}</div>` :
          `<fieldset class="report-fieldset"><legend>${t("点击归属日期", "Click attribution date")}</legend><div class="report-filter-grid">
            <label class="field"><span>${t("日期范围", "Date range")}</span>${AFF.dateRange.component({ id: `report-range-${AFF.state.route}`, from: draft.from, to: draft.to, max: data.now, placeholder: t("选择开始和结束日期", "Select start and end dates") })}</label>
          </div></fieldset>
          ${isClients ? `<fieldset class="report-fieldset"><legend>${t("客户条件", "Client filters")}</legend><div class="report-filter-grid">
            <label class="field"><span>${t("客户编号", "Client ID")}</span><input data-rp-filter="search" value="${h(draft.search || "")}" placeholder="C-100001"></label>
            ${selectField("kyc", draft.kyc, "KYC", ["通过", "未提交", "审核中", "失败"])}
            ${selectField("stage", draft.stage, t("转化阶段", "Conversion stage"), [["Registration", t("注册", "Registration")], ["KYC", "KYC"], ["FTD", "FTD"], ["Valid FTD", t("有效FTD", "Valid FTD")], ["Quality service", t("质量服务", "Quality service")], ["Completed", t("已完成", "Completed")], ["Voided", t("已作废", "Voided")]])}
            ${selectField("commissionStatus", draft.commissionStatus, t("资金状态", "Fund status"), [["not_generated", t("未生成", "Not generated")], ["pending_review", t("待检查", "Pending review")], ["held", t("暂扣中", "On hold")], ["manual_review", t("人工确认中", "Manual review")], ["settled_partial", t("已结算 / 部分支付", "Settled / partially paid")], ["settled_closed", t("已支付 / 已结案", "Paid / closed")], ["rejected", t("已拒绝", "Rejected")], ["clawed_back", t("已冲正", "Clawed back")], ["frozen", t("冻结", "Frozen")], ["disputed", t("争议处理中", "Disputed")]])}
            <label class="field"><span>${t("注册时间范围", "Registration range")}</span>${AFF.dateRange.component({ id: "report-registered-range", from: draft.registeredFrom || "", to: draft.registeredTo || "", max: data.now, placeholder: t("选择注册日期范围", "Select registration dates") })}</label>
          </div></fieldset>` : ""}
          <fieldset class="report-fieldset"><legend>${t("地区、平台与推广来源", "Region, platform and sources")}</legend><div class="report-filter-grid">
            ${data.dimensions.filter(item => !timeKeys.includes(item.key)).map(item => selectField(item.key, draft[item.key], t(item.label, item.en), data.options(item.key))).join("")}
          </div></fieldset>`}
        <p id="rp-validation" class="report-validation" role="alert">${h(s.error || "")}</p>
      </div>
      <footer>${!isColumns ? `<button class="button secondary" type="button" data-rp-action="reset">${t("重置", "Reset")}</button>` : ""}
        <button class="button secondary" type="button" data-rp-action="close">${t("取消", "Cancel")}</button><button class="button primary" type="button" data-rp-action="apply">${t("应用", "Apply")}</button>
      </footer>
    </aside>`;
  }

  function clientDrawer(s) {
    const row = data.rows.find(item => item.clientId === s.client);
    if (!row) return "";
    const field = (name, value) => `<div><dt>${h(name)}</dt><dd>${h(value || "—")}</dd></div>`;
    const moneyField = (name, value) => `<div><dt>${h(name)}</dt><dd>${h(format(value, "money"))}</dd></div>`;
    const helpField = (name, value, help, id) => `<div><dt>${h(name)} <button class="report-help-button" type="button" data-rp-detail-help="${h(help)}" aria-label="${h(help)}" aria-describedby="${id}">?</button></dt><dd>${h(format(value, "money"))}</dd></div>`;
    const steps = [
      [t("注册", "Registration"), row.registeredAt], ["KYC", row.kycAt],
      ["FTD", row.ftdAt], [t("有效FTD", "Valid FTD"), row.effectiveAt]
    ];
    const mergedCommission = Number(row.commissionCases?.find(item => item.type === "qftd_batch")?.amount || 0);
    const hasCommissionBreakdown = mergedCommission > 0;
    const registerCommission = Number((mergedCommission * 0.4).toFixed(2));
    const validFtdCommission = Number((mergedCommission - registerCommission).toFixed(2));
    const qualityCommission = Number(row.commissionCases?.find(item => item.type === "quality_service")?.amount || 0);
    const heldProgress = row.fundStatus === "held"
      ? (row.commissionCases || []).filter(item => item.status === "held").map(item => {
          const startedAt = item.holdStartedAt || item.confirmedAt;
          const totalDays = Number(item.holdDays || 0);
          const elapsed = Math.max(0, Math.min(totalDays, Math.floor((Date.parse(`${data.now}T00:00:00Z`) - Date.parse(`${startedAt}T00:00:00Z`)) / 86400000) + 1));
          return {
            name: item.type === "qftd_batch" ? t("注册+有效FTD佣金", "Registration + valid FTD commission") : t("质量服务佣金", "Quality service commission"),
            totalDays, elapsed
          };
        })
      : [];
    const settledCases = (row.commissionCases || []).filter(item => item.settlement);
    const settledGross = settledCases.reduce((sum, item) => sum + item.settlement.grossAmount / 100, 0);
    const settledTax = settledCases.reduce((sum, item) => sum + item.settlement.taxAmount / 100, 0);
    const settledGuarantee = settledCases.reduce((sum, item) => sum + item.settlement.guaranteeAmount / 100, 0);
    const releasedGuarantee = settledCases.reduce((sum, item) => sum + (item.guarantee?.status === "released" ? item.guarantee.amount / 100 : 0), 0);
    const unsettledGross = (row.commissionCases || [])
      .filter(item => !item.settlement)
      .reduce((sum, item) => sum + item.amountCents / 100, 0);
    const unsettledCases = (row.commissionCases || []).filter(item => !item.settlement);
    const caseName = item => item.type === "qftd_batch"
      ? t("注册+有效FTD佣金", "Registration + valid FTD commission")
      : t("质量服务佣金", "Quality service commission");
    const caseStatusLabels = {
      pending: t("待检查", "Pending review"),
      held: t("暂扣中", "On hold"),
      manual_review: t("人工确认中", "Manual review"),
      frozen: t("冻结", "Frozen"),
      rejected: t("已拒绝", "Rejected"),
      reversed: t("已冲正", "Reversed")
    };
    const creditedHelp = settledCases.length
      ? [
          t("结算净额 = 已结算佣金总额 − 税费 − 结算时扣留保证金", "Settlement net = settled gross − tax − guarantee withheld at settlement"),
          `${format(settledGross, "money")} − ${format(settledTax, "money")} − ${format(settledGuarantee, "money")} = ${format(row.approved, "money")}`,
          releasedGuarantee > 0 ? `${t("已释放保证金", "Released guarantee")}：${format(releasedGuarantee, "money")}${t("，不再计入当前滚动保证金。", "; it is excluded from the current rolling guarantee.")}` : "",
          unsettledGross > 0 ? `${t("预计佣金另含尚未结算金额", "Expected commission also includes unsettled amount")}：${format(unsettledGross, "money")}` : ""
        ].filter(Boolean).join("\n")
      : t("佣金完成结算检查后，才生成结算净额。", "Settlement net is generated after settlement checks.");
    const taxHelp = settledCases.length
      ? [
          t("税费在佣金结算时按税档税率计提并扣缴；提现时不重复收取。", "Tax is calculated and withheld at settlement by tax tier; it is not charged again at withdrawal."),
          ...settledCases.map(item => {
            const caseName = item.type === "qftd_batch"
              ? t("注册+有效FTD佣金", "Registration + valid FTD commission")
              : t("质量服务佣金", "Quality service commission");
            const rate = item.settlement.taxRate * 100;
            return `${caseName}：${format(item.settlement.grossAmount / 100, "money")} × ${item.settlement.taxTier} ${rate}% = ${format(item.settlement.taxAmount / 100, "money")}`;
          })
        ].join("\n")
      : t("佣金完成结算检查后，才生成税费。", "Tax is generated after settlement checks.");
    const currentGuaranteeHelp = [
      t("当前滚动保证金 = 仍处于保留或冻结状态的保证金合计。", "Current rolling guarantee equals retained or frozen guarantee amounts."),
      releasedGuarantee > 0 ? `${t("本行已释放", "Released in this row")} ${format(releasedGuarantee, "money")}${t("，已进入可提现余额，不再计入当前滚动保证金。", "; it has entered the available balance and is excluded here.")}` : "",
      t("结算时扣留的完整金额会在结算净额的对账说明中展示。", "The full amount withheld at settlement is shown in the settlement-net reconciliation.")
    ].filter(Boolean).join("\n");
    return `<div class="overlay report-overlay" data-rp-action="close"></div><aside class="report-drawer" role="dialog" aria-modal="true" aria-labelledby="rp-drawer-title">
      <header><div><h2 id="rp-drawer-title">${h(row.clientId)}</h2><p>${h(row.email)}</p></div>${iconButton("close", "close", t("关闭", "Close"))}</header>
      <div class="report-drawer-body">
        <section class="report-detail-section"><h3>${t("客户信息", "Client information")}</h3><dl class="report-detail-grid">${field(t("国家/地区", "Country / Region"), row.country)}${field(t("注册平台", "Registration platform"), row.platform)}${field(t("操作系统", "Operating system"), row.os)}${field(t("点击归属日期", "Attribution date"), row.date)}${row.scenarioCode ? field(t("演示场景", "Demo scenario"), `${row.scenarioCode} · ${row.scenarioLabel}`) : ""}</dl></section>
        <section class="report-detail-section"><h3>${t("转化阶段", "Conversion stage")}</h3><ol class="report-timeline">${steps.map(([name, value]) => `<li class="${value ? "complete" : ""}"><span>${h(name)}</span><time>${h(value || t("尚未完成", "Not completed"))}</time></li>`).join("")}</ol></section>
        <section class="report-detail-section"><h3>${t("质量服务", "Quality service")}</h3><dl class="report-detail-grid">
          ${field(t("达标状态", "Qualification"), qualityService(row)[0])}
          ${row.qualityAt ? field(t("达标时间", "Qualified at"), row.qualityAt) : ""}
        </dl></section>
        <section class="report-detail-section"><h3>${t("推广来源", "Promotion attribution")}</h3><dl class="report-detail-grid">
          ${data.dimensions.filter(item => !timeKeys.includes(item.key) && !["country", "platform", "os"].includes(item.key)).map(item => field(t(item.label, item.en), row[item.key])).join("")}
        </dl></section>
        <section class="report-detail-section"><h3>${t("佣金信息", "Commission information")}</h3>
          ${hasCommissionBreakdown ? `<div class="report-commission-summary">
            <div><span>${t("注册用户佣金", "Registration commission")} <span class="report-inline-help"><button class="report-help-button" type="button" aria-label="${t("注册用户佣金说明", "Registration commission explanation")}" aria-describedby="rp-register-commission-help">?</button><span class="report-inline-tooltip" id="rp-register-commission-help" role="tooltip" hidden>${t("完成有效FTD后才开始结算此佣金；完成前仅作参考。", "Settlement starts only after valid FTD; before then it is reference-only.")}</span></span></span><strong>${format(registerCommission, "money")}</strong></div>
            <div><span>${t("有效FTD佣金", "Valid FTD commission")}</span><strong>${format(validFtdCommission, "money")}</strong></div>
            <div><span>${t("质量服务佣金", "Quality service commission")}</span><strong>${format(qualityCommission, "money")}</strong></div>
          </div>` : ""}
          ${settledCases.length && unsettledCases.length ? `<div class="report-unsettled-commissions" aria-label="${t("未结算佣金", "Unsettled commissions")}">
            ${unsettledCases.map(item => `<div>
              <span>${t("未结算佣金", "Unsettled commission")}</span>
              <strong>${format(item.amountCents / 100, "money")}</strong>
              <small>${h(caseName(item))} · ${h(caseStatusLabels[item.status] || item.status)}${item.holdDays ? ` · ${t("暂扣", "Hold")} ${item.holdDays}${t("天", "d")}` : ""}</small>
            </div>`).join("")}
          </div>` : ""}
          ${heldProgress.length ? `<div class="report-hold-progress">${heldProgress.map(item => `
            <div><span>${h(item.name)}</span><strong>${t("暂扣天数", "Hold days")} ${item.totalDays}${t("天", "d")}</strong><small>${t("已完成", "Elapsed")} ${item.elapsed}${t("天", "d")}</small></div>`).join("")}
          </div>` : ""}
          ${holdHelp(row)}<dl class="report-detail-grid">
          ${moneyField(label("expected"), row.expected)}
          ${settledCases.length ? helpField(label("tax"), row.tax, taxHelp, "rp-tax-help") : ""}
          ${helpField(t("当前滚动保证金", "Current rolling guarantee"), row.guarantee, currentGuaranteeHelp, "rp-guarantee-help")}
          ${settledCases.length ? helpField(label("approved"), row.approved, creditedHelp, "rp-credited-help") : moneyField(label("approved"), row.approved)}
          ${row.fundStatus === "rejected" ? moneyField(label("rejected"), row.rejected) : ""}
          ${row.fundStatus === "clawed_back" ? moneyField(label("reversed"), row.reversed) : ""}
        </dl>
        ${commissionReason(row)}${canAppeal(row) ? `<p class="report-commission-reference">${h(row.commissionId)} · ${h(row.commissionReasonCode)}</p>` : ""}
        ${appealRecord(row) ? `<p class="report-appeal-status" role="status">${t("申诉已提交，等待复核。原佣金状态与金额在复核完成前保持不变。", "Appeal submitted for review. The original commission status and amount remain unchanged pending a decision.")}</p>` : ""}
        </section>
        ${s.appeal ? `<section class="report-detail-section report-appeal-form"><h3>${t("佣金申诉", "Commission appeal")}</h3>
          <label class="field" for="rp-appeal-reason"><span>${t("申诉说明（必填）", "Explanation (required)")}</span><textarea id="rp-appeal-reason" data-rp-appeal-reason rows="5" maxlength="2000" required aria-describedby="rp-appeal-error" placeholder="${t("请说明您对本次佣金处理有异议的原因", "Explain why you disagree with this commission decision")}">${h(s.appealDraft || "")}</textarea></label>
          <p id="rp-appeal-error" class="report-validation" role="alert">${h(s.error || "")}</p>
          <p class="report-commission-reference">${t("提交申诉不会自动恢复佣金或变更可提现余额。", "Submitting an appeal does not automatically restore the commission or change the available balance.")}</p>
        </section>` : ""}
      </div><footer><button class="button secondary" type="button" data-rp-action="close">${t("关闭", "Close")}</button>
        ${s.appeal ? `<button class="button primary" type="button" data-rp-action="submit-client-appeal">${t("提交申诉", "Submit appeal")}</button>` : appealButton(row)}
      </footer>
    </aside>`;
  }

  function page() {
    const s = state();
    const source = filtered(s);
    const rows = tableRows();
    return `<div class="report-page">${controls(s)}
      ${AFF.state.route === "summary" ? summaryCards(source) : ""}
      <section class="card report-panel">
        ${AFF.state.route !== "clients" ? `<div class="report-table-toolbar">${groupPicker(s)}${tableActions(s)}</div>` : `<div class="report-client-toolbar"><strong>${t("客户数据", "Client data")}</strong><span>${t("按点击归属日期筛选", "Filtered by click attribution date")}</span></div>`}
        ${AFF.state.route === "clients" ? customerTable(rows, s) : reportTable(rows, source, s)}
      </section>
      <div class="report-footnote">${t("时区", "Timezone")} ${h(data.fields.timezone)} · ${t("金额", "Currency")} USD<span>${t("数据截至", "Data through")} ${data.now} 23:59</span></div>
      ${AFF.state.route === "clients" ? commissionHelp() : ""}
      ${s.drawer ? drawer(s) : s.client ? clientDrawer(s) : ""}
    </div>`;
  }

  function close() {
    const s = state();
    s.drawer = null; s.client = null; s.picker = false; s.error = ""; s.appeal = false; s.appealDraft = "";
    renderPage(returnFocus);
  }

  function download() {
    const s = state();
    const clients = AFF.state.route === "clients";
    const keys = clients
      ? ["clientId", "email", "registeredAt", "country", "platform", "campaign", "kyc", "ftdAt", "effectiveAt", "qualityAt", "milestoneStatus", "fundStatus", "commissionStatus", "scenarioCode", "scenarioLabel", "expected", "tax", "guarantee", "approved", "paid", "rejected", "reversed", "commissionId", "commissionReasonCode", "commissionReason"]
      : [...s.groups, ...s.columns];
    const titles = clients ? ["客户编号", "脱敏邮箱", "注册时间", "国家/地区", "注册平台", "转化活动", "KYC状态", "FTD时间", "有效FTD时间", "质量服务时间", "客户里程碑状态", "资金状态", "佣金状态", "演示场景代码", "演示场景", "预计佣金", "税费", "滚动保证金", "可提现净额", "已支付佣金", "已拒绝佣金", "冲正金额", "佣金编号", "处理原因码", "处理原因"] : keys.map(label);
    const csvCell = value => {
      let text = String(value ?? "");
      if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const rows = tableRows();
    const matrix = clients ? rows.map(row => keys.map(key => row[key])) :
      rows.map(row => [...row.values.filter(() => s.groups.length), ...s.columns.map(key => row.metrics[key])]);
    const csv = [titles, ...matrix].map(row => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `${AFF.state.route}-${s.filters.from}-${s.filters.to}.csv`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(t(`已导出 ${rows.length} 条记录`, `Exported ${rows.length} rows`));
  }

  function drill(metric, rowKey) {
    const s = state();
    const filters = { ...s.filters };
    const row = rowKey ? data.aggregate(filtered(s), s.groups).find(item => item.key === rowKey) : null;
    if (row) s.groups.forEach((key, index) => {
      const value = row.values[index];
      if (timeKeys.includes(key)) {
        let from = value;
        let to = value;
        if (key === "week") to = dateShift(value, 6);
        if (key === "month") { from = `${value}-01`; to = dateShift(dateShift(`${value}-28`, 4).slice(0, 7) + "-01", -1); }
        if (key === "year") { from = `${value}-01-01`; to = `${value}-12-31`; }
        filters.from = from > filters.from ? from : filters.from;
        filters.to = to < filters.to ? to : filters.to;
      } else filters[key] = value;
    });
    openClients(filters, metric);
  }

  function openClients(filters, metric = "registrations") {
    if (!["registrations", "ftd", "effective", "quality"].includes(metric)) return;
    const clients = state("clients");
    Object.assign(clients, {
      filters: { ...filters }, metric, preset: "custom", page: 1,
      drawer: null, client: null, picker: false, appeal: false, appealDraft: "", error: ""
    });
    navigate("clients");
  }

  function onClick(event) {
    if (!routeKeys.includes(AFF.state.route)) return;
    if (!event.target.closest(".report-hold-anchor")) setHoldHelp(false);
    if (!event.target.closest("#rp-commission-help, [data-rp-action='commission-help']")) closeCommissionHelp();
    const target = event.target.closest("[data-rp-action], [data-rp-add-group], [data-rp-remove-group], [data-rp-sort], [data-rp-page], [data-rp-clear], [data-rp-client], [data-rp-appeal], [data-rp-drill-metric], [data-rp-column-help], [data-rp-tier-tooltip], [data-rp-expected-tooltip], [data-rp-fund-tooltip], [data-rp-detail-help]");
    const s = state();
    if (!target) {
      if (s.picker && !event.target.closest(".report-picker")) {
        s.picker = false;
        document.querySelector(".report-group-menu")?.remove();
        document.querySelector("[data-rp-action='groups']")?.setAttribute("aria-expanded", "false");
        persist();
      }
      return;
    }
    if (target.disabled) return;
    const d = target.dataset;
    if (d.rpAction === "hold-help") {
      const mouse = event.pointerType === "mouse" || (event.detail > 0 && matchMedia("(hover: hover)").matches);
      return setHoldHelp(mouse || document.getElementById("rp-hold-help").hidden);
    }
    if (d.rpAction === "commission-help") return toggleCommissionHelp(target);
    if (d.rpColumnHelp) return setFloatingHelp(columnHelpContent(d.rpColumnHelp), target);
    if (d.rpTierTooltip) return setFloatingHelp(h(d.rpTierTooltip).replaceAll("\n", "<br>"), target);
    if (d.rpExpectedTooltip) return setFloatingHelp(h(d.rpExpectedTooltip).replaceAll("\n", "<br>"), target);
    if (d.rpFundTooltip) return setFloatingHelp(h(d.rpFundTooltip).replaceAll("\n", "<br>"), target);
    if (d.rpDetailHelp) return setFloatingHelp(h(d.rpDetailHelp).replaceAll("\n", "<br>"), target);
    if (d.rpAppeal) {
      const row = data.rows.find(item => item.clientId === d.rpAppeal);
      if (!canAppeal(row) || appealRecord(row)) return;
      if (!s.client) returnFocus = `[data-rp-appeal="${d.rpAppeal}"]`;
      s.client = row.clientId; s.drawer = null; s.appeal = true; s.appealDraft = ""; s.error = "";
      return renderPage("#rp-appeal-reason");
    }
    if (d.rpAction === "submit-client-appeal") {
      const row = data.rows.find(item => item.clientId === s.client);
      if (!s.appeal || !canAppeal(row) || appealRecord(row)) return;
      const explanation = document.querySelector("#rp-appeal-reason")?.value.trim() || "";
      if (!explanation) {
        document.querySelector("#rp-appeal-error").textContent = t("请填写申诉说明", "Enter an explanation");
        document.querySelector("#rp-appeal-reason").setAttribute("aria-invalid", "true");
        document.querySelector("#rp-appeal-reason").focus();
        return;
      }
      AFF.state.clientCommissionAppeals ||= {};
      const appeal = { clientId: row.clientId, commissionId: row.commissionId, status: "pending", explanation, submittedAt: new Date().toISOString() };
      (row.commissionCases || [{ id: row.commissionId }]).forEach(item => {
        AFF.state.clientCommissionAppeals[item.id] = { ...appeal, commissionId: item.id };
      });
      s.appeal = false; s.appealDraft = ""; s.error = "";
      showToast(t("申诉已提交，等待复核", "Appeal submitted for review"));
      return renderPage(".report-drawer .report-icon");
    }
    if (d.rpDrillMetric) return drill(d.rpDrillMetric, d.rpRow);
    if (d.rpAddGroup) {
      let groups = s.groups.filter(key => !timeKeys.includes(d.rpAddGroup) || !timeKeys.includes(key));
      if (!groups.includes(d.rpAddGroup) && groups.length < 2) groups.push(d.rpAddGroup);
      s.groups = groups; s.picker = false; s.page = 1; s.sort = groups[0] || s.columns[0]; s.direction = timeKeys.includes(s.sort) ? "desc" : "asc";
    } else if (d.rpRemoveGroup) {
      s.groups = s.groups.filter(key => key !== d.rpRemoveGroup); s.page = 1;
      if (s.sort === d.rpRemoveGroup) s.sort = s.groups[0] || s.columns[0];
    } else if (d.rpSort) {
      s.direction = s.sort === d.rpSort && s.direction === "desc" ? "asc" : "desc"; s.sort = d.rpSort; s.page = 1;
    } else if (d.rpPage) s.page = Number(d.rpPage);
    else if (d.rpClear) { delete s.filters[d.rpClear]; s.page = 1; s.metric = null; }
    else if (d.rpClient) {
      returnFocus = `[data-rp-client="${d.rpClient}"]`; s.client = d.rpClient; s.picker = false; s.appeal = false; s.error = "";
      return renderPage(".report-drawer .report-icon");
    } else {
      const action = d.rpAction;
      if (action === "export") return download();
      if (action === "close") return close();
      if (action === "groups") {
        returnFocus = "[data-rp-action='groups']";
        s.picker = !s.picker; s.groupQuery = "";
        return renderPage(s.picker ? "[data-rp-group-search]" : "[data-rp-action='groups']");
      }
      if (["filters", "columns"].includes(action)) {
        returnFocus = `[data-rp-action="${action}"]`; s.picker = false; s.drawer = action;
        s.draft = { ...s.filters }; s.draftColumns = [...s.columns]; s.error = "";
        return renderPage(".report-drawer .report-icon");
      }
      if (action === "reset" || action === "clear-filters") {
        s.filters = range("past30"); s.preset = "past30"; s.draft = { ...s.filters }; s.page = 1; s.metric = null; s.error = "";
      }
      if (action === "clear-milestone") { s.metric = null; s.page = 1; }
      if (action === "all-columns") s.draftColumns = data.metrics.map(item => item.key);
      if (action === "default-columns") s.draftColumns = [...metricDefaults[AFF.state.route]];
      if (action === "previous") s.page--;
      if (action === "next") s.page++;
      if (action === "apply") {
        if (s.drawer === "columns") {
          if (!s.draftColumns.length) return validation(t("请至少保留一个指标", "Keep at least one metric"));
          s.columns = [...s.draftColumns];
          s.columnsCustomized = s.columns.join(",") !== metricDefaults[AFF.state.route].join(",");
          if (!s.groups.includes(s.sort) && !s.columns.includes(s.sort)) s.sort = s.groups[0] || s.columns[0];
        } else {
          if (!s.draft.from || !s.draft.to || s.draft.from > s.draft.to || s.draft.to > data.now) return validation(t("请选择有效的日期范围，结束日期不可晚于数据日期", "Choose a valid date range ending no later than the data date"));
          if (s.draft.registeredFrom && s.draft.registeredTo && s.draft.registeredFrom > s.draft.registeredTo) return validation(t("注册开始日期不可晚于结束日期", "Registration start must not follow the end date"));
          s.filters = { ...s.draft }; s.preset = "custom"; s.metric = null;
        }
        s.drawer = null; s.error = ""; s.page = 1;
        return renderPage(returnFocus);
      }
    }
    renderPage();
  }

  function validation(message) {
    state().error = message;
    const node = document.querySelector("#rp-validation");
    if (node) node.textContent = message;
  }

  function setInlineHelp(event, open) {
    const anchor = event.target.closest?.(".report-inline-help");
    const tooltip = anchor?.querySelector(".report-inline-tooltip");
    if (tooltip) tooltip.hidden = !open;
  }

  document.addEventListener("click", onClick);
  document.addEventListener("pointerover", event => {
    if (event.pointerType === "mouse" && event.target.closest(".report-hold-anchor")) setHoldHelp(true);
    if (event.pointerType === "mouse") setInlineHelp(event, true);
    if (event.pointerType !== "mouse") return;
    const columnHelp = event.target.closest("[data-rp-column-help]");
    if (columnHelp) return setFloatingHelp(columnHelpContent(columnHelp.dataset.rpColumnHelp), columnHelp);
    const tierHelp = event.target.closest("[data-rp-tier-tooltip]");
    if (tierHelp) setFloatingHelp(h(tierHelp.dataset.rpTierTooltip).replaceAll("\n", "<br>"), tierHelp);
    const expectedHelp = event.target.closest("[data-rp-expected-tooltip]");
    if (expectedHelp) setFloatingHelp(h(expectedHelp.dataset.rpExpectedTooltip).replaceAll("\n", "<br>"), expectedHelp);
    const fundHelp = event.target.closest("[data-rp-fund-tooltip]");
    if (fundHelp) setFloatingHelp(h(fundHelp.dataset.rpFundTooltip).replaceAll("\n", "<br>"), fundHelp);
    const detailHelp = event.target.closest("[data-rp-detail-help]");
    if (detailHelp) setFloatingHelp(h(detailHelp.dataset.rpDetailHelp).replaceAll("\n", "<br>"), detailHelp);
  });
  document.addEventListener("pointerout", event => {
    if (event.pointerType === "mouse") leaveHoldHelp(event);
    if (event.pointerType === "mouse" && !event.relatedTarget?.closest?.(".report-inline-help")) {
      setInlineHelp(event, false);
    }
    if (event.pointerType === "mouse" && !event.relatedTarget?.closest?.("[data-rp-column-help], [data-rp-tier-tooltip], [data-rp-expected-tooltip], [data-rp-fund-tooltip], [data-rp-detail-help]")) {
      document.getElementById("rp-floating-help")?.setAttribute("hidden", "");
    }
  });
  document.addEventListener("focusin", event => {
    if (event.target.closest(".report-hold-anchor") && event.target.matches(":focus-visible")) setHoldHelp(true);
    const floatingTrigger = event.target.closest?.("[data-rp-column-help], [data-rp-tier-tooltip], [data-rp-expected-tooltip], [data-rp-fund-tooltip], [data-rp-detail-help]");
    if (floatingTrigger && event.target.matches(":focus-visible")) {
      const content = floatingTrigger.dataset.rpColumnHelp
        ? columnHelpContent(floatingTrigger.dataset.rpColumnHelp)
        : h(floatingTrigger.dataset.rpTierTooltip || floatingTrigger.dataset.rpExpectedTooltip || floatingTrigger.dataset.rpFundTooltip || floatingTrigger.dataset.rpDetailHelp).replaceAll("\n", "<br>");
      setFloatingHelp(content, floatingTrigger);
    }
    if (event.target.matches(".report-inline-help .report-help-button:focus-visible")) setInlineHelp(event, true);
  });
  document.addEventListener("focusout", event => {
    leaveHoldHelp(event);
    if (!event.relatedTarget?.closest?.(".report-inline-help")) setInlineHelp(event, false);
    if (!event.relatedTarget?.closest?.("[data-rp-column-help], [data-rp-tier-tooltip], [data-rp-expected-tooltip], [data-rp-fund-tooltip], [data-rp-detail-help]")) document.getElementById("rp-floating-help")?.setAttribute("hidden", "");
  });
  document.addEventListener("pointerdown", event => {
    if (event.target.closest?.(".report-inline-help")) return;
    document.querySelectorAll(".report-inline-tooltip:not([hidden])").forEach(tooltip => {
      tooltip.hidden = true;
    });
  }, true);
  document.addEventListener("scroll", event => {
    if (event.target.classList?.contains("report-drawer-body")) setHoldHelp(false);
  }, true);
  document.addEventListener("change", event => {
    if (!routeKeys.includes(AFF.state.route)) return;
    const node = event.target;
    const s = state();
    if (node.matches("[data-rp-filter]")) { s.draft[node.dataset.rpFilter] = node.value; return; }
    if (node.matches("[data-rp-column]")) {
      s.draftColumns = node.checked ? [...new Set([...s.draftColumns, node.dataset.rpColumn])] : s.draftColumns.filter(key => key !== node.dataset.rpColumn);
      return;
    }
    if (node.matches("[data-rp-period]")) {
      if (node.value === "custom") {
        returnFocus = "[data-rp-period]"; s.drawer = "filters"; s.draft = { ...s.filters }; s.error = "";
        return renderPage(".report-drawer .report-icon");
      }
      Object.assign(s.filters, range(node.value)); s.preset = node.value; s.page = 1; s.metric = null;
      return renderPage("[data-rp-period]");
    }
    if (node.matches("[data-rp-page-size]")) { s.pageSize = Number(node.value); s.page = 1; renderPage("[data-rp-page-size]"); }
  });
  document.addEventListener("input", event => {
    if (!routeKeys.includes(AFF.state.route)) return;
    if (event.target.matches("[data-rp-appeal-reason]")) {
      state().appealDraft = event.target.value;
      event.target.removeAttribute("aria-invalid");
      document.querySelector("#rp-appeal-error").textContent = "";
      return;
    }
    if (event.target.matches("[data-rp-filter]")) state().draft[event.target.dataset.rpFilter] = event.target.value;
    if (!event.target.matches("[data-rp-group-search]")) return;
    const s = state(); s.groupQuery = event.target.value;
    const options = data.dimensions.filter(item => !s.groups.includes(item.key) && `${item.label} ${item.en} ${item.key}`.toLowerCase().includes(s.groupQuery.toLowerCase()));
    document.querySelector(".report-dimension-options").innerHTML = dimensionOptions(options, s);
  });
  document.addEventListener("date-range-change", event => {
    if (!routeKeys.includes(AFF.state.route)) return;
    const detail = event.detail;
    const s = state();
    if (detail.id === `report-range-${AFF.state.route}`) {
      s.draft.from = detail.from;
      s.draft.to = detail.to;
    }
    if (detail.id === "report-registered-range") {
      s.draft.registeredFrom = detail.from;
      s.draft.registeredTo = detail.to;
    }
  });
  document.addEventListener("keydown", event => {
    if (!routeKeys.includes(AFF.state.route)) return;
    const s = state();
    const dialog = document.querySelector(".report-drawer");
    if (event.key === "Escape" && document.querySelector("#rp-hold-help:not([hidden])")) {
      event.preventDefault();
      setHoldHelp(false);
      return;
    }
    if (event.key === "Escape" && document.querySelector("#rp-commission-help:not([hidden])")) {
      closeCommissionHelp();
      document.querySelector("[data-rp-action='commission-help']")?.focus();
      return;
    }
    if (event.key === "Escape" && (dialog || s.picker)) { event.preventDefault(); close(); }
    if (event.key === "Tab" && dialog) {
      const nodes = [...dialog.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)")];
      const first = nodes[0]; const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener("hashchange", () => {
    if (!AFF.state.reports) return;
    Object.values(AFF.state.reports).forEach(item => { item.drawer = null; item.picker = false; item.client = null; item.appeal = false; item.appealDraft = ""; });
  });
  window.addEventListener("resize", closeCommissionHelp);
  window.addEventListener("resize", () => setHoldHelp(false));
  window.addEventListener("resize", () => document.getElementById("rp-floating-help")?.setAttribute("hidden", ""));
  document.addEventListener("scroll", positionCommissionHelp, true);
  document.addEventListener("scroll", () => document.getElementById("rp-floating-help")?.setAttribute("hidden", ""), true);

  AFF.reports = { state, filtered: () => filtered(), tableRows, range, openClients };
  AFF.pages.perf = page;
  AFF.pages.summary = page;
  AFF.pages.clients = page;
})();
