"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createP0Mod05Domain} = require("../domain/p0-mod05.cjs");

const schemas = JSON.parse(fs.readFileSync(path.join(__dirname, "../openapi/schemas/p0-object-schemas.json"), "utf8")).definitions;

function validate(value, schema, at = "$") {
  if (schema.type === "integer" && !Number.isInteger(value)) return `${at}: expected integer`;
  if (schema.type === "array" && !Array.isArray(value)) return `${at}: expected array`;
  if (schema.type === "object" && (typeof value !== "object" || value === null || Array.isArray(value))) return `${at}: expected object`;
  if (schema.type === "string" && typeof value !== "string") return `${at}: expected string`;
  if (schema.type === "object") {
    for (const field of schema.required || []) if (!(field in value) || value[field] === null || value[field] === undefined) return `${at}.${field}: required`;
    for (const [field, child] of Object.entries(schema.properties || {})) if (field in value) {
      const error = validate(value[field], child, `${at}.${field}`);
      if (error) return error;
    }
  }
  if (schema.type === "array") for (const item of value) {
    const error = validate(item, schema.items, at);
    if (error) return error;
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
  assert.throws(fn, item => item.code === code);
}

function hardSignal(domain, caseId = "SET-A", signalId = "SIG-HARD-A") {
  domain.intakeRiskFact({
    source_system: "CRM", source_fact_id: `FRAUD-${caseId}`, source_version: "1",
    fact_type: "fraud", raw_status: "confirmed_fraud", mapped_status: "confirmed",
    scope_hint: `settlement:${caseId}`, occurred_at: "2026-02-01T00:00:00Z", quality_state: "validated",
  });
  return domain.evaluateRiskSignal({
    risk_fact_refs: [`CRM:FRAUD-${caseId}:1`], rule_version: "hard-rule-test-v1",
    scope: `settlement:${caseId}`, risk_signal_id: signalId,
  }).risk_signal;
}

test("AC19 confirmed hard fact blocks automatic settlement", () => {
  const domain = createP0Mod05Domain();
  const signal = hardSignal(domain);
  const evaluation = domain.evaluateSettlementGate({
    settlement_case_id: "SET-A", risk_signal_refs: [signal.risk_signal_id],
    critical_inputs: {attribution: "locked", qualification: "qualified", settlement: "ready"},
  }).settlement_gate_evaluation;
  assert.equal(evaluation.result, "blocked");
  assert.equal(evaluation.block_reason, "hard_fraud");
  assert.equal(evaluation.gate_results.hard_fact, "blocked");
});

test("AC20 critical missing data blocks only the affected case", () => {
  const domain = createP0Mod05Domain();
  domain.intakeRiskFact({
    source_system: "CRM", source_fact_id: "ATTR-SET-B", source_version: "1", fact_type: "attribution",
    raw_status: "unknown", mapped_status: "unknown", scope_hint: "settlement:SET-B",
    occurred_at: "2026-02-01T00:00:00Z", quality_state: "unknown",
  });
  const signal = domain.evaluateRiskSignal({
    risk_fact_refs: ["CRM:ATTR-SET-B:1"], rule_version: "data-quality-test-v1", scope: "settlement:SET-B",
  }).risk_signal;
  const blocked = domain.evaluateSettlementGate({
    settlement_case_id: "SET-B", risk_signal_refs: [signal.risk_signal_id],
    critical_inputs: {attribution: "unknown", qualification: "qualified", settlement: "ready"},
  }).settlement_gate_evaluation;
  const unrelated = domain.evaluateSettlementGate({
    settlement_case_id: "SET-C", risk_signal_refs: [],
    critical_inputs: {attribution: "locked", qualification: "qualified", settlement: "ready"},
  }).settlement_gate_evaluation;
  assert.equal(blocked.result, "data_blocked");
  assert.equal(blocked.block_reason, "missing_attribution");
  assert.equal(unrelated.result, "passed");
});

test("AC21 reviewed action affects only its exact settlement object", () => {
  const domain = createP0Mod05Domain();
  const signal = hardSignal(domain, "SET-D", "SIG-HARD-D");
  const riskCase = domain.reviewRiskCase({
    risk_signal_refs: [signal.risk_signal_id], scope: "settlement:SET-D", actor_id: "risk-reviewer",
    decision: "maintain", reason_code: "confirmed_hard_fact",
  }).risk_case;
  const execution = domain.executeRiskAction({
    risk_case_id: riskCase.risk_case_id, action: "pause_settlement", affected_object_ids: ["settlement:SET-D"],
  }).risk_execution;
  assert.deepEqual(execution.affected_object_ids, ["settlement:SET-D"]);
  error(() => domain.executeRiskAction({
    risk_case_id: riskCase.risk_case_id, action: "pause_settlement", affected_object_ids: ["settlement:SET-E"],
  }), "AFF-40301");
});

test("AC22 release recommendation cannot bypass a new full gate recheck", () => {
  const domain = createP0Mod05Domain();
  const signal = hardSignal(domain, "SET-F", "SIG-HARD-F");
  const first = domain.evaluateSettlementGate({
    settlement_case_id: "SET-F", risk_signal_refs: [signal.risk_signal_id],
    critical_inputs: {attribution: "locked", qualification: "qualified", settlement: "ready"},
  }).settlement_gate_evaluation;
  const riskCase = domain.reviewRiskCase({
    risk_signal_refs: [signal.risk_signal_id], scope: "settlement:SET-F", actor_id: "risk-reviewer",
    decision: "release_recommendation", reason_code: "evidence_rejected",
  }).risk_case;
  const second = domain.evaluateSettlementGate({
    settlement_case_id: "SET-F", risk_signal_refs: [signal.risk_signal_id],
    critical_inputs: {attribution: "locked", qualification: "qualified", settlement: "ready"},
  }).settlement_gate_evaluation;
  error(() => domain.changeQuarantine({
    source_type: "risk_signal", source_ref: signal.risk_signal_id, scope: "settlement:SET-F",
    reason_code: "release_after_recheck", blocked_amount: "0.00", state: "released",
  }), "AFF-42209");
  const quarantine = domain.changeQuarantine({
    source_type: "risk_signal", source_ref: signal.risk_signal_id, scope: "settlement:SET-F",
    reason_code: "maintained_after_recheck", blocked_amount: "100.00", state: "active",
  }).quarantine_record;
  assert.equal(riskCase.decision, "release_recommendation");
  assert.equal(first.evaluation_version, "1");
  assert.equal(second.evaluation_version, "2");
  assert.equal(second.result, "blocked");
  assert.equal(quarantine.state, "active");
});

test("unknown and duplicate risk facts remain explicit and idempotent", () => {
  const domain = createP0Mod05Domain();
  hardSignal(domain, "SET-G", "SIG-HARD-G");
  const replay = domain.intakeRiskFact({
    source_system: "CRM", source_fact_id: "FRAUD-SET-G", source_version: "1", fact_type: "fraud",
    raw_status: "confirmed_fraud", mapped_status: "confirmed", scope_hint: "settlement:SET-G",
    occurred_at: "2026-02-01T00:00:00Z", quality_state: "validated",
  });
  assert.equal(replay.idempotent_replay, true);
  assert.equal(domain.snapshot().riskFacts.length, 1);
});

test("AC37 strictest target wins and credit history stays immutable", () => {
  const domain = createP0Mod05Domain();
  domain.recordCreditPoint({
    partner_id: "PRT-A", source_event_ref: "risk-event-1", point_rule_version: "point-test-v1",
    direction: "deduct", points: "10", window_version: "window-test-v1", effective_at: "2026-02-01T00:00:00Z",
  });
  error(() => domain.recordCreditPoint({
    partner_id: "PRT-A", source_event_ref: "risk-event-1", point_rule_version: "point-test-v1",
    direction: "deduct", points: "10", window_version: "window-test-v1", effective_at: "2026-02-01T00:00:00Z",
  }), "AFF-40902");
  const invalidScore = domain.recalculateCreditScore({
    partner_id: "PRT-A", dimension_weights_version: "weights-test-v1", window_version: "window-test-v1",
    input_versions: "point-test-v1", data_quality: "missing", score: "data_blocked",
  }).credit_score_snapshot;
  assert.equal(invalidScore.score, "data_blocked");
  const firstLevel = domain.changeCreditLevel({
    partner_id: "PRT-A", source_score_version: "1", target_levels: ["C1", "C2"],
    target_level_rules_version: "target-test-v1", reason_code: "multiple_risk_targets",
  }).credit_level_snapshot;
  assert.equal(firstLevel.level, "C2");
  const benefit = domain.lockCreditBenefitSnapshot({
    commission_case_id: "COMM-A", partner_id: "PRT-A", benefit_version: "benefit-test-v1",
    personal_benefit_version: "personal-test-v1", base_price_snapshot_version: "price-test-v1",
  }).credit_benefit_snapshot;
  const override = domain.applyCreditOverride({
    partner_id: "PRT-A", target_level: "C4", approval_ref: "APR-C4", authorization_role: "high_permission_admin",
  }).credit_override;
  const overrideLevel = domain.changeCreditLevel({
    partner_id: "PRT-A", source_score_version: "1", target_levels: ["C1"],
    target_level_rules_version: "target-test-v1", reason_code: "override_active",
  }).credit_level_snapshot;
  const expired = domain.expireCreditOverride({override_id: override.override_id});
  const restoredLevel = domain.changeCreditLevel({
    partner_id: "PRT-A", source_score_version: "1", target_levels: ["C1"],
    target_level_rules_version: "target-test-v1", reason_code: "override_expired",
  }).credit_level_snapshot;
  assert.equal(overrideLevel.level, "C4");
  assert.equal(expired.restored_system_level, "C2");
  assert.equal(restoredLevel.level, "C1");
  assert.equal(benefit.credit_level, "C2");
  const snap = domain.snapshot();
  assert.equal(snap.creditLevelSnapshots.length, 3);
  assert.equal(snap.creditBenefitSnapshots.length, 1);
  assert.equal(snap.creditBenefitSnapshots[0].credit_level, "C2");
});

test("generated canonical objects validate against P0 schemas", () => {
  const domain = createP0Mod05Domain();
  const signal = hardSignal(domain, "SET-H", "SIG-HARD-H");
  const gate = domain.evaluateSettlementGate({
    settlement_case_id: "SET-H", risk_signal_refs: [signal.risk_signal_id],
    critical_inputs: {attribution: "locked", qualification: "qualified", settlement: "ready"},
  }).settlement_gate_evaluation;
  const riskCase = domain.reviewRiskCase({
    risk_signal_refs: [signal.risk_signal_id], scope: "settlement:SET-H", actor_id: "reviewer",
    decision: "maintain", reason_code: "hard_fact",
  }).risk_case;
  const execution = domain.executeRiskAction({
    risk_case_id: riskCase.risk_case_id, action: "pause_settlement", affected_object_ids: ["settlement:SET-H"],
  }).risk_execution;
  const quarantine = domain.changeQuarantine({
    source_type: "risk_signal", source_ref: signal.risk_signal_id, scope: "settlement:SET-H",
    reason_code: "hard_fact", blocked_amount: "100.00", state: "active",
  }).quarantine_record;
  const point = domain.recordCreditPoint({
    partner_id: "PRT-H", source_event_ref: "event-h", point_rule_version: "point-test-v1",
    direction: "add", points: "10", window_version: "window-test-v1", effective_at: "2026-02-01T00:00:00Z",
  }).credit_point_record;
  const score = domain.recalculateCreditScore({
    partner_id: "PRT-H", dimension_weights_version: "weights-test-v1", window_version: "window-test-v1",
    input_versions: "point-test-v1", data_quality: "valid", score: "700",
  }).credit_score_snapshot;
  const level = domain.changeCreditLevel({
    partner_id: "PRT-H", source_score_version: score.calculation_version, target_levels: ["C2"],
    target_level_rules_version: "target-test-v1", reason_code: "score_band",
  }).credit_level_snapshot;
  const benefit = domain.lockCreditBenefitSnapshot({
    commission_case_id: "COMM-H", partner_id: "PRT-H", benefit_version: "benefit-test-v1",
    personal_benefit_version: "personal-test-v1", base_price_snapshot_version: "price-test-v1",
  }).credit_benefit_snapshot;
  const snap = domain.snapshot();
  const examples = {
    RiskFact: snap.riskFacts[0], RiskSignal: signal, SettlementGateEvaluation: gate,
    RiskCase: riskCase, QuarantineRecord: quarantine, RiskExecution: execution,
    CreditPointRecord: point, CreditScoreSnapshot: score, CreditLevelSnapshot: level,
    CreditBenefitSnapshot: benefit,
  };
  for (const [name, value] of Object.entries(examples)) {
    const invalid = validate(value, schemas[name], name);
    assert.equal(invalid, undefined, `${name}: ${invalid}`);
  }
  for (const event of snap.events) assert.ok(event.event_id && event.event_type && event.object_id && event.trace_id);
});

console.log(`P0 MOD-05 domain checks passed: ${checks} scenarios`);
