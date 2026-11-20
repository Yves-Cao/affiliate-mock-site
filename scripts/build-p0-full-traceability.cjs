#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const paths = {
  output: path.join(root, 'docs/PRD_EN/contracts/p0-full-traceability-index-v1.json'),
  outputMd: path.join(root, 'docs/PRD_EN/contracts/P0-FULL-TRACEABILITY-INDEX-V1.md'),
  outputCn: path.join(root, 'docs/PRD_CN/契约/P0全量追踪索引-V1.md'),
  features: path.join(root, 'docs/PRD_EN/requirements/FEATURE-BACKLOG.md'),
  minimum: path.join(root, 'docs/PRD_EN/contracts/p0-minimum-closed-loop-traceability-v1.json'),
  inventory: path.join(root, 'affiliate-mock/openapi/admin-openapi-inventory.json'),
  events: path.join(root, 'affiliate-mock/openapi/schemas/events-v1.0.json'),
  metrics: path.join(root, 'docs/PRD_EN/metrics/METRIC-CATALOG.md'),
};

const P0_PREFIXES = new Set(['ONB', 'PROMO', 'ATTR', 'QUAL', 'FUND', 'RISK']);
const MODULE_BY_PREFIX = {
  ONB: 'MOD-01 Partner Onboarding',
  PROMO: 'MOD-02 Promotion',
  ATTR: 'MOD-03 Registration Attribution',
  QUAL: 'MOD-04 Qualification And Commission',
  FUND: 'MOD-06 Settlement, Withdrawal, And Payment',
  RISK: 'MOD-05 Risk, Credit, And Settlement Gates',
};

