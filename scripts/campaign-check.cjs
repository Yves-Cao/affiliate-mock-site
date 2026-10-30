const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.CAMPAIGN_BASE_URL || "http://127.0.0.1:4179";
const artifacts = path.join(process.cwd(), ".artifacts");
const clientMetrics = ["registrations", "ftd", "effective", "quality"];

async function main() {
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  context.on("page", tab => {
    tab.on("pageerror", error => errors.push(error.message));
    tab.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });
  });
  const page = await context.newPage();
  let checks = 0;
  const check = (condition, message) => {
    assert.ok(condition, message);
    checks += 1;
  };
  const action = (name, code = "") => page.locator(
    `[data-action="${name}"]${code ? `[data-code="${code}"]` : ""}`
  );
  async function route(id) {
    await page.evaluate(value => navigate(value), id);
    await page.waitForFunction(value => AFF.state.route === value, id);
  }
  async function noOverflow(tab, label) {
    check(await tab.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
    ), label);
  }
  async function capture(name) {
    await page.mouse.move(12, 12);
    await page.screenshot({ path: path.join(artifacts, name), fullPage: false });
  }
  async function checkLeftButton(routeId, selector) {
    await route(routeId);
    const button = await page.locator(selector).boundingBox();
    const main = await page.locator("#main").boundingBox();
    check(button && main && button.x - main.x >= 0 && button.x - main.x < 25,
      `${routeId}: create button is aligned with the left content edge`);
  }
  async function openData(code = "CMP-1001", period = "past30") {
    await route("promo");
    await action("campaign-data", code).click();
    await page.locator(".campaign-data-drawer").waitFor();
    if (period !== "past30") await page.locator("#campaign-period").selectOption(period);
  }
  async function assertDrill(button, contextLabel) {
    const attributes = await button.evaluate(node => ({ ...node.dataset }));
    const displayed = Number((await button.innerText()).replaceAll(",", ""));
    const metric = attributes.metric;
    check(clientMetrics.includes(metric), `${contextLabel}: recognized client metric`);
    const expected = await page.evaluate(({ code, period, dimension, value, metric }) => {
      const filters = { ...AFF.reports.range(period || "past30"), campaignCode: code };
      if (dimension) filters[dimension] = value;
      const source = AFF.reporting.filterRows(filters);
      const milestone = { ftd: "ftdAt", effective: "effectiveAt", quality: "qualityAt" }[metric];
      return {
        filters,
        count: AFF.reporting.totals(source)[metric],
        ids: source.filter(row => row.clientId && (!milestone || row[milestone]))
          .map(row => row.clientId).sort()
      };
    }, attributes);
    check(displayed === expected.count, `${contextLabel}: displayed count matches the source`);
    await page.evaluate(() => {
      Object.assign(AFF.reports.state("clients"), {
        filters: {
          from: "2026-10-01", to: "2026-10-01",
          search: "must-be-replaced", stage: "Registered", commissionStatus: "reversed"
        },
        metric: "quality", page: 9
      });
    });
    await button.click();
    await page.waitForFunction(() => AFF.state.route === "clients");
    const result = await page.evaluate(() => ({
      filters: AFF.reports.state("clients").filters,
      metric: AFF.reports.state("clients").metric,
      page: AFF.reports.state("clients").page,
      ids: AFF.reports.filtered().map(row => row.clientId).sort(),
      modalOpen: !document.querySelector("#modal-root").classList.contains("hidden")
    }));
    assert.deepEqual(result.filters, expected.filters, `${contextLabel}: inherited filters`);
    assert.deepEqual(result.ids, expected.ids, `${contextLabel}: exact matching clients`);
    check(result.metric === metric && result.page === 1 && !result.modalOpen,
      `${contextLabel}: milestone, first page and closed activity drawer`);
    check(Number(await page.locator("[data-rp-total]").textContent()) === expected.count,
      `${contextLabel}: client total matches the clicked count`);
  }
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await page.locator("#login-form input[name=email]").fill("campaign-review@example.com");
    await page.locator("#login-form input[name=password]").fill("demo-password");
    await page.locator("#login-form button[type=submit]").click();
    await page.locator("#app-view:not(.hidden)").waitFor();

    await checkLeftButton("promo", "[data-action='open-campaign-modal']");
    await checkLeftButton("subchannels", "[data-sc-action='create']");
    await checkLeftButton("tracker", "[data-action='open-tracker-modal']");
    await route("assets");
    check(await page.locator("#main > .page-actions").count() === 0,
      "Assets has no separate upper-right action");
    check(await page.locator(".locked-region [data-action='open-code-modal']").isVisible(),
      "Assets retains its in-region code acceptance entry");

    for (const metric of clientMetrics) {
      await route("promo");
      await assertDrill(page.locator(
        `.campaign-list [data-action="campaign-clients"][data-code="CMP-1001"][data-metric="${metric}"]`
      ), `list/${metric}`);
    }
    for (const metric of clientMetrics) {
      await openData("CMP-1001", "past90");
      await assertDrill(page.locator(
        `.campaign-data-metrics [data-action="campaign-clients"][data-metric="${metric}"]`
      ), `overview/${metric}`);
      for (const dimension of ["country", "platform"]) {
        await openData("CMP-1001", "past7");
        await assertDrill(page.locator(
          `.campaign-breakdown [data-action="campaign-clients"][data-dimension="${dimension}"][data-metric="${metric}"]`
        ).first(), `${dimension}/${metric}`);
      }
    }

    await openData();
    await page.keyboard.press("Escape");
    check(await page.locator(".campaign-data-drawer").count() === 0,
      "Escape closes the activity drawer");
    check(await action("campaign-data", "CMP-1001").evaluate(node => node === document.activeElement),
      "Closing the activity drawer restores focus");

    const originalTotals = await page.evaluate(() => AFF.campaignData(AFF.campaigns[0], "past90").totals);
    await page.evaluate(() => {
      AFF.campaignLinks.setStatus(AFF.campaigns.find(item => item.code === "CMP-1001"), "active");
      render();
    });
    const originalLink = await page.evaluate(() =>
      AFF.campaignLinks.url(AFF.campaigns.find(item => item.code === "CMP-1001"))
    );
    check(new URL(originalLink).origin === new URL(baseUrl).origin &&
      new URL(originalLink).searchParams.get("camp") === "CMP-1001",
    "Activity link uses the local status-aware entry with the activity code");
    const gate = await context.newPage();
    await gate.goto(originalLink, { waitUntil: "domcontentloaded" });
    await gate.getByText("继续注册", { exact: true }).waitFor();
    check(await gate.getByText("继续注册", { exact: true }).isVisible(),
      "An active activity allows registration");

    await action("campaign-status", "CMP-1001").click();
    await page.locator("#modal-root [data-action='close-modal']").first().click();
    check(await page.evaluate(() =>
      AFF.campaignLinks.status(AFF.campaigns.find(item => item.code === "CMP-1001"))
    ) === "active", "Cancelling archive leaves the activity active");
    await action("campaign-status", "CMP-1001").click();
    await action("campaign-confirm-status", "CMP-1001").click();
    check(await page.evaluate(() =>
      AFF.campaignLinks.status(AFF.campaigns.find(item => item.code === "CMP-1001"))
    ) === "archived", "Confirming archive updates the activity status");
    await gate.getByText("链接已失效", { exact: true }).waitFor();
    check(!await gate.getByText("继续注册", { exact: true }).isVisible(),
      "Archiving invalidates an already-open activity link in another tab");
    await gate.reload();
    check(await gate.getByText("链接已失效", { exact: true }).isVisible(),
      "The same archived URL remains invalid after reload");
    await page.reload();
    await page.locator(".campaign-list").waitFor();
    check(await page.evaluate(() =>
      AFF.campaignLinks.status(AFF.campaigns.find(item => item.code === "CMP-1001"))
    ) === "archived", "Archive status persists after refreshing the console");
    assert.deepEqual(await page.evaluate(() =>
      AFF.campaignData(AFF.campaigns.find(item => item.code === "CMP-1001"), "past90").totals
    ), originalTotals, "Archiving preserves historical activity totals");
    await action("campaign-status", "CMP-1001").click();
    await action("campaign-confirm-status", "CMP-1001").click();
    await gate.getByText("继续注册", { exact: true }).waitFor();
    check(await page.evaluate(() =>
      AFF.campaignLinks.url(AFF.campaigns.find(item => item.code === "CMP-1001"))
    ) === originalLink, "Reactivating restores the same activity URL");
    await gate.goto(`${baseUrl}/campaign-link.html?camp=CMP-NOT-FOUND`);
    await gate.getByText("链接已失效", { exact: true }).waitFor();
    check(!await gate.getByText("继续注册", { exact: true }).isVisible(),
      "Unknown activity links cannot proceed");
    await gate.close();

    await action("open-campaign-modal").click();
    await page.locator("#campaign-name").fill("QA campaign with no traffic");
    await action("create-campaign").click();
    const created = await page.evaluate(() => {
      const campaign = AFF.campaigns.find(item => item.name === "QA campaign with no traffic");
      return {
        code: campaign.code, status: AFF.campaignLinks.status(campaign),
        totals: AFF.campaignData(campaign).totals,
        url: AFF.campaignLinks.url(campaign)
      };
    });
    check(created.status === "active" &&
      clientMetrics.every(metric => created.totals[metric] === 0),
    "New activities start active with zero clients and no invented conversions");
    await openData(created.code);
    check(await page.locator(".campaign-empty").count() === 2,
      "New activity detail retains both empty dimension tables");
    await page.keyboard.press("Escape");
    await page.reload();
    await page.locator(".campaign-list").waitFor();
    check(await page.evaluate(code => AFF.campaigns.some(item => item.code === code), created.code),
      "New activity is retained after reload");
    const newGate = await context.newPage();
    await newGate.goto(created.url);
    await newGate.getByText("继续注册", { exact: true }).waitFor();
    await newGate.close();

    for (const width of [1440, 1111, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await route("promo");
      await noOverflow(page, `Activity list has no document overflow at ${width}px`);
      await capture(`campaign-list-${width}.png`);
      await openData("CMP-1001", "past90");
      await noOverflow(page, `Activity detail has no document overflow at ${width}px`);
      await capture(`campaign-detail-${width}.png`);
      const drawer = await page.locator(".campaign-data-drawer").boundingBox();
      check(drawer.x >= -1 && drawer.x + drawer.width <= width + 1,
        `Activity drawer fits the viewport at ${width}px`);
      await page.keyboard.press("Escape");
      if (width === 390) {
        await assertDrill(page.locator(
          '.campaign-list [data-action="campaign-clients"][data-code="CMP-1001"][data-metric="effective"]'
        ), "mobile-list/effective");
        await openData("CMP-1001", "past90");
        await assertDrill(page.locator(
          '.campaign-breakdown [data-action="campaign-clients"][data-dimension="platform"][data-metric="quality"]'
        ).first(), "mobile-platform/quality");
      }
      for (const [id, selector] of [
        ["promo", "[data-action='open-campaign-modal']"],
        ["subchannels", "[data-sc-action='create']"],
        ["tracker", "[data-action='open-tracker-modal']"]
      ]) {
        await checkLeftButton(id, selector);
        await noOverflow(page, `${id} has no document overflow at ${width}px`);
      }
    }
    check(errors.length === 0, `No browser errors: ${errors.join("; ")}`);
    console.log(JSON.stringify({
      checks,
      clientDrills: 18,
      screenshots: 6,
      result: "Campaign navigation, drilldowns, archive links and responsive layouts passed"
    }));
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
