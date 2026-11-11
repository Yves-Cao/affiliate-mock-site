"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname,"..");
const source = fs.readFileSync(path.join(root,"admin-dev.js"),"utf8");
function section(start,end) {
  const first=source.indexOf(start),last=source.indexOf(end,first);
  assert.ok(first>=0&&last>first,`Missing source section ${start}`);
  return source.slice(first,last);
}
const inputs={},messages=[],audit=[];
const now=Date.parse("2026-11-10T12:00:00+08:00");
const sandbox={
  window:{AFF_ADMIN_CLOCK:{now:()=>now}},console,Date,JSON,BigInt,URLSearchParams,
  crypto:require("node:crypto").webcrypto,
  state:{role:"operations",filters:{},reportExportOpen:false},
  document:{querySelector:selector=>inputs[selector] || null},
  render(){},showToast:message=>messages.push(message),
  h:value=>String(value??""),statusLabel:value=>value,statusTag:value=>`<span>${value}</span>`,
  createDate:()=>new Date(now).toISOString(),tab:()=>({title:"合作方"}),
  tqClone:value=>JSON.parse(JSON.stringify(value)),dataStore:{},
  integrationAudit:(action,object,result,traceId,extra)=>audit.push({action,object,result,traceId,...extra}),
  riskWorkbenchStore:()=>({serverNow:new Date(now).toISOString()}),
  riskWorkbenchRows:()=>[{id:"event-demo",name:"脱敏事件",status:"pending"}],
  riskHiddenColumnsFor:()=>new Set(),
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,"admin-prototype-data.js"),"utf8"),sandbox);
vm.runInContext(`
  const prototype=window.AFF_ADMIN_PROTOTYPE;
  const demoSkipsApproval=()=>prototype.demoPolicy?.approvalRequired===false;
  ${section("  const roleOwnerNames = {","  const dashboardRoleNames = {")}
  ${section("  function riskWorkbenchExportRequest(reason)","  function riskFilterBar()")}
  ${section("  const partnerReviewActions = {","  function partnerOffboardModal()")}
  ${section("  const governanceActions = {","  function integrationAudit(")}
  ${section("  function exportPartnerSummary(partner)","  function downloadStatement(id)")}
  this.test={exportPartnerSummary,createMaskedListExport,riskWorkbenchExportRequest,
    partnerReviewModal,submitPartnerReview,governanceModal,submitGovernanceAction};
`,sandbox);
const p=sandbox.window.AFF_ADMIN_PROTOTYPE,a=sandbox.test,state=sandbox.state;
let checks=0;
function test(name,fn){fn();checks++;console.log(`PASS ${name}`);}
function mode(enabled){p.demoPolicy.approvalRequired=!enabled;}

