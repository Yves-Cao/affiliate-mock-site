"use strict";

/**
 * CPA-internal domain kernel for P0 modules 01 and 02.
 * It implements the canonical minimum loop against deterministic doubles only;
 * it is not a production CRM/provider adapter.
 */

const APPLICATION_TRANSITIONS = {
  submitted: new Set(["pending_crm", "rejected"]),
  pending_crm: new Set(["under_review", "blocked"]),
  under_review: new Set(["approved_pending_crm_confirmation", "rework", "rejected", "blocked"]),
  approved_pending_crm_confirmation: new Set(["approved_confirmed", "blocked"]),
  approved_confirmed: new Set(["rejected_after_open_link"]),
  blocked: new Set(["under_review", "pending_crm"]),
  rework: new Set(["submitted"]),
};

const PARTNER_TRANSITIONS = {
  draft: new Set(["active", "rejected"]),
  active: new Set(["suspended", "terminated"]),
  suspended: new Set(["active", "terminated"]),
};

const GRAY_GATES = ["qualification", "crm_same_version", "kyc_state", "operations", "risk", "finance"];
const FULL_GATES = ["account_completion", "published_policy", "hard_risk", "subject_conflict", "official_path_availability"];
const TERMINATION_ITEMS = ["links", "funds", "deposit", "archive", "audit", "service"];

class DomainError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.retryable = Boolean(options.retryable);
    this.details = options.details || [];
  }
}

