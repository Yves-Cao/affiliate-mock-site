"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
let chromium;
try {
  ({chromium} = require("playwright"));
} catch {
  ({chromium} = require(path.join(process.env.HOME, "Documents/Affiliate/.tmp-mock-site/node_modules/playwright")));
}

const root = path.join(__dirname, "..");
const artifactDir = path.join(root, ".artifacts", "risk-workbench");
const baseUrl = process.env.RWB_BASE_URL || "http://127.0.0.1:4179/admin-dev.html";
const widths = [390,767,1280,1440,1920];
const errors = [];

async function main() {
  await fs.mkdir(artifactDir,{recursive:true});
  const browser = await chromium.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
  const page = await browser.newPage({viewport:{width:1440,height:960}});
  page.setDefaultTimeout(8000);
  const resetViewport = async () => {
    await page.evaluate(() => {
      window.scrollTo(0,0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  };
  page.on("pageerror",error => errors.push(error.stack || error.message));
  page.on("console",message => {if (message.type() === "error") errors.push(message.text());});
  page.on("crash",() => errors.push("Page crashed"));
  try {
    await page.goto(`${baseUrl}#/risk-workbench?tab=objects`,{waitUntil:"domcontentloaded"});
    await page.locator(".rwb-page").waitFor();
    assert.equal(await page.locator(".rwb-metric").count(),4,"summary has four metrics");
    assert.equal(await page.locator(".tm-tabs [data-tab]").count(),4,"risk workbench has four tabs");
    assert.match(await page.locator(".rwb-metrics").innerText(),/6/);
    assert.match(await page.locator(".rwb-metrics").innerText(),/300\.00/);
    assert.equal(await page.locator(".rwb-table tbody tr").count(),6,"objects has six fixture rows");
    assert.equal(await page.locator("[data-risk-page-size]").inputValue(),"20");

    await page.click("[data-toggle-demo]");
    await page.selectOption("[data-scenario]","summary_error");
    await page.waitForFunction(() => document.querySelector(".rwb-metrics")?.innerText.includes("—"));
    assert.equal(await page.locator(".rwb-table tbody tr").count(),6,"summary error keeps the list snapshot");
    await page.click("[data-risk-refresh]");
    await page.waitForFunction(() => document.querySelector(".rwb-metrics")?.innerText.includes("6"));
    assert.equal(await page.locator(".rwb-table tbody tr").count(),6,"summary retry restores metrics without changing rows");
    await page.selectOption("[data-scenario]","normal");
    await page.click("[data-toggle-demo]");

    if (!(await page.locator("[data-risk-filter='eventType']").count())) await page.click("[data-risk-more]");
    assert.ok(await page.locator("[data-risk-filter='dateFrom']").isVisible(),"expanded filters expose date range");
    await page.fill("[data-risk-filter='reason']","SETTLEMENT");
    await page.click("[data-risk-query]");
    assert.equal(await page.locator(".rwb-table tbody tr").count(),3,"reason filter returns the three settlement objects");
    await page.click("[data-risk-reset]");
    assert.equal(await page.locator(".rwb-table tbody tr").count(),6);

    await page.click("[data-risk-more]");
    await page.selectOption("[data-risk-filter='searchField']","object_id");
    await page.fill("[data-risk-filter='search']","DEMO-C01");
    await page.click("[data-risk-query]");
    await page.click("[data-risk-columns]");
    const countryColumn = page.locator("[data-risk-col='country']");
    if (await countryColumn.count() && !(await countryColumn.isChecked())) await countryColumn.check();
    await page.click("[data-risk-export]");
    await page.fill("[data-risk-modal-reason]","用于核对当前风险对象筛选、可见列和冻结列表快照");
    await page.click("[data-risk-modal-submit]");
    await page.waitForFunction(() => (window.AFF_ADMIN_PROTOTYPE?.riskWorkbenchExports || []).length > 0);
    const positiveExport = await page.evaluate(() => window.AFF_ADMIN_PROTOTYPE.riskWorkbenchExports.at(-1));
    assert.equal(positiveExport.row_count,1,"risk export follows the applied object query");
    assert.ok(positiveExport.columns.includes("country"),"risk export keeps the visible country column");
    assert.equal(positiveExport.snapshot_id,positiveExport.snapshot_id,"risk export binds a list snapshot");
    await page.evaluate(() => { window.AFF_ADMIN_PROTOTYPE.riskWorkbench.objects.find(item => item.id === "DEMO-C01").riskScore = 91; });
    await page.click("[data-risk-export]");
    await page.fill("[data-risk-modal-reason]","用于核对相同筛选在同一快照中的数据一致性");
    await page.click("[data-risk-modal-submit]");
    const stableExport = await page.evaluate(() => window.AFF_ADMIN_PROTOTYPE.riskWorkbenchExports.at(-1));
    assert.equal(stableExport.snapshot_id,positiveExport.snapshot_id,"same query reuses the same list snapshot");
    assert.deepEqual(stableExport.rows,positiveExport.rows,"same snapshot keeps frozen row facts");
    await page.fill("[data-risk-filter='search']","NO-SUCH-OBJECT");
    await page.click("[data-risk-query]");
    await page.click("[data-risk-export]");
    await page.fill("[data-risk-modal-reason]","用于核对无结果查询不会复用其他筛选的导出快照");
    await page.click("[data-risk-modal-submit]");
    const emptyExport = await page.evaluate(() => window.AFF_ADMIN_PROTOTYPE.riskWorkbenchExports.at(-1));
    assert.equal(emptyExport.row_count,0,"risk export follows the empty object query");
    assert.notEqual(emptyExport.snapshot_id,positiveExport.snapshot_id,"different query receives a different snapshot");
    await page.click("[data-risk-reset]");

    await page.click("[data-risk-sort='risk']");
    const firstRisk = await page.locator(".rwb-table tbody tr").first().innerText();
    assert.match(firstRisk,/R3/,"risk sorting moves highest risk first");
    await page.selectOption("[data-risk-page-size]","10");

    await page.click("[data-risk-open='object'][data-risk-id='DEMO-C01']");
    await page.locator(".rwb-drawer").waitFor();
    const objectDetail = await page.locator(".rwb-drawer").innerText();
    assert.match(objectDetail,/风险评分构成/);
    assert.match(objectDetail,/证据与历史/);
    assert.match(objectDetail,/资金案件/);
    await resetViewport();
    await page.screenshot({path:path.join(artifactDir,"risk-workbench-object-detail-1440.png"),fullPage:false});
    await page.click("[data-risk-close]");

    if (!(await page.locator("[data-risk-filter='dateFrom']").count())) await page.click("[data-risk-more]");
    await page.selectOption("[data-risk-filter='searchField']","object_id");
    await page.fill("[data-risk-filter='search']","DEMO-C01");
    await page.click("[data-risk-query]");
    assert.equal(await page.locator(".rwb-table tbody tr").count(),1,"exact object ID search returns one row");
    assert.match(await page.locator(".rwb-table tbody tr").first().innerText(),/DEMO-C01/);

    for (const tab of ["events","clusters","blacklist"]) {
      await page.click(`[data-tab='${tab}']`);
      await page.locator(".rwb-page").waitFor();
      await page.waitForFunction(value => document.querySelector(".tm-tabs button.active")?.dataset.tab === value,tab);
      assert.ok(await page.locator(".rwb-table tbody tr").count() > 0,`${tab} has rows`);
    }
    await page.click("[data-tab='events']");
    await page.locator(".rwb-page").waitFor();
    await page.waitForFunction(() => document.querySelector(".tm-tabs button.active")?.dataset.tab === "events");
    assert.equal(await page.locator(".rwb-table tbody tr").count(),5,"event tab has independent filters and all five events");
    assert.match(await page.locator(".rwb-table tbody tr").first().innerText(),/DEMO-E04/,"events default sort is occurred_at descending");
    if (!(await page.locator("[data-risk-filter='eventType']").count())) await page.click("[data-risk-more]");
    await page.selectOption("[data-risk-filter='eventType']","partner_risk_aggregation");
    await page.click("[data-risk-query]");
    assert.equal(await page.locator(".rwb-table tbody tr").count(),1,"event type filter has one aggregation event");
    assert.match(await page.locator(".rwb-table tbody tr").first().innerText(),/DEMO-E04/);
    await page.click("[data-risk-reset]");
    await page.waitForFunction(() => document.querySelector(".tm-tabs button.active")?.dataset.tab === "events");
    assert.equal(await page.locator(".rwb-table tbody tr").count(),5);
    await page.click("[data-risk-open='event'][data-risk-id='DEMO-E04']");
    await page.locator(".rwb-drawer").waitFor();
    const eventDetail = await page.locator(".rwb-drawer").innerText();
    assert.match(eventDetail,/聚合分子 \/ 分母/);
    assert.match(eventDetail,/2 \/ 10/);
    await page.click("[data-risk-close]");
    await page.goto(`${baseUrl}#/risk-workbench?tab=events&event_id=DEMO-E03`,{waitUntil:"domcontentloaded"});
    await page.locator(".rwb-page").waitFor();
    await page.locator(".rwb-drawer").waitFor();
    const e03Detail = await page.locator(".rwb-drawer").innerText();
    assert.match(e03Detail,/DEMO-E03/);
    assert.match(e03Detail,/申诉门禁：待核验|申诉门禁：暂不可申诉|申诉门禁：可见/);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".rwb-drawer").count(),0,"Escape closes the event drawer");
    await page.goto(`${baseUrl}#/risk-workbench?tab=events`,{waitUntil:"domcontentloaded"});
    await page.locator(".rwb-page").waitFor();
    if (!(await page.locator("[data-risk-filter='eventType']").count())) await page.click("[data-risk-more]");
    if (!(await page.locator(".rwb-column-panel").count())) await page.click("[data-risk-columns]");
    assert.ok(await page.locator("[data-risk-col='triples']").count(),"events expose the optional triple column");
    await page.check("[data-risk-col='triples']");
    await page.waitForFunction(() => [...document.querySelectorAll(".rwb-table th")].some(el => el.textContent.includes("三元组")));
    await resetViewport();
    await page.screenshot({path:path.join(artifactDir,"risk-workbench-event-columns-1440.png"),fullPage:false});
    await page.click("[data-tab='clusters']");
    await page.waitForFunction(() => document.querySelector(".tm-tabs button.active")?.dataset.tab === "clusters");
    await page.click("[data-risk-open='cluster'][data-risk-id='DEMO-G01']");
    const clusterDetail = await page.locator(".rwb-drawer").innerText();
    assert.match(clusterDetail,/关系 edge_id/);
    assert.match(clusterDetail,/强度 \/ 关系/);
    await page.click("[data-risk-close]");
    await page.click("[data-tab='blacklist']");
    await page.click("[data-risk-open='blacklist'][data-risk-id='DEMO-BL01']");
    const blacklistDetail = await page.locator(".rwb-drawer").innerText();
    assert.match(blacklistDetail,/来源与生命周期/);
    assert.match(blacklistDetail,/无待处理变更/);
    await page.click("[data-risk-close]");

    await page.selectOption("[data-role]","risk_supervisor");
    await page.goto(`${baseUrl}#/risk-workbench?tab=events&event_id=DEMO-E03`,{waitUntil:"domcontentloaded"});
    await page.locator(".rwb-drawer").waitFor();
    await page.click("[data-risk-approve]");
    await page.click("[data-risk-approval-action='approve']");
    await page.fill("[data-risk-approval-field='reason']","已核对风险证据、案件范围和执行影响，批准当前节点");
    await page.check("[data-risk-approval-field='confirmed']");
    await page.click("[data-risk-approval-submit]");
    await page.waitForFunction(() => {
      const approval = window.AFF_ADMIN_PROTOTYPE?.taskQueue?.approvals({role:"risk_supervisor"}).find(item => item.task_id === "DEMO-T03");
      return approval?.nodes?.[0]?.status === "approved" && approval?.nodes?.[1]?.status === "pending";
    });
    await page.selectOption("[data-role]","finance");
    await page.goto(`${baseUrl}#/risk-workbench?tab=events&event_id=DEMO-E03`,{waitUntil:"domcontentloaded"});
    await page.locator(".rwb-drawer").waitFor();
    await page.locator("[data-risk-approval-action='approve']").waitFor();
    await page.click("[data-risk-approval-action='approve']");
    await page.fill("[data-risk-approval-field='reason']","已核对资金影响和执行范围，批准财务终审节点");
    await page.check("[data-risk-approval-field='confirmed']");
    await page.click("[data-risk-approval-submit]");
    await page.waitForFunction(() => {
      const approval = window.AFF_ADMIN_PROTOTYPE?.taskQueue?.approvals({role:"finance"}).find(item => item.task_id === "DEMO-T03");
      return approval?.status === "approved" && approval?.execution_id;
    });
    await page.click("[data-risk-close]");
    await page.reload({waitUntil:"domcontentloaded"});
    await page.locator(".rwb-drawer").waitFor();
    await page.click("[data-risk-task='DEMO-T03']");
    await page.locator(".rwb-drawer").waitFor();
    const financeTaskDetail = await page.locator(".rwb-drawer").innerText();
    assert.match(financeTaskDetail,/执行中|待执行/,"approved finance view exposes execution state");
    assert.match(financeTaskDetail,/不能认领、修改草稿|无权读取任务详情/,"finance view is read-only when task facts are restricted");
    assert.equal(await page.locator("[data-risk-task-action]").count(),0,"finance cannot edit an approved task");
    await page.click("[data-risk-close]");

    await page.selectOption("[data-role]","risk");
    await page.goto(`${baseUrl}#/risk-workbench?tab=events`,{waitUntil:"domcontentloaded"});
    await page.locator("[data-risk-open='event'][data-risk-id='DEMO-E01']").click();
    await page.locator("[data-risk-task='DEMO-T01']").click();
    await page.locator(".rwb-drawer").waitFor();
    assert.match(await page.locator(".rwb-drawer").innerText(),/任务事实/);
    assert.equal(await page.locator("[data-risk-claim='DEMO-T01']").count(),1,"T01 claim action stays in risk drawer");
    await page.click("[data-risk-claim='DEMO-T01']");
    await page.waitForFunction(() => {
      const task = window.AFF_ADMIN_PROTOTYPE?.taskQueue?.peek?.().tasks?.find(item => item.task_id === "DEMO-T01");
      return task?.workflow_state === "processing" && task?.version === "v2" && task?.owner?.display_name === "林知远";
    });
    const claimedDetail = await page.locator(".rwb-drawer").innerText();
    assert.match(claimedDetail,/处理中/,"claim updates task status");
    assert.match(claimedDetail,/林知远/,"claim updates task owner");
    assert.match(claimedDetail,/v2/,"claim increments task version");
    await resetViewport();
    await page.screenshot({path:path.join(artifactDir,"risk-workbench-task-form-1440.png"),fullPage:false});
    await page.click("[data-risk-close]");
    await page.reload({waitUntil:"domcontentloaded"});
    await page.locator(".rwb-page").waitFor();

    for (const width of widths) {
      await page.setViewportSize({width,height:960});
      await page.goto(`${baseUrl}#/risk-workbench?tab=objects`,{waitUntil:"domcontentloaded"});
      await page.locator(".rwb-page").waitFor();
      await resetViewport();
      const metrics = await page.evaluate(() => {
        const h1 = document.querySelector(".tm-page-head h1");
        const sidebar = document.querySelector(".tm-sidebar");
        return {
          viewport:innerWidth,
          scrollWidth:document.documentElement.scrollWidth,
          h1Size:h1 ? getComputedStyle(h1).fontSize : null,
          sidebarWidth:sidebar ? getComputedStyle(sidebar).width : null
        };
      });
      assert.ok(metrics.scrollWidth <= width + 1,`no document overflow at ${width}px`);
      await resetViewport();
      await page.screenshot({path:path.join(artifactDir,`risk-workbench-${width}.png`),fullPage:false});
    }
    assert.deepEqual(errors,[],"browser has no page or console errors");
    console.log(`PASS risk workbench browser checks (${widths.length} viewports)`);
    console.log(JSON.stringify({screenshots:widths.map(width => path.join(artifactDir,`risk-workbench-${width}.png`))},null,2));
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
