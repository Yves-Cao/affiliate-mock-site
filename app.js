const defaultState = {
  route: "dash",
  sidebarCollapsed: false,
  mobileNavOpen: false,
  navGroups: [],
  language: "zh",
  account: {
    displayName: "Affiliate Partner",
    country: "新加坡",
    channel: "内容与社群",
    language: "简体中文"
  },
  scenario: "normal-flow",
  kycDismissed: false,
  dashboardMode: "day",
  dashboardPeriod: "past30",
  dashboardLinkPage: "注册页",
  dashboardLinkLanguage: "简体中文",
  dashboardLinkPagePickerOpen: false,
  dashboardLinkLanguagePickerOpen: false,
  dashboardLinkPageQuery: "",
  dashboardLinkLanguageQuery: "",
  perf: {
    groups: ["日期"],
    drawer: false,
    filters: {
      activity: "全部活动",
      source: "全部",
      medium: "全部",
      campaign: "全部",
      term: "全部",
      content: "全部"
    },
    draft: {
      activity: "全部活动",
      source: "全部",
      medium: "全部",
      campaign: "全部",
      term: "全部",
      content: "全部"
    },
    count: 1,
    page: 1
  },
  clientsPage: 1,
  clientFilterOpen: true,
  clientFilters: {
    "注册时间": "近30天",
    "忠诚客户": "全部",
    "KYC": "全部",
    "资格日期": "全部"
  },
  promoTab: "campaign",
  deep: {
    desktop: { page: "注册页", language: "简体中文" },
    mobile: { system: "iOS (App Store)", page: "注册页", language: "简体中文" }
  },
  lookup: { input: "", result: null, queries: 0 },
  assetsAccepted: false,
  assets: {
    type: "全部",
    page: 1,
    detail: null
  },
  applyStep: 1,
  onboarding: {
    step: 1,
    maxStep: 1,
    emailVerified: false,
    kycDone: false,
    agreements: [false, false, false],
    submitted: false,
    agreementModal: 0,
    agreementDraft: false
  },
  programCommissionCountries: null,
  programCommissionSelectionVersion: 2,
  programCountryPickerOpen: false,
  programCountryQuery: "",
  programSupportCountries: null,
  programSupportSelectionVersion: 2,
  programSupportPickerOpen: false,
  programSupportQuery: "",
  programAssetFilters: { device: "全部", platform: "全部", type: "全部" },
  programCompleted: false,
  wdTab: "withdraw"
};

const englishLabels = {
  "仪表盘": "Dashboard",
  "业绩数据": "Performance",
  "客户列表": "Clients",
  "推广链接与活动": "Campaigns",
  "深度链接": "Deep links",
  "链接追踪器": "Trackers",
  "素材库": "Assets",
  "收益与提现": "Earnings",
  "客户归属查询": "Attribution",
  "提现": "Withdrawal",
  "合作者计划": "Partner Program",
  "入驻申请": "Onboarding Application"
};

const englishGroupLabels = {
  "仪表盘": "Dashboard",
  "数据总览": "Overview",
  "推广管理": "Campaigns",
  "收益中心": "Earnings"
};

const elements = {};
let accountDraft = null;
let accountMenuCloseTimer = null;
let walletCloseTimer = null;
let authMode = "login";
let sidebarHoverOpen = false;

function initializeElements() {
  for (const id of [
    "login-view", "login-form", "login-error", "register-form", "register-error",
    "login-tab", "register-tab", "app-view", "sidebar", "nav",
    "profile-entry", "sidebar-toggle", "language-toggle", "language-menu",
    "kyc-banner", "dismiss-kyc", "main", "modal-root", "toast", "scenario-select",
    "account-menu", "avatar-button", "account-dropdown", "wallet-menu", "wallet-toggle",
    "wallet-popover", "wallet-balance", "wallet-popover-balance", "wallet-total-revenue"
  ]) elements[id] = document.getElementById(id);
}

function currentState() {
  try {
    const saved = sessionStorage.getItem("affiliate-user-mock");
    if (!saved) return structuredClone(defaultState);
    const savedState = JSON.parse(saved);
    const merged = { ...structuredClone(defaultState), ...savedState };
    merged.navGroups = [];
    merged.account = { ...structuredClone(defaultState.account), ...(savedState.account || {}) };
    merged.applyStep = Math.min(6, Math.max(1, Number(savedState.applyStep) || 1));
    const selectionVersionMatches = savedState.programCommissionSelectionVersion === defaultState.programCommissionSelectionVersion;
    merged.programCommissionCountries = selectionVersionMatches && Array.isArray(savedState.programCommissionCountries)
      ? savedState.programCommissionCountries.filter(code => AFF.partnerProgram.commissionCountries.some(item => item.code === code))
      : null;
    merged.programCommissionSelectionVersion = defaultState.programCommissionSelectionVersion;
    merged.programCountryPickerOpen = false;
    merged.programCountryQuery = "";
    const supportSelectionMatches = savedState.programSupportSelectionVersion === defaultState.programSupportSelectionVersion;
    merged.programSupportCountries = supportSelectionMatches && Array.isArray(savedState.programSupportCountries)
      ? savedState.programSupportCountries.filter(name => AFF.partnerProgram.supportCountries.some(item => item.name === name))
      : null;
    merged.programSupportSelectionVersion = defaultState.programSupportSelectionVersion;
    merged.programSupportPickerOpen = false;
    merged.programSupportQuery = "";
    merged.dashboardLinkPage = savedState.dashboardLinkPage || defaultState.dashboardLinkPage;
    merged.dashboardLinkLanguage = savedState.dashboardLinkLanguage || defaultState.dashboardLinkLanguage;
    merged.dashboardLinkPagePickerOpen = false;
    merged.dashboardLinkLanguagePickerOpen = false;
    merged.dashboardLinkPageQuery = "";
    merged.dashboardLinkLanguageQuery = "";
    merged.programAssetFilters = { ...structuredClone(defaultState.programAssetFilters), ...(savedState.programAssetFilters || {}) };
    merged.perf = {
      ...structuredClone(defaultState.perf),
      ...(savedState.perf || {}),
      filters: { ...structuredClone(defaultState.perf.filters), ...(savedState.perf?.filters || {}) },
      draft: { ...structuredClone(defaultState.perf.filters), ...(savedState.perf?.draft || {}) }
    };
    merged.clientFilters = { ...structuredClone(defaultState.clientFilters), ...(savedState.clientFilters || {}) };
    merged.lookup = { ...structuredClone(defaultState.lookup), ...(savedState.lookup || {}) };
    merged.onboarding = { ...structuredClone(defaultState.onboarding), ...(savedState.onboarding || {}) };
    merged.onboarding.step = Math.min(5, Math.max(1, Number(merged.onboarding.step) || 1));
    merged.onboarding.maxStep = Math.min(5, Math.max(1, Number(merged.onboarding.maxStep) || 1));
    merged.onboarding.agreements = Array.isArray(savedState.onboarding?.agreements) && savedState.onboarding.agreements.length === 3
      ? savedState.onboarding.agreements.map(Boolean)
      : [...structuredClone(defaultState.onboarding.agreements)];
    merged.onboarding.agreementModal = 0;
    merged.onboarding.agreementDraft = false;
    if (!["全部", "横幅", "视频", "落地页", "GIF"].includes(savedState.assets?.type)) merged.assets.type = "全部";
    merged.assets = {
      ...structuredClone(defaultState.assets),
      ...(savedState.assets || {}),
      page: 1,
      detail: null
    };
    merged.deep = {
      desktop: { ...structuredClone(defaultState.deep.desktop), ...(savedState.deep?.desktop || {}) },
      mobile: { ...structuredClone(defaultState.deep.mobile), ...(savedState.deep?.mobile || {}) }
    };
    return merged;
  } catch {
    return structuredClone(defaultState);
  }
}

