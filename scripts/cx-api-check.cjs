"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {startAdminMockServer} = require("../mock-server/admin-mock.cjs");

async function request(base, pathName, options = {}) {
  const response = await fetch(`${base}${pathName}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer local-admin-mock-token",
      "X-Mock-Role": options.role || "system_admin",
      "X-Mock-Scenario": options.scenario || "success",
      "Idempotency-Key": options.idempotencyKey || `cx-${Math.random().toString(36).slice(2)}`,
      ...(options.headers || {})
    }
  });
  return {status: response.status, body: await response.json()};
}

(async () => {
  const server = await startAdminMockServer(0);
  const base = `http://127.0.0.1:${server.address().port}/admin/api/v1`;
  const openApi = fs.readFileSync(path.join(__dirname, "..", "openapi", "affiliate-mock-openapi.yaml"), "utf8");
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "fixtures", "cx-scenarios.json"), "utf8"));
  const eventSchema = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "openapi", "schemas", "events-v1.0.json"), "utf8"));

  try {
    const validParamIds = new Set(Array.from({length: 18}, (_, index) => `PARAM-CX${String(index + 1).padStart(3, "0")}`));
    const fixtureParamIds = [...fixture.parameter_reference_ranges.map(row => row.param_id)];
    for (const key of ["onboarding_gate_config", "click_rules", "baselines", "investigations", "quarantine_config"]) {
      fixtureParamIds.push(...JSON.stringify(fixture.data[key]).match(/PARAM-CX\d{3}/g) || []);
    }
    assert.ok(fixtureParamIds.every(id => validParamIds.has(id)), `Unknown fixture parameter ID: ${fixtureParamIds.find(id => !validParamIds.has(id))}`);
    assert.equal((openApi.match(/x-affiliate-cx-paths-begin/) || []).length, 1);
    for (const scenario of fixture.scenarios) {
      assert.ok(openApi.includes(`"${scenario.scenario_id}"`), `OpenAPI missing scenario ${scenario.scenario_id}`);
    }
    const eventTypes = eventSchema.properties.event_type.enum;
    assert.equal(eventTypes.length, 47);
    assert.ok(eventTypes.includes("credit_point_recorded"));
    assert.ok(eventTypes.includes("cluster_manual_required"));
    assert.ok(eventTypes.includes("onboarding_gate_config_changed"));
    assert.ok(eventTypes.includes("staging_signoff_recorded"));
    assert.ok(eventTypes.includes("multi_level_schema_reserved"));
    assert.ok(!eventTypes.includes("channel_priority_adjusted"));
    assert.ok(!eventTypes.includes("security_certification_verified"));
    assert.ok(eventSchema.required.includes("rule_version"));
    assert.deepEqual(eventSchema["x-affiliate-forbidden-event-types"], [
      "channel_priority_adjusted",
      "security_certification_verified"
    ]);
    assert.ok(!openApi.includes("/admin/configs/channel-priorities"));
    assert.ok(!openApi.includes("/admin/security-certifications"));

    const blocked = await request(base, "/partners/partner-9001/link-eligibility", {scenario: "onboarding_traffic_profile"});
    assert.equal(blocked.status, 200);
    assert.equal(blocked.body.data.eligible, false);
    assert.equal(blocked.body.data.profile_gate_required, true);
    assert.deepEqual(blocked.body.data.blocking_reasons, ["TRAFFIC_PROFILE_REQUIRED"]);

    const gateDisabled = await request(base, "/partners/partner-9001/link-eligibility", {scenario: "onboarding_gate_disabled"});
    assert.equal(gateDisabled.body.data.profile_gate_required, false);
    assert.equal(gateDisabled.body.data.profile_gate_passed, true);
    assert.equal(gateDisabled.body.data.internal_gate_config_exposed, false);

    const paths = await request(base, "/official-paths");
    assert.ok(paths.body.data.items.every(row => row.status === "enabled"));
    assert.ok(!paths.body.data.items.some(row => row.path === "/legacy-promo"));

    const validTarget = await request(base, "/deep-links/validate-target", {
      method: "POST", body: JSON.stringify({target_path: "/open-account"}), scenario: "official_path_generation"
    });
    assert.equal(validTarget.body.data.valid, true);
    assert.equal(validTarget.body.data.path_version, 2);

    const invalidTarget = await request(base, "/deep-links/validate-target", {
      method: "POST", body: JSON.stringify({target_path: "/partner-custom-path"}), scenario: "domain_violation"
    });
    assert.equal(invalidTarget.body.data.generated, false);
    assert.equal(invalidTarget.body.data.reason_code, "TARGET_NOT_IN_LIBRARY");

    const click = await request(base, "/events/click/risk-evaluation", {
      method: "POST", body: JSON.stringify({click_id: "click-test-001"}), scenario: "click_risk_observed"
    });
    assert.equal(click.body.data.effective_click_result, "invalid");
    assert.equal(click.body.data.attribution_blocked, true);
    assert.ok(click.body.data.rule_version);
    assert.ok(click.body.data.parameter_version);

    const criticalGap = await request(base, "/admin/integration/event-integrity/deposit", {scenario: "event_gap_alert"});
    assert.equal(criticalGap.body.data.criticality, "critical");
    assert.equal(criticalGap.body.data.blocked_settlement, true);
    const secondaryGap = await request(base, "/admin/integration/event-integrity/kyc", {scenario: "event_gap_minor_alert"});
    assert.equal(secondaryGap.body.data.criticality, "secondary");
    assert.equal(secondaryGap.body.data.blocked_settlement, false);

    const splitForbidden = await request(base, "/admin/risk-case-groups/case-group-001/split", {
      method: "POST", body: JSON.stringify({member_ids: ["client-2102"], split_reason: "mis-merged"}), role: "operations"
    });
    assert.equal(splitForbidden.status, 403);
    const split = await request(base, "/admin/risk-case-groups/case-group-001/split", {
      method: "POST", body: JSON.stringify({member_ids: ["client-2102"], reason: "mis-merged", split_reason: "mis-merged"}), role: "risk"
    });
    assert.equal(split.body.data.split_status, "split");
    assert.equal(split.body.data.group_conclusion_inherited, false);

    const baselines = await request(base, "/admin/risk/baselines", {scenario: "partner_baseline_deviation"});
    const lowConfidence = baselines.body.data.items.find(row => row.partner_id === "partner-9001");
    assert.equal(lowConfidence.confidence, "low");
    assert.equal(lowConfidence.review_priority, "high");
    assert.equal(lowConfidence.automatic_penalty, undefined);

    const investigations = await request(base, "/admin/reviews/investigations", {scenario: "investigation_link_restricted"});
    const allLinkRestricted = investigations.body.data.items.find(row => row.link_restriction_level === "all_links");
    assert.equal(allLinkRestricted.auto_settlement_blocked, true);
    assert.equal(allLinkRestricted.commission_calculated, true);

    const rejectedProfile = await request(base, "/partners/partner-1004/traffic-profile");
    assert.ok(rejectedProfile.body.data.limited_explanation.appeal_path);
    assert.ok(!JSON.stringify(rejectedProfile.body.data.limited_explanation).match(/threshold|weight|score|rule_expression/i));

    const threshold = await request(base, "/admin/quarantines", {
      method: "POST", body: JSON.stringify({d_plus_n_days: 45, reason: "country risk review"}), role: "risk", idempotencyKey: "d-plus-n-threshold-check"
    });
    assert.equal(threshold.body.data.d_plus_n_days, 45);
    assert.equal(threshold.body.data.hard_coded, false);
    const thresholdReplay = await request(base, "/admin/quarantines", {
      method: "POST",
      body: JSON.stringify({d_plus_n_days: 45, reason: "country risk review"}),
      role: "risk",
      idempotencyKey: "d-plus-n-threshold-check"
    });
    assert.equal(thresholdReplay.body.data.idempotent_replay, true);
    assert.equal(thresholdReplay.body.data.d_plus_n_days, 45);

    const riskLinks = await request(base, "/admin/reviews/case-group-001/commission-links");
    const commissionLinks = await request(base, "/finance/commission-cases/comm-3002/risk-links");
    const forward = riskLinks.body.data.find(row => row.commission_case_id === "comm-3002");
    const reverse = commissionLinks.body.data.find(row => row.case_group_id === "case-group-001");
    assert.equal(forward.trace_id, reverse.trace_id);
    assert.equal(forward.amount.amount_minor, reverse.amount.amount_minor);

    const release = await request(base, "/admin/quarantines/quar-001/release", {
      method: "POST", body: JSON.stringify({reason: "risk cleared"}), role: "risk"
    });
    assert.equal(release.body.data.blocked_settlement, false);
    assert.equal(release.body.data.settlement_recheck, "passed");
    assert.equal(release.body.data.direct_payment, false);

    const missingSignoff = await request(base, "/admin/staging-runs", {scenario: "staging_signoff_missing"});
    assert.equal(missingSignoff.body.data.items.length, 1);
    assert.notEqual(missingSignoff.body.data.items[0].gate_result, "passed");

    const financeSignoff = await request(base, "/admin/staging-runs/staging-001/signoffs", {
      method: "POST", body: JSON.stringify({result: "approved", reason: "finance reconciled", comment: "finance reconciled"}), role: "finance", scenario: "staging_signoff_missing"
    });
    assert.equal(financeSignoff.body.data.gate_result, "pending_signoff");
    const complianceSignoff = await request(base, "/admin/staging-runs/staging-001/signoffs", {
      method: "POST", body: JSON.stringify({result: "approved", reason: "compliance passed", comment: "compliance passed"}), role: "compliance", scenario: "staging_signoff_missing"
    });
    assert.equal(complianceSignoff.body.data.gate_result, "passed");

    const contract = await request(base, "/dev/contract/checks", {
      method: "POST", body: JSON.stringify({reason: "run local contract check"}), scenario: "api_docs_playbook"
    });
    assert.deepEqual(contract.body.data, {openapi_valid: true, schema_valid: true, mock_consistent: true, errors: []});

    console.log(JSON.stringify({
      scenarios: fixture.scenarios.length,
      eventTypes: eventSchema.properties.event_type.enum.length,
      result: "CX D1-D10 API mock checks passed"
    }, null, 2));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
