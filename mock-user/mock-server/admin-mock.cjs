const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const fixturePath = path.join(__dirname, "..", "fixtures", "admin-core.json");
const cxFixturePath = path.join(__dirname, "..", "fixtures", "cx-scenarios.json");
const defaultPort = Number(process.env.ADMIN_MOCK_PORT || 4020);
let traceNumber = 0;

const roles = {
  system_admin: {id: "system_admin", name: "系统管理员"},
  operations: {id: "operations", name: "运营"},
  risk: {id: "risk", name: "风控"},
  finance: {id: "finance", name: "财务"},
  compliance: {id: "compliance", name: "合规"},
  audit: {id: "audit", name: "审计只读"}
};

const actionRoles = {
  freeze: ["system_admin", "risk"],
  restore: ["system_admin", "risk"],
  terminate: ["system_admin", "risk", "compliance"],
  confirm: ["system_admin", "risk", "finance"],
  reverse: ["system_admin", "risk", "finance"],
  approve: ["system_admin", "finance"],
  reject: ["system_admin", "finance"],
  "retry-payment": ["system_admin", "finance"],
  retry: ["system_admin"]
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function traceId() {
  traceNumber += 1;
  return `trace-${String(traceNumber).padStart(6, "0")}`;
}

function money(value) {
  if (!value) return {"currency": "USD", "amount_minor": "0"};
  return {"currency": value.currency || "USD", "amount_minor": String(value.amount_minor ?? "0")};
}

function paginate(items, searchParams) {
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("page_size") || 20)));
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    page_size: pageSize,
    total,
    pages
  };
}

function keywordMatch(row, fields, keyword) {
  if (!keyword) return true;
  const needle = keyword.toLowerCase();
  return fields.some(field => String(row[field] || "").toLowerCase().includes(needle));
}

function listPartners(data, searchParams) {
  const keyword = searchParams.get("keyword");
  const status = searchParams.get("status");
  const riskBand = searchParams.get("risk_band");
  const countryCode = searchParams.get("country_code");
  return data.partners.filter(row =>
    keywordMatch(row, ["partner_id", "partner_code", "display_name", "email_masked"], keyword) &&
    (!status || row.status === status) &&
    (!riskBand || row.risk_band === riskBand) &&
    (!countryCode || row.country_code === countryCode)
  );
}

function listClients(data, searchParams) {
  const keyword = searchParams.get("keyword");
  const stage = searchParams.get("conversion_stage");
  const partnerId = searchParams.get("partner_id");
  const riskBand = searchParams.get("risk_band");
  return data.clients.filter(row =>
    keywordMatch(row, ["client_id", "email_masked", "phone_masked", "traffic_campaign"], keyword) &&
    (!stage || row.conversion_stage === stage) &&
    (!partnerId || row.partner_id === partnerId) &&
    (!riskBand || row.risk_band === riskBand)
  );
}

function listCommissions(data, searchParams) {
  const keyword = searchParams.get("keyword");
  const status = searchParams.get("status");
  const partnerId = searchParams.get("partner_id");
  const clientId = searchParams.get("client_id");
  const caseType = searchParams.get("case_type");
  return data.commissions.filter(row =>
    keywordMatch(row, ["commission_id", "partner_id", "client_id", "settlement_id"], keyword) &&
    (!status || row.status === status) &&
    (!partnerId || row.partner_id === partnerId) &&
    (!clientId || row.client_id === clientId) &&
    (!caseType || row.case_type === caseType)
  );
}

function listWithdrawals(data, searchParams) {
  const keyword = searchParams.get("keyword");
  const status = searchParams.get("status");
  const partnerId = searchParams.get("partner_id");
  const method = searchParams.get("method");
  return data.withdrawals.filter(row =>
    keywordMatch(row, ["withdrawal_id", "partner_id", "integration_task_id"], keyword) &&
    (!status || row.status === status) &&
    (!partnerId || row.partner_id === partnerId) &&
    (!method || row.method === method)
  );
}

function listIntegrationTasks(data, searchParams) {
  const keyword = searchParams.get("keyword");
  const status = searchParams.get("status");
  const externalSystem = searchParams.get("external_system");
  return data.integration_tasks.filter(row =>
    keywordMatch(row, ["task_id", "business_ref_id", "external_ref_id", "last_error"], keyword) &&
    (!status || row.status === status) &&
    (!externalSystem || row.external_system === externalSystem)
  );
}

