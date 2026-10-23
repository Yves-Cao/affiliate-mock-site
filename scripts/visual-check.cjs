const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto("http://127.0.0.1:4179", { waitUntil: "networkidle" });

  await page.fill("input[name=username]", "demo-user");
  await page.fill("input[name=password]", "demo-password");
  await page.click("#login-form button[type=submit]");
  await page.waitForSelector("#app-view:not(.hidden)");
  if (!(await page.locator("#login-name").innerText()).includes("demo-user")) throw new Error("Login failed");
  if ((await page.locator("#response-status").innerText()) !== "200") throw new Error("Current user endpoint failed");

  await page.click("[data-endpoint='clients']");
  await page.selectOption("#scenario", "no-source");
  if ((await page.locator("#response-status").innerText()) !== "200") throw new Error("Client endpoint failed");
  if (!(await page.locator(".tag.bad").first().innerText()).includes("no-source")) throw new Error("No-source scenario failed");

  await page.click("[data-endpoint='commissions']");
  await page.selectOption("#scenario", "dynamic-hold");
  if (!(await page.locator("#json-view").innerText()).includes("\"holding\"")) throw new Error("Dynamic Hold scenario failed");

  await page.click("[data-endpoint='audits']");
  await page.selectOption("#scenario", "normal-flow");
  await page.click("#state-panel button:first-child");
  if (!(await page.locator("#json-view").innerText()).includes("\"approved\"")) throw new Error("Stateful audit decision failed");

  await page.selectOption("#role", "partner");
  await page.click("[data-endpoint='partners']");
  if ((await page.locator("#response-status").innerText()) !== "403") throw new Error("Permission check failed");

  const desktop = await page.screenshot({ fullPage: true });
  if (desktop.length < 10000) throw new Error("Desktop screenshot appears blank");
  fs.mkdirSync(path.join(process.cwd(), ".artifacts"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), ".artifacts", "desktop.png"), desktop);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.click("[data-endpoint='commissions']");
  await page.selectOption("#role", "operator");
  await page.selectOption("#scenario", "chargeback");
  await page.waitForTimeout(100);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 2) throw new Error(`Mobile horizontal overflow: ${overflow}px`);
  const mobile = await page.screenshot({ fullPage: true });
  if (mobile.length < 10000) throw new Error("Mobile screenshot appears blank");
  fs.writeFileSync(path.join(process.cwd(), ".artifacts", "mobile.png"), mobile);

  const consoleErrors = [];
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto("http://127.0.0.1:4179", { waitUntil: "networkidle" });
  if (consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join("; ")}`);

  await browser.close();
  console.log("Visual and interaction checks passed");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
