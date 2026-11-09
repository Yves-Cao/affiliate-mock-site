"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sandbox = {window:{}, console, Date, JSON, BigInt, URLSearchParams};
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "../admin-prototype-data.js"), "utf8"),
  sandbox,
);

const prototype = sandbox.window.AFF_ADMIN_PROTOTYPE;
const queue = prototype.taskQueue;
const risk = prototype.riskWorkbench;
let sequence = 0;

function request(prefix) {
  sequence += 1;
  return {
    request_id: `RWB-DYNAMIC-${prefix}-${sequence}`,
    idempotency_key: `RWB-DYNAMIC-${prefix}-${sequence}`,
  };
}

function writeTask(action, taskId, extra, role = "risk", context = {}) {
  const detail = queue.detail(taskId, {role});
  return queue.write(
    action,
    taskId,
    {...request(action), expected_version: detail.version, ...extra},
    {role, ...context},
  );
}

function approve(approvalId, role, reason) {
  const approval = queue.approvals({role}).find(item => item.approval_id === approvalId);
  assert.ok(approval, `${role} can read the approval`);
  const node = approval.nodes[approval.current_node_index];
  return queue.write(
    "approve",
    approvalId,
    {
      ...request("approve"),
      expected_version: approval.version,
      node_id: node.node_id,
      expected_node_version: node.version,
      reason,
      preview_id: approval.preview?.preview_id,
      preview_hash: approval.preview?.preview_hash,
      impact_confirmation: true,
      self_review: false,
    },
    {role, source_entry: "approval_queue"},
  );
}

function submitSignalReview(taskId, conclusion) {
  let task = queue.detail(taskId, {role: "risk"});
  writeTask("claim", taskId, {});
  task = queue.detail(taskId, {role: "risk"});
  writeTask("save_draft", taskId, {
    expected_draft_version: task.draft_version,
    form_values: {conclusion},
    reason_code: "manual_review",
    reason: "已核验风险信号来源与当前结算案件范围",
    evidence_ids: [`${taskId}-EVIDENCE1`],
    checklist: [{key: "source_verified", checked: true}],
  });
  task = queue.detail(taskId, {role: "risk"});
  const preview = writeTask("preview", taskId, {
    draft_version: task.draft_version,
  }).preview;
  const submitted = writeTask("submit_review", taskId, {
    draft_version: task.draft_version,
    preview_id: preview.preview_id,
    preview_hash: preview.preview_hash,
    self_review: false,
    impact_confirmation: true,
  });
  return submitted;
}

function completeSignalReview(taskId, conclusion) {
  const submitted = submitSignalReview(taskId, conclusion);
  approve(submitted.approval_id, "risk_supervisor", "已独立核验信号结论与逐案冻结范围");
  const second = approve(submitted.approval_id, "finance", "已独立核验资金状态与结算案件范围");
  const task = queue.detail(taskId, {role: "risk"});
  const execution = task.execution_refs.at(-1);
  assert.ok(execution?.execution_id, `${taskId} creates a domain execution after approval`);
  return writeTask(
    "coordinator_complete",
    taskId,
    {
      approval_id: second.approval.approval_id,
      execution_id: execution.execution_id,
      domain_receipt_ref: `DEMO-DOMAIN-RECEIPT-${taskId}`,
    },
    "risk",
    {actor_type: "domain_coordinator"},
  );
}

queue.reset();

queue.fixtures.setApprovalChain(["risk_supervisor", "compliance", "finance"]);
const rejectedApproval = submitSignalReview("DEMO-T01", "signal_reject");
approve(rejectedApproval.approval_id, "risk_supervisor", "已独立核验信号来源与逐案范围");
const pendingCompliance = queue.approvals({role: "compliance"}).find(item => item.approval_id === rejectedApproval.approval_id);
assert.equal(pendingCompliance.nodes[1].status, "pending");
const rejectedNode = pendingCompliance.nodes[pendingCompliance.current_node_index];
const rejectedResult = queue.write(
  "reject",
  rejectedApproval.approval_id,
  {
    ...request("reject"),
    expected_version: pendingCompliance.version,
    node_id: rejectedNode.node_id,
    expected_node_version: rejectedNode.version,
    reason: "合规复核发现材料仍需补充，当前申请退回",
    self_review: false,
  },
  {role: "compliance", source_entry: "approval_queue"},
);
assert.equal(rejectedResult.approval.status, "rejected", "中间合规节点可驳回整条审批链");
assert.equal(rejectedResult.approval.nodes[2].status, "cancelled", "中间驳回取消后续财务节点");
assert.equal(queue.detail("DEMO-T01", {role: "risk"}).execution_refs.length, 0, "中间驳回不创建执行");