function partnerDetail(data, id) {
  const partner = data.partners.find(row => row.partner_id === id);
  if (!partner) return null;
  const detail = clone(partner);
  detail.commissions = data.commissions.filter(row => row.partner_id === id);
  detail.clients = data.clients.filter(row => row.partner_id === id);
  detail.withdrawals = data.withdrawals.filter(row => row.partner_id === id);
  return detail;
}

function clientDetail(data, id) {
  const client = data.clients.find(row => row.client_id === id);
  if (!client) return null;
  const detail = clone(client);
  detail.partner = data.partners.find(row => row.partner_id === client.partner_id) || null;
  detail.commissions = data.commissions.filter(row => row.client_id === id);
  return detail;
}

function commissionDetail(data, id) {
  const commission = data.commissions.find(row => row.commission_id === id);
  if (!commission) return null;
  const detail = clone(commission);
  detail.partner = data.partners.find(row => row.partner_id === commission.partner_id) || null;
  detail.client = data.clients.find(row => row.client_id === commission.client_id) || null;
  detail.calculation = [
    {"step": "gross_amount", ...money(commission)},
    {"step": "tax", ...money({currency: commission.currency, amount_minor: commission.tax_amount_minor})},
    {"step": "rolling_guarantee", ...money({currency: commission.currency, amount_minor: commission.guarantee_amount_minor})},
    {"step": "net_amount", ...money({currency: commission.currency, amount_minor: commission.net_amount_minor})}
  ];
  return detail;
}

function withdrawalDetail(data, id) {
  const withdrawal = data.withdrawals.find(row => row.withdrawal_id === id);
  if (!withdrawal) return null;
  const detail = clone(withdrawal);
  detail.partner = data.partners.find(row => row.partner_id === withdrawal.partner_id) || null;
  detail.integration_task = data.integration_tasks.find(row => row.task_id === withdrawal.integration_task_id) || null;
  return detail;
}

function integrationTaskDetail(data, id) {
  const task = data.integration_tasks.find(row => row.task_id === id);
  if (!task) return null;
  const detail = clone(task);
  if (task.business_type === "payment") {
    detail.withdrawal = data.withdrawals.find(row => row.withdrawal_id === task.business_ref_id) || null;
  }
  if (task.business_type === "kyc_sync") {
    detail.client = data.clients.find(row => row.client_id === task.business_ref_id) || null;
  }
  return detail;
}

function cxEligibility(data, cx, partnerId, scenario) {
  const profile = cx.traffic_profiles.find(row => row.partner_id === partnerId);
  const gate = clone(cx.onboarding_gate_config);
  if (scenario === "onboarding_gate_disabled") gate.gate_enabled = false;
  const profilePassed = !gate.gate_enabled || Boolean(profile && profile.status === "approved" && !profile.missing_fields?.length);
  const partner = data.partners.find(row => row.partner_id === partnerId);
  const hardRiskPassed = !partner || !["frozen", "terminated"].includes(partner.status);
  const stagingPassed = scenario !== "staging_signoff_missing";
  return {
    partner_id: partnerId,
    eligible: profilePassed && hardRiskPassed && stagingPassed,
    profile_gate_required: gate.gate_enabled,
    profile_gate_passed: profilePassed,
    hard_risk_passed: hardRiskPassed,
    staging_gate_passed: stagingPassed,
    blocking_reasons: [
      ...(!profilePassed ? ["TRAFFIC_PROFILE_REQUIRED"] : []),
      ...(!hardRiskPassed ? ["HARD_RISK_BLOCKED"] : []),
      ...(!stagingPassed ? ["STAGING_SIGNOFF_MISSING"] : [])
    ],
    internal_gate_config_exposed: false
  };
}

