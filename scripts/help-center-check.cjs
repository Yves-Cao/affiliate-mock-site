const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const app = read("app.js");
const js = read("help-center.js");
const css = read("help-center.css");
const drawerCss = read("drawer.css");

assert.ok(html.includes('data-help-open="assistant"'), "Topbar help opens the unified assistant");
assert.ok(!html.includes('data-route="support" aria-label="帮助中心"'), "Topbar help no longer routes to support");
assert.ok(html.includes('id="help-center-root"'), "Global help root exists");
assert.ok(html.includes("help-center.css?v=") && html.includes("help-center.js?v="), "Help assets are registered");

assert.ok(app.includes("helpAssistant:"), "Help state has an explicit default");
assert.ok(app.includes("merged.helpAssistant ="), "Saved help state is sanitized");
assert.ok(app.includes("AFF.help?.render();"), "App render refreshes the global help layer");

const articleIds = [
  "join-program", "program-steps", "promotion-link", "use-assets", "subchannel",
  "client-attribution", "commission-settlement", "guarantee", "withdraw", "profile-verification"
];
for (const id of articleIds) assert.ok(js.includes(`id: "${id}"`), `Missing article ${id}`);
for (const id of ["start", "program", "promo", "clients", "funds", "account"]) {
  assert.ok(js.includes(`id: "${id}"`), `Missing help category ${id}`);
}

assert.ok(js.includes('t("本地演示 · 暂未接入AI", "Local demo · AI not connected")'), "Assistant discloses the local demo boundary");
assert.ok(js.includes("searchArticles(s.assistantQuery)"), "Assistant uses local keyword matching");
assert.ok(js.includes("recentRoutes") && js.includes("clickedArticles"), "Recommendations use route and clicked-article history only");
assert.ok(!js.includes("fetch(") && !js.includes("XMLHttpRequest"), "MVP does not call an AI service");
assert.ok(js.includes('class="aff-drawer aff-drawer--compact help-drawer"'), "Help center uses the unified compact drawer");
assert.ok(js.includes("data-help-assistant-search") && js.includes("data-help-search"), "Assistant and drawer searches exist");
assert.ok(js.includes('class="help-direct-answer" type="button" data-help-action="open-drawer"'), "Direct answer area opens the article drawer");
assert.ok(!js.includes('class="button secondary small" type="button" data-help-action="open-drawer"'), "Direct answer does not require a separate full-article button");
assert.ok(js.includes('class="help-toc-list"') && js.includes('class="help-toc-children"'), "Drawer home has a two-level directory");
assert.ok(js.includes("s.article = null;\n      s.category = null;"), "Generic help-center entry returns to the directory home");
assert.ok(js.includes('data-help-action="drawer-home"') && js.includes('t("返回列表", "Back to list")'), "Article header can return to the directory list");
assert.ok(css.includes(".help-toc-icon") && css.includes(".help-toc-count"), "Directory uses themed group visuals");
assert.ok(!js.includes("阅读时长") && !js.includes("是否有帮助") && !js.includes("相关文章"), "Article detail stays minimal");

assert.ok(css.includes("width: min(384px, calc(100% - 78px));") && css.includes("height: 480px;"), "Assistant desktop geometry is fixed");
assert.ok(css.includes("help-assistant-composer"), "Assistant composer is a distinct bottom layer");
assert.ok(app.includes("assistantOpen: false"), "Assistant is collapsed by default");
assert.ok(css.includes(".help-assistant[hidden] { display: none !important; }"), "Hidden state wins over the flex panel");
assert.ok(!js.includes('class="visually-hidden"'), "Launcher renders icon only");
assert.ok(drawerCss.includes(".aff-drawer--compact { width: min(480px, 100vw);"), "Drawer follows the compact 480px geometry");
assert.ok(css.includes("@media (max-width: 767px)"), "Mobile layout is explicit");
assert.ok(!/letter-spacing:\s*-/.test(css), "No negative letter spacing");
assert.ok(!/font-weight:\s*(?:550|650|750|800|900)/.test(css), "Only standard font weights are used");
assert.ok(!js.includes("保证金" + "暂扣"), "Help copy does not use the retired guarantee-hold wording");

console.log(JSON.stringify({
  articles: articleIds.length,
  categories: 6,
  result: "Help center static checks passed"
}, null, 2));