const TAG_MAP = {
  AdminAppealReview: ['Translation Debt', ['FEATURE-APPEAL-01'], 'not_p0'],
  AdminApprovalWorkflowConfig: ['MOD-07 Governance', ['FEATURE-GOV-01'], 'review'],
  AdminCapBreakerReview: ['MOD-05 Risk', ['FEATURE-RISK-02'], 'review'],
  AdminClusterHoldReview: ['MOD-05 Risk', ['FEATURE-RISK-04', 'FEATURE-RISK-05'], 'review'],
  AdminClusterInsights: ['MOD-05 Risk', ['FEATURE-RISK-04'], 'review'],
  AdminClusterRuleConfig: ['MOD-05 Risk', ['FEATURE-RISK-04'], 'review'],
  AdminConfigOverview: ['MOD-07 Governance', ['FEATURE-GOV-01'], 'review'],
  AdminCountryEntityConfig: ['MOD-04 Qualification', ['FEATURE-QUAL-02'], 'review'],
  AdminCreditBenefitConfig: ['MOD-05 Credit', ['FEATURE-RISK-06'], 'review'],
  AdminCreditInsights: ['MOD-05 Credit', ['FEATURE-RISK-06'], 'review'],
  AdminCreditLevelOverrideReview: ['MOD-05 Credit', ['FEATURE-RISK-06'], 'review'],
  AdminD30Review: ['MOD-06 Funds', ['FEATURE-FUND-02', 'FEATURE-RISK-05'], 'review'],
  AdminFraudReferences: ['MOD-05 Risk', ['FEATURE-RISK-01'], 'review'],
  AdminGuaranteeConfig: ['MOD-06 Funds', ['FEATURE-FUND-04'], 'review'],
  AdminGuaranteeCoverageReport: ['MOD-06 Funds', ['FEATURE-FUND-04'], 'review'],
  AdminGuaranteeOffsetReview: ['MOD-06 Funds', ['FEATURE-FUND-04'], 'review'],
  AdminHardRuleConfig: ['MOD-05 Risk', ['FEATURE-RISK-01'], 'review'],
  AdminHardRuleHits: ['MOD-05 Risk', ['FEATURE-RISK-01'], 'review'],
  AdminHoldConfig: ['MOD-06 Funds', ['FEATURE-FUND-02'], 'review'],
  AdminIntegrationTasks: ['MOD-07 Governance', ['FEATURE-GOV-03'], 'review'],
  AdminPriceConfig: ['MOD-04 Qualification', ['FEATURE-QUAL-02'], 'review'],
  AdminQualificationConfig: ['MOD-04 Qualification', ['FEATURE-QUAL-01'], 'review'],
  AdminQualityReport: ['MOD-09 Reporting', ['FEATURE-REPORT-01'], 'not_p0'],
  AdminRiskEventsScores: ['MOD-05 Risk', ['FEATURE-RISK-02'], 'review'],
  AdminRiskReview: ['MOD-05 Risk', ['FEATURE-RISK-03'], 'review'],
  AdminRiskScoringConfig: ['MOD-05 Risk', ['FEATURE-RISK-02'], 'review'],
  AdminRoiReport: ['MOD-09 Reporting', ['FEATURE-REPORT-01'], 'not_p0'],
  AdminSimulation: ['MOD-07 Governance', ['FEATURE-GOV-01'], 'review'],
  AdminViolationEvents: ['MOD-05 Risk', ['FEATURE-RISK-02'], 'review'],
  AdminViolationRuleConfig: ['MOD-05 Risk', ['FEATURE-RISK-02'], 'review'],
  IFJClickRisk: ['MOD-02 Promotion', ['FEATURE-PROMO-02'], 'review'],
  IFJContractQuality: ['MOD-07 Contract Governance', ['FEATURE-GOV-03', 'FEATURE-GOV-04', 'FEATURE-REPORT-01'], 'review'],
  IFJDataGovernance: ['MOD-07 Governance', ['FEATURE-GOV-02'], 'review'],
  IFJEventIntegrity: ['MOD-07 Governance', ['FEATURE-GOV-03', 'FEATURE-ATTR-05'], 'review'],
  IFJOfficialPath: ['MOD-02 Promotion', ['FEATURE-PROMO-01', 'FEATURE-PROMO-03', 'FEATURE-PROMO-04'], 'review'],
  IFJOnboardingGate: ['MOD-01 Partner Onboarding', ['FEATURE-ONB-03'], 'review'],
  IFJRiskGovernance: ['MOD-05 Risk', ['FEATURE-RISK-03', 'FEATURE-RISK-05'], 'review'],
  IFJStagingGate: ['MOD-07 Governance', ['FEATURE-GOV-01'], 'review'],
};

const EVENT_RULES = [
  [/^credit_/, 'MOD-05 Credit', ['FEATURE-RISK-06']],
  [/^cluster_/, 'MOD-05 Cluster', ['FEATURE-RISK-04']],
  [/^(onboarding_gate|traffic_profile)/, 'MOD-01 Partner Onboarding', ['FEATURE-ONB-03']],
  [/^(official_path|target_path)/, 'MOD-02 Promotion', ['FEATURE-PROMO-01', 'FEATURE-PROMO-02']],
  [/^click_risk/, 'MOD-02 Promotion', ['FEATURE-PROMO-02']],
  [/^(event_gap|event_backfill)/, 'MOD-07 Governance', ['FEATURE-GOV-03']],
  [/^risk_case_group/, 'MOD-05 Cluster', ['FEATURE-RISK-04']],
  [/^(baseline_|investigation_)/, 'MOD-05 Risk', ['FEATURE-RISK-02', 'FEATURE-RISK-03']],
  [/^attribution_(integrity|health)/, 'MOD-03 Attribution', ['FEATURE-ATTR-05']],
  [/^partner_notice/, 'Translation Debt', ['FEATURE-NOTIFY-01']],
  [/^rule_shadow/, 'MOD-07 Governance', ['FEATURE-GOV-01']],
  [/^(auto_quarantine|quarantine_threshold)/, 'MOD-05 Risk', ['FEATURE-RISK-05']],
  [/^data_export/, 'MOD-07 Governance', ['FEATURE-GOV-04', 'FEATURE-REPORT-01']],
  [/^(data_deleted|breach_notification|partner_tag_)/, 'MOD-07 Governance', ['FEATURE-GOV-02']],
  [/^quality_economics/, 'MOD-09 Reporting', ['FEATURE-REPORT-01']],
  [/^risk_commission_link/, 'MOD-05 Risk', ['FEATURE-RISK-05']],
  [/^(staging_|api_contract)/, 'MOD-07 Contract Governance', ['FEATURE-GOV-04']],
  [/^quarterly_audit/, 'Future Pool', ['FEATURE-FUTURE-01']],
  [/^asset_landing/, 'Future Pool', ['FEATURE-FUTURE-02']],
  [/^subchannel_risk/, 'Future Pool', ['FEATURE-FUTURE-03']],
  [/^multi_level/, 'Future Pool', ['FEATURE-FUTURE-04']],
];

