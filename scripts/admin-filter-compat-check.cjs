"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const {chromium} = require("playwright");

const root = path.resolve(__dirname, "..");
const artifacts = path.join(root, ".artifacts/admin-filters");
const report = {generated_at: new Date().toISOString(), cases: [], errors: []};
const rebuiltRoutes = [
  "partners", "clients", "onboarding-review", "events", "materials", "postback",
  "tracking", "withdrawals", "recon", "risk", "risk?tab=clusters",
  "risk?tab=blacklist", "notifications", "announcements", "audit", "exports",
  "integrations", "analytics-quality", "analytics-funds", "attribution", "config",
  "workbench", "governance", "governance?tab=auth", "governance?tab=retain",
  "governance?tab=breach", "governance?tab=rules", "commission-settlement",
  "commission-settlement?tab=commissions", "analytics-performance",
];
const legacyRoutes = [
  ["admin-config", ["overview", "price", "tiers", "hold", "finance", "country", "approval", "trial"]],
  ["admin-risk", ["hard", "scored", "violation", "fraud"]],
  ["admin-review", ["risk", "d30", "appeal", "guarantee", "cap"]],
  ["admin-performance", ["roi", "quality", "guarantee"]],
].flatMap(([route, tabs]) => tabs.map(tab => ({route, tab})));
const ui = {
  rebuilt: {
    quick: "[data-ac-quick]", quickKey: "data-ac-quick", toggle: "[data-ac-filter-toggle]",
    cancel: "[data-ac-cancel]", apply: "[data-ac-apply]", keyword: '[data-ac-draft="q"],[data-ac-draft="keyword"]',
    keywordRemove: '[data-ac-remove="q"],[data-ac-remove="keyword"]', remove: "[data-ac-remove]",
    clear: "[data-ac-clear]", reset: "[data-ac-draft-reset]", panel: ".admin-filter-panel",
  },
  legacy: {
    quick: "[data-filter-quick]", quickKey: "data-filter-quick", toggle: "[data-filter-toggle]",
    cancel: "[data-filter-cancel]", apply: '#legacy-filter-panel button[type="submit"]',
    keyword: "[data-filter-keyword]", keywordRemove: '[data-filter-remove="query"]',
    remove: "[data-filter-remove]", clear: "[data-filter-clear]", reset: "[data-filter-reset]",
    panel: "#legacy-filter-panel",
  },
};

