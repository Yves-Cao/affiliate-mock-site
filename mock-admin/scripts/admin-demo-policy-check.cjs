"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const sandbox={window:{},console,Date,JSON,BigInt,URLSearchParams};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../admin-prototype-data.js"),"utf8"),sandbox);
const p=sandbox.window.AFF_ADMIN_PROTOTYPE,q=p.taskQueue;
let sequence=0;
const roles=["operations","finance","risk_supervisor","system_admin"];
function write(action,id,extra={},role="risk_supervisor",ctx={}) {
  const task=id?q.detail(id,{role}):null;
  const token=`DEMO-POLICY-${++sequence}`;
  return q.write(action,id,{request_id:token,idempotency_key:token,expected_version:task?.version,...extra},{role,...ctx});
}
function save(id,values,role="risk_supervisor"){
  const task=q.detail(id,{role});
  return write("save_draft",id,{expected_draft_version:task.draft_version,
    form_values:values,reason_code:"manual_review",reason:"已核对来源、证据及逐案影响，确认演示处理",
    evidence_ids:[`${id}-EVIDENCE1`],checklist:[{key:"source_verified",checked:true}]},role);
}
function submit(id,role="risk_supervisor"){
  const task=q.detail(id,{role});
  const preview=write("preview",id,{draft_version:task.draft_version},role).preview;
  assert.equal(preview.required_approver_roles.length,0);
  assert.ok(preview.before_after_items.every(item=>item.after.requires_approval===false));
  return write("submit_review",id,{draft_version:task.draft_version,preview_id:preview.preview_id,
    preview_hash:preview.preview_hash,self_review:false,impact_confirmation:true},role);
}
assert.equal(p.demoPolicy.approvalRequired,false);
assert.equal(JSON.stringify(p.demoPolicy.employeeRoles),JSON.stringify(roles));
for(const role of roles) {
  const options=q.options(role);
  assert.equal(new Set(options.users.map(user=>user.role_code)).size,4);
  assert.ok(options.users.every(user=>roles.includes(user.role_code)));
  assert.ok(options.source_types.every(type=>type.approval_required===false));
  assert.equal(options.export_policy.requires_approval,false);
}
assert.ok(q.peek().tasks.every(task=>!task.owner||roles.includes(task.owner.role_code)));
const candidates=q.assignees("DEMO-TASK-025",{role:"risk_supervisor"});
assert.ok(candidates.users.length>0&&candidates.users.every(user=>roles.includes(user.role_code)));
const beforeFunds=JSON.stringify(p.funds360);
const beforeApprovals=q.peek().approvals.length;
save("DEMO-TASK-025",{conclusion:"confirm"});
const direct=submit("DEMO-TASK-025");
assert.equal(direct.workflow_state,"pending_execution");
assert.equal(direct.approval_status,"not_required");
assert.equal(direct.approval_id,null);
assert.equal(direct.execution.approval_id,null);
assert.throws(()=>write("coordinator_complete","DEMO-TASK-025",{
  execution_id:direct.execution.execution_id,approval_id:null,domain_receipt_ref:"伪造浏览器回执"
}),error=>error.code==="AFF-42201");
assert.equal(q.peek().approvals.length,beforeApprovals);
assert.equal(JSON.stringify(p.funds360),beforeFunds);
assert.ok(q.audit.some(entry=>entry.action==="review_skipped"));
assert.ok(q.audit.every(entry=>entry.self_review===false&&!["approve","reject","return"].includes(entry.action)));
assert.throws(()=>write("submit_review","DEMO-TASK-005",{self_review:false,impact_confirmation:true},"finance"),error=>error.code==="AFF-40901");
assert.throws(()=>save("DEMO-TASK-005",{conclusion:"change_request",proposed_amount:"80.01"},"finance"),error=>error.code==="AFF-42201");
save("DEMO-TASK-005",{conclusion:"change_request",proposed_amount:"80.00"},"finance");
assert.equal(submit("DEMO-TASK-005","finance").workflow_state,"pending_execution");
const pending=q.detail("DEMO-T03",{role:"risk_supervisor"});
assert.ok(pending.allowed_actions.find(action=>action.action==="resume_without_review")?.enabled);
assert.throws(()=>write("resume_without_review","DEMO-T03",{reason:"太短",impact_confirmation:true}),error=>error.code==="AFF-42201");
const resumed=write("resume_without_review","DEMO-T03",{reason:"按演示安排跳过审核，已核对执行影响",impact_confirmation:true});
assert.equal(resumed.workflow_state,"pending_execution");
assert.equal(q.detail("DEMO-T03",{role:"risk_supervisor"}).approval_refs.at(-1).status,"cancelled");
assert.equal(q.detail("DEMO-T03",{role:"risk_supervisor"}).funds_status,"frozen");
const created=q.write("export",null,{request_id:"DEMO-POLICY-EXPORT",idempotency_key:"DEMO-POLICY-EXPORT",
  purpose:"核对当前岗位任务清单并用于页面演示",query:{scope:"mine"}},{role:"risk_supervisor"});
assert.equal(created.export.status,"ready");
assert.equal(created.export.approval_status,"not_required");
assert.equal(created.approval,undefined);
const downloaded=q.write("download_export",created.export.export_id,{request_id:"DEMO-POLICY-DL",
  idempotency_key:"DEMO-POLICY-DL"},{role:"risk_supervisor"});
assert.ok(downloaded.csv.startsWith("\uFEFF"));
assert.throws(()=>q.write("download_export",created.export.export_id,{request_id:"DEMO-POLICY-OTHER",
  idempotency_key:"DEMO-POLICY-OTHER"},{role:"finance"}),error=>error.code==="AFF-40301");
console.log("PASS demo policy: four identities, accessible ownership, no review/self-review, preserved validation, pending execution, historical continuation, safe export");