const METRIC_FAMILY_MAP = {
  FUN: ['FEATURE-PROMO-02', 'FEATURE-ATTR-01'],
  ONB: ['FEATURE-ONB-01', 'FEATURE-ONB-02', 'FEATURE-ONB-03'],
  QUAL: ['FEATURE-QUAL-01', 'FEATURE-QUAL-02', 'FEATURE-QUAL-03'],
  COMM: ['FEATURE-QUAL-01', 'FEATURE-FUND-01'],
  FUND: ['FEATURE-FUND-01', 'FEATURE-FUND-02', 'FEATURE-FUND-03', 'FEATURE-FUND-04'],
  RISK: ['FEATURE-RISK-01', 'FEATURE-RISK-02', 'FEATURE-RISK-03', 'FEATURE-RISK-04', 'FEATURE-RISK-05'],
  CRE: ['FEATURE-RISK-06'],
  GOV: ['FEATURE-GOV-01', 'FEATURE-GOV-02', 'FEATURE-GOV-03'],
  EXP: ['FEATURE-GOV-04', 'FEATURE-REPORT-01'],
  SVC: ['FEATURE-PORTAL-05'],
  NOT: ['FEATURE-NOTIFY-01'],
  INT: ['FEATURE-GOV-03'],
  ADM: ['FEATURE-OPER-01'],
  POR: ['FEATURE-PORTAL-01', 'FEATURE-PORTAL-02', 'FEATURE-PORTAL-03', 'FEATURE-PORTAL-04', 'FEATURE-PORTAL-05'],
};

const read = (file) => fs.readFileSync(file, 'utf8');
const row = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
const unique = (values) => [...new Set(values)];

function expandRequirements(value) {
  return value.split(/[,/]/).map((item) => item.trim()).filter(Boolean).flatMap((item) => {
    const range = item.match(/^([A-Z]+)(\d+)-(?:[A-Z]+)?(\d+)$/);
    if (!range) return [item.startsWith('FND-') || /^[A-Z]+\d+$/.test(item) ? `AFF-REQ-${item}` : item];
    const first = Number(range[2]);
    const last = Number(range[3]);
    return Array.from({ length: last - first + 1 }, (_, offset) => `AFF-REQ-${range[1]}${String(first + offset).padStart(2, '0')}`);
  });
}

function parseFeatures() {
  const section = read(paths.features).split('## 4. MVP Feature Backlog')[1]?.split('## 5. MVP Feature Narratives')[0] ?? '';
  return section.split('\n').filter((line) => line.startsWith('| FEATURE-')).map((line) => {
    const cells = row(line);
    return {
      featureId: cells[0],
      name: cells[1],
      primaryUser: cells[2],
      requirements: expandRequirements(cells[3]),
      owningSlice: cells[4].replace(/\[([^\]]+)\][^\s]*/g, '$1'),
      status: cells[5],
      keyDependency: cells[6],
    };
  }).filter((feature) => P0_PREFIXES.has(feature.featureId.split('-')[1]));
}

