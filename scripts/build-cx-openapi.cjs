#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const target = path.join(__dirname, "..", "openapi", "affiliate-mock-openapi.yaml");
const cxSchemaPath = path.join(__dirname, "..", "openapi", "schemas", "cx.json");
let openapi = fs.readFileSync(target, "utf8");
const cxSchema = JSON.parse(fs.readFileSync(cxSchemaPath, "utf8"));
const initialPathsIndex = openapi.indexOf("\npaths:");
const firstCxPathMarkerIndex = initialPathsIndex >= 0 ? openapi.indexOf("  # x-affiliate-cx-paths-begin", initialPathsIndex) : -1;
const lastCxPathEndIndex = openapi.lastIndexOf("  # x-affiliate-cx-paths-end");
if (firstCxPathMarkerIndex >= 0 && lastCxPathEndIndex > firstCxPathMarkerIndex) {
  const afterEnd = openapi.indexOf("\n", lastCxPathEndIndex);
  let prefix = openapi.slice(0, firstCxPathMarkerIndex).trimEnd();
  if (prefix.endsWith('$ref: "#/components/responses/ServerError')) prefix += '"';
  openapi = prefix + "\n" + (afterEnd >= 0 ? openapi.slice(afterEnd + 1) : "");
}
const malformedComponentsMatch = initialPathsIndex >= 0 ? openapi.slice(initialPathsIndex).match(/[^\n]components:/) : null;
if (malformedComponentsMatch) {
  const malformedIndex = initialPathsIndex + malformedComponentsMatch.index;
  const lastPathMarkerIndex = openapi.lastIndexOf("  # x-affiliate-cx-paths-begin");
  if (lastPathMarkerIndex > malformedIndex) {
    openapi = openapi.slice(0, malformedIndex) + openapi.slice(lastPathMarkerIndex);
  }
}

const cxTags = [
  {name: "IFJOnboardingGate", description: "IF-J onboarding traffic profile gate", scenarios: ["onboarding_traffic_profile", "onboarding_gate_disabled"], req: "CX01,D1"},
  {name: "IFJOfficialPath", description: "IF-J official domain and path library", scenarios: ["official_path_generation", "domain_violation"], req: "CX02,D2"},
  {name: "IFJClickRisk", description: "IF-J deterministic click risk", scenarios: ["click_risk_observed"], req: "CX03,D3"},
  {name: "IFJEventIntegrity", description: "IF-J event integrity and attribution health", scenarios: ["event_gap_alert", "event_gap_minor_alert", "attribution_integrity_check", "attribution_health_drop"], req: "CX04,CX17,D4"},
  {name: "IFJRiskGovernance", description: "IF-J case groups, baselines, investigations, quarantine, and links", scenarios: ["cluster_case_group", "partner_baseline_deviation", "partner_baseline_switched", "investigation_required", "investigation_link_restricted", "limited_explanation", "auto_quarantine", "d_plus_n_threshold_changed", "fraud_commission_review"], req: "CX05-CX07,CX09,CX11,CX18,CX25,D5-D9"},
  {name: "IFJDataGovernance", description: "IF-J data governance and operation tags", scenarios: ["data_breach_runbook", "partner_operations_tags"], req: "CX22,CX23"},
  {name: "IFJStagingGate", description: "IF-J staging gate and three-role signoff", scenarios: ["staging_e2e_pass", "staging_signoff_missing"], req: "CX20,D10"},
  {name: "IFJContractQuality", description: "IF-J rule shadowing, quality economics, reserved extensions, and contract checks", scenarios: ["rule_shadow_run", "quality_economics_basic", "api_docs_playbook", "quality_economics_full", "quarterly_audit_pack", "asset_landing_patrol", "subid_risk_state", "external_risk_adapter", "model_risk_advice", "advanced_tier_pricing", "multi_level_schema_reserve"], req: "CX08,CX10,CX12-CX16,CX21,CX24,CX26"}
];

const globalScenarios = [
  "onboarding_traffic_profile",
  "onboarding_gate_disabled",
  "official_path_generation",
  "domain_violation",
  "click_risk_observed",
  "event_gap_alert",
  "event_gap_minor_alert",
  "cluster_case_group",
  "partner_baseline_deviation",
  "partner_baseline_switched",
  "investigation_required",
  "investigation_link_restricted",
  "attribution_integrity_check",
  "limited_explanation",
  "rule_shadow_run",
  "attribution_health_drop",
  "auto_quarantine",
  "d_plus_n_threshold_changed",
  "staging_e2e_pass",
  "staging_signoff_missing",
  "data_breach_runbook",
  "partner_operations_tags",
  "quality_economics_basic",
  "fraud_commission_review",
  "api_docs_playbook"
];

