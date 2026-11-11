"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
let chromium;
try {
  ({chromium} = require("playwright"));
} catch {
  // The public mock repository intentionally has no devDependency; reuse the local prototype workspace copy.
  ({chromium} = require(path.join(process.env.HOME, "Documents/Affiliate/.tmp-mock-site/node_modules/playwright")));
}

const root = path.join(__dirname, "..");
const mimeTypes = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml"};

async function createStaticServer() {
  const server = http.createServer(async (request,response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url,"http://127.0.0.1").pathname);
      const file = path.join(root,pathname === "/" ? "admin-dev.html" : pathname);
      assert.ok(file.startsWith(root), "Forbidden");
      const body = await fs.readFile(file);
      response.writeHead(200,{"Content-Type":mimeTypes[path.extname(file)] || "application/octet-stream","Cache-Control":"no-store"});
      response.end(body);
    } catch (error) {
      response.writeHead(error.message === "Forbidden" ? 403 : 404,{"Content-Type":"text/plain; charset=utf-8"});
      response.end(error.message);
    }
  });
  await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
  return server;
}

(async () => {
  const server = await createStaticServer();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
  const page = await browser.newPage({viewport:{width:1440,height:960}});
  const errors = [];
  page.on("pageerror",error => errors.push(error.message));
  page.on("console",message => {if (message.type() === "error") errors.push(message.text());});
  page.on("crash",() => errors.push("Page crashed"));

  try {
    const openDemoControls = async () => {
      if (!await page.locator(".dev-demo-panel section").isVisible()) {
        await page.click("[data-toggle-demo]");
        await page.waitForSelector(".dev-demo-panel section");
      }
    };
    const selectRole = async role => {
      await page.selectOption("[data-role]",role);
      await page.waitForFunction(value => document.querySelector("[data-role]")?.value === value,role);
    };
    const selectScenario = async scenario => {
      await openDemoControls();
      await page.selectOption("[data-scenario]",scenario);
      await page.click("[data-toggle-demo]");
      await page.waitForSelector(".dev-demo-panel section",{state:"detached"});
    };
    await page.goto(`${baseUrl}/#/admin-workbench`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".tm-tabs button");
    assert.ok(await page.locator(".tm-role-switch [data-role]").isVisible(),"role switcher is visible in the topbar");
    const definition = await page.evaluate(() => window.AFF_ADMIN_PROTOTYPE);
    const invalidMenuRoutes = await page.evaluate(() => {
      const prototype = window.AFF_ADMIN_PROTOTYPE;
      const routeMap = new Map(prototype.routes.map(route => [route.id,new Set(route.tabs.map(tab => tab.id))]));
      const flatten = items => items.flatMap(item => [item,...(item.children ? flatten(item.children) : [])]);
      return prototype.menuBlueprint.flatMap(group => flatten(group.items)
        .filter(item => item.routeId && (!routeMap.get(item.routeId)?.has(item.tabId)))
        .map(item => `${group.id}/${item.id}:${item.routeId}/${item.tabId}`));
    });
    assert.deepEqual(invalidMenuRoutes,[],"all routed sidebar menu entries must point to real route tabs");
    assert.equal(definition.routes[0].kind,"global");
    assert.equal(definition.routes[0].title,"仪表盘");
    assert.equal(definition.routes.length,12,"base routes plus partner 360, risk workbench, customer service and task workspaces");
    assert.equal(definition.routes.find(route => route.id === "partner-360").tabs.length,6,"partner 360 has six contract tabs");
    assert.equal(definition.routes.filter(route => route.kind === "module").length,1,"one module route carries complete blueprint pages");
    assert.equal(definition.routes.find(route => route.id === "admin-modules").tabs.length,21,"21 module pages after full consolidation");
    assert.ok(!definition.routes.find(route => route.id === "admin-modules").tabs.some(tabItem => ["partner-onboarding","partner-kyc","partner-offboarding","partner-notes","client-risk","attribution-exception","sub-channel"].includes(tabItem.id)),"client 360, attribution and sub-channel pages absorb the legacy module tabs");
    assert.equal(await page.locator(".tm-sidebar footer small").textContent(),"admin-prototype-v0.36","sidebar footer announces prototype v0.36");
    const businessRoutes = definition.routes.filter(route => !route.kind);
    assert.deepEqual(businessRoutes.map(route => route.tabs.length),[20,1,6,8,3],"config route includes overview plus 19 business configuration groups");
    assert.equal(await page.locator(".dev-menu-group").count(),10,"consolidated sidebar blueprint groups");
    const sidebarItemIds=await page.locator("[data-menu-item]").evaluateAll(nodes=>nodes.map(node=>node.dataset.menuItem));
    const flattenItems=items=>items.flatMap(item=>[item,...flattenItems(item.children || [])]);
    const expectedSidebarIds=definition.menuBlueprint.filter(group=>group.id!=="dashboard").flatMap(group=>flattenItems(group.items)).filter(item=>!["nav-campaigns","nav-risk-review","nav-integrations","nav-quality"].includes(item.id)).map(item=>item.id);
    assert.deepEqual(sidebarItemIds.sort(),expectedSidebarIds.sort(),"sidebar renders the registered consolidated menu entries");
    assert.equal(await page.locator(".dev-menu-group.active").count(),1,"sidebar marks only the current group by default");
    assert.equal(await page.locator(".dev-menu-group.active [data-menu-group]").getAttribute("data-menu-group"),"dashboard","dashboard group is active by default");
    assert.equal(await page.locator(".dev-menu-items .dev-menu-icon").count(),sidebarItemIds.length,"every child menu entry has a semantic icon");
    assert.ok(!(await page.locator(".dev-menu-group > button").first().textContent()).includes("/"),"group headers do not show progress-like ratios");
    const sidebarScroll = await page.evaluate(() => getComputedStyle(document.querySelector(".tm-sidebar > nav")).scrollbarWidth);
    assert.equal(sidebarScroll,"none","sidebar scrollbar is hidden");
    assert.equal(await page.locator(".tm-tabs button").count(),1);
    assert.equal(await page.locator(".dash-v2-queue-tabs button").count(),5);
    assert.equal(await page.locator(".dev-cockpit").count(),0,"role dashboard module is removed");
    assert.equal(await page.locator(".dev-signal-panel").count(),0,"abnormal signals module is removed");
    assert.equal(await page.locator(".dev-metric-bar").count(),0,"key metrics module is removed");
    assert.equal(await page.locator(".tm-page-head").count(),1,"dashboard keeps the global page header");
    assert.equal(await page.locator(".dash-v2-quick-filter").count(),1,"dashboard keeps one status quick filter");
    assert.equal(await page.locator(".dash-v2-quick-filter button").count(),11,"status quick filter exposes all ten task states");
    await page.click("[data-dashboard-status='execution_failed']");
    await page.waitForFunction(() => document.querySelector(".dash-v2-quick-filter button.active")?.dataset.dashboardStatus === "execution_failed");
    const failedRows = await page.locator(".dash-v2-table-wrap tbody tr").allInnerTexts();
    assert.ok(failedRows.length > 0 && failedRows.every(text => text.includes("失败")),"status quick filter narrows the task table");
    await page.click("[data-dashboard-status='']");
    await page.waitForFunction(() => document.querySelector(".dash-v2-quick-filter button.active")?.dataset.dashboardStatus === "");
    assert.equal(await page.locator(".dash-v2-table-wrap tbody tr").count(),10,"dashboard pending table rows");
    assert.ok(await page.locator(".dev-open-tabs > span").count() >= 1,"opened tab bar");
    assert.ok(await page.locator(".dev-footer").isVisible(),"system footer");
    assert.ok(await page.locator(".tm-workspace").isVisible(),"TradeMaster workspace identity");
    assert.ok(await page.locator(".tm-breadcrumb").isVisible(),"TradeMaster breadcrumb");
    assert.ok(await page.locator(".tm-clock").isVisible(),"server and local time");
    assert.ok(await page.locator(".tm-delay").isVisible(),"network latency state");
    assert.ok(await page.locator(".dev-demo-panel > button").isVisible(),"demo controls are collapsed outside the main workflow");
    assert.equal(await page.locator(".dev-demo-panel section").count(),0,"demo panel defaults to collapsed");
    assert.ok((await page.locator(".dev-menu-group").first().textContent()).includes("仪表盘"),"sidebar keeps dashboard as the first blueprint group");
    assert.ok((await page.locator("body").textContent()).includes("Affiliate Admin API"),"dashboard shows API data source");
    assert.ok(!/演示环境|虚构数据|演示数据/.test(await page.locator("body").textContent()),"workspace removes demo-data labels");
    const designTokens = await page.evaluate(() => ({
      tableLayout:getComputedStyle(document.querySelector(".tm-table-wrap table")).tableLayout,
      tableHeader:getComputedStyle(document.querySelector(".tm-table-wrap th")).backgroundColor,
      rowButtonHeight:getComputedStyle(document.querySelector(".tm-table-wrap .tm-button")).height,
      iconWidth:getComputedStyle(document.querySelector(".tm-icon-button")).width
    }));
    assert.equal(designTokens.rowButtonHeight,"30px","row action uses compact button scale");
    assert.equal(designTokens.iconWidth,"34px","topbar icon button uses stable square size");
    assert.equal(designTokens.tableLayout,"fixed","managed table uses fixed layout");
    assert.equal(designTokens.tableHeader,"rgb(248, 246, 241)","managed table uses TradeMaster header tone");

    assert.equal(await page.locator(".dev-deep-panel").count(),0,"dashboard removes the deep interaction workbench");
    assert.equal(await page.locator("[data-deep-stage]").count(),0,"dashboard removes the deep workflow stage controls");
    assert.equal(await page.locator("[data-deep-filter]").count(),0,"dashboard removes the deep quick-filter controls");
    assert.equal(await page.locator("[data-deep-object]").count(),0,"dashboard removes the deep object inspector");

    await page.click("[data-menu-group='partners']");
    assert.equal(await page.locator(".dev-menu-group.open").count(),1,"opening a group closes the previous group");
    await page.click("[data-menu-item='nav-partners']");
    await page.waitForSelector(".dev-module-brief");
    assert.match(page.url(),/#\/admin-modules\/partner-list$/,"planned menu entry opens a real module page");
    assert.ok((await page.locator(".dev-module-brief").innerText()).includes("合作方列表"),"module page shows menu positioning");
    assert.equal(await page.locator(".tm-table-wrap tbody tr").count(),20,"partner 360 table paginates 26 seeded partners at 20 per page");
    assert.ok((await page.locator("tbody").textContent()).includes("Golden Link"),"module page uses realistic object names");
    assert.ok(await page.locator(".dev-cert-badge").count() >= 26,"partner table renders KYC/KYB cert badges");
    assert.ok(await page.locator(".dev-cert-badge.verified").count() > 0,"cert badges expose verification state");
    assert.equal(await page.locator(".tm-head-actions .tm-button.primary").textContent(),"导出合作方","module primary action uses business-specific label");
    assert.equal(await page.locator(".dev-insight-grid").count(),0,"insight panels are removed from module pages");
    // v0.30 行内动作：onboarded首行只有"详情"，筛选reviewing后首行=详情+审核
    const firstRowActions = await page.locator(".tm-table-wrap tbody tr").first().locator(".dev-row-action").allInnerTexts();
    assert.deepEqual(firstRowActions,["详情"],"onboarded first row exposes a single detail action");
    await page.click("[data-partner-stage='reviewing']");
    await page.waitForSelector("[data-remove-filter='deepStage']");
    await page.waitForFunction(() => document.querySelectorAll(".tm-table-wrap tbody .dev-row-action").length >= 2,null,{timeout:5000});
    const reviewingRowActions = await page.locator(".tm-table-wrap tbody tr").first().locator(".dev-row-action").allInnerTexts();
    assert.deepEqual(reviewingRowActions,["详情","审核"],"reviewing first row exposes detail plus inline review");
    await page.locator(".tm-table-wrap tbody tr").first().locator("[data-row-action='partner_review']").click();
    await page.waitForSelector(".p360-page");
    assert.match(page.url(),/#\/partner-360\/.+\?tab=compliance$/,"inline review action opens the contract partner 360 page");
    assert.equal(await page.locator(".p360-tabs [data-partner360-page-tab]").count(),6,"partner 360 page exposes six tabs");
    await page.goto(`${baseUrl}/#/admin-modules/partner-list`,{waitUntil:"domcontentloaded"});
    await page.click("[data-partner-stage='reviewing']");
    await page.goto(`${baseUrl}/#/partner-360/partner-1001`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".p360-page");
    assert.match(page.url(),/#\/partner-360\/partner-1001\?tab=overview$/,"direct partner 360 route keeps partner_id and overview tab");
    assert.equal(await page.locator(".p360-tabs [data-partner360-page-tab]").count(),6,"partner 360 has six page tabs");
    assert.equal(await page.locator(".p360-metric").count(),6,"partner 360 shows six summary metrics");
    assert.ok((await page.locator(".p360-header").innerText()).includes("Golden Link Media"),"partner 360 header shows partner identity");
    await page.click("[data-partner360-page-tab='promotion']");
    await page.waitForURL(/#\/partner-360\/partner-1001\?tab=promotion$/);
    await page.waitForFunction(() => document.querySelector(".p360-tab-content")?.innerText.includes("推广链接"),null,{timeout:5000});
    assert.match(page.url(),/#\/partner-360\/partner-1001\?tab=promotion$/,"tab changes persist in URL");
    assert.ok((await page.locator(".p360-tab-content").innerText()).includes("推广链接"),"promotion tab renders read-only promotion data");
    await page.click("[data-partner360-page-tab='compliance']");
    await page.waitForSelector(".p360-cert-grid");
    assert.ok((await page.locator(".p360-tab-content").innerText()).includes("CRM账户与认证"),"compliance tab renders CRM and KYC/KYB data");
    await page.click("[data-partner360-page-tab='finance']");
    await page.waitForSelector(".p360-table-wrap");
    assert.equal(await page.locator(".p360-table-wrap table").count(),1,"finance tab renders commission and settlement cases");
    assert.ok((await page.locator(".p360-tab-content").innerText()).includes("customer-1001-01"),"finance tab includes the case tuple context");
    await page.click("[data-partner360-page-tab='risk']");
    await page.waitForSelector(".p360-risk-snapshot");
    assert.ok((await page.locator(".p360-tab-content").innerText()).includes("风险与信用快照"),"risk tab renders R/C snapshots");
    await page.click("[data-partner360-page-tab='follow-up']");
    await page.waitForSelector("[data-p360-note-new]");
    await page.click("[data-p360-note-new]");
    await page.fill("[data-p360-note-field='content']","已完成季度合作复盘，继续观察质量服务指标。");
    await page.click("[data-p360-modal-submit]");
    await page.waitForFunction(() => document.querySelector(".tm-toast")?.textContent.includes("跟进备注已保存"),null,{timeout:5000});
    await page.click("[data-p360-owner]");
    await page.fill("[data-p360-owner-reason]","本季度由运营组负责统一跟进");
    await page.click("[data-p360-modal-submit]");
    await page.waitForFunction(() => document.querySelector(".tm-toast")?.textContent.includes("责任人已更新"),null,{timeout:5000});
    await page.click("[data-p360-task-new='risk']");
    await page.fill("[data-p360-task-reason]","核对近期风险事件与结算案件三元组");
    await page.click("[data-p360-modal-submit]");
    await page.waitForFunction(() => document.querySelector(".tm-toast")?.textContent.includes("任务已创建"),null,{timeout:5000});
    await page.goto(`${baseUrl}/#/partner-360/partner-1013?tab=compliance`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".p360-blocker-banner");
    assert.ok((await page.locator(".p360-blocker-banner").innerText()).includes("CRM KYC 同步异常"),"CRM sync scenario exposes a blocking banner");
    assert.ok(await page.locator("[data-p360-task-new='crm-sync']").count() > 0,"CRM sync scenario provides a task exit");
    await page.goto(`${baseUrl}/#/admin-modules/partner-list/partner-1001`,{waitUntil:"domcontentloaded"});
    await page.waitForURL(/#\/partner-360\/partner-1001\?tab=overview$/);
    assert.match(page.url(),/#\/partner-360\/partner-1001\?tab=overview$/,"legacy partner drawer URL redirects to the new page");

    // Client 360: lifecycle stage board with four stage cards and view switcher.
    await page.click("[data-menu-group='customers']");
    await page.click("[data-menu-item='nav-clients']");
    await page.waitForSelector(".dev-client-stage-board");
    assert.match(page.url(),/#\/admin-modules\/client-list$/,"client 360 menu entry opens the module page");
    assert.equal(await page.locator(".dev-client-stage-board [data-client-stage]").count(),4,"client 360 stage board shows four lifecycle stages");
    assert.equal(await page.locator("[data-client-view]").count(),3,"client 360 view switcher offers three views");
    assert.equal(await page.locator(".dev-partner360-views button.active").count(),1,"exactly one active client 360 view");
    const clientStageCounts = await page.locator(".dev-client-stage-board [data-client-stage] strong").allInnerTexts();
    assert.deepEqual(clientStageCounts.map(value => Number(value)),[4,6,8,4],"client stage board counts follow registered/ftd/valid_ftd/churned distribution");
    assert.equal(clientStageCounts.reduce((sum,value) => sum + Number(value),0),22,"stage board counts cover all clients");
    assert.equal(await page.locator(".tm-table-wrap tbody tr").count(),20,"client 360 table paginates 22 clients at 20 per page");
    await page.click("[data-client-stage='ftd']");
    await page.waitForFunction(() => document.querySelectorAll(".tm-table-wrap tbody tr").length === 6,null,{timeout:5000});
    assert.equal(await page.locator(".tm-table-wrap tbody tr").count(),6,"stage card click filters the client table to ftd clients");
    assert.ok(await page.locator(".dev-filterbar [data-remove-filter='deepStage']").isVisible(),"client stage filter syncs a removable chip");
    await page.click("[data-client-stage='ftd']");
    await page.waitForFunction(() => !document.querySelector(".dev-filterbar [data-remove-filter='deepStage']") && document.querySelectorAll(".tm-table-wrap tbody tr").length === 20,null,{timeout:5000});
    assert.equal(await page.locator(".tm-table-wrap tbody tr").count(),20,"unfiltered client list returns to the first page of 20 rows");

    // Client 360: risk view alias mirrors the legacy client-risk menu entry.
    await page.goto(`${baseUrl}/#/admin-modules/client-list/view=risk`,{waitUntil:"domcontentloaded"});
    await page.waitForFunction(() => document.querySelectorAll(".tm-table-wrap tbody tr").length === 3,null,{timeout:5000});
    assert.match(page.url(),/#\/admin-modules\/client-list\/view=risk$/,"legacy client-risk menu entry opens the client 360 risk view");
    assert.equal(await page.locator(".tm-table-wrap tbody tr").count(),3,"risk view narrows to R3/R4 clients");
    // v0.30 行内动作：风险视角首行=详情+风险复核；system_admin点击被角色门禁拦截
    const clientRiskRowActions = await page.locator(".tm-table-wrap tbody tr").first().locator(".dev-row-action").allInnerTexts();
    assert.deepEqual(clientRiskRowActions,["详情","风险复核"],"client risk view first row exposes detail plus risk review");
    await page.locator(".tm-table-wrap tbody tr").first().locator("[data-row-action='client_review']").click();
    await page.waitForFunction(() => document.querySelector(".tm-toast")?.textContent.includes("当前角色无权生成风险复核"),null,{timeout:5000});
    assert.match(await page.locator(".tm-toast").textContent(),/当前角色无权生成风险复核/,"inline risk review blocks system_admin by role gate");
    assert.equal(await page.locator("#client-review-note").count(),0,"blocked inline review does not open the modal");
    // 切operations后行内风险复核直达modal并成功提交
    await selectRole("operations");
    await page.locator(".tm-table-wrap tbody tr").first().locator("[data-row-action='client_review']").click();
    await page.waitForSelector("#client-review-note");
    assert.ok(await page.locator("#client-review-note").isVisible(),"operations inline risk review opens the review modal directly");
    await page.fill("#client-review-note","设备关联4客户需排查集群");
    await page.click("[data-submit-client-review]");
    await page.waitForFunction(() => document.querySelector(".tm-toast")?.textContent.includes("风险复核任务已生成"),null,{timeout:5000});
    assert.match(await page.locator(".tm-toast").textContent(),/风险复核任务已生成/,"operations role submits the inline client risk review");
    await page.click(".dev-partner360-views [data-client-view='all']");
    await page.waitForFunction(() => document.querySelectorAll(".tm-table-wrap tbody tr").length === 20,null,{timeout:5000});
    await selectRole("system_admin");
    await page.locator(".tm-table-wrap tbody tr").first().click();
    await page.waitForSelector("[data-client360-tab]");
    const clientDrawerTabs = await page.locator("[data-client360-tab]").allInnerTexts();
    assert.equal(clientDrawerTabs.length,4,"client 360 drawer keeps four tabs");
    assert.deepEqual(clientDrawerTabs,["概览","风险","归属链路","关联事件"],"client 360 drawer tabs are overview/risk/attribution/events");
    await page.click("[data-client360-tab='risk']");
    await page.waitForSelector("[data-client-risk-review]");
    assert.equal(await page.locator("[data-client-risk-review]").count(),1,"risk tab exposes a single review exit");
    await page.click("[data-client-risk-review]");
    await page.waitForSelector("#client-review-note");
    await page.fill("#client-review-note","设备关联4客户需排查集群");
    await page.click("[data-submit-client-review]");
    await page.waitForFunction(() => document.querySelector(".tm-toast")?.textContent.includes("当前角色无权生成风险复核"),null,{timeout:5000});
    assert.match(await page.locator(".tm-toast").textContent(),/当前角色无权生成风险复核/,"risk review blocks system_admin by default");
    await page.waitForFunction(() => !document.querySelector("#client-review-note"),null,{timeout:5000});
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".tm-drawer"),null,{timeout:5000});
    await selectRole("operations");
    await page.locator(".tm-table-wrap tbody tr").first().click();
    await page.waitForSelector("[data-client360-tab='risk']");
    await page.click("[data-client360-tab='risk']");
    await page.waitForSelector("[data-client-risk-review]");
    await page.click("[data-client-risk-review]");
    await page.waitForSelector("#client-review-note");
    await page.fill("#client-review-note","设备关联4客户需排查集群");
    await page.click("[data-submit-client-review]");
    await page.waitForFunction(() => document.querySelector(".tm-toast")?.textContent.includes("风险复核任务已生成"),null,{timeout:5000});
    assert.match(await page.locator(".tm-toast").textContent(),/风险复核任务已生成/,"operations role submits the client risk review task");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".tm-drawer"),null,{timeout:5000});
    await selectRole("system_admin");

    // Attribution links: isolation panel stays on the page and the exception view absorbs the legacy tab.
    await page.click("[data-menu-item='nav-attribution']");
    await page.waitForSelector(".dev-isolation-panel");
    assert.match(page.url(),/#\/admin-modules\/attribution-links$/,"attribution links menu entry opens the module page");
    assert.ok(await page.locator(".dev-isolation-panel").isVisible(),"isolation panel is a persistent fixture of the attribution page");
    assert.equal(await page.locator(".dev-isolation-domain").count(),2,"isolation panel shows the IB and Affiliate domains");
    assert.equal(await page.locator(".dev-isolation-rule").count(),3,"isolation panel lists three mutual-exclusion rules");
    assert.equal(await page.locator(".tm-table-wrap tbody tr").count(),16,"attribution table merges 10 links and 6 exceptions");
    await page.click(".dev-isolation-panel header [data-attr-view='exception']");
    await page.waitForFunction(() => document.querySelectorAll(".tm-table-wrap tbody tr").length === 6,null,{timeout:5000});
    assert.match(page.url(),/#\/admin-modules\/attribution-links\/view=exception$/,"exception view locks the view in the URL");
    assert.equal(await page.locator(".tm-table-wrap tbody tr").count(),6,"exception view narrows the table to the 6 exception rows");
    await page.click(".dev-isolation-panel header [data-attr-view='all']");
    await page.waitForFunction(() => document.querySelectorAll(".tm-table-wrap tbody tr").length === 16,null,{timeout:5000});
    assert.match(page.url(),/#\/admin-modules\/attribution-links$/,"all view returns to the default attribution URL");

    // Event stream: TraceId search opens the chain drawer; row clicks share the same drawer.
    await page.goto(`${baseUrl}/#/admin-modules/event-stream`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dev-event-search");
    assert.match(page.url(),/#\/admin-modules\/event-stream$/,"event stream menu entry opens the module page");
    // v0.30 行内动作：事件流水首行=单"事件链"按钮，直达链抽屉
    const eventRowActions = await page.locator(".tm-table-wrap tbody tr").first().locator(".dev-row-action").allInnerTexts();
    assert.deepEqual(eventRowActions,["事件链"],"event stream first row exposes a single chain action");
    await page.locator(".tm-table-wrap tbody tr").first().locator("[data-row-action='open_chain']").click();
    await page.waitForSelector(".dev-event-chain-drawer");
    assert.ok(await page.locator(".dev-event-chain-drawer").isVisible(),"inline chain action opens the event chain drawer directly");
    // 跨页残留：路由切换必须清掉链抽屉（eventChainId随路由重置）
    await page.goto(`${baseUrl}/#/admin-modules/partner-list`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dev-partner-stage-board");
    assert.equal(await page.locator(".dev-event-chain-drawer").count(),0,"route switch clears the event chain drawer state");
    await page.goto(`${baseUrl}/#/admin-modules/event-stream`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dev-event-search");
    await page.fill("#event-trace-input","trace-7a3f");
    await page.waitForSelector("[data-event-chain]");
    assert.equal(await page.locator("[data-event-chain]").count(),1,"trace search pins the matching chain hit");
    assert.equal(await page.locator(".tm-table-wrap tbody tr").count(),9,"trace search narrows the table to the chain's 9 nodes");
    await page.click("[data-event-chain]");
    await page.waitForSelector(".dev-event-chain-drawer");
    assert.equal(await page.locator(".dev-event-chain-timeline > div").count(),9,"chain drawer renders the full 9-node timeline");
    const chainJumpButtons = await page.locator("[data-chain-node-target]").count();
    assert.ok(chainJumpButtons >= 5,`chain nodes expose jump targets (${chainJumpButtons})`);
    const beforeChainJumpUrl = page.url();
    await page.locator("[data-chain-node-target]").first().click();
    await page.waitForFunction(() => !document.querySelector(".dev-event-chain-drawer"),null,{timeout:5000});
    assert.notEqual(page.url(),beforeChainJumpUrl,"chain node jump closes the drawer and switches the route");
    await page.goto(`${baseUrl}/#/admin-modules/event-stream`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dev-event-search");
    const rowTraceId = await page.locator(".tm-table-wrap tbody tr[data-trace-id]").first().getAttribute("data-trace-id");
    const rowChainNodes = await page.evaluate(traceId => window.AFF_ADMIN_PROTOTYPE.eventChainCatalog.chains.find(chain => chain.traceId === traceId).chain.length,rowTraceId);
    await page.locator(".tm-table-wrap tbody tr[data-trace-id]").first().click();
    await page.waitForSelector(".dev-event-chain-drawer");
    assert.equal(await page.locator(".dev-event-chain-timeline > div").count(),rowChainNodes,`table row click reopens the chain drawer for ${rowTraceId}`);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".dev-event-chain-drawer"),null,{timeout:5000});
    await page.click("[data-event-trace-clear]");
    await page.waitForFunction(() => !document.querySelector(".dev-event-search-hits") && document.querySelectorAll(".tm-table-wrap tbody tr").length === 20,null,{timeout:5000});

    // Attribution exception alias mirrors the legacy attribution-exception menu entry.
    await page.goto(`${baseUrl}/#/admin-modules/attribution-links/view=exception`,{waitUntil:"domcontentloaded"});
    await page.waitForFunction(() => document.querySelectorAll(".tm-table-wrap tbody tr").length === 6,null,{timeout:5000});
    assert.match(page.url(),/#\/admin-modules\/attribution-links\/view=exception$/,"legacy attribution-exception menu entry opens the exception view");
    await page.click(".dev-isolation-panel header [data-attr-view='all']");
    await page.waitForFunction(() => document.querySelectorAll(".tm-table-wrap tbody tr").length === 16,null,{timeout:5000});

    // v0.31 组4：sub-channel别名菜单导航 → link-list 渠道视角（Sub ID吸收）
    await page.goto(`${baseUrl}/#/admin-modules/link-list/view=channel`,{waitUntil:"domcontentloaded"});
    await page.waitForFunction(() => document.querySelector(".dev-brief-actions [data-link-view].active")?.textContent.includes("渠道"),null,{timeout:5000});
    assert.match(page.url(),/#\/admin-modules\/link-list\/view=channel$/,"legacy sub-channel menu entry opens the link-list channel view");
    await page.waitForFunction(() => document.querySelectorAll(".tm-table-wrap tbody tr").length === 12,null,{timeout:5000});
    assert.equal(await page.locator(".tm-table-wrap tbody tr").count(),12,"channel view lists the 12 Sub ID channels");

    await page.goto(`${baseUrl}/#/admin-modules/partner-list`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dev-partner-stage-board");
    assert.equal(await page.locator(".dev-deep-panel").count(),0,"module page removes the deep interaction workbench");
    await page.click(".tm-head-actions .tm-button.primary");
    await page.waitForSelector(".dev-action-fields");
    assert.ok((await page.locator(".dev-modal").innerText()).includes("执行参数"),"module action modal includes dynamic fields");
    await page.fill("[data-action-field='scope']","合作方列表导出 · 脱敏");
    await page.click("[data-submit-action]");
    await page.waitForSelector(".tm-toast.show");
    assert.match(await page.locator(".tm-toast").textContent(),/导出合作方已提交/,"module export creates an async task");
    await page.locator(".tm-table-wrap tbody input[type=checkbox]").first().check();
    await page.click(".dev-batch-bar [data-action-name='claim']");
    await page.waitForSelector(".dev-modal");
    await page.click("[data-submit-action]");
    await page.waitForSelector(".tm-toast.show");
    assert.match(await page.locator(".tm-toast").textContent(),/1个对象/,"module page supports role-aware write action");
    await page.waitForTimeout(100);
    await page.locator(".tm-table-wrap tbody tr").first().click();
    await page.waitForSelector(".p360-page");
    const partnerPageText = await page.locator(".p360-page").innerText();
    assert.ok(partnerPageText.includes("CRM账户") && partnerPageText.includes("概览"),"partner 360 row click opens the full-page object view");
    await page.goto(`${baseUrl}/#/admin-modules/partner-list`,{waitUntil:"domcontentloaded"});
    await page.click("[data-menu-blueprint='partner-list']");
    await page.waitForSelector("aside[aria-label='菜单蓝图说明']");
    let menuBlueprintText = await page.locator("aside[aria-label='菜单蓝图说明']").innerText();
    assert.ok(menuBlueprintText.includes("合作方列表") && menuBlueprintText.includes("P1") && menuBlueprintText.includes("CRM Partner API"),"module blueprint drawer explains dependencies");
    await page.keyboard.press("Escape");
    await page.goto(`${baseUrl}/#/admin-risk/credit-insight`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".tm-tabs button");
    assert.match(page.url(),/#\/risk-workbench\?tab=objects$/,"MVP menu entry opens the canonical risk page");
    assert.equal(await page.locator(".dev-menu-group.open").count(),1,"navigating from a menu item keeps only its group open");
    await page.goto(`${baseUrl}/#/admin-risk/violation`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".rwb-page");
    assert.match(page.url(),/#\/risk-workbench\?tab=events$/,"legacy violation entry maps to risk events");
    await page.goto(`${baseUrl}/#/admin-risk/fraud`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".rwb-page");
    assert.match(page.url(),/#\/risk-workbench\?tab=blacklist$/,"legacy CRM fraud entry maps to the canonical blacklist tab");
    await page.click("[data-menu-group='system-settings']");
    assert.equal(await page.locator(".dev-menu-group.open").count(),1,"switching groups keeps a single open group");
    await page.click("[data-open-audit]");
    await page.waitForSelector(".dev-audit-search");
    await page.keyboard.press("Escape");
    const moduleTabs = definition.routes.find(route => route.id === "admin-modules").tabs;
    const expectedModulePrimaries = {
      "campaign-list":"新建活动",
      "withdrawal-list":"认领提现",
      "report-channel":"生成渠道建议",
      "config-permission":"新建权限草稿"
    };
    const expectedModuleRows = {"client-list":20,"attribution-links":16,"event-stream":20,"link-list":8,"material-list":12,"postback":5,"tracker":10,"campaign-list":20,"commission-list":8,"statement-list":6,"withdrawal-list":4,"reversal-list":4,"reconciliation":4,"blacklist":6,"support-ticket":4,"report-channel":6,"report-finance":4,"report-risk":5,"config-dictionary":7,"config-permission":7};
    for (const moduleTab of moduleTabs) {
      await page.goto(`${baseUrl}/#/admin-modules/${moduleTab.id}`,{waitUntil:"domcontentloaded"});
      if (moduleTab.id === "support-ticket") {
        await page.waitForURL(/#\/tickets/);
        await page.waitForSelector(".cs-page");
        assert.equal(await page.locator(".cs-page").count(),1,"legacy support entry opens the dedicated customer-service page");
        continue;
      }
      await page.waitForSelector(".dev-module-brief");
      const expectedTitle = moduleTab.id === "blacklist" ? "黑名单" : moduleTab.title;
      await page.waitForFunction(title => document.querySelector(".tm-page-head h1")?.textContent === title,expectedTitle,{timeout:5000}).catch(async error => {
        throw new Error(`${moduleTab.id}: expected title ${expectedTitle}; observed ${await page.locator(".tm-page-head h1").textContent()}; URL ${page.url()}`,{cause:error});
      });
      assert.ok((await page.locator(".tm-page-head h1").textContent()) === expectedTitle,`${moduleTab.id} page title`);
      const expectedRows = expectedModuleRows[moduleTab.id] || 20;
      await page.waitForFunction(count => document.querySelectorAll(".tm-table-wrap tbody tr").length === count,expectedRows,{timeout:5000});
      assert.equal(await page.locator(".tm-table-wrap tbody tr").count(),expectedRows,`${moduleTab.id} module rows`);
      assert.ok(await page.locator(".dev-metric-bar").count() >= 1,`${moduleTab.id} renders the single-line metric bar`);
      assert.equal(await page.locator(".tm-stats").count(),0,`${moduleTab.id} removes the legacy stat cards`);
      assert.equal(await page.locator(".dev-insight-grid").count(),0,`${moduleTab.id} removes the insight grid`);
      assert.equal(await page.locator(".tm-tabs button").count(),0,`${moduleTab.id} avoids 33-tab top bar`);
      assert.equal(await page.locator(".dev-deep-panel").count(),0,`${moduleTab.id} removes the deep interaction workbench`);
      if (expectedModulePrimaries[moduleTab.id]) {
        assert.equal(await page.locator(".tm-head-actions .tm-button.primary").textContent(),expectedModulePrimaries[moduleTab.id],`${moduleTab.id} business-specific primary action`);
      }
    }
    await page.goto(`${baseUrl}/#/admin-modules/campaign-list`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dev-module-brief");
    await page.click(".tm-head-actions .tm-button.primary");
    await page.waitForSelector(".dev-action-fields");
    await page.fill("[data-action-field='name']","Campaign Draft");
    await page.fill("#action-reason","创建活动草稿");
    await page.click("[data-submit-action]");
    await page.waitForSelector(".tm-toast.show");
    assert.match(await page.locator(".tm-toast").textContent(),/新建活动已提交/,"module new draft writes a new object");
    await page.fill("[data-draft-filter='keyword']","Campaign Draft");
    await page.click("[data-action='query']");
    assert.ok((await page.locator(".tm-table-wrap tbody").innerText()).includes("Campaign Draft"),"new draft appears in module table");

    // v0.31 组4断言：推广管理四页（link-list双视角 / material双视图 / postback试投 / tracker路径）
    // --- link-list：默认8条官方链接；[data-link-view]=2；切channel后URL锁定+12行 ---
    await page.goto(`${baseUrl}/#/admin-modules/link-list`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dev-brief-actions");
    await page.waitForFunction(() => document.querySelectorAll(".tm-table-wrap tbody tr").length === 8,null,{timeout:5000});
    assert.equal(await page.locator(".tm-table-wrap tbody tr").count(),8,"link-list default view lists the 8 official links");
    assert.equal(await page.locator(".dev-brief-actions [data-link-view]").count(),2,"link-list brief header exposes the dual view switcher");
    await page.click(".dev-brief-actions [data-link-view='channel']");
    await page.waitForFunction(() => location.hash.endsWith("/link-list/view=channel") && document.querySelectorAll(".tm-table-wrap tbody tr").length === 12,null,{timeout:5000});
    assert.match(page.url(),/#\/admin-modules\/link-list\/view=channel$/,"channel view locks the view in the URL");
    assert.equal(await page.locator(".tm-table-wrap tbody tr").count(),12,"channel view swaps the table to the 12 Sub ID rows");
    // 切operations后官方链接行内停用动作与toast回写
    await selectRole("operations");
    await page.click(".dev-brief-actions [data-link-view='all']");
    await page.waitForFunction(() => document.querySelectorAll(".tm-table-wrap tbody tr").length === 8,null,{timeout:5000});
    const linkRowActions = await page.locator(".tm-table-wrap tbody tr").first().locator(".dev-row-action").allInnerTexts();
    assert.deepEqual(linkRowActions,["详情","停用"],"operations link row exposes detail plus disable");
    await page.locator(".tm-table-wrap tbody tr").first().locator("[data-row-action='link_toggle']").click();
    await page.waitForFunction(() => document.querySelector(".tm-toast")?.textContent.includes("链接状态已更新"),null,{timeout:5000});
    assert.match(await page.locator(".tm-toast").textContent(),/链接状态已更新/,"link toggle writes back with a toast");
    await selectRole("system_admin");

    // --- material-list：12行；[data-material-view]=2；网格12卡无表格；卡片开抽屉；列表态operations审核通过上架 ---
    await page.goto(`${baseUrl}/#/admin-modules/material-list`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dev-brief-actions");
    await page.waitForFunction(() => document.querySelectorAll(".tm-table-wrap tbody tr").length === 12,null,{timeout:5000});
    assert.equal(await page.locator(".tm-table-wrap tbody tr").count(),12,"material-list table lists the 12 materials");
    assert.equal(await page.locator(".dev-brief-actions [data-material-view]").count(),2,"material brief header exposes the list/grid view toggle");
    await page.click(".dev-brief-actions [data-material-view='grid']");
    await page.waitForFunction(() => document.querySelectorAll(".dev-material-card").length === 12,null,{timeout:5000});
    assert.equal(await page.locator(".dev-material-card").count(),12,"grid view renders 12 material cards");
    assert.equal(await page.locator(".tm-table-wrap tbody tr[data-row]").count(),0,"grid view replaces the table rows");
    assert.ok(await page.locator(".dev-material-thumb").count() === 12 && await page.locator(".dev-spec-flag").count() >= 2,"material cards render thumbs and spec flags");
    await page.locator(".dev-material-card").first().click();
    await page.waitForSelector(".tm-drawer");
    assert.ok(await page.locator(".tm-drawer").isVisible(),"material card click opens the detail drawer");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".tm-drawer"),null,{timeout:5000});
    await page.click(".dev-brief-actions [data-material-view='list']");
    await page.waitForFunction(() => document.querySelectorAll(".tm-table-wrap tbody tr").length === 12 && !document.querySelector(".dev-material-card"),null,{timeout:5000});
    // operations按素材名定位"阿拉伯语横幅（试验）"行内审核 → modal → approve → 上架toast
    await selectRole("operations");
    const arabicRow = page.locator(".tm-table-wrap tbody tr",{has:page.locator("td",{hasText:"阿拉伯语横幅（试验）"})}).first();
    await arabicRow.locator("[data-row-action='mat_review']").click();
    await page.waitForSelector("#mat-review-note");
    assert.ok(await page.locator("#mat-review-note").isVisible(),"inline material review opens the review modal");
    await page.fill("#mat-review-note","试验素材确认投放市场后放行");
    await page.click("[data-submit-mat-review='approve']");
    await page.waitForFunction(() => document.querySelector(".tm-toast")?.textContent.includes("素材已上架"),null,{timeout:5000});
    assert.match(await page.locator(".tm-toast").textContent(),/素材已上架/,"material approve puts the material on shelf");
    await selectRole("system_admin");

    // --- postback：5行；首行动作含试投；试投modal 3事件chip；ftd发送toast；详情抽屉双Tab与投递监控 ---
    await page.goto(`${baseUrl}/#/admin-modules/postback`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dev-metric-bar");
    await page.waitForFunction(() => document.querySelectorAll(".tm-table-wrap tbody tr").length === 5,null,{timeout:5000});
    assert.equal(await page.locator(".tm-table-wrap tbody tr").count(),5,"postback table lists the 5 configs");
    const pbRowActions = await page.locator(".tm-table-wrap tbody tr").first().locator(".dev-row-action").allInnerTexts();
    assert.ok(pbRowActions.includes("试投"),`postback first row exposes the test action (${pbRowActions.join("/")})`);
    await page.locator(".tm-table-wrap tbody tr").first().locator("[data-row-action='pb_test']").click();
    await page.waitForSelector("[data-pb-test-event]");
    assert.equal(await page.locator("[data-pb-test-event]").count(),3,"test modal offers the three event chips");
    await page.click("[data-pb-test-event='ftd']");
    await page.click("[data-submit-pb-test]");
    await page.waitForFunction(() => document.querySelector(".tm-toast")?.textContent.includes("试投已发送"),null,{timeout:5000});
    assert.match(await page.locator(".tm-toast").textContent(),/试投已发送/,"postback test send writes back with a toast");
    // 详情抽屉双Tab：默认参数映射，切投递监控含30日发送
    await page.locator(".tm-table-wrap tbody tr").first().locator("[data-row-action='detail']").click();
    await page.waitForSelector("[data-postback-tab]");
    assert.equal(await page.locator("[data-postback-tab]").count(),2,"postback detail drawer exposes the mapping/delivery tabs");
    assert.ok(await page.locator(".dev-map-table").isVisible(),"mapping tab renders the param map table");
    await page.click("[data-postback-tab='delivery']");
    await page.waitForFunction(() => document.querySelector(".tm-drawer")?.innerText.includes("30日发送"),null,{timeout:5000});
    assert.ok((await page.locator(".tm-drawer").innerText()).includes("30日发送"),"delivery tab swaps in the 30d delivery metrics");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".tm-drawer"),null,{timeout:5000});

    // --- tracker：10行；首行唯一动作"查路径"；点击开转化路径抽屉，时间线节点≥3 ---
    await page.goto(`${baseUrl}/#/admin-modules/tracker`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dev-metric-bar");
    await page.waitForFunction(() => document.querySelectorAll(".tm-table-wrap tbody tr").length === 10,null,{timeout:5000});
    assert.equal(await page.locator(".tm-table-wrap tbody tr").count(),10,"tracker table lists the 10 click sessions");
    const trackerRowActions = await page.locator(".tm-table-wrap tbody tr").first().locator(".dev-row-action").allInnerTexts();
    assert.deepEqual(trackerRowActions,["查路径"],"tracker first row exposes the single path action");
    await page.locator(".tm-table-wrap tbody tr").first().locator("[data-row-action='tracker_path']").click();
    await page.waitForSelector(".dev-event-chain-drawer");
    assert.ok(await page.locator(".dev-event-chain-drawer").isVisible(),"tracker path action opens the conversion path drawer");
    const trackerNodes = await page.locator(".dev-event-chain-drawer .dev-event-chain-timeline > div").count();
    assert.ok(trackerNodes >= 3,`tracker path timeline renders at least 3 nodes (${trackerNodes})`);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".dev-event-chain-drawer"),null,{timeout:5000});

    await page.goto(`${baseUrl}/#/admin-workbench`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dash-v2-queue");

    for (const role of Object.keys(definition.roles)) {
      await selectRole(role);
      assert.equal(await page.locator("[data-role]").inputValue(),role,`${role} role can be selected from the topbar`);
      assert.ok(await page.locator(".dash-v2-quick-filter").isVisible(),`${role} dashboard keeps the status quick filter`);
    }
    await selectRole("system_admin");

    assert.equal(await page.locator("[data-open-notifications]").getAttribute("aria-label"),"通知");
    assert.ok((await page.locator("[data-open-notifications] .dev-badge").textContent()) === "4","unread notification count");
    await page.click("[data-open-notifications]");
    await page.waitForSelector(".dev-notification-list");
    assert.equal(await page.locator(".dev-notification-list article").count(),6,"notification records");
    await page.locator("[data-mark-notification]").first().click();
    assert.equal(await page.locator("[data-open-notifications] .dev-badge").textContent(),"3","notification marked read");
    await page.click("[data-action='mark-all-notifications']");
    assert.equal(await page.locator("[data-open-notifications] .dev-badge").count(),0,"all notifications marked read");
    await page.keyboard.press("Escape");

    await page.click("[data-open-permissions]");
    await page.waitForSelector(".dev-permission-scope");
    const permissionText = await page.evaluate(() => document.querySelector(".dev-permission-scope")?.innerText || "");
    assert.ok(permissionText.includes("技术配置"),`permission scope: ${permissionText}`);
    assert.ok((await page.evaluate(() => document.querySelector(".tm-drawer")?.innerText || "")).includes("搜索可见范围"),"permission drawer shows search scope");
    assert.ok(await page.evaluate(() => Boolean(document.querySelector(".dev-chip.active"))),"allowed action chip");
    await page.keyboard.press("Escape");

    await page.evaluate(() => localStorage.removeItem("affiliate-admin-prototype-recent-searches-v1:system_admin"));
    await page.keyboard.press("Control+k");
    await page.waitForSelector("[data-search-keyword]");
    assert.ok(await page.evaluate(() => document.activeElement?.matches("[data-search-keyword]")),"Ctrl+K opens and focuses global search");
    await page.fill("[data-search-keyword]","partner-1001");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".dev-global-search-list article");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Control+k");
    await page.waitForSelector("[data-search-recent='partner-1001']");
    await page.click("[data-search-recent='partner-1001']");
    await page.waitForSelector(".dev-global-search-list article");
    assert.equal(await page.locator("[data-search-keyword]").inputValue(),"partner-1001","recent search restores keyword");
    await page.click("[data-clear-search-recent]");
    assert.equal(await page.locator("[data-search-recent]").count(),0,"recent searches can be cleared");
    await page.keyboard.press("Escape");

    await selectRole("operations");
    await page.keyboard.press("Control+k");
    await page.fill("[data-search-keyword]","risk-case-5001");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    const operationsSearchTypes = await page.locator(".dev-global-search-list article > div > span").allInnerTexts();
    assert.ok(operationsSearchTypes.length > 0,"role-filtered search keeps allowed related report objects");
    assert.ok(operationsSearchTypes.every(text => !text.startsWith("风险案件")),"role-filtered search hides forbidden object type");
    assert.equal(await page.locator("[data-search-type='风险案件']").count(),0,"role-filtered search hides forbidden type chip");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await selectRole("system_admin");
    await page.keyboard.press("Control+k");
    await page.fill("[data-search-keyword]","risk-case-5001");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".dev-global-search-list article");
    assert.ok(await page.locator("[data-search-type='风险案件']").count() > 0,"supervisor/admin role restores risk search type");
    await page.keyboard.press("Escape");

    await page.click("[data-open-search]");
    await page.waitForSelector("[data-search-keyword]");
    assert.ok(await page.locator("aside[aria-label='全局搜索']").isVisible(),"global search drawer opens");
    await page.fill("[data-search-keyword]","partner-1001");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".dev-global-search-list article");
    assert.ok(await page.locator(".dev-global-search-list article").count() > 0,"partner search result");
    await page.click("[data-search-type='报表维度']");
    const searchTypes = await page.locator(".dev-global-search-list article > div > span").allInnerTexts();
    assert.ok(searchTypes.length > 0 && searchTypes.every(text => text.startsWith("报表维度")),"search type filter");
    await page.locator("[data-search-result]").first().click();
    await page.waitForSelector(".tm-drawer");
    assert.match(page.url(),/#\/admin-performance\/roi/);
    assert.ok((await page.evaluate(() => document.querySelector(".tm-drawer")?.innerText || "")).includes("partner-1001"),"partner search opens report drilldown");
    assert.equal(await page.locator("aside[aria-label='全局搜索']").count(),0,"search closes after opening result");
    await page.keyboard.press("Escape");

    await page.click("[data-open-search]");
    await page.fill("[data-search-keyword]","risk-case-5001");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".dev-global-search-list article");
    await page.locator("[data-search-result]").first().click();
    await page.waitForSelector(".dev-risk-graph");
    assert.match(page.url(),/#\/admin-review\/risk-review/);
    await page.keyboard.press("Escape");

    await page.click("[data-open-search]");
    await page.fill("[data-search-keyword]","CRM API");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".dev-global-search-list article");
    await page.locator("[data-search-result]").first().click();
    await page.waitForSelector(".tm-drawer");
    assert.match(page.url(),/#\/admin-review\/integration/);
    assert.ok((await page.evaluate(() => document.querySelector(".tm-drawer")?.innerText || "")).includes("CRM API"),"integration search opens system drawer");
    await page.keyboard.press("Escape");

    await page.click("[data-open-search]");
    await page.fill("[data-search-keyword]","trace-workbench-002");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".dev-global-search-list article");
    await page.locator("[data-search-result]").first().click();
    await page.waitForSelector(".dev-audit-search");
    assert.equal(await page.locator(".dev-audit-search").inputValue(),"trace-workbench-002","audit search carries TraceId");
    await page.keyboard.press("Escape");

    await page.click("[data-open-search]");
    await page.fill("[data-search-keyword]","trace-admin-config-1");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".dev-global-search-list article");
    await page.locator("[data-search-result]").first().click();
    await page.waitForSelector(".tm-drawer");
    assert.match(page.url(),/#\/admin-config\/overview\/overview-001$/);
    await page.keyboard.press("Escape");
    await page.click("[data-open-search]");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("aside[aria-label='全局搜索']").count(),0,"global search closes on Escape");

    await page.goto(`${baseUrl}/#/admin-workbench`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dash-v2-queue-tabs");
    assert.equal(await page.locator(".dev-filterbar").count(),0,"dashboard does not render the full filter bar");
    assert.ok(await page.locator(".dash-v2-quick-filter").isVisible(),"dashboard status quick filter remains available");
    await page.click("[data-dashboard-status='pending_approval']");
    assert.ok((await page.locator(".dash-v2-table-wrap tbody").textContent()).includes("待审批"));
    await page.click("[data-dashboard-status='']");

    await page.goto(`${baseUrl}/#/admin-modules/partner-list`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dev-filterbar");
    await page.fill("[data-draft-filter='keyword']","partner-1001");
    await page.click("[data-action='query']");
    assert.equal(await page.locator(".tm-table-wrap tbody tr").count(),1,"keyword filter");
    await page.fill("[data-view-name]","合作方视图");
    await page.locator("[data-view-name]").evaluate(node => node.dispatchEvent(new Event("change",{bubbles:true})));
    await page.click("[data-action='save-view']");
    await page.waitForSelector("[data-apply-view]");
    assert.equal(await page.locator("[data-apply-view]").count(),1,"saved view created");
    await page.click("[data-action='reset']");
    assert.notEqual(await page.locator("[data-draft-filter='keyword']").inputValue(),"partner-1001","filter reset");
    await page.click("[data-apply-view]");
    assert.equal(await page.locator("[data-draft-filter='keyword']").inputValue(),"partner-1001","saved view applied");
    await page.click("[data-delete-view]");
    assert.equal(await page.locator("[data-apply-view]").count(),0,"saved view deleted");

    await page.goto(`${baseUrl}/#/admin-workbench`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dash-v2-queue-tabs");
    await page.click("[data-dashboard-queue='approvals']");
    assert.ok((await page.locator(".dash-v2-table-wrap tbody").textContent()).includes("待审批"));
    await page.click("[data-dashboard-queue='all']");
    assert.equal(await page.locator(".dash-v2-table-wrap tbody tr").count(),10,"dashboard queue returns to the first ten tasks");

    await page.click("[data-open-audit]");
    await page.waitForSelector(".dev-audit-search");
    await page.fill(".dev-audit-search","case-group-001");
    await page.locator(".dev-audit-search").evaluate(node => node.dispatchEvent(new Event("change",{bubbles:true})));
    await page.waitForTimeout(100);
    const auditText = await page.evaluate(() => document.querySelector(".dev-audit-list")?.innerText || "");
    assert.ok(auditText.includes("案件组拆分"),`audit search result: ${auditText}`);
    await page.keyboard.press("Escape");

    // Dashboard summaries and the full queue resolve the same task resource.
    await page.goto(`${baseUrl}/#/admin-workbench`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dash-v2-table-wrap [data-dashboard-task]");
    const pendingSourceId = await page.locator(".dash-v2-table-wrap [data-dashboard-task]").first().getAttribute("data-dashboard-task");
    await page.locator(".dash-v2-table-wrap [data-dashboard-task]").first().click();
    await page.waitForSelector(".tq-drawer");
    assert.equal(new URLSearchParams(new URL(page.url()).hash.split("?")[1]).get("task_id"),pendingSourceId);
    assert.ok((await page.locator(".tq-drawer").innerText()).includes(pendingSourceId),"shared task detail opens");
    await page.goto(`${baseUrl}/#/admin-workbench`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dash-v2-queue-tabs");
    assert.ok(await page.locator(`[data-dashboard-task="${pendingSourceId}"]`).count(),"task remains available from the same dashboard summary");

    for (const route of businessRoutes) {
      for (const routeTab of route.tabs) {
        await page.goto(`${baseUrl}/#/${route.id}/${routeTab.id}`,{waitUntil:"domcontentloaded"});
        if (route.id === "admin-config" || route.id === "admin-system-config") {
          assert.equal(await page.locator(".tm-tabs").count(),0,`${route.title} pages are navigated from the left menu`);
        } else {
          await page.waitForSelector(".tm-tabs button");
          assert.equal(await page.locator(".tm-tabs button").count(),route.tabs.length,`${route.title} tab count`);
        }
        const usesConfigSpecificSummary = (route.id === "admin-config" && routeTab.id === "overview") || (route.id === "admin-system-config" && routeTab.id === "system");
        if (usesConfigSpecificSummary) {
          assert.ok(await page.locator(routeTab.id === "overview" ? ".dev-config-overview-panel" : ".dev-system-config-panel").count() >= 1,`${route.id}/${routeTab.id} renders its configuration-specific summary`);
        } else if (route.id === "admin-config") {
          assert.ok(await page.locator(".dev-config-subgroup-panel").count() >= 1,`${route.id}/${routeTab.id} renders its versioned subgroup workspace`);
        } else {
          assert.ok(await page.locator(".dev-metric-bar").count() >= 1,`${route.id}/${routeTab.id} renders the single-line metric bar`);
        }
        assert.equal(await page.locator(".tm-stats").count(),0,`${route.id}/${routeTab.id} removes the legacy stat cards`);
        assert.equal(await page.locator(".dev-insight-grid").count(),0,`${route.id}/${routeTab.id} removes the insight grid`);
        assert.ok(await page.locator(".tm-table-wrap table").first().isVisible(),`${route.id}/${routeTab.id} table`);
        assert.equal(await page.locator(".dev-deep-panel").count(),0,`${route.id}/${routeTab.id} removes the deep interaction workbench`);
      }
      assert.equal(route.tabs.reduce((sum,item) => sum + item.columns.length + 1,0) > 0,true,`${route.title} columns defined`);
    }

    await page.goto(`${baseUrl}/#/admin-config/price`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dev-open-tabs");
    assert.ok(await page.locator(".dev-open-tabs > span").count() >= 2,"opened tabs track navigation");
    const pricePanelText = await page.locator(".dev-config-subgroup-panel").innerText();
    assert.ok(pricePanelText.includes("四档公用基础价格") && pricePanelText.includes("国家系数") && pricePanelText.includes("质量服务附加比例"),"price domain snapshot renders pricing rules");
    const priceText = await page.locator(".dev-config-snapshot-panel .dev-snapshot-table tbody").textContent();
    assert.ok(priceText.includes("泰国") && priceText.includes("印度尼西亚"),"price domain rows");

    await page.goto(`${baseUrl}/#/admin-config/hold`,{waitUntil:"domcontentloaded"});
    const holdPanelText = await page.locator(".dev-config-subgroup-panel").innerText();
    assert.ok(holdPanelText.includes("基础结算中") && holdPanelText.includes("国家附加"),"hold snapshot renders settlement rules");
    assert.ok(holdPanelText.includes("不重置，累计计时"),"hold snapshot includes day-based rule");

    await page.goto(`${baseUrl}/#/admin-config/hard-rule`,{waitUntil:"domcontentloaded"});
    const hardTableText = await page.locator(".dev-config-snapshot-panel .dev-snapshot-table tbody").textContent();
    assert.ok(hardTableText.includes("HARD-RULE-01") && hardTableText.includes("规则触发条件"),"hard-rule snapshot row");

    await page.goto(`${baseUrl}/#/admin-config/overview`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dev-config-overview-panel");
    assert.equal(await page.locator(".dev-config-version-panel").count(),0,"configuration version panel is removed from the page");
    assert.equal(await page.locator(".dev-release-panel").count(),0,"release package panel is removed from the page");
    assert.equal(await page.locator(".dev-config-overview-table tbody tr").count(),19,"business configuration overview remains available");
    assert.equal(await page.locator(".tm-tabs").count(),0,"business configuration pages use the left menu");
    assert.ok((await page.locator(".dev-menu-group.open").innerText()).includes("业务配置"),"system settings exposes business configuration");
    assert.ok((await page.locator(".dev-menu-group.open").innerText()).includes("系统配置"),"system settings exposes system configuration");
    await page.click("[data-menu-item='nav-system-config']");
    await page.waitForSelector(".dev-system-config-panel");
    assert.match(page.url(),/#\/admin-system-config\/system$/,"system configuration has an independent route");
    assert.equal(await page.locator(".tm-tabs").count(),0,"system configuration pages use the left menu");
    assert.ok((await page.locator(".dev-system-config-panel").innerText()).includes("系统管理范围"),"system configuration scope is separate");
    await page.click("[data-menu-item='nav-business-config']");
    await page.waitForSelector(".dev-config-overview-panel");
    assert.match(page.url(),/#\/admin-config\/overview$/,"business configuration returns from the left menu");

    await page.goto(`${baseUrl}/#/admin-review/risk-review`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dev-risk-panel");
    assert.equal(await page.locator(".dev-risk-list article").count(),3,"risk case count");
    await page.click("[data-risk-case-open='risk-case-5001']");
    await page.waitForSelector(".dev-risk-graph");
    let riskCaseText = await page.evaluate(() => document.querySelector(".tm-drawer")?.innerText || "");
    assert.ok(riskCaseText.includes("风险关系图") && riskCaseText.includes("成员与逐案资金"),"risk case sections");
    assert.ok(riskCaseText.includes("组结论不自动继承到成员资金"),"group and commission boundary");

    await page.click("[data-risk-case-action='split']");
    await page.fill("#risk-case-reason","设备与支付特征不匹配");
    await page.click("[data-submit-risk-case]");
    riskCaseText = await page.evaluate(() => document.querySelector(".tm-drawer")?.innerText || "");
    assert.ok(riskCaseText.includes("误合并候选") && riskCaseText.includes("无"),"mis-merged member split");

    await page.click("[data-commission-action='release'][data-commission-id='comm-3003']");
    riskCaseText = await page.evaluate(() => document.querySelector(".tm-drawer")?.innerText || "");
    assert.ok(riskCaseText.includes("已解除"),"commission independently released");

    await page.keyboard.press("Escape");
    await selectRole("risk_supervisor");
    await page.click("[data-risk-case-open='risk-case-5001']");
    await page.click("[data-risk-case-action='escalate']");
    await page.fill("#risk-case-reason","材料超时并存在新增风险信号");
    await page.click("[data-submit-risk-case]");
    riskCaseText = await page.evaluate(() => document.querySelector(".tm-drawer")?.innerText || "");
    assert.ok(riskCaseText.includes("已升级") && riskCaseText.includes("新增+已有链接"),"investigation escalated");

    await page.click("[data-risk-case-action='conclude']");
    await page.fill("#risk-case-reason","确认同设备/IP集群事实");
    await page.click("[data-submit-risk-case]");
    riskCaseText = await page.evaluate(() => document.querySelector(".tm-drawer")?.innerText || "");
    assert.ok(riskCaseText.includes("组结论已确认"),"group conclusion confirmed");

    await page.click("[data-risk-case-action='release']");
    await page.fill("#risk-case-reason","风险解除且结算前重检通过");
    await page.click("[data-submit-risk-case]");
    riskCaseText = await page.evaluate(() => document.querySelector(".tm-drawer")?.innerText || "");
    assert.ok(riskCaseText.includes("统一隔离队列") && riskCaseText.includes("已解除"),"quarantine released");
    await page.click(".tm-drawer header [data-close-risk-case]");
    await selectRole("system_admin");

    await page.goto(`${baseUrl}/#/admin-performance/roi`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dev-report-panel");
    assert.equal(await page.locator(".dev-report-charts article").count(),3,"ROI chart count");
    assert.equal(await page.locator(".dev-report-dimensions article").count(),3,"ROI dimension count");
    await page.click("[data-report-drilldown='roi-dim-701']");
    await page.waitForSelector(".tm-drawer");
    let reportText = await page.evaluate(() => document.querySelector(".tm-drawer")?.innerText || "");
    assert.ok(reportText.includes("下钻对象") && reportText.includes("客户") && reportText.includes("佣金") && reportText.includes("风险案件"),"report drilldown objects");
    await page.click("[data-report-risk-case]");
    await page.waitForSelector(".dev-risk-graph");
    await page.click(".tm-drawer header [data-close-risk-case]");

    await page.click("[data-report-drilldown='roi-dim-701']");
    await page.click("[data-report-suggestion]");
    await page.fill("#report-suggestion-reason","转化质量稳定且ROI大于1.2，建议放量评审");
    await page.click("[data-submit-report-suggestion]");
    await page.waitForSelector(".tm-toast.show");
    assert.match(await page.locator(".tm-toast").textContent(),/报表建议已生成/);
    await page.click(".tm-drawer header [data-close-report-drilldown]");

    await page.click("[data-open-report-export]");
    await page.waitForSelector(".dev-member-table");
    const exportCount = await page.locator(".dev-member-table > div").count();
    assert.ok(exportCount >= 4,"export task list");
    await page.click("[data-create-report-export]");
    await page.waitForSelector(".tm-toast.show");
    assert.equal(await page.locator(".dev-member-table > div").count(),exportCount + 1,"export task created");
    await page.locator("[data-report-export-cancel]:not([disabled])").first().click({force:true});
    const exportText = await page.evaluate(() => document.querySelector(".dev-member-table")?.innerText || "");
    assert.ok(exportText.includes("已取消"),`export task cancelled: ${exportText}`);
    await page.click(".tm-drawer header [data-close-report-export]");

    await page.goto(`${baseUrl}/#/admin-performance/quality`,{waitUntil:"domcontentloaded"});
    assert.equal(await page.locator(".dev-report-charts article").count(),3,"quality charts");
    await page.goto(`${baseUrl}/#/admin-performance/guarantee-coverage`,{waitUntil:"domcontentloaded"});
    assert.equal(await page.locator(".dev-report-charts article").count(),3,"guarantee charts");

    await page.goto(`${baseUrl}/#/admin-review/integration`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dev-integration-panel");
    assert.equal(await page.locator(".dev-integration-panel .dev-report-charts article").count(),3,"integration health charts");
    assert.equal(await page.locator(".dev-integration-systems > div").count(),5,"integration systems including header");
    assert.equal(await page.locator(".dev-integration-gaps > div").count(),4,"integration gaps including header");
    assert.equal(await page.locator(".dev-integration-tasks > div").count(),4,"integration tasks including header");
    await page.click("[data-integration-system='crm']");
    await page.waitForSelector(".tm-drawer");
    let integrationText = await page.evaluate(() => document.querySelector(".tm-drawer")?.innerText || "");
    assert.ok(integrationText.includes("健康状态") && integrationText.includes("依赖能力") && integrationText.includes("资金影响"),"integration system detail");
    await page.click(".tm-drawer footer [data-integration-recheck]");
    integrationText = await page.evaluate(() => document.querySelector(".tm-drawer")?.innerText || "");
    assert.ok(integrationText.includes("恢复中"),"integration system recheck");
    await page.click(".tm-drawer header [data-close-integration-system]");

    await page.click("[data-integration-backfill='gap-801']");
    await page.waitForSelector(".tm-toast.show");
    assert.match(await page.locator(".tm-toast").textContent(),/幂等补数已提交/);
    const gapText = await page.evaluate(() => document.querySelector(".dev-integration-gaps")?.innerText || "");
    assert.ok(gapText.includes("处理中"),"integration gap processing");
    await page.click("[data-integration-backfill='gap-801']");
    await page.waitForSelector(".tm-toast.show");
    assert.match(await page.locator(".tm-toast").textContent(),/同一幂等键正在补数/);

    await page.click("[data-integration-retry='int-802']");
    await page.waitForSelector(".tm-toast.show");
    assert.match(await page.locator(".tm-toast").textContent(),/集成任务已重试/);
    await page.click("[data-integration-cancel='int-803']");
    await page.waitForSelector(".tm-toast.show");
    assert.match(await page.locator(".tm-toast").textContent(),/集成任务已取消/);
    await page.click(".dev-integration-panel > header [data-integration-recheck]");
    await page.waitForSelector(".tm-toast.show");
    assert.match(await page.locator(".tm-toast").textContent(),/集成健康检查已执行/);

    await page.waitForSelector(".dev-governance-panel");
    assert.equal(await page.locator(".dev-governance-panel .dev-chip").count(),4,"data classification count");
    assert.equal(await page.locator(".dev-governance-retention > div").count(),5,"retention policies including header");
    assert.equal(await page.locator(".dev-governance-fields > div").count(),4,"field authorization requests including header");
    assert.equal(await page.locator(".dev-governance-deletions > div").count(),4,"deletion tasks including header");
    assert.equal(await page.locator(".dev-governance-breaches > div").count(),3,"breach incidents including header");

    await page.click(".dev-governance-panel > header [data-open-report-export]");
    await page.waitForSelector(".dev-export-table");
    await page.click("[data-governance-action='approve_export'][data-governance-target='export-702']");
    await page.fill("#governance-reason","合规确认脱敏字段和导出范围");
    await page.click("[data-submit-governance]");
    await page.waitForSelector(".tm-toast.show");
    assert.match(await page.locator(".tm-toast").textContent(),/审批导出已提交/);
    const exportCenterText = await page.evaluate(() => document.querySelector(".dev-export-table")?.innerText || "");
    assert.ok(exportCenterText.includes("质量看板客户明细") && exportCenterText.includes("可下载") && exportCenterText.includes("已通过"),"export approval closure");
    await page.click(".tm-drawer header [data-close-report-export]");

    await page.click("[data-governance-action='authorize_field'][data-governance-target='field-auth-601']");
    await page.fill("#governance-reason","运营复核申诉需要短期授权");
    await page.click("[data-submit-governance]");
    await page.waitForSelector(".tm-toast.show");
    assert.match(await page.locator(".tm-toast").textContent(),/批准字段授权已提交/);

    await page.click("[data-governance-action='approve_deletion'][data-governance-target='delete-601']");
    await page.fill("#governance-reason","保留期已满且无合规冻结");
    await page.click("[data-submit-governance]");
    await page.waitForSelector(".tm-toast.show");
    assert.match(await page.locator(".tm-toast").textContent(),/批准删除或匿名化已提交/);

    await page.click("[data-governance-action='notify_breach'][data-governance-target='breach-601']");
    await page.fill("#governance-reason","已按SLA通知安全、合规和系统负责人");
    await page.click("[data-submit-governance]");
    await page.waitForSelector(".tm-toast.show");
    assert.match(await page.locator(".tm-toast").textContent(),/记录Breach通知已提交/);
    const governanceText = await page.evaluate(() => document.querySelector(".dev-governance-panel")?.innerText || "");
    assert.ok(governanceText.includes("已通知"),"breach notification recorded");

    await page.goto(`${baseUrl}/#/admin-risk/hard-hit`,{waitUntil:"domcontentloaded"});
    await page.click(".tm-table-wrap tbody tr:first-child");
    await page.waitForSelector(".tm-drawer");
    assert.ok(await page.locator(".dev-audit-list").isVisible());
    await page.click(".tm-drawer [data-action-name='create_review']");
    assert.equal(await page.locator("#admin-modal-root .dev-modal").count(),1,"detail action mounts one top-level modal");
    assert.ok(await page.locator("#admin-modal-root .dev-modal").isVisible(),"detail action modal is visible above the drawer");
    await page.click("#admin-modal-root .dev-modal [data-close-modal]");
    await page.keyboard.press("Escape");

    await page.goto(`${baseUrl}/#/admin-config/hard-rule`,{waitUntil:"domcontentloaded"});
    await page.locator("[data-config-version-copy-current]").first().click();
    await page.waitForSelector("#admin-modal-root .dev-config-version-modal");
    assert.equal(await page.locator("#admin-modal-root .dev-config-version-modal").count(),1,"config version action mounts one top-level modal");
    assert.ok(await page.locator("#admin-modal-root .dev-config-version-modal").isVisible(),"config version modal is visible");
    const modalBounds = await page.locator("#admin-modal-root .dev-config-version-modal").boundingBox();
    assert.ok(modalBounds && modalBounds.x >= 0 && modalBounds.y >= 0,"config version modal stays inside the viewport");
    await page.locator("#admin-modal-root .dev-config-version-modal [data-close-config-version-modal]").first().click();

    await page.goto(`${baseUrl}/#/admin-risk/hard-hit`,{waitUntil:"domcontentloaded"});
    await selectScenario("empty");
    await page.waitForSelector(".tm-empty");
    await selectScenario("loading");
    await page.waitForSelector(".dev-skeleton-table");
    await selectScenario("forbidden");
    await page.waitForSelector(".dev-placeholder");
    await selectScenario("normal");

    await page.evaluate(() => document.querySelector("[data-action='columns']")?.click());
    await page.waitForSelector(".dev-column-panel");
    const columnCount = await page.locator(".dev-column-panel label").count();
    assert.ok(columnCount >= 5);
    await page.evaluate(() => document.querySelector("[data-action='columns']")?.click());

    await selectRole("audit");
    assert.equal(await page.locator(".tm-head-actions [data-action-name]").count(),0);
    await selectRole("system_admin");

    for (const viewport of [{width:1440,height:960},{width:1279,height:900},{width:390,height:844}]) {
      await page.setViewportSize(viewport);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1,`${viewport.width}px document overflow: ${overflow}px`);
    }
    await page.setViewportSize({width:1440,height:960});
    const palette = await page.evaluate(() => ({
      body:getComputedStyle(document.body).backgroundColor,
      sidebar:getComputedStyle(document.querySelector(".tm-sidebar")).backgroundColor,
      stat:getComputedStyle(document.querySelector(".dev-metric-bar")).backgroundColor,
      accent:(() => {const node=document.createElement("div");node.style.color="var(--accent)";document.body.append(node);const value=getComputedStyle(node).color;node.remove();return value;})()
    }));
    assert.equal(palette.body,"rgb(247, 243, 237)");
    assert.equal(palette.sidebar,"rgb(37, 39, 35)");
    assert.equal(palette.stat,"rgb(255, 253, 249)");
    assert.equal(palette.accent,"rgb(148, 100, 67)");
    await page.goto(`${baseUrl}/#/admin-workbench`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".dash-v2-queue-tabs");
    for (const viewport of [{width:1440,height:960},{width:1279,height:900},{width:390,height:844}]) {
      await page.setViewportSize(viewport);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1,`workbench ${viewport.width}px document overflow: ${overflow}px`);
    }
    await page.setViewportSize({width:1440,height:960});
    await page.screenshot({path:path.join(root,".artifacts","admin-prototype-v32.png"),fullPage:true});
    assert.equal(errors.length,0,`Browser errors: ${errors.join("; ")}`);
    console.log(JSON.stringify({globalRoutes:1,businessRoutes:4,tabs:27,moduleRoutes:1,modulePages:21,prototypeVersion:"admin-prototype-v0.36",link360:true,link360Views:2,link360ChannelRows:12,link360ToggleToast:true,materialGrid:true,materialViewToggle:2,materialGridCards:12,materialReviewApprove:true,postbackTest:true,postbackTestEvents:3,postbackDrawerTabs:2,trackerPath:true,trackerPathNodes:"3+",subChannelAlias:true,fundsSeeds:true,governanceSeeds:true,analyticsSeeds:true,configSeeds:true,configVersionList:true,configVersionActions:["view","edit","copy","new"],systemConfigPage:true,taxAlias:true,funnelAlias:true,metricBar:true,rowActions:true,insightRemoved:true,partner360StageBoard:6,partner360Views:5,partner360StageFilter:true,partner360DrawerTabs:"conditional-7",partner360ReviewActions:3,partner360CertBadges:true,partner360OffboardTimeline:6,partner360ViewAliases:["onboarding","kyc","offboarding","notes"],client360StageBoard:4,client360Views:3,client360StageFilter:true,client360RiskViewRows:3,client360DrawerTabs:4,client360RiskReviewExit:"unique",client360RiskReviewRoles:"operations+",isolationPanelDomains:2,isolationPanelRules:3,attributionRowsDefault:16,attributionExceptionViewRows:6,attributionViewAliases:["exception"],eventChainSearch:true,eventChainDrawerNodes:9,eventChainJumpTargets:chainJumpButtons,eventRowOpensChain:true,menuViewAliases:["client-risk→client-list/risk","attribution-exception→attribution-links/exception"],sidebarRouteIntegrity:true,cockpitViews:0,cockpitViewSwitching:false,cockpitMenuAliases:true,deepInteractionPanel:false,deepStageFilters:true,deepQuickFilters:false,deepObjectInspector:false,deepActionForms:true,deepNewDraftWriteback:true,deepAsyncExport:true,moduleRowsPerPage:20,moduleWriteActions:true,moduleBusinessPrimaryActions:true,moduleDetailContext:true,sidebarBlueprintGroups:10,sidebarBlueprintEntries:15,sidebarSingleOpenGroup:true,sidebarChildIcons:15,sidebarHiddenScrollbar:true,sidebarModuleNavigation:true,sidebarBlueprintDetail:true,taskQueues:5,roleDashboards:7,dashboardOrder:"snapshot-pending-status-filter-table",cockpitSummary:0,pendingRows:10,statusQuickFilter:true,usableControlScale:true,collapsedDemoPanel:true,dataSourceLabel:true,noDemoDataLabel:true,sourceWriteback:true,object360:true,openedTabs:true,globalSearch:true,searchShortcut:true,recentSearch:true,roleFilteredSearch:true,tradeMasterShell:true,notifications:true,savedViews:true,permissions:true,configReleaseClosure:true,riskCaseClosure:true,reportClosure:true,integrationClosure:true,dataGovernanceClosure:true,result:"Admin prototype checks passed"},null,2));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