function indexMinimum(minimum) {
  const features = new Map();
  const objects = new Map();
  for (const stage of minimum.stages) {
    for (const featureId of stage.features) {
      const item = features.get(featureId) ?? { stages: [], operations: [], targetEvents: [], objects: [], requirements: [] };
      item.stages.push(stage.id);
      item.operations.push(...stage.operations);
      item.targetEvents.push(...stage.events);
      item.objects.push(...stage.objects);
      item.requirements.push(...stage.requirements);
      features.set(featureId, item);
    }
    for (const objectId of stage.objects) {
      const item = objects.get(objectId) ?? { stages: [], features: [], requirements: [], operations: [], targetEvents: [] };
      item.stages.push(stage.id);
      item.features.push(...stage.features);
      item.requirements.push(...stage.requirements);
      item.operations.push(...stage.operations);
      item.targetEvents.push(...stage.events);
      objects.set(objectId, item);
    }
  }
  for (const item of features.values()) {
    item.stages = unique(item.stages);
    item.operations = unique(item.operations);
    item.targetEvents = unique(item.targetEvents);
    item.objects = unique(item.objects);
    item.requirements = unique(item.requirements);
  }
  for (const item of objects.values()) {
    item.stages = unique(item.stages);
    item.features = unique(item.features);
    item.requirements = unique(item.requirements);
    item.operations = unique(item.operations);
    item.targetEvents = unique(item.targetEvents);
  }
  return { features, objects };
}

