const { chromium } = require("playwright");
const assert = require("node:assert/strict");

const baseUrl = process.env.CLOSURE_BASE_URL || "http://127.0.0.1:4179";

async function main() {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(`${baseUrl}/#/dash`, { waitUntil: "domcontentloaded" });
    await page.fill("#login-form input[name=email]", "closure-check@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForSelector("#app-view:not(.hidden)");

    await page.evaluate(() => navigate("promo"));
    await page.waitForSelector(".campaign-list");
    assert.ok(await page.locator(".campaign-copy").count() > 0, "Normal flow keeps promo links available");

    await page.evaluate(() => {
      AFF.state.scenario = "closure-flow";
      render();
    });

    await page.evaluate(() => navigate("account"));
    await page.waitForSelector(".closure-panel");
    const accountText = await page.locator(".closure-panel").innerText();
    for (const text of ["合作清退与最终结算", "待处理佣金", "保证金", "最终结算", "不承诺具体完成时间"]) {
      assert.ok(accountText.includes(text), `Closure account panel includes ${text}`);
    }

    await page.evaluate(() => navigate("promo"));
    await page.waitForSelector(".closure-withdrawal");
    assert.equal(await page.locator(".campaign-list a").count(), 0, "Closure takes campaign links offline");
    assert.equal(await page.locator(".campaign-copy").count(), 0, "Closure disables campaign link copying");
    assert.ok(await page.locator("[data-action='open-campaign-modal']").isDisabled(), "Closure disables campaign creation");

    await page.evaluate(() => navigate("subchannels"));
    await page.waitForSelector(".closure-withdrawal");
    assert.equal(await page.locator(".sc-table .sc-copy").count(), 0, "Closure disables subchannel link copying");
    assert.ok(await page.locator("[data-sc-action='create']").isDisabled(), "Closure disables subchannel creation");

    await page.evaluate(() => navigate("deep"));
    assert.ok(await page.locator(".deep-link-result [data-copy]").first().isDisabled(), "Closure disables deep-link copying");

    await page.evaluate(() => navigate("assets"));
    await page.waitForSelector(".closure-withdrawal");
    const previews = await page.locator(".asset-preview-button").all();
    assert.ok(previews.length > 0, "Assets remain visible during closure");
    for (const preview of previews) assert.ok(await preview.isDisabled(), "Asset actions are disabled during closure");

    await page.evaluate(() => navigate("wd"));
    assert.equal(await page.locator("[data-withdraw-action='submit-request']").count(), 0, "Closure blocks new withdrawal controls");
    assert.ok((await page.locator("#main").innerText()).includes("已有提现单继续按原状态处理"), "Existing withdrawals remain traceable");

    await page.evaluate(() => navigate("statements"));
    await page.waitForSelector(".closure-statements");
    assert.ok((await page.locator(".closure-statements").innerText()).includes("最终结算单"), "Final settlement appears in statements");

    await page.evaluate(() => navigate("messages"));
    await page.waitForSelector(".finance-page");
    const messageText = await page.locator("#main").innerText();
    assert.ok(messageText.includes("合作清退流程已启动"), "Closure message is present");
    await page.locator("[data-message-detail]").first().click();
    await page.locator(".finance-drawer [data-route='account']").click();
    await page.waitForFunction(() => AFF.state.route === "account");

    for (const route of ["account", "promo", "subchannels", "deep", "assets", "wd", "statements", "messages"]) {
      await page.evaluate(route => navigate(route), route);
      await page.waitForTimeout(100);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, `${route} has no horizontal overflow during closure`);
    }

    assert.equal(errors.length, 0, `No page errors: ${errors.join("; ")}`);
    console.log(JSON.stringify({
      scenario: "closure-flow",
      routes: 8,
      result: "Partner closure flow checks passed"
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
