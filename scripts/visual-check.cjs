const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const baseUrl = process.env.REPORT_BASE_URL || "http://127.0.0.1:4179";

const routes = [
  ["dash", "仪表盘"],
  ["perf", "业绩数据"],
  ["clients", "客户数据"],
  ["summary", "总览数据"],
  ["promo", "活动"],
  ["subchannels", "二级渠道"],
  ["deep", "深度链接"],
  ["tracker", "回传配置"],
  ["assets", "素材库"],
  ["pay", "收益数据"],
  ["statements", "结算单"],
  ["lookup", "归属查询"],
  ["wd", "提现"],
  ["guarantee", "保证金"],
  ["account", "个人中心"],
  ["support", "帮助与工单"],
  ["appeals", "申诉中心"],
  ["messages", "消息中心"],
  ["export", "导出中心"],
  ["apply", "合作者计划"],
  ["onboarding", "入驻申请"]
];

const routeGroups = {
  dash: "仪表盘",
  perf: "数据总览",
  clients: "数据总览",
  summary: "数据总览",
  promo: "推广管理",
  subchannels: "推广管理",
  deep: "推广管理",
  tracker: "推广管理",
  assets: "推广管理",
  pay: "收益中心",
  statements: "收益中心",
  lookup: "推广管理",
  wd: "收益中心",
  guarantee: "收益中心",
  account: "服务中心",
  support: "服务中心",
  appeals: "服务中心",
  messages: "服务中心",
  export: "服务中心"
};