function resolveCxGet(data, cx, pathname, searchParams, scenario) {
  let match = null;

  if ((match = pathname.match(/^\/partners\/([^/]+)\/traffic-profile$/))) {
    const profile = cx.traffic_profiles.find(row => row.partner_id === match[1]);
    if (!profile) return {status: 404, code: "NOT_FOUND", message: "流量画像不存在"};
    return {status: 200, data: profile};
  }
  if ((match = pathname.match(/^\/partners\/([^/]+)\/link-eligibility$/))) {
    return {status: 200, data: cxEligibility(data, cx, match[1], scenario)};
  }
  if (pathname === "/official-paths") {
    return {status: 200, data: paginate(cx.official_paths.filter(row => row.status === "enabled"), searchParams)};
  }
  if (pathname === "/admin/configs/domain-policies") return {status: 200, data: cx.domain_policy};
  if (pathname === "/admin/configs/onboarding-gate") {
    const gate = clone(cx.onboarding_gate_config);
    if (scenario === "onboarding_gate_disabled") {
      gate.gate_enabled = false;
      gate.close_reason = "temporary_staging_test";
      gate.closed_by = "risk-01";
    }
    return {status: 200, data: gate};
  }
  if (pathname === "/admin/configs/official-paths") return {status: 200, data: paginate(cx.official_paths, searchParams)};
  if (pathname === "/admin/configs/click-risk-rules") return {status: 200, data: paginate(cx.click_rules, searchParams)};
  if (pathname === "/admin/integration/event-integrity") return {status: 200, data: paginate(cx.event_integrity, searchParams)};
  if ((match = pathname.match(/^\/admin\/integration\/event-integrity\/([^/]+)$/))) {
    const row = cx.event_integrity.find(item => item.stage === match[1]);
    return row ? {status: 200, data: row} : {status: 404, code: "NOT_FOUND", message: "事件阶段不存在"};
  }
  if (pathname === "/admin/reports/attribution-health") return {status: 200, data: paginate(cx.attribution_health, searchParams)};
  if (pathname === "/admin/risk-case-groups") return {status: 200, data: paginate(cx.risk_case_groups, searchParams)};
  if (pathname === "/admin/risk/baselines") return {status: 200, data: paginate(cx.baselines, searchParams)};
  if (pathname === "/admin/reviews/investigations") return {status: 200, data: paginate(cx.investigations, searchParams)};
  if ((match = pathname.match(/^\/admin\/reviews\/([^/]+)\/commission-links$/))) {
    const rows = cx.risk_commission_links.filter(row => row.case_group_id === match[1]);
    return rows.length ? {status: 200, data: rows} : {status: 404, code: "NOT_FOUND", message: "风险案件不存在"};
  }
  if ((match = pathname.match(/^\/finance\/commission-cases\/([^/]+)\/risk-links$/))) {
    const rows = cx.risk_commission_links.filter(row => row.commission_case_id === match[1]);
    return rows.length ? {status: 200, data: rows} : {status: 404, code: "NOT_FOUND", message: "佣金案件无风险关联"};
  }
  if (pathname === "/admin/quarantines") {
    return {status: 200, data: {...paginate(cx.quarantines, searchParams), config: clone(cx.quarantine_config)}};
  }
  if (pathname === "/admin/configs/quarantine-queue") return {status: 200, data: cx.quarantine_config};
  if (pathname === "/admin/staging-runs") {
    const rows = scenario === "staging_signoff_missing"
      ? cx.staging_runs.filter(row => row.gate_result !== "passed")
      : cx.staging_runs;
    return {status: 200, data: paginate(rows, searchParams)};
  }
  if ((match = pathname.match(/^\/admin\/configs\/shadow-runs\/([^/]+)$/))) {
    const row = cx.shadow_runs.find(item => item.shadow_run_id === match[1]);
    return row ? {status: 200, data: row} : {status: 404, code: "NOT_FOUND", message: "影子运行不存在"};
  }
  if ((match = pathname.match(/^\/admin\/partners\/([^/]+)\/operation-tags$/))) {
    return {status: 200, data: cx.operation_tags.filter(row => row.partner_id === match[1])};
  }
  if (pathname === "/admin/data-governance/policies") return {status: 200, data: paginate(cx.governance_policies, searchParams)};
  if (pathname === "/admin/reports/quality-economics") return {status: 200, data: paginate(cx.quality_economics, searchParams)};
  if (pathname === "/admin/reports/audit-packs") return {status: 200, data: paginate(cx.reserved.audit_packs, searchParams)};
  if (pathname === "/admin/assets/landing-patrols") return {status: 200, data: paginate(cx.reserved.asset_patrols, searchParams)};
  if ((match = pathname.match(/^\/subchannels\/([^/]+)\/risk-state$/))) {
    const row = cx.reserved.subchannel_risk_states.find(item => item.subchannel_id === match[1]);
    return row ? {status: 200, data: row} : {status: 404, code: "NOT_FOUND", message: "二级渠道预留状态不存在"};
  }
  if (pathname === "/admin/schema-extensions/multi-level") return {status: 200, data: cx.reserved.multi_level};
  if (pathname === "/admin/configs/advanced-tier-pricing") return {status: 200, data: cx.reserved.advanced_tier_pricing};
  return null;
}

