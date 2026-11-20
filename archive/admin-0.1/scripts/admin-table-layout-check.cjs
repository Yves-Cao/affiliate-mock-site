"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
let chromium;
try {
  ({chromium} = require("playwright"));
} catch {
  ({chromium} = require(path.join(process.env.HOME, "Documents/Affiliate/.tmp-mock-site/node_modules/playwright")));
}

const root = path.resolve(__dirname, "..");
const artifacts = path.join(root, ".artifacts/admin-tables");
const routes = [
  ["legacy", "archive/legacy-admin/admin.html#/admin-performance"],
  ["clients", "admin-dev.html#/admin-modules/client-list"],
  ["tasks", "admin-dev.html#/tasks"],
  ["tickets", "admin-dev.html#/tickets"],
  ["risk", "admin-dev.html#/risk-workbench?tab=events"],
  ["partner", "admin-dev.html#/partner-360/partner-1003?tab=finance"],
  ["rebuilt-clients", "archive/legacy-management/rebuild/admin-rebuild.html#/clients"],
  ["attribution", "archive/legacy-management/rebuild/admin-rebuild.html#/attribution"],
  ["commissions", "archive/legacy-management/rebuild/admin-rebuild.html#/commission-settlement?tab=commissions"],
  ["config", "archive/legacy-management/rebuild/admin-rebuild.html#/config"],
  ["analytics", "admin-dev.html#/admin-performance/roi"]
];
const report = {cases: [], errors: []};
const mime = {".html": "text/html", ".css": "text/css", ".js": "text/javascript"};