const reservedScenarios = [
  "quality_economics_full",
  "quarterly_audit_pack",
  "asset_landing_patrol",
  "subid_risk_state",
  "external_risk_adapter",
  "model_risk_advice",
  "advanced_tier_pricing",
  "multi_level_schema_reserve"
];

function response(status, description) {
  if (status === "200") {
    return {
      description,
      content: {
        "application/json": {
          schema: {$ref: "#/components/schemas/SuccessEnvelope"}
        }
      }
    };
  }
  const responseNames = {
    "401": "Unauthorized",
    "403": "Forbidden",
    "404": "NotFound",
    "409": "Conflict",
    "422": "ValidationError",
    "429": "TooManyRequests",
    "500": "ServerError"
  };
  return {$ref: `#/components/responses/${responseNames[status]}`};
}

function responses() {
  return {
    "200": response("200", "Success"),
    "401": response("401"),
    "403": response("403"),
    "404": response("404"),
    "409": response("409"),
    "422": response("422"),
    "429": response("429"),
    "500": response("500")
  };
}

function pathParam(name) {
  return {
    name,
    in: "path",
    required: true,
    schema: {type: "string", minLength: 3}
  };
}

function listParams(extra = []) {
  return [
    {$ref: "#/components/parameters/Page"},
    {$ref: "#/components/parameters/PageSize"},
    ...extra,
    {$ref: "#/components/parameters/MockScenario"}
  ];
}

function writeParams(extra = []) {
  return [
    {
      name: "Idempotency-Key",
      in: "header",
      required: true,
      description: "Unique write-request key",
      schema: {type: "string", minLength: 8}
    },
    ...extra,
    {$ref: "#/components/parameters/MockScenario"}
  ];
}

function requestBody(schema = "CxActionRequest") {
  return {
    required: true,
    content: {
      "application/json": {
        schema: {$ref: `#/components/schemas/${schema}`}
      }
    }
  };
}

function operation({method, operationId, summary, phase = "MVP", scenarios = globalScenarios, parameters = [], hasBody = true}) {
  const op = {
    tags: ["CxCrossCutting"],
    operationId,
    summary,
    "x-affiliate-phase": phase,
    "x-aff-req": "CX,D1-D10",
    "x-mock-scenarios": scenarios
  };
  if (parameters.length) op.parameters = parameters;
  if (hasBody && ["post", "put", "patch", "delete"].includes(method)) op.requestBody = requestBody();
  op.responses = responses();
  return {[method]: op};
}

