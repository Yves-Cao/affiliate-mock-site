"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createP0Mod03Domain} = require("../domain/p0-mod03.cjs");

const schemas = JSON.parse(fs.readFileSync(path.join(__dirname, "../openapi/schemas/p0-object-schemas.json"), "utf8")).definitions;

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

function setupCustomer(domain, customerId = "CUS-300") {
  domain.saveAttributionRule({
    rule_version: "attr-v1", window_days: 30, priority: "first_touch",
    duplicate_rule: "same_customer_same_touch", effective_at: "2026-01-01T00:00:00Z",
  });
  domain.intakeRegistrationFact({
    registration_id: `REG-${customerId}`, record_version: 1, customer_id: customerId,
    registered_at: "2026-01-10T00:00:00Z", raw_source_snapshot_ref: `RAW-${customerId}`,
    idempotency_key: `reg-${customerId}`,
  });
  domain.saveCustomerSnapshot({
    customer_id: customerId, snapshot_version: "1", crm_subject_ref: `SUB-${customerId}`,
    country: "SG", identity_state: "active", ib_state: "affiliate_allowed", data_as_of: "2026-01-10T00:00:00Z",
  });
}

function addTouch(domain, customerId, partnerId, touchId, quality = "valid", provider = "PostHog") {
  domain.intakeExternalTouch({
    touch_id: touchId, provider, customer_ref: customerId, click_ref: `CLK-${touchId}`,
    partner_id: partnerId, touch_time: "2026-01-05T00:00:00Z", evidence_ref: `EV-${touchId}`,
    quality_state: quality, idempotency_key: `key-${touchId}`,
  });
}

test("AC09 an eligible candidate is not payable until explicit lock", () => {
  const domain = createP0Mod03Domain();
  setupCustomer(domain);
  addTouch(domain, "CUS-300", "PRT-A", "TOU-A");
  const result = domain.evaluateAttributionCandidate({customer_id: "CUS-300", rule_version: "attr-v1"});
  assert.equal(result.candidate.state, "eligible");
  assert.equal(result.attribution, null);
  assert.equal(domain.snapshot().attributions.length, 0);
});

test("AC10 one customer receives one effective locked attribution", () => {
  const domain = createP0Mod03Domain();
  setupCustomer(domain, "CUS-301");
  addTouch(domain, "CUS-301", "PRT-A", "TOU-301");
  const evaluated = domain.evaluateAttributionCandidate({customer_id: "CUS-301", rule_version: "attr-v1"});
  const locked = domain.lockAttribution({customer_id: "CUS-301", candidate_id: evaluated.candidate.candidate_id});
  const replay = domain.lockAttribution({customer_id: "CUS-301", candidate_id: evaluated.candidate.candidate_id});
  assert.equal(locked.attribution.state, "locked");
  assert.equal(locked.attribution.attribution_id, replay.attribution.attribution_id);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(domain.snapshot().attributions.length, 1);
});

test("AC11 no-source stays explicit and is never guessed", () => {
  const domain = createP0Mod03Domain();
  setupCustomer(domain, "CUS-302");
  const result = domain.evaluateAttributionCandidate({customer_id: "CUS-302", rule_version: "attr-v1"});
  assert.equal(result.state, "excluded_no_source");
  assert.equal(result.reason_code, "no_valid_source");
  assert.equal(result.attribution.partner_id, "none");
  assert.equal(domain.getAttributionProjection({customer_id: "CUS-302", requesting_partner_id: "PRT-A"}).matched, false);
});

test("AC12 later clicks are retained but cannot rewrite a lock", () => {
  const domain = createP0Mod03Domain();
  setupCustomer(domain, "CUS-303");
  addTouch(domain, "CUS-303", "PRT-A", "TOU-303-A");
  const evaluated = domain.evaluateAttributionCandidate({customer_id: "CUS-303", rule_version: "attr-v1"});
  const locked = domain.lockAttribution({customer_id: "CUS-303", candidate_id: evaluated.candidate.candidate_id});
  addTouch(domain, "CUS-303", "PRT-B", "TOU-303-B");
  const reevaluated = domain.evaluateAttributionCandidate({customer_id: "CUS-303", rule_version: "attr-v1"});
  assert.equal(reevaluated.reason_code, "already_locked");
  assert.equal(reevaluated.attribution.attribution_id, locked.attribution.attribution_id);
  assert.equal(reevaluated.attribution.partner_id, "PRT-A");
  assert.ok(domain.snapshot().externalTouches.some(touch => touch.touch_id === "TOU-303-B"));
});

