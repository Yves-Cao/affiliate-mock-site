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
    language: "简体中文",
    timezone: "Asia/Shanghai"
  },
  scenario: "normal-flow",
  kybCompleted: false,
  withdrawalRequested: false,
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
  programMaxStep: 1,
  programAssetSlide: 0,
  onboarding: {
    name: "",
    step: 1,
    maxStep: 1,
    emailVerified: false,
    riskCheckDone: false,
    agreements: [false, false, false],
    submitted: false,
    agreementModal: 0,
    agreementDraft: false
  },
  programCommissionCountries: null,
  programCalculator: {
    country: "VN",
    netDeposit: 800,
    volume: 3,
    days: 5,
    payment: "wire"
  },
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
  "客户数据": "Client data",
  "总览数据": "General statistics",
  "活动": "Campaigns",
  "深度链接": "Deep links",
  "二级渠道": "Subchannels",
  "回传配置": "Postbacks",
  "素材库": "Assets",
  "收益与提现": "Earnings",
  "收益数据": "Earnings data",
  "客户归属查询": "Attribution",
  "归属查询": "Attribution lookup",
  "提现": "Withdrawal",
  "保证金": "Guarantee",
  "申诉中心": "Appeals",
  "消息中心": "Messages",
  "合作者计划": "Partner Program",
  "入驻申请": "Onboarding Application"
};

const englishGroupLabels = {
  "仪表盘": "Dashboard",
  "数据总览": "Overview",
  "推广管理": "Campaigns",
  "收益中心": "Earnings",
  "服务中心": "Service"
};

const elements = {};
let accountDraft = null;
let accountMenuCloseTimer = null;
let walletCloseTimer = null;
let authMode = "login";
let sidebarHoverOpen = false;
let onboardingPicker = "";
let onboardingQuery = "";
let accountTimezonePickerOpen = false;
let accountTimezoneQuery = "";
const firstPartnerProgramLoginKey = "affiliate-partner-program-first-login-completed";

const fallbackTimezones = [
  "UTC", "Asia/Shanghai", "Asia/Tokyo", "Asia/Singapore", "Asia/Hong_Kong",
  "Asia/Bangkok", "Asia/Jakarta", "Asia/Ho_Chi_Minh", "Asia/Manila",
  "Asia/Kolkata", "Asia/Karachi", "Asia/Dhaka", "Asia/Dubai",
  "Asia/Kuwait", "Asia/Qatar", "Asia/Riyadh", "Asia/Almaty",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow",
  "Africa/Lagos", "Africa/Johannesburg", "Africa/Cairo",
  "America/New_York", "America/Chicago", "America/Los_Angeles", "America/Mexico_City",
  "America/Sao_Paulo", "Australia/Sydney", "Pacific/Auckland"
];
const accountTimezoneCaches = new Map();

function isValidTimezone(timezone) {
  return fallbackTimezones.includes(timezone);
}

function accountTimezoneOptions() {
  const locale = AFF.state?.language === "en" ? "en-US" : "zh-CN";
  if (accountTimezoneCaches.has(locale)) return accountTimezoneCaches.get(locale);
  const now = new Date();
  const options = fallbackTimezones.map(value => {
    const formatter = new Intl.DateTimeFormat(locale, { timeZone: value, timeZoneName: "long" });
    const zoneName = formatter.formatToParts(now).find(part => part.type === "timeZoneName")?.value || value;
    const offsetFormatter = new Intl.DateTimeFormat("en-US", { timeZone: value, timeZoneName: "longOffset" });
    const offset = offsetFormatter.formatToParts(now).find(part => part.type === "timeZoneName")?.value || "GMT";
    const label = `${zoneName} (${offset})`;
    return { value, label, search: `${value} ${zoneName} ${offset}`.toLowerCase() };
  });
  accountTimezoneCaches.set(locale, options);
  return options;
}

function accountTimezoneLabel(timezone) {
  return accountTimezoneOptions().find(item => item.value === timezone)?.label || timezone;
}

function accountTimezoneOffset(timezone) {
  const match = accountTimezoneLabel(timezone).match(/GMT([+-]\d{2}:\d{2})/);
  return match ? `UTC${match[1]}` : "UTC";
}

