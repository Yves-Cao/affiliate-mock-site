/* 管理端 1.0 —— 风控与审批模块演示数据（虚构合成数据）。来源：页面 03 / 14 / 15 */
(function () {
  const ADM = window.ADM;

  /* ---------- 审批 ----------
     chain：串行节点 [{name, role}]；step：当前节点下标；status：pending / approved / rejected / returned / withdrawn / pending_exec / exec_failed
     capital：资金类（不允许自审）；previewValid=false 表示影响预览已失效 */
  const A = (id, type, obj, summary, amt, applicant, at, waitH, limitH, chain, step, status, extra) =>
    Object.assign({ id, type, obj, summary, amt, applicant, at, waitH, limitH, chain, step, status, capital: false, previewValid: true, refs: [], diff: [], impact: "", reason: "", records: [] }, extra || {});
  ADM.approvalTypes = ["入驻", "结算", "提现", "调级", "配置变更", "敏感授权", "权限", "任务处置", "冲正/抵扣", "清退", "黑名单"];
  ADM.approvalStatus = {
    pending: { n: "待审批", t: "info" }, approved: { n: "已通过", t: "ok" }, rejected: { n: "已驳回", t: "bad" },
    returned: { n: "已退回", t: "warn" }, withdrawn: { n: "已撤回", t: "" }, pending_exec: { n: "待执行", t: "info" },
    executing: { n: "执行中", t: "info" }, exec_failed: { n: "执行失败", t: "bad" }
  };
  ADM.approvals = [
    A("AP-3101", "冲正/抵扣", "合作方 P-10009", "冲正追回 USD 5,600.00", "5,600.00", "u-fin1", "2026-11-19 10:02", 1, 8, [{ name: "财务复核", role: "fin" }], 0, "pending",
      { capital: true, taskId: "T-24105", reason: "已付异常佣金，需冲正并登记债务。", diff: [["债务登记", "无", "USD 5,600.00"], ["结算状态", "受限", "受限（追回中）"]], impact: "影响 1 个合作方、2 个佣金案件；预览已锁定。", refs: ["T-24105", "合作方 P-10009"], records: [{ node: "提交", who: "何知夏", role: "财务", decision: "提交申请", note: "", at: "2026-11-19 10:02" }] }),
    A("AP-3102", "任务处置", "合作方 P-10031", "熔断维持并转财务追回", "12,400.00", "u-risk2", "2026-11-19 09:55", 2, 6, [{ name: "风控复核", role: "risk" }, { name: "财务复核", role: "fin" }], 0, "pending",
      { taskId: "T-24113", reason: "日上限命中，风险占比持续超阈，建议维持熔断。", diff: [["熔断状态", "触发", "维持"], ["关联财务任务", "无", "新建追回任务"]], impact: "影响 1 个合作方、6 个案件；涉及资金，追加财务节点。", refs: ["T-24113", "CB-0088"], records: [{ node: "提交", who: "钟临川", role: "风控", decision: "提交申请", note: "", at: "2026-11-19 09:55" }] }),
    A("AP-3103", "调级", "合作方 P-10022", "信用调级 C3 → C2（风险传导）", "—", "u-risk1", "2026-11-18 20:44", 14, 24, [{ name: "风控复核", role: "risk" }], 0, "pending",
      { reason: "R2 风险事件成立，向下传导。", diff: [["信用等级", "C3", "C2"], ["生效", "—", "下一结算周期"]], impact: "仅影响后续结算，不回写历史佣金。", refs: ["CR-0612"], previewValid: false, records: [{ node: "提交", who: "周以宁", role: "风控", decision: "提交申请", note: "", at: "2026-11-18 20:44" }] }),
    A("AP-3104", "提现", "合作方 P-10011", "提现放行 USD 1,200.00", "1,200.00", "u-fin2", "2026-11-19 08:30", 2, 8, [{ name: "财务复核", role: "fin" }], 0, "pending",
      { capital: true, reason: "月度提现，KYC 已通过。", diff: [["提现状态", "待放行", "放行"]], impact: "单笔提现，影响金额 USD 1,200.00。", refs: ["WD-0921"], records: [{ node: "提交", who: "梁清和", role: "财务", decision: "提交申请", note: "", at: "2026-11-19 08:30" }] }),
    A("AP-3105", "入驻", "合作方 P-10036", "合作方入驻审核", "—", "u-ops2", "2026-11-19 09:10", 1, 24, [{ name: "运营复核", role: "ops" }], 0, "pending",
      { reason: "资料齐全，CRM 已回传 KYB 通过。", diff: [["业务状态", "草稿", "正常"]], impact: "批准后创建官方链接，计费推广开放。", refs: ["P-10036"], records: [{ node: "提交", who: "许安然", role: "运营", decision: "提交申请", note: "", at: "2026-11-19 09:10" }] }),
    A("AP-3106", "黑名单", "集群 G-2207", "名单加入：设备特征（全局以外）", "—", "u-risk1", "2026-11-18 17:20", 17, 24, [{ name: "风控复核", role: "risk" }], 0, "pending",
      { reason: "集群认定成立，加入受控名单。", diff: [["名单", "无", "加入（合作方范围）"]], impact: "影响 3 个成员客户。", refs: ["CL-2207"], records: [{ node: "提交", who: "周以宁", role: "风控", decision: "提交申请", note: "", at: "2026-11-18 17:20" }] }),
    A("AP-3107", "清退", "合作方 P-10040", "合作方清退：停链并最终结算", "6,780.00", "u-ops1", "2026-11-18 16:10", 18, 24, [{ name: "风控复核", role: "risk" }, { name: "财务复核", role: "fin" }], 1, "pending",
      { taskId: "T-24108", reason: "违规成立，依据条款清退。", diff: [["业务状态", "暂停", "已终止"]], impact: "影响 31 个客户的后续归属；最终结算待财务核对。", refs: ["OFF-0107"], records: [{ node: "提交", who: "陈思远", role: "运营", decision: "提交申请", note: "", at: "2026-11-18 16:10" }, { node: "风控复核", who: "钟临川", role: "风控", decision: "通过", note: "违规证据充分", at: "2026-11-18 18:02" }] }),
    A("AP-3108", "配置变更", "业务配置 · 结算周期", "结算周期参数调整（待确认值）", "—", "u-fin1", "2026-11-19 07:50", 3, null, [{ name: "财务复核", role: "fin" }], 0, "pending",
      { diff: [["结算周期", "当前生效版本", "草稿版本 v12"]], impact: "生效时间待确认；生产值为待确认。", refs: ["CFG-0412"], records: [{ node: "提交", who: "何知夏", role: "财务", decision: "提交申请", note: "", at: "2026-11-19 07:50" }] }),
    A("AP-3109", "权限", "角色 · 运营", "新增附加权限 tasks.assign（用户 许安然）", "—", "u-adm1", "2026-11-19 09:30", 1, 24, [{ name: "系统管理员复核", role: "admin" }], 0, "pending",
      { diff: [["附加权限", "无", "tasks.assign"]], impact: "仅影响任务转办；不改变审批权限。", refs: ["PERM-0098"], records: [{ node: "提交", who: "顾衡", role: "系统管理员", decision: "提交申请", note: "", at: "2026-11-19 09:30" }] }),
    A("AP-3110", "结算", "结算单 ST-2210", "结算单放行 USD 21,300.00", "21,300.00", "u-fin2", "2026-11-18 11:00", 23, 8, [{ name: "财务复核", role: "fin" }], 0, "pending", { capital: true, diff: [["结算单", "待放行", "放行"]], impact: "覆盖 18 个合作方。", refs: ["ST-2210"], records: [{ node: "提交", who: "梁清和", role: "财务", decision: "提交申请", note: "", at: "2026-11-18 11:00" }] }),
    A("AP-3111", "任务处置", "客户 C-80233", "风险复核：观察期结束，排除", "—", "u-risk1", "2026-11-17 11:30", 0, 24, [{ name: "风控复核", role: "risk" }], 0, "approved",
      { reason: "无新增风险事件。", diff: [["认定", "待认定", "已排除"]], impact: "不涉及资金。", refs: ["T-24124"], records: [{ node: "提交", who: "周以宁", role: "风控", decision: "提交申请", note: "", at: "2026-11-17 11:30" }, { node: "风控复核", who: "钟临川", role: "风控", decision: "通过", note: "同意", at: "2026-11-17 15:02" }] }),
    A("AP-3112", "冲正/抵扣", "合作方 P-10018", "保证金抵扣 USD 2,150.00", "2,150.00", "u-fin1", "2026-11-17 09:00", 0, 8, [{ name: "财务复核", role: "fin" }], 0, "rejected",
      { capital: true, diff: [["保证金", "已覆盖", "抵扣"]], impact: "单个损失记录。", refs: ["L-1180"], records: [{ node: "提交", who: "何知夏", role: "财务", decision: "提交申请", note: "", at: "2026-11-17 09:00" }, { node: "财务复核", who: "梁清和", role: "财务", decision: "驳回", note: "损失单据未完整，请补充。", at: "2026-11-17 14:20" }] }),
    A("AP-3113", "任务处置", "客户 C-80419", "CRM 欺诈库命中处置：执行失败", "1,980.00", "u-risk2", "2026-11-19 08:03", 0, 6, [{ name: "风控复核", role: "risk" }], 0, "exec_failed",
      { taskId: "T-24117", diff: [["案件", "冻结", "维持冻结"]], impact: "下游返回超时；由任务队列“执行失败”处理。", refs: ["T-24117"], records: [{ node: "提交", who: "钟临川", role: "风控", decision: "提交申请", note: "", at: "2026-11-19 07:10" }, { node: "风控复核", who: "周以宁", role: "风控", decision: "通过", note: "", at: "2026-11-19 07:48" }] })
  ];
  ADM.approvals.forEach((a) => { if (!a.records.length) a.records = []; });

  /* ---------- 风险工作台 ---------- */
  ADM.riskObjects = [
    { id: "P-10031", type: "合作方", r: "R3", agg: true, c: "C1", reasons: ["风险占比超阈", "日上限熔断", "保证金不足"], cases: 6, amt: "8,960.50", task: "处理中", sla: "剩余 5 小时", elig: ["受限", "风险占比超阈"], country: "PH", upd: "2026-11-19 09:55", due: 5 },
    { id: "P-10009", type: "合作方", r: "R2", agg: true, c: "C1", reasons: ["已付异常", "冲正追回"], cases: 2, amt: "5,600.00", task: "待审批", sla: "剩余 2 小时", elig: ["受限", "冲正追回中"], country: "MY", upd: "2026-11-19 10:02", due: 2 },
    { id: "P-10024", type: "合作方", r: "R2", agg: true, c: "C2", reasons: ["超时冻结信号"], cases: 3, amt: "1,240.00", task: "已超时", sla: "已超时 3 小时", elig: ["受限", "结算超时信号"], country: "TH", upd: "2026-11-19 09:48", due: -3 },
    { id: "G-2207", type: "集群", r: "R2", agg: true, c: null, reasons: ["设备特征重合", "同 IP 段"], cases: 5, amt: "3,410.00", task: "处理中", sla: "剩余 26 小时", elig: ["受限", "集群复核中"], country: "—", upd: "2026-11-18 18:20", due: 26 },
    { id: "C-80419", type: "客户", r: "R3", agg: false, c: null, reasons: ["CRM 欺诈库命中"], cases: 1, amt: "1,980.00", task: "执行失败", sla: "已超时 6 小时", elig: ["受限", "欺诈库命中"], country: "ID", upd: "2026-11-19 08:03", due: -6 },
    { id: "C-80317", type: "客户", r: "R2", agg: false, c: null, reasons: ["超时冻结"], cases: 1, amt: "1,240.00", task: "处理中", sla: "已超时 3 小时", elig: ["受限", "超时冻结"], country: "TH", upd: "2026-11-19 09:48", due: -3 },
    { id: "C-80702", type: "客户", r: "R1", agg: false, c: null, reasons: ["超时冻结"], cases: 1, amt: "310.00", task: "待认领", sla: "已超时 1 小时", elig: ["受限", "超时冻结"], country: "VN", upd: "2026-11-19 05:30", due: -1 },
    { id: "C-80655", type: "客户", r: null, agg: false, c: null, reasons: ["尚无直接风险快照"], cases: 1, amt: null, task: "—", sla: "—", elig: ["可结算", ""], country: "SG", upd: "2026-11-19 07:00", due: null }
  ];
  ADM.riskEvents = [
    { id: "EVT-9921", type: "合作方风险聚合", src: "规则引擎", obj: "P-10031", n: 4, r: "R3", score: 42, det: "成立", sig: "—", task: "处理中", appr: "无", exec: "未开始", settle: "冻结 4 · 可结算 2", cases: 6, amt: "8,960.50", at: "2026-11-19 09:12", rule: "R-PRA v3（待确认）",
      trig: [["分子（风险转化）", "37"], ["分母（有效转化）", "1,100"], ["占比", "3.4%"], ["窗口", "近 30 天"], ["阈值", "3.0%（待确认）"]], now: "当前占比 3.3%（观察值，不改写触发原因）" },
    { id: "EVT-9930", type: "结算超时信号", src: "规则引擎", obj: "C-80317", n: 1, r: "R2", score: 18, det: "待认定", sig: "待处理", task: "处理中", appr: "无", exec: "未开始", settle: "冻结 1", cases: 1, amt: "1,240.00", at: "2026-11-19 09:48", rule: "R-STL v2（待确认）",
      trig: [["已冻结天数（触发时）", "30"], ["当前天数", "31"], ["阈值", "30（待确认）"], ["配置版本", "v7"]], now: "申诉入口：未开放，等待风险信号处理" },
    { id: "EVT-9870", type: "硬规则命中", src: "规则引擎", obj: "C-80233", n: 1, r: "R1", score: 6, det: "已排除", sig: "—", task: "已完成", appr: "已通过", exec: "已完成", settle: "可结算 1", cases: 1, amt: "—", at: "2026-11-17 11:12", rule: "R-HARD v5（待确认）", trig: [["命中规则", "同设备多账户"], ["窗口", "近 7 天"]], now: "观察期结束，无新增事件" },
    { id: "FR-0201", type: "CRM 欺诈库命中", src: "CRM", obj: "C-80419", n: 1, r: "R3", score: 60, det: "成立", sig: "—", task: "执行失败", appr: "已通过", exec: "失败", settle: "冻结 1", cases: 1, amt: "1,980.00", at: "2026-11-19 07:00", rule: "CRM 欺诈库（只读）", trig: [["来源", "CRM 欺诈库"], ["匹配方式", "脱敏标识匹配"]], now: "—" },
    { id: "CL-2207", type: "集群", src: "规则引擎", obj: "G-2207", n: 5, r: "R2", score: 30, det: "待认定", sig: "—", task: "处理中", appr: "无", exec: "未开始", settle: "冻结 3 · 可结算 2", cases: 5, amt: "3,410.00", at: "2026-11-18 18:20", rule: "R-CL v2（待确认）", trig: [["独立特征", "2 类（设备、IP 段）"]], now: "—" },
    { id: "EVT-9944", type: "违规", src: "人工上报", obj: "P-10040", n: 1, r: "R2", score: 24, det: "成立", sig: "—", task: "处理中", appr: "待审批", exec: "未开始", settle: "冻结 2", cases: 2, amt: "6,780.00", at: "2026-11-18 14:00", rule: "人工上报", trig: [["上报来源", "运营"], ["依据", "违规推广内容"]], now: "—" },
    { id: "EVT-9951", type: "规则评分事件", src: "规则引擎", obj: "P-10022", n: 1, r: "R2", score: 15, det: "成立", sig: "—", task: "已退回", appr: "已退回", exec: "未开始", settle: "可结算 3", cases: 3, amt: "—", at: "2026-11-18 20:44", rule: "R-SCORE v4（待确认）", trig: [["事件分", "15"], ["权重", "0.6"]], now: "—" }
  ];
  ADM.riskClusters = [
    { id: "G-2207", members: 5, partners: 3, basis: "2 类独立特征（设备、IP 段）", det: "待核验", ctrl: "复核中", r: "R2", amt: "3,410.00", feats: ["dev-****a91", "ip-203.0.***"], upd: "2026-11-18 18:20" },
    { id: "G-2198", members: 4, partners: 1, basis: "1 类特征 + 权威例外", det: "已确认", ctrl: "结算延长", r: "R2", amt: "2,030.00", feats: ["dev-****5c2"], upd: "2026-11-19 06:58" },
    { id: "G-2181", members: 3, partners: 2, basis: "2 类独立特征", det: "已确认", ctrl: "需人工", r: "R3", amt: "7,880.00", feats: ["dev-****e10", "pay-****77"], upd: "2026-11-16 12:00" },
    { id: "G-2150", members: 2, partners: 1, basis: "特征不足（1 类）", det: "已清除", ctrl: "无", r: "R0", amt: "—", feats: ["ip-198.51.***"], upd: "2026-11-10 09:00" }
  ];
  ADM.riskBlacklist = [
    { id: "BL-0412", type: "设备", mask: "dev-****a91", scope: "合作方", source: "本地", state: "生效", pending: "无", from: "2026-10-30", to: "永久" },
    { id: "BL-0407", type: "银行账户", mask: "acct-****4410", scope: "全局", source: "本地", state: "生效", pending: "移出申请中", from: "2026-10-21", to: "永久" },
    { id: "BL-0399", type: "IP 段", mask: "ip-203.0.***", scope: "活动", source: "本地", state: "生效", pending: "无", from: "2026-10-12", to: "2027-01-12" },
    { id: "BL-C0211", type: "身份凭证", mask: "id-****8830", scope: "全局", source: "CRM", state: "生效", pending: "无", from: "2026-09-02", to: "永久" },
    { id: "BL-0351", type: "设备", mask: "dev-****7d3", scope: "渠道", source: "本地", state: "已失效", pending: "无", from: "2026-08-01", to: "2026-11-01" }
  ];
  ADM.riskPurposes = {
    risk_investigation: { n: "风险调查", plans: ["确认事件", "排除事件", "观察（填复查时间）", "继续冻结", "结算延长", "信用传导", "转财务"] },
    signal_review: { n: "超时信号复核", plans: ["信号驳回", "信号确认"] },
    settlement_recheck: { n: "解除重检", plans: ["解除并重检"] },
    cluster_determination: { n: "集群认定", plans: ["确认集群", "清除集群"] },
    cluster_member_correction: { n: "集群成员纠错", plans: ["成员移出为未分配", "拆为新集群"] },
    blacklist_add: { n: "加入黑名单", plans: ["名单加入"] },
    blacklist_remove: { n: "移出黑名单", plans: ["名单移出"] }
  };
})();
