const { chromium } = require("playwright-core");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const baseUrl = process.env.V1_BASE_URL || "http://127.0.0.1:4180";
const artifactRoot = path.join(process.cwd(), ".artifacts", "v1");
fs.mkdirSync(artifactRoot, { recursive: true });

async function preparePage(browser, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const issues = [];
  page.on("console", message => {
    if (message.type() === "error") {
      issues.push(`console:${message.text()}`);
      console.error(`browser console error: ${message.text()} ${JSON.stringify(message.location())}`);
    }
  });
  page.on("pageerror", error => {
    issues.push(`pageerror:${error.message}`);
    console.error(`browser page error: ${error.message}`);
  });
  page.on("requestfailed", request => issues.push(`requestfailed:${request.url()}:${request.failure()?.errorText}`));
  page.on("response", response => {
    if (response.status() >= 400) {
      issues.push(`response:${response.status()}:${response.url()}`);
      console.error(`browser response error: ${response.status()} ${response.url()}`);
    }
  });
  return { context, page, issues };
}

async function assertNoOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth
  }));
  if (overflow.document > 1 || overflow.body > 1) throw new Error(`${label} horizontal overflow: ${JSON.stringify(overflow)}`);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(artifactRoot, `${name}.png`), fullPage: true });
}

(async () => {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true
  });
  try {
    const desktop = await preparePage(browser, { width: 1440, height: 900 });
    await desktop.page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await desktop.page.locator("#login-form input[name=email]").fill("partner@example.com");
    await desktop.page.locator("#login-form input[name=password]").fill("demo1234");
    await desktop.page.locator("#login-form button[type=submit]").click();
    await desktop.page.waitForSelector("#app-view:not(.hidden)");

    const routes = [
      "dash", "perf", "clients", "summary", "assets", "promo", "subchannels", "deep",
      "tracker", "lookup", "pay", "wd", "guarantee", "appeals", "messages", "apply", "onboarding"
    ];
    for (const route of routes) {
      await desktop.page.goto(`${baseUrl}/#${route}`, { waitUntil: "domcontentloaded" });
      await desktop.page.waitForSelector("#main");
      await desktop.page.waitForTimeout(100);
      await assertNoOverflow(desktop.page, `desktop ${route}`);
      if (["dash", "clients", "pay", "apply", "onboarding"].includes(route)) {
        await shot(desktop.page, `user-${route}-1440`);
      }
    }

    await desktop.page.goto(`${baseUrl}/#/clients`, { waitUntil: "domcontentloaded" });
    await desktop.page.waitForSelector(".report-client-table");
    await desktop.page.locator("[data-rp-client]").first().click();
    await desktop.page.waitForSelector(".report-drawer");
    const drawerText = await desktop.page.locator(".report-drawer").innerText();
    for (const text of ["客户资格状态", "客户里程碑状态", "资金状态", "质量服务"]) {
      if (!drawerText.includes(text)) throw new Error(`client drawer missing ${text}`);
    }
    const paidState = await desktop.page.evaluate(() => {
      const settledClients = AFF.reporting.rows.filter(row => row.fundStatus === "settled_partial");
      const settledCases = AFF.reporting.rows.flatMap(row => row.commissionCases.filter(item => item.status === "settled"));
      return { clients: settledClients.length, cases: settledCases.length };
    });
    assert.ok(paidState.clients >= 20 && paidState.cases >= paidState.clients, "Settled clients and commission cases must exist");

    await desktop.page.goto(`${baseUrl}/#/pay`, { waitUntil: "domcontentloaded" });
    await desktop.page.waitForSelector(".earn-table");
    const payText = await desktop.page.locator("#main").innerText();
    for (const text of ["FTD + 有效FTD", "质量服务", "佣金案件"]) {
      if (!payText.includes(text)) throw new Error(`pay missing ${text}`);
    }

    await desktop.page.goto(`${baseUrl}/#/wd`, { waitUntil: "domcontentloaded" });
    await desktop.page.waitForSelector(".wd-kyb-checklist");
    if (!(await desktop.page.locator("[data-withdraw-action='complete-kyc']").isEnabled())) throw new Error("KYC/KYB simulation unavailable");
    await desktop.page.click("[data-withdraw-action='complete-kyc']");
    await desktop.page.click("[data-withdraw-tab='records']");
    const withdrawalState = await desktop.page.evaluate(() => ({
      records: AFF.withdrawalsUI.records(),
      paidOrders: AFF.finance.staticWithdrawals.filter(order => order.status === "paid")
    }));
    assert.ok(withdrawalState.records.length >= 20);
    for (const order of withdrawalState.paidOrders) {
      assert.equal(order.amount, order.allocations.reduce((sum, allocation) => sum + allocation.amount, 0));
      assert.equal(order.received, order.amount - order.fee);
    }
    await desktop.page.goto(`${baseUrl}/#/wd`, { waitUntil: "domcontentloaded" });
    await desktop.page.evaluate(() => {
      AFF.state.kybCompleted = false;
      AFF.state.wdTab = "withdraw";
      render();
    });
    await desktop.page.waitForSelector(".wd-kyb-checklist");
    await shot(desktop.page, "user-wd-kyb-1440");

    for (const route of ["admin-config", "admin-risk", "admin-review", "admin-performance"]) {
      await desktop.page.goto(`${baseUrl}/admin.html#${route}`, { waitUntil: "domcontentloaded" });
      await desktop.page.waitForSelector(".tm-table-wrap");
      await assertNoOverflow(desktop.page, `admin ${route}`);
      await shot(desktop.page, `admin-${route}-1440`);
    }

    const mobile = await preparePage(browser, { width: 390, height: 844 });
    await mobile.page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await mobile.page.locator("#login-form input[name=email]").fill("partner@example.com");
    await mobile.page.locator("#login-form input[name=password]").fill("demo1234");
    await mobile.page.locator("#login-form button[type=submit]").click();
    await mobile.page.waitForSelector("#app-view:not(.hidden)");
    for (const route of ["dash", "clients", "pay", "wd", "apply"]) {
      await mobile.page.goto(`${baseUrl}/#${route}`, { waitUntil: "domcontentloaded" });
      await mobile.page.waitForSelector("#main");
      await mobile.page.waitForTimeout(100);
      await assertNoOverflow(mobile.page, `mobile ${route}`);
      await shot(mobile.page, `user-${route}-390`);
    }
    await mobile.page.goto(`${baseUrl}/admin.html#admin-risk`, { waitUntil: "domcontentloaded" });
    await mobile.page.waitForSelector(".tm-table-wrap");
    await assertNoOverflow(mobile.page, "mobile admin-risk");
    await shot(mobile.page, "admin-risk-390");

    const issues = [...desktop.issues, ...mobile.issues];
    if (issues.length) throw new Error(`browser issues:\n${issues.join("\n")}`);
    console.log("V1 browser checks passed: 17 user routes, 4 admin routes, three-layer states, two commission cases, KYC/KYB gate, desktop/mobile overflow.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
