"use strict";

const assert = require("node:assert/strict");
const {chromium} = require("playwright");
const baseUrl = process.env.REPORT_BASE_URL || "http://127.0.0.1:4179";
const keys = ["ftd","effective","quality","settled","guarantee","available"];
const moneyKeys = ["settled","guarantee","available"];

(async () => {
  const browser = await chromium.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
  try {
    const page = await browser.newPage({viewport:{width:1920,height:1080}});
    const errors = [];
    page.on("pageerror",error => errors.push(error.message));
    await page.goto(baseUrl);
    await page.fill("#login-form input[name=email]","summary-review@example.com");
    await page.fill("#login-form input[name=password]","demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForSelector("#app-view:not(.hidden)");
    await page.evaluate(() => navigate("summary"));
    await page.waitForSelector(".report-stats");
    assert.deepEqual(await page.locator(".report-stats [data-rp-drill-metric]").evaluateAll(nodes => nodes.map(node => node.dataset.rpDrillMetric)),keys);
    assert.equal(await page.locator(".report-stats small").count(),0,"period footnotes are removed");
    const settlementCheck = await page.evaluate(() => {
      const rows = AFF.reporting.rows.filter(row => row.clientId);
      const amount = row => (row.commissionCases || []).filter(item => item.settlement)
        .reduce((sum,item) => sum + Number(item.settlement.grossAmount || 0) / 100,0);
      return {
        mismatches:rows.filter(row => Math.abs(row.settled - amount(row)) > .00001).map(row => row.clientId),
        mixed:rows.filter(row => row.commissionCases.some(item => item.settlement)
          && row.commissionCases.some(item => !item.settlement && item.amountCents > 0)).length,
        total:AFF.reporting.totals([...rows,...rows]).settled,
        oracle:[...new Map(rows.map(row => [row.clientId,row])).values()].reduce((sum,row) => sum + amount(row),0)
      };
    });
    assert.deepEqual(settlementCheck.mismatches,[],"each customer uses only completed settlement gross amounts");
    assert.ok(settlementCheck.mixed > 0,"fixtures include customers with settled and unsettled commission cases");
    assert.ok(Math.abs(settlementCheck.total - settlementCheck.oracle) < .005,"totals deduplicate clients and exclude unsettled cases");
    for (const groups of [[],["country"],["country","platform"]]) {
      await page.evaluate(groups => {
        const s = AFF.reports.state();
        s.filters = AFF.reports.range("past90");
        s.groups = groups;
        render();
      },groups);
      const groupedCheck = await page.evaluate(() => {
        const source = AFF.reports.filtered();
        const s = AFF.reports.state();
        const rows = AFF.reports.tableRows();
        const oracle = values => {
          const clients = [...new Map(source.filter(row => row.clientId && s.groups.every((key,index) =>
            AFF.reporting.value(row,key) === values[index])).map(row => [row.clientId,row])).values()];
          return clients.reduce((sum,row) => sum + (row.commissionCases || []).filter(item => item.settlement)
            .reduce((amount,item) => amount + Number(item.settlement.grossAmount || 0) / 100,0),0);
        };
        const csv = AFF.reports.exportCsv().csv.split("\r\n").map(line => JSON.parse(`[${line}]`));
        const csvIndex = csv[0].indexOf("已结算佣金");
        const index = Math.max(1,s.groups.length) + s.columns.indexOf("settled");
        const firstRow = document.querySelector(".report-table tbody tr:not(.report-total)");
        return {
          expectedKept:s.columns.includes("expected"),csvIndex,
          valid:rows.every((row,i) => Math.abs(row.metrics.settled - oracle(row.values)) < .005
            && Math.abs(Number(csv[i+1][csvIndex]) - oracle(row.values)) < .005),
          displayed:Number(firstRow.cells[index].textContent.replace(/[$,]/g,"")),
          first:oracle(rows[0].values)
        };
      });
      assert.ok(groupedCheck.expectedKept,"expected commission remains in the table");
      assert.ok(groupedCheck.csvIndex >= 0,"settled commission is exported");
      assert.ok(groupedCheck.valid,`${groups}: grouped values and export match settlement records`);
      assert.ok(Math.abs(groupedCheck.displayed - groupedCheck.first) < .005,"rendered settled column matches");
    }
    const tableDrill = page.locator(".report-table [data-rp-drill-metric='settled']").first();
    const tableAmount = Number((await tableDrill.innerText()).replace(/[$,]/g,""));
    await tableDrill.click();
    await page.waitForFunction(() => AFF.state.route === "clients");
    assert.ok(Math.abs(await page.evaluate(() => AFF.reports.filtered().reduce((sum,row) => sum + row.settled,0)) - tableAmount) < .005,
      "settled table cell drills to matching clients");
    const clientValues = await page.locator(".report-client-table tbody tr").evaluateAll(nodes => nodes.map(row => ({
      id:row.querySelector("[data-rp-client]").dataset.rpClient,
      amount:Number(row.querySelector(".report-settled-cell").textContent.replace(/[$,]/g,""))
    })));
    for (const cell of clientValues) {
      assert.ok(Math.abs(cell.amount - await page.evaluate(id => AFF.reporting.rows.find(row => row.clientId === id).settled,cell.id)) < .005);
    }
    await page.evaluate(() => navigate("summary"));
    const migration = await page.evaluate(() => {
      const saved = AFF.reports.state();
      return [
        {columns:saved.columns.filter(key => key !== "settled"),columnsCustomized:false},
        {columns:["ftd","expected"],columnsCustomized:true}
      ].map(previous => {
        AFF.state.reports.summary = {...saved,...previous,columns:[...previous.columns],settledColumnAdded:false};
        const upgraded = [...AFF.reports.state().columns];
        AFF.reports.state().columns = upgraded.filter(key => key !== "settled");
        const afterRemoval = [...AFF.reports.state().columns];
        return {upgraded,afterRemoval,previous:previous.columns};
      });
    });
    for (const result of migration) {
      assert.equal(result.upgraded.filter(key => key === "settled").length,1);
      assert.deepEqual(result.upgraded.filter(key => key !== "settled"),result.previous,"migration preserves previous columns");
      assert.equal(result.upgraded.indexOf("settled"),result.upgraded.indexOf("expected") + 1);
      assert.deepEqual(result.afterRemoval,result.previous,"later user removal is respected");
    }
    await page.evaluate(() => { delete AFF.state.reports.summary; navigate("summary"); });
    for (const key of keys) {
      await page.evaluate(() => {
        navigate("summary");
        const s = AFF.reports.state();
        s.filters = {...AFF.reports.range("past90"),country:"TH"};
        s.preset = "past90";
        Object.assign(AFF.reports.state("clients"),{filters:{country:"XX",search:"stale-filter"},page:8});
        render();
      });
      const source = await page.evaluate(key => {
        const s = AFF.reports.state();
        const rows = AFF.reports.filtered().filter(row => row.clientId);
        const dateKey = {ftd:"ftdAt",effective:"effectiveAt",quality:"qualityAt"}[key];
        const matching = rows.filter(row => dateKey ? !!row[dateKey] : row[key] > 0);
        return {
          filters:{...s.filters},
          total:AFF.reporting.totals(rows)[key],
          ids:[...new Set(matching.map(row => row.clientId))].sort()
        };
      },key);
      const button = page.locator(`.report-stats [data-rp-drill-metric="${key}"]`);
      assert.equal(await button.evaluate(node => getComputedStyle(node).color),"rgb(0, 91, 255)","numbers are blue before hover");
      const displayed = Number((await button.innerText()).replace(/[$,]/g,""));
      assert.ok(Math.abs(displayed - source.total) < .005,"card matches the filtered source");
      if (key === "settled") {
        await button.focus();
        await page.keyboard.press("Enter");
      } else await button.click();
      await page.waitForFunction(() => AFF.state.route === "clients");
      const result = await page.evaluate(key => ({
        filters:AFF.reports.state().filters,page:AFF.reports.state().page,
        metric:AFF.reports.state().metric,
        ids:[...new Set(AFF.reports.filtered().map(row => row.clientId))].sort(),
        amount:AFF.reports.filtered().reduce((sum,row) => sum + (row[key] || 0),0)
      }),key);
      assert.deepEqual(result.filters,source.filters,"all current filters are inherited and stale ones replaced");
      assert.deepEqual(result.ids,source.ids,`${key}: only contributing clients are shown`);
      assert.equal(result.metric,key);
      assert.equal(result.page,1);
      if (moneyKeys.includes(key)) assert.ok(Math.abs(result.amount - source.total) < .005,"drilled client amounts match the card");
      else assert.equal(result.ids.length,source.total);
      await page.click("[data-rp-action='clear-milestone']");
      assert.equal(await page.evaluate(() => AFF.reports.state().metric),null,"the drill metric can be cleared");
    }
    await page.evaluate(() => {
      navigate("summary");
      AFF.reports.state().filters = {...AFF.reports.range("past30"),country:"XX"};
      render();
    });
    await page.click(".report-stats [data-rp-drill-metric='available']");
    assert.equal(await page.evaluate(() => AFF.reports.filtered().length),0,"zero-value cards lead to the correct empty result");
    await page.evaluate(() => navigate("summary"));
    await page.setViewportSize({width:1920,height:1080});
    await page.evaluate(() => { AFF.reports.state().filters = AFF.reports.range("past90"); render(); });
    await page.screenshot({path:"/tmp/affiliate-summary-settled-desktop.png",fullPage:true,animations:"disabled"});
    for (const width of [1920,1440,1111,768,390]) {
      await page.setViewportSize({width,height:960});
      const valid = await page.locator(".report-stats").evaluate(node => {
        const rect = node.getBoundingClientRect();
        return rect.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1
          && [...node.querySelectorAll("button")].every(button => button.scrollWidth <= button.clientWidth + 1);
      });
      assert.ok(valid,`${width}px: cards fit without overflow`);
    }
    await page.screenshot({path:"/tmp/affiliate-summary-settled-mobile.png",fullPage:true,animations:"disabled"});
    assert.deepEqual(errors,[]);
    console.log("Summary cards: settlement-record reconciliation, 0/1/2-dimension grouping, table/client drilldown, CSV, column migration, 6 blue metrics, keyboard/empty states and 5 viewport checks passed.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