function assertText(text, expected, label) {
  if (!text.includes(expected)) throw new Error(`${label} failed: missing ${expected}`);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", request => {
    if (!request.url().startsWith("data:")) failedRequests.push(request.url());
  });

  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  const loginLayout = await page.evaluate(() => {
    const view = document.querySelector(".login-view");
    const background = document.querySelector(".login-page-bg");
    const logo = document.querySelector(".login-logo img");
    const card = document.querySelector(".login-auth");
    const form = document.querySelector("#login-form");
    const cardRect = card.getBoundingClientRect();
    const formRect = form.getBoundingClientRect();
    const cardStyle = getComputedStyle(card);
    const rect = node => {
      const value = node.getBoundingClientRect();
      return [Math.round(value.left), Math.round(value.top), Math.round(value.width), Math.round(value.height)];
    };
  return {
      loginMode: view.classList.contains("login-mode"),
      backgroundImage: getComputedStyle(background).backgroundImage,
      logoLoaded: logo.complete && logo.naturalWidth > 0,
      header: rect(document.querySelector(".auth-logo")),
      headerText: document.querySelector(".login-shell .auth-header").innerText.trim(),
      languageAction: rect(document.querySelector(".login-shell .language-action")),
      card: rect(card),
      form: rect(form),
      title: rect(document.querySelector(".login-copy h1")),
      email: rect(document.querySelector("#login-form input[name=email]")),
      password: rect(document.querySelector("#login-form input[name=password]")),
      submit: rect(document.querySelector("#login-form button[type=submit]")),
      divider: rect(document.querySelector(".auth-divider")),
      social: rect(document.querySelector(".login-social-grid")),
      footer: rect(document.querySelector(".login-footer-actions")),
      footerText: document.querySelector(".login-footer-actions").innerText.trim(),
      passkeyIconColor: getComputedStyle(document.querySelector(".icon-passkey")).backgroundColor,
      appleIconColor: getComputedStyle(document.querySelector(".icon-apple")).backgroundColor,
      radius: cardStyle.borderRadius,
      padding: cardStyle.padding,
      formCenterDelta: Math.abs(formRect.left + formRect.width / 2 - (cardRect.left + cardRect.width / 2)),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  if (!loginLayout.loginMode || !loginLayout.backgroundImage.includes("reference/mygtc/login-bg.png") ||
      !loginLayout.logoLoaded || loginLayout.overflow > 2) {
    throw new Error("Login reference layout state failed");
  }
  if (JSON.stringify(loginLayout.header) !== JSON.stringify([60, 40, 156, 56]) ||
      loginLayout.headerText !== "AffiliateCPA\n简体中文" ||
      JSON.stringify(loginLayout.languageAction) !== JSON.stringify([1234, 57, 146, 22]) ||
      JSON.stringify(loginLayout.card) !== JSON.stringify([417, 134, 606, 653]) ||
      JSON.stringify(loginLayout.form) !== JSON.stringify([449, 190, 542, 557]) ||
      JSON.stringify(loginLayout.title) !== JSON.stringify([449, 190, 542, 48]) ||
      JSON.stringify(loginLayout.email) !== JSON.stringify([449, 333, 542, 52]) ||
      JSON.stringify(loginLayout.password) !== JSON.stringify([466, 440, 486, 50]) ||
      JSON.stringify(loginLayout.submit) !== JSON.stringify([449, 541, 542, 45]) ||
      JSON.stringify(loginLayout.divider) !== JSON.stringify([449, 610, 542, 16]) ||
      JSON.stringify(loginLayout.social) !== JSON.stringify([449, 650, 542, 45]) ||
      JSON.stringify(loginLayout.footer) !== JSON.stringify([449, 727, 542, 20]) ||
      loginLayout.footerText !== "还没有账户？\n注册" ||
      loginLayout.passkeyIconColor !== "rgb(65, 70, 81)" || loginLayout.appleIconColor !== "rgb(65, 70, 81)" ||
      loginLayout.radius !== "18px" || loginLayout.padding !== "56px 32px 40px" || loginLayout.formCenterDelta > 2) {
    throw new Error(`Login card geometry failed: ${JSON.stringify(loginLayout)}`);
  }
  await page.click(".login-shell [data-auth-language-toggle]");
  const languageMenu = await page.evaluate(() => ({
    expanded: document.querySelector(".login-shell [data-auth-language-toggle]").getAttribute("aria-expanded"),
    visible: !document.querySelector(".login-shell [data-auth-language-options]").hidden,
    optionCount: document.querySelectorAll(".login-shell [data-auth-language-value]").length
  }));
  if (languageMenu.expanded !== "true" || !languageMenu.visible || languageMenu.optionCount !== 17) {
    throw new Error(`Authentication language menu failed: ${JSON.stringify(languageMenu)}`);
  }
  await page.click(".login-shell [data-auth-language-value='English']");
  const selectedLanguage = await page.evaluate(() => ({
    label: document.querySelector(".login-shell [data-auth-language-label]").textContent,
    selected: document.querySelector(".login-shell [data-auth-language-value='English']").getAttribute("aria-selected"),
    syncedRegisterLabel: document.querySelector(".register-shell [data-auth-language-label]").textContent,
    menuClosed: document.querySelector(".login-shell [data-auth-language-options]").hidden
  }));
  if (selectedLanguage.label !== "English" || selectedLanguage.selected !== "true" ||
      selectedLanguage.syncedRegisterLabel !== "English" || !selectedLanguage.menuClosed) {
    throw new Error(`Authentication language selection failed: ${JSON.stringify(selectedLanguage)}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLoginLayout = await page.locator(".login-auth").evaluate(node => {
    const rect = node.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      bottom: innerHeight - rect.bottom,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  if (Math.abs(mobileLoginLayout.width - 366) > 2 || Math.abs(mobileLoginLayout.height - 565) > 4 ||
      Math.abs(mobileLoginLayout.top - 117) > 4 || mobileLoginLayout.overflow > 2) {
    throw new Error(`Mobile login spacing failed: ${JSON.stringify(mobileLoginLayout)}`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const ibConflict = await page.evaluate(() => {
    const button = document.querySelector("#simulate-ib-login");
    const box = button.getBoundingClientRect();
    return {
      text: button.innerText,
      inCorner: box.right <= innerWidth && box.bottom <= innerHeight,
      visible: getComputedStyle(button).display !== "none"
    };
  });
  if (ibConflict.text !== "模拟IB身份登录" || !ibConflict.inCorner || !ibConflict.visible) {
    throw new Error(`IB simulation entry failed: ${JSON.stringify(ibConflict)}`);
  }
  await page.click("#simulate-ib-login");
  const ibPrompt = await page.locator("#ib-login-error").evaluate(node => {
    const action = node.querySelector("button");
    const actionStyle = getComputedStyle(action);
    const box = node.getBoundingClientRect();
    return {
      text: node.innerText,
      actionText: action.innerText,
      actionColor: actionStyle.backgroundColor,
      textColor: actionStyle.color,
      visible: box.right <= innerWidth && box.bottom <= innerHeight
    };
  });
  if (!ibPrompt.visible || !ibPrompt.text.includes("当前账户无法申请成为CPA合作者，请注册新账户") ||
      ibPrompt.actionText !== "去注册" || ibPrompt.actionColor !== "rgb(26, 91, 255)" ||
      ibPrompt.textColor !== "rgb(255, 255, 255)") {
    throw new Error(`IB identity conflict prompt failed: ${JSON.stringify(ibPrompt)}`);
  }
  await page.click("#ib-login-error [data-auth-switch='register']");
  if (!(await page.locator("#register-form").isVisible()) || !(await page.locator("#ib-login-error").isHidden())) {
    throw new Error("IB identity conflict registration action failed");
  }
  await page.click(".register-footer [data-auth-switch='login']");
  await page.fill("#login-form input[name=email]", "");
  await page.fill("#login-form input[name=password]", "");
  await page.click("#login-form button[type=submit]");
  if (!(await page.locator("#login-error").isVisible())) throw new Error("Empty login validation failed");

  await page.click(".login-footer-actions [data-auth-switch='register']");
  await page.setViewportSize({ width: 1920, height: 900 });
  const registerWideCenter = await page.evaluate(() => {
    const panel = document.querySelector(".register-panel").getBoundingClientRect();
    const form = document.querySelector("#register-form").getBoundingClientRect();
    return Math.abs(form.left + form.width / 2 - (panel.left + panel.width / 2));
  });
  if (registerWideCenter > 1) throw new Error(`Register content is not centered: ${registerWideCenter}`);
  await page.setViewportSize({ width: 1440, height: 900 });
  const registerLayout = await page.evaluate(() => ({
    registerMode: document.querySelector(".login-view").classList.contains("register-mode"),
    imageLoaded: document.querySelector(".register-hero img").complete && document.querySelector(".register-hero img").naturalWidth === 1448,
    display: getComputedStyle(document.querySelector(".register-desktop")).display,
    hero: (() => { const r = document.querySelector(".register-hero").getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })(),
    panel: (() => { const r = document.querySelector(".register-panel").getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })(),
    form: (() => { const r = document.querySelector("#register-form").getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })(),
    tabs: (() => { const r = document.querySelector(".register-tabs").getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })(),
    firstInput: (() => { const r = document.querySelector(".personal-account-field input").getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })(),
    scroll: (() => { const r = document.querySelector(".register-scroll").getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })(),
    submit: (() => { const r = document.querySelector(".register-submit").getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })(),
    footer: (() => { const r = document.querySelector(".register-footer").getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })(),
    scrollOverflow: getComputedStyle(document.querySelector(".register-scroll")).overflowY,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
  if (!registerLayout.registerMode || !registerLayout.imageLoaded || registerLayout.display !== "flex" ||
      JSON.stringify(registerLayout.hero) !== JSON.stringify([0, 0, 720, 900]) ||
      JSON.stringify(registerLayout.panel) !== JSON.stringify([720, 0, 720, 900]) ||
      JSON.stringify(registerLayout.form) !== JSON.stringify([781, 54, 598, 806]) ||
      JSON.stringify(registerLayout.tabs) !== JSON.stringify([781, 200, 598, 60]) ||
      JSON.stringify(registerLayout.firstInput) !== JSON.stringify([781, 302, 598, 52]) ||
      JSON.stringify(registerLayout.scroll) !== JSON.stringify([781, 272, 598, 457]) ||
      JSON.stringify(registerLayout.submit) !== JSON.stringify([781, 753, 598, 50]) ||
      JSON.stringify(registerLayout.footer) !== JSON.stringify([781, 823, 598, 37]) ||
      registerLayout.scrollOverflow !== "auto" || registerLayout.overflow > 2) {
    throw new Error(`Register split layout failed: ${JSON.stringify(registerLayout)}`);
  }
  const registerText = await page.locator("#register-form").innerText();
  for (const field of ["姓", "名", "居住国家", "手机号码", "电子邮箱", "邮箱验证码", "密码", "邀请码(选填)", "创建账号即表示我确认:"]) {
    assertText(registerText, field, "Register form fields");
  }
  await page.click("#register-form button[type=submit]");
  if (!(await page.locator("#register-error").isVisible())) throw new Error("Empty register validation failed");
  await page.click("[data-register-account='company']");
  assertText(await page.locator("#register-form").innerText(), "公司名称", "Company register fields");
  assertText(await page.locator("#register-form").innerText(), "注册国家/地区", "Company register country");
  await page.click("[data-register-account='personal']");
  await page.fill("#register-form input[name=lastName]", "Demo");
  await page.fill("#register-form input[name=firstName]", "User");
  await page.fill("#register-form input[name=phone]", "13800138000");
  await page.fill("#register-form input[name=email]", "registered-user@example.com");
  await page.click("#register-form [data-send-code]");
  if ((await page.locator("#register-form input[name=verificationCode]").inputValue()) !== "123456") {
    throw new Error("Mock email code action failed");
  }
  await page.fill("#register-form input[name=password]", "demo-password");
  await page.check("#register-form input[name=legalConfirmed]");
  await page.click("#register-form button[type=submit]");
  await page.waitForSelector("#login-form:not(.hidden)");
  if ((await page.locator("#login-form input[name=email]").inputValue()) !== "registered-user@example.com") {
    throw new Error("Register did not return to prefilled login");
  }

  await page.fill("#login-form input[name=password]", "demo-password");
  await page.click("#login-form button[type=submit]");
  await page.waitForSelector("#app-view:not(.hidden)");
  await page.keyboard.press("Escape");
  await page.evaluate(() => navigate("dash"));
  assertText(await page.locator(".topbar").innerText(), "Affiliate CPA", "Dashboard topbar");
  assertText(await page.locator("#wallet-toggle").innerText(), "$", "Wallet trigger amount");
  await page.setViewportSize({ width: 1920, height: 1080 });
  const shellState = await page.evaluate(() => ({
    route: AFF.state.route,
    topbarLeft: document.querySelector(".topbar").getBoundingClientRect().left,
    topbarWidth: document.querySelector(".topbar").getBoundingClientRect().width,
    brandLeft: document.querySelector(".topbar-brand").getBoundingClientRect().left,
    brandText: document.querySelector(".topbar-brand .brand-text strong").innerText.trim(),
    brandImageLoaded: document.querySelector(".topbar-brand img")?.naturalWidth > 0,
    avatarImageLoaded: document.querySelector("#avatar-initial")?.complete && document.querySelector("#avatar-initial")?.naturalWidth === 36,
    avatarRect: (() => { const r = document.querySelector("#avatar-initial").getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), getComputedStyle(document.querySelector("#avatar-initial")).borderRadius]; })(),
    avatarTriggerBackground: getComputedStyle(document.querySelector("#avatar-button")).backgroundColor,
    nickname: document.querySelector("#avatar-name").textContent,
    nicknameStyle: (() => {
      const style = getComputedStyle(document.querySelector("#avatar-name"));
      return { maxWidth: style.maxWidth, overflow: style.overflow };
    })(),
    walletLabel: document.querySelector(".wallet-tags").innerText.trim(),
    walletLabelBackground: getComputedStyle(document.querySelector(".wallet-tags > span")).backgroundColor,
    walletIcon: (() => {
      const icon = document.querySelector(".wallet-account-icon");
      const rect = icon.getBoundingClientRect();
      return [Math.round(rect.width), Math.round(rect.height), getComputedStyle(icon).backgroundColor];
    })(),
    walletLayout: (() => {
      const firstRow = document.querySelector(".wallet-tags").getBoundingClientRect();
      const secondRow = document.querySelector(".wallet-identity").getBoundingClientRect();
      const box = document.querySelector("#wallet-menu").getBoundingClientRect();
      const divider = document.querySelector(".topbar-divider").getBoundingClientRect();
      return {
        visibleGap: Math.round(Math.min(firstRow.left, secondRow.left) - divider.right),
        rowDelta: Math.round(Math.abs(firstRow.left - secondRow.left)),
        boxWidth: Math.round(box.width)
      };
    })(),
    timeAlignment: (() => ({
      label: getComputedStyle(document.querySelector(".mt-time-display__label")).textAlign,
      value: getComputedStyle(document.querySelector(".mt-time-display__value")).textAlign,
      blockWidth: Math.round(document.querySelector(".topbar-clock").getBoundingClientRect().width),
      gapToWallet: Math.round(document.querySelector(".wallet-menu").getBoundingClientRect().left - document.querySelector(".topbar-clock").getBoundingClientRect().right)
    }))(),
    serverZone: document.querySelector("#server-time-zone").textContent,
    localZone: document.querySelector("#local-time-zone").textContent,
    expectedLocalZone: accountTimezoneOffset(Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai"),
    sidebarBrandCount: document.querySelectorAll(".sidebar .brand").length,
    breadcrumbCount: document.querySelectorAll(".breadcrumb").length,
    pageTitleCount: document.querySelectorAll(".page-header h1").length,
    scenarioHidden: document.querySelector(".scenario-control").classList.contains("hidden"),
    sidebarWidth: document.querySelector(".sidebar").getBoundingClientRect().width,
    workspaceLeft: document.querySelector(".workspace").getBoundingClientRect().left,
    mainPaddingLeft: getComputedStyle(document.querySelector(".main")).paddingLeft,
    mainPaddingRight: getComputedStyle(document.querySelector(".main")).paddingRight,
    mainWidth: document.querySelector(".main").getBoundingClientRect().width,
    mainExpectedWidth: document.documentElement.clientWidth - 240,
    mainMaxWidth: getComputedStyle(document.querySelector(".main")).maxWidth,
    navScrollbar: getComputedStyle(document.querySelector("#nav")).scrollbarWidth,
    footerCount: document.querySelectorAll(".footer").length,
    topbarOrder: [...document.querySelectorAll(".topbar-tools > *")].map(node => node.id || node.className),
    expandedGroups: [...document.querySelectorAll(".nav-parent[aria-expanded='true']")].length,
    visibleChildren: [...document.querySelectorAll(".nav-children")].filter(node => getComputedStyle(node).display !== "none").length
  }));
  if (shellState.topbarLeft !== 0 || Math.abs(shellState.topbarWidth - page.viewportSize().width) > 2 || Math.abs(shellState.brandLeft - 8) > 2 || shellState.brandText !== "Affiliate CPA" || !shellState.brandImageLoaded || !shellState.avatarImageLoaded || JSON.stringify(shellState.avatarRect) !== JSON.stringify([36, 36, "50%"]) || shellState.nickname !== "Affiliate Partner" || shellState.nicknameStyle.maxWidth !== "none" || shellState.nicknameStyle.overflow !== "visible" || shellState.walletLabel !== "Affiliate CPA合作者" || shellState.walletLabelBackground !== "rgba(0, 0, 0, 0)" || JSON.stringify(shellState.walletIcon) !== JSON.stringify([18, 18, "rgba(0, 0, 0, 0)"]) || shellState.walletLayout.visibleGap < 12 || shellState.walletLayout.visibleGap > 14 || shellState.walletLayout.rowDelta > 1 || shellState.walletLayout.boxWidth > 180 || shellState.timeAlignment.label !== "right" || shellState.timeAlignment.value !== "right" || shellState.timeAlignment.blockWidth > 210 || shellState.timeAlignment.gapToWallet > 2 || shellState.serverZone !== "UTC+3" || shellState.localZone !== shellState.expectedLocalZone || shellState.navScrollbar !== "none" || shellState.sidebarBrandCount || shellState.footerCount || shellState.breadcrumbCount || shellState.pageTitleCount !== (shellState.route === "dash" ? 0 : 1) || !shellState.scenarioHidden || Math.abs(shellState.sidebarWidth - 240) > 2 || Math.abs(shellState.workspaceLeft - 240) > 2 || shellState.mainPaddingLeft !== "24px" || shellState.mainPaddingRight !== "24px" || Math.abs(shellState.mainWidth - shellState.mainExpectedWidth) > 2 || shellState.mainMaxWidth !== "none" || shellState.expandedGroups !== 5 || shellState.visibleChildren !== 5) {
    throw new Error(`Global shell state failed: ${JSON.stringify(shellState)}`);
  }
  const expectedTopbarOrder = ["topbar-clock mt-time-display", "topbar-divider", "wallet-menu", "header-icon-actions", "account-menu"];
  if (JSON.stringify(shellState.topbarOrder) !== JSON.stringify(expectedTopbarOrder)) {
    throw new Error(`Topbar order failed: ${JSON.stringify(shellState.topbarOrder)}`);
  }
  for (const selector of [".support-center", ".language-selector", ".message-icon"]) {
    await page.locator(selector).hover();
    await page.waitForTimeout(100);
    const hoverBackground = await page.locator(selector).evaluate(node => getComputedStyle(node).backgroundColor);
    if (hoverBackground !== "rgba(0, 0, 0, 0)") throw new Error(`${selector} hover background failed: ${hoverBackground}`);
  }
  const navStructure = await page.locator("#nav .nav-section").evaluateAll(sections => sections.map(section => ({
    group: section.querySelector("[data-nav-group]")?.dataset.navGroup || "仪表盘",
    routes: [...section.querySelectorAll("[data-route]")].map(button => button.dataset.route)
  })));
  if (navStructure[0].group !== "仪表盘" || navStructure[0].routes.join(",") !== "dash" ||
      navStructure[1].group !== "数据总览" || navStructure[1].routes.join(",") !== "perf,clients,summary") {
    throw new Error(`Dashboard navigation hierarchy failed: ${JSON.stringify(navStructure)}`);
  }
  fs.mkdirSync(path.join(process.cwd(), ".artifacts"), { recursive: true });
  await page.locator("#wallet-toggle").hover();
  await page.locator("#wallet-popover").waitFor({ state: "visible" });
  const walletText = await page.locator("#wallet-popover").innerText();
  for (const expected of ["总收益", "结算中佣金", "资金详情", "提现"]) {
    assertText(walletText, expected, "Wallet popover");
  }
  await page.locator("#wallet-popover").hover();
  await page.waitForTimeout(220);
  if (!(await page.locator("#wallet-popover").isVisible())) throw new Error("Wallet hover transfer failed");
  await page.screenshot({ path: path.join(process.cwd(), ".artifacts", "wallet-desktop.png") });
  await page.click("#wallet-popover [data-route='wd']");
  assertText(await page.title(), "提现", "Wallet withdrawal route");
  if (await page.locator("#wallet-popover").isVisible()) throw new Error("Wallet popover did not close on navigation");
  await page.click("#nav [data-route='dash']");

  const linkAddress = page.locator(".dashboard-link-address .link-text");
  const linkCopy = page.locator(".dashboard-link-address [data-copy]");
  async function assertPromotionLink(expectedPage, expectedLanguage) {
    const text = await linkAddress.innerText();
    const url = new URL(text);
    if (url.origin !== "https://go.affiliate-cpa.example" || !url.pathname ||
        url.searchParams.get("page") !== expectedPage || url.searchParams.get("lang") !== expectedLanguage ||
        url.searchParams.get("aff") !== "AFF1001" || url.searchParams.get("path_version") !== "PATH-20261104-1" ||
        (await linkCopy.getAttribute("data-copy")) !== text) {
      throw new Error(`Dashboard promotion link failed: ${text}`);
    }
  }
  await assertPromotionLink("register", "zh-cn");
  const pageOptions = [
    ["官方首页", "home"], ["Standard·MT5开户页", "standard-mt5"], ["Pro·MT4开户页", "pro-mt4"],
    ["Zero·MT5开户页", "zero-mt5"], ["官方注册页", "register"]
  ];
  const languageOptions = [["English", "en"], ["ไทย", "th"], ["Tiếng Việt", "vi"], ["简体中文", "zh-cn"]];
  for (const [label, pageCode] of pageOptions) {
    await page.click("[data-dashboard-picker='page']");
    await page.fill("[data-dashboard-link-search='page']", label);
    await page.click(`[data-dashboard-link-page='${label}']`);
    await assertPromotionLink(pageCode, "zh-cn");
    for (const [language, languageCode] of languageOptions) {
      await page.click("[data-dashboard-picker='language']");
      await page.fill("[data-dashboard-link-search='language']", language);
      await page.click(`[data-dashboard-link-language='${language}']`);
      await assertPromotionLink(pageCode, languageCode);
    }
  }
  await page.click("[data-dashboard-picker='page']");
  await page.click("[data-dashboard-link-page='Standard·MT5开户页']");
  await page.click("[data-dashboard-picker='language']");
  await page.click("[data-dashboard-link-language='English']");
  await page.reload({ waitUntil: "domcontentloaded" });
  await assertPromotionLink("standard-mt5", "en");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseUrl });
  await linkCopy.click();
  await page.waitForFunction(() => document.querySelector(".dashboard-link-address [data-copy]").classList.contains("is-copied"));
  if ((await page.evaluate(() => navigator.clipboard.readText())) !== (await linkAddress.innerText())) {
    throw new Error("Dashboard promotion link clipboard mismatch");
  }

  for (const width of [1920, 1110, 991, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    await page.mouse.move(width - 5, 400);
    await page.waitForTimeout(250);
    const tutorial = await page.locator(".tutorial-card").evaluate(node => {
      const main = document.querySelector("#main");
      const style = getComputedStyle(main);
      const mainWidth = main.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const rect = node.getBoundingClientRect();
      return { width: rect.width, mainWidth, images: node.querySelectorAll("img").length };
    });
    const expectedWidth = width >= 992 ? (tutorial.mainWidth - 32) / 2.5 : tutorial.mainWidth; // support row is 1.5fr tracker : 1fr guidance
    if (tutorial.images || Math.abs(tutorial.width - expectedWidth) > 2) {
      throw new Error(`Tutorial layout failed at ${width}px: ${JSON.stringify(tutorial)}`);
    }
    const summaryPosition = await page.locator(".dashboard-promotion-grid").evaluate(node => ({
      width: node.getBoundingClientRect().width,
      linkWidth: document.querySelector(".dashboard-link-controls").closest(".card").getBoundingClientRect().width
    }));
    const expectedLinkWidth = width > 991
      ? (summaryPosition.width - 32) / 2
      : summaryPosition.width;
    if (Math.abs(summaryPosition.linkWidth - expectedLinkWidth) > 2) {
      throw new Error(`Dashboard summary position failed at ${width}px: ${JSON.stringify(summaryPosition)}`);
    }
    const layout = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
      return {
        link: rect(".dashboard-link-card"), materials: rect(".dashboard-materials"),
        tutorial: rect(".tutorial-card"), status: rect(".dashboard-client-status"),
        stack: rect(".dashboard-guidance-stack"),
        image: document.querySelector(".dashboard-material-image").naturalWidth
      };
    });
    if (!layout.image || Math.abs(layout.link.width - layout.materials.width) > 2) throw new Error(`Materials sizing failed: ${JSON.stringify(layout)}`);
    const promotionGap = layout.materials.left - layout.link.right;
    if (width > 991 && (Math.abs(promotionGap - 32) > 2 || Math.abs(layout.link.top - layout.materials.top) > 2)) throw new Error("Promotion panels should keep the desktop boundary");
    if (width <= 991 && layout.materials.top < layout.link.bottom + 15) throw new Error("Promotion panels should separate and stack");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 2) throw new Error(`Dashboard overflow at ${width}px: ${overflow}`);
    await page.screenshot({ path: path.join(process.cwd(), ".artifacts", `dashboard-${width}.png`), fullPage: true });
  }
  await page.locator("#main").hover();
  await page.click("#wallet-toggle");
  if (!(await page.locator("#wallet-popover").isVisible())) throw new Error("Mobile wallet click failed");
  const popupBounds = await page.locator("#wallet-popover").boundingBox();
  if (!popupBounds || popupBounds.x < 0 || popupBounds.x + popupBounds.width > 390) throw new Error("Mobile wallet popover overflow");
  await page.screenshot({ path: path.join(process.cwd(), ".artifacts", "wallet-mobile.png") });
  await page.locator("#wallet-toggle").press("Escape");
  if (await page.locator("#wallet-popover").isVisible()) throw new Error("Wallet escape failed");
  await page.locator("#wallet-toggle").press("ArrowDown");
  if ((await page.evaluate(() => document.activeElement?.dataset?.route)) !== "wd") throw new Error("Wallet keyboard navigation failed");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.locator(".dashboard-client-status [data-route='lookup']").click();
  assertText(await page.title(), "归属查询", "Client status route");
  await page.click("#nav [data-route='dash']");
  await page.locator(".dashboard-material-banner").click();
  await page.waitForFunction(() => document.title.includes("素材库"));
  assertText(await page.title(), "素材库", "Materials route");
  await page.click("#nav [data-route='dash']");
  await page.locator(".tutorial-card").click();
  await page.waitForFunction(() => document.title.includes("合作者计划"));
  assertText(await page.title(), "合作者计划", "Tutorial route");
  await page.click("#nav [data-route='dash']");

  await page.locator("#avatar-button").hover();
  await page.waitForTimeout(220);
  const avatarHoverBackground = await page.locator("#avatar-button").evaluate(node => getComputedStyle(node).backgroundColor);
  if (avatarHoverBackground !== shellState.avatarTriggerBackground || avatarHoverBackground !== "rgba(0, 0, 0, 0)") {
    throw new Error(`Avatar hover background failed: ${avatarHoverBackground}`);
  }
  let dropdownState = await page.locator("#account-dropdown").evaluate(node => ({
    open: node.closest(".account-menu").classList.contains("open"),
    visibility: getComputedStyle(node).visibility,
    opacity: getComputedStyle(node).opacity
  }));
  if (!dropdownState.open || dropdownState.visibility !== "visible" || Number(dropdownState.opacity) < 0.99) throw new Error("Account dropdown hover failed");
  const dropdownText = await page.locator("#account-dropdown").innerText();
  assertText(dropdownText, "个人中心", "Personal center menu item");
  assertText(dropdownText, "退出登录", "Logout menu item");
  const accountItem = page.locator("#account-dropdown [data-route='account']");
  const itemBackgroundBefore = await accountItem.evaluate(node => getComputedStyle(node).backgroundColor);
  await accountItem.hover();
  await page.waitForTimeout(120);
  const itemBackgroundAfter = await accountItem.evaluate(node => getComputedStyle(node).backgroundColor);
  if (itemBackgroundBefore === itemBackgroundAfter) throw new Error("Account menu hover background failed");

  await accountItem.click();
  await page.waitForSelector(".account-page");
  const accountText = await page.locator(".account-page").innerText();
  for (const expected of ["账户状态", "资料完整度", "收款资料", "可用能力"]) {
    if (!accountText.includes(expected)) throw new Error(`Account center missing ${expected}`);
  }
  await page.click(".account-tabs [data-account-tab='security']");
  assertText(await page.locator(".account-page").innerText(), "接收邮件通知", "Email notification preference");

  await page.locator("#avatar-button").hover();
  await page.click("[data-action='logout']");
  await page.waitForSelector("#login-view:not(.hidden)");
  if (await page.locator("#app-view:not(.hidden)").count()) throw new Error("Logout did not hide app view");
  await page.fill("#login-form input[name=email]", "demo-user@example.com");
  await page.fill("#login-form input[name=password]", "demo-password");
  await page.click("#login-form button[type=submit]");
  await page.waitForSelector("#app-view:not(.hidden)");
  await page.keyboard.press("Escape");

  await page.focus("#avatar-button");
  await page.waitForTimeout(100);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(300);
  const focusedMenuAction = await page.evaluate(() =>
    document.activeElement?.classList?.contains("account-menu-item") ? (document.activeElement.dataset.action || document.activeElement.dataset.route || document.activeElement.getAttribute("href")) : null);
  if (!focusedMenuAction) throw new Error(`Account menu keyboard focus failed: ${await page.evaluate(() => ({tag: document.activeElement?.tagName, class: document.activeElement?.className, text: document.activeElement?.innerText}))}`);
  if (!(await page.locator("#account-menu").evaluate(node => node.classList.contains("open")))) throw new Error("Account menu keyboard open failed");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  if (await page.locator("#account-menu").evaluate(node => node.classList.contains("open"))) throw new Error("Account menu escape failed");

  for (const [route, label] of routes) {
    if (route === "apply") {
      await page.click("#profile-entry");
      await page.locator(".program-navigation footer .primary").click();
    } else if (route === "onboarding") {
      await page.goto(`${baseUrl}/#/onboarding`, { waitUntil: "domcontentloaded" });
    } else if (route === "statements") {
      await page.goto(`${baseUrl}/#/${route}`, { waitUntil: "domcontentloaded" });
    } else if (route === "dash") {
      await page.click("#nav [data-route='dash']");
    } else if (route === "account") {
      await page.click("#avatar-button");
      await page.click("#account-dropdown [data-route='account']");
    } else {
      const parent = page.locator(`[data-nav-group='${routeGroups[route]}']`);
      if ((await parent.getAttribute("aria-expanded")) !== "true") await parent.click();
      await page.click(`#nav [data-route='${route}']`);
    }
    await page.waitForTimeout(80);
    assertText(await page.title(), label, `${route} route`);
    if (await page.locator(".modal-layer:not(.hidden)").count()) await page.click("[data-action='close-modal']");
  }

  await page.goto(`${baseUrl}/#/dash`, { waitUntil: "domcontentloaded" });
  assertText(await page.locator("#kyc-banner").innerText(), "您的账户资料未完善，部分功能可能受限。", "Account completion banner text");
  await page.click("#kyc-banner span");
  await page.waitForFunction(() => document.title.includes("入驻申请"));
  if ((await page.evaluate(() => AFF.state.route)) !== "onboarding") throw new Error("KYC banner whole-area click failed");
  await page.evaluate(() => {
    AFF.state.programCompleted = false;
    AFF.state.kycDismissed = false;
    navigate("dash");
  });
  await page.click("#dismiss-kyc");
  await page.evaluate(() => navigate("wd"));
  assertText(await page.title(), "提现", "Withdrawal route");
  if (!(await page.locator("#kyc-banner").isHidden())) throw new Error("KYB banner should hide on withdrawal page");
  await page.goto(`${baseUrl}/#/onboarding`, { waitUntil: "domcontentloaded" });
  let onboardingText = await page.locator("#main").innerText();
  assertText(onboardingText, "注册 → 资料 → KYC 提交 → 协议 → 资质审核。", "Onboarding subtitle");
  const onboardingSteps = await page.locator(".steps .step-label").allTextContents();
  if (onboardingSteps.join("|") !== "注册账号|基本资料与渠道|KYC 提交|接受协议与准则|资质审核") {
    throw new Error(`Onboarding steps failed: ${onboardingSteps}`);
  }
  if (!(await page.locator("[data-action='onboarding-next']").isDisabled())) throw new Error("Onboarding email gate failed");
  await page.click("[data-action='verify-onboarding-email']");
  assertText(await page.locator("#main").innerText(), "已验证", "Onboarding verified email");
  await page.click("[data-action='onboarding-next']");
  onboardingText = await page.locator("#main").innerText();
  assertText(onboardingText, "基本资料与渠道", "Onboarding profile title");
  if (await page.locator("[data-onboarding-country-selection]").count()) {
    throw new Error("Optional onboarding profile fields should be hidden by default");
  }
  await page.click("[data-action='toggle-onboarding-details']");
  assertText(await page.locator("#main").innerText(), "推广渠道类型", "Onboarding profile channel");
  await page.fill("[data-onboarding-name]", "Affiliate Partner");
  const onboardingCountries = page.locator(".profile-select").filter({ has: page.locator("[data-onboarding-country-selection]") });
  await onboardingCountries.locator("summary").click();
  await onboardingCountries.locator("[data-profile-selection-search]").fill("Vietnam");
  await onboardingCountries.locator("[data-profile-selection-choice][value='越南']").check();
  await onboardingCountries.locator("[data-profile-selection-search]").fill("Thailand");
  await onboardingCountries.locator("[data-profile-selection-choice][value='泰国']").check();
  await onboardingCountries.locator("summary").click();
  await page.fill("[data-onboarding-profile='websites']", "https://example.com,https://app.example.com");
  await page.click("[data-action='onboarding-next']");
  onboardingText = await page.locator("#main").innerText();
  assertText(onboardingText, "KYC 提交", "Onboarding KYC title");
  assertText(onboardingText, "请前往认证页面完成身份认证，完成后返回此页面继续申请。", "Onboarding KYC guide");
  assertText(onboardingText, "去完成", "Onboarding KYC redirect action");
  if (onboardingText.includes("CRM") || onboardingText.includes("模拟提交 KYC")) {
    throw new Error("Onboarding KYC screen should use the external verification handoff copy");
  }
  await page.click("[data-action='open-onboarding-kyc']");
  assertText(await page.locator("#toast").innerText(), "已打开认证页面", "Onboarding KYC redirect feedback");
  await page.click("[data-action='complete-onboarding-kyc']");
  onboardingText = await page.locator("#main").innerText();
  assertText(onboardingText, "接受协议与准则", "Onboarding agreements title");
  if (!(await page.locator("[data-action='onboarding-next']").isDisabled())) throw new Error("Onboarding agreement gate failed");
  await page.click("[data-action='open-onboarding-agreement'][data-agreement-index='1']");
  await page.waitForSelector(".onboarding-agreement-modal");
  assertText(await page.locator(".onboarding-agreement-modal").innerText(), "摘要：约定合作范围、佣金结算方式、双方权利义务与终止条款。", "Onboarding agreement modal");
  await page.check("[data-onboarding-agreement-draft]");
  await page.click("[data-action='accept-onboarding-agreement']");
  if (!(await page.locator("[data-onboarding-agreement='0']").isChecked())) throw new Error("Onboarding modal acceptance failed");
  await page.check("[data-onboarding-agreement='1']");
  await page.check("[data-onboarding-agreement='2']");
  await page.click("[data-action='onboarding-next']");
  onboardingText = await page.locator("#main").innerText();
  assertText(onboardingText, "资质审核", "Onboarding submit title");
  await page.click("[data-action='submit-onboarding']");
  onboardingText = await page.locator("#main").innerText();
  assertText(onboardingText, "审核中", "Onboarding review status");
  if (await page.locator(".onboarding-submitted, [data-action='simulate-onboarding-review']").count()) {
    throw new Error("Onboarding should submit directly without the redundant submitted panel");
  }
  if (onboardingText.includes("首个链接启用门禁") || onboardingText.includes("资质审核通过前，推广链接保持不可用")) {
    throw new Error("Onboarding review screen should not show link-gate copy");
  }
  await page.click("[data-onboarding-step='1']");
  assertText(await page.locator("#main").innerText(), "已验证", "Onboarding back navigation");

  await page.click("[data-route='perf']");
  await page.click("[data-rp-action='filters']");
  await page.selectOption("[data-rp-filter='source']", "Telegram");
  await page.click("[data-rp-action='apply']");
  await page.click("[data-rp-action='groups']");
  await page.click("[data-rp-add-group='country']");
  assertText(await page.locator("#main").innerText(), "国家", "Performance grouping");
  await page.click("[data-rp-view='chart']");
  await page.waitForSelector(".report-chart");
  const performanceChart = await page.evaluate(() => ({
    view: AFF.reports.state().view,
    type: document.querySelector(".report-chart-type").innerText,
    bars: document.querySelectorAll(".report-bar-row").length,
    metricButtons: document.querySelectorAll("[data-rp-chart-metric]").length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
  if (performanceChart.view !== "chart" || performanceChart.type !== "横向柱状图" ||
      performanceChart.bars <= 0 || performanceChart.bars > 12 || performanceChart.metricButtons !== 6 || performanceChart.overflow > 2) {
    throw new Error(`Performance chart state failed: ${JSON.stringify(performanceChart)}`);
  }
  await page.click("[data-rp-chart-metric='expected']");
  if ((await page.evaluate(() => AFF.reports.state().chartMetric)) !== "expected") throw new Error("Performance chart metric switch failed");
  await page.click("[data-rp-remove-group='country']");
  await page.waitForSelector(".report-chart-line");
  if ((await page.locator(".report-chart-type").innerText()) !== "折线图") throw new Error("Performance time-dimension chart type failed");
  const lineChartValues = await page.evaluate(() => ({
    axisLabels: document.querySelectorAll(".report-chart-y span").length,
    points: document.querySelectorAll(".report-chart-point").length,
    pointOpacity: getComputedStyle(document.querySelector(".report-chart-point"), "::after").opacity,
    summary: document.querySelector(".report-chart-head span").innerText
  }));
  if (lineChartValues.axisLabels !== 5 || lineChartValues.points === 0 || lineChartValues.pointOpacity !== "1" ||
      !lineChartValues.summary.includes("总计") || !lineChartValues.summary.includes("最新")) {
    throw new Error(`Performance line chart values failed: ${JSON.stringify(lineChartValues)}`);
  }
  await page.click("[data-rp-view='table']");
  const performanceTableRestored = await page.evaluate(() => ({
    view: AFF.reports.state().view,
    hasTable: !!document.querySelector(".report-table"),
    hasChart: !!document.querySelector(".report-chart"),
    sourceFilter: AFF.reports.state().filters.source
  }));
  if (performanceTableRestored.view !== "table" || !performanceTableRestored.hasTable || performanceTableRestored.hasChart ||
      performanceTableRestored.sourceFilter !== "Telegram") {
    throw new Error(`Performance table restore failed: ${JSON.stringify(performanceTableRestored)}`);
  }

  await page.click("[data-route='clients']");
  await page.locator("[data-rp-client]").first().click();
  assertText(await page.locator(".report-drawer").innerText(), "三层状态", "Client three-layer status");
  assertText(await page.locator(".report-drawer").innerText(), "转化阶段", "Client conversion stage");
  await page.locator(".report-drawer [data-rp-action='close']").first().click();

  await page.click("[data-route='promo']");
  await page.click("[data-action='open-campaign-modal']");
  await page.click("[data-action='create-campaign']");
  await page.fill("#campaign-name", "");
  await page.click("[data-action='create-campaign']");
  await page.fill("#campaign-name", "十一月测试");
  await page.click("[data-action='create-campaign']");
  assertText(await page.locator("#main").innerText(), "十一月测试", "Campaign creation");
  await page.click("[data-route='subchannels']");
  await page.fill("[data-sc-filter='search']", "tg_group_01");
  await page.locator("[data-sc-filter-form] button[type='submit']").click();
  await page.click("[data-sc-toggle='tg_group_01']");
  assertText(await page.locator(".sc-table tbody tr").innerText(), "自己停用", "Sub ID state");
  await page.locator("[data-sc-detail='tg_group_01']").click();
  assertText(await page.locator(".sc-drawer").innerText(), "渠道表现", "Subchannel detail");
  await page.locator(".sc-drawer header [data-sc-action='close']").click();

  await page.click("[data-route='tracker']");
  assertText(await page.locator("#main").innerText(), "回传配置", "Tracker page");
  await page.click("[data-action='open-tracker-modal']");
  await page.fill("#postback-name", "十月注册回传");
  await page.selectOption("#postback-event", "registration");
  await page.fill("#postback-endpoint", "https://tracker.example.com/postback");
  await page.click("[data-action='create-tracker']");
  assertText(await page.locator("#main").innerText(), "十月注册回传", "Tracker creation");
  const trackerRow = page.locator("tbody tr").filter({ hasText: "十月注册回传" }).first();
  await trackerRow.locator("[data-action='postback-toggle']").click();
  assertText(await trackerRow.innerText(), "暂停", "Tracker toggle");
  await trackerRow.locator("[data-action='postback-copy']").click();
  if ((await page.evaluate(() => navigator.clipboard.readText())) !== await trackerRow.locator(".postback-url").innerText()) throw new Error("Tracker copy URL failed");

  await page.click("[data-route='pay']");
  await page.locator("[data-earn-appeal]").first().click();
  await page.click("[data-earn-action='submit-appeal']");
  await page.fill("#earn-appeal-reason", "补充证据");
  await page.click("[data-earn-action='submit-appeal']");
  assertText(await page.locator("#main").innerText(), "申诉中", "Appeal submission");
  await page.locator(".earn-drawer > header [data-earn-action='close']").click();

  await page.click("[data-route='lookup']");
  await page.waitForTimeout(250);
  await page.fill("#lookup-input", "C-10241");
  await page.click("[data-action='lookup']");
  assertText(await page.locator("#main").innerText(), "标准点击归属窗口", "Attribution lookup");

  await page.click("[data-route='assets']");
  assertText(await page.locator("#main").innerText(), "使用素材前，请先阅读推广行为准则", "Asset gate");
  const mosaicPreviews = await page.locator(".asset-banner-card .asset-preview, .asset-video-card .asset-preview, .asset-gif-card .asset-preview").evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    const placeholder = node.querySelector(".asset-placeholder-image");
    return {
      ratio: getComputedStyle(node).aspectRatio,
      actualRatio: rect.width / rect.height,
      source: placeholder?.getAttribute("src"),
      local: placeholder ? new URL(placeholder.src).origin === location.origin : false
    };
  }));
  if (mosaicPreviews.length !== 9 ||
      mosaicPreviews.some(item => item.ratio !== "4 / 3" || Math.abs(item.actualRatio - 4 / 3) > .01 || !item.local || !/^\.\/assets\/placeholder-(markets|mobile|campaign)\.png$/.test(item.source))) {
    throw new Error(`Mosaic preview geometry failed: ${JSON.stringify(mosaicPreviews)}`);
  }
  if ((await page.locator(".asset-actions [data-download]:enabled").count()) !== 0) {
    throw new Error("Locked asset downloads should be disabled");
  }
  if ((await page.locator(".asset-preview-button:enabled").count()) !== 0) {
    throw new Error("Locked variant previews should be disabled");
  }
  await page.click("[data-action='open-code-modal']");
  await page.click("[data-action='accept-code']");
  await page.waitForTimeout(250);
  const assetTabs = await page.locator(".asset-tabs button").evaluateAll(nodes => nodes.map(node => ({
    text: node.innerText,
    selected: node.getAttribute("aria-selected") === "true"
  })));
  if (assetTabs.map(tab => tab.text).join("|") !== "全部|横幅|视频|落地页|GIF" || !assetTabs[0].selected) {
    throw new Error(`Asset category tabs failed: ${JSON.stringify(assetTabs)}`);
  }
  const assetText = await page.locator("#main").innerText();
  for (const removedFilter of ["搜索素材", "活动", "Sub ID", "排序", "重置筛选"]) {
    if (assetText.includes(removedFilter)) throw new Error(`Unwanted asset filter remains: ${removedFilter}`);
  }
  if (await page.locator(".asset-tabs-card select, .asset-tabs-card input").count()) {
    throw new Error("Asset tabs card should contain controls only for category switching");
  }
  assertText(assetText, "已展示 12 / 12 个", "Asset initial count");
  if ((await page.locator(".asset-landing-card").count()) !== 3) throw new Error("Asset landing card count failed");
  if ((await page.locator(".asset-video-card").count()) !== 3) throw new Error("Asset video card count failed");
  if ((await page.locator(".asset-gif-card").count()) !== 2) throw new Error("Asset GIF card count failed");
  const assetGridColumns = await page.locator(".asset-grid").evaluate(node => getComputedStyle(node).gridTemplateColumns.split(" ").length);
  if (assetGridColumns !== 4) throw new Error(`Asset grid should have four columns: ${assetGridColumns}`);
  const assetVariantFonts = await page.locator(".asset-variant-row strong, .asset-variant-row span, .asset-variant-row em").evaluateAll(nodes =>
    nodes.map(node => getComputedStyle(node).fontSize)
  );
  if (assetVariantFonts.some(size => size !== "11px")) {
    throw new Error(`Asset variant typography failed: ${JSON.stringify([...new Set(assetVariantFonts)])}`);
  }
  await page.click("[data-assets-filter='type'][data-value='横幅']");
  if ((await page.locator(".asset-card").count()) !== 4) throw new Error("Asset banner tab failed");
  const bannerVariantCards = await page.locator(".asset-banner-card").evaluateAll(cards => cards.map(card => [...card.querySelectorAll(".asset-variant-row")].map(node => ({
    label: node.querySelector("strong")?.textContent,
    values: [...node.querySelectorAll("span")].map(item => item.textContent),
    count: node.querySelector("em")?.textContent
  }))));
  const expectedBannerCounts = [["+12", "+12"], ["+9", "+8"], ["+4", "+5"], [undefined, undefined]];
  if (bannerVariantCards.length !== 4 ||
      bannerVariantCards.some((rows, cardIndex) => rows.some((row, rowIndex) => row.count !== expectedBannerCounts[cardIndex][rowIndex])) ||
      bannerVariantCards.some(rows => rows.some(row => !["尺寸", "语言"].includes(row.label))) ||
      bannerVariantCards[0][0].values.join("|") !== "120x600|160x600|300x250" ||
      bannerVariantCards[0][1].values.join("|") !== "简体中文|英语|泰语" ||
      bannerVariantCards[3][0].values.length !== 3 || bannerVariantCards[3][1].values.length !== 1) {
    throw new Error(`Banner variant summary failed: ${JSON.stringify(bannerVariantCards)}`);
  }
  const firstBanner = page.locator(".asset-banner-card").first();
  await firstBanner.locator(".asset-preview-button").click();
  await page.waitForSelector(".asset-detail-drawer");
  assertText(await page.locator(".asset-detail-drawer").innerText(), "品牌展示横幅", "Banner drawer title");
  assertText(await page.locator(".asset-detail-drawer").innerText(), "a标签完整文本", "Banner anchor section");
  const bannerLanguageLabels = await page.locator("[data-asset-detail-option='language'] option").allTextContents();
  if (bannerLanguageLabels.slice(0, 3).join("|") !== "简体中文|英语|泰语") {
    throw new Error(`Localized language labels failed: ${bannerLanguageLabels.slice(0, 3)}`);
  }
  await page.selectOption("[data-asset-detail-option='size']", "300x250");
  await page.selectOption("[data-asset-detail-option='language']", "English");
  await page.selectOption("[data-asset-detail-option='device']", "APP");
  const bannerAnchor = await page.locator("#asset-anchor-code").innerText();
  const bannerHref = bannerAnchor.match(/href="([^"]+)"/)?.[1];
  if (!bannerHref) throw new Error(`Banner anchor href missing: ${bannerAnchor}`);
  const bannerUrl = new URL(bannerHref);
  if (bannerUrl.searchParams.get("material_size") !== "300x250" ||
      bannerUrl.searchParams.get("material_language") !== "English" ||
      bannerUrl.searchParams.get("material_device") !== "APP" ||
      !bannerAnchor.includes('target="_blank"') || !bannerAnchor.includes('rel="noopener noreferrer"')) {
    throw new Error(`Banner variant anchor failed: ${bannerAnchor}`);
  }
  await page.click(".asset-detail-drawer [data-copy]");
  await page.waitForTimeout(150);
  if ((await page.evaluate(() => navigator.clipboard.readText())) !== bannerAnchor) throw new Error("Banner anchor clipboard failed");
  await page.click("[data-action='download-asset-variant']");
  await page.click(".asset-detail-drawer .aff-drawer-close");
  await page.click("[data-assets-filter='type'][data-value='视频']");
  if ((await page.locator(".asset-card").count()) !== 3) throw new Error("Asset video tab failed");
  const firstVideo = page.locator(".asset-video-card").first();
  const videoVariantRows = await firstVideo.locator(".asset-variant-row").evaluateAll(nodes => nodes.map(node => ({
    label: node.querySelector("strong")?.textContent,
    values: [...node.querySelectorAll("span")].map(item => item.textContent),
    count: node.querySelector("em")?.textContent
  })));
  if (videoVariantRows.length !== 2 ||
      videoVariantRows.some(row => !["尺寸", "语言"].includes(row.label)) ||
      videoVariantRows[0].values.join("|") !== "横向|纵向" || videoVariantRows[0].count ||
      videoVariantRows[1].values.join("|") !== "简体中文|英语|泰语" || videoVariantRows[1].count !== "+9") {
    throw new Error(`Video variant summary failed: ${JSON.stringify(videoVariantRows)}`);
  }
  await firstVideo.locator(".asset-preview-button").click();
  await page.waitForSelector(".asset-detail-drawer");
  assertText(await page.locator(".asset-detail-drawer").innerText(), "开户引导视频", "Video drawer title");
  assertText(await page.locator(".asset-detail-drawer").innerText(), "iframe标签代码", "Video iframe section");
  await page.click(".asset-video-preview");
  if (!(await page.locator(".asset-video-preview").evaluate(node => node.classList.contains("playing")))) {
    throw new Error("Video preview playback toggle failed");
  }
  await page.check("[data-asset-video-option='loop']");
  await page.check("[data-asset-video-option='muted']");
  await page.check("[data-asset-video-option='autoplay']");
  await page.selectOption("[data-asset-detail-option='size']", "纵向");
  await page.selectOption("[data-asset-detail-option='language']", "English");
  const videoIframe = await page.locator("#asset-iframe-code").innerText();
  const videoSrc = videoIframe.match(/src="([^"]+)"/)?.[1];
  if (!videoSrc || !videoIframe.startsWith("<iframe ") || !videoIframe.endsWith("</iframe>") ||
      !videoIframe.includes('width="720"') || !videoIframe.includes('height="1280"') ||
      !videoIframe.includes('allow="autoplay; fullscreen; picture-in-picture"')) {
    throw new Error(`Video iframe failed: ${videoIframe}`);
  }
  const videoUrl = new URL(videoSrc);
  if (videoUrl.searchParams.get("material_size") !== "纵向" ||
      videoUrl.searchParams.get("material_language") !== "English" ||
      videoUrl.searchParams.get("video_loop") !== "1" ||
      videoUrl.searchParams.get("video_muted") !== "1" ||
      videoUrl.searchParams.get("video_autoplay") !== "1") {
    throw new Error(`Video iframe parameters failed: ${videoSrc}`);
  }
  await page.click(".asset-detail-drawer [data-copy]");
  await page.waitForTimeout(150);
  if ((await page.evaluate(() => navigator.clipboard.readText())) !== videoIframe) throw new Error("Video iframe clipboard failed");
  await page.click("[data-action='download-asset-variant']");
  await page.click(".asset-detail-drawer .aff-drawer-close");
  await page.click("[data-assets-filter='type'][data-value='GIF']");
  if ((await page.locator(".asset-card").count()) !== 2) throw new Error("Asset GIF tab failed");
  const firstGif = page.locator(".asset-gif-card").first();
  const gifVariantRows = await firstGif.locator(".asset-variant-row").evaluateAll(nodes => nodes.map(node => ({
    label: node.querySelector("strong")?.textContent,
    values: [...node.querySelectorAll("span")].map(item => item.textContent),
    count: node.querySelector("em")?.textContent
  })));
  if (gifVariantRows.length !== 2 ||
      gifVariantRows[0].label !== "语言" || gifVariantRows[1].label !== "尺寸" ||
      gifVariantRows[0].values.join("|") !== "简体中文|英语|泰语" || gifVariantRows[0].count !== "+12" ||
      gifVariantRows[1].values.join("|") !== "120x60|120x90|125x125" || gifVariantRows[1].count !== "+9") {
    throw new Error(`GIF variant summary failed: ${JSON.stringify(gifVariantRows)}`);
  }
  await firstGif.locator(".asset-preview-button").click();
  await page.waitForSelector(".asset-gif-drawer");
  const gifFieldLabels = await page.locator(".asset-gif-fields .field > span:not(.aff-dd)").allTextContents();
  if (gifFieldLabels.join("|") !== "语言|尺寸|平台") throw new Error(`GIF drawer field order failed: ${gifFieldLabels}`);
  await page.selectOption("[data-asset-detail-option='language']", "English");
  await page.selectOption("[data-asset-detail-option='size']", "300x250");
  await page.selectOption("[data-asset-detail-option='platform']", "APP");
  const gifAnchor = await page.locator("#asset-gif-anchor-code").innerText();
  const gifHref = gifAnchor.match(/href="([^"]+)"/)?.[1];
  if (!gifHref || !gifAnchor.includes('target="_blank"') || !gifAnchor.includes('rel="noopener noreferrer"')) {
    throw new Error(`GIF anchor failed: ${gifAnchor}`);
  }
  const gifUrl = new URL(gifHref);
  if (gifUrl.searchParams.get("material_language") !== "English" ||
      gifUrl.searchParams.get("material_size") !== "300x250" ||
      gifUrl.searchParams.get("material_platform") !== "APP") {
    throw new Error(`GIF anchor parameters failed: ${gifHref}`);
  }
  await page.click(".asset-gif-drawer [data-copy]");
  await page.waitForTimeout(150);
  if ((await page.evaluate(() => navigator.clipboard.readText())) !== gifAnchor) throw new Error("GIF anchor clipboard failed");
  await page.click("[data-action='download-asset-variant']");
  await page.click(".asset-gif-drawer .aff-drawer-close");
  await page.click("[data-assets-filter='type'][data-value='落地页']");
  if ((await page.locator(".asset-card").count()) !== 3) throw new Error("Asset landing tab failed");
  const firstLanding = page.locator(".asset-landing-card").first();
  const landingRows = await firstLanding.locator(".asset-variant-row").evaluateAll(nodes => nodes.map(node => ({
    label: node.querySelector("strong")?.textContent,
    values: [...node.querySelectorAll("span")].map(item => item.textContent),
    count: node.querySelector("em")?.textContent
  })));
  if (landingRows.length !== 1 || landingRows[0].label !== "语言" ||
      landingRows[0].values.join("|") !== "简体中文|英语|泰语" || landingRows[0].count !== "+12") {
    throw new Error(`Landing language summary failed: ${JSON.stringify(landingRows)}`);
  }
  await firstLanding.locator(".asset-preview-button").click();
  await page.waitForSelector(".asset-landing-drawer");
  const landingScroll = await page.locator(".asset-landing-preview").evaluate(node => ({
    overflow: getComputedStyle(node).overflowY,
    scrollHeight: node.scrollHeight,
    clientHeight: node.clientHeight
  }));
  if (landingScroll.overflow !== "auto" || landingScroll.scrollHeight <= landingScroll.clientHeight) {
    throw new Error(`Landing preview scroll failed: ${JSON.stringify(landingScroll)}`);
  }
  await page.selectOption("[data-asset-detail-option='language']", "English");
  const landingUrlText = await page.locator("#asset-landing-url").innerText();
  const landingUrl = new URL(landingUrlText);
  if (landingUrl.pathname !== "/register" ||
      landingUrl.searchParams.get("page") !== "standard" ||
      landingUrl.searchParams.get("material_language") !== "English") {
    throw new Error(`Landing URL failed: ${landingUrlText}`);
  }
  const landingView = page.locator(".asset-landing-actions a.button.primary");
  if ((await landingView.getAttribute("href")) !== landingUrlText ||
      (await landingView.getAttribute("target")) !== "_blank" ||
      (await landingView.getAttribute("rel")) !== "noopener noreferrer") {
    throw new Error("Landing view link failed");
  }
  await page.click(".asset-landing-actions [data-copy]");
  await page.waitForTimeout(150);
  if ((await page.evaluate(() => navigator.clipboard.readText())) !== landingUrlText) throw new Error("Landing URL clipboard failed");
  await page.click(".asset-landing-drawer .aff-drawer-close");
  if (await page.locator("[data-action='load-more-assets']").count()) throw new Error("Asset load more should be hidden when all records fit one batch");

  await page.click("#profile-entry");
  await page.locator(".program-navigation footer .primary").click();
  const profileEntryText = await page.locator("#profile-entry").innerText();
  if (!profileEntryText.includes("合作者计划")) {
    throw new Error(`Partner program entry failed: ${profileEntryText}`);
  }
  const programSteps = ["查看佣金奖励", "高转化地区", "查看支持地区", "素材库总览", "收益与系统指引", "分享简介链接", "回传链接指引"];
  const stepsText = await page.locator(".steps").innerText();
  for (const step of programSteps) assertText(stepsText, step, `Partner program step: ${step}`);
  let programText = await page.locator("#main").innerText();
  if (programText.includes("Commission Reward")) throw new Error("Commission page eyebrow should be removed");
  assertText(programText, "L1-L4资格档与国家佣金", "Commission page title");
  assertText(programText, "了解佣金的组成，再按推广国家查看相应资格要求与奖励。", "Commission page subtitle");
  if (!(await page.locator(".commission-selector-card .commission-page-head > div > p").first().isVisible())) {
    throw new Error("Commission subtitle is not visible");
  }
  assertText(programText, "如何获得佣金", "How to earn commission");
  assertText(programText, "如何成为有效交易者", "How to become valid trader");
  if (
    programText.includes("数据结构" + "参考") ||
    programText.includes("参考" + "佣金") ||
    programText.includes("Mock" + "分析") ||
    programText.includes("Mock" + "配置") ||
    programText.includes(["Q", "021"].join("-"))
  ) throw new Error("Partner program contains internal development notes");
  if (await page.locator("[data-program-amount]").count()) throw new Error("Commission amount input should be removed");
  if (await page.locator(".program-metric-grid").count()) throw new Error("Commission metric grid should be removed");
  const stepLayout = await page.locator(".step").first().evaluate(node => {
    const number = node.querySelector(".step-number").getBoundingClientRect();
    const label = node.querySelector(".step-label").getBoundingClientRect();
    return { numberBottom: number.bottom, labelTop: label.top };
  });
  if (stepLayout.labelTop < stepLayout.numberBottom) throw new Error(`Step label is not below progress node: ${JSON.stringify(stepLayout)}`);
  const defaultModuleCount = await page.locator(".commission-module").count();
  if (defaultModuleCount !== 3) throw new Error(`Default commission country count failed: ${defaultModuleCount}`);
  const defaultCountries = await page.locator(".commission-module header h3").allTextContents();
  if (defaultCountries.slice().sort().join(",") !== "尼日利亚,沙特阿拉伯,泰国") throw new Error(`Default highest-commission countries failed: ${defaultCountries}`);
  const commissionGridColumns = await page.locator(".commission-module-grid").evaluate(node => getComputedStyle(node).gridTemplateColumns.split(" ").length);
  if (commissionGridColumns !== 3) throw new Error(`Commission module columns failed: ${commissionGridColumns}`);
  const commissionHeaders = await page.locator(".commission-module").first().locator("th").allTextContents();
  if (commissionHeaders.length !== 3 || !commissionHeaders.includes("资格档") || !commissionHeaders.includes("参考CPA")) {
    throw new Error(`Commission table headers failed: ${JSON.stringify(commissionHeaders)}`);
  }

  await page.click("[data-action='toggle-country-picker']");
  const commissionCountryCount = await page.locator(".country-option").count();
  if (commissionCountryCount !== 12) throw new Error(`Commission country count failed: ${commissionCountryCount}`);
  const defaultSelectedOptions = await page.locator(".country-option[aria-selected='true']").evaluateAll(nodes => nodes.map(node => node.dataset.countryCode));
  if (defaultSelectedOptions.slice().sort().join(",") !== "NG,SA,TH") throw new Error(`Dropdown default selection failed: ${defaultSelectedOptions}`);
  const actionBarState = await page.locator(".program-action-card").evaluate(node => ({
    position: getComputedStyle(node).position,
    bottom: getComputedStyle(node).bottom
  }));
  if (actionBarState.position !== "fixed" || actionBarState.bottom !== "24px") throw new Error(`Floating action bar failed: ${JSON.stringify(actionBarState)}`);
  await page.click("[data-action='select-all-commission-countries']");
  await page.waitForTimeout(150);
  if ((await page.locator(".commission-module").count()) !== 12) throw new Error("Commission select-all failed");
  await page.click("[data-action='clear-all-commission-countries']");
  await page.waitForTimeout(150);
  if ((await page.locator(".commission-module").count()) !== 0) throw new Error("Commission clear-all failed");
  await page.evaluate(() => {
    AFF.state.programCommissionCountries = ["SA", "VN", "TH"];
    render();
  });
  programText = await page.locator("#main").innerText();
  assertText(programText, "$1680", "Saudi Arabia top reference CPA");
  await page.click("#language-toggle");
  await page.click("[data-language='en']");
  await page.click("[data-action='toggle-country-picker']");
  await page.fill("[data-country-search]", "Saudi");
  const englishOption = await page.locator("[data-country-code='SA']").innerText();
  if (!englishOption.includes("Saudi Arabia")) throw new Error(`English country name failed: ${englishOption}`);
  await page.click("#language-toggle");
  await page.click("[data-language='zh']");
  await page.click("[data-action='toggle-country-picker']");
  await page.fill("[data-country-search]", "沙特");
  const chineseOption = await page.locator("[data-country-code='SA']").innerText();
  if (!chineseOption.includes("沙特阿拉伯")) throw new Error(`Chinese country name failed: ${chineseOption}`);
  await page.click("body");
  await page.waitForTimeout(150);

  await page.click(".action-row .button.primary");
  programText = await page.locator("#main").innerText();
  assertText(programText, "建议将高转化率国家作为推广重点", "Conversion page title");
  assertText(programText, "根据数据，将营销中心转移到高转化率地区", "Conversion page subtitle");
  assertText(programText, "查看三个月各地区的转化率最高的六个国家。", "Conversion page primary note");
  assertText(programText, "重点关注转化率最高的地区，数据展示点击→注册、注册→首次入金（首次入金）、首次入金→有效转化三个环节双端的转化数据。", "Conversion page secondary note");
  assertText(programText, "点击→注册", "Conversion stage 1");
  assertText(programText, "注册→首次入金", "Conversion stage 2");
  assertText(programText, "首次入金→有效转化", "Conversion stage 3");
  const conversionModuleCount = await page.locator(".conversion-module").count();
  if (conversionModuleCount !== 6) throw new Error(`Conversion country count failed: ${conversionModuleCount}`);
  const conversionGridColumns = await page.locator(".conversion-module-grid").evaluate(node => getComputedStyle(node).gridTemplateColumns.split(" ").length);
  if (conversionGridColumns !== 3) throw new Error(`Conversion module columns failed: ${conversionGridColumns}`);
  const conversionSubtitleFont = await page.locator(".conversion-page-head > div > p").evaluate(node => getComputedStyle(node).fontSize);
  const conversionNoteFont = await page.locator(".conversion-page-notes p").first().evaluate(node => getComputedStyle(node).fontSize);
  if (conversionSubtitleFont !== "14px" || conversionNoteFont !== "14px") {
    throw new Error(`Conversion typography failed: ${JSON.stringify({ conversionSubtitleFont, conversionNoteFont })}`);
  }
  const conversionCountryNames = await page.locator(".conversion-module h3").allTextContents();
  if (conversionCountryNames.join("|") !== "1. 越南|2. 泰国|3. 印度尼西亚|4. 南非|5. 尼日利亚|6. 巴基斯坦") {
    throw new Error(`Top conversion countries failed: ${JSON.stringify(conversionCountryNames)}`);
  }
  if (programText.includes("综合转化") || programText.includes("双端综合合计")) throw new Error("Conversion aggregate should not be displayed");
  const conversionRows = await page.locator(".conversion-module").first().locator("tbody tr").allTextContents();
  if (conversionRows.length !== 3 || conversionRows.some(row => row.includes("（首次入金）"))) {
    throw new Error(`Conversion table rows failed: ${JSON.stringify(conversionRows)}`);
  }

  await page.click(".action-row .button.primary");
  await page.click("[data-action='toggle-support-picker']");
  if ((await page.locator(".country-options[aria-multiselectable='true']").count()) !== 1) {
    throw new Error("Support country dropdown is not multiselectable");
  }
  const supportCountryCount = await page.locator(".country-option").count();
  if (supportCountryCount !== 12) throw new Error(`Support country count failed: ${supportCountryCount}`);
  const defaultSupportSelection = await page.locator(".country-option[aria-selected='true']").evaluateAll(nodes => nodes.map(node => node.dataset.supportCountry));
  if (defaultSupportSelection.join(",") !== "越南,泰国,印度尼西亚") throw new Error(`Support default selection failed: ${defaultSupportSelection}`);
  await page.fill("[data-support-country-search]", "南非");
  await page.click("[data-support-country='南非']");
  programText = await page.locator("#main").innerText();
  assertText(programText, "查看哪些地区支持", "Support page title");
  assertText(programText, "验证哪些地区可以在平台参与转化", "Support page subtitle");
  assertText(programText, "选择国家/地区后，查看网页端、Android端和iOS端可参与佣金结算的平台。", "Support selection note");
  assertText(programText, "标识为「✗ 不支持」的平台即使当地应用可安装，也不会计入佣金。", "Support unsupported commission note");
  const supportNoteStyle = await page.locator(".support-selection-note").evaluate(node => {
    const style = getComputedStyle(node);
    return { fontSize: style.fontSize, color: style.color, marginBottom: style.marginBottom };
  });
  if (supportNoteStyle.fontSize !== "14px" || supportNoteStyle.color !== "rgb(17, 17, 17)" || supportNoteStyle.marginBottom !== "18px") {
    throw new Error(`Support note typography failed: ${JSON.stringify(supportNoteStyle)}`);
  }
  assertText(programText, "南非", "Selected support country");
  assertText(programText, "✓ 支持", "Support yes");
  assertText(programText, "✗ 不支持", "Support no");
  if ((await page.locator("#main .commission-module").count()) !== 4) throw new Error("Support multi-select module count failed");
  await page.click("[data-action='select-all-support-countries']");
  if ((await page.locator("#main .commission-module").count()) !== 4) throw new Error("Support scoped select-all failed");
  await page.fill("[data-support-country-search]", "");
  await page.click("[data-action='select-all-support-countries']");
  if ((await page.locator("#main .commission-module").count()) !== 12) throw new Error("Support select-all failed");
  await page.click("[data-action='clear-all-support-countries']");
  if ((await page.locator("#main .commission-module").count()) !== 0) throw new Error("Support clear-all failed");
  assertText(await page.locator("#main").innerText(), "请至少选择一个地区", "Support empty state");
  await page.click("[data-support-country='越南']");
  const supportTableHeaders = await page.locator("#main .commission-module th").allTextContents();
  if (supportTableHeaders.join("|") !== "端系统|支持状态") throw new Error(`Support table headers failed: ${JSON.stringify(supportTableHeaders)}`);
  const supportRows = await page.locator("#main .commission-module").first().locator("tbody tr").allTextContents();
  if (supportRows.join("|") !== "网页端✓ 支持|安卓端✓ 支持|iOS端✓ 支持" || programText.includes("支持说明")) {
    throw new Error(`Support table rows failed: ${JSON.stringify(supportRows)}`);
  }

  await page.click(".action-row .button.primary");
  assertText(await page.locator("#main").innerText(), "丰富的创意素材库", "Program materials page");
  const materialLayout = await page.locator(".program-material-layout").evaluate(node => {
    const preview = node.querySelector(".program-material-carousel").getBoundingClientRect();
    const details = node.querySelector(".program-material-details").getBoundingClientRect();
    return { previewRight: preview.right, previewTop: preview.top, detailsLeft: details.left, detailsTop: details.top };
  });
  if (materialLayout.detailsLeft < materialLayout.previewRight || Math.abs(materialLayout.previewTop - materialLayout.detailsTop) > 1) {
    throw new Error(`Program desktop material layout failed: ${JSON.stringify(materialLayout)}`);
  }
  const promotionRoutes = await page.locator('[data-nav-group="推广管理"]').evaluate(node =>
    Array.from(node.closest(".nav-section").querySelectorAll("[data-route]")).map(item => item.dataset.route));
  if (promotionRoutes.join("|") !== "assets|promo|subchannels|deep|tracker|lookup") throw new Error(`Promotion menu order failed: ${promotionRoutes}`);
  for (const index of [1, 2, 0]) {
    await page.locator(`.program-slide-dot[data-slide='${index}']`).click();
    await page.waitForFunction(() => {
      const image = document.querySelector(".program-material-slide img");
      return image.complete && image.naturalWidth > 0;
    });
    if (await page.locator(`.program-slide-dot[data-slide='${index}']`).getAttribute("aria-current") !== "true") throw new Error("Material carousel selection failed");
  }
  if (await page.locator(".program-material-categories [data-action='program-open-assets']").count() !== 4) throw new Error("Material category entries failed");

  await page.click(".action-row .button.primary");
  programText = await page.locator("#main").innerText();
  assertText(programText, "收益与系统指引", "Guide page");
  assertText(programText, "查看客户数据", "Guide client entry");
  assertText(programText, "查看收益数据", "Guide earnings entry");
  assertText(programText, "查看保证金", "Guide guarantee entry");

  await page.click(".action-row .button.primary");
  assertText(await page.locator("#main").innerText(), "分享您的链接，开始赚取收入", "Share page");
  const shareLinks = await page.locator(".program-share-link a").evaluateAll(nodes => nodes.map(node => node.href));
  if (shareLinks.length !== 2 || new URL(shareLinks[0]).searchParams.get("platform") !== "web" || new URL(shareLinks[1]).searchParams.get("platform") !== "app") throw new Error("Web and mobile share links failed");
  await page.locator(".program-share-link [data-copy]").first().click();
  await page.waitForTimeout(150);
  if ((await page.evaluate(() => navigator.clipboard.readText())) !== shareLinks[0]) throw new Error("Share link clipboard failed");
  await page.click(".action-row .button.primary");
  programText = await page.locator("#main").innerText();
  assertText(programText, "回传链接：把转化送回您的系统", "Postback guide page");
  assertText(programText, "配置回传链接", "Postback guide configuration entry");
  await page.click("[data-action='complete-program']");
  assertText(await page.locator("#main").innerText(), "已完成引导", "Program completion");
  await page.evaluate(() => {
    scrollTo(0, 0);
    document.querySelector("#mobile-nav-toggle").click();
  });
  await page.waitForTimeout(220);
  const collapsedEntry = await page.locator("#profile-entry").evaluate(node => ({
    width: node.getBoundingClientRect().width,
    height: node.getBoundingClientRect().height,
    background: getComputedStyle(node).backgroundImage,
    labelDisplay: getComputedStyle(node.querySelector(".nav-label")).display
  }));
  if (collapsedEntry.height < 36 || collapsedEntry.labelDisplay !== "none") {
    throw new Error(`Collapsed partner program entry failed: ${JSON.stringify(collapsedEntry)}`);
  }
  await page.locator("#sidebar").hover();
  await page.waitForTimeout(220);
  const hoverState = await page.evaluate(() => ({
    bodyClass: document.body.className,
    sidebarWidth: document.querySelector(".sidebar").getBoundingClientRect().width,
    workspaceLeft: document.querySelector(".workspace").getBoundingClientRect().left,
    labelDisplay: getComputedStyle(document.querySelector(".nav-label")).display,
    toggleText: document.querySelector("#sidebar-toggle").innerText.trim()
  }));
  if (!hoverState.bodyClass.includes("sidebar-hover-open") || hoverState.sidebarWidth < 200 || Math.abs(hoverState.workspaceLeft - 72) > 2 || hoverState.labelDisplay === "none" || hoverState.toggleText !== "«") {
    throw new Error(`Collapsed sidebar hover expansion failed: ${JSON.stringify(hoverState)}`);
  }
  await page.locator("#main").hover();
  await page.waitForTimeout(220);
  const hoverLeaveState = await page.evaluate(() => ({
    bodyClass: document.body.className,
    sidebarWidth: document.querySelector(".sidebar").getBoundingClientRect().width,
    labelDisplay: getComputedStyle(document.querySelector(".nav-label")).display,
    toggleText: document.querySelector("#sidebar-toggle").innerText.trim()
  }));
  if (hoverLeaveState.bodyClass.includes("sidebar-hover-open") || Math.abs(hoverLeaveState.sidebarWidth - 77) > 3 || hoverLeaveState.labelDisplay !== "none" || hoverLeaveState.toggleText !== "»") {
    throw new Error(`Collapsed sidebar hover leave failed: ${JSON.stringify(hoverLeaveState)}`);
  }
  await page.click("#sidebar-toggle");

  await page.click("[data-route='wd']");
  await page.click("[data-withdraw-tab='records']");
  assertText(await page.locator("#main").innerText(), "申请日期", "Withdrawal records");

  await page.evaluate(() => {
    AFF.state.scenario = "empty-state";
    render();
  });
  assertText(await page.locator("#main").innerText(), "暂无数据", "Empty scenario");
  await page.click("[data-action='reset-scenario']");
  await page.evaluate(() => {
    AFF.state.scenario = "loading-flow";
    render();
  });
  const loadingState = await page.locator(".loading-page").evaluate(node => ({
    busy: node.getAttribute("aria-busy"),
    text: node.innerText,
    cards: node.querySelectorAll(".skeleton-card").length,
    rows: node.querySelectorAll(".skeleton-table > div").length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
  if (loadingState.busy !== "true" || !loadingState.text.includes("正在加载数据") || loadingState.cards !== 4 || loadingState.rows !== 7 || loadingState.overflow > 1) {
    throw new Error(`Loading scenario failed: ${JSON.stringify(loadingState)}`);
  }
  await page.evaluate(() => {
    AFF.state.scenario = "normal-flow";
    render();
  });
  await page.evaluate(() => {
    AFF.state.scenario = "api-error";
    render();
  });
  assertText(await page.locator("#main").innerText(), "SERVICE-503", "Service error state");
  await page.evaluate(() => {
    AFF.state.scenario = "normal-flow";
    render();
  });

  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (desktopOverflow > 2) throw new Error(`Desktop page overflow: ${desktopOverflow}px`);
  const desktop = await page.screenshot({ fullPage: true });
  if (desktop.length < 10000) throw new Error("Desktop screenshot appears blank");
  fs.mkdirSync(path.join(process.cwd(), ".artifacts"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), ".artifacts", "desktop.png"), desktop);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    AFF.state.language = "en";
    render();
  });
  await page.evaluate(() => {
    scrollTo(0, 0);
    document.querySelector("#mobile-nav-toggle").click();
  });
  assertText(await page.locator("#nav").innerText(), "Dashboard", "Mobile navigation");
  await page.click("[data-route='dash']");
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (mobileOverflow > 2) throw new Error(`Mobile page overflow: ${mobileOverflow}px`);
  const mobile = await page.screenshot({ fullPage: true });
  if (mobile.length < 10000) throw new Error("Mobile screenshot appears blank");
  fs.writeFileSync(path.join(process.cwd(), ".artifacts", "mobile.png"), mobile);

  if (consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join("; ")}`);
  if (failedRequests.length) throw new Error(`Failed requests: ${failedRequests.join("; ")}`);
  await browser.close();
  console.log("All user page interaction and responsive checks passed");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