queue.reset();
queue.fixtures.setActorUserId("risk_supervisor", "DEMO-RISK-01");
const sameUserApproval = submitSignalReview("DEMO-T01", "signal_reject");
const sameUser = queue.approvals({role: "risk_supervisor"}).find(item => item.approval_id === sameUserApproval.approval_id);
assert.throws(
  () => queue.write(
    "approve",
    sameUserApproval.approval_id,
    {
      ...request("same-user"),
      expected_version: sameUser.version,
      node_id: sameUser.nodes[0].node_id,
      expected_node_version: sameUser.nodes[0].version,
      reason: "申请人与审批人使用同一用户编号，不允许自审",
      self_review: false,
    },
    {role: "risk_supervisor", source_entry: "approval_queue"},
  ),
  error => error.code === "AFF-40301",
  "same user id across roles is still blocked from self-approval",
);
assert.throws(
  () => queue.write(
    "approve",
    sameUserApproval.approval_id,
    {
      ...request("spoof-actor"),
      actor_id: "DEMO-RISK-LEAD",
      expected_version: sameUser.version,
      node_id: sameUser.nodes[0].node_id,
      expected_node_version: sameUser.nodes[0].version,
      reason: "浏览器传入的actor_id不能替换真实登录身份",
      self_review: false,
    },
    {role: "risk_supervisor", source_entry: "approval_queue"},
  ),
  error => error.code === "AFF-40301",
  "client actor_id cannot spoof the reviewer identity",
);

queue.reset();
const pendingGate = submitSignalReview("DEMO-T01", "signal_reject");
const pendingTask = queue.detail("DEMO-T01", {role: "risk"});
const pendingSnapshot = {
  version: pendingTask.version,
  draft_version: pendingTask.draft_version,
  draft: pendingTask.draft,
  approval_refs: pendingTask.approval_refs,
  execution_refs: pendingTask.execution_refs,
};
assert.throws(
  () => queue.write(
    "save_draft",
    "DEMO-T01",
    {...request("pending-draft"), expected_version: pendingTask.version, expected_draft_version: pendingTask.draft_version, form_values: {conclusion: "signal_confirm"}},
    {role: "risk"},
  ),
  error => error.code === "AFF-40301",
  "pending approval locks draft edits",
);
assert.deepEqual(
  {
    version: queue.detail("DEMO-T01", {role: "risk"}).version,
    draft_version: queue.detail("DEMO-T01", {role: "risk"}).draft_version,
    draft: queue.detail("DEMO-T01", {role: "risk"}).draft,
    approval_refs: queue.detail("DEMO-T01", {role: "risk"}).approval_refs,
    execution_refs: queue.detail("DEMO-T01", {role: "risk"}).execution_refs,
  },
  pendingSnapshot,
  "rejected draft edit leaves task state unchanged",
);
assert.throws(
  () => queue.write("preview", "DEMO-T01", {...request("pending-preview"), expected_version: pendingTask.version, draft_version: pendingTask.draft_version}, {role: "risk"}),
  error => error.code === "AFF-40301",
  "pending approval locks new previews",
);
assert.deepEqual(
  queue.detail("DEMO-T01", {role: "risk"}).version,
  pendingSnapshot.version,
  "rejected preview leaves task version unchanged",
);
const pendingApproval = queue.approvals({role: "risk"}).find(item => item.approval_id === pendingGate.approval_id);
assert.throws(
  () => queue.write("submit_review", "DEMO-T01", {...request("pending-submit"), expected_version: pendingTask.version, draft_version: pendingTask.draft_version, preview_id: pendingApproval.preview.preview_id, preview_hash: pendingApproval.preview.preview_hash, self_review: false, impact_confirmation: true}, {role: "risk"}),
  error => error.code === "AFF-40301",
  "pending approval locks duplicate submissions even with a valid preview",
);
assert.deepEqual(
  queue.detail("DEMO-T01", {role: "risk"}).approval_refs,
  pendingSnapshot.approval_refs,
  "rejected submit leaves approval history unchanged",
);

