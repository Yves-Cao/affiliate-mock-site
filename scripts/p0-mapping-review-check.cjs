'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const baseDir = path.join(root, 'affiliate-mock');
const manifest = JSON.parse(fs.readFileSync(path.join(baseDir, 'openapi/p0-mapping-review-manifest.json'), 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function countDataRows(file) {
  const text = fs.readFileSync(file, 'utf8').trimEnd();
  if (!text) return 0;
  let rows = 0;
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') quoted = !quoted;
    if (char === '\n' && !quoted) rows += 1;
  }
  return rows + 1;
}

assert(manifest.counts.operations === 321, 'Operation review count changed');
assert(manifest.counts.metrics === 145, 'Metric review count changed');
assert(manifest.counts.schemaConflicts === 20, 'Schema conflict review count changed');
assert(manifest.counts.total === 486, 'Total review count changed');
assert(manifest.counts.pending === 466, 'Only operation and metric reviews must remain pending');
assert(manifest.counts.ownerResolved === 20, 'All schema conflicts must be owner-resolved');
assert(manifest.status === 'partial_owner_review_complete', 'Manifest status must reflect partial owner review');

const groups = [
  [manifest.operationReviews, 'operationId', 321, 'p0-operation-mapping-review.csv'],
  [manifest.metricReviews, 'metricId', 145, 'p0-metric-mapping-review.csv'],
  [manifest.schemaReviews, 'schemaName', 20, 'p0-schema-conflict-review.csv'],
];
for (const [items, idField, expected, csvName] of groups) {
  assert(items.length === expected, `${csvName} manifest count changed`);
  assert(new Set(items.map((item) => item[idField])).size === expected, `${csvName} IDs are not unique`);
  if (csvName === 'p0-schema-conflict-review.csv') {
    assert(items.every((item) => item.status === 'owner_confirmed_candidate_definition'), `${csvName} has an unconfirmed schema decision`);
    assert(items.every((item) => item.decision && item.decisionEvidence && item.selectedCanonicalDefinition), `${csvName} must record complete owner decisions`);
  } else {
    assert(items.every((item) => item.status === 'pending_owner_confirmation'), `${csvName} has a non-pending decision`);
    assert(items.every((item) => item.decision === '' && item.decisionEvidence === ''), `${csvName} must keep blank operation/metric decisions`);
  }
  assert(countDataRows(path.join(baseDir, 'openapi', csvName)) === expected + 1, `${csvName} row count changed`);
}

console.log(`P0 mapping review check passed: ${manifest.counts.operations} operations and ${manifest.counts.metrics} metrics pending; ${manifest.counts.schemaConflicts} schema decisions owner-confirmed`);
