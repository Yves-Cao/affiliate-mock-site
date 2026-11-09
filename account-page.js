(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const tabs = [
    ["overview", "概览", "Overview"],
    ["profile", "资料", "Profile"],
    ["finance", "财务资料", "Financial details"],
    ["security", "通知与安全", "Notifications & security"]
  ];
  const statusLabels = {
    normal: ["正常", "Normal", "ok"],
    reviewing: ["审核中", "Reviewing", "info"],
    incomplete: ["待完善", "Incomplete", "warning"],
    disabled: ["已锁定", "Locked", "muted"],
    terminated: ["清退中", "Closing", "danger"]
  };

  function defaults() {
    return {
      tab: "overview",
      drawer: "",
      notificationPrefs: {
        email: true,
        commission: true,
        risk: true,
        appeal: true,
        announcement: true,
        product: false
      },
      financeRequests: [],
      financeDraft: { type: "payout", category: "account_change", explanation: "" }
    };
  }

  function state() {
    const initial = defaults();
    AFF.state.accountPage = {
      ...initial,
      ...(AFF.state.accountPage || {}),
      notificationPrefs: {
        ...initial.notificationPrefs,
        ...(AFF.state.accountPage?.notificationPrefs || {})
      }
    };
    return AFF.state.accountPage;
  }

  function tag(status) {
    const item = statusLabels[status] || [status, status, "muted"];
    return `<span class="tag tag-${item[2]}">${h(t(item[0], item[1]))}</span>`;
  }

  function accountStatus() {
    if (AFF.partnerClosure?.active()) return "terminated";
    if (AFF.state.kybCompleted) return "normal";
    if (AFF.state.onboarding.submitted) return "reviewing";
    return "incomplete";
  }

  function accountId() {
    return AFF.state.account.id || "AFF-2026-0108";
  }

  function maskedEmail() {
    return AFF.state.account.email || "p***@example.com";
  }

  function statusUpdatedAt() {
    return "2026-11-05 09:32";
  }

  function profileFields() {
    const onboarding = AFF.state.onboarding;
    return [
      { key: "accountId", label: "账户编号", en: "Account ID", value: accountId(), editable: false },
      { key: "displayName", label: "账户名称/主体", en: "Account name / entity", value: AFF.state.account.displayName, editable: true },
      { key: "country", label: "国家/地区", en: "Country / region", value: AFF.state.account.country, editable: true },
      { key: "email", label: "联系邮箱", en: "Contact email", value: maskedEmail(), editable: false },
      { key: "channel", label: "推广渠道类型", en: "Channel type", value: AFF.state.account.channel, editable: true },
      { key: "primaryCountries", label: "主要推广国家", en: "Primary countries", value: onboarding.trafficProfile.primaryCountries, editable: true },
      { key: "websites", label: "网站/App", en: "Website / app", value: onboarding.trafficProfile.websites, editable: true },
      { key: "promotionMethods", label: "投放方式", en: "Promotion methods", value: onboarding.trafficProfile.promotionMethods.join("、"), editable: true }
    ];
  }

  function completeness() {
    const required = profileFields().filter(item => !["accountId", "email"].includes(item.key));
    const completed = required.filter(item => String(item.value || "").trim()).length;
    return {
      completed,
      total: required.length,
      percent: Math.round(completed / required.length * 100),
      missing: required.filter(item => !String(item.value || "").trim())
    };
  }

  function capabilitySummary() {
    const status = accountStatus();
    if (status === "normal") return t("推广、结算和提现可用", "Promotion, settlement, and withdrawal available");
    if (status === "reviewing") return t("资料正在审核，部分能力暂待确认", "Profile review in progress; some capabilities are pending");
    if (status === "terminated") return t("账户正在清退，推广入口已停止", "Account closing; promotion access is stopped");
    return t("资料完善后可恢复相关账户能力", "Complete profile details to restore account capabilities");
  }

  function financeStatus(kind) {
    const request = state().financeRequests.find(item => item.type === kind);
    if (request) return "reviewing";
    return AFF.state.kybCompleted ? "normal" : "incomplete";
  }

  function overviewCards() {
    const complete = completeness();
    return [
      { key: "status", label: t("账户状态", "Account status"), value: t(...statusLabels[accountStatus()].slice(0, 2)), hint: t("查看状态摘要", "View status summary") },
      { key: "profile", label: t("资料完整度", "Profile completeness"), value: `${complete.percent}%`, hint: t(`${complete.total - complete.completed} 项待补齐`, `${complete.total - complete.completed} missing`) },
      { key: "finance", label: t("收款账户状态", "Payout account"), value: t(...statusLabels[financeStatus("payout")].slice(0, 2)), hint: t("查看收款资料", "View payout details") },
      { key: "finance", label: t("税务资料状态", "Tax profile"), value: t(...statusLabels[financeStatus("tax")].slice(0, 2)), hint: t("查看税务资料", "View tax details") }
    ];
  }

  function field(name, value, wide = false) {
    return `<div class="${wide ? "account-field wide" : "account-field"}"><span>${h(name)}</span><strong>${h(value || "—")}</strong></div>`;
  }

  function detailField(name, value) {
    return `<div><dt>${h(name)}</dt><dd>${h(value || "—")}</dd></div>`;
  }

  function overview() {
    const complete = completeness();
    const missing = complete.missing.length
      ? complete.missing.map(item => `<li>${h(t(item.label, item.en))}</li>`).join("")
      : `<li>${h(t("已完成", "Complete"))}</li>`;
    return `
      <div class="cards account-status-cards">
        ${overviewCards().map(card => `<button class="card metric account-status-card" type="button" data-account-tab="${card.key}">
          <span>${h(card.label)}</span><strong>${h(card.value)}</strong><small>${h(card.hint)}</small>
        </button>`).join("")}
      </div>
      <div class="account-two-column">
        <section class="account-panel">
          <header>
            <h3>${t("账户状态", "Account status")}</h3>
            <button class="button secondary small" type="button" data-account-action="status">${t("查看详情", "Details")}</button>
          </header>
          <dl>
            ${detailField(t("账户编号", "Account ID"), accountId())}
            ${detailField(t("当前状态", "Current status"), t(...statusLabels[accountStatus()].slice(0, 2)))}
            ${detailField(t("状态更新时间", "Updated at"), statusUpdatedAt())}
            ${detailField(t("可用能力", "Available capabilities"), capabilitySummary())}
          </dl>
          <p>${t("这里只展示账户状态、更新时间和可用能力摘要。", "This section shows the account status, update time, and available capability summary.")}</p>
        </section>
        <section class="account-panel">
          <header>
            <h3>${t("资料完整度", "Profile completeness")}</h3>
            <span>${h(`${complete.completed}/${complete.total}`)}</span>
          </header>
          <div class="account-completeness">
            <strong>${h(`${complete.percent}%`)}</strong>
            <span>${t("已完成", "completed")}</span>
          </div>
          <ul class="account-missing-list">${missing}</ul>
          <div class="account-actions">
            <button class="button primary small" type="button" data-account-tab="profile">${t("查看资料", "View profile")}</button>
          </div>
        </section>
      </div>`;
  }

  function profile() {
    const locked = AFF.state.kybCompleted;
    const input = item => {
      if (["country", "channel", "primaryCountries", "promotionMethods"].includes(item.key)) {
        return AFF.profileSelect.render({
          key: item.key, label: t(item.label, item.en),
          options: AFF.onboardingOptions(item.key === "primaryCountries" ? "country" : item.key),
          value: item.value, multiple: ["primaryCountries", "promotionMethods"].includes(item.key),
          disabled: locked, attributes: `data-account-profile="${item.key}"`
        });
      }
      return `<label><span>${h(t(item.label, item.en))}</span><input data-account-profile="${h(item.key)}" value="${h(item.value)}" ${locked ? "disabled" : ""}></label>`;
    };
    return `
      <section class="account-panel">
        <header><h3>${t("资料", "Profile")}</h3>${tag(locked ? "disabled" : accountStatus())}</header>
        <div class="account-field-grid">
          ${profileFields().map(item => item.editable
            ? input(item)
            : `<div class="account-field"><span>${h(t(item.label, item.en))}</span><strong>${h(item.value || "—")}</strong></div>`).join("")}
        </div>
        <p>${locked
          ? t("资料已确认，受保护字段不可直接修改；如需变更请联系支持。", "Profile is confirmed. Protected fields cannot be edited directly; contact support for changes.")
          : t("可维护本人资料，保存后会刷新当前页面。", "Maintain your own profile details and refresh the page after saving.")}</p>
        <div class="account-actions">
          <button class="button primary" type="button" data-account-action="save-profile" ${locked ? "disabled" : ""}>${t("保存资料", "Save profile")}</button>
        </div>
      </section>`;
  }

  function financePanel() {
    const latestPayout = state().financeRequests.find(item => item.type === "payout");
    const latestTax = state().financeRequests.find(item => item.type === "tax");
    return `
      <div class="account-two-column">
        <section class="account-panel">
          <header><h3>${t("收款资料", "Payout details")}</h3>${tag(financeStatus("payout"))}</header>
          <div class="account-field-grid">
            ${field(t("收款方式", "Method"), t("银行电汇", "Bank transfer"))}
            ${field(t("账户名", "Account name"), "A*** Partner")}
            ${field(t("账号摘要", "Account mask"), "**** **** **** 4821")}
            ${field(t("币种", "Currency"), "USD")}
            ${field(t("资料更新时间", "Updated at"), latestPayout?.submittedAt || "2026-11-05 09:32", true)}
          </div>
          <div class="account-actions">
            <button class="button secondary" type="button" data-account-action="payout">${t("查看详情", "Details")}</button>
            <button class="button primary" type="button" data-account-finance-form="payout">${t("申请新增 / 变更", "Apply to add / change")}</button>
          </div>
        </section>
        <section class="account-panel">
          <header><h3>${t("税务资料", "Tax details")}</h3>${tag(financeStatus("tax"))}</header>
          <div class="account-field-grid">
            ${field(t("税务身份", "Tax identity"), t("个人", "Individual"))}
            ${field(t("税务地区", "Tax region"), "Singapore")}
            ${field(t("税号摘要", "Tax ID mask"), "S******123A")}
            ${field(t("资料更新时间", "Updated at"), latestTax?.submittedAt || "2026-11-05 09:32")}
          </div>
          <div class="account-actions">
            <button class="button primary" type="button" data-account-finance-form="tax">${t("提交变更申请", "Submit change request")}</button>
          </div>
          <p>${t("账号、税号和证明文件只展示脱敏摘要，不提供明文复制。", "Account, tax ID, and evidence are shown only as masked summaries and cannot be copied in plain text.")}</p>
        </section>
      </div>
      ${financeRequestTable()}`;
  }

  function financeChangeForm(kind) {
    const s = state();
    const draft = { ...s.financeDraft, type: kind };
    const categories = [
      ["account_change", t("收款账户变更", "Payout account change")],
      ["tax_change", t("税务资料变更", "Tax profile change")],
      ["document_update", t("证明资料更新", "Document update")],
      ["other", t("其他", "Other")]
    ];
    return `<form id="account-finance-form" class="account-finance-form" data-account-finance-submit="${h(kind)}">
      <label><span>${t("变更类型", "Change type")}</span><select data-account-finance-draft="category">${categories.map(([value, label]) => `<option value="${h(value)}" ${draft.category === value ? "selected" : ""}>${h(label)}</option>`).join("")}</select></label>
      <label><span>${t("变更说明", "Explanation")}</span><textarea data-account-finance-draft="explanation" rows="4" maxlength="500" placeholder="${t("请说明变更原因和需要更新的资料类别。", "Explain the reason and the category of information to update.")}">${h(draft.explanation)}</textarea></label>
      <p>${t("变更申请提交后进入复核，当前展示保持不变，结果会通过消息中心通知。", "Submitted changes enter review. The current display remains unchanged and the result is sent through Messages.")}</p>
    </form>`;
  }

  function financeRequestTable() {
    const rows = state().financeRequests;
    if (!rows.length) return "";
    const labels = {
      payout: t("收款资料", "Payout details"),
      tax: t("税务资料", "Tax details"),
      account_change: t("收款账户变更", "Payout account change"),
      tax_change: t("税务资料变更", "Tax profile change"),
      document_update: t("证明资料更新", "Document update"),
      other: t("其他", "Other")
    };
    return `<section class="account-panel">
      <header><h3>${t("资料变更记录", "Change requests")}</h3><span>${t("复核中资料保持原展示", "Current display remains unchanged during review")}</span></header>
      <div class="finance-table-wrap"><table>
        <thead><tr><th>${t("申请编号", "Request ID")}</th><th>${t("资料类型", "Type")}</th><th>${t("变更类型", "Change type")}</th><th>${t("提交时间", "Submitted at")}</th><th>${t("状态", "Status")}</th><th>${t("审计编号", "Audit ID")}</th></tr></thead>
        <tbody>${rows.map(row => `<tr><td>${h(row.id)}</td><td>${h(labels[row.type] || row.type)}</td><td>${h(labels[row.category] || row.category)}</td><td>${h(row.submittedAt)}</td><td>${tag("reviewing")}</td><td>${h(row.auditId)}</td></tr>`).join("")}</tbody>
      </table></div>
    </section>`;
  }

  function securityPanel() {
    const prefs = state().notificationPrefs;
    const prefLabels = [
      ["commission", t("佣金与结算", "Commission and settlement")],
      ["risk", t("风控与调查", "Risk and investigation")],
      ["appeal", t("申诉进度", "Appeal progress")],
      ["announcement", t("公告", "Announcements")],
      ["product", t("产品更新", "Product updates")]
    ];
    return `
      <div class="account-two-column">
        <section class="account-panel">
          <header><h3>${t("登录安全", "Login security")}</h3>${tag("normal")}</header>
          <div class="account-field-grid">
            ${field(t("认证体系", "Identity system"), "CRM SSO")}
            ${field(t("绑定状态", "Binding"), t("已绑定", "Bound"))}
            ${field(t("最近登录", "Last login"), "2026-11-05 09:32")}
            ${field(t("双因素认证", "2FA"), t("已开启", "Enabled"))}
          </div>
          <p>${t("登录安全状态由统一登录体系提供，本页展示状态摘要。", "Login security is provided by the unified sign-in system; this page shows a status summary.")}</p>
          <div class="account-actions"><button class="button secondary" type="button" data-account-action="security">${t("安全详情", "Security details")}</button></div>
        </section>
        <section class="account-panel">
          <header><h3>${t("通知偏好", "Notification preferences")}</h3><span>${t("站内 + 邮件", "In-app + email")}</span></header>
          <label class="account-email-pref"><input type="checkbox" data-account-pref="email" ${prefs.email ? "checked" : ""}><span>${t("接收邮件通知", "Receive email notifications")}</span></label>
          <div class="account-check-grid">
            ${prefLabels.map(([key, label]) => `<label><input type="checkbox" data-account-pref="${key}" ${prefs[key] ? "checked" : ""}><span>${h(label)}</span></label>`).join("")}
          </div>
          <div class="account-actions"><button class="button primary" type="button" data-account-action="save-prefs">${t("保存偏好", "Save preferences")}</button></div>
        </section>
      </div>
      <section class="account-panel">
        <header><h3>${t("登录设备", "Login devices")}</h3></header>
        <div class="finance-table-wrap"><table>
          <thead><tr><th>${t("设备摘要", "Device")}</th><th>${t("位置", "Location")}</th><th>${t("最近登录", "Last login")}</th><th>${t("当前设备", "Current")}</th><th>${t("操作", "Action")}</th></tr></thead>
          <tbody>
            <tr><td>MacBook Pro · Chrome</td><td>Singapore</td><td>2026-11-05 09:32</td><td>${t("是", "Yes")}</td><td>—</td></tr>
            <tr><td>iPhone · Safari</td><td>Singapore</td><td>2026-11-03 21:10</td><td>${t("否", "No")}</td><td><button class="button secondary small" type="button" data-account-action="device">${t("退出设备", "Sign out")}</button></td></tr>
          </tbody>
        </table></div>
      </section>`;
  }

  function drawerContent(kind) {
    if (kind === "status") {
      return `<dl class="finance-detail-grid">
        ${detailField(t("账户编号", "Account ID"), accountId())}
        ${detailField(t("当前状态", "Current status"), t(...statusLabels[accountStatus()].slice(0, 2)))}
        ${detailField(t("状态更新时间", "Updated at"), statusUpdatedAt())}
        ${detailField(t("可用能力", "Available capabilities"), capabilitySummary())}
        ${detailField(t("下一步", "Next step"), accountStatus() === "normal" ? t("保持资料有效", "Keep profile current") : t("补齐资料并等待状态更新", "Complete the profile and wait for the status update"))}
      </dl>`;
    }
    if (kind.startsWith("finance-change:")) return financeChangeForm(kind.slice("finance-change:".length));
    const bodies = {
      payout: `<dl class="finance-detail-grid">${detailField(t("账户名", "Account name"), "A*** Partner")}${detailField(t("账号摘要", "Account mask"), "**** **** **** 4821")}${detailField(t("收款方式", "Method"), t("银行电汇", "Bank transfer"))}${detailField(t("币种", "Currency"), "USD")}${detailField(t("资料状态", "Profile status"), t(...statusLabels[financeStatus("payout")].slice(0, 2)))}${detailField(t("默认账户", "Default"), t("是", "Yes"))}</dl>`,
      security: `<dl class="finance-detail-grid">${detailField(t("认证体系", "Identity system"), "CRM SSO + 2FA")}${detailField(t("绑定状态", "Binding"), t("已绑定", "Bound"))}${detailField(t("双因素认证", "2FA"), t("已开启", "Enabled"))}${detailField(t("最近安全事件", "Recent event"), t("无", "None"))}</dl>`,
      device: `<p>${t("将退出 iPhone · Safari。该设备需要重新登录后才能访问账户。", "Sign out iPhone · Safari. It must sign in again.")}</p>`
    };
    return bodies[kind] || "";
  }

  function drawer() {
    const kind = state().drawer;
    if (!kind) return "";
    const titles = {
      status: t("账户状态详情", "Account status details"),
      payout: t("收款资料详情", "Payout details"),
      security: t("安全详情", "Security details"),
      device: t("退出登录设备", "Sign out device"),
      "finance-change:payout": t("收款账户变更申请", "Payout account change request"),
      "finance-change:tax": t("税务资料变更申请", "Tax profile change request")
    };
    const title = titles[kind] || t("详情", "Details");
    let footerActions = `<button type="button" class="button secondary" data-account-action="close">${t("关闭", "Close")}</button>`;
    if (kind.startsWith("finance-change:")) {
      footerActions = `<button type="button" class="button secondary" data-account-action="close">${t("取消", "Cancel")}</button><button type="submit" form="account-finance-form" class="button primary">${t("提交申请", "Submit request")}</button>`;
    } else if (kind === "device") {
      footerActions += `<button type="button" class="button primary" data-account-action="confirm-device">${t("确认退出", "Confirm")}</button>`;
    }
    return `<div class="aff-drawer-overlay" data-account-action="close"></div>
      <aside class="aff-drawer finance-drawer" role="dialog" aria-modal="true" aria-labelledby="account-detail-title">
        <header><div><h2 id="account-detail-title">${h(title)}</h2><span>${t("个人中心", "Personal center")}</span></div><button class="finance-drawer-close" type="button" data-account-action="close" aria-label="${t("关闭", "Close")}">×</button></header>
        <div class="finance-drawer-body"><section>${drawerContent(kind)}</section></div>
        <footer>${footerActions}</footer>
      </aside>`;
  }

  function renderPage() {
    const s = state();
    return `
      ${AFF.helpers.pageHeader(t("个人中心", "Personal center"), t("查看和维护账户资料、财务资料、通知偏好与安全状态。", "View and maintain profile, financial details, notification preferences, and security status."))}
      <div class="account-page">
        <div class="tabs account-tabs" role="tablist" aria-label="${t("个人中心页签", "Personal center tabs")}">
          ${tabs.map(([key, zh, en]) => `<button type="button" role="tab" aria-selected="${s.tab === key}" class="${s.tab === key ? "active" : ""}" data-account-tab="${key}">${t(zh, en)}</button>`).join("")}
        </div>
        ${s.tab === "overview" ? overview() : ""}
        ${s.tab === "profile" ? profile() : ""}
        ${s.tab === "finance" ? financePanel() : ""}
        ${s.tab === "security" ? securityPanel() : ""}
      </div>${drawer()}`;
  }

  function saveProfile(root) {
    if (AFF.state.kybCompleted) return showToast(t("资料已确认，受保护字段不可直接修改。", "Profile is confirmed; protected fields cannot be edited directly."));
    const values = Object.fromEntries([...root.querySelectorAll("[data-account-profile]")].map(input => [
      input.dataset.accountProfile,
      input.multiple ? [...input.selectedOptions].map(option => option.value).join("、") : input.value.trim()
    ]));
    const onboarding = AFF.state.onboarding;
    if (values.displayName !== undefined) AFF.state.account.displayName = values.displayName;
    if (values.country !== undefined) AFF.state.account.country = values.country;
    if (values.channel !== undefined) AFF.state.account.channel = values.channel;
    if (values.primaryCountries !== undefined) onboarding.trafficProfile.primaryCountries = values.primaryCountries;
    if (values.websites !== undefined) onboarding.trafficProfile.websites = values.websites;
    if (values.promotionMethods !== undefined) {
      onboarding.trafficProfile.promotionMethods = values.promotionMethods.split(/[,，、]/).map(item => item.trim()).filter(Boolean);
    }
    persist();
    showToast(t("资料已保存", "Profile saved"));
    render();
  }

  document.addEventListener("click", event => {
    if (AFF.state?.route !== "account") return;
    const tab = event.target.closest("[data-account-tab]");
    if (tab) {
      state().tab = tab.dataset.accountTab;
      render();
      return document.querySelector(`[data-account-tab="${tab.dataset.accountTab}"]`)?.focus();
    }
    const financeForm = event.target.closest("[data-account-finance-form]");
    if (financeForm) {
      const s = state();
      s.drawer = `finance-change:${financeForm.dataset.accountFinanceForm}`;
      const type = financeForm.dataset.accountFinanceForm;
      s.financeDraft = { type, category: type === "tax" ? "tax_change" : "account_change", explanation: "" };
      render();
      return document.querySelector("[data-account-finance-draft='explanation']")?.focus();
    }
    const target = event.target.closest("[data-account-action]");
    if (!target) return;
    const action = target.dataset.accountAction;
    if (action === "close") {
      state().drawer = "";
      render();
      return;
    }
    if (action === "save-profile") return saveProfile(document);
    if (action === "save-prefs") {
      persist();
      return showToast(t("通知偏好已保存", "Preferences saved"));
    }
    if (action === "confirm-device") {
      state().drawer = "";
      render();
      return showToast(t("设备已退出", "Device signed out"));
    }
    if (["status", "payout", "security", "device"].includes(action)) {
      state().drawer = action;
      render();
      return document.querySelector(".finance-drawer-close")?.focus();
    }
  });

  document.addEventListener("change", event => {
    if (AFF.state?.route !== "account") return;
    if (event.target.matches("[data-account-pref]")) {
      state().notificationPrefs[event.target.dataset.accountPref] = event.target.checked;
      return;
    }
    if (event.target.matches("[data-account-finance-draft='category']")) {
      state().financeDraft.category = event.target.value;
    }
  });

  document.addEventListener("input", event => {
    if (AFF.state?.route !== "account" || !event.target.matches("[data-account-finance-draft='explanation']")) return;
    state().financeDraft.explanation = event.target.value;
  });

  document.addEventListener("submit", event => {
    if (AFF.state?.route !== "account" || !event.target.matches("[data-account-finance-submit]")) return;
    event.preventDefault();
    const s = state();
    const type = event.target.dataset.accountFinanceSubmit;
    if (s.financeDraft.explanation.trim().length < 2) return showToast(t("请填写变更说明。", "Enter an explanation."));
    const sequence = s.financeRequests.length + 1;
    const request = {
      id: `FIN-CH-${String(sequence).padStart(4, "0")}`,
      type,
      category: s.financeDraft.category,
      submittedAt: new Date().toLocaleString("sv-SE", { hour12: false }),
      auditId: `AUD-ACC-${String(sequence).padStart(5, "0")}`
    };
    s.financeRequests.unshift(request);
    s.financeDraft = { type: "payout", category: "account_change", explanation: "" };
    s.drawer = "";
    AFF.finance.messages.unshift({
      id: `MSG-${request.id}`,
      level: "normal",
      type: "账户资料",
      title: t("财务资料变更申请已提交", "Financial profile change submitted"),
      date: request.submittedAt.slice(0, 10),
      status: "unread",
      body: t(`申请${request.id}已提交。复核期间当前展示保持不变，结果将通过消息中心通知。`, `Request ${request.id} was submitted. The current display remains unchanged during review; the result will be sent through Messages.`),
      accountRequestId: request.id
    });
    showToast(t("变更申请已提交，等待复核。", "Change request submitted for review."));
    persist();
    render();
  });

  document.addEventListener("keydown", event => {
    if (AFF.state?.route !== "account" || event.key !== "Escape" || !state().drawer) return;
    event.preventDefault();
    state().drawer = "";
    render();
  });

  AFF.accountCenter = { accountStatus, completeness, profileFields };
  AFF.pages.account = renderPage;
})();