function createP0Mod01Mod02Domain(options = {}) {
  const clock = options.clock || (() => "2026-11-18T00:00:00Z");
  const state = {
    applications: new Map(),
    crmOperations: new Map(),
    partners: new Map(),
    agreementConsents: new Map(),
    firstLinkGateEvaluations: new Map(),
    lifecycleRecords: new Map(),
    terminationHandoffs: new Map(),
    officialPaths: new Map(),
    officialLinks: new Map(),
    clicks: new Map(),
    clickRiskEvaluations: new Map(),
    violations: [],
    audit: [],
    events: [],
  };
  const idempotency = new Map();
  let sequence = 0;
  let eventSequence = 0;

  const nextId = prefix => `${prefix}-${String(++sequence).padStart(4, "0")}`;
  const stablePayload = value => JSON.stringify(value, Object.keys(value || {}).sort());

  function requireObject(value, fields) {
    const missing = fields.filter(field => value?.[field] === undefined || value?.[field] === null || value?.[field] === "");
    if (missing.length) throw new DomainError("AFF-42201", "Validation failed", {details: missing.map(field => `missing ${field}`)});
  }

  function idempotentCall(key, payload, action) {
    const payloadHash = stablePayload(payload);
    const prior = idempotency.get(key);
    if (prior) {
      if (prior.payloadHash !== payloadHash) {
        throw new DomainError("AFF-40902", "Idempotency key conflicts with a different request payload", {retryable: false});
      }
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
      rule_version: context.rule_version || "domain-double-v1",
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

  function setApplicationState(application, nextStatus, reasonCode, context) {
    if (!APPLICATION_TRANSITIONS[application.status]?.has(nextStatus)) {
      throw new DomainError("AFF-40901", `Illegal application transition ${application.status} -> ${nextStatus}`, {details: [application.status, nextStatus]});
    }
    application.status = nextStatus;
    application.status_reason_code = reasonCode;
    application.record_version += 1;
    application.updated_at = clock();
    emit("partner_application_status_changed", "Application", application.application_id, snapshot(application), context, []);
  }

  function snapshot(object) {
    return JSON.parse(JSON.stringify(object));
  }

  function submitApplication(input) {
    requireObject(input, ["application_id", "application_version", "schema_version", "material_snapshot", "source_channel", "idempotency_key"]);
    if (input.application_version !== 1) throw new DomainError("AFF-42201", "A new application must start at version 1");
    return idempotentCall(`submitApplication:${input.idempotency_key}`, input, payload => {
      if (state.applications.has(payload.application_id)) throw new DomainError("AFF-40901", "application_id already exists");
      const application = {
        application_id: payload.application_id,
        application_version: 1,
        record_version: 1,
        partner_id: nextId("PRT"),
        crm_subject_id: "",
        schema_version: payload.schema_version,
        material_snapshot: payload.material_snapshot,
        source_channel: payload.source_channel,
        status: "pending_crm",
        status_reason_code: "awaiting_crm_subject",
        submitted_at: clock(),
        updated_at: clock(),
      };
      state.applications.set(application.application_id, application);
      state.partners.set(application.partner_id, {
        partner_id: application.partner_id,
        crm_subject_id: "",
        state: "draft",
        risk_scope: "partner",
        first_link_eligible: false,
        created_at: clock(),
        updated_at: clock(),
      });
      const event = emit("partner_application_submitted", "Application", application.application_id, snapshot(application), payload, ["AFF-REQ-A01", "FEATURE-ONB-01"]);
      return {application: snapshot(application), event_id: event.event_id};
    });
  }

  function confirmCrmSubject(input) {
    requireObject(input, ["application_id", "application_version", "business_operation_id", "sync_type", "record_version", "status"]);
    const application = state.applications.get(input.application_id);
    if (!application) throw new DomainError("AFF-40401", "Application not found");
    if (input.application_version !== application.application_version) {
      throw new DomainError("AFF-40904", "CRM receipt version is stale for the current application");
    }
    return idempotentCall(`confirmCrmSubject:${input.business_operation_id}`, input, payload => {
      const normalizedStatus = payload.status === "confirmed" ? "confirmed" : payload.status;
      const operation = {
        business_operation_id: payload.business_operation_id,
        application_id: application.application_id,
        application_version: application.application_version,
        sync_type: payload.sync_type,
        crm_subject_id: payload.crm_subject_id || "",
        record_version: payload.record_version,
        status: normalizedStatus === "confirmed" ? "confirmed" : normalizedStatus === "unknown" ? "unknown" : "failed",
        failure: normalizedStatus === "confirmed" ? "none" : `crm_${normalizedStatus}`,
        retry_task_id: normalizedStatus === "confirmed" ? "none" : nextId("TASK"),
      };
      state.crmOperations.set(operation.business_operation_id, operation);

      if (normalizedStatus === "confirmed") {
        application.crm_subject_id = operation.crm_subject_id;
        setApplicationState(application, "under_review", "crm_subject_confirmed", payload);
        const partner = state.partners.get(application.partner_id);
        partner.crm_subject_id = operation.crm_subject_id;
        partner.updated_at = clock();
      } else if (normalizedStatus === "unknown") {
        setApplicationState(application, "blocked", "crm_state_unknown", payload);
      } else {
        setApplicationState(application, "blocked", "crm_subject_failed", payload);
      }
      const event = emit(
        normalizedStatus === "confirmed" ? "partner_crm_subject_confirmed" : "partner_crm_sync_failed",
        "CRMSyncOperation",
        operation.business_operation_id,
        snapshot(operation),
        payload,
        ["AFF-REQ-A01", "AFF-REQ-A04", "FEATURE-ONB-01", "FEATURE-ONB-02"],
      );
      return {application: snapshot(application), operation: snapshot(operation), event_id: event.event_id};
    });
  }

  function reviewApplication(input) {
    requireObject(input, ["review_id", "application_id", "application_version", "decision", "reason_code", "evidence_refs", "actor_id"]);
    const application = state.applications.get(input.application_id);
    if (!application) throw new DomainError("AFF-40401", "Application not found");
    if (application.application_version !== input.application_version) throw new DomainError("AFF-40904", "Review references a stale application version");
    if (application.status !== "under_review") throw new DomainError("AFF-40901", `Reviews are illegal from ${application.status}`);
    if (!["approved", "rejected", "rework"].includes(input.decision)) throw new DomainError("AFF-42201", "Unknown review decision");
    return idempotentCall(`reviewApplication:${input.review_id}`, input, payload => {
      if (payload.decision === "approved") {
        setApplicationState(application, "approved_pending_crm_confirmation", payload.reason_code, payload);
      } else if (payload.decision === "rejected") {
        setApplicationState(application, "rejected", payload.reason_code, payload);
      } else {
        setApplicationState(application, "rework", payload.reason_code, payload);
      }
      const event = emit("partner_application_reviewed", "Application", application.application_id, snapshot(application), payload, ["AFF-REQ-A01", "FEATURE-ONB-01"]);
      return {application: snapshot(application), event_id: event.event_id};
    });
  }

  function confirmReviewVersion(input) {
    requireObject(input, ["application_id", "application_version", "crm_receipt_version", "status"]);
    const application = state.applications.get(input.application_id);
    if (!application) throw new DomainError("AFF-40401", "Application not found");
    if (input.crm_receipt_version !== application.application_version || input.status !== "confirmed") {
      return {accepted: false, reason_code: input.crm_receipt_version !== application.application_version ? "stale_receipt" : "not_confirmed", application: snapshot(application)};
    }
    if (application.status !== "approved_pending_crm_confirmation") throw new DomainError("AFF-40901", `CRM confirmation is illegal from ${application.status}`);
    setApplicationState(application, "approved_confirmed", "crm_confirmed_review", input);
    return {accepted: true, application: snapshot(application)};
  }

  function recordAgreementConsent(input) {
    requireObject(input, ["consent_id", "partner_id", "agreement_version", "acceptance", "evidence_policy_version"]);
    if (input.acceptance !== true) throw new DomainError("AFF-42201", "Agreement consent must be explicit acceptance");
    const partner = state.partners.get(input.partner_id);
    if (!partner) throw new DomainError("AFF-40401", "Partner not found");
    const consent = {
      consent_id: input.consent_id,
      partner_id: input.partner_id,
      agreement_version: input.agreement_version,
      acceptance: true,
      accepted_at: clock(),
      evidence_policy_version: input.evidence_policy_version,
      record_version: 1,
    };
    state.agreementConsents.set(consent.consent_id, consent);
    const event = emit("partner_agreement_consent_recorded", "AgreementConsent", consent.consent_id, snapshot(consent), input, ["AFF-REQ-A07", "FEATURE-ONB-05"]);
    return {consent: snapshot(consent), event_id: event.event_id};
  }

  function evaluateFirstLinkGate(input) {
    requireObject(input, ["partner_id", "release_phase", "policy_version", "hard_gate_snapshot"]);
    const partner = state.partners.get(input.partner_id);
    if (!partner) throw new DomainError("AFF-40401", "Partner not found");
    if (!["gray", "full"].includes(input.release_phase)) throw new DomainError("AFF-42201", "release_phase must be gray or full");
    const gates = input.gate_results || {};
    const requiredGates = input.release_phase === "gray" ? GRAY_GATES : FULL_GATES;
    const requiredSignoffs = input.release_phase === "gray" ? ["operations", "risk", "finance"] : [];
    const signoffs = input.signoff_refs || [];
    const missing = requiredGates.filter(name => !gates[name]);
    const missingSignoffs = requiredSignoffs.filter(role => !signoffs.includes(role));
    const unknown = requiredGates.filter(name => gates[name]?.result === "unknown");
    const failed = requiredGates.filter(name => gates[name] && gates[name].result !== "passed" && gates[name].result !== "unknown");
    const evaluation = {
      evaluation_id: input.evaluation_id || nextId("GATE"),
      partner_id: input.partner_id,
      release_phase: input.release_phase,
      policy_version: input.policy_version,
      gate_results: gates,
      signoff_refs: signoffs,
      result: missing.length || missingSignoffs.length || unknown.length || failed.length ? "blocked" : "passed",
      reason_code: unknown.length ? "gate_unknown" : missing.length ? "gate_missing" : missingSignoffs.length ? "signoff_missing" : failed.length ? "gate_failed" : "all_gates_passed",
      record_version: 1,
    };
    state.firstLinkGateEvaluations.set(evaluation.evaluation_id, evaluation);
    if (evaluation.result === "passed" && state.agreementConsents.get(input.consent_id)?.partner_id !== input.partner_id) {
      evaluation.result = "blocked";
      evaluation.reason_code = "agreement_consent_missing";
    }
    partner.first_link_eligible = evaluation.result === "passed";
    if (partner.state === "draft" && evaluation.result === "passed") partner.state = "active";
    partner.updated_at = clock();
    const event = emit("partner_first_link_gate_evaluated", "FirstLinkGateEvaluation", evaluation.evaluation_id, snapshot(evaluation), input, ["AFF-REQ-A02", "FEATURE-ONB-03"]);
    return {evaluation: snapshot(evaluation), partner: snapshot(partner), event_id: event.event_id};
  }

  function changePartnerLifecycle(input) {
    requireObject(input, ["partner_id", "to_state", "reason_code", "authorization"]);
    const partner = state.partners.get(input.partner_id);
    if (!partner) throw new DomainError("AFF-40401", "Partner not found");
    if (partner.state === input.to_state || !PARTNER_TRANSITIONS[partner.state]?.has(input.to_state)) {
      throw new DomainError("AFF-40901", `Illegal partner transition ${partner.state} -> ${input.to_state}`);
    }
    return idempotentCall(`changePartnerLifecycle:${input.lifecycle_record_id || input.idempotency_key}`, input, payload => {
      const record = {
        lifecycle_record_id: payload.lifecycle_record_id || nextId("PLC"),
        partner_id: payload.partner_id,
        from_state: partner.state,
        to_state: payload.to_state,
        reason_code: payload.reason_code,
        authorization: payload.authorization,
        handoff_refs: payload.handoff_refs || TERMINATION_ITEMS,
        record_version: 1,
      };
      partner.state = payload.to_state;
      partner.updated_at = clock();
      state.lifecycleRecords.set(record.lifecycle_record_id, record);
      const event = emit("partner_lifecycle_changed", "PartnerLifecycleRecord", record.lifecycle_record_id, snapshot(record), payload, ["AFF-REQ-A03", "AFF-REQ-A14", "FEATURE-ONB-04"]);
      return {partner: snapshot(partner), lifecycle_record: snapshot(record), event_id: event.event_id};
    });
  }

  function completeTerminationHandoff(input) {
    requireObject(input, ["partner_id", "handoff_id"]);
    const partner = state.partners.get(input.partner_id);
    if (!partner) throw new DomainError("AFF-40401", "Partner not found");
    if (partner.state !== "terminated") throw new DomainError("AFF-40901", "Termination handoff requires a terminated partner");
    const required = input.required_item_refs?.length ? input.required_item_refs : TERMINATION_ITEMS;
    const completed = input.completed_item_refs || [];
    const missing = required.filter(item => !completed.includes(item));
    const handoff = {
      handoff_id: input.handoff_id,
      partner_id: input.partner_id,
      required_item_refs: required,
      completed_item_refs: completed,
      state: missing.length ? "pending" : "completed",
      status_reason_code: missing.length ? "handoff_item_missing" : "all_items_closed",
      review_task_id: missing.length ? nextId("TASK") : "none",
      record_version: 1,
    };
    state.terminationHandoffs.set(handoff.handoff_id, handoff);
    if (missing.length) {
      throw new DomainError("AFF-40903", "Termination handoff is incomplete", {details: missing.map(item => `missing ${item}`)});
    }
    const event = emit("partner_termination_handoff_completed", "TerminationHandoff", handoff.handoff_id, snapshot(handoff), input, ["AFF-REQ-A03", "AFF-REQ-A14", "FEATURE-ONB-04"]);
    return {handoff: snapshot(handoff), event_id: event.event_id};
  }

  function syncOfficialConfig(input) {
    requireObject(input, ["official_path_id", "path_version", "destination_ref", "country", "system", "language", "approval_ref", "ack_status"]);
    if (!["confirmed", "conflict", "unknown"].includes(input.ack_status)) throw new DomainError("AFF-42201", "Unknown CRM synchronization status");
    const path = {
      official_path_id: input.official_path_id,
      path_version: input.path_version,
      destination_ref: input.destination_ref,
      country: input.country,
      system: input.system,
      language: input.language,
      effective_at: input.effective_at || clock(),
      status: input.ack_status === "confirmed" ? "active" : input.ack_status === "conflict" ? "sync_conflict" : "pending_sync",
      approval_ref: input.approval_ref,
      material_version: input.material_version || null,
      options_version: input.options_version || null,
      record_version: 1,
    };
    state.officialPaths.set(`${path.official_path_id}:${path.path_version}`, path);
    const event = emit("official_config_synced", "OfficialPath", `${path.official_path_id}:${path.path_version}`, snapshot(path), input, ["AFF-REQ-B11", "AFF-REQ-H07", "FEATURE-PROMO-01"]);
    return {path: snapshot(path), event_id: event.event_id};
  }

  function requireEligiblePartner(partner_id) {
    const partner = state.partners.get(partner_id);
    if (!partner) throw new DomainError("AFF-40401", "Partner not found");
    if (partner.state !== "active" || !partner.first_link_eligible) {
      throw new DomainError("AFF-40301", "Partner is not first-link eligible", {details: ["first_link_gate"]});
    }
    return partner;
  }

  function listGenerationOptions(input) {
    requireObject(input, ["partner_id"]);
    requireEligiblePartner(input.partner_id);
    return {items: [...state.officialPaths.values()].filter(path => path.status === "active").map(snapshot)};
  }

  function generateOfficialLink(input) {
    requireObject(input, ["partner_id", "official_path_id", "path_version", "sub_id", "idempotency_key"]);
    const partner = requireEligiblePartner(input.partner_id);
    const path = state.officialPaths.get(`${input.official_path_id}:${input.path_version}`);
    if (!path || path.status !== "active" || (input.destination_ref && input.destination_ref !== path.destination_ref)) {
      const violation = {
        violation_id: nextId("VIOL"),
        partner_id: input.partner_id,
        official_path_id: input.official_path_id,
        requested_destination_ref: input.destination_ref || null,
        reason_code: !path ? "target_not_in_library" : path.status !== "active" ? "target_not_active" : "target_mismatch",
      };
      state.violations.push(violation);
      throw new DomainError("AFF-42202", "Generation target is not an approved active official path", {details: [violation.reason_code]});
    }
    return idempotentCall(`generateOfficialLink:${input.idempotency_key}`, input, payload => {
      const linkId = nextId("LNK");
      const clickId = nextId("CLK");
      const link = {
        link_id: linkId,
        partner_id: partner.partner_id,
        sub_id: payload.sub_id,
        official_path_id: path.official_path_id,
        path_version: path.path_version,
        activity_id: payload.activity_id || payload.activity || "default",
        asset_id: payload.asset_id || path.material_version,
        asset_version: payload.asset_version || path.material_version,
        options_version: payload.options_version || path.options_version,
        destination_ref: path.destination_ref,
        click_id: clickId,
        status: "active",
        record_version: 1,
      };
      const click = {
        click_id: clickId,
        link_id: linkId,
        partner_id: partner.partner_id,
        sub_id: payload.sub_id,
        clicked_at: clock(),
        raw_parameter_snapshot_ref: `crm-double:${clickId}`,
        risk_result: "pending",
        effective: false,
        effective_click: false,
        record_version: 1,
      };
      state.officialLinks.set(linkId, link);
      state.clicks.set(clickId, click);
      const generated = emit("official_link_generated", "OfficialLink", linkId, snapshot(link), payload, ["AFF-REQ-B11", "AFF-REQ-H05", "FEATURE-PROMO-01", "FEATURE-PROMO-03"]);
      emit("click_received", "Click", clickId, snapshot(click), payload, ["AFF-REQ-B12", "FEATURE-PROMO-02"]);
      return {link: snapshot(link), click: snapshot(click), event_id: generated.event_id};
    });
  }

  function evaluateClickRisk(input) {
    requireObject(input, ["click_id", "rule_version", "parameter_version"]);
    const click = state.clicks.get(input.click_id);
    if (!click) throw new DomainError("AFF-40401", "Click not found");
    const result = input.result === "pass" ? "pass" : input.result === "reject" ? "reject" : "unknown";
    const evaluation = {
      click_id: click.click_id,
      rule_version: input.rule_version,
      parameter_version: input.parameter_version,
      rule_id: input.rule_id || `rule-${input.rule_version}`,
      evidence_refs: input.evidence_refs || [],
      result,
      reason: input.reason || (result === "unknown" ? "risk_decision_missing" : `rule_${result}`),
      reason_code: input.reason_code || (result === "unknown" ? "risk_decision_missing" : `rule_${result}`),
      evaluated_at: clock(),
      record_version: 1,
    };
    click.risk_result = result;
    click.effective = result === "pass";
    click.effective_click = click.effective;
    click.record_version += 1;
    state.clickRiskEvaluations.set(click.click_id, evaluation);
    const eventType = result === "pass" ? "effective_click_classified" : "click_risk_evaluated";
    const event = emit(eventType, result === "pass" ? "Click" : "ClickRiskEvaluation", click.click_id, snapshot(result === "pass" ? click : evaluation), input, ["AFF-REQ-B12", "FEATURE-PROMO-02"]);
    return {click: snapshot(click), evaluation: snapshot(evaluation), event_id: event.event_id};
  }

  function suspendOfficialLink(input) {
    requireObject(input, ["link_id", "reason_code", "authorization"]);
    const link = state.officialLinks.get(input.link_id);
    if (!link) throw new DomainError("AFF-40401", "Official link not found");
    if (link.status !== "active") throw new DomainError("AFF-40901", `Cannot suspend ${link.status} link`);
    link.status = "suspended";
    link.record_version += 1;
    const event = emit("official_link_suspended", "OfficialLink", link.link_id, snapshot(link), input, ["AFF-REQ-B11", "FEATURE-PROMO-01"]);
    return {link: snapshot(link), event_id: event.event_id};
  }

  return {
    submitApplication,
    confirmCrmSubject,
    reviewApplication,
    confirmReviewVersion,
    recordAgreementConsent,
    evaluateFirstLinkGate,
    changePartnerLifecycle,
    completeTerminationHandoff,
    syncOfficialConfig,
    listGenerationOptions,
    generateOfficialLink,
    evaluateClickRisk,
    suspendOfficialLink,
    snapshot: () => ({
      applications: [...state.applications.values()].map(snapshot),
      crmOperations: [...state.crmOperations.values()].map(snapshot),
      partners: [...state.partners.values()].map(snapshot),
      agreementConsents: [...state.agreementConsents.values()].map(snapshot),
      firstLinkGateEvaluations: [...state.firstLinkGateEvaluations.values()].map(snapshot),
      lifecycleRecords: [...state.lifecycleRecords.values()].map(snapshot),
      terminationHandoffs: [...state.terminationHandoffs.values()].map(snapshot),
      officialPaths: [...state.officialPaths.values()].map(snapshot),
      officialLinks: [...state.officialLinks.values()].map(snapshot),
      clicks: [...state.clicks.values()].map(snapshot),
      clickRiskEvaluations: [...state.clickRiskEvaluations.values()].map(snapshot),
      events: state.events.map(snapshot),
      violations: state.violations.map(snapshot),
    }),
    DomainError,
  };
}

module.exports = {createP0Mod01Mod02Domain, DomainError};
