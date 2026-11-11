const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const baseUrl = process.env.AUDIT_BASE_URL || "http://127.0.0.1:4179";

const support = read("support-page.js");
const messages = read("messages-page.js");
const exportCenter = read("export-center.js");
const pages = read("pages.js");
const reports = read("reports.js");

const supportStates = ["submitted", "waiting_partner", "processing", "waiting_external", "resolved", "closed"];
const supportTypes = ["account", "kyc", "promotion", "postback", "reporting", "statement", "withdrawal", "guarantee", "notification", "material", "other"];
for (const state of supportStates) assert.ok(support.includes(`${state}: [`), `Support state ${state}`);
for (const type of supportTypes) assert.ok(support.includes(`["${type}",`), `Support type ${type}`);
assert.equal(supportStates.length, 6, "Support uses exactly six states");
assert.equal(supportTypes.length, 11, "Support uses exactly eleven categories");
assert.ok(support.includes('maxlength="100"') && support.includes('maxlength="5000"'), "Support limits match the contract");
assert.ok(support.includes("仅已解决工单可确认关闭") && support.includes("重新打开工单"), "Support close and reopen gates exist");

assert.ok(messages.includes("data-message-related") && messages.includes("对象类型") && messages.includes("返回来源"), "Message CTA carries object context");
assert.ok(messages.includes("确认已读") && messages.includes("标记已读"), "Messages separate acknowledgement from normal read");
assert.ok(exportCenter.includes("snapshotAt") && exportCenter.includes("dataAsOf") && exportCenter.includes("filterSummary"), "Exports expose snapshot metadata");
assert.ok(exportCenter.includes("regenerate") && exportCenter.includes("按原筛选重新生成"), "Expired exports can be regenerated");
assert.ok(pages.includes("onboarding-crm-states") && pages.includes("待CRM确认") && pages.includes("同步失败") && pages.includes("版本冲突"), "Onboarding shows CRM sync boundaries");
assert.ok(pages.includes("演示：标记完成") && pages.includes("仅用于本地Mock演示"), "Onboarding simulation is explicitly labeled");
assert.ok(pages.includes("基础推广") && pages.includes("进阶优化与技术集成"), "Promotion tools are progressively disclosed");
assert.ok(pages.includes("AFF.fundsStageChain"), "Funds stage chain is shared");
assert.ok(pages.includes('AFF.fundsStageChain("settling")') && read("withdrawals.js").includes('AFF.fundsStageChain("available")') && reports.includes("AFF.fundsStageChain(row.withdrawalStatus"), "Funds stages cover earnings, withdrawal, and client detail");
for (const file of ["pages.js", "earnings.js", "reports.js", "guarantee-page.js", "withdrawals.js", "data.js", "finance-data.js"]) {
  assert.ok(!read(file).includes("冻结"), `${file} uses the user-side in-settlement vocabulary`);
}

async function main() {
  const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.fill("#login-form input[name=email]", "design-audit-freeze@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForSelector("#app-view:not(.hidden)");

    await page.evaluate(() => navigate("support"));
    await page.waitForSelector(".support-page");
    assert.deepEqual(await page.locator("[data-support-filter='status'] option").evaluateAll(nodes => nodes.map(node => node.value).filter(Boolean)), supportStates);
    assert.deepEqual(await page.locator("[data-support-filter='type'] option").evaluateAll(nodes => nodes.map(node => node.value).filter(Boolean)), supportTypes);
    await page.click("[data-support-detail='TIC-2402']");
    assert.ok(await page.locator("[data-support-close]").count() > 0, "Resolved ticket can be closed");
    await page.keyboard.press("Escape");
    await page.click("[data-support-detail='TIC-2400']");
    assert.ok(await page.locator("[data-support-reopen]").count() > 0, "Closed ticket can be reopened");
    await page.keyboard.press("Escape");

    await page.evaluate(() => navigate("export"));
    await page.waitForSelector(".export-page");
    const exportText = await page.locator("#main").innerText();
    for (const marker of ["快照", "数据截至", "重新生成", "按创建时快照"]) assert.ok(exportText.includes(marker), `Export metadata includes ${marker}`);

    await page.evaluate(() => navigate("onboarding"));
    await page.waitForSelector(".onboarding-card");
    await page.evaluate(() => { AFF.state.onboarding.maxStep = 5; AFF.state.onboarding.step = 5; render(); });
    await page.click("[data-action='onboarding-go'][data-onboarding-step='5']");
    const onboardingText = await page.locator("#main").innerText();
    for (const marker of ["待CRM确认", "同步失败", "重试中", "需要补件", "版本冲突"]) assert.ok(onboardingText.includes(marker), `Onboarding includes ${marker}`);

    await page.evaluate(() => navigate("apply"));
    await page.waitForSelector(".program-steps-card");
    await page.evaluate(() => { AFF.state.programMaxStep = 6; AFF.state.applyStep = 6; render(); });
    await page.click("[data-apply-step='6']");
    assert.ok((await page.locator("#main").innerText()).includes("进阶优化与技术集成"), "Advanced tools remain visible as progressive disclosure");

    const routes = ["dash", "clients", "pay", "statements", "wd", "guarantee", "support", "messages", "export"];
    for (const width of [1440, 992, 768, 480, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      for (const route of routes) {
        await page.evaluate(route => navigate(route), route);
        await page.waitForTimeout(90);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert.ok(overflow <= 1, `${width}/${route}: no document horizontal overflow`);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { AFF.state.language = "en"; render(); });
    await page.evaluate(() => navigate("clients"));
    await page.waitForTimeout(120);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "English long text fits at 390px");

    assert.deepEqual(errors, [], `No browser errors: ${errors.join("; ")}`);
    console.log(JSON.stringify({
      findings: 13,
      states: supportStates.length,
      types: supportTypes.length,
      viewports: [1440, 992, 768, 480, 390],
      result: "User-side design audit freeze checks passed"
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
