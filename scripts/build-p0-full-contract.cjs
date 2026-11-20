#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const baseDir = path.join(root, 'affiliate-mock');
const tracePath = path.join(root, 'docs/PRD_EN/contracts/p0-full-traceability-index-v1.json');
const sourceOpenapiPath = path.join(baseDir, 'openapi/affiliate-mock-openapi.yaml');
const outputOpenapiPath = path.join(baseDir, 'openapi/p0-full-candidate-openapi.yaml');
const outputSchemasPath = path.join(baseDir, 'openapi/schemas/p0-full-candidate-object-schemas.json');
const outputManifestPath = path.join(baseDir, 'openapi/p0-full-candidate-contract-manifest.json');
const outputConflictsPath = path.join(baseDir, 'openapi/p0-full-candidate-schema-conflicts.json');
const {schemaDecisions} = require('./p0-schema-conflict-decisions.cjs');

const schemaSources = ['admin.json', 'common.json', 'cx.json', 'task-queue.json'];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function buildSchemas() {
  const definitions = {};
  const sourceMap = {};
  const variants = {};
  for (const sourceFile of schemaSources) {
    const schema = readJson(path.join(baseDir, 'openapi/schemas', sourceFile));
    for (const [name, definition] of Object.entries(schema.definitions ?? {})) {
      (variants[name] ??= []).push({sourceFile, definition});
    }
  }
  const conflicts = {};
  for (const [name, entries] of Object.entries(variants)) {
    if (entries.length === 1) {
      definitions[name] = entries[0].definition;
      sourceMap[name] = {sourceFiles: [entries[0].sourceFile], status: 'single_source'};
      continue;
    }
    const ownerDecision = schemaDecisions[name];
    if (!ownerDecision) throw new Error(`No owner decision recorded for duplicate schema ${name}`);
    definitions[name] = ownerDecision.definition;
    sourceMap[name] = {
      sourceFiles: entries.map((entry) => entry.sourceFile),
      status: ownerDecision.decision === 'reject_both_rebuild_from_authoritative_slice'
        ? 'owner_resolved_rebuild'
        : 'owner_resolved_explicit_merge',
    };
    const [base, ...others] = entries;
    conflicts[name] = {
      schemaName: name,
      status: ownerDecision.status,
      variants: entries.map((entry) => ({sourceFile: entry.sourceFile, definition: entry.definition})),
      differences: others.map((other) => compareDefinitions(base, other)),
      ownerDecision: {
        decision: ownerDecision.decision,
        decisionEvidence: ownerDecision.decisionEvidence,
        selectedCanonicalDefinition: ownerDecision.selectedCanonicalDefinition,
        replacementReason: ownerDecision.replacementReason,
      },
    };
  }
  return {
    schemaDocument: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: 'https://affiliate.local/schemas/p0-full-candidate-object-schemas.json',
      title: 'Affiliate CPA P0 full candidate object schemas',
      description: 'Candidate schemas consolidated from existing Mock schema files. Twenty duplicate names now carry owner-selected candidate definitions; production canonical promotion remains gated.',
      type: 'object',
      definitions,
      'x-affiliate-schema-sources': sourceMap,
      'x-affiliate-boundary': 'candidate_mock_schema_not_production_canonical',
      'x-affiliate-unresolved-schema-conflict-count': Object.values(conflicts).filter((conflict) => conflict.status !== 'owner_confirmed_candidate_definition').length,
      'x-affiliate-owner-resolved-schema-count': Object.keys(conflicts).length,
    },
    conflicts,
  };
}

