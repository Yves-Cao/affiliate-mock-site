const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.REPORT_BASE_URL || "http://127.0.0.1:4179";
const artifacts = path.join(process.cwd(), ".artifacts");
fs.mkdirSync(artifacts, { recursive: true });

async function main() {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await page.fill("#login-form input[name=email]", "report-review@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForSelector("#app-view:not(.hidden)");

    async function route(id) {
      await page.evaluate(value => navigate(value), id);
      await page.waitForSelector(".report-page");
      assert.equal(await page.evaluate(() => AFF.state.route), id);
    }
    async function patchState(id, patch) {
      await page.evaluate(({ id, patch }) => {
        Object.assign(AFF.reports.state(id), patch);
        render();
      }, { id, patch });
    }
    async function getTotal() {
      return Number(await page.locator("[data-rp-total]").textContent());
    }
    async function addGroup(key) {
      await page.click("[data-rp-action='groups']");
      await page.click(`[data-rp-add-group='${key}']`);
    }
    async function captureCsv() {
      const pending = page.waitForEvent("download");
      await page.click("[data-rp-action='export']");
      const download = await pending;
      const csv = fs.readFileSync(await download.path(), "utf8");
      assert.ok(download.suggestedFilename().endsWith(".csv"));
      return csv;
    }
    const dataInfo = await page.evaluate(() => ({
      raw: AFF.reporting.rows.length,
      clients: AFF.reporting.rows.filter(row => row.clientId).length,
      dimensions: AFF.reporting.dimensions.map(item => item.key)
    }));
    assert.ok(dataInfo.raw >= 1200);
    assert.ok(dataInfo.clients >= 200);
    assert.equal(dataInfo.dimensions.length, 20);
    assert.ok(dataInfo.dimensions.every(key => !/track|af_sub/.test(key)));

    await route("perf");
    const defaultTotal = await getTotal();
    assert.equal(defaultTotal, await page.evaluate(() => AFF.reports.tableRows().length));
    await page.click("[data-rp-action='groups']");
    const optionKeys = await page.locator("[data-rp-add-group]").evaluateAll(nodes => nodes.map(node => node.dataset.rpAddGroup));
    assert.equal(optionKeys.length + 1, 20);
    assert.ok(optionKeys.every(key => !/track|af_sub/.test(key)));
    await page.fill("[data-rp-group-search]", "操作系统");
    assert.equal(await page.locator("[data-rp-add-group]").count(), 1);
    assert.equal(await page.locator("[data-rp-add-group]").getAttribute("data-rp-add-group"), "os");
    await page.keyboard.press("Escape");
    for (const grain of ["week", "month", "year", "date"]) {
      await addGroup(grain);
      const groups = await page.evaluate(() => AFF.reports.state().groups);
      assert.deepEqual(groups, [grain]);
      assert.equal(await getTotal(), await page.evaluate(() => AFF.reports.tableRows().length));
    }
    await addGroup("country");
    assert.ok(await page.locator("[data-rp-action='groups']").isDisabled());
    assert.deepEqual(await page.evaluate(() => AFF.reports.state().groups), ["date", "country"]);
    await page.click("[data-rp-remove-group='date']");
    await addGroup("platform");
    assert.deepEqual(await page.evaluate(() => AFF.reports.state().groups), ["country", "platform"]);
    const firstRow = await page.locator(".report-table tbody tr:not(.report-total)").first().locator("td").allTextContents();
    const expectedFirst = await page.evaluate(() => AFF.reports.tableRows()[0]);
    assert.deepEqual(firstRow.slice(0, 2), expectedFirst.values);
    assert.equal(Number(firstRow[2].replaceAll(",", "")), expectedFirst.metrics.clicks);
    await page.click("[data-rp-sort='clicks']");
    await page.click("[data-rp-sort='clicks']");
    assert.equal(await page.locator("[data-rp-sort='clicks']").locator("..").getAttribute("aria-sort"), "ascending");
    const sorted = await page.evaluate(() => AFF.reports.tableRows().map(row => row.metrics.clicks));
    assert.ok(sorted.every((value, index) => !index || value >= sorted[index - 1]));

    const unfilteredTotal = await getTotal();
    await page.click("[data-rp-action='filters']");
    await page.selectOption("[data-rp-filter='country']", "新加坡");
    assert.equal(await page.evaluate(() => AFF.reports.state().filters.country || ""), "");
    assert.equal(await getTotal(), unfilteredTotal);
    await page.locator(".report-drawer footer [data-rp-action='close']").click();
    assert.equal(await page.evaluate(() => AFF.reports.state().filters.country || ""), "");
    await page.click("[data-rp-action='filters']");
    await page.selectOption("[data-rp-filter='country']", "新加坡");
    await page.selectOption("[data-rp-filter='platform']", "Web");
    await page.click("[data-rp-action='apply']");
    assert.equal(await page.locator(".report-drawer").count(), 0);
    assert.ok(await getTotal() > 0);
    assert.ok(await page.evaluate(() => AFF.reports.filtered().every(row => row.country === "新加坡" && row.platform === "Web")));
    assert.equal(await getTotal(), 1);

    await page.click("[data-rp-action='filters']");
    await page.fill("[data-rp-filter='from']", "2026-10-27");
    await page.fill("[data-rp-filter='to']", "2026-10-01");
    await page.click("[data-rp-action='apply']");
    assert.match(await page.locator("#rp-validation").innerText(), /有效的日期/);
    assert.equal(await page.evaluate(() => AFF.reports.state().filters.from), "2026-09-28");
    await page.fill("[data-rp-filter='from']", "2025-01-01");
    await page.fill("[data-rp-filter='to']", "2025-01-02");
    await page.click("[data-rp-action='apply']");
    assert.equal(await getTotal(), 0);
    assert.match(await page.locator(".report-empty").innerText(), /暂无数据/);
    await page.click(".report-empty [data-rp-action='reset']");
    assert.ok(await getTotal() > 0);
    assert.equal(await page.evaluate(() => AFF.reports.state().filters.country || ""), "");

    await page.click("[data-rp-remove-group='country']");
    await page.click("[data-rp-remove-group='platform']");
    assert.equal(await getTotal(), 1);
    assert.equal(await page.locator(".report-table tbody tr").count(), 1, "Ungrouped report should show a single total row");
    assert.deepEqual(await page.evaluate(() => AFF.reports.state().groups), []);
    const allMetric = await page.evaluate(() => AFF.reports.tableRows()[0].metrics);
    const allTotals = await page.evaluate(() => AFF.reporting.totals(AFF.reports.filtered()));
    assert.deepEqual(allMetric, allTotals);
    await addGroup("date");
    await addGroup("country");
    await page.selectOption("[data-rp-period]", "past90");
    assert.ok(await getTotal() > 200, "Multi-dimensional report should expose more than 200 grouped rows");
    await page.selectOption("[data-rp-page-size]", "50");
    assert.equal(await page.locator(".report-table tbody tr:not(.report-total)").count(), 50);
    const pageOne = await page.locator(".report-table tbody tr:not(.report-total)").first().innerText();
    await page.click("[data-rp-action='next']");
    assert.equal(await page.evaluate(() => AFF.reports.state().page), 2);
    assert.notEqual(await page.locator(".report-table tbody tr:not(.report-total)").first().innerText(), pageOne);
    const groupedCount = await getTotal();
    const reportCsv = await captureCsv();
    assert.equal(reportCsv.split("\r\n").length, groupedCount + 1, "Export must include every filtered row, not just current page");
    assert.match(reportCsv, /日期/);
    assert.match(reportCsv, /国家\/地区/);

    await page.click("[data-rp-action='columns']");
    await page.click("[data-rp-action='all-columns']");
    await page.click("[data-rp-action='apply']");
    assert.equal(await page.locator(".report-table thead th").count(), 20);
    await page.click("[data-rp-action='columns']");
    await page.click("[data-rp-action='default-columns']");
    await page.click("[data-rp-action='apply']");
    assert.equal(await page.locator(".report-table thead th").count(), 12);

    await route("summary");
    const cardsBefore = await page.locator(".report-stats").innerText();
    await addGroup("country");
    assert.equal(await page.locator(".report-stats").innerText(), cardsBefore, "Grouping must not change summary cards");
    await page.click("[data-rp-action='filters']");
    await page.selectOption("[data-rp-filter='country']", "泰国");
    await page.click("[data-rp-action='apply']");
    assert.notEqual(await page.locator(".report-stats").innerText(), cardsBefore);
    const expectedRegistrations = await page.evaluate(() => AFF.reporting.totals(AFF.reports.filtered()).registrations);
    await page.click(".report-stats [data-rp-drill-metric='registrations']");
    assert.equal(await page.evaluate(() => AFF.state.route), "clients");
    assert.equal(await getTotal(), expectedRegistrations);

    for (const grain of ["week", "month", "year"]) {
      await route("perf");
      await patchState("perf", {
        groups: [grain, "country"], columns: ["registrations", "ftd", "effective", "qualified"],
        filters: { from: "2026-09-03", to: "2026-10-17" }, sort: grain, direction: "asc", page: 1
      });
      const selected = await page.evaluate(() => AFF.reports.tableRows().find(row => row.metrics.qualified > 0));
      assert.ok(selected);
      await page.evaluate(rowKey => {
        const button = [...document.querySelectorAll("[data-rp-row]")].find(node => node.dataset.rpRow === rowKey && node.dataset.rpDrillMetric === "qualified");
        if (button) button.click();
        else {
          const index = AFF.reports.tableRows().findIndex(row => row.key === rowKey);
          AFF.reports.state().page = Math.floor(index / AFF.reports.state().pageSize) + 1;
          render();
          [...document.querySelectorAll("[data-rp-row]")].find(node => node.dataset.rpRow === rowKey && node.dataset.rpDrillMetric === "qualified").click();
        }
      }, selected.key);
      assert.equal(await page.evaluate(() => AFF.state.route), "clients");
      assert.equal(await getTotal(), selected.metrics.qualified, `${grain} drilldown count differs from grouped count`);
      const filters = await page.evaluate(() => AFF.reports.state().filters);
      assert.ok(filters.from >= "2026-09-03" && filters.to <= "2026-10-17", "Drilldown must intersect original date bounds");
    }

    await route("clients");
    await patchState("clients", {
      filters: { from: "2026-07-30", to: "2026-10-27" }, preset: "past90", page: 1, pageSize: 10, metric: null
    });
    assert.equal(await getTotal(), dataInfo.clients);
    await page.click("[data-rp-sort='stage']");
    await page.click("[data-rp-sort='stage']");
    const stages = await page.evaluate(() => AFF.reports.tableRows().map(row => row.qualifiedAt ? 3 : row.effectiveAt ? 2 : row.ftdAt ? 1 : 0));
    assert.ok(stages.every((value, index) => !index || value >= stages[index - 1]), "Conversion stages must sort by progression");
    await page.click("[data-rp-action='filters']");
    await page.selectOption("[data-rp-filter='commissionStatus']", "pending");
    await page.click("[data-rp-action='apply']");
    assert.ok(await getTotal() > 0, "Pending commission filter must return clients");
    assert.ok(await page.evaluate(() => AFF.reports.filtered().every(row => row.expected > 0 && row.commissionStatus === "pending")));
    await page.click("[data-rp-clear='commissionStatus']");
    await page.locator("[data-rp-client]").first().click();
    assert.equal(await page.locator(".report-drawer[role='dialog'][aria-modal='true']").count(), 1);
    assert.match(await page.locator(".report-drawer").innerText(), /\*\*\*@example\.com/);
    assert.match(await page.locator(".report-drawer").innerText(), /转化进度/);
    const closeButtons = page.locator(".report-drawer button");
    await closeButtons.last().focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector(".report-drawer button")), true);
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.evaluate(() => document.activeElement === [...document.querySelectorAll(".report-drawer button")].at(-1)), true);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".report-drawer").count(), 0);
    assert.ok(await page.evaluate(() => Boolean(document.activeElement?.dataset.rpClient)));
    const commissionTotals = await page.evaluate(() => AFF.reporting.totals(AFF.reporting.rows));
    await page.locator("[data-rp-action='commission-help']").click();
    assert.ok(await page.locator("#rp-commission-help").isVisible());
    assert.match(await page.locator("#rp-commission-help").innerText(), /观察期[\s\S]*核验[\s\S]*退款/);
    await page.keyboard.press("Escape");
    assert.ok(await page.locator("#rp-commission-help").isHidden());
    for (const commissionStatus of ["rejected", "reversed"]) {
      await page.click("[data-rp-action='filters']");
      await page.selectOption("[data-rp-filter='commissionStatus']", commissionStatus);
      await page.click("[data-rp-action='apply']");
      assert.ok(await getTotal() > 1);
      const record = await page.evaluate(() => AFF.reports.tableRows()[0]);
      const row = page.locator(".report-client-table tbody tr").first();
      assert.equal(await row.locator(".report-commission-reason").count(), 0);
      await row.locator("[data-rp-appeal]").click();
      assert.match(await page.locator(".report-drawer").innerText(), new RegExp(record.commissionId));
      assert.match(await page.locator(".report-drawer").innerText(), new RegExp(record.commissionReason));
      await page.click("[data-rp-action='submit-client-appeal']");
      assert.equal(await page.locator("#rp-appeal-error").innerText(), "请填写申诉说明");
      await page.fill("#rp-appeal-reason", "请求复核该佣金的处理结果");
      await page.keyboard.press("Escape");
      assert.equal(await page.evaluate(id => AFF.state.clientCommissionAppeals?.[id], record.commissionId), undefined);
      await row.locator("[data-rp-appeal]").click();
      await page.fill("#rp-appeal-reason", "请根据相关入金及客户资料重新核实。");
      await page.click("[data-rp-action='submit-client-appeal']");
      assert.match(await page.locator(".report-drawer").innerText(), /申诉已提交/);
      const appeal = await page.evaluate(id => AFF.state.clientCommissionAppeals[id], record.commissionId);
      assert.equal(appeal.clientId, record.clientId);
      assert.equal(appeal.commissionId, record.commissionId);
      assert.equal(appeal.status, "pending");
      assert.equal(await page.evaluate(id => AFF.reporting.rows.find(item => item.commissionId === id).commissionStatus, record.commissionId), commissionStatus);
      await page.keyboard.press("Escape");
      assert.ok(await row.locator("[data-rp-appeal]").isDisabled());
      assert.ok(await page.locator(".report-client-table tbody tr").nth(1).locator("[data-rp-appeal]").isEnabled());
      await page.reload();
      assert.ok(await page.locator(".report-client-table tbody tr").first().locator("[data-rp-appeal]").isDisabled());
      await page.click("[data-rp-clear='commissionStatus']");
    }
    assert.deepEqual(await page.evaluate(() => AFF.reporting.totals(AFF.reporting.rows)), commissionTotals);
    const originalCampaign = await page.evaluate(() => {
      const row = AFF.reporting.rows.find(item => item.clientId);
      const original = { id: row.id, campaign: row.campaign };
      row.campaign = '=HYPERLINK("https://example.com","test")';
      return original;
    });
    const clientCsv = await captureCsv();
    assert.equal(clientCsv.split("\r\n").length, dataInfo.clients + 1);
    assert.match(clientCsv, /\*\*\*@example\.com/);
    assert.ok(clientCsv.includes("\"'=HYPERLINK("), "CSV cells must neutralize spreadsheet formulas");
    await page.evaluate(original => {
      AFF.reporting.rows.find(row => row.id === original.id).campaign = original.campaign;
    }, originalCampaign);

    await route("perf");
    await patchState("perf", {
      groups: ["country", "platform"], filters: { from: "2026-09-28", to: "2026-10-27", source: "Telegram" },
      columns: ["clicks", "registrations", "qualified", "expected"], pageSize: 20, page: 1
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    const restored = await page.evaluate(() => AFF.reports.state());
    assert.deepEqual(restored.groups, ["country", "platform"]);
    assert.equal(restored.filters.source, "Telegram");
    assert.equal(restored.pageSize, 20);
    assert.deepEqual(restored.columns, ["clicks", "registrations", "qualified", "expected"]);
    assert.ok(!restored.drawer && !restored.client && !restored.picker);

    for (const width of [1920, 1366, 1111, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
      for (const id of ["perf", "summary", "clients"]) {
        await route(id);
        await patchState(id, {
          filters: { from: "2026-09-28", to: "2026-10-27" }, preset: "past30", metric: null, page: 1,
          ...(id === "clients" ? {} : { groups: ["country", "platform"] })
        });
        await page.mouse.move(width - 30, 110);
        await page.evaluate(() => document.activeElement?.blur());
        await page.waitForTimeout(280);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert.ok(overflow <= 2, `${id} page overflows viewport at ${width}px by ${overflow}px`);
        if (width < 768) {
          const bounds = await page.evaluate(() => ({
            sidebar: document.querySelector("#sidebar").getBoundingClientRect().width,
            mainLeft: document.querySelector("#main").getBoundingClientRect().left
          }));
          assert.ok(Math.abs(bounds.sidebar - 68) < 2 && bounds.mainLeft >= 68, `${id} sidebar overlaps mobile content: ${JSON.stringify(bounds)}`);
        }
        assert.ok(await page.locator(".report-table").isVisible());
        if (id === "clients") {
          await page.click("[data-rp-action='commission-help']");
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          assert.ok(await page.locator("#rp-commission-help").isVisible(), `Commission help must stay open after scrolling into view at ${width}px`);
          const helpBounds = await page.locator("#rp-commission-help").boundingBox();
          assert.ok(helpBounds.x >= 0 && helpBounds.x + helpBounds.width <= width && helpBounds.y >= 0 && helpBounds.y + helpBounds.height <= page.viewportSize().height);
          await page.keyboard.press("Escape");
        }
        await page.screenshot({ path: path.join(artifacts, `reports-${id}-${width}.png`), fullPage: true });
      }
      await page.click("[data-rp-action='filters']");
      const rect = await page.locator(".report-drawer").boundingBox();
      assert.ok(rect && rect.x >= 0 && rect.x + rect.width <= width + 1, `Filter drawer overflows at ${width}px`);
      await page.keyboard.press("Escape");
    }
    assert.deepEqual(errors, []);
    console.log(`Reports UI checks passed: ${dataInfo.raw} records, ${dataInfo.clients} clients, 20 dimensions; grouping/filter/sort/export/drilldown/keyboard/persistence and 12 responsive screenshots.`);
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
