const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
function load() {
  const context = vm.createContext({ window: {}, Intl, Date, Map, Set, Math, JSON });
  context.window = context;
  for (const filename of ["data.js", "report-data.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, filename), "utf8"), context, { filename });
  }
  return context.AFF.reporting;
}
const data = load();
assert.equal(data.dimensions.length, 20);
assert.equal(data.rows.length, 1440);
assert.equal(new Set(data.rows.filter(row => row.clientId).map(row => row.clientId)).size, 960);
assert.equal(JSON.stringify(data.rows), JSON.stringify(load().rows), "Dataset must be reproducible");
assert.ok(data.rows.filter(row => !row.clientId).length >= 200);
assert.ok(data.options("country").length >= 10);
assert.equal(data.options("platform").length, 3);
for (const dimension of data.dimensions.filter(dimension => !dimension.time)) {
  assert.ok(data.options(dimension.key).length > 1, `${dimension.key} needs varied values`);
}
const ids = new Set();
for (const row of data.rows) {
  assert.ok(!ids.has(row.id));
  ids.add(row.id);
  assert.ok(row.date >= data.from && row.date <= data.now);
  if (row.clientId) assert.match(row.email, /^[a-z]\*\*\*@example\.com$/);
  else assert.equal(row.email, null);
  for (const key of ["registeredAt", "kycAt", "ftdAt", "effectiveAt", "tradedAt", "qualifiedAt"]) {
    if (row[key]) assert.ok(row[key] >= row.date && row[key] <= data.now, `${key} outside valid dates`);
  }
  if (row.ftdAt) assert.ok(row.registeredAt <= row.ftdAt && row.kyc === "通过");
  if (row.effectiveAt) assert.ok(row.ftdAt && row.ftdAt <= row.effectiveAt);
  if (row.tradedAt) assert.ok(row.ftdAt && row.ftdAt <= row.tradedAt);
  if (row.qualifiedAt) {
    assert.ok(row.effectiveAt && row.tradedAt);
    assert.ok(row.qualifiedAt >= row.effectiveAt && row.qualifiedAt >= row.tradedAt);
  }
  assert.equal(Boolean(row.expected), Boolean(row.commissionId));
  if (row.effectiveAt) {
    assert.ok(row.expected > 0 && row.commissionId, `${row.clientId} must generate commission at valid FTD`);
    assert.match(row.tier, /^L[1-4]$/, `${row.clientId} valid FTD must have a commission tier`);
    const gross = data.commissionPrice(row.country, row.tier);
    const expected = row.qualityAt ? gross : Math.round(gross * 0.75);
    assert.equal(row.expected, expected, `${row.clientId} commission must match tier, country coefficient, and milestone`);
    assert.ok(row.commissionCases.some(item => item.type === "qftd_batch" && item.amount > 0), `${row.clientId} needs the first two-segment case`);
  }
  if (row.qualityAt) {
    assert.ok(row.effectiveAt && row.expected > 0, `${row.clientId} quality service cannot precede valid FTD`);
    assert.ok(row.commissionCases.some(item => item.type === "quality_service" && item.amount > 0), `${row.clientId} needs the quality-service case`);
  }
  if (["rejected", "reversed"].includes(row.commissionStatus)) {
    assert.ok(row.commissionId && row.commissionReasonCode && row.commissionReason && row.commissionReasonEn);
  } else {
    assert.equal(row.commissionReason, "");
    assert.equal(row.commissionReasonCode, "");
  }
  assert.equal(["held", "approved", "paid", "rejected", "reversed"].filter(key => row[key] > 0).length, row.effectiveAt && row.commissionStatus !== "pending" ? 1 : 0);
  for (const key of ["ftdAmount", "expected", "held", "approved", "paid", "rejected", "reversed"]) {
    assert.ok(Number.isFinite(row[key]) && row[key] >= 0);
  }
}
const total = data.totals(data.rows);
assert.ok(data.rows.some(row => row.clientId && row.expected > 0 && row.commissionStatus === "pending"), "Pending review needs positive-commission clients");
assert.equal(total.registrations, 960);
assert.ok(total.visitors < data.rows.length);
assert.ok(total.ftd <= total.registrations && total.effective <= total.ftd && total.qualified <= total.effective);
assert.equal(total.ftdRate, total.ftd / total.registrations);
assert.equal(total.effectiveRate, total.effective / total.ftd);
assert.equal(total.qualifiedRate, total.qualified / total.effective);
assert.equal(total.epc, total.expected / total.clicks);
assert.equal(data.aggregate(data.rows, [])[0].metrics.expected, total.expected);
assert.equal(data.aggregate([], []).length, 0);
const empty = data.totals([]);
assert.equal(empty.registrations, 0);
assert.equal(empty.ftdRate, null);
let pairs = 0;
for (let left = 0; left < data.dimensions.length; left += 1) {
  for (let right = left + 1; right < data.dimensions.length; right += 1) {
    const a = data.dimensions[left];
    const b = data.dimensions[right];
    if (a.time && b.time) continue;
    const groups = [a.key, b.key];
    const aggregated = data.aggregate(data.rows, groups);
    assert.ok(aggregated.length);
    for (const key of ["clicks", "registrations", "ftd", "effective", "qualified", "traders", "ftdAmount", "expected", "held", "approved", "paid", "rejected", "reversed"]) {
      assert.equal(aggregated.reduce((sum, row) => sum + row.metrics[key], 0), total[key], `${groups.join("+")} ${key} inconsistent`);
    }
    for (const row of aggregated) {
      const filtered = data.filterRows({ [a.key]: row.values[0], [b.key]: row.values[1] });
      assert.equal(data.totals(filtered).clicks, row.metrics.clicks);
      assert.equal(data.totals(filtered).visitors, row.metrics.visitors);
    }
    pairs += 1;
  }
}
const today = data.filterRows({ from: data.now, to: data.now });
assert.ok(today.length && today.every(row => row.date === data.now));
assert.ok(data.filterRows({ from: "2026-09-28", to: data.now }).filter(row => row.clientId).length >= 200);
assert.equal(data.filterRows({ country: "不存在的国家" }).length, 0);
assert.equal(data.filterRows({ from: "2027-01-01" }).length, 0);
assert.ok(data.options("week").every(date => new Date(`${date}T00:00:00Z`).getUTCDay() === 1));
assert.throws(() => data.aggregate(data.rows, ["date", "week"]));
assert.throws(() => data.aggregate(data.rows, ["date", "country", "platform"]));
console.log(`Reporting dataset checks passed: ${data.rows.length} records, ${total.registrations} clients, ${data.dimensions.length} dimensions, ${pairs} valid dimension pairs.`);
