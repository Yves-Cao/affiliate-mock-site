const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const app = read("app.js");
const data = read("data.js");
const scope = read("docs/user/SESSION-SCOPE.md");
const context = read("docs/user/CONTEXT-INDEX.md");

assert.ok(data.includes('{ id: "account", group: "服务中心", label: "个人中心", hidden: true }'));
assert.ok(app.includes('["account", "apply", "onboarding"]'), "Account stays out of sidebar navigation");
assert.ok(app.includes('AFF.state.applyStep = Math.min(6'), "Apply resumes from furthest saved step");
assert.ok(app.includes('!AFF.state.programCompleted') && app.includes('!AFF.state.onboarding.submitted'), "Login routing preserves apply/onboarding/dash branches");
assert.ok(scope.includes("/ export / apply / onboarding") && context.includes("/ export / apply / onboarding"), "User indexes include export");
assert.ok(scope.includes("statements`是隐藏兼容入口") && context.includes("statements` 是隐藏兼容入口"), "User indexes document hidden statements route");

console.log("User flow routing checks passed");
