const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const sandbox = {window:{},console,Date,JSON,BigInt,URLSearchParams};
vm.runInNewContext(fs.readFileSync(require("node:path").join(__dirname,"../admin-prototype-data.js"),"utf8"),sandbox);
const q=sandbox.window.AFF_ADMIN_PROTOTYPE.taskQueue;
const schema=JSON.parse(fs.readFileSync(require("node:path").join(__dirname,"../openapi/schemas/task-queue.json"),"utf8"));
function validateSchema(value,s,path="$") {
  if(s.$ref)s=schema.$defs[s.$ref.split("/").pop()];
  if(s.anyOf){assert.ok(s.anyOf.some(part=>{try{validateSchema(value,part,path);return true;}catch{return false;}}),`${path} anyOf`);return;}
  if(s.const!==undefined)assert.equal(value,s.const,path);
  if(s.enum)assert.ok(s.enum.includes(value),`${path} enum`);
  const type=value===null?"null":Array.isArray(value)?"array":typeof value;
  if(s.type)assert.ok((Array.isArray(s.type)?s.type:[s.type]).includes(type),`${path} type ${type}`);
  if(typeof value==="string"){if(s.minLength)assert.ok(value.length>=s.minLength,path);if(s.maxLength)assert.ok(value.length<=s.maxLength,path);if(s.pattern)assert.match(value,new RegExp(s.pattern),path);}
  if(value&&type==="object"){for(const key of s.required||[])assert.ok(Object.hasOwn(value,key),`${path}.${key} required`);for(const [key,part] of Object.entries(s.properties||{}))if(Object.hasOwn(value,key))validateSchema(value[key],part,`${path}.${key}`);}
  if(type==="array"&&s.items)value.forEach((item,index)=>validateSchema(item,s.items,`${path}[${index}]`));
}
let n=0;
function test(name,fn){q.reset();fn();console.log(`PASS ${name}`);n++;}
function error(fn,code){assert.throws(fn,e=>e.code===code);}
let i=0;
function write(action,id,extra={},role="risk",ctx={}) {
  const t=action==="approve"||action==="reject"||action==="return"?q.approvals({role}).find(a=>a.approval_id===id):q.detail(id,{role});
  return q.write(action,id,{expected_version:t.version,request_id:`r-${++i}`,idempotency_key:`k-${i}`,...extra},{role,...ctx});
}
function draft(id,values,role="risk") {
  const t=q.detail(id,{role});
  return write("save_draft",id,{expected_draft_version:t.draft_version,form_values:values,reason_code:"manual_review",reason:"这是已核验来源和案件范围的合成处理说明",evidence_ids:[`${id}-EVIDENCE1`],checklist:[{key:"source_verified",checked:true}]},role);
}
function submit(id,role="risk") {
  let t=q.detail(id,{role});
  const p=write("preview",id,{draft_version:t.draft_version},role).preview;
  return write("submit_review",id,{draft_version:t.draft_version,preview_id:p.preview_id,preview_hash:p.preview_hash,self_review:false,impact_confirmation:true},role);
}
test("fixtures expose 13 types, ten states and deterministic pagination",()=>{
  const data=q.peek().tasks;assert.equal(new Set(data.map(t=>t.source_type)).size,13);assert.equal(new Set(data.map(t=>t.workflow_state)).size,10);
  const a=q.list({scope:"mine"},{role:"risk"});assert.equal(a.items.length,20);assert.ok(a.meta.total>20);
  const b=q.list({scope:"mine",page:2,snapshot_id:a.meta.snapshot_id},{role:"risk"});assert.equal(b.meta.snapshot_id,a.meta.snapshot_id);assert.ok(!b.items.some(x=>a.items.some(y=>y.task_id===x.task_id)));
});
test("every fixture detail validates the checked-in row schema",()=>{
  for(const t of q.peek().tasks)validateSchema(q.detail(t.task_id,{role:"system_admin"}),schema);
  assert.equal(q.options("audit").default_scope,"authorized");
  assert.ok(!q.options("audit").authorized_scopes.includes("claimable"));
  assert.equal(q.options("system_admin").default_scope,"authorized");
  assert.ok(q.options("finance").source_types.every(t=>["guarantee_offset","chargeback","commission_exception"].includes(t.key)));
});
test("all twelve fixed scenarios match their concrete page contract",()=>{
  const t=n=>q.detail(`DEMO-TASK-${String(n).padStart(3,"0")}`,{role:"system_admin"});
  const s1=t(1);assert.equal(s1.source_type,"risk_review");assert.equal(s1.workflow_state,"open");assert.equal(s1.owner,null);assert.equal(s1.sla.due_at,"2026-11-08T13:00:00.000Z");assert.equal(s1.sla.warning_at,"2026-11-08T11:00:00.000Z");assert.equal(s1.sla_state,"warning");
  const s2=t(2);assert.equal(s2.source_type,"settlement_overdue");assert.equal(s2.workflow_state,"processing");assert.equal(s2.owner.user_id,"DEMO-RISK-01");assert.equal(s2.task_purpose,"settlement_recheck");assert.equal(s2.sla.due_at,"2026-11-08T11:00:00.000Z");assert.equal(s2.sla_state,"overdue");assert.equal(s2.impact.amount,"250.00");assert.equal(s2.case_refs[0].customer_id,"DEMO-C1");assert.equal(s2.case_refs[0].commission_case_id,"DEMO-COM1");assert.equal(s2.case_refs[0].settlement_case_id,"DEMO-SET1");assert.equal(s2.fields.signal_status,"rejected");assert.ok(s2.fields.appeal_eligibility.window_ends_at<q.clock);assert.equal(s2.fields.appeal_eligibility.in_progress,false);assert.ok(s2.fields.release_targets.length);
  const s3=t(3);assert.equal(s3.source_type,"appeal");assert.equal(s3.workflow_state,"waiting_material");assert.equal(s3.owner.user_id,"DEMO-RISK-01");assert.equal(s3.fields.original_signal_status,"rejected");assert.equal(s3.fields.eligibility.eligible,true);assert.ok(s3.sla.due_at);
  const s4=t(4);assert.equal(s4.source_type,"hold_extend");assert.equal(s4.workflow_state,"pending_approval");assert.equal(s4.approval_refs[0].applicant.user_id,s4.owner.user_id);assert.ok(s4.allowed_actions.every(a=>!["approve","reject"].includes(a.action)));
  const s5=t(5);assert.equal(s5.source_type,"guarantee_offset");assert.equal(s5.workflow_state,"processing");assert.equal(s5.owner.user_id,"DEMO-FIN-01");assert.equal(s5.fields.loss_amount.amount,"100.00");assert.equal(s5.fields.available_reserve.amount,"80.00");assert.equal(s5.fields.already_offset.amount,"0.00");
  const s6=t(6);assert.equal(s6.source_type,"integration");assert.equal(s6.workflow_state,"executing");assert.equal(s6.owner.user_id,"DEMO-ADMIN-01");assert.equal(s6.fields.operation,"payment");assert.equal(s6.fields.last_status,"unknown");assert.ok(s6.fields.external_ref);assert.equal(q.detail(s6.task_id,{role:"system_admin"}).allowed_actions.find(a=>a.action==="retry_integration").enabled,false);
  const s7=t(7);assert.equal(s7.source_type,"data_backfill");assert.equal(s7.workflow_state,"execution_failed");assert.equal(s7.owner.user_id,"DEMO-ADMIN-01");assert.equal(s7.fields.retry_policy.attempt,s7.fields.retry_policy.max_attempts);assert.equal(s7.execution_refs[0].items[0].retryable,false);assert.equal(s7.allowed_actions.find(a=>a.action==="retry_execution").enabled,false);
  const s8=t(8);assert.equal(s8.source_type,"risk_review");assert.equal(s8.workflow_state,"done");assert.equal(s8.owner.user_id,"DEMO-RISK-01");assert.equal(s8.result,"rejected");assert.equal(s8.settlement_status,"frozen");assert.ok(!q.list({scope:"authorized"},{role:"system_admin"}).items.some(t=>t.task_id===s8.task_id));
  const s9=t(9);assert.equal(s9.workflow_state,"closed");assert.equal(s9.result,"duplicate");assert.equal(s9.replaced_by_task_id,"DEMO-TASK-001");assert.equal(s9.settlement_status,"frozen");
  const s10=t(10);assert.equal(s10.source_type,"credit_review");assert.equal(s10.workflow_state,"returned");assert.equal(s10.owner.user_id,"DEMO-RISK-01");assert.equal(s10.fields.current_level,"C2");assert.equal(s10.draft.form_values.target_level,"C1");assert.equal(s10.sla,null);assert.equal(s10.sla_state,"unconfigured");
  const s11=t(11);assert.equal(s11.source_type,"commission_exception");assert.equal(s11.workflow_state,"pending_execution");assert.equal(s11.owner.user_id,"DEMO-FIN-01");assert.equal(s11.approval_refs[0].status,"approved");assert.equal(s11.execution_refs[0].status,"pending");assert.ok(s11.allowed_actions.filter(a=>["assign","save_draft"].includes(a.action)).every(a=>!a.enabled));
  const s12=t(12);assert.equal(s12.source_type,"attribution_review");assert.equal(s12.workflow_state,"processing");assert.equal(s12.owner.user_id,"DEMO-OPS-01");assert.equal(s12.fields.crm_attribution.channel,"IB");assert.ok(s12.fields.authorized_owner_refs.every(ref=>ref.startsWith("DEMO-IB")));
  error(()=>draft(s12.task_id,{conclusion:"change_request",proposed_owner_ref:"Affiliate"},"operations"),"AFF-42201");
  const expected={risk_review:"风险复核",settlement_overdue:"结算超时复核",appeal:"申诉复核",hold_extend:"结算延长复核",guarantee_offset:"保证金抵扣",chargeback:"冲正追回",circuit_breaker:"熔断复核",credit_review:"信用调级复核",commission_exception:"佣金异常",attribution_review:"归属争议复核",integration:"集成失败",data_backfill:"事件补数",offboarding_step:"清退步骤"};
  for(const type of q.options("system_admin").source_types)assert.equal(type.label_zh,expected[type.key]);
});
test("claim checks versions, ownership and preserves SLA",()=>{
  const t=q.detail("DEMO-TASK-001",{role:"risk"}),sla=JSON.stringify(t.sla);
  write("claim",t.task_id);assert.equal(q.detail(t.task_id,{role:"risk"}).owner.user_id,"DEMO-RISK-01");assert.equal(JSON.stringify(q.detail(t.task_id,{role:"risk"}).sla),sla);
  error(()=>q.write("claim",t.task_id,{expected_version:t.version,request_id:"stale",idempotency_key:"stale"},{role:"risk"}),"AFF-40901");
  error(()=>write("claim","DEMO-TASK-024",{},"finance"),"AFF-40301");
});
test("idempotency replays and response loss recovers original receipt",()=>{
  const t=q.detail("DEMO-TASK-001",{role:"risk"}),p={expected_version:t.version,request_id:"timeout",idempotency_key:"timeout"};
  error(()=>q.write("claim",t.task_id,p,{role:"risk",scenario:"write_timeout"}),"AFF-50401");
  assert.equal(q.receipt("timeout",{role:"risk"}).result.task.workflow_state,"processing");
  assert.equal(q.write("claim",t.task_id,p,{role:"risk"}).task.version,"v2");
  error(()=>q.write("claim",t.task_id,{...p,reason:"different"},{role:"risk"}),"AFF-40902");
});
test("money uses exact bounds and rejects scientific notation",()=>{
  error(()=>draft("DEMO-TASK-005",{conclusion:"change_request",proposed_amount:"80.01"},"finance"),"AFF-42201");
  error(()=>draft("DEMO-TASK-005",{conclusion:"change_request",proposed_amount:"1e2"},"finance"),"AFF-42201");
  draft("DEMO-TASK-005",{conclusion:"change_request",proposed_amount:"80.00"},"finance");
});
test("partial drafts save but incomplete precheck fails",()=>{
  write("save_draft","DEMO-TASK-025",{expected_draft_version:"d0",form_values:{},reason:""});
  error(()=>write("preview","DEMO-TASK-025",{draft_version:"d1"}),"AFF-42201");
});
test("sensitive approvals are serial and do not execute early",()=>{
  draft("DEMO-TASK-025",{conclusion:"confirm"});const submitted=submit("DEMO-TASK-025"),id=submitted.approval.approval_id;
  error(()=>write("approve",id,{node_id:"node-1",expected_node_version:"n1",reason:"合成审核说明足够十个字符"},"risk",{source_entry:"approval_queue"}),"AFF-40301");
  let a=write("approve",id,{node_id:"node-1",expected_node_version:"n1",reason:"已检查案件范围与证据，准予继续流转"},"risk_supervisor",{source_entry:"approval_queue"}).approval;
  assert.equal(a.status,"pending_approval");assert.equal(a.execution_id,null);assert.equal(q.detail("DEMO-TASK-025",{role:"risk"}).workflow_state,"pending_approval");
  a=write("approve",id,{node_id:"node-2",expected_node_version:"n1",reason:"已复核财务影响与方案，准予执行"},"finance",{source_entry:"approval_queue"}).approval;
  assert.equal(a.status,"approved");assert.ok(a.execution_id);assert.equal(q.detail("DEMO-TASK-025",{role:"risk"}).workflow_state,"pending_execution");
});
test("browser cannot complete, unknown payment cannot retry",()=>{
  error(()=>write("coordinator_complete","DEMO-TASK-006",{domain_receipt_ref:"fake"},"system_admin"),"AFF-42201");
  error(()=>write("retry_integration","DEMO-TASK-006",{integration_version:"i1"},"system_admin"),"AFF-40301");
  const r=write("status_check","DEMO-TASK-006",{integration_version:"i1"},"system_admin");assert.equal(r.integration_check.status,"unknown");
  error(()=>write("retry_integration","DEMO-TASK-006",{integration_version:"i1",status_check_id:r.integration_check.status_check_id},"system_admin"),"AFF-40301");
});
test("confirmed postback retry invalidates query and preserves original ref",()=>{
  const before=q.detail("DEMO-TASK-022",{role:"system_admin"}).fields;
  const c=write("status_check","DEMO-TASK-022",{integration_version:"i1"},"system_admin").integration_check;
  write("retry_integration","DEMO-TASK-022",{integration_version:"i1",status_check_id:c.status_check_id},"system_admin");
  const after=q.detail("DEMO-TASK-022",{role:"system_admin"}).fields;assert.equal(after.external_ref,before.external_ref);assert.equal(after.attempt,2);assert.equal(after.status_check,null);
});
test("purpose scopes prevent signal release and credit propagation upgrades",()=>{
  error(()=>draft("DEMO-TASK-019",{conclusion:"change_request"}),"AFF-42201");
  error(()=>draft("DEMO-TASK-023",{conclusion:"change_request",target_level:"C3"}),"AFF-42201");
  draft("DEMO-TASK-021",{conclusion:"change_request",target_level:"C2"});
  draft("DEMO-TASK-002",{conclusion:"change_request"});
  const p=write("preview","DEMO-TASK-002",{draft_version:"d1"}).preview;assert.equal(p.case_refs[0].settlement_case_id,"DEMO-SET1");
});
test("history requires bounded dates, snapshots reject changed filters",()=>{
  error(()=>q.list({status_group:"all"},{role:"risk"}),"AFF-40001");
  const a=q.list({scope:"mine"},{role:"risk"});
  error(()=>q.list({scope:"mine",q:"other",snapshot_id:a.meta.snapshot_id},{role:"risk"}),"AFF-40901");
  const x=q.list({scope:"mine"},{role:"risk",scenario:"stats_error"});assert.equal(x.summary.mine_active_count,null);assert.ok(x.items.length);
});
test("risk source creation reuses the same task identity across entries",()=>{
  const request={source_ref:{kind:"event",id:"DEMO-E01"},task_purpose:"signal_review",reason:"已核验可信事件来源与结算案件，发起复核",request_id:"source1",idempotency_key:"source1"};
  const reused=q.ensureRiskTask(request,{role:"risk"});assert.equal(reused.task.task_id,"DEMO-T01");assert.equal(reused.reused,true);
  write("claim","DEMO-T01");assert.equal(q.toRiskRows("risk").find(t=>t.id==="DEMO-T01").status,"processing");
  const fresh=q.ensureRiskTask({...request,source_ref:{kind:"cluster",id:"DEMO-G01"},task_purpose:"cluster_member_correction",request_id:"source2",idempotency_key:"source2"},{role:"risk"});
  assert.equal(fresh.reused,false);assert.equal(q.detail(fresh.task.task_id,{role:"risk"}).task_purpose,"cluster_member_correction");
  error(()=>q.ensureRiskTask({...request,source_ref:{kind:"blacklist",id:"DEMO-BL02"},task_purpose:"blacklist_remove",request_id:"source3",idempotency_key:"source3"},{role:"risk"}),"AFF-42201");
  error(()=>q.ensureRiskTask(request,{role:"operations"}),"AFF-40301");
});
test("batch fault is isolated and failed items can use the same request",()=>{
  write("claim","DEMO-TASK-001");
  const t=q.detail("DEMO-TASK-024",{role:"risk"}),payload={expected_version:t.version,request_id:"batch-fail",idempotency_key:"batch-fail"};
  error(()=>q.write("claim",t.task_id,payload,{role:"risk",scenario:"batch_partial"}),"AFF-40901");
  write("claim","DEMO-TASK-027");
  assert.equal(q.write("claim",t.task_id,payload,{role:"risk"}).task.workflow_state,"processing");
});
test("export requires independent approval and protects formulas",()=>{
  const e=q.write("export",null,{request_id:"export",idempotency_key:"export",purpose:"用于审核当前授权范围内的任务处理情况",query:{scope:"authorized"}},{role:"risk"}).export;
  error(()=>q.write("download_export",e.export_id,{request_id:"dl0",idempotency_key:"dl0"},{role:"risk"}),"AFF-42201");
  const a=q.approvals({role:"compliance"}).find(x=>x.export_id===e.export_id);
  write("approve",a.approval_id,{node_id:"node-1",expected_node_version:"n1",reason:"已核验导出范围、列和授权，准予下载"},"compliance",{source_entry:"approval_queue"});
  const r=q.write("download_export",e.export_id,{request_id:"dl",idempotency_key:"dl"},{role:"risk"});
  assert.ok(r.csv.startsWith("\uFEFF"));assert.ok(r.csv.includes("'=1+1"));assert.ok(!r.csv.includes("DEMO-TOKEN"));
});
test("export uses the applied snapshot and selected visible columns",()=>{
  const query={scope:"mine",source_types:["risk_review"],q:"025"};
  const listing=q.list(query,{role:"risk"});
  const r=q.write("export",null,{request_id:"export-filter",idempotency_key:"export-filter",purpose:"用于审核当前已应用筛选条件的任务记录",snapshot_id:listing.meta.snapshot_id,applied_filter:query,scope:"mine",columns:["task","status","amount"]},{role:"risk"});
  assert.equal(r.export.row_count,1);assert.equal(r.export.columns.join(","),"task,status,amount");assert.match(r.export.filename,/^tasks_20261108_200000_/);
  error(()=>q.write("export",null,{request_id:"bad-column",idempotency_key:"bad-column",purpose:"用于测试导出列是否正确限制敏感资料",columns:["credentials"]},{role:"risk"}),"AFF-42201");
});
test("finance applicants complete the independent approval chain",()=>{
  draft("DEMO-TASK-005",{conclusion:"change_request",proposed_amount:"80.00"},"finance");
  const id=submit("DEMO-TASK-005","finance").approval.approval_id;
  let a=write("approve",id,{node_id:"node-1",expected_node_version:"n1",reason:"已逐案审核损失和证据范围，准予复核"},"risk_supervisor",{source_entry:"approval_queue"}).approval;
  assert.equal(a.nodes[1].role_code,"finance_reviewer");
  error(()=>write("approve",id,{node_id:"node-2",expected_node_version:"n1",reason:"申请人试图自行完成最终财务审批"},"finance",{source_entry:"approval_queue"}),"AFF-40301");
  a=write("approve",id,{node_id:"node-2",expected_node_version:"n1",reason:"独立核验余额和损失案件，批准抵扣方案"},"finance_reviewer",{source_entry:"approval_queue"}).approval;
  assert.equal(a.status,"approved");assert.notEqual(a.nodes[1].reviewer.user_id,a.applicant.user_id);assert.equal(q.detail("DEMO-TASK-005",{role:"finance"}).workflow_state,"pending_execution");
});
test("risk supervisors can request review without approving themselves",()=>{
  write("assign","DEMO-TASK-025",{target_team_id:"DEMO-RISK",target_user_id:"DEMO-RISK-LEAD",reason:"由风险主管负责此合成案件的调查复核"});
  draft("DEMO-TASK-025",{conclusion:"confirm"},"risk_supervisor");
  const id=submit("DEMO-TASK-025","risk_supervisor").approval.approval_id;
  assert.equal(q.approvals("risk_reviewer").find(a=>a.approval_id===id).nodes[0].role_code,"risk_reviewer");
  write("approve",id,{node_id:"node-1",expected_node_version:"n1",reason:"独立审核主管申请的逐案范围和证据"},"risk_reviewer",{source_entry:"approval_queue"});
  const a=write("approve",id,{node_id:"node-2",expected_node_version:"n1",reason:"审核财务影响及冻结保持策略，批准流转"},"finance",{source_entry:"approval_queue"}).approval;
  assert.equal(a.status,"approved");assert.notEqual(a.nodes[0].reviewer.user_id,a.applicant.user_id);
});
test("rejected approval preserves frozen context, decisions and cancellation",()=>{
  draft("DEMO-TASK-025",{conclusion:"confirm"});
  const id=submit("DEMO-TASK-025").approval.approval_id;
  const before=q.approvals("risk_supervisor").find(a=>a.approval_id===id);
  assert.equal(before.draft.action_plan[0].action,"confirm_event");assert.ok(before.preview.preview_hash);assert.equal(before.evidence[0].scan_status,"clean");assert.ok(before.source_scope.case_refs.length);
  const a=write("reject",id,{node_id:"node-1",expected_node_version:"n1",reason:"现有证据不足以支持处置，需要驳回补查"},"risk_supervisor",{source_entry:"approval_queue"}).approval;
  assert.equal(a.nodes[0].reason,"现有证据不足以支持处置，需要驳回补查");assert.equal(a.nodes[0].decided_at,q.clock);assert.equal(a.nodes[1].status,"cancelled");assert.equal(a.task_snapshot.workflow_state,before.task_snapshot.workflow_state);assert.equal(q.detail("DEMO-TASK-025",{role:"risk"}).settlement_status,"frozen");
  assert.ok(q.audit.some(item=>item.approval_id===id&&item.reason===a.nodes[0].reason));
});
test("hold extension creates a separate exact-scoped settlement recheck",()=>{
  const origin=q.detail("DEMO-TASK-004",{role:"risk"}),packet=origin.fields.release_recheck_source;
  const base={...packet,source_task_id:origin.task_id,task_purpose:"settlement_recheck",reason:"基于来源案件与精确限制版本，申请独立解除重检",request_id:"recheck1",idempotency_key:"recheck1"};
  const r=q.ensureRiskTask(base,{role:"risk"});
  assert.notEqual(r.task.task_id,origin.task_id);assert.equal(r.task.source_type,"settlement_overdue");assert.equal(r.task.task_purpose,"settlement_recheck");assert.equal(r.task.source_ref.case_ref.settlement_case_id,"DEMO-SET4");
  assert.equal(q.detail(origin.task_id,{role:"risk"}).workflow_state,origin.workflow_state);assert.equal(q.detail(origin.task_id,{role:"risk"}).version,origin.version);
  const duplicate=q.ensureRiskTask({...base,request_id:"recheck2",idempotency_key:"recheck2"},{role:"risk"});assert.equal(duplicate.reused,true);assert.equal(duplicate.task.task_id,r.task.task_id);
  error(()=>q.ensureRiskTask({...base,expected_source_version:"old",request_id:"recheck3",idempotency_key:"recheck3"},{role:"risk"}),"AFF-40901");
  error(()=>q.ensureRiskTask({...base,release_targets:[{restriction_id:"other",expected_restriction_version:"r1"}],request_id:"recheck4",idempotency_key:"recheck4"},{role:"risk"}),"AFF-42201");
  error(()=>q.ensureRiskTask({...base,case_ref:{...base.case_ref,customer_id:"other"},request_id:"recheck5",idempotency_key:"recheck5"},{role:"risk"}),"AFF-42201");
  error(()=>q.ensureRiskTask({...base,request_id:"recheck6",idempotency_key:"recheck6"},{role:"finance"}),"AFF-40301");
});
test("export approval preserves purpose and the complete frozen scope",()=>{
  const query={scope:"mine",q:"025"},listing=q.list(query,{role:"risk"}),purpose="用于产品评审当前任务的处理进度和责任范围";
  const r=q.write("export",null,{request_id:"freeze-export",idempotency_key:"freeze-export",purpose,applied_filter:query,snapshot_id:listing.meta.snapshot_id,columns:["task","status"],sort:{field:"default",direction:"asc"}},{role:"risk"});
  const a=q.approvals("compliance").find(a=>a.approval_id===r.approval.approval_id);
  assert.equal(a.export_scope.purpose,purpose);assert.equal(a.export_scope.scope,"mine");assert.equal(a.export_scope.applied_filter.q,"025");assert.equal(a.export_scope.snapshot_id,listing.meta.snapshot_id);assert.equal(a.export_scope.columns.join(","),"task,status");assert.equal(a.export_scope.row_count,1);assert.equal(a.export_scope.export_id,r.export.export_id);
  error(()=>q.write("export",null,{request_id:"no-purpose",idempotency_key:"no-purpose"},{role:"risk"}),"AFF-42201");
});
test("offboarding links to its actual partner object and close results stay typed",()=>{
  const t=q.detail("DEMO-TASK-020",{role:"operations"});
  assert.equal(t.business_jump_url,t.fields.business_jump_url);assert.match(t.business_jump_url,/^#\/admin-modules\/partner-list\/partner-1003\?drawer_tab=offboarding/);
  assert.equal(q.detail("DEMO-TASK-025",{role:"audit"}).allowed_actions.length,0);
  error(()=>write("assign","DEMO-TASK-025",{target_team_id:"DEMO-RISK",target_user_id:null,reason:"测试不允许用空目标把处理中任务退池"}),"AFF-42201");
  const closed=write("close","DEMO-TASK-025",{reason_code:"source_withdrawn",source_receipt_ref:"DEMO-SOURCE-RECEIPT",reason:"来源服务已确认撤销此工作事项并保留限制"},"risk_supervisor").task;
  assert.equal(closed.result,"withdrawn");validateSchema(closed,schema);
});
test("all extension fixtures expose only trusted independent recheck sources",()=>{
  for(const fixture of q.peek().tasks.filter(t=>t.source_type==="hold_extend")) {
    const t=q.detail(fixture.task_id,{role:"risk"}),source=t.fields.release_recheck_source;
    assert.equal(source.source_ref.kind,"settlement_case");assert.equal(source.source_ref.id,source.case_ref.settlement_case_id);assert.ok(source.release_targets.length);assert.ok(source.expected_source_version);assert.match(source.source_path,/^#\/tasks\?task_id=/);
    assert.ok(t.draft.action_plan.every(item=>item.action!=="release_and_recheck"));
  }
});
test("waiting material cannot return to pool and invalidated closure preserves funds",()=>{
  const t=q.detail("DEMO-TASK-003",{role:"risk"});
  assert.equal(t.allowed_actions.find(a=>a.action==="return_pool").enabled,false);
  error(()=>write("return_pool",t.task_id,{reason:"测试等待材料时不允许改变任务责任归属"}),"AFF-40301");
  assert.equal(q.detail(t.task_id,{role:"risk"}).workflow_state,"waiting_material");
  const result=write("close","DEMO-TASK-025",{reason_code:"object_invalidated",source_receipt_ref:"DEMO-INVALIDATION-RECEIPT",reason:"来源服务确认对象已经失效，仅关闭工作事项"},"risk_supervisor").task;
  assert.equal(result.result,"invalidated");assert.equal(result.funds_status,"frozen");validateSchema(result,schema);
});
test("preview routing exactly matches ordinary and independent approval nodes",()=>{
  for(const role of ["risk","risk_supervisor","finance"]) {
    q.reset();
    const id=role==="finance"?"DEMO-TASK-005":"DEMO-TASK-025";
    if(role==="risk_supervisor")write("assign",id,{target_team_id:"DEMO-RISK",target_user_id:"DEMO-RISK-LEAD",reason:"转交主管发起申请并验证独立复核路由"});
    draft(id,role==="finance"?{conclusion:"change_request",proposed_amount:"80.00"}:{conclusion:"confirm"},role);
    const t=q.detail(id,{role}),p=write("preview",id,{draft_version:t.draft_version},role).preview;
    const result=write("submit_review",id,{draft_version:t.draft_version,preview_id:p.preview_id,preview_hash:p.preview_hash,self_review:false,impact_confirmation:true},role);
    assert.equal(p.required_approver_roles.join(","),result.approval.nodes.map(node=>node.role_code).join(","));
    if(role==="finance")assert.equal(p.required_approver_roles[1],"finance_reviewer");
    if(role==="risk_supervisor")assert.equal(p.required_approver_roles[0],"risk_reviewer");
  }
});
test("event sources cannot create incomplete settlement rechecks",()=>{
  const before=q.peek().tasks.length;
  error(()=>q.ensureRiskTask({source_ref:{kind:"event",id:"DEMO-E01"},task_purpose:"settlement_recheck",reason:"试图从事件来源直接发起不完整结算重检任务",request_id:"event-recheck",idempotency_key:"event-recheck"},{role:"risk"}),"AFF-42201");
  assert.equal(q.peek().tasks.length,before);
  const origin=q.detail("DEMO-TASK-004",{role:"risk"});
  const result=q.ensureRiskTask({...origin.fields.release_recheck_source,source_task_id:origin.task_id,task_purpose:"settlement_recheck",reason:"从可信结算案件来源创建完整独立重检任务",request_id:"trusted-recheck",idempotency_key:"trusted-recheck"},{role:"risk"});
  assert.equal(result.task.source_ref.kind,"settlement_case");assert.ok(result.task.fields.release_targets.length);
});
console.log(`${n} task queue domain checks passed`);
