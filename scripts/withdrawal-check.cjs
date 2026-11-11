const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.WITHDRAWAL_BASE_URL || "http://127.0.0.1:4179";
const artifacts = path.join(process.cwd(), ".artifacts");

async function main() {
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.fill("#login-form input[name=email]", "withdrawal-review@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForSelector("#app-view:not(.hidden)");
    await page.evaluate(() => navigate("wd"));
    await page.waitForSelector("[data-withdraw-method-choice='wire']");
    await page.click("[data-withdraw-method-choice='wire']");
    await page.waitForSelector(".wd-kyc-inline");
    await page.click("[data-withdraw-action='complete-kyc']");
    await page.waitForSelector("[data-withdraw-amount]");
    const feeTip = await page.locator(".wd-fee-tip").innerText();
    assert.ok(feeTip.includes("$3 + 0.5%") && feeTip.includes("不重复扣税"));

    const before = await page.evaluate(() => AFF.finance.balance());
    await page.fill("[data-withdraw-amount]", "100");
    const preview = await page.locator(".wd-preview").innerText();
    assert.ok(preview.includes("$3.50") && preview.includes("$96.50"));
    await page.click("[data-withdraw-action='submit-request']");
    await page.waitForSelector(".wd-table");
    const after = await page.evaluate(() => AFF.finance.balance());
    assert.equal(after, before - 10000);
    const runtime = await page.evaluate(() => AFF.finance.allWithdrawals().find(order => order.id.startsWith("WOD-U")));
    assert.equal(runtime.status, "pending_review");
    assert.equal(runtime.fee, 0);
    assert.equal(runtime.estimatedFee, 350);
    await page.evaluate(id => AFF.finance.approveWithdrawal(id), runtime.id);
    assert.equal(await page.evaluate(id => AFF.finance.allWithdrawals().find(order => order.id === id).status, runtime.id), "processing");
    const approved = await page.evaluate(id => AFF.finance.allWithdrawals().find(order => order.id === id), runtime.id);
    assert.equal(approved.crmPayout.status, "processing");
    assert.equal(approved.crmPayout.requestId, `CRM-REQ-${runtime.id}`);
    assert.equal(approved.crmPayout.reconciliationStatus, "pending");
    await page.click(`[data-withdraw-detail='${runtime.id}']`);
    const crmDetail = await page.locator(".wd-drawer").innerText();
    assert.ok(crmDetail.includes("CRM打款请求") && crmDetail.includes(`CRM-REQ-${runtime.id}`));
    assert.ok(crmDetail.includes("CRM处理状态") && crmDetail.includes("processing"));
    assert.ok(crmDetail.includes("更新时间") && crmDetail.includes("重试次数") && crmDetail.includes("对账状态"));
    await page.keyboard.press("Escape");
    await page.evaluate(id => AFF.finance.setWithdrawalStatus(id, "failed"), runtime.id);
    assert.equal(await page.evaluate(() => AFF.finance.balance()), before);
    const failed = await page.evaluate(id => AFF.finance.allWithdrawals().find(order => order.id === id), runtime.id);
    assert.equal(failed.status, "failed");
    assert.equal(failed.fee, 0);
    const rejected = await page.evaluate(() => {
      const before = AFF.finance.balance();
      const order = AFF.finance.createWithdrawal(10, "wallet");
      AFF.finance.rejectWithdrawal(order.id, "演示审核驳回");
      return { before, after: AFF.finance.balance(), order: AFF.finance.allWithdrawals().find(item => item.id === order.id) };
    });
    assert.equal(rejected.order.status, "rejected");
    assert.equal(rejected.order.reviewStatus, "rejected");
    assert.equal(rejected.after, rejected.before);

    const rows = await page.evaluate(() => AFF.withdrawalsUI.records());
    assert.ok(rows.length >= 20);
    const paid = rows.filter(row => row.status === "paid");
    for (const order of paid) {
      assert.equal(order.amount, order.allocations.reduce((sum, item) => sum + item.amount, 0));
      assert.equal(order.received, order.amount - order.fee);
    }
    const failures = rows.filter(row => ["failed", "timeout"].includes(row.status));
    assert.ok(failures.every(order => order.fee === 0));
    assert.equal(await page.locator("[data-withdraw-review]").count(), 0, "User side has no withdrawal review actions");
    assert.equal(await page.locator("[data-withdraw-simulate]").count(), 0, "User side has no payment simulation actions");
    const timeoutOrder = rows.find(row => row.status === "timeout");
    if (timeoutOrder) {
      await page.click(`[data-withdraw-detail='${timeoutOrder.id}']`);
      const timeoutDrawer = await page.locator(".wd-drawer").innerText();
      assert.ok(timeoutDrawer.includes("支付结果仍在确认中") && timeoutDrawer.includes("请勿重复提交"), "Timeout stays query-only");
      assert.ok(await page.locator("[data-withdraw-action='query']").count() > 0, "Processing withdrawal offers query");
      assert.ok(!timeoutDrawer.includes("全额退回"), "Timeout does not claim an automatic full refund");
      await page.keyboard.press("Escape");
    }

    await page.locator(".wd-settlement-link").first().click();
    await page.waitForFunction(() => AFF.state.route === "statements");
    assert.ok(await page.locator(".statement-page").count() > 0, "Withdrawal settlement opens the monthly statement object");
    assert.ok(await page.locator(".finance-drawer").count() > 0, "Monthly statement detail opens from a withdrawal reference");
    await page.keyboard.press("Escape");
    await page.evaluate(() => navigate("wd"));

    await page.locator("[data-withdraw-detail]").first().click();
    const drawer = await page.locator(".wd-drawer").innerText();
    assert.ok(drawer.includes("先进先出分摊"));
    assert.ok(drawer.includes("A*** P***"));
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".wd-drawer").count(), 0);

    for (const language of ["zh", "en"]) {
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(language => { AFF.state.language = language; render(); }, language);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await page.screenshot({ path: path.join(artifacts, `withdrawals-${language}-${width}.png`), fullPage: true });
      }
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({
      records: rows.length,
      paidOrders: paid.length,
      failedOrders: failures.length,
      fifoAllocations: paid.reduce((sum, order) => sum + order.allocations.length, 0),
      checks: "KYC/KYB gate, fee preview, runtime failure refund, FIFO allocations, filters, responsive layout"
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