AFF.state = currentState();

function persist() {
  sessionStorage.setItem("affiliate-user-mock", JSON.stringify(AFF.state));
}

function routeMeta(route) {
  return AFF.routes.find(item => item.id === route) || AFF.routes[0];
}

function routeLabel(route) {
  const meta = routeMeta(route);
  return AFF.state.language === "en" ? (englishLabels[meta.label] || meta.label) : meta.label;
}

function renderNav() {
  const groups = [...new Set(AFF.routes.filter(route => !["apply", "onboarding"].includes(route.id)).map(route => route.group))];
  const groupIcons = {
    "仪表盘": "dashboard",
    "数据总览": "overview",
    "推广管理": "megaphone",
    "收益中心": "wallet"
  };
  elements.nav.innerHTML = groups.map(group => {
    const routes = AFF.routes.filter(route => route.id !== "apply" && route.group === group);
    const groupLabel = AFF.state.language === "en" ? (englishGroupLabels[group] || group) : group;
    const open = AFF.state.navGroups.includes(group);
    return `
      <section class="nav-section ${open ? "open" : ""}">
        <div class="nav-parent-row">
          <button class="nav-parent" type="button" data-nav-group="${AFF.helpers.h(group)}" aria-expanded="${open}" title="${AFF.helpers.h(groupLabel)}">
            <span class="nav-icon" aria-hidden="true">${navIcon(groupIcons[group])}</span>
            <span class="nav-label">${AFF.helpers.h(groupLabel)}</span>
            <span class="nav-chevron" aria-hidden="true">›</span>
          </button>
        </div>
        <div class="nav-children">
          ${routes.map(route => `
            <button class="nav-item ${AFF.state.route === route.id ? "active" : ""}" type="button" data-route="${route.id}">
              <span class="nav-icon" aria-hidden="true">${navIcon(route.id)}</span>
              <span class="nav-label">${AFF.helpers.h(routeLabel(route.id))}</span>
            </button>`).join("")}
        </div>
      </section>`;
  }).join("");
  elements["profile-entry"].querySelector(".nav-icon").innerHTML = navIcon("apply");
  elements["profile-entry"].querySelector(".nav-label").textContent = AFF.state.language === "en" ? "Partner Program" : "合作者计划";
}

