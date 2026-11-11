"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
let chromium;
try {
  ({chromium} = require("playwright"));
} catch {
  ({chromium} = require(path.join(process.env.HOME, "Documents/Affiliate/.tmp-mock-site/node_modules/playwright")));
}

const root = path.resolve(__dirname, "..");
const artifactDir = path.join(root, ".artifacts/admin-support");
const mime = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml"};
const report = {
  generated_at:new Date().toISOString(),
  cases:[],
  screenshots:[],
  page_errors:[],
  limitations:[
    "Acceptance identifiers map exercised browser branches; they do not claim every sub-assertion in the referenced acceptance requirement.",
    "Browser tests use the unified local prototype service. Production HTTP integration, real file scanning, CRM and notification delivery are outside this evidence."
  ]
};
const widths = [1440,1280,1279,900,767,480,390];

async function createStaticServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
      if (pathname === "/favicon.ico") {response.writeHead(204);response.end();return;}
      const file = path.resolve(root, `.${pathname === "/" ? "/admin-dev.html" : pathname}`);
      assert.ok(file.startsWith(`${root}${path.sep}`), "Forbidden");
      const content = await fs.readFile(file);
      response.writeHead(200, {"Content-Type":mime[path.extname(file)] || "application/octet-stream","Cache-Control":"no-store"});
      response.end(content);
    } catch (error) {
      response.writeHead(error.message === "Forbidden" ? 403 : 404);
      response.end(error.message);
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return server;
}

