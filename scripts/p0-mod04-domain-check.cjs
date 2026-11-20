"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createP0Mod04Domain} = require("../domain/p0-mod04.cjs");

const schemas = JSON.parse(fs.readFileSync(path.join(__dirname, "../openapi/schemas/p0-object-schemas.json"), "utf8")).definitions;

function validate(value, schema, at = "$") {
  if (schema.type === "integer" && !Number.isInteger(value)) return `${at}: expected integer`;
  if (schema.type === "number" && typeof value !== "number") return `${at}: expected number`;
  if (schema.type === "array" && !Array.isArray(value)) return `${at}: expected array`;
  if (schema.type === "object" && (typeof value !== "object" || value === null || Array.isArray(value))) return `${at}: expected object`;
  if (schema.type === "string" && typeof value !== "string") return `${at}: expected string`;
  if (schema.type === "object") {
    for (const field of schema.required || []) {
      if (!(field in value) || value[field] === null || value[field] === undefined) return `${at}.${field}: required`;
    }
    for (const [field, child] of Object.entries(schema.properties || {})) {
      if (field in value) {
        const error = validate(value[field], child, `${at}.${field}`);
        if (error) return error;
      }
    }
  }
  if (schema.type === "array") {
    for (const item of value) {
      const error = validate(item, schema.items, at);
      if (error) return error;
    }
  }
  if (typeof value === "string") {
    if (schema.minLength && value.length < schema.minLength) return `${at}: too short`;
    if (schema.pattern && !(new RegExp(schema.pattern)).test(value)) return `${at}: pattern mismatch`;
  }
  return undefined;
}

let checks = 0;
function test(name, fn) {
  fn();
  checks += 1;
  console.log(`PASS ${name}`);
}

function error(fn, code) {
  assert.throws(fn, error => error.code === code);
}

function setup(domain, customerId, {withQualifiedFacts = true} = {}) {
  domain.saveLockedAttribution({
    customer_id: customerId, attribution_id: `ATT-${customerId}`, partner_id: "PRT-A", state: "locked",
  });
  domain.savePriceSnapshot({
    price_version: "price-test-v1", country: "SG", qualification_tier: "L1",
    base_price: "610.00", country_coefficient: "1.00", currency: "USD",
    rounding_context: "test-half-up", m1_ratio: "0.418033", m2_ratio: "0.581967",
  });
  domain.saveQualityUpgradeRule({m3_rule_version: "m3-test-v1", m3_percentage: "0.20"});
  domain.intakeCustomerFact({
    customer_fact_id: `FACT-${customerId}-FD`, record_version: 1, customer_id: customerId,
    fact_type: "first_deposit", occurred_at: "2026-01-10T00:00:00Z",
    source_ref: `SRC-${customerId}-FD`, quality_state: "validated", values: {amount: "500.00"},
  });
  if (!withQualifiedFacts) return;
  for (const [type, values] of [
    ["net_deposit", {qualification_tier: "L1"}],
    ["valid_trading", {qualification_tier: "L1"}],
    ["identity", {qualification_tier: "L1", country: "SG"}],
  ]) {
    domain.intakeCustomerFact({
      customer_fact_id: `FACT-${customerId}-${type}`, record_version: 1, customer_id: customerId,
      fact_type: type, occurred_at: "2026-01-11T00:00:00Z",
      source_ref: `SRC-${customerId}-${type}`, quality_state: "validated", values,
    });
  }
}

function qualifiedCase(domain, customerId = "CUS-400") {
  const result = domain.evaluateQualification({
    customer_id: customerId, milestone: "qualified_conversion", rule_version: "qual-test-v1",
  });
  assert.equal(result.result, "qualified");
  return result.qualification_case;
}

test("AC14 First Deposit records a milestone but creates no money", () => {
  const domain = createP0Mod04Domain();
  setup(domain, "CUS-400");
  const result = domain.evaluateQualification({
    customer_id: "CUS-400", milestone: "first_deposit", rule_version: "qual-test-v1",
  });
  assert.equal(result.result, "qualified");
  assert.equal(result.milestone_snapshot.new_state, "reached");
  assert.equal(domain.snapshot().commissionCases.length, 0);
  assert.equal(domain.snapshot().commissionLines.length, 0);
});