function navIcon(name) {
  const paths = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    overview: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 3-4 3 2 5-6"/>',
    megaphone: '<path d="m3 11 14-5v12L3 13z"/><path d="M17 9.5 21 8v8l-4-1.5"/><path d="M6 14.2 7.5 20h3L9 15.2"/>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5z"/><path d="M4 8h15a2 2 0 0 1 2 2v3H16a2 2 0 0 1 0-4h5"/><path d="M16 11h.01"/>',
    dash: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    perf: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 3-4 3 2 5-6"/>',
    clients: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5.8"/><path d="M18 14a5 5 0 0 1 3 4.5"/>',
    promo: '<path d="M10 13.5 14 9.5"/><path d="M7.5 16.5 6 18a3 3 0 0 1-4-4.5l4-4a3 3 0 0 1 4.5 0"/><path d="m16.5 7.5 1.5-1.5a3 3 0 0 1 4 4.5l-4 4a3 3 0 0 1-4.5 0"/>',
    deep: '<path d="M8 12h8"/><path d="M12 8v8"/><circle cx="12" cy="12" r="9"/>',
    tracker: '<path d="M4 7h16v13H4z"/><path d="M8 7V5h8v2"/><path d="M8 11h8M8 15h5"/>',
    assets: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 3 3 2-2 6 6"/>',
    pay: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5z"/><path d="M4 8h15"/><path d="M8 12h4"/>',
    lookup: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/><path d="M8 10.5h5M10.5 8v5"/>',
    wd: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    apply: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z"/>'
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.dashboard}</svg>`;
}

function accountInitial() {
  return [...AFF.state.account.displayName.trim()].find(char => /\S/.test(char)) || "M";
}

function maskEmail(email) {
  const [name, domain] = String(email || "").split("@");
  if (!name || !domain) return "-";
  return `${name.slice(0, 1)}***@${domain}`;
}

function render() {
  const route = AFF.routes.some(item => item.id === AFF.state.route) ? AFF.state.route : "dash";
  AFF.state.route = route;
  renderNav();
  elements["wallet-balance"].textContent = AFF.dashboard.metrics[0].value;
  elements["wallet-popover-balance"].textContent = AFF.dashboard.metrics[0].value;
  elements["wallet-total-revenue"].textContent = AFF.dashboard.totalRevenue;
  elements["avatar-button"].textContent = accountInitial();
  elements["avatar-button"].setAttribute("aria-label", `${AFF.state.account.displayName} 账户菜单`);
  elements["scenario-select"].value = AFF.state.scenario;
  elements.main.innerHTML = AFF.state.scenario === "normal-flow"
    ? AFF.pages[route]()
    : statePage(route);
  elements["kyc-banner"].classList.toggle(
    "hidden",
    AFF.state.kycDismissed || route === "onboarding" || AFF.state.onboarding.kycDone || AFF.state.onboarding.submitted
  );
  document.body.classList.toggle("collapsed", AFF.state.sidebarCollapsed);
  document.body.classList.toggle("mobile-nav-open", AFF.state.mobileNavOpen);
  document.body.classList.toggle("route-apply", route === "apply");
  syncSidebarToggle();
  elements["language-toggle"].setAttribute("aria-expanded", String(elements["language-menu"].classList.contains("open")));
  elements["language-menu"].querySelectorAll("[data-language]").forEach(button => {
    button.setAttribute("aria-checked", String(button.dataset.language === AFF.state.language));
  });
  document.title = `${routeLabel(route)} · Affiliate APC`;
  persist();
}

function syncSidebarToggle() {
  const sidebarExpanded = window.innerWidth <= 991
    ? AFF.state.mobileNavOpen
    : !AFF.state.sidebarCollapsed || sidebarHoverOpen;
  elements["sidebar-toggle"].textContent = sidebarExpanded ? "«" : "»";
  elements["sidebar-toggle"].setAttribute("aria-expanded", String(sidebarExpanded));
  elements["sidebar-toggle"].setAttribute("aria-label", sidebarExpanded ? "收起侧栏" : "展开侧栏");
}

function statePage(route) {
  if (AFF.state.scenario === "api-error") {
    return `
      <section class="card state-panel">
        <h2>接口暂时不可用</h2>
        <p>请求失败，请稍后重试。</p>
        <div><code>SERVICE-503</code> <code>trace: service-trace-503</code></div>
        <button class="button primary" type="button" data-action="retry-service">重试</button>
      </section>`;
  }
  return `
    <section class="card state-panel">
      <h2>暂无数据</h2>
      <p>当前状态不展示示例数据，可恢复查看内容。</p>
      <button class="button secondary" type="button" data-action="reset-scenario">恢复正常流</button>
    </section>`;
}

function navigate(route) {
  if (!AFF.routes.some(item => item.id === route)) route = "dash";
  setWalletOpen(false);
  AFF.state.route = route;
  AFF.state.mobileNavOpen = false;
  location.hash = `/${route}`;
  render();
  elements.main.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.add("hidden"), 2600);
}

function setAccountMenu(open) {
  clearTimeout(accountMenuCloseTimer);
  elements["account-menu"].classList.toggle("open", open);
  elements["avatar-button"].setAttribute("aria-expanded", String(open));
}

function openAccountMenu(focusFirstItem = false) {
  setAccountMenu(true);
  if (focusFirstItem) {
    const firstItem = elements["account-dropdown"].querySelector(".account-menu-item");
    setTimeout(() => firstItem.focus(), 30);
  }
}

function closeAccountMenu(returnFocus = false) {
  setAccountMenu(false);
  if (returnFocus) elements["avatar-button"].focus();
}

function scheduleAccountMenuClose() {
  clearTimeout(accountMenuCloseTimer);
  accountMenuCloseTimer = setTimeout(() => setAccountMenu(false), 160);
}

function handleAccountMenuKeydown(event) {
  if (event.key === "Escape") {
    event.stopPropagation();
    closeAccountMenu(true);
    return;
  }
  if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
  event.preventDefault();
  const items = [...elements["account-dropdown"].querySelectorAll(".account-menu-item")];
  if (!items.length) return;
  const currentIndex = items.findIndex(item => item === document.activeElement);
  const nextIndex = event.key === "ArrowDown"
    ? (currentIndex + 1 + items.length) % items.length
    : (currentIndex - 1 + items.length) % items.length;
  setAccountMenu(true);
  items[nextIndex].focus();
}

async function copyText(text, target) {
  try {
    await navigator.clipboard.writeText(text);
    if (target?.classList.contains("button")) {
      const originalText = target.textContent;
      target.textContent = "已复制";
      target.disabled = true;
      setTimeout(() => {
        target.textContent = originalText;
        target.disabled = false;
      }, 1200);
    } else {
      showToast("已复制");
    }
  } catch {
    showToast("剪贴板不可用，请手动复制链接");
  }
}

function showModal(html, full = false, title = "详情") {
  elements["modal-root"].className = `modal-layer ${full ? "full" : ""}`;
  elements["modal-root"].innerHTML = html;
  elements["modal-root"].setAttribute("aria-label", title);
  document.addEventListener("keydown", escapeModal);
}

function showScreenModal(html, title) {
  elements["modal-root"].className = "modal-layer screen";
  elements["modal-root"].innerHTML = html;
  elements["modal-root"].setAttribute("aria-label", title);
  document.addEventListener("keydown", escapeModal);
}

function closeModal() {
  if (elements["modal-root"].getAttribute("aria-label") === "账户管理") accountDraft = null;
  elements["modal-root"].className = "modal-layer hidden";
  elements["modal-root"].innerHTML = "";
  elements["modal-root"].removeAttribute("aria-label");
  document.removeEventListener("keydown", escapeModal);
}

function escapeModal(event) {
  if (event.key === "Escape") closeModal();
}

function modalShell(title, body, actions = "") {
  return `<div class="modal-card"><div class="modal-head"><h2>${AFF.helpers.h(title)}</h2><button class="close-button" type="button" data-action="close-modal">×</button></div>${body}${actions ? `<div class="drawer-actions">${actions}</div>` : ""}</div>`;
}

function openAccountModal() {
  accountDraft = structuredClone(AFF.state.account);
  const loginName = sessionStorage.getItem("affiliate-user-session") || "-";
  const input = (field, label, value) => `
    <label class="field"><span>${AFF.helpers.h(label)}</span>
      <input data-account-field="${field}" value="${AFF.helpers.h(value)}" maxlength="40">
    </label>`;
  const select = (field, label, values) => `
    <label class="field"><span>${AFF.helpers.h(label)}</span>
      <select data-account-field="${field}">
        ${values.map(value => `<option value="${AFF.helpers.h(value)}" ${accountDraft[field] === value ? "selected" : ""}>${AFF.helpers.h(value)}</option>`).join("")}
      </select>
    </label>`;
  showScreenModal(`
    <div class="account-modal">
      <header class="account-modal-head">
        <div>
          <p>Affiliate APC</p>
          <h2>账户管理</h2>
        </div>
        <button class="close-button" type="button" data-action="close-account-modal" aria-label="关闭账户管理">×</button>
      </header>
      <div class="account-modal-body">
        <div class="account-modal-content">
          <section class="account-section">
            <h3>基础信息</h3>
            <div class="account-profile-grid">
              <div class="info-item"><span>用户ID</span><strong>U-P-001</strong></div>
              <div class="info-item"><span>登录账号</span><strong>${AFF.helpers.h(maskEmail(loginName))}</strong></div>
              <div class="info-item"><span>邮箱</span><strong>${AFF.helpers.h(maskEmail(loginName))}</strong></div>
              <div class="info-item"><span>角色</span><strong>Affiliate Partner</strong></div>
            </div>
          </section>
          <section class="account-section">
            <h3>可编辑资料</h3>
            <div class="account-form">
              ${input("displayName", "显示名称", accountDraft.displayName)}
              ${select("country", "国家", ["新加坡", "马来西亚", "巴西", "其他"])}
              ${select("channel", "推广渠道类型", ["内容与社群", "付费广告", "邮件营销", "线下活动"])}
              ${select("language", "语言", ["简体中文", "English", "ไทย", "Tiếng Việt"])}
            </div>
            <p class="helper">资料仅保存在当前浏览器会话中。</p>
          </section>
        </div>
      </div>
      <footer class="account-modal-foot">
        <span>Affiliate APC</span>
        <div>
          <button class="button secondary" type="button" data-action="close-account-modal">取消</button>
          <button class="button primary" type="button" data-action="save-account">保存修改</button>
        </div>
      </footer>
    </div>`, "账户管理");
  elements["modal-root"].querySelector(".close-button").focus();
}

function closeAccountModal() {
  accountDraft = null;
  closeModal();
  elements["avatar-button"].focus();
}

function saveAccount() {
  if (!accountDraft) return;
  const displayName = accountDraft.displayName.trim();
  if (!displayName) return showToast("请输入显示名称");
  AFF.state.account = { ...accountDraft, displayName };
  accountDraft = null;
  closeModal();
  showToast("账户信息已保存");
  render();
  elements["avatar-button"].focus();
}

function logout() {
  accountDraft = null;
  closeModal();
  closeAccountMenu(false);
  clearTimeout(showToast.timer);
  elements.toast.classList.add("hidden");
  sessionStorage.removeItem("affiliate-user-session");
  sessionStorage.removeItem("affiliate-user-mock");
  AFF.state = structuredClone(defaultState);
  elements["app-view"].classList.add("hidden");
  elements["login-view"].classList.remove("hidden");
  elements["login-error"].hidden = true;
  elements["login-form"].reset();
  elements["register-form"].reset();
  setAuthMode("login", false);
  history.replaceState(null, "", `${location.pathname}${location.search}#/login`);
  document.title = "登录 · Affiliate APC";
}

