"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
let chromium;
try {
  ({chromium} = require("playwright"));
} catch {
  ({chromium} = require(path.join(process.env.HOME, "Documents/Affiliate/.tmp-mock-site/node_modules/playwright")));
}

const root = path.resolve(__dirname, "..");
const artifactDir = path.join(root, ".artifacts/task-queue");
const mime = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml"};
const widths = [1600,1440,1280,1024,768,767,480,375];
const report = {generated_at:new Date().toISOString(), cases:[], screenshots:[], page_errors:[], coverage:[], limitations:[]};
let activePage;

async function sourceHashes() {
  const hashes = {};
  for (const file of ["admin-dev.js","admin-dev.css","admin-prototype-data.js"]) {
    hashes[file] = crypto.createHash("sha256").update(await fs.readFile(path.join(root,file))).digest("hex");
  }
  return hashes;
}

async function staticServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
      const file = path.resolve(root, `.${pathname === "/" ? "/admin-dev.html" : pathname}`);
      assert.ok(file.startsWith(`${root}${path.sep}`), "Forbidden");
      const content = await fs.readFile(file);
      response.writeHead(200, {"Content-Type":mime[path.extname(file)] || "application/octet-stream","Cache-Control":"no-store"});
      response.end(content);
    } catch (error) {
      response.writeHead(error.message === "Forbidden" ? 403 : 404);
      response.end(error.message);
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return server;
}