const routeSpec = [
  {path: "/partners/{partner_id}/traffic-profile", operations: [operation({method: "get", operationId: "getPartnerTrafficProfile", summary: "Get partner traffic profile", hasBody: false, parameters: [pathParam("partner_id"), {$ref: "#/components/parameters/MockScenario"}]})]},
  {path: "/partners/{partner_id}/traffic-profile/review", operations: [operation({method: "post", operationId: "reviewPartnerTrafficProfile", summary: "Review partner traffic profile", parameters: writeParams([pathParam("partner_id")])})]},
  {path: "/partners/{partner_id}/link-eligibility", operations: [operation({method: "get", operationId: "getPartnerLinkEligibility", summary: "Get first-link eligibility", hasBody: false, parameters: [pathParam("partner_id"), {$ref: "#/components/parameters/MockScenario"}]})]},
  {path: "/official-paths", operations: [operation({method: "get", operationId: "listOfficialPaths", summary: "List enabled official path options", hasBody: false, parameters: listParams()})]},
  {path: "/deep-links/validate-target", operations: [operation({method: "post", operationId: "validateDeepLinkTarget", summary: "Validate official target before link generation", scenarios: ["official_path_generation", "domain_violation"]})]},
  {path: "/admin/configs/domain-policies", operations: [
    operation({method: "get", operationId: "getOfficialDomainPolicy", summary: "Get official domain policy", hasBody: false, parameters: [{$ref: "#/components/parameters/MockScenario"}]}),
    operation({method: "post", operationId: "updateOfficialDomainPolicy", summary: "Update official domain policy", scenarios: ["domain_violation"]})
  ]},
  {path: "/admin/configs/onboarding-gate", operations: [
    operation({method: "get", operationId: "getOnboardingGateConfig", summary: "Get onboarding profile gate config", hasBody: false, scenarios: ["onboarding_traffic_profile", "onboarding_gate_disabled"], parameters: [{$ref: "#/components/parameters/MockScenario"}]}),
    operation({method: "post", operationId: "updateOnboardingGateConfig", summary: "Update onboarding profile gate config", scenarios: ["onboarding_traffic_profile", "onboarding_gate_disabled"]})
  ]},
  {path: "/admin/configs/official-paths", operations: [
    operation({method: "get", operationId: "adminListOfficialPaths", summary: "List official path library", hasBody: false, parameters: listParams()}),
    operation({method: "post", operationId: "updateOfficialPathLibrary", summary: "Update official path library", scenarios: ["official_path_generation", "domain_violation"]})
  ]},
  {path: "/events/click/risk-evaluation", operations: [operation({method: "post", operationId: "evaluateClickRisk", summary: "Evaluate deterministic click risk", scenarios: ["click_risk_observed"]})]},
  {path: "/admin/integration/event-integrity", operations: [operation({method: "get", operationId: "listEventIntegritySnapshots", summary: "List event integrity snapshots", hasBody: false, scenarios: ["event_gap_alert", "event_gap_minor_alert"], parameters: listParams()})]},
  {path: "/admin/integration/event-integrity/{stage}", operations: [operation({method: "get", operationId: "getEventIntegritySnapshot", summary: "Get one event integrity stage", hasBody: false, scenarios: ["event_gap_alert", "event_gap_minor_alert"], parameters: [pathParam("stage"), {$ref: "#/components/parameters/MockScenario"}]})]},
  {path: "/admin/integration/attribution-integrity-checks", operations: [operation({method: "post", operationId: "runAttributionIntegrityCheck", summary: "Run attribution integrity check", scenarios: ["attribution_integrity_check"]})]},
  {path: "/admin/reports/attribution-health", operations: [operation({method: "get", operationId: "getAttributionHealth", summary: "Get attribution health report", hasBody: false, scenarios: ["attribution_health_drop"], parameters: listParams()})]},
  {path: "/admin/risk-case-groups", operations: [
    operation({method: "get", operationId: "listRiskCaseGroups", summary: "List auto-merged risk case groups", hasBody: false, scenarios: ["cluster_case_group"], parameters: listParams()}),
    operation({method: "post", operationId: "createRiskCaseGroupReview", summary: "Create risk case group review", scenarios: ["cluster_case_group"]})
  ]},
  {path: "/admin/risk-case-groups/{case_group_id}/split", operations: [operation({method: "post", operationId: "splitRiskCaseGroup", summary: "Split members from a risk case group", scenarios: ["cluster_case_group"], parameters: writeParams([pathParam("case_group_id")])})]},
  {path: "/admin/risk/baselines", operations: [operation({method: "get", operationId: "listPartnerBaselines", summary: "List partner, peer, country, and channel baselines", hasBody: false, scenarios: ["partner_baseline_deviation", "partner_baseline_switched"], parameters: listParams()})]},
  {path: "/admin/reviews/investigations", operations: [operation({method: "post", operationId: "createInvestigationTask", summary: "Create boundary anomaly investigation", scenarios: ["investigation_required", "investigation_link_restricted"]})]},
  {path: "/admin/reviews/investigations/{task_id}/conclude", operations: [operation({method: "post", operationId: "concludeInvestigationTask", summary: "Conclude investigation and recommend fund action", scenarios: ["investigation_required", "investigation_link_restricted"], parameters: writeParams([pathParam("task_id")])})]},
  {path: "/admin/quarantines", operations: [
    operation({method: "get", operationId: "listQuarantines", summary: "List unified logical quarantine queue", hasBody: false, scenarios: ["auto_quarantine", "d_plus_n_threshold_changed"], parameters: listParams()}),
    operation({method: "post", operationId: "createQuarantine", summary: "Apply logical quarantine or update queue config", scenarios: ["auto_quarantine", "d_plus_n_threshold_changed"]})
  ]},
  {path: "/admin/quarantines/{quarantine_id}/release", operations: [operation({method: "post", operationId: "releaseQuarantine", summary: "Release quarantine and rerun settlement checks", scenarios: ["auto_quarantine"], parameters: writeParams([pathParam("quarantine_id")])})]},
  {path: "/admin/reviews/{case_group_id}/commission-links", operations: [operation({method: "get", operationId: "listRiskCommissionLinks", summary: "List commissions linked to a risk case", hasBody: false, scenarios: ["fraud_commission_review"], parameters: [pathParam("case_group_id"), {$ref: "#/components/parameters/MockScenario"}]})]},
  {path: "/finance/commission-cases/{commission_case_id}/risk-links", operations: [operation({method: "get", operationId: "listCommissionRiskLinks", summary: "Reverse lookup risk links from commission", hasBody: false, scenarios: ["fraud_commission_review"], parameters: [pathParam("commission_case_id"), {$ref: "#/components/parameters/MockScenario"}]})]},
  {path: "/admin/staging-runs", operations: [
    operation({method: "get", operationId: "listStagingRuns", summary: "List staging E2E runs", hasBody: false, scenarios: ["staging_e2e_pass", "staging_signoff_missing"], parameters: listParams()}),
    operation({method: "post", operationId: "createStagingRun", summary: "Create staging E2E run", scenarios: ["staging_e2e_pass", "staging_signoff_missing"]})
  ]},
  {path: "/admin/staging-runs/{run_id}/signoffs", operations: [operation({method: "post", operationId: "submitStagingSignoff", summary: "Submit risk, finance, or compliance signoff", scenarios: ["staging_e2e_pass", "staging_signoff_missing"], parameters: writeParams([pathParam("run_id")])})]},
  {path: "/admin/configs/shadow-runs", operations: [operation({method: "post", operationId: "createRuleShadowRun", summary: "Create rule shadow run", scenarios: ["rule_shadow_run"]})]},
  {path: "/admin/configs/shadow-runs/{shadow_run_id}", operations: [operation({method: "get", operationId: "getRuleShadowRun", summary: "Get shadow run diff and fund impact", hasBody: false, scenarios: ["rule_shadow_run"], parameters: [pathParam("shadow_run_id"), {$ref: "#/components/parameters/MockScenario"}]})]},
  {path: "/admin/partners/{partner_id}/operation-tags", operations: [
    operation({method: "get", operationId: "listPartnerOperationTags", summary: "List partner operation tags", hasBody: false, scenarios: ["partner_operations_tags"], parameters: [pathParam("partner_id"), {$ref: "#/components/parameters/MockScenario"}]}),
    operation({method: "post", operationId: "applyPartnerOperationTag", summary: "Apply partner operation tag", scenarios: ["partner_operations_tags"], parameters: writeParams([pathParam("partner_id")])})
  ]},
  {path: "/admin/partners/{partner_id}/operation-tags/{tag_id}", operations: [operation({method: "delete", operationId: "removePartnerOperationTag", summary: "Remove partner operation tag", scenarios: ["partner_operations_tags"], parameters: writeParams([pathParam("partner_id"), pathParam("tag_id")])})]},
  {path: "/admin/data-governance/policies", operations: [operation({method: "get", operationId: "listDataGovernancePolicies", summary: "List data governance policies", hasBody: false, scenarios: ["data_breach_runbook"], parameters: listParams()})]},
  {path: "/admin/data-governance/exports", operations: [operation({method: "post", operationId: "createDataExportRequest", summary: "Create data export request", scenarios: ["data_breach_runbook"]})]},
  {path: "/admin/data-governance/deletions", operations: [operation({method: "post", operationId: "createDataDeletionTask", summary: "Create policy-based deletion task", scenarios: ["data_breach_runbook"]})]},
  {path: "/admin/data-governance/breach-incidents", operations: [operation({method: "post", operationId: "createDataBreachIncident", summary: "Register data breach incident", scenarios: ["data_breach_runbook"]})]},
  {path: "/admin/reports/quality-economics", operations: [operation({method: "get", operationId: "getQualityEconomicsSnapshot", summary: "Get MVP quality economics report", hasBody: false, scenarios: ["quality_economics_basic", "quality_economics_full"], parameters: listParams()})]},
  {path: "/dev/contract/checks", operations: [operation({method: "post", operationId: "runContractQualityCheck", summary: "Run OpenAPI, schema, mock, and docs check", scenarios: ["api_docs_playbook"]})]},
  {path: "/admin/reports/audit-packs", phase: "P1", operations: [
    operation({method: "get", operationId: "listQuarterlyAuditPacks", summary: "List reserved quarterly audit packs", phase: "P1", scenarios: ["quarterly_audit_pack"], hasBody: false, parameters: listParams()}),
    operation({method: "post", operationId: "generateQuarterlyAuditPack", summary: "Generate reserved quarterly audit pack", phase: "P1", scenarios: ["quarterly_audit_pack"]})
  ]},
  {path: "/admin/assets/landing-patrols", operations: [operation({method: "get", operationId: "listAssetLandingPatrols", summary: "List reserved landing patrol tasks", phase: "P1", scenarios: ["asset_landing_patrol"], hasBody: false, parameters: listParams()})]},
  {path: "/subchannels/{subchannel_id}/risk-state", operations: [
    operation({method: "get", operationId: "getSubChannelRiskState", summary: "Get reserved Sub ID risk state", phase: "P1", scenarios: ["subid_risk_state"], hasBody: false, parameters: [pathParam("subchannel_id"), {$ref: "#/components/parameters/MockScenario"}]}),
    operation({method: "patch", operationId: "updateSubChannelRiskState", summary: "Update reserved Sub ID risk state", phase: "P1", scenarios: ["subid_risk_state"], parameters: writeParams([pathParam("subchannel_id")])})
  ]},
  {path: "/admin/schema-extensions/multi-level", operations: [operation({method: "get", operationId: "getMultiLevelSchemaReserve", summary: "Get multi-level hierarchy schema reserve", phase: "P1_structure", scenarios: ["multi_level_schema_reserve"], hasBody: false, parameters: [{$ref: "#/components/parameters/MockScenario"}]})]},
  {path: "/admin/configs/advanced-tier-pricing", operations: [
    operation({method: "get", operationId: "getAdvancedTierPricingReserve", summary: "Get richer tier pricing reserve", phase: "P2", scenarios: ["advanced_tier_pricing"], hasBody: false, parameters: [{$ref: "#/components/parameters/MockScenario"}]}),
    operation({method: "post", operationId: "updateAdvancedTierPricingReserve", summary: "Update richer tier pricing reserve", phase: "P2", scenarios: ["advanced_tier_pricing"]})
  ]}
];

