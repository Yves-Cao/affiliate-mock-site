const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const moduleSource = read("funds-availability.js");
const css = read("funds-availability.css");
const app = read("app.js");
const html = read("index.html");
const earnings = read("earnings.js");
const withdrawals = read("withdrawals.js");

const reasons = [
  "investigation", "quarantine", "manual-review", "kyc", "payout-account",
  "tax-profile", "dynamic-hold", "guarantee", "negative-balance"
];
for (const reason of reasons) assert.ok(moduleSource.includes(`id: "${reason}"`), `Covers ${reason}`);
for (const label of ["数量上限", "熔断", "关键事件缺数"]) {
  assert.ok(moduleSource.includes(label), `Records untriggered ${label}`);
}
assert.ok(moduleSource.includes("动态Hold") && moduleSource.includes("滚动保证金"), "Time-based reasons are present");
assert.ok(moduleSource.includes("材料补充与人工复核") && moduleSource.includes("隔离复核阶段"), "Review reasons avoid false precise dates");
assert.ok(moduleSource.includes("最早预计"), "Estimated release dates are labeled as estimates");
assert.ok(moduleSource.includes("不在总额中重复扣减"), "Waterfall explains overlapping review dimensions");

assert.ok(!earnings.includes('AFF.fundsAvailability.full("pay")'), "Earnings keep the removed waterfall block out of the page");
assert.ok(!withdrawals.includes('AFF.fundsAvailability.full("wd")'), "Withdrawals keep the removed waterfall block out of the page");
assert.ok(html.includes("funds-availability.css") && html.includes("funds-availability.js"), "Availability assets are loaded");
assert.ok(html.includes('id="wallet-total-revenue"'), "Wallet popover has total revenue");
assert.ok(html.includes('id="wallet-available-commission"') && html.includes('id="wallet-available-guarantee"'), "Wallet popover splits available commission and guarantee");
assert.ok(html.includes('id="wallet-processing"'), "Wallet popover has in-settlement commission");
assert.ok(app.includes("AFF.fundsAvailability.walletSummary()"), "Wallet values use the shared component");
for (const breakpoint of ["991px", "767px"]) assert.ok(css.includes(breakpoint), `Responsive rule at ${breakpoint}`);

console.log(JSON.stringify({
  component: "funds-availability",
  embeddedPages: ["pay", "wd", "dash wallet popover"],
  triggeredReasonHandlers: reasons.length,
  result: "Funds availability static contract checks passed"
}, null, 2));