function resolveCxWrite(cx, pathname, input, role, scenario) {
  let match = null;

  if ((match = pathname.match(/^\/partners\/([^/]+)\/traffic-profile\/review$/))) {
    const profile = cx.traffic_profiles.find(row => row.partner_id === match[1]);
    if (!profile) return {status: 404, code: "NOT_FOUND", message: "流量画像不存在"};
    const result = input.result || (profile.missing_fields.length ? "pending_review" : "approved");
    profile.status = result === "approved" ? "approved" : result;
    return {status: 200, data: {partner_id: match[1], profile_version: profile.profile_version, result: profile.status, audit_recorded: true}};
  }
  if (pathname === "/deep-links/validate-target") {
    const target = String(input.target_path || input.path || "");
    const row = cx.official_paths.find(item => item.path === target || item.official_path_id === target);
    if (row && row.status === "enabled") {
      return {status: 200, data: {valid: true, generated: true, official_path_id: row.official_path_id, path_version: row.version, official_domain: cx.domain_policy.official_domain}};
    }
    return {status: 200, data: {valid: false, generated: false, reason_code: row ? "OFFICIAL_PATH_DISABLED" : "TARGET_NOT_IN_LIBRARY", audit_recorded: true}};
  }
  if (pathname === "/admin/configs/onboarding-gate") {
    if (!["risk", "compliance", "system_admin"].includes(role)) return {status: 403, code: "FORBIDDEN", message: "当前角色无权修改画像门禁"};
    if (input.gate_enabled === false && !input.reason) return {status: 422, code: "REASON_REQUIRED", message: "关闭画像门禁必须填写原因"};
    Object.assign(cx.onboarding_gate_config, input, {version: cx.onboarding_gate_config.version + 1});
    return {status: 200, data: {gate_enabled: cx.onboarding_gate_config.gate_enabled, version: cx.onboarding_gate_config.version, audit_recorded: true}};
  }
  if (pathname === "/events/click/risk-evaluation") {
    const rule = cx.click_rules[0];
    const hit = scenario === "click_risk_observed" || input.risk_codes?.length;
    return {status: 200, data: {
      click_id: input.click_id || "click-mock-001",
      risk_codes: hit ? (input.risk_codes || rule.risk_codes.slice(0, 2)) : [],
      rule_id: rule.rule_id,
      rule_version: rule.rule_version,
      parameter_version: rule.parameter_version,
      evidence_ids: hit ? ["evidence-click-001"] : [],
      effective_click_result: hit ? "invalid" : "valid",
      attribution_blocked: hit
    }};
  }
  if (pathname === "/admin/integration/attribution-integrity-checks") {
    return {status: 200, data: {...clone(cx.attribution_check), task_generated: true, attribution_rule_changed: false}};
  }
  if ((match = pathname.match(/^\/admin\/risk-case-groups\/([^/]+)\/split$/))) {
    if (!["risk", "system_admin"].includes(role)) return {status: 403, code: "FORBIDDEN", message: "仅风控可拆分案件组"};
    if (!input.split_reason) return {status: 422, code: "REASON_REQUIRED", message: "拆分必须填写原因"};
    const row = cx.risk_case_groups.find(item => item.case_group_id === match[1]);
    if (!row) return {status: 404, code: "NOT_FOUND", message: "案件组不存在"};
    row.split_status = "split";
    row.status = "split";
    return {status: 200, data: {case_group_id: row.case_group_id, split_status: row.split_status, split_members: input.member_ids || [], group_conclusion_inherited: false, audit_recorded: true}};
  }
  if (pathname === "/admin/reviews/investigations") {
    return {status: 200, data: {task_id: "inv-created-001", status: "materials_requested", response_sla_hours: 72, link_restriction_level: input.risk_level === "high" ? "all_links" : "new_links", commission_calculated: true, auto_settlement_blocked: true}};
  }
  if ((match = pathname.match(/^\/admin\/reviews\/investigations\/([^/]+)\/conclude$/))) {
    const row = cx.investigations.find(item => item.task_id === match[1]);
    if (!row) return {status: 404, code: "NOT_FOUND", message: "调查任务不存在"};
    row.status = "closed";
    row.auto_settlement_blocked = input.conclusion === "risk_confirmed";
    return {status: 200, data: {task_id: row.task_id, status: row.status, auto_settlement_blocked: row.auto_settlement_blocked, audit_recorded: true}};
  }
  if (pathname === "/admin/quarantines") {
    if (input.d_plus_n_days) {
      if (!["risk", "finance", "system_admin"].includes(role)) return {status: 403, code: "FORBIDDEN", message: "当前角色无权修改D+N阈值"};
      cx.quarantine_config.d_plus_n_days = Number(input.d_plus_n_days);
      return {status: 200, data: {d_plus_n_days: cx.quarantine_config.d_plus_n_days, hard_coded: false, audit_recorded: true}};
    }
    return {status: 200, data: {quarantine_id: "quar-created-001", source_type: input.source_type || "investigation", blocked_settlement: true, recheck_required: true}};
  }
  if ((match = pathname.match(/^\/admin\/quarantines\/([^/]+)\/release$/))) {
    const row = cx.quarantines.find(item => item.quarantine_id === match[1]);
    if (!row) return {status: 404, code: "NOT_FOUND", message: "隔离记录不存在"};
    row.blocked_settlement = false;
    row.recheck_result = "passed";
    return {status: 200, data: {quarantine_id: row.quarantine_id, blocked_settlement: false, settlement_recheck: "passed", direct_payment: false, audit_recorded: true}};
  }
  if ((match = pathname.match(/^\/admin\/staging-runs\/([^/]+)\/signoffs$/))) {
    const row = cx.staging_runs.find(item => item.run_id === match[1]);
    if (!row) return {status: 404, code: "NOT_FOUND", message: "staging任务不存在"};
    if (!["risk", "finance", "compliance"].includes(role)) return {status: 403, code: "FORBIDDEN", message: "仅对应签核角色可提交"};
    if (row.signoffs.some(item => item.role === role)) return {status: 409, code: "SIGNOFF_ALREADY_EXISTS", message: "该角色已签核"};
    row.signoffs.push({run_id: row.run_id, role, result: input.result || "approved", comment: input.comment || "", signed_at: new Date().toISOString()});
    const rolesPresent = new Set(row.signoffs.map(item => item.role));
    row.gate_result = ["risk", "finance", "compliance"].every(item => rolesPresent.has(item)) && row.automated_result === "passed" && row.fund_reconciliation_diff.amount_minor === "0" ? "passed" : "pending_signoff";
    return {status: 200, data: row};
  }
  if (pathname === "/admin/staging-runs") {
    return {status: 200, data: {run_id: "staging-created-001", automated_result: scenario === "staging_signoff_missing" ? "passed" : "passed", fund_reconciliation_diff: {currency: "USD", amount_minor: "0"}, gate_result: "pending_signoff", signoffs: []}};
  }
  if (pathname === "/admin/configs/shadow-runs") return {status: 200, data: {...clone(cx.shadow_runs[0]), live_rule_changed: false, production_fund_affected: false}};
  if ((match = pathname.match(/^\/admin\/partners\/([^/]+)\/operation-tags$/))) {
    return {status: 200, data: {tag_id: "tag-created-001", partner_id: match[1], value: input.value || "watch_list", audit_recorded: true, benefit_changed: false}};
  }
  if (["/admin/data-governance/exports", "/admin/data-governance/deletions", "/admin/data-governance/breach-incidents"].includes(pathname)) {
    return {status: 200, data: {task_id: `gov-${Date.now()}`, type: pathname.split("/").pop(), status: "pending_approval", async: true, masked: true, expires_in_hours: 24, audit_recorded: true}};
  }
  if (pathname === "/dev/contract/checks") {
    return {status: 200, data: {openapi_valid: true, schema_valid: true, mock_consistent: true, errors: []}};
  }
  return null;
}

