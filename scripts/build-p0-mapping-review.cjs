#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const baseDir = path.join(root, 'affiliate-mock');
const tracePath = path.join(root, 'docs/PRD_EN/contracts/p0-full-traceability-index-v1.json');
const conflictPath = path.join(baseDir, 'openapi/p0-full-candidate-schema-conflicts.json');
const outputDir = path.join(baseDir, 'openapi');
const manifestPath = path.join(outputDir, 'p0-mapping-review-manifest.json');
const operationCsvPath = path.join(outputDir, 'p0-operation-mapping-review.csv');
const metricCsvPath = path.join(outputDir, 'p0-metric-mapping-review.csv');
const schemaCsvPath = path.join(outputDir, 'p0-schema-conflict-review.csv');
const operationBatchCsvPath = path.join(outputDir, 'p0-operation-mapping-batch3-review.csv');
const enDocPath = path.join(root, 'docs/PRD_EN/contracts/P0-MAPPING-REVIEW-V1.md');
const cnDocPath = path.join(root, 'docs/PRD_CN/契约/P0映射确认清单-V1.md');
const operationBatchEnPath = path.join(root, 'docs/PRD_EN/contracts/OPERATION-MAPPING-BATCH3-2026-11-19.md');
const operationBatchCnPath = path.join(root, 'docs/PRD_CN/契约/Operation映射Batch3-2026-11-19.md');
const {schemaDecisions} = require('./p0-schema-conflict-decisions.cjs');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = Array.isArray(value) ? value.join(';') : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(',')),
  ].join('\n');
}

