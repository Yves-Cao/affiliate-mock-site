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
const operationBatchEnPath = path.join(root, 'docs/PRD_EN/contracts/OPERATION-MAPPING-BATCH3-2026-11-20.md');
const operationBatchCnPath = path.join(root, 'docs/PRD_CN/契约/Operation映射Batch3-2026-11-20.md');
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
| Operation mapping Batch 3 | ${manifest.counts.operations} | [\`OPERATION-MAPPING-BATCH3-2026-11-20.md\`](OPERATION-MAPPING-BATCH3-2026-11-20.md) | Approve or adjust 15 module-gated mapping recommendations |
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
| Operation映射Batch3 | ${manifest.counts.operations} | [\`Operation映射Batch3-2026-11-20.md\`](Operation映射Batch3-2026-11-20.md) | 批准或调整15组按模块门禁的映射推荐 |
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

function renderOperationBatchEnglish(groups) {
  const lane1Count = groups.filter(group => group.scope === 'lane_1_p0').reduce((sum, group) => sum + group.count, 0);
  const laterCount = groups.filter(group => group.scope !== 'lane_1_p0').reduce((sum, group) => sum + group.count, 0);
  const rows = groups.map(group => [
    group.id,
    group.title,
    group.scope === 'lane_1_p0' ? 'Lane 1 P0' : 'Cross-cutting / later',
    String(group.count),
    group.tags.join(', '),
    group.features.join(', '),
    group.recommendation,
    group.canonicalEligibility,
    group.ownerGate,
  ]);
  return `# Operation Mapping Batch 3 Decision Package

| Field | Value |
| --- | --- |
| Version | v0.1 |
| Date | 2026-11-20 |
| Owner | Product owner role / Affiliate engineering role / owning domain roles |
| Status | \`recommendation_only\`; owner confirmation required |
| Scope | All ${groups.reduce((sum, group) => sum + group.count, 0)} generated candidate operation mappings |
| Non-scope | Filling original operation decision fields, production canonical promotion, provider integration, or inventing production parameters |

> **English Summary**
>
> This package groups the 321 pending candidate operation mappings into 15 reviewable batches. The recommendation confirms module/feature mapping while keeping canonical promotion gated by the owning module's contract, IAM, configuration, or lineage tests. No original CSV decision field is completed by this package.
>
> **中文摘要**
>
> 本包把321条待确认候选operation映射分成15个可评审批次。推荐先确认模块/功能归属，但Canonical晋升仍按所属模块的契约、IAM、配置或血缘测试门禁执行。本包不填写原始CSV决策字段。

## 1. Decision Groups

| Group | Title | Scope | Count | Tags | Features | Mapping recommendation | Canonical eligibility | Remaining gate |
| --- | --- | --- | ---: | --- | --- | --- | --- | --- |
${rows.map(row => `| ${row.map(cell => String(cell).replace(/\|/g, '\\|')).join(' | ')} |`).join('\n')}

## 2. Recommended Owner Answers

| Decision | Recommended answer | Why this question matters |
| --- | --- | --- |
| OP-BATCH3-A: confirm the module/feature mapping for ${lane1Count} lane-1 P0 operations | Approve | Confirms that each operation navigates to the correct P0 feature and module before canonical promotion work expands beyond the 52-operation minimum loop. |
| OP-BATCH3-B: classify ${laterCount} cross-cutting/later operations as not P0 v1 | Approve | Keeps governance, contract-quality, reporting, and appeal operations out of P0 v1 canonical promotion until their owning gates close. |
| OP-BATCH3-C: keep canonical promotion module-gated | Approve | Prevents a mapping confirmation from being misread as endpoint freeze or production readiness. |
| OP-BATCH3-D: record exceptions | Provide operation IDs and replacement module/feature | Any mismatch would otherwise propagate into generated OpenAPI, tests, and module ownership. |

## 3. Supplemental Evidence That Accelerates Review

| Evidence | Why it helps | Current effect if absent |
| --- | --- | --- |
| CRM contract-owner name and operation-level supported/unsupported answers | Closes onboarding, SSO, KYC-count, path/link, registration, attribution, and risk-view mapping questions | Production CRM integration remains blocked |
| Payment contract-owner name, sandbox access, and create/callback/query/reconciliation examples | Closes MOD-06 physical payout mapping and unknown/partial test design | Production payout and reconciliation remain blocked |
| IAM role-to-resource/action matrix | Confirms operation-level authorization and task assignment | Operation schemas can be reviewed but authorization freeze remains blocked |
| Risk and finance parameter matrices with ranges, owners, and statuses | Separates structure from production values and unlocks configuration operations | Configuration operations remain structurally mapped but not canonical-ready |
| Salesforce object/field/entry/status mode | Closes service projection and support-entry mapping | Salesforce integration remains deferred |
| Environment/pipeline IDs and test-data set IDs | Converts readiness skeletons into executable integration evidence | UAT and release timing remain unknown |

## 4. Promotion Rule

1. Approving this package confirms only the recommended navigation mapping and P0-v1 scope classification.
2. Every canonical promotion still requires an owning slice, stable schema, authorization mapping, idempotency/error semantics, event linkage, and focused test intent.
3. Operations marked \`not_p0_v1\` remain in the candidate inventory and do not enter P0 v1 canonical promotion.
4. No operation is a production endpoint or provider adapter merely because its mapping is confirmed.

## 5. Machine-Readable Review

The row-level grouping is generated in [\`p0-operation-mapping-batch3-review.csv\`](../../../affiliate-mock/openapi/p0-operation-mapping-batch3-review.csv). It retains every original operation ID and path without filling the original pending decision fields.

## 6. Verification

\`\`\`bash
npm --prefix affiliate-mock run build:p0-mapping-review
npm --prefix affiliate-mock run test:p0-mapping-review
\`\`\`

## 7. Maintenance Record

| Date | Version | Change |
| --- | --- | --- |
| 2026-11-20 | v0.1 | Created 15 operation-mapping recommendation groups covering all 321 candidate operations; original decision fields remain pending. |
`;
}

