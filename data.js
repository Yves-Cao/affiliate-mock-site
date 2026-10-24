window.AFF = window.AFF || {};

AFF.routes = [
  { id: "dash", group: "数据总览", label: "仪表盘" },
  { id: "perf", group: "数据总览", label: "业绩数据" },
  { id: "clients", group: "数据总览", label: "客户列表" },
  { id: "promo", group: "推广管理", label: "推广链接与活动" },
  { id: "deep", group: "推广管理", label: "深度链接" },
  { id: "assets", group: "推广管理", label: "素材库" },
  { id: "pay", group: "收益中心", label: "收益与提现" },
  { id: "lookup", group: "收益中心", label: "客户归属查询" },
  { id: "wd", group: "收益中心", label: "提现" },
  { id: "apply", group: "资料", label: "入驻申请" }
];

AFF.users = {
  partner: {
    userId: "U-P-001",
    name: "Mock Partner",
    role: "partner",
    profileComplete: false,
    permissions: ["clients:read", "commissions:read", "withdrawals:create"]
  }
};

AFF.dashboard = {
  metrics: [
    { label: "钱包余额（可提现）", value: "$12,480.50" },
    { label: "未激活客户", value: "247", hint: "已注册 · 尚未判定为有效FTD" },
    { label: "累计已支付", value: "$34,215.00" },
    { label: "合格客户（本月）", value: "182", hint: "▲ 23 较上月" }
  ],
  link: "https://track.example.com/r/AFF1001?utm_source=partner",
  trends: {
    day: [38, 52, 44, 61, 58, 72, 66, 79, 84, 76, 91, 88, 96, 104],
    week: [168, 204, 189, 226, 214, 248, 262, 289],
    month: [720, 812, 776, 890, 942, 1028]
  }
};

AFF.performance = {
  dimensions: ["日期", "国家", "UTM 来源", "UTM 媒介", "UTM 活动", "UTM 关键词", "UTM 内容"],
  metrics: [
    "印象", "安装", "被拦截安装", "访客量UV", "点击量", "点击到达率", "注册量",
    "首次入金", "首次入金金额", "开始交易", "合格客户",
    "忠诚客户", "持有客户", "黑名单客户",
    "预计收益", "已拒绝利润", "暂扣利润", "EPC"
  ],
  rows: [
    ["2026-10-22", "新加坡", "Telegram", "社交媒体", "十月投放", "外汇", "横幅A", 18200, 620, 32, 4820, 5360, "29.5%", 402, 132, "$26,400", 121, 88, 92, 8, "$8,800", "$120", "$260", "$1.83"],
    ["2026-10-21", "新加坡", "谷歌广告", "竞价广告", "十月投放", "外汇", "视频B", 15400, 480, 28, 4010, 4310, "27.8%", 351, 118, "$23,600", 108, 79, 83, 7, "$7,900", "$90", "$210", "$1.97"],
    ["2026-10-20", "马来西亚", "Telegram", "社交媒体", "十月投放", "交易", "横幅A", 12100, 410, 21, 3380, 3720, "30.2%", 296, 96, "$19,200", 89, 68, 71, 5, "$6,800", "$80", "$180", "$1.83"],
    ["2026-10-19", "马来西亚", "推荐链接", "推荐流量", "财经博客", "外汇", "横幅A", 8600, 280, 12, 2260, 2510, "26.4%", 187, 61, "$12,200", 55, 43, 45, 3, "$4,300", "$40", "$100", "$1.71"],
    ["2026-10-18", "巴西", "Facebook", "竞价广告", "九月测试", "交易", "视频B", 7400, 210, 18, 1840, 2080, "24.1%", 142, 39, "$7,800", 33, 24, 28, 4, "$2,700", "$60", "$90", "$1.30"]
  ]
};

AFF.clients = [
  {
    clientId: "C-10241", email: "w***@gmail.com", status: "qualified", registeredAt: "2026-10-18",
    country: "马来西亚", platform: "Web", kyc: "通过", source: "Telegram", medium: "社交媒体",
    campaign: "十月 Telegram 投放", term: "外汇", content: "横幅 A 版", loyal: true,
    qualifiedAt: "2026-10-20", tier: "T2", subId: "tg_group_01", expected: "$400", paid: "$400", rejected: "$0", held: "$0"
  },
  {
    clientId: "C-10240", email: "a***@example.com", status: "holding", registeredAt: "2026-10-18",
    country: "新加坡", platform: "App", kyc: "通过", source: "谷歌广告", medium: "竞价广告",
    campaign: "十月投放", term: "外汇", content: "视频 B 版", loyal: false,
    qualifiedAt: "2026-10-21", tier: "A", subId: "sg_search_02", expected: "$120", paid: "$0", rejected: "$0", held: "$120"
  },
  {
    clientId: "C-10239", email: "n***@example.com", status: "registered", registeredAt: "2026-10-19",
    country: "巴西", platform: "Web", kyc: "未提交", source: "Facebook", medium: "社交媒体",
    campaign: "九月测试", term: "交易", content: "横幅 A 版", loyal: false,
    qualifiedAt: "-", tier: "C", subId: "br_social_03", expected: "$0", paid: "$0", rejected: "$0", held: "$0"
  }
];

