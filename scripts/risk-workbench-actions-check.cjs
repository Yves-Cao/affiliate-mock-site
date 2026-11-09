"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const sandbox = {window:{}, console, Date, JSON, BigInt, URLSearchParams};
vm.runInNewContext(
  fs.readFileSync(require("node:path").join(__dirname, "../admin-prototype-data.js"), "utf8"),
  sandbox,
);

const prototype = sandbox.window.AFF_ADMIN_PROTOTYPE;
const queue = prototype.taskQueue;
let sequence = 0;

function request(prefix) {
  sequence += 1;
  return {request_id:`RWB-ACTION-${prefix}-${sequence}`, idempotency_key:`RWB-ACTION-${prefix}-${sequence}`};
}

function write(action, taskId, extra = {}, role = "risk", context = {}) {
  const current = ["approve","reject","return"].includes(action)
    ? queue.approvals({role}).find(item => item.approval_id === taskId)
    : queue.detail(taskId, {role});
  return queue.write(action, taskId, {...request(action), expected_version:current.version, ...extra}, {role, ...context});
}

function claim(taskId) {
  const task = queue.detail(taskId, {role:"risk"});
  if (task.workflow_state === "open") write("claim", taskId);
}

function save(taskId, formValues) {
  const task = queue.detail(taskId, {role:"risk"});
  return write("save_draft", taskId, {
    expected_draft_version:task.draft_version,
    form_values:formValues,
    reason_code:"manual_review",
    reason:"已核验来源、案件范围、证据和领域执行影响，申请执行动作",
    evidence_ids:[`${taskId}-EVIDENCE1`],
    checklist:[{key:"source_verified",checked:true}],
  });
}

function submit(taskId) {
  const task = queue.detail(taskId, {role:"risk"});
  const preview = write("preview", taskId, {draft_version:task.draft_version}).preview;
  return write("submit_review", taskId, {
    draft_version:task.draft_version,
    preview_id:preview.preview_id,
    preview_hash:preview.preview_hash,
    self_review:false,
    impact_confirmation:true,
  });
}

function approveAll(submitted) {
  let approval = submitted.approval;
  for (const role of ["risk_supervisor","finance"]) {
    approval = queue.approvals({role}).find(item => item.approval_id === approval.approval_id);
    if (approval.status === "approved") break;
    const node = approval.nodes[approval.current_node_index];
    approval = write("approve", approval.approval_id, {
      node_id:node.node_id,
      expected_node_version:node.version,
      reason:"已独立核验案件范围、证据、资金影响和执行参数，准予执行",
    }, role, {source_entry:"approval_queue"}).approval;
  }
  return approval;
}

function complete(taskId, approvalId) {
  const task = queue.detail(taskId, {role:"risk"});
  const execution = task.execution_refs.at(-1);
  assert.ok(execution?.execution_id, `${taskId} has a pending execution`);
  return write("coordinator_complete", taskId, {
    approval_id:approvalId,
    execution_id:execution.execution_id,
    domain_receipt_ref:`RWB-DOMAIN-RECEIPT-${taskId}`,
  }, "risk", {actor_type:"domain_coordinator"});
}

function create(sourceRef, purpose, reason) {
  return queue.ensureRiskTask({
    source_ref:sourceRef,
    task_purpose:purpose,
    reason,
    ...request("create"),
  }, {role:"risk"}).task.task_id;
}

function runAction(name, sourceRef, purpose, values, assertFact) {
  queue.reset();
  const taskId = create(sourceRef, purpose, `申请${name}，已核验来源、案件范围与执行影响`);
  claim(taskId);
  save(taskId, values);
  const submitted = submit(taskId);
  const approval = approveAll(submitted);
  const result = complete(taskId, approval.approval_id);
  assert.equal(result.task.workflow_state, "done", `${name} completes task`);
  const execution = queue.peek().executions.find(item => item.execution_id === result.task.execution_refs.at(-1));
  assert.equal(execution.status, "succeeded", `${name} execution succeeds`);
  assert.ok(execution.domain_receipt, `${name} returns a domain receipt`);
  assertFact(taskId, execution, prototype.riskWorkbench);
  console.log(`PASS ${name} domain chain`);
}

