(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const levelLabels = {
    required: ["强制确认", "Required", "danger"],
    normal: ["普通", "Normal", "info"],
    info: ["仅提示", "Info", "muted"]
  };
  let returnFocus = null;
  const riskMessages = AFF.reporting.rows
    .filter(row => row.clientId && ["investigating", "quarantined", "released"].includes(row.riskHandlingStatus))
    .map(row => {
      const investigating = row.riskHandlingStatus === "investigating";
      const quarantined = row.riskHandlingStatus === "quarantined";
      return {
        id: `MSG-INV-${row.clientId}`,
        level: investigating ? "required" : "normal",
        type: investigating ? "调查通知" : quarantined ? "隔离通知" : "解除通知",
        title: investigating ? "需要补充调查材料" : quarantined ? "相关佣金已进入隔离" : "调查已解除",
        date: row.riskStatusTime,
        status: "unread",
        body: investigating
          ? `请在${row.riskStartedAt}后7个自然日内补充投放说明、流量来源截图和客户沟通记录；超时可能升级限制或维持结算阻断。`
          : quarantined
            ? "调查期间佣金保留并留痕，但不自动结算、不可提现；解除后需等待结算前检查。"
            : "调查已解除，关联佣金等待结算前检查，不会直接入账。",
        investigationId: `INV-${row.clientId}`,
        commissionCaseId: row.commissionCases?.[0]?.id,
        version: AFF.finance.configuration.version
      };
    });

  function defaults() {
    return {
      level: "", type: "", status: "", from: "", to: "", search: "",
      page: 1, pageSize: 10, detail: null
    };
  }

  function state() {
    AFF.state.messagesPage = { ...defaults(), ...(AFF.state.messagesPage || {}) };
    return AFF.state.messagesPage;
  }

  function levelTag(level) {
    const item = levelLabels[level] || [level, level, "muted"];
    return `<span class="tag tag-${item[2]}">${t(item[0], item[1])}</span>`;
  }

  function records() {
    const s = state();
    const query = s.search.trim().toLowerCase();
    return allMessages()
      .filter(row => !s.level || row.level === s.level)
      .filter(row => !s.type || row.type === s.type)
      .filter(row => !s.status || row.status === s.status)
      .filter(row => !s.from || row.date >= s.from)
      .filter(row => !s.to || row.date <= s.to)
      .filter(row => !query || [row.id, row.type, row.title, row.body, row.commissionCaseId, row.appealId, row.supportTicketId, row.accountRequestId, row.closureRequestId, row.simulationViolationId]
        .some(value => String(value || "").toLowerCase().includes(query)))
      .sort((left, right) => right.date.localeCompare(left.date) || left.id.localeCompare(right.id));
  }

  function allMessages() {
    return [...(AFF.partnerClosure?.messages() || []), ...riskMessages, ...AFF.finance.messages];
  }

  function relatedObject(row) {
    if (row.supportTicketId) return { label: t("查看支持工单", "View support ticket"), route: "support", id: row.supportTicketId };
    if (row.accountRequestId) return { label: t("查看个人中心", "View personal center"), route: "account", id: row.accountRequestId };
    if (row.closureRequestId) return { label: t("查看清退状态", "View closure status"), route: "account", id: row.closureRequestId };
    if (row.simulationViolationId) return { label: t("查看申诉中心", "View appeals"), route: "appeals", id: row.simulationViolationId };
    if (row.investigationId) return { label: t("查看调查任务", "View investigation"), route: "appeals", id: row.investigationId };
    if (row.commissionCaseId) return { label: t("查看收益数据", "View earnings"), route: "pay", id: row.commissionCaseId };
    if (row.appealId) return { label: t("查看申诉", "View appeal"), route: "appeals", id: row.appealId };
    if (String(row.id).startsWith("GL-")) return { label: t("查看保证金", "View guarantee"), route: "guarantee", id: row.id };
    return null;
  }

  function drawer(row) {
    if (!row) return "";
    const related = relatedObject(row);
    const field = (name, value) => `<div><dt>${h(name)}</dt><dd>${h(value || "-")}</dd></div>`;
    return `<div class="aff-drawer-overlay" data-message-action="close"></div>
      <aside class="aff-drawer finance-drawer" role="dialog" aria-modal="true" aria-labelledby="message-detail-title">
        <header>
          <div><h2 id="message-detail-title">${h(row.title)}</h2><span>${h(row.date)} · ${h(row.type)}</span></div>
          <button class="finance-drawer-close" type="button" data-message-action="close" aria-label="${t("关闭详情", "Close details")}">×</button>
        </header>
        <div class="finance-drawer-body">
          <section class="finance-drawer-amount">
            <span>${t("消息级别", "Message level")}</span>
            <div>${levelTag(row.level)}</div>
          </section>
          <section>
            <h3>${t("消息内容", "Message content")}</h3>
            <p>${h(row.body)}</p>
            <dl class="finance-detail-grid">
              ${field(t("消息编号", "Message ID"), row.id)}
              ${field(t("状态", "Status"), row.status === "unread" ? t("未读", "Unread") : t("已读", "Read"))}
              ${field(t("规则版本", "Rule version"), row.version)}
              ${field(t("关联对象", "Related object"), related ? related.id : "-")}
            </dl>
          </section>
          ${row.level === "required" ? `<section><h3>${t("强制确认", "Required acknowledgement")}</h3><p>${t("确认后仅记录阅读状态，不改变业务规则版本。", "Acknowledgement records reading status only; it does not change the rule version.")}</p></section>` : ""}
        </div>
        <footer>
          ${related ? `<button class="button secondary" type="button" data-route="${related.route}">${related.label}</button>` : ""}
          ${row.status === "unread" && row.level !== "info" ? `<button class="button primary" type="button" data-message-read="${h(row.id)}">${row.level === "required" ? t("确认已读", "Acknowledge") : t("标记已读", "Mark read")}</button>` : ""}
          <button class="button secondary" type="button" data-message-action="close">${t("关闭", "Close")}</button>
        </footer>
      </aside>`;
  }

  function pagination(total, s) {
    // Unified component (D-02): ellipsis pages + data-aff-* channel.
    return AFF.pagination.component({ page: s.page, pageSize: s.pageSize, total, channel: "messages" });
  }

  function renderPage() {
    const s = state();
    const all = records();
    const rows = records();
    const pages = Math.max(1, Math.ceil(rows.length / s.pageSize));
    s.page = Math.min(pages, Math.max(1, s.page));
    const shown = rows.slice((s.page - 1) * s.pageSize, s.page * s.pageSize);
    const detail = all.find(row => row.id === s.detail);
    const types = [...new Set(all.map(row => row.type))];
    return `
      ${AFF.helpers.pageHeader("消息中心", "规则公告与业务通知；重要变更需确认已读。")}
      <div class="finance-page">
        ${AFF.helpers.cards([
          { label: t("未读消息", "Unread"), value: all.filter(item => item.status === "unread").length, hint: t("顶部铃铛同源", "Same as top bell") },
          { label: t("待强制确认", "Required"), value: all.filter(item => item.level === "required" && item.status === "unread").length, hint: t("不阻塞其他操作", "Does not block other pages") },
          { label: t("规则公告", "Policy notices"), value: all.filter(item => item.level === "required").length, hint: t("需留痕", "Acknowledged") },
          { label: t("业务通知", "Business notices"), value: all.filter(item => item.level === "normal").length, hint: t("结算 / 审核 / 申诉", "Settlement / review / appeals") }
        ])}
        <section class="card">
          <div class="panel-header"><h2>${t("消息列表", "Messages")}</h2><span class="helper">${t("数据截至", "As of")} ${AFF.finance.asOf}</span></div>
          <div class="panel-body finance-filters">
            <label><span>${t("级别", "Level")}</span>
              <select data-message-filter="level" aria-label="${t("消息级别", "Message level")}">
                <option value="">${t("全部", "All")}</option>
                ${Object.entries(levelLabels).map(([value, item]) => `<option value="${value}" ${s.level === value ? "selected" : ""}>${t(item[0], item[1])}</option>`).join("")}
              </select>
            </label>
            <label><span>${t("类型", "Type")}</span>
              <select data-message-filter="type" aria-label="${t("消息类型", "Message type")}">
                <option value="">${t("全部", "All")}</option>
                ${types.map(type => `<option value="${h(type)}" ${s.type === type ? "selected" : ""}>${h(type)}</option>`).join("")}
              </select>
            </label>
            <label><span>${t("状态", "Status")}</span>
              <select data-message-filter="status" aria-label="${t("阅读状态", "Read status")}">
                <option value="">${t("全部", "All")}</option>
                <option value="unread" ${s.status === "unread" ? "selected" : ""}>${t("未读", "Unread")}</option>
                <option value="read" ${s.status === "read" ? "selected" : ""}>${t("已读", "Read")}</option>
              </select>
            </label>
            <label><span>${t("日期范围", "Date range")}</span>
              ${AFF.dateRange.component({ id: "messages-date-range", from: s.from, to: s.to, max: AFF.finance.asOf, placeholder: t("选择日期范围", "Select dates") })}
            </label>
            <label><span>${t("搜索", "Search")}</span><input data-message-filter="search" value="${h(s.search)}" maxlength="80" placeholder="${t("标题 / 正文 / 关联编号", "Title / body / reference")}"></label>
            <button class="button secondary" type="button" data-message-action="reset">${t("重置筛选", "Reset filters")}</button>
          </div>
          <div class="finance-table-wrap"><table>
            <thead><tr><th>${t("日期", "Date")}</th><th>${t("级别", "Level")}</th><th>${t("类型", "Type")}</th><th>${t("标题", "Title")}</th><th>${t("状态", "Status")}</th><th>${t("操作", "Action")}</th></tr></thead>
            <tbody>${shown.length ? shown.map(row => `<tr>
              <td>${h(row.date)}</td>
              <td>${levelTag(row.level)}</td>
              <td>${h(row.type)}</td>
              <td><button class="report-text-button" type="button" data-message-detail="${h(row.id)}"><strong>${h(row.title)}</strong></button><small>${h(row.body)}</small></td>
              <td><span class="tag tag-${row.status === "unread" ? "warning" : "ok"}">${row.status === "unread" ? t("未读", "Unread") : t("已读", "Read")}</span></td>
              <td><div class="wd-row-actions"><button class="button secondary small" type="button" data-message-detail="${h(row.id)}">${t("详情", "Details")}</button>${row.status === "unread" && row.level !== "info" ? `<button class="button secondary small" type="button" data-message-read="${h(row.id)}">${row.level === "required" ? t("确认已读", "Acknowledge") : t("标记已读", "Mark read")}</button>` : ""}</div></td>
            </tr>`).join("") : `<tr><td colspan="6" class="finance-empty"><strong>${t("暂无消息", "No messages")}</strong><p>${t("有新消息时会在此通知。", "New messages will appear here.")}</p></td></tr>`}</tbody>
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

  function markRead(id) {
    const row = allMessages().find(item => item.id === id);
    if (!row || row.status === "read") return;
    row.status = "read";
    showToast(t("已读状态已保存", "Read status saved"));
    render();
    document.querySelector(`[data-message-detail="${CSS.escape(id)}"]`)?.focus();
  }

  document.addEventListener("click", event => {
    if (AFF.state?.route !== "messages") return;
    const read = event.target.closest("[data-message-read]");
    if (read) return markRead(read.dataset.messageRead);
    const target = event.target.closest("[data-message-action], [data-message-page], [data-message-detail], [data-aff-page]");
    if (!target) return;
    const s = state();
    if (target.dataset.messageAction === "close") return closeDrawer();
    if (target.dataset.messageAction === "reset") {
      AFF.state.messagesPage = defaults();
      render();
      return document.querySelector("[data-message-filter='level']")?.focus();
    }
    if (target.dataset.messagePage || target.dataset.affPage) {
      const page = Number(target.dataset.messagePage || target.dataset.affPage);
      const pages = Math.max(1, Math.ceil(records().length / s.pageSize));
      if (!target.disabled && page >= 1 && page <= pages) s.page = page;
      render();
      return AFF.pagination.focusNav("messages");
    }
    if (target.dataset.messageDetail) {
      returnFocus = `[data-message-detail="${CSS.escape(target.dataset.messageDetail)}"]`;
      s.detail = target.dataset.messageDetail;
      render();
      return document.querySelector(".finance-drawer-close")?.focus();
    }
  });

  document.addEventListener("input", event => {
    if (AFF.state?.route !== "messages" || !event.target.matches("[data-message-filter]")) return;
    const s = state();
    const key = event.target.dataset.messageFilter;
    s[key] = event.target.value;
    s.page = 1;
    s.detail = null;
    render();
    document.querySelector(`[data-message-filter="${key}"]`)?.focus();
  });

  document.addEventListener("change", event => {
    if (AFF.state?.route !== "messages" || !event.target.matches("[data-message-page-size], [data-aff-page-size]")) return;
    const s = state();
    s.pageSize = Number(event.target.value);
    s.page = 1;
    render();
    document.querySelector("[data-aff-page-size]")?.focus();
  });

  document.addEventListener("date-range-change", event => {
    if (AFF.state?.route !== "messages" || event.detail.id !== "messages-date-range") return;
    const s = state();
    s.from = event.detail.from;
    s.to = event.detail.to;
    s.page = 1;
    s.detail = null;
    render();
    document.querySelector("[data-range-id='messages-date-range'] [data-range-toggle]")?.focus();
  });

  document.addEventListener("keydown", event => {
    if (AFF.state?.route !== "messages" || event.key !== "Escape" || !state().detail) return;
    event.preventDefault();
    closeDrawer();
  });

  window.addEventListener("hashchange", () => {
    if (AFF.state?.route !== "messages") return;
    state().detail = null;
  });

  AFF.messages = { records, allMessages };
  AFF.pages.messages = renderPage;
})();