const operationBatches = [
  {id: 'OP-B3-01', title: 'Partner Onboarding Gate', scope: 'lane_1_p0', expectedCount: 3, recommendation: 'confirm_mapping', canonicalEligibility: 'after_contract_tests', ownerGate: 'Owning slice contract review and focused API tests', matches: op => op.module === 'MOD-01 Partner Onboarding'},
  {id: 'OP-B3-02', title: 'Official Path And Click Risk', scope: 'lane_1_p0', expectedCount: 7, recommendation: 'confirm_mapping', canonicalEligibility: 'after_contract_tests', ownerGate: 'Promotion contract review and CRM/provider boundary tests', matches: op => op.module === 'MOD-02 Promotion'},
  {id: 'OP-B3-03', title: 'Event Integrity And Attribution Health', scope: 'lane_1_p0', expectedCount: 4, recommendation: 'confirm_mapping', canonicalEligibility: 'defer_until_governance_ready', ownerGate: 'GOV-Q03, GOV-Q08, and the governance slice ready gate', matches: op => op.tag === 'IFJEventIntegrity'},
  {id: 'OP-B3-04', title: 'Qualification And Price Configuration', scope: 'lane_1_p0', expectedCount: 36, recommendation: 'confirm_mapping', canonicalEligibility: 'defer_until_configuration_matrices', ownerGate: 'Approved price, qualification, country/entity field matrices', matches: op => op.module === 'MOD-04 Qualification'},
  {id: 'OP-B3-05', title: 'Credit Benefit Configuration', scope: 'lane_1_p0', expectedCount: 12, recommendation: 'confirm_mapping', canonicalEligibility: 'defer_until_configuration_matrices', ownerGate: 'Approved credit benefit matrices and risk parameters', matches: op => op.tag === 'AdminCreditBenefitConfig'},
  {id: 'OP-B3-06', title: 'Credit Override And Insights', scope: 'lane_1_p0', expectedCount: 16, recommendation: 'confirm_mapping', canonicalEligibility: 'after_iam_and_evidence_tests', ownerGate: 'IAM matrix and sensitive evidence policy', matches: op => op.module === 'MOD-05 Credit' && op.tag !== 'AdminCreditBenefitConfig'},
  {id: 'OP-B3-07', title: 'Hold And Guarantee Configuration', scope: 'lane_1_p0', expectedCount: 24, recommendation: 'confirm_mapping', canonicalEligibility: 'defer_until_configuration_matrices', ownerGate: 'Finance-approved hold, guarantee, country/entity, and configuration matrices', matches: op => op.tag === 'AdminHoldConfig' || op.tag === 'AdminGuaranteeConfig'},
  {id: 'OP-B3-08', title: 'Funds Reviews And Coverage', scope: 'lane_1_p0', expectedCount: 23, recommendation: 'confirm_mapping', canonicalEligibility: 'after_finance_iam_lineage_tests', ownerGate: 'Finance policy, IAM, and financial lineage review', matches: op => op.module === 'MOD-06 Funds' && op.tag !== 'AdminHoldConfig' && op.tag !== 'AdminGuaranteeConfig'},
  {id: 'OP-B3-09', title: 'Risk Rule Configuration', scope: 'lane_1_p0', expectedCount: 48, recommendation: 'confirm_mapping', canonicalEligibility: 'defer_until_configuration_matrices', ownerGate: 'Risk-approved hard, scoring, violation, and cluster rule matrices', matches: op => op.module === 'MOD-05 Risk' && ['AdminClusterRuleConfig', 'AdminHardRuleConfig', 'AdminRiskScoringConfig', 'AdminViolationRuleConfig'].includes(op.tag)},
  {id: 'OP-B3-10', title: 'Risk Events And Insights', scope: 'lane_1_p0', expectedCount: 30, recommendation: 'confirm_mapping', canonicalEligibility: 'after_iam_and_evidence_tests', ownerGate: 'IAM matrix, evidence visibility, and production risk parameters', matches: op => op.module === 'MOD-05 Risk' && ['AdminHardRuleHits', 'AdminRiskEventsScores', 'AdminClusterInsights', 'AdminViolationEvents', 'AdminFraudReferences'].includes(op.tag)},
  {id: 'OP-B3-11', title: 'Risk Reviews And Governance', scope: 'lane_1_p0', expectedCount: 43, recommendation: 'confirm_mapping', canonicalEligibility: 'after_iam_and_task_contract_tests', ownerGate: 'GOV-Q03, RSK-Q03, and unified task contract', matches: op => op.module === 'MOD-05 Risk' && ['AdminRiskReview', 'IFJRiskGovernance', 'AdminClusterHoldReview', 'AdminCapBreakerReview'].includes(op.tag)},
  {id: 'OP-B3-12', title: 'Governance Cross-Cutting Operations', scope: 'cross_cutting_or_later', expectedCount: 42, recommendation: 'confirm_mapping_defer_from_p0_v1', canonicalEligibility: 'not_p0_v1', ownerGate: 'Governance ready gate and configuration families', matches: op => op.module === 'MOD-07 Governance' && op.tag !== 'IFJEventIntegrity'},
  {id: 'OP-B3-13', title: 'Contract Quality Operations', scope: 'cross_cutting_or_later', expectedCount: 12, recommendation: 'confirm_mapping_defer_from_p0_v1', canonicalEligibility: 'not_p0_v1', ownerGate: 'Contract-quality evidence and canonical promotion criteria', matches: op => op.module === 'MOD-07 Contract Governance'},
  {id: 'OP-B3-14', title: 'Reporting Operations', scope: 'cross_cutting_or_later', expectedCount: 12, recommendation: 'confirm_mapping_defer_from_p0_v1', canonicalEligibility: 'not_p0_v1', ownerGate: 'Published metrics and reporting lineage', matches: op => op.module === 'MOD-09 Reporting'},
  {id: 'OP-B3-15', title: 'Appeal Operations', scope: 'cross_cutting_or_later', expectedCount: 9, recommendation: 'confirm_mapping_defer_from_p0_v1', canonicalEligibility: 'not_p0_v1', ownerGate: 'Appeal policy and reviewer matrix', matches: op => op.module === 'Translation Debt'},
];

function classifyOperationReview(operation) {
  const matches = operationBatches.filter(batch => batch.matches(operation));
  if (matches.length !== 1) throw new Error(`Operation ${operation.operationId} matches ${matches.length} Batch 3 groups`);
  return matches[0];
}