const paths = {};
for (const route of routeSpec) {
  paths[route.path] = Object.assign({}, ...route.operations);
}

function tagForPath(pathName) {
  if (pathName.includes("traffic-profile") || pathName.includes("link-eligibility")) return "IFJOnboardingGate";
  if (pathName.includes("official-path") || pathName.includes("domain-policies") || pathName.includes("official-paths") || pathName.includes("validate-target")) return "IFJOfficialPath";
  if (pathName.includes("click/risk-evaluation")) return "IFJClickRisk";
  if (pathName.includes("event-integrity") || pathName.includes("attribution-integrity") || pathName.includes("attribution-health")) return "IFJEventIntegrity";
  if (pathName.includes("data-governance") || pathName.includes("operation-tags")) return "IFJDataGovernance";
  if (pathName.includes("staging-runs")) return "IFJStagingGate";
  if (pathName.includes("shadow-runs") || pathName.includes("quality-economics") || pathName.includes("contract/checks") || pathName.includes("audit-packs") || pathName.includes("landing-patrols") || pathName.includes("risk-state") || pathName.includes("multi-level") || pathName.includes("advanced-tier-pricing")) return "IFJContractQuality";
  return "IFJRiskGovernance";
}

for (const [pathName, pathItem] of Object.entries(paths)) {
  const tag = tagForPath(pathName);
  for (const operationObject of Object.values(pathItem)) operationObject.tags = [tag];
}

