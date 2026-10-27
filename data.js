window.AFF = window.AFF || {};

AFF.routes = [
  { id: "dash", group: "仪表盘", label: "仪表盘" },
  { id: "perf", group: "数据总览", label: "业绩数据" },
  { id: "clients", group: "数据总览", label: "客户列表" },
  { id: "promo", group: "推广管理", label: "推广链接与活动" },
  { id: "deep", group: "推广管理", label: "深度链接" },
  { id: "tracker", group: "推广管理", label: "链接追踪器" },
  { id: "assets", group: "推广管理", label: "素材库" },
  { id: "pay", group: "收益中心", label: "收益与提现" },
  { id: "lookup", group: "收益中心", label: "客户归属查询" },
  { id: "wd", group: "收益中心", label: "提现" },
  { id: "apply", group: "资料", label: "合作者计划" },
  { id: "onboarding", group: "前置流程", label: "入驻申请" }
];

AFF.onboardingAgreements = [
  { title: "《主协议》", summary: "摘要：约定合作范围、佣金结算方式、双方权利义务与终止条款。" },
  { title: "《推广行为准则》", summary: "摘要：禁止品牌词竞价、夸大宣传与非市场报价；违规将触发风控事件并累计风险分。" },
  { title: "《客户归属与佣金规则》", summary: "摘要：归因窗口内首次点击定归属、锁定不改；CPA 档位按客户国家 × 合作者档位定价。" }
];

AFF.users = {
  partner: {
    userId: "U-P-001",
    name: "Affiliate Partner",
    role: "partner",
    profileComplete: false,
    permissions: ["clients:read", "commissions:read", "withdrawals:create"]
  }
};

AFF.dashboard = {
  metrics: [
    { label: "钱包余额（可提现）", value: "$12,480.50" },
    { label: "未激活客户", value: "247", hint: "已注册 · 尚未判定为有效FTD" },
    { label: "合格客户（本月）", value: "182", hint: "▲ 23 较上月" }
  ],
  totalRevenue: "$34,215.00",
  link: "https://track.example.com/r/AFF1001?utm_source=partner",
  summaryPeriods: {
    today: { registrations: "28", qualified: "9", revenue: "$1,280.00" },
    past7: { registrations: "186", qualified: "54", revenue: "$6,840.00" },
    past30: { registrations: "742", qualified: "182", revenue: "$34,215.00" },
    lastWeek: { registrations: "214", qualified: "61", revenue: "$8,450.00" },
    lastMonth: { registrations: "816", qualified: "203", revenue: "$37,980.00" }
  },
  trends: {
    day: [38, 52, 44, 61, 58, 72, 66, 79, 84, 76, 91, 88, 96, 104],
    week: [168, 204, 189, 226, 214, 248, 262, 289],
    month: [720, 812, 776, 890, 942, 1028]
  },
  labels: {
    day: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"],
    week: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
    month: ["May", "Jun", "Jul", "Aug", "Sep", "Oct"]
  },
  titles: { day: "近14天", week: "近8周", month: "近6个月" }
};