function openCampaignModal() {
  showModal(modalShell("新建活动", `
    <label class="field"><span>活动名称</span><input id="campaign-name" placeholder="例如：十一月 Telegram 投放"></label>
    <p class="helper" style="margin-top:10px">活动仅作为链接分组，不配置预算、日期和出价。</p>`,
    `<button class="button secondary" type="button" data-action="close-modal">取消</button><button class="button primary" type="button" data-action="create-campaign">保存</button>`));
}

function openAppealModal() {
  showModal(modalShell("申诉", `
    <div class="info-grid">
      <div class="info-item"><span>关联流水</span><strong>2026-10-21 · 佣金拒绝</strong></div>
      <div class="info-item"><span>拒绝原因</span><strong>QFTD-02 未达质量门槛</strong></div>
    </div>
    <label class="field" style="margin-top:16px"><span>申诉说明</span><textarea id="appeal-reason" rows="4" placeholder="请说明原因和证据"></textarea></label>
    <p class="helper">申诉期15自然日，复核5个工作日；提交后不可重复提交。</p>`,
    `<button class="button secondary" type="button" data-action="close-modal">取消</button><button class="button primary" type="button" data-action="submit-appeal">提交申诉</button>`), true);
}

function openCodeModal() {
  showModal(modalShell("推广行为准则", `
    <p>请确认推广要求：不得自荐、不得违规使用品牌素材、不得诱导虚假交易。确认后可下载素材。</p>`,
    `<button class="button secondary" type="button" data-action="close-modal">关闭</button><button class="button primary" type="button" data-action="accept-code">阅读并接受</button>`));
}

function openDimensionModal() {
  const options = AFF.performance.dimensions
    .filter(item => !AFF.state.perf.groups.includes(item))
    .map(item => `<button class="button secondary" type="button" data-perf-group-add="${AFF.helpers.h(item)}">${AFF.helpers.h(item)}</button>`)
    .join("");
  showModal(modalShell("添加分组", `<div class="chips">${options || "<span class='helper'>所有分组均已添加</span>"}</div>`,
    `<button class="button secondary" type="button" data-action="close-modal">关闭</button>`));
}

function openClientInfo(clientId) {
  const row = AFF.clients.find(item => item.clientId === clientId);
  if (!row) return;
  showModal(modalShell(`客户 ${row.clientId}`, `
    <div class="info-grid">
      <div class="info-item"><span>资格链</span><strong>注册 → KYC → 有效FTD → 真实交易 → 合格判定</strong></div>
      <div class="info-item"><span>佣金链</span><strong>待检查 → 已批准 → 已支付</strong></div>
      <div class="info-item"><span>动态Hold</span><strong>初始1天，按风险分递增</strong></div>
      <div class="info-item"><span>结算</span><strong>日度结算</strong></div>
      <div class="info-item"><span>归因</span><strong>${AFF.helpers.h(row.source)} / ${AFF.helpers.h(row.medium)} / ${AFF.helpers.h(row.campaign)}</strong></div>
      <div class="info-item"><span>资金</span><strong>预计 ${row.expected} · 已付 ${row.paid} · 暂扣 ${row.held}</strong></div>
    </div>`), true);
}

function lookup() {
  const state = AFF.state;
  const input = document.getElementById("lookup-input")?.value.trim() || "";
  state.lookup.input = input;
  if (!input) {
    state.lookup.result = null;
    showToast("请输入精准客户标识");
    render();
    return;
  }
  if (state.lookup.queries >= 5) {
    state.lookup.result = null;
  showToast("查询频次已达上限，请稍后再试");
    render();
    return;
  }
  state.lookup.queries += 1;
  state.lookup.result = AFF.lookupIndex.find(item => item.key.toLowerCase() === input.toLowerCase()) || {
    id: "-", email: "-", owned: false, date: "-", reason: "未查询到可披露结果；请求已进入审计日志"
  };
  render();
}

