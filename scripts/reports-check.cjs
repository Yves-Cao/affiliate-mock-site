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
      return Number(await page.locator("[data-aff-total]").textContent());
    }
    async function setReportDates(from, to) {
      await page.evaluate(({ from, to }) => {
        const root = document.querySelector("[data-range-id='report-range-perf']");
        root.dataset.rangeFrom = from;
        root.dataset.rangeTo = to;
        root.dispatchEvent(new CustomEvent("date-range-change", {
          bubbles: true,
          detail: { id: "report-range-perf", from, to }
        }));
      }, { from, to });
    }
    async function addGroup(key) {
      await page.click("[data-rp-action='groups']");
      await page.waitForSelector(".report-group-menu");
      await page.click(`[data-rp-add-group='${key}']`);
    }
    async function captureCsv() {
      /* D-EXPORT-PAGE: data pages carry only the entry row; the task list
       * lives on the standalone export center page. */
      const originRoute = await page.evaluate(() => AFF.state.route);
      const pending = page.waitForEvent("download");
      await page.click("[data-export-action='create']");
      await page.evaluate(() => navigate("export"));
      /* The just-created task sorts to the TOP row (id starts with EXP-U);
       * find it explicitly instead of relying on DOM order. */
      await page.waitForFunction(() => {
        const userRows = [...document.querySelectorAll(".export-page [data-export-task^='EXP-U']")];
        return userRows.length && userRows.every(row => row.innerText.includes("已生成") || row.innerText.includes("生成失败"));
      });
      const userRow = page.locator(".export-page [data-export-task^='EXP-U']").first();
      if (await userRow.locator("[data-export-action='retry']:not([disabled])").count()) {
        await userRow.locator("[data-export-action='retry']:not([disabled])").click();
        await page.waitForFunction(() => [...document.querySelectorAll(".export-page [data-export-task^='EXP-U']")].some(row => row.innerText.includes("已生成")));
        await page.waitForTimeout(150);   // let the settled re-render replace the row node
      }
      /* Re-resolve the row: the settle re-render replaces the DOM node,
       * so a locator captured before retry points at a detached element. */
      await page.locator(".export-page [data-export-task^='EXP-U']").first()
        .locator("[data-export-action='download']:not([disabled])").click();
      const download = await pending;
      const csv = fs.readFileSync(await download.path(), "utf8");
      assert.ok(download.suggestedFilename().endsWith(".csv"));
      await page.evaluate(id => navigate(id), originRoute);   // back to the data page
      await page.waitForSelector(".report-page");
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
    const expectedDisplay = await page.evaluate(values => values.map(value => AFF.dataText(value)), expectedFirst.values);
    assert.deepEqual(firstRow.slice(0, 2), expectedDisplay);
    assert.equal(Number(firstRow[2].replaceAll(",", "")), expectedFirst.metrics.clicks);
    await page.click("[data-rp-sort='clicks']");
    await page.click("[data-rp-sort='clicks']");
    assert.equal(await page.locator("[data-rp-sort='clicks']").locator("xpath=../..").getAttribute("aria-sort"), "ascending");
    const sorted = await page.evaluate(() => AFF.reports.tableRows().map(row => row.metrics.clicks));
    assert.ok(sorted.every((value, index) => !index || value >= sorted[index - 1]));

    const unfilteredTotal = await getTotal();
    await page.click("[data-rp-action='filters']");
    await page.selectOption("[data-rp-filter='country']", "KZ");
    assert.equal(await page.evaluate(() => AFF.reports.state().filters.country || ""), "");
    assert.equal(await getTotal(), unfilteredTotal);
    await page.locator(".report-drawer footer [data-rp-action='close']").click();
    assert.equal(await page.evaluate(() => AFF.reports.state().filters.country || ""), "");
    await page.click("[data-rp-action='filters']");
    await page.selectOption("[data-rp-filter='country']", "KZ");
    await page.selectOption("[data-rp-filter='platform']", "Android");
    await page.click("[data-rp-action='apply']");
    assert.equal(await page.locator(".report-drawer").count(), 0);
    assert.ok(await getTotal() > 0);
    assert.ok(await page.evaluate(() => AFF.reports.filtered().every(row => row.country === "KZ" && row.platform === "Android")));
    assert.equal(await getTotal(), 1);

    await page.click("[data-rp-action='filters']");
    await setReportDates("2026-10-27", "2026-10-01");
    await page.click("[data-rp-action='apply']");
    assert.match(await page.locator("#rp-validation").innerText(), /有效的日期/);
    assert.equal(await page.evaluate(() => AFF.reports.state().filters.from), "2026-09-28");
    await setReportDates("2025-01-01", "2025-01-02");
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
    for (const key of ["clicks", "visitors", "registrations", "ftd", "effective", "quality", "expected", "reversed"]) {
      assert.equal(allMetric[key], allTotals[key], `${key} must stay consistent between aggregate and source totals`);
    }
    await addGroup("date");
    await addGroup("country");
    await page.selectOption("[data-rp-period]", "past90");
    assert.ok(await getTotal() > 200, "Multi-dimensional report should expose more than 200 grouped rows");
    await page.selectOption("[data-aff-page-size]", "50");
    assert.equal(await page.locator(".report-table tbody tr:not(.report-total)").count(), 50);
    const pageOne = await page.locator(".report-table tbody tr:not(.report-total)").first().innerText();
    await page.click("[data-aff-page][aria-label='下一页'], [data-aff-page][aria-label='Next page']");
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
    assert.equal(
      await page.locator(".report-table thead th").count(),
      await page.evaluate(() => AFF.reports.state().groups.length + AFF.reporting.metrics.length)
    );
    await page.click("[data-rp-action='columns']");
    await page.click("[data-rp-action='default-columns']");
    await page.click("[data-rp-action='apply']");
    assert.equal(
      await page.locator(".report-table thead th").count(),
      await page.evaluate(() => AFF.reports.state().groups.length + AFF.reports.state().columns.length)
    );

    await route("summary");
    const cardsBefore = await page.locator(".report-stats").innerText();
    await addGroup("country");
    assert.equal(await page.locator(".report-stats").innerText(), cardsBefore, "Grouping must not change summary cards");
    await page.click("[data-rp-action='filters']");
    await page.selectOption("[data-rp-filter='country']", "TH");
    await page.click("[data-rp-action='apply']");
    assert.notEqual(await page.locator(".report-stats").innerText(), cardsBefore);
    const expectedFtd = await page.evaluate(() => AFF.reporting.totals(AFF.reports.filtered()).ftd);
    await page.click(".report-stats [data-rp-drill-metric='ftd']");
    assert.equal(await page.evaluate(() => AFF.state.route), "clients");
    assert.equal(await getTotal(), expectedFtd);

    for (const grain of ["week", "month", "year"]) {
      await route("perf");
      await patchState("perf", {
        groups: [grain, "country"], columns: ["registrations", "ftd", "effective", "quality"],
        filters: { from: "2026-09-03", to: "2026-10-17" }, sort: grain, direction: "asc", page: 1
      });
      const selected = await page.evaluate(() => AFF.reports.tableRows().find(row => row.metrics.quality > 0));
      assert.ok(selected);
      await page.evaluate(rowKey => {
        const button = [...document.querySelectorAll("[data-rp-row]")].find(node => node.dataset.rpRow === rowKey && node.dataset.rpDrillMetric === "quality");
        if (button) button.click();
        else {
          const index = AFF.reports.tableRows().findIndex(row => row.key === rowKey);
          AFF.reports.state().page = Math.floor(index / AFF.reports.state().pageSize) + 1;
          render();
          [...document.querySelectorAll("[data-rp-row]")].find(node => node.dataset.rpRow === rowKey && node.dataset.rpDrillMetric === "quality").click();
        }
      }, selected.key);
      assert.equal(await page.evaluate(() => AFF.state.route), "clients");
      assert.equal(await getTotal(), selected.metrics.quality, `${grain} drilldown count differs from grouped count`);
      const filters = await page.evaluate(() => AFF.reports.state().filters);
      assert.ok(filters.from >= "2026-09-03" && filters.to <= "2026-10-17", "Drilldown must intersect original date bounds");
    }

    await route("clients");
    assert.deepEqual(
      await page.evaluate(() => {
        const s = AFF.reports.state("clients");
        return [s.sort, s.direction];
      }),
      ["registeredAt", "desc"],
      "Client data defaults to registration time descending"
    );
    const reportingFrom = await page.evaluate(() => AFF.reporting.from);
    const expectedClients = await page.evaluate(from =>
      AFF.reporting.rows.filter(row => row.clientId && row.date >= from && row.date <= AFF.reporting.now).length,
      reportingFrom);
    await patchState("clients", {
      filters: { from: reportingFrom, to: "2026-10-27" }, preset: "past90", page: 1, pageSize: 10, metric: null
    });
    assert.equal(await getTotal(), expectedClients);
    const clientHeaders = await page.locator(".report-client-table thead").innerText();
    assert.ok(clientHeaders.includes("KYC状态") && clientHeaders.includes("注册信息"), "Client headers use the updated labels");
    assert.equal(await page.locator("[data-rp-column-help='registration']").count(), 1, "Registration column has an explanation");
    assert.equal(await page.locator("[data-rp-column-help='quality']").count(), 1, "Quality service column has an explanation");
    assert.equal(await page.locator("[data-rp-column-help='expected']").count(), 1, "Expected commission column has an explanation");
    assert.equal(await page.locator("[data-rp-sort='campaign']").count(), 0, "Campaign source is not sortable");
    assert.equal(await page.locator("[data-rp-sort='kyc']").count(), 0, "KYC is not sortable");
    assert.equal(await page.locator("[data-rp-sort='expected']").count(), 0, "Expected commission is not sortable");
    assert.equal(await page.locator("[data-rp-sort='settled']").count(), 0, "Settled commission is not sortable");
    assert.equal(await page.locator("[data-rp-sort='stage']").count(), 0, "Conversion stage is not sortable");
    assert.equal(await page.locator("[data-rp-sort='commissionStatus']").count(), 0, "Fund status is not sortable");
    assert.ok(!(await page.locator(".report-expected-cell").first().innerText()).includes("参考值"), "Expected commission does not show reference-value label");
    await page.click("[data-rp-column-help='stage']");
    const stageHelp = await page.locator("#rp-floating-help").innerText();
    for (const stage of ["注册", "KYC", "FTD", "有效FTD", "质量服务", "已完成", "已作废"]) {
      assert.ok(stageHelp.includes(stage), `Conversion-stage explanation includes ${stage}`);
    }
    await page.mouse.click(12, 12);
    await page.click("[data-rp-column-help='riskHandlingStatus']");
    const riskHelp = await page.locator("#rp-floating-help").innerText();
    for (const risk of ["无风险", "调查中", "隔离中", "已解除"]) {
      assert.ok(riskHelp.includes(risk), `Risk explanation includes ${risk}`);
    }
    await page.mouse.click(12, 12);
    const tierLayout = await page.locator(".report-progress").first().evaluate(node => ({
      whiteSpace: getComputedStyle(node).whiteSpace,
      textWhiteSpace: getComputedStyle(node.querySelector("strong")).whiteSpace,
      height: node.getBoundingClientRect().height,
      contentHeight: node.scrollHeight
    }));
    assert.equal(tierLayout.whiteSpace, "nowrap", "Tier values stay on one line");
    assert.equal(tierLayout.textWhiteSpace, "nowrap", "Tier text stays on one line");
    assert.ok(tierLayout.contentHeight <= tierLayout.height + 1, "Tier cell does not grow from wrapping");
    const kycPendingClient = await page.evaluate(() =>
      AFF.reporting.rows.find(row => row.clientId && row.kyc !== "通过")?.clientId
    );
    assert.ok(kycPendingClient, "A client without completed KYC exists");
    await page.evaluate(id => {
      const s = AFF.reports.state("clients");
      s.filters = { from: AFF.reporting.from, to: AFF.reporting.now, search: id };
      s.page = 1;
      render();
    }, kycPendingClient);
    assert.equal(await page.locator(".report-progress").first().innerText(), "KYC未完成", "KYC-incomplete clients have no confirmed tier");
    await page.locator(".report-progress").first().click();
    assert.match(await page.locator("#rp-floating-help").innerText(), /完成KYC|KYC/);
    await page.mouse.click(12, 12);
    const confirmedTierClient = await page.evaluate(() =>
      AFF.reporting.rows.find(row => row.clientId && row.kyc === "通过" && row.effectiveAt && row.tier && row.tier !== "-")?.clientId
    );
    assert.ok(confirmedTierClient, "A client with a confirmed tier exists");
    await page.evaluate(id => {
      const s = AFF.reports.state("clients");
      s.filters = { from: "2026-01-01", to: AFF.reporting.now, search: id };
      s.page = 1;
      render();
    }, confirmedTierClient);
    await page.locator(".report-progress").first().click();
    assert.match(await page.locator("#rp-floating-help").innerText(), /净入金 ≥|累计标准手数|交易活跃天数/);
    await page.mouse.click(12, 12);
    const settlementCandidate = await page.evaluate(() => {
      const row = AFF.reporting.rows.find(item => item.clientId &&
        item.commissionCases?.some(commissionCase => commissionCase.status === "held" && !commissionCase.settlement));
      if (!row) return null;
      return {
        id: row.clientId,
        heldCase: row.commissionCases.some(item => item.status === "held" && !item.settlement),
        settled: row.commissionCases.filter(item => item.settlement)
          .reduce((sum, item) => sum + Number(item.settlement.grossAmount || 0) / 100, 0),
        allCases: row.commissionCases.reduce((sum, item) => sum + Number(item.amountCents || item.amount || 0) / 100, 0)
      };
    });
    assert.ok(settlementCandidate?.heldCase, "A client with an unsettled held commission exists");
    await page.evaluate(({ id }) => {
      const s = AFF.reports.state("clients");
      s.filters = { from: AFF.reporting.from, to: AFF.reporting.now, search: id };
      s.page = 1;
      render();
    }, settlementCandidate);
    const settledText = await page.locator(".report-settled-cell strong").first().innerText();
    const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
    assert.equal(settledText, money(settlementCandidate.settled), "Settled commission excludes on-hold cases");
    assert.notEqual(settlementCandidate.settled, settlementCandidate.allCases, "Settled amount excludes the held sample's unsettled cases");
    await page.evaluate(() => {
      const s = AFF.reports.state("clients");
      s.filters = { from: AFF.reporting.from, to: AFF.reporting.now };
      s.page = 1;
      render();
    });
    await page.click("[data-rp-action='filters']");
    await page.selectOption("[data-rp-filter='commissionStatus']", "pending_review");
    await page.click("[data-rp-action='apply']");
    assert.ok(await getTotal() > 0, "Pending commission filter must return clients");
    assert.ok(await page.evaluate(() => AFF.reports.filtered().every(row => row.fundStatus === "pending_review")));
    await page.click("[data-rp-clear='commissionStatus']");
    await page.locator("[data-rp-client]").first().click();
    assert.equal(await page.locator(".report-drawer[role='dialog'][aria-modal='true']").count(), 1);
    assert.match(await page.locator(".report-drawer").innerText(), /\*\*\*@example\.com/);
    assert.match(await page.locator(".report-drawer").innerText(), /三层状态/);
    assert.match(await page.locator(".report-drawer").innerText(), /转化阶段/);
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
    await page.locator("[data-rp-column-help='expected']").click({ force: true });
    assert.ok(await page.locator("#rp-floating-help").isVisible());
    assert.match(await page.locator("#rp-floating-help").innerText(), /基础佣金段|质量服务佣金段/);
    await page.mouse.click(12, 12);
    assert.ok(await page.locator("#rp-floating-help").isHidden());
    for (const [commissionStatus, fundStatus] of [["rejected", "rejected"], ["reversed", "clawed_back"]]) {
      await page.click("[data-rp-action='filters']");
      await page.selectOption("[data-rp-filter='commissionStatus']", fundStatus);
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
      assert.equal(await page.evaluate(id => AFF.reporting.rows.find(item => item.commissionId === id).commissionStatus, record.commissionId), record.commissionStatus);
      await page.keyboard.press("Escape");
      assert.ok(await row.locator("[data-rp-appeal]").isDisabled());
      assert.ok(await page.locator(".report-client-table tbody tr").nth(1).locator("[data-rp-appeal]").isEnabled());
      await page.reload();
      assert.ok(await page.locator(".report-client-table tbody tr").first().locator("[data-rp-appeal]").isDisabled());
      await page.click("[data-rp-clear='commissionStatus']");
    }
    assert.deepEqual(await page.evaluate(() => AFF.reporting.totals(AFF.reporting.rows)), commissionTotals);
    const originalCampaign = await page.evaluate(() => {
      const row = AFF.reports.tableRows()[0];
      const original = { id: row.id, campaign: row.campaign };
      row.campaign = '=HYPERLINK("https://example.com","test")';
      return original;
    });
    const clientCsv = await captureCsv();
    const exportedClients = await page.evaluate(() => AFF.reports.tableRows().length);
    assert.equal(clientCsv.split("\r\n").length, exportedClients + 1);
    assert.match(clientCsv, /\*\*\*@example\.com/);
    assert.ok(clientCsv.split("\r\n").some(line => line.includes("'=HYPERLINK(")), "CSV cells must neutralize spreadsheet formulas");
    await page.evaluate(original => {
      AFF.reporting.rows.find(row => row.id === original.id).campaign = original.campaign;
    }, originalCampaign);

    await route("perf");
    await patchState("perf", {
      groups: ["country", "platform"], filters: { from: "2026-09-28", to: "2026-10-27", source: "Telegram" },
      columns: ["clicks", "registrations", "quality", "expected"], pageSize: 20, page: 1
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    const restored = await page.evaluate(() => AFF.reports.state());
    assert.deepEqual(restored.groups, ["country", "platform"]);
    assert.equal(restored.filters.source, "Telegram");
    assert.equal(restored.pageSize, 20);
    assert.deepEqual(restored.columns, ["clicks", "registrations", "quality", "expected"]);
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
          if (width >= 768) await page.click("[data-rp-column-help='expected']", { force: true });
          else {
            await page.locator("[data-rp-expected-tooltip]").first().scrollIntoViewIfNeeded();
            await page.locator("[data-rp-expected-tooltip]").first().click();
          }
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          assert.ok(await page.locator("#rp-floating-help").isVisible(), `Commission help must stay open after scrolling into view at ${width}px`);
          const helpBounds = await page.locator("#rp-floating-help").boundingBox();
          assert.ok(helpBounds.x >= 0 && helpBounds.x + helpBounds.width <= width && helpBounds.y >= 0 && helpBounds.y + helpBounds.height <= page.viewportSize().height);
          await page.mouse.click(12, 12);
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