test("AC15 Qualified Conversion creates exactly one base case", () => {
  const domain = createP0Mod04Domain();
  setup(domain, "CUS-401");
  const qualification = qualifiedCase(domain, "CUS-401");
  const generated = domain.generateCommissionCase({
    qualification_case_id: qualification.qualification_case_id, case_type: "base", price_version: "price-test-v1",
  });
  assert.equal(generated.commission_case.case_type, "base");
  assert.equal(generated.commission_case.amount, "610.00");
  assert.deepEqual(generated.commission_lines.map(line => [line.component, line.amount]), [["M1", "255.00"], ["M2", "355.00"]]);
  error(() => domain.generateCommissionCase({
    qualification_case_id: qualification.qualification_case_id, case_type: "base", price_version: "price-test-v1",
  }), "AFF-40902");
  assert.equal(domain.snapshot().commissionCases.length, 1);
});

test("AC16 M3 is independent and uses source M1 plus M2", () => {
  const domain = createP0Mod04Domain();
  setup(domain, "CUS-402");
  const qualification = qualifiedCase(domain, "CUS-402");
  const base = domain.generateCommissionCase({
    qualification_case_id: qualification.qualification_case_id, case_type: "base", price_version: "price-test-v1",
  });
  domain.intakeCustomerFact({
    customer_fact_id: "FACT-CUS-402-Quality", record_version: 1, customer_id: "CUS-402",
    fact_type: "quality_upgrade", occurred_at: "2026-02-01T00:00:00Z",
    source_ref: "SRC-CUS-402-Quality", quality_state: "validated", values: {confirmed: true},
  });
  const m3Qualification = domain.evaluateQualification({
    customer_id: "CUS-402", milestone: "quality_upgrade", rule_version: "qual-test-v1",
  });
  const m3 = domain.generateCommissionCase({
    qualification_case_id: m3Qualification.qualification_case.qualification_case_id,
    case_type: "m3", source_commission_case_id: base.commission_case.commission_case_id,
    m3_rule_version: "m3-test-v1",
  });
  assert.equal(m3.commission_case.case_type, "m3");
  assert.equal(m3.commission_case.amount, "122.00");
  assert.notEqual(m3.commission_case.commission_case_id, base.commission_case.commission_case_id);
  const snap = domain.snapshot();
  const m3Snapshot = snap.qualityUpgradeRules.find(item => item.source_commission_case_id === base.commission_case.commission_case_id);
  assert.deepEqual(m3Snapshot.source_amount_snapshot, {m1_amount: "255.00", m2_amount: "355.00", total_amount: "610.00"});
  assert.equal(m3Snapshot.m3_percentage, "0.20");
});

test("AC17 snapshots retain version references and configuration changes do not rewrite history", () => {
  const domain = createP0Mod04Domain();
  setup(domain, "CUS-403");
  const qualification = qualifiedCase(domain, "CUS-403");
  const generated = domain.generateCommissionCase({
    qualification_case_id: qualification.qualification_case_id, case_type: "base", price_version: "price-test-v1",
  });
  domain.savePriceSnapshot({
    price_version: "price-test-v2", country: "SG", qualification_tier: "L1",
    base_price: "700.00", country_coefficient: "1.00", currency: "USD",
    rounding_context: "test-half-up-v2", m1_ratio: "0.50", m2_ratio: "0.50",
  });
  const snap = domain.snapshot();
  const oldCase = snap.commissionCases.find(item => item.commission_case_id === generated.commission_case.commission_case_id);
  assert.ok(oldCase.snapshot_refs.includes("PRICE:price-test-v1:SG:L1"));
  assert.equal(oldCase.amount, "610.00");
  const oldLines = snap.commissionLines.filter(line => line.commission_case_id === oldCase.commission_case_id);
  assert.deepEqual(oldLines.map(line => line.amount), ["255.00", "355.00"]);
});

test("AC18 duplicate facts and duplicate commission generation cannot duplicate money", () => {
  const domain = createP0Mod04Domain();
  setup(domain, "CUS-404");
  const duplicate = domain.intakeCustomerFact({
    customer_fact_id: "FACT-CUS-404-FD", record_version: 1, customer_id: "CUS-404",
    fact_type: "first_deposit", occurred_at: "2026-01-10T00:00:00Z",
    source_ref: "SRC-CUS-404-FD", quality_state: "validated", values: {amount: "500.00"},
  });
  assert.equal(duplicate.idempotent_replay, true);
  assert.equal(domain.snapshot().customerFacts.length, 4);
  const qualification = qualifiedCase(domain, "CUS-404");
  domain.generateCommissionCase({qualification_case_id: qualification.qualification_case_id, case_type: "base", price_version: "price-test-v1"});
  error(() => domain.generateCommissionCase({
    qualification_case_id: qualification.qualification_case_id, case_type: "base", price_version: "price-test-v1",
  }), "AFF-40902");
  assert.equal(domain.snapshot().commissionCases.length, 1);
});

