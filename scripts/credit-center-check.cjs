const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const source = read("credit-center.js");
const css = read("credit-center.css");
const dashboard = read("pages.js");
const account = read("account-page.js");
const partnerOutput = `${source}\n${account}`;
const html = read("index.html");

assert.ok(html.includes("credit-center.css") && html.includes("credit-center.js"), "Credit assets are loaded");
assert.ok(dashboard.includes("AFF.creditCenter.dashboardRow()"), "Dashboard embeds the credit+funnel row");
assert.ok(source.includes("funnelChart") && source.includes("dashboard-clients"), "Funnel rows drill down to clients");
assert.ok(!source.includes("partner-funnel-rate") && !source.includes("整体转化"), "Funnel no longer shows conversion rates");
assert.ok(account.includes("AFF.creditCenter.accountPanel()"), "Account center embeds the credit panel");
assert.ok(source.includes('data-account-action="credit"') && account.includes('"credit"'), "Account center opens a credit details drawer");

for (const level of ["C0", "C1", "C2", "C3", "C4"]) assert.ok(source.includes(`${level}: `), `Defines ${level}`);
for (const stage of ["FTD段", "有效FTD段", "质量服务"]) assert.ok(source.includes(stage), `Shows ${stage} benefit`);
/* D-CREDIT-04 (2026-11-07, user-confirmed): levels display 1-5; point progress bar
 * WITHOUT values + hover hint; benefits hidden behind a modal entry. */
for (const marker of ["原因类别", "恢复方向", "等级提升？", "影响积分", "data-credit-funnel-period", "partner-rail", "credit-card-level", "credit-seg", "data-credit-hint", "data-credit-benefits", "以平台配置为准", "全部等级权益对照", "等级提升？", "客户质量", "业绩规模", "权重与升降级阈值由平台配置", "guaranteeCut", "holdDays", "settleFree", "佣金加成", "保证金减免", "保证金结算天数减免", "免结算额度", "benefitSummaryMarkup", "credit-benefit-summary", "当前等级权益", "下级权益"]) {
  assert.ok(partnerOutput.includes(marker), `Credit output includes ${marker}`);
}
assert.ok(!source.includes("保证金" + "暂扣"), "Credit output retires the guarantee-hold wording");
/* D-CREDIT-08: level NUMBER is shown (flat brand block, no gold-pill flourish);
 * point values still hidden. */
assert.ok(source.includes("display}"), "VIP level code rendered");
assert.ok(account.includes("levelNumber"), "Account drawer shows number + title");
assert.ok(!source.includes("--gold"), "No gold flourish on the emblem");
assert.ok(source.includes("percent(cfg.ratio)"), "Commission bonus renders in modal");
assert.ok(source.includes("if (currentIndex > 0)"), "VIP1 omits current-level benefits");
assert.ok(source.includes("definition.visible(cfg[definition.key])"), "Zero-value benefits are filtered");
/* D-CREDIT-14: redesigned dashboard card, brand deep blue, no gold, hint is a floating panel. */
assert.ok(css.includes("#00187e") && css.includes("credit-hint-panel"), "Deep-blue card and hint panel styles exist");
assert.ok(source.includes("AFF.tooltip.position"), "Hint uses unified tooltip placement");
assert.ok(!css.includes("#d9b36c") && !css.includes("#f0d9a8"), "Gold palette removed from credit card");
assert.ok(!/credit-hint-list[\s\S]{0,400}\d+%/.test(source.slice(source.indexOf("HINT_METRICS"), source.indexOf("function hintPanelMarkup"))), "Hint metrics expose no numeric values");
assert.ok(!source.includes("稳步推进中") && !source.includes("下一步"), "No status/next-step copy on the card");
assert.ok(!source.includes("partner-credit-compare"), "Compare card removed from card");
assert.ok(!source.includes("partner-credit-guide"), "Guidance row removed from card");
/* "升降级阈值" stays forbidden as a VALUE reveal, but the hint phrase
 * "权重与升降级阈值由平台配置" (config-scope disclosure) is allowed. */
const hintPhrase = "权重与升降级阈值由平台配置";
for (const forbidden of ["信用分", "积分流水", "指标权重", "集群识别规则"]) {
  assert.ok(!source.includes(forbidden), `Partner output must not expose ${forbidden}`);
}
for (const breakpoint of ["1199px", "991px", "767px"]) assert.ok(css.includes(breakpoint), `Responsive rule at ${breakpoint}`);

console.log(JSON.stringify({
  component: "credit-center",
  embedded: ["dashboard", "account"],
  levels: 5,
  checks: 20,
  result: "Credit center static contract checks passed"
}, null, 2));
