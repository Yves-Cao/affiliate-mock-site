const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const baseUrl = process.env.CLIENT_RISK_BASE_URL || "http://127.0.0.1:4179";

async function main() {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(`${baseUrl}/#/clients`, { waitUntil: "domcontentloaded" });
    await page.fill("#login-form input[name=email]", "client-risk@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForSelector("#app-view:not(.hidden)");
    await page.evaluate(() => navigate("clients"));
    await page.waitForSelector(".report-client-table");

    const source = await page.evaluate(() => {
      const state = AFF.reports.state("clients");
      const rows = AFF.reporting.rows.filter(row => row.clientId &&
        row.date >= state.filters.from && row.date <= state.filters.to);
      return {
        all: rows.length,
        none: rows.filter(row => row.riskHandlingStatus === "none").length,
        investigating: rows.filter(row => row.riskHandlingStatus === "investigating").length,
        quarantined: rows.filter(row => row.riskHandlingStatus === "quarantined").length,
        released: rows.filter(row => row.riskHandlingStatus === "released").length,
        balance: AFF.finance.balance()
      };
    });
    for (const key of ["none", "investigating", "quarantined", "released"]) {
      assert.ok(source[key] > 0, `Risk state ${key} exists`);
    }
    assert.equal(
      source.none + source.investigating + source.quarantined + source.released,
      source.all,
      "Risk states are exhaustive"
    );
    assert.equal(await page.locator(".report-client-table thead th").count(), 12, "Client table has 12 semantic columns");

    await page.click("[data-rp-action='filters']");
    await page.selectOption("[data-rp-filter='riskStatus']", "quarantined");
    await page.click("[data-rp-action='apply']");
    assert.equal(Number(await page.locator("[data-aff-total]").textContent()), source.quarantined);
    const riskCells = await page.locator(".client-risk-cell").allInnerTexts();
    assert.ok(riskCells.length > 0 && riskCells.every(text => text.includes("隔离中")));
    assert.ok((await page.locator("#main").innerText()).includes("风险处理状态：隔离中"));

    await page.locator("[data-rp-client]").filter({ hasText: "详情" }).first().click();
    const drawer = await page.locator(".report-drawer").innerText();
    for (const expected of ["风险处理", "原因类别", "当前状态时间", "影响范围", "证据范围", "下一步", "预计处理路径", "不自动结算", "不可提现"]) {
      assert.ok(drawer.includes(expected), `Drawer includes ${expected}`);
    }
    for (const forbidden of ["内部评分", "规则阈值", "证据全文", "处理人"]) {
      assert.ok(!drawer.includes(forbidden), `Drawer must not expose ${forbidden}`);
    }
    assert.equal(await page.evaluate(() => AFF.finance.balance()), source.balance, "Risk display does not change balance");
    await page.keyboard.press("Escape");

    for (const width of [1440, 1111, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      assert.equal(await page.evaluate(() =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      ), true, `${width}: client risk layout has no document overflow`);
    }
    assert.equal(errors.length, 0, `No page errors: ${errors.join("; ")}`);
    console.log(JSON.stringify({ source, columns: 12, result: "Client risk handling checks passed" }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
