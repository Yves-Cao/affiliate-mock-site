const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
async function main() {
  const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  const artifacts = path.join(process.cwd(), ".artifacts");
  fs.mkdirSync(artifacts, { recursive: true });
  try {
    await page.goto(process.env.WITHDRAWAL_BASE_URL || "http://127.0.0.1:4179", { waitUntil: "domcontentloaded" });
    await page.fill("#login-form input[name=email]", "withdrawal-review@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForSelector("#app-view:not(.hidden)");
    await page.evaluate(() => navigate("wd"));
    await page.waitForSelector(".wd-page");
    assert.equal(await page.locator(".wd-page form").count(), 0);
    assert.ok((await page.locator(".wd-page").innerText()).includes("出金方案确认后开放"));
    const snapshot = () => page.evaluate(() => JSON.stringify({ source: AFF.withdrawals, rows: AFF.reporting.rows, metrics: AFF.dashboard.metrics, revenue: AFF.dashboard.totalRevenue }));
    const before = await snapshot();
    await page.locator('[data-withdraw-tab="records"]').click();
    const rows = await page.evaluate(() => AFF.withdrawalsUI.records);
    assert.equal(rows.length, 32);
    assert.equal(rows.filter(row => row.original).length, 4);
    assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
    assert.equal(await page.locator(".wd-table th").count(), 8);
    const total = async () => Number(await page.locator("[data-withdraw-total]").textContent());
    assert.equal(await total(), rows.length);
    async function query(filter = {}) {
      for (const key of ["from", "to", "search"]) await page.fill(`[data-withdraw-filter="${key}"]`, filter[key] || "");
      for (const key of ["status", "method"]) await page.selectOption(`[data-withdraw-filter="${key}"]`, filter[key] || "");
      await page.locator("[data-withdraw-form] button[type=submit]").click();
    }
    await page.selectOption("[data-withdraw-page-size]", "10");
    const ids = [];
    for (let pageIndex = 0; pageIndex < 4; pageIndex += 1) {
      ids.push(...await page.locator("[data-withdraw-detail]").evaluateAll(nodes => nodes.map(node => node.dataset.withdrawDetail)));
      if (pageIndex < 3) await page.getByRole("button", { name: "下一页", exact: true }).click();
    }
    assert.deepEqual(ids, rows.map(row => row.id));
    await page.locator('[data-withdraw-action="reset"]').click();
    await page.selectOption('[data-withdraw-filter="status"]', "rejected");
    assert.equal(await total(), rows.length);
    for (const status of ["paid", "processing", "rejected", "failed", "cancelled"]) {
      await query({ status });
      assert.equal(await total(), rows.filter(row => row.status === status).length);
      const first = rows.find(row => row.status === status);
      await page.locator(`[data-withdraw-detail="${first.id}"]`).click();
      const drawer = page.locator(".wd-drawer");
      assert.ok((await drawer.innerText()).includes(first.id));
      assert.ok((await drawer.innerText()).includes(first.account));
      assert.ok((await drawer.innerText()).includes("A*** P***"));
      assert.ok((await drawer.innerText()).includes("未提供"));
      assert.equal(await drawer.locator("form").count(), 0);
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      assert.equal(await page.locator(".wd-close").evaluate(node => node === document.activeElement), true);
      await page.keyboard.press("Escape");
      assert.equal(await drawer.count(), 0);
      assert.equal(await page.locator(`[data-withdraw-detail="${first.id}"]`).evaluate(node => node === document.activeElement), true);
    }
    await query({ method: "wire", from: "2026-10-01", to: "2026-10-15" });
    assert.equal(await total(), rows.filter(row => row.method === "wire" && row.date >= "2026-10-01" && row.date <= "2026-10-15").length);
    await query({ search: rows[0].id });
    assert.equal(await total(), 1);
    await query({ search: "no-such-request" });
    assert.equal(await total(), 0);
    assert.ok(await page.getByText("暂无提现记录", { exact: true }).isVisible());
    await page.locator('[data-withdraw-action="reset"]').click();
    await page.fill('[data-withdraw-filter="from"]', "2026-10-20");
    await page.fill('[data-withdraw-filter="to"]', "2026-10-01");
    await page.locator("[data-withdraw-form] button[type=submit]").click();
    assert.ok((await page.locator("#wd-filter-error").innerText()).includes("开始日期不得晚于结束日期"));
    assert.equal(await total(), rows.length);
    await query({ status: "paid" });
    await page.reload();
    await page.waitForSelector(".wd-page");
    assert.equal(await total(), rows.filter(row => row.status === "paid").length);
    for (const language of ["zh", "en"]) {
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.mouse.move(width - 10, 10);
        await page.evaluate(language => { AFF.state.language = language; render(); }, language);
        await page.locator('[data-withdraw-action="reset"]').click();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await page.screenshot({ path: path.join(artifacts, `withdrawals-${language}-${width}.png`), fullPage: true });
        await page.locator("[data-withdraw-detail]").first().click();
        const bounds = await page.locator(".wd-drawer").boundingBox();
        assert.ok(bounds.x >= -1 && bounds.x + bounds.width <= width + 1);
        assert.ok(await page.locator(".wd-drawer").evaluate(node => node.scrollWidth <= node.clientWidth + 1));
        const footer = await page.locator(".wd-drawer > footer").boundingBox();
        assert.ok(footer.y >= 0 && footer.y + footer.height <= 1001);
        await page.screenshot({ path: path.join(artifacts, `withdrawal-detail-${language}-${width}.png`) });
        if (width === 1440) await page.locator(".wd-overlay").click({ position: { x: 10, y: 100 } });
        else await page.keyboard.press("Escape");
        assert.equal(await page.locator(".wd-drawer").count(), 0);
      }
    }
    assert.equal(await snapshot(), before);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ records: rows.length, originalRecords: 4, statuses: 5, viewports: [1440, 390], languages: 2, checks: "pagination, staged filters, date validation, ID search, empty/reset, masked details, focus trap, Escape/overlay, reload persistence, no financial mutation, responsive screenshots, no console errors" }, null, 2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
