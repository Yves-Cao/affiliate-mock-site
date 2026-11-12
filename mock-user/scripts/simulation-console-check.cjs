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
    await page.keyboard.press("Escape");
    assert.ok(await page.locator("#simulation-toggle").isVisible(), "Simulation launcher is visible online");

    await page.click("#simulation-toggle");
    await page.waitForSelector(".sim-drawer");
    for (const label of ["时间", "录入", "违规", "信用", "场景", "数据", "日志"]) {
      assert.ok((await page.locator(".sim-tabs").innerText()).includes(label), `Simulation tab ${label} exists`);
    }
    assert.ok(await page.locator("[data-sim-run-settlement]").isVisible(), "Daily settlement action is visible");
    await page.click("[data-sim-run-settlement]");
    const settlementRun = await page.evaluate(() => AFF.state.settlementRuns?.[0]);
    assert.equal(settlementRun.status, "completed", "Daily settlement run completes");
    assert.ok(settlementRun.traceId, "Daily settlement run stores trace id");
    assert.ok(settlementRun.beforeSummary && settlementRun.afterSummary, "Settlement run stores before/after summaries");
    assert.ok(await page.locator(".sim-settlement-run-meta").innerText().then(text => text.includes("可提现前后")), "Settlement run renders before/after available balance");
    await page.click("[data-sim-run-settlement]");
    assert.equal(await page.evaluate(() => AFF.state.settlementRuns.length), 1, "Daily settlement is idempotent for a mock date");
    assert.ok(await page.locator(".sim-settlement-run-meta").isVisible(), "Settlement run details render");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.click("#simulation-toggle");
    assert.equal(await page.evaluate(() => AFF.simulation.state().settlementRuns.length), 1, "Settlement snapshot persists immediately after refresh");
    assert.ok(await page.evaluate(() => AFF.state.settlementRuns === AFF.simulation.state().settlementRuns), "Settlement projections share the canonical run collection after refresh");
    assert.ok(await page.locator(".sim-settlement-run-meta").isVisible(), "Saved settlement snapshot renders after refresh");

    await page.click("[data-sim-advance='7']");
    await page.waitForFunction(() => window.AFF?.simulation?.date() === "2026-11-03");
    await page.waitForSelector(".sim-drawer");
    assert.ok((await page.locator(".sim-summary").innerText()).includes("2026-10-27 → 2026-11-03"), "Time transition summary renders");

    await page.click("[data-sim-tab='scenario']");
    assert.equal(await page.locator(".sim-scenario-group").count(), 2, "Scenarios are grouped by business and page state");
    assert.ok((await page.locator(".sim-checkpoints").innerText()).includes("客户可进入客户数据和收益数据"), "Scenario checkpoints render");
    await page.click("[data-sim-scenario='api-error']");
    assert.ok((await page.locator("#main").innerText()).includes("SERVICE-503"), "Scenario selection immediately updates the page");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".sim-drawer");
    assert.equal(await page.evaluate(() => AFF.state.scenario), "api-error", "Scenario survives refresh");
    await page.click("[data-sim-tab='scenario']");
    await page.click("[data-sim-scenario='normal-flow']");

    await page.click("[data-sim-tab='record']");
    await page.fill("[data-sim-record='source']", "YouTube自然流");
    await page.click("[data-sim-record-form] button[type='submit']");
    await page.waitForFunction(() => window.AFF?.simulation?.state().records.length === 1);
    await page.waitForSelector(".sim-drawer");
    const record = await page.evaluate(() => {
      const row = AFF.reporting.rows.find(item => item.clientId === "SIM-C-10001");
      return {
        exists: Boolean(row),
        milestone: row?.milestoneStatus,
        caseCount: row?.commissionCases?.length || 0,
        source: row?.source,
        reporting: AFF.reporting.totals(AFF.reporting.rows)
      };
    });
    assert.equal(record.exists, true, "Synthetic client enters the shared reporting dataset");
    assert.ok(record.caseCount > 0, "Synthetic client generates commission cases");
    assert.equal(record.source, "YouTube自然流", "Synthetic source is preserved");

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
    assert.equal(parsedSnapshot.settlementRuns.length, 1, "Snapshot keeps settlement runs");
    const invalidSnapshots = [
      { ...parsedSnapshot, date: "2026-02-30" },
      { ...parsedSnapshot, records: [null] },
      { ...parsedSnapshot, records: [parsedSnapshot.records[0], parsedSnapshot.records[0]] },
      { ...parsedSnapshot, violations: [null] },
      { ...parsedSnapshot, logs: [null] },
      { ...parsedSnapshot, settlementRuns: [null] }
    ];
    for (const invalidSnapshot of invalidSnapshots) {
      assert.equal(await page.evaluate(value => AFF.simulation.inspectSnapshot(JSON.stringify(value)).valid, invalidSnapshot), false, "Malformed nested snapshot data is rejected before replay");
    }
    const cleanupResult = await page.evaluate(() => {
      const sim = AFF.simulation;
      const first = sim.state().records[0];
      const second = sim.state().records[1];
      sim.addViolation({ targetId: first.clientId, type: "false_traffic", occurredAt: sim.date() });
      sim.removeRecord(first.id);
      const record = sim.addRecord({ ...second, id: undefined, clientId: "SIM-C-20000" });
      const recordIds = sim.state().records.map(item => item.id);
      const violationIds = sim.state().violations.map(item => item.id);
      return {
        recordIds, violationIds,
        uniqueRecordIds: new Set(recordIds).size,
        uniqueViolationIds: new Set(violationIds).size,
        orphan: sim.state().violations.some(item => item.targetId === first.clientId),
        created: record.id
      };
    });
    assert.equal(cleanupResult.orphan, false, "Removing a record by its object ID also removes related violations");
    assert.equal(cleanupResult.uniqueRecordIds, cleanupResult.recordIds.length, "Deleting then adding a record cannot reuse an existing ID");
    assert.equal(cleanupResult.uniqueViolationIds, cleanupResult.violationIds.length, "Violation IDs stay unique");
    await page.evaluate(value => AFF.simulation.importSnapshot(value), snapshot);

    await page.evaluate(() => {
      AFF.simulation.reset();
      location.reload();
    });
    await page.waitForFunction(() => window.AFF?.simulation?.date() === "2026-10-27");
    assert.equal(await page.evaluate(() => AFF.simulation.state().records.length), 2, "Reset keeps synthetic records");
    assert.equal(await page.evaluate(() => AFF.simulation.state().violations.length), 1, "Reset keeps violations");
    assert.ok(await page.evaluate(() => AFF.state.settlementRuns === AFF.simulation.state().settlementRuns && AFF.state.settlementRuns.length === 0), "Reset clears both settlement projections");
    assert.equal(await page.evaluate(() => AFF.reporting.rows.some(row => row.clientId?.startsWith("SIM-"))), false, "Records later than the reset mock date stay dormant");
    assert.equal(await page.evaluate(() => AFF.finance.messages.some(item => item.simulationViolationId)), false, "Future violations do not create notifications before their mock date");
    assert.ok(await page.evaluate(() => AFF.simulation.inspectSnapshot(AFF.simulation.exportSnapshot()).valid), "A reset snapshot with preserved future objects remains importable");

    await page.evaluate(snapshot => {
      AFF.simulation.importSnapshot(snapshot);
      location.reload();
    }, snapshot);
    await page.waitForFunction(() => window.AFF?.simulation?.state().records.length === 2);
    assert.equal(await page.evaluate(() => AFF.simulation.date()), "2026-11-03", "Snapshot import restores mock date");
    assert.ok(await page.evaluate(() => AFF.state.settlementRuns === AFF.simulation.state().settlementRuns && AFF.state.settlementRuns.length === 1), "Import restores both settlement projections");

    await page.click("[data-sim-tab='data']");
    await page.fill("[data-sim-import]", "{bad json");
    await page.click("[data-sim-preview-snapshot]");
    assert.ok(await page.locator(".sim-snapshot-preview.is-invalid").isVisible(), "Invalid snapshot preview is shown");
    await page.fill("[data-sim-import]", snapshot);
    await page.click("[data-sim-preview-snapshot]");
    assert.ok(await page.locator(".sim-snapshot-preview.is-valid").isVisible(), "Valid snapshot preview is shown");
    await page.click("[data-sim-reset-mode='data']");
    await page.waitForFunction(() => window.AFF?.simulation?.state().records.length === 0 && AFF.simulation.state().violations.length === 0);
    assert.ok(await page.evaluate(() => AFF.simulation.state().logs.length > 1), "Clear simulation data retains operation history");
    await page.click("[data-sim-tab='data']");
    await page.click("[data-sim-reset-mode='all']");
    assert.ok(await page.evaluate(() => AFF.simulation.state().logs.length > 1), "First restore click requires confirmation and preserves data");
    await page.click("[data-sim-reset-mode='all']");
    await page.waitForFunction(() => window.AFF?.simulation?.date() === "2026-10-27" && AFF.simulation.state().records.length === 0 && AFF.simulation.state().violations.length === 0);
    await page.locator(".sim-drawer header [data-sim-close]").click();

    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.click("#simulation-toggle");
      await page.waitForSelector(".sim-drawer");
      for (const tab of ["time", "record", "violation", "credit", "scenario", "data", "log"]) {
        await page.click(`[data-sim-tab='${tab}']`);
        const overflow = await page.evaluate(() => ({
          page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          body: document.querySelector(".sim-body").scrollWidth - document.querySelector(".sim-body").clientWidth
        }));
        assert.ok(overflow.page <= 1 && overflow.body <= 1, `Simulation ${tab} has no overflow at ${width}px: ${JSON.stringify(overflow)}`);
      }
      await page.click("[data-sim-tab='scenario']");
      await page.screenshot({ path: `docs/user/screenshots/simulation-console-${width}.png` });
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
