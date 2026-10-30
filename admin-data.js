window.AFF_ADMIN = (() => {
  const configurations = [
    ["CFG-001", "三段佣金", "30/45/25；60/30/60天", "30/45/25；60/30/60天", "已生效", "全局", "2026-10-24 00:00", "运营A / 风控B / 财务C"],
    ["CFG-002", "L1-L4资格档", "$300/$800/$1500/$4000", "$300/$800/$1500/$4000", "已生效", "全局", "2026-10-24 00:00", "运营A / 风控B"],
    ["CFG-003", "国家系数", "12国0.6-1.5", "12国0.6-1.5", "已生效", "12个国家", "2026-10-25 00:00", "运营A / 风控B / 财务C"],
    ["CFG-004", "动态Hold", "R0/R1/R2/R3=1/3/7/15", "R0/R1/R2/R3=1/3/7/15", "已生效", "全局", "2026-10-25 00:00", "风控B"],
    ["CFG-005", "滚动保证金", "10%；90天；终止后30天", "10%；90天；终止后30天", "已生效", "全局", "2026-10-27 00:00", "风控B / 财务C"],
    ["CFG-006", "税务与手续费", "T0-T3=0/5/10/15%；电汇$3+0.5%；钱包1%", "T0-T3=0/5/10/15%；电汇$3+0.5%；钱包1%", "已生效", "全局", "2026-10-27 00:00", "财务C / 合规E"],
    ["CFG-007", "归因规则", "30天；24小时去重；3秒有效点击", "30天；24小时去重；5秒有效点击", "草稿", "全局", "待定", "产品D"],
    ["CFG-008", "申诉SLA", "7自然日", "7自然日", "已生效", "全局", "2026-10-26 00:00", "风控B / 运营A"],
    ["CFG-009", "协议版本", "Agreement v3", "Agreement v4", "审批中", "全部合作方", "待审批", "合规E"]
  ].map(([id, group, current, draft, status, scope, effective, owners]) => ({id, group, current, draft, status, scope, effective, owners}));

  const prices = [
    ["VN", "越南", 1.2, "L1", 240, "开放"], ["TH", "泰国", 1.1, "L2", 440, "开放"],
    ["ID", "印度尼西亚", 1.0, "L3", 700, "开放"], ["ZA", "南非", 0.9, "L4", 1080, "接近上限"],
    ["NG", "尼日利亚", 0.8, "L2", 320, "开放"], ["PK", "巴基斯坦", 0.7, "L1", 140, "开放"]
  ].map(([code, country, coefficient, tier, price, status]) => ({code, country, coefficient, tier, price, status}));

  const tiers = [
    ["L1", 300, 1, 3, 200, 30, 45, 25],
    ["L2", 800, 3, 5, 400, 30, 45, 25],
    ["L3", 1500, 5, 5, 700, 30, 45, 25],
    ["L4", 4000, 10, 8, 1200, 30, 45, 25]
  ].map(([tier, netDeposit, volume, days, basePrice, ftdRate, qftdRate, qualityRate]) => ({tier, netDeposit, volume, days, basePrice, ftdRate, qftdRate, qualityRate}));

  const holdRules = [
    ["R0", 1, "正常档", 0, 2, 5], ["R1", 3, "轻度风险", 0, 3, 5],
    ["R2", 7, "中风险", 0, 5, 10], ["R3", 15, "高风险，转人工", 0, 7, 10]
  ].map(([band, baseDays, note, levelAddition, countryAddition, paymentAddition]) => ({band, baseDays, note, levelAddition, countryAddition, paymentAddition}));

  const financeRules = [
    ["保证金比例", "10%", "全站统一；预留国家/支付/风险分档"],
    ["正常释放", "90自然日", "无未结风险自动释放"],
    ["终止合作保留", "30自然日", "与正常释放期取更晚"],
    ["税档", "T0-T3 = 0/5/10/15%", "待财务确认，不代表法定税率"],
    ["银行电汇", "$3 + 0.5%", "最低$1，最高$30"],
    ["电子钱包", "1%", "最低$1，最高$30"]
  ].map(([name, value, note]) => ({name, value, note}));

  const countries = [
    ["VN", "越南", "开放", "GTC FX", "牌照覆盖", 82, "建议开放"],
    ["TH", "泰国", "开放", "GTC FX", "牌照覆盖", 76, "维持"],
    ["ID", "印度尼西亚", "开放", "GTC FX", "牌照覆盖", 69, "观察"],
    ["ZA", "南非", "接近上限", "GTC FX", "牌照覆盖", 61, "控制数量"],
    ["NG", "尼日利亚", "开放", "GTC FX", "待复核", 48, "观察"],
    ["PK", "巴基斯坦", "开放", "GTC FX", "牌照覆盖", 44, "维持"]
  ].map(([code, country, status, entity, license, score, suggestion]) => ({code, country, status, entity, license, score, suggestion}));

  const approvals = [
    ["APR-001", "国家系数v1.2", "运营A提交", "风控B会签", "待审批", "试算通过"],
    ["APR-002", "协议v4", "合规E提交", "法务会签", "待审批", "需强制公告"],
    ["APR-003", "保证金10%", "风控B提交", "财务C会签", "已生效", "资金平衡通过"],
    ["APR-004", "税务演示税档", "财务C提交", "税务复核", "待补材料", "缺真实税率确认"]
  ].map(([id, subject, submitter, flow, status, note]) => ({id, subject, submitter, flow, status, note}));

  const trials = [
    ["合格客户数", "1,240", "1,208", "-2.6%"], ["有效FTD佣金", "$362,400", "$355,100", "-2.0%"],
    ["质量服务佣金", "$121,800", "$118,900", "-2.4%"], ["有效客户成本", "$176", "$172", "-2.3%"],
    ["护栏命中", "0", "3", "+3"]
  ].map(([metric, current, draft, change]) => ({metric, current, draft, change}));

  const risks = [
    ["RSK-1001", "HR-GEO-001", "hard", "客户C-12003", "R4", "阻断", "禁推国家", "待处理"],
    ["RSK-1002", "HR-ID-001", "hard", "客户C-12008", "R4", "不归因", "集团已有账户", "已处置"],
    ["RSK-1003", "SC-DEVICE-01", "scored", "客户C-12012", "R1", "延长Hold", "单设备轻度重合", "待处理"],
    ["RSK-1004", "SC-TRAFFIC-03", "scored", "Sub ID placement_04", "R2", "人工复核", "自动化点击疑似", "处理中"],
    ["RSK-1005", "VIOLATION-02", "violation", "合作方AFF1002", "R3", "限期整改", "品牌词冒用", "处理中"],
    ["RSK-1006", "FRAUD-CRM-02", "fraud", "客户C-12044", "R2", "计入评分", "CRM中风险命中", "待处理"],
    ["RSK-1007", "FRAUD-CRM-07", "fraud", "客户C-12010", "R4", "阻断", "CRM高风险确权", "已处置"]
  ].map(([id, rule, type, object, band, action, evidence, status]) => ({id, rule, type, object, band, action, evidence, status}));

  const reviews = [
    ["REV-2001", "risk", "R3风险", "C-12033 / COM-QF", "R3", "冻结", "同设备集群待确认", "待处理"],
    ["REV-2002", "d30", "D+30冻结", "C-12019 / COM-QS", "R2", "冻结", "理论Hold 35天", "待处理"],
    ["REV-2003", "appeal", "申诉", "APL-0011", "R2", "争议处理", "客户拒付原因待银行确认", "处理中"],
    ["REV-2004", "guarantee", "保证金抵扣", "GL-C-12008-QF-USE", "R4", "冲正", "盗卡确认", "待处理"],
    ["REV-2005", "cap", "上限确认", "AFF1003 / ZA", "R2", "人工确认", "达到月上限", "处理中"]
  ].map(([id, type, typeName, object, band, fundStatus, reason, status]) => ({id, type, typeName, object, band, fundStatus, reason, status}));

  const performance = [
    ["AFF1001", "越南", "placement_01", 18200, 1240, 420, 364, 301, 52400, 174, "1.9%", "12%", "R1"],
    ["AFF1002", "泰国", "placement_02", 15400, 980, 350, 292, 238, 41800, 176, "2.2%", "18%", "R2"],
    ["AFF1003", "南非", "placement_03", 12100, 760, 280, 214, 161, 28600, 178, "2.8%", "24%", "R2"],
    ["AFF1004", "印度尼西亚", "placement_04", 9800, 690, 268, 214, 174, 31200, 179, "2.1%", "10%", "R1"]
  ].map(([partner, country, subId, clicks, registrations, ftd, effective, quality, paid, cac, reversal, guaranteeCoverage, band]) => ({partner, country, subId, clicks, registrations, ftd, effective, quality, paid, cac, reversal, guaranteeCoverage, band}));

  return {configurations, prices, tiers, holdRules, financeRules, countries, approvals, trials, risks, reviews, performance};
})();