async function main() {
  await fs.mkdir(artifacts, {recursive: true});
  const server = http.createServer(async (request, response) => {
    try {
      const file = path.resolve(root, `.${new URL(request.url, "http://localhost").pathname}`);
      assert.ok(file.startsWith(root + path.sep));
      const content = await fs.readFile(file);
      response.writeHead(200, {
        "Content-Type": {".js": "text/javascript", ".css": "text/css", ".html": "text/html"}[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      response.end(content);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser;
  let page;
  async function run(name, fn) {
    try {
      await fn();
      report.cases.push({name, status: "passed"});
      console.log(`PASS ${name}`);
    } catch (error) {
      report.cases.push({name, status: "failed", error: error.stack, url: page?.url()});
      console.error(`FAIL ${name}: ${error.message}`);
    }
  }
  try {
    browser = await chromium.launch({executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
    page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    page.setDefaultTimeout(6000);
    page.on("pageerror", error => report.errors.push({url: page.url(), message: error.message}));
    const base = `http://127.0.0.1:${server.address().port}/`;
    async function open(surface, route, tab) {
      await page.goto("about:blank");
      await page.goto(`${base}${surface === "rebuilt" ? "archive/legacy-management/rebuild/admin-rebuild.html#/" : "archive/legacy-admin/admin.html#"}${route}`);
      if (surface === "legacy") {
        await page.locator(`[data-tab="${tab}"]`).click();
        await page.waitForFunction(value => document.querySelector(`[data-tab="${value}"]`)?.classList.contains("active"), tab);
      }
      await page.locator(ui[surface].toggle).waitFor();
    }
    const snapshot = () => page.locator(".ac-pagebody table tbody,.tm-content table tbody").allTextContents();
    const dataRows = () => page.locator("tbody tr").filter({hasNot: page.locator(".tm-empty")});

    async function standardLifecycle(surface, route, tab) {
      const controls = ui[surface];
      await open(surface, route, tab);
      assert.equal(await page.locator(".admin-filter-shell").count(), 1, "one filter shell per list");
      const quick = page.locator(controls.quick);
      const count = await quick.count();
      assert.ok(count >= 1 && count <= 4, `expected 1-4 quick dropdowns, got ${count}`);
      assert.equal(await page.locator(".admin-filter-quick > button").count(), 1, "one filter tool button");
      const baseline = await snapshot();
      const first = quick.first();
      const key = await first.getAttribute(controls.quickKey);
      const previous = await first.inputValue();
      const option = first.locator("option").filter({hasNot: page.locator("[disabled]")});
      const values = await option.evaluateAll(nodes => nodes.map(node => ({value: node.value, label: node.textContent})));
      const next = values.find(item => item.value && item.value !== "all" && item.value !== previous && !item.value.startsWith("全部"));
      assert.ok(next, "quick dropdown must contain a concrete alternative");
      await first.selectOption(next.value);
      assert.equal(await page.locator(`[${controls.quickKey}="${key}"]`).inputValue(), next.value);
      const remove = surface === "rebuilt" ? `[data-ac-remove="${key}"]` : `[data-filter-remove="${key}"]`;
      const tag = page.locator(".admin-filter-tags").filter({has: page.locator(remove)});
      assert.ok((await tag.textContent()).includes(next.label.trim()), "tag shows selected option label");
      await page.locator(remove).click();
      // Some initial defaults (current settlement period, enabled materials) are real filters.
      // Restore that exact value before comparing, rather than assuming remove means the default.
      await page.locator(`[${controls.quickKey}="${key}"]`).selectOption(previous);
      assert.deepEqual(await snapshot(), baseline, "restoring the quick selection restores the list");
      await page.click(controls.toggle);
      const beforeDraft = await snapshot();
      const keyword = page.locator(controls.keyword);
      if (await keyword.count()) {
        await keyword.fill("NO-SUCH-RECORD-984326");
        assert.deepEqual(await snapshot(), beforeDraft, "typing a draft cannot filter rows");
        await page.click(controls.cancel);
        assert.equal(await page.locator(controls.panel).count(), 0);
        assert.deepEqual(await snapshot(), beforeDraft, "cancel preserves applied results");
        await page.click(controls.toggle);
        assert.equal(await page.locator(controls.keyword).inputValue(), "", "cancel discards the keyword draft");
        await page.locator(controls.keyword).fill("NO-SUCH-RECORD-984326");
        await page.click(controls.apply);
        assert.equal(await page.locator(controls.panel).count(), 0, "apply closes the draft panel");
        assert.equal(await dataRows().count(), 0, "an unmatched keyword leaves no data rows");
        await page.locator(controls.keywordRemove).click();
        assert.deepEqual(await snapshot(), beforeDraft, "removing the keyword restores results");
      } else {
        assert.equal(surface, "rebuilt");
        assert.equal(route, "analytics-performance", "only analytics has no free-text keyword");
        const status = page.locator('[data-ac-draft="status"]');
        await status.selectOption([]);
        assert.deepEqual(await snapshot(), beforeDraft);
        await page.click(controls.cancel);
        assert.deepEqual(await snapshot(), beforeDraft);
        await page.click(controls.toggle);
        await page.locator('[data-ac-draft="status"]').selectOption([]);
        await page.click(controls.apply);
        assert.equal(await dataRows().count(), 0, "empty status selection produces no partners");
        await page.click('[data-ac-remove="status"]');
        assert.deepEqual(await snapshot(), beforeDraft);
      }
      await page.locator(`[${controls.quickKey}="${key}"]`).selectOption(next.value);
      await page.click(controls.clear);
      assert.equal(await page.locator(controls.remove).count(), 0, "clear removes every applied tag");
      // Verify filtering against the visible business field when its heading matches.
      await page.locator(`[${controls.quickKey}="${key}"]`).selectOption(next.value);
      const label = await page.locator(`[${controls.quickKey}="${key}"]`).getAttribute("aria-label");
      const checkedCells = await page.evaluate(({label, value}) => {
        const table = document.querySelector(".ac-pagebody table,.tm-content table");
        if (!table) return 0;
        const headers = [...table.querySelectorAll("thead th")];
        const index = headers.findIndex(header => header.textContent.replace(/[↑↓⇅↕]/g, "").trim() === label);
        if (index < 0) return 0;
        const cells = [...table.querySelectorAll("tbody tr")].map(row => row.cells[index]).filter(Boolean);
        for (const cell of cells) {
          if (!cell.textContent.includes(value)) throw new Error(`Visible ${label} value does not match ${value}: ${cell.textContent}`);
        }
        return cells.length;
      }, {label, value: next.label.trim()});
      return {quick_fields: count, matched_cells_checked: checkedCells};
    }

    for (const route of rebuiltRoutes) {
      await run(`rebuilt ${route}: quick, tags, clear and draft lifecycle`, async () => {
        const coverage = await standardLifecycle("rebuilt", route);
        report.cases.push({name: `rebuilt ${route}: coverage`, status: "passed", ...coverage});
      });
    }
    for (const {route, tab} of legacyRoutes) {
      await run(`legacy ${route}/${tab}: quick, tags, clear and draft lifecycle`, async () => {
        const coverage = await standardLifecycle("legacy", route, tab);
        report.cases.push({name: `legacy ${route}/${tab}: coverage`, status: "passed", ...coverage});
      });
    }
    await run("rebuilt date validation and staged reset", async () => {
      await open("rebuilt", "events");
      const before = await snapshot();
      await page.click(ui.rebuilt.toggle);
      await page.fill('[data-ac-draft="dateFrom"]', "2026-11-10");
      await page.fill('[data-ac-draft="dateTo"]', "2026-11-01");
      await page.click(ui.rebuilt.apply);
      assert.equal(await page.locator(ui.rebuilt.panel).count(), 1);
      assert.deepEqual(await snapshot(), before);
      assert.match(await page.locator(".ac-toast").textContent(), /开始日期/);
      await page.click(ui.rebuilt.reset);
      assert.equal(await page.inputValue('[data-ac-draft="dateFrom"]'), "");
      assert.deepEqual(await snapshot(), before, "draft reset cannot affect results");
    });
    await run("rebuilt permissions filter only changes authorization records", async () => {
      await open("rebuilt", "permissions");
      const matrix = await page.locator(".ac-pagebody > .ac-table-wrap tbody").textContent();
      const authorization = await page.locator(".ac-card tbody").textContent();
      await page.click(ui.rebuilt.toggle);
      await page.fill('[data-ac-draft="q"]', "NO-SUCH-AUTHORIZATION-984326");
      await page.click(ui.rebuilt.apply);
      assert.equal(await page.locator(".ac-card tbody tr").count(), 0);
      assert.equal(await page.locator(".ac-pagebody > .ac-table-wrap tbody").textContent(), matrix);
      await page.click('[data-ac-remove="q"]');
      assert.equal(await page.locator(".ac-card tbody").textContent(), authorization);
    });
    await run("no browser runtime errors", async () => assert.deepEqual(report.errors, []));
  } finally {
    report.summary = {
      passed: report.cases.filter(item => item.status === "passed").length,
      failed: report.cases.filter(item => item.status === "failed").length,
      rebuilt_routes: rebuiltRoutes.length,
      legacy_route_tabs: legacyRoutes.length,
    };
    report.limitations = [
      "Compatibility tests exercise in-memory synthetic data, not production API authorization or persistence.",
      "Analytics filters use the existing aggregate Mock data; this suite does not certify event-level metric attribution.",
      "Permission matrix behavior is verified separately from its authorization records list.",
    ];
    await fs.writeFile(path.join(artifacts, "compat-report.json"), `${JSON.stringify(report, null, 2)}\n`);
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  console.log(JSON.stringify(report.summary));
  if (report.summary.failed) process.exitCode = 1;
}

main().catch(error => {console.error(error);process.exitCode = 1;});
