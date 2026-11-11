"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../admin-dev.js"), "utf8");
const configSource = source.slice(source.indexOf("  function configVersionItems()"), source.indexOf("  function riskCasePanel()"));
let now = Date.parse("2026-11-09T12:00:00+08:00");
const inputs = {};
const messages = [];
const sandbox = {
  window: {AFF_ADMIN_CLOCK: {now: () => now}},
  console, Date, JSON, BigInt, URLSearchParams,
  document: {
    querySelector: selector => inputs[selector] || null,
    querySelectorAll: selector => inputs[selector] || []
  },
  showToast: message => messages.push(message),
  render: () => {},
  demoSkipsApproval: () => true,
  pad: value => String(value).padStart(2, "0"),
  createDate: () => "2026-11-05 09:30",
  h: value => String(value ?? "-"),
  money: value => `$${Number(value).toFixed(2)}`,
  statusLabel: value => value,
  statusTag: value => `<span>${value}</span>`,
  tqIcon: () => "",
  roleOwnerNames: {system_admin: "配置管理员"},
  state: {role: "system_admin", routeId: "admin-config", tabId: "overview", configOverviewSearch: "", configOverviewGroup: "", configOverviewStatus: "", configOverviewDraft: {}, configOverviewFilterOpen: false},
  CONFIG_VERSION_APPROVAL_ENABLED: false
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../admin-prototype-data.js"), "utf8"), sandbox);
vm.runInContext(`const prototype = window.AFF_ADMIN_PROTOTYPE;\n${configSource}\nthis.config = {
  configOverviewRows, configOverviewPanel, configItemVersions, configSubgroupVersions, configVersionById,
  configSubgroupCurrentVersion, configOverviewVersionDrawer, configItemDrawer,
  businessConfigItemForTab, submitConfigAction, submitConfigVersion, saveConfigSubgroup,
  configPriceContent, configRefreshScheduledVersions
};`, sandbox);
const c = sandbox.config;
const pricing = c.businessConfigItemForTab("price");
let checks = 0;
function test(name, fn) {fn(); checks += 1; console.log(`PASS ${name}`);}
function pricingOverview() {return c.configOverviewRows().find(row => row.id === "item-pricing");}
function action(version, kind, scheduledAt) {
  sandbox.state.configActionModal = {id: version.id, action: kind};
  inputs["#config-action-reason"] = {value: "已核对本次参数与影响范围，确认操作"};
  inputs["#config-action-effective-time"] = {value: scheduledAt || ""};
  c.submitConfigAction();
}
function copyDraft(sourceVersion) {
  sandbox.state.configVersionModal = {mode: "copy", id: sourceVersion.id};
  inputs["[data-config-version-field]"] = Object.entries({
    version: `pricing-20261109120000-${String(checks).padStart(2, "0")}`,
    name: "价格调整", domains: "价格与佣金档", owner: "配置管理员",
    changeSummary: "已核对国家系数与基础档位", notificationType: "一般", publishMode: "待设置"
  }).map(([key, value]) => ({dataset: {configVersionField: key}, value}));
  c.submitConfigVersion();
  return c.configSubgroupVersions(pricing)[0];
}

test("overview, version lookup and subgroup share the same version object", () => {
  const overview = pricingOverview();
  const subgroup = c.configSubgroupCurrentVersion(pricing);
  assert.equal(overview.current, subgroup);
  assert.equal(c.configVersionById(overview.current.id), subgroup);
  assert.ok(c.configItemVersions(overview.configItem).includes(subgroup));
});
test("overview has no mutating controls and reports failed versions from subgroup records", () => {
  const html = c.configOverviewPanel();
  assert.ok(!html.includes("data-config-version-new"));
  assert.ok(!html.includes("data-config-item-rollback"));
  const row = pricingOverview();
  assert.ok(row.failedVersions.some(version => version.status === "activation_failed"));
  sandbox.state.configOverviewItem = row.id;
  assert.ok(!c.configItemDrawer().includes("data-config-item-rollback"));
});
test("copy keeps a separate editable snapshot and activation replaces the only active version", () => {
  const previous = pricingOverview().current;
  const draft = copyDraft(previous);
  assert.equal(draft.status, "draft");
  assert.notEqual(draft.snapshot, previous.snapshot);
  draft.snapshot.basePricing.l1 = 450;
  assert.notEqual(previous.snapshot.basePricing.l1, 450);
  action(draft, "activate");
  assert.equal(previous.status, "inactive");
  assert.equal(previous.effectiveTime, "-");
  assert.equal(draft.status, "active");
  assert.equal(draft.locked, true);
  assert.equal(pricingOverview().current, draft);
  assert.equal(c.configSubgroupVersions(pricing).filter(version => version.status === "active").length, 1);
  assert.ok(pricingOverview().parameterSummary.includes("450"));
});
test("locked version cannot be edited or reactivated", () => {
  const active = pricingOverview().current;
  const snapshot = JSON.stringify(active.snapshot);
  sandbox.state.configSubgroupVersionId = active.id;
  inputs["[data-config-edit]"] = [{dataset: {configEditType: "number", configEdit: "basePricing.l1"}, value: "1"}];
  c.saveConfigSubgroup();
  assert.equal(JSON.stringify(active.snapshot), snapshot);
  action(active, "activate");
  assert.equal(active.status, "active");
});
test("draft save is atomic and validates the confirmed base percentage invariant", () => {
  const draft = copyDraft(pricingOverview().current);
  sandbox.state.configSubgroupVersionId = draft.id;
  const original = JSON.stringify(draft.snapshot);
  inputs["[data-config-edit]"] = [{dataset: {configEditType: "text", configEdit: "basePricing.ftdRatio"}, value: "60%"}];
  c.saveConfigSubgroup();
  assert.equal(JSON.stringify(draft.snapshot), original);
  inputs["[data-config-edit]"].push({dataset: {configEditType: "text", configEdit: "basePricing.validFtdRatio"}, value: "40%"});
  c.saveConfigSubgroup();
  assert.equal(draft.snapshot.basePricing.ftdRatio, "60%");
  assert.equal(draft.snapshot.basePricing.validFtdRatio, "40%");
  assert.equal(pricingOverview().current.snapshot.basePricing.ftdRatio, "50%");
  action(draft, "void");
});
test("country formula values are derived from the selected version snapshot", () => {
  const snapshot = JSON.parse(JSON.stringify(pricingOverview().current.snapshot));
  snapshot.basePricing.l1 = 777;
  snapshot.countries[0].coefficient = 2;
  snapshot.countries[0].formula[0] = 1;
  assert.ok(c.configPriceContent(snapshot).includes("$1554.00"));
  assert.ok(!c.configPriceContent(snapshot).includes("<td>$1.00</td>"));
});
test("schedule rejects invalid and past times without changing the draft", () => {
  const draft = copyDraft(pricingOverview().current);
  for (const date of ["not-a-time", "2026-02-31T12:00", "2026-11-09T11:59"]) {
    action(draft, "schedule", date);
    assert.equal(draft.status, "draft");
  }
});
test("one future schedule retains active until due, then atomically replaces it and audits once", () => {
  const previous = pricingOverview().current;
  const draft = c.configSubgroupVersions(pricing).find(version => version.status === "draft");
  action(draft, "schedule", "2026-11-09T12:01");
  assert.equal(draft.status, "scheduled");
  assert.equal(pricingOverview().scheduled, draft);
  assert.equal(pricingOverview().current, previous);
  assert.equal(pricingOverview().scheduledEffectiveTime, draft.scheduledEffectiveTime);
  const other = copyDraft(previous);
  action(other, "schedule", "2026-11-09T12:02");
  assert.equal(other.status, "draft");
  const auditCount = sandbox.window.AFF_ADMIN_PROTOTYPE.auditRecords.length;
  now += 61000;
  assert.equal(c.configRefreshScheduledVersions(), true);
  assert.equal(pricingOverview().current, draft);
  assert.equal(previous.status, "inactive");
  assert.equal(draft.locked, true);
  assert.equal(pricingOverview().scheduled, null);
  assert.equal(sandbox.window.AFF_ADMIN_PROTOTYPE.auditRecords.length, auditCount + 1);
  pricingOverview();
  assert.equal(c.configRefreshScheduledVersions(), false);
  assert.equal(sandbox.window.AFF_ADMIN_PROTOTYPE.auditRecords.length, auditCount + 1);
});
test("void cannot mutate active versions and cancelled schedules never activate", () => {
  const active = pricingOverview().current;
  action(active, "void");
  assert.equal(active.status, "active");
  const draft = c.configSubgroupVersions(pricing).find(version => version.status === "draft");
  action(draft, "schedule", "2026-11-09T12:03");
  action(draft, "withdraw");
  assert.equal(draft.status, "voided");
  assert.equal(draft.effectiveTime, "-");
  assert.equal(draft.scheduledEffectiveTime, "-");
  now += 180000;
  assert.equal(pricingOverview().current, active);
});
console.log(`${checks} configuration version checks passed`);