function renderAccountTimezoneOptions(query = "") {
  const keyword = query.trim().toLowerCase();
  const options = accountTimezoneOptions().filter(item => item.search.includes(keyword));
  if (!options.length) return `<div class="dashboard-link-empty">暂无匹配时区</div>`;
  return options.map(item => {
    const selected = accountDraft?.timezone === item.value;
    return `<button class="dashboard-link-option timezone-option ${selected ? "selected" : ""}" type="button" role="option" aria-selected="${selected}" data-action="select-account-timezone" data-timezone="${AFF.helpers.h(item.value)}">
      <span>${AFF.helpers.h(item.label)}<small>${AFF.helpers.h(item.value)}</small></span>
      <strong>${selected ? "✓" : ""}</strong>
    </button>`;
  }).join("");
}

function formatAccountTime(now, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  }).formatToParts(now);
  const value = type => parts.find(part => part.type === type)?.value || "00";
  const hour = String(Number(value("hour")) % 24).padStart(2, "0");
  return `${value("year")}-${value("month")}-${value("day")} ${hour}:${value("minute")}:${value("second")}`;
}

async function partnerProgramMarkerKey(email) {
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.trim().toLowerCase()));
    const fingerprint = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
    return `${firstPartnerProgramLoginKey}:${fingerprint}`;
  } catch {
    return `${firstPartnerProgramLoginKey}:shared`;
  }
 }

function closeOnboardingPicker(restoreFocus = false) {
  const trigger = document.querySelector(".onboarding-picker.open .dashboard-link-picker-button");
  onboardingPicker = "";
  onboardingQuery = "";
  document.querySelectorAll(".onboarding-picker.open").forEach(picker => picker.classList.remove("open"));
  trigger?.setAttribute("aria-expanded", "false");
  if (restoreFocus) trigger?.focus();
}

function initializeElements() {
  for (const id of [
    "login-view", "login-form", "login-error", "register-form", "register-error",
    "login-tab", "register-tab", "app-view", "sidebar", "nav",
    "profile-entry", "sidebar-toggle", "language-toggle", "language-menu",
    "kyc-banner", "dismiss-kyc", "main", "modal-root", "toast", "scenario-select",
    "account-menu", "avatar-button", "account-dropdown", "wallet-menu", "wallet-toggle",
    "wallet-popover", "wallet-balance", "wallet-popover-balance", "wallet-total-revenue", "message-count",
    "server-time", "server-time-zone", "local-time", "local-time-zone"
  ]) elements[id] = document.getElementById(id);
}

function updateTopbarClocks() {
  const now = new Date();
  const timezone = isValidTimezone(AFF.state?.account?.timezone)
    ? AFF.state.account.timezone
    : defaultState.account.timezone;
  const time = formatAccountTime(now, timezone);
  const zoneLabel = accountTimezoneLabel(timezone);
  const offsetLabel = accountTimezoneOffset(timezone);
  elements["server-time"].textContent = time;
  elements["local-time"].textContent = time;
  elements["server-time-zone"].textContent = offsetLabel;
  elements["local-time-zone"].textContent = offsetLabel;
  elements["server-time"].title = `服务器时间 · ${zoneLabel}`;
  elements["local-time"].title = `本地时间 · ${zoneLabel}`;
}

