/* 管理端 1.0 —— 报表 / 审计 / 权限演示数据（虚构）。来源：页面 13 / 25 / 26 / 27。 */
(function () {
  const ADM = window.ADM;
  ADM.approvalTypes.push("审计更正");
  ADM.snapshot = { id: "RS-20261119-1000", cut: "2026-11-19 10:00", tz: "Asia/Shanghai（UTC+8）", quality: "部分", def: "metric-defs v1（待确认）" };

  /* 指标行：null 表示未知，显示“—”，不按 0 */
  const R = (dim, country, partner, clicks, valid, reg, ftd, qc, rej, q) => ({ dim, country, partner, clicks, valid, reg, ftd, qc, rej, q });
  ADM.repChannels = [
    R("活动 CMP-2175 / sub-c01", "ID", "P-10011", 9020, 8400, 650, 140, 82, "3.1%", "完整"),
    R("活动 CMP-2201 / sub-a17", "TH", "P-10024", 2100, 1900, 150, 30, 17, "2.4%", "完整"),
    R("活动 CMP-2201 / sub-a18", "MY", "P-10024", 1500, 1380, 120, 28, 15, "2.0%", "完整"),
    R("活动 CMP-2230 / sub-d44", "ID", "P-10031", 6100, 3900, 410, null, null, "18.5%", "部分"),
    R("活动 CMP-2188 / sub-b02", "PH", "P-10017", 2980, 2700, 190, 40, 21, "4.2%", "完整"),
    R("活动 CMP-2205 / sub-f13", "SG", "P-10012", 800, 770, 52, 9, 6, "1.1%", "完整"),
    R("未知渠道", "未知", "—", 310, null, 22, 3, 1, "—", "部分")
  ];
  ADM.repPartners = [
    { id: "P-10011", country: "ID", clicks: 9020, valid: 8400, reg: 650, ftd: 140, qc: 82, comm: "18,240.00", r: "R0", c: "C3", q: "完整" },
    { id: "P-10024", country: "TH", clicks: 3600, valid: 3280, reg: 270, ftd: 58, qc: 32, comm: "7,330.00", r: "R2", c: "C2", q: "完整" },
    { id: "P-10031", country: "ID", clicks: 6100, valid: 3900, reg: 410, ftd: null, qc: null, comm: "36,410.00", r: "R3", c: "C1", q: "部分" },
    { id: "P-10017", country: "PH", clicks: 2980, valid: 2700, reg: 190, ftd: 40, qc: 21, comm: "4,510.00", r: "R1", c: "C2", q: "完整" },
    { id: "P-10012", country: "SG", clicks: 800, valid: 770, reg: 52, ftd: 9, qc: 6, comm: "3,106.50", r: "R0", c: "C2", q: "完整" },
    { id: "P-10014", country: "ID", clicks: 4200, valid: 3900, reg: 300, ftd: 72, qc: 41, comm: "12,880.00", r: "R1", c: "C3", q: "完整" }
  ];
  ADM.repEcon = [
    { dim: "P-10011 / ID", qc: 82, mature: 61, immature: 21, cover: "74%", sample: "充足", cost: null, net: null },
    { dim: "P-10014 / ID", qc: 41, mature: 30, immature: 11, cover: "73%", sample: "未知", cost: null, net: null },
    { dim: "P-10017 / PH", qc: 21, mature: 9, immature: 12, cover: "43%", sample: "偏低", cost: null, net: null }
  ];
  ADM.repQuality = [
    { dim: "P-10011", qc: 82, up: 31, mature: 61, immature: 21, dist: ["R0 70%", "R1 22%", "R2 6%", "R3 0%", "待评估 2%"], q: "完整" },
    { dim: "P-10024", qc: 32, up: 8, mature: 22, immature: 10, dist: ["R0 40%", "R1 20%", "R2 38%", "R3 0%", "待评估 2%"], q: "完整" },
    { dim: "P-10031", qc: null, up: null, mature: null, immature: null, dist: ["R0 —", "R1 —", "R2 —", "R3 —", "待评估 —"], q: "部分" },
    { dim: "P-10017", qc: 21, up: 5, mature: 9, immature: 12, dist: ["R0 52%", "R1 33%", "R2 10%", "R3 0%", "待评估 5%"], q: "完整" }
  ];
  ADM.repRules = [["R-PRA 合作方风险聚合 v3", 12, "成立 7 · 排除 3 · 待认定 2"], ["R-STL 结算超时信号 v2", 9, "确认 4 · 驳回 2 · 待处理 3"], ["R-HARD 硬规则 v5", 21, "成立 11 · 排除 9 · 待认定 1"], ["R-CL 集群 v2", 4, "确认 2 · 清除 1 · 待核验 1"]];
  ADM.repFunds = {
    comm: [["待结算", "86,420.50"], ["结算中", "31,205.00"], ["已冻结", "6,470.00"], ["可结算", "74,310.20"], ["已支付", "212,980.00"]],
    guar: [["保证金余额（预留）", "48,200.00"], ["已释放", "9,300.00"], ["已抵扣", "3,210.00"], ["剩余", "35,690.00"]],
    wd: [["申请", "8"], ["已批准", "1"], ["已支付", "1"], ["失败", "1"], ["部分成功", "1"], ["未知", "1"], ["已退回", "0"]],
    debt: [["冲正案件", "4"], ["已抵扣 (USD)", "5,650.00"], ["债务余额 (USD)", "2,500.00"]]
  };

  const AU = (id, at, who, role, action, obj, res, reason, self, trace, extra) => Object.assign({ id, at, who, role, action, obj, res, reason, self, trace, before: "—", after: "—" }, extra || {});
  ADM.audits = [
    AU("AUD-90112", "2026-11-19 10:02", "u-fin1", "财务", "提交", "冲正案件 RV-3301 · v1", "成功", "提交冲正审批", false, "tr-91a0c3d1", { before: "草稿", after: "待审批" }),
    AU("AUD-90111", "2026-11-19 09:55", "u-risk2", "风控", "提交", "熔断复核 T-24113 · v3", "成功", "熔断维持", false, "tr-91a0b7e2", { before: "处理中", after: "待审批" }),
    AU("AUD-90110", "2026-11-19 09:30", "u-adm1", "系统管理员", "权限变更", "用户 u-ops2 · 附加权限", "成功", "授予 tasks.assign（待审批）", false, "tr-91a09d10", { before: "无", after: "tasks.assign（待审批）" }),
    AU("AUD-90109", "2026-11-19 09:10", "u-ops2", "运营", "提交", "入驻申请 P-10036 · v1", "成功", "入驻审核", false, "tr-91a08011"),
    AU("AUD-90108", "2026-11-19 08:03", "系统", "—", "执行", "任务 T-24117 · v3", "失败", "下游返回超时", false, "tr-91a05e77", { before: "待执行", after: "执行失败" }),
    AU("AUD-90107", "2026-11-18 20:00", "u-adm1", "系统管理员", "配置发布", "业务配置 CFG-0412", "失败", "版本冲突", false, "tr-90f4a002"),
    AU("AUD-90106", "2026-11-18 17:00", "u-adm1", "系统管理员", "撤销授权", "Salesforce 授权 GR-290", "成功", "合作方终止", false, "tr-90f31b01"),
    AU("AUD-90105", "2026-11-18 14:20", "u-fin2", "财务", "驳回", "保证金抵扣 AP-3112", "成功", "损失单据未完整", false, "tr-90f1c455"),
    AU("AUD-90104", "2026-11-18 11:40", "u-ops1", "运营", "配置发布", "素材规格（低敏）", "成功", "低敏配置，自动审核", true, "tr-90ef2a09", { before: "v3", after: "v4" }),
    AU("AUD-90103", "2026-11-18 10:05", "u-risk1", "风控", "敏感查看", "客户 C-80419 · 联系方式", "拒绝", "未持有 risk.sensitive.reveal 授权", false, "tr-90ee8801"),
    AU("AUD-90102", "2026-11-17 15:02", "u-risk2", "风控", "批准", "风险复核 AP-3111", "成功", "同意排除", false, "tr-90a52210", { before: "待审批", after: "已通过" }),
    AU("AUD-90101", "2026-11-17 09:00", "u-fin1", "财务", "导出", "佣金案件 EX-7103", "成功", "月度对账", false, "tr-90a10003"),
    AU("AUD-90100", "2026-11-16 12:00", "系统", "—", "冻结", "案件 CS-5481 · v1", "成功", "风险占比超阈", false, "tr-8f990abc", { before: "结算中", after: "冻结" }),
    AU("AUD-90099", "2026-11-16 10:30", "u-adm1", "系统管理员", "权限变更", "用户 u-adm1 · 角色", "拒绝", "管理员不能修改自己的角色", false, "tr-8f98a001")
  ];
  ADM.auditCorrections = [];

  ADM.permCatalog = [
    ["tasks.assign", "分派 / 转办任务", "各角色组长"], ["tasks.close", "关闭任务", "各角色组长"], ["tasks.team.view", "团队任务查看", "各角色组长"],
    ["postback.pause", "暂停 / 恢复回传目标投递", "运营组长"], ["risk.sensitive.reveal", "风险对象敏感字段揭示", "风控"], ["risk.evidence.full", "证据全文读取", "风控"],
    ["risk.export.request", "风险工作台导出申请", "风控"], ["report.export", "报表导出申请", "按角色授予"], ["fund.large.approve", "资金大额审批（阈值待确认）", "财务"]
  ];
  ADM.extraGrants = [
    { uid: "u-ops1", perm: "tasks.assign", exp: "2027-02-28", why: "运营一组组长" }, { uid: "u-risk1", perm: "tasks.assign", exp: "2027-02-28", why: "风控复核组组长" },
    { uid: "u-risk1", perm: "risk.sensitive.reveal", exp: "2026-11-24", why: "反欺诈调查 T-24103" }, { uid: "u-fin1", perm: "tasks.assign", exp: "2027-02-28", why: "结算财务组组长" },
    { uid: "u-adm1", perm: "tasks.assign", exp: "2027-02-28", why: "平台运维" }
  ];
  ADM.userScope = { "u-ops1": "SG-01 · 全部国家", "u-ops2": "SG-01 · TH、VN +2", "u-risk1": "SG-01 · 全部国家", "u-risk2": "SG-01 · 全部国家", "u-fin1": "SG-01 · 全部国家", "u-fin2": "SG-01 · 全部国家", "u-adm1": "全部" };
  ADM.userLogin = { "u-ops1": "2026-11-19 08:50", "u-ops2": "2026-11-19 09:05", "u-risk1": "2026-11-19 08:40", "u-risk2": "2026-11-19 09:12", "u-fin1": "2026-11-19 08:55", "u-fin2": "2026-11-18 17:30", "u-adm1": "2026-11-19 09:00" };
  ADM.permApprovals = [];
})();