function indent(value, spaces) {
  const pad = " ".repeat(spaces);
  return String(value).split("\n").map(line => pad + line).join("\n");
}

let next = openapi;
const sanitizePathsIndex = next.indexOf("\npaths:");
const existingGeneratedPathIndex = next.indexOf("  # x-affiliate-cx-paths-begin", sanitizePathsIndex);
if (sanitizePathsIndex >= 0 && existingGeneratedPathIndex >= 0) {
  const existingSecurityIndex = next.indexOf(" securitySchemes:", existingGeneratedPathIndex);
  if (existingSecurityIndex >= 0) {
    next = next.slice(0, existingGeneratedPathIndex).trimEnd() +
      "\ncomponents:\n securitySchemes:" +
      next.slice(existingSecurityIndex + " securitySchemes:".length);
  }
}
const sanitizeComponentsIndex = next.indexOf("components:", sanitizePathsIndex);
const sanitizeSecurityIndex = next.indexOf(" securitySchemes:", sanitizeComponentsIndex);
const sanitizeSchemaMarkerIndex = next.indexOf("\n  # x-affiliate-cx-schemas-begin", sanitizeSecurityIndex);
if (sanitizePathsIndex >= 0 && sanitizeComponentsIndex >= 0 && sanitizeSecurityIndex >= 0 && sanitizeSchemaMarkerIndex >= 0) {
  const cleanComponents = next
    .slice(sanitizeSecurityIndex + " securitySchemes:".length, sanitizeSchemaMarkerIndex)
    .trimEnd();
  next = next.slice(0, sanitizeComponentsIndex).trimEnd() + "\ncomponents:\n securitySchemes:" + cleanComponents + "\n";
}
const tagBlock = [
  "# IF-J CX/D1-D10 TAGS START",
  ...cxTags.flatMap(tag => [
    `  - name: "${tag.name}"`,
    `    description: "${tag.description}"`,
    `    x-affiliate-layer: "IF-J cross-cutting"`,
    "    x-mock-scenarios:",
    ...tag.scenarios.map(item => `      - "${item}"`),
    `    x-aff-req: "${tag.req}"`
  ]),
  "# IF-J CX/D1-D10 TAGS END",
  ""
].join("\n");
next = next.replace(/\n?# IF-J CX\/D1-D10 TAGS START[\s\S]*?# IF-J CX\/D1-D10 TAGS END\n?/g, "\n");
next = next.replace(/\n  # x-affiliate-cx-tag-begin[\s\S]*?\n  # x-affiliate-cx-tag-end\n?/g, "\n");
next = next.replace("\npaths:", `\n${tagBlock}\npaths:`);
next = next.replace(/^  x-affiliate-cx-status:.*$/gm, "");
next = next.replace(/^  x-affiliate-page-tag-count: 30$/m, "  x-affiliate-page-tag-count: 30\n  x-affiliate-cx-status: \"IF-J D1-D10 contract included; page implementation remains pending\"\n  x-affiliate-event-schema: \"./schemas/events-v1.0.json\"");
next = next.replace(/^ version: 0\.[12]\.0$/m, " version: 0.2.0");

const pathsBlock = Object.entries(paths)
  .map(([pathName, pathItem]) => ` "${pathName}":\n${indent(JSON.stringify(pathItem, null, 1), 2)}`)
  .join("\n");
next = next.replace(/\n  # x-affiliate-cx-paths-begin[\s\S]*?# x-affiliate-cx-paths-end\n/s, "");
next = next.replace(/\n?# IF-J CX\/D1-D10 PATHS START[\s\S]*?# IF-J CX\/D1-D10 PATHS END/g, "\n");
const generatedPaths = `  # x-affiliate-cx-paths-begin\n${pathsBlock}\n  # x-affiliate-cx-paths-end`;
const pathsIndex = next.indexOf("\npaths:");
const markerCxPathIndex = next.indexOf("\n  # x-affiliate-cx-paths-begin", pathsIndex);
const legacyCxPathIndex = next.indexOf("\n /partners/{partner_id}/traffic-profile:", pathsIndex);
const componentsIndex = next.indexOf("\ncomponents:", pathsIndex);
const boundaryCandidates = [markerCxPathIndex, legacyCxPathIndex, componentsIndex].filter(index => index >= 0);
const cxStart = Math.min(...boundaryCandidates);
const securityIndex = next.indexOf(" securitySchemes:", pathsIndex);
if (pathsIndex < 0 || securityIndex < 0 || cxStart < 0) {
  throw new Error("Unable to locate paths/components boundary while rebuilding CX paths");
}
next = next.slice(0, cxStart).trimEnd() + `\n${generatedPaths}\ncomponents:\n securitySchemes:` + next.slice(securityIndex + " securitySchemes:".length);

const schemaRefs = Object.keys(cxSchema.definitions).map(name => `  ${name}:\n   $ref: "./schemas/cx.json#/definitions/${name}"`).join("\n");
next = next.replace(/\n  # x-affiliate-cx-schemas-begin[\s\S]*?# x-affiliate-cx-schemas-end$/s, "");
next = next.replace(/\n?# IF-J CX\/D1-D10 SCHEMA MAPPINGS START[\s\S]*?# IF-J CX\/D1-D10 SCHEMA MAPPINGS END\n?/g, "\n");
next = `${next.trimEnd()}\n  # x-affiliate-cx-schemas-begin\n${schemaRefs}\n  # x-affiliate-cx-schemas-end\n`;

fs.writeFileSync(target, next, "utf8");
console.log(`Added ${Object.keys(paths).length} CX paths and ${Object.keys(cxSchema.definitions).length} schemas to ${path.relative(process.cwd(), target)}`);
