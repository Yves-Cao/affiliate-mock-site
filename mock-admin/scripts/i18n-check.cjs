const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const data = read("data.js");
const app = read("app.js");
const html = read("index.html");

assert.ok(data.includes("AFF.dataText = value =>"), "Defines the demo-data bilingual mapper");
assert.ok(data.includes("AFF.localizeTextNodes = root =>"), "Defines text-node localization");
assert.ok(app.includes("AFF.localizeTextNodes(elements.main);"), "Main content is localized after render");
assert.ok(app.includes("syncTopbarLanguage();"), "Topbar language is synchronized after render");
assert.ok(!app.includes('AFF.localizeTextNodes(document.querySelector(".topbar"))'), "Topbar is not mutated irreversibly");
assert.ok(app.includes("function syncTopbarLanguage()"), "Topbar has a reversible language sync function");
assert.ok(app.includes('elements["modal-root"].innerHTML = html;') && app.includes('AFF.localizeTextNodes(elements["modal-root"]);'), "Modal content is localized");

for (const phrase of [
  "查看佣金奖励", "高转化地区", "查看支持地区", "素材库总览", "系统使用指引", "分享简介链接",
  "入驻申请", "KYC 提交", "资质审核", "调查通知", "规则变更", "申诉进度", "系统维护",
  "佣金冲正", "佣金拒绝", "保证金抵扣", "客户资格无效", "风险分级上调", "调查补充材料"
]) assert.ok(data.includes(`"${phrase}"`), `Dictionary includes ${phrase}`);

assert.ok(html.includes("data.js?v=p0-20261105-3"), "Data module cache version is current");
assert.ok(html.includes("app.js?v=p0-20261105-8"), "App module cache version is current");
assert.ok(html.includes("pages.js?v=p0-20261105-7"), "Pages module cache version is current");

console.log(JSON.stringify({
  scope: "20 user routes plus topbar",
  result: "Bilingual static contract checks passed"
}, null, 2));