function handleAction(action, target) {
  const state = AFF.state;
  if (AFF.postbacks?.handleAction(action, target)) return;
  if (action === "close-modal") return closeModal();
  if (action === "open-account") {
    closeAccountMenu(false);
    return openAccountModal();
  }
  if (action === "close-account-modal") return closeAccountModal();
  if (action === "save-account") return saveAccount();
  if (action === "logout") return logout();
  if (action === "open-perf-filter") {
    state.perf.drawer = true;
    state.perf.draft = structuredClone(state.perf.filters);
    return render();
  }
  if (action === "close-perf-filter") {
    state.perf.drawer = false;
    return render();
  }
  if (action === "apply-perf-filter") {
    state.perf.filters = structuredClone(state.perf.draft);
    state.perf.count = 1 + Object.values(state.perf.filters).filter(value => value !== "全部活动" && value !== "全部").length;
    state.perf.drawer = false;
    state.perf.page = 1;
    showToast("筛选已应用");
    return render();
  }
  if (action === "reset-perf-filter") {
    state.perf.filters = {
      activity: "全部活动", source: "全部", medium: "全部",
      campaign: "全部", term: "全部", content: "全部"
    };
    state.perf.draft = structuredClone(state.perf.filters);
    state.perf.count = 1;
    state.perf.page = 1;
    showToast("筛选已重置");
    return render();
  }
  if (action === "add-perf-group") {
    return openDimensionModal();
  }
  if (action === "perf-page") {
    state.perf.page = Number(target.dataset.page || 1);
    return render();
  }
  if (action === "toggle-client-filter") {
    state.clientFilterOpen = !state.clientFilterOpen;
    return render();
  }
  if (action === "clients-page") {
    state.clientsPage = Number(target.dataset.page || 1);
    return render();
  }
  if (action === "open-campaign-modal") return openCampaignModal();
  if (action === "create-campaign") {
    const name = document.getElementById("campaign-name")?.value.trim();
    if (!name) return showToast("请输入活动名称");
    AFF.campaigns.unshift({ name, link: `https://track.example.com/r/AFF1001?camp=${encodeURIComponent(name)}`, status: "启用", registrations: 0, qualified: 0, expected: "$0" });
    closeModal();
    showToast("活动已创建");
    return render();
  }
  if (action === "open-appeal") return openAppealModal();
  if (action === "submit-appeal") {
    const reason = document.getElementById("appeal-reason")?.value.trim();
    if (reason.length < 2) return showToast("请填写申诉说明");
    const row = AFF.commissions.rows.find(item => item.appealOpen);
    if (row) {
      row.appealOpen = false;
      row.status = "申诉中";
      row.action = "";
    }
    closeModal();
    showToast("申诉已提交，进入复核");
    return render();
  }
  if (action === "open-code-modal") return openCodeModal();
  if (action === "accept-code") {
    state.assetsAccepted = true;
    closeModal();
    showToast("准则已接受");
    return render();
  }
  if (action === "verify-onboarding-email") {
    state.onboarding.emailVerified = true;
    showToast("邮箱验证通过");
    return render();
  }
  if (action === "onboarding-next") {
    if (state.onboarding.step === 1 && state.onboarding.emailVerified) {
      state.onboarding.step = 2;
      state.onboarding.maxStep = Math.max(state.onboarding.maxStep, 2);
    } else if (state.onboarding.step === 2) {
      state.onboarding.step = 3;
      state.onboarding.maxStep = Math.max(state.onboarding.maxStep, 3);
    } else if (state.onboarding.step === 4 && state.onboarding.agreements.every(Boolean)) {
      state.onboarding.step = 5;
      state.onboarding.maxStep = Math.max(state.onboarding.maxStep, 5);
    }
    return render();
  }
  if (action === "onboarding-go") {
    const step = Number(target.dataset.onboardingStep);
    if (step >= 1 && step <= state.onboarding.maxStep) state.onboarding.step = step;
    return render();
  }
  if (action === "open-client-kyc") {
    showToast("演示：跳转客户端完成 KYC 实名认证");
    return;
  }
  if (action === "complete-onboarding-kyc") {
    state.onboarding.kycDone = true;
    state.onboarding.step = 4;
    state.onboarding.maxStep = Math.max(state.onboarding.maxStep, 4);
    showToast("KYC 已完成并同步");
    return render();
  }
  if (action === "open-onboarding-agreement") {
    const index = Number(target.dataset.agreementIndex);
    if (index >= 1 && index <= 3) {
      state.onboarding.agreementModal = index;
      state.onboarding.agreementDraft = state.onboarding.agreements[index - 1];
    }
    return render();
  }
  if (action === "close-onboarding-agreement") {
    if (target.dataset.action !== action && target.closest(".onboarding-agreement-modal")) return;
    state.onboarding.agreementModal = 0;
    state.onboarding.agreementDraft = false;
    return render();
  }
  if (action === "accept-onboarding-agreement") {
    const index = state.onboarding.agreementModal;
    if (index) state.onboarding.agreements[index - 1] = state.onboarding.agreementDraft;
    state.onboarding.agreementModal = 0;
    state.onboarding.agreementDraft = false;
    return render();
  }
  if (action === "submit-onboarding") {
    state.onboarding.submitted = true;
    showToast("入驻申请已提交审核");
    return render();
  }
  if (action === "lookup") return lookup();
  if (action === "open-asset-detail") {
    const item = AFF.assets.find(asset => asset.id === target.dataset.assetId);
    if (!["横幅", "视频", "落地页", "GIF"].includes(item?.type)) return;
    state.assets.detail = {
      id: item.id,
      size: item.sizes?.[0],
      language: item.languages[0]
    };
    if (item.type === "横幅") state.assets.detail.device = item.devices[0];
    else if (item.type === "视频") state.assets.detail = {
      ...state.assets.detail,
      loop: false,
      muted: false,
      autoplay: false,
      playing: false
    };
    else if (item.type === "GIF") state.assets.detail.platform = item.platforms[0];
    return render();
  }
  if (action === "close-asset-detail") {
    state.assets.detail = null;
    return render();
  }
  if (action === "download-asset-variant") {
    const item = AFF.assets.find(asset => asset.id === state.assets.detail?.id);
    if (!item) return;
    if (item.type === "视频") {
      showToast(`开始下载视频：${item.name} ${state.assets.detail.size} ${state.assets.detail.language}`);
      return;
    }
    if (item.type === "GIF") {
      showToast(`开始下载：${item.name} ${state.assets.detail.language} ${state.assets.detail.size} ${state.assets.detail.platform}`);
      return;
    }
    showToast(`开始下载：${item.name} ${state.assets.detail.size} ${state.assets.detail.language} ${state.assets.detail.device}`);
    return;
  }
  if (action === "toggle-video-preview") {
    if (!state.assets.detail) return;
    state.assets.detail.playing = !state.assets.detail.playing;
    return render();
  }
  if (action === "reset-asset-filters") {
    state.assets.type = "全部";
    state.assets.page = 1;
    state.assets.detail = null;
    return render();
  }
  if (action === "load-more-assets") {
    state.assets.page += 1;
    return render();
  }
  if (action === "select-all-commission-countries") {
    const selected = new Set(AFF.ensureCommissionCountries());
    AFF.filteredCommissionCountries().forEach(item => selected.add(item.code));
    state.programCommissionCountries = [...selected];
    return render();
  }
  if (action === "clear-all-commission-countries") {
    state.programCommissionCountries = [];
    return render();
  }
  if (action === "select-all-support-countries") {
    const selected = new Set(AFF.ensureSupportCountries());
    AFF.filteredSupportCountries().forEach(item => selected.add(item.name));
    state.programSupportCountries = [...selected];
    return render();
  }
  if (action === "clear-all-support-countries") {
    state.programSupportCountries = [];
    return render();
  }
  if (action === "toggle-country-picker") {
    state.programCountryPickerOpen = !state.programCountryPickerOpen;
    render();
    if (state.programCountryPickerOpen) requestAnimationFrame(() => document.querySelector("[data-country-search]")?.focus());
    return;
  }
  if (action === "toggle-support-picker") {
    state.programSupportPickerOpen = !state.programSupportPickerOpen;
    render();
    if (state.programSupportPickerOpen) requestAnimationFrame(() => document.querySelector("[data-support-country-search]")?.focus());
    return;
  }
  if (action === "toggle-dashboard-picker") {
    const field = target.dataset.dashboardPicker;
    if (!["page", "language"].includes(field)) return;
    const key = field === "page" ? "dashboardLinkPagePickerOpen" : "dashboardLinkLanguagePickerOpen";
    const otherKey = field === "page" ? "dashboardLinkLanguagePickerOpen" : "dashboardLinkPagePickerOpen";
    state[key] = !state[key];
    state[otherKey] = false;
    state.programCountryPickerOpen = false;
    state.programSupportPickerOpen = false;
    render();
    if (state[key]) requestAnimationFrame(() => document.querySelector(`[data-dashboard-link-search="${field}"]`)?.focus());
    return;
  }
  if (action === "complete-program") {
    state.programCompleted = true;
    showToast("合作者计划引导已完成");
    return render();
  }
  if (action === "retry-service") {
    showToast("已重新请求，当前仍暂时不可用");
    return render();
  }
  if (action === "reset-scenario") {
    AFF.state.scenario = "normal-flow";
    return render();
  }
}

