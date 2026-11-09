const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const baseUrl = process.env.LOOKUP_BASE_URL || "http://127.0.0.1:4179";

async function main() {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(`${baseUrl}/#/lookup`, { waitUntil: "domcontentloaded" });
    await page.fill("#login-form input[name=email]", "lookup-review@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForSelector("#app-view:not(.hidden)");
    await page.evaluate(() => navigate("lookup"));
    await page.locator("#lookup-input").waitFor();

    await page.fill("#lookup-input", "C-10241");
    await page.click("[data-action='lookup']");
    const owned = await page.locator(".result-card").innerText();
    assert.ok(owned.includes("C-10241") && owned.includes("30天归因窗口"));
    assert.ok(owned.includes("归因结果状态") && owned.includes("通过"), "Lookup shows a limited attribution result status");
    assert.ok(/[a-z]\*\*\*@/i.test(owned), "Owned result masks email");

    await page.fill("#lookup-input", "NOT-EXISTING-ID");
    await page.click("[data-action='lookup']");
    const missing = await page.locator(".result-card").innerText();
    assert.ok(missing.includes("无匹配结果") && missing.includes("审计日志"));

    for (let index = 0; index < 3; index += 1) {
      await page.fill("#lookup-input", `RATE-TEST-${index}`);
      await page.click("[data-action='lookup']");
    }
    await page.fill("#lookup-input", "RATE-TEST-BLOCKED");
    await page.click("[data-action='lookup']");
    const blocked = await page.locator(".result-card[role='alert']").innerText();
    assert.ok(blocked.includes("查询频次已达上限") && /约\s+\d+\s+秒/.test(blocked));
    assert.ok(/LOOKUP-TR-\d+/.test(blocked), "Blocked query includes an audit trace ID");
    const cooldown = await page.evaluate(() => AFF.state.lookup.cooldownUntil - Date.now());
    assert.ok(cooldown > 25000 && cooldown <= 30000, "Cooldown is approximately 30 seconds");

    for (const width of [1440, 992, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      assert.equal(await page.evaluate(() =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      ), true, `${width}: lookup has no document overflow`);
    }
    assert.equal(errors.length, 0, `No page errors: ${errors.join("; ")}`);
    console.log("PASS: exact lookup, masked email, anti-probe result, 5-query limit, visible cooldown, audit trace and responsive layout.");
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