AFF.partnerProgram = {
  commissionCountryRows: [
    ["Thailand (TH)", "TH", null, 350, 650, 1400],
    ["South Africa (ZA)", "ZA", 30, 80, 230, 710],
    ["Vietnam (VN)", "VN", 100, 230, 460, 1650],
    ["Indonesia (ID)", "ID", 60, 190, 410, 1100],
    ["Pakistan (PK)", "PK", 70, 155, 330, 890],
    ["Bangladesh (BD)", "BD", 60, 170, 370, 900],
    ["Maldives (MV)", "MV", 90, 240, 540, 1100],
    ["Egypt (EG)", "EG", 80, 150, 390, 780],
    ["Nigeria (NG)", "NG", 25, 70, 220, 590],
    ["Ghana (GH)", "GH", 30, 80, 230, 710],
    ["Kenya (KE)", "KE", 30, 60, 160, 710],
    ["Uganda (UG)", "UG", 30, 80, 210, 660],
    ["Cape Verde (CV)", "CV", 25, 70, 230, 800],
    ["Zimbabwe (ZW)", "ZW", 25, 80, 230, 660],
    ["Botswana (BW)", "BW", 20, 70, 230, 660],
    ["Kuwait (KW)", "KW", 110, 320, 580, 1320],
    ["Bahrain (BH)", "BH", 80, 250, 440, 1230],
    ["Qatar (QA)", "QA", 80, 320, 490, 1170],
    ["Jordan (JO)", "JO", 120, 220, 480, 1040],
    ["Mexico (MX)", "MX", 50, 120, 310, 960],
    ["Chile (CL)", "CL", 70, 180, 370, 950],
    ["Argentina (AR)", "AR", 70, 150, 310, 830],
    ["Colombia (CO)", "CO", 60, 130, 250, 760],
    ["Peru (PE)", "PE", 60, 140, 250, 760],
    ["Costa Rica (CR)", "CR", 50, 120, 280, 760],
    ["Bolivia (BO)", "BO", 60, 140, 280, 950],
    ["Paraguay (PY)", "PY", 60, 120, 280, 760],
    ["Ecuador (EC)", "EC", 70, 120, 290, 760],
    ["Guatemala (GT)", "GT", 50, 120, 280, 760],
    ["Morocco (MA)", "MA", 60, 120, 230, 750],
    ["Algeria (DZ)", "DZ", 60, 120, 360, 1040],
    ["Kazakhstan (KZ)", "KZ", 150, 350, 650, 1270],
    ["Sri-Lanka (LK)", "LK", 70, 150, 430, 930],
    ["Brunei Darussalam (BN)", "BN", 70, 180, 420, 890],
    ["Cambodia (KH)", "KH", 120, 250, 550, 890],
    ["Nepal (NP)", "NP", 70, 190, 410, 890],
    ["Azerbaijan (AZ)", "AZ", 80, 240, 500, 1200],
    ["Georgia (GE)", "GE", 80, 240, 500, 1200],
    ["The Republic of Moldova (MD)", "MD", 80, 240, 500, 1200],
    ["Mongolia (MN)", "MN", 80, 240, 500, 1200],
    ["Tajikistan (TJ)", "TJ", 100, 240, 500, 1200],
    ["Turkmenistan (TM)", "TM", 80, 240, 500, 1200],
    ["Uzbekistan (UZ)", "UZ", 150, 340, 640, 1330],
    ["The Dominican Republic (DO)", "DO", 70, 160, 340, 950],
    ["Guyana (GY)", "GY", 50, 120, 280, 950],
    ["Trinidad and Tobago (TT)", "TT", 50, 160, 280, 950],
    ["Tunisia (TN)", "TN", 70, 180, 400, 920],
    ["Burkina Faso (BF)", "BF", 35, 90, 230, 680],
    ["Benin (BJ)", "BJ", 25, 80, 230, 680],
    ["Côte d'Ivoire (CI)", "CI", 25, 80, 230, 680],
    ["Cameroon (CM)", "CM", 30, 80, 200, 680],
    ["Djibouti (DJ)", "DJ", 25, 70, 230, 680],
    ["Ethiopia (ET)", "ET", 40, 110, 300, 680],
    ["Gabon (GA)", "GA", 25, 70, 230, 680],
    ["Guinea (GN)", "GN", 25, 70, 230, 680],
    ["Mozambique (MZ)", "MZ", 25, 70, 230, 680],
    ["Senegal (SN)", "SN", 35, 70, 230, 680],
    ["Eswatini (SZ)", "SZ", 25, 70, 230, 680],
    ["Togo (TG)", "TG", 25, 70, 230, 680],
    ["United Republic of Tanzania (TZ)", "TZ", 25, 70, 220, 680],
    ["Zambia (ZM)", "ZM", 20, 70, 230, 680],
    ["Chad (TD)", "TD", 25, 70, 230, 680],
    ["Libya (LY)", "LY", 80, 190, 400, 920],
    ["Antigua and Barbuda (AG)", "AG", 50, 120, 280, 760],
    ["Armenia (AM)", "AM", 80, 240, 500, 1200],
    ["Aruba (AW)", "AW", 50, 120, 280, 760],
    ["Belize (BZ)", "BZ", 50, 120, 280, 800],
    ["Bhutan (BT)", "BT", 70, 180, 420, 1040],
    ["Burundi (BI)", "BI", 25, 70, 230, 660],
    ["Dominica (DM)", "DM", 50, 120, 280, 800],
    ["El Salvador (SV)", "SV", 60, 120, 280, 760],
    ["Equatorial Guinea (GQ)", "GQ", 25, 70, 230, 660],
    ["Eritrea (ER)", "ER", 25, 70, 230, 690],
    ["Gambia (GM)", "GM", 25, 70, 230, 660],
    ["Grenada (GD)", "GD", 50, 120, 280, 760],
    ["Guinea-Bissau (GW)", "GW", 25, 70, 230, 690],
    ["Honduras (HN)", "HN", 50, 120, 280, 760],
    ["Isle of Man (IM)", "IM", 80, 240, 460, 1080],
    ["Jamaica (JM)", "JM", 50, 100, 320, 760],
    ["Kyrgyzstan (KG)", "KG", 80, 240, 500, 1200],
    ["Lao People's Democratic Republic (LA)", "LA", 80, 180, 420, 890],
    ["Lesotho (LS)", "LS", 25, 70, 230, 660],
    ["Liberia (LR)", "LR", 25, 70, 230, 660],
    ["Macao (MO)", "MO", 80, 250, 500, 1020],
    ["Madagascar (MG)", "MG", 30, 80, 230, 660],
    ["Malawi (MW)", "MW", 25, 70, 230, 660],
    ["Mauritania (MR)", "MR", 80, 210, 400, 920],
    ["Montenegro (ME)", "ME", 80, 250, 480, 960],
    ["Montserrat (MS)", "MS", 50, 120, 290, 800],
    ["Nauru (NR)", "NR", 80, 240, 460, 1080],
    ["Niger (NE)", "NE", 25, 70, 230, 660],
    ["Papua New Guinea (PG)", "PG", 80, 240, 460, 1080],
    ["Saint Kitts and Nevis (KN)", "KN", 50, 120, 280, 760],
    ["Sao Tome and Principe (ST)", "ST", 25, 70, 230, 690],
    ["Serbia (RS)", "RS", 80, 250, 480, 960],
    ["Sierra Leone (SL)", "SL", 25, 70, 230, 660],
    ["Solomon Islands (SB)", "SB", 80, 240, 460, 1080],
    ["Suriname (SR)", "SR", 50, 120, 280, 760],
    ["Timor-Leste (TL)", "TL", 80, 240, 460, 1080],
    ["Tonga (TO)", "TO", 80, 240, 460, 1080],
    ["Oman (OM)", "OM", 150, 300, 510, 1170],
    ["Saudi Arabia (SA)", "SA", 150, 330, 580, 1750],
    ["Angola (AO)", "AO", 30, 70, 230, 660]
  ],
  get commissionCountries() {
    return this.commissionCountryRows.map(([name, code, p10, p30, p150, p600]) => ({
      name,
      code,
      tiers: [
        { min: 10, label: '$10+', commission: p10, note: p10 ? '' : '该档不适用' },
        { min: name.startsWith('Thailand') ? 100 : 30, label: name.startsWith('Thailand') ? '$100+' : '$30+', commission: p30, note: name.startsWith('Thailand') ? 'TH特殊门槛' : '' },
        { min: 150, label: '$150+', commission: p150, note: '' },
        { min: 600, label: '$600+', commission: p600, note: '' }
      ]
    }));
  },
  conversionCountries: [
    { name: "越南", desktop: [11.8, 36.4, 72.5], mobile: [17.6, 41.8, 78.4], volume: 4820 },
    { name: "泰国", desktop: [10.4, 34.8, 70.2], mobile: [16.2, 39.6, 76.1], volume: 4310 },
    { name: "印度尼西亚", desktop: [9.8, 33.9, 69.4], mobile: [15.4, 38.7, 74.8], volume: 5260 },
    { name: "南非", desktop: [9.2, 31.8, 67.2], mobile: [12.8, 34.2, 70.6], volume: 3140 },
    { name: "尼日利亚", desktop: [8.6, 30.4, 65.8], mobile: [12.1, 32.9, 69.2], volume: 2890 },
    { name: "巴基斯坦", desktop: [8.1, 29.6, 64.4], mobile: [11.4, 31.2, 67.5], volume: 3520 },
    { name: "埃及", desktop: [7.8, 28.9, 63.2], mobile: [10.8, 30.4, 66.8], volume: 2680 },
    { name: "科威特", desktop: [7.2, 27.8, 61.4], mobile: [9.1, 27.2, 62.8], volume: 1240 }
  ],
  supportCountries: [
    { name: "越南", web: true, android: true, ios: true, note: "三端均可注册与交易" },
    { name: "泰国", web: true, android: true, ios: true, note: "iOS支付渠道受限" },
    { name: "印度尼西亚", web: true, android: true, ios: true, note: "安卓安装包需归因回传" },
    { name: "南非", web: true, android: true, ios: false, note: "iOS暂未开放注册" },
    { name: "尼日利亚", web: true, android: true, ios: false, note: "iOS待监管评审" },
    { name: "巴基斯坦", web: true, android: true, ios: true, note: "三端支持" },
    { name: "埃及", web: true, android: false, ios: false, note: "仅Web端支持" },
    { name: "科威特", web: true, android: true, ios: true, note: "三端支持" },
    { name: "卡塔尔", web: true, android: true, ios: true, note: "三端支持" },
    { name: "哈萨克斯坦", web: true, android: true, ios: true, note: "三端支持" },
    { name: "沙特阿拉伯", web: true, android: true, ios: true, note: "iOS仅App Store分发" },
    { name: "孟加拉国", web: true, android: true, ios: false, note: "iOS暂未开放" }
  ],
  assets: [
    { name: "抖音竖版落地页", device: "网站", platform: "抖音", type: "落地页", resolution: "1080×1920" },
    { name: "YouTube横幅", device: "网站", platform: "YouTube", type: "横幅广告", resolution: "1280×720" },
    { name: "Telegram动图", device: "网站", platform: "Telegram", type: "GIF", resolution: "800×600" },
    { name: "抖音安卓安装视频", device: "安卓", platform: "抖音", type: "视频", resolution: "1080×1920" },
    { name: "YouTube安卓横幅", device: "安卓", platform: "YouTube", type: "横幅广告", resolution: "1920×1080" },
    { name: "Telegram安卓短链落地页", device: "安卓", platform: "Telegram", type: "落地页", resolution: "自适应" },
    { name: "抖音iOS开屏视频", device: "iOS", platform: "抖音", type: "视频", resolution: "1080×1920" },
    { name: "YouTube iOS横幅", device: "iOS", platform: "YouTube", type: "横幅广告", resolution: "1280×720" },
    { name: "Telegram iOS动图", device: "iOS", platform: "Telegram", type: "GIF", resolution: "640×480" },
    { name: "全端通用注册GIF", device: "网站", platform: "抖音", type: "GIF", resolution: "960×540" },
    { name: "移动端教程视频", device: "安卓", platform: "YouTube", type: "视频", resolution: "1920×1080" },
    { name: "iOS评测落地页", device: "iOS", platform: "YouTube", type: "落地页", resolution: "自适应" }
  ],
  shareIntro: `GTC FX Affiliate 合作计划：注册账户、完成首次入金并开始交易后，我可协助你获取交易指引与市场材料。点击链接了解详情：`
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

AFF.trackers = [
  {
    id: "TRK-1001",
    name: "注册与入金回传",
    event: "注册、有效FTD",
    callbackUrl: "https://track.example.com/callback/TRK-1001",
    status: "启用",
    updatedAt: "2026-10-22"
  },
  {
    id: "TRK-1002",
    name: "奖励状态回传",
    event: "奖励状态",
    callbackUrl: "https://track.example.com/callback/TRK-1002",
    status: "暂停",
    updatedAt: "2026-10-18"
  }
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

AFF.assetOptions = {
  bannerSizes: ["120x600", "160x600", "300x250", "320x50", "320x100", "336x280", "468x60", "728x90", "970x90", "970x250", "1080x1080", "1080x1920", "1280x720", "1500x500", "180x150"],
  bannerLanguages: ["简体中文", "English", "ไทย", "Tiếng Việt", "العربية", "Bahasa Indonesia", "Español", "Português", "Français", "हिन्दी", "日本語", "한국어", "Русский", "Türkçe", "Italiano"],
  bannerDevices: ["网页", "APP"],
  videoSizes: ["横向", "纵向"],
  videoLanguages: ["简体中文", "English", "ไทย", "Tiếng Việt", "العربية", "Bahasa Indonesia", "Español", "Português", "Français", "हिन्दी", "日本語", "한국어"],
  gifSizes: ["120x60", "120x90", "125x125", "234x60", "250x250", "300x250", "336x280", "468x60", "728x90", "800x600", "970x90", "1080x1080", "1080x1920", "1200x628", "1280x720"],
  gifPlatforms: ["网页", "APP"]
};

AFF.assets = [
  {
    id: "banner-brand", name: "品牌展示横幅", type: "横幅", date: "2026-10-20",
    sizes: AFF.assetOptions.bannerSizes.slice(0, 15), languages: AFF.assetOptions.bannerLanguages.slice(0, 15), devices: AFF.assetOptions.bannerDevices
  },
  {
    id: "banner-onboarding", name: "开户引导横幅", type: "横幅", date: "2026-10-20",
    sizes: AFF.assetOptions.bannerSizes.slice(0, 12), languages: AFF.assetOptions.bannerLanguages.slice(0, 11), devices: AFF.assetOptions.bannerDevices
  },
  {
    id: "banner-mobile", name: "移动推广横幅", type: "横幅", date: "2026-10-19",
    sizes: AFF.assetOptions.bannerSizes.slice(0, 7), languages: AFF.assetOptions.bannerLanguages.slice(0, 8), devices: AFF.assetOptions.bannerDevices
  },
  {
    id: "banner-campaign", name: "高转化活动横幅", type: "横幅", date: "2026-10-19",
    sizes: AFF.assetOptions.bannerSizes.slice(0, 3), languages: AFF.assetOptions.bannerLanguages.slice(0, 1), devices: AFF.assetOptions.bannerDevices
  },
  {
    id: "video-onboarding", name: "开户引导视频", type: "视频", date: "2026-10-18",
    sizes: AFF.assetOptions.videoSizes, languages: AFF.assetOptions.videoLanguages
  },
  {
    id: "video-platform", name: "平台功能视频", type: "视频", date: "2026-10-17",
    sizes: AFF.assetOptions.videoSizes, languages: AFF.assetOptions.videoLanguages
  },
  {
    id: "video-mobile", name: "移动端教程视频", type: "视频", date: "2026-10-17",
    sizes: AFF.assetOptions.videoSizes, languages: AFF.assetOptions.videoLanguages
  },
  {
    id: "lp-standard", name: "标准开户落地页", type: "落地页", date: "2026-10-16", urlPath: "standard",
    languages: AFF.assetOptions.bannerLanguages.slice(0, 15)
  },
  {
    id: "lp-mobile", name: "移动开户落地页", type: "落地页", date: "2026-10-16", urlPath: "mobile",
    languages: AFF.assetOptions.bannerLanguages.slice(0, 8)
  },
  {
    id: "lp-fund", name: "入金引导落地页", type: "落地页", date: "2026-10-15", urlPath: "fund",
    languages: AFF.assetOptions.bannerLanguages.slice(0, 1)
  },
  {
    id: "gif-telegram", name: "Telegram 动图", type: "GIF", date: "2026-10-15",
    languages: AFF.assetOptions.bannerLanguages.slice(0, 15), sizes: AFF.assetOptions.gifSizes.slice(0, 12), platforms: AFF.assetOptions.gifPlatforms
  },
  {
    id: "gif-social", name: "社交媒体动图", type: "GIF", date: "2026-10-14",
    languages: AFF.assetOptions.bannerLanguages.slice(0, 7), sizes: AFF.assetOptions.gifSizes.slice(0, 3), platforms: AFF.assetOptions.gifPlatforms
  }
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
