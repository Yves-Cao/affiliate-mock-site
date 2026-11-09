const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const baseUrl = process.env.EARNINGS_RISK_BASE_URL || "http://127.0.0.1:4179";

async function main() {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(`${baseUrl}/#/pay`, { waitUntil: "domcontentloaded" });
    await page.fill("#login-form input[name=email]", "earnings-risk@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForSelector("#app-view:not(.hidden)");
    await page.evaluate(() => navigate("pay"));
    await page.waitForSelector(".earn-page");

    const source = await page.evaluate(() => {
      const rows = AFF.earnings.filteredRows();
      return {
        total: rows.length,
        investigating: rows.filter(row => row.client.riskHandlingStatus === "investigating").length,
        quarantined: rows.filter(row => row.client.riskHandlingStatus === "quarantined").length,
        released: rows.filter(row => row.client.riskHandlingStatus === "released").length,
        investigatingAmount: rows.filter(row => row.client.riskHandlingStatus === "investigating")
          .reduce((sum, row) => sum + Math.abs(row.amount), 0),
        quarantinedAmount: rows.filter(row => row.client.riskHandlingStatus === "quarantined")
          .reduce((sum, row) => sum + Math.abs(row.amount), 0),
        balance: AFF.finance.balance(),
      };
    });
    const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
    assert.ok(source.investigating > 0 && source.quarantined > 0 && source.released > 0, "All risk states exist in earnings");
    assert.equal(await page.locator(".earn-stat").count(), 4);
    assert.equal(await page.locator("[data-earn-stat='investigating']").count(), 0);
    assert.equal(await page.locator("[data-earn-stat='quarantined']").count(), 0);

    await page.selectOption("[data-earn-quick='riskStatus']", "quarantined");
    assert.equal(Number(await page.locator("[data-aff-total]").textContent()), source.quarantined);
    const rowsText = await page.locator(".earn-table tbody tr").allInnerTexts();
    assert.ok(rowsText.length > 0 && rowsText.every(text => text.includes("隔离中") && text.includes("查看消息")));

    await page.locator("[data-earn-detail]").first().click();
    const drawer = await page.locator(".earn-drawer").innerText();
    for (const expected of ["风险处理", "原因类别", "当前状态时间", "影响范围", "证据范围", "下一步", "预计处理路径", "不自动结算", "不可提现"]) {
      assert.ok(drawer.includes(expected), `Drawer includes ${expected}`);
    }
    for (const forbidden of ["内部评分", "规则阈值", "证据全文", "案件组内部"]) {
      assert.ok(!drawer.includes(forbidden), `Drawer must not expose ${forbidden}`);
    }
    assert.equal(await page.evaluate(() => AFF.finance.balance()), source.balance, "Risk display does not change balance");
    await page.keyboard.press("Escape");

    for (const width of [1440, 1111, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      assert.equal(await page.evaluate(() =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      ), true, `${width}: earnings risk layout has no document overflow`);
    }
    assert.equal(errors.length, 0, `No page errors: ${errors.join("; ")}`);
    console.log(JSON.stringify({ source, result: "Earnings risk handling checks passed" }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