async function runCase(name, acceptance, fn) {
  const started = Date.now();
  try {
    await fn();
    report.cases.push({name,acceptance,status:"passed",duration_ms:Date.now() - started});
    console.log(`PASS ${name}`);
  } catch (error) {
    report.cases.push({name,acceptance,status:"failed",duration_ms:Date.now() - started,error:error.stack});
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

async function main() {
  await fs.mkdir(artifactDir, {recursive:true});
  const server = await createStaticServer();
  const browser = await chromium.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  let context;
  let page;
  const drawer = () => page.locator(".cs-drawer");
  const action = name => page.locator(`[data-cs="${name}"]`).filter({visible:true}).first();
  const rowIds = () => page.locator(".cs-page tbody tr").evaluateAll(rows => rows.map(row => row.textContent.match(/T-CS\d{3}/)?.[0]).filter(Boolean));
  const fresh = async ({role="operations",ticket=null,width=1440,query="",file="admin-dev.html",collaboration_id=null}={}) => {
    if (context) await context.close();
    context = await browser.newContext({viewport:{width,height:960}});
    if (role !== "operations" || collaboration_id) {
      const user_id = {supervisor:"U-SUPERVISOR01",audit:"U-AUDIT01",finance:"U-FINANCE01",technical:"U-TECH01",system_admin:"U-ADMIN01"}[role] || "U-SUPPORT01";
      await context.addInitScript(value => {window.AFF_SUPPORT_CONTEXT = value;}, {role,user_id,collaboration_id});
    }
    page = await context.newPage();
    page.setDefaultTimeout(7000);
    page.on("pageerror", error => report.page_errors.push(error.message));
    page.on("console", message => {if (message.type() === "error") report.page_errors.push(message.text());});
    page.on("crash", () => report.page_errors.push("Page crashed"));
    const params = new URLSearchParams(query);
    if (ticket) params.set("ticket_id",ticket);
    await page.goto(`${baseUrl}/${file}#/tickets${params.size ? `?${params}` : ""}`, {waitUntil:"domcontentloaded"});
    await page.locator(".cs-page").waitFor();
    if (ticket && role !== "system_admin") await drawer().waitFor();
    await page.waitForFunction(() => window.AFF_SUPPORT_UI?.state.initialized && !window.AFF_SUPPORT_UI.state.loading && !window.AFF_SUPPORT_UI.state.detailLoading);
    return page;
  };
  const openTicket = async id => {
    await page.locator(`[data-cs="open"][data-cs-id="${id}"]`).filter({visible:true}).first().click();
    await drawer().waitFor();
    await page.waitForFunction(id => document.querySelector(".cs-drawer")?.textContent.includes(id),id);
    await page.waitForFunction(() => !window.AFF_SUPPORT_UI.state.detailLoading);
  };
  const getTicket = async id => page.evaluate(async ticket_id => (await window.AFF_SUPPORT_SERVICE.request("detail",{ticket_id})).data.ticket,id);
  const screenshot = async name => {
    const file = path.join(artifactDir, `${name}.png`);
    await page.screenshot({path:file,fullPage:await drawer().count() === 0});
    report.screenshots.push(path.relative(root,file));
  };
  try {
    await runCase("unified route, operational identity and eleven table columns", ["AC-CS13","AC-CS18"], async () => {
      await fresh();
      assert.equal(await page.locator(".cs-page h1").innerText(),"客户服务");
      assert.equal(await page.locator(".cs-page thead th").count(),11);
      assert.equal(await page.locator("[data-role]").filter({visible:true}).count(),0);
      assert.equal(await page.locator(".cs-page input[type=checkbox]").count(),0);
      assert.ok((await rowIds()).length > 0);
      assert.equal(await page.locator('[data-cs="view"][data-value="mine"]').getAttribute("aria-pressed"),"true");
      assert.equal(await page.locator('[data-menu-item="nav-customer-service"]').count(),1);
      await screenshot("list-desktop");
    });
    await runCase("staged query, active filters and reset", ["AC-CS14","AC-CS23"], async () => {
      await fresh();
      await page.locator('[data-cs="view"][data-value="all"]').click();
      await page.waitForFunction(() => !window.AFF_SUPPORT_UI.state.loading);
      const before = await rowIds();
      await page.locator('[data-cs-field="keyword"]').fill("T-CS015");
      assert.deepEqual(await rowIds(),before);
      await page.locator("#cs-query").getByRole("button",{name:"查询",exact:true}).click();
      await page.waitForFunction(() => [...document.querySelectorAll(".cs-page tbody tr")].filter(row => /T-CS\d{3}/.test(row.textContent)).length === 1);
      assert.deepEqual(await rowIds(),["T-CS015"]);
      await action("reset").click();
      await page.waitForFunction(() => [...document.querySelectorAll(".cs-page tbody tr")].filter(row => /T-CS\d{3}/.test(row.textContent)).length > 1);
      assert.equal(await page.locator('[data-cs="view"][data-value="mine"]').getAttribute("aria-pressed"),"true");
    });
    await runCase("claim writes owner and does not count as first response", ["AC-CS01"], async () => {
      await fresh();
      await page.locator('[data-cs="view"][data-value="unassigned"]').click();
      await page.waitForFunction(() => !window.AFF_SUPPORT_UI.state.loading);
      await openTicket("T-CS001");
      await drawer().getByRole("button",{name:"认领",exact:true}).click();
      await page.waitForFunction(async () => {
        const data = await window.AFF_SUPPORT_SERVICE.request("detail",{ticket_id:"T-CS001"});
        return data.data.ticket.status === "processing";
      });
      const ticket = await getTicket("T-CS001");
      assert.equal(ticket.assignee.user_id,"U-SUPPORT01");
      assert.equal(ticket.first_response_at,null);
    });
    await runCase("independent drafts, safe text, unsent guard and public reply", ["AC-CS02","AC-CS19"], async () => {
      await fresh({ticket:"T-CS002"});
      const publicBody = '公开答复草稿 <img src=x onerror="window.__unsafe=1"> https://example.test/help';
      await drawer().locator('[data-cs-field="body"]').fill(publicBody);
      await drawer().getByRole("button",{name:"内部备注",exact:true}).click();
      assert.equal(await drawer().locator('[data-cs-field="body"]').inputValue(),"");
      await drawer().locator('[data-cs-field="body"]').fill("内部核对摘要仅供服务团队查看");
      await drawer().getByRole("button",{name:"对外回复",exact:true}).click();
      assert.equal(await drawer().locator('[data-cs-field="body"]').inputValue(),publicBody);
      await drawer().getByRole("button",{name:"关闭工单详情",exact:true}).click();
      await page.getByText("存在未发送内容，离开将丢弃",{exact:false}).waitFor();
      await page.getByRole("button",{name:"继续编辑",exact:true}).click();
      assert.equal(await drawer().locator('[data-cs-field="body"]').inputValue(),publicBody);
      await drawer().getByRole("button",{name:"发送回复",exact:true}).click();
      await page.waitForFunction(() => !document.querySelector('.cs-drawer [data-cs-field="body"]')?.value && !window.AFF_SUPPORT_UI.state.busy);
      await page.waitForFunction(text => document.querySelector(".cs-drawer")?.textContent.includes(text),publicBody);
      assert.equal(await page.evaluate(() => window.__unsafe),undefined);
      assert.equal(await drawer().locator('img[src="x"]').count(),0);
      assert.ok((await drawer().innerText()).includes(publicBody));
      await drawer().getByRole("button",{name:"内部备注",exact:true}).click();
      assert.equal(await drawer().locator('[data-cs-field="body"]').inputValue(),"内部核对摘要仅供服务团队查看");
      const stored = await page.evaluate(() => JSON.stringify({...localStorage}));
      assert.ok(!stored.includes("公开答复草稿") && !stored.includes("内部核对摘要"));
      assert.ok(!page.url().includes("公开答复草稿"));
      assert.ok((await getTicket("T-CS002")).first_response_at);
      await screenshot("communication-desktop");
    });
    await runCase("active collaboration blocks resolution and preserves service ownership", ["AC-CS05"], async () => {
      await fresh({ticket:"T-CS004"});
      await drawer().locator(".cs-more summary").click();
      const resolve = drawer().getByRole("button",{name:"标记已解决",exact:true});
      assert.equal(await resolve.isDisabled(),true);
      assert.match(await resolve.getAttribute("title"),/仍有1项专业任务未完成/);
      assert.equal((await getTicket("T-CS004")).status,"waiting_external");
      await drawer().getByRole("tab",{name:"关联与协作",exact:true}).click();
      assert.match(await drawer().innerText(),/TASK-04A/);
      assert.match(await drawer().innerText(),/TASK-04B/);
      await screenshot("collaboration-desktop");
    });
    await runCase("legacy and closed records hide composer and retain rating", ["AC-CS16","AC-CS29"], async () => {
      await fresh({ticket:"T-CS015"});
      assert.equal(await drawer().locator('[data-cs-field="body"]').count(),0);
      assert.match(await drawer().innerText(),/历史|待核验/);
      await fresh({ticket:"T-CS013"});
      assert.equal(await drawer().locator('[data-cs-field="body"]').count(),0);
      await drawer().getByRole("tab",{name:"处理记录",exact:true}).click();
      assert.match(await drawer().innerText(),/4\s*\/\s*5/);
      assert.equal(await drawer().getByRole("button",{name:/评价/}).count(),0);
      await screenshot("history-desktop");
    });
    await runCase("missing policy is explicit while a valid text reply stays available", ["AC-CS15"], async () => {
      await fresh({ticket:"T-CS010"});
      assert.match(await drawer().innerText(),/SLA未配置/);
      assert.equal(await drawer().locator('[data-cs-field="body"]').count(),1);
      await drawer().locator('[data-cs-field="body"]').fill("已收到您的咨询，正在核对已同步信息。");
      assert.equal(await drawer().getByRole("button",{name:"发送回复",exact:true}).isDisabled(),false);
    });
    await runCase("resolve and normal closure are two explicit audited actions", ["AC-CS06"], async () => {
      await fresh({ticket:"T-CS002"});
      await drawer().locator(".cs-more summary").click();
      await drawer().getByRole("button",{name:"标记已解决",exact:true}).click();
      const modal = page.locator(".cs-modal");
      assert.match(await modal.innerText(),/仅更新服务工单，不改变资金或风险状态/);
      await modal.locator('[data-cs-field="form-body"]').fill("当前咨询已完成核对，现向您说明核对结果。");
      await modal.getByRole("button",{name:"确认已解决",exact:true}).click();
      await page.waitForFunction(() => window.AFF_SUPPORT_UI.state.detail?.status === "resolved" && !window.AFF_SUPPORT_UI.state.busy);
      await drawer().locator(".cs-more summary").click();
      await drawer().getByRole("button",{name:"关闭工单",exact:true}).click();
      await modal.locator('[data-cs-field="form-body"]').fill("本次服务工单已关闭，感谢您提供的核对资料。");
      await modal.locator('[data-cs-field="form-reason"]').fill("核对流程已完成并向合作方说明处理结果。");
      await modal.getByRole("button",{name:"确认关闭",exact:true}).click();
      await page.waitForFunction(() => window.AFF_SUPPORT_UI.state.detail?.status === "closed" && !window.AFF_SUPPORT_UI.state.busy);
      const ticket = await getTicket("T-CS002");
      assert.equal(ticket.close_reason,"resolved");
      assert.equal(ticket.satisfaction,null);
      const history = await page.evaluate(async () => (await window.AFF_SUPPORT_SERVICE.request("history",{ticket_id:"T-CS002"})).data.entries);
      assert.ok(history.some(entry => entry.action === "resolve"));
      assert.ok(history.some(entry => entry.action === "close"));
    });
    await runCase("appeal guidance requires eligibility and never creates an appeal", ["AC-CS07","AC-CS08","AC-CS30"], async () => {
      await fresh({ticket:"T-CS007"});
      await drawer().locator(".cs-more summary").click();
      assert.equal(await drawer().getByRole("button",{name:"引导申诉",exact:true}).isDisabled(),true);
      await fresh({ticket:"T-CS008"});
      const before = await page.evaluate(async () => (await window.AFF_SUPPORT_SERVICE.request("eligibility",{ticket_id:"T-CS008"})).data);
      await drawer().locator(".cs-more summary").click();
      await drawer().getByRole("button",{name:"引导申诉",exact:true}).click();
      const modal = page.locator(".cs-modal");
      await modal.locator('[data-cs-field="form-body"]').fill("您可根据当前案件资格进入申诉页面提交资料。");
      await modal.getByRole("button",{name:"发送申诉指引",exact:true}).click();
      await page.waitForFunction(() => window.AFF_SUPPORT_UI.state.messages.some(message => message.kind === "guide_appeal") && !window.AFF_SUPPORT_UI.state.busy);
      assert.match(await drawer().innerText(),/合作方可见：查看申诉资格并提交/);
      const after = await page.evaluate(async () => (await window.AFF_SUPPORT_SERVICE.request("eligibility",{ticket_id:"T-CS008"})).data);
      assert.equal(after.remaining_attempts,before.remaining_attempts);
      assert.equal((await getTicket("T-CS008")).collaborations.filter(task => task.kind === "appeal").length,0);
    });
    await runCase("uploaded file stays unsendable until scanning completes", ["AC-CS12"], async () => {
      await fresh({ticket:"T-CS002"});
      await drawer().locator('[data-cs-field="body"]').fill("附上用于本次核对的演示附件。");
      await drawer().locator("[data-cs-upload]").setInputFiles({name:"service-check.txt",mimeType:"text/plain",buffer:Buffer.from("Synthetic customer service attachment.")});
      await page.waitForFunction(() => !window.AFF_SUPPORT_UI.state.uploading && Object.values(window.AFF_SUPPORT_UI.state.drafts).some(draft => draft.files.length));
      assert.equal(await drawer().getByRole("button",{name:"发送回复",exact:true}).isDisabled(),true);
      assert.match(await drawer().innerText(),/扫描中/);
      await page.waitForFunction(() => Object.values(window.AFF_SUPPORT_UI.state.drafts).some(draft => draft.files.some(file => file.scan_status === "clean")),{},{timeout:22000});
      assert.equal(await drawer().getByRole("button",{name:"发送回复",exact:true}).isDisabled(),false);
      await drawer().getByRole("button",{name:"发送回复",exact:true}).click();
      await page.waitForFunction(() => window.AFF_SUPPORT_UI.state.messages.some(message => message.attachments.some(file => file.file_name === "service-check.txt")) && !window.AFF_SUPPORT_UI.state.busy);
    });
    await runCase("operator classification sends only changed authorized fields", ["AC-CS20","AC-CS33"], async () => {
      await fresh({ticket:"T-CS002"});
      const before = await getTicket("T-CS002");
      await drawer().locator('[data-cs="action:classify"]').click();
      const modal = page.locator(".cs-modal");
      assert.equal(await modal.locator('[data-cs-field="form-priority"]').count(),0);
      await modal.locator('[data-cs-field="form-category"]').selectOption("reporting");
      await modal.locator('[data-cs-field="form-reason"]').fill("根据合作方问题内容调整为报表数据分类。");
      await modal.getByRole("button",{name:"确认",exact:true}).click();
      await page.waitForFunction(() => window.AFF_SUPPORT_UI.state.detail?.category === "reporting" && !window.AFF_SUPPORT_UI.state.busy);
      const after = await getTicket("T-CS002");
      assert.equal(after.priority,before.priority);
      assert.equal(after.sla.first_response_due_at,before.sla.first_response_due_at);
      assert.equal(after.sla.resolution_due_at,before.sla.resolution_due_at);
    });
    await runCase("supervisor export uses active scope and returns a real export identifier", ["AC-CS14"], async () => {
      await fresh({role:"supervisor"});
      await page.locator('[data-cs-field="keyword"]').fill("T-CS015");
      await page.locator("#cs-query").getByRole("button",{name:"查询",exact:true}).click();
      await page.waitForFunction(() => !window.AFF_SUPPORT_UI.state.loading);
      await page.locator('[data-cs-field="keyword"]').fill("T-CS002");
      await page.locator(".cs-page").getByRole("button",{name:"导出",exact:true}).click();
      const modal = page.locator(".cs-modal");
      assert.ok((await modal.innerText()).includes("T-CS015"));
      assert.ok(!(await modal.innerText()).includes("T-CS002"));
      await modal.getByRole("button",{name:"确认",exact:true}).click();
      await page.waitForFunction(() => window.AFF_SUPPORT_UI.state.dialog === "export_ready");
      const exported = await page.evaluate(() => window.AFF_SUPPORT_SERVICE.testing.snapshot().exports);
      assert.equal(exported.length,1);
      assert.equal(exported[0].row_count,1);
      assert.equal(exported[0].scope.ticket_id,"T-CS015");
      assert.ok((await modal.innerText()).includes(exported[0].export_id));
      assert.ok(!exported[0].columns.some(column => ["description","body","attachments"].includes(column)));
    });
    await runCase("saved reply reports partial notification delivery without duplicate message", ["AC-CS17"], async () => {
      await fresh({ticket:"T-CS009"});
      await drawer().locator('[data-cs-field="body"]').fill("当前问题已完成核对，请查看本次回复。");
      await drawer().getByRole("button",{name:"发送回复",exact:true}).click();
      await page.waitForFunction(() => !window.AFF_SUPPORT_UI.state.busy && window.AFF_SUPPORT_UI.state.notice?.includes("通知投递异常"));
      assert.match(await drawer().innerText(),/回复已保存，通知投递异常/);
      const messages = await page.evaluate(() => window.AFF_SUPPORT_UI.state.messages.filter(message => message.body === "当前问题已完成核对，请查看本次回复。"));
      assert.equal(messages.length,1);
      assert.equal(await drawer().locator('[data-cs-field="body"]').inputValue(),"");
    });
    await runCase("same-document ticket navigation protects and then discards drafts", ["AC-CS19"], async () => {
      await fresh({ticket:"T-CS002"});
      await drawer().locator('[data-cs-field="body"]').fill("当前尚未发送的公开回复草稿");
      await page.evaluate(() => {location.hash="#/tickets?ticket_id=T-CS003";});
      await page.locator(".cs-modal").waitFor();
      assert.equal(await page.evaluate(() => window.AFF_SUPPORT_UI.state.ticketId),"T-CS002");
      assert.ok(page.url().includes("ticket_id=T-CS002"));
      await page.getByRole("button",{name:"继续编辑",exact:true}).click();
      assert.equal(await drawer().locator('[data-cs-field="body"]').inputValue(),"当前尚未发送的公开回复草稿");
      await page.evaluate(() => {location.hash="#/tickets?ticket_id=T-CS003";});
      await page.getByRole("button",{name:"丢弃并离开",exact:true}).click();
      await page.waitForFunction(() => window.AFF_SUPPORT_UI.state.ticketId === "T-CS003" && !window.AFF_SUPPORT_UI.state.detailLoading);
      assert.equal(await drawer().locator('[data-cs-field="body"]').inputValue(),"");
    });
    await runCase("identity change clears previously authorized cached rows", ["AC-CS13"], async () => {
      await fresh();
      assert.ok((await rowIds()).length > 0);
      await page.evaluate(() => {location.hash="#/admin-workbench";});
      await page.locator("[data-role]").waitFor();
      await page.locator("[data-role]").selectOption("system_admin");
      await page.evaluate(() => {location.hash="#/tickets";});
      await page.locator(".cs-page").waitFor();
      await page.waitForFunction(() => window.AFF_SUPPORT_UI.state.initialized && !window.AFF_SUPPORT_UI.state.loading);
      assert.match(await page.locator(".cs-page").innerText(),/无权访问/);
      assert.equal(await page.locator(".cs-page tbody tr").count(),0);
      assert.equal(await page.evaluate(() => window.AFF_SUPPORT_UI.state.rows),null);
    });
    await runCase("request-material attachments do not reuse internal attachments", ["AC-CS12","AC-CS19"], async () => {
      await fresh({ticket:"T-CS002"});
      await drawer().getByRole("button",{name:"内部备注",exact:true}).click();
      await drawer().locator('[data-cs-field="body"]').fill("此附件仅供内部核对，不得公开。");
      await drawer().locator("[data-cs-upload]").setInputFiles({name:"internal-only.txt",mimeType:"text/plain",buffer:Buffer.from("Internal synthetic note.")});
      await page.waitForFunction(() => !window.AFF_SUPPORT_UI.state.uploading && Object.values(window.AFF_SUPPORT_UI.state.drafts).some(draft => draft.files.length));
      await drawer().locator(".cs-more summary").click();
      await drawer().getByRole("button",{name:"要求补充",exact:true}).click();
      const modal = page.locator(".cs-modal");
      assert.ok(!(await modal.innerText()).includes("internal-only.txt"));
      await modal.locator('[data-cs-field="form-body"]').fill("请补充当前问题所需的公开核对资料。");
      await modal.locator("[data-cs-action-upload]").setInputFiles({name:"public-material.txt",mimeType:"text/plain",buffer:Buffer.from("Public synthetic instructions.")});
      await page.waitForFunction(() => !window.AFF_SUPPORT_UI.state.uploading && Object.values(window.AFF_SUPPORT_UI.state.actionDrafts || {}).some(draft => draft.files.length));
      await page.waitForFunction(() => Object.values(window.AFF_SUPPORT_UI.state.actionDrafts || {}).some(draft => draft.files.some(file => file.scan_status === "clean")),{},{timeout:22000});
      await modal.getByRole("button",{name:"发送补充要求",exact:true}).click();
      await page.waitForFunction(() => window.AFF_SUPPORT_UI.state.detail?.status === "waiting_partner" && !window.AFF_SUPPORT_UI.state.busy);
      const message = await page.evaluate(() => window.AFF_SUPPORT_UI.state.messages.filter(item => item.kind === "request_material").at(-1));
      assert.equal(message.visibility,"partner");
      assert.deepEqual(message.attachments.map(file => file.file_name),["public-material.txt"]);
      assert.ok(await page.evaluate(() => Object.values(window.AFF_SUPPORT_UI.state.drafts).some(draft => draft.files.some(file => file.file_name === "internal-only.txt"))));
    });
    await runCase("admin without service capability has no ticket data", ["AC-CS13"], async () => {
      await fresh({role:"system_admin"});
      assert.match(await page.locator(".cs-page").innerText(),/无权访问/);
      assert.equal(await page.locator(".cs-page tbody tr").count(),0);
      assert.equal(await page.locator('[data-menu-item="nav-customer-service"]').count(),0);
    });
    await runCase("audit can read without business actions", ["AC-CS13"], async () => {
      await fresh({role:"audit",ticket:"T-CS002"});
      assert.equal(await drawer().locator('[data-cs-field="body"]').count(),0);
      assert.equal(await drawer().getByRole("button",{name:"发送回复",exact:true}).count(),0);
    });
    await runCase("professional access is scoped to its assigned collaboration", ["AC-CS13","AC-CS26"], async () => {
      await fresh({role:"finance",ticket:"T-CS017",collaboration_id:"CO-17A"});
      assert.equal(await page.locator(".cs-page table").count(),0);
      assert.equal(await drawer().getByRole("button",{name:"对外回复",exact:true}).count(),0);
      assert.equal(await drawer().locator('[data-cs-field="body"]').count(),1);
      assert.ok(!(await drawer().innerText()).includes("CO-17B"));
    });
    await runCase("URL restores full query state and explicit capacity overrides saved layout", ["AC-CS14","AC-CS20","AC-CS23"], async () => {
      await fresh({query:"view=all&page_size=10&page=2&sort_by=priority&sort_order=asc"});
      assert.equal(await page.evaluate(() => window.AFF_SUPPORT_UI.state.page),2);
      assert.equal(await page.locator('[data-cs-field="page-size"]').inputValue(),"10");
      await page.locator('[data-cs-field="page-size"]').selectOption("50");
      await page.waitForFunction(() => window.AFF_SUPPORT_UI.state.size === 50 && !window.AFF_SUPPORT_UI.state.loading);
      await page.evaluate(() => {location.hash="#/tickets?view=all&page_size=10&page=2&sort_by=priority&sort_order=asc";});
      await page.waitForFunction(() => window.AFF_SUPPORT_UI.state.size === 10 && window.AFF_SUPPORT_UI.state.page === 2 && !window.AFF_SUPPORT_UI.state.loading);
      await page.reload({waitUntil:"domcontentloaded"});
      await page.waitForFunction(() => window.AFF_SUPPORT_UI?.state.initialized && !window.AFF_SUPPORT_UI.state.loading);
      const state = await page.evaluate(() => ({size:window.AFF_SUPPORT_UI.state.size,page:window.AFF_SUPPORT_UI.state.page,sort:window.AFF_SUPPORT_UI.state.sort,order:window.AFF_SUPPORT_UI.state.order}));
      assert.deepEqual(state,{size:10,page:2,sort:"priority",order:"asc"});
      await page.evaluate(() => {location.hash=`#/tickets?view=all&subject=${encodeURIComponent("佣金")}&page_size=20`;});
      await page.waitForFunction(() => window.AFF_SUPPORT_UI.state.filters.subject === "佣金" && !window.AFF_SUPPORT_UI.state.loading);
      assert.equal(await page.locator('[data-cs-field="page-size"]').inputValue(),"20");
      const subjects = await page.locator(".cs-page .cs-subject").allTextContents();
      assert.ok(subjects.length > 0 && subjects.every(subject => subject.includes("佣金")));
    });
    await runCase("legacy unified route and previous rebuild entry resolve to new page", ["AC-CS24"], async () => {
      await fresh({file:"admin-rebuild.html"});
      assert.ok(page.url().includes("admin-dev.html#/tickets"));
      assert.equal(await page.locator(".cs-page h1").innerText(),"客户服务");
      await page.goto(`${baseUrl}/admin-dev.html#/admin-modules/support-ticket/T-CS002`,{waitUntil:"domcontentloaded"});
      await drawer().waitFor();
      assert.ok(page.url().includes("#/tickets?ticket_id=T-CS002"));
    });
    await runCase("seven viewport layouts, drawer dimensions and accessible actions", ["AC-CS18"], async () => {
      for (const width of widths) {
        await fresh({width});
        const dimensions = await page.evaluate(() => ({
          client:document.documentElement.clientWidth,
          scroll:document.documentElement.scrollWidth,
          sidebar:document.querySelector(".tm-sidebar").getBoundingClientRect().width,
          table:document.querySelector(".cs-page table")?.getBoundingClientRect().width,
          topbar:document.querySelector(".tm-topbar").getBoundingClientRect().height
        }));
        assert.ok(dimensions.scroll <= dimensions.client + 1,`${width}: document horizontally overflows ${JSON.stringify(dimensions)}`);
        if (width >= 1280) assert.equal(Math.round(dimensions.sidebar),236);
        for (const name of ["刷新","列设置"]) {
          const button = page.locator(".cs-page").getByRole("button",{name,exact:true});
          assert.equal(await button.count(),1);
          assert.ok(await button.getAttribute("title"),`${name} has tooltip`);
        }
        const exportAllowed = await page.evaluate(() => window.AFF_SUPPORT_UI.state.caps.capabilities.includes("support.export"));
        assert.equal(await page.locator(".cs-page").getByRole("button",{name:"导出",exact:true}).count(),exportAllowed?1:0);
        await screenshot(`list-${width}`);
        await openTicket("T-CS002");
        const rect = await drawer().boundingBox();
        if (width >= 768) assert.equal(Math.round(rect.width),Math.min(720,width-32));
        if (width < 480) assert.equal(Math.round(rect.width),width);
        assert.ok(rect.x >= -1 && rect.x + rect.width <= width + 1,`${width}: drawer remains in viewport`);
        await screenshot(`drawer-${width}`);
        const focusableButtons = drawer().locator("button:not([disabled])").filter({visible:true});
        await focusableButtons.last().focus();
        await page.keyboard.press("Tab");
        assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest(".cs-drawer"))),true,`${width}: keyboard focus remains in drawer`);
        await page.keyboard.press("Escape");
        await drawer().waitFor({state:"detached"});
        await page.waitForFunction(() => document.activeElement && !["BODY","HTML"].includes(document.activeElement.tagName));
        assert.ok(await page.locator(":focus").count(),"focus restored after drawer close");
      }
    });
    await runCase("zero runtime or console errors", ["AC-CS18"], async () => {
      assert.deepEqual(report.page_errors,[]);
    });
  } finally {
    if (context) await context.close();
    await browser.close();
    await new Promise(resolve => server.close(resolve));
    await fs.writeFile(path.join(artifactDir,"report.json"),JSON.stringify(report,null,2));
  }
  const failed = report.cases.filter(item => item.status === "failed");
  console.log(`ADMIN_SUPPORT_CASES=${report.cases.length} PASSED=${report.cases.length-failed.length} FAILED=${failed.length} SCREENSHOTS=${report.screenshots.length}`);
  if (failed.length) process.exitCode=1;
}

main().catch(error => {console.error(error);process.exitCode=1;});
