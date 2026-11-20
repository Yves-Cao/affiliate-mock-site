"use strict";

/**
 * CPA-internal domain kernel for P0 module 03: registration attribution.
 * CRM remains the business authority; this module uses deterministic doubles only.
 */

class DomainError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.retryable = Boolean(options.retryable);
    this.details = options.details || [];
  }
}

function createP0Mod03Domain(options = {}) {
  const clock = options.clock || (() => "2026-11-19T00:00:00Z");
  const state = {
    registrationFacts: new Map(),
    registrationHistory: new Map(),
    externalTouches: new Map(),
    customerSnapshots: new Map(),
    attributionRules: new Map(),
    candidates: new Map(),
    attributions: new Map(),
    attributionHistory: new Map(),
    corrections: new Map(),
    audit: [],
    events: [],
  };
  const idempotency = new Map();
  let sequence = 0;
  let eventSequence = 0;

  const nextId = prefix => `${prefix}-${String(++sequence).padStart(4, "0")}`;
  const stablePayload = value => JSON.stringify(value, Object.keys(value || {}).sort());
  const snapshot = value => JSON.parse(JSON.stringify(value));

  function requireObject(value, fields) {
    const missing = fields.filter(field => value?.[field] === undefined || value?.[field] === null || value?.[field] === "");
    if (missing.length) throw new DomainError("AFF-42201", "Validation failed", {details: missing.map(field => `missing ${field}`)});
  }

  function idempotentCall(key, payload, action) {
    const payloadHash = stablePayload(payload);
    const prior = idempotency.get(key);
    if (prior) {
      if (prior.payloadHash !== payloadHash) throw new DomainError("AFF-40902", "Idempotency key conflicts with a different request payload");
      return {...prior.result, idempotent_replay: true};
    }
    const result = action(payload);
    idempotency.set(key, {payloadHash, result});
    return result;
  }

  function emit(eventType, objectType, objectId, data, context = {}, requirements = []) {
    const event = {
      event_id: `EVT-${String(++eventSequence).padStart(5, "0")}`,
      event_type: eventType,
      event_version: 1,
      occurred_at: clock(),
      processed_at: clock(),
      trace_id: context.trace_id || nextId("TRACE"),
      source: "cpa-internal-domain-double",
      object_type: objectType,
      object_id: objectId,
      fact_version: data.record_version || 1,
      rule_version: context.rule_version || "attribution-double-v1",
      idempotency_key: context.idempotency_key || nextId("IDEM"),
      visibility: context.visibility || "admin",
      audit: {
        actor_id: context.actor_id || "system-double",
        reason_code: context.reason_code || "domain_operation",
        impact: context.impact || {},
      },
      data,
    };
    state.events.push(event);
    return event;
  }

  function saveAttributionRule(input) {
    requireObject(input, ["rule_version", "window_days", "priority", "duplicate_rule", "effective_at"]);
    if (input.window_days < 1) throw new DomainError("AFF-42201", "Attribution window must be positive");
    const rule = {
      rule_version: input.rule_version,
      window_days: input.window_days,
      priority: input.priority,
      duplicate_rule: input.duplicate_rule,
      invalid_event_handling: input.invalid_event_handling || "exclude",
      cross_device_rule: input.cross_device_rule || "crm_authoritative_only",
      effective_at: input.effective_at,
      record_version: 1,
    };
    state.attributionRules.set(rule.rule_version, rule);
    return {rule: snapshot(rule)};
  }

  function intakeRegistrationFact(input) {
    requireObject(input, ["registration_id", "record_version", "registered_at", "raw_source_snapshot_ref", "idempotency_key"]);
    return idempotentCall(`registration:${input.registration_id}:${input.record_version}:${input.idempotency_key}`, input, payload => {
      const customer_id = payload.customer_id || "";
      const quality_state = customer_id ? "valid" : "incomplete";
      const fact = {
        registration_id: payload.registration_id,
        record_version: payload.record_version,
        customer_id,
        registered_at: payload.registered_at,
        raw_source_snapshot_ref: payload.raw_source_snapshot_ref,
        quality_state,
        correction_ref: payload.correction_ref || "none",
        received_at: clock(),
        record_state: "history",
      };
      const history = state.registrationHistory.get(fact.registration_id) || [];
      const current = state.registrationFacts.get(fact.registration_id);
      let stored;
      if (!current || fact.record_version > current.record_version) {
        history.push(fact);
        state.registrationHistory.set(fact.registration_id, history);
        const currentFact = {...fact, record_state: "current"};
        state.registrationFacts.set(fact.registration_id, currentFact);
        fact.record_state = "current";
        stored = currentFact;
      } else {
        history.push({...fact, record_state: "late"});
        state.registrationHistory.set(fact.registration_id, history);
        stored = {...fact, record_state: "late"};
      }
      const eventType = fact.record_version === 1 ? "crm_registration_fact_recorded" : "crm_registration_fact_changed";
      const event = emit(eventType, "RegistrationFact", `${fact.registration_id}:${fact.record_version}`, snapshot(stored), payload, ["AFF-REQ-B13", "FEATURE-ATTR-01"]);
      return {registration_fact: snapshot(stored), event_id: event.event_id, late: stored.record_state === "late"};
    });
  }

  function intakeExternalTouch(input) {
    requireObject(input, ["touch_id", "provider", "customer_ref", "touch_time", "evidence_ref", "quality_state", "idempotency_key"]);
    if (!["valid", "invalid", "unknown", "stale", "conflict"].includes(input.quality_state)) {
      throw new DomainError("AFF-42201", "Unknown external-touch quality state");
    }
    return idempotentCall(`touch:${input.touch_id}:${input.idempotency_key}`, input, payload => {
      const touch = {
        touch_id: payload.touch_id,
        provider: payload.provider,
        customer_ref: payload.customer_ref,
        click_ref: payload.click_ref || "none",
        partner_id: payload.partner_id || "",
        touch_time: payload.touch_time,
        evidence_ref: payload.evidence_ref,
        quality_state: payload.quality_state,
        record_version: 1,
      };
      state.externalTouches.set(touch.touch_id, touch);
      const event = emit("external_touch_recorded", "ExternalTouch", touch.touch_id, snapshot(touch), payload, ["AFF-REQ-B03", "AFF-REQ-B13", "FEATURE-ATTR-03"]);
      return {external_touch: snapshot(touch), event_id: event.event_id};
    });
  }

  function saveCustomerSnapshot(input) {
    requireObject(input, ["customer_id", "snapshot_version", "crm_subject_ref", "country", "identity_state", "ib_state", "data_as_of"]);
    input.snapshot_version = String(input.snapshot_version);
    const key = `${input.customer_id}:${input.snapshot_version}`;
    if (state.customerSnapshots.has(key)) throw new DomainError("AFF-40901", "Customer snapshot version already exists");
    const customer = {
      customer_id: input.customer_id,
      snapshot_version: input.snapshot_version,
      crm_subject_ref: input.crm_subject_ref,
      country: input.country,
      identity_state: input.identity_state,
      ib_state: input.ib_state,
      data_as_of: input.data_as_of,
      record_version: 1,
    };
    state.customerSnapshots.set(key, customer);
    return {customer_snapshot: snapshot(customer)};
  }

  function latestCustomerSnapshot(customer_id) {
    const items = [...state.customerSnapshots.values()].filter(item => item.customer_id === customer_id);
    if (!items.length) return null;
    return items.sort((left, right) => Number(right.snapshot_version) - Number(left.snapshot_version))[0];
  }

  function validTouchesForCustomer(customer_id, registeredAt, rule) {
    return [...state.externalTouches.values()].filter(touch => {
      if (touch.customer_ref !== customer_id || touch.quality_state !== "valid" || !touch.partner_id) return false;
      const registeredMs = Date.parse(registeredAt);
      const touchMs = Date.parse(touch.touch_time);
      if (!Number.isFinite(registeredMs) || !Number.isFinite(touchMs)) return false;
      return registeredMs - touchMs <= rule.window_days * 86400000 && registeredMs >= touchMs;
    }).sort((left, right) => String(left.touch_time).localeCompare(String(right.touch_time)));
  }

  function evaluateAttributionCandidate(input) {
    requireObject(input, ["customer_id", "rule_version"]);
    const rule = state.attributionRules.get(input.rule_version);
    if (!rule) throw new DomainError("AFF-42201", "Attribution rule version is not configured");
    const registration = [...state.registrationFacts.values()].find(fact => fact.customer_id === input.customer_id && fact.quality_state === "valid");
    if (!registration) {
      return {
        candidate: null,
        attribution: null,
        state: "pending_registration",
        reason_code: "registration_missing_or_incomplete",
        review_task_id: nextId("TASK"),
      };
    }
    const existing = state.attributions.get(input.customer_id);
    if (existing && existing.state === "locked") {
      return {candidate: null, attribution: snapshot(existing), state: "locked", reason_code: "already_locked"};
    }
    const customer = latestCustomerSnapshot(input.customer_id);
    if (!customer) {
      return {candidate: null, attribution: null, state: "pending", reason_code: "customer_snapshot_missing", review_task_id: nextId("TASK")};
    }
    const touches = validTouchesForCustomer(input.customer_id, registration.registered_at, rule);
    const candidateId = input.candidate_id || nextId("CAND");
    let result = "eligible";
    let reason = "unique_valid_touch";
    let partnerId = touches.length === 1 ? touches[0].partner_id : "";
    if (customer.ib_state === "ib_exclusive") {
      result = "excluded_ib";
      reason = "crm_ib_exclusivity";
    } else if (!touches.length) {
      result = "excluded_no_source";
      reason = "no_valid_source";
    } else if (new Set(touches.map(touch => touch.partner_id)).size > 1) {
      result = "conflict";
      reason = "multiple_valid_candidates";
    }
    const candidate = {
      candidate_id: candidateId,
      customer_id: input.customer_id,
      click_id: touches[0]?.click_ref || "none",
      touch_id: touches[0]?.touch_id || "none",
      partner_id: partnerId,
      rule_version: rule.rule_version,
      score: String(touches.length),
      state: result,
      record_version: 1,
    };
    state.candidates.set(candidate.candidate_id, candidate);
    const attribution = {
      attribution_id: nextId("ATT"),
      customer_id: input.customer_id,
      partner_id: candidate.partner_id || "none",
      state: result,
      locked_at: "",
      attribution_rule_version: rule.rule_version,
      evidence_refs: touches.map(touch => touch.evidence_ref),
      record_version: 1,
    };
    if (result !== "eligible") state.attributions.set(input.customer_id, attribution);
    const eventType = result === "eligible" ? "attribution_candidate_evaluated" : result === "conflict" ? "attribution_conflict_detected" : "attribution_excluded";
    emit(eventType, result === "eligible" ? "AttributionCandidate" : "Attribution", result === "eligible" ? candidate.candidate_id : attribution.attribution_id, snapshot(result === "eligible" ? candidate : attribution), {...input, rule_version: rule.rule_version}, ["AFF-REQ-B01", "AFF-REQ-B06", "AFF-REQ-B07", "FEATURE-ATTR-01"]);
    return {candidate: snapshot(candidate), attribution: result === "eligible" ? null : snapshot(attribution), state: result, reason_code: reason};
  }

  function lockAttribution(input) {
    requireObject(input, ["customer_id", "candidate_id"]);
    const existing = state.attributions.get(input.customer_id);
    if (existing?.state === "locked") return {attribution: snapshot(existing), idempotent_replay: true};
    const candidate = state.candidates.get(input.candidate_id);
    if (!candidate) throw new DomainError("AFF-40401", "Attribution candidate not found");
    if (candidate.customer_id !== input.customer_id) throw new DomainError("AFF-40301", "Candidate belongs to another customer");
    if (candidate.state !== "eligible") throw new DomainError("AFF-40901", `Candidate is ${candidate.state} and cannot lock`);
    const attribution = {
      attribution_id: nextId("ATT"),
      customer_id: candidate.customer_id,
      partner_id: candidate.partner_id,
      state: "locked",
      locked_at: clock(),
      attribution_rule_version: candidate.rule_version,
      evidence_refs: [candidate.touch_id, candidate.click_id],
      record_version: 1,
    };
    state.attributions.set(attribution.customer_id, attribution);
    candidate.state = "locked";
    candidate.record_version += 1;
    const event = emit("attribution_locked", "Attribution", attribution.attribution_id, snapshot(attribution), {...input, rule_version: candidate.rule_version}, ["AFF-REQ-B01", "AFF-REQ-B13", "FEATURE-ATTR-01"]);
    return {attribution: snapshot(attribution), event_id: event.event_id};
  }

  function correctAttribution(input) {
    requireObject(input, ["customer_id", "correction_id", "correction_version", "change_type", "reason_code"]);
    const original = state.attributions.get(input.customer_id);
    if (!original) throw new DomainError("AFF-40401", "Attribution not found");
    const correction = {
      correction_id: input.correction_id,
      correction_version: String(input.correction_version),
      original_attribution_id: original.attribution_id,
      change_type: input.change_type,
      reason_code: input.reason_code,
      impact_refs: input.impact_refs || [],
      review_task_id: nextId("TASK"),
      record_version: 1,
    };
    state.corrections.set(`${correction.correction_id}:${correction.correction_version}`, correction);
    const history = state.attributionHistory.get(original.customer_id) || [];
    history.push(snapshot(original));
    state.attributionHistory.set(original.customer_id, history);
    original.state = "conflict";
    original.record_version += 1;
    original.status_reason_code = input.reason_code;
    const event = emit("attribution_corrected", "AttributionCorrection", `${correction.correction_id}:${correction.correction_version}`, snapshot(correction), input, ["AFF-REQ-B05", "AFF-REQ-B13", "FEATURE-ATTR-05"]);
    return {correction: snapshot(correction), attribution: snapshot(original), event_id: event.event_id};
  }

  function getAttributionProjection(input) {
    requireObject(input, ["customer_id", "requesting_partner_id"]);
    const attribution = state.attributions.get(input.customer_id);
    const authorized = attribution?.state === "locked" && attribution.partner_id === input.requesting_partner_id;
    state.audit.push({
      lookup_id: nextId("LOOK"),
      customer_id: input.customer_id,
      requesting_partner_id: input.requesting_partner_id,
      result: attribution ? authorized ? "match" : "standard_no_match" : "standard_no_match",
      trace_id: input.trace_id || nextId("TRACE"),
      at: clock(),
    });
    if (!authorized) {
      return {matched: false, reason_code: "standard_no_match", attribution: null};
    }
    return {
      matched: true,
      attribution: snapshot(attribution),
    };
  }

  return {
    saveAttributionRule,
    intakeRegistrationFact,
    intakeExternalTouch,
    saveCustomerSnapshot,
    evaluateAttributionCandidate,
    lockAttribution,
    correctAttribution,
    getAttributionProjection,
    snapshot: () => ({
      registrationFacts: [...state.registrationFacts.values()].map(snapshot),
      registrationHistory: [...state.registrationHistory.values()].flat().map(snapshot),
      externalTouches: [...state.externalTouches.values()].map(snapshot),
      customerSnapshots: [...state.customerSnapshots.values()].map(snapshot),
      attributionRules: [...state.attributionRules.values()].map(snapshot),
      candidates: [...state.candidates.values()].map(snapshot),
      attributions: [...state.attributions.values()].map(snapshot),
      attributionHistory: [...state.attributionHistory.values()].flat().map(snapshot),
      corrections: [...state.corrections.values()].map(snapshot),
      events: state.events.map(snapshot),
      audit: state.audit.map(snapshot),
    }),
    DomainError,
  };
}

module.exports = {createP0Mod03Domain, DomainError};
