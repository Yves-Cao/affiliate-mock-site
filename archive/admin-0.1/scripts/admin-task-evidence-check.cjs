"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");
const storage=new Map();
const localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
const sandbox={
  window:{addEventListener(){},localStorage},console,Date,JSON,BigInt,URLSearchParams,URL,
  location:{hash:"#/tasks"},navigator:{onLine:true},
  crypto:require("node:crypto").webcrypto,
  sessionStorage:{getItem:key=>storage.get(`session:${key}`)||null,setItem:(key,value)=>storage.set(`session:${key}`,value)},localStorage,
  document:{addEventListener(){},querySelector:()=>null},
  setInterval(){},setTimeout(){},clearTimeout(){},queueMicrotask(){}
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,"admin-prototype-data.js"),"utf8"),sandbox);
const q=sandbox.window.AFF_ADMIN_PROTOTYPE.taskQueue;
let seq=0;
function access(id,role="risk_supervisor",extra={},context={}) {
  const token=`evidence-${++seq}`;
  const task=q.detail(id,{role});
  return q.write("access_evidence",id,{
    request_id:token,idempotency_key:token,expected_version:task.version,
    evidence_id:`${id}-EVIDENCE1`,purpose:"preview",...extra
  },{role,...context});
}
const id="DEMO-TASK-002";
const source=q.detail(id,{role:"risk_supervisor"});
assert.equal(source.evidence_refs[0].content,undefined,"List response must not contain evidence body");
const preview=access(id);
const evidence=preview.evidence;
assert.equal(evidence.task_id,id);
assert.equal(evidence.source_ref.id,source.source_ref.id);
assert.equal(evidence.snapshot_version,source.version);
assert.deepEqual(evidence.detail.business_facts,source.sections.processing.fields);
assert.deepEqual(evidence.detail.records[0].rows,source.case_refs);
assert.ok(evidence.content.includes("250.00")&&evidence.content.includes("DEMO-SET1"));
assert.ok(!evidence.content.includes("仅用于管理端交互验收"));
const finance=access("DEMO-TASK-005","finance").evidence;
assert.equal(finance.detail.business_facts.loss_amount.amount,"100.00");
assert.equal(finance.detail.business_facts.available_reserve.amount,"80.00");
assert.notEqual(finance.content,evidence.content,"Different task types must have different evidence");
const download=access(id,"risk_supervisor",{purpose:"download"}).evidence;
assert.equal(download.content,evidence.content,"Downloaded snapshot must match preview");
assert.equal(q.receipt(preview.receipt.request_id,{role:"risk_supervisor"}).result.evidence,undefined);
assert.ok(storage.has("session:affiliate:admin:task-queue-state"),"Exercise the real persisted queue state");
assert.ok([...storage.values()].every(value=>!value.includes('"detail":{"summary":')),
  "Evidence body must not enter persistent receipts or idempotency cache");
assert.throws(()=>access(id,"risk_supervisor",{evidence_id:"DEMO-TASK-005-EVIDENCE1"}),e=>e.code==="AFF-40401");
assert.throws(()=>access(id,"finance"),e=>e.code==="AFF-40301");
assert.equal(q.detail(id,{role:"system_admin"}).evidence_refs[0].access.preview,false);
assert.throws(()=>access(id,"system_admin"),e=>e.code==="AFF-40301");
assert.ok(access("DEMO-TASK-006","system_admin").evidence.detail.business_facts.external_ref);
assert.ok(access("DEMO-TASK-012","operations").evidence.detail.business_facts.crm_attribution);
sandbox.window.AFF_ADMIN_PROTOTYPE.demoPolicy.approvalRequired=true;
assert.equal(access(id,"audit").evidence.access.download,false);
assert.throws(()=>access(id,"audit",{purpose:"download"}),e=>e.code==="AFF-40301");
sandbox.window.AFF_ADMIN_PROTOTYPE.demoPolicy.approvalRequired=false;
for(const [scenario,code] of [["evidence_missing","AFF-40401"],["evidence_pending","AFF-42201"],["evidence_invalidated","AFF-42201"],["revoked","AFF-40301"]]) {
  assert.throws(()=>access(id,"risk_supervisor",{}, {scenario}),e=>e.code===code,scenario);
}
assert.throws(()=>access(id,"risk_supervisor",{purpose:"execute"}),e=>e.code==="AFF-40001");
const cachedBody={request_id:"repeat-preview",idempotency_key:"repeat-preview",expected_version:source.version,evidence_id:`${id}-EVIDENCE1`,purpose:"preview"};
q.write("access_evidence",id,cachedBody,{role:"risk_supervisor"});
assert.throws(()=>q.write("access_evidence",id,cachedBody,{role:"risk_supervisor",scenario:"revoked"}),e=>e.code==="AFF-40301",
  "Repeated preview must recheck permission rather than return cached content");
assert.ok(q.audit.some(entry=>entry.action==="evidence_access"&&entry.evidence_id===evidence.evidence_id&&entry.purpose==="download"));

const ui=fs.readFileSync(path.join(root,"admin-dev.js"),"utf8");
const boot="state.savedViews = loadSavedViews();\n  syncFromHash();render();";
assert.ok(ui.includes(boot));
vm.runInContext(ui.replace(boot,"window.evidenceUI={tq,tqEvidenceBody,tqEvidenceItems,tqDialog,tqProcessingForm};"),sandbox);
const a=sandbox.window.evidenceUI;
a.tq.options={timezone:"Asia/Shanghai"};a.tq.taskId=id;a.tq.form={evidence_ids:[]};
let html=a.tqEvidenceBody(evidence);
for(const text of ["核验摘要","关联案件明细","业务依据","250.00","DEMO-SET1","当前累计天数"])assert.ok(html.includes(text),text);
assert.ok(html.includes("<table>"),"Case records must render as a usable table");
assert.equal(a.tqEvidenceItems({evidence_refs:[],sections:{evidence:{items:[{evidence_id:"section-only"}]}}})[0].evidence_id,"section-only");
const malicious=JSON.parse(JSON.stringify(evidence));
malicious.detail.summary="<img src=x onerror=alert(1)>";
malicious.detail.records[0].rows[0].customer_id="<script>attack()</script>";
html=a.tqEvidenceBody(malicious);
assert.ok(!html.includes("<script>")&&!html.includes("<img src=x"));
assert.ok(html.includes("&lt;script&gt;")&&html.includes("&lt;img"));
a.tq.dialog={kind:"evidence",evidence:{...evidence,access:{preview:true,download:false}}};
assert.ok(!a.tqDialog().includes('data-tq-action="download_evidence"'));
a.tq.dialog={kind:"evidence",evidence};
assert.ok(a.tqDialog().includes('data-tq-action="download_evidence"'));
assert.ok(a.tqProcessingForm({...source,evidence_refs:[],sections:{processing:{},evidence:{items:[]}}}).includes("暂无可引用证据"));
console.log("PASS task evidence: task-specific facts/cases, matching download, safe text, fallback, empty state, role/scan/revocation checks, audit and no persistent body cache");