async function runCase(name, acceptance, fn) {
  const started = Date.now();
  try {
    await fn();
    report.cases.push({name, acceptance, status:"passed", duration_ms:Date.now() - started});
    console.log(`PASS ${name}`);
  } catch (error) {
    const ui = activePage ? await activePage.evaluate(() => ({hash:location.hash,role:document.querySelector("[data-role]")?.value,scenario:document.querySelector("[data-scenario]")?.value,dialogs:[...document.querySelectorAll('[role="dialog"]')].map(element=>element.innerText.slice(0,1500)),page:document.querySelector(".tm-content")?.innerText.slice(0,1000)})).catch(()=>null) : null;
    report.cases.push({name, acceptance, status:"failed", duration_ms:Date.now() - started, error:error.stack,ui});
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

async function main() {
  await fs.mkdir(artifactDir, {recursive:true});
  report.source_hashes = {before:await sourceHashes()};
  const server = await staticServer();
  const browser = await chromium.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
  const page = await browser.newPage({viewport:{width:1440,height:960}});
  activePage = page;
  page.setDefaultTimeout(6000);
  page.on("pageerror", error => report.page_errors.push(error.stack || error.message));
  page.on("console", message => {if (message.type() === "error") report.page_errors.push(message.text());});
  page.on("crash", () => report.page_errors.push("Page crashed"));
  const url = `http://127.0.0.1:${server.address().port}/admin-dev.html`;
  const action = name => page.locator(`[data-tq-action="${name}"]`).filter({visible:true}).first();
  const openTask = async id => {
    if (!await page.locator(`[data-tq-open="${id}"]:visible`).count()) {
      await page.locator('[data-tq-filter="q"]').fill(id);
      await action("query").click();
    }
    await page.locator(`[data-tq-open="${id}"]`).filter({visible:true}).first().click();
    await page.locator(".tq-drawer").waitFor();
    assert.equal(new URLSearchParams(new URL(page.url()).hash.split("?")[1]).get("task_id"), id);
  };
  const role = async value => {
    await page.selectOption("[data-role]", value);
    await page.waitForFunction(value => document.querySelector("[data-role]")?.value === value, value);
  };
  const fresh = async (value="risk", query="") => {
    await page.goto("about:blank");
    await page.goto(`${url}#/tasks${query}`, {waitUntil:"domcontentloaded"});
    await page.waitForFunction(() => typeof window.AFF_ADMIN_PROTOTYPE?.taskQueue?.list === "function");
    await role(value);
    await page.locator(".tq-page").waitFor();
    if (!query) await action("reset").click();
  };
  const scenario = async value => {
    if (!await page.locator(".dev-demo-panel section").isVisible()) await page.click("[data-toggle-demo]");
    await page.selectOption("[data-scenario]", value);
    await page.click("[data-toggle-demo]");
  };
  const approve = async (approvalId, approver) => {
    await role(approver);
    await page.locator(`[data-tq-action="approve"][data-tq-approval-id="${approvalId}"]`).click();
    await page.locator('[data-tq-dialog-field="reason"]').fill("已核对本申请全部证据、影响范围与处理方案，同意当前审批节点。");
    await page.locator('[data-tq-dialog-field="confirmed"]').check();
    await action("dialog_confirm").click();
    assert.equal(await page.locator(".tq-modal").count(), 0);
  };
  try {
    await fresh();
    await runCase("task route loads the dedicated queue", ["TQ-AC01"], async () => {
      assert.match(await page.locator("body").innerText(), /任务队列/);
      assert.equal(new URL(page.url()).hash.split("?")[0], "#/tasks");
      assert.equal(await page.locator('[data-tq-scope="mine"]').getAttribute("aria-pressed"), "true");
      assert.equal(await page.locator("[data-tq-page-size]").inputValue(), "20");
      assert.equal(new URLSearchParams(new URL(page.url()).hash.split("?")[1]).get("updated_from"), null);
      await fresh("audit");
      assert.equal(await page.locator('[data-tq-scope="authorized"]').getAttribute("aria-pressed"), "true");
    });
    await runCase("query is staged then chips remove applied filters", ["TQ-AC01","TQ-AC21"], async () => {
      await fresh();
      const before = await page.locator("[data-tq-row]").count();
      await page.locator('[data-tq-filter="q"]').fill("DEMO-TASK-002");
      assert.equal(await page.locator("[data-tq-row]").count(), before);
      assert.equal(new URLSearchParams(new URL(page.url()).hash.split("?")[1]).get("q"), null);
      await action("query").click();
      assert.equal(await page.locator("[data-tq-row]").count(), 1);
      assert.equal(await page.locator("[data-tq-row]").getAttribute("data-tq-row"), "DEMO-TASK-002");
      assert.equal(new URLSearchParams(new URL(page.url()).hash.split("?")[1]).get("q"), "DEMO-TASK-002");
      await page.click('[data-tq-remove-filter="q"]');
      assert.ok(await page.locator("[data-tq-row]").count() > 1);
      await page.locator('[data-tq-scope="claimable"]').click();
      assert.equal(await page.locator('[data-tq-scope="claimable"]').getAttribute("aria-pressed"), "true");
      await action("reset").click();
      assert.equal(await page.locator('[data-tq-scope="mine"]').getAttribute("aria-pressed"), "true");
    });
    await runCase("page size and URL state restore", ["TQ-AC21"], async () => {
      await fresh("system_admin");
      for (const size of ["10","20","50"]) {
        await page.selectOption("[data-tq-page-size]", size);
        assert.ok(await page.locator("[data-tq-row]").count() <= Number(size));
        assert.equal(new URLSearchParams(new URL(page.url()).hash.split("?")[1]).get("page_size"), size);
      }
      await page.selectOption("[data-tq-page-size]", "10");
      await action("next").click();
      assert.equal(new URLSearchParams(new URL(page.url()).hash.split("?")[1]).get("page"), "2");
      await page.reload();
      assert.equal(await page.locator("[data-tq-page-size]").inputValue(), "10");
      assert.equal(new URLSearchParams(new URL(page.url()).hash.split("?")[1]).get("page"), "2");
      await page.locator("[data-tq-page-jump]").fill("1");
      await action("jump").click();
      assert.equal(new URLSearchParams(new URL(page.url()).hash.split("?")[1]).get("page"), "1");
      await page.selectOption("[data-tq-page-size]", "20");
    });
    await runCase("claim dialog updates authoritative task owner", ["TQ-AC03","TQ-AC34"], async () => {
      await fresh();
      await page.locator('[data-tq-scope="claimable"]').click();
      await openTask("DEMO-TASK-001");
      await action("claim").click();
      assert.match(await page.locator(".tq-modal").innerText(), /原处理时限保持不变/);
      await action("dialog_confirm").click();
      assert.equal(await page.locator(".tq-modal").count(), 0);
      const task = await page.evaluate(() => window.AFF_ADMIN_PROTOTYPE.taskQueue.detail("DEMO-TASK-001",{role:"risk"}));
      assert.equal(task.workflow_state, "processing");
      assert.ok(task.owner?.user_id);
      await action("close_detail").click();
      await page.goto(`${url}#/admin-workbench`, {waitUntil:"domcontentloaded"});
      await page.locator("[data-dashboard-task]").first().waitFor();
      const dashboardId = await page.locator("[data-dashboard-task]").first().getAttribute("data-dashboard-task");
      const authoritative = await page.evaluate(id => window.AFF_ADMIN_PROTOTYPE.taskQueue.detail(id,{role:"risk"}), dashboardId);
      await page.locator("[data-dashboard-task]").first().click();
      await page.locator(".tq-drawer").waitFor();
      assert.equal(new URLSearchParams(new URL(page.url()).hash.split("?")[1]).get("task_id"), dashboardId);
      const reached = await page.evaluate(id => window.AFF_ADMIN_PROTOTYPE.taskQueue.detail(id,{role:"risk"}), dashboardId);
      assert.equal(reached.version, authoritative.version);
      assert.equal(reached.workflow_state, authoritative.workflow_state);
    });
    await runCase("risk workbench opens the same task and shared draft version", ["TQ-AC34"], async () => {
      await fresh();
      await page.goto(`${url}#/risk-workbench?tab=events`, {waitUntil:"domcontentloaded"});
      await page.locator('[data-risk-open="event"][data-risk-id="DEMO-E01"]').waitFor();
      const before = await page.evaluate(() => window.AFF_ADMIN_PROTOTYPE.taskQueue.detail("DEMO-T01",{role:"risk"}));
      await page.click('[data-risk-open="event"][data-risk-id="DEMO-E01"]');
      await page.locator('[data-risk-task="DEMO-T01"]').click();
      await page.locator(".tq-drawer").waitFor();
      assert.equal(new URLSearchParams(new URL(page.url()).hash.split("?")[1]).get("task_id"), "DEMO-T01");
      if (await action("claim").count() && await action("claim").isEnabled()) {
        await action("claim").click();
        await action("dialog_confirm").click();
      }
      await page.click('[data-tq-detail-tab="processing"]');
      await page.locator('[data-tq-form="reason"]').fill("跨风险工作台与任务队列核对同一任务的来源和证据版本。");
      await action("save_draft").click();
      const after = await page.evaluate(() => window.AFF_ADMIN_PROTOTYPE.taskQueue.detail("DEMO-T01",{role:"risk"}));
      assert.equal(after.task_purpose, before.task_purpose);
      assert.notEqual(after.version, before.version);
      assert.equal(after.draft.reason, "跨风险工作台与任务队列核对同一任务的来源和证据版本。");
      await action("close_detail").click();
      await page.goto(`${url}#/risk-workbench?tab=events`, {waitUntil:"domcontentloaded"});
      await page.locator('[data-risk-open="event"][data-risk-id="DEMO-E01"]').waitFor();
      if (!await page.locator('[data-risk-task="DEMO-T01"]').isVisible()) await page.click('[data-risk-open="event"][data-risk-id="DEMO-E01"]');
      await page.locator('[data-risk-task="DEMO-T01"]').click();
      await page.locator(".tq-drawer").waitFor();
      await page.click('[data-tq-detail-tab="processing"]');
      assert.equal(await page.locator('[data-tq-form="reason"]').inputValue(), after.draft.reason);
    });
    await runCase("batch claim reports two successes and one precise conflict", ["TQ-AC20"], async () => {
      await fresh();
      await scenario("batch_partial");
      await page.locator('[data-tq-scope="claimable"]').click();
      await page.selectOption("[data-tq-page-size]", "50");
      for (const id of ["DEMO-TASK-001","DEMO-TASK-024","DEMO-TASK-027"]) await page.locator(`[data-tq-select="${id}"]`).check();
      await action("batch_claim").click();
      await action("dialog_confirm").click();
      assert.match(await page.locator(".tq-modal-body").innerText(), /成功2项，失败1项/);
      const items = await page.locator(".tq-batch-results li").allTextContents();
      assert.equal(items.length, 3);
      assert.ok(items.some(text => text.includes("DEMO-TASK-024") && text.includes("并发冲突")));
      const states = await page.evaluate(() => ["DEMO-TASK-001","DEMO-TASK-024","DEMO-TASK-027"].map(id => window.AFF_ADMIN_PROTOTYPE.taskQueue.detail(id,{role:"risk"}).workflow_state));
      assert.deepEqual(states, ["processing","open","processing"]);
      await action("dialog_cancel").click();
      await scenario("normal");
      await page.selectOption("[data-tq-page-size]", "20");
    });
    await runCase("four detail tabs and URL task restoration", ["TQ-AC02","TQ-AC34"], async () => {
      await fresh("system_admin","?task_id=DEMO-TASK-002");
      assert.equal(await page.locator("[data-tq-detail-tab]").count(), 4);
      for (const name of ["overview","processing","approvals","activity"]) {
        await page.locator(`[data-tq-detail-tab="${name}"]`).click();
        assert.equal(await page.locator(`[data-tq-detail-tab="${name}"]`).getAttribute("aria-selected"), "true");
        assert.ok((await page.locator("#tq-detail-panel").innerText()).length > 0);
      }
      await page.reload();
      assert.equal(await page.locator(".tq-drawer").count(), 1);
      assert.match(await page.locator(".tq-drawer-head").innerText(), /DEMO-TASK-002/);
    });
    await runCase("dirty editor keeps, discards, and saves changes", ["TQ-AC06"], async () => {
      await fresh();
      await openTask("DEMO-TASK-002");
      await page.click('[data-tq-detail-tab="processing"]');
      await page.locator('[data-tq-form="reason"]').fill("已核验案件证据和资金范围，准备提交重新检查。");
      await action("close_detail").click();
      assert.equal(await action("unsaved_keep").count(), 1);
      assert.equal(await action("unsaved_discard").count(), 1);
      assert.equal(await action("unsaved_save").count(), 1);
      await action("unsaved_keep").click();
      assert.equal(await page.locator('[data-tq-form="reason"]').inputValue(), "已核验案件证据和资金范围，准备提交重新检查。");
      await action("close_detail").click();
      await action("unsaved_discard").click();
      assert.equal(await page.locator(".tq-drawer").count(), 0);
      await openTask("DEMO-TASK-002");
      await page.click('[data-tq-detail-tab="processing"]');
      await page.locator('[data-tq-form="reason"]').fill("重新核验完整案件及资金证据后保存这次处理草稿。");
      await action("close_detail").click();
      await action("unsaved_save").click();
      assert.equal(await page.locator(".tq-drawer").count(), 0);
      const task = await page.evaluate(() => window.AFF_ADMIN_PROTOTYPE.taskQueue.detail("DEMO-TASK-002",{role:"risk"}));
      assert.equal(task.draft.reason, "重新核验完整案件及资金证据后保存这次处理草稿。");
      await openTask("DEMO-TASK-002");
      await page.click('[data-tq-detail-tab="processing"]');
      await page.locator('[data-tq-form="reason"]').fill("浏览器返回时必须保留这段尚未保存的案件处理说明。");
      await page.goBack();
      await page.locator('.tq-modal [data-tq-action="unsaved_keep"]').first().waitFor();
      await action("unsaved_keep").click();
      assert.equal(new URLSearchParams(new URL(page.url()).hash.split("?")[1]).get("task_id"), "DEMO-TASK-002");
      assert.equal(await page.locator('[data-tq-form="reason"]').inputValue(), "浏览器返回时必须保留这段尚未保存的案件处理说明。");
      await action("close_detail").click();
      await action("unsaved_discard").click();
    });
    await runCase("applicant sees a read-only approval chain", ["TQ-AC09"], async () => {
      await fresh();
      await openTask("DEMO-TASK-004");
      await page.click('[data-tq-detail-tab="approvals"]');
      assert.equal(await page.locator('.tq-drawer [data-tq-action="approve"],.tq-drawer [data-tq-action="reject"]').count(), 0);
      await action("approval_link").click();
      await page.locator(".tq-approval-list").waitFor();
      assert.match(page.url(), /workbench\?tab=approvals/);
      assert.match(await page.locator(".tq-page").innerText(), /申请人不可审批本人事项/);
      assert.equal(await page.locator('[data-tq-action="approve"]').count(), 0);
    });
    await runCase("saved case preview submits and all serial nodes gate execution", ["TQ-AC08","TQ-AC35"], async () => {
      await fresh();
      await openTask("DEMO-TASK-002");
      await page.click('[data-tq-detail-tab="processing"]');
      await page.locator('[data-tq-form="conclusion"]').selectOption("change_request");
      await page.locator('[data-tq-form="reason"]').fill("已按案件三元组核对原信号及申诉门禁，仅重检此案件的限制。");
      await page.locator("[data-tq-evidence]").first().check();
      await page.locator('[data-tq-checklist="source_verified"]').check();
      await action("save_draft").click();
      assert.match(await page.locator(".tq-notice").innerText(), /草稿已保存/);
      await action("preview").click();
      assert.equal(await page.locator(".tq-preview").count(), 1);
      await action("submit_review").click();
      await page.locator('[data-tq-dialog-field="confirmed"]').check();
      await action("dialog_confirm").click();
      assert.equal(await page.locator(".tq-modal").count(), 0);
      let task = await page.evaluate(() => window.AFF_ADMIN_PROTOTYPE.taskQueue.detail("DEMO-TASK-002",{role:"risk"}));
      assert.equal(task.workflow_state, "pending_approval");
      const approvalId = task.approval_refs.at(-1).approval_id;
      assert.equal(task.execution_refs.length, 0);
      await page.click('[data-tq-detail-tab="approvals"]');
      await page.locator(`[data-tq-action="approval_link"][data-tq-approval-id="${approvalId}"]`).click();
      await page.locator(".tq-approval-list").waitFor();
      for (const approver of ["risk_supervisor","finance"]) {
        await role(approver);
        await page.locator(`[data-tq-action="approve"][data-tq-approval-id="${approvalId}"]`).click();
        await page.locator('[data-tq-dialog-field="reason"]').fill("已核对该案件的证据、限制范围与处理方案，同意当前审批节点。");
        await page.locator('[data-tq-dialog-field="confirmed"]').check();
        await action("dialog_confirm").click();
        assert.equal(await page.locator(".tq-modal").count(), 0);
        task = await page.evaluate(() => window.AFF_ADMIN_PROTOTYPE.taskQueue.detail("DEMO-TASK-002",{role:"system_admin"}));
        assert.equal(task.workflow_state, approver === "finance" ? "pending_execution" : "pending_approval");
        assert.equal(task.execution_refs.length, approver === "finance" ? 1 : 0);
      }
      assert.equal(task.funds_status, "frozen", "approval queues execution; it must not release funds in the browser");
    });
    await runCase("unknown payment exposes status check without retry", ["TQ-AC14","TQ-AC33"], async () => {
      await fresh("system_admin","?task_id=DEMO-TASK-006");
      await page.click('[data-tq-detail-tab="processing"]');
      assert.equal(await action("status_check").isEnabled(), true);
      const retry = page.locator('[data-tq-action="retry_integration"]');
      assert.ok(await retry.count() === 0 || await retry.isDisabled());
      assert.match(await page.locator(".tq-drawer-body").innerText(), /作业版本/);
      await action("status_check").click();
      await page.locator('[data-tq-dialog-field="reason"]').fill("核对原支付单据的外部状态，避免重复写入支付。");
      await action("dialog_confirm").click();
      assert.equal(await page.locator(".tq-modal").count(), 0);
    });
    await runCase("finance applicant needs a different finance approver", ["TQ-AC09","TQ-AC12","TQ-AC35"], async () => {
      await fresh("finance","?task_id=DEMO-TASK-005");
      await page.click('[data-tq-detail-tab="processing"]');
      await page.locator('[data-tq-form="conclusion"]').selectOption("change_request");
      await page.locator('[data-tq-form="proposed_amount"]').fill("80.01");
      await page.locator('[data-tq-form="reason"]').fill("核对损失与可用保证金余额后，申请在授权范围内抵扣。");
      await action("save_draft").click();
      assert.match(await page.locator(".tq-notice").innerText(), /超过当前可用余额/);
      await page.locator('[data-tq-form="proposed_amount"]').fill("80.00");
      await page.locator("[data-tq-evidence]").first().check();
      await page.locator('[data-tq-checklist="source_verified"]').check();
      await action("save_draft").click();
      await action("preview").click();
      assert.equal(await page.locator(".tq-preview").count(), 1);
      await action("submit_review").click();
      await page.locator('[data-tq-dialog-field="confirmed"]').check();
      await action("dialog_confirm").click();
      const submitted = await page.evaluate(() => window.AFF_ADMIN_PROTOTYPE.taskQueue.detail("DEMO-TASK-005",{role:"finance"}));
      const approvalId = submitted.approval_refs.at(-1).approval_id;
      await page.click('[data-tq-detail-tab="approvals"]');
      await page.locator(`[data-tq-action="approval_link"][data-tq-approval-id="${approvalId}"]`).click();
      await page.locator(".tq-approval-list").waitFor();
      await approve(approvalId,"risk_supervisor");
      await role("finance");
      assert.equal(await page.locator(`[data-tq-action="approve"][data-tq-approval-id="${approvalId}"]`).count(), 0);
      await approve(approvalId,"finance_reviewer");
      const completed = await page.evaluate(() => window.AFF_ADMIN_PROTOTYPE.taskQueue.detail("DEMO-TASK-005",{role:"system_admin"}));
      assert.equal(completed.workflow_state, "pending_execution");
      assert.equal(completed.execution_refs.length, 1);
    });
    await runCase("hold extension creates a separate case-bound settlement recheck", ["TQ-AC35"], async () => {
      await fresh("risk","?task_id=DEMO-TASK-004");
      const before = await page.evaluate(() => window.AFF_ADMIN_PROTOTYPE.taskQueue.detail("DEMO-TASK-004",{role:"risk"}));
      await page.click('[data-tq-detail-tab="processing"]');
      await action("source").click();
      await page.locator(".tq-modal").waitFor();
      await page.locator('[data-tq-dialog-field="reason"]').fill("从延长复核来源案件发起独立解除重检，保留原延长申请及审批记录。");
      await action("dialog_confirm").click();
      const nextId = new URLSearchParams(new URL(page.url()).hash.split("?")[1]).get("task_id");
      assert.ok(nextId && nextId !== "DEMO-TASK-004");
      const after = await page.evaluate(id => ({
        original:window.AFF_ADMIN_PROTOTYPE.taskQueue.detail("DEMO-TASK-004",{role:"risk"}),
        recheck:window.AFF_ADMIN_PROTOTYPE.taskQueue.detail(id,{role:"risk"})
      }), nextId);
      assert.equal(after.original.task_purpose, "hold_extend");
      assert.equal(after.original.workflow_state, before.workflow_state);
      assert.equal(after.original.funds_status, before.funds_status);
      assert.equal(after.recheck.task_purpose, "settlement_recheck");
      assert.equal(after.recheck.source_ref.kind, "settlement_case");
      assert.deepEqual(after.recheck.source_ref.case_ref, after.recheck.fields.case_ref);
      assert.ok(after.recheck.fields.release_targets.length > 0);
    });
    await runCase("offboarding task opens its partner and exact offboarding tab", ["TQ-AC34"], async () => {
      await fresh("operations","?task_id=DEMO-TASK-020");
      await page.click('[data-tq-detail-tab="processing"]');
      await action("source").click();
      await page.waitForURL(/#\/admin-modules\/partner-list\/partner-1003\?/);
      const params = new URLSearchParams(new URL(page.url()).hash.split("?")[1]);
      assert.equal(params.get("drawer_tab"), "offboarding");
      assert.equal(params.get("offboarding_id"), "DEMO-OFFBOARD1");
      await page.locator('[data-partner360-tab="offboarding"]').waitFor();
      assert.equal(await page.locator('[data-partner360-tab="offboarding"]').getAttribute("aria-selected"), "true");
    });
    await runCase("sensitive export is approved then downloaded from existing export center", ["TQ-AC22"], async () => {
      await fresh();
      await page.locator('[data-tq-filter="q"]').fill("DEMO-TASK-002");
      await action("query").click();
      await action("export").click();
      await page.locator('[data-tq-dialog-field="reason"]').fill("评审当前案件的任务处理进度与金额范围，按已应用筛选申请脱敏导出。");
      await action("dialog_confirm").click();
      const exported = await page.evaluate(() => window.AFF_ADMIN_PROTOTYPE.taskQueue.peek().exports.at(-1));
      assert.equal(exported.row_count, 1);
      assert.equal(exported.status, "pending_approval");
      await action("exports_link").click();
      await page.locator(`[data-task-export-approval="${exported.approval_id}"]`).click();
      await page.locator(".tq-approval-list").waitFor();
      assert.match(await page.locator(".tq-approval-list").innerText(), /DEMO-TASK-002/);
      await approve(exported.approval_id,"compliance");
      await role("risk");
      await page.goto(`${url}#/admin-performance?tab=roi`, {waitUntil:"domcontentloaded"});
      await page.locator("[data-open-report-export]").click();
      const ready = page.locator(`[data-tq-action="download_export"][data-tq-export-id="${exported.export_id}"]`);
      assert.equal(await ready.isEnabled(), true);
      const downloadPromise = page.waitForEvent("download");
      await ready.click();
      const download = await downloadPromise;
      assert.match(download.suggestedFilename(), /^tasks_\d{8}_\d{6}_.*\.csv$/);
      const file = path.join(artifactDir,"approved-task-export.csv");
      await download.saveAs(file);
      const bytes = await fs.readFile(file);
      assert.equal(bytes.subarray(0,3).toString("hex"), "efbbbf");
      assert.notEqual(bytes.subarray(3,6).toString("hex"), "efbbbf");
      const csv = bytes.toString("utf8");
      assert.ok(csv.includes("DEMO-TASK-002"));
      assert.ok(!csv.includes("DEMO-TASK-003"));
      assert.ok(!csv.includes("@") && !csv.includes("EVIDENCE1"), "export excludes email and evidence bodies");
    });
    await runCase("column preferences and three-state sorting", ["TQ-AC21"], async () => {
      await fresh("system_admin");
      await action("columns").click();
      await page.locator('[data-tq-column="team"]').uncheck();
      assert.equal(await page.locator("th.tq-col-team").count(), 0);
      await action("columns_reset").click();
      assert.equal(await page.locator("th.tq-col-team").count(), 1);
      await action("columns").click();
      for (const direction of ["asc","desc",null]) {
        await page.locator('[data-tq-sort="updated_at"]').click();
        const params = new URLSearchParams(new URL(page.url()).hash.split("?")[1]);
        assert.equal(params.get("direction"), direction);
      }
    });
    await runCase("detail keyboard focus stays inside and Escape restores entry", ["TQ-AC25"], async () => {
      await fresh("system_admin");
      await openTask("DEMO-TASK-002");
      await page.locator('.tq-drawer [data-tq-action="close_detail"]').focus();
      await page.keyboard.press("Shift+Tab");
      assert.equal(await page.evaluate(() => document.querySelector(".tq-drawer").contains(document.activeElement)), true);
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.querySelector(".tq-drawer").contains(document.activeElement)), true);
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".tq-drawer").count(), 0);
      await page.waitForFunction(() => document.activeElement?.getAttribute("data-tq-open") === "DEMO-TASK-002");
    });
    await runCase("audit role and revoked editor have no writable form", ["TQ-AC23"], async () => {
      await fresh();
      await openTask("DEMO-TASK-002");
      await page.click('[data-tq-detail-tab="processing"]');
      await page.locator('[data-tq-form="reason"]').fill("这是一段尚未提交的敏感处理草稿。");
      await role("audit");
      assert.equal(await page.locator(".tq-unsaved").count(), 0);
      const inputs = page.locator(".tq-drawer [data-tq-form]:not([disabled])");
      assert.equal(await inputs.count(), 0);
      assert.equal(await page.locator('.tq-drawer [data-tq-action="save_draft"]').count(), 0);
    });
    await runCase("legacy routes resolve to the canonical task queue", ["TQ-AC02"], async () => {
      for (const hash of ["#/workbench?tab=tasks&task_id=DEMO-TASK-002","#/admin-workbench/tasks/full?task_id=DEMO-TASK-002"]) {
        await fresh("system_admin");
        await page.goto(`${url}${hash}`, {waitUntil:"domcontentloaded"});
        await page.locator(".tq-page").waitFor();
        assert.equal(new URL(page.url()).hash.split("?")[0], "#/tasks");
        await page.locator(".tq-drawer").waitFor();
        assert.equal(await page.locator(".tq-drawer").count(), 1, `legacy task detail restored: ${page.url()}`);
      }
    });
    await runCase("loading empty error and forbidden are distinct", ["TQ-AC18","TQ-AC30"], async () => {
      await fresh("system_admin");
      await scenario("loading");
      assert.ok(await page.locator(".tq-loading-row").count() > 0);
      await scenario("empty");
      assert.ok(await page.locator(".tq-empty").count() > 0);
      await scenario("error");
      assert.ok(await page.locator(".tq-error").count() > 0);
      await scenario("forbidden");
      assert.ok(await page.locator(".tq-error").count() > 0);
      assert.equal(await page.locator(".tq-table").count(), 0);
      await scenario("normal");
    });

    for (const width of widths) {
      await runCase(`responsive queue and detail at ${width}px`, ["TQ-AC24"], async () => {
        await page.setViewportSize({width,height:960});
        await page.goto(`${url}#/tasks`, {waitUntil:"domcontentloaded"});
        await page.locator(".tq-table").waitFor({state:"attached"});
        await page.screenshot({path:path.join(artifactDir, `list-${width}.png`),fullPage:true});
        report.screenshots.push(`list-${width}.png`);
        const overflow = await page.evaluate(() => ({viewport:innerWidth,document:document.documentElement.scrollWidth,outside:[...document.querySelectorAll("body *")].filter(element=>{const r=element.getBoundingClientRect();return r.width>0&&r.right>innerWidth+1&&getComputedStyle(element).position!=="absolute"&&!element.closest(".tq-table-scroll");}).slice(0,12).map(element=>({tag:element.tagName,class:element.className,right:element.getBoundingClientRect().right}))}));
        assert.ok(overflow.document <= overflow.viewport + 1, `document overflow: ${JSON.stringify(overflow)}`);
        if (width >= 768 && width < 1280) {
          const menuIcon = page.locator('[data-menu-item="nav-tasks"] .dev-menu-icon');
          assert.equal(await menuIcon.isVisible(), true, "collapsed task menu keeps its identifying icon");
          const iconBounds = await menuIcon.boundingBox();
          assert.ok(iconBounds.width >= 14 && iconBounds.height >= 14);
        }
        if (width < 768) {
          const mobile = await page.evaluate(() => ({
            metrics:getComputedStyle(document.querySelector(".tq-metrics")).gridTemplateColumns.split(" ").length,
            filters:getComputedStyle(document.querySelector(".tq-quick-filter")).gridTemplateColumns.split(" ").length,
            exportVisible:[...document.querySelectorAll('[data-tq-action="export"]')].some(button=>button.getBoundingClientRect().width>0)
          }));
          assert.equal(mobile.metrics, width < 480 ? 1 : 2, "metric columns match the responsive contract");
          assert.equal(mobile.filters, 1, "mobile filters use one column");
          if (width < 480) assert.equal(mobile.exportVisible, false, "mobile summary hides export");
        }
        await page.goto(`${url}#/tasks?task_id=DEMO-TASK-002`, {waitUntil:"domcontentloaded"});
        await role("risk");
        await page.locator(".tq-drawer").waitFor();
        await page.click('[data-tq-detail-tab="processing"]');
        const dimensions = await page.evaluate(() => {
          const drawer = document.querySelector(".tq-drawer").getBoundingClientRect();
          const body = document.querySelector(".tq-drawer-body").getBoundingClientRect();
          const footer = document.querySelector(".tq-drawer-footer").getBoundingClientRect();
          return {drawer:drawer.width, viewport:innerWidth,document:document.documentElement.scrollWidth,bodyBottom:body.bottom,footerTop:footer.top};
        });
        assert.ok(Math.abs(dimensions.drawer - Math.min(720,width)) <= 1, `drawer width: ${JSON.stringify(dimensions)}`);
        assert.ok(dimensions.document <= width + 1, `drawer overflow: ${JSON.stringify(dimensions)}`);
        assert.ok(dimensions.bodyBottom <= dimensions.footerTop + 1, `footer overlays body: ${JSON.stringify(dimensions)}`);
        if (width < 768) {
          const targets = await page.evaluate(() => [...document.querySelectorAll(".tq-drawer-footer button:not([disabled])")].map(button => ({action:button.dataset.tqAction,height:button.getBoundingClientRect().height})));
          assert.ok(targets.every(target => target.height >= 44), `mobile touch target minimum: ${JSON.stringify(targets)}`);
        }
        if (width < 480) {
          assert.equal(await page.locator(".tq-drawer-footer > div:last-child").evaluate(element => getComputedStyle(element).flexDirection), "column");
        }
        await page.locator(".tq-drawer-footer button:not([disabled])").last().scrollIntoViewIfNeeded();
        const footerObstructions = await page.evaluate(() => [...document.querySelectorAll(".tq-drawer-footer button:not([disabled])")].filter(button => {
          const rect = button.getBoundingClientRect();
          const footer = button.closest(".tq-drawer-footer").getBoundingClientRect();
          if (rect.y+rect.height/2 < footer.top || rect.y+rect.height/2 > footer.bottom) return false;
          const covering = document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
          return rect.bottom > innerHeight+1 || !covering || !button.contains(covering);
        }).map(button => button.getAttribute("data-tq-action")));
        assert.deepEqual(footerObstructions, [], "enabled drawer footer actions must be visible and unobstructed");
        await page.screenshot({path:path.join(artifactDir, `detail-${width}.png`),fullPage:false});
        report.screenshots.push(`detail-${width}.png`);
      });
    }
    await runCase("no uncaught browser or console errors", [], async () => {
      assert.deepEqual(report.page_errors, []);
      report.source_hashes.after = await sourceHashes();
      assert.deepEqual(report.source_hashes.after, report.source_hashes.before, "UI and domain sources remain unchanged throughout verification");
    });
  } catch (error) {
    report.cases.push({name:"browser initialization and execution",acceptance:[],status:"failed",error:error.stack});
    console.error(error);
  } finally {
    report.summary = {passed:report.cases.filter(item => item.status === "passed").length,failed:report.cases.filter(item => item.status === "failed").length};
    report.coverage = Array.from({length:35}, (_,index) => {
      const id = `TQ-AC${String(index+1).padStart(2,"0")}`;
      const evidence = report.cases.filter(item => item.acceptance.includes(id));
      return {id,browser_status:evidence.length ? evidence.every(item => item.status === "passed") ? "covered_in_part" : "failed" : "not_exercised",cases:evidence.map(item => item.name)};
    });
    report.limitations = [
      "Acceptance IDs label the browser behavior exercised; covered_in_part does not certify every API, concurrency, external-system, or domain-event requirement in that acceptance row.",
      "The browser uses an in-memory Mock adapter. Real backend authorization, concurrent independent clients, actual payment calls, callbacks, outbox, and persistence are outside this script.",
      "Batch partial failure proves per-item success and exact conflict details; retrying only failed selections is not yet covered.",
      "Keyboard coverage proves drawer focus containment, Escape, and return focus. Screen-reader speech, full keyboard workflow, English labels, and long English text require separate checks.",
      "Eight widths verify page bounds, drawer width, body/footer separation and footer hit targets. Screenshot inspection does not certify every text pair against overlap.",
      "CSV formula-neutralization edge cases, response-loss receipt recovery, stale-version edits, automatic refresh preservation, and all remaining specialized processing forms are not exercised by this browser suite; consult the independent domain suite and manual acceptance matrix."
    ];
    await fs.writeFile(path.join(artifactDir, "browser-report.json"), `${JSON.stringify(report, null, 2)}\n`);
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  if (report.summary.failed) process.exitCode = 1;
  console.log(JSON.stringify(report.summary));
}

main().catch(error => {console.error(error);process.exitCode = 1;});
