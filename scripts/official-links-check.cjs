const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const baseUrl = process.env.OFFICIAL_LINK_BASE_URL || "http://127.0.0.1:4179";

async function main() {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const externalRequests = [];
  page.on("request", request => {
    if (new URL(request.url()).origin === "https://go.affiliate-cpa.example") externalRequests.push(request.url());
  });
  try {
    await page.goto(`${baseUrl}/#/promo`, { waitUntil: "domcontentloaded" });
    await page.fill("#login-form input[name=email]", "official-links@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForSelector("#app-view:not(.hidden)");
    await page.evaluate(() => navigate("promo"));
    await page.waitForSelector(".campaign-list");
    const promo = await page.locator(".campaign-link").first().evaluate(node => ({
      text: node.querySelector("a").textContent,
      href: node.querySelector("a").href,
      copy: node.querySelector("[data-copy]").dataset.copy
    }));
    assert.equal(new URL(promo.text).origin, "https://go.affiliate-cpa.example");
    assert.equal(new URL(promo.copy).origin, "https://go.affiliate-cpa.example");
    assert.ok(new URL(promo.copy).searchParams.get("path_version"));
    assert.equal(new URL(promo.href).origin, new URL(baseUrl).origin);

    await page.evaluate(() => navigate("subchannels"));
    await page.waitForSelector(".sc-table");
    const subchannel = await page.locator(".sc-link").first().evaluate(node => ({
      text: node.querySelector("a").textContent,
      href: node.querySelector("a").href,
      copy: node.querySelector("[data-copy]").dataset.copy
    }));
    assert.equal(new URL(subchannel.text).origin, "https://go.affiliate-cpa.example");
    assert.equal(new URL(subchannel.copy).origin, "https://go.affiliate-cpa.example");
    assert.ok(new URL(subchannel.copy).searchParams.has("subid"));
    assert.equal(new URL(subchannel.href).origin, new URL(baseUrl).origin);

    assert.equal(externalRequests.length, 0, "No official-domain request is sent by the local mock");
    console.log("PASS: promo and subchannel display/copy official links, open local mock entries, and include path/subchannel parameters.");
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
