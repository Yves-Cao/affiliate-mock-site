const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const routes = [
  ["dash", "仪表盘"],
  ["perf", "业绩数据"],
  ["clients", "客户列表"],
  ["promo", "推广链接与活动"],
  ["deep", "深度链接"],
  ["tracker", "链接追踪器"],
  ["assets", "素材库"],
  ["pay", "收益与提现"],
  ["lookup", "客户归属查询"],
  ["wd", "提现"],
  ["apply", "合作者计划"],
  ["onboarding", "入驻申请"]
];

const routeGroups = {
  dash: "仪表盘",
  perf: "数据总览",
  clients: "数据总览",
  promo: "推广管理",
  deep: "推广管理",
  tracker: "推广管理",
  assets: "推广管理",
  pay: "收益中心",
  lookup: "收益中心",
  wd: "收益中心"
};

function assertText(text, expected, label) {
  if (!text.includes(expected)) throw new Error(`${label} failed: missing ${expected}`);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", request => {
    if (!request.url().startsWith("data:")) failedRequests.push(request.url());
  });

  await page.goto("http://127.0.0.1:4179/", { waitUntil: "domcontentloaded" });
  const loginLayout = await page.evaluate(() => {
    const view = document.querySelector(".login-view");
    const loginBg = document.querySelector(".auth-visual-login");
    const registerBg = document.querySelector(".auth-visual-register");
    const panel = document.querySelector(".auth-panel");
    const tabs = document.querySelector(".auth-tabs");
    const panelRect = panel.getBoundingClientRect();
    const panelStyle = getComputedStyle(panel);
    return {
      loginMode: view.classList.contains("login-mode"),
      loginBgVisible: getComputedStyle(loginBg).display !== "none",
      registerBgVisible: getComputedStyle(registerBg).display !== "none",
      imageLoaded: loginBg.querySelector("img").complete && loginBg.querySelector("img").naturalWidth === 1672,
      tabsVisible: getComputedStyle(tabs).display !== "none",
      panelWidth: panelRect.width,
      panelHeight: panelRect.height,
      centerDelta: Math.abs(panelRect.left + panelRect.width / 2 - innerWidth / 2),
      verticalCenterDelta: Math.abs(panelRect.top + panelRect.height / 2 - innerHeight / 2),
      paddingTop: panelStyle.paddingTop,
      paddingBottom: panelStyle.paddingBottom
    };
  });
  if (!loginLayout.loginMode || !loginLayout.loginBgVisible || loginLayout.registerBgVisible || !loginLayout.imageLoaded || loginLayout.tabsVisible) {
    throw new Error("Login reference layout state failed");
  }
  if (Math.abs(loginLayout.panelWidth - 606) > 2 ||
      loginLayout.panelHeight < 360 || loginLayout.panelHeight > 600 ||
      loginLayout.centerDelta > 2 || loginLayout.verticalCenterDelta > 2 ||
      loginLayout.paddingTop !== "44px" || loginLayout.paddingBottom !== "44px") {
    throw new Error(`Login card geometry failed: ${JSON.stringify(loginLayout)}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLoginLayout = await page.locator(".auth-panel").evaluate(node => {
    const rect = node.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      bottom: innerHeight - rect.bottom,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  if (mobileLoginLayout.width > 390 || mobileLoginLayout.height > 700 ||
      mobileLoginLayout.top < 12 || mobileLoginLayout.bottom < 12 || mobileLoginLayout.overflow > 2) {
    throw new Error(`Mobile login spacing failed: ${JSON.stringify(mobileLoginLayout)}`);
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.click("#login-form button[type=submit]");
  if (!(await page.locator("#login-error").isVisible())) throw new Error("Empty login validation failed");

  await page.click("[data-auth-switch='register']");
  const registerLayout = await page.evaluate(() => ({
    registerMode: document.querySelector(".login-view").classList.contains("register-mode"),
    loginBgVisible: getComputedStyle(document.querySelector(".auth-visual-login")).display !== "none",
    registerBgVisible: getComputedStyle(document.querySelector(".auth-visual-register")).display !== "none",
    columns: getComputedStyle(document.querySelector(".login-view")).gridTemplateColumns.split(" ").length
  }));
  if (!registerLayout.registerMode || registerLayout.loginBgVisible || !registerLayout.registerBgVisible || registerLayout.columns !== 2) {
    throw new Error(`Register split layout failed: ${JSON.stringify(registerLayout)}`);
  }
  assertText(await page.locator("#register-form").innerText(), "确认密码", "Register form fields");
  assertText(await page.locator("#register-form").innerText(), "在创建账户时，我确认", "Register legal copy");
  await page.click("#register-form button[type=submit]");
  if (!(await page.locator("#register-error").isVisible())) throw new Error("Empty register validation failed");
  await page.fill("#register-form input[name=email]", "registered-user@example.com");
  await page.fill("#register-form input[name=password]", "demo-password");
  await page.fill("#register-form input[name=confirmPassword]", "different-password");
  await page.selectOption("#register-form select[name=country]", "新加坡");
  await page.click("#register-form button[type=submit]");
  assertText(await page.locator("#register-error").innerText(), "两次输入的密码不一致", "Register password mismatch");
  await page.fill("#register-form input[name=confirmPassword]", "demo-password");
  await page.click("#register-form button[type=submit]");
  await page.waitForSelector("#login-form:not(.hidden)");
  if ((await page.locator("#login-form input[name=email]").inputValue()) !== "registered-user@example.com") {
    throw new Error("Register did not return to prefilled login");
  }

  await page.fill("#login-form input[name=password]", "demo-password");
  await page.click("#login-form button[type=submit]");
  await page.waitForSelector("#app-view:not(.hidden)");
  assertText(await page.locator("#main").innerText(), "钱包余额", "Dashboard");
  const shellState = await page.evaluate(() => ({
    topbarLeft: document.querySelector(".topbar").getBoundingClientRect().left,
    topbarWidth: document.querySelector(".topbar").getBoundingClientRect().width,
    brandText: document.querySelector(".topbar-brand").innerText.trim(),
    sidebarBrandCount: document.querySelectorAll(".sidebar .brand").length,
    breadcrumbCount: document.querySelectorAll(".breadcrumb").length,
    pageTitleCount: document.querySelectorAll(".page-header h1").length,
    scenarioHidden: document.querySelector(".scenario-control").classList.contains("hidden"),
    mainPaddingLeft: getComputedStyle(document.querySelector(".main")).paddingLeft,
    mainPaddingRight: getComputedStyle(document.querySelector(".main")).paddingRight,
    mainWidth: document.querySelector(".main").getBoundingClientRect().width,
    mainMaxWidth: getComputedStyle(document.querySelector(".main")).maxWidth,
    footerCount: document.querySelectorAll(".footer").length,
    expandedGroups: [...document.querySelectorAll(".nav-parent[aria-expanded='true']")].length,
    visibleChildren: [...document.querySelectorAll(".nav-children")].filter(node => getComputedStyle(node).display !== "none").length
  }));
  if (shellState.topbarLeft !== 0 || Math.abs(shellState.topbarWidth - page.viewportSize().width) > 2 || shellState.brandText !== "A\nAffiliate APC" || shellState.sidebarBrandCount || shellState.footerCount || shellState.breadcrumbCount || shellState.pageTitleCount || !shellState.scenarioHidden || shellState.mainPaddingLeft !== "15px" || shellState.mainPaddingRight !== "15px" || Math.abs(shellState.mainWidth - 1600) > 2 || shellState.mainMaxWidth !== "1600px" || shellState.expandedGroups || shellState.visibleChildren) {
    throw new Error(`Global shell state failed: ${JSON.stringify(shellState)}`);
  }
  const navStructure = await page.locator("#nav .nav-section").evaluateAll(sections => sections.map(section => ({
    group: section.querySelector("[data-nav-group]").dataset.navGroup,
    routes: [...section.querySelectorAll("[data-route]")].map(button => button.dataset.route)
  })));
  if (navStructure[0].group !== "仪表盘" || navStructure[0].routes.join(",") !== "dash" ||
      navStructure[1].group !== "数据总览" || navStructure[1].routes.join(",") !== "perf,clients") {
    throw new Error(`Dashboard navigation hierarchy failed: ${JSON.stringify(navStructure)}`);
  }
  fs.mkdirSync(path.join(process.cwd(), ".artifacts"), { recursive: true });
  await page.locator("#wallet-toggle").hover();
  await page.locator("#wallet-popover").waitFor({ state: "visible" });
  const walletText = await page.locator("#wallet-popover").innerText();
  for (const expected of ["可提现余额", "$12,480.50", "总收益", "$34,215.00", "提现"]) {
    assertText(walletText, expected, "Wallet popover");
  }
  await page.locator("#wallet-popover").hover();
  await page.waitForTimeout(220);
  if (!(await page.locator("#wallet-popover").isVisible())) throw new Error("Wallet hover transfer failed");
  await page.screenshot({ path: path.join(process.cwd(), ".artifacts", "wallet-desktop.png") });
  await page.click("#wallet-popover [data-route='wd']");
  assertText(await page.title(), "提现", "Wallet withdrawal route");
  if (await page.locator("#wallet-popover").isVisible()) throw new Error("Wallet popover did not close on navigation");
  await page.click("[data-nav-group='仪表盘']");
  await page.click("#nav [data-route='dash']");

  const linkAddress = page.locator(".dashboard-link-address .link-text");
  const linkCopy = page.locator(".dashboard-link-address [data-copy]");
  async function assertPromotionLink(expectedPage, expectedLanguage) {
    const text = await linkAddress.innerText();
    const url = new URL(text);
    if (url.origin !== "https://track.example.com" || url.pathname !== "/r/AFF1001" ||
        url.searchParams.get("utm_source") !== "partner" ||
        url.searchParams.get("page") !== expectedPage || url.searchParams.get("lang") !== expectedLanguage ||
        (await linkCopy.getAttribute("data-copy")) !== text) {
      throw new Error(`Dashboard promotion link failed: ${text}`);
    }
  }
  await assertPromotionLink("register", "zh-cn");
  const pageOptions = [
    ["首页", "home"], ["Standard·MT5开户页", "standard-mt5"], ["Pro·MT4开户页", "pro-mt4"],
    ["Zero·MT5开户页", "zero-mt5"], ["注册页", "register"]
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
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:4179" });
  await linkCopy.click();
  await page.waitForFunction(() => document.querySelector(".dashboard-link-address [data-copy]").textContent === "已复制");
  if ((await page.evaluate(() => navigator.clipboard.readText())) !== (await linkAddress.innerText())) {
    throw new Error("Dashboard promotion link clipboard mismatch");
  }
  await page.click("[data-nav-group='仪表盘']");

  for (const width of [1920, 1110, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    const tutorial = await page.locator(".tutorial-card").evaluate(node => {
      const main = document.querySelector("#main");
      const style = getComputedStyle(main);
      const mainWidth = main.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const rect = node.getBoundingClientRect();
      return { width: rect.width, mainWidth, images: node.querySelectorAll("img").length };
    });
    const expectedWidth = width < 768 ? tutorial.mainWidth : (tutorial.mainWidth - 16) / 2;
    if (tutorial.images || Math.abs(tutorial.width - expectedWidth) > 2) {
      throw new Error(`Tutorial layout failed at ${width}px: ${JSON.stringify(tutorial)}`);
    }
    const summaryPosition = await page.locator(".dashboard-summary").evaluate(node => ({
      last: node === document.querySelector("#main").lastElementChild,
      top: node.getBoundingClientRect().top,
      tutorialBottom: document.querySelector(".tutorial-card").getBoundingClientRect().bottom,
      width: node.getBoundingClientRect().width,
      linkWidth: document.querySelector(".dashboard-link-controls").closest(".card").getBoundingClientRect().width
    }));
    if (!summaryPosition.last || summaryPosition.top < summaryPosition.tutorialBottom + 15 ||
        Math.abs(summaryPosition.width - summaryPosition.linkWidth) > 2) {
      throw new Error(`Dashboard summary position failed at ${width}px: ${JSON.stringify(summaryPosition)}`);
    }
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
  await page.locator(".tutorial-card").press("Enter");
  assertText(await page.title(), "合作者计划", "Tutorial route");
  await page.click("#nav [data-route='dash']");

  await page.locator("#avatar-button").hover();
  await page.waitForTimeout(220);
  let dropdownState = await page.locator("#account-dropdown").evaluate(node => ({
    open: node.closest(".account-menu").classList.contains("open"),
    visibility: getComputedStyle(node).visibility,
    opacity: getComputedStyle(node).opacity
  }));
  if (!dropdownState.open || dropdownState.visibility !== "visible" || Number(dropdownState.opacity) < 0.99) throw new Error("Account dropdown hover failed");
  const dropdownText = await page.locator("#account-dropdown").innerText();
  assertText(dropdownText, "账户管理", "Account menu item");
  assertText(dropdownText, "退出登录", "Logout menu item");
  const accountItem = page.locator("[data-action='open-account']");
  const itemBackgroundBefore = await accountItem.evaluate(node => getComputedStyle(node).backgroundColor);
  await accountItem.hover();
  await page.waitForTimeout(120);
  const itemBackgroundAfter = await accountItem.evaluate(node => getComputedStyle(node).backgroundColor);
  if (itemBackgroundBefore === itemBackgroundAfter) throw new Error("Account menu hover background failed");

  await accountItem.click();
  await page.waitForSelector(".modal-layer.screen:not(.hidden)");
  const modalBox = await page.locator(".account-modal").boundingBox();
  if (!modalBox || Math.abs(modalBox.width - page.viewportSize().width) > 2 || Math.abs(modalBox.height - page.viewportSize().height) > 2) {
    throw new Error("Account modal is not fullscreen");
  }
  assertText(await page.locator(".account-modal").innerText(), "U-P-001", "Account profile");
  const accountModalText = await page.locator(".account-modal").innerText();
  if (accountModalText.includes("registered-user@example.com") || !accountModalText.includes("r***@example.com")) {
    throw new Error("Account modal email masking failed");
  }
  await page.fill("[data-account-field='displayName']", "合作者演示");
  await page.click("[data-action='save-account']");
  await page.waitForSelector(".modal-layer.screen", { state: "hidden" });
  if ((await page.locator("#avatar-button").innerText()) !== "合") throw new Error("Saved account name did not update avatar");

  await page.locator("#avatar-button").hover();
  await page.click("[data-action='logout']");
  await page.waitForSelector("#login-view:not(.hidden)");
  if (await page.locator("#app-view:not(.hidden)").count()) throw new Error("Logout did not hide app view");
  await page.fill("#login-form input[name=email]", "demo-user@example.com");
  await page.fill("#login-form input[name=password]", "demo-password");
  await page.click("#login-form button[type=submit]");
  await page.waitForSelector("#app-view:not(.hidden)");

  await page.focus("#avatar-button");
  await page.waitForTimeout(100);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(300);
  const focusedMenuAction = await page.evaluate(() => document.activeElement?.dataset?.action);
  if (!focusedMenuAction) throw new Error("Account menu keyboard focus failed");
  if (!(await page.locator("#account-menu").evaluate(node => node.classList.contains("open")))) throw new Error("Account menu keyboard open failed");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  if (await page.locator("#account-menu").evaluate(node => node.classList.contains("open"))) throw new Error("Account menu escape failed");

  for (const [route, label] of routes) {
    if (route === "apply") {
      await page.click("#profile-entry");
    } else if (route === "onboarding") {
      await page.goto("http://127.0.0.1:4179/#/onboarding", { waitUntil: "domcontentloaded" });
    } else {
      const parent = page.locator(`[data-nav-group='${routeGroups[route]}']`);
      if ((await parent.getAttribute("aria-expanded")) !== "true") await parent.click();
      await page.click(`#nav [data-route='${route}']`);
    }
    await page.waitForTimeout(80);
    assertText(await page.title(), label, `${route} route`);
    if (await page.locator(".modal-layer:not(.hidden)").count()) await page.click("[data-action='close-modal']");
  }

  await page.goto("http://127.0.0.1:4179/#/dash", { waitUntil: "domcontentloaded" });
  assertText(await page.locator("#kyc-banner").innerText(), "您的账户资料未完善，部分功能可能受限。", "Onboarding banner text");
  await page.click("#kyc-banner [data-route='onboarding']");
  assertText(await page.title(), "入驻申请", "Onboarding route");
  if (!(await page.locator("#kyc-banner").isHidden())) throw new Error("Onboarding banner should hide on application page");
  let onboardingText = await page.locator("#main").innerText();
  assertText(onboardingText, "客户端准入流程：注册 → 资料 → KYC → 协议 → 提交审核。", "Onboarding subtitle");
  const onboardingSteps = await page.locator(".steps .step-label").allTextContents();
  if (onboardingSteps.join("|") !== "注册账号|填写基本资料|KYC 实名认证|接受协议与准则|提交审核") {
    throw new Error(`Onboarding steps failed: ${onboardingSteps}`);
  }
  if (!(await page.locator("[data-action='onboarding-next']").isDisabled())) throw new Error("Onboarding email gate failed");
  await page.click("[data-action='verify-onboarding-email']");
  assertText(await page.locator("#main").innerText(), "已验证", "Onboarding verified email");
  await page.click("[data-action='onboarding-next']");
  onboardingText = await page.locator("#main").innerText();
  assertText(onboardingText, "基本资料", "Onboarding profile title");
  assertText(onboardingText, "推广渠道类型", "Onboarding profile channel");
  await page.click("[data-action='onboarding-next']");
  onboardingText = await page.locator("#main").innerText();
  assertText(onboardingText, "KYC 实名认证", "Onboarding KYC title");
  assertText(onboardingText, "请前往客户端完成实名认证", "Onboarding KYC guide");
  await page.click("[data-action='open-client-kyc']");
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
  assertText(onboardingText, "提交审核", "Onboarding submit title");
  await page.click("[data-action='submit-onboarding']");
  onboardingText = await page.locator("#main").innerText();
  assertText(onboardingText, "待审核", "Onboarding pending status");
  assertText(onboardingText, "审核结果将通过站内消息与邮件通知。", "Onboarding submitted note");
  await page.click("[data-onboarding-step='1']");
  assertText(await page.locator("#main").innerText(), "已验证", "Onboarding back navigation");

  await page.click("[data-route='perf']");
  await page.click("[data-action='open-perf-filter']");
  await page.selectOption("[data-perf-filter='source']", "Telegram");
  await page.click("[data-action='apply-perf-filter']");
  await page.click("[data-action='add-perf-group']");
  await page.click("[data-perf-group-add='国家']");
  assertText(await page.locator("#main").innerText(), "国家", "Performance grouping");

  await page.click("[data-route='clients']");
  await page.click("[data-client-info='C-10241']");
  assertText(await page.locator(".modal-layer").innerText(), "动态Hold", "Client detail");
  await page.click("[data-action='close-modal']");

  await page.click("[data-route='promo']");
  await page.click("[data-action='open-campaign-modal']");
  await page.click("[data-action='create-campaign']");
  await page.fill("#campaign-name", "");
  await page.click("[data-action='create-campaign']");
  await page.fill("#campaign-name", "十一月测试");
  await page.click("[data-action='create-campaign']");
  assertText(await page.locator("#main").innerText(), "十一月测试", "Campaign creation");
  await page.click("[data-promo-tab='sub']");
  await page.click("[data-sub-toggle='tg_group_01']");
  assertText(await page.locator("#main").innerText(), "已封禁", "Sub ID state");

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
  await page.click("[data-action='open-appeal']");
  await page.click("[data-action='submit-appeal']");
  await page.fill("#appeal-reason", "补充证据");
  await page.click("[data-action='submit-appeal']");
  assertText(await page.locator("#main").innerText(), "申诉中", "Appeal submission");

  await page.click("[data-route='lookup']");
  await page.waitForTimeout(250);
  await page.fill("#lookup-input", "C-10241");
  await page.click("[data-action='lookup']");
  assertText(await page.locator("#main").innerText(), "30天归因窗口", "Attribution lookup");

  await page.click("[data-route='assets']");
  assertText(await page.locator("#main").innerText(), "素材区已锁定", "Asset gate");
  const mosaicPreviews = await page.locator(".asset-banner-card .asset-preview, .asset-video-card .asset-preview, .asset-gif-card .asset-preview").evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    const placeholder = node.querySelector(".mosaic-placeholder");
    return {
      ratio: getComputedStyle(node).aspectRatio,
      actualRatio: rect.width / rect.height,
      text: placeholder?.textContent,
      background: placeholder ? getComputedStyle(placeholder).backgroundImage : ""
    };
  }));
  if (mosaicPreviews.length !== 9 ||
      mosaicPreviews.some(item => item.ratio !== "4 / 3" || Math.abs(item.actualRatio - 4 / 3) > .01 || item.text !== "" || !item.background.includes("repeating-conic-gradient"))) {
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
  await page.click(".asset-detail-drawer .close-button");
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
  await page.click(".asset-detail-drawer .close-button");
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
  const gifFieldLabels = await page.locator(".asset-gif-fields .field span").allTextContents();
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
  await page.click(".asset-gif-drawer .close-button");
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
  if (landingUrl.pathname !== "/lp/standard" || landingUrl.searchParams.get("material_language") !== "English") {
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
  await page.click(".asset-landing-drawer .close-button");
  if (await page.locator("[data-action='load-more-assets']").count()) throw new Error("Asset load more should be hidden when all records fit one batch");

  await page.click("[data-route='apply']");
  const profileEntryStyle = await page.locator("#profile-entry").evaluate(node => ({
    text: node.innerText,
    background: getComputedStyle(node).backgroundImage,
    color: getComputedStyle(node).color
  }));
  if (!profileEntryStyle.text.includes("合作者计划") || !profileEntryStyle.background.includes("linear-gradient") || profileEntryStyle.color !== "rgb(255, 255, 255)") {
    throw new Error(`Partner program entry style failed: ${JSON.stringify(profileEntryStyle)}`);
  }
  const programSteps = ["查看佣金奖励", "高转化地区", "查看支持地区", "素材库总览", "系统使用指引", "分享简介链接"];
  const stepsText = await page.locator(".steps").innerText();
  for (const step of programSteps) assertText(stepsText, step, `Partner program step: ${step}`);
  let programText = await page.locator("#main").innerText();
  if (programText.includes("Commission Reward")) throw new Error("Commission page eyebrow should be removed");
  assertText(programText, "不同国家佣金奖励", "Commission page title");
  assertText(programText, "不同地区根据入金门槛提供阶梯奖励", "Commission page subtitle");
  const commissionSubtitleFont = await page.locator(".commission-page-head > div > p").evaluate(node => getComputedStyle(node).fontSize);
  if (commissionSubtitleFont !== "14px") throw new Error(`Commission subtitle font size failed: ${commissionSubtitleFont}`);
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
  const defaultCountryCodes = await page.locator(".commission-module header span").allTextContents();
  if (defaultCountryCodes.slice().sort().join(",") !== "SA,TH,VN") throw new Error(`Default highest-commission countries failed: ${defaultCountryCodes}`);
  const commissionGridColumns = await page.locator(".commission-module-grid").evaluate(node => getComputedStyle(node).gridTemplateColumns.split(" ").length);
  if (commissionGridColumns !== 3) throw new Error(`Commission module columns failed: ${commissionGridColumns}`);
  const commissionHeaders = await page.locator(".commission-module").first().locator("th").allTextContents();
  if (commissionHeaders.length !== 2 || !commissionHeaders.includes("入金金额") || !commissionHeaders.includes("佣金")) {
    throw new Error(`Commission table headers failed: ${JSON.stringify(commissionHeaders)}`);
  }

  await page.click("[data-action='toggle-country-picker']");
  const commissionCountryCount = await page.locator(".country-option").count();
  if (commissionCountryCount !== 103) throw new Error(`Commission country count failed: ${commissionCountryCount}`);
  const defaultSelectedOptions = await page.locator(".country-option[aria-selected='true']").evaluateAll(nodes => nodes.map(node => node.dataset.countryCode));
  if (defaultSelectedOptions.slice().sort().join(",") !== "SA,TH,VN") throw new Error(`Dropdown default selection failed: ${defaultSelectedOptions}`);
  const actionBarState = await page.locator(".program-action-card").evaluate(node => ({
    position: getComputedStyle(node).position,
    bottom: getComputedStyle(node).bottom
  }));
  if (actionBarState.position !== "fixed" || actionBarState.bottom !== "24px") throw new Error(`Floating action bar failed: ${JSON.stringify(actionBarState)}`);
  await page.click("[data-action='select-all-commission-countries']");
  await page.waitForTimeout(150);
  if ((await page.locator(".commission-module").count()) !== 103) throw new Error("Commission select-all failed");
  await page.click("[data-action='clear-all-commission-countries']");
  await page.waitForTimeout(150);
  if ((await page.locator(".commission-module").count()) !== 0) throw new Error("Commission clear-all failed");
  await page.evaluate(() => {
    AFF.state.programCommissionCountries = ["SA", "VN", "TH"];
    render();
  });
  programText = await page.locator("#main").innerText();
  assertText(programText, "$1750", "Saudi Arabia top commission");
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
  assertText(programText, "重点关注转化率最高的地区，数据展示点击→注册、注册→FTD（首次入金）、FTD→有效FTD三个环节双端的转化数据。", "Conversion page secondary note");
  assertText(programText, "点击→注册", "Conversion stage 1");
  assertText(programText, "注册→FTD", "Conversion stage 2");
  assertText(programText, "FTD→有效FTD", "Conversion stage 3");
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
  assertText(await page.locator("#main").innerText(), "素材库重点", "Program materials page");
  await page.click("[data-program-asset='device'][data-value='iOS']");
  await page.click("[data-program-asset='platform'][data-value='YouTube']");
  await page.click("[data-program-asset='type'][data-value='落地页']");
  programText = await page.locator("#main").innerText();
  assertText(programText, "iOS评测落地页", "Asset filters");
  assertText(programText, "当前 1 / 12 个素材", "Asset filter count");

  await page.click(".action-row .button.primary");
  programText = await page.locator("#main").innerText();
  assertText(programText, "系统使用指引", "Guide page");
  assertText(programText, "查看客户数据", "Guide client entry");
  assertText(programText, "查看业绩", "Guide performance entry");
  assertText(programText, "查看整体数据", "Guide dashboard entry");

  await page.click(".action-row .button.primary");
  assertText(await page.locator("#main").innerText(), "复制分享简介", "Share page");
  const shareText = await page.locator(".share-text").inputValue();
  if (!shareText.includes("GTC FX Affiliate") || !shareText.includes("https://track.example.com/r/AFF1001")) throw new Error("Share intro content failed");
  await page.click("[data-copy]");
  await page.waitForTimeout(150);
  if ((await page.locator("[data-copy]").innerText()) !== "已复制") throw new Error("Share copy feedback failed");
  await page.click("[data-action='complete-program']");
  assertText(await page.locator("#main").innerText(), "已完成引导", "Program completion");
  await page.click("#sidebar-toggle");
  await page.waitForTimeout(220);
  const collapsedEntry = await page.locator("#profile-entry").evaluate(node => ({
    width: node.getBoundingClientRect().width,
    height: node.getBoundingClientRect().height,
    background: getComputedStyle(node).backgroundImage,
    labelDisplay: getComputedStyle(node.querySelector(".nav-label")).display
  }));
  if (collapsedEntry.width > 70 || !collapsedEntry.background.includes("linear-gradient") || collapsedEntry.labelDisplay !== "none") {
    throw new Error(`Collapsed partner program entry failed: ${JSON.stringify(collapsedEntry)}`);
  }
  const toggleBox = await page.locator("#sidebar-toggle").boundingBox();
  if (!toggleBox || Math.abs(toggleBox.width - collapsedEntry.width) > 2 || Math.abs(toggleBox.height - collapsedEntry.height) > 2) {
    throw new Error(`Sidebar toggle size does not match partner entry: ${JSON.stringify({ toggleBox, collapsedEntry })}`);
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
  if (!hoverState.bodyClass.includes("sidebar-hover-open") || hoverState.sidebarWidth < 200 || Math.abs(hoverState.workspaceLeft - 68) > 2 || hoverState.labelDisplay === "none" || hoverState.toggleText !== "«") {
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
  if (hoverLeaveState.bodyClass.includes("sidebar-hover-open") || Math.abs(hoverLeaveState.sidebarWidth - 68) > 2 || hoverLeaveState.labelDisplay !== "none" || hoverLeaveState.toggleText !== "»") {
    throw new Error(`Collapsed sidebar hover leave failed: ${JSON.stringify(hoverLeaveState)}`);
  }
  await page.click("#sidebar-toggle");

  await page.click("[data-route='wd']");
  await page.click("[data-wd-tab='records']");
  assertText(await page.locator("#main").innerText(), "申请日期", "Withdrawal records");

  await page.evaluate(() => {
    AFF.state.scenario = "empty-state";
    render();
  });
  assertText(await page.locator("#main").innerText(), "暂无数据", "Empty scenario");
  await page.click("[data-action='reset-scenario']");
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
  await page.click("#language-toggle");
  await page.click("[data-language='en']");
  await page.click("#sidebar-toggle");
  if ((await page.locator("[data-nav-group='仪表盘']").getAttribute("aria-expanded")) !== "true") {
    await page.click("[data-nav-group='仪表盘']");
  }
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
