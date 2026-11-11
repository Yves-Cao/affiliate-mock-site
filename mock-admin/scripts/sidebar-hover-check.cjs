const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.SIDEBAR_BASE_URL || "http://127.0.0.1:4179";
const artifacts = path.join(process.cwd(), ".artifacts");

async function main() {
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const errors = [];
  const screenshots = [];
  const watch = page => {
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  };
  async function login(page) {
    watch(page);
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.fill("#login-form input[name=email]", "sidebar-review@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForSelector("#app-view:not(.hidden)");
  }
  async function widthIs(page, width) {
    try {
      await page.waitForFunction(width =>
        Math.abs(document.getElementById("sidebar").getBoundingClientRect().width - width) < 1, width);
    } catch (error) {
      console.error("Sidebar state at failed width assertion:", await page.evaluate(() => ({
        viewport: innerWidth, width: document.getElementById("sidebar").getBoundingClientRect().width,
        classes: document.body.className, collapsed: AFF.state.sidebarCollapsed,
        mobileOpen: AFF.state.mobileNavOpen, hoverOpen: sidebarHoverOpen,
        hovered: document.getElementById("sidebar").matches(":hover")
      })));
      throw error;
    }
  }
  async function expandedIs(page, expanded) {
    assert.equal(await page.locator("#sidebar-toggle").getAttribute("aria-expanded"), String(expanded));
    assert.equal(await page.locator("#sidebar-toggle").getAttribute("aria-label"), expanded ? "收起侧栏" : "展开侧栏");
    assert.equal(await page.locator("#sidebar-toggle").textContent(), expanded ? "«" : "»");
  }
  async function noOverflow(page) {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  }
  async function capture(page, name) {
    const file = path.join(artifacts, name);
    await page.screenshot({ path: file });
    screenshots.push(file);
  }
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await login(page);
    assert.equal(await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches), true);
    for (const width of [1440, 1111, 800, 390]) {
      await page.mouse.move(1430, 10);
      await page.setViewportSize({ width, height: 1000 });
      await page.mouse.move(width - 10, 10);
      await page.evaluate(width => {
        AFF.state.sidebarCollapsed = width >= 992;
        AFF.state.mobileNavOpen = false;
        AFF.state.navGroups = [];
        render();
      }, width);
      await widthIs(page, 68);
      await expandedIs(page, false);
      assert.equal(await page.locator(".nav-section.open").count(), 0);
      const workspaceLeft = await page.locator(".workspace").evaluate(node => node.getBoundingClientRect().left);
      assert.equal(workspaceLeft, 68);
      await page.mouse.move(34, 160);
      await widthIs(page, 216);
      await expandedIs(page, true);
      assert.equal(await page.locator("body").evaluate(node => node.classList.contains("sidebar-hover-open")), true);
      assert.equal(await page.locator(".workspace").evaluate(node => node.getBoundingClientRect().left), workspaceLeft);
      assert.ok(await page.locator('[data-nav-group="数据总览"] .nav-label').isVisible());
      assert.equal(await page.locator(".nav-section.open").count(), 0);
      await noOverflow(page);
      await capture(page, `sidebar-hover-${width}.png`);
      await page.locator('[data-nav-group="数据总览"]').click();
      await page.locator('#nav [data-route="clients"]').click();
      await page.waitForSelector(".report-page");
      assert.equal(await page.evaluate(() => AFF.state.route), "clients");
      assert.equal(await page.locator(".workspace").evaluate(node => node.getBoundingClientRect().left), workspaceLeft);
      await page.mouse.move(width - 10, 160);
      await widthIs(page, 68);
      await expandedIs(page, false);
      assert.equal(await page.locator("body").evaluate(node => node.classList.contains("sidebar-hover-open")), false);
      await noOverflow(page);
      await page.mouse.move(34, 160);
      await widthIs(page, 216);
      await page.locator("#sidebar-toggle").click();
      await widthIs(page, 216);
      await expandedIs(page, true);
      assert.equal(await page.locator("body").evaluate(node => node.classList.contains("sidebar-hover-open")), false);
      await page.mouse.move(width - 10, 160);
      await widthIs(page, 216);
      assert.equal(await page.evaluate(() => innerWidth <= 991 ? AFF.state.mobileNavOpen : !AFF.state.sidebarCollapsed), true);
      await page.locator("#sidebar-toggle").click();
      await page.mouse.move(width - 10, 160);
      await widthIs(page, 68);
      await expandedIs(page, false);
      await noOverflow(page);
    }
    await page.evaluate(() => { AFF.state.sidebarCollapsed = true; render(); });
    await page.setViewportSize({ width: 800, height: 1000 });
    await page.mouse.move(34, 160);
    await widthIs(page, 216);
    await page.mouse.move(780, 10);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await widthIs(page, 68);
    await expandedIs(page, false);
    await noOverflow(page);

    const touchContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true
    });
    const touchPage = await touchContext.newPage();
    await login(touchPage);
    assert.equal(await touchPage.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches), false);
    await touchPage.evaluate(() => {
      AFF.state.sidebarCollapsed = true;
      AFF.state.mobileNavOpen = false;
      AFF.state.navGroups = [];
      render();
    });
    await widthIs(touchPage, 68);
    await touchPage.mouse.move(34, 160);
    await widthIs(touchPage, 68);
    await expandedIs(touchPage, false);
    assert.equal(await touchPage.locator("body").evaluate(node => node.classList.contains("sidebar-hover-open")), false);
    await touchPage.locator("#sidebar-toggle").tap();
    await widthIs(touchPage, 216);
    await expandedIs(touchPage, true);
    await noOverflow(touchPage);
    await capture(touchPage, "sidebar-touch-open-390.png");
    await touchPage.locator('[data-nav-group="数据总览"]').tap();
    await touchPage.locator('#nav [data-route="clients"]').tap();
    await touchPage.waitForSelector(".report-page");
    await widthIs(touchPage, 68);
    await expandedIs(touchPage, false);
    await touchPage.locator("#sidebar-toggle").tap();
    await widthIs(touchPage, 216);
    await touchPage.locator("#sidebar-toggle").tap();
    await widthIs(touchPage, 68);
    await expandedIs(touchPage, false);
    await noOverflow(touchPage);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({
      mouseViewports: [1440, 1111, 800, 390], touchViewport: 390, screenshots,
      checks: "temporary mouse expansion, leave restoration, fixed expansion, labels, menu navigation, unchanged content position, touch clicks, viewport resize, no overflow or console errors"
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