function handleClick(event) {
  const target = event.target.closest("[data-nav-group], [data-route], [data-copy], [data-dashboard-mode], [data-dashboard-link-page], [data-dashboard-link-language], [data-perf-group], [data-perf-group-add], [data-client-filter], [data-client-info], [data-promo-tab], [data-sub-toggle], [data-assets-filter], [data-download], [data-country-code], [data-support-country], [data-program-asset], [data-apply-step], [data-wd-tab], [data-tracker-id], [data-action]");
  if (!target) return;
  const dataset = target.dataset;
  if (dataset.navGroup !== undefined) {
    const group = dataset.navGroup;
    if (AFF.state.sidebarCollapsed && !sidebarHoverOpen) {
      AFF.state.sidebarCollapsed = false;
      AFF.state.navGroups = [group];
    } else {
      AFF.state.navGroups = AFF.state.navGroups.includes(group)
        ? AFF.state.navGroups.filter(item => item !== group)
        : [...AFF.state.navGroups, group];
    }
    return render();
  }
  if (dataset.route) return navigate(dataset.route);
  if (dataset.copy) return copyText(dataset.copy, target);
  if (dataset.dashboardMode) {
    AFF.state.dashboardMode = dataset.dashboardMode;
    return render();
  }
  if (dataset.dashboardLinkPage !== undefined) {
    AFF.state.dashboardLinkPage = dataset.dashboardLinkPage;
    AFF.state.dashboardLinkPagePickerOpen = false;
    AFF.state.dashboardLinkPageQuery = "";
    return render();
  }
  if (dataset.dashboardLinkLanguage !== undefined) {
    AFF.state.dashboardLinkLanguage = dataset.dashboardLinkLanguage;
    AFF.state.dashboardLinkLanguagePickerOpen = false;
    AFF.state.dashboardLinkLanguageQuery = "";
    return render();
  }
  if (dataset.perfGroup) {
    AFF.state.perf.groups = AFF.state.perf.groups.filter(group => group !== dataset.perfGroup);
    return render();
  }
  if (dataset.perfSource) {
    AFF.state.perf.draft.source = dataset.perfSource;
    return render();
  }
  if (dataset.perfGroupAdd) {
    AFF.state.perf.groups.push(dataset.perfGroupAdd);
    closeModal();
    return render();
  }
  if (dataset.clientFilter) {
    AFF.state.clientFilters[dataset.clientFilter] = dataset.value;
    AFF.state.clientsPage = 1;
    return render();
  }
  if (dataset.clientInfo) return openClientInfo(dataset.clientInfo);
  if (dataset.promoTab) {
    AFF.state.promoTab = dataset.promoTab;
    return render();
  }
  if (dataset.subToggle) {
    const row = AFF.subIds.find(item => item.id === dataset.subToggle);
    row.status = row.status === "启用" ? "已封禁" : "启用";
    row.updatedAt = "2026-10-24";
    showToast("状态已更新");
    return render();
  }
  if (dataset.assetsFilter) {
    const key = dataset.assetsFilter;
    if (key !== "type") return;
    AFF.state.assets[key] = dataset.value || "全部";
    AFF.state.assets.page = 1;
    AFF.state.assets.detail = null;
    return render();
  }
  if (dataset.download) {
    showToast(`开始下载：${dataset.download}`);
    return;
  }
  if (dataset.programAsset) {
    const key = dataset.programAsset;
    if (!["device", "platform", "type"].includes(key)) return;
    AFF.state.programAssetFilters[key] = dataset.value;
    return render();
  }
  if (dataset.countryCode) {
    const selected = new Set(AFF.ensureCommissionCountries());
    if (selected.has(dataset.countryCode)) selected.delete(dataset.countryCode);
    else selected.add(dataset.countryCode);
    AFF.state.programCommissionCountries = [...selected];
    return render();
  }
  if (dataset.supportCountry !== undefined) {
    const selected = new Set(AFF.ensureSupportCountries());
    if (selected.has(dataset.supportCountry)) selected.delete(dataset.supportCountry);
    else selected.add(dataset.supportCountry);
    AFF.state.programSupportCountries = [...selected];
    return render();
  }
  if (dataset.applyStep) {
    const step = Number(dataset.applyStep);
    if (step < 1 || step > 6 || step > AFF.state.applyStep + 1) return;
    AFF.state.applyStep = step;
    return render();
  }
  if (dataset.wdTab) {
    AFF.state.wdTab = dataset.wdTab;
    return render();
  }
  if (dataset.action) return handleAction(dataset.action, target);
}

