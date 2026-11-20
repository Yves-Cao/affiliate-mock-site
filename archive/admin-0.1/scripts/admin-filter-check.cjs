"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");
const {chromium} = require("playwright");

const root = path.resolve(__dirname, "..");
const artifacts = path.join(root, ".artifacts/admin-filters");
const report = {cases: [], errors: []};

async function main() {
  await fs.mkdir(artifacts, {recursive: true});
  const server = http.createServer(async (req, res) => {
    try {
      const file = path.resolve(root, `.${new URL(req.url, "http://localhost").pathname}`);
      assert.ok(file.startsWith(root + path.sep));
      res.writeHead(200, {"Content-Type": path.extname(file) === ".js" ? "text/javascript" : path.extname(file) === ".css" ? "text/css" : "text/html", "Cache-Control": "no-store"});
      res.end(await fs.readFile(file));
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  await page.addInitScript(() => {
    window.AFF_SUPPORT_CONTEXT = {role: "operations", user_id: "U-SUPPORT01"};
  });
  page.setDefaultTimeout(6000);
  page.on("pageerror", error => report.errors.push(error.message));
  const base = `http://127.0.0.1:${server.address().port}/`;
  async function open(route) {
    await page.goto("about:blank");
    await page.goto(base + route);
    await page.locator("#admin-app").waitFor();
  }
  async function run(name, fn) {
    try {
      await fn();
      report.cases.push({name, status: "passed"});
      console.log(`PASS ${name}`);
    } catch (error) {
      report.cases.push({name, status: "failed", error: error.stack});
      console.error(`FAIL ${name}: ${error.message}`);
    }
  }
  const snapshot = () => page.locator(".tm-content table tbody").allTextContents();
  try {
    await open("admin-dev.html#/admin-modules/partner-list");
    const routes = await page.evaluate(() => AFF_ADMIN_PROTOTYPE.routes
      .filter(route => ["admin-modules", "admin-performance", "admin-config"].includes(route.id))
      .flatMap(route => route.tabs.map(tab => `${route.id}/${tab.id}`)));
    for (const route of routes) {
      await run(`${route}: quick filter and removable tag`, async () => {
        await open(`admin-dev.html#/${route}`);
        const quick = page.locator("[data-admin-quick-filter]");
        const count = await quick.count();
        // Configuration parameter forms have no list filters.
        if (!count) {
          assert.ok(route.startsWith("admin-config/") || await page.locator("[data-cs-quick-filter]").count() === 3, "list must expose quick dropdowns");
          return;
        }
        assert.ok(count >= 1 && count <= 4);
        assert.equal(await page.locator('.admin-filter-quick button[data-action="filters-toggle"]').count(), 1);
        assert.equal(await page.locator('.tm-page-head [data-action="refresh"], .tm-page-head [data-action-name="export"]').count(), 0);
        const before = await snapshot();
        const key = await quick.first().getAttribute("data-admin-quick-filter");
        const value = await quick.first().locator("option").nth(1).getAttribute("value");
        const label = await quick.first().locator("option").nth(1).textContent();
        await quick.first().selectOption(value);
        const tag = page.locator(`.admin-filter-tag:has([data-remove-filter="${key}"])`);
        assert.ok((await tag.textContent()).includes(label));
        assert.equal(await page.locator(`[data-admin-quick-filter="${key}"]`).inputValue(), value);
        await page.locator(`[data-remove-filter="${key}"]`).click();
        assert.deepEqual(await snapshot(), before);
      });
    }

    await run("partner list: annotation deletions and draft lifecycle", async () => {
      await open("admin-dev.html#/admin-modules/partner-list");
      assert.equal(await page.locator(".dev-module-brief,.dev-metric-bar,.dev-partner360-views").count(), 0);
      assert.equal(await page.locator(".dev-partner-stage-board header").count(), 0);
      assert.equal(await page.locator("[data-partner-stage]").count(), 6);
      const before = await snapshot();
      const toggle = '[data-action="filters-toggle"]';
      await page.click(toggle);
      await page.fill('[data-draft-filter="keyword"]', "NO-SUCH-RECORD-984326");
      assert.deepEqual(await snapshot(), before, "draft cannot affect rows");
      await page.click('[data-action="filters-cancel"]');
      assert.deepEqual(await snapshot(), before);
      await page.click(toggle);
      assert.equal(await page.locator('[data-draft-filter="keyword"]').inputValue(), "");
      await page.fill('[data-draft-filter="from"]', "2026-11-10");
      await page.fill('[data-draft-filter="to"]', "2026-11-01");
      await page.click('[data-action="query"]');
      assert.ok(await page.locator(".admin-filter-error").isVisible());
      assert.deepEqual(await snapshot(), before);
      await page.click('[data-action="filters-reset-draft"]');
      await page.fill('[data-draft-filter="keyword"]', "NO-SUCH-RECORD-984326");
      await page.click('[data-action="query"]');
      assert.equal(await page.locator("#admin-list-filter-panel").count(), 0);
      assert.ok((await snapshot()).join("").includes("暂无") || (await snapshot()).join("").includes("没有"));
      await page.click('[data-remove-filter="keyword"]');
      assert.deepEqual(await snapshot(), before);
      await page.selectOption('[data-admin-quick-filter="country"]', {index: 1});
      await page.selectOption('[data-admin-quick-filter="risk"]', {index: 1});
      assert.equal(await page.locator(".admin-filter-tag").count(), 2);
      const country = await page.locator('[data-admin-quick-filter="country"]').inputValue();
      await page.click('[data-remove-filter="risk"]');
      assert.equal(await page.locator('[data-admin-quick-filter="country"]').inputValue(), country);
      await page.click('[data-action="filters-clear"]');
      assert.deepEqual(await snapshot(), before);
    });

    const specialized = [
      ["risk objects", "risk-workbench?tab=objects", "[data-risk-quick-filter]", "[data-risk-remove-filter]", "[data-risk-more]"],
      ["risk events", "risk-workbench?tab=events", "[data-risk-quick-filter]", "[data-risk-remove-filter]", "[data-risk-more]"],
      ["risk clusters", "risk-workbench?tab=clusters", "[data-risk-quick-filter]", "[data-risk-remove-filter]", "[data-risk-more]"],
      ["risk blacklist", "risk-workbench?tab=blacklist", "[data-risk-quick-filter]", "[data-risk-remove-filter]", "[data-risk-more]"],
      ["tasks", "tasks", "[data-tq-quick-filter]", "[data-tq-remove-filter]", '[data-tq-action="filters"]'],
      ["tickets", "tickets", "[data-cs-quick-filter]", '[data-cs="remove-filter"]', '[data-cs="advanced"]'],
      ["config", "admin-config/overview", "[data-config-overview-group],[data-config-overview-status]", "[data-config-overview-filter-remove]", "[data-config-overview-filter-toggle]"]
    ];
    for (const [name, route, quickSelector, removeSelector, toggleSelector] of specialized) {
      await run(`${name}: shared filter structure and tags`, async () => {
        await open(`admin-dev.html#/${route}`);
        const quick = page.locator(quickSelector);
        assert.ok(await quick.count() >= 1 && await quick.count() <= 4);
        const first = quick.first();
        const value = await first.locator('option:not([value=""]):not([value="__multiple__"])').first().getAttribute("value");
        await first.selectOption(value);
        assert.ok(await page.locator(".admin-filter-tags").isVisible());
        const remove = page.locator(removeSelector).first();
        assert.ok(await remove.isVisible());
        await remove.click();
        await page.locator(toggleSelector).click();
        assert.ok(await page.locator(".admin-filter-panel").isVisible());
      });
    }

    for (const route of ["admin-modules/partner-list", "tasks", "tickets", "risk-workbench?tab=events", "admin-config/overview"]) {
      await run(`${route}: responsive filter layout`, async () => {
        await open(`admin-dev.html#/${route}`);
        for (const width of [1440, 988, 828, 480, 390]) {
          await page.setViewportSize({width, height: 891});
          const layout = await page.evaluate(() => {
            const rect = node => {const r = node.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
            const quick = document.querySelector(".admin-filter-quick");
            const nodes = [...quick.children].map(rect);
            return {scroll:document.documentElement.scrollWidth, width:innerWidth, nodes};
          });
          assert.ok(layout.scroll <= width + 1, `document overflow at ${width}: ${layout.scroll}`);
          for (let i = 0; i < layout.nodes.length; i++) {
            const a = layout.nodes[i];
            assert.ok(a.left >= -1 && a.right <= width + 1);
            for (const b of layout.nodes.slice(i + 1)) assert.ok(a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1, "quick fields overlap");
          }
          if ([1440, 390].includes(width)) await page.screenshot({path:path.join(artifacts, `${route.replace(/\W/g,"-")}-${width}.png`), fullPage:true});
        }
      });
    }
    await run("no browser runtime errors", async () => assert.deepEqual(report.errors, []));
  } finally {
    await fs.writeFile(path.join(artifacts, "report.json"), JSON.stringify(report, null, 2));
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  if (report.cases.some(item => item.status === "failed")) process.exitCode = 1;
  console.log(`${report.cases.filter(item => item.status === "passed").length}/${report.cases.length} checks passed`);
}
main().catch(error => {console.error(error); process.exitCode = 1;});
