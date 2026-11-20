"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
let chromium;
try {
  ({chromium} = require("playwright"));
} catch {
  ({chromium} = require(path.join(process.env.HOME,"Documents/Affiliate/.tmp-mock-site/node_modules/playwright")));
}

const root = path.join(__dirname,"..");
const server = http.createServer(async (request,response) => {
  try {
    const pathname = new URL(request.url,"http://localhost").pathname;
    const file = path.resolve(root,`.${decodeURIComponent(pathname)}`);
    if (!file.startsWith(`${root}${path.sep}`)) throw new Error("Forbidden");
    const body = await fs.readFile(file);
    const type = {".html":"text/html",".js":"text/javascript",".css":"text/css"}[path.extname(file)];
    response.writeHead(200,{"Content-Type":`${type || "text/plain"}; charset=utf-8`});
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

(async () => {
  await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
  let browser;
  try {
    browser = await chromium.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
    const page = await browser.newPage({viewport:{width:1440,height:960}});
    const errors = [];
    page.on("pageerror",error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/admin-dev.html#/system-config`);
    await page.waitForSelector(".dev-system-setting");
    const seed = id => page.evaluate(id => window.AFF_ADMIN_PROTOTYPE.configSeeds.system.find(row => row.id === id),id);
    const field = id => page.locator(`[data-system-config-value="${id}"]`);
    const save = id => page.locator(`[data-submit-system-config="${id}"]`);
    const reset = id => page.locator(`[data-system-config-reset="${id}"]`);
    const section = id => page.locator(`[data-system-config-section="${id}"]`);

    const count = await page.evaluate(() => window.AFF_ADMIN_PROTOTYPE.configSeeds.system.length);
    assert.equal(count,3,"only the three requested settings remain");
    assert.deepEqual(await page.locator(".dev-system-setting h3").allTextContents(),["导出文件过期时间","归属查询次数","归属查询过期时间"]);
    assert.equal(await page.locator(".dev-system-setting").count(),count,"each configuration has its own section");
    assert.equal(await page.locator(".tm-content table").count(),0,"the settings page contains no data table");
    assert.equal(await page.locator(".tm-content h1:visible").count(),1,"only one page title is visible");
    assert.equal(await page.locator("[data-action-name='new_draft']:visible").count(),0);
    assert.equal(await page.locator(".dev-system-setting input[type='number']").count(),3);
    assert.ok(await save("sys-001").isDisabled());

    await field("sys-001").fill("169");
    assert.equal(await field("sys-001").evaluate(node => node.validity.valid),false);
    await save("sys-001").click();
    assert.equal((await seed("sys-001")).pendingValue,"","out-of-range values are not saved");
    await field("sys-001").fill("48");
    await field("sys-010").fill("12");
    await save("sys-001").click();
    assert.equal((await seed("sys-001")).value,"24小时","saving does not publish");
    assert.equal((await seed("sys-001")).pendingValue,"48小时");
    assert.equal(await field("sys-010").inputValue(),"12","saving one section preserves other edits");
    await reset("sys-010").click();
    assert.equal(await field("sys-010").inputValue(),"6");
    assert.ok(await save("sys-010").isDisabled());

    await field("sys-009").fill("0");
    assert.equal(await field("sys-009").evaluate(node => node.validity.valid),false,"query count must stay within its existing range");
    await field("sys-009").fill("8");
    await field("sys-009").press("Enter");
    assert.equal((await seed("sys-009")).pendingValue,"","sensitive changes require confirmation");
    await page.click("footer button[data-close-system-config-confirm]");
    assert.equal(await field("sys-009").inputValue(),"8","cancelling confirmation preserves the unsaved edit");
    await save("sys-009").click();
    await page.fill("#system-config-confirm-reason","调整归属查询次数用于本次运行测试");
    await page.click("[data-submit-system-config-confirm]");
    assert.equal((await seed("sys-009")).pendingValue,"8次/小时");

    await field("sys-010").fill("12");
    await save("sys-010").click();
    await page.fill("#system-config-confirm-reason","调整归属查询限制到期时长用于测试");
    await page.click("[data-submit-system-config-confirm]");
    assert.equal((await seed("sys-010")).pendingValue,"12小时");

    await field("sys-001").fill("24");
    await save("sys-001").click();
    assert.equal((await seed("sys-001")).pendingValue,"","saving the current value removes that pending change");
    await page.click("[data-system-config-publish]");
    assert.equal(await page.locator(".dev-system-publish-diff li").count(),2,"publish confirmation lists only pending changes");
    await page.click("footer button[data-close-system-config-publish-confirm]");
    assert.equal((await seed("sys-009")).value,"5次/小时","cancelled publication preserves current values");
    await page.click("[data-system-config-publish]");
    await page.fill("#system-config-publish-reason","确认本次系统运行参数变更并发布生效");
    await page.click("[data-submit-system-config-publish-confirm]");
    assert.equal((await seed("sys-009")).value,"8次/小时");
    assert.equal((await seed("sys-010")).value,"12小时");
    assert.equal((await seed("sys-009")).pendingValue,"");
    assert.ok(await page.locator("[data-system-config-publish]").isDisabled());
    await page.click("[data-system-config-history]");
    assert.ok((await page.locator(".tm-toast").innerText()).includes("5次/小时 → 8次/小时"),"published changes retain audit history");
    await section("sys-001").locator("summary").click();
    assert.ok((await section("sys-001").innerText()).includes("export.file_expiry_hours"));

    for (const width of [1920,1440,1280,1024,768,480,375]) {
      await page.setViewportSize({width,height:960});
      const layout = await page.evaluate(() => {
        const sections = [...document.querySelectorAll(".dev-system-setting")];
        const boxes = sections.map(node => node.getBoundingClientRect());
        return {
          overflow:document.documentElement.scrollWidth > innerWidth,
          outside:boxes.some(box => box.left < 0 || box.right > innerWidth + 1),
          overlap:boxes.some((box,index) => boxes.slice(index + 1).some(other =>
            box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top)),
          columns:getComputedStyle(document.querySelector(".dev-system-settings-grid")).gridTemplateColumns.split(" ").length
        };
      });
      assert.equal(layout.overflow,false,`${width}px: no document overflow`);
      assert.equal(layout.outside,false,`${width}px: sections fit the viewport`);
      assert.equal(layout.overlap,false,`${width}px: independent sections never overlap`);
      assert.equal(layout.columns,width <= 1000 ? 1 : 2,`${width}px: responsive columns`);
    }
    assert.deepEqual(errors,[],"no browser errors");
    console.log("System configuration: only 3 independent sections; validation, draft isolation, sensitive confirmation, publication, audit and 7 viewport checks passed.");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