function currentState() {
  try {
    const saved = sessionStorage.getItem("affiliate-user-mock");
    if (!saved) return structuredClone(defaultState);
    const savedState = JSON.parse(saved);
    const merged = { ...structuredClone(defaultState), ...savedState };
    merged.navGroups = [];
    if (merged.reports?.clients?.filters?.commissionStatus && ["payable", "paid"].includes(merged.reports.clients.filters.commissionStatus)) {
      merged.reports.clients.filters.commissionStatus = "settled_partial";
    }
    merged.account = { ...structuredClone(defaultState.account), ...(savedState.account || {}) };
    if (!isValidTimezone(merged.account.timezone)) merged.account.timezone = defaultState.account.timezone;
    merged.applyStep = Math.min(6, Math.max(1, Number(savedState.applyStep) || 1));
    merged.programMaxStep = Math.min(6, Math.max(merged.applyStep, savedState.programCompleted ? 6 : 1, Number(savedState.programMaxStep) || 1));
    merged.programAssetSlide = 0;
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
if (Array.isArray(AFF.state.createdCampaigns)) {
  const existingCodes = new Set(AFF.campaigns.map(item => item.code));
  const savedCampaigns = AFF.state.createdCampaigns.filter(item =>
    item && typeof item.code === "string" && typeof item.name === "string" && typeof item.link === "string" && !existingCodes.has(item.code)
  );
  AFF.campaigns.unshift(...savedCampaigns);
  savedCampaigns.forEach(campaign => {
    try { AFF.campaignLinks.register(campaign); } catch { /* Keep the saved campaign visible if browser storage is unavailable. */ }
  });
}

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
    "收益中心": "wallet",
    "服务中心": "clients"
  };
  elements.nav.innerHTML = groups.map(group => {
    const routes = AFF.routes.filter(route => route.id !== "apply" && route.group === group);
    const groupLabel = AFF.state.language === "en" ? (englishGroupLabels[group] || group) : group;
    const open = AFF.state.navGroups.includes(group);
    if (group === "仪表盘") {
      return `
        <section class="nav-section nav-direct">
          <button class="nav-parent ${AFF.state.route === "dash" ? "active" : ""}" type="button" data-route="dash" ${AFF.state.route === "dash" ? 'aria-current="page"' : ""} title="${AFF.helpers.h(groupLabel)}">
            <span class="nav-icon" aria-hidden="true">${navIcon("dashboard")}</span>
            <span class="nav-label">${AFF.helpers.h(groupLabel)}</span>
          </button>
        </section>`;
    }
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
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c4 4 4 14 0 18-4-4-4-14 0-18z"/>',
    smartphone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4M11 19h2"/>',
    subchannels: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v5M5 17v-5h14v5"/>',
    video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/>',
    browser: '<rect x="3" y="3" width="18" height="17" rx="2"/><path d="M3 8h18M6 5.5h.01M9 5.5h.01M7 12h10M7 16h6"/>',
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    overview: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 3-4 3 2 5-6"/>',
    summary: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15v-4M12 15V7M16 15V9"/>',
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
    guarantee: '<path d="M12 3l7 3v6c0 4.2-2.8 7.6-7 9-4.2-1.4-7-4.8-7-9V6z"/><path d="M9.5 12l1.8 1.8L15 10"/>',
    appeals: '<path d="M12 4v10"/><path d="M7.5 9.5 12 14l4.5-4.5"/><path d="M5 19h14"/>',
    messages: '<path d="M4 6h16v10H8l-4 4z"/><path d="M8 10h8M8 13h5"/>',
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
  const financeSummary = AFF.finance.summary();
  const reportMoney = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  elements["wallet-balance"].textContent = reportMoney(AFF.finance.balance() / 100);
  elements["wallet-popover-balance"].textContent = reportMoney(AFF.finance.balance() / 100);
  elements["wallet-total-revenue"].textContent = reportMoney(financeSummary.available + financeSummary.paid + financeSummary.guarantee);
  elements["message-count"].textContent = AFF.finance.messages.filter(message => message.status === "unread").length;
  elements["avatar-button"].textContent = accountInitial();
  elements["avatar-button"].setAttribute("aria-label", `${AFF.state.account.displayName} 账户菜单`);
  elements["scenario-select"].value = AFF.state.scenario;
  elements.main.innerHTML = AFF.state.scenario === "normal-flow"
    ? AFF.pages[route]()
    : statePage(route);
  elements["kyc-banner"].classList.toggle(
    "hidden",
    AFF.state.kycDismissed || route === "onboarding" || route === "wd" || AFF.state.programCompleted
  );
  document.body.classList.toggle("collapsed", AFF.state.sidebarCollapsed);
  document.body.classList.toggle("mobile-nav-open", AFF.state.mobileNavOpen);
  document.body.classList.toggle("route-apply", route === "apply");
  syncSidebarToggle();
  elements["language-toggle"].setAttribute("aria-expanded", String(elements["language-menu"].classList.contains("open")));
  elements["language-menu"].querySelectorAll("[data-language]").forEach(button => {
    button.setAttribute("aria-checked", String(button.dataset.language === AFF.state.language));
  });
  document.title = `${routeLabel(route)} · Affiliate CPA`;
  persist();
}

function syncSidebarToggle() {
  const sidebarExpanded = window.innerWidth <= 991
    ? AFF.state.mobileNavOpen || sidebarHoverOpen
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
  closeOnboardingPicker();
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
  if (elements["modal-root"].getAttribute("aria-label") === "账户管理") {
    accountDraft = null;
    accountTimezonePickerOpen = false;
    accountTimezoneQuery = "";
  }
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
  accountTimezonePickerOpen = false;
  accountTimezoneQuery = "";
  const timezonePicker = `
    <div class="dashboard-link-picker account-timezone-picker">
      <span class="field-label" id="account-timezone-label">所在时区</span>
      <button class="dashboard-link-picker-button" type="button" data-action="toggle-account-timezone" aria-labelledby="account-timezone-label account-timezone-value" aria-haspopup="listbox" aria-controls="account-timezone-options" aria-expanded="false">
        <span id="account-timezone-value">${AFF.helpers.h(accountTimezoneLabel(accountDraft.timezone))}</span><small aria-hidden="true">▾</small>
      </button>
      <div class="dashboard-link-options" id="account-timezone-options">
        <input data-account-timezone-search type="search" placeholder="搜索时区、城市或UTC偏移" aria-label="搜索时区" value="">
        <div class="dashboard-link-option-list" role="listbox" aria-label="所在时区" data-account-timezone-options>${renderAccountTimezoneOptions("")}</div>
      </div>
    </div>`;
  showScreenModal(`
    <div class="account-modal">
      <header class="account-modal-head">
        <div>
          <p>Affiliate CPA</p>
          <h2>账户管理</h2>
        </div>
        <button class="close-button" type="button" data-action="close-account-modal" aria-label="关闭账户管理">×</button>
      </header>
      <div class="account-modal-body">
        <div class="account-modal-content">
          <section class="account-section">
            <h3>时区设置</h3>
            <div class="account-form">
              ${timezonePicker}
            </div>
            <p class="helper">资料仅保存在当前浏览器会话中。</p>
          </section>
        </div>
      </div>
      <footer class="account-modal-foot">
        <span>Affiliate CPA</span>
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
  accountTimezonePickerOpen = false;
  accountTimezoneQuery = "";
  closeModal();
  elements["avatar-button"].focus();
}

function setAccountTimezonePicker(open) {
  accountTimezonePickerOpen = open;
  if (open) accountTimezoneQuery = "";
  const picker = document.querySelector(".account-timezone-picker");
  picker?.classList.toggle("open", open);
  picker?.querySelector("[data-action='toggle-account-timezone']")?.setAttribute("aria-expanded", String(open));
  const search = picker?.querySelector("[data-account-timezone-search]");
  if (search) {
    search.value = accountTimezoneQuery;
    const list = picker.querySelector("[data-account-timezone-options]");
    if (list) list.innerHTML = renderAccountTimezoneOptions(accountTimezoneQuery);
  }
  if (open) requestAnimationFrame(() => search?.focus());
}

function selectAccountTimezone(target) {
  if (!accountDraft) return;
  const timezone = target.dataset.timezone;
  if (!isValidTimezone(timezone)) return;
  accountDraft.timezone = timezone;
  const picker = document.querySelector(".account-timezone-picker");
  const timezoneValue = picker?.querySelector("#account-timezone-value");
  if (timezoneValue) timezoneValue.textContent = accountTimezoneLabel(timezone);
  setAccountTimezonePicker(false);
  picker?.querySelector("[data-action='toggle-account-timezone']")?.focus();
}

function saveAccount() {
  if (!accountDraft) return;
  const displayName = accountDraft.displayName.trim();
  if (!displayName) return showToast("请输入显示名称");
  AFF.state.account = {
    ...accountDraft,
    displayName,
    timezone: isValidTimezone(accountDraft.timezone) ? accountDraft.timezone : defaultState.account.timezone
  };
  accountDraft = null;
  accountTimezonePickerOpen = false;
  accountTimezoneQuery = "";
  closeModal();
  showToast("账户信息已保存");
  updateTopbarClocks();
  render();
  elements["avatar-button"].focus();
}

function logout() {
  accountDraft = null;
  accountTimezonePickerOpen = false;
  accountTimezoneQuery = "";
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
  document.title = "登录 · Affiliate CPA";
}

function openCampaignModal() {
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  showModal(modalShell(t("新建活动", "Create campaign"), `
    <label class="field"><span>${t("活动名称", "Campaign name")}</span><input id="campaign-name" maxlength="80" placeholder="${t("例如：十一月 Telegram 投放", "e.g. November Telegram campaign")}"></label>
    <p class="helper" style="margin-top:10px">${t("活动用于管理推广链接，创建后默认为活跃状态。", "Campaigns organize promotional links and are active when created.")}</p>`,
    `<button class="button secondary" type="button" data-action="close-modal">${t("取消", "Cancel")}</button><button class="button primary" type="button" data-action="create-campaign">${t("保存", "Save")}</button>`));
  document.getElementById("campaign-name").focus();
}

function openCampaignStatus(code) {
  const campaign = AFF.campaigns.find(item => item.code === code);
  if (!campaign) return;
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const archived = AFF.campaignLinks.status(campaign) === "archived";
  const next = archived ? "active" : "archived";
  showModal(modalShell(t(archived ? "设为活跃" : "归档活动", archived ? "Activate campaign" : "Archive campaign"), `
    <p>${AFF.helpers.h(campaign.name)} · ${AFF.helpers.h(campaign.code)}</p>
    <p>${archived
      ? t("恢复后，此活动的推广链接将重新生效，历史数据保持不变。", "This campaign's promotional links will work again. Historical data will be retained.")
      : t("归档后，此活动的推广链接及关联二级渠道链接将失效。历史数据仍可查看，也可以稍后恢复活跃状态。", "This campaign's promotional links and associated subchannel links will stop working. Historical data will remain available, and you can reactivate the campaign later.")}</p>`,
    `<button class="button secondary" type="button" data-action="close-modal">${t("取消", "Cancel")}</button><button class="button primary" type="button" data-action="campaign-confirm-status" data-code="${AFF.helpers.h(code)}" data-status="${next}">${t(archived ? "设为活跃" : "确认归档", archived ? "Activate" : "Confirm archive")}</button>`));
  elements["modal-root"].querySelector("[data-action='close-modal']").focus();
}

function openCampaignData(code, period = "past30", focusPeriod = false) {
  const campaign = AFF.campaigns.find(item => item.code === code);
  if (!campaign) return;
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const { range, rows, totals } = AFF.campaignData(campaign, period);
  const number = AFF.campaignNumber;
  const metrics = [
    ["clicks", t("点击量", "Clicks")], ["registrations", t("注册客户", "Registrations")],
    ["ftd", t("FTD 客户", "FTD clients")], ["effective", t("有效客户", "Valid FTD clients")],
    ["quality", t("质量服务客户", "Quality service clients")], ["expected", t("预计佣金", "Projected commission"), "money"]
  ];
  const breakdown = (key, title) => {
    const grouped = AFF.reporting.aggregate(rows, [key]).sort((a, b) => b.metrics.clicks - a.metrics.clicks);
    return `<section class="campaign-breakdown"><h3>${title}</h3>${grouped.length ? AFF.helpers.table({
      columns: [title, t("点击", "Clicks"), t("注册客户", "Registrations"), t("FTD客户", "FTD clients"), t("有效客户", "Valid FTD clients"), t("质量服务客户", "Quality service clients"), t("预计佣金", "Projected commission")],
      rows: grouped.map(row => [AFF.helpers.h(row.values[0]), number(row.metrics.clicks), ...["registrations", "ftd", "effective", "quality"].map(metric => AFF.campaignMetric(campaign, metric, row.metrics[metric], period, key, row.values[0])), number(row.metrics.expected, "money")])
    }) : `<div class="campaign-empty">${t("当前周期暂无数据", "No data for this period")}</div>`}</section>`;
  };
  const periods = [["today", "今日", "Today"], ["past7", "过去7天", "Last 7 days"], ["past30", "过去30天", "Last 30 days"], ["past90", "过去90天", "Last 90 days"]];
  showModal(`<div class="campaign-data-backdrop" data-action="campaign-close-data" data-code="${AFF.helpers.h(code)}" aria-hidden="true"></div><div class="modal-card campaign-data-drawer" role="document">
    <header class="modal-head"><div><h2>${AFF.helpers.h(campaign.name)}</h2><p>${AFF.helpers.h(campaign.code)}</p></div><button class="close-button" type="button" data-action="campaign-close-data" data-code="${AFF.helpers.h(code)}" title="${t("关闭", "Close")}" aria-label="${t("关闭", "Close")}">×</button></header>
    <div class="campaign-data-body">
      <div class="campaign-data-period"><label for="campaign-period">${t("时间范围", "Date range")}</label><select id="campaign-period">${periods.map(([value, zh, en]) => `<option value="${value}" ${value === period ? "selected" : ""}>${t(zh, en)}</option>`).join("")}</select><span>${range.from} — ${range.to}</span></div>
      <section class="campaign-data-metrics">${metrics.map(([key, label, type]) => `<div><span>${label}</span>${["registrations", "ftd", "effective", "quality"].includes(key) ? AFF.campaignMetric(campaign, key, totals[key], period) : `<strong>${number(totals[key], type)}</strong>`}</div>`).join("")}</section>
      <section class="campaign-data-rates">${[["registerRate", t("点击→注册", "Click → registration")], ["ftdRate", t("注册→FTD", "Registration → FTD")], ["effectiveRate", t("FTD→有效 FTD", "FTD → valid FTD")]].map(([key, label]) => `<div><span>${label}</span><strong>${number(totals[key], "rate")}</strong></div>`).join("")}</section>
      ${breakdown("country", t("国家/地区", "Country / region"))}
      ${breakdown("platform", t("平台", "Platform"))}
    </div>
    <footer class="campaign-data-footer"><button class="button secondary" type="button" data-action="campaign-close-data" data-code="${AFF.helpers.h(code)}">${t("关闭", "Close")}</button></footer>
  </div>`, true, `${t("活动数据", "Campaign data")} · ${campaign.name}`);
  elements["modal-root"].classList.add("campaign-data-modal");
  const drawer = elements["modal-root"].querySelector(".campaign-data-drawer");
  drawer.querySelector("#campaign-period").addEventListener("change", event => openCampaignData(code, event.target.value, true));
  drawer.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.stopPropagation();
      return closeCampaignData(code);
    }
    if (event.key !== "Tab") return;
    const buttons = [...drawer.querySelectorAll("button:not(:disabled), select")];
    if (event.shiftKey && document.activeElement === buttons[0]) {
      event.preventDefault(); buttons.at(-1).focus();
    } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
      event.preventDefault(); buttons[0].focus();
    }
  });
  (focusPeriod ? drawer.querySelector("#campaign-period") : drawer.querySelector(".close-button")).focus();
}

function closeCampaignData(code) {
  closeModal();
  document.querySelector(`[data-action="campaign-data"][data-code="${CSS.escape(code)}"]`)?.focus();
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
  elements["modal-root"].classList.add("asset-code-modal");
  elements["modal-root"].querySelector(".modal-card").setAttribute("role", "dialog");
  elements["modal-root"].querySelector(".modal-card").setAttribute("aria-modal", "true");
  elements["modal-root"].querySelector(".close-button").focus();
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
      <div class="info-item"><span>资格链</span><strong>注册 → KYC → FTD → 有效FTD → 质量服务</strong></div>
      <div class="info-item"><span>佣金链</span><strong>未生成 → 前两段合并 → 质量服务单独 → 动态Hold → 可提现</strong></div>
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
  const matched = AFF.lookupIndex.find(item => item.key.toLowerCase() === input.toLowerCase());
  state.lookup.result = matched?.owned ? matched : {
    id: "-", email: "-", owned: false, date: "-", method: "-", firstTouch: "-",
    reason: "无匹配结果；为防止客户探测，非本人客户与不存在客户返回相同结果。请求已进入审计日志。"
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
  if (action === "toggle-account-timezone") return setAccountTimezonePicker(!accountTimezonePickerOpen);
  if (action === "select-account-timezone") return selectAccountTimezone(target);
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
  if (action === "dashboard-clients") {
    const { metric, period } = target.dataset;
    if (!["registrations", "ftd", "effective", "quality", "revenue"].includes(metric) ||
        !["all", "month", "today", "past7", "past30", "lastWeek", "lastMonth"].includes(period)) return;
    const filters = { ...AFF.dashboardData(period).range };
    if (metric === "revenue") filters.commissionStatus = "settled_partial";
    return AFF.reports.openClients(filters, metric === "revenue" ? "registrations" : metric);
  }
  if (action === "dashboard-earnings") {
    const earnings = AFF.earnings.state();
    earnings.filters = {
      from: AFF.reporting.from,
      to: AFF.reporting.now,
      status: "in_progress",
      type: "",
      caseType: ""
    };
    earnings.draft = { ...earnings.filters };
    earnings.page = 1;
    earnings.detail = null;
    earnings.appeal = false;
    earnings.error = "";
    return navigate("pay");
  }
  if (action === "open-campaign-modal") return openCampaignModal();
  if (action === "campaign-data") return openCampaignData(target.dataset.code);
  if (action === "campaign-close-data") return closeCampaignData(target.dataset.code);
  if (action === "campaign-clients") {
    const campaign = AFF.campaigns.find(item => item.code === target.dataset.code);
    if (!campaign || !["registrations", "ftd", "effective", "quality"].includes(target.dataset.metric)) return;
    const filters = { ...AFF.reports.range(target.dataset.period || "past30"), campaignCode: campaign.code };
    if (["country", "platform"].includes(target.dataset.dimension)) filters[target.dataset.dimension] = target.dataset.value;
    closeModal();
    return AFF.reports.openClients(filters, target.dataset.metric);
  }
  if (action === "campaign-status") return openCampaignStatus(target.dataset.code);
  if (action === "campaign-confirm-status") {
    const campaign = AFF.campaigns.find(item => item.code === target.dataset.code);
    if (!campaign || !["active", "archived"].includes(target.dataset.status)) return;
    const t = (zh, en) => state.language === "en" ? en : zh;
    try {
      AFF.campaignLinks.setStatus(campaign, target.dataset.status);
    } catch {
      return showToast(t("状态保存失败，请重试。", "Could not save the status. Please try again."));
    }
    closeModal();
    render();
    document.querySelector(`[data-action="campaign-status"][data-code="${CSS.escape(campaign.code)}"]`)?.focus();
    return showToast(target.dataset.status === "archived" ? t("活动已归档，链接已失效", "Campaign archived. Its links are inactive.") : t("活动已设为活跃，链接已恢复", "Campaign activated. Its links work again."));
  }
  if (action === "campaign-page") {
    state.campaignPage = Number(target.dataset.page || 1);
    return render();
  }
  if (action === "create-campaign") {
    const name = document.getElementById("campaign-name")?.value.trim();
    if (!name || name.length > 80) return showToast("请输入不超过80个字符的活动名称");
    if (AFF.campaigns.some(item => item.name === name)) return showToast("活动名称已存在");
    let nextCode = Math.max(1000, ...AFF.campaigns.map(item => Number(item.code.slice(4)) || 0)) + 1;
    while (AFF.campaignLinks.find(`CMP-${nextCode}`)) nextCode += 1;
    const code = `CMP-${nextCode}`;
    const campaign = { code, name, link: `https://track.example.com/r/AFF1001?camp=${encodeURIComponent(code)}`, status: "启用" };
    try {
      AFF.campaignLinks.register(campaign);
    } catch {
      return showToast("活动保存失败，请重试。");
    }
    AFF.campaigns.unshift(campaign);
    state.createdCampaigns ||= [];
    state.createdCampaigns.unshift(campaign);
    state.campaignPage = 1;
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
      const name = document.querySelector("[data-onboarding-name]");
      if (!state.onboarding.name.trim()) {
        name?.setCustomValidity("请填写姓名");
        name?.reportValidity();
        return;
      }
      state.onboarding.name = state.onboarding.name.trim();
      state.account.displayName = state.onboarding.name;
      state.onboarding.step = 3;
      state.onboarding.maxStep = Math.max(state.onboarding.maxStep, 3);
    } else if (state.onboarding.step === 3 && state.onboarding.riskCheckDone) {
      state.onboarding.step = 4;
      state.onboarding.maxStep = Math.max(state.onboarding.maxStep, 4);
    } else if (state.onboarding.step === 4 && state.onboarding.agreements.every(Boolean)) {
      state.onboarding.step = 5;
      state.onboarding.maxStep = Math.max(state.onboarding.maxStep, 5);
    }
    closeOnboardingPicker();
    return render();
  }
  if (action === "onboarding-go") {
    closeOnboardingPicker();
    const step = Number(target.dataset.onboardingStep);
    if (step >= 1 && step <= state.onboarding.maxStep) state.onboarding.step = step;
    return render();
  }
  if (action === "toggle-onboarding-picker") {
    const field = target.dataset.onboardingField;
    if (!["country", "channel"].includes(field)) return;
    onboardingPicker = onboardingPicker === field ? "" : field;
    onboardingQuery = "";
    render();
    if (onboardingPicker) requestAnimationFrame(() => document.querySelector(`[data-onboarding-search="${field}"]`)?.focus());
    return;
  }
  if (action === "select-onboarding-option") {
    const field = target.dataset.onboardingField;
    const value = target.dataset.value;
    if (!["country", "channel"].includes(field) || !AFF.onboardingOptions(field).some(item => item.value === value)) return;
    state.account[field] = value;
    closeOnboardingPicker();
    render();
    document.querySelector(`[data-action="toggle-onboarding-picker"][data-onboarding-field="${field}"]`)?.focus();
    return;
  }
  if (action === "open-client-kyc") {
    showToast("演示：KYB将在首次提现时开启");
    return;
  }
  if (action === "complete-onboarding-kyc") {
    state.onboarding.riskCheckDone = true;
    state.onboarding.step = 4;
    state.onboarding.maxStep = Math.max(state.onboarding.maxStep, 4);
    showToast("实时硬风控通过，可进入资质审核");
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
    showToast("资质审核已提交；审核通过后启用推广链接");
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
    state.programMaxStep = 6;
    showToast("合作者计划引导已完成");
    return render();
  }
  if (action === "program-asset-slide") {
    state.programAssetSlide = Math.min(2, Math.max(0, Number(target.dataset.slide) || 0));
    return render();
  }
  if (action === "program-open-assets") {
    const type = target.dataset.type || "全部";
    if (!["全部", "横幅", "视频", "落地页", "GIF"].includes(type)) return;
    state.assets.type = type;
    state.assets.page = 1;
    state.assets.detail = null;
    return navigate("assets");
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
    const reached = Math.max(AFF.state.programMaxStep || 1, AFF.state.applyStep);
    const limit = target.hasAttribute("data-program-progress") ? reached : Math.max(reached, AFF.state.applyStep + 1);
    if (step < 1 || step > 6 || step > limit) return;
    AFF.state.applyStep = step;
    AFF.state.programMaxStep = Math.max(reached, step);
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
  if (target.dataset.accountTimezoneSearch !== undefined) {
    accountTimezoneQuery = target.value;
    const list = document.querySelector("[data-account-timezone-options]");
    if (list) list.innerHTML = renderAccountTimezoneOptions(accountTimezoneQuery);
    return;
  }
  if (target.hasAttribute("data-onboarding-name")) {
    AFF.state.onboarding.name = target.value;
    target.setCustomValidity("");
    persist();
    return;
  }
  if (target.dataset.onboardingSearch) {
    const field = target.dataset.onboardingSearch;
    onboardingQuery = target.value;
    const list = document.querySelector(`[data-onboarding-options="${field}"]`);
    if (list) list.innerHTML = AFF.renderOnboardingOptions(field, onboardingQuery);
    return;
  }
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
  document.title = `${isRegister ? "注册" : "登录"} · Affiliate CPA`;
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

async function handleLogin(event) {
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
  const markerKey = await partnerProgramMarkerKey(email);
  const isFirstLogin = localStorage.getItem(markerKey) !== "1";
  if (isFirstLogin) localStorage.setItem(markerKey, "1");
  AFF.state.route = isFirstLogin ? "apply" : "dash";
  history.replaceState(null, "", `${location.pathname}${location.search}#/${AFF.state.route}`);
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
  updateTopbarClocks();
  setInterval(updateTopbarClocks, 1000);
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
    }
    setSidebarHover(false);
    render();
  });
  const sidebarHoverMedia = window.matchMedia("(hover: hover) and (pointer: fine)");
  const setSidebarHover = open => {
    const compact = window.innerWidth <= 991 ? !AFF.state.mobileNavOpen : AFF.state.sidebarCollapsed;
    sidebarHoverOpen = open && sidebarHoverMedia.matches && compact;
    document.body.classList.toggle("sidebar-hover-open", sidebarHoverOpen);
    syncSidebarToggle();
  };
  elements.sidebar.addEventListener("mouseenter", () => setSidebarHover(true));
  elements.sidebar.addEventListener("mouseleave", () => setSidebarHover(false));
  document.addEventListener("pointermove", event => {
    if (sidebarHoverOpen && !elements.sidebar.contains(event.target)) setSidebarHover(false);
  });
  sidebarHoverMedia.addEventListener("change", () => setSidebarHover(false));
  window.addEventListener("resize", () => setSidebarHover(elements.sidebar.matches(":hover")));
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
    if (event.key === "Escape" && onboardingPicker) {
      closeOnboardingPicker(true);
      return;
    }
    if (!["Enter", " "].includes(event.key)) return;
    const tutorial = event.target.closest(".tutorial-card");
    if (!tutorial) return;
    event.preventDefault();
    navigate("apply");
  });
  document.addEventListener("change", handleChange);
  document.addEventListener("input", handleInput);
  document.addEventListener("input", event => {
    if (!event.target.matches("[data-calculator-field]")) return;
    const field = event.target.dataset.calculatorField;
    if (["netDeposit", "volume", "days"].includes(field)) {
      AFF.state.programCalculator[field] = Math.max(0, Number(event.target.value) || 0);
    } else {
      AFF.state.programCalculator[field] = event.target.value;
    }
  });
  document.addEventListener("change", event => {
    if (!event.target.matches("[data-calculator-field]")) return;
    render();
    document.querySelector(`[data-calculator-field="${event.target.dataset.calculatorField}"]`)?.focus();
  });
  document.addEventListener("click", event => {
    const timezonePicker = document.querySelector(".account-timezone-picker");
    if (accountTimezonePickerOpen && timezonePicker && !timezonePicker.contains(event.target)) {
      setAccountTimezonePicker(false);
    }
    if (!event.target.closest(".onboarding-picker")) closeOnboardingPicker();
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
