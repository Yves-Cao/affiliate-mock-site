const defaultState = {
  route: "dash",
  sidebarCollapsed: false,
  mobileNavOpen: false,
  language: "zh",
  kycDismissed: false,
  dashboardMode: "day",
  perf: {
    groups: ["日期"],
    drawer: false,
    source: "",
    draftSource: "",
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
    page: "注册页",
    system: "iOS (App Store)",
    language: "简体中文"
  },
  lookup: { input: "", result: null, queries: 0 },
  assetsAccepted: false,
  assetType: "全部",
  applyStep: 1,
  emailVerified: false,
  kycDone: false,
  agreements: [false, false, false],
  applySubmitted: false,
  wdTab: "withdraw"
};

const englishLabels = {
  "仪表盘": "Dashboard",
  "业绩数据": "Performance",
  "客户列表": "Clients",
  "推广链接与活动": "Campaigns",
  "深度链接": "Deep links",
  "素材库": "Assets",
  "收益与提现": "Earnings",
  "客户归属查询": "Attribution",
  "提现": "Withdrawal",
  "入驻申请": "Application"
};

const elements = {};

function initializeElements() {
  for (const id of [
    "login-view", "login-form", "login-error", "app-view", "sidebar", "nav",
    "profile-entry", "breadcrumb", "topbar-caption", "sidebar-toggle", "language-toggle",
    "kyc-banner", "dismiss-kyc", "main", "modal-root", "toast"
  ]) elements[id] = document.getElementById(id);
}

function currentState() {
  try {
    const saved = sessionStorage.getItem("affiliate-user-mock");
    return saved ? { ...structuredClone(defaultState), ...JSON.parse(saved) } : structuredClone(defaultState);
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
  let group = "";
  elements.nav.innerHTML = AFF.routes.map(route => {
    const routeGroup = AFF.state.language === "en" ? "Menu" : route.group;
    const groupHtml = route.group !== group ? `<p class="nav-group">${AFF.helpers.h(routeGroup)}</p>` : "";
    group = route.group;
    return `${groupHtml}<button class="nav-item ${AFF.state.route === route.id ? "active" : ""}" type="button" data-route="${route.id}"><span class="nav-icon">◆</span><span class="nav-label">${AFF.helpers.h(routeLabel(route.id))}</span></button>`;
  }).join("");
  elements["profile-entry"].querySelector(".nav-label").textContent = AFF.state.language === "en" ? "Profile" : "资料完善";
}

function render() {
  const route = AFF.routes.some(item => item.id === AFF.state.route) ? AFF.state.route : "dash";
  AFF.state.route = route;
  renderNav();
  const meta = routeMeta(route);
  elements.breadcrumb.textContent = `${AFF.state.language === "en" ? "Menu" : meta.group} › ${routeLabel(route)}`;
  elements["topbar-caption"].textContent = AFF.state.language === "en"
    ? "Affiliate user mock · synthetic data only"
    : "Affiliate 用户端演示 · 虚构数据";
  elements.main.innerHTML = AFF.pages[route]();
  elements["kyc-banner"].classList.toggle("hidden", AFF.state.kycDismissed || (AFF.state.kycDone && AFF.state.applyStep >= 3));
  document.body.classList.toggle("collapsed", AFF.state.sidebarCollapsed);
  document.body.classList.toggle("mobile-nav-open", AFF.state.mobileNavOpen);
  document.title = `${routeLabel(route)} · Affiliate User Mock`;
  persist();
}

function navigate(route) {
  if (!AFF.routes.some(item => item.id === route)) route = "dash";
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

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("已复制");
  } catch {
    showToast("剪贴板不可用，请手动复制链接");
  }
}

function showModal(html, full = false) {
  elements["modal-root"].className = `modal-layer ${full ? "full" : ""}`;
  elements["modal-root"].innerHTML = html;
  document.addEventListener("keydown", escapeModal);
}

function closeModal() {
  elements["modal-root"].className = "modal-layer hidden";
  elements["modal-root"].innerHTML = "";
  document.removeEventListener("keydown", escapeModal);
}

function escapeModal(event) {
  if (event.key === "Escape") closeModal();
}

