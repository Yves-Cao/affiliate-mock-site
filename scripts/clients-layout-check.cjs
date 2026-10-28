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
        fontSize: getComputedStyle(node.querySelector("td")).fontSize,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      }));
      check(sizes.scrollHeight <= sizes.height + 1, `${width}: no inner vertical scrolling`);
      check(!sizes.overflow, `${width}: no document horizontal overflow`);
      check(sizes.columns === 10 && sizes.fontSize === "13px", `${width}: all columns and readable type retained`);
      check(width < 1440 ? sizes.scrollWidth > sizes.width : sizes.scrollWidth <= sizes.width + 1,
        `${width}: horizontal scrolling only where the columns need it`);
      await page.screenshot({
        path: path.join(artifacts, `clients-layout-${width}.png`), fullPage: true, animations: "disabled"
      });
      for (const end of [false, true]) {
        await page.locator(".report-client-scroll").evaluate((node, end) => {
          node.scrollLeft = end ? node.scrollWidth : 0;
        }, end);
        const actions = await page.locator(".report-client-table tbody tr").first().locator("td").last().boundingBox();
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
    await page.selectOption("[data-rp-page-size]", "50");
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
    for (const route of ["perf", "summary"]) {
      await page.evaluate(value => navigate(value), route);
      check(await page.locator(".report-table-scroll").evaluate(node =>
        getComputedStyle(node).maxHeight === "680px" &&
        !node.classList.contains("report-client-scroll")),
      `${route}: grouped report scrolling remains unchanged`);
    }
    check(errors.length === 0, `No page errors: ${errors.join("; ")}`);
    console.log(JSON.stringify({ checks, screenshots: 4, result: "Client table responsive layout passed" }));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
