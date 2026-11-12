const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const base = process.env.PROGRAM_BASE_URL || "http://127.0.0.1:4179";
const artifacts = path.join(__dirname, "../.artifacts/program-navigation");
fs.mkdirSync(artifacts, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true
  });
  const errors = [];
  try {
    for (const width of [1440, 1024, 390]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(base, { waitUntil: "networkidle" });
      await page.fill("#login-form input[name=email]", "program-nav@example.com");
      await page.fill("#login-form input[name=password]", "mock");
      await page.click("#login-form button[type=submit]");
      const drawer = page.locator(".program-navigation");
      await drawer.waitFor();
      assert.equal(await drawer.locator(".program-navigation-list button").count(), 6);
      assert.equal(await drawer.locator(".program-navigation-list button:disabled").count(), 5);
      assert.equal(await page.evaluate(() => AFF.state.applyStep), 1);
      const geometry = await drawer.evaluate(node => {
        const r = node.getBoundingClientRect();
        const footer = node.querySelector("footer").getBoundingClientRect();
        return { width: r.width, right: r.right, footer: footer.bottom, overflow: node.scrollWidth - node.clientWidth };
      });
      assert.ok(Math.abs(geometry.width - (width < 768 ? width : Math.min(640, width / 2))) <= 1);
      assert.ok(Math.abs(geometry.right - width) <= 1 && Math.abs(geometry.footer - (width === 390 ? 844 : 900)) <= 1);
      assert.ok(geometry.overflow <= 1);
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflow), "hidden");
      await page.screenshot({ path: path.join(artifacts, `first-login-${width}.png`) });
      await page.keyboard.press("Shift+Tab");
      assert.equal(await drawer.locator("footer .primary").evaluate(node => node === document.activeElement), true);
      await page.keyboard.press("Escape");
      assert.equal(await drawer.count(), 0);
      assert.equal(await page.locator("#profile-entry").evaluate(node => node === document.activeElement), true);
      assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflow), "hidden");

      await page.locator("[data-action='open-program-navigation']").first().click();
      await drawer.waitFor();
      await drawer.locator("footer .primary").click();
      await page.waitForURL("**/#/apply");
      await page.waitForTimeout(100);
      assert.equal(await drawer.count(), 0);
      await page.locator(".program-action-card [data-apply-step='2']").click();
      assert.equal(await page.evaluate(() => AFF.state.programMaxStep), 2);
      await page.locator(".program-contents-button").click();
      await drawer.locator(".program-navigation-list [data-program-nav-step='1']").click();
      assert.deepEqual(await page.evaluate(() => [AFF.state.applyStep, AFF.state.programMaxStep]), [1, 2]);
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(await drawer.count(), 0, "Refresh does not reopen the directory");
      await page.locator(".program-contents-button").click();
      assert.equal(await drawer.locator(".program-navigation-list button:disabled").count(), 4);
      if (width >= 768) {
        await page.locator("#program-navigation-root > .aff-drawer-overlay").click({ position: { x: 0, y: 0 } });
      } else {
        await drawer.locator("footer .secondary").click();
      }
      assert.equal(await drawer.count(), 0);

      await page.evaluate(() => {
        AFF.state.language = "en";
        AFF.state.programCompleted = true;
        AFF.state.programMaxStep = 6;
        AFF.state.onboarding.submitted = true;
        persist();
        sessionStorage.removeItem("affiliate-user-session");
      });
      await page.reload({ waitUntil: "networkidle" });
      await page.fill("#login-form input[name=email]", "completed@example.com");
      await page.fill("#login-form input[name=password]", "mock");
      await page.click("#login-form button[type=submit]");
      assert.equal(await drawer.count(), 0, "Completed partner login skips the directory");
      await page.locator("#profile-entry").click();
      await drawer.waitFor();
      assert.equal(await drawer.locator("h2").innerText(), "Partner Program");
      assert.equal(await drawer.locator(".program-navigation-list button:disabled").count(), 0);
      await page.screenshot({ path: path.join(artifacts, `completed-${width}.png`) });
      await page.keyboard.press("Escape");
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log("Partner program navigation passed: login branches, progress, locking, revisit, focus, close, English and 1440/1024/390 layouts.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
