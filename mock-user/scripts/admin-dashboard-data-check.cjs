"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname,"../admin-dev.js"),"utf8");
const names = ["dashboardNow","dashboardPeriod","dashboardInPeriod","dashboardClients","dashboardCommissions","dashboardTaskRows","dashboardQueueRows","dashboardApprovals","dashboardSnapshot","dashboardDrillMatches","dashboardTrendData","dashboardFundsData"];
const functions = names.map(name => {
  const start = source.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, `${name} exists`);
  const end = source.indexOf("\n  function ",start + 1);
  assert.ok(end > start, `${name} has a bounded source section`);
  return source.slice(start,end);
}).join("\n");
const clients = [
  {id:"c1",stage:"valid_ftd",ftdAmount:500,attribution:{attributedAt:"2026-11-09 09:00"}},
  {id:"c2",stage:"ftd",ftdAmount:100,attribution:{attributedAt:"2026-11-08 09:00"}},
  {id:"c3",stage:"registered",ftdAmount:0,attribution:{attributedAt:"2026-11-03 09:00"}},
  {id:"c4",stage:"valid_ftd",ftdAmount:600,attribution:{attributedAt:"2026-10-01 09:00"}}
];
const tasks = [
  {id:"t1",name:"客户信息核实",status:"processing",ownerRole:"operations",amount:250,source_type:"attribution_review"},
  {id:"t2",name:"结算复核",status:"pending_approval",ownerRole:"finance",amount:100,source_type:"commission_exception"},
  {id:"t3",name:"已完成核实",status:"done",ownerRole:"operations",amount:150},
  {id:"t4",name:"已关闭核实",status:"closed",ownerRole:"operations",amount:150},
  {id:"t5",name:"边界金额样本",status:"processing",ownerRole:"operations",amount:1e18,boundary_sample:true},
  {id:"t6",name:"回传恢复",status:"execution_failed",ownerRole:"system_admin",amount:0,source_type:"integration",overdue:true}
];
const prototype = {
  client360:{clients},
  partner360:{partners:[{id:"p1",stage:"reviewing"},{id:"p2",stage:"onboarded"},{id:"p3",stage:"applying"}]},
  funds360:{
    commissions:[{id:"cm1",amount:200,updated:"2026-11-09 10:00",status:"pending"},{id:"cm2",amount:100,updated:"2026-11-08 10:00",status:"blocked"},{id:"cm3",amount:50,updated:"2026-10-01 10:00",status:"released"}],
    statements:[{id:"s1",guarantee:20,status:"confirmed"},{id:"s2",guarantee:30,status:"paid"},{id:"s3",guarantee:99,status:"draft"}],
    withdrawals:[{id:"w1",status:"pending"},{id:"w2",status:"failed"},{id:"w3",status:"success"}],
    reconciliations:[{id:"r1",status:"reconcile_failed",diff:10},{id:"r2",status:"success",diff:0}]
  },
  taskQueue:{
    toLegacyRows:()=>tasks,
    options:()=>({current_user:{user_id:"u1"}}),
    approvals:()=>[{status:"pending_approval",current_node_index:0,nodes:[{role_code:"operations",status:"pending"}]}]
  }
};
const context = {
  prototype,state:{role:"operations",dashboardRange:"last7",workbenchQueue:"all",dashboardStatus:""},
  demoSkipsApproval:()=>false,
  window:{AFF_ADMIN_CLOCK:{now:()=>Date.parse("2026-11-09T12:00:00+08:00")}},
  location:{hash:"#/admin-workbench"},Date,URLSearchParams,Intl,Number,Set,
  dashboardRangeLabels:{today:"今日",last7:"最近7天"},compact:n=>String(n),money:n=>`$${n}`,
  statusLabel:v=>v,roleOwnerNames:{operations:"运营"},seedRows:()=>tasks
};
vm.createContext(context);
vm.runInContext(functions,context);
const totals = context.dashboardTrendData();
assert.equal(totals.reduce((sum,row)=>sum+row.clients,0),3,"seven-day cohort uses actual attribution records");
assert.equal(totals.reduce((sum,row)=>sum+row.ftd,0),2);
assert.equal(totals.reduce((sum,row)=>sum+row.valid,0),1);
const seven = context.dashboardSnapshot();
assert.equal(seven[0][1],"3");
assert.equal(seven[1][1],"2");
assert.equal(seven[2][1],"1");
assert.equal(seven[3][1],"$300");
assert.equal(seven[4][1],"2");
context.state.dashboardRange="today";
const today = context.dashboardSnapshot();
assert.equal(today[0][1],"1");
assert.equal(today[1][1],"1");
assert.equal(today[3][1],"$200");
assert.equal(context.dashboardTaskRows().length,3,"ordinary queue excludes terminal and marked boundary fixtures");
assert.equal(context.dashboardQueueRows("mine").length,1,"mine counts the same active queue");
assert.equal(context.dashboardQueueRows("integrations").length,1);
assert.equal(context.dashboardQueueRows("overdue").length,1);
const reserve = context.dashboardFundsData().find(row=>row[0]==="已计提保证金");
assert.equal(reserve[1],"$50","reserve amount comes only from confirmed/paid statement entries");
assert.match(reserve[3],/statement-list/);
assert.doesNotMatch(reserve[3],/guarantee-offset/);
context.location.hash="#/admin-modules/client-list?dashboard_metric=valid&dashboard_from=2026-11-03&dashboard_to=2026-11-09";
assert.equal(context.dashboardDrillMatches({clientRef:clients[0]}),true);
assert.equal(context.dashboardDrillMatches({clientRef:clients[1]}),false);
assert.equal(context.dashboardDrillMatches({clientRef:clients[3]}),false);
context.location.hash="#/admin-modules/statement-list?dashboard_metric=reserve";
assert.equal(context.dashboardDrillMatches({status:"draft"}),false);
assert.equal(context.dashboardDrillMatches({status:"paid"}),true);
context.state.dashboardRange="lastMonth";
assert.equal(context.dashboardPeriod().from,"2026-10-01");
assert.equal(context.dashboardPeriod().to,"2026-10-31");
assert.equal(context.dashboardClients().length,1);
context.state.dashboardRange="month";
assert.equal(context.dashboardPeriod().from,"2026-11-01");
assert.equal(context.dashboardPeriod().to,"2026-11-09");
context.state.dashboardRange="yesterday";
assert.equal(context.dashboardClients().length,1);
assert.equal(context.dashboardClients()[0].id,"c2");
const actual={window:{},console,Date,JSON,BigInt,URLSearchParams};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../admin-prototype-data.js"),"utf8"),actual);
context.prototype=actual.window.AFF_ADMIN_PROTOTYPE;
context.state.dashboardRange="last7";
context.location.hash="#/admin-workbench";
for (const role of ["operations","finance","risk_supervisor","system_admin"]) {
  context.state.role=role;
  const current=context.dashboardTaskRows();
  assert.ok(current.every(row=>!["done","closed"].includes(row.status)));
  assert.equal(context.dashboardQueueRows("all").length,current.length);
  const snapshot=context.dashboardSnapshot();
  assert.equal(snapshot.length,5);
  assert.ok(snapshot.every(row=>row[3] && !String(row[1]).includes("NaN")));
}
const css=fs.readFileSync(path.join(__dirname,"../admin-dev.css"),"utf8");
assert.match(css,/\.dash-v2-table \.dash-v2-action\s*\{[^}]*position:\s*sticky[^}]*right:\s*0/s,"dashboard action column is sticky");
console.log("PASS dashboard summary, cohort trend, queue, funds, period and drill-down consistency");
