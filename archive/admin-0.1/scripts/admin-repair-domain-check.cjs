"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname,"..");
const storage = new Map();
const sandbox = {
  window:{addEventListener(){}}, console, Date, JSON, BigInt, URLSearchParams, URL,
  location:{hash:"#/admin-workbench"}, navigator:{}, crypto:require("node:crypto").webcrypto,
  sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  localStorage:{getItem:()=>null,setItem(){}},
  document:{addEventListener(){},querySelector:()=>null},
  setInterval(){},setTimeout(){},clearTimeout(){},queueMicrotask(){}
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,"admin-prototype-data.js"),"utf8"),sandbox);
// This suite covers the retained review workflow; demo bypass has its own suite.
sandbox.window.AFF_ADMIN_PROTOTYPE.demoPolicy.approvalRequired = true;
sandbox.window.AFF_ADMIN_PROTOTYPE.taskQueue.reset();
const source = fs.readFileSync(path.join(root,"admin-dev.js"),"utf8");
const testSource = source.replace(
  "state.savedViews = loadSavedViews();\n  syncFromHash();render();",
  "window.testAdmin = {state,tq,resultForAction,writeBackTargets,client360Rows,client360DrawerBody,roleSwitcher,legacyActionAllowed,navigate,partner360PageAside,tqPagination,createMaskedListExport};"
);
vm.runInContext(testSource,sandbox);
const a = sandbox.window.testAdmin;
const p = sandbox.window.AFF_ADMIN_PROTOTYPE;
a.state.role = "finance";
for (const result of ["approved","rejected","returned"]) {
  const row={id:"test-approval",name:"核对审批",status:"pending_approval",owner:"申请人",ownerRole:"operations"};
  a.writeBackTargets([row],"approve",false,{result});
  assert.equal(row.status,result,`审批必须保留 ${result} 决定`);
  assert.equal(row.owner,"申请人","审批人不能覆盖责任人");
  assert.equal(p.auditRecords[0].result,result);
}
const row={id:"test-assign",name:"核对转办",status:"processing",owner:"原负责人",ownerRole:"finance"};
a.writeBackTargets([row],"assign",false,{owner:"宋嘉禾",ownerRole:"finance_reviewer"});
assert.equal(row.owner,"宋嘉禾");
assert.equal(row.ownerRole,"finance_reviewer");
assert.equal(p.auditRecords[0].operator,"财务/Finance");
assert.equal(a.legacyActionAllowed("approve",{status:"open"}),false);
assert.equal(a.legacyActionAllowed("claim",{status:"done"}),false);
assert.equal(a.legacyActionAllowed("approve",{status:"pending_approval"}),true);
const clients=a.client360Rows();
assert.ok(clients.length>10);
for (const client of clients) {
  const html=a.client360DrawerBody(client);
  assert.ok(html.includes(client.clientRef.crmId));
  assert.ok(html.includes(client.clientRef.country));
  assert.ok(!html.includes("C-88231"));
}
assert.ok(!source.includes('window.location.href = `./customer-360.html'));
assert.ok(!a.roleSwitcher().includes('value="finance_reviewer"'));
assert.ok(!a.roleSwitcher().includes('value="risk_reviewer"'));
assert.equal((a.roleSwitcher().match(/<option /g) || []).length,4);
const aside=a.partner360PageAside({tasks:[
  {id:"open-followup",type:"资金核对",status:"open",assignee:"待认领",due:"未配置"},
  {id:"done-followup",type:"资金核对",status:"done",assignee:"许安然",due:"未配置"}
],risk:{snapshot:{score:0,status:"clear",events:0},credit:{score:500}},riskBand:"R0",creditLevel:"C2",notes:[]});
assert.ok(aside.includes('data-p360-task="open-followup"'));
assert.ok(!aside.includes('data-p360-task="done-followup"'));
a.state.routeId="admin-review";
a.state.riskCaseId="legacy-risk";
a.state.riskCaseModal={action:"release"};
a.navigate("risk-workbench?tab=events");
assert.equal(a.state.riskCaseId,null);
assert.equal(a.state.riskCaseModal,null);
assert.equal(sandbox.location.hash,"#/risk-workbench?tab=events");
a.tq.query={page_size:20};
assert.ok(a.tqPagination().includes("来源快照"));
a.state.routeId="admin-modules";a.state.tabId="partner-list";
const exportRows=[{id:"partner-export-test",name:"已选合作方",status:"active",amount:100,phone:"+66123456789",email:"private@example.com",partnerRef:{secret:"not-exported"}}];
const exported=a.createMaskedListExport(exportRows,"已选列表摘要");
assert.equal(exported.applicant.user_id,p.taskQueue.options("finance").current_user.user_id);
assert.equal(exported.rows,1);
assert.equal(exported.status,"pending_approval");
assert.equal(JSON.parse(exported.content).records[0].id,"partner-export-test");
assert.ok(!exported.content.includes("private@example.com"));
assert.ok(!exported.content.includes("+66123456789"));
assert.ok(!exported.content.includes("not-exported"));
assert.equal(exportRows[0].status,"active","导出不得改变源业务状态");
console.log("PASS admin repair: approval decisions, assignee, state guards, client identity and reviewer switching");

