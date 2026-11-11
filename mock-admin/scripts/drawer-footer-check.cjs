const { chromium } = require("playwright");
const assert = require("node:assert/strict");

const baseUrl = process.env.DRAWER_FOOTER_BASE_URL || "http://127.0.0.1:4179";

async function footerStyle(page, selector) {
  return page.locator(selector).evaluate((node, selector) => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return {
      selector,
      position: style.position,
      bottom: style.bottom,
      justifyContent: style.justifyContent,
      top: Math.round(rect.top),
      height: Math.round(rect.height),
      viewport: window.innerHeight
    };
  }, selector);
}

async function openAndCheck(page, route, trigger, footerSelector, drawerSelector) {
  await page.evaluate(route => navigate(route), route);
  await page.waitForTimeout(80);
  await page.locator(trigger).first().click();
  await page.waitForSelector(drawerSelector);
  await page.waitForTimeout(60);
  const footer = await footerStyle(page, footerSelector);
  assert.equal(footer.position, footerSelector.includes("filter-drawer") ? "absolute" : "sticky", `${footerSelector} stays at the drawer bottom`);
  assert.equal(footer.bottom, "0px", `${footerSelector} is anchored to the bottom`);
  assert.equal(footer.justifyContent, "flex-start", `${footerSelector} buttons start from the left`);
  assert.ok(footer.top + footer.height >= footer.viewport - 2, `${footerSelector} is visible at the viewport bottom`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(40);
  return footer;
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(`${baseUrl}/#/dash`, { waitUntil: "domcontentloaded" });
    await page.fill("#login-form input[name=email]", "drawer-footer-check@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForSelector("#app-view:not(.hidden)");

    const checks = [];
    checks.push(await openAndCheck(page, "clients", "[data-rp-client]", ".report-drawer > footer", ".report-drawer"));
    checks.push(await openAndCheck(page, "pay", "[data-earn-detail]", ".earn-drawer > footer", ".earn-drawer"));
    checks.push(await openAndCheck(page, "guarantee", "[data-guarantee-detail]", ".finance-drawer > footer", ".finance-drawer"));
    checks.push(await openAndCheck(page, "support", "[data-support-detail]", ".finance-drawer > footer", ".finance-drawer"));
    checks.push(await openAndCheck(page, "statements", "[data-statement-detail]", ".finance-drawer > footer", ".finance-drawer"));
    checks.push(await openAndCheck(page, "messages", "[data-message-detail]", ".finance-drawer > footer", ".finance-drawer"));
    checks.push(await openAndCheck(page, "appeals", "[data-appeal-detail]", ".finance-drawer > footer", ".finance-drawer"));
    checks.push(await openAndCheck(page, "subchannels", "[data-sc-detail]", ".sc-drawer > footer", ".sc-drawer"));
    checks.push(await openAndCheck(page, "promo", "[data-action='campaign-data']", ".campaign-data-footer", ".campaign-data-drawer"));
    checks.push(await openAndCheck(page, "tracker", "[data-action='open-tracker-modal']", ".postback-footer", ".postback-modal"));

    await page.evaluate(() => navigate("wd"));
    await page.click("[data-withdraw-tab='records']");
    await page.waitForSelector("[data-withdraw-detail]");
    await page.locator("[data-withdraw-detail]").first().click();
    await page.waitForSelector(".wd-drawer");
    checks.push(await footerStyle(page, ".wd-drawer > footer"));
    await page.keyboard.press("Escape");

    await page.evaluate(() => navigate("account"));
    await page.click("[data-account-tab='finance']");
    await page.click("[data-account-finance-form='tax']");
    await page.waitForSelector(".finance-drawer");
    const accountFooter = await footerStyle(page, ".finance-drawer > footer");
    assert.ok((await page.locator(".finance-drawer > footer").innerText()).includes("提交申请"), "Finance change submit lives in the drawer footer");
    checks.push(accountFooter);
    await page.keyboard.press("Escape");

    await page.evaluate(() => navigate("assets"));
    await page.waitForSelector("[data-action='open-code-modal']");
    await page.click("[data-action='open-code-modal']");
    await page.click("[data-action='accept-code']");
    await page.waitForSelector(".asset-preview-button");
    await page.locator(".asset-preview-button").first().click();
    await page.waitForSelector(".asset-detail-drawer");
    const assetFooter = await footerStyle(page, ".filter-drawer > .drawer-actions");
    assert.equal(assetFooter.position, "absolute", "Asset drawer footer is anchored");
    assert.equal(assetFooter.justifyContent, "flex-start", "Asset drawer buttons start from the left");
    assert.ok(assetFooter.top + assetFooter.height >= assetFooter.viewport - 2, "Asset drawer footer is at the bottom");
    checks.push(assetFooter);

    assert.equal(errors.length, 0, `No page errors: ${errors.join("; ")}`);
    console.log(JSON.stringify({
      drawers: checks.length,
      alignment: "left",
      result: "Right drawer footer checks passed"
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