test("AC13 correction creates a review task and preserves original history", () => {
  const domain = createP0Mod03Domain();
  setupCustomer(domain, "CUS-304");
  addTouch(domain, "CUS-304", "PRT-A", "TOU-304");
  const evaluated = domain.evaluateAttributionCandidate({customer_id: "CUS-304", rule_version: "attr-v1"});
  domain.lockAttribution({customer_id: "CUS-304", candidate_id: evaluated.candidate.candidate_id});
  const corrected = domain.correctAttribution({
    customer_id: "CUS-304", correction_id: "COR-304", correction_version: "1",
    change_type: "crm_authoritative_correction", reason_code: "crm_source_changed",
    impact_refs: ["COMM-304"],
  });
  assert.equal(corrected.attribution.state, "conflict");
  assert.ok(corrected.correction.review_task_id);
  assert.equal(domain.snapshot().attributionHistory[0].state, "locked");
  assert.equal(domain.snapshot().attributionHistory[0].record_version, 1);
});

test("AC36 unknown AppsFlyer evidence cannot lock attribution by itself", () => {
  const domain = createP0Mod03Domain();
  setupCustomer(domain, "CUS-305");
  addTouch(domain, "CUS-305", "PRT-A", "TOU-305", "unknown", "AppsFlyer");
  const result = domain.evaluateAttributionCandidate({customer_id: "CUS-305", rule_version: "attr-v1"});
  assert.equal(result.state, "excluded_no_source");
  assert.equal(result.candidate.touch_id, "none");
  error(() => domain.lockAttribution({customer_id: "CUS-305", candidate_id: result.candidate.candidate_id}), "AFF-40901");
});

test("duplicate registration callbacks and late versions retain history", () => {
  const domain = createP0Mod03Domain();
  setupCustomer(domain, "CUS-306");
  const replay = domain.intakeRegistrationFact({
    registration_id: "REG-CUS-306", record_version: 1, customer_id: "CUS-306",
    registered_at: "2026-01-10T00:00:00Z", raw_source_snapshot_ref: "RAW-CUS-306",
    idempotency_key: "reg-CUS-306",
  });
  assert.equal(replay.idempotent_replay, true);
  const late = domain.intakeRegistrationFact({
    registration_id: "REG-CUS-306", record_version: 0, customer_id: "CUS-306",
    registered_at: "2026-01-09T00:00:00Z", raw_source_snapshot_ref: "RAW-CUS-306-old",
    idempotency_key: "reg-CUS-306-v0",
  });
  assert.equal(late.registration_fact.record_state, "late");
  assert.equal(domain.snapshot().registrationFacts[0].record_version, 1);
  assert.equal(domain.snapshot().registrationHistory.length, 2);
});

test("generated objects validate against canonical P0 schemas", () => {
  const domain = createP0Mod03Domain();
  setupCustomer(domain, "CUS-307");
  addTouch(domain, "CUS-307", "PRT-A", "TOU-307");
  const evaluated = domain.evaluateAttributionCandidate({customer_id: "CUS-307", rule_version: "attr-v1"});
  domain.lockAttribution({customer_id: "CUS-307", candidate_id: evaluated.candidate.candidate_id});
  domain.correctAttribution({
    customer_id: "CUS-307", correction_id: "COR-307", correction_version: "1",
    change_type: "test", reason_code: "schema_fixture",
  });
  const snap = domain.snapshot();
  const examples = {
    RegistrationFact: snap.registrationFacts[0],
    ExternalTouch: snap.externalTouches[0],
    CustomerSnapshot: snap.customerSnapshots[0],
    AttributionCandidate: snap.candidates[0],
    Attribution: snap.attributions[0],
    AttributionCorrection: snap.corrections[0],
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

console.log(`P0 MOD-03 domain checks passed: ${checks} scenarios`);