function compareDefinitions(base, other) {
  const baseKeys = new Set(Object.keys(base.definition));
  const otherKeys = new Set(Object.keys(other.definition));
  const baseRequired = new Set(base.definition.required ?? []);
  const otherRequired = new Set(other.definition.required ?? []);
  const baseProperties = new Set(Object.keys(base.definition.properties ?? {}));
  const otherProperties = new Set(Object.keys(other.definition.properties ?? {}));
  const changedProperties = [];
  for (const name of new Set([...baseProperties, ...otherProperties])) {
    const left = base.definition.properties?.[name];
    const right = other.definition.properties?.[name];
    if (JSON.stringify(left) !== JSON.stringify(right)) changedProperties.push(name);
  }
  return {
    compared: [base.sourceFile, other.sourceFile],
    topLevelKeysOnlyInFirst: [...baseKeys].filter((key) => !otherKeys.has(key)),
    topLevelKeysOnlyInSecond: [...otherKeys].filter((key) => !baseKeys.has(key)),
    requiredOnlyInFirst: [...baseRequired].filter((key) => !otherRequired.has(key)),
    requiredOnlyInSecond: [...otherRequired].filter((key) => !baseRequired.has(key)),
    propertiesOnlyInFirst: [...baseProperties].filter((key) => !otherProperties.has(key)),
    propertiesOnlyInSecond: [...otherProperties].filter((key) => !baseProperties.has(key)),
    changedProperties,
  };
}

