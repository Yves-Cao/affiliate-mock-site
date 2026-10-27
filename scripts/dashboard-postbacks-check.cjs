const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const origin = "http://127.0.0.1:4179";
const artifacts = path.resolve(".artifacts");
const platforms = [
  ["binom", "Binom"], ["redtrack", "RedTrack"], ["voluum", "Voluum"],
  ["keitaro", "Keitaro"], ["affise", "Affise"], ["peerclick", "PeerClick"],
  ["bemob", "BeMob"], ["trackier", "Trackier"], ["funnelflux", "FunnelFlux"]
];

async function main() {
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  const externalRequests = [];
  let checks = 0;
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin === origin || url.protocol === "data:") return route.continue();
    externalRequests.push(url.href);
    return route.abort();
  });
  const check = (condition, label) => {
    assert.ok(condition, label);
    checks++;
  };
  const action = name => page.locator(`[data-action='${name}']`);
  const connect = platform => page.locator(`[data-action='postback-connect'][data-platform-id='${platform}']`);
  const close = () => page.locator(".postback-modal [data-action='close-modal']").last().click();
  const save = () => action("create-tracker").click();
  const configRow = name => page.locator("#main tbody tr").filter({ hasText: name });
  const dashboard = async () => {
    await page.evaluate(() => { location.hash = "#/dash"; });
    await page.locator(".dashboard-postbacks").waitFor();
  };
  const stableLayout = async () => {
    await page.mouse.move(page.viewportSize().width - 8, 420);
    await page.locator("#toast").waitFor({ state: "hidden" });
    await page.evaluate(async () => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})));
    });
  };
  const screenshot = async name => {
    await stableLayout();
    await page.screenshot({ path: path.join(artifacts, name), fullPage: false });
  };
  const noOverflow = async label => check(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    label
  );

  try {
    await page.goto(origin, { waitUntil: "networkidle" });
    await page.locator("#login-form input[name=email]").fill("dashboard-qa@example.com");
    await page.locator("#login-form input[name=password]").fill("Password123!");
    await page.locator("#login-form button[type=submit]").click();
    await page.locator(".dashboard-postbacks").waitFor();
    check(new URL(page.url()).hash === "#/dash", "The tracker platform panel is on the initial dashboard");
    check((await page.locator(".dashboard-postbacks").innerText()).includes("连接您的广告追踪器"), "Dashboard identifies the tracker connection area");
    check(await page.locator(".dashboard-postbacks").evaluate(panel => panel.getBoundingClientRect().top < innerHeight - 40), "Desktop dashboard exposes tracker setup in the first viewport");
    check(await connect("custom").count() === 1, "Dashboard offers a custom platform");
    const initialBinomStatus = await connect("binom").innerText();

    for (const [id, name] of platforms) {
      check(await connect(id).count() === 1, `${name} has a dashboard entry`);
      await connect(id).click();
      check(await page.locator("#postback-platform").inputValue() === id, `${name} opens its own platform configuration`);
      check(new URL(page.url()).hash === "#/dash", `${name} configuration opens without leaving the dashboard`);
      await close();
    }
    check(await connect("binom").innerText() === initialBinomStatus, "Canceling platform setup preserves dashboard state");
    const logoImages = await page.locator(".dashboard-postbacks img").evaluateAll(images => images.map(image => ({
      loaded: image.complete && image.naturalWidth > 0,
      local: new URL(image.currentSrc, location.href).origin === location.origin
    })));
    check(logoImages.length >= platforms.length && logoImages.every(image => image.loaded && image.local), "Tracker logos load from local assets");

    await connect("binom").click();
    check((await page.locator("#postback-name").inputValue()).includes("Binom"), "Platform configuration names identify the selected tracker");
    check(await page.locator("#postback-manualUrl").inputValue() === "", "Tracker receiver templates require user input");
    await page.locator("#postback-name").fill("QA dashboard Binom");
    await page.locator("#postback-manualUrl").fill("https://tracker.example.com/postback?clickid={clickid}&event={aff_cid}");
    await page.setViewportSize({ width: 390, height: 844 });
    await screenshot("dashboard-postbacks-editor.png");
    const footerBounds = await page.locator(".postback-footer").boundingBox();
    check(footerBounds && footerBounds.y >= 0 && footerBounds.y + footerBounds.height <= 845, "Mobile setup keeps the save and cancel footer in the viewport");
    await noOverflow("Mobile tracker setup has no document overflow");
    await save();
    check(new URL(page.url()).hash === "#/dash", "Saving a tracker returns to the dashboard");
    check((await connect("binom").innerText()).includes("已配置 1 项"), "Dashboard displays the saved tracker configuration count");
    await page.reload({ waitUntil: "networkidle" });
    check((await connect("binom").innerText()).includes("已配置 1 项"), "Refreshing preserves the tracker platform configuration");

    await action("postback-manage").click();
    check(new URL(page.url()).hash === "#/tracker", "Dashboard management opens the shared tracker configuration list");
    const binomRow = configRow("QA dashboard Binom");
    check((await binomRow.innerText()).includes("Binom"), "The configuration list identifies the tracker platform");
    await binomRow.locator("[data-action='postback-toggle']").click();
    await dashboard();
    check((await connect("binom").innerText()).includes("已暂停"), "Paused tracker configuration is reflected on the dashboard");

    await connect("custom").click();
    check(await page.locator("#postback-platform").inputValue() === "custom", "Custom setup selects the custom platform");
    check(await page.locator("#postback-endpoint").isVisible(), "Custom setup offers generated URL mapping");
    check(await page.locator("#postback-endpoint").inputValue() === "", "Custom setup does not invent a receiver address");
    await page.locator("#postback-name").fill("QA dashboard custom");
    await page.locator("#postback-endpoint").fill("https://tracker.example.com/custom");
    await save();
    check(new URL(page.url()).hash === "#/dash", "Custom setup saves from the dashboard");
    await action("postback-manage").click();
    check(await configRow("QA dashboard custom").count() === 1, "Dashboard custom configuration is available in shared management");
    await dashboard();

    for (const width of [1440, 1920, 768, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
      await stableLayout();
      await noOverflow(`Dashboard platform panel has no document overflow at ${width}px`);
      check(await page.locator(".dashboard-postbacks").isVisible(), `Tracker platform panel remains visible at ${width}px`);
      if (width === 1440) {
        await page.evaluate(() => scrollTo(0, 0));
        await screenshot("dashboard-postbacks-desktop.png");
      }
      if (width === 390) {
        await page.locator(".dashboard-postbacks").scrollIntoViewIfNeeded();
        await screenshot("dashboard-postbacks-mobile.png");
      }
    }
    check(externalRequests.length === 0, `No external requests during tracker setup: ${externalRequests.join("; ")}`);
    check(errors.length === 0, `No browser errors: ${errors.join("; ")}`);
    console.log(`PASS: ${checks} dashboard Postback checks; 3 desktop/mobile screenshots; no external requests or browser errors.`);
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
