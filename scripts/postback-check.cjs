const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const origin = "http://127.0.0.1:4179";
const artifacts = path.resolve(".artifacts");

async function main() {
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  const receiverRequests = [];
  let checks = 0;
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await context.route("https://**/*", route => {
    if (new URL(route.request().url()).hostname.endsWith("example.com")) receiverRequests.push(route.request().url());
    return route.abort();
  });
  const check = (condition, label) => {
    assert.ok(condition, label);
    checks++;
  };
  const action = name => page.locator(`[data-action='${name}']`);
  const close = () => page.locator(".postback-modal [data-action='close-modal']").last().click();
  const configs = () => page.locator("[data-action='postback-tab'][data-tab='configs']").click();
  const logs = () => page.locator("[data-action='postback-tab'][data-tab='logs']").click();
  const configRow = () => page.locator("#main tbody tr").filter({ hasText: "QA generated postback" });
  const save = () => action("create-tracker").click();
  const errorPresent = async id => check((await page.locator(`#postback-error-${id}`).innerText()).length > 0, `${id} rejects invalid input`);
  const screenshot = async name => {
    await page.mouse.move(380, 420);
    await page.locator("#toast").waitFor({ state: "hidden" });
    await page.evaluate(async () => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})));
    });
    if (page.viewportSize().width === 390 && !await page.locator(".postback-modal").count()) {
      await page.waitForFunction(() => document.querySelector("#sidebar").getBoundingClientRect().width <= 70);
    }
    await page.screenshot({ path: path.join(artifacts, name), fullPage: false });
  };
  const noOverflow = async label => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label);
  try {
    await page.goto(origin, { waitUntil: "networkidle" });
    await page.locator("#login-form input[name=email]").fill("qa@example.com");
    await page.locator("#login-form input[name=password]").fill("Password123!");
    await page.locator("#login-form button[type=submit]").click();
    await page.locator("#app-view").waitFor({ state: "visible" });
    await page.evaluate(() => { location.hash = "#/tracker"; });
    await action("open-tracker-modal").waitFor();
    await action("open-tracker-modal").click();
    check(await page.locator("#postback-endpoint").inputValue() === "", "New receiver has no silent default");
    await save();
    await errorPresent("name");
    await errorPresent("endpoint");
    await page.locator("#postback-name").fill("QA generated postback");
    for (const endpoint of [
      "http://tracker.example.com/postback",
      "https://localhost/postback",
      "https://service.internal/postback",
      "https://127.0.0.1/postback",
      "https://user:pass@tracker.example.com/postback",
      "https://tracker.example.com/postback#fragment"
    ]) {
      await page.locator("#postback-endpoint").fill(endpoint);
      await save();
      await errorPresent("endpoint");
    }
    await page.locator("#postback-endpoint").fill("https://tracker.example.com/postback?source=QA%20test");
    await page.locator("#postback-clickUrl").fill("https://track.example.com/click?clickid=123&campaign_code=abc");
    await action("postback-add-parameter").click();
    check(await page.locator("#postback-value-3 option[value='{campaign_code}']").count() === 1, "Click URL exposes custom source token");
    await page.locator("#postback-key-3").fill("campaign");
    await page.locator("#postback-value-3").selectOption("{campaign_code}");
    await action("postback-add-parameter").click();
    await page.locator("[data-action='postback-remove-parameter'][data-index='4']").click();
    check(await page.locator("#postback-parameters .postback-parameter").count() === 4, "Mappings can be added and removed");
    const template = await page.locator("#postback-url-preview").innerText();
    check(template.includes("campaign={campaign_code}") && template.includes("event_id={aff_cid}"), "Generated URL preview includes complete mappings");
    await screenshot("postbacks-editor-desktop.png");
    await noOverflow("Desktop editor has no document overflow");
    await page.setViewportSize({ width: 390, height: 844 });
    await screenshot("postbacks-editor-mobile.png");
    await noOverflow("Mobile editor has no document overflow");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await save();
    check(await configRow().count() === 1, "Generated configuration is saved");
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
    await configRow().locator("[data-action='postback-copy']").click();
    check(await page.evaluate(() => navigator.clipboard.readText()) === template, "Copy returns exact template");
    await configRow().locator("[data-action='postback-edit']").click();
    await page.locator("#postback-name").fill("Cancelled name");
    await close();
    check(await configRow().count() === 1, "Cancel preserves saved configuration");

    await configRow().locator("[data-action='postback-test']").click();
    const request = await page.locator(".postback-preview code").innerText();
    check(!request.includes("{") && new URL(request).searchParams.get("campaign") === "demo_campaign_code", "Test substitutes click and system tokens");
    check(new URL(request).searchParams.get("source") === "QA test", "Query encoding survives generation");
    const encodedSample = await page.evaluate(() => AFF.postbacks.sample({
      mode: "manual",
      manualUrl: "https://tracker.example.com/postback?event={aff_cid}",
      clickUrl: "",
      event: "registration"
    }, "EVT QA&x=1").requestUrl);
    check(encodedSample === "https://tracker.example.com/postback?event=EVT%20QA%26x%3D1", "Substituted values encode spaces and query delimiters");
    await page.locator("#postback-test-result").selectOption("failed");
    await action("postback-run-test").click();
    check((await page.locator("#postback-test-output").innerText()).includes("500"), "HTTP 500 produces a failed local result");
    await close();
    await logs();
    let logRow = page.locator("#main tbody tr").filter({ hasText: "QA generated postback" }).first();
    const eventId = await logRow.locator(".postback-id").innerText();
    await logRow.locator("[data-action='postback-retry']").click();
    check(await page.locator(".postback-preview code").innerText() === request, "Retry preserves the request snapshot");
    check((await page.locator(".postback-details").innerText()).includes(eventId), "Retry preserves the event ID");
    await page.locator("#postback-test-result").selectOption("timeout");
    await action("postback-run-test").click();
    check((await page.locator("#postback-test-output").innerText()).includes("TIMEOUT"), "Timeout produces a timeout result");
    await close();
    await logRow.locator("[data-action='postback-log-detail']").click();
    check(await page.locator(".postback-attempts li").count() === 2, "Retry appends an attempt to the existing record");
    await close();
    await configs();
    await configRow().locator("[data-action='postback-toggle']").click();
    check(await configRow().locator("[data-action='postback-test']").isDisabled(), "Paused configuration cannot test");
    await logs();
    check(await logRow.locator("[data-action='postback-retry']").isDisabled(), "Paused configuration cannot retry");
    await page.reload({ waitUntil: "networkidle" });
    check((await page.locator("#main").innerText()).includes(eventId), "Session refresh preserves logs");
    await configs();
    check(await configRow().locator("[data-action='postback-test']").isDisabled(), "Session refresh preserves paused status");
    await configRow().locator("[data-action='postback-toggle']").click();
    await configRow().locator("[data-action='postback-edit']").click();
    await page.locator("#postback-event").selectOption("deposit");
    await save();
    check((await configRow().innerText()).includes("版本 2"), "Saving an edit increments configuration version");
    await logs();
    check(await logRow.locator("[data-action='postback-retry']").isDisabled(), "Old-version record cannot retry after configuration changes");
    await configs();
    await configRow().locator("[data-action='postback-test']").click();
    check(new URL(await page.locator(".postback-preview code").innerText()).searchParams.get("amount") === "250.00", "Deposit event uses deposit sample amount");
    await action("postback-run-test").click();
    check((await page.locator("#postback-test-output").innerText()).includes("200"), "Success produces HTTP 200");
    await close();
    await logs();
    logRow = page.locator("#main tbody tr").filter({ hasText: "QA generated postback" }).first();
    check(await logRow.locator("[data-action='postback-retry']").isDisabled(), "Successful record cannot retry");
    await page.locator("select[data-postback-filter='result']").selectOption("timeout");
    check(await page.locator("#main tbody tr").count() === 1, "Result filter shows only matching records");
    await action("postback-reset-filters").click();
    check(await page.locator("#main tbody tr").count() === 2, "Reset restores all delivery records");
    await screenshot("postbacks-logs-desktop.png");

    await configs();
    await action("open-tracker-modal").click();
    await page.locator("#postback-name").fill("QA manual postback");
    await page.locator("[data-action='postback-mode'][data-mode='manual']").click();
    for (const value of [
      "https://tracker.example.com/postback?x={unknown}",
      "https://tracker.example.com/postback?x={{clickid}}",
      "https://tracker.example.com/postback?x={clickid",
      "https://tracker.example.com/{clickid}?x=1"
    ]) {
      await page.locator("#postback-manualUrl").fill(value);
      await save();
      await errorPresent("manualUrl");
    }
    await page.locator("#postback-manualUrl").fill("https://tracker.example.com/postback?cid={clickid}&event={aff_cid}&client={aff_client}");
    await save();
    check(await page.locator("#main tbody tr").filter({ hasText: "QA manual postback" }).count() === 1, "Manual template can be saved");
    await page.locator("#language-toggle").click();
    await page.locator("[data-language='en']").click();
    check((await page.locator("#main").innerText()).includes("Configurations"), "Feature provides English labels");
    await screenshot("postbacks-desktop.png");
    await noOverflow("Desktop configuration page has no document overflow");
    await page.setViewportSize({ width: 390, height: 844 });
    await screenshot("postbacks-mobile.png");
    await noOverflow("Mobile configuration page has no document overflow");
    check(await page.locator(".postback-page").isVisible(), "Postback page remains visible on mobile");
    const mobileColumns = await page.locator(".postback-table").evaluate(section => {
      const wrap = section.querySelector(".table-wrap");
      wrap.scrollLeft = wrap.scrollWidth;
      const bounds = wrap.getBoundingClientRect();
      const row = section.querySelector("tbody tr");
      const cells = row.querySelectorAll("td");
      return {
        positions: [getComputedStyle(cells[0]).position, getComputedStyle(cells[cells.length - 1]).position],
        actionsVisible: [...row.querySelectorAll(".table-actions button")].every(button => {
          const rect = button.getBoundingClientRect();
          return rect.left >= bounds.left && rect.right <= bounds.right;
        })
      };
    });
    check(mobileColumns.positions.every(position => position === "static"), "Mobile first and last columns scroll without overlap");
    check(mobileColumns.actionsVisible, "All mobile row actions fit inside the table after scrolling right");
    await screenshot("postbacks-mobile-actions.png");
    check(receiverRequests.length === 0, "No requests were sent to receiver domains");
    check(errors.length === 0, `No browser errors: ${errors.join("; ")}`);
    console.log(`PASS: ${checks} Postback behavior checks; 6 desktop/mobile screenshots; no receiver requests or browser errors.`);
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
