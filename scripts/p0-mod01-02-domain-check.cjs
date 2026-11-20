"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createP0Mod01Mod02Domain} = require("../domain/p0-mod01-02.cjs");

const schemas = JSON.parse(fs.readFileSync(path.join(__dirname, "../openapi/schemas/p0-object-schemas.json"), "utf8")).definitions;
const GRAY_GATES = ["qualification", "crm_same_version", "kyc_state", "operations", "risk", "finance"];

function validate(value, schema, at = "$") {
  if (schema.type === "integer" && !Number.isInteger(value)) return `${at}: expected integer`;
  if (schema.type === "number" && typeof value !== "number") return `${at}: expected number`;
  if (schema.type === "array" && !Array.isArray(value)) return `${at}: expected array`;
  if (schema.type && !["integer", "number", "array"].includes(schema.type) && typeof value !== schema.type) return `${at}: expected ${schema.type}`;
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
  if (schema.type === "string") {
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

function applicationInput(id, idempotencyKey, overrides = {}) {
  return {
    application_id: id,
    application_version: 1,
    schema_version: "onboarding-v1",
    material_snapshot: {profile: "complete"},
    source_channel: "direct",
    idempotency_key: idempotencyKey,
    trace_id: `trace-${idempotencyKey}`,
    actor_id: "applicant",
    ...overrides,
  };
}

function prepareEligiblePartner(domain, id = "APP-101", partnerId = "PRT-101") {
  const submitted = domain.submitApplication(applicationInput(id, `key-${id}`));
  const confirmed = domain.confirmCrmSubject({
    application_id: id,
    application_version: 1,
    business_operation_id: `CRM-${id}`,
    sync_type: "subject_create",
    crm_subject_id: `SUB-${id}`,
    record_version: 1,
    status: "confirmed",
  });
  domain.reviewApplication({
    review_id: `REV-${id}`,
    application_id: id,
    application_version: 1,
    decision: "approved",
    reason_code: "materials_complete",
    evidence_refs: [`EV-${id}-1`],
    actor_id: "operations",
  });
  domain.confirmReviewVersion({application_id: id, application_version: 1, crm_receipt_version: 1, status: "confirmed"});
  domain.recordAgreementConsent({
    consent_id: `CON-${id}`,
    partner_id: confirmed.application.partner_id,
    agreement_version: "agreement-v1",
    acceptance: true,
    evidence_policy_version: "evidence-v1",
  });
  return {application: submitted.application, partner_id: confirmed.application.partner_id || partnerId};
}

function passingGates(names) {
  return Object.fromEntries(names.map(name => [name, {result: "passed", version: `${name}-v1`}]));
}

test("AC01 duplicate application replays the original business object", () => {
  const domain = createP0Mod01Mod02Domain();
  const first = domain.submitApplication(applicationInput("APP-001", "key-001"));
  const replay = domain.submitApplication(applicationInput("APP-001", "key-001"));
  assert.equal(replay.application.application_id, first.application.application_id);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(domain.snapshot().applications.length, 1);
  error(() => domain.submitApplication(applicationInput("APP-002", "key-001")), "AFF-40902");
});

test("AC02 stale CRM receipts cannot confirm the current version", () => {
  const domain = createP0Mod01Mod02Domain();
  domain.submitApplication(applicationInput("APP-002", "key-002"));
  assert.equal(domain.confirmReviewVersion({application_id: "APP-002", application_version: 1, crm_receipt_version: 0, status: "confirmed"}).accepted, false);
  const confirmed = domain.confirmCrmSubject({
    application_id: "APP-002", application_version: 1, business_operation_id: "CRM-002",
    sync_type: "subject_create", crm_subject_id: "SUB-002", record_version: 1, status: "confirmed",
  });
  assert.equal(confirmed.application.status, "under_review");
  assert.equal(confirmed.application.crm_subject_id, "SUB-002");
});

test("AC03 and AC04 first-link gates fail closed on missing, unknown, and absent consent", () => {
  const domain = createP0Mod01Mod02Domain();
  const {partner_id} = prepareEligiblePartner(domain, "APP-003");
  const missing = domain.evaluateFirstLinkGate({partner_id, release_phase: "gray", policy_version: "gray-v1", hard_gate_snapshot: {}, gate_results: passingGates(["qualification", "crm_same_version", "risk", "finance"])});
  assert.equal(missing.evaluation.result, "blocked");
  assert.equal(missing.evaluation.reason_code, "gate_missing");
  const missingSignoff = domain.evaluateFirstLinkGate({partner_id, release_phase: "gray", policy_version: "gray-v1", hard_gate_snapshot: {}, gate_results: passingGates(GRAY_GATES)});
  assert.equal(missingSignoff.evaluation.reason_code, "signoff_missing");
  const unknown = domain.evaluateFirstLinkGate({partner_id, release_phase: "gray", policy_version: "gray-v1", hard_gate_snapshot: {}, consent_id: "CON-APP-003", signoff_refs: ["operations", "risk", "finance"], gate_results: {...passingGates(GRAY_GATES), kyc_state: {result: "unknown"}}});
  assert.equal(unknown.evaluation.reason_code, "gate_unknown");
  const noConsent = domain.evaluateFirstLinkGate({partner_id, release_phase: "gray", policy_version: "gray-v1", hard_gate_snapshot: {}, signoff_refs: ["operations", "risk", "finance"], gate_results: passingGates(GRAY_GATES)});
  assert.equal(noConsent.evaluation.reason_code, "agreement_consent_missing");
  const passed = domain.evaluateFirstLinkGate({partner_id, release_phase: "gray", policy_version: "gray-v1", hard_gate_snapshot: {hard_gates: "passed"}, consent_id: "CON-APP-003", signoff_refs: ["operations", "risk", "finance"], gate_results: passingGates(GRAY_GATES)});
  assert.equal(passed.evaluation.result, "passed");
  assert.equal(passed.partner.state, "active");
});

test("AC35 termination remains incomplete until every required item closes", () => {
  const domain = createP0Mod01Mod02Domain();
  const {partner_id} = prepareEligiblePartner(domain, "APP-004");
  domain.evaluateFirstLinkGate({partner_id, release_phase: "gray", policy_version: "gray-v1", hard_gate_snapshot: {}, consent_id: "CON-APP-004", signoff_refs: ["operations", "risk", "finance"], gate_results: passingGates(GRAY_GATES)});
  domain.changePartnerLifecycle({partner_id, to_state: "terminated", reason_code: "business_exit", authorization: "operations-finance"});
  assert.throws(() => domain.completeTerminationHandoff({partner_id, handoff_id: "THD-004", completed_item_refs: ["links", "funds"]}), /incomplete/);
  const completed = domain.completeTerminationHandoff({partner_id, handoff_id: "THD-004", completed_item_refs: ["links", "funds", "deposit", "archive", "audit", "service"]});
  assert.equal(completed.handoff.state, "completed");
});

test("AC05 and AC06 official generation rejects arbitrary targets and preserves versions", () => {
  const domain = createP0Mod01Mod02Domain();
  const {partner_id} = prepareEligiblePartner(domain, "APP-005");
  domain.evaluateFirstLinkGate({partner_id, release_phase: "gray", policy_version: "gray-v1", hard_gate_snapshot: {}, consent_id: "CON-APP-005", signoff_refs: ["operations", "risk", "finance"], gate_results: passingGates(GRAY_GATES)});
  domain.syncOfficialConfig({
    official_path_id: "PATH-REG", path_version: 2, destination_ref: "/register", country: "global",
    system: "web", language: "en", approval_ref: "OPS-1", material_version: "MAT-2", options_version: 7, ack_status: "confirmed",
  });
  const options = domain.listGenerationOptions({partner_id});
  assert.equal(options.items.length, 1);
  error(() => domain.generateOfficialLink({partner_id, official_path_id: "PATH-EVIL", path_version: 1, sub_id: "sub-1", idempotency_key: "gen-evil", destination_ref: "https://evil.example"}), "AFF-42202");
  assert.equal(domain.snapshot().violations[0].reason_code, "target_not_in_library");
  const generated = domain.generateOfficialLink({partner_id, official_path_id: "PATH-REG", path_version: 2, sub_id: "sub-1", idempotency_key: "gen-005", activity: "launch", asset_version: "MAT-2", options_version: 7});
  assert.equal(generated.link.path_version, 2);
  assert.equal(generated.link.asset_version, "MAT-2");
  assert.equal(generated.link.options_version, 7);
  assert.ok(generated.link.click_id);
});

test("AC07 and AC08 high risk rejects while missing risk remains unknown", () => {
  const domain = createP0Mod01Mod02Domain();
  const {partner_id} = prepareEligiblePartner(domain, "APP-006");
  domain.evaluateFirstLinkGate({partner_id, release_phase: "gray", policy_version: "gray-v1", hard_gate_snapshot: {}, consent_id: "CON-APP-006", signoff_refs: ["operations", "risk", "finance"], gate_results: passingGates(GRAY_GATES)});
  domain.syncOfficialConfig({official_path_id: "PATH-REG", path_version: 1, destination_ref: "/register", country: "global", system: "web", language: "en", approval_ref: "OPS-1", material_version: "MAT-1", options_version: 1, ack_status: "confirmed"});
  const unknown = domain.generateOfficialLink({partner_id, official_path_id: "PATH-REG", path_version: 1, sub_id: "sub-u", idempotency_key: "gen-u", asset_version: "MAT-1", options_version: 1});
  const unknownResult = domain.evaluateClickRisk({click_id: unknown.click.click_id, rule_version: "risk-v1", parameter_version: "param-v1", evidence_refs: ["EV-U"]});
  assert.equal(unknownResult.evaluation.result, "unknown");
  assert.equal(unknownResult.click.effective, false);
  const rejected = domain.generateOfficialLink({partner_id, official_path_id: "PATH-REG", path_version: 1, sub_id: "sub-r", idempotency_key: "gen-r", asset_version: "MAT-1", options_version: 1});
  const rejectedResult = domain.evaluateClickRisk({click_id: rejected.click.click_id, rule_version: "risk-v1", parameter_version: "param-v1", evidence_refs: ["EV-R"], result: "reject", reason: "high_risk"});
  assert.equal(rejectedResult.click.risk_result, "reject");
  assert.equal(rejectedResult.click.effective, false);
  const passed = domain.generateOfficialLink({partner_id, official_path_id: "PATH-REG", path_version: 1, sub_id: "sub-p", idempotency_key: "gen-p", asset_version: "MAT-1", options_version: 1});
  const passedResult = domain.evaluateClickRisk({click_id: passed.click.click_id, rule_version: "risk-v1", parameter_version: "param-v1", evidence_refs: ["EV-P"], result: "pass"});
  assert.equal(passedResult.click.effective, true);
  const suspended = domain.suspendOfficialLink({link_id: passed.link.link_id, reason_code: "policy_violation", authorization: "operations"});
  assert.equal(suspended.link.status, "suspended");
});

test("generated domain objects validate against canonical P0 object schemas", () => {
  const domain = createP0Mod01Mod02Domain();
  const {partner_id} = prepareEligiblePartner(domain, "APP-007");
  domain.evaluateFirstLinkGate({partner_id, release_phase: "gray", policy_version: "gray-v1", hard_gate_snapshot: {}, consent_id: "CON-APP-007", signoff_refs: ["operations", "risk", "finance"], gate_results: passingGates(GRAY_GATES)});
  domain.syncOfficialConfig({official_path_id: "PATH-REG", path_version: 1, destination_ref: "/register", country: "global", system: "web", language: "en", approval_ref: "OPS-1", material_version: "MAT-1", options_version: 1, ack_status: "confirmed"});
  const generated = domain.generateOfficialLink({partner_id, official_path_id: "PATH-REG", path_version: 1, sub_id: "sub-schema", idempotency_key: "gen-schema", asset_version: "MAT-1", options_version: 1});
  domain.evaluateClickRisk({click_id: generated.click.click_id, rule_version: "risk-v1", parameter_version: "param-v1", evidence_refs: ["EV-SCHEMA"], result: "pass"});
  domain.changePartnerLifecycle({partner_id, to_state: "terminated", reason_code: "schema_fixture", authorization: "operations-finance"});
  domain.completeTerminationHandoff({partner_id, handoff_id: "THD-SCHEMA", completed_item_refs: ["links", "funds", "deposit", "archive", "audit", "service"]});
  const snap = domain.snapshot();
  const examples = {
    Application: snap.applications[0],
    CRMSyncOperation: snap.crmOperations[0],
    Partner: snap.partners[0],
    AgreementConsent: snap.agreementConsents[0],
    FirstLinkGateEvaluation: snap.firstLinkGateEvaluations[0],
    PartnerLifecycleRecord: snap.lifecycleRecords[0],
    TerminationHandoff: snap.terminationHandoffs[0],
    OfficialPath: snap.officialPaths[0],
    OfficialLink: generated.link,
    Click: generated.click,
    ClickRiskEvaluation: snap.clickRiskEvaluations[0],
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

console.log(`P0 MOD-01/02 domain checks passed: ${checks} scenarios`);
