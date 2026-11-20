/* 管理端 1.0 —— 业务配置 / 系统配置演示数据（虚构；生产值一律“待确认”，Mock 数值仅作演示）。来源：页面 06–10 */
(function () {
  const ADM = window.ADM;
  ADM.approvalTypes.push("配置发布");
  const P = (key, name, value, unit, vs, range) => ({ key, name, value, unit: unit || "", vs: vs || "Mock 演示", range: range || "" });
  const V = (ver, state, by, at, eff, prev, params, extra) => Object.assign({ ver, state, by, at, eff, prev: prev || null, params, approval: null, trial: null, finOk: false, note: "" }, extra || {});
  /* 配置项：owner=可创建/编辑草稿的专业角色；chain=审批链；funds=涉及资金影响（试算须财务确认，且不允许自审） */
  const I = (code, name, domain, owner, chain, funds, versions) => ({ code, name, domain, owner, chain, funds, versions });
  ADM.cfgDomains = ["价格与佣金", "资格与质量升档", "信用与合作者等级", "国家与主体", "归因", "动态结算与护栏", "保证金", "结算与提现", "风险规则", "审批流", "数据治理规则", "官方内容"];
  ADM.cfgItems = [
    I("B01", "价格计划 · 标准", "价格与佣金", "fin", [{ name: "财务复核", role: "fin" }, { name: "运营共同复核（价格影响资格档）", role: "ops" }], true, [
      V("v2", "已锁定", "u-fin1", "2026-10-01", "2026-10-05", "v1", [P("plan_name", "价格计划名称", "标准计划", "", "已确认"), P("ftd_ratio", "首次入金阶段基础比例", 40, "%"), P("valid_ftd_ratio", "有效转化阶段基础比例", 60, "%"), P("quality_bonus", "质量升档附加奖励", "待确认", "", "待评审", "参考 0–20%"), P("base_amount", "基础奖励金额", "待确认", "USD", "待评审", "精度待财务确认")]),
      V("v3", "草稿", "u-fin1", "2026-11-18", null, "v2", [P("plan_name", "价格计划名称", "标准计划", "", "已确认"), P("ftd_ratio", "首次入金阶段基础比例", 35, "%"), P("valid_ftd_ratio", "有效转化阶段基础比例", 65, "%"), P("quality_bonus", "质量升档附加奖励", "待确认", "", "待评审", "参考 0–20%"), P("base_amount", "基础奖励金额", "待确认", "USD", "待评审")], { note: "调整阶段比例" })]),
    I("B02", "奖励资格档", "资格与质量升档", "ops", [{ name: "运营复核", role: "ops" }, { name: "财务共同复核（影响佣金口径）", role: "fin" }], false, [
      V("v4", "已锁定", "u-ops1", "2026-09-20", "2026-09-25", "v3", [P("tier_code", "档位编号", "L1", "", "已确认"), P("ftd_threshold", "首次入金门槛", 3, "客户"), P("valid_ftd_threshold", "有效转化门槛", 5, "客户"), P("lock_event", "锁定时点", "有效转化", "", "已确认")])]),
    I("B03", "质量升档规则", "资格与质量升档", "ops", [{ name: "运营复核", role: "ops" }, { name: "风控共同复核（风险条件）", role: "risk" }], false, [
      V("v2", "审批中", "u-ops2", "2026-11-17", null, "v1", [P("observation_days", "观察期", 30, "天", "待评审", "参考范围待评审"), P("active_trading_days", "最低活跃交易日", 10, "天"), P("minimum_trade_count", "最低交易次数", 3, "次"), P("fail_action", "未达标处理", "保持观察", "", "已确认")], { approval: "AP-3120" }),
      V("v1", "已锁定", "u-ops1", "2026-08-01", "2026-08-05", null, [P("observation_days", "观察期", 30, "天", "待评审"), P("active_trading_days", "最低活跃交易日", 8, "天"), P("minimum_trade_count", "最低交易次数", 2, "次"), P("fail_action", "未达标处理", "保持观察", "", "已确认")])]),
    I("B04", "信用与权益", "信用与合作者等级", "risk", [{ name: "风控复核", role: "risk" }, { name: "财务共同复核（比例、保证金联动）", role: "fin" }], true, [
      V("v3", "已锁定", "u-risk1", "2026-10-10", "2026-10-15", "v2", [P("level", "等级", "C0–C4", "", "已确认"), P("bonus_ratio", "附加比例", "待确认", "%", "待评审"), P("guarantee_adjust", "保证金调整", "待确认", "", "待评审")])]),
    I("B05", "国家与主体", "国家与主体", "ops", [{ name: "运营复核", role: "ops" }, { name: "风控共同复核（风险档）", role: "risk" }, { name: "财务共同复核（币种与收款主体）", role: "fin" }], true, [
      V("v6", "待生效", "u-ops1", "2026-11-15", "2026-11-25 00:00", "v5", [P("countries", "开放国家", "SG, MY, TH, ID, PH, VN +1", "", "已确认"), P("entity", "主体", "SG-01", "", "已确认")], { approval: "AP-0001" }),
      V("v5", "已锁定", "u-ops1", "2026-09-01", "2026-09-05", "v4", [P("countries", "开放国家", "SG, MY, TH, ID, PH, VN", "", "已确认"), P("entity", "主体", "SG-01", "", "已确认")])]),
    I("B06", "归因规则", "归因", "ops", [{ name: "运营复核", role: "ops" }, { name: "系统管理员技术核验", role: "admin" }], false, [
      V("v3", "已锁定", "u-ops1", "2026-09-01", "2026-09-05", "v2", [P("window_days", "归因窗口", 30, "天", "待评审", "不得写死 30，取配置"), P("conflict_policy", "冲突处理", "标记冲突，不取最后点击", "", "已确认")])]),
    I("B07", "动态结算与护栏", "动态结算与护栏", "risk", [{ name: "风控复核", role: "risk" }, { name: "财务复核（资金与风险共同影响）", role: "fin" }], true, [
      V("v4", "生效失败", "u-risk1", "2026-11-12", "2026-11-12", "v3", [P("base_hold_days_R0", "基础结算中天数 R0", 7, "天", "待评审"), P("base_hold_days_R3", "基础结算中天数 R3", 21, "天", "待评审"), P("freeze_threshold_days", "冻结阈值", 30, "天", "待评审", "参考 30，生产值待评审"), P("start_event", "起算事件", "有效转化", "", "已确认")], { fail: "发布时依赖配置“信用与权益”版本区间不覆盖" }),
      V("v3", "已锁定", "u-risk1", "2026-09-10", "2026-09-15", "v2", [P("base_hold_days_R0", "基础结算中天数 R0", 7, "天", "待评审"), P("base_hold_days_R3", "基础结算中天数 R3", 21, "天", "待评审"), P("freeze_threshold_days", "冻结阈值", 30, "天", "待评审"), P("start_event", "起算事件", "有效转化", "", "已确认")])]),
    I("B08", "保证金", "保证金", "fin", [{ name: "财务复核", role: "fin" }], true, [
      V("v2", "已锁定", "u-fin2", "2026-08-20", "2026-08-25", "v1", [P("guarantee_ratio", "保证金比例", "待确认", "%", "待评审"), P("coverage_basis", "覆盖口径", "口径待确认", "", "待评审")])]),
    I("B09", "结算与提现", "结算与提现", "fin", [{ name: "财务复核", role: "fin" }], true, [
      V("v5", "已锁定", "u-fin1", "2026-10-25", "2026-11-01", "v4", [P("settlement_cycle", "结算周期", "月度（日结入账）", "", "已确认"), P("withdraw_fee", "提现手续费", "0.5%（演示）", "", "Mock 演示"), P("min_withdraw", "最低提现额", 50, "USD", "Mock 演示")])]),
    I("B10", "风险规则集", "风险规则", "risk", [{ name: "风控复核", role: "risk" }, { name: "合规意见（风控第二人）", role: "risk" }], false, [
      V("v7", "已锁定", "u-risk2", "2026-10-30", "2026-11-02", "v6", [P("rule_set", "规则集版本", "R-PRA v3 / R-STL v2 / R-HARD v5", "", "已确认"), P("shadow_replay", "影子重放", "已通过", "", "已确认")])]),
    I("B11", "审批流", "审批流", "admin", [{ name: "风控复核（合规）", role: "risk" }], false, [
      V("v2", "已锁定", "u-adm1", "2026-08-01", "2026-08-05", "v1", [P("self_review_whitelist", "自审白名单", "素材规格（低敏）", "", "待评审"), P("sla_hours", "审批处理时限", "待确认", "小时", "待评审")])]),
    I("B12", "数据治理规则", "数据治理规则", "admin", [{ name: "风控复核（合规）", role: "risk" }], false, [
      V("v3", "已锁定", "u-adm1", "2026-09-05", "2026-09-10", "v2", [P("retention_trade", "交易记录保留", "7 年（待确认）", "", "待评审"), P("notice_semantics", "通知语义", "已确认模板 v2", "", "已确认")])]),
    I("B13", "官方内容 · 路径库", "官方内容", "ops", [{ name: "运营复核", role: "ops" }], false, []),
    Object.assign(I("B14", "素材规格（低敏）", "官方内容", "ops", [{ name: "运营复核", role: "ops" }], false, [
      V("v4", "已锁定", "u-ops1", "2026-11-18", "2026-11-18", "v3", [P("max_size_mb", "素材文件大小上限", 10, "MB", "Mock 演示"), P("formats", "允许格式", "PNG, JPG, MP4", "", "已确认")])]), { selfOk: true })
  ];
  /* 系统配置：当前仅开放三项 */
  ADM.sysItems = [
    { key: "export.file_expiry_hours", name: "导出文件过期时间", unit: "小时", min: 1, max: 168, cur: 24, pend: null, sens: false, desc: "异步导出文件的有效时长，到期自动清理，下载时重新鉴权。" },
    { key: "access.attribution_rate_limit", name: "归属查询次数", unit: "次 / 小时", min: 1, max: 100, cur: 5, pend: null, sens: true, desc: "每个统计窗口（1 小时）内允许的归属精准查询次数。1 小时 5 次为当前产品与 Mock 标准，生产启用仍需安全复验。" },
    { key: "access.attribution_cooldown", name: "归属查询过期时间", unit: "小时", min: 1, max: 72, cur: 6, pend: null, sens: true, desc: "查询超限后的冷却时长，到期自动恢复查询。" }
  ];
  ADM.sysLog = [
    { at: "2026-11-09 16:00", key: "export.file_expiry_hours", before: "48 小时", after: "24 小时", by: "u-adm1", why: "缩短导出文件保留时间", res: "已生效", trace: "tr-sys0001", confirm: "—" }
  ];
  /* 配置草稿审批联动：审批通过后版本进入“已审批” */
  const a = ADM.approvals.find((x) => x.id === "AP-3120");
  ADM.approvals.push({ id: "AP-3120", type: "配置发布", obj: "业务配置 B03 · v2", summary: "质量升档规则 v2", amt: "—", applicant: "u-ops2", at: "2026-11-17 15:00", waitH: 43, limitH: 24, chain: [{ name: "运营复核", role: "ops" }, { name: "风控共同复核（风险条件）", role: "risk" }], step: 0, status: "pending", capital: false, previewValid: true, refs: ["B03"], diff: [["观察期", "30 天", "30 天"], ["最低活跃交易日", "8 天", "10 天"], ["最低交易次数", "2 次", "3 次"]], impact: "仅影响未来的质量升档判定，不回写已生成佣金。", reason: "收紧达标条件", records: [{ node: "提交", who: "许安然", role: "运营", decision: "提交申请", note: "", at: "2026-11-17 15:00" }] });
  ADM.approvals.find((x) => x.id === "AP-3120").onApprove = () => { const it = ADM.cfgItems.find((i) => i.code === "B03"), v = it.versions.find((x) => x.ver === "v2"); v.state = "已审批"; };
  ADM.approvals.find((x) => x.id === "AP-3120").onReject = () => { const it = ADM.cfgItems.find((i) => i.code === "B03"), v = it.versions.find((x) => x.ver === "v2"); v.state = "草稿"; };
})();