queue.reset();

const initialCases = new Map(risk.caseLinks.map(item => [item.settlement, {...item}]));
completeSignalReview("DEMO-T01", "signal_reject");

const e01 = risk.events.find(item => item.id === "DEMO-E01");
assert.equal(e01.signal, "rejected", "T01 domain execution updates the authoritative E01 signal");
assert.ok(e01.rejected_effective_at, "T01 records when the rejection became effective");
assert.ok(e01.appeal_window_ends_at > e01.rejected_effective_at, "T01 opens an appeal window after rejection");
const t01AfterReject = queue.detail("DEMO-T01", {role: "risk"});
assert.equal(t01AfterReject.fields.signal_status, "rejected");
assert.equal(t01AfterReject.fields.appeal_eligibility.visible, true);
assert.equal(t01AfterReject.fields.appeal_eligibility.reason_code, "window_open");
for (const settlement of ["DEMO-ST01", "DEMO-ST02", "DEMO-ST03"]) {
  const current = risk.caseLinks.find(item => item.settlement === settlement);
  const before = initialCases.get(settlement);
  assert.deepEqual(
    {status: current.status, frozen: current.frozen},
    {status: before.status, frozen: before.frozen},
    `signal_reject does not change ${settlement} funding state`,
  );
}

const st03Ref = {
  customer_id: "DEMO-C03",
  commission_case_id: "DEMO-CM03",
  settlement_case_id: "DEMO-ST03",
  partner_id: "DEMO-P02",
  settlement_batch_id: "DEMO-B02",
};
const st03Payload = {
  source_ref: {kind: "settlement_case", id: "DEMO-ST03", case_ref: st03Ref},
  case_ref: st03Ref,
  release_targets: [{restriction_id: "DEMO-RST-03", expected_restriction_version: "r3"}],
  expected_source_version: "sc3",
  source_task_id: "DEMO-T03",
  task_purpose: "settlement_recheck",
  reason: "申请前先核验实际信号结论与申诉窗口",
};

assert.throws(
  () => queue.ensureRiskTask({...st03Payload, ...request("st03-blocked")}, {role: "risk"}),
  error => error.code === "AFF-42201",
  "ST03 is blocked while E03 remains pending_review",
);

queue.fixtures.setRiskSignal("DEMO-E03", "rejected", {
  updated: "2026-11-08T12:00:00.000Z",
  rejected_effective_at: "2026-11-08T12:00:00.000Z",
  appeal_window_ends_at: "2026-11-15T12:00:00.000Z",
});
assert.throws(
  () => queue.ensureRiskTask({...st03Payload, ...request("st03-window-open")}, {role: "risk"}),
  error => error.code === "AFF-42201",
  "ST03 remains blocked until the rejection appeal window ends",
);
const e03 = queue.fixtures.setRiskSignal("DEMO-E03", "rejected", {
  updated: "2026-11-01T12:00:00.000Z",
  rejected_effective_at: "2026-11-01T12:00:00.000Z",
  appeal_window_ends_at: "2026-11-07T12:00:00.000Z",
});

const recheck = queue.ensureRiskTask(
  {...st03Payload, ...request("st03-create")},
  {role: "risk"},
);
assert.equal(recheck.task.source_ref.id, "DEMO-ST03");
assert.equal(recheck.task.fields.signal_status, "rejected");
assert.equal(e03.rejected_effective_at, "2026-11-01T12:00:00.000Z");

