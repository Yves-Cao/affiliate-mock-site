"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "admin-dev.js"), "utf8");
const boot = "state.savedViews = loadSavedViews();\n  syncFromHash();render();";
assert.ok(source.includes(boot), "Test seam must match the application bootstrap");
const sandbox = {
  window: {addEventListener() {}}, console, Date, JSON, BigInt, URLSearchParams, URL,
  location: {hash: "#/admin-workbench"}, navigator: {},
  crypto: require("node:crypto").webcrypto,
  sessionStorage: {getItem: () => "finance_reviewer", setItem() {}},
  localStorage: {getItem: () => null, setItem() {}},
  document: {addEventListener() {}, querySelector: () => null},
  setInterval() {}, setTimeout() {}, clearTimeout() {}, queueMicrotask() {}
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "admin-prototype-data.js"), "utf8"), sandbox);
vm.runInContext(source.replace(boot, `window.demoUI = {
  state,roleSwitcher,normalizeEmployeeRole,demoSkipsApproval,actionDisplayLabel,
  resultForAction,deepActionFields,modal
};`), sandbox);
const a = sandbox.window.demoUI;
assert.equal(a.demoSkipsApproval(), true);
assert.equal(a.state.role, "finance", "Old stored identities migrate to one of four employees");
const html = a.roleSwitcher();
const roles = [...html.matchAll(/<option value="([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(roles, ["operations", "finance", "risk_supervisor", "system_admin"]);
assert.ok(html.includes("运营") && html.includes("财务") && html.includes("主管") && html.includes("管理员"));
assert.equal(a.normalizeEmployeeRole("risk"), "risk_supervisor");
assert.equal(a.normalizeEmployeeRole("audit"), "system_admin");
assert.equal(a.actionDisplayLabel("submit"), "提交处理");
assert.equal(a.resultForAction("submit"), "processing");
assert.ok(a.deepActionFields("submit").every(field => field.key !== "approver"));
a.state.modal = {action: "approve", target: null};
assert.ok(!a.modal().includes('id="action-self-review"'));
sandbox.window.AFF_ADMIN_PROTOTYPE.demoPolicy.approvalRequired = true;
assert.equal(a.resultForAction("submit"), "pending_approval");
assert.ok(a.deepActionFields("submit").some(field => field.key === "approver"));
assert.ok(a.modal().includes('id="action-self-review"'));
console.log("PASS demo UI: four employees, legacy identity migration, direct submission and no self-review controls");