test("demo summary/list exports are immediately ready, masked and have no approval actor",()=>{
  mode(true);state.role="operations";
  a.exportPartnerSummary({id:"partner-export",name:"合作方",country:"TH",stage:"active",updated:"2026-11-10",email:"private@example.com",phone:"+66123456789"});
  const summary=p.exportTasks[0];
  assert.equal(summary.status,"ready");assert.equal(summary.approvalStatus,"not_required");
  assert.equal(Date.parse(summary.expiresAt),now+24*60*60*1000);
  assert.ok(!summary.content.includes("private@example.com"));assert.ok(!summary.content.includes("+66123456789"));
  const row={id:"row-export",name:"客户",status:"active",email:"private@example.com",phone:"+66123456789"};
  const exported=a.createMaskedListExport([row],"筛选结果");
  assert.equal(exported.status,"ready");assert.equal(exported.approvalStatus,"not_required");
  assert.equal(exported.applicant.user_id,p.taskQueue.options("operations").current_user.user_id);
  assert.ok(!exported.content.includes("private@example.com"));assert.equal(row.status,"active");
  assert.equal(p.auditRecords[0].self_review,false);assert.equal(p.auditRecords[0].approval_required,false);
  assert.equal(exported.approver,undefined);
});
test("normal summary/list exports still wait for approval",()=>{
  mode(false);
  const exported=a.createMaskedListExport([{id:"normal",name:"客户",status:"active"}],"正常模式");
  assert.equal(exported.status,"pending_approval");assert.equal(exported.approvalStatus,"pending_approval");
});
test("demo applicant can prepare own pending export without self review; another operator cannot",()=>{
  mode(true);state.role="operations";
  const user=p.taskQueue.options("operations").current_user;
  const item={id:"own-pending",name:"旧导出",status:"pending_approval",approvalStatus:"pending_approval",applicant:user,content:"{}"};
  p.exportTasks.unshift(item);
  state.governanceModal={action:"approve_export",target:item.id};
  inputs["#governance-reason"]={value:"核对旧导出的生成范围"};
  inputs["#governance-self-review"]={checked:true};
  assert.ok(!a.governanceModal().includes('id="governance-self-review"'));
  a.submitGovernanceAction();
  assert.equal(item.status,"ready");assert.equal(item.approvalStatus,"not_required");
  assert.equal(item.approver,undefined);assert.equal(audit.at(-1).self_review,false);
  assert.equal(audit.at(-1).approver,null);assert.equal(audit.at(-1).action,"生成导出文件");
  item.status="pending_approval";state.role="finance";state.governanceModal={action:"approve_export",target:item.id};
  a.submitGovernanceAction();
  assert.equal(item.status,"pending_approval");assert.match(messages.at(-1),/无权/);
});
test("normal governance retains explicit self-review gate",()=>{
  mode(false);state.role="system_admin";
  const user=p.taskQueue.options("system_admin").current_user;
  const item={id:"normal-self",name:"待审导出",status:"pending_approval",approvalStatus:"pending_approval",applicant:user};
  p.exportTasks.unshift(item);state.governanceModal={action:"approve_export",target:item.id};
  inputs["#governance-self-review"]={checked:false};
  a.submitGovernanceAction();
  assert.equal(item.status,"pending_approval");assert.match(messages.at(-1),/勾选自动审核/);
});
test("demo risk export preserves snapshot checks and uses no approval record",()=>{
  mode(true);state.role="risk_supervisor";state.tabId="events";
  state.riskWorkbenchFilter={};state.riskWorkbenchSort={};state.riskWorkbenchSnapshotId="snap-demo";
  state.riskWorkbenchListSnapshots={demo:{snapshot_id:"snap-demo",role:state.role,tab:"events",
    expires_at:new Date(now+60000).toISOString(),created_at:new Date(now).toISOString(),
    signature:JSON.stringify({role:state.role,tab:state.tabId,filter:{},sort:{}})}};
  const result=a.riskWorkbenchExportRequest("核对风险列表后导出留档");
  assert.equal(result.status,"ready");assert.equal(result.approval_status,"not_required");
  assert.equal(result.approval_id,null);assert.equal(result.approver,undefined);
  assert.equal(p.exportTasks[0].status,"ready");assert.equal(p.exportTasks[0].approvalStatus,"not_required");
  state.riskWorkbenchListSnapshots.demo.expires_at=new Date(now-1).toISOString();
  assert.throws(()=>a.riskWorkbenchExportRequest("核对风险列表后导出留档"),error=>error.code==="AFF-40901");
});
test("demo partner form omits self-review and ignores stale checked fields",()=>{
  mode(true);state.role="operations";
  const partner=p.partner360.partners.find(item=>item.onboard);
  assert.ok(partner);
  partner.onboard.autoReviewEligible=true;
  state.partnerReview={action:"supplement",target:partner.id};
  assert.ok(!a.partnerReviewModal().includes('id="partner-self-review"'));
  inputs["#partner-review-reason"]={value:"请补充缺失的资料信息"};
  inputs["#partner-self-review"]={checked:true};
  a.submitPartnerReview();
  assert.equal(p.auditRecords[0].self_review,false);
  assert.equal(partner.status,"supplementing");
});
console.log(`PASS demo exports and governance: ${checks} scenarios`);