function resolveCxDelete(cx, pathname, role, trace) {
  const match = pathname.match(/^\/admin\/partners\/([^/]+)\/operation-tags\/([^/]+)$/);
  if (!match) return null;
  if (!["system_admin", "operations", "compliance"].includes(role)) {
    return {status: 403, code: "FORBIDDEN", message: "当前角色无权移除运营标签"};
  }
  const index = cx.operation_tags.findIndex(item => item.partner_id === match[1] && item.tag_id === match[2]);
  if (index < 0) return {status: 404, code: "NOT_FOUND", message: "运营标签不存在"};
  cx.operation_tags.splice(index, 1);
  return {status: 200, data: {partner_id: match[1], tag_id: match[2], removed: true, audit_id: `audit-tag-remove-${trace}`}};
}

function isCxWritePath(pathname) {
  return pathname === "/deep-links/validate-target" ||
    pathname === "/events/click/risk-evaluation" ||
    pathname.endsWith("/traffic-profile/review") ||
    pathname.endsWith("/split") ||
    pathname.endsWith("/conclude") ||
    pathname.endsWith("/release") ||
    pathname.endsWith("/signoffs") ||
    [
      "/admin/configs/onboarding-gate",
      "/admin/configs/domain-policies",
      "/admin/configs/official-paths",
      "/admin/configs/shadow-runs",
      "/admin/configs/advanced-tier-pricing",
      "/admin/integration/attribution-integrity-checks",
      "/admin/reviews/investigations",
      "/admin/quarantines",
      "/admin/staging-runs",
      "/admin/data-governance/exports",
      "/admin/data-governance/deletions",
      "/admin/data-governance/breach-incidents",
      "/admin/reports/audit-packs",
      "/dev/contract/checks"
    ].includes(pathname);
}