function buildCandidateOpenapi(trace, schemas, schemaConflicts) {
  const source = fs.readFileSync(sourceOpenapiPath, 'utf8');
  const unresolvedCount = Object.values(schemaConflicts).filter((conflict) => conflict.status !== 'owner_confirmed_candidate_definition').length;
  const resolvedCount = Object.keys(schemaConflicts).length;
  let output = source
    .replace(' title: Affiliate Mock API\n version: 0.2.0', ' title: Affiliate CPA P0 Full Candidate API\n version: 0.1.0')
    .replace(/\.{1}\/schemas\/(?:admin|common|cx|task-queue)\.json#\/definitions\//g, './schemas/p0-full-candidate-object-schemas.json#/definitions/')
    .replace(
      ' x-affiliate-page-tag-count: 30\n',
      [
        ' x-affiliate-page-tag-count: 30',
        ` x-affiliate-full-trace-version: "${trace.meta.version}"`,
        ` x-affiliate-unique-schema-count: ${Object.keys(schemas.definitions).length}`,
        ` x-affiliate-unresolved-schema-conflict-count: ${unresolvedCount}`,
        ` x-affiliate-owner-resolved-schema-count: ${resolvedCount}`,
        ' x-affiliate-contract-boundary: "candidate_mock_inventory_not_production_canonical"',
        '',
      ].join('\n'),
    );
  if (output === source) throw new Error('Unable to annotate the full candidate OpenAPI header');
  return output;
}

function buildManifest(trace, schemas, schemaConflicts) {
  const operationTests = trace.operationIndex.map((operation) => ({
    id: `P0-FULL-OP-${operation.operationId}`,
    operationId: operation.operationId,
    method: operation.method,
    path: operation.path,
    tag: operation.tag,
    module: operation.module,
    featureIds: operation.featureIds,
    mappingStatus: operation.mappingStatus,
    assertions: [
      'operation exists in the reconciled 321-operation inventory',
      'inventory entry is generated from the candidate Mock OpenAPI',
      'trace feature mapping is present and marked review or not_p0',
      'production canonical freeze is not claimed',
    ],
  }));

  const schemaTests = Object.keys(schemas.definitions).map((name) => ({
    id: `P0-FULL-SCHEMA-${name}`,
    schemaRef: `p0-full-candidate-object-schemas.json#/definitions/${name}`,
    sourceFiles: schemas['x-affiliate-schema-sources'][name].sourceFiles,
    assertions: [
      'definition is valid JSON',
      'definition declares a schema type or reference',
      'definition has one unambiguous source',
      'candidate schema is not treated as production canonical',
    ],
  }));

  const schemaConflictTests = Object.values(schemaConflicts).map((conflict) => ({
    id: `P0-FULL-SCHEMA-CONFLICT-${conflict.schemaName}`,
    schemaName: conflict.schemaName,
    sourceFiles: conflict.variants.map((variant) => variant.sourceFile),
    assertions: [
      'all source variants are retained',
      'field-level differences are exported',
      'the product-owner decision and selected candidate definition are recorded',
      'production canonical promotion remains separately gated',
    ],
  }));

  const eventTests = trace.eventIndex.map((event) => ({
    id: `P0-FULL-EVENT-${event.eventType}`,
    eventType: event.eventType,
    implemented: event.implemented,
    minimumLoopTarget: event.minimumLoopTarget,
    module: event.module,
    featureIds: event.featureIds,
    assertions: [
      'event name is unique in the full index',
      'event has a module and feature mapping',
      'implemented and minimum-loop-target states remain separate',
    ],
  }));

  const metricTests = trace.metricIndex.map((metric) => ({
    id: `P0-FULL-METRIC-${metric.metricId}`,
    metricId: metric.metricId,
    candidateFeatureIds: metric.candidateFeatureIds,
    mappingStatus: metric.mappingStatus,
    assertions: [
      'metric definition exists in Metric Catalog',
      'raw source lineage is retained',
      'feature mapping remains metric_family_inference_review until owner confirmation',
    ],
  }));

  return {
    id: 'P0-FULL-CANDIDATE-CONTRACT-MANIFEST',
    version: '0.2.0',
    generatedFrom: {
      traceIndex: 'docs/PRD_EN/contracts/p0-full-traceability-index-v1.json',
      openapi: 'affiliate-mock/openapi/affiliate-mock-openapi.yaml',
      schemas: schemaSources.map((file) => `affiliate-mock/openapi/schemas/${file}`),
      schemaDecisions: 'affiliate-mock/scripts/p0-schema-conflict-decisions.cjs',
    },
    boundary: 'Candidate Mock/OpenAPI reconciliation package; not production canonical contract or backend implementation evidence.',
    counts: {
      operations: operationTests.length,
      schemas: schemaTests.length,
      schemaConflicts: schemaConflictTests.length,
      unresolvedSchemaConflicts: schemaConflictTests.filter((test) => test.assertions.includes('owner resolution is required before canonical promotion')).length,
      events: eventTests.length,
      metrics: metricTests.length,
    },
    operationTests,
    schemaTests,
    schemaConflictTests,
    eventTests,
    metricTests,
  };
}

function build() {
  const trace = readJson(tracePath);
  const {schemaDocument: schemas, conflicts: schemaConflicts} = buildSchemas();
  const openapi = buildCandidateOpenapi(trace, schemas, schemaConflicts);
  const manifest = buildManifest(trace, schemas, schemaConflicts);
  const conflictReport = {
    id: 'P0-FULL-CANDIDATE-SCHEMA-CONFLICTS',
    version: '0.2.0',
    status: 'owner_decisions_recorded_candidate_only',
    boundary: 'Candidate source reconciliation with owner-selected definitions; production canonical promotion is not claimed by this report.',
    counts: {
      conflictingSchemaNames: Object.keys(schemaConflicts).length,
      ownerResolvedSchemaNames: Object.keys(schemaConflicts).length,
      unresolvedSchemaNames: Object.values(schemaConflicts).filter((conflict) => conflict.status !== 'owner_confirmed_candidate_definition').length,
      sourceVariants: Object.values(schemaConflicts).reduce((sum, conflict) => sum + conflict.variants.length, 0),
    },
    conflicts: schemaConflicts,
  };
  fs.writeFileSync(outputOpenapiPath, openapi);
  fs.writeFileSync(outputSchemasPath, `${JSON.stringify(schemas, null, 2)}\n`);
  fs.writeFileSync(outputManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(outputConflictsPath, `${JSON.stringify(conflictReport, null, 2)}\n`);
  console.log(`Built P0 full candidate contract artifacts in openapi: 4 files (${manifest.counts.operations} operations, ${manifest.counts.schemas} selected candidate schemas, ${manifest.counts.schemaConflicts} owner-resolved schema decisions, ${manifest.counts.events} events, ${manifest.counts.metrics} metrics)`);
}

build();
