"use strict";

class DomainError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = options.details || [];
  }
}

const HARD_FACTS = new Set(["sanctions", "license_restriction", "fraud", "prohibited_conclusion"]);
const LEVELS = ["C0", "C1", "C2", "C3", "C4"];

function createP0Mod05Domain(options = {}) {
  const clock = options.clock || (() => "2026-11-19T00:00:00Z");
  const state = {
    facts: new Map(), signals: new Map(), gates: new Map(), cases: new Map(),
    quarantines: new Map(), executions: new Map(), points: new Map(),
    scores: new Map(), levels: new Map(), overrides: new Map(), benefits: new Map(), events: [],
  };
  let sequence = 0;
  let eventSequence = 0;
  const nextId = prefix => `${prefix}-${String(++sequence).padStart(4, "0")}`;
  const snapshot = value => JSON.parse(JSON.stringify(value));
  const requireObject = (value, fields) => {
    const missing = fields.filter(field => value === undefined || value === null || value[field] === undefined || value[field] === null || value[field] === "");
    if (missing.length) throw new DomainError("AFF-42201", "Validation failed", {details: missing});
  };
  function emit(type, objectType, objectId, data, context, requirements) {
    const event = {
      event_id: `EVT-${String(++eventSequence).padStart(5, "0")}`, event_type: type, event_version: 1,
      occurred_at: clock(), processed_at: clock(), trace_id: context.trace_id || nextId("TRACE"),
      source: "cpa-internal-domain-double", object_type: objectType, object_id: objectId,
      fact_version: data.record_version || 1, rule_version: context.rule_version || "risk-double-v1",
      idempotency_key: context.idempotency_key || nextId("IDEM"), visibility: "admin",
      audit: {actor_id: context.actor_id || "system-double", reason_code: context.reason_code || "domain_operation"},
      data, requirements,
    };
    state.events.push(event);
    return event;
  }
  const ref = fact => `${fact.source_system}:${fact.source_fact_id}:${fact.source_version}`;
  const scopeType = scope => scope === "global" ? "global" : scope.split(":")[0];

  function intakeRiskFact(input) {
    requireObject(input, ["source_system", "source_fact_id", "source_version", "fact_type", "raw_status", "mapped_status", "scope_hint", "occurred_at", "quality_state"]);
    const key = ref(input);
    if (state.facts.has(key)) {
      const prior = state.facts.get(key);
      const normalized = {...input, record_version: prior.record_version};
      if (JSON.stringify(prior) !== JSON.stringify(normalized)) throw new DomainError("AFF-40902", "Risk fact identity payload conflict");
      return {risk_fact: snapshot(prior), idempotent_replay: true};
    }
    const fact = {...input, record_version: 1};
    state.facts.set(key, fact);
    const event = emit("risk_fact_intake", "RiskFact", key, snapshot(fact), input, ["AFF-REQ-E02", "FEATURE-RISK-01"]);
    return {risk_fact: snapshot(fact), event_id: event.event_id};
  }

  function evaluateRiskSignal(input) {
    requireObject(input, ["risk_fact_refs", "rule_version", "scope"]);
    const allowed = ["customer", "commission", "settlement", "partner", "gray", "global"];
    const type = input.scope_type || scopeType(input.scope);
    if (!allowed.includes(type)) throw new DomainError("AFF-42201", "Unknown risk scope");
    const refs = input.risk_fact_refs;
    if (!Array.isArray(refs) || refs.some(key => !state.facts.has(key))) throw new DomainError("AFF-40401", "Risk fact not found");
    const facts = refs.map(key => state.facts.get(key));
    let outcome = "pass", reason = "no_active_hard_fact";
    if (facts.some(fact => ["unknown", "missing"].includes(fact.quality_state))) {
      outcome = "data_blocked"; reason = "risk_fact_unknown";
    } else if (facts.some(fact => HARD_FACTS.has(fact.fact_type) && fact.mapped_status === "confirmed")) {
      outcome = "block"; reason = `hard_${facts.find(fact => HARD_FACTS.has(fact.fact_type)).fact_type}`;
    } else if (facts.some(fact => fact.quality_state === "conflict")) {
      outcome = "data_blocked"; reason = "risk_fact_conflict";
    }
    const signal = {
      risk_signal_id: input.risk_signal_id || nextId("SIG"), risk_fact_refs: refs,
      rule_version: input.rule_version, scope: input.scope, scope_type: type,
      outcome, reason_code: reason, evidence_refs: refs, record_version: 1,
    };
    state.signals.set(signal.risk_signal_id, signal);
    const event = emit("risk_signal_evaluated", "RiskSignal", signal.risk_signal_id, snapshot(signal), {...input, rule_version: input.rule_version}, ["AFF-REQ-E01", "AFF-REQ-E03", "FEATURE-RISK-02"]);
    return {risk_signal: snapshot(signal), event_id: event.event_id};
  }

  function evaluateSettlementGate(input) {
    requireObject(input, ["settlement_case_id", "risk_signal_refs", "critical_inputs"]);
    const signals = input.risk_signal_refs.map(id => {
      const signal = state.signals.get(id);
      if (!signal) throw new DomainError("AFF-40401", `Risk signal not found: ${id}`);
      if (signal.scope !== `settlement:${input.settlement_case_id}`) throw new DomainError("AFF-40301", "Signal scope does not match settlement case");
      return signal;
    });
    const missing = Object.entries(input.critical_inputs).filter(([, value]) => value === undefined || value === null || value === "" || value === "unknown").map(([name]) => name);
    const hard = signals.filter(signal => signal.outcome === "block");
    const unknown = signals.filter(signal => signal.outcome === "data_blocked");
    const version = String([...state.gates.values()].filter(item => item.settlement_case_id === input.settlement_case_id).length + 1);
    const result = hard.length ? "blocked" : missing.length || unknown.length ? "data_blocked" : "passed";
    const evaluation = {
      settlement_case_id: input.settlement_case_id, evaluation_version: version,
      gate_results: {hard_fact: hard.length ? "blocked" : "passed", risk_data: unknown.length ? "data_blocked" : "passed", critical_data: missing.length ? "data_blocked" : "passed"},
      input_versions: signals.map(signal => `${signal.risk_signal_id}:${signal.rule_version}`).join(",") || "none",
      result, block_reason: hard[0]?.reason_code || (missing[0] ? `missing_${missing[0]}` : unknown[0]?.reason_code || "none"),
      trace_id: input.trace_id || nextId("TRACE"), record_version: Number(version),
    };
    state.gates.set(`${input.settlement_case_id}:${version}`, evaluation);
    const event = emit("settlement_gate_evaluated", "SettlementGateEvaluation", `${input.settlement_case_id}:${version}`, snapshot(evaluation), input, ["AFF-REQ-E05", "AFF-REQ-J09", "AFF-REQ-FND-101", "FEATURE-RISK-05"]);
    return {settlement_gate_evaluation: snapshot(evaluation), event_id: event.event_id};
  }

  function reviewRiskCase(input) {
    requireObject(input, ["risk_signal_refs", "scope", "actor_id", "decision", "reason_code"]);
    if (!["release_recommendation", "maintain", "split", "escalate"].includes(input.decision)) throw new DomainError("AFF-42201", "Unknown review decision");
    const signals = input.risk_signal_refs.map(id => state.signals.get(id) || (() => {throw new DomainError("AFF-40401", `Risk signal not found: ${id}`);})());
    const riskCase = {
      risk_case_id: input.risk_case_id || nextId("RISK"), signal_refs: input.risk_signal_refs, scope: input.scope,
      evidence_snapshot: {signal_rules: signals.map(signal => `${signal.risk_signal_id}:${signal.rule_version}`), fact_refs: signals.flatMap(signal => signal.risk_fact_refs)},
      review_task_id: nextId("TASK"), state: "reviewed", decision: input.decision,
      decision_reason_code: input.reason_code, actor_id: input.actor_id, self_review: Boolean(input.self_review), record_version: 1,
    };
    state.cases.set(riskCase.risk_case_id, riskCase);
    const event = emit("risk_case_reviewed", "RiskCase", riskCase.risk_case_id, snapshot(riskCase), input, ["AFF-REQ-E06", "AFF-REQ-E07", "FEATURE-RISK-03"]);
    return {risk_case: snapshot(riskCase), event_id: event.event_id};
  }

  function changeQuarantine(input) {
    requireObject(input, ["source_type", "source_ref", "scope", "reason_code", "blocked_amount", "state"]);
    if (!/^-?[0-9]+\.[0-9]{2}$/.test(input.blocked_amount)) throw new DomainError("AFF-42203", "Blocked amount must be exact decimal money");
    if (!["active", "released", "cancelled"].includes(input.state)) throw new DomainError("AFF-42201", "Unknown quarantine state");
    if (input.state === "released" && !input.release_recheck_ref) throw new DomainError("AFF-42209", "Quarantine release requires full current recheck");
    const quarantine = {
      quarantine_id: input.quarantine_id || nextId("QUAR"), source_type: input.source_type, source_ref: input.source_ref,
      scope: input.scope, reason_code: input.reason_code, blocked_amount: input.blocked_amount,
      state: input.state, release_recheck_ref: input.release_recheck_ref || "none", record_version: 1,
    };
    state.quarantines.set(quarantine.quarantine_id, quarantine);
    const event = emit("quarantine_changed", "QuarantineRecord", quarantine.quarantine_id, snapshot(quarantine), input, ["AFF-REQ-E11", "FEATURE-RISK-05"]);
    return {quarantine_record: snapshot(quarantine), event_id: event.event_id};
  }

  function executeRiskAction(input) {
    requireObject(input, ["risk_case_id", "action", "affected_object_ids"]);
    const riskCase = state.cases.get(input.risk_case_id);
    if (!riskCase) throw new DomainError("AFF-40401", "Risk case not found");
  const invalid = input.affected_object_ids.filter(id => id !== riskCase.scope);
    if (invalid.length) throw new DomainError("AFF-40301", "Affected object outside reviewed scope", {details: invalid});
    const execution = {
      execution_id: nextId("EXEC"), risk_case_id: riskCase.risk_case_id, action: input.action,
      affected_object_ids: input.affected_object_ids, result: "executed", partial_failures: "none",
      compensation_ref: input.compensation_ref || "none", record_version: 1,
    };
    state.executions.set(execution.execution_id, execution);
    const event = emit("risk_execution_changed", "RiskExecution", execution.execution_id, snapshot(execution), input, ["AFF-REQ-E05", "AFF-REQ-E09", "FEATURE-RISK-05"]);
    return {risk_execution: snapshot(execution), event_id: event.event_id};
  }

  function recordCreditPoint(input) {
    requireObject(input, ["partner_id", "source_event_ref", "point_rule_version", "direction", "points", "window_version", "effective_at"]);
    if (!["add", "deduct", "no_effect"].includes(input.direction)) throw new DomainError("AFF-42201", "Unknown point direction");
    const duplicate = [...state.points.values()].some(item => item.partner_id === input.partner_id && item.source_event_ref === input.source_event_ref && item.point_rule_version === input.point_rule_version);
    if (duplicate) throw new DomainError("AFF-40902", "Credit point already recorded");
    const point = {
      credit_point_record_id: nextId("CPT"), partner_id: input.partner_id, source_event_ref: input.source_event_ref,
      point_rule_version: input.point_rule_version, direction: input.direction, points: String(input.points),
      window_version: input.window_version, effective_at: input.effective_at, record_version: 1,
    };
    state.points.set(point.credit_point_record_id, point);
    const event = emit("credit_point_recorded", "CreditPointRecord", point.credit_point_record_id, snapshot(point), input, ["AFF-REQ-M06", "FEATURE-RISK-06"]);
    return {credit_point_record: snapshot(point), event_id: event.event_id};
  }

  function recalculateCreditScore(input) {
    requireObject(input, ["partner_id", "dimension_weights_version", "window_version", "input_versions", "data_quality"]);
    if (input.data_quality !== "valid" && input.score !== "data_blocked") throw new DomainError("AFF-42210", "Invalid credit input must remain data_blocked");
    const version = String([...state.scores.values()].filter(item => item.partner_id === input.partner_id).length + 1);
    const score = {
      partner_id: input.partner_id, calculation_version: version,
      score: input.data_quality === "valid" ? String(input.score) : "data_blocked",
      dimension_weights_version: input.dimension_weights_version, window_version: input.window_version,
      input_versions: input.input_versions, data_quality: input.data_quality, calculated_at: clock(), record_version: Number(version),
    };
    state.scores.set(`${input.partner_id}:${version}`, score);
    const event = emit("credit_score_recalculated", "CreditScoreSnapshot", `${input.partner_id}:${version}`, snapshot(score), input, ["AFF-REQ-M04", "AFF-REQ-M08", "FEATURE-RISK-06"]);
    return {credit_score_snapshot: snapshot(score), event_id: event.event_id};
  }

  const strictest = levels => {
    const invalid = levels.filter(level => !LEVELS.includes(level));
    if (invalid.length || !levels.length) throw new DomainError("AFF-42201", "Unknown or empty credit level", {details: invalid});
    return [...levels].sort((left, right) => Number(right.slice(1)) - Number(left.slice(1)))[0];
  };

  function changeCreditLevel(input) {
    requireObject(input, ["partner_id", "source_score_version", "target_level_rules_version", "reason_code"]);
    const levels = input.target_levels?.length ? [...input.target_levels] : [input.target_level];
    const activeOverride = [...state.overrides.values()].find(item => item.partner_id === input.partner_id && item.state === "active");
    if (activeOverride) levels.push(activeOverride.target_level);
    const level = strictest(levels);
    const version = String([...state.levels.values()].filter(item => item.partner_id === input.partner_id).length + 1);
    const levelSnapshot = {
      partner_id: input.partner_id, level_version: version, level,
      basis: activeOverride ? "override_and_strictest_target" : input.basis || "system_rule",
      source_score_version: input.source_score_version, target_level_rules_version: input.target_level_rules_version,
      effective_at: clock(), reason_code: input.reason_code, record_version: Number(version),
    };
    state.levels.set(`${input.partner_id}:${version}`, levelSnapshot);
    const event = emit("credit_level_changed", "CreditLevelSnapshot", `${input.partner_id}:${version}`, snapshot(levelSnapshot), input, ["AFF-REQ-M02", "AFF-REQ-M09", "AFF-REQ-M17", "FEATURE-RISK-06"]);
    return {credit_level_snapshot: snapshot(levelSnapshot), event_id: event.event_id};
  }

  function applyCreditOverride(input) {
    requireObject(input, ["partner_id", "target_level", "approval_ref", "authorization_role"]);
    if (!LEVELS.includes(input.target_level)) throw new DomainError("AFF-42201", "Unknown credit level");
    if (input.target_level === "C4" && input.authorization_role !== "high_permission_admin") throw new DomainError("AFF-40301", "C4 requires high-permission manual approval");
    const override = {
      override_id: nextId("OVR"), partner_id: input.partner_id, target_level: input.target_level,
      approval_ref: input.approval_ref, effective_at: input.effective_at || clock(),
      expires_at: input.expires_at || clock(), state: "active", record_version: 1,
    };
    state.overrides.set(override.override_id, override);
    const event = emit("credit_override_activated", "CreditOverride", override.override_id, snapshot(override), input, ["AFF-REQ-M03", "AFF-REQ-M11", "FEATURE-RISK-06"]);
    return {credit_override: snapshot(override), event_id: event.event_id};
  }

  function expireCreditOverride(input) {
    requireObject(input, ["override_id"]);
    const override = state.overrides.get(input.override_id);
    if (!override || override.state !== "active") throw new DomainError("AFF-40901", "Active credit override not found");
    override.state = "expired";
    override.record_version += 1;
    const restored = [...state.levels.values()].filter(item => item.partner_id === override.partner_id && item.basis !== "override_and_strictest_target").sort((left, right) => Number(right.level_version) - Number(left.level_version))[0];
    const event = emit("credit_override_expired", "CreditOverride", override.override_id, snapshot(override), input, ["AFF-REQ-M11", "FEATURE-RISK-06"]);
    return {credit_override: snapshot(override), restored_system_level: restored?.level || "C0", event_id: event.event_id};
  }

  function lockCreditBenefitSnapshot(input) {
    requireObject(input, ["commission_case_id", "partner_id", "benefit_version", "personal_benefit_version", "base_price_snapshot_version"]);
    if ([...state.benefits.values()].some(item => item.commission_case_id === input.commission_case_id)) throw new DomainError("AFF-40902", "Commission case benefit already locked");
    const currentLevel = [...state.levels.values()].filter(item => item.partner_id === input.partner_id).sort((left, right) => Number(right.level_version) - Number(left.level_version))[0];
    if (!currentLevel) throw new DomainError("AFF-42211", "Credit level snapshot missing");
    const benefit = {
      benefit_snapshot_id: nextId("CBS"), commission_case_id: input.commission_case_id, partner_id: input.partner_id,
      credit_level: currentLevel.level, benefit_version: input.benefit_version, personal_benefit_version: input.personal_benefit_version,
      base_price_snapshot_version: input.base_price_snapshot_version, locked_at: clock(), record_version: 1,
    };
    state.benefits.set(benefit.benefit_snapshot_id, benefit);
    const event = emit("credit_benefit_locked", "CreditBenefitSnapshot", benefit.benefit_snapshot_id, snapshot(benefit), input, ["AFF-REQ-M12", "AFF-REQ-M13", "AFF-REQ-M14", "FEATURE-RISK-06"]);
    return {credit_benefit_snapshot: snapshot(benefit), event_id: event.event_id};
  }

  return {
    intakeRiskFact, evaluateRiskSignal, evaluateSettlementGate, reviewRiskCase, changeQuarantine,
    executeRiskAction, recordCreditPoint, recalculateCreditScore, changeCreditLevel, applyCreditOverride,
    expireCreditOverride, lockCreditBenefitSnapshot,
    snapshot: () => ({
      riskFacts: [...state.facts.values()].map(snapshot), riskSignals: [...state.signals.values()].map(snapshot),
      settlementGateEvaluations: [...state.gates.values()].map(snapshot), riskCases: [...state.cases.values()].map(snapshot),
      quarantineRecords: [...state.quarantines.values()].map(snapshot), riskExecutions: [...state.executions.values()].map(snapshot),
      creditPointRecords: [...state.points.values()].map(snapshot), creditScoreSnapshots: [...state.scores.values()].map(snapshot),
      creditLevelSnapshots: [...state.levels.values()].map(snapshot), creditOverrides: [...state.overrides.values()].map(snapshot),
      creditBenefitSnapshots: [...state.benefits.values()].map(snapshot), events: state.events.map(snapshot),
    }), DomainError,
  };
}

module.exports = {createP0Mod05Domain, DomainError};