let recheckTask = queue.detail(recheck.task.task_id, {role: "risk"});
writeTask("claim", recheck.task.task_id, {});
recheckTask = queue.detail(recheck.task.task_id, {role: "risk"});
writeTask("save_draft", recheck.task.task_id, {
  expected_draft_version: recheckTask.draft_version,
  form_values: {conclusion: "change_request"},
  reason_code: "manual_review",
  reason: "信号已结论且申诉窗口已结束，申请逐案重检",
  evidence_ids: [`${recheck.task.task_id}-EVIDENCE1`],
  checklist: [{key: "source_verified", checked: true}],
});
recheckTask = queue.detail(recheck.task.task_id, {role: "risk"});
const recheckPreview = writeTask("preview", recheck.task.task_id, {
  draft_version: recheckTask.draft_version,
}).preview;
const recheckSubmitted = writeTask("submit_review", recheck.task.task_id, {
  draft_version: recheckTask.draft_version,
  preview_id: recheckPreview.preview_id,
  preview_hash: recheckPreview.preview_hash,
  self_review: false,
  impact_confirmation: true,
});
approve(recheckSubmitted.approval_id, "risk_supervisor", "已核验信号已结论并确认逐案重检范围");
const recheckApproved = approve(
  recheckSubmitted.approval_id,
  "finance",
  "已核验 ST03 资金状态与释放限制版本",
);
recheckTask = queue.detail(recheck.task.task_id, {role: "risk"});
const recheckExecution = recheckTask.execution_refs.at(-1);
writeTask(
  "coordinator_complete",
  recheck.task.task_id,
  {
    approval_id: recheckApproved.approval.approval_id,
    execution_id: recheckExecution.execution_id,
    domain_receipt_ref: "DEMO-DOMAIN-RECEIPT-ST03",
  },
  "risk",
  {actor_type: "domain_coordinator"},
);

const finalTask = queue.detail(recheck.task.task_id, {role: "risk"});
const finalExecution = finalTask.execution_refs.at(-1);
assert.equal(finalTask.workflow_state, "done");
assert.equal(finalTask.funds_status, "payable");
assert.equal(finalExecution.status, "succeeded");
assert.equal(finalExecution.settlement_checks.length, 1);
assert.equal(finalExecution.settlement_checks[0].case_ref.settlement_case_id, "DEMO-ST03");
assert.equal(finalExecution.settlement_checks[0].result, "passed");
assert.equal(finalExecution.settlement_checks[0].before.status, "frozen");
assert.equal(finalExecution.settlement_checks[0].after.status, "payable");
assert.equal(risk.events.find(item => item.id === "DEMO-E03").signal, "closed");

const st01 = risk.caseLinks.find(item => item.settlement === "DEMO-ST01");
const st02 = risk.caseLinks.find(item => item.settlement === "DEMO-ST02");
const st03 = risk.caseLinks.find(item => item.settlement === "DEMO-ST03");
assert.deepEqual(
  {status: st01.status, frozen: st01.frozen},
  {status: initialCases.get("DEMO-ST01").status, frozen: initialCases.get("DEMO-ST01").frozen},
  "ST01 remains frozen after an unrelated ST03 recheck",
);
assert.deepEqual(
  {status: st02.status, frozen: st02.frozen},
  {status: initialCases.get("DEMO-ST02").status, frozen: initialCases.get("DEMO-ST02").frozen},
  "ST02 remains holding after an unrelated ST03 recheck",
);
assert.deepEqual(
  {status: st03.status, frozen: st03.frozen},
  {status: "payable", frozen: "0.00"},
  "ST03 alone becomes payable after all rechecks pass",
);

