const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.DASHBOARD_BASE_URL || "http://127.0.0.1:4179";
const artifacts = path.join(process.cwd(), ".artifacts");

async function main() {
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  let checks = 0;
  let drills = 0;
  function check(value, message) {
    assert.ok(value, message);
    checks += 1;
  }
  async function dashboard(period) {
    await page.evaluate(() => navigate("dash"));
    await page.locator(".dashboard-metrics").waitFor();
    if (period) await page.locator("[data-dashboard-period]").selectOption(period);
  }
  async function drill(selector, keyboard = false) {
    const button = page.locator(selector);
    const attrs = await button.evaluate(node => ({ ...node.dataset }));
    const displayed = Number((await button.innerText()).replace(/[$,]/g, ""));
    const expected = await page.evaluate(({ metric, period }) => {
      const data = AFF.reporting;
      const filters = period === "all" ? { from: data.from, to: data.now }
        : period === "month" ? { from: `${data.now.slice(0, 7)}-01`, to: data.now }
        : AFF.reports.range(period);
      const source = data.filterRows(filters).filter(row => row.clientId);
      const milestone = { effective: "effectiveAt", quality: "qualityAt" }[metric];
      const rows = source.filter(row => metric === "revenue"
        ? row.fundStatus === "settled_partial" && row.expected > 0
        : !milestone || row[milestone]);
      return {
        filters: metric === "revenue" ? { ...filters, commissionStatus: "settled_partial" } : filters,
        ids: rows.map(row => row.clientId).sort(),
        value: metric === "revenue" ? rows.reduce((sum, row) => sum + row.available, 0) : rows.length
      };
    }, attrs);
    check(Math.abs(displayed - expected.value) < 0.005, `${attrs.period}/${attrs.metric}: displayed ${displayed} / source ${expected.value}`);
    await page.evaluate(() => {
      Object.assign(AFF.reports.state("clients"), {
        filters: {
          from: "2026-10-01", to: "2026-10-01", country: "XX",
          search: "replace-me", campaignCode: "not-found", stage: "Registered",
          commissionStatus: "reversed", registeredFrom: "2026-10-01"
        },
        page: 9, metric: "quality"
      });
    });
    if (keyboard) {
      await button.focus();
      await page.keyboard.press("Enter");
    } else await button.click();
    await page.waitForFunction(() => AFF.state.route === "clients");
    const result = await page.evaluate(() => ({
      filters: AFF.reports.state("clients").filters,
      metric: AFF.reports.state("clients").metric,
      page: AFF.reports.state("clients").page,
      ids: AFF.reports.filtered().map(row => row.clientId).sort()
    }));
    assert.deepEqual(result.filters, expected.filters, "Drilldown replaces stale filters");
    assert.deepEqual(result.ids, expected.ids, "Drilldown contains the exact matching clients");
    check(result.metric === (attrs.metric === "revenue" ? "registrations" : attrs.metric) &&
      result.page === 1, "Drilldown sets the expected milestone and first page");
    check(Number(await page.locator("[data-rp-total]").textContent()) === expected.ids.length,
      "Visible client total matches the source");
    drills += 1;
  }
  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.locator("#login-form input[name=email]").fill("dashboard-review@example.com");
    await page.locator("#login-form input[name=password]").fill("demo-password");
    await page.locator("#login-form button[type=submit]").click();
    await page.locator("#app-view:not(.hidden)").waitFor();
    await dashboard();
    const totals = await page.evaluate(() => AFF.finance.summary());
    const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
    check((await page.locator(".dashboard-metrics .metric").count()) === 8,
      "Dashboard shows eight core funding and milestone cards");
    check((await page.locator(".dashboard-wallet-card").innerText()).includes(money(AFF.finance.balance() / 100)),
    "Wallet uses the finance available balance");
    check((await page.locator("#main").innerText()).includes(money(totals.inProgress)) &&
      (await page.locator("#main").innerText()).includes(money(totals.paid)),
    "Dashboard computes in-progress and paid amounts from reporting data");
    await drill('.dashboard-metrics [data-metric="effective"]', true);
    for (const period of ["today", "past7", "past30", "lastWeek", "lastMonth"]) {
      for (const metric of ["registrations", "effective", "revenue"]) {
        await dashboard(period);
        await drill(`.dashboard-summary [data-metric="${metric}"]`);
      }
    }
    await dashboard("today");
    const originalRows = await page.evaluate(() => AFF.reporting.rows);
    await page.evaluate(() => {
      AFF.reporting.rows.splice(0, AFF.reporting.rows.length);
      render();
    });
    for (const metric of ["registrations", "effective", "revenue"]) {
      await dashboard("today");
      await drill(`.dashboard-summary [data-metric="${metric}"]`);
    }
    await page.evaluate(rows => {
      AFF.reporting.rows.push(...rows);
      render();
    }, originalRows);
    for (const width of [1440, 1111, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await dashboard();
      check(await page.evaluate(() =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
      `Dashboard fits ${width}px without document overflow`);
      if (width !== 1111) {
        await page.mouse.move(width - 10, 140);
        await page.screenshot({
          path: path.join(artifacts, `dashboard-clients-${width}.png`),
          fullPage: true, animations: "disabled"
        });
      }
      if (width === 390) await drill('.dashboard-summary [data-metric="effective"]');
    }
    check(errors.length === 0, `No browser errors: ${errors.join("; ")}`);
    console.log(JSON.stringify({ checks, drills, screenshots: 2, result: "Dashboard client drilldowns passed" }));
  } finally {
    await browser.close();
  }
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
