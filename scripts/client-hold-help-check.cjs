const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.REPORT_BASE_URL || "http://127.0.0.1:4179";
const popupSelector = "#rp-hold-help";
const triggerSelector = '[data-rp-action="hold-help"]';

async function login(page) {
  await page.goto(baseUrl);
  await page.fill("#login-form input[name=email]", "hold-review@example.com");
  await page.fill("#login-form input[name=password]", "demo-password");
  await page.click("#login-form button[type=submit]");
  await page.waitForSelector("#app-view:not(.hidden)");
}

async function openClient(page, status = "held") {
  await page.evaluate(status => {
    navigate("clients");
    const s = AFF.reports.state("clients");
    s.filters = { from: AFF.reporting.from, to: AFF.reporting.now, commissionStatus: status };
    s.page = 1;
    render();
  }, status);
  assert.equal(await page.locator(".report-client-table .report-commission-reason").count(), 0);
  await page.locator('.report-client-table button[data-rp-client]').first().click();
  await page.locator(".report-drawer").waitFor();
}

async function withinDrawer(page) {
  const bounds = await page.locator(popupSelector).boundingBox();
  const header = await page.locator(".report-drawer > header").boundingBox();
  const footer = await page.locator(".report-drawer > footer").boundingBox();
  assert.ok(bounds.x >= header.x && bounds.x + bounds.width <= page.viewportSize().width + 1);
  assert.ok(bounds.y >= header.y + header.height && bounds.y + bounds.height <= footer.y + 1);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", error => errors.push(error.message));
  const artifacts = path.join(process.cwd(), ".artifacts");
  fs.mkdirSync(artifacts, { recursive: true });
  try {
    await login(page);
    const baseline = await page.evaluate(() => JSON.stringify({
      rows: AFF.reporting.rows, metrics: AFF.dashboard.metrics,
      revenue: AFF.dashboard.totalRevenue, appeals: AFF.state.clientCommissionAppeals
    }));
    for (const status of ["pending", "approved", "rejected", "reversed"]) {
      await openClient(page, status);
      assert.equal(await page.locator(triggerSelector).count(), 0);
      if (["rejected", "reversed"].includes(status)) {
        assert.ok(await page.locator(".report-drawer [data-rp-appeal]").isEnabled());
        const expected = await page.evaluate(() => {
          const row = AFF.reporting.rows.find(row => row.clientId === AFF.reports.state("clients").client);
          return AFF.state.language === "en" ? row.commissionReasonEn : row.commissionReason;
        });
        assert.equal(await page.locator(".report-drawer .report-commission-reason").textContent(), expected);
      }
      await page.keyboard.press("Escape");
    }
    for (const language of ["zh", "en"]) {
      await page.evaluate(language => { AFF.state.language = language; render(); }, language);
      for (const width of [1440, 1111, 390]) {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
        await page.mouse.move(width - 10, 10);
        await openClient(page);
        const trigger = page.locator(triggerSelector);
        await trigger.scrollIntoViewIfNeeded();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await trigger.hover();
        const popup = page.locator(popupSelector);
        await popup.waitFor({ state: "visible" });
        assert.equal(await trigger.getAttribute("aria-expanded"), "true");
        const content = await popup.locator("p, dl").evaluateAll(nodes => nodes.map(node => node.outerHTML).join(""));
        const expected = await page.evaluate(() => AFF.earnings.holdRules());
        const normalize = html => html.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
        assert.equal(normalize(content), normalize(expected));
        assert.ok((await popup.innerText()).includes(language === "en" ? "30 days" : "超过30天"));
        await withinDrawer(page);
        const scrollTop = await page.locator(".report-drawer-body").evaluate(node => node.scrollTop);
        await popup.hover();
        await page.waitForTimeout(160);
        assert.ok(await popup.isVisible());
        assert.equal(await page.locator(".report-drawer-body").evaluate(node => node.scrollTop), scrollTop);
        await page.screenshot({ path: path.join(artifacts, `client-hold-help-${language}-${width}.png`) });
        await page.mouse.move(5, 10);
        await popup.waitFor({ state: "hidden" });
        await page.keyboard.press("Tab");
        await trigger.focus();
        await popup.waitFor({ state: "visible" });
        await page.keyboard.press("Escape");
        assert.equal(await popup.isVisible(), false);
        assert.ok(await page.locator(".report-drawer").isVisible());
        await trigger.hover();
        await popup.waitFor({ state: "visible" });
        await page.locator(".report-drawer-body").evaluate(node => { node.scrollTop -= 20; });
        await popup.waitFor({ state: "hidden" });
        await page.keyboard.press("Escape");
        assert.equal(await page.locator(".report-drawer").count(), 0);
      }
    }
    assert.equal(await page.evaluate(() => JSON.stringify({
      rows: AFF.reporting.rows, metrics: AFF.dashboard.metrics,
      revenue: AFF.dashboard.totalRevenue, appeals: AFF.state.clientCommissionAppeals
    })), baseline);
    const touch = await browser.newPage({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true
    });
    touch.on("pageerror", error => errors.push(error.message));
    await login(touch);
    await openClient(touch);
    const trigger = touch.locator(triggerSelector);
    const popup = touch.locator(popupSelector);
    await trigger.tap();
    await popup.waitFor({ state: "visible" });
    await withinDrawer(touch);
    await trigger.tap();
    await popup.waitFor({ state: "hidden" });
    await trigger.tap();
    await touch.locator(".report-drawer > header h2").tap();
    await popup.waitFor({ state: "hidden" });
    await touch.close();
    assert.deepEqual(errors, []);
    console.log("PASS: held-only help, shared bilingual rules, 3 viewports, hover, keyboard, touch, scrolling, Escape, unchanged financials and appeals.");
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