function dashboard(data, role) {
  const commissionTotal = data.commissions.reduce((sum, row) => sum + Number(row.gross_amount_minor), 0);
  const holding = data.commissions.filter(row => row.status === "holding").length;
  const pendingWithdrawals = data.withdrawals.filter(row => row.status === "pending_review").length;
  const failedTasks = data.integration_tasks.filter(row => ["failed", "retrying"].includes(row.status)).length;
  const todos = [
    {"id": "todo-01", "type": "withdrawal_review", "title": "提现待审核", "count": pendingWithdrawals, "route": "#/withdrawals", "roles": ["system_admin", "finance"]},
    {"id": "todo-02", "type": "commission_review", "title": "佣金人工确认", "count": data.commissions.filter(row => row.status === "manual_review").length, "route": "#/commissions", "roles": ["system_admin", "risk", "finance"]},
    {"id": "todo-03", "type": "integration_failed", "title": "集成任务异常", "count": failedTasks, "route": "#/system/integrations/tasks", "roles": ["system_admin", "audit"]},
    {"id": "todo-04", "type": "partner_risk", "title": "高风险合作方", "count": data.partners.filter(row => ["R3", "R4"].includes(row.risk_band)).length, "route": "#/partners", "roles": ["system_admin", "risk", "compliance", "audit"]}
  ].filter(item => item.roles.includes(role));
  return {
    metrics: [
      {"key": "active_partners", "label": "活跃合作方", "value": data.partners.filter(row => row.status === "active").length},
      {"key": "valid_ftd", "label": "有效FTD客户", "value": data.clients.filter(row => ["valid_ftd", "quality_service"].includes(row.conversion_stage)).length},
      {"key": "holding_cases", "label": "暂扣佣金案件", "value": holding},
      {"key": "commission_gross", "label": "佣金总额", "value": {"currency": "USD", "amount_minor": String(commissionTotal)}}
    ],
    todos
  };
}

function resolveGet(data, pathname, searchParams, role) {
  if (pathname === "/session") {
    return {
      user: {"sso_subject": "sso-user-7020", "display_name": "Admin Mock User", "email_masked": "a***@example.com"},
      role: roles[role] || roles.system_admin,
      available_roles: Object.values(roles),
      environment: "local-mock",
      api_version: "v1"
    };
  }
  if (pathname === "/dashboard") return dashboard(data, role);
  if (pathname === "/partners") return paginate(listPartners(data, searchParams), searchParams);
  if (pathname.startsWith("/partners/")) return partnerDetail(data, pathname.slice(10));
  if (pathname === "/clients") return paginate(listClients(data, searchParams), searchParams);
  if (pathname.startsWith("/clients/")) return clientDetail(data, pathname.slice(9));
  if (pathname === "/commissions") return paginate(listCommissions(data, searchParams), searchParams);
  if (pathname.startsWith("/commissions/")) return commissionDetail(data, pathname.slice(13));
  if (pathname === "/withdrawals") return paginate(listWithdrawals(data, searchParams), searchParams);
  if (pathname.startsWith("/withdrawals/")) return withdrawalDetail(data, pathname.slice(13));
  if (pathname === "/integration-tasks") return paginate(listIntegrationTasks(data, searchParams), searchParams);
  if (pathname.startsWith("/integration-tasks/")) return integrationTaskDetail(data, pathname.split("/")[2]);
  return null;
}