function handleChange(event) {
  if (AFF.postbacks?.handleChange(event)) return;
  const target = event.target;
  if (target.dataset.accountField && accountDraft) {
    accountDraft[target.dataset.accountField] = target.value;
    return;
  }
  if (target.dataset.perfFilter) {
    AFF.state.perf.draft[target.dataset.perfFilter] = target.value;
    return;
  }
  if (target.dataset.deep) {
    const [scope, key] = target.dataset.deep.split(".");
    AFF.state.deep[scope][key] = target.value;
    return render();
  }
  if (target.dataset.dashboardPeriod !== undefined) {
    AFF.state.dashboardPeriod = target.value;
    return render();
  }
  if (target.dataset.onboardingAgreement !== undefined) {
    const index = Number(target.dataset.onboardingAgreement);
    if (index >= 0 && index <= 2) AFF.state.onboarding.agreements[index] = target.checked;
    return render();
  }
  if (target.dataset.onboardingAgreementDraft !== undefined) {
    AFF.state.onboarding.agreementDraft = target.checked;
    return;
  }
  if (target.dataset.assetDetailOption) {
    const key = target.dataset.assetDetailOption;
    if (!["size", "language", "device", "platform"].includes(key) || !AFF.state.assets.detail) return;
    AFF.state.assets.detail[key] = target.value;
    return render();
  }
  if (target.dataset.assetVideoOption) {
    const key = target.dataset.assetVideoOption;
    if (!["loop", "muted", "autoplay"].includes(key) || !AFF.state.assets.detail) return;
    AFF.state.assets.detail[key] = target.checked;
    if (key === "autoplay" && target.checked) AFF.state.assets.detail.playing = true;
    return render();
  }
  if (target.dataset.programSelect) {
    const field = target.dataset.programSelect;
    if (field === "commissionCountry") AFF.state.programCommissionCountry = target.value;
    return render();
  }
}

function handleInput(event) {
  if (AFF.postbacks?.handleInput(event)) return;
  const target = event.target;
  if (target.dataset.countrySearch !== undefined) {
    AFF.state.programCountryQuery = target.value;
    const list = document.querySelector("[data-country-option-list]");
    if (list) list.innerHTML = AFF.renderCommissionCountryOptions();
  }
  if (target.dataset.supportCountrySearch !== undefined) {
    AFF.state.programSupportQuery = target.value;
    const list = document.querySelector("[data-support-option-list]");
    if (list) list.innerHTML = AFF.renderSupportCountryOptions();
  }
  if (target.dataset.dashboardLinkSearch) {
    const field = target.dataset.dashboardLinkSearch;
    const queryKey = field === "page" ? "dashboardLinkPageQuery" : "dashboardLinkLanguageQuery";
    AFF.state[queryKey] = target.value;
    const list = document.querySelector(`[data-dashboard-link-option-list="${field}"]`);
    if (list) list.innerHTML = AFF.renderDashboardLinkOptions(field);
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function setAuthMode(mode, updateHash = true) {
  authMode = mode === "register" ? "register" : "login";
  const isRegister = authMode === "register";
  elements["login-view"].classList.toggle("login-mode", !isRegister);
  elements["login-view"].classList.toggle("register-mode", isRegister);
  elements["login-form"].classList.toggle("hidden", isRegister);
  elements["register-form"].classList.toggle("hidden", !isRegister);
  elements["login-tab"].classList.toggle("active", !isRegister);
  elements["register-tab"].classList.toggle("active", isRegister);
  elements["login-tab"].setAttribute("aria-selected", String(!isRegister));
  elements["register-tab"].setAttribute("aria-selected", String(isRegister));
  elements["login-error"].hidden = true;
  elements["register-error"].hidden = true;
  if (updateHash) {
    history.replaceState(null, "", `${location.pathname}${location.search}#/${authMode}`);
  document.title = `${isRegister ? "注册" : "登录"} · Affiliate APC`;
  }
}

function showLoginError(message) {
  elements["login-error"].textContent = message;
  elements["login-error"].hidden = false;
}

function showRegisterError(message) {
  elements["register-error"].textContent = message;
  elements["register-error"].hidden = false;
}

function handleLogin(event) {
  event.preventDefault();
  const email = event.currentTarget.email.value.trim();
  const password = event.currentTarget.password.value;
  if (!isValidEmail(email)) return showLoginError("请输入有效邮箱。");
  if (!password) return showLoginError("请输入密码。");
  elements["login-error"].hidden = true;
  sessionStorage.setItem("affiliate-user-session", email);
  try {
    const registered = JSON.parse(sessionStorage.getItem("affiliate-registered-account") || "null");
    if (registered?.email === email) AFF.state.account.country = registered.country;
  } catch {}
  AFF.state.route = "dash";
  history.replaceState(null, "", `${location.pathname}${location.search}#/dash`);
  elements["login-view"].classList.add("hidden");
  elements["app-view"].classList.remove("hidden");
  render();
  showToast(`已登录：${maskEmail(email)}`);
}

function handleRegister(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.email.value.trim();
  const password = form.password.value;
  const confirmPassword = form.confirmPassword.value;
  const country = form.country.value;
  if (!isValidEmail(email)) return showRegisterError("请输入有效邮箱。");
  if (!password) return showRegisterError("请输入密码。");
  if (password !== confirmPassword) return showRegisterError("两次输入的密码不一致。");
  if (!country) return showRegisterError("请选择国家。");
  sessionStorage.setItem("affiliate-registered-account", JSON.stringify({ email, country }));
  form.reset();
  setAuthMode("login");
  elements["login-form"].email.value = email;
  elements["login-form"].password.value = "";
  elements["login-error"].hidden = true;
  showToast("注册成功，请登录");
}

function restoreSession() {
  if (!sessionStorage.getItem("affiliate-user-session")) return false;
  elements["login-view"].classList.add("hidden");
  elements["app-view"].classList.remove("hidden");
  return true;
}

function setWalletOpen(open) {
  clearTimeout(walletCloseTimer);
  elements["wallet-popover"].hidden = !open;
  elements["wallet-toggle"].setAttribute("aria-expanded", String(open));
}

function initializeWalletMenu() {
  const menu = elements["wallet-menu"];
  const trigger = elements["wallet-toggle"];
  menu.addEventListener("mouseenter", () => setWalletOpen(true));
  menu.addEventListener("mouseleave", () => {
    walletCloseTimer = setTimeout(() => setWalletOpen(false), 160);
  });
  menu.addEventListener("focusin", event => {
    if (event.target !== trigger) setWalletOpen(true);
  });
  menu.addEventListener("focusout", event => {
    if (!menu.contains(event.relatedTarget)) setWalletOpen(false);
  });
  trigger.addEventListener("click", () => setWalletOpen(true));
  trigger.addEventListener("keydown", event => {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    setWalletOpen(true);
    elements["wallet-popover"].querySelector("button").focus();
  });
  menu.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    setWalletOpen(false);
    trigger.focus();
  });
  document.addEventListener("click", event => {
    if (!menu.contains(event.target)) setWalletOpen(false);
  });
}

