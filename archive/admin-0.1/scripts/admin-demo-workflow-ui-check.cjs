"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../admin-dev.js"),"utf8");
function pick(start,end) {
  const from=source.indexOf(`  function ${start}(`);
  const to=source.indexOf(`  function ${end}(`,from);
  assert.ok(from>=0&&to>from);
  return source.slice(from,to);
}
let demo=true;
const writes=[];
const task={task_id:"TASK-DEMO",version:2,draft_version:1,workflow_state:"processing",impact:{amount:"20.00"},source_type:"risk_review"};
const sandbox={
  console,URLSearchParams,navigator:{onLine:true},location:{hash:"#/workbench"},
  state:{scenario:"normal",role:"risk_supervisor"},
  tq:{detail:task,form:{conclusion:"confirm"},preview:{preview_id:"preview-1",preview_hash:"hash-1"},options:{current_user:{user_id:"supervisor"}}},
  tqConclusions:{confirm:"确认"},demoSkipsApproval:()=>demo,h:value=>String(value??""),
  tqT:zh=>zh,tqFacts:value=>JSON.stringify(value),tqButton:(action,label)=>`<button data-tq-action="${action}">${label}</button>`,
  tqIconButton:()=>"",tqModalInput:undefined,tqActiveColumns:()=>[],tqEnsure:()=>true,tqContext:()=>({}),
  tqService:()=>({approvals:()=>[{approval_id:"APP-1",task_id:"TASK-DEMO",status:"pending_approval",draft:{reason:"核验原因"}}]}),
  tqApprovalScope:()=>"<p>处置摘要</p>",tqBadge:value=>value,
  tqPayload:(row,extra={})=>({expected_version:row?.version,...extra}),
  tqWrite:(action,id,payload)=>{writes.push({action,id,payload});return {task_id:id,workflow_state:"pending_execution"};},
  tqRead(){},tqReadDetail(){},render(){},
  tqFormFromTask:()=>({}),tqWriteButton:(row,action,label)=>`<button data-action="${action}">${label}</button>`,
  tqFormField:()=>"",statusLabel:value=>value,prototype:{},
};
vm.createContext(sandbox);
const chunks=[
  pick("tqDetailFooter","taskQueueOverlay"),pick("tqModalInput","tqOpenTask"),
  pick("tqConfirmDialog","tqApprovalScope"),pick("taskQueueApprovalPage","tqNavigate"),
  pick("riskTaskActionPanel","riskTaskActionDetail"),pick("riskApprovalPanel","riskDetailDrawer")
].join("\n");
vm.runInContext(`${chunks}\nthis.ui={tqDialog,tqConfirmDialog,tqDetailFooter,taskQueueApprovalPage,riskTaskActionPanel,riskApprovalPanel};`,sandbox);
const ui=sandbox.ui;
sandbox.tq.dialog={kind:"submit_review",form:{confirmed:true}};
let html=ui.tqDialog();
assert.ok(html.includes("提交执行"));
assert.ok(!html.includes("进入审批"));
ui.tqConfirmDialog();
assert.equal(writes.at(-1).action,"submit_review");
assert.equal(writes.at(-1).payload.self_review,false);
assert.ok(!sandbox.tq.notice.includes("等待审批"));
sandbox.tq.dialog={kind:"resume_without_review",form:{confirmed:true,reason:"已经核对案件范围和原始处置依据"}};
assert.ok(ui.tqDialog().includes("继续处理原因"));
ui.tqConfirmDialog();
assert.equal(writes.at(-1).action,"resume_without_review");
assert.equal(writes.at(-1).payload.impact_confirmation,true);
assert.equal(writes.at(-1).payload.reason,"已经核对案件范围和原始处置依据");
assert.ok(ui.tqDetailFooter({...task,workflow_state:"pending_approval"}).includes("resume_without_review"));
html=ui.taskQueueApprovalPage();
assert.ok(html.includes("历史审批记录"));
assert.ok(html.includes('data-tq-linked-task="TASK-DEMO"'));
assert.ok(!html.includes('data-tq-action="approve"'));
sandbox.tq.dialog={kind:"export_result",exportId:"EX-1"};
assert.ok(ui.tqDialog().includes("导出文件已生成"));
assert.ok(!ui.tqDialog().includes("审批完成后"));
sandbox.state.riskWorkbenchAction={kind:"submit",taskId:"TASK-DEMO",form:{conclusion:"confirm",reason:"已核对",confirmed:true},preview:{preview_id:"preview-1"}};
html=ui.riskTaskActionPanel({id:"TASK-DEMO"},task);
assert.ok(html.includes("提交执行"));
assert.ok(!html.includes("提交审批"));
html=ui.riskApprovalPanel({approval_id:"APP-1",task_id:"TASK-DEMO",status:"pending_approval",draft:{reason:"核验依据"}});
assert.ok(html.includes("查看任务与执行"));
assert.ok(!html.includes("通过当前节点"));
demo=false;
sandbox.tq.dialog={kind:"submit_review",form:{}};
assert.ok(ui.tqDialog().includes("提交审批"),"normal mode must retain approval");
console.log("PASS demo workflow UI: direct submission, historical continuation, readonly approvals, exports and normal-mode preservation");
