const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {}, Intl, Date, Map, Set, Math, JSON });
context.window = context;
context.AFF = { helpers: { h: value => String(value ?? "-") } };
for (const filename of ["data.js", "report-data.js", "finance-data.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, filename), "utf8"), context, { filename });
}
const aff = context.AFF;
const finance = aff.finance;

assert.equal(aff.routes.length, 17);
for (const route of ["guarantee", "appeals", "messages"]) assert.ok(aff.routes.some(item => item.id === route));
assert.deepEqual([...new Set(finance.scenarioRows.map(row => row.scenarioCode))], [
  "normal_l1", "normal_l2", "tier_downgrade", "ftd_only", "qftd_pending", "quality_void",
  "hold_extended", "frozen_d30", "chargeback", "not_new_customer", "fraud_hit", "appeal_overturned"
]);
assert.equal(finance.commissionCases.filter(item => item.type === "qftd_batch").length > 0, true);
assert.equal(finance.commissionCases.filter(item => item.type === "quality_service").length > 0, true);
const financeClients = finance.clients ? [...finance.clients.values()] : [];
for (const row of financeClients) {
  if (row.effectiveAt) {
    assert.ok(row.expected > 0, `${row.clientId} valid FTD must have commission`);
    assert.match(row.tier, /^L[1-4]$/, `${row.clientId} valid FTD must have a tier`);
    const gross = aff.partnerProgram.commissionPrice(row.country, row.tier);
    const expected = row.qualityAt ? gross : Math.round(gross * 0.75);
    assert.equal(row.expected, expected, `${row.clientId} commission must match tier, country coefficient, and milestone`);
    assert.ok(row.commissionCases.some(item => item.type === "qftd_batch"), `${row.clientId} needs the first two-segment case`);
  }
  if (row.qualityAt) {
    assert.ok(row.commissionCases.some(item => item.type === "quality_service"), `${row.clientId} needs the quality-service case`);
  }
  const settledCases = (row.commissionCases || []).filter(item => item.settlement);
  if (settledCases.length) {
    const gross = Math.round(settledCases.reduce((sum, item) => sum + item.settlement.grossAmount, 0));
    const tax = Math.round(settledCases.reduce((sum, item) => sum + item.settlement.taxAmount, 0));
    const guarantee = Math.round(settledCases.reduce((sum, item) => sum + item.settlement.guaranteeAmount, 0));
    assert.equal(Math.round(row.approved * 100), gross - tax - guarantee, `${row.clientId} settlement split must reconcile`);
  }
}
for (const settlement of finance.settlements) {
  assert.equal(settlement.grossAmount, settlement.taxAmount + settlement.guaranteeAmount + settlement.availableAmount);
}
assert.equal(finance.configuration.guaranteeRate, 0.10);
assert.equal(finance.configuration.guaranteeReleaseDays, 90);
assert.equal(finance.configuration.terminationRetentionDays, 30);
assert.deepEqual(Object.keys(finance.configuration.taxRates), ["T0", "T1", "T2", "T3"]);
assert.ok(finance.guaranteeRecords.some(item => item.status === "retained"));
assert.ok(finance.guaranteeRecords.some(item => item.status === "released"));
assert.ok(finance.guaranteeRecords.some(item => item.status === "used"));
assert.ok(finance.staticWithdrawals.some(item => item.status === "paid"));
assert.ok(finance.staticWithdrawals.some(item => item.status === "failed"));
for (const order of finance.staticWithdrawals) {
  assert.equal(order.amount, order.allocations.reduce((sum, allocation) => sum + allocation.amount, 0));
  assert.ok(order.estimatedFee >= 100 && order.estimatedFee <= 3000);
  if (order.status !== "paid") assert.equal(order.fee, 0);
}

aff.state = { withdrawalOrders: [] };
const before = finance.balance();
const order = finance.createWithdrawal("100.00", "wire");
assert.equal(finance.balance(), before - order.amount);
finance.setWithdrawalStatus(order.id, "failed");
assert.equal(finance.balance(), before);
assert.equal(order.fee, 0);
assert.equal(order.received, 0);

const summary = finance.summary(aff.reporting.rows);
assert.ok(summary.tax > 0);
assert.ok(summary.guarantee > 0);
assert.ok(summary.available > 0);
assert.ok(summary.paid > 0);
assert.equal(finance.messages.some(item => item.level === "required"), true);
assert.equal(finance.appeals.some(item => item.status === "overturned"), true);
assert.equal(finance.appeals.some(item => item.status === "blocked"), true);

console.log(JSON.stringify({
  routes: aff.routes.length,
  scenarios: finance.scenarioRows.length,
  cases: finance.commissionCases.length,
  settlements: finance.settlements.length,
  guaranteeRecords: finance.guaranteeRecords.length,
  withdrawals: finance.staticWithdrawals.length,
  tax: summary.tax,
  guarantee: summary.guarantee,
  available: summary.available,
  paid: summary.paid,
  result: "P0 finance and scenario checks passed"
}, null, 2));
