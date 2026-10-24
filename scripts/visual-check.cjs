const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const routes = [
  ["dash", "仪表盘"],
  ["perf", "业绩数据"],
  ["clients", "客户列表"],
  ["promo", "推广链接与活动"],
  ["deep", "深度链接"],
  ["assets", "素材库"],
  ["pay", "收益与提现"],
  ["lookup", "客户归属查询"],
  ["wd", "提现"],
  ["apply", "入驻申请"]
];

function assertText(text, expected, label) {
  if (!text.includes(expected)) throw new Error(`${label} failed: missing ${expected}`);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", request => {
    if (!request.url().startsWith("data:")) failedRequests.push(request.url());
  });

  await page.goto("http://127.0.0.1:4179/", { waitUntil: "domcontentloaded" });
  await page.click("#login-form button[type=submit]");
  if (!(await page.locator("#login-error").isVisible())) throw new Error("Empty login validation failed");

  await page.fill("input[name=username]", "demo-user");
  await page.fill("input[name=password]", "demo-password");
  await page.click("#login-form button[type=submit]");
  await page.waitForSelector("#app-view:not(.hidden)");
  assertText(await page.locator("#main").innerText(), "钱包余额", "Dashboard");

  for (const [route, label] of routes) {
    await page.click(`#nav [data-route='${route}']`);
    await page.waitForTimeout(80);
    assertText(await page.locator("#main").innerText(), label, `${route} route`);
    if (await page.locator(".modal-layer:not(.hidden)").count()) await page.click("[data-action='close-modal']");
  }

  await page.click("[data-route='perf']");
  await page.click("[data-action='open-perf-filter']");
  await page.click("[data-perf-source='Telegram']");
  await page.click("[data-action='apply-perf-filter']");
  await page.click("[data-action='add-perf-group']");
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
  await page.click("[data-action='open-code-modal']");
  await page.click("[data-action='accept-code']");
  await page.waitForTimeout(250);
  await page.click("[data-download='300x250 引流横幅-中文']");

  await page.click("[data-route='apply']");
  await page.click("[data-action='verify-email']");
  await page.click(".action-row .button.primary");
  await page.click(".action-row .button.primary");
  await page.click("[data-action='simulate-kyc']");
  await page.click(".action-row .button.primary");
  for (const checkbox of await page.locator("[data-agreement]").all()) await checkbox.setChecked(true);
  await page.click(".action-row .button.primary");
  await page.click("[data-action='submit-apply']");
  assertText(await page.locator("#main").innerText(), "已提交审核", "Application submission");

  await page.click("[data-route='wd']");
  await page.click("[data-wd-tab='records']");
  assertText(await page.locator("#main").innerText(), "申请日期", "Withdrawal records");

  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (desktopOverflow > 2) throw new Error(`Desktop page overflow: ${desktopOverflow}px`);
  const desktop = await page.screenshot({ fullPage: true });
  if (desktop.length < 10000) throw new Error("Desktop screenshot appears blank");
  fs.mkdirSync(path.join(process.cwd(), ".artifacts"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), ".artifacts", "desktop.png"), desktop);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.click("#language-toggle");
  await page.click("#sidebar-toggle");
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