queue.reset();
queue.fixtures.setRiskSignal("DEMO-E03", "rejected", {
  updated: "2026-11-01T12:00:00.000Z",
  rejected_effective_at: "2026-11-01T12:00:00.000Z",
  appeal_window_ends_at: "2026-11-07T12:00:00.000Z",
});
const blockers = ["KYC未完成", "CRM事实缺失", "集群复核未完成"];
queue.fixtures.setSettlementBlockers("DEMO-ST03", blockers);
const blockedSource = queue.fixtures.getSettlementSource("DEMO-ST03");
assert.deepEqual(blockedSource.blockers, blockers, "remaining KYC/CRM/cluster checks are exposed as a recheck variant");
const blockedRecheck = queue.ensureRiskTask(
  {...st03Payload, ...request("st03-blocked-variant")},
  {role: "risk"},
);
assert.deepEqual(
  queue.detail(blockedRecheck.task.task_id, {role: "risk"}).fields.blocking_reasons,
  blockers,
  "the blocked variant is carried into the recheck task facts",
);
let blockedTask = queue.detail(blockedRecheck.task.task_id, {role: "risk"});
writeTask("claim", blockedRecheck.task.task_id, {});
blockedTask = queue.detail(blockedRecheck.task.task_id, {role: "risk"});
writeTask("save_draft", blockedRecheck.task.task_id, {
  expected_draft_version: blockedTask.draft_version,
  form_values: {conclusion: "change_request"},
  reason_code: "manual_review",
  reason: "KYC、CRM与集群复核仍有阻断，申请保留暂扣",
  evidence_ids: [`${blockedRecheck.task.task_id}-EVIDENCE1`],
  checklist: [{key: "source_verified", checked: true}],
});
blockedTask = queue.detail(blockedRecheck.task.task_id, {role: "risk"});
const blockedPreview = writeTask("preview", blockedRecheck.task.task_id, {draft_version: blockedTask.draft_version}).preview;
const blockedSubmitted = writeTask("submit_review", blockedRecheck.task.task_id, {
  draft_version: blockedTask.draft_version,
  preview_id: blockedPreview.preview_id,
  preview_hash: blockedPreview.preview_hash,
  self_review: false,
  impact_confirmation: true,
});
approve(blockedSubmitted.approval_id, "risk_supervisor", "已核验剩余KYC、CRM与集群阻断");
const blockedApproved = approve(blockedSubmitted.approval_id, "finance", "已确认阻断存在，暂不转为可结算");
blockedTask = queue.detail(blockedRecheck.task.task_id, {role: "risk"});
writeTask("coordinator_complete", blockedRecheck.task.task_id, {
  approval_id: blockedApproved.approval.approval_id,
  execution_id: blockedTask.execution_refs.at(-1).execution_id,
  domain_receipt_ref: "DEMO-DOMAIN-RECEIPT-ST03-BLOCKED",
}, "risk", {actor_type: "domain_coordinator"});
const blockedFinal = queue.detail(blockedRecheck.task.task_id, {role: "risk"});
const blockedExecution = blockedFinal.execution_refs.at(-1);
assert.equal(blockedFinal.funds_status, "holding", "remaining domain blockers keep ST03 holding");
assert.equal(blockedExecution.settlement_checks[0].result, "blocked");
assert.deepEqual(blockedExecution.settlement_checks[0].blocking_reasons, blockers);
assert.notEqual(risk.caseLinks.find(item => item.settlement === "DEMO-ST03").status, "payable");

queue.reset();
const partial = queue.fixtures.seedPartialExecution("DEMO-TASK-025");
const partialBefore = queue.detail("DEMO-TASK-025", {role: "risk"});
const retryResult = queue.write(
  "retry_execution",
  "DEMO-TASK-025",
  {
    ...request("partial-retry"),
    expected_version: partialBefore.version,
    execution_id: partial.execution_id,
    execution_version: partial.version,
    failed_item_ids: ["item-failed"],
  },
  {role: "risk"},
);
const retriedExecution = retryResult.task.execution_refs.at(-1);
assert.equal(retriedExecution, partial.execution_id);
const partialAfter = queue.detail("DEMO-TASK-025", {role: "risk"});
const executionAfterRetry = partialAfter.execution_refs.find(item => item.execution_id === partial.execution_id);
assert.equal(executionAfterRetry.status, "pending");
assert.equal(executionAfterRetry.items.find(item => item.item_id === "item-success").status, "succeeded");
assert.equal(executionAfterRetry.items.find(item => item.item_id === "item-failed").status, "pending");
assert.equal(executionAfterRetry.items.find(item => item.item_id === "item-success").attempt, 1);
assert.equal(executionAfterRetry.items.find(item => item.item_id === "item-failed").attempt, 2);
queue.write(
  "coordinator_complete",
  "DEMO-TASK-025",
  {
    ...request("partial-complete"),
    expected_version: partialAfter.version,
    approval_id: null,
    execution_id: partial.execution_id,
    domain_receipt_ref: "DEMO-DOMAIN-RECEIPT-PARTIAL",
  },
  {role: "risk", actor_type: "domain_coordinator"},
);
const completedPartial = queue.detail("DEMO-TASK-025", {role: "risk"}).execution_refs.find(item => item.execution_id === partial.execution_id);
assert.equal(completedPartial.status, "succeeded");
assert.equal(completedPartial.items.find(item => item.item_id === "item-success").status, "succeeded");
assert.equal(completedPartial.items.find(item => item.item_id === "item-success").result_ref.id, "DEMO-RESULT-SUCCESS");
assert.equal(completedPartial.items.find(item => item.item_id === "item-success").attempt, 1);
assert.equal(completedPartial.items.find(item => item.item_id === "item-failed").status, "succeeded");

console.log("PASS dynamic risk signal and settlement recheck chain");