AFF.campaigns = [
  { name: "十月 Telegram 投放", link: "https://track.example.com/r/AFF1001?camp=oct-tg", status: "启用", registrations: 402, qualified: 88, expected: "$8,800" },
  { name: "财经博客内容位", link: "https://track.example.com/r/AFF1001?camp=blog", status: "启用", registrations: 187, qualified: 43, expected: "$4,300" },
  { name: "九月信息流测试", link: "https://track.example.com/r/AFF1001?camp=sep-test", status: "暂停", registrations: 142, qualified: 39, expected: "$2,700" }
];

AFF.subIds = [
  { id: "tg_group_01", status: "启用", updatedAt: "2026-10-22" },
  { id: "sg_search_02", status: "启用", updatedAt: "2026-10-21" },
  { id: "br_social_03", status: "已封禁", updatedAt: "2026-10-18" }
];

AFF.commissions = {
  metrics: [
    { label: "可提现余额", value: "$12,480.50", hint: "已过Hold期且已批准" },
    { label: "暂扣中（Hold）", value: "$1,260.00", hint: "初始1天，按风险分递增；超30天冻结转人工" },
    { label: "已拒绝（本期）", value: "$140.00", hint: "资格未达标拒付 · 申诉期内" },
    { label: "已付追回", value: "$300.00", hint: "已付佣金冲正 · 追回进行中" }
  ],
  rows: [
    { date: "2026-10-23", type: "日度结算", note: "日结批次", amount: "$820.00", status: "已批准", action: "" },
    { date: "2026-10-22", type: "暂扣生效", note: "风险分R1，动态Hold 2天", amount: "$120.00", status: "暂扣", action: "" },
    { date: "2026-10-21", type: "佣金拒绝", note: "QFTD-02 未达质量门槛", amount: "-$140.00", status: "已拒绝", action: "申诉", appealOpen: true },
    { date: "2026-10-20", type: "已付追回", note: "KYC复检失败 RC-1024", amount: "-$300.00", status: "追回中", action: "" },
    { date: "2026-10-19", type: "提现", note: "尾号6621", amount: "$2,000.00", status: "已到账", action: "" },
    { date: "2026-10-18", type: "佣金批准", note: "C-10241 合格客户", amount: "$400.00", status: "已批准", action: "" }
  ]
};

AFF.withdrawals = [
  { date: "2026-10-19", method: "电汇", amount: "$2,000.00", status: "已支付", note: "尾号6621" },
  { date: "2026-10-12", method: "电汇", amount: "$1,200.00", status: "已支付", note: "尾号6621" },
  { date: "2026-10-05", method: "其他", amount: "$800.00", status: "处理中", note: "渠道确认中" },
  { date: "2026-09-28", method: "电汇", amount: "$1,650.00", status: "已拒绝", note: "资料待完善" }
];

AFF.assets = [
  { name: "300x250 引流横幅-中文", type: "网幅", size: "300x250 · 中文", date: "2026-10-20", preview: "300x250" },
  { name: "728x90 品牌横幅-英文", type: "网幅", size: "728x90 · 英文", date: "2026-10-20", preview: "728x90" },
  { name: "开户引导视频", type: "视频", size: "16:9 · 中英", date: "2026-10-18", preview: "VIDEO" },
  { name: "标准落地页", type: "落地页", size: "Web · 中文", date: "2026-10-16", preview: "LP" },
  { name: "Telegram 动图", type: "GIF", size: "480x270 · 中文", date: "2026-10-15", preview: "GIF" },
  { name: "Affiliate 品牌标志", type: "标志", size: "SVG · 透明底", date: "2026-10-10", preview: "LOGO" }
];

AFF.lookupIndex = [
  { key: "C-10241", id: "C-10241", email: "w***@gmail.com", owned: true, date: "2026-10-18", reason: "30天归因窗口内首次点击，此后锁定" },
  { key: "w***@gmail.com", id: "C-10241", email: "w***@gmail.com", owned: true, date: "2026-10-18", reason: "30天归因窗口内首次点击，此后锁定" },
  { key: "C-10239", id: "C-10239", email: "n***@example.com", owned: false, date: "-", reason: "该客户已归属其他推广方，仅返回有限原因" }
];

AFF.deepLinks = {
  pages: ["注册页", "首页", "Standard·MT5开户页", "Pro·MT4开户页", "Zero·MT5开户页"],
  systems: ["iOS (App Store)", "Android (Google Play)"],
  languages: ["简体中文", "English", "ไทย", "Tiếng Việt"]
};

AFF.parameters = {
  qualification: "入金 + 真实交易组合条件",
  settlement: "日结 · 不设最低提现",
  hold: "动态Hold：初始1天，超过30天转人工",
  demoTrade: "模拟盘不计入"
};