function initializeAccountMenu() {
  const menu = elements["account-menu"];
  menu.addEventListener("mouseenter", () => setAccountMenu(true));
  menu.addEventListener("mouseleave", scheduleAccountMenuClose);
  elements["avatar-button"].addEventListener("click", event => openAccountMenu(event.detail === 0));
  elements["avatar-button"].addEventListener("keydown", event => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openAccountMenu(true);
    }
  });
  elements["account-dropdown"].addEventListener("keydown", handleAccountMenuKeydown);
  document.addEventListener("focusin", event => {
    if (!menu.contains(event.target)) setAccountMenu(false);
  });
  document.addEventListener("click", event => {
    if (!menu.contains(event.target)) setAccountMenu(false);
  }, true);
}

function initializeAuthForms() {
  elements["login-tab"].addEventListener("click", () => setAuthMode("login"));
  elements["register-tab"].addEventListener("click", () => setAuthMode("register"));
  [elements["login-tab"], elements["register-tab"]].forEach((tab, index, tabs) => {
    tab.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const nextMode = index === 0 ? "register" : "login";
      setAuthMode(nextMode);
      tabs[1 - index].focus();
    });
  });
  document.querySelectorAll("[data-auth-switch]").forEach(button => {
    button.addEventListener("click", () => setAuthMode(button.dataset.authSwitch));
  });
}

function initialize() {
  initializeElements();
  initializeWalletMenu();
  initializeAccountMenu();
  initializeAuthForms();
  elements["login-form"].addEventListener("submit", handleLogin);
  elements["register-form"].addEventListener("submit", handleRegister);
  elements["sidebar-toggle"].addEventListener("click", () => {
    if (window.innerWidth <= 991) {
      AFF.state.mobileNavOpen = !AFF.state.mobileNavOpen;
    } else {
      AFF.state.sidebarCollapsed = !AFF.state.sidebarCollapsed;
      setSidebarHover(false);
    }
    render();
  });
  const setSidebarHover = open => {
    if (window.innerWidth <= 991) open = false;
    sidebarHoverOpen = open && AFF.state.sidebarCollapsed;
    document.body.classList.toggle("sidebar-hover-open", sidebarHoverOpen);
    syncSidebarToggle();
  };
  elements.sidebar.addEventListener("mouseenter", () => setSidebarHover(true));
  elements.sidebar.addEventListener("mouseleave", () => setSidebarHover(false));
  window.addEventListener("resize", () => {
    if (window.innerWidth <= 991) setSidebarHover(false);
  });
  const languageMenu = elements["language-menu"];
  const setLanguageMenu = open => {
    if (open && (AFF.state.programCountryPickerOpen || AFF.state.programSupportPickerOpen)) {
      AFF.state.programCountryPickerOpen = false;
      AFF.state.programSupportPickerOpen = false;
      render();
    }
    languageMenu.classList.toggle("open", open);
    elements["language-toggle"].setAttribute("aria-expanded", String(open));
  };
  elements["language-toggle"].addEventListener("click", event => {
    event.stopPropagation();
    setLanguageMenu(!languageMenu.classList.contains("open"));
  });
  languageMenu.addEventListener("click", event => {
    const item = event.target.closest("[data-language]");
    if (!item) return;
    event.stopPropagation();
    AFF.state.language = item.dataset.language;
    setLanguageMenu(false);
    render();
  });
  document.addEventListener("click", event => {
    if (!event.target.closest("#language-menu")) setLanguageMenu(false);
  });
  elements["dismiss-kyc"].addEventListener("click", () => {
    AFF.state.kycDismissed = true;
    render();
  });
  elements["scenario-select"].addEventListener("change", event => {
    AFF.state.scenario = event.target.value;
    render();
  });
  document.addEventListener("click", handleClick);
  document.addEventListener("keydown", event => {
    if (!["Enter", " "].includes(event.key)) return;
    const tutorial = event.target.closest(".tutorial-card");
    if (!tutorial) return;
    event.preventDefault();
    navigate("apply");
  });
  document.addEventListener("change", handleChange);
  document.addEventListener("input", handleInput);
  document.addEventListener("click", event => {
    if (event.target.closest(".country-picker, .dashboard-link-picker")) return;
    if (
      !AFF.state.programCountryPickerOpen &&
      !AFF.state.programSupportPickerOpen &&
      !AFF.state.dashboardLinkPagePickerOpen &&
      !AFF.state.dashboardLinkLanguagePickerOpen
    ) return;
    AFF.state.programCountryPickerOpen = false;
    AFF.state.programSupportPickerOpen = false;
    AFF.state.dashboardLinkPagePickerOpen = false;
    AFF.state.dashboardLinkLanguagePickerOpen = false;
    render();
  });
  window.addEventListener("hashchange", () => {
    const route = location.hash.replace(/^#\//, "");
    if (["login", "register"].includes(route) && elements["app-view"].classList.contains("hidden")) {
      setAuthMode(route, false);
      return;
    }
    if (route) navigate(route);
  });

  const route = location.hash.replace(/^#\//, "");
  if (["login", "register"].includes(route)) {
    setAuthMode(route, false);
  } else if (route) {
    AFF.state.route = route;
  }
  if (restoreSession()) render();
}

initialize();