function parseMetrics() {
  return read(paths.metrics).split('\n').filter((line) => line.startsWith('| MET-')).map((line) => {
    const cells = row(line);
    const family = cells[0].split('-')[1];
    const source = cells[5] ?? '';
    return {
      metricId: cells[0],
      family,
      businessQuestion: cells[1] ?? '',
      sourceObjectsEventsRaw: source,
      sourceObjectsEvents: unique([...source.matchAll(/`([^`]+)`/g)].map((match) => match[1])),
      candidateFeatureIds: METRIC_FAMILY_MAP[family] ?? [],
      mappingStatus: 'metric_family_inference_review',
      definitionStatus: cells[9] ?? '',
      surfaces: cells[10] ?? '',
    };
  });
}

function build() {
  const features = parseFeatures();
  const minimum = JSON.parse(read(paths.minimum));
  const inventory = JSON.parse(read(paths.inventory));
  const eventSchema = JSON.parse(read(paths.events));
  const metrics = parseMetrics();
  const minimumIndex = indexMinimum(minimum);
  const implementedEvents = eventSchema.properties.event_type.enum;
  const minimumEvents = minimum.stages.flatMap((stage) => stage.events);

  const operationIndex = inventory.operations.map((operation) => {
    const [module, featureIds, mappingStatus] = TAG_MAP[operation.tag] ?? ['unmapped', [], 'unmapped'];
    return { ...operation, module, featureIds, mappingStatus, mappingSource: 'admin_openapi_inventory_tag', authority: 'candidate_mock_inventory_not_production_contract' };
  });

  const eventIndex = unique([...implementedEvents, ...minimumEvents]).sort().map((eventType) => {
    const rule = EVENT_RULES.find(([pattern]) => pattern.test(eventType));
    const minimumFeatures = minimum.stages.filter((stage) => stage.events.includes(eventType)).flatMap((stage) => stage.features);
    const featureIds = unique([...(rule?.[2] ?? []), ...minimumFeatures]);
    const module = rule?.[1] ?? MODULE_BY_PREFIX[minimumFeatures[0]?.split('-')[1]] ?? 'unmapped';
    return {
      eventType,
      implemented: implementedEvents.includes(eventType),
      minimumLoopTarget: minimumEvents.includes(eventType),
      module,
      featureIds,
      mappingStatus: featureIds.length ? 'review' : 'unmapped',
    };
  });

  const featureIndex = features.map((feature) => {
    const minimumLoop = minimumIndex.features.get(feature.featureId) ?? null;
    const operations = operationIndex.filter((operation) => operation.featureIds.includes(feature.featureId));
    const events = eventIndex.filter((event) => event.featureIds.includes(feature.featureId));
    const metricIds = metrics.filter((metric) => metric.candidateFeatureIds.includes(feature.featureId)).map((metric) => metric.metricId);
    return {
      ...feature,
      module: MODULE_BY_PREFIX[feature.featureId.split('-')[1]],
      minimumLoop,
      candidateInventoryOperations: operations.map(({ operationId, method, path, tag, mappingStatus }) => ({ operationId, method, path, tag, mappingStatus })),
      eventCoverage: events.map(({ eventType, implemented, minimumLoopTarget }) => ({ eventType, implemented, minimumLoopTarget })),
      candidateMetricIds: metricIds,
      coverageStatus: minimumLoop ? 'minimum_loop_covered' : 'slice_ready_operation_expansion_pending',
      metricMappingStatus: 'metric_family_inference_review',
    };
  });

  const objectIndex = Object.entries(minimum.objectDictionary).map(([objectId, definition]) => ({
    objectId,
    ...definition,
    trace: minimumIndex.objects.get(objectId) ?? { stages: [], features: [], requirements: [], operations: [], targetEvents: [] },
  }));
  const metricIndex = metrics;

  const p0FeatureIds = new Set(featureIndex.map((feature) => feature.featureId));
  const result = {
    meta: {
      id: 'P0-FULL-TRACEABILITY-INDEX-V1',
      version: '0.2.0',
      date: '2026-11-18',
      status: 'working_engineering_index',
      authorityBoundary: 'English slices remain the business authority. This index joins existing artifacts; mappings marked review do not create business semantics.',
      developmentScope: 'CPA-internal contract-first implementation and test design only',
      productionScope: 'blocked until physical contracts, integration evidence, UAT, and business acceptance close',
      sources: {
        features: 'docs/PRD_EN/requirements/FEATURE-BACKLOG.md',
        minimumLoop: 'docs/PRD_EN/contracts/p0-minimum-closed-loop-traceability-v1.json',
        candidateOperations: 'affiliate-mock/openapi/admin-openapi-inventory.json',
        implementedEvents: 'affiliate-mock/openapi/schemas/events-v1.0.json',
        metrics: 'docs/PRD_EN/metrics/METRIC-CATALOG.md',
      },
    },
    counts: {
      p0Features: featureIndex.length,
      candidateOperations: operationIndex.length,
      eventTypes: eventIndex.length,
      implementedEventTypes: implementedEvents.length,
      minimumLoopTargetEventTypes: unique(minimumEvents).length,
      canonicalObjects: objectIndex.length,
      metrics: metrics.length,
    },
    featureIndex,
    operationIndex,
    eventIndex,
    objectIndex,
    metricIndex,
    gaps: {
      featuresWithoutMinimumLoop: featureIndex.filter((feature) => !feature.minimumLoop).map((feature) => feature.featureId),
      operationsWithoutP0Feature: operationIndex.filter((operation) => !operation.featureIds.some((id) => p0FeatureIds.has(id))).length,
      unmappedOperations: operationIndex.filter((operation) => operation.mappingStatus === 'unmapped').length,
      unmappedEvents: eventIndex.filter((event) => event.mappingStatus === 'unmapped').length,
      metricsWithoutCandidateFeature: metrics.filter((metric) => metric.candidateFeatureIds.length === 0).map((metric) => metric.metricId),
      reviewRule: 'Review mappings guide engineering navigation but require slice-owner confirmation before contract freeze.',
    },
  };

  fs.mkdirSync(path.dirname(paths.output), { recursive: true });
  fs.writeFileSync(paths.output, `${JSON.stringify(result, null, 2)}\n`);
  const markdown = renderMarkdown(result);
  const chinese = renderChinese(result);
  fs.writeFileSync(paths.outputMd, markdown);
  fs.writeFileSync(paths.outputCn, chinese);
  console.log(`Built docs/PRD_EN/contracts/p0-full-traceability-index-v1.json: ${result.counts.p0Features} P0 features, ${result.counts.candidateOperations} candidate operations, ${result.counts.eventTypes} event types, ${result.counts.canonicalObjects} objects, ${result.counts.metrics} metrics`);
}

function renderMarkdown(result) {
  const featureRows = result.featureIndex.map((feature) => {
    const operationCount = feature.minimumLoop?.operations.length ?? 0;
    const eventCount = feature.minimumLoop?.targetEvents.length ?? 0;
    const objectCount = feature.minimumLoop?.objects.length ?? 0;
    return `| ${feature.featureId} | ${feature.module} | ${feature.requirements.length} | ${operationCount} | ${eventCount} | ${objectCount} | ${feature.candidateInventoryOperations.length} | ${feature.eventCoverage.length} | ${feature.candidateMetricIds.length} | ${feature.coverageStatus} |`;
  }).join('\n');
  return `# P0 Full Traceability Index V1

Version: v0.3
Date: 2026-11-19
Owner: Affiliate engineering role / Product owner role
Status: Working engineering index; English slices remain the business authority
Machine-readable source: [\`p0-full-traceability-index-v1.json\`](p0-full-traceability-index-v1.json)

> **English Summary**
>
> This generated index joins all 32 lane-1 P0 features to requirements, minimum-loop operations/events/objects, 321 candidate API operations, ${result.counts.eventTypes} known event types, ${result.counts.canonicalObjects} canonical objects, and 145 metric definitions. It is a navigation and gap-control layer, not a second business authority and not permission to integrate production providers.
>
> **中文摘要**
>
> 本生成索引把 32 个第一车道 P0 功能连接到需求、最小闭环 operation/事件/对象、321 个候选 API operation、${result.counts.eventTypes} 个已知事件类型、${result.counts.canonicalObjects} 个 canonical 对象和 145 条指标定义。它是导航和缺口控制层，不是第二业务权威，也不授权生产外部集成。

## 1. Boundary

1. Business semantics come from the linked English slices.
2. The minimum-loop JSON and its generated schemas are the current canonical CPA-internal contract baseline.
3. The 321-operation inventory is candidate Mock/OpenAPI evidence and does not freeze production endpoints or adapters.
4. The generated full candidate package consolidates the 321 operations, 136 selected candidate object schemas, and 20 owner-resolved duplicate-schema decisions for reconciliation only; operation and metric review mappings are not canonical closure.
5. Inventory-tag and metric-family mappings marked \`review\` guide engineering navigation; slice owners must confirm them before contract freeze.
6. Physical CRM, payment, Salesforce, IAM, analytics, UAT, and business-acceptance gates remain closed.

## 2. Coverage Counts

| Layer | Count | Boundary |
| --- | ---: | --- |
| Lane-1 P0 features | ${result.counts.p0Features} | All six detailed P0 slices |
| Unique P0 requirements referenced | ${new Set(result.featureIndex.flatMap((feature) => feature.requirements)).size} | Expanded from Feature Backlog |
| Candidate API operations inventoried | ${result.counts.candidateOperations} | Mock/OpenAPI candidate, not production canonical |
| Known event types | ${result.counts.eventTypes} | ${result.counts.implementedEventTypes} implemented + ${result.counts.minimumLoopTargetEventTypes} minimum-loop target |
| Canonical minimum-loop objects | ${result.counts.canonicalObjects} | Generated JSON Schema baseline |
| Metric definitions | ${result.counts.metrics} | Draft/review definitions; none is production-published |

## 3. Feature Chain

The machine-readable JSON is the full index. The table below summarizes each feature's current trace depth.

| Feature | Module | Requirements | Min-loop operations | Min-loop events | Min-loop objects | Candidate APIs | Event coverage | Metrics | Coverage |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${featureRows}

## 4. Explicit Gaps

1. All 32 lane-1 P0 features now have minimum-loop operation/event/object coverage; ONB-04, ATTR-03, and RISK-06 are no longer structural gaps.
2. ${result.gaps.operationsWithoutP0Feature} of ${result.counts.candidateOperations} candidate operations belong to governance, reporting, translation debt, or future scope rather than the 32 lane-1 P0 features.
3. There are ${result.gaps.unmappedOperations} unmapped operations and ${result.gaps.unmappedEvents} unmapped events; both counts must remain zero in future generated indexes.
4. All metric-to-feature links are family-level inference and require metric-owner review before publication or report implementation.
5. Full canonical schema generation beyond the minimum loop remains module work; this index does not claim full-P0 schema closure.

## 5. Engineering Use

\`\`\`text
AFF-REQ -> FEATURE -> module -> slice
        -> minimum-loop operation/event/object
        -> candidate inventory operation
        -> metric lineage
        -> open production gate
\`\`\`

Use the JSON \`featureIndex\` for implementation intake, \`operationIndex\` for candidate API reconciliation, \`eventIndex\` for event closure, \`objectIndex\` for object ownership, and \`metricIndex\` for lineage review.

## 6. Verification

\`\`\`bash
npm --prefix affiliate-mock run build:p0-full-traceability
npm --prefix affiliate-mock run test:p0-full-traceability
npm --prefix affiliate-mock run test:p0-full-contract
\`\`\`

## 7. Maintenance Record

| Date | Version | Change |
| --- | --- | --- |
| 2026-11-18 | v0.1 | Generated the first full lane-1 P0 traceability index from the Feature Backlog, minimum-loop JSON, 321-operation inventory, implemented event schema, and Metric Catalog; added candidate OpenAPI/schema/manifest reconciliation. |
| 2026-11-18 | v0.2 | Expanded minimum-loop coverage to all 32 lane-1 features, refreshed canonical counts, and split the candidate package into unambiguous schemas and owner-gated schema conflicts. |
| 2026-11-19 | v0.3 | Recorded 20 owner-selected candidate schema definitions and refreshed the candidate boundary to 136 selected schemas with zero unresolved schema conflicts. |
`;
}

function renderChinese(result) {
  const featureRows = result.featureIndex.map((feature) => {
    const operationCount = feature.minimumLoop?.operations.length ?? 0;
    const eventCount = feature.minimumLoop?.targetEvents.length ?? 0;
    const objectCount = feature.minimumLoop?.objects.length ?? 0;
    return `| ${feature.featureId} | ${feature.module} | ${feature.requirements.length} | ${operationCount} | ${eventCount} | ${objectCount} | ${feature.candidateInventoryOperations.length} | ${feature.eventCoverage.length} | ${feature.candidateMetricIds.length} | ${feature.coverageStatus} |`;
  }).join('\n');
  return `# P0全量追踪索引 V1

版本：v0.3
日期：2026-11-19
负责人：Affiliate研发角色 / 产品负责人角色
对应英文文档：[\`P0-FULL-TRACEABILITY-INDEX-V1.md\`](../../PRD_EN/contracts/P0-FULL-TRACEABILITY-INDEX-V1.md)
机器可读源：[\`p0-full-traceability-index-v1.json\`](../../PRD_EN/contracts/p0-full-traceability-index-v1.json)
同步状态：已同步
权威性：中文审阅版；实施以英文版为准。

> **English Summary**
>
> This Chinese file mirrors the generated lane-1 P0 traceability index for review. Implementation authority remains with the English layer.
>
> **中文摘要**
>
> 本文件是第一车道 P0 全量追踪索引的中文审阅镜像。实施权威仍在英文层。

## 1. 边界

1. 业务语义以英文权威切片为准。
2. 最小闭环JSON及其生成Schema是当前CPA内部Canonical契约基线。
3. 321个operation inventory是候选Mock/OpenAPI证据，不冻结生产端点或适配器。
4. 生成的全量候选包仅整合321个operation、136个选定candidate对象Schema和20个owner-resolved重名Schema决策；operation/指标review映射不代表Canonical闭合。
5. 标记为review的inventory tag和指标族群映射只用于研发导航，契约冻结前需切片负责人确认。
6. CRM、支付、Salesforce、IAM、分析平台、UAT和业务验收的生产门禁仍关闭。

## 2. 覆盖计数

| 层 | 数量 | 边界 |
| --- | ---: | --- |
| 第一车道P0功能 | ${result.counts.p0Features} | 覆盖六个详细P0切片 |
| 引用的唯一P0需求 | ${new Set(result.featureIndex.flatMap((feature) => feature.requirements)).size} | 从功能清单展开 |
| 已盘点候选API operation | ${result.counts.candidateOperations} | Mock/OpenAPI候选，不是生产Canonical |
| 已知事件类型 | ${result.counts.eventTypes} | ${result.counts.implementedEventTypes}个已实现 + ${result.counts.minimumLoopTargetEventTypes}个最小闭环目标 |
| 最小闭环Canonical对象 | ${result.counts.canonicalObjects} | 生成JSON Schema基线 |
| 指标定义 | ${result.counts.metrics} | draft/review定义；无生产published指标 |

## 3. 功能链

JSON是完整索引；下表汇总每个功能当前追踪深度。

| 功能 | 模块 | 需求 | 最小闭环operation | 最小闭环事件 | 最小闭环对象 | 候选API | 事件覆盖 | 指标 | 覆盖 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${featureRows}

## 4. 显式缺口

1. 32个第一车道P0功能均已有最小闭环operation/event/object覆盖；ONB-04、ATTR-03和RISK-06不再是结构缺口。
2. ${result.counts.candidateOperations}个候选operation中有${result.gaps.operationsWithoutP0Feature}个属于治理、报表、翻译债或后续范围，不归属这32个第一车道P0功能。
3. 未映射operation为${result.gaps.unmappedOperations}个，未映射事件为${result.gaps.unmappedEvents}个；后续生成索引必须保持为零。
4. 指标到功能的映射均为族群级推断，指标发布或报表实施前需指标负责人评审。
5. 最小闭环之外的完整Canonical Schema生成仍属模块工作；本索引不声明全量P0 Schema闭合。

## 5. 研发用法

\`\`\`text
AFF-REQ -> FEATURE -> module -> slice
        -> 最小闭环operation/event/object
        -> 候选inventory operation
        -> 指标血缘
        -> 未关闭生产门禁
\`\`\`

实施入场读取JSON的\`featureIndex\`，API对账读取\`operationIndex\`，事件闭合读取\`eventIndex\`，对象归属读取\`objectIndex\`，指标血缘评审读取\`metricIndex\`。

## 6. 验证

\`\`\`bash
npm --prefix affiliate-mock run build:p0-full-traceability
npm --prefix affiliate-mock run test:p0-full-traceability
npm --prefix affiliate-mock run test:p0-full-contract
\`\`\`

## 7. 维护记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-11-18 | v0.1 | 从功能清单、最小闭环JSON、321 operation inventory、已实现事件Schema和指标目录生成第一版第一车道P0全量追踪索引；补充候选OpenAPI/Schema/manifest对账。 |
| 2026-11-18 | v0.2 | 最小闭环覆盖扩展到32个第一车道功能，刷新Canonical计数，并将候选包拆分为无歧义Schema和owner决策Schema冲突。 |
| 2026-11-19 | v0.3 | 记录20个owner-selected candidate Schema定义，并将候选边界刷新为136个选定Schema、0个未解决Schema冲突。 |
`;
}

build();
