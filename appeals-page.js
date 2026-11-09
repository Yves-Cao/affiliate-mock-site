(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const labels = {
    materials: ["待补充材料", "Materials required", "warning"],
    reviewing: ["审核中", "Reviewing", "info"],
    overturned: ["已改判", "Overturned", "ok"],
    rejected: ["已驳回", "Rejected", "danger"],
    closed: ["已关闭", "Closed", "muted"],
    blocked: ["不可申诉", "Not appealable", "danger"]
  };
  const objects = ["佣金冲正", "佣金拒绝", "保证金抵扣", "结算延长", "客户资格无效", "风险分级上调"];
  const taskTypeLabels = {
    commission: ["佣金申诉", "Commission appeal"],
    investigation: ["调查补充材料", "Investigation evidence"]
  };
  let returnFocus = null;

  function defaults() {
    return {
      formOpen: false, object: "佣金冲正", objectId: "", reason: "",
      status: "", objectFilter: "", taskType: "", from: "", to: "", search: "",
      page: 1, pageSize: 10, detail: null
    };
  }

  function state() {
    AFF.state.appealsPage = { ...defaults(), ...(AFF.state.appealsPage || {}) };
    return AFF.state.appealsPage;
  }

  function tag(status) {
    const item = labels[status] || [status, status, "muted"];
    return `<span class="tag tag-${item[2]}">${t(item[0], item[1])}</span>`;
  }

  function shiftDate(value, days) {
    return new Date(Date.parse(`${value}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
  }

  function investigationTasks() {
    return AFF.reporting.rows
      .filter(row => row.clientId && ["investigating", "quarantined", "released"].includes(row.riskHandlingStatus))
      .map(row => ({
        id: `INV-${row.clientId}`,
        taskType: "investigation",
        object: "调查补充材料",
        objectId: row.clientId,
        clientId: row.clientId,
        submittedAt: row.riskStartedAt,
        dueAt: shiftDate(row.riskStartedAt, 7),
        status: row.riskHandlingStatus === "investigating" ? "materials" : row.riskHandlingStatus === "quarantined" ? "reviewing" : "closed",
        reason: row.riskReasonCategory,
        result: row.riskHandlingStatus === "released" ? "调查已解除，等待结算复核" : "",
        canAppeal: row.riskHandlingStatus !== "released",
        materials: ["投放说明", "流量来源截图", "客户沟通记录"],
        consequence: "超时可能升级限制、维持结算阻断或转入人工处理；不会仅因超时自动认定违规。",
        evidenceScope: row.riskEvidenceScope,
        impactScope: row.riskImpactScope,
        nextStep: row.riskNextStep,
        handlingPath: row.riskHandlingPath
      }));
  }

  function records() {
    const s = state();
    const query = s.search.trim().toLowerCase();
    return allRecords()
      .filter(row => !s.status || row.status === s.status)
      .filter(row => !s.objectFilter || row.object === s.objectFilter)
      .filter(row => !s.taskType || row.taskType === s.taskType)
      .filter(row => !s.from || (row.submittedAt !== "-" && row.submittedAt >= s.from))
      .filter(row => !s.to || (row.submittedAt !== "-" && row.submittedAt <= s.to))
      .filter(row => !query || [row.id, row.object, row.objectId, row.clientId, row.reason, row.result]
        .some(value => String(value || "").toLowerCase().includes(query)))
      .sort((left, right) => String(right.submittedAt).localeCompare(String(left.submittedAt)) || left.id.localeCompare(right.id));
  }

  function allRecords() {
    return [...investigationTasks(), ...AFF.finance.appeals.map(item => ({ ...item, taskType: "commission" }))];
  }

  function statusStep(status) {
    const map = {
      materials: t("请按通知补充证明材料，材料审核通过后进入人工复核。", "Provide the requested evidence. It enters manual review after materials pass."),
      reviewing: t("申诉正在人工复核，提交申诉不会自动恢复原处置。", "The appeal is under manual review. Submission does not automatically restore the original action."),
      overturned: t("复核已支持申诉，处理结果已按结论执行。", "Review supported the appeal and the recorded result has been applied."),
      rejected: t("复核未支持申诉，原处置保持不变。", "Review did not support the appeal; the original action remains."),
      closed: t("申诉已关闭，可查看原因和结论。", "The appeal is closed. Reason and result remain available."),
      blocked: t("该对象不可申诉，仍保留原始处理原因。", "This object is not appealable. The original reason remains available.")
    };
    return map[status] || "-";
  }

  function investigationDetail(row) {
    if (row.taskType !== "investigation") return "";
    const field = (name, value) => `<div><dt>${h(name)}</dt><dd>${h(value || "-")}</dd></div>`;
    return `<section>
      <h3>${t("调查补充材料", "Investigation evidence")}</h3>
      <dl class="finance-detail-grid">
        ${field(t("响应截止时间", "Response deadline"), `${row.dueAt} · SLA 7自然日`)}
        ${field(t("材料清单", "Required materials"), row.materials.join("、"))}
        ${field(t("超时后果", "Deadline consequence"), row.consequence)}
        ${field(t("影响范围", "Impact scope"), row.impactScope)}
        ${field(t("证据范围", "Evidence scope"), row.evidenceScope)}
        ${field(t("下一步", "Next step"), row.nextStep)}
        ${field(t("预计处理路径", "Handling path"), row.handlingPath)}
        ${field(t("申诉路径", "Appeal path"), row.canAppeal ? t("申诉中心", "Appeal center") : t("暂无", "None"))}
      </dl>
    </section>`;
  }

  function drawer(row) {
    if (!row) return "";
    const field = (name, value) => `<div><dt>${h(name)}</dt><dd>${h(value || "-")}</dd></div>`;
    return `<div class="aff-drawer-overlay" data-appeal-action="close"></div>
      <aside class="aff-drawer finance-drawer" role="dialog" aria-modal="true" aria-labelledby="appeal-detail-title">
        <header>
          <div><h2 id="appeal-detail-title">${t("申诉详情", "Appeal details")}</h2><span>${h(row.id)}</span></div>
          <button class="finance-drawer-close" type="button" data-appeal-action="close" aria-label="${t("关闭详情", "Close details")}">×</button>
        </header>
        <div class="finance-drawer-body">
          <section class="finance-drawer-amount">
            <span>${t("当前状态", "Current status")}</span>
            <div>${tag(row.status)}</div>
          </section>
          <section>
            <h3>${t("申诉信息", "Appeal information")}</h3>
            <dl class="finance-detail-grid">
              ${field(t("申诉对象", "Object"), row.object)}
              ${field(t("关联编号", "Reference"), row.objectId)}
              ${field(t("客户", "Client"), row.clientId)}
              ${field(t("提交日期", "Submitted"), row.submittedAt)}
              ${field(t("截止日期", "Due"), row.dueAt)}
              ${field(t("原因", "Reason"), row.reason)}
              ${field(t("结论", "Result"), row.result)}
            </dl>
          </section>
          ${investigationDetail(row)}
          <section>
            <h3>${t("下一步", "Next step")}</h3>
            <p>${h(statusStep(row.status))}</p>
          </section>
        </div>
        <footer><button class="button secondary" type="button" data-appeal-action="close">${t("关闭", "Close")}</button></footer>
      </aside>`;
  }

  function pagination(total, s) {
    // Unified component (D-02): ellipsis pages + data-aff-* channel.
    return AFF.pagination.component({ page: s.page, pageSize: s.pageSize, total, channel: "appeals" });
  }

  function renderPage() {
    const s = state();
    const all = allRecords();
    const rows = records();
    const pages = Math.max(1, Math.ceil(rows.length / s.pageSize));
    s.page = Math.min(pages, Math.max(1, s.page));
    const shown = rows.slice((s.page - 1) * s.pageSize, s.page * s.pageSize);
    const detail = all.find(row => row.id === s.detail);
    return `
      ${AFF.helpers.pageHeader("申诉中心", "追踪佣金与风控处置申诉；硬拦截不可申诉。", `<button class="button primary" type="button" data-appeal-action="toggle">${s.formOpen ? t("关闭表单", "Close form") : t("新建申诉", "New appeal")}</button>`)}
      <div class="finance-page">
        ${AFF.helpers.cards([
          { label: t("申诉中", "Under review"), value: all.filter(item => ["materials", "reviewing"].includes(item.status)).length, hint: t("演示SLA 7自然日", "Demo SLA 7 days") },
          { label: t("已改判", "Overturned"), value: all.filter(item => item.status === "overturned").length, hint: t("释放或补发", "Released or repaid") },
          { label: t("已驳回", "Rejected"), value: all.filter(item => item.status === "rejected").length, hint: t("保留原处置", "Original action kept") },
          { label: t("不可申诉", "Not appealable"), value: all.filter(item => item.status === "blocked").length, hint: t("制裁/欺诈库确权", "Sanctions or confirmed fraud") },
          { label: t("调查任务", "Investigation tasks"), value: all.filter(item => item.taskType === "investigation").length, hint: t("材料补充与复核", "Evidence and review") },
          { label: t("待补充材料", "Materials required"), value: all.filter(item => item.status === "materials").length, hint: t("SLA 7自然日", "SLA 7 days") }
        ])}
        ${s.formOpen ? `
        <section class="card">
          <div class="panel-header"><h2>${t("新建申诉", "New appeal")}</h2><span class="helper">${t("提交不会自动恢复佣金", "Submitting does not restore commission")}</span></div>
          <div class="panel-body finance-filters">
            <label><span>${t("申诉对象", "Object")}</span>
              <select data-appeal-field="object">${objects.map(item => `<option ${s.object === item ? "selected" : ""}>${item}</option>`).join("")}</select>
            </label>
            <label><span>${t("关联编号", "Reference ID")}</span><input data-appeal-field="objectId" value="${h(s.objectId)}" placeholder="COM-..." maxlength="60"></label>
            <label class="wd-search"><span>${t("申诉说明", "Explanation")}</span><input data-appeal-field="reason" value="${h(s.reason)}" maxlength="120" placeholder="${t("请说明争议原因", "Describe the dispute")}"></label>
            <button class="button primary" type="button" data-appeal-action="submit">${t("提交申诉", "Submit")}</button>
          </div>
        </section>` : ""}
        <section class="card">
          <div class="panel-header"><h2>${t("申诉列表", "Appeals")}</h2><span class="helper">${t("时效倒计时按7自然日计算", "Countdown uses 7 calendar days")}</span></div>
          <div class="panel-body finance-filters">
            <label><span>${t("状态", "Status")}</span>
              <select data-appeal-filter="status" aria-label="${t("申诉状态", "Appeal status")}">
                <option value="">${t("全部", "All")}</option>
                ${Object.entries(labels).map(([value, item]) => `<option value="${value}" ${s.status === value ? "selected" : ""}>${t(item[0], item[1])}</option>`).join("")}
              </select>
            </label>
            <label><span>${t("任务类型", "Task type")}</span>
              <select data-appeal-filter="taskType" aria-label="${t("任务类型", "Task type")}">
                <option value="">${t("全部", "All")}</option>
                ${Object.entries(taskTypeLabels).map(([value, text]) => `<option value="${value}" ${s.taskType === value ? "selected" : ""}>${t(...text)}</option>`).join("")}
              </select>
            </label>
            <label><span>${t("申诉对象", "Object")}</span>
              <select data-appeal-filter="objectFilter" aria-label="${t("申诉对象", "Appeal object")}">
                <option value="">${t("全部", "All")}</option>
                ${objects.map(item => `<option value="${item}" ${s.objectFilter === item ? "selected" : ""}>${item}</option>`).join("")}
              </select>
            </label>
            <label><span>${t("提交日期范围", "Submitted range")}</span>
              ${AFF.dateRange.component({ id: "appeals-date-range", from: s.from, to: s.to, max: AFF.finance.asOf, placeholder: t("选择提交日期范围", "Select submitted dates") })}
            </label>
            <label><span>${t("搜索", "Search")}</span><input data-appeal-filter="search" value="${h(s.search)}" maxlength="80" placeholder="${t("编号 / 客户 / 原因", "ID / client / reason")}"></label>
            <button class="button secondary" type="button" data-appeal-action="reset">${t("重置筛选", "Reset filters")}</button>
          </div>
          <div class="finance-table-wrap"><table>
            <thead><tr><th>${t("编号", "ID")}</th><th>${t("任务类型", "Task type")}</th><th>${t("对象", "Object")}</th><th>${t("关联编号", "Reference")}</th><th>${t("客户", "Client")}</th><th>${t("提交日期", "Submitted")}</th><th>${t("截止日期", "Due")}</th><th>${t("状态", "Status")}</th><th>${t("原因 / 结论", "Reason / result")}</th><th>${t("操作", "Action")}</th></tr></thead>
            <tbody>${shown.length ? shown.map(row => `<tr>
              <td>${h(row.id)}</td><td>${t(...taskTypeLabels[row.taskType] || [row.taskType, row.taskType])}</td><td>${h(row.object)}</td><td>${h(row.objectId)}</td><td>${h(row.clientId)}</td>
              <td>${h(row.submittedAt)}</td><td>${h(row.dueAt)}</td><td>${tag(row.status)}</td><td>${h(row.status === "overturned" ? row.result : row.reason)}</td>
              <td><div class="wd-row-actions"><button class="button secondary small" type="button" data-appeal-detail="${h(row.id)}">${t("详情", "Details")}</button>${row.status === "materials" ? `<button class="button secondary small" type="button" data-route="messages">${t("去补充", "Submit info")}</button>` : ""}</div></td>
            </tr>`).join("") : `<tr><td colspan="10" class="finance-empty"><strong>${t("暂无申诉", "No appeals")}</strong><p>${t("发起申诉后将在此跟踪进度。", "Appeals will be tracked here.")}</p></td></tr>`}</tbody>
          </table></div>
          ${pagination(rows.length, s)}
        </section>
      </div>
      ${drawer(detail)}`;
  }

  function closeDrawer() {
    state().detail = null;
    render();
    document.querySelector(returnFocus)?.focus();
  }

  document.addEventListener("click", event => {
    if (AFF.state?.route !== "appeals") return;
    const target = event.target.closest("[data-appeal-action], [data-appeal-page], [data-appeal-detail], [data-aff-page]");
    if (!target) return;
    const s = state();
    const action = target.dataset.appealAction;
    if (action === "close") return closeDrawer();
    if (action === "toggle") s.formOpen = !s.formOpen;
    if (action === "reset") {
      AFF.state.appealsPage = { ...defaults(), formOpen: s.formOpen, object: s.object, objectId: s.objectId, reason: s.reason };
      render();
      return document.querySelector("[data-appeal-filter='status']")?.focus();
    }
    if (target.dataset.appealPage || target.dataset.affPage) {
      const page = Number(target.dataset.appealPage || target.dataset.affPage);
      if (!target.disabled && page >= 1 && page <= Math.max(1, Math.ceil(records().length / s.pageSize))) s.page = page;
      render();
      return AFF.pagination.focusNav("appeals");
    }
    if (target.dataset.appealDetail) {
      returnFocus = `[data-appeal-detail="${CSS.escape(target.dataset.appealDetail)}"]`;
      s.detail = target.dataset.appealDetail;
      s.formOpen = false;
      render();
      return document.querySelector(".finance-drawer-close")?.focus();
    }
    if (action === "submit") {
      if (!s.objectId.trim() || s.reason.trim().length < 2) return showToast(t("请填写关联编号和申诉说明", "Enter the reference ID and explanation"));
      const row = {
        id: `APL-U${String(AFF.finance.appeals.length + 1).padStart(4, "0")}`,
        object: s.object, objectId: s.objectId.trim(), clientId: "-",
        taskType: "commission",
        submittedAt: AFF.finance.asOf, dueAt: shiftDate(AFF.finance.asOf, 7), status: "reviewing",
        reason: s.reason.trim(), canAppeal: true
      };
      AFF.finance.appeals.unshift(row);
      s.formOpen = false; s.objectId = ""; s.reason = ""; s.page = 1;
      showToast(t("申诉已提交，等待人工复核", "Appeal submitted for review"));
      render();
      return document.querySelector("[data-appeal-detail]")?.focus();
    }
    render();
    target.focus();
  });

  document.addEventListener("input", event => {
    if (AFF.state?.route !== "appeals") return;
    const field = event.target.closest("[data-appeal-field]");
    const filter = event.target.closest("[data-appeal-filter]");
    if (!field && !filter) return;
    const s = state();
    if (field) s[field.dataset.appealField] = field.value;
    if (filter) {
      s[filter.dataset.appealFilter] = filter.value;
      s.page = 1;
      s.detail = null;
      render();
      document.querySelector(`[data-appeal-filter="${filter.dataset.appealFilter}"]`)?.focus();
    }
  });

  document.addEventListener("change", event => {
    if (AFF.state?.route !== "appeals" || !event.target.matches("[data-appeal-page-size], [data-aff-page-size]")) return;
    const s = state();
    s.pageSize = Number(event.target.value);
    s.page = 1;
    render();
    document.querySelector("[data-aff-page-size]")?.focus();
  });

  document.addEventListener("date-range-change", event => {
    if (AFF.state?.route !== "appeals" || event.detail.id !== "appeals-date-range") return;
    const s = state();
    s.from = event.detail.from;
    s.to = event.detail.to;
    s.page = 1;
    s.detail = null;
    render();
    document.querySelector("[data-range-id='appeals-date-range'] [data-range-toggle]")?.focus();
  });

  document.addEventListener("keydown", event => {
    if (AFF.state?.route !== "appeals" || event.key !== "Escape" || !state().detail) return;
    event.preventDefault();
    closeDrawer();
  });

  window.addEventListener("hashchange", () => {
    if (AFF.state?.route !== "appeals") return;
    state().detail = null;
  });

  AFF.pages.appeals = renderPage;
})();