const q=p.taskQueue;
q.reset();
let sequence=0;
const body=extra=>({request_id:`repair-r-${++sequence}`,idempotency_key:`repair-k-${sequence}`,...extra});
const request=body({partner_id:"partner-1021",type:"finance",business_ref:"wd-404",reason:"请核查原提现订单支付结果并记录查证依据",priority:"urgent"});
const before=JSON.stringify(p.funds360);
const created=q.ensurePartnerTask(request,{role:"operations"});
const taskId=created.task.task_id;
assert.equal(created.task.object_id,"partner-1021");
assert.equal(created.task.customer_id,null);
assert.equal(created.task.fields.business_ref,"wd-404");
assert.equal(created.task.sla,null);
assert.equal(created.task.priority,"high");
const followupDetail=q.detail(taskId,{role:"operations"});
assert.equal(followupDetail.evidence_refs.length,0,"未提供材料时不得伪造已核验附件");
assert.equal(followupDetail.sections.evidence.total,0);
assert.equal(Object.keys(followupDetail.config_versions).length,0);
assert.equal(Object.keys(followupDetail.source_versions).length,0);
assert.equal(Object.keys(followupDetail.sections.processing.config_versions).length,0);
assert.equal(followupDetail.sections.summary.risk_status,"not_applicable");
const originalFixture=q.detail(q.peek().tasks.find(task=>task.source_type!=="partner_followup").task_id,{role:"system_admin"});
assert.equal(originalFixture.evidence_refs.length,1,"其他任务应保留既有示例证据");
assert.equal(originalFixture.evidence_refs[0].status,"clean");
assert.equal(q.ensurePartnerTask(request,{role:"operations"}).task.task_id,taskId);
assert.equal(q.ensurePartnerTask(body({partner_id:"partner-1021",type:"finance",business_ref:"wd-404",reason:"再次核查原订单的支付结果及渠道回复"}),{role:"risk"}).task.task_id,taskId);
assert.equal(q.detail(taskId,{role:"risk"}).task_id,taskId);
assert.ok(!q.detail(taskId,{role:"risk"}).allowed_actions.some(item=>item.action==="claim"&&item.enabled));
assert.throws(()=>q.ensurePartnerTask(body({partner_id:"partner-1001",type:"finance",business_ref:"wd-404",reason:"该提现不属于此合作方，不允许建立错误关联"}),{role:"operations"}),error=>error.code==="AFF-42201");
function followupWrite(action,extra={}){
  const task=q.detail(taskId,{role:"finance"});
  return q.write(action,taskId,body({expected_version:task.version,...extra}),{role:"finance"});
}
followupWrite("claim");
assert.throws(()=>followupWrite("complete_followup"),error=>error.code==="AFF-42201");
const claimed=q.detail(taskId,{role:"finance"});
followupWrite("save_draft",{expected_draft_version:claimed.draft_version,form_values:{conclusion:"recorded"},reason:"已经核对原订单仍无最终支付回执，继续保持待核查"});
assert.ok(Date.parse(q.detail(taskId,{role:"finance"}).draft.updated_at)>=Date.parse(created.task.created_at),"新跟进草稿不能早于创建时间");
followupWrite("complete_followup");
assert.equal(q.detail(taskId,{role:"finance"}).workflow_state,"done");
assert.equal(JSON.stringify(p.funds360),before,"跟进任务完成不得伪造资金处理结果");
assert.throws(()=>followupWrite("complete_followup"),error=>error.code==="AFF-40301");
assert.ok(q.detail(taskId,{role:"operations"}).history.items.some(item=>item.action==="complete_followup"));
console.log("PASS partner follow-up: scoped identity, idempotency, cross-role visibility, guarded completion and no funds mutation");