function resolveAction(data, pathname, action, role, reason) {
  const allowed = actionRoles[action] || [];
  if (!allowed.includes(role)) {
    return {"status": 403, "code": "FORBIDDEN", "message": "当前角色无权执行此操作"};
  }
  if (!reason && ["terminate", "reverse", "reject", "freeze"].includes(action)) {
    return {"status": 422, "code": "REASON_REQUIRED", "message": "此操作必须填写原因"};
  }

  let row = null;
  const objectId = pathname.split("/actions")[0].split("/").pop();
  if (pathname.startsWith("/partners/")) {
    row = data.partners.find(item => item.partner_id === objectId);
    if (row && action === "freeze") row.status = "frozen";
    if (row && action === "restore") row.status = "active";
    if (row && action === "terminate") row.status = "terminated";
  } else if (pathname.startsWith("/commissions/")) {
    row = data.commissions.find(item => item.commission_id === objectId);
    if (row && action === "confirm") {row.status = "settled"; row.manual_review_required = false;}
    if (row && action === "reverse") {row.status = "reversed"; row.reversal_reason = reason || "manual_reverse";}
  } else if (pathname.startsWith("/withdrawals/")) {
    row = data.withdrawals.find(item => item.withdrawal_id === objectId);
    if (row && action === "approve") row.status = "approved";
    if (row && action === "reject") {row.status = "rejected"; row.failure_reason = reason || "rejected_by_admin";}
    if (row && action === "retry-payment") row.status = "paying";
  } else if (pathname.startsWith("/integration-tasks/")) {
    row = data.integration_tasks.find(item => item.task_id === objectId);
    if (row && action === "retry") {row.status = "retrying"; row.retry_count += 1;}
  }
  if (!row) return {"status": 404, "code": "NOT_FOUND", "message": "业务对象不存在"};
  row.updated_at = new Date().toISOString();
  return {"status": 200, "data": {"object_id": row.partner_id || row.commission_id || row.withdrawal_id || row.task_id, "action": action, "status": row.status, "audit_recorded": true}};
}

function sendJson(response, statusCode, body, headers = {}) {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Mock-Role, X-Mock-Scenario",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    ...headers
  });
  response.end(payload);
}

function success(response, data, trace) {
  sendJson(response, 200, {"code": "OK", "message": "success", "data": data, "trace_id": trace});
}

function failure(response, statusCode, code, message, trace, details = []) {
  sendJson(response, statusCode, {"code": code, "message": message, "trace_id": trace, "details": details});
}

