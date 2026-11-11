const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const app = read("app.js");
const pages = read("pages.js");
const account = read("account-page.js");
const finance = read("finance-data.js");
const withdrawals = read("withdrawals.js");
const statements = read("statements-page.js");

assert.ok(!app.includes('if (route === "statements") {\n    AFF.state.wdTab = "records";'), "Statement route is no longer redirected to withdrawals");
assert.ok(statements.includes('t("月度结算单", "Monthly statements")'), "Statement page identifies the monthly object");
assert.ok(withdrawals.includes('navigate("statements");') && withdrawals.includes('targetStatement.detail = d.withdrawSettlement;'), "Withdrawal references open monthly statements");
assert.ok(withdrawals.includes('targetStatement.detail = d.withdrawSettlement;'), "Withdrawal reference opens the referenced statement detail");

assert.ok(finance.includes("attributionWindow: {"), "Attribution window has a configuration object");
for (const marker of ["name: \"标准点击归属窗口\"", "days: 30", "start: \"有效点击时间\"", "version: \"ATTR-20261027-1\""]) {
  assert.ok(finance.includes(marker), `Attribution configuration includes ${marker}`);
}
assert.ok(pages.includes("适用归因规则") && pages.includes("attributionRule.version"), "Lookup displays the configured attribution rule");
assert.ok(!pages.includes('t("30天归因窗口内首次点击，此后锁定", "First click within the 30-day attribution window'), "Lookup no longer renders a fixed attribution phrase");

assert.ok(!account.includes("推广、结算和提现可用"), "Account no longer promises all capabilities from verification");
assert.ok(account.includes("以对应页面状态为准"), "Account defers capability status to each business page");
assert.ok(pages.includes("申请与资质确认完成后，推广链接才会启用"), "Partner program separates confirmation from link readiness");
assert.ok(!pages.includes("推广准备已就绪"), "Partner program no longer claims unconditional readiness");

assert.ok(!withdrawals.includes("data-withdraw-review"), "User side has no withdrawal review controls");
assert.ok(!withdrawals.includes("data-withdraw-simulate"), "User side has no payment simulation controls");
assert.ok(withdrawals.includes('timeout: ["处理中", "Processing", "info"]'), "Timeout is shown as processing");
assert.ok(withdrawals.includes("支付结果仍在确认中") && withdrawals.includes("请勿重复提交"), "Timeout copy remains query-only");
assert.ok(!withdrawals.includes('timeout: ["支付超时，申请金额已全额退回可提现余额'), "Timeout no longer claims an automatic full refund");
assert.ok(withdrawals.includes('data-withdraw-action="query"'), "Processing and timeout states offer query");

console.log(JSON.stringify({
  findings: ["A-01", "A-02", "A-04", "A-05", "A-06"],
  result: "User-side P1 design audit checks passed"
}, null, 2));