function renderOperationBatchChinese(groups) {
  const lane1Count = groups.filter(group => group.scope === 'lane_1_p0').reduce((sum, group) => sum + group.count, 0);
  const laterCount = groups.filter(group => group.scope !== 'lane_1_p0').reduce((sum, group) => sum + group.count, 0);
  const rows = groups.map(group => [
    group.id,
    group.title,
    group.scope === 'lane_1_p0' ? '第一车道P0' : '跨域/后续',
    String(group.count),
    group.tags.join(', '),
    group.features.join(', '),
    group.recommendation,
    group.canonicalEligibility,
    group.ownerGate,
  ]);
  return `# Operation映射Batch3决策包

| 字段 | 值 |
| --- | --- |
| 版本 | v0.1 |
| 日期 | 2026-11-20 |
| 负责人 | 产品负责人角色 / Affiliate研发角色 / 所属领域角色 |
| 对应英文文档 | [\`OPERATION-MAPPING-BATCH3-2026-11-20.md\`](../../PRD_EN/contracts/OPERATION-MAPPING-BATCH3-2026-11-20.md) |
| 同步状态 | 已同步 |
| 状态 | \`recommendation_only\`；需负责人确认 |
| 范围 | 全部${groups.reduce((sum, group) => sum + group.count, 0)}条生成候选operation映射 |
| 非范围 | 填写原始operation决策字段、生产Canonical晋升、Provider集成或臆造生产参数 |

> **English Summary**
>
> This Chinese file mirrors the 15-group operation-mapping Batch 3 recommendation package. Implementation authority remains with the English layer.
>
> **中文摘要**
>
> 本文件是15组Operation映射Batch3推荐包的中文审阅镜像。实施权威仍在英文层。

## 1. 决策组

| 组 | 标题 | 范围 | 数量 | Tag | 功能 | 映射推荐 | Canonical资格 | 剩余门禁 |
| --- | --- | --- | ---: | --- | --- | --- | --- | --- |
${rows.map(row => `| ${row.map(cell => String(cell).replace(/\|/g, '\\|')).join(' | ')} |`).join('\n')}

## 2. 推荐负责人答案

| 决策 | 推荐答案 | 为什么重要 |
| --- | --- | --- |
| OP-BATCH3-A：确认${lane1Count}条第一车道P0 operation的模块/功能映射 | 批准 | 在52-operation最小闭环之外扩大Canonical工作前，先确认每条operation导航到正确P0功能和模块。 |
| OP-BATCH3-B：将${laterCount}条跨域/后续operation分类为非P0 v1 | 批准 | 治理、契约质量、报表和申诉operation在所属门禁关闭前不进入P0 v1 Canonical晋升。 |
| OP-BATCH3-C：Canonical晋升继续按模块门禁执行 | 批准 | 避免把映射确认误读为端点冻结或生产ready。 |
| OP-BATCH3-D：记录例外 | 提供operation ID和替代模块/功能 | 任何错配都会传导到生成OpenAPI、测试和模块归属。 |

## 3. 可补充且能加速评审的证据

| 证据 | 为什么有帮助 | 当前缺失影响 |
| --- | --- | --- |
| CRM契约负责人及operation级支持/不支持答复 | 关闭入驻、SSO、KYC计数、路径链接、注册、归属和风险视图映射问题 | 生产CRM集成仍阻塞 |
| 支付契约负责人、沙箱访问和create/callback/query/reconciliation示例 | 关闭MOD-06物理打款映射及unknown/partial测试设计 | 生产打款和对账仍阻塞 |
| IAM角色到资源/动作矩阵 | 确认operation级授权和任务分配 | Operation Schema可评审但授权冻结仍阻塞 |
| 风控和财务参数矩阵（范围、负责人、状态） | 区分结构与生产值，解锁配置operation | 配置operation只有结构映射，仍不能Canonical-ready |
| Salesforce对象/字段/入口/状态方式 | 关闭服务投影和客服入口映射 | Salesforce集成仍延后 |
| 环境/流水线ID和测试数据集ID | 把准入骨架转成可执行集成证据 | UAT和发布时间仍未知 |

## 4. 晋升规则

1. 批准本包只确认推荐导航映射和P0 v1范围分类。
2. 每条Canonical晋升仍需所属切片、稳定Schema、授权映射、幂等/错误语义、事件关联和专项测试意图。
3. 标记\`not_p0_v1\`的operation保留在候选inventory，不进入P0 v1 Canonical晋升。
4. 任何operation不会仅因映射确认而成为生产端点或Provider适配器。

## 5. 机器可读评审

行级分组见 [\`p0-operation-mapping-batch3-review.csv\`](../../../affiliate-mock/openapi/p0-operation-mapping-batch3-review.csv)。该文件保留全部原始operation ID和路径，不填写原始pending决策字段。

## 6. 验证

\`\`\`bash
npm --prefix affiliate-mock run build:p0-mapping-review
npm --prefix affiliate-mock run test:p0-mapping-review
\`\`\`

## 7. 维护记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-11-20 | v0.1 | 建立15组operation映射推荐，覆盖全部321条候选operation；原始决策字段保持pending。 |
`;
}

build();