runAction("继续暂扣",{kind:"event",id:"DEMO-E06"},"risk_investigation",{conclusion:"confirm",risk_action:"continue_freeze"},(taskId,execution,store)=>{
  assert.equal(execution.domain_receipt.action,"continue_freeze");
  assert.equal(store.caseLinks.find(item => item.settlement === "DEMO-ST01").status,"frozen");
});

runAction("延长暂扣",{kind:"event",id:"DEMO-E06"},"risk_investigation",{conclusion:"confirm",risk_action:"extend_settlement"},(taskId,execution,store)=>{
  const link = store.caseLinks.find(item => item.settlement === "DEMO-ST01");
  assert.equal(execution.domain_receipt.action,"extend_settlement");
  assert.equal(link.hold_extension.count,1);
  assert.equal(link.hold_extension.rule_ref,"DEMO-EXTEND-RULE1");
  assert.ok(link.hold_extension.due_at);
});

runAction("转财务",{kind:"event",id:"DEMO-E06"},"risk_investigation",{conclusion:"confirm",risk_action:"refer_finance",finance_action:"reject_commission"},(taskId,execution,store)=>{
  const financeTask = store.tasks.find(item => item.source_ref?.kind === "risk_task" && item.source_ref.id === taskId);
  assert.ok(financeTask,"finance follow-up task is created");
  assert.equal(execution.domain_receipt.funds_changed,false);
});

runAction("信用传导",{kind:"event",id:"DEMO-E06"},"risk_investigation",{conclusion:"confirm",risk_action:"credit_propagation",credit_mode:"credit_deduct_and_target_level",target_level:"C1",partner_id:"DEMO-P01"},(taskId,execution,store)=>{
  const partner = store.objects.find(item => item.id === "DEMO-P01");
  assert.equal(partner.credit,"C1");
  assert.equal(execution.domain_receipt.policy_ref,"DEMO-CREDIT-POLICY1");
  assert.ok(partner.credit_history?.length);
});

queue.reset();
{
  const taskId = create({kind:"cluster",id:"DEMO-G01"},"cluster_member_correction","申请拆分集群成员，保留原证据并建立独立风险上下文");
  claim(taskId);
  save(taskId,{conclusion:"change_request",member_ids:["DEMO-C02"],correction:"split_new_cluster"});
  const approval = approveAll(submit(taskId));
  complete(taskId,approval.approval_id);
  const clusters = prototype.riskWorkbench.clusters;
  assert.equal(clusters.length,2);
  assert.equal(clusters[1].status,"suspected");
  assert.equal(clusters[1].riskBand,null);
  assert.equal(clusters[1].evidenceRefs.length,0);
  console.log("PASS 集群拆分生成独立新组");
}

runAction("移除名单",{kind:"blacklist",id:"DEMO-BL01"},"blacklist_remove",{conclusion:"change_request"},(taskId,execution,store)=>{
  const entry = store.blacklist.find(item => item.id === "DEMO-BL01");
  assert.equal(entry.status,"removed");
  assert.equal(execution.domain_receipt.operation,"remove");
});

queue.reset();
{
  const taskId = create({kind:"object",id:"DEMO-C01"},"blacklist_add","申请未来生效名单，生效前保持待执行");
  claim(taskId);
  save(taskId,{conclusion:"change_request",entry_type:"device",target_ref:"DEMO-C01",scope:"local",effective_at:"2026-11-10T00:00:00.000Z",expires_at:"2027-01-10T00:00:00.000Z"});
  const approval = approveAll(submit(taskId));
  const task = queue.detail(taskId,{role:"risk"});
  assert.equal(task.workflow_state,"processing");
  assert.equal(queue.peek().executions.at(-1).status,"pending");
  assert.throws(() => complete(taskId,approval.approval_id), error => error.code === "AFF-42201");
  assert.equal(prototype.riskWorkbench.blacklist.length,2);
  console.log("PASS 未来生效名单保持待执行并拒绝提前完成");
}

console.log("PASS seven risk actions and lifecycle boundaries");
