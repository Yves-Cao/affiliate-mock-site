'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const baseDir = path.join(root, 'affiliate-mock');
const trace = JSON.parse(fs.readFileSync(path.join(root, 'docs/PRD_EN/contracts/p0-full-traceability-index-v1.json'), 'utf8'));
const schemas = JSON.parse(fs.readFileSync(path.join(baseDir, 'openapi/schemas/p0-full-candidate-object-schemas.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(baseDir, 'openapi/p0-full-candidate-contract-manifest.json'), 'utf8'));
const conflictReport = JSON.parse(fs.readFileSync(path.join(baseDir, 'openapi/p0-full-candidate-schema-conflicts.json'), 'utf8'));
const openapi = fs.readFileSync(path.join(baseDir, 'openapi/p0-full-candidate-openapi.yaml'), 'utf8');
const {schemaDecisions, commandDecisions} = require('./p0-schema-conflict-decisions.cjs');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(trace.counts.candidateOperations === 321, 'Trace index operation count changed');
assert(manifest.counts.operations === 321, 'Candidate manifest operation count changed');
assert(manifest.counts.events === trace.counts.eventTypes, 'Candidate manifest event closure failed');
assert(manifest.counts.metrics === trace.counts.metrics, 'Candidate manifest metric closure failed');
assert(manifest.counts.schemas === Object.keys(schemas.definitions).length, 'Candidate schema closure failed');
assert(manifest.counts.schemaConflicts === 20, 'Candidate schema conflict count changed');
assert(manifest.version === '0.2.0', 'Candidate manifest decision version missing');
assert(Object.keys(schemas.definitions).length === 136, 'Candidate selected-schema count changed');
assert(Object.keys(conflictReport.conflicts).length === 20, 'Schema conflict report closure failed');
assert(conflictReport.counts.sourceVariants === 40, 'Schema conflict variant closure failed');
assert(conflictReport.counts.ownerResolvedSchemaNames === 20, 'Schema owner-resolution closure failed');
assert(conflictReport.counts.unresolvedSchemaNames === 0, 'No schema conflict may remain unresolved');
assert(conflictReport.status === 'owner_decisions_recorded_candidate_only', 'Schema conflicts must remain candidate-only');
assert(openapi.includes('Affiliate CPA P0 Full Candidate API'), 'Candidate OpenAPI title annotation missing');
assert(openapi.includes('candidate_mock_inventory_not_production_canonical'), 'Candidate OpenAPI boundary annotation missing');
assert(openapi.includes('x-affiliate-unresolved-schema-conflict-count: 0'), 'Candidate OpenAPI unresolved-conflict annotation missing');
assert(openapi.includes('x-affiliate-owner-resolved-schema-count: 20'), 'Candidate OpenAPI owner-resolution annotation missing');
assert(!openapi.includes('production canonical'), 'Candidate OpenAPI makes an invalid production claim');

for (const [name, definition] of Object.entries(schemas.definitions)) {
  assert(definition && (definition.type || definition.$ref || definition.properties || definition.items), `Schema ${name} has no usable schema shape`);
  const source = schemas['x-affiliate-schema-sources'][name];
  assert(source?.sourceFiles?.length > 0, `Schema ${name} has no source file`);
  assert(['single_source', 'owner_resolved_rebuild', 'owner_resolved_explicit_merge'].includes(source.status), `Schema ${name} has an invalid source status`);
}

for (const conflict of Object.values(conflictReport.conflicts)) {
  assert(conflict.status === 'owner_confirmed_candidate_definition', `Schema conflict ${conflict.schemaName} is not owner-confirmed`);
  assert(conflict.ownerDecision?.decision, `Schema conflict ${conflict.schemaName} has no owner decision`);
  assert(conflict.ownerDecision?.decisionEvidence, `Schema conflict ${conflict.schemaName} has no decision evidence`);
  assert(conflict.ownerDecision?.selectedCanonicalDefinition, `Schema conflict ${conflict.schemaName} has no selected definition`);
  assert(conflict.variants.length === 2, `Schema conflict ${conflict.schemaName} must retain two variants`);
  assert(conflict.differences.length === 1, `Schema conflict ${conflict.schemaName} must retain one field-level comparison`);
  assert(new Set(conflict.variants.map((variant) => variant.sourceFile)).size === 2, `Schema conflict ${conflict.schemaName} variants are not source-distinct`);
}

for (const [name, ownerDecision] of Object.entries(schemaDecisions)) {
  assert(JSON.stringify(schemas.definitions[name]) === JSON.stringify(ownerDecision.definition), `Schema ${name} does not match its owner-selected definition`);
  assert(conflictReport.conflicts[name]?.ownerDecision?.decision === ownerDecision.decision, `Schema ${name} decision is not retained`);
}

assert(commandDecisions.createWalletLedgerEntries.decision === 'generic_call_prohibited', 'Generic ledger-call prohibition missing');
assert(commandDecisions.recordPaymentResult.decision === 'generic_call_prohibited', 'Generic payment-result prohibition missing');

for (const test of [...manifest.operationTests, ...manifest.schemaTests, ...manifest.schemaConflictTests, ...manifest.eventTests, ...manifest.metricTests]) {
  assert(typeof test.id === 'string' && test.id.length > 0, 'Manifest test ID missing');
  assert(Array.isArray(test.assertions) && test.assertions.length > 0, `Manifest test ${test.id} has no assertions`);
}

assert(new Set(manifest.operationTests.map((test) => test.id)).size === 321, 'Operation test IDs are not unique');
assert(new Set(manifest.schemaTests.map((test) => test.id)).size === 136, 'Schema test IDs are not unique');
assert(new Set(manifest.schemaConflictTests.map((test) => test.id)).size === 20, 'Schema conflict test IDs are not unique');
assert(new Set(manifest.eventTests.map((test) => test.id)).size === trace.counts.eventTypes, 'Event test IDs are not unique');
assert(new Set(manifest.metricTests.map((test) => test.id)).size === trace.counts.metrics, 'Metric test IDs are not unique');

console.log(`P0 full candidate contract check passed: ${manifest.counts.operations} operations, ${manifest.counts.schemas} selected candidate schemas, ${manifest.counts.schemaConflicts} owner-resolved schema decisions, ${manifest.counts.events} events, ${manifest.counts.metrics} metrics`);
