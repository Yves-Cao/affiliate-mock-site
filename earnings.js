(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const day = 86400000;
  const dateNumber = value => Date.parse(`${value}T00:00:00Z`);
  const shiftDate = (value, amount) => new Date(dateNumber(value) + amount * day).toISOString().slice(0, 10);
  const statusLabels = {
    pending: ["待检查", "Pending review", "muted"],
    held: ["暂扣", "On hold", "warning"],
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
    return { from: AFF.reporting.from, to: AFF.reporting.now, status: "", type: "" };
  }

  function state() {
    AFF.state.earnings ||= { filters: defaultFilters(), page: 1, pageSize: 10 };
    const s = AFF.state.earnings;
    if (!initialized.has(s)) {
      s.filters = { ...defaultFilters(), ...s.filters };
      s.draft = { ...s.filters };
      s.detail = null; s.appeal = false; s.appealDraft = ""; s.error = "";
      s.help = false; s.detailHelp = false;
      initialized.add(s);
    }
    return s;
  }

  function holdDetails(row) {
    if (row.commissionStatus !== "held") return null;
    const number = Number(row.clientId.replace(/\D/g, ""));
    const age = Math.max(0, Math.floor((dateNumber(AFF.reporting.now) - dateNumber(row.qualifiedAt)) / day));
    const elapsedDays = Math.min(age, number % 8);
    const totalDays = elapsedDays + 1 + (number * 7) % 13;
    const startedAt = shiftDate(AFF.reporting.now, -elapsedDays);
    return {
      startedAt, totalDays, elapsedDays,
      expectedReleaseAt: shiftDate(startedAt, totalDays),
      reason: holdReasons[number % holdReasons.length]
    };
  }

  function records() {
    return AFF.reporting.rows.filter(row => row.clientId && row.expected > 0).map(row => ({
      id: row.commissionId,
      date: row.qualifiedAt,
      type: row.commissionStatus === "reversed" ? "reversal" : row.commissionStatus === "approved" ? "settlement" : "accrual",
      status: row.commissionStatus,
      amount: row.commissionStatus === "reversed" ? -row.reversed : row.expected,
      hold: holdDetails(row),
      client: row
    })).sort((left, right) => right.date.localeCompare(left.date) || left.id.localeCompare(right.id));
  }

  function filteredRows() {
    const f = state().filters;
    return records().filter(row =>
      (!f.from || row.date >= f.from) && (!f.to || row.date <= f.to) &&
      (!f.status || row.status === f.status) && (!f.type || row.type === f.type)
    );
  }

  function totals(rows = filteredRows()) {
    return rows.reduce((sum, row) => {
      for (const key of ["expected", "held", "approved", "rejected", "reversed"]) sum[key] += row.client[key] || 0;
      return sum;
    }, { expected: 0, held: 0, approved: 0, rejected: 0, reversed: 0 });
  }

  function money(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  }

  function reason(row) {
    if (row.hold) return t(...row.hold.reason);
    if (["rejected", "reversed"].includes(row.status)) return t(row.client.commissionReason, row.client.commissionReasonEn);
    if (row.status === "approved") return t("佣金已通过审核并完成入账。", "The commission passed review and has been credited.");
    if (row.status === "frozen") return t("观察期已超过30天，等待人工审核。", "The observation period exceeded 30 days and requires manual review.");
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
      <dl><div><dt>${t("入金、交易或身份资料待核验", "Deposit, trading or identity checks")}</dt><dd>${t("核验未完成时可能继续暂扣，具体天数随复核结果更新。", "An incomplete check may extend the hold. The duration is updated as the review progresses.")}</dd></div>
      <div><dt>${t("退款、拒付或账户异常待复核", "Refund, chargeback or account review")}</dt><dd>${t("可能触发进一步观察；原因与天数不是固定的一一对应关系。", "Further observation may be needed. Each reason does not have a fixed number of hold days.")}</dd></div>
      <div><dt>${t("观察期超过30天", "Observation exceeds 30 days")}</dt><dd>${t("转为冻结并进入人工审核；释放时间以人工审核结果为准。", "The commission is frozen for manual review. Release timing depends on the review outcome.")}</dd></div></dl>`;
  }

  function helpContent(id) {
    const detail = id === "earn-detail-help";
    return `<section class="earn-help ${detail ? "earn-help-popover" : ""}" id="${id}" ${detail ? `role="tooltip" ${state().detailHelp ? "" : "hidden"}` : ""} aria-label="${t("暂扣原因与天数说明", "Hold reasons and duration")}">
      <div class="earn-section-heading"><h3>${t("暂扣原因与天数说明", "Hold reasons and duration")}</h3>${detail ? "" : `<button class="earn-icon-button" type="button" data-earn-action="help" aria-label="${t("关闭说明", "Close explanation")}">${icon("close")}</button>`}</div>
      ${holdRules()}
    </section>`;
  }

  function filters() {
    const f = state().draft;
    const options = (entries, current) => `<option value="">${t("全部", "All")}</option>${Object.entries(entries).map(([key, value]) => `<option value="${key}" ${current === key ? "selected" : ""}>${t(value[0], value[1])}</option>`).join("")}`;
    return `<form class="earn-filters" data-earn-filter-form novalidate>
      <label><span>${t("产生开始日期", "Accrual date from")}</span><input type="date" data-earn-filter="from" value="${h(f.from)}" max="${AFF.reporting.now}" required></label>
      <label><span>${t("产生结束日期", "Accrual date to")}</span><input type="date" data-earn-filter="to" value="${h(f.to)}" max="${AFF.reporting.now}" required></label>
      <label><span>${t("佣金状态", "Commission status")}</span><select data-earn-filter="status">${options(statusLabels, f.status)}</select></label>
      <label><span>${t("流水类型", "Record type")}</span><select data-earn-filter="type">${options(typeLabels, f.type)}</select></label>
      <div class="earn-filter-actions"><button class="button primary" type="submit">${t("查询", "Search")}</button><button class="button secondary" type="button" data-earn-action="reset">${t("重置", "Reset")}</button></div>
      <p id="earn-filter-error" class="earn-validation" role="alert">${h(state().error)}</p>
    </form>`;
  }

  function stats(rows) {
    const sum = totals(rows);
    const items = [
      ["expected", t("预计佣金", "Estimated commission"), t("参考金额，以审核结果为准", "Reference amount, subject to review")],
      ["held", t("暂扣佣金", "Commission on hold"), t("观察期内，暂不可提现", "Under observation, not yet available")],
      ["approved", t("已入账佣金", "Credited commission"), t("已完成佣金入账", "Commission credit completed")],
      ["reversed", t("已冲正佣金", "Reversed commission"), t("关联佣金已撤销", "Related commission reversed")]
    ];
    return `<div class="earn-stats">${items.map(([key, title, hint]) => `<article class="card earn-stat"><span>${title}</span><strong data-earn-stat="${key}">${money(sum[key])}</strong><small>${hint}</small></article>`).join("")}</div>`;
  }

  function pagination(total) {
    const s = state();
    const count = Math.max(1, Math.ceil(total / s.pageSize));
    return `<footer class="table-footer earn-footer"><span>${t("共", "Total")} <b data-earn-total>${total}</b> ${t("条佣金记录", "commission records")}</span>
      <div class="earn-pagination"><label>${t("每页", "Per page")}<select data-earn-page-size aria-label="${t("每页条数", "Rows per page")}">${[10, 20, 50].map(size => `<option ${s.pageSize === size ? "selected" : ""}>${size}</option>`).join("")}</select></label>
      <div class="pagination"><button type="button" data-earn-page="${s.page - 1}" aria-label="${t("上一页", "Previous page")}" ${s.page <= 1 ? "disabled" : ""}>${icon("left")}</button><span>${s.page} / ${count}</span><button type="button" data-earn-page="${s.page + 1}" aria-label="${t("下一页", "Next page")}" ${s.page >= count ? "disabled" : ""}>${icon("right")}</button></div></div></footer>`;
  }

  function table(rows) {
    const s = state();
    const visible = rows.slice((s.page - 1) * s.pageSize, s.page * s.pageSize);
    return `<div class="earn-table-scroll" role="region" aria-label="${t("佣金流水", "Commission records")}" tabindex="0"><table class="earn-table"><thead><tr>
      ${[t("产生日期", "Accrual date"), t("佣金编号", "Commission ID"), t("客户", "Client"), t("类型", "Type"), t("佣金金额", "Commission amount"), t("状态", "Status"), t("状态原因", "Status reason"), t("操作", "Action")].map(name => `<th scope="col">${name}</th>`).join("")}
      </tr></thead><tbody>${visible.length ? visible.map(row => `<tr>
        <td>${h(row.date)}</td><td>${h(row.id)}</td><td><strong>${h(row.client.clientId)}</strong><small>${h(row.client.email)}</small></td>
        <td>${t(...typeLabels[row.type])}</td><td class="earn-amount ${row.amount < 0 ? "earn-negative" : ""}">${money(row.amount)}</td>
        <td>${badge(row.status)}</td><td class="earn-reason">${h(reason(row))}${row.hold ? `<small>${t("暂扣", "Hold")} ${row.hold.totalDays} ${t("天", "days")} · ${t("预计释放", "Expected release")} ${row.hold.expectedReleaseAt}</small>` : ""}</td>
        <td><div class="earn-row-actions"><button class="button secondary small" type="button" data-earn-detail="${h(row.id)}">${t("详情", "Details")}</button>${appealButton(row)}</div></td>
      </tr>`).join("") : `<tr><td class="earn-empty" colspan="8"><strong>${t("暂无佣金记录", "No commission records")}</strong><span>${t("请调整筛选条件，或重置后查看。", "Adjust the filters or reset to view records.")}</span></td></tr>`}</tbody></table></div>${pagination(rows.length)}`;
  }

  function field(label, value) {
    return `<div><dt>${h(label)}</dt><dd>${h(value ?? "—")}</dd></div>`;
  }

  function holdSection(row, s) {
    if (!row.hold) return "";
    const hold = row.hold;
    return `<section class="earn-detail-section"><div class="earn-section-heading"><h3>${t("本笔暂扣", "This hold")}</h3><div class="earn-help-anchor"><button class="earn-text-button" type="button" data-earn-action="detail-help" aria-expanded="${s.detailHelp}" aria-controls="earn-detail-help" aria-describedby="earn-detail-help">${t("暂扣原因与天数", "Hold reasons and duration")} <span aria-hidden="true">?</span></button>${helpContent("earn-detail-help")}</div></div>
      <dl class="earn-detail-grid">${field(t("本次暂扣天数", "Hold duration"), `${hold.totalDays} ${t("天", "days")}`)}${field(t("已观察", "Elapsed"), `${hold.elapsedDays} ${t("天", "days")}`)}${field(t("暂扣开始日期", "Hold start date"), hold.startedAt)}${field(t("预计释放日期", "Expected release date"), hold.expectedReleaseAt)}</dl>
      <p>${h(reason(row))}</p><p class="earn-muted">${t("预计释放日可能随复核结果调整；审核通过并完成入账后才可纳入可提现余额。", "The expected release date may change after review. Funds become available only after approval and crediting.")}</p>
    </section>`;
  }

  function flow(row) {
    const c = row.client;
    const unavailable = t("处理时间未提供", "Processing time unavailable");
    const steps = [
      { title: t("佣金产生", "Commission accrued"), done: true, date: c.qualifiedAt, text: `${t("CPA合格后产生预计佣金", "Estimated commission after CPA qualification")} ${money(c.expected)}` },
      { title: t("暂扣观察", "Hold observation"), done: Boolean(row.hold), date: row.hold?.startedAt, text: row.hold ? `${row.hold.totalDays} ${t("天，预计释放", "days, expected release")} ${row.hold.expectedReleaseAt}` : t("未提供该环节记录", "No record available for this stage") },
      { title: t("佣金审核", "Commission review"), done: ["approved", "rejected", "reversed"].includes(row.status), text: row.status === "approved" ? t("审核通过", "Approved") : row.status === "rejected" ? t("审核拒绝", "Rejected") : row.status === "reversed" ? t("复核结果为冲正；原审核记录未提供", "Review resulted in reversal; the original review record is unavailable") : t("尚未完成", "Not completed") }
    ];
    if (row.status === "approved") steps.push({ title: t("佣金入账", "Commission credited"), done: true, text: `${money(c.approved)} · ${unavailable}` });
    else if (row.status === "rejected") steps.push({ title: t("佣金拒绝", "Commission rejected"), done: true, text: `${t("不计入已入账佣金", "Excluded from credited commission")} · ${unavailable}` });
    else if (row.status === "reversed") steps.push({ title: t("佣金冲正", "Commission reversed"), done: true, text: `${money(-c.reversed)} · ${t("原入账明细与扣回记录未提供", "Original credit and recovery records unavailable")}` });
    else if (row.status === "frozen") steps.push({ title: t("冻结与人工审核", "Frozen for manual review"), done: true, text: t("超过30天，人工审核结果待定", "Over 30 days; manual review pending") });
    else steps.push({ title: t("佣金入账", "Commission credit"), done: false, text: t("尚未到达", "Not reached") });
    return `<ol class="earn-flow">${steps.map(step => `<li class="${step.done ? "complete" : ""}"><div><strong>${step.title}</strong><span>${h(step.text)}</span></div><time>${h(step.date || (step.done ? unavailable : t("—", "—")))}</time></li>`).join("")}</ol>`;
  }

  function drawer() {
    const s = state();
    const row = records().find(item => item.id === s.detail);
    if (!row) return "";
    const c = row.client;
    const appeal = appealRecord(row);
    return `<div class="overlay earn-overlay" data-earn-action="close"></div><aside class="earn-drawer" role="dialog" aria-modal="true" aria-labelledby="earn-detail-title">
      <header><div><h2 id="earn-detail-title">${t("佣金详情", "Commission details")}</h2><p>${h(row.id)}</p></div><button class="earn-icon-button" type="button" data-earn-action="close" aria-label="${t("关闭", "Close")}">${icon("close")}</button></header>
      <div class="earn-drawer-body">
        <section class="earn-detail-section"><div class="earn-detail-amount"><strong>${money(row.amount)}</strong>${badge(row.status)}</div><p>${h(reason(row))}</p><dl class="earn-detail-grid">${field(t("流水类型", "Record type"), t(...typeLabels[row.type]))}${field(t("产生日期", "Accrual date"), row.date)}${field(t("原预计佣金", "Original estimate"), money(c.expected))}${field(t("当前已入账", "Currently credited"), money(c.approved))}${field(t("暂扣金额", "Amount on hold"), money(c.held))}${field(t("冲正金额", "Reversed amount"), money(c.reversed))}</dl>
          ${canAppeal(row) ? `<p class="earn-muted">${h(c.commissionReasonCode)}</p>` : ""}
        </section>
        <section class="earn-detail-section"><h3>${t("关联客户", "Related client")}</h3><dl class="earn-detail-grid">
          ${field(t("客户编号", "Client ID"), c.clientId)}${field(t("邮箱", "Email"), c.email)}${field(t("国家/地区", "Country / region"), c.country)}${field(t("平台", "Platform"), c.platform)}${field(t("注册日期", "Registered on"), c.registeredAt)}${field("FTD", c.ftdAt)}${field(t("有效FTD", "Valid FTD"), c.effectiveAt)}${field(t("CPA合格", "CPA qualified"), c.qualifiedAt)}${field(t("活动", "Campaign"), `${c.campaign} · ${c.campaignCode}`)}${field("Sub ID", c.subId)}
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
    return `<div class="earn-page">${stats(rows)}
      <section class="card earn-panel"><div class="earn-panel-heading"><h2>${t("佣金流水", "Commission records")}</h2><button class="earn-text-button" type="button" data-earn-action="help" aria-expanded="${s.help}" aria-controls="earn-hold-help">${t("暂扣说明", "About holds")} <span aria-hidden="true">?</span></button></div>
        ${filters()}${s.help ? helpContent("earn-hold-help") : ""}${table(rows)}
      </section>
      <div class="earn-footnote"><span>${t("时区", "Timezone")} UTC+08:00 · ${t("币种", "Currency")} USD</span><span>${t("数据截至", "Data through")} ${AFF.reporting.now} 23:59</span></div>
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
    const rect = trigger.getBoundingClientRect();
    const header = document.querySelector(".earn-drawer > header").getBoundingClientRect();
    const footer = document.querySelector(".earn-drawer > footer").getBoundingClientRect();
    const topLimit = header.bottom + 8;
    const bottomLimit = footer.top - 8;
    popup.style.maxHeight = `${Math.max(100, bottomLimit - topLimit)}px`;
    const above = Math.max(0, rect.top - topLimit - 8);
    const below = Math.max(0, bottomLimit - rect.bottom - 8);
    const showBelow = popup.getBoundingClientRect().height <= below || below >= above;
    popup.style.maxHeight = `${Math.max(80, showBelow ? below : above)}px`;
    const bounds = popup.getBoundingClientRect();
    const top = showBelow ? rect.bottom + 8 : rect.top - bounds.height - 8;
    popup.style.top = `${Math.max(topLimit, Math.min(top, bottomLimit - bounds.height))}px`;
    popup.style.left = `${Math.max(12, Math.min(rect.right - bounds.width, innerWidth - bounds.width - 12))}px`;
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

  document.addEventListener("click", event => {
    if (AFF.state?.route !== "pay") return;
    if (!event.target.closest(".earn-help-anchor")) setDetailHelp(false);
    const node = event.target.closest("[data-earn-action], [data-earn-detail], [data-earn-appeal], [data-earn-page]");
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
    if (node.dataset.earnPage) {
      s.page = Number(node.dataset.earnPage);
      return rerender("[data-earn-page-size]");
    }
    const action = node.dataset.earnAction;
    if (action === "close") return close();
    if (action === "reset") {
      s.filters = defaultFilters(); s.draft = { ...s.filters }; s.error = ""; s.page = 1;
      return rerender('[data-earn-filter="from"]');
    }
    if (action === "help") {
      s.help = !s.help;
      return rerender('.earn-panel-heading [data-earn-action="help"]');
    }
    if (action === "detail-help") {
      const mouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      return setDetailHelp(mouse || !s.detailHelp);
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
  document.addEventListener("change", event => {
    updateDraft(event);
    if (AFF.state?.route !== "pay" || !event.target.matches("[data-earn-page-size]")) return;
    state().pageSize = Number(event.target.value); state().page = 1;
    rerender("[data-earn-page-size]");
  });
  document.addEventListener("submit", event => {
    if (AFF.state?.route !== "pay" || !event.target.matches("[data-earn-filter-form]")) return;
    event.preventDefault();
    const s = state();
    const f = s.draft;
    s.error = !validDate(f.from) || !validDate(f.to) || f.from > f.to || f.to > AFF.reporting.now
      ? t("请选择有效日期，开始日期不得晚于结束日期，结束日期不得晚于数据截止日。", "Choose valid dates. Start must not follow end, and end must not exceed the data date.")
      : f.status && !statusLabels[f.status] || f.type && !typeLabels[f.type]
        ? t("请选择有效的状态和类型。", "Choose a valid status and type.") : "";
    if (s.error) {
      document.querySelector("#earn-filter-error").textContent = s.error;
      return;
    }
    s.filters = { ...f }; s.page = 1;
    rerender('[data-earn-filter="from"]');
  });
  document.addEventListener("keydown", event => {
    if (AFF.state?.route !== "pay") return;
    if (event.key === "Escape") {
      if (state().detailHelp) {
        event.preventDefault();
        return setDetailHelp(false);
      }
      if (state().detail) { event.preventDefault(); return close(); }
      if (state().help) {
        state().help = false;
        return rerender('.earn-panel-heading [data-earn-action="help"]');
      }
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
