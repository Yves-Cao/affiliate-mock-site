"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");
const storage=new Map(),events={},historyWrites=[];
const sandbox={
  window:{addEventListener(){},scrollY:80,scrollTo(){}},console,Date,JSON,BigInt,URLSearchParams,URL,
  location:{hash:"#/tasks?scope=authorized&page=2&task_id=DEMO-TASK-002"},navigator:{onLine:true},
  crypto:require("node:crypto").webcrypto,
  sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  document:{addEventListener(name,fn){events[name]=fn;},querySelector:()=>null},
  history:{replaceState(...args){historyWrites.push(args[2]);},pushState(){}},
  requestAnimationFrame:fn=>fn(),setInterval(){},setTimeout(){},clearTimeout(){},queueMicrotask(){}
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,"admin-prototype-data.js"),"utf8"),sandbox);
const q=sandbox.window.AFF_ADMIN_PROTOTYPE.taskQueue,ctx={role:"risk_supervisor"};
let affected=q.affectedObjects("DEMO-TASK-001",ctx);
for(const id of ["DEMO-C1","DEMO-P1"])assert.ok(affected.items.some(i=>i.id===id),id);
assert.equal(new Set(affected.items.map(i=>`${i.type}:${i.id}`)).size,affected.items.length);
affected=q.affectedObjects("DEMO-T04",ctx);
for(const id of ["DEMO-C01","DEMO-C02","DEMO-P01"])assert.ok(affected.items.some(i=>i.id===id),id);
const customer=q.reviewObject("DEMO-T01","customer","DEMO-C01",ctx);
assert.equal(customer.profile.id,"DEMO-C01");
assert.equal(customer.partner.id,"DEMO-P01");
assert.ok(customer.profile.email_masked.includes("***"));
assert.ok(customer.profile.phone_masked.includes("***"));
assert.equal(customer.cases.length,2,"Show the other case without treating it as affected");
const first=customer.cases.find(i=>i.settlement_case_id==="DEMO-ST01"),second=customer.cases.find(i=>i.settlement_case_id==="DEMO-ST02");
assert.equal(first.amount,"100.00");assert.equal(first.status,"frozen");assert.equal(first.in_task_scope,true);
assert.equal(second.amount,"50.00");assert.equal(second.status,"holding");assert.equal(second.in_task_scope,false);
assert.equal(customer.profile.account_facts.net_deposit,"900.00");
const partner=q.reviewObject("DEMO-T01","partner","DEMO-P01",ctx);
assert.deepEqual(Array.from(partner.customers,c=>c.id),["DEMO-C01","DEMO-C02"]);
assert.equal(q.reviewObject("DEMO-T01","customer","DEMO-C02",ctx).profile.name,"Pim S.");
assert.notEqual(q.reviewObject("DEMO-TASK-001","customer","DEMO-C1",ctx).profile.name,customer.profile.name);
assert.throws(()=>q.reviewObject("DEMO-T01","customer","client-2001",ctx),e=>e.code==="AFF-40301");
assert.throws(()=>q.reviewObject("DEMO-T01","customer","missing",ctx),e=>e.code==="AFF-40301");
assert.throws(()=>q.reviewObject("DEMO-T01","customer","DEMO-C01",{role:"finance"}),e=>e.code==="AFF-40301");
assert.throws(()=>q.reviewObject("DEMO-T01","customer","DEMO-C01",{...ctx,scenario:"revoked"}),e=>e.code==="AFF-40301");
assert.equal(q.affectedObjects("DEMO-T01",{role:"system_admin"}).items.every(i=>!i.available),true);
assert.ok(q.reviewObject("DEMO-TASK-005","partner","DEMO-P1",{role:"finance"}));
assert.ok(q.reviewObject("DEMO-TASK-012","customer","DEMO-C1",{role:"operations"}));
assert.ok(q.reviewObject("DEMO-TASK-006","customer","DEMO-C1",{role:"system_admin"}));
assert.throws(()=>q.reviewObject("DEMO-T01","customer","DEMO-C01",{...ctx,scenario:"offline"}),e=>e.code==="AFF-50301");
const ui=fs.readFileSync(path.join(root,"admin-dev.js"),"utf8");
const boot="state.savedViews = loadSavedViews();\n  syncFromHash();render();";
assert.ok(ui.includes(boot));
vm.runInContext(ui.replace(boot,"render=()=>{};window.objectUI={state,tq,tqAffectedObjects,tqOpenObject,tqReturnFromObject,tqRestoreInspection,taskObjectPage,pageMain,taskQueueBeforeLeave,parseHash,tqEnsure};"),sandbox);
const a=sandbox.window.objectUI;
a.state.role="risk_supervisor";a.state.scenario="normal";a.tq.role="risk_supervisor";a.tq.taskId="DEMO-TASK-002";
a.tq.form={reason:"尚未保存的核验说明",evidence_ids:["evidence-selected"]};a.tq.dirty=true;a.tq.detailTab="processing";
const origin=sandbox.location.hash;
a.tqOpenObject("customer","DEMO-C1","DEMO-TASK-002");
assert.equal(a.taskQueueBeforeLeave(sandbox.location.hash),true,"Inspection must preserve dirty work without forcing discard");
const parsed=a.parseHash();Object.assign(a.state,parsed);
let html=a.taskObjectPage();
for(const text of ["Arun S.","DEMO-C1","ar***","返回原任务"]) {
  assert.ok(html.includes(text),text);
}
a.state.tabId="finance";html=a.taskObjectPage();
assert.ok(html.includes("来源未提供")&&!html.includes("USD 250.00"),"Do not treat task impact as the customer's account balance");
for(const tab of ["overview","attribution","finance","risk","events"]){
  a.state.tabId=tab;assert.ok(a.taskObjectPage().includes("返回原任务"),tab);
}
a.state.tabId="overview";
a.tqOpenObject("partner","DEMO-P1","DEMO-TASK-002");
assert.equal(a.tq.inspection.returnHash,origin,"Cross-object navigation must keep the original task");
Object.assign(a.state,a.parseHash());
for(const tab of ["overview","promotion","compliance","finance","risk","follow-up"]){
  a.state.tabId=tab;assert.ok(a.taskObjectPage().includes("Aurora Partner Network"),tab);
}
a.tq.hashSeen=origin;
const writesBeforeGuard=historyWrites.length;
assert.equal(a.taskQueueBeforeLeave("#/admin-config"),false,"Unrelated navigation from an object page must protect unsaved work");
assert.equal(historyWrites.length,writesBeforeGuard,"A pre-navigation guard must not replace the object URL with the last task URL");
assert.ok(a.pageMain().includes("未保存的修改"),"The navigation guard dialog must actually render on the object page");
assert.ok(a.pageMain().includes('data-tq-action="unsaved_keep"'));
a.tq.dialog=null;
a.tqReturnFromObject();
assert.equal(sandbox.location.hash,origin);
assert.equal(a.tq.form.reason,"尚未保存的核验说明");
assert.equal(a.tq.form.evidence_ids[0],"evidence-selected");
assert.equal(a.tq.detailTab,"processing");assert.equal(a.tq.dirty,true);
a.tqRestoreInspection();
assert.equal(a.tq.inspection,null,"Returning to the task clears the completed inspection context");
const newOrigin="#/tasks?scope=authorized&page=3&task_id=DEMO-TASK-002";
sandbox.location.hash=newOrigin;Object.assign(a.state,a.parseHash());
a.tqOpenObject("customer","DEMO-C1","DEMO-TASK-002");
assert.equal(a.tq.inspection.returnHash,newOrigin,"Reopening under different filters uses the new task URL");
sandbox.location.hash=newOrigin;Object.assign(a.state,a.parseHash());a.tqRestoreInspection();
assert.equal(a.tq.inspection,null,"Browser-back restoration clears the memo too");
assert.equal(a.taskQueueBeforeLeave("#/admin-config"),false,"Leaving the review flow still protects unsaved work");
a.tq.dialog=null;a.tq.dirty=false;
a.tq.inspection=null;
Object.assign(a.state,{routeId:"customer-360",detailId:"DEMO-C1"});
sandbox.location.hash=`#/customer-360/DEMO-C1?task_id=DEMO-TASK-002&return_to=${encodeURIComponent(origin)}`;
a.tqOpenObject("partner","DEMO-P1","DEMO-TASK-002");
assert.equal(a.tq.inspection.returnHash,origin,"Reloaded object pages must not nest their own route into return_to");
assert.ok(a.tqAffectedObjects("DEMO-T04").includes('data-object-id="DEMO-C02"'));
Object.assign(a.state,{routeId:"customer-360",detailId:"<script>wrong</script>",tabId:"overview"});
sandbox.location.hash="#/customer-360/wrong?task_id=DEMO-T01";
html=a.taskObjectPage();
assert.ok(html.includes("关联资料无法查看")&&!html.includes("<script>"));
console.log("PASS task object drilldown: distinct identities, aggregation members, exact case scope/amounts, masked profiles, domain permission/revocation, cross-object navigation and unsaved task return");
