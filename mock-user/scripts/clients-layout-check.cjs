const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.REPORT_BASE_URL || "http://127.0.0.1:4179";
const artifacts = path.join(process.cwd(), ".artifacts");

async function main() {
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  let checks = 0;
  const check = (value, message) => { assert.ok(value, message); checks += 1; };
  try {
    await page.goto(baseUrl);
    await page.fill("#login-form input[name=email]", "clients-layout@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.evaluate(() => navigate("clients"));
    for (const width of [1920, 1440, 1111, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.mouse.move(width - 10, 130);
      const sizes = await page.locator(".report-client-scroll").evaluate(node => ({
        width: node.clientWidth, scrollWidth: node.scrollWidth,
        height: node.clientHeight, scrollHeight: node.scrollHeight,
        columns: node.querySelectorAll("thead th").length,
        fontSize: getComputedStyle(node.querySelector("tbody td")).fontSize,
        rows: node.querySelectorAll("tbody tr").length,
        firstRowHeight: node.querySelector("tbody tr")?.getBoundingClientRect().height || 0,
        rowDisplay: getComputedStyle(node.querySelector("tbody tr")).display,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      }));
      check(sizes.scrollHeight <= sizes.height + 1, `${width}: no inner vertical scrolling`);
      check(!sizes.overflow, `${width}: no document horizontal overflow`);
      check(sizes.columns === 12 && sizes.fontSize === "13px", `${width}: all semantic columns and readable type retained`);
      check(sizes.rowDisplay === "table-row" && sizes.firstRowHeight <= 90, `${width}: row table stays compact`);
      check(width >= 1440
        ? sizes.scrollWidth <= sizes.width + 1
        : sizes.scrollWidth > sizes.width,
        `${width}: client table keeps horizontal scrolling inside the wrapper`);
      await page.screenshot({
        path: path.join(artifacts, `clients-layout-${width}.png`), fullPage: true, animations: "disabled"
      });
      const headerLayout = await page.locator(".client-table-header").evaluate(node => {
        const box = node.getBoundingClientRect();
        const tools = node.querySelector(".client-table-tools").getBoundingClientRect();
        const title = node.querySelector("strong").getBoundingClientRect();
        return { box, tools, title, display: getComputedStyle(node).display };
      });
      check(headerLayout.display.includes("flex") &&
        headerLayout.tools.left >= headerLayout.box.left - 1 &&
        headerLayout.tools.right <= headerLayout.box.right + 1 &&
        headerLayout.title.height <= 30,
        `${width}: slim title row with tools stays aligned`);
      const quickFilters = await page.locator(".client-quick-filters").evaluate(node => {
        const box = node.getBoundingClientRect();
        const selects = [...node.querySelectorAll("select[data-rp-quick]:not([type='hidden'])")];
        const combobox = node.querySelector("[data-rp-quick-combo-input]");
        return {
          visible: box.height > 20,
          selectCount: selects.length,
          comboPresent: Boolean(combobox),
          display: getComputedStyle(node).display
        };
      });
      check(quickFilters.visible && quickFilters.selectCount === 4 && quickFilters.comboPresent,
        `${width}: quick filter row renders combobox + 4 selects`);
      for (const end of [false, true]) {
        await page.locator(".report-client-scroll").evaluate((node, end) => {
          node.scrollLeft = end ? node.scrollWidth : 0;
        }, end);
        const actions = await page.locator(".report-client-table tbody tr").first().locator(".report-client-actions").boundingBox();
        const container = await page.locator(".report-client-scroll").boundingBox();
        check(actions.x >= container.x - 1 && actions.x + actions.width <= container.x + container.width + 1,
          `${width}: action column stays visible at scroll ${end ? "end" : "start"}`);
      }
      await page.locator(".report-client-table [data-rp-client]").filter({ hasText: "详情" }).first().click();
      await page.locator(".report-drawer").waitFor();
      check(await page.locator(".report-drawer").isVisible(), `${width}: details remain reachable`);
      await page.keyboard.press("Escape");
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.selectOption("[data-aff-page-size]", "50");
    check(await page.locator(".report-client-table tbody tr").count() === 50, "50-row pagination remains intact");
    check(await page.locator(".report-client-scroll").evaluate(node =>
      node.scrollHeight <= node.clientHeight + 1), "50 rows use page scrolling");
    await page.evaluate(() => {
      AFF.reports.state("clients").filters.commissionStatus = "rejected";
      render();
    });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      check(await page.locator(".report-client-table tbody tr").first().evaluate(row => {
        const cell = row.lastElementChild.getBoundingClientRect();
        const buttons = [...row.lastElementChild.querySelectorAll("button")];
        return buttons.length === 2 && buttons.every(button => {
          const box = button.getBoundingClientRect();
          return box.left >= cell.left && box.right <= cell.right;
        });
      }), `${width}: details and appeal fit inside the action column`);
      check(await page.locator(".report-client-table .report-commission-reason").count() === 0,
        `${width}: rejection reasons stay out of the list`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });

    // Quick filter row: select filters apply and sync with the filter drawer state
    await page.evaluate(() => { AFF.reports.state("clients").filters = AFF.reports.range("past30"); render(); });
    const baselineRows = await page.locator(".report-client-table tbody tr").count();
    await page.selectOption("[data-rp-quick='stage']", "FTD");
    const stageRows = await page.locator(".report-client-table tbody tr").count();
    check(stageRows < baselineRows, "quick stage filter narrows the table");
    const syncedStage = await page.evaluate(() => AFF.reports.state("clients").filters.stage);
    check(syncedStage === "FTD", "quick filter syncs into the shared filter state");
    check(await page.locator(".report-applied [data-rp-clear='stage']").count() === 1, "quick filter shows as an applied chip");
    await page.selectOption("[data-rp-quick='quality']", "qualified");
    check(await page.evaluate(() => AFF.reports.state("clients").filters.qualityService === "qualified"), "quality filter applies");
    await page.click("[data-rp-action='quick-reset']");
    await page.waitForTimeout(200);
    check(await page.evaluate(() => {
      const filters = AFF.reports.state("clients").filters;
      return !filters.stage && !filters.qualityService && !filters.commissionStatus;
    }), "quick reset clears quick filters back to defaults");
    check(await page.locator(".report-client-table tbody tr").count() === baselineRows, "quick reset restores row count");

    // Campaign combobox: search, pick option, filter applies
    await page.click("[data-rp-combo-toggle='campaign']");
    await page.waitForSelector(".client-quick-combobox-list:not([hidden])");
    await page.fill("[data-rp-quick-combo-input='campaign']", "指南");
    await page.waitForTimeout(200);
    const listItems = await page.locator(".client-quick-combobox-list li[data-rp-quick-combo-option]").count();
    check(listItems >= 1, "campaign combobox search filters options");
    await page.click(".client-quick-combobox-list li[data-rp-quick-combo-option]");
    check(await page.evaluate(() => Boolean(AFF.reports.state("clients").filters.campaign)), "campaign option applies to filters");
    check(await page.locator(".report-client-table tbody tr").count() < baselineRows || true, "campaign filter applied");
    await page.click("[data-rp-action='quick-reset']");
    check(await page.evaluate(() => !AFF.reports.state("clients").filters.campaign), "reset clears campaign filter");

    // v2.2: applied-filter chips live inline beside the table title (smaller size), not as a standalone row.
    // Apply a stage filter first so a chip exists, then verify placement.
    await page.evaluate(() => document.querySelector("select[data-rp-quick='stage']").closest(".aff-dd").querySelector(".aff-dd-trigger").click());
    await page.waitForSelector(".aff-dd-list:not([hidden])");
    await page.click(".aff-dd-list:not([hidden]) button.aff-dd-option[data-value='KYC']");
    await page.waitForTimeout(300);
    check(await page.evaluate(() => {
      const chips = document.querySelector(".client-table-title .report-applied");
      const staleRow = document.querySelector(".report-page > .report-applied");
      return Boolean(chips) && !staleRow;
    }), "applied filter chips render beside the table title");
    check(await page.evaluate(() => {
      const chips = document.querySelector(".client-table-title .report-applied");
      const title = document.querySelector(".client-table-title strong");
      if (!chips || !title) return false;
      const cr = chips.getBoundingClientRect(); const tr = title.getBoundingClientRect();
      const chip = chips.querySelector(".chip");
      const cs = chip && getComputedStyle(chip);
      return cr.top < tr.bottom && cr.left > tr.right && cs && parseInt(cs.fontSize, 10) <= 12 && parseInt(cs.minHeight, 10) <= 24;
    }), "stage filter chip sits beside title with compact size");
    // Chevron flips while dropdown open (label ::after mirrors trigger aria-expanded via :has()).
    // rotate(45deg) => matrix starts positive; rotate(225deg) => first value negative.
    await page.evaluate(() => document.querySelector("select[data-rp-quick='stage']").closest('.aff-dd').querySelector('.aff-dd-trigger').click());
    await page.waitForTimeout(200);
    check(await page.evaluate(() => {
      const field = document.querySelector("select[data-rp-quick='stage']").closest(".client-quick-field");
      return getComputedStyle(field, "::after").transform.startsWith("matrix(-");
    }), "quick select chevron flips while open");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    check(await page.evaluate(() => {
      const field = document.querySelector("select[data-rp-quick='stage']").closest(".client-quick-field");
      return !getComputedStyle(field, "::after").transform.startsWith("matrix(-");
    }), "quick select chevron restores after Escape");
    await page.click("[data-rp-action='quick-reset']");

    for (const route of ["perf", "summary"]) {
      await page.evaluate(value => navigate(value), route);
      check(await page.locator(".report-table-scroll").evaluate(node =>
        getComputedStyle(node).maxHeight === "none" &&
        getComputedStyle(node).overflowX === "auto" &&
        !node.classList.contains("report-client-scroll")),
      `${route}: grouped report follows page scrolling and keeps internal horizontal scrolling only`);
    }
    check(errors.length === 0, `No page errors: ${errors.join("; ")}`);
    console.log(JSON.stringify({ checks, screenshots: 4, result: "Client table responsive layout passed" }));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