async function main() {
  await fs.mkdir(artifacts, {recursive: true});
  const server = http.createServer(async (req, res) => {
    try {
      const file = path.resolve(root, `.${new URL(req.url, "http://localhost").pathname}`);
      assert.ok(file.startsWith(root + path.sep));
      res.writeHead(200, {"Content-Type": mime[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store"});
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
    if (location.hash.startsWith("#/tickets")) {
      window.AFF_SUPPORT_CONTEXT = {role: "operations", user_id: "U-SUPPORT01"};
    }
  });
  page.setDefaultTimeout(8000);
  page.on("pageerror", error => report.errors.push(error.message));
  const base = `http://127.0.0.1:${server.address().port}/`;
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
  async function open(route) {
    await page.goto("about:blank");
    await page.goto(base + route);
    await page.locator("table:visible tbody td").first().waitFor();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
  try {
    for (const [name, route] of routes) {
      await run(`${name}: bounded columns at five widths`, async () => {
        await open(route);
        for (const width of [1440, 1280, 900, 768, 480]) {
          await page.setViewportSize({width, height: 1000});
          const layout = await page.evaluate(() => {
            const tables = [...document.querySelectorAll("table")].filter(t => t.getClientRects().length);
            return {
              width: innerWidth, document: document.documentElement.scrollWidth,
              tables: tables.map(table => ({
                layout: getComputedStyle(table).tableLayout,
                leaking: [...table.querySelectorAll("th, td")].filter(cell =>
                  !["hidden", "clip"].includes(getComputedStyle(cell).overflowX)
                ).map(cell => cell.className),
                parentOverflow: getComputedStyle(table.parentElement).overflowX
              }))
            };
          });
          assert.ok(layout.tables.length);
          assert.ok(layout.document <= width + 1, `${width}px document overflow: ${JSON.stringify(layout)}`);
          for (const table of layout.tables) {
            assert.equal(table.layout, "fixed");
            assert.deepEqual(table.leaking, [], `${width}px cell painting escapes its column`);
            assert.ok(["auto", "scroll"].includes(table.parentOverflow), "wide table needs an internal scroll container");
          }
          if (width === 1440 || width === 480) {
            await page.screenshot({path: path.join(artifacts, `${name}-${width}.png`), fullPage: true});
          }
        }
      });
      await run(`${name}: long values preserve column geometry`, async () => {
        await page.setViewportSize({width: 1440, height: 1000});
        await open(route);
        const before = await page.evaluate(() => {
          const table = [...document.querySelectorAll("table")].find(t => t.getClientRects().length);
          window.tableUnderTest = table;
          const cells = [...table.tBodies[0].rows[0].cells];
          return cells.map(cell => cell.getBoundingClientRect().width);
        });
        const injected = await page.evaluate(() => {
          const cells = [...window.tableUnderTest.tBodies[0].rows[0].cells];
          let count = 0;
          cells.forEach((cell, index) => {
            if (cell.querySelector("input, select, .ac-action-menu, [role='separator']") ||
                /actions|action-col/.test(cell.className)) return;
            const target = cell.querySelector("a, button, [class*='badge'], .cs-status, code, strong") || cell;
            target.removeAttribute("title");
            cell.removeAttribute("title");
            target.dataset.tableStress = String(index);
            target.textContent = `长字段-${index}-` + "UnbrokenIdentifier0123456789".repeat(12) + "中文状态说明".repeat(12);
            count++;
          });
          return count;
        });
        assert.ok(injected, "stress must exercise real data cells");
        await page.waitForFunction(() => [...document.querySelectorAll("[data-table-stress]")].every(
          item => item.title === item.textContent.trim()
        ));
        const after = await page.evaluate(() => ({
          widths: [...window.tableUnderTest.tBodies[0].rows[0].cells].map(cell => cell.getBoundingClientRect().width),
          oversizedControls: [...window.tableUnderTest.querySelectorAll("[data-table-stress]")].filter(item => {
            const cell = item.closest("td");
            return item !== cell && ["BUTTON", "A"].includes(item.tagName) &&
              item.getBoundingClientRect().width > cell.clientWidth + 1;
          }).map(item => item.tagName),
          document: document.documentElement.scrollWidth
        }));
        before.forEach((width, index) => assert.ok(Math.abs(after.widths[index] - width) <= 1,
          `column ${index} changed from ${width} to ${after.widths[index]}`));
        assert.deepEqual(after.oversizedControls, []);
        assert.ok(after.document <= 1441);
        if (name === "rebuilt-clients") {
          await page.screenshot({path: path.join(artifacts, "long-values.png"), fullPage: true});
        }
      });
    }
    await run("customer 360 task context remains in unified admin", async () => {
      await page.goto("about:blank");
      await page.goto(`${base}admin-dev.html#/admin-workbench`);
      await page.locator("[data-role]").selectOption("risk_supervisor");
      await page.goto(`${base}admin-dev.html#/customer-360/DEMO-C01?tab=finance&task_id=DEMO-T01`);
      await page.locator(".tq-object-page").waitFor();
      assert.equal(await page.locator(".tq-object-page h1").innerText(), "Krit W.");
      assert.equal(await page.locator(".tq-object-page table tbody tr").count(), 2);
    });

    await run("task sorting, keyboard resizing, pointer resizing and fixed action", async () => {
      await open("admin-dev.html#/tasks");
      const handle = page.locator("[data-tq-resize]").first();
      const selector = await handle.getAttribute("data-tq-resize");
      const column = page.locator(`th.tq-col-${selector}`);
      const width = (await column.boundingBox()).width;
      await handle.focus();
      await page.keyboard.press("ArrowRight");
      assert.ok((await column.boundingBox()).width > width);
      const box = await page.locator("[data-tq-resize]").first().boundingBox();
      const before = (await column.boundingBox()).width;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 32, box.y + box.height / 2, {steps: 4});
      await page.mouse.up();
      assert.ok((await column.boundingBox()).width > before + 20);
      await page.locator("[data-tq-sort]").first().click();
      assert.match(await page.locator("[data-tq-sort]").first().locator("..").getAttribute("aria-sort"), /ascending|descending/);
      await page.locator(".tq-table-scroll").evaluate(el => {el.scrollLeft = el.scrollWidth;});
      const action = page.locator(".tq-table tbody .tq-col-actions button").first();
      await action.click();
      assert.ok(await page.locator(".tq-drawer, .tq-modal").count() > 0);
    });

    await run("customer service resize handle remains inside its column", async () => {
      await open("admin-dev.html#/tickets");
      const handle = page.locator("[data-cs-resize]").first();
      const bounds = await handle.boundingBox();
      const th = await handle.locator("..").boundingBox();
      assert.ok(bounds.x >= th.x && bounds.x + bounds.width <= th.x + th.width + 1);
      const width = th.width;
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await page.mouse.down();
      await page.mouse.move(bounds.x + bounds.width / 2 + 32, bounds.y + bounds.height / 2, {steps: 4});
      await page.mouse.up();
      assert.ok((await page.locator("[data-cs-resize]").first().locator("..").boundingBox()).width > width + 20);
    });

    await run("configuration menu escapes table through existing portal", async () => {
      await open("archive/legacy-management/rebuild/admin-rebuild.html#/config");
      await page.locator("[data-config-menu]").first().click();
      const menu = page.locator(".ac-action-portal");
      await menu.waitFor({state: "visible"});
      const button = menu.locator("button").first();
      await button.click();
      assert.equal(await page.locator(".ac-action-portal").count(), 0);
    });

    await run("long headers and action groups stay inside their columns", async () => {
      await open("archive/legacy-management/rebuild/admin-rebuild.html#/attribution");
      const widths = await page.locator("table").first().locator("th").evaluateAll(
        cells => cells.map(cell => cell.getBoundingClientRect().width)
      );
      await page.locator("table").first().locator("th").first().evaluate(el => {
        el.removeAttribute("title");
        el.textContent = "超长表头用于校验列边界".repeat(30);
      });
      await page.locator(".ac-row-actions").first().evaluate(el => {
        for (let i = 0; i < 3; i++) {
          const button = document.createElement("button");
          button.textContent = "查看详情及处理当前异常".repeat(5);
          button.dataset.stressAction = "";
          el.appendChild(button);
        }
      });
      await page.waitForFunction(() => document.querySelector("[data-stress-action]")?.title);
      const result = await page.evaluate(() => ({
        widths: [...document.querySelectorAll("table th")].map(cell => cell.getBoundingClientRect().width),
        clippedHeader: document.querySelector("table th").title === document.querySelector("table th").textContent,
        outside: [...document.querySelectorAll("[data-stress-action]")].filter(button => {
          const b = button.getBoundingClientRect();
          const cell = button.closest("td").getBoundingClientRect();
          return b.left < cell.left - 1 || b.right > cell.right + 1 || b.bottom > cell.bottom + 1;
        }).length
      }));
      widths.forEach((width, index) => assert.ok(Math.abs(result.widths[index] - width) <= 1));
      assert.equal(result.clippedHeader, true);
      assert.equal(result.outside, 0);
    });

    await run("portaled tables and dynamic tooltips use shared rules", async () => {
      await page.evaluate(() => {
        const dialog = document.createElement("div");
        dialog.className = "ac-modal";
        dialog.innerHTML = '<div class="ac-table-wrap"><table class="ac-table"><thead><tr><th>字段</th><th>状态</th></tr></thead><tbody><tr><td><button title="复制原始编号">编号</button></td><td><span class="ac-badge">初始状态</span></td></tr></tbody></table></div>';
        dialog.dataset.tableTestDialog = "";
        document.body.appendChild(dialog);
      });
      const badge = page.locator("[data-table-test-dialog] .ac-badge");
      await page.waitForFunction(() => document.querySelector("[data-table-test-dialog] .ac-badge")?.title === "初始状态");
      await badge.evaluate(el => {el.firstChild.data = "更新状态";});
      await page.waitForFunction(() => document.querySelector("[data-table-test-dialog] .ac-badge")?.title === "更新状态");
      assert.equal(await page.locator("[data-table-test-dialog] button").getAttribute("title"), "复制原始编号");
      assert.equal(await page.locator("[data-table-test-dialog] td").first().evaluate(el => getComputedStyle(el).overflowX), "hidden");
    });
    await run("no uncaught browser errors", async () => assert.deepEqual(report.errors, []));
  } finally {
    report.summary = {
      passed: report.cases.filter(item => item.status === "passed").length,
      failed: report.cases.filter(item => item.status === "failed").length
    };
    await fs.writeFile(path.join(artifacts, "report.json"), JSON.stringify(report, null, 2) + "\n");
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  console.log(JSON.stringify(report.summary));
  if (report.summary.failed) process.exitCode = 1;
}

main().catch(error => {console.error(error); process.exitCode = 1;});
