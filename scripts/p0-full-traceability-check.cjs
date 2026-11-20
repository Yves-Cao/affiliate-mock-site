#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const indexPath = path.join(root, 'docs/PRD_EN/contracts/p0-full-traceability-index-v1.json');
const featurePath = path.join(root, 'docs/PRD_EN/requirements/FEATURE-BACKLOG.md');
const minimumPath = path.join(root, 'docs/PRD_EN/contracts/p0-minimum-closed-loop-traceability-v1.json');
const inventoryPath = path.join(root, 'affiliate-mock/openapi/admin-openapi-inventory.json');
const eventsPath = path.join(root, 'affiliate-mock/openapi/schemas/events-v1.0.json');
const metricsPath = path.join(root, 'docs/PRD_EN/metrics/METRIC-CATALOG.md');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function unique(values) {
  return [...new Set(values)];
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const index = readJson(indexPath);
const minimum = readJson(minimumPath);
const inventory = readJson(inventoryPath);
const eventSchema = readJson(eventsPath);
const featureText = fs.readFileSync(featurePath, 'utf8');
const metricText = fs.readFileSync(metricsPath, 'utf8');

const expected = {
  p0Features: 32,
  candidateOperations: 321,
  eventTypes: 102,
  implementedEventTypes: 47,
  minimumLoopTargetEventTypes: 61,
  canonicalObjects: 47,
  metrics: 145,
  minimumLoopCoveredFeatures: 32,
};

for (const [key, value] of Object.entries(expected)) {
  const actual = key === 'minimumLoopCoveredFeatures'
    ? index.featureIndex.filter((feature) => feature.minimumLoop).length
    : index.counts[key];
  assert(actual === value, `${key}: expected ${value}, received ${actual}`);
}

assert(unique(index.featureIndex.map((feature) => feature.featureId)).length === expected.p0Features, 'P0 feature IDs are not unique');
assert(index.featureIndex.every((feature) => feature.status === 'mapped_internal_ready'), 'A lane-1 P0 feature has the wrong status');
assert(index.featureIndex.every((feature) => feature.module && feature.owningSlice && feature.requirements.length > 0), 'A P0 feature is missing module, slice, or requirements');
assert(index.featureIndex.flatMap((feature) => feature.requirements).every((id) => /^AFF-REQ-(?:[A-Z]+\d+|FND-\d+)$/.test(id)), 'A requirement ID is not stable');
assert(index.gaps.featuresWithoutMinimumLoop.length === 0, 'Every lane-1 P0 feature must have minimum-loop coverage');

const allBacklogFeatureIds = [...featureText.matchAll(/^\| (FEATURE-[A-Z]+-\d+) \|/gm)].map((match) => match[1]);
const allBacklogFeatureSet = new Set(allBacklogFeatureIds);
assert(allBacklogFeatureSet.size > expected.p0Features, 'Feature Backlog parse failed');
assert(index.operationIndex.every((operation) => operation.featureIds.every((featureId) => allBacklogFeatureSet.has(featureId))), 'An operation references a feature outside Feature Backlog');
assert(index.operationIndex.every((operation) => operation.module && Array.isArray(operation.featureIds) && operation.mappingStatus !== 'unmapped'), 'An operation is unmapped');
assert(unique(index.operationIndex.map((operation) => `${operation.method} ${operation.path}`)).length === expected.candidateOperations, 'Candidate operation path/method is not unique');

const implemented = eventSchema.properties.event_type.enum;
const minimumEvents = minimum.stages.flatMap((stage) => stage.events);
assert(index.eventIndex.filter((event) => event.implemented).length === implemented.length, 'Implemented event closure failed');
assert(index.eventIndex.filter((event) => event.minimumLoopTarget).length === unique(minimumEvents).length, 'Minimum-loop event closure failed');
assert(index.eventIndex.every((event) => event.module !== 'unmapped' && event.featureIds.length > 0), 'An event is unmapped');
assert(unique(index.eventIndex.map((event) => event.eventType)).length === expected.eventTypes, 'Event types are not unique');

assert(unique(index.objectIndex.map((object) => object.objectId)).length === expected.canonicalObjects, 'Canonical object IDs are not unique');
assert(unique(index.objectIndex.map((object) => object.objectId)).join('\n') === Object.keys(minimum.objectDictionary).join('\n'), 'Canonical object closure differs from minimum-loop source');

const metricIds = [...metricText.matchAll(/^\| (MET-[A-Z]+-\d+) \|/gm)].map((match) => match[1]);
assert(unique(index.metricIndex.map((metric) => metric.metricId)).length === expected.metrics, 'Metric IDs are not unique');
assert(unique(index.metricIndex.map((metric) => metric.metricId)).join('\n') === unique(metricIds).join('\n'), 'Metric closure differs from Metric Catalog');
assert(index.metricIndex.every((metric) => metric.sourceObjectsEventsRaw.trim().length > 0), 'A metric has no source lineage text');
assert(index.metricIndex.every((metric) => metric.mappingStatus === 'metric_family_inference_review'), 'A metric mapping is incorrectly marked confirmed');

assert(index.gaps.unmappedOperations === 0, 'Unmapped operations must remain zero');
assert(index.gaps.unmappedEvents === 0, 'Unmapped events must remain zero');

console.log(`P0 full traceability check passed: ${expected.p0Features} P0 features, ${expected.candidateOperations} candidate operations, ${expected.eventTypes} events, ${expected.canonicalObjects} objects, ${expected.metrics} metrics`);
