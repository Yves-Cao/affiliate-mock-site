/* 管理端 1.0 —— 演示数据（全部为虚构合成数据，不含真实客户、邮箱、手机号或证件）。
   角色矩阵来源：02-页面清单与角色权限矩阵.md；任务类型来源：页面 02 第 4 节。 */
(function () {
  const ADM = (window.ADM = window.ADM || {});

  ADM.NOW = new Date("2026-11-19T10:30:00+08:00");

  ADM.roles = {
    ops: { key: "ops", name: "运营", perspective: "运营视角 · 业务与待办", userId: "u-ops1" },
    risk: { key: "risk", name: "风控", perspective: "风控视角 · 风险与复核", userId: "u-risk1" },
    fin: { key: "fin", name: "财务", perspective: "财务视角 · 资金与结算", userId: "u-fin1" },
    admin: { key: "admin", name: "系统管理员", perspective: "系统视角 · 任务与配置", userId: "u-adm1" }
  };
  ADM.roleOrder = ["ops", "risk", "fin", "admin"];
  ADM.roleNote = {
    ops: "客服职责并入运营。有 tasks.assign 附加权限时可分派任务。",
    risk: "合规职责并入风控。风险处置申请不允许自审。",
    fin: "资金类申请不允许自审，由另一位财务审批。",
    admin: "技术管理权不等于业务终审权。"
  };

  ADM.users = {
    "u-ops1": { name: "陈思远", role: "ops", team: "运营一组", assign: true },
    "u-ops2": { name: "许安然", role: "ops", team: "运营一组", assign: false },
    "u-risk1": { name: "周以宁", role: "risk", team: "风控复核组", assign: true },
    "u-risk2": { name: "钟临川", role: "risk", team: "风控复核组", assign: false },
    "u-fin1": { name: "何知夏", role: "fin", team: "结算财务组", assign: true },
    "u-fin2": { name: "梁清和", role: "fin", team: "结算财务组", assign: false },
    "u-adm1": { name: "顾衡", role: "admin", team: "平台运维组", assign: true }
  };

  /* 菜单：perm 依次为 [运营, 风控, 财务, 系统管理员]；w=操作 r=只读 n=不可见 */
  ADM.menu = [
    { group: "总览", items: [{ id: "admin-workbench", label: "仪表盘", icon: "home", perm: "wwww", doc: "页面/01-总览-仪表盘.md" }] },
    { group: "合作方", items: [{ id: "partner-list", label: "合作方 360", icon: "users", perm: "wwrr", doc: "页面/16-合作方-合作方360.md" }] },
    { group: "客户与归因", items: [
      { id: "client-list", label: "客户 360", icon: "user", perm: "wwrr", doc: "页面/17-客户与归因-客户360.md" },
      { id: "attribution-links", label: "归属与事件", icon: "link", perm: "wrrr", doc: "页面/18-客户与归因-归属与事件.md" }] },
    { group: "推广", items: [
      { id: "campaign-list", label: "活动与链接", icon: "flag", perm: "wrnr", doc: "页面/19-推广-活动与链接.md" },
      { id: "material-list", label: "素材库", icon: "image", perm: "wnnr", doc: "页面/20-推广-素材库.md" },
      { id: "postback", label: "回传与追踪", icon: "radar", perm: "wrnr", doc: "页面/21-推广-回传与追踪.md" }] },
    { group: "资金", items: [
      { id: "commission-list", label: "佣金与结算", icon: "coins", perm: "rrwr", doc: "页面/22-资金-佣金与结算.md" },
      { id: "withdrawal-list", label: "提现与对账", icon: "wallet", perm: "nrwr", doc: "页面/23-资金-提现与对账.md" },
      { id: "d-plus-n", label: "资金异常任务", icon: "alert", perm: "rrwr", doc: "页面/24-资金-资金异常任务.md" }] },
    { group: "风控与合规", items: [
      { id: "risk-event", label: "风险工作台", icon: "shield", perm: "rwrr", doc: "页面/14-风控-风险工作台.md" },
      { id: "risk-review", label: "案件与合规任务", icon: "gavel", perm: "rwnr", doc: "页面/15-风控-案件与合规任务.md" }] },
    { group: "工作台", items: [
      { id: "tasks", label: "任务队列", icon: "tasks", perm: "wwww", badge: "tasks", doc: "页面/02-工作台-任务队列.md" },
      { id: "approvals", label: "审批队列", icon: "check", perm: "wwww", badge: "approvals", doc: "页面/03-工作台-审批队列.md" },
      { id: "appeals-service", label: "申诉与客服服务", icon: "chat", perm: "wwrr", doc: "页面/04-工作台-申诉与客服服务.md" },
      { id: "exports", label: "导出中心", icon: "download", perm: "wwww", doc: "页面/11-工作台-导出中心.md" },
      { id: "notices", label: "通知与公告", icon: "bell", perm: "wrnr", doc: "页面/12-工作台-通知与公告.md" },
      { id: "integration-governance", label: "集成与数据治理", icon: "plug", perm: "rnrw", doc: "页面/05-工作台-集成与数据治理.md" }] },
    { group: "报表", items: [
      { id: "report-roi", label: "经营与转化", icon: "chart", perm: "rrrr", doc: "页面/25-报表-经营与转化.md" },
      { id: "report-quality", label: "质量与资金分析", icon: "chart2", perm: "rrrr", doc: "页面/26-报表-质量与资金分析.md" }] },
    { group: "权限与审计", items: [
      { id: "config-permission", label: "权限与菜单", icon: "key", perm: "nnnw", doc: "页面/27-权限与审计-权限与菜单.md" },
      { id: "audit", label: "审计", icon: "doc", perm: "nrnw", doc: "页面/13-权限与审计-审计.md" }] },
    { group: "系统设置", items: [
      { id: "config-overview", label: "业务配置", icon: "sliders", perm: "rrrw", doc: "页面/06-配置-业务配置总览与版本管理.md" },
      { id: "system", label: "系统配置", icon: "gear", perm: "nnnw", doc: "页面/10-配置-系统配置.md" }] }
  ];

  /* ---------- 任务类型（13 类）---------- */
  ADM.taskTypes = {
    risk_review: { name: "风险复核", owner: "risk" },
    settlement_overdue: { name: "结算超时复核", owner: "risk" },
    appeal: { name: "申诉复核", owner: "risk" },
    hold_extend: { name: "结算延长复核", owner: "risk" },
    guarantee_offset: { name: "保证金抵扣", owner: "fin" },
    chargeback: { name: "冲正追回", owner: "fin" },
    circuit_breaker: { name: "熔断复核", owner: "risk" },
    credit_review: { name: "信用调级复核", owner: "risk" },
    commission_exception: { name: "佣金异常", owner: "fin" },
    attribution_review: { name: "归属争议复核", owner: "ops" },
    integration: { name: "集成失败", owner: "admin" },
    data_backfill: { name: "事件补数", owner: "admin" },
    offboarding_step: { name: "清退步骤", owner: "ops" }
  };
  /* 角色可见的任务类型 */
  ADM.roleTaskTypes = {
    ops: ["attribution_review", "offboarding_step", "appeal"],
    risk: ["risk_review", "settlement_overdue", "appeal", "hold_extend", "circuit_breaker", "credit_review", "offboarding_step"],
    fin: ["guarantee_offset", "chargeback", "commission_exception", "offboarding_step"],
    admin: Object.keys({ risk_review: 1, settlement_overdue: 1, appeal: 1, hold_extend: 1, guarantee_offset: 1, chargeback: 1, circuit_breaker: 1, credit_review: 1, commission_exception: 1, attribution_review: 1, integration: 1, data_backfill: 1, offboarding_step: 1 })
  };

  ADM.taskStates = {
    open: { name: "待认领", tone: "warn" },
    processing: { name: "处理中", tone: "info" },
    waiting_material: { name: "待补件", tone: "warn" },
    pending_approval: { name: "待审批", tone: "info" },
    returned: { name: "退回补充", tone: "warn" },
    pending_execution: { name: "待执行", tone: "info" },
    executing: { name: "执行中", tone: "info" },
    execution_failed: { name: "执行失败", tone: "bad" },
    done: { name: "已完成", tone: "ok" },
    closed: { name: "已关闭", tone: "" }
  };
  ADM.activeStates = ["open", "processing", "waiting_material", "pending_approval", "returned", "pending_execution", "executing", "execution_failed"];

  /* dueIn：距截止小时数（负数=已超时；null=未配置）；warnH：预警提前量 */
  const T = (id, title, type, obj, ref, pri, state, owner, team, dueIn, risk, amt, upd, extra) =>
    Object.assign({ id, title, type, obj, ref, pri, state, owner, team, dueIn, risk, amt, upd, version: 3 }, extra || {});

  ADM.tasks = [
    T("T-24101", "超时冻结信号复核：客户 C-80317", "settlement_overdue", "P-10024", "CS-5531 · CM-4412", "高", "processing", "u-risk1", "风控复核组", -3, "R2", "1,240.00", "2026-11-19 09:48"),
    T("T-24102", "合作方风险占比超阈：P-10031", "risk_review", "P-10031", "EVT-9921", "高", "open", null, "风控复核组", 5, "R3", "8,960.50", "2026-11-19 09:12"),
    T("T-24103", "集群认定待核验：G-2207", "risk_review", "G-2207", "CL-2207", "高", "processing", "u-risk2", "风控复核组", 26, "R2", "3,410.00", "2026-11-18 18:20"),
    T("T-24104", "保证金抵扣：损失 L-1180", "guarantee_offset", "P-10018", "L-1180", "中", "processing", "u-fin1", "结算财务组", 30, "R1", "2,150.00", "2026-11-19 08:55"),
    T("T-24105", "冲正追回：已付异常 CB-3301", "chargeback", "P-10009", "CB-3301", "高", "pending_approval", "u-fin1", "结算财务组", 2, "R2", "5,600.00", "2026-11-19 10:02"),
    T("T-24106", "佣金异常：价格快照差异 CM-4390", "commission_exception", "P-10012", "CM-4390", "中", "open", null, "结算财务组", 18, "R0", "86.40", "2026-11-19 07:41"),
    T("T-24107", "归属冲突复核：客户 C-80511", "attribution_review", "P-10017", "ATTR-7731", "中", "processing", "u-ops1", "运营一组", 12, "R1", "—", "2026-11-19 09:30"),
    T("T-24108", "清退步骤：停链确认 P-10040", "offboarding_step", "P-10040", "OFF-0107", "中", "processing", "u-ops1", "运营一组", 40, "R2", "—", "2026-11-18 16:10"),
    T("T-24109", "回传连续失败：目标域 tracker-sample.example", "integration", "P-10006", "DLV-88217", "中", "open", null, "平台运维组", 7, "R0", "—", "2026-11-19 10:11"),
    T("T-24110", "缺失注册事件补数：EVT-batch-1118", "data_backfill", "—", "BF-2031", "低", "processing", "u-adm1", "平台运维组", 52, "R0", "—", "2026-11-18 14:05"),
    T("T-24111", "申诉复核：结算案件 CS-5472", "appeal", "P-10024", "AP-1209", "高", "waiting_material", "u-risk1", "风控复核组", 9, "R2", "980.00", "2026-11-19 08:20"),
    T("T-24112", "结算延长复核：集群 G-2198", "hold_extend", "G-2198", "HX-0415", "中", "open", null, "风控复核组", 21, "R2", "2,030.00", "2026-11-19 06:58"),
    T("T-24113", "熔断复核：日上限命中", "circuit_breaker", "P-10031", "CB-0088", "高", "pending_execution", "u-risk2", "风控复核组", 4, "R3", "12,400.00", "2026-11-19 09:55"),
    T("T-24114", "信用调级复核：C3 → C2（风险传导）", "credit_review", "P-10022", "CR-0612", "中", "returned", "u-risk1", "风控复核组", 15, "R2", "—", "2026-11-18 20:44"),
    T("T-24115", "归属争议：重复归属 C-80622", "attribution_review", "P-10011", "ATTR-7740", "低", "open", null, "运营一组", 34, "R0", "—", "2026-11-19 07:15"),
    T("T-24116", "超时冻结信号复核：客户 C-80702", "settlement_overdue", "P-10029", "CS-5560 · CM-4471", "中", "open", null, "风控复核组", -1, "R1", "310.00", "2026-11-19 05:30"),
    T("T-24117", "风险复核：CRM 欺诈库命中 C-80419", "risk_review", "C-80419", "FR-0201", "高", "execution_failed", "u-risk2", "风控复核组", -6, "R3", "1,980.00", "2026-11-19 08:03"),
    T("T-24118", "佣金异常：补差佣金重算 CM-4402", "commission_exception", "P-10014", "CM-4402", "低", "processing", "u-fin2", "结算财务组", 60, "R0", "42.00", "2026-11-18 15:22"),
    T("T-24119", "保证金抵扣：覆盖不足 L-1201", "guarantee_offset", "P-10031", "L-1201", "高", "open", null, "结算财务组", 6, "R3", "4,300.00", "2026-11-19 09:40"),
    T("T-24120", "集成失败：CRM KYC 同步超时 P-10033", "integration", "P-10033", "SYNC-5521", "中", "processing", "u-adm1", "平台运维组", 3, "R0", "—", "2026-11-19 10:05"),
    T("T-24121", "冲正追回：多笔债务登记 CB-3322", "chargeback", "P-10009", "CB-3322", "中", "executing", "u-fin2", "结算财务组", 20, "R2", "1,120.00", "2026-11-19 10:09"),
    T("T-24122", "申诉复核：窗口内第 1 次 AP-1215", "appeal", "P-10027", "AP-1215", "中", "open", null, "运营一组", 28, "R1", "260.00", "2026-11-19 08:40"),
    T("T-24123", "清退步骤：最终结算核对 P-10040", "offboarding_step", "P-10040", "OFF-0108", "高", "open", null, "结算财务组", 11, "R2", "6,780.00", "2026-11-19 09:00"),
    T("T-24124", "风险复核：观察期到期 C-80233", "risk_review", "C-80233", "EVT-9870", "低", "processing", "u-risk1", "风控复核组", null, "R1", "—", "2026-11-17 11:12"),
    T("T-24125", "事件补数：缺失首次入金事件", "data_backfill", "—", "BF-2036", "中", "open", null, "平台运维组", 16, "R0", "—", "2026-11-19 09:20"),
    T("T-24126", "已完成：归属争议 C-80101", "attribution_review", "P-10017", "ATTR-7702", "低", "done", "u-ops2", "运营一组", 12, "R0", "—", "2026-11-18 12:00")
  ];

  /* ---------- 合作方（业务状态 4 态：草稿/正常/暂停/已终止；原因标签见页面 16 第 5.1 节）---------- */
  ADM.partnerStates = {
    draft: { name: "草稿", tone: "" },
    active: { name: "正常", tone: "ok" },
    suspended: { name: "暂停", tone: "warn" },
    terminated: { name: "已终止", tone: "" }
  };
  const P = (id, name, kind, country, state, tags, c, r, kyc, owner, valid, comm, extra) =>
    Object.assign({ id, name, kind, country, state, tags: tags || [], c, r, kyc, owner, valid, comm }, extra || {});
  ADM.partners = [
    P("P-10006", "晨曦内容工作室", "个人", "SG", "active", [], "C2", "R0", "通过", "u-ops1", 38, "6,420.00", { blockers: [{ s: "warning", t: "回传连续失败 3 次", tab: "promotion" }] }),
    P("P-10009", "跃岭数字传媒", "企业", "MY", "suspended", ["冻结"], "C1", "R2", "通过", "u-ops1", 12, "1,980.00", { blockers: [{ s: "blocking", t: "冲正追回待审批，结算受限", tab: "finance" }] }),
    P("P-10011", "北辰投放小组", "企业", "TH", "active", [], "C3", "R0", "通过", "u-ops2", 91, "18,240.00"),
    P("P-10012", "拾光测评", "个人", "VN", "active", [], "C2", "R0", "通过", "u-ops2", 24, "3,106.50"),
    P("P-10014", "云岸联盟", "企业", "ID", "active", [], "C3", "R1", "通过", "u-ops1", 67, "12,880.00", { blockers: [{ s: "info", t: "补差佣金重算中", tab: "finance" }] }),
    P("P-10017", "迅帆流量", "企业", "PH", "suspended", ["观察"], "C2", "R1", "通过", "u-ops1", 29, "4,510.00", { blockers: [{ s: "warning", t: "存在归属冲突待复核", tab: "overview" }] }),
    P("P-10018", "青砚资讯", "个人", "SG", "active", [], "C1", "R1", "通过", "u-ops2", 9, "1,215.00"),
    P("P-10022", "远帆互动", "企业", "MY", "active", [], "C3", "R2", "通过", "u-ops1", 55, "9,760.00", { blockers: [{ s: "warning", t: "信用调级复核中（C3→C2）", tab: "risk" }] }),
    P("P-10024", "灯塔社群", "企业", "TH", "suspended", ["受限"], "C2", "R2", "通过", "u-ops1", 43, "7,330.00", { blockers: [{ s: "blocking", t: "超时冻结信号待复核", tab: "finance" }] }),
    P("P-10027", "木棉视频", "个人", "ID", "active", [], "C2", "R1", "通过", "u-ops2", 17, "2,260.00"),
    P("P-10029", "回声导购", "个人", "VN", "active", [], "C1", "R1", "通过", "u-ops1", 6, "640.00"),
    P("P-10031", "万象增长", "企业", "PH", "suspended", ["受限", "冻结"], "C1", "R3", "通过", "u-ops1", 148, "36,410.00", { blockers: [{ s: "blocking", t: "风险占比超阈，日上限熔断", tab: "risk" }, { s: "blocking", t: "保证金覆盖不足", tab: "finance" }] }),
    P("P-10033", "星屿评论", "个人", "SG", "draft", [], "—", "—", "进行中", "u-ops2", 0, "0.00", { app: "审核中", blockers: [{ s: "warning", t: "CRM 同步超时，待人工处理", tab: "compliance" }] }),
    P("P-10036", "海盐出海", "企业", "MY", "draft", [], "—", "—", "未知", "u-ops1", 0, "0.00", { app: "待 CRM 确认", blockers: [{ s: "info", t: "已批准，等待 CRM 确认同一版本", tab: "compliance" }] }),
    P("P-10038", "纸鸢专栏", "个人", "TH", "draft", [], "—", "—", "未开始", "u-ops2", 0, "0.00", { app: "补件", blockers: [{ s: "warning", t: "待补充收款资料说明", tab: "compliance" }] }),
    P("P-10040", "旧港联盟", "企业", "ID", "suspended", ["清退中"], "C1", "R2", "通过", "u-ops1", 31, "5,590.00", { blockers: [{ s: "blocking", t: "清退流程进行中：最终结算待核对", tab: "follow-up" }] }),
    P("P-10003", "松间评测", "个人", "SG", "terminated", ["已归档"], "C2", "R0", "通过", "u-ops2", 20, "2,880.00")
  ];

  /* ---------- 仪表盘演示数据 ---------- */
  ADM.signals = [
    { lv: "P0", name: "支付系统回执缺失：提现批次 WD-0919", status: "查询中", objs: 3, amt: "2,400.00", first: "09:12", last: "10:20", to: "withdrawal-list", roles: ["fin", "admin"] },
    { lv: "P1", name: "结算超时冻结：新增 4 个案件三元组", status: "已生成任务", objs: 4, amt: "5,830.00", first: "昨日 18:00", last: "09:48", to: "d-plus-n", roles: ["risk", "fin", "admin", "ops"] },
    { lv: "P1", name: "合作方风险占比超阈：P-10031", status: "调查中", objs: 1, amt: "8,960.50", first: "09:12", last: "09:55", to: "risk-event", roles: ["risk", "admin", "ops"] },
    { lv: "P1", name: "CRM KYC 同步超时：2 个合作方", status: "重试中", objs: 2, amt: null, first: "昨日 22:40", last: "10:05", to: "integration-governance", roles: ["admin", "ops"] },
    { lv: "P2", name: "回传连续失败：1 个目标", status: "待处理", objs: 1, amt: null, first: "08:40", last: "10:11", to: "postback", roles: ["ops", "admin"] },
    { lv: "P2", name: "对账差异：2 笔待核验", status: "待核验", objs: 2, amt: "310.00", first: "昨日", last: "09:00", to: "withdrawal-list", roles: ["fin", "admin"] },
    { lv: "P3", name: "归因覆盖率小幅下降", status: "观察", objs: 0, amt: null, first: "昨日", last: "08:00", to: "attribution-links", roles: ["ops", "admin"] }
  ];

  ADM.ranges = [
    { key: "today", label: "今日", k: 0.14 },
    { key: "yesterday", label: "昨日", k: 0.15 },
    { key: "7d", label: "最近 7 天", k: 1 },
    { key: "30d", label: "最近 30 天", k: 4.1 },
    { key: "month", label: "本月", k: 3.3 },
    { key: "lastmonth", label: "上月", k: 4.4 }
  ];

  ADM.trendBase = [
    { d: "11-13", click: 8420, reg: 612, ftd: 138, qc: 71 },
    { d: "11-14", click: 9110, reg: 655, ftd: 149, qc: 80 },
    { d: "11-15", click: 7650, reg: 540, ftd: 121, qc: 64 },
    { d: "11-16", click: 6980, reg: 498, ftd: 112, qc: 60 },
    { d: "11-17", click: 9540, reg: 701, ftd: 160, qc: 88 },
    { d: "11-18", click: 10230, reg: 742, ftd: 171, qc: 95 },
    { d: "11-19", click: 4960, reg: 351, ftd: 79, qc: 41 }
  ];

  ADM.fmt = {
    int: (n) => Number(n).toLocaleString("en-US"),
    usd: (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  };
})();