function createServer(options = {}) {
  let data = clone(JSON.parse(fs.readFileSync(options.fixturePath || fixturePath, "utf8")));
  const cxData = clone(JSON.parse(fs.readFileSync(options.cxFixturePath || cxFixturePath, "utf8")).data);
  const idempotencyCache = new Map();
  return http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const pathname = url.pathname.replace(/^\/admin\/api\/v1/, "");
    const trace = traceId();
    const role = request.headers["x-mock-role"] || "system_admin";
    const scenario = request.headers["x-mock-scenario"] || "success";

    if (request.method === "OPTIONS") return sendJson(response, 204, {});
    if (!String(request.headers.authorization || "").startsWith("Bearer ")) {
      return failure(response, 401, "UNAUTHORIZED", "缺少 Bearer Token", trace);
    }
    if (!roles[role]) {
      return failure(response, 422, "INVALID_ROLE", "Mock 角色无效", trace, [{"field": "X-Mock-Role"}]);
    }
    if (scenario === "forbidden") {
      return failure(response, 403, "FORBIDDEN", "当前角色无权访问此资源", trace);
    }
    if (scenario === "external_timeout") {
      return failure(response, 504, "EXTERNAL_TIMEOUT", "外部系统超时，任务已进入重试队列", trace);
    }

    if (request.method === "GET") {
      if (scenario === "empty" && !["/session", "/dashboard"].includes(pathname)) {
        return success(response, {"items": [], "page": 1, "page_size": 20, "total": 0, "pages": 1}, trace);
      }
      const cxResult = resolveCxGet(data, cxData, pathname, url.searchParams, scenario);
      if (cxResult?.status && cxResult.status !== 200) return failure(response, cxResult.status, cxResult.code, cxResult.message, trace);
      const result = cxResult ? cxResult.data : resolveGet(data, pathname, url.searchParams, role);
      if (!result && pathname !== "/session") return failure(response, 404, "NOT_FOUND", "接口不存在", trace);
      if (pathname === "/integration-tasks" && !["system_admin", "audit"].includes(role)) {
        return failure(response, 403, "FORBIDDEN", "当前角色无权查看集成任务", trace);
      }
      return success(response, result, trace);
    }

    if (["POST", "PATCH", "DELETE", "PUT"].includes(request.method)) {
      let body = "";
      request.on("data", chunk => {body += chunk;});
      request.on("end", () => {
        try {
          const input = body ? JSON.parse(body) : {};
          if (scenario === "delayed_callback") {
            return success(response, {"object_id": input.object_id || "unknown", "action": "delayed_callback", "status": "processing", "callback_status": "delayed", "audit_recorded": true}, trace);
          }
          if (scenario === "retrying") {
            return success(response, {"object_id": input.object_id || "unknown", "action": "retry", "status": "retrying", "retry_count": 1, "audit_recorded": true}, trace);
          }
          if (request.method === "DELETE") {
            const deleteResult = resolveCxDelete(cxData, pathname, role, trace);
            if (!deleteResult) return failure(response, 404, "NOT_FOUND", "操作接口不存在", trace);
            if (deleteResult.status !== 200) return failure(response, deleteResult.status, deleteResult.code, deleteResult.message, trace);
            return success(response, deleteResult.data, trace);
          }

          if (request.method === "PATCH" && pathname.endsWith("/risk-state")) {
            return success(response, {reserved_only: true, enabled: false, production_entry: false}, trace);
          }

          if (isCxWritePath(pathname)) {
            const idempotencyKey = String(request.headers["idempotency-key"] || input.idempotency_key || "");
            if (idempotencyKey.length < 8) {
              return failure(response, 422, "IDEMPOTENCY_KEY_REQUIRED", "CX写接口必须提供Idempotency-Key", trace, [{"field": "Idempotency-Key"}]);
            }
            if (!input.reason && !input.split_reason && pathname !== "/deep-links/validate-target" && pathname !== "/events/click/risk-evaluation") {
              return failure(response, 422, "REASON_REQUIRED", "CX写接口必须填写原因", trace, [{"field": "reason"}]);
            }
            const cacheKey = `${request.method}:${pathname}:${idempotencyKey}:${JSON.stringify(input)}`;
            if (idempotencyCache.has(cacheKey)) {
              const replay = clone(idempotencyCache.get(cacheKey));
              replay.idempotent_replay = true;
              return success(response, replay, trace);
            }
            const cxResult = resolveCxWrite(cxData, pathname, input, role, scenario);
            if (!cxResult) return failure(response, 404, "NOT_FOUND", "CX操作接口不存在", trace);
            if (cxResult.status !== 200) return failure(response, cxResult.status, cxResult.code, cxResult.message, trace);
            if (pathname !== "/dev/contract/checks" && input.self_review === true) {
              cxResult.data.approval_record = {
                applicant_id: "admin-mock-user",
                approver_id: "admin-mock-user",
                self_review: true,
                result: "approved",
                submitted_audit_id: `audit-submit-${trace}`,
                approval_audit_id: `audit-approve-${trace}`
              };
            } else if (pathname !== "/dev/contract/checks") {
              cxResult.data.approval_record = {
                applicant_id: "admin-mock-user",
                approver_id: "approver-mock-user",
                self_review: false,
                result: "pending_approval",
                submitted_audit_id: `audit-submit-${trace}`
              };
            }
            idempotencyCache.set(cacheKey, cxResult.data);
            return success(response, cxResult.data, trace);
          }
          const actionMatch = pathname.match(/\/actions\/([a-z-]+)$/);
          if (!actionMatch) return failure(response, 404, "NOT_FOUND", "操作接口不存在", trace);
          const result = resolveAction(data, pathname, actionMatch[1], role, input.reason);
          if (result.status !== 200) return failure(response, result.status, result.code, result.message, trace);
          return success(response, result.data, trace);
        } catch (error) {
          return failure(response, 400, "INVALID_JSON", "请求体不是合法 JSON", trace, [{"issue": error.message}]);
        }
      });
      return undefined;
    }

    return failure(response, 405, "METHOD_NOT_ALLOWED", "不支持的请求方法", trace);
  });
}

function startAdminMockServer(port = defaultPort) {
  const server = createServer();
  return new Promise(resolve => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

if (require.main === module) {
  startAdminMockServer().then(() => {
    console.log(`Affiliate admin mock listening on http://127.0.0.1:${defaultPort}/admin/api/v1`);
  });
}

module.exports = {createServer, startAdminMockServer};
