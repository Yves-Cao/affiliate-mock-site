const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const baseUrl = process.env.DEEP_BASE_URL || "http://127.0.0.1:4179";

async function main() {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(`${baseUrl}/#/deep`, { waitUntil: "domcontentloaded" });
    await page.fill("#login-form input[name=email]", "deep-official@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForSelector("#app-view:not(.hidden)");
    await page.evaluate(() => navigate("deep"));
    await page.waitForSelector(".deep-link-page");

    const initial = await page.evaluate(() => ({
      desktop: document.querySelectorAll(".deep-link-result .link-text")[0]?.textContent,
      mobile: document.querySelectorAll(".deep-link-result .link-text")[1]?.textContent,
      textInputs: document.querySelectorAll(".deep-link-page input:not([type=hidden])").length,
      pathVersion: AFF.deepLinks.pathVersion,
      domain: AFF.deepLinks.domain
    }));
    assert.equal(initial.textInputs, 0, "No custom target path input is exposed");
    assert.ok(initial.desktop.startsWith(`${initial.domain}/register?`));
    assert.ok(initial.mobile.startsWith(`${initial.domain}/register?`));
    assert.ok(initial.desktop.includes(`path_version=${initial.pathVersion}`));
    assert.ok(initial.mobile.includes(`path_version=${initial.pathVersion}`));

    await page.selectOption("[data-deep='desktop.assetId']", "OFF-STANDARD-MT5");
    await page.selectOption("[data-deep='desktop.language']", "English");
    await page.selectOption("[data-deep='mobile.system']", "Android (Google Play)");
    await page.selectOption("[data-deep='mobile.assetId']", "OFF-HOME");
    const updated = await page.evaluate(() => ({
      desktop: document.querySelectorAll(".deep-link-result .link-text")[0]?.textContent,
      mobile: document.querySelectorAll(".deep-link-result .link-text")[1]?.textContent
    }));
    assert.ok(updated.desktop.startsWith(`${initial.domain}/register?`));
    assert.ok(updated.desktop.includes("page=standard-mt5"));
    assert.ok(updated.desktop.includes("lang=en"));
    assert.ok(updated.mobile.startsWith(`${initial.domain}/register?`));
    assert.ok(updated.mobile.includes("page=home"));
    assert.ok(updated.mobile.includes("system=android"));
    assert.ok((await page.locator("#main").innerText()).includes("点击风险校验保护"));

    for (const width of [1440, 992, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      assert.equal(await page.evaluate(() =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      ), true, `${width}: deep links have no document overflow`);
    }
    assert.equal(errors.length, 0, `No page errors: ${errors.join("; ")}`);
    console.log("PASS: official assets, generated paths, path version, language/system parameters, risk-protection notice and responsive layout.");
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