test("missing critical facts remain pending and generate no case", () => {
  const domain = createP0Mod04Domain();
  setup(domain, "CUS-405", {withQualifiedFacts: false});
  const result = domain.evaluateQualification({
    customer_id: "CUS-405", milestone: "qualified_conversion", rule_version: "qual-test-v1",
  });
  assert.equal(result.result, "data_pending");
  assert.equal(result.reason_code, "critical_fact_missing");
  assert.ok(result.review_task_id);
  assert.equal(domain.snapshot().commissionCases.length, 0);
});

test("missing attribution can never qualify", () => {
  const domain = createP0Mod04Domain();
  const result = domain.evaluateQualification({
    customer_id: "CUS-UNKNOWN", milestone: "qualified_conversion", rule_version: "qual-test-v1",
  });
  assert.equal(result.result, "data_pending");
  assert.equal(result.reason_code, "locked_attribution_missing");
  assert.equal(domain.snapshot().commissionCases.length, 0);
});

test("correction creates an adjustment without mutating the original case", () => {
  const domain = createP0Mod04Domain();
  setup(domain, "CUS-407");
  const qualification = qualifiedCase(domain, "CUS-407");
  const generated = domain.generateCommissionCase({
    qualification_case_id: qualification.qualification_case_id, case_type: "base", price_version: "price-test-v1",
  });
  const adjusted = domain.createCommissionAdjustment({
    adjustment_id: "ADJ-407", original_case_id: generated.commission_case.commission_case_id,
    direction: "increase", difference_amount: "25.00", source_version: "FACT-CUS-407-net-deposit:2",
    rule_version: "qual-test-v2",
  });
  assert.equal(adjusted.adjustment.downstream_routing, "settlement_gate");
  assert.equal(adjusted.original_after.state, "settlement_pending");
  assert.equal(adjusted.original_after.amount, "610.00");
  assert.equal(domain.snapshot().commissionAdjustments.length, 1);
});

test("generated canonical objects validate against P0 schemas", () => {
  const domain = createP0Mod04Domain();
  setup(domain, "CUS-408");
  const qualification = qualifiedCase(domain, "CUS-408");
  const base = domain.generateCommissionCase({
    qualification_case_id: qualification.qualification_case_id, case_type: "base", price_version: "price-test-v1",
  });
  domain.intakeCustomerFact({
    customer_fact_id: "FACT-CUS-408-Quality", record_version: 1, customer_id: "CUS-408",
    fact_type: "quality_upgrade", occurred_at: "2026-02-01T00:00:00Z",
    source_ref: "SRC-CUS-408-Quality", quality_state: "validated", values: {confirmed: true},
  });
  const m3Qualification = domain.evaluateQualification({customer_id: "CUS-408", milestone: "quality_upgrade", rule_version: "qual-test-v1"});
  domain.generateCommissionCase({
    qualification_case_id: m3Qualification.qualification_case.qualification_case_id,
    case_type: "m3", source_commission_case_id: base.commission_case.commission_case_id,
    m3_rule_version: "m3-test-v1",
  });
  domain.createCommissionAdjustment({
    adjustment_id: "ADJ-408", original_case_id: base.commission_case.commission_case_id,
    direction: "increase", difference_amount: "10.00", source_version: "FACT-CUS-408-net-deposit:2",
    rule_version: "qual-test-v2",
  });
  const snap = domain.snapshot();
  const examples = {
    QualificationCase: snap.qualificationCases[0],
    MilestoneSnapshot: snap.milestoneSnapshots[0],
    PriceSnapshot: snap.priceSnapshots[0],
    QualityUpgradeRuleSnapshot: snap.qualityUpgradeRules.find(item => item.source_commission_case_id),
    CommissionCase: snap.commissionCases[0],
    CommissionLine: snap.commissionLines[0],
    CommissionAdjustment: snap.commissionAdjustments[0],
  };
  for (const [name, value] of Object.entries(examples)) {
    const invalid = validate(value, schemas[name], name);
    assert.equal(invalid, undefined, `${name}: ${invalid}`);
  }
  for (const event of snap.events) {
    assert.ok(event.event_id && event.event_type && event.object_id && event.trace_id);
    assert.equal(typeof event.data, "object");
  }
});

console.log(`P0 MOD-04 domain checks passed: ${checks} scenarios`);