function build() {
  const trace = readJson(tracePath);
  const conflictReport = readJson(conflictPath);
  const p0FeatureIds = new Set(trace.featureIndex.map((feature) => feature.featureId));

  const operationReviews = trace.operationIndex.map((operation) => ({
    reviewId: `P0-OP-MAP-${operation.operationId}`,
    operationId: operation.operationId,
    method: operation.method,
    path: operation.path,
    tag: operation.tag,
    module: operation.module,
    featureIds: operation.featureIds,
    mappingStatus: operation.mappingStatus,
    currentBasis: 'admin_openapi_inventory_tag',
    reviewScope: operation.featureIds.some((id) => p0FeatureIds.has(id)) ? 'lane_1_p0' : 'cross_cutting_or_later_scope',
    ownerRole: 'Owning slice product role + Affiliate engineering role',
    reviewQuestion: 'Confirm the feature/module mapping and whether this candidate operation enters canonical promotion.',
    decision: '',
    decisionEvidence: '',
    canonicalEligibility: '',
    status: 'pending_owner_confirmation',
  }));
  const operationBatchRows = operationReviews.map(operation => {
    const batch = classifyOperationReview(operation);
    return {
      batchId: batch.id,
      batchTitle: batch.title,
      reviewScope: batch.scope,
      recommendation: batch.recommendation,
      canonicalEligibility: batch.canonicalEligibility,
      ownerGate: batch.ownerGate,
      reviewId: operation.reviewId,
      operationId: operation.operationId,
      method: operation.method,
      path: operation.path,
      tag: operation.tag,
      module: operation.module,
      featureIds: operation.featureIds,
    };
  });
  const operationBatchSummary = operationBatches.map(batch => ({
    ...batch,
    count: operationBatchRows.filter(row => row.batchId === batch.id).length,
    tags: [...new Set(operationBatchRows.filter(row => row.batchId === batch.id).map(row => row.tag))],
    features: [...new Set(operationBatchRows.filter(row => row.batchId === batch.id).flatMap(row => row.featureIds))],
  }));
  for (const summary of operationBatchSummary) {
    if (summary.count !== summary.expectedCount) throw new Error(`${summary.id} expected ${summary.expectedCount} operations, found ${summary.count}`);
    if (summary.count === 0) throw new Error(`${summary.id} is empty`);
  }

  const metricReviews = trace.metricIndex.map((metric) => ({
    reviewId: `P0-METRIC-MAP-${metric.metricId}`,
    metricId: metric.metricId,
    metricFamily: metric.family,
    businessQuestion: metric.businessQuestion,
    sourceObjectsEvents: metric.sourceObjectsEventsRaw,
    candidateFeatureIds: metric.candidateFeatureIds,
    currentBasis: 'metric_family_inference',
    ownerRole: 'Metric owner + owning slice product role',
    reviewQuestion: 'Confirm feature ownership, source lineage, and publication eligibility.',
    decision: '',
    decisionEvidence: '',
    publicationEligibility: '',
    status: 'pending_owner_confirmation',
  }));

  const schemaReviews = Object.values(conflictReport.conflicts).map((conflict) => {
    const ownerDecision = schemaDecisions[conflict.schemaName];
    if (!ownerDecision) throw new Error(`No owner decision recorded for ${conflict.schemaName}`);
    return {
      reviewId: `P0-SCHEMA-CONFLICT-${conflict.schemaName}`,
      schemaName: conflict.schemaName,
      sourceFiles: conflict.variants.map((variant) => variant.sourceFile),
      differenceCount: conflict.differences.length,
      currentBasis: 'field_level_candidate_diff',
      ownerRole: 'Schema engineering owner + owning domain product role',
      reviewQuestion: 'Choose one source, merge with an explicit field matrix, or reject both and define a new canonical schema.',
      decision: ownerDecision.decision,
      decisionEvidence: ownerDecision.decisionEvidence,
      selectedCanonicalDefinition: ownerDecision.selectedCanonicalDefinition,
      status: ownerDecision.status,
    };
  });

  const manifest = {
    id: 'P0-MAPPING-REVIEW-V1',
    version: '0.2.0',
    date: '2026-11-19',
    status: 'partial_owner_review_complete',
    boundary: 'No blank decision field may be treated as confirmation. The 20 schema-conflict directions are product-owner confirmed; operation and metric mappings remain review inputs only.',
    counts: {
      operations: operationReviews.length,
      metrics: metricReviews.length,
      schemaConflicts: schemaReviews.length,
      total: operationReviews.length + metricReviews.length + schemaReviews.length,
      pending: operationReviews.length + metricReviews.length,
      ownerResolved: schemaReviews.length,
    },
    operationReviews,
    metricReviews,
    schemaReviews,
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(operationCsvPath, `${csv(operationReviews)}\n`);
  fs.writeFileSync(metricCsvPath, `${csv(metricReviews)}\n`);
  fs.writeFileSync(schemaCsvPath, `${csv(schemaReviews)}\n`);
  fs.writeFileSync(operationBatchCsvPath, `${csv(operationBatchRows)}\n`);
  fs.writeFileSync(enDocPath, renderEnglish(manifest));
  fs.writeFileSync(cnDocPath, renderChinese(manifest));
  fs.writeFileSync(operationBatchEnPath, renderOperationBatchEnglish(operationBatchSummary));
  fs.writeFileSync(operationBatchCnPath, renderOperationBatchChinese(operationBatchSummary));
  console.log(`Built P0 mapping review package: ${manifest.counts.operations} operations and ${manifest.counts.metrics} metrics pending, ${manifest.counts.schemaConflicts} schema decisions owner-confirmed; Batch 3 contains ${operationBatchSummary.length} operation groups`);
}

function renderEnglish(manifest) {
  return `# P0 Mapping Review V1

Version: v0.2
Date: 2026-11-19
Owner: Product owner role / Affiliate engineering role
Status: Operation and metric owner review required; 20 schema-conflict directions owner-confirmed
Machine-readable source: [\`p0-mapping-review-manifest.json\`](../../../affiliate-mock/openapi/p0-mapping-review-manifest.json)

> **English Summary**
>
> This generated package separates navigation mappings that need human confirmation from canonical facts. It contains ${manifest.counts.operations} candidate operation mappings and ${manifest.counts.metrics} metric lineage mappings pending owner confirmation, plus ${manifest.counts.schemaConflicts} duplicate-schema resolutions recorded from the product-owner Batch 2 decision. No blank decision is confirmation.
>
> **中文摘要**
>
> 本生成包把需要人工确认的导航映射与Canonical事实分开，包含${manifest.counts.operations}条候选operation映射和${manifest.counts.metrics}条指标血缘映射待负责人确认，另有${manifest.counts.schemaConflicts}条重名Schema决策已记录产品负责人Batch 2答案。空白决策不代表确认。

## 1. Review Files

| Review set | Count | Machine/CSV source | Required decision |
| --- | ---: | --- | --- |
| Candidate operation mappings | ${manifest.counts.operations} | [\`p0-operation-mapping-review.csv\`](../../../affiliate-mock/openapi/p0-operation-mapping-review.csv) | Confirm feature/module mapping and canonical eligibility |
| Metric mappings | ${manifest.counts.metrics} | [\`p0-metric-mapping-review.csv\`](../../../affiliate-mock/openapi/p0-metric-mapping-review.csv) | Confirm feature ownership, lineage, and publication eligibility |
| Duplicate schema conflicts | ${manifest.counts.schemaConflicts} | [\`p0-schema-conflict-review.csv\`](../../../affiliate-mock/openapi/p0-schema-conflict-review.csv) | Product-owner decisions recorded; selected definitions remain candidate-only |
| Batch 2 decision package | ${manifest.counts.schemaConflicts} | [\`SCHEMA-CONFLICT-BATCH2-2026-11-19.md\`](SCHEMA-CONFLICT-BATCH2-2026-11-19.md) | Group A reject-and-rebuild and Group B explicit-merge approved |

## 2. Decision Rules

1. Use stable IDs only; do not create second requirement or feature authorities.
2. Every decision needs a named source or command result in \`decisionEvidence\`.
3. A candidate Mock/OpenAPI operation cannot enter Canonical merely because it exists.
4. A metric cannot become \`published\` through this review alone; it still follows Metric Catalog publication gates.
5. An owner-selected duplicate-schema definition remains candidate-only until production canonical promotion passes its separate gate.
6. Batch 2 began as an AI recommendation and became an owner decision through the recorded 2026-11-19 product-owner answer; it does not authorize production canonical publication.

## 3. Verification

\`\`\`bash
npm --prefix affiliate-mock run build:p0-mapping-review
npm --prefix affiliate-mock run test:p0-mapping-review
\`\`\`

## 4. Maintenance Record

| Date | Version | Change |
| --- | --- | --- |
| 2026-11-18 | v0.1 | Generated owner-review packages for candidate operations, metrics, and duplicate schemas. |
| 2026-11-19 | v0.2 | Recorded the product-owner Batch 2 decision for all 20 duplicate schemas; operation and metric reviews remain pending. |
`;
}

function renderChinese(manifest) {
  return `# P0映射确认清单 V1

版本：v0.2
日期：2026-11-19
负责人：产品负责人角色 / Affiliate研发角色
对应英文文档：[\`P0-MAPPING-REVIEW-V1.md\`](../../PRD_EN/contracts/P0-MAPPING-REVIEW-V1.md)
机器可读源：[\`p0-mapping-review-manifest.json\`](../../../affiliate-mock/openapi/p0-mapping-review-manifest.json)
同步状态：已同步
权威性：中文审阅版；实施以英文版为准。

> **English Summary**
>
> This Chinese file mirrors the generated P0 mapping review package. Implementation authority remains with the English layer.
>
> **中文摘要**
>
> 本文件是P0映射确认清单的中文审阅镜像。实施权威仍在英文层。

## 1. 确认文件

| 确认集 | 数量 | 机器/CSV来源 | 必须决策 |
| --- | ---: | --- | --- |
| 候选operation映射 | ${manifest.counts.operations} | [\`p0-operation-mapping-review.csv\`](../../../affiliate-mock/openapi/p0-operation-mapping-review.csv) | 确认功能/模块映射和Canonical资格 |
| 指标映射 | ${manifest.counts.metrics} | [\`p0-metric-mapping-review.csv\`](../../../affiliate-mock/openapi/p0-metric-mapping-review.csv) | 确认功能归属、血缘和发布资格 |
| 重名Schema冲突 | ${manifest.counts.schemaConflicts} | [\`p0-schema-conflict-review.csv\`](../../../affiliate-mock/openapi/p0-schema-conflict-review.csv) | 产品负责人决策已记录；选定定义仍仅candidate |
| Batch2决策包 | ${manifest.counts.schemaConflicts} | [\`Schema重名冲突Batch2-2026-11-19.md\`](Schema重名冲突Batch2-2026-11-19.md) | A组拒绝并重建、B组显式合并已批准 |

## 2. 决策规则

1. 只使用稳定ID，不建立第二套需求或功能权威。
2. 每条决策必须在\`decisionEvidence\`记录来源或命令结果。
3. 候选Mock/OpenAPI operation不能因存在而自动进入Canonical。
4. 指标不能仅凭本清单变成\`published\`，仍须走指标目录发布门禁。
5. owner-selected重名Schema定义在生产Canonical晋升通过独立门禁前仍仅candidate。
6. Batch2从AI推荐开始，通过2026-11-19产品负责人答复成为owner decision；不授权生产Canonical发布。

## 3. 验证

\`\`\`bash
npm --prefix affiliate-mock run build:p0-mapping-review
npm --prefix affiliate-mock run test:p0-mapping-review
\`\`\`

## 4. 维护记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-11-18 | v0.1 | 生成候选operation、指标和重名Schema的负责人确认包。 |
| 2026-11-19 | v0.2 | 记录产品负责人对全部20个重名Schema的Batch2决策；operation和指标评审仍待确认。 |
`;
}

build();
