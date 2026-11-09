(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const statusLabels = {
    draft: ["草稿", "Draft", "muted"],
    submitted: ["已提交", "Submitted", "info"],
    pending_review: ["待复核", "Pending review", "warning"],
    waiting_partner: ["等待补充", "Waiting for partner", "warning"],
    processing: ["处理中", "Processing", "info"],
    waiting_external: ["等待外部", "Waiting external", "warning"],
    resolved: ["已解决", "Resolved", "ok"],
    closed: ["已关闭", "Closed", "muted"],
    rejected: ["已拒绝", "Rejected", "danger"],
    cancelled: ["已取消", "Cancelled", "muted"]
  };
  const types = [
    ["account", "账户资料", "Account profile"],
    ["verification", "认证/KYC", "Verification / KYC"],
    ["links", "链接与活动", "Links and campaigns"],
    ["postback", "回传", "Postbacks"],
    ["reports", "报表", "Reports"],
    ["statements", "结算单", "Statements"],
    ["withdrawal", "提现", "Withdrawal"],
    ["guarantee", "保证金", "Guarantee"],
    ["other", "其他", "Other"]
  ];
  const helpTasks = [
    ["链接生成", "Link setup", "deep", "选择官方资产、语言与系统后复制链接。", "Choose an official asset, language, and system, then copy the link."],
    ["回传配置", "Postback setup", "tracker", "配置事件模板、变量映射并运行本地测试。", "Configure event templates, parameter mapping, and local tests."],
    ["客户归属", "Attribution", "lookup", "使用精准标识查询受控归属结果。", "Use an exact identifier to check controlled attribution."],
    ["提现", "Withdrawal", "wd", "查看资金检查、选择收款方式并提交申请。", "Review fund checks, choose a payout method, and submit a request."],
    ["保证金", "Guarantee", "guarantee", "查看扣留、释放、抵扣与冻结记录。", "Review retention, release, offset, and frozen records."],
    ["KYC/KYB", "KYC / KYB", "account", "从个人中心查看相关资料与状态。", "View related profile details and status from the personal center."],
    ["账户安全", "Account security", "account", "查看CRM SSO、2FA和通知偏好。", "Review CRM SSO, 2FA, and notification preferences."],
    ["结算单", "Statements", "statements", "按月核对资金动作并下载结算单。", "Reconcile monthly fund movements and download statements."]
  ];
  let detailReturnFocus = null;

  function seedTickets() {
    const base = [
      ["TIC-2405", "withdrawal", ["提现状态未更新", "Withdrawal status not updated"], "submitted", "2026-11-04", ["18分钟", "18 minutes"], "C-12008"],
      ["TIC-2404", "statements", ["9月结算单保证金释放金额疑问", "September guarantee-release question"], "waiting_partner", "2026-11-03", ["4小时", "4 hours"], "STL-2026-09"],
      ["TIC-2403", "postback", ["回传测试成功但平台未显示", "Postback test passed but platform shows no event"], "processing", "2026-11-02", ["2小时", "2 hours"], "PBC-0031"],
      ["TIC-2402", "links", ["深度链接参数缺失", "Deep-link parameter missing"], "resolved", "2026-10-31", ["45分钟", "45 minutes"], "OFF-REGISTER"],
      ["TIC-2401", "verification", ["KYB受益所有人资料补交", "KYB beneficial-owner evidence"], "waiting_external", "2026-10-30", ["1天", "1 day"], "KYB-0091"],
      ["TIC-2400", "reports", ["客户数据导出缺少Sub ID", "Client export missing Sub ID"], "closed", "2026-10-29", ["3小时", "3 hours"], "RP-0912"],
      ["TIC-2399", "guarantee", ["保证金冻结原因咨询", "Guarantee freeze question"], "closed", "2026-10-28", ["2小时", "2 hours"], "GL-RISK-018"],
      ["TIC-2398", "account", ["通知邮件未收到", "Notification email not received"], "resolved", "2026-10-27", ["35分钟", "35 minutes"], "MSG-001"],
      ["TIC-2397", "other", ["申请合作政策解读", "Program policy question"], "closed", "2026-10-26", ["5小时", "5 hours"], "-"],
      ["TIC-2396", "withdrawal", ["收款账户名核对", "Payout account-name verification"], "rejected", "2026-10-25", ["6小时", "6 hours"], "ACC-8821"],
      ["TIC-2395", "reports", ["业绩分组合计口径", "Performance total definition"], "resolved", "2026-10-24", ["52分钟", "52 minutes"], "RP-0811"],
      ["TIC-2394", "links", ["活动归档后链接打不开", "Archived campaign link fails"], "closed", "2026-10-23", ["28分钟", "28 minutes"], "CMP-091"]
    ];
    return base.map(([id, type, title, status, createdAt, responseTime, relatedId], index) => ({
      id, type, title, status, createdAt,
      updatedAt: ["2026-11-05", "2026-11-04", "2026-11-03", "2026-11-01", "2026-11-02", "2026-10-30", "2026-10-29", "2026-10-28", "2026-10-27", "2026-10-26", "2026-10-25", "2026-10-24"][index] || createdAt,
      responseTime, relatedId,
      description: [`${title}。已提供关联编号与截图，等待支持团队复核。`, `${title}. Reference and screenshot provided; support review is pending.`],
      messages: [
        { time: createdAt, from: "partner", body: [`${title}，请协助确认。`, `${title}. Please help confirm.`] },
        { time: createdAt, from: "support", body: ["已收到请求，正在核对关联对象。", "Request received; the related object is being checked."] }
      ]
    }));
  }

  function defaults() {
    return {
      status: "", type: "", search: "", onlyMine: true, waiting: false,
      detail: "", createOpen: false, closeTicket: "",
      draft: { type: "account", title: "", description: "", relatedId: "" },
      closeDraft: { reason: "", resolved: true, satisfaction: "satisfied" },
      supplement: ""
    };
  }

  function state() {
    AFF.state.supportPage = { ...defaults(), ...(AFF.state.supportPage || {}) };
    if (!Array.isArray(AFF.state.supportTickets) || AFF.state.supportSeedVersion !== 2) {
      const seeded = seedTickets();
      const custom = Array.isArray(AFF.state.supportTickets)
        ? AFF.state.supportTickets.filter(item => !seeded.some(task => task.id === item.id))
        : [];
      AFF.state.supportTickets = [...custom, ...seeded];
      AFF.state.supportSeedVersion = 2;
    }
    return AFF.state.supportPage;
  }

  function tickets() { return AFF.state.supportTickets; }
  function typeLabel(key) {
    const item = types.find(entry => entry[0] === key);
    return t(item[1], item[2]);
  }
  const localized = value => Array.isArray(value) ? t(...value) : value;
  function tag(status) {
    const item = statusLabels[status] || [status, status, "muted"];
    return `<span class="tag tag-${item[2]}">${h(t(item[0], item[1]))}</span>`;
  }

  function filtered() {
    const s = state();
    const query = s.search.trim().toLowerCase();
    return tickets().filter(row =>
      (!s.status || row.status === s.status) &&
      (!s.type || row.type === s.type) &&
      (!s.waiting || ["waiting_partner", "waiting_external"].includes(row.status)) &&
      (!query || [row.id, row.title, row.relatedId, row.description].some(value => String(value).toLowerCase().includes(query)))
    ).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id));
  }

  function stats() {
    const rows = tickets();
    const closedThisWeek = rows.filter(row => row.status === "closed" && row.updatedAt >= "2026-10-30").length;
    return [
      [t("处理中", "Open"), rows.filter(row => ["submitted", "pending_review", "processing"].includes(row.status)).length],
      [t("等待补充", "Waiting"), rows.filter(row => ["waiting_partner", "waiting_external"].includes(row.status)).length],
      [t("本周关闭", "Closed this week"), closedThisWeek],
      [t("平均响应", "Avg response"), t("3小时", "3 hours")]
    ];
  }

  function pushSupportMessage(ticket, title, body) {
    AFF.finance.messages.unshift({
      id: `MSG-${ticket.id}-${ticket.messages.length + 1}`, level: "normal", type: "支持工单", title,
      date: ticket.updatedAt, status: "unread", body, supportTicketId: ticket.id
    });
  }

  function helpGrid() {
    return `<div class="support-task-grid">${helpTasks.map(([zh, en, route, note, noteEn]) => `
      <button type="button" data-route="${route}"><strong>${h(t(zh, en))}</strong><span>${h(t(note, noteEn))}</span><em aria-hidden="true">→</em></button>
    `).join("")}</div>`;
  }

  function filters() {
    const s = state();
    return `<div class="support-filters">
      <label><span>${t("状态", "Status")}</span><select data-support-filter="status"><option value="">${t("全部", "All")}</option>${Object.entries(statusLabels).map(([key, item]) => `<option value="${key}" ${key === s.status ? "selected" : ""}>${t(item[0], item[1])}</option>`).join("")}</select></label>
      <label><span>${t("类型", "Type")}</span><select data-support-filter="type"><option value="">${t("全部", "All")}</option>${types.map(([key, zh, en]) => `<option value="${key}" ${key === s.type ? "selected" : ""}>${t(zh, en)}</option>`).join("")}</select></label>
      <label class="support-search"><span>${t("搜索", "Search")}</span><input type="search" data-support-filter="search" value="${h(s.search)}" placeholder="${t("工单 / 标题 / 关联对象", "Ticket / title / reference")}"></label>
      <label class="support-check"><input type="checkbox" data-support-filter="waiting" ${s.waiting ? "checked" : ""}><span>${t("只看等待补充", "Waiting only")}</span></label>
      <button class="button secondary" type="button" data-support-action="reset">${t("重置", "Reset")}</button>
    </div>`;
  }

  function table(rows) {
    return `<div class="support-table-wrap"><table>
      <thead><tr><th>${t("工单号", "Ticket")}</th><th>${t("类型", "Type")}</th><th>${t("标题", "Title")}</th><th>${t("状态", "Status")}</th><th>${t("SLA", "SLA")}</th><th>${t("最近回复", "Last reply")}</th><th>${t("创建时间", "Created")}</th><th>${t("操作", "Action")}</th></tr></thead>
      <tbody>${rows.length ? rows.map(row => `<tr>
        <td>${h(row.id)}</td><td>${h(typeLabel(row.type))}</td><td><button class="report-text-button" type="button" data-support-detail="${h(row.id)}">${h(localized(row.title))}</button></td><td>${tag(row.status)}</td><td>${h(localized(row.responseTime))}</td><td>${h(row.updatedAt)}</td><td>${h(row.createdAt)}</td>
        <td><button class="button secondary small" type="button" data-support-detail="${h(row.id)}">${t("详情", "Details")}</button></td>
      </tr>`).join("") : `<tr><td colspan="8" class="finance-empty"><strong>${t("暂无工单", "No tickets")}</strong><p>${t("提交新工单后将在此显示。", "New tickets will appear here.")}</p></td></tr>`}</tbody>
    </table></div>`;
  }

  function drawer(row) {
    if (!row) return "";
    const s = state();
    return `<div class="aff-drawer-overlay" data-support-action="close"></div>
      <aside class="aff-drawer finance-drawer" role="dialog" aria-modal="true" aria-labelledby="support-detail-title">
        <header><div><h2 id="support-detail-title">${h(localized(row.title))}</h2><span>${row.id} · ${h(typeLabel(row.type))} · ${h(row.relatedId)}</span></div><button class="finance-drawer-close" type="button" data-support-action="close" aria-label="${t("关闭", "Close")}">×</button></header>
        <div class="finance-drawer-body">
          <section><div class="finance-drawer-amount"><span>${t("当前状态", "Status")}</span><strong>${h(t(...statusLabels[row.status].slice(0, 2)))}</strong>${tag(row.status)}</div>
            <dl class="finance-detail-grid">
              <div><dt>${t("创建时间", "Created")}</dt><dd>${row.createdAt}</dd></div>
              <div><dt>${t("最近回复", "Last reply")}</dt><dd>${row.updatedAt}</dd></div>
              <div><dt>${t("响应SLA", "Response SLA")}</dt><dd>${h(localized(row.responseTime))}</dd></div>
              <div><dt>${t("关联对象", "Reference")}</dt><dd>${row.relatedId}</dd></div>
            </dl>
          </section>
          <section><h3>${t("描述与处理记录", "Description and handling")}</h3><p>${h(localized(row.description))}</p>
            <ol class="support-timeline">${row.messages.map(item => `<li><strong>${item.from === "partner" ? t("合作方", "Partner") : t("支持团队", "Support")}</strong><span>${h(item.time)}</span><p>${h(localized(item.body))}</p></li>`).join("")}</ol>
          </section>
          <section><h3>${t("补充材料", "Additional evidence")}</h3>
            <label class="support-textarea"><span>${t("补充说明", "Explanation")}</span><textarea data-support-supplement rows="5" maxlength="2000">${h(s.supplement)}</textarea></label>
            <button class="button secondary" type="button" data-support-action="submit-supplement" data-id="${h(row.id)}">${t("提交补充", "Submit")}</button>
          </section>
        </div>
        <footer>
          <button class="button secondary" type="button" data-route="messages">${t("查看消息", "Messages")}</button>
          ${row.status !== "closed" ? `<button class="button primary" type="button" data-support-close="${h(row.id)}">${t("关闭工单", "Close ticket")}</button>` : ""}
        </footer>
      </aside>`;
  }

  function createModal() {
    const s = state();
    if (!s.createOpen) return "";
    return `<div class="aff-drawer-overlay" data-support-action="cancel-create"></div>
      <div class="support-modal" role="dialog" aria-modal="true" aria-labelledby="support-create-title">
        <header><h2 id="support-create-title">${t("创建支持工单", "Create support ticket")}</h2><button type="button" data-support-action="cancel-create" aria-label="${t("关闭", "Close")}">×</button></header>
        <form data-support-form>
          <label><span>${t("类型", "Type")}</span><select data-support-draft="type">${types.map(([key, zh, en]) => `<option value="${key}" ${key === s.draft.type ? "selected" : ""}>${t(zh, en)}</option>`).join("")}</select></label>
          <label><span>${t("标题", "Title")}</span><input data-support-draft="title" value="${h(s.draft.title)}" maxlength="120" required></label>
          <label><span>${t("关联对象", "Reference")}</span><input data-support-draft="relatedId" value="${h(s.draft.relatedId)}" maxlength="80" placeholder="TIC / C / COM / WOD"></label>
          <label><span>${t("描述", "Description")}</span><textarea data-support-draft="description" rows="5" maxlength="2000" required>${h(s.draft.description)}</textarea></label>
          <p>${t("申诉和风控结论不走本页，请前往申诉中心。", "Appeals and risk conclusions use the Appeal Center.")}</p>
          <footer><button type="button" class="button secondary" data-support-action="cancel-create">${t("取消", "Cancel")}</button><button type="submit" class="button primary">${t("提交工单", "Submit")}</button></footer>
        </form>
      </div>`;
  }

  function closeModal(row) {
    const s = state();
    if (!row) return "";
    return `<div class="aff-drawer-overlay" data-support-action="cancel-close"></div>
      <div class="support-modal" role="dialog" aria-modal="true" aria-labelledby="support-close-title">
        <header><h2 id="support-close-title">${t("关闭工单", "Close ticket")}</h2><button type="button" data-support-action="cancel-close" aria-label="${t("关闭", "Close")}">×</button></header>
        <form data-support-close-form>
          <label><span>${t("关闭原因", "Reason")}</span><input data-support-close-draft="reason" value="${h(s.closeDraft.reason)}" maxlength="160" required></label>
          <label class="support-check"><input type="checkbox" data-support-close-draft-check="resolved" ${s.closeDraft.resolved ? "checked" : ""}><span>${t("问题已解决", "Resolved")}</span></label>
          <label><span>${t("满意度", "Satisfaction")}</span><select data-support-close-draft="satisfaction"><option value="satisfied">${t("满意", "Satisfied")}</option><option value="neutral">${t("一般", "Neutral")}</option><option value="dissatisfied">${t("不满意", "Dissatisfied")}</option></select></label>
          <footer><button type="button" class="button secondary" data-support-action="cancel-close">${t("取消", "Cancel")}</button><button type="submit" class="button primary">${t("确认关闭", "Confirm close")}</button></footer>
        </form>
      </div>`;
  }

  function renderPage() {
    const s = state();
    const rows = filtered();
    return `<div class="support-page">
      ${AFF.helpers.pageHeader(t("帮助与工单", "Help and tickets"), t("先自助查找任务指引，无法解决时提交并跟进一般支持工单。", "Find task guidance, then submit and track general support tickets."))}
      <div class="cards support-cards">${stats().map(([label, value]) => `<article class="card metric"><span>${h(label)}</span><strong>${h(value)}</strong></article>`).join("")}</div>
      <section class="card"><div class="panel-header"><h2>${t("帮助任务", "Help tasks")}</h2><button class="button primary small" type="button" data-support-action="create">${t("创建工单", "Create ticket")}</button></div>${helpGrid()}</section>
      <section class="card"><div class="panel-header"><h2>${t("我的工单", "My tickets")}</h2><span class="helper">${t("一般支持 · 申诉另行走申诉中心", "General support · appeals use Appeal Center")}</span></div>${filters()}${table(rows)}</section>
      ${drawer(tickets().find(row => row.id === s.detail))}
      ${createModal()}
      ${closeModal(tickets().find(row => row.id === s.closeTicket))}
    </div>`;
  }

  document.addEventListener("input", event => {
    if (AFF.state?.route !== "support") return;
    const filter = event.target.closest("[data-support-filter]");
    const draft = event.target.closest("[data-support-draft]");
    const closeDraft = event.target.closest("[data-support-close-draft]");
    const supplement = event.target.closest("[data-support-supplement]");
    if (!filter && !draft && !closeDraft && !supplement) return;
    const s = state();
    if (filter) {
      const key = filter.dataset.supportFilter;
      s[key] = filter.type === "checkbox" ? filter.checked : filter.value;
      render();
      return document.querySelector(`[data-support-filter="${key}"]`)?.focus();
    }
    if (draft) s.draft[draft.dataset.supportDraft] = draft.value;
    if (closeDraft) s.closeDraft[closeDraft.dataset.supportCloseDraft] = closeDraft.value;
    if (supplement) s.supplement = supplement.value;
  });

  document.addEventListener("change", event => {
    if (AFF.state?.route !== "support") return;
    const check = event.target.closest("[data-support-close-draft-check]");
    if (check) state().closeDraft.resolved = check.checked;
  });

  document.addEventListener("submit", event => {
    if (AFF.state?.route !== "support") return;
    const s = state();
    if (event.target.matches("[data-support-form]")) {
      event.preventDefault();
      if (!s.draft.title.trim() || s.draft.description.trim().length < 2) return showToast(t("请填写标题和问题描述。", "Enter a title and description."));
      const ticket = {
        id: `TIC-${2406 + tickets().length}`, type: s.draft.type, title: s.draft.title.trim(),
        status: "submitted", createdAt: AFF.finance.asOf, updatedAt: AFF.finance.asOf,
        responseTime: t("4小时", "4 hours"), relatedId: s.draft.relatedId.trim() || "-",
        description: s.draft.description.trim(),
        messages: [{ time: AFF.finance.asOf, from: "partner", body: s.draft.description.trim() }]
      };
      tickets().unshift(ticket);
      pushSupportMessage(ticket, "支持工单已提交", `工单${ticket.id}已提交，支持团队将在SLA内响应。`);
      s.draft = defaults().draft; s.createOpen = false;
      s.detail = ticket.id;
      showToast(t("工单已提交", "Ticket submitted"));
      render();
      return document.querySelector(`[data-support-detail="${ticket.id}"]`)?.focus();
    }
    if (event.target.matches("[data-support-close-form]")) {
      event.preventDefault();
      if (!s.closeDraft.reason.trim()) return showToast(t("请填写关闭原因。", "Enter a close reason."));
      const ticket = tickets().find(row => row.id === s.closeTicket);
      if (!ticket) return;
      ticket.status = "closed";
      ticket.updatedAt = AFF.finance.asOf;
      ticket.closeReason = s.closeDraft.reason.trim();
      ticket.resolved = s.closeDraft.resolved;
      ticket.satisfaction = s.closeDraft.satisfaction;
      ticket.messages.push({ time: AFF.finance.asOf, from: "support", body: `工单已关闭：${ticket.closeReason}` });
      pushSupportMessage(ticket, "支持工单已关闭", `工单${ticket.id}已关闭：${ticket.closeReason}`);
      s.closeTicket = ""; s.closeDraft = defaults().closeDraft;
      showToast(t("工单已关闭", "Ticket closed"));
      render();
      return document.querySelector(detailReturnFocus || "[data-support-detail]")?.focus();
    }
  });

  document.addEventListener("click", event => {
    if (AFF.state?.route !== "support") return;
    const detail = event.target.closest("[data-support-detail]");
    if (detail) {
      const s = state();
      detailReturnFocus = `[data-support-detail="${CSS.escape(detail.dataset.supportDetail)}"]`;
      s.detail = detail.dataset.supportDetail;
      s.closeTicket = ""; s.createOpen = false; s.supplement = "";
      render();
      return document.querySelector(".finance-drawer-close")?.focus();
    }
    const close = event.target.closest("[data-support-close]");
    if (close) {
      state().closeTicket = close.dataset.supportClose;
      render();
      return document.querySelector("[data-support-close-draft='reason']")?.focus();
    }
    const target = event.target.closest("[data-support-action]");
    if (!target) return;
    const action = target.dataset.supportAction;
    const s = state();
    if (action === "create") {
      s.createOpen = true; s.detail = ""; s.closeTicket = "";
      render();
      return document.querySelector("[data-support-draft='title']")?.focus();
    }
    if (["cancel-create", "cancel-close"].includes(action)) {
      s.createOpen = false; s.closeTicket = "";
      render();
      return document.querySelector(detailReturnFocus || "[data-support-detail]")?.focus();
    }
    if (action === "close") {
      s.detail = ""; s.createOpen = false; s.closeTicket = "";
      render();
      return document.querySelector(detailReturnFocus || "[data-support-detail]")?.focus();
    }
    if (action === "reset") {
      AFF.state.supportPage = defaults();
      render();
      return document.querySelector("[data-support-filter='status']")?.focus();
    }
    if (action === "submit-supplement") {
      const ticket = tickets().find(row => row.id === target.dataset.id);
      if (!ticket || s.supplement.trim().length < 2) return showToast(t("请填写补充说明。", "Enter an explanation."));
      ticket.status = "processing";
      ticket.updatedAt = AFF.finance.asOf;
      ticket.messages.push({ time: AFF.finance.asOf, from: "partner", body: s.supplement.trim() });
      pushSupportMessage(ticket, "支持工单补充材料已提交", `工单${ticket.id}的补充说明已提交，状态更新为处理中。`);
      s.supplement = "";
      showToast(t("补充材料已提交", "Evidence submitted"));
      render();
      return document.querySelector(".finance-drawer-close")?.focus();
    }
  });

  document.addEventListener("keydown", event => {
    if (AFF.state?.route !== "support" || event.key !== "Escape") return;
    const s = state();
    if (!s.detail && !s.createOpen && !s.closeTicket) return;
    event.preventDefault();
    s.detail = ""; s.createOpen = false; s.closeTicket = "";
    render();
  });

  AFF.support = { tickets, filtered, helpTasks, types };
  AFF.pages.support = renderPage;
})();
