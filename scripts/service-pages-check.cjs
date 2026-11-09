const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.SERVICE_BASE_URL || "http://127.0.0.1:4179";
const artifacts = path.join(process.cwd(), ".artifacts");

async function main() {
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(`${baseUrl}/#/guarantee`, { waitUntil: "domcontentloaded" });
    await page.fill("#login-form input[name=email]", "service-pages@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForSelector("#app-view:not(.hidden)");

    await page.evaluate(() => navigate("guarantee"));
    await page.waitForSelector(".finance-page");
    const guarantee = await page.evaluate(() => {
      const records = AFF.finance.guaranteeRecords;
      const blocked = records.filter(item => ["retained", "frozen"].includes(item.status));
      return {
        total: records.length,
        retained: records.filter(item => item.status === "retained").length,
        frozen: records.filter(item => item.status === "frozen").length,
        released: records.filter(item => item.status === "released").length,
        used: records.filter(item => item.status === "used").length,
        blockedCents: blocked.reduce((sum, item) => sum + item.amount, 0),
        clientGuarantee: AFF.reporting.rows.reduce((sum, row) => sum + Math.round((row.guarantee || 0) * 100), 0)
      };
    });
    assert.ok(guarantee.total >= 200, "Guarantee has a meaningful ledger");
    assert.ok(guarantee.retained > 0 && guarantee.released > 0 && guarantee.used > 0, "Core guarantee states remain present");
    assert.ok(guarantee.frozen > 0, "Frozen guarantee state is present");
    assert.equal(guarantee.blockedCents, guarantee.clientGuarantee, "Blocked ledger and client guarantee totals agree");
    await page.selectOption("[data-guarantee-filter='status']", "frozen");
    assert.equal(await page.locator("[data-guarantee-detail]").count(), guarantee.frozen);
    await page.locator("[data-guarantee-detail]").first().click();
    assert.ok((await page.locator(".finance-drawer").innerText()).includes("GUARANTEE-RISK-REVIEW"));
    await page.keyboard.press("Escape");
    await page.locator("[data-guarantee-action='reset']").click();
    await page.selectOption("[data-aff-page-size]", "50");
    assert.equal(await page.locator("[data-guarantee-detail]").count(), 50);

    await page.evaluate(() => navigate("appeals"));
    await page.waitForSelector(".finance-page");
    const appealRows = await page.locator("[data-appeal-detail]").count();
    assert.ok(appealRows > 0 && appealRows <= 10, "Appeal list uses pagination");
    await page.selectOption("[data-appeal-filter='status']", "reviewing");
    const reviewing = await page.locator("[data-appeal-detail]").count();
    assert.ok(reviewing > 0 && reviewing < appealRows, "Appeal status filter narrows rows");
    await page.locator("[data-appeal-detail]").first().click();
    assert.ok((await page.locator(".finance-drawer").innerText()).includes("下一步"));
    await page.keyboard.press("Escape");
    await page.locator("[data-appeal-action='reset']").click();
    await page.selectOption("[data-appeal-filter='taskType']", "investigation");
    const investigationRows = await page.locator("[data-appeal-detail]").count();
    assert.ok(investigationRows > 0, "Investigation evidence tasks are listed");
    await page.locator("[data-appeal-detail]").first().click();
    const investigationDrawer = await page.locator(".finance-drawer").innerText();
    for (const expected of ["响应截止时间", "材料清单", "超时后果", "影响范围", "证据范围", "下一步", "预计处理路径"]) {
      assert.ok(investigationDrawer.includes(expected), `Investigation drawer includes ${expected}`);
    }
    assert.ok(!investigationDrawer.includes("内部评分") && !investigationDrawer.includes("证据全文"));
    await page.keyboard.press("Escape");
    await page.locator("[data-appeal-action='reset']").click();
    await page.locator("[data-appeal-action='toggle']").click();
    await page.fill("[data-appeal-field='objectId']", "COM-C-12008-QF");
    await page.fill("[data-appeal-field='reason']", "请复核关联客户首次入金证据。");
    await page.locator("[data-appeal-action='submit']").click();
    assert.ok((await page.locator("#main").innerText()).includes("APL-U"), "New appeal is persisted in the local list");
    const appealsAfterCreate = await page.locator("[data-appeal-detail]").count();
    assert.ok(appealsAfterCreate > reviewing && appealsAfterCreate <= 10, "Appeal pagination remains stable");

    await page.evaluate(() => navigate("messages"));
    await page.waitForSelector(".finance-page");
    const unreadBefore = Number(await page.locator("#message-count").innerText());
    assert.ok(unreadBefore > 0, "Topbar unread count is populated");
    await page.selectOption("[data-message-filter='level']", "required");
    assert.ok((await page.locator("#main").innerText()).includes("强制确认"), "Required message filter works");
    await page.locator("[data-message-detail]").first().click();
    const messageDrawer = await page.locator(".finance-drawer").innerText();
    assert.ok(messageDrawer.includes("强制确认") && messageDrawer.includes("消息内容"), "Message details open in drawer");
    await page.locator(".finance-drawer [data-message-read]").click();
    const unreadAfter = Number(await page.locator("#message-count").innerText());
    assert.equal(unreadAfter, unreadBefore - 1, "Acknowledgement syncs topbar unread count");
    await page.keyboard.press("Escape");
    await page.selectOption("[data-message-filter='level']", "");
    await page.selectOption("[data-message-filter='type']", "Hold延长");
    await page.locator("[data-message-detail]").first().click();
    await page.locator(".finance-drawer [data-route='pay']").click();
    await page.waitForFunction(() => AFF.state.route === "pay");
    await page.evaluate(() => navigate("messages"));

    for (const width of [1440, 1111, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      for (const route of ["guarantee", "appeals", "messages"]) {
        await page.evaluate(route => navigate(route), route);
        await page.waitForTimeout(180);
        const layout = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          tables: [...document.querySelectorAll("#main table")].map(table => ({
            rows: table.querySelectorAll("tbody tr").length,
            rowHeight: table.querySelector("tbody tr")?.getBoundingClientRect().height || 0
          }))
        }));
        assert.ok(layout.overflow <= 1, `${width}/${route}: no document horizontal overflow`);
        assert.ok(layout.tables.every(table => table.rowHeight <= 130), `${width}/${route}: rows stay compact`);
        await page.screenshot({
          path: path.join(artifacts, `service-${route}-${width}.png`),
          fullPage: true,
          animations: "disabled"
        });
      }
    }

    assert.equal(errors.length, 0, `No page errors: ${errors.join("; ")}`);
    console.log(JSON.stringify({
      guarantee,
      viewports: [1440, 1111, 390],
      result: "Guarantee, appeals and messages service pages passed"
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
