const { chromium } = require("playwright");
const assert = require("node:assert/strict");

const baseUrl = process.env.SIMULATION_BASE_URL || "http://127.0.0.1:4179";

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
    await page.fill("#login-form input[name=email]", "simulation-console@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForSelector("#app-view:not(.hidden)");
    assert.ok(await page.locator("#simulation-toggle").isVisible(), "Simulation launcher is visible online");

    await page.click("#simulation-toggle");
    await page.waitForSelector(".sim-drawer");
    for (const label of ["时间", "录入", "违规", "场景", "数据", "日志"]) {
      assert.ok((await page.locator(".sim-tabs").innerText()).includes(label), `Simulation tab ${label} exists`);
    }
    assert.ok(await page.locator("[data-sim-run-settlement]").isVisible(), "Daily settlement action is visible");
    await page.click("[data-sim-run-settlement]");
    const settlementRun = await page.evaluate(() => AFF.state.settlementRuns?.[0]);
    assert.equal(settlementRun.status, "completed", "Daily settlement run completes");
    assert.ok(settlementRun.traceId, "Daily settlement run stores trace id");
    await page.click("[data-sim-run-settlement]");
    assert.equal(await page.evaluate(() => AFF.state.settlementRuns.length), 1, "Daily settlement is idempotent for a mock date");
    assert.ok(await page.locator(".sim-settlement-run-meta").isVisible(), "Settlement run details render");

    await page.click("[data-sim-advance='7']");
    await page.waitForFunction(() => window.AFF?.simulation?.date() === "2026-11-03");
    await page.waitForSelector(".sim-drawer");
    assert.ok((await page.locator(".sim-summary").innerText()).includes("2026-10-27 → 2026-11-03"), "Time transition summary renders");

    await page.click("[data-sim-tab='record']");
    await page.click("[data-sim-record-form] button[type='submit']");
    await page.waitForFunction(() => window.AFF?.simulation?.state().records.length === 1);
    await page.waitForSelector(".sim-drawer");
    const record = await page.evaluate(() => {
      const row = AFF.reporting.rows.find(item => item.clientId === "SIM-C-10001");
      return {
        exists: Boolean(row),
        milestone: row?.milestoneStatus,
        caseCount: row?.commissionCases?.length || 0,
        reporting: AFF.reporting.totals(AFF.reporting.rows)
      };
    });
    assert.equal(record.exists, true, "Synthetic client enters the shared reporting dataset");
    assert.ok(record.caseCount > 0, "Synthetic client generates commission cases");

    await page.click("[data-sim-tab='violation']");
    await page.selectOption("[data-sim-violation='type']", "fraud_hit");
    await page.fill("[data-sim-violation='reason']", "仿真欺诈库命中事件");
    await page.click("[data-sim-violation-form] button[type='submit']");
    await page.waitForFunction(() => window.AFF?.simulation?.state().violations.length === 1);
    await page.waitForSelector(".sim-drawer");
    const linked = await page.evaluate(() => {
      const violation = AFF.simulation.state().violations[0];
      const row = AFF.reporting.rows.find(item => item.clientId === violation.targetId);
      return {
        targetId: violation.targetId,
        risk: row?.riskHandlingStatus,
        commission: row?.commissionStatus,
        fund: row?.fundStatus,
        message: AFF.finance.messages.find(item => item.simulationViolationId === violation.id),
        appeal: AFF.finance.appeals.find(item => item.objectId === violation.id)
      };
    });
    assert.equal(linked.risk, "quarantined", "Fraud violation quarantines the client");
    assert.equal(linked.commission, "rejected", "Fraud violation rejects related commissions");
    assert.equal(linked.fund, "rejected", "Fraud violation updates the fund layer");
    assert.ok(linked.message, "Fraud violation creates a message");
    assert.equal(linked.appeal?.status, "reviewing", "Appealable violation creates an appeal task");

    const snapshot = await page.evaluate(() => AFF.simulation.exportSnapshot());
    const parsedSnapshot = JSON.parse(snapshot);
    assert.equal(parsedSnapshot.date, "2026-11-03", "Snapshot keeps mock date");
    assert.equal(parsedSnapshot.records.length, 2, "Snapshot keeps synthetic records");
    assert.equal(parsedSnapshot.violations.length, 1, "Snapshot keeps violations");

    await page.evaluate(() => {
      AFF.simulation.reset();
      location.reload();
    });
    await page.waitForFunction(() => window.AFF?.simulation?.date() === "2026-10-27");
    assert.equal(await page.evaluate(() => AFF.simulation.state().records.length), 2, "Reset keeps synthetic records");
    assert.equal(await page.evaluate(() => AFF.simulation.state().violations.length), 1, "Reset keeps violations");

    await page.evaluate(snapshot => {
      AFF.simulation.importSnapshot(snapshot);
      location.reload();
    }, snapshot);
    await page.waitForFunction(() => window.AFF?.simulation?.state().records.length === 2);
    assert.equal(await page.evaluate(() => AFF.simulation.date()), "2026-11-03", "Snapshot import restores mock date");

    await page.click("[data-sim-tab='data']");
    // D-08: two-step in-UI confirmation — click twice instead of the native dialog.
    await page.click("[data-sim-reset]");
    await page.click("[data-sim-reset]");
    await page.waitForFunction(() => window.AFF?.simulation?.date() === "2026-10-27" && AFF.simulation.state().records.length === 2 && AFF.simulation.state().violations.length === 1);
    await page.locator(".sim-drawer header [data-sim-close]").click();

    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.click("#simulation-toggle");
      await page.waitForSelector(".sim-drawer");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, `Simulation console has no document overflow at ${width}px`);
      await page.keyboard.press("Escape");
    }

    assert.equal(errors.length, 0, `No page errors: ${errors.join("; ")}`);
    console.log(JSON.stringify({
      result: "Simulation console checks passed",
      capabilities: ["time-replay", "single-record", "violation-linkage", "snapshot", "reset", "responsive"]
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
