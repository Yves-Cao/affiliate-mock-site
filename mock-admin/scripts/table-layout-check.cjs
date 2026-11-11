const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const baseUrl = process.env.REPORT_BASE_URL || "http://127.0.0.1:4179";
const routes = [
  "dash", "perf", "clients", "summary", "promo", "subchannels", "deep",
  "tracker", "assets", "pay", "statements", "lookup", "wd", "guarantee", "account",
  "support", "appeals", "messages", "apply", "onboarding"
];
const pageSizes = {
  perf: "[data-aff-page-size]",
  summary: "[data-aff-page-size]",
  pay: "[data-aff-page-size]",
  guarantee: "[data-aff-page-size]"
};

async function main() {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const page = await browser.newPage({ viewport: { width: 1111, height: 896 } });
  const errors = [];
  let checks = 0;
  const check = (value, message) => { assert.ok(value, message); checks += 1; };
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(`${baseUrl}/#/clients`, { waitUntil: "domcontentloaded" });
    await page.fill("#login-form input[name=email]", "table-layout@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForTimeout(500);

    for (const width of [1111, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 896 });
      for (const route of routes) {
        await page.evaluate(route => { location.hash = `/${route}`; }, route);
        await page.waitForTimeout(160);
        const selector = pageSizes[route];
        if (selector && await page.locator(selector).count()) {
          await page.selectOption(selector, "50");
          await page.waitForTimeout(120);
        }
        const result = await page.evaluate(() => {
          const tables = [...document.querySelectorAll("#main table")]
            .filter(table => table.offsetParent !== null);
          return {
            route: location.hash.replace(/^#\//, ""),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            tables: tables.map(table => {
              const row = table.querySelector("tbody tr");
              const container = table.closest(
                ".report-table-scroll,.table-wrap,.earn-table-scroll,.wd-table-scroll,.finance-table-wrap,.sc-table-scroll"
              ) || table.parentElement;
              return {
                className: table.className,
                rowDisplay: row ? getComputedStyle(row).display : "",
                rowHeight: row ? row.getBoundingClientRect().height : 0,
                rows: table.querySelectorAll("tbody tr").length,
                containerClass: String(container.className),
                clientHeight: container.clientHeight,
                scrollHeight: container.scrollHeight,
                clientWidth: container.clientWidth,
                scrollWidth: container.scrollWidth
              };
            })
          };
        });
        check(result.overflow <= 1, `${width}/${result.route}: document has no horizontal overflow`);
        for (const table of result.tables) {
          check(table.rowDisplay === "table-row", `${width}/${result.route}: table rows remain row-based`);
          check(table.rowHeight <= 120, `${width}/${result.route}: compact row height`);
          if (table.containerClass.includes("report-table-scroll") ||
              table.containerClass.includes("earn-table-scroll") ||
              table.containerClass.includes("finance-table-wrap") ||
              table.containerClass.includes("wd-table-scroll")) {
            check(table.scrollHeight <= table.clientHeight + 1,
              `${width}/${result.route}: paginated table follows page scrolling`);
          }
        }
      }
    }
    check(errors.length === 0, `No page errors: ${errors.join("; ")}`);
    console.log(JSON.stringify({ checks, routes: routes.length, result: "User-side table layout passed" }));
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
