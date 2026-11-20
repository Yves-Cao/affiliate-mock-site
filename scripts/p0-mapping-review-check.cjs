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

function parseCsv(file) {
  const text = fs.readFileSync(file, 'utf8').trim();
  if (!text) return [];
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

assert(manifest.counts.operations === 321, 'Operation review count changed');
assert(manifest.counts.metrics === 145, 'Metric review count changed');
assert(manifest.counts.schemaConflicts === 20, 'Schema conflict review count changed');
assert(manifest.counts.total === 486, 'Total review count changed');
assert(manifest.counts.pending === 466, 'Only operation and metric reviews must remain pending');
assert(manifest.counts.ownerResolved === 20, 'All schema conflicts must be owner-resolved');
assert(manifest.status === 'partial_owner_review_complete', 'Manifest status must reflect partial owner review');

const batchRows = parseCsv(path.join(baseDir, 'openapi/p0-operation-mapping-batch3-review.csv'));
const batchHeaders = batchRows.shift();
const batchColumn = name => batchHeaders.indexOf(name);
const expectedBatchCounts = {
  'OP-B3-01': 3,
  'OP-B3-02': 7,
  'OP-B3-03': 4,
  'OP-B3-04': 36,
  'OP-B3-05': 12,
  'OP-B3-06': 16,
  'OP-B3-07': 24,
  'OP-B3-08': 23,
  'OP-B3-09': 48,
  'OP-B3-10': 30,
  'OP-B3-11': 43,
  'OP-B3-12': 42,
  'OP-B3-13': 12,
  'OP-B3-14': 12,
  'OP-B3-15': 9,
};
assert(batchRows.length === 321, 'Batch 3 operation row count changed');
assert(new Set(batchRows.map(row => row[batchColumn('operationId')])).size === 321, 'Batch 3 operation IDs are not unique');
assert(new Set(batchRows.map(row => row[batchColumn('reviewId')])).size === 321, 'Batch 3 review IDs are not unique');
const actualBatchCounts = batchRows.reduce((counts, row) => {
  counts[row[batchColumn('batchId')]] = (counts[row[batchColumn('batchId')]] || 0) + 1;
  return counts;
}, {});
for (const [batchId, expected] of Object.entries(expectedBatchCounts)) {
  assert(actualBatchCounts[batchId] === expected, `Batch 3 group count changed for ${batchId}`);
}
assert(Object.keys(actualBatchCounts).length === 15, 'Batch 3 group count changed');
assert(batchRows.filter(row => row[batchColumn('reviewScope')] === 'lane_1_p0').length === 246, 'Batch 3 lane-1 count changed');
assert(batchRows.filter(row => row[batchColumn('reviewScope')] !== 'lane_1_p0').length === 75, 'Batch 3 later-scope count changed');
assert(batchRows.every(row => row[batchColumn('recommendation')] && row[batchColumn('canonicalEligibility')] && row[batchColumn('ownerGate')]), 'Batch 3 recommendation is incomplete');

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
