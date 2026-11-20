"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "admin-dev.js"), "utf8");
function slice(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Missing source boundary: ${start}`);
  return source.slice(from, to);
}
const inputs = {};
const sandbox = {
  window: {}, console, Date, JSON,
  document: {querySelector: selector => inputs[selector] || null},
  state: {role: "", systemConfigDrafts: {}, systemConfigHistory: []},
  render() {},
  showToast() {},
  h: value => String(value ?? ""),
  createDate: () => "2026-11-10 12:00:00"
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "admin-prototype-data.js"), "utf8"), sandbox);
vm.runInContext(`
  const prototype = window.AFF_ADMIN_PROTOTYPE;
  ${slice("  const roleOwnerNames = {", "  const dashboardRoleNames = {")}
  ${slice("  function configRows(tabId)", "  function configVersionItems()")}
  ${slice("  function systemConfigRawValue", "  function configActionModal()")}
  ${slice("  function submitSystemConfig(id)", "  function submitConfigAction()")}
  this.access = {roleOwnerNames, systemConfigSection, systemConfigPanel,
    submitSystemConfig, submitSystemConfigConfirm, publishSystemConfig,
    submitSystemConfigPublishConfirm};
`, sandbox);

const a = sandbox.access;
const seed = JSON.stringify(sandbox.window.AFF_ADMIN_PROTOTYPE.configSeeds.system);
const state = sandbox.state;
const reason = "已核对本次系统配置修改及影响范围";
let checked = 0;
const employeeRoles = ["operations","finance","risk_supervisor","system_admin"];
for (const role of employeeRoles) {
  const rows = JSON.parse(seed);
  sandbox.window.AFF_ADMIN_PROTOTYPE.configSeeds.system = rows;
  Object.assign(state, {
    role, routeId: "admin-system-config", tabId: "system",
    systemConfigDrafts: {}, systemConfigHistory: [],
    systemConfigConfirm: null, systemConfigPublishConfirm: false
  });
  for (const item of rows) {
    const raw = String(Number(item.value.match(/\d+/)[0]) + 1);
    state.systemConfigDrafts[item.id] = raw;
    const html = a.systemConfigSection(item);
    const save = html.match(/<button[^>]*data-submit-system-config[^>]*>/)?.[0];
    assert.ok(save && !save.includes("disabled"), `${role}: ${item.id} must be editable`);
    inputs[`[data-system-config-value="${item.id}"]`] = {
      type: "number", value: raw, reportValidity: () => true
    };
    const original = item.value;
    a.submitSystemConfig(item.id);
    if (item.sensitive) {
      assert.equal(item.pendingValue, "", `${role}: sensitive change requires confirmation`);
      assert.equal(state.systemConfigConfirm.id, item.id);
      inputs["#system-config-confirm-reason"] = {value: "太短"};
      a.submitSystemConfigConfirm();
      assert.equal(item.pendingValue, "");
      inputs["#system-config-confirm-reason"] = {value: reason};
      a.submitSystemConfigConfirm();
    }
    assert.equal(item.value, original, `${role}: save must not publish`);
    assert.equal(item.pendingValue, `${raw}${item.unit}`);
    assert.equal(state.systemConfigDrafts[item.id], undefined);
    checked += 1;
  }
  const publish = a.systemConfigPanel().match(/<button[^>]*data-system-config-publish[^>]*>/)?.[0];
  assert.ok(publish && !publish.includes("disabled"), `${role}: publish must be available`);
  const expected = rows.map(item => item.pendingValue);
  a.publishSystemConfig();
  assert.equal(state.systemConfigPublishConfirm, true);
  inputs["#system-config-publish-reason"] = {value: "太短"};
  a.submitSystemConfigPublishConfirm();
  assert.ok(rows.every(item => item.pendingValue), `${role}: publish reason required`);
  inputs["#system-config-publish-reason"] = {value: reason};
  a.submitSystemConfigPublishConfirm();
  assert.equal(state.systemConfigPublishConfirm, false);
  rows.forEach((item, index) => {
    assert.equal(item.value, expected[index]);
    assert.equal(item.pendingValue, "");
    const log = state.systemConfigHistory.find(entry => entry.key === item.key);
    assert.equal(log.operator, a.roleOwnerNames[role]);
    assert.equal(log.reason, reason);
    assert.equal(log.next, item.value);
  });
  console.log(`PASS ${role}: edit, save, sensitive confirmation, publish and change history`);
}
console.log(`PASS system configuration access: ${employeeRoles.length} roles, ${checked} setting edits`);