function modalShell(title, body, actions = "") {
  return `<div class="modal-card"><div class="modal-head"><h2>${AFF.helpers.h(title)}</h2><button class="close-button" type="button" data-action="close-modal">×</button></div>${body}${actions ? `<div class="drawer-actions">${actions}</div>` : ""}</div>`;
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
    <p>本演示仅保留准则摘要：不得自荐、不得违规使用品牌素材、不得诱导虚假交易。接受后仅解锁本演示素材下载。</p>`,
    `<button class="button secondary" type="button" data-action="close-modal">关闭</button><button class="button primary" type="button" data-action="accept-code">阅读并接受</button>`));
}

function openProtocolModal() {
  showModal(modalShell("协议摘要", `
    <p>主协议、推广行为准则、客户归属与佣金规则均为虚构演示文本。正式协议以未来系统配置为准。</p>`,
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
    showToast("查询频次已达演示上限，请稍后再试");
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
  if (action === "close-modal") return closeModal();
  if (action === "open-perf-filter") {
    state.perf.drawer = true;
    state.perf.draftSource = state.perf.source;
    return render();
  }
  if (action === "close-perf-filter") {
    state.perf.drawer = false;
    return render();
  }
  if (action === "apply-perf-filter") {
    state.perf.source = state.perf.draftSource;
    state.perf.count = 1 + (state.perf.source && state.perf.source !== "全部" ? 1 : 0);
    state.perf.drawer = false;
    state.perf.page = 1;
    showToast("筛选已应用");
    return render();
  }
  if (action === "reset-perf-filter") {
    state.perf.source = "";
    state.perf.draftSource = "";
    state.perf.count = 1;
    state.perf.page = 1;
    showToast("筛选已重置");
    return render();
  }
  if (action === "add-perf-group") {
    const next = AFF.performance.dimensions.find(item => !state.perf.groups.includes(item));
    if (next) state.perf.groups.push(next);
    return render();
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
    state.agreements[1] = true;
    closeModal();
    showToast("准则已接受");
    return render();
  }
  if (action === "open-protocol") return openProtocolModal();
  if (action === "lookup") return lookup();
  if (action === "verify-email") {
    state.emailVerified = true;
    showToast("邮箱已验证");
    return render();
  }
  if (action === "simulate-kyc") {
    state.kycDone = true;
    showToast("KYC已同步");
    return render();
  }
  if (action === "submit-apply") {
    if (!state.emailVerified || !state.kycDone || !state.agreements.every(Boolean)) return showToast("请完成前置步骤");
    state.applySubmitted = true;
    showToast("申请已提交，等待运营审核");
    return render();
  }
}

function handleClick(event) {
  const target = event.target.closest("[data-route], [data-copy], [data-dashboard-mode], [data-perf-group], [data-perf-source], [data-client-filter], [data-client-info], [data-promo-tab], [data-sub-toggle], [data-asset-type], [data-download], [data-apply-step], [data-wd-tab], [data-action]");
  if (!target) return;
  const dataset = target.dataset;
  if (dataset.route) return navigate(dataset.route);
  if (dataset.copy) return copyText(dataset.copy);
  if (dataset.dashboardMode) {
    AFF.state.dashboardMode = dataset.dashboardMode;
    return render();
  }
  if (dataset.perfGroup) {
    AFF.state.perf.groups = AFF.state.perf.groups.filter(group => group !== dataset.perfGroup);
    return render();
  }
  if (dataset.perfSource) {
    AFF.state.perf.draftSource = dataset.perfSource === "全部" ? "" : dataset.perfSource;
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
  if (dataset.assetType) {
    AFF.state.assetType = dataset.assetType;
    return render();
  }
  if (dataset.download) {
    showToast(`开始下载：${dataset.download}`);
    return;
  }
  if (dataset.applyStep) {
    const step = Number(dataset.applyStep);
    if (step < 1 || step > 5) return;
    if (step > AFF.state.applyStep) {
      if (step >= 2 && !AFF.state.emailVerified) return showToast("请先验证邮箱");
      if (step >= 4 && !AFF.state.kycDone) return showToast("请先完成KYC");
      if (step >= 5 && !AFF.state.agreements.every(Boolean)) return showToast("请先接受全部协议");
    }
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
  const target = event.target;
  if (target.dataset.deep) {
    AFF.state.deep[target.dataset.deep] = target.value;
    return render();
  }
  if (target.dataset.agreement !== undefined) {
    AFF.state.agreements[Number(target.dataset.agreement)] = target.checked;
    return render();
  }
}

function handleLogin(event) {
  event.preventDefault();
  const username = event.currentTarget.username.value.trim();
  const password = event.currentTarget.password.value;
  if (!username || !password) {
    elements["login-error"].hidden = false;
    return;
  }
  elements["login-error"].hidden = true;
  sessionStorage.setItem("affiliate-user-session", username);
  elements["login-view"].classList.add("hidden");
  elements["app-view"].classList.remove("hidden");
  render();
  showToast(`已登录：${username}`);
}

function restoreSession() {
  if (!sessionStorage.getItem("affiliate-user-session")) return false;
  elements["login-view"].classList.add("hidden");
  elements["app-view"].classList.remove("hidden");
  return true;
}

function initialize() {
  initializeElements();
  elements["login-form"].addEventListener("submit", handleLogin);
  elements["sidebar-toggle"].addEventListener("click", () => {
    if (window.innerWidth <= 991) {
      AFF.state.mobileNavOpen = !AFF.state.mobileNavOpen;
    } else {
      AFF.state.sidebarCollapsed = !AFF.state.sidebarCollapsed;
    }
    render();
  });
  elements["dismiss-kyc"].addEventListener("click", () => {
    AFF.state.kycDismissed = true;
    render();
  });
  elements["language-toggle"].addEventListener("click", () => {
    AFF.state.language = AFF.state.language === "zh" ? "en" : "zh";
    render();
  });
  document.addEventListener("click", handleClick);
  document.addEventListener("change", handleChange);
  window.addEventListener("hashchange", () => {
    const route = location.hash.replace(/^#\//, "");
    if (route) navigate(route);
  });

  const route = location.hash.replace(/^#\//, "");
  if (route) AFF.state.route = route;
  if (restoreSession()) render();
}

initialize();
