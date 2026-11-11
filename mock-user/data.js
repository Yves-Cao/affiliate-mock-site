window.AFF = window.AFF || {};

AFF.routes = [
  { id: "dash", group: "仪表盘", label: "仪表盘" },
  { id: "perf", group: "数据总览", label: "业绩数据" },
  { id: "clients", group: "数据总览", label: "客户数据" },
  { id: "summary", group: "数据总览", label: "总览数据" },
  { id: "assets", group: "推广管理", label: "素材库" },
  { id: "promo", group: "推广管理", label: "活动" },
  { id: "subchannels", group: "推广管理", label: "二级渠道" },
  { id: "deep", group: "推广管理", label: "深度链接" },
  { id: "tracker", group: "推广管理", label: "回传配置" },
  { id: "lookup", group: "推广管理", label: "归属查询" },
  { id: "pay", group: "收益中心", label: "收益数据" },
  { id: "statements", group: "收益中心", label: "结算单", hidden: true },
  { id: "wd", group: "收益中心", label: "提现" },
  { id: "guarantee", group: "收益中心", label: "保证金" },
  { id: "support", group: "服务中心", label: "帮助与工单" },
  { id: "account", group: "服务中心", label: "个人中心", hidden: true },
  { id: "appeals", group: "服务中心", label: "申诉中心" },
  { id: "messages", group: "服务中心", label: "消息中心" },
  { id: "export", group: "服务中心", label: "导出中心" },
  { id: "apply", group: "资料", label: "合作者计划" },
  { id: "onboarding", group: "前置流程", label: "入驻申请" }
];

AFF.countryLabel = value => {
  const program = AFF.partnerProgram;
  if (!program) return value;
  if (program.commissionMarkets) {
    const market = program.commissionMarkets.find(item => item.code === value || item.zh === value || item.name === value);
    if (market) return AFF.state?.language === "en" ? market.name : market.zh;
  }
  if (program.supportCountries) {
    const support = program.supportCountries.find(item => item.code === value || item.name === value);
    if (support) return AFF.state?.language === "en" ? (program.commissionMarkets.find(m => m.code === support.code)?.name || support.name) : support.name;
  }
  if (/^[A-Z]{2}$/.test(String(value))) {
    try {
      const locale = AFF.state?.language === "en" ? "en" : "zh-CN";
      const displayName = new Intl.DisplayNames([locale], { type: "region" }).of(String(value));
      if (displayName) return displayName;
    } catch {}
  }
  return AFF.state?.language === "en" ? "Pending verification" : "待确认";
};

AFF.dataText = value => {
  const countryCode = String(value ?? "");
  if (/^[A-Z]{2}$/.test(countryCode) && AFF.partnerProgram?.commissionMarkets) {
    const market = AFF.partnerProgram.commissionMarkets.find(item => item.code === countryCode);
    if (market) return AFF.state?.language === "en" ? market.name : market.zh;
    if (countryCode === "UN") return AFF.state?.language === "en" ? "Pending verification" : "待确认";
    try {
      const locale = AFF.state?.language === "en" ? "en" : "zh-CN";
      const displayName = new Intl.DisplayNames([locale], { type: "region" }).of(countryCode);
      if (displayName) return displayName;
    } catch {}
  }
  if (AFF.state?.language !== "en") return value;
  const dictionary = {
    "待确认": "Pending verification",
    "秋季交易指南": "Autumn trading guide", "市场观察周刊": "Market watch weekly",
    "移动交易体验": "Mobile trading experience", "新客户入门": "New-client onboarding",
    "社区直播专场": "Community live session", "全球市场专题": "Global markets spotlight",
    "社交媒体": "Social media", "视频平台": "Video platform", "搜索推广": "Search promotion",
    "内容推荐": "Content recommendation", "自主推广": "Direct promotion", "远景传媒": "Vision Media",
    "星河互动": "Star Interactive", "海拓营销": "Ocean Marketing",
    "通过": "Passed", "未提交": "Not submitted", "审核中": "Under review", "失败": "Failed", "不适用": "Not applicable",
    "手机": "Mobile", "平板": "Tablet", "电脑": "Desktop", "未记录": "Not recorded",
    "资料待核验": "Documentation pending verification", "行为待说明": "Behavior pending explanation",
    "质量待复核": "Quality pending review", "支付风险": "Payment risk", "集群风险": "Cluster risk", "其他": "Other", "全部": "All",
    "客户注册资料与流量来源记录": "Client registration profile and traffic-source records",
    "关联行为特征与佣金流水": "Related behavior patterns and commission records",
    "质量服务结果与结算前检查": "Quality-service result and pre-settlement checks",
    "客户与关联佣金": "Client and related commissions",
    "客户、关联佣金与相关链接": "Client, related commissions, and associated links",
    "补充说明": "Provide explanation", "等待复核": "Await review", "等待结算复核": "Await settlement review",
    "低风险调查": "Low-risk investigation", "统一隔离队列": "Unified quarantine queue", "已解除隔离": "Quarantine released",
    "Telegram 社群": "Telegram community", "新加坡搜索推广": "Singapore search promotion",
    "巴西社交推广": "Brazil social promotion", "网站展示位": "Website placement",
    "社群内容位": "Community content placement", "视频推广位": "Video placement",
    "注册事件回传": "Registration event postback", "佣金获批回传": "Commission approval postback",
    "正常流程": "Normal flow", "层级下调": "Tier downgrade", "仅FTD": "FTD only",
    "有效FTD待审": "Valid FTD pending review", "质量服务作废": "Quality service voided",
    "结算延长": "Extended settlement", "结算超时复核": "Settlement timeout review", "拒付": "Chargeback",
    "非新客户": "Not a new client", "欺诈命中": "Fraud hit", "申诉改判": "Appeal overturned"
  };
  Object.assign(dictionary, {
    "注册账号": "Create account", "基本资料与渠道": "Profile and channel", "KYC 提交": "KYC submission",
    "接受协议与准则": "Accept agreements", "资质审核": "Qualification review", "入驻申请": "Onboarding application",
    "注册 → 资料 → KYC 提交 → 协议 → 资质审核。": "Registration → Profile → KYC submission → Agreements → Qualification review.",
    "上一步": "Previous", "下一步": "Next", "提交审核": "Submit review", "已提交": "Submitted",
    "查看协议": "View agreement", "关闭协议": "Close agreement", "阅读并接受": "Read and accept",
    "邮箱": "Email", "邮箱验证": "Email verification", "未验证": "Not verified", "模拟验证": "Simulate verification",
    "账号已创建": "Account created", "请先完成邮箱验证，再继续填写合作者资料。": "Verify your email before completing the partner profile.",
    "账号": "Account", "姓名": "Name", "国家/地区": "Country / region", "推广渠道类型": "Channel type",
    "主要推广国家": "Primary countries", "网站/App": "Website / app",
    "投放方式": "Promotion methods", "自然流量": "Organic traffic",
    "付费投放": "Paid media", "社群运营": "Community operations", "内容营销": "Content marketing",
    "邮件": "Email marketing", "线下活动": "Offline events", "流量画像": "Traffic profile",
    "画像审核": "Profile review", "端到端staging": "End-to-end staging", "待提交": "Not submitted",
    "审核中": "Under review", "已通过": "Passed", "待检查": "Pending check", "可启用": "Can enable", "不可启用": "Cannot enable",
    "查看佣金奖励": "Commission rewards", "高转化地区": "High-converting regions", "查看支持地区": "Supported regions",
    "素材库总览": "Asset library overview", "系统使用指引": "System guide", "分享简介链接": "Share introduction link",
    "L1-L4资格档与国家佣金": "L1-L4 qualification tiers and country commissions",
    "参考CPA按国家直接配置；全部数值可后台配置": "Reference CPA is configured by country; all values are back-office configurable",
    "资格档": "Tier", "净入金 / 交易量 / 交易日": "Net deposit / volume / trading days", "参考CPA": "Reference CPA",
    "如何获得佣金": "How commissions work", "如何成为有效交易者": "How to become a valid trader",
    "选择国家/地区查看哪些平台（网页、iOS、Android）可获得佣金。": "Choose countries or regions to see which platforms can earn commission.",
    "端系统": "Platform", "支持状态": "Support status", "网页端": "Web", "安卓端": "Android", "iOS端": "iOS",
    "支持": "Supported", "不支持": "Not supported", "端支持": "platform support",
    "丰富的创意素材库": "A rich creative library", "适合不同渠道的推广创意": "Creative for different channels",
    "用视频讲好您的推广内容": "Tell your promotion story with video", "让每次点击都有合适的落点": "Give every click the right landing point",
    "快速入口": "Quick entries", "完成引导": "Finish guide", "已完成引导": "Guide completed",
    "新建申诉": "New appeal", "申诉中": "Appealing", "已改判": "Overturned", "已驳回": "Rejected",
    "不可申诉": "Not appealable", "调查任务": "Investigation tasks", "未读消息": "Unread messages",
    "待强制确认": "Required acknowledgement", "规则公告": "Policy announcements", "业务通知": "Business notifications",
    "消息列表": "Message list", "通知": "Notice", "普通已读": "Normal read", "仅提示": "Info only",
    "强制确认": "Required acknowledgement"
    ,"演示环境 · 虚构数据 · 参数为参考值": "Demo environment · synthetic data · reference values", "演示数据": "Demo data",
    "服务器时间": "Server time", "本地时间": "Local time", "可提现": "Withdrawable", "帮助中心": "Help center",
    "消息中心": "Messages", "个人中心": "Personal center", "退出登录": "Sign out",
    "您的账户资料未完善，部分功能可能受限。": "Your partner profile is incomplete; some features may be limited.",
    "知道了": "Dismiss", "去完成": "Complete now"
    ,"1手": "1 lot", "3手": "3 lots", "5手": "5 lots", "10手": "10 lots",
    "1天": "1 day", "3天": "3 days", "5天": "5 days", "8天": "8 days",
    "将您的专属链接分享给交易客户。": "Share your exclusive link with trading clients.",
    "点击您链接的客户必须注册并且在平台进行交易。": "Clients who click your link must register and trade on the platform.",
    "每名有效的交易者可以为您带来佣金收益。": "Each valid trader can generate commission for you.",
    "最低首次入金达到对应国家佣金奖励标准。": "The first deposit must meet the country reward threshold.",
    "有充足的交易活跃度。": "Trading activity must be sufficient.",
    "满足平台": "Meet the platform's", "《有效客户条款和条件》": "Valid Client Terms and Conditions", "中规定的资格要求。": "requirements.",
    "佣金冲正": "Commission reversal", "佣金拒绝": "Commission rejection", "保证金抵扣": "Guarantee offset",
    "客户资格无效": "Invalid client eligibility", "风险分级上调": "Risk level increased", "调查补充材料": "Investigation evidence",
    "客户拒付原因待银行确认": "Client chargeback reason is pending bank confirmation",
    "需补充CRM开户时间截图": "CRM account-opening screenshot is required",
    "保证金释放并补发佣金": "Guarantee released and commission repaid",
    "硬拦截": "Hard block", "欺诈库确权命中不可申诉": "Confirmed fraud-list hit is not appealable",
    "CRM欺诈库命中误报": "CRM fraud-list false positive",
    "投放说明": "Placement explanation", "流量来源截图": "Traffic-source screenshot", "客户沟通记录": "client communication record", "和客户沟通记录": "and client communication records",
    "超时可能升级限制、维持结算阻断或转入人工处理；不会仅因超时自动认定违规。": "Missing the deadline may escalate limits, keep settlement blocked, or move to manual handling. A deadline alone does not establish a violation.",
    "调查通知": "Investigation notice", "解除通知": "Release notice", "隔离通知": "Quarantine notice",
    "规则变更": "Policy change", "申诉进度": "Appeal progress", "系统维护": "System maintenance",
    "保证金规则更新": "Guarantee rule update", "1笔佣金延长观察期": "1 commission observation extended",
    "报表延迟维护完成": "Report delay resolved",
    "自下一结算版本起，佣金结算时按10%扣留滚动保证金，90个自然日后无风险自动释放。": "From the next settlement version, 10% rolling guarantee is withheld at settlement and automatically released after 90 risk-free calendar days.",
    "因国家与支付方式风险档叠加，对应佣金动态结算延长。": "Country and payment risk tiers overlap, so the commission's dynamic hold is extended.",
    "申诉已改判": "Appeal overturned", "复核确认误扣保证金，相关金额已释放至可提现余额。": "Review confirmed the guarantee was mistakenly withheld; the amount has been released to the available balance.",
    "数据报表延迟10分钟，已恢复。": "Data reports were delayed by 10 minutes and have recovered.",
    "需要补充调查材料": "Investigation evidence required",
    "调查已解除，关联佣金等待结算前检查，不会直接入账。": "The investigation was released. Related commissions await pre-settlement checks and are not credited directly.",
    "相关佣金已进入隔离": "Related commissions entered quarantine",
    "调查期间佣金保留并留痕，但不自动结算、不可提现；解除后需等待结算前检查。": "During investigation, commissions are retained and audited but not settled or withdrawable. After release, they await pre-settlement checks."
    ,"请在": "Please respond by ", "后7个自然日内补充": " within 7 calendar days, provide",
    "超时可能升级限制或维持结算阻断。": "Missing the deadline may escalate limits or keep settlement blocked.",
    "调查已解除": "Investigation released", "关联佣金等待结算前检查": "related commissions await pre-settlement checks",
    "不会直接入账": "and are not credited directly", "调查期间佣金保留并留痕": "During investigation, commissions are retained and audited",
    "但不自动结算": "but not settled automatically", "不可提现": "not withdrawable", "解除后需等待结算前检查": "After release, they await pre-settlement checks",
    "调查已解除，等待结算复核": "Investigation released; awaiting settlement review"
  });
  Object.assign(dictionary, {
    "收益与系统指引": "Earnings and system guide",
    "了解佣金的组成，再按推广国家查看相应资格要求与奖励。": "Understand your rewards, then check eligibility and rates for each country.",
    "佣金如何产生": "How commission is earned",
    "首次入金": "First deposit",
    "确认基础奖励": "Confirm the base reward",
    "获得额外奖励": "Earn an additional reward",
    "客户完成首次入金，进入后续资格确认阶段。仅完成首次入金，尚不能获得可提现佣金。": "A first deposit starts the eligibility checks. A first deposit alone does not create withdrawable commission.",
    "达到相应资格要求后，确认基础CPA佣金。FTD与有效FTD两段共同构成完整的基础奖励。": "Base CPA commission is confirmed when eligibility requirements are met. The FTD and effective FTD portions together make up the full base reward.",
    "进一步达到质量服务要求，可获得基础CPA之外的额外奖励；未达成不影响已经成立的基础佣金。": "Meeting quality-service requirements earns an extra reward beyond base CPA. Not meeting them does not affect an established base commission.",
    "FTD与有效FTD两段的基础比例合计100%；三个阶段不代表分三次付款，质量服务奖励不占用基础CPA比例。": "The FTD and effective FTD portions total 100% of base CPA. Three stages do not mean three payments. Quality-service rewards are additional to base CPA.",
    "适用税费在结算时计算，钱包内可提现余额已扣除相应税费，提现时不重复计算。": "Applicable tax is calculated at settlement and already deducted from your withdrawable balance. It is not charged again at withdrawal.",
    "比例、天数及日期仅供试算；实际以适用规则及核验结果为准。": "Rates, periods and dates are estimates only. Applicable rules and verification results determine the actual outcome.",
    "佣金确认后进入结算流程，符合条件的金额按日自动结算。结算时按适用规则留存部分佣金作为保证金，保证金符合释放条件后可提现。": "Confirmed commission enters settlement. Eligible amounts are settled automatically each day. A portion is retained as a guarantee under the applicable rules and becomes withdrawable when release conditions are met.",
    "了解结算与保证金": "About settlement and guarantees",
    "结算周期：": "Settlement period:",
    "佣金需要经过适用的观察与核验周期，再参与每日自动结算。每日结算不代表新佣金次日一定可提现。": "Commission passes through the applicable observation and verification period before daily settlement. Daily settlement does not guarantee next-day availability.",
    "保证金：": "Guarantee:",
    "所有合作者均适用保证金规则。留存金额单独记录，满足期限及释放条件后转为可提现保证金；如涉及调整或抵扣，可查看明细与原因。": "Guarantee rules apply to all partners. Retained amounts are recorded separately and become withdrawable when the period and release conditions are met. Adjustment and offset details include their reasons.",
    "查看完整资金流程": "View the full funds process",
    "后续「收益与系统指引」将说明完整资金流程，以及在哪里查看进度。": "The earnings and system guide explains the full funds process and where to track progress.",
    "了解佣金从确认到可提现的过程，以及在哪里查看客户、收益和保证金。": "Understand how confirmed commission becomes withdrawable and where to track clients, earnings and guarantees.",
    "从佣金确认到提现": "From confirmed commission to withdrawal",
    "佣金确认": "Commission confirmed",
    "结算中": "Settling",
    "质量服务": "Quality service",
    "达到有效FTD或质量服务要求，确认对应奖励。": "The corresponding reward is confirmed when effective FTD or quality-service requirements are met.",
    "经过适用的观察与核验周期，符合条件后参与每日自动结算。": "Eligible amounts enter daily automatic settlement after the applicable observation and verification period.",
    "可提现佣金": "Withdrawable commission",
    "完成结算后，符合提现条件的佣金进入可提现余额。": "After settlement, eligible commission enters your withdrawable balance.",
    "申请提现": "Request withdrawal",
    "完成所需资料并满足提现条件后，申请提取可提现余额。": "Complete the required information and meet withdrawal conditions to request your available balance.",
    "结算时同步留存保证金": "Guarantee retained at settlement",
    "保证金留存": "Guarantee retained",
    "满足期限及释放条件": "Period and release conditions met",
    "可提现保证金": "Withdrawable guarantee",
    "佣金何时可以提现": "When commission becomes withdrawable",
    "佣金确认后开始观察与核验，周期按适用规则确定。符合条件的金额每日自动结算，通常在凌晨执行；准确时间与时区以适用规则为准。": "Observation and verification begin after commission confirmation, for the applicable period. Eligible amounts are settled daily, normally in the early morning. The applicable rules specify the exact time and time zone.",
    "每日结算不代表新佣金次日一定可提现。需要补充资料或进一步核验时，收益详情会显示当前阶段与下一步；提现到账属于后续流程。": "Daily settlement does not guarantee next-day availability. Earnings details show the current stage and next action if more information or verification is needed. Payout follows a separate withdrawal process.",
    "何时收取保证金": "When guarantees are collected",
    "佣金完成结算时，系统按适用比例从本次佣金中留存保证金，所有合作者均适用。保证金单独记录，您可在保证金页面查看留存金额、对应佣金和预计释放时间。": "At settlement, the applicable portion of commission is retained as a guarantee for every partner. Guarantees are recorded separately. The guarantees page shows retained amounts, related commissions and estimated release dates.",
    "满足期限及释放条件后，保证金转为可提现金额，仍需申请提现；如涉及核验、调整或抵扣，可查看明细和原因。": "Once the period and release conditions are met, the guarantee becomes withdrawable. A withdrawal request is still required. Details and reasons are available for verification, adjustments or offsets.",
    "查看当前试算规则与金额说明": "View illustrative rules and amount details",
    "结算频率": "Settlement frequency",
    "每日自动结算": "Daily automatic settlement",
    "结算周期": "Settlement period",
    "按国家、入金方式及核验情况确定": "Determined by country, payment method and verification",
    "保证金比例示例": "Illustrative guarantee rate",
    "保证金保留期限示例": "Illustrative guarantee period",
    "比例与天数为试算示例，实际以适用规则为准。预计结算及释放日期在具备充分依据时展示；仍在核验时，查看当前阶段与下一步。": "Rates and periods are illustrative. Applicable rules determine the actual outcome. Estimated settlement and release dates are shown when supported; otherwise, check the current verification stage and next action.",
    "适用税费在结算时计算。钱包内可提现余额已扣除相应税费，提现时不重复计算。": "Applicable tax is calculated at settlement and already deducted from your withdrawable balance. It is not charged again at withdrawal.",
    "返回佣金计算器试算": "Return to the commission calculator",
    "在哪里查看进度": "Where to track progress",
    "从客户转化到资金明细，随时回到对应页面查看。": "Return to the relevant page to track client conversions and funds.",
    "客户转化": "Client conversion",
    "查看客户数据": "View client data",
    "查看客户的注册信息、KYC状态、转化阶段和对应佣金。": "Check registration information, KYC status, conversion stages and related commission.",
    "进入客户列表": "Open client list",
    "佣金结算": "Commission settlement",
    "查看收益数据": "View earnings",
    "查看逐笔佣金的金额、结算进度，以及需要您处理的事项。": "Check each commission amount, settlement progress and actions required from you.",
    "进入收益数据": "Open earnings",
    "保证金释放": "Guarantee release",
    "查看保证金": "View guarantees",
    "查看保证金留存、预计释放时间、可提现金额和调整记录。": "Check retained guarantees, estimated release dates, withdrawable amounts and adjustments.",
    "进入保证金": "Open guarantees",
    "推广前，再记住这三点": "Three things to remember",
    "达到有效FTD要求后确认基础佣金，质量服务可带来额外奖励。": "Effective FTD confirms base commission; quality service can earn extra rewards.",
    "佣金符合条件并完成结算后，才进入可提现余额。": "Commission enters your withdrawable balance after meeting conditions and completing settlement.",
    "保证金单独记录，符合释放条件后可提现。": "Guarantees are recorded separately and become withdrawable when release conditions are met.",
    "查看奖励规则": "View reward rules",
    "查看结算规则": "View settlement rules",
    "用回传链接连接您的追踪平台": "Connect your tracking platform with postbacks",
    "适合使用广告追踪器或自建数据系统管理投放的合作者。": "For partners who manage campaigns with an ad tracker or their own data system.",
    "配置回传链接后，系统会将您选择的转化事件发送至您的平台，帮助您关联广告点击与客户转化、比较渠道效果并优化投放。": "Configure a postback URL to send selected conversion events to your platform, connect ad clicks to client conversions, compare channel performance and improve your campaigns.",
    "配置回传链接": "Configure postbacks"
  });
  const generated = String(value).match(/^(网站展示位|社群内容位|视频推广位)\s*(\d+)$/);
  if (generated) return `${dictionary[generated[1]]} ${generated[2]}`;
  if (dictionary[value]) return dictionary[value];
  const partial = String(value);
  return Object.entries(dictionary)
    .sort(([left], [right]) => right.length - left.length)
    .reduce((result, [zh, en]) => result.replaceAll(zh, en), partial);
};

AFF.localizeTextNodes = root => {
  if (!root || AFF.state?.language !== "en") return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const value = node.nodeValue;
    if (!value.trim()) return;
    const leading = value.match(/^\s*/)[0];
    const trailing = value.match(/\s*$/)[0];
    node.nodeValue = `${leading}${AFF.dataText(value.trim())}${trailing}`;
  });
};

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
  link: "https://go.affiliate-cpa.example/register"
};

AFF.partnerProgram = {
  commissionMarkets: [
    { code: "VN", name: "Vietnam", zh: "越南" }, { code: "TH", name: "Thailand", zh: "泰国" },
    { code: "ID", name: "Indonesia", zh: "印度尼西亚" }, { code: "ZA", name: "South Africa", zh: "南非" },
    { code: "NG", name: "Nigeria", zh: "尼日利亚" }, { code: "PK", name: "Pakistan", zh: "巴基斯坦" },
    { code: "EG", name: "Egypt", zh: "埃及" }, { code: "KW", name: "Kuwait", zh: "科威特" },
    { code: "QA", name: "Qatar", zh: "卡塔尔" }, { code: "KZ", name: "Kazakhstan", zh: "哈萨克斯坦" },
    { code: "SA", name: "Saudi Arabia", zh: "沙特阿拉伯" }, { code: "BD", name: "Bangladesh", zh: "孟加拉国" }
  ],
  qualificationTiers: [
    { tier: "L1", netDeposit: 300, volume: 1, days: 3, basePrice: 200 },
    { tier: "L2", netDeposit: 800, volume: 3, days: 5, basePrice: 400 },
    { tier: "L3", netDeposit: 1500, volume: 5, days: 5, basePrice: 700 },
    { tier: "L4", netDeposit: 4000, volume: 10, days: 8, basePrice: 1200 }
  ],
  countryCoefficient(code) {
    const score = [...String(code)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return Number((0.6 + (score % 10) * 0.1).toFixed(1));
  },
  countryRef(code) {
    const market = AFF.partnerProgram.commissionMarkets.find(item => item.code === code);
    if (!market) return { code: "UN", name: "Unknown", zh: "待确认", coefficient: 1, unknown: true };
    return { ...market, coefficient: AFF.partnerProgram.countryCoefficient(code), unknown: false };
  },
  commissionPrice(code, tierName) {
    const tier = AFF.partnerProgram.qualificationTiers.find(item => item.tier === tierName);
    const ref = AFF.partnerProgram.countryRef(code);
    if (!tier) return 0;
    return Math.round(tier.basePrice * ref.coefficient / 5) * 5;
  },
  get commissionCountries() {
    return this.commissionMarkets.map(({ code, name }) => {
      const coefficient = AFF.partnerProgram.countryCoefficient(code);
      return {
        name,
        code,
        coefficient,
        tiers: this.qualificationTiers.map(tier => ({
          ...tier,
          price: Math.round(tier.basePrice * coefficient / 5) * 5
        }))
      };
    });
  },
  conversionCountries: [
    { code: "VN", name: "越南", desktop: [11.8, 36.4, 72.5], mobile: [17.6, 41.8, 78.4], volume: 4820 },
    { code: "TH", name: "泰国", desktop: [10.4, 34.8, 70.2], mobile: [16.2, 39.6, 76.1], volume: 4310 },
    { code: "ID", name: "印度尼西亚", desktop: [9.8, 33.9, 69.4], mobile: [15.4, 38.7, 74.8], volume: 5260 },
    { code: "ZA", name: "南非", desktop: [9.2, 31.8, 67.2], mobile: [12.8, 34.2, 70.6], volume: 3140 },
    { code: "NG", name: "尼日利亚", desktop: [8.6, 30.4, 65.8], mobile: [12.1, 32.9, 69.2], volume: 2890 },
    { code: "PK", name: "巴基斯坦", desktop: [8.1, 29.6, 64.4], mobile: [11.4, 31.2, 67.5], volume: 3520 },
    { code: "EG", name: "埃及", desktop: [7.8, 28.9, 63.2], mobile: [10.8, 30.4, 66.8], volume: 2680 },
    { code: "KW", name: "科威特", desktop: [7.2, 27.8, 61.4], mobile: [9.1, 27.2, 62.8], volume: 1240 }
  ],
  supportCountries: [
    { code: "VN", name: "越南", web: true, android: true, ios: true, note: "三端均可注册与交易" },
    { code: "TH", name: "泰国", web: true, android: true, ios: true, note: "iOS支付渠道受限" },
    { code: "ID", name: "印度尼西亚", web: true, android: true, ios: true, note: "安卓安装包需归因回传" },
    { code: "ZA", name: "南非", web: true, android: true, ios: false, note: "iOS暂未开放注册" },
    { code: "NG", name: "尼日利亚", web: true, android: true, ios: false, note: "iOS待监管评审" },
    { code: "PK", name: "巴基斯坦", web: true, android: true, ios: true, note: "三端支持" },
    { code: "EG", name: "埃及", web: true, android: false, ios: false, note: "仅Web端支持" },
    { code: "KW", name: "科威特", web: true, android: true, ios: true, note: "三端支持" },
    { code: "QA", name: "卡塔尔", web: true, android: true, ios: true, note: "三端支持" },
    { code: "KZ", name: "哈萨克斯坦", web: true, android: true, ios: true, note: "三端支持" },
    { code: "SA", name: "沙特阿拉伯", web: true, android: true, ios: true, note: "iOS仅App Store分发" },
    { code: "BD", name: "孟加拉国", web: true, android: true, ios: false, note: "iOS暂未开放" }
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
    "预计收益", "已拒绝利润", "结算中利润", "EPC"
  ],
  rows: [
    ["2026-10-22", "沙特阿拉伯", "Telegram", "社交媒体", "十月投放", "外汇", "横幅A", 18200, 620, 32, 4820, 5360, "29.5%", 402, 132, "$26,400", 121, 88, 92, 8, "$8,800", "$120", "$260", "$1.83"],
    ["2026-10-21", "沙特阿拉伯", "谷歌广告", "竞价广告", "十月投放", "外汇", "视频B", 15400, 480, 28, 4010, 4310, "27.8%", 351, 118, "$23,600", 108, 79, 83, 7, "$7,900", "$90", "$210", "$1.97"],
    ["2026-10-20", "孟加拉国", "Telegram", "社交媒体", "十月投放", "交易", "横幅A", 12100, 410, 21, 3380, 3720, "30.2%", 296, 96, "$19,200", 89, 68, 71, 5, "$6,800", "$80", "$180", "$1.83"],
    ["2026-10-19", "孟加拉国", "推荐链接", "推荐流量", "财经博客", "外汇", "横幅A", 8600, 280, 12, 2260, 2510, "26.4%", 187, 61, "$12,200", 55, 43, 45, 3, "$4,300", "$40", "$100", "$1.71"],
    ["2026-10-18", "尼日利亚", "Facebook", "竞价广告", "九月测试", "交易", "视频B", 7400, 210, 18, 1840, 2080, "24.1%", 142, 39, "$7,800", 33, 24, 28, 4, "$2,700", "$60", "$90", "$1.30"]
  ]
};

AFF.clients = [
  {
    clientId: "C-10241", email: "w***@gmail.com", status: "qualified", registeredAt: "2026-10-18",
    country: "MY", platform: "Web", kyc: "通过", source: "Telegram", medium: "社交媒体",
    campaign: "十月 Telegram 投放", term: "外汇", content: "横幅 A 版", loyal: true,
    qualifiedAt: "2026-10-20", tier: "T2", subId: "tg_group_01", expected: "$400", paid: "$400", rejected: "$0", held: "$0"
  },
  {
    clientId: "C-10240", email: "a***@example.com", status: "holding", registeredAt: "2026-10-18",
    country: "SG", platform: "App", kyc: "通过", source: "谷歌广告", medium: "竞价广告",
    campaign: "十月投放", term: "外汇", content: "视频 B 版", loyal: false,
    qualifiedAt: "2026-10-21", tier: "A", subId: "sg_search_02", expected: "$120", paid: "$0", rejected: "$0", held: "$120"
  },
  {
    clientId: "C-10239", email: "n***@example.com", status: "registered", registeredAt: "2026-10-19",
    country: "BR", platform: "Web", kyc: "未提交", source: "Facebook", medium: "社交媒体",
    campaign: "九月测试", term: "交易", content: "横幅 A 版", loyal: false,
    qualifiedAt: "-", tier: "C", subId: "br_social_03", expected: "$0", paid: "$0", rejected: "$0", held: "$0"
  }
];

AFF.campaigns = [
  {
    code: "DIRECT",
    name: "直链推广",
    link: "https://go.affiliate-cpa.example/register",
    status: "启用",
    fixed: true,
    description: "不属于任何活动、直接通过推广链接进入的用户"
  },
  { code: "CMP-1001", name: "秋季交易指南", link: "https://go.affiliate-cpa.example/register", status: "启用" },
  { code: "CMP-1002", name: "市场观察周刊", link: "https://go.affiliate-cpa.example/register", status: "启用" },
  { code: "CMP-1003", name: "移动交易体验", link: "https://go.affiliate-cpa.example/register", status: "启用" },
  { code: "CMP-1004", name: "新客户入门", link: "https://go.affiliate-cpa.example/register", status: "启用" },
  { code: "CMP-1005", name: "社区直播专场", link: "https://go.affiliate-cpa.example/register", status: "暂停" },
  { code: "CMP-1006", name: "全球市场专题", link: "https://go.affiliate-cpa.example/register", status: "启用" }
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
  { id: "tg_group_01", name: "Telegram 社群", status: "启用", updatedAt: "2026-10-22", campaignId: "" },
  { id: "sg_search_02", name: "新加坡搜索推广", status: "启用", updatedAt: "2026-10-21", campaignId: "" },
  { id: "br_social_03", name: "巴西社交推广", status: "已封禁", statusSource: "platform", statusReason: "GEO-POLICY", updatedAt: "2026-10-18", campaignId: "" },
  ...Array.from({ length: 18 }, (_, index) => ({
    id: `placement_${String(index + 1).padStart(2, "0")}`,
    name: `${["网站展示位", "社群内容位", "视频推广位"][index % 3]} ${String(index + 1).padStart(2, "0")}`,
    status: index % 7 === 6 ? "已封禁" : "启用",
    statusSource: index % 7 === 6 ? (index % 2 ? "platform" : "self") : "self",
    statusReason: index % 7 === 6 ? (index % 2 ? "RISK-RULE-02" : "SELF-DISABLED") : "",
    updatedAt: `2026-10-${String(27 - index).padStart(2, "0")}`,
    campaignId: ""
  }))
];

AFF.commissions = {
  metrics: [
    { label: "可提现余额", value: "$12,480.50", hint: "已过结算期且已批准" },
    { label: "结算中", value: "$1,260.00", hint: "初始1天，按风险情况递增；超30天转人工复核" },
    { label: "已拒绝（本期）", value: "$140.00", hint: "资格未达标拒付 · 申诉期内" },
    { label: "已付追回", value: "$300.00", hint: "已付佣金冲正 · 追回进行中" }
  ],
  rows: [
    { date: "2026-10-23", type: "日度结算", note: "日结批次", amount: "$820.00", status: "已批准", action: "" },
    { date: "2026-10-22", type: "结算中生效", note: "风险分R1，动态结算 2天", amount: "$120.00", status: "结算中", action: "" },
    { date: "2026-10-21", type: "佣金拒绝", note: "QFTD-02 未达质量门槛", amount: "-$140.00", status: "已拒绝", action: "申诉", appealOpen: true },
    { date: "2026-10-20", type: "已付追回", note: "KYC复检失败 RC-1024", amount: "-$300.00", status: "追回中", action: "" },
    { date: "2026-10-19", type: "提现", note: "尾号6621", amount: "$2,000.00", status: "已到账", action: "" },
    { date: "2026-10-18", type: "佣金批准", note: "C-10241 合格客户", amount: "$400.00", status: "已批准", action: "" }
  ]
};

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

AFF.assetMetadata = {
  "banner-onboarding": { version: "v3", approvedBy: "合规专员A", onlineAt: "2026-10-20 10:00", offlineAt: "" },
  "banner-market": { version: "v2", approvedBy: "合规专员B", onlineAt: "2026-10-19 09:00", offlineAt: "" },
  "video-onboarding": { version: "v4", approvedBy: "合规专员A", onlineAt: "2026-10-18 15:30", offlineAt: "" },
  "video-platform": { version: "v1", approvedBy: "合规专员C", onlineAt: "2026-10-17 11:00", offlineAt: "" },
  "video-mobile": { version: "v2", approvedBy: "合规专员C", onlineAt: "2026-10-17 11:20", offlineAt: "" },
  "lp-standard": { version: "v5", approvedBy: "合规专员B", onlineAt: "2026-10-16 08:30", offlineAt: "" },
  "lp-mobile": { version: "v3", approvedBy: "合规专员B", onlineAt: "2026-10-16 08:40", offlineAt: "" },
  "lp-fund": { version: "v2", approvedBy: "合规专员A", onlineAt: "2026-10-15 14:00", offlineAt: "" },
  "gif-telegram": { version: "v3", approvedBy: "合规专员C", onlineAt: "2026-10-15 16:00", offlineAt: "" },
  "gif-social": { version: "v1", approvedBy: "合规专员C", onlineAt: "2026-10-14 17:00", offlineAt: "" }
};

AFF.assetMeta = item => ({
  version: "v1",
  approvedBy: "合规专员",
  onlineAt: `${item.date} 10:00`,
  offlineAt: "当前有效",
  ...(AFF.assetMetadata[item.id] || {})
});

AFF.lookupIndex = [
  { key: "C-10241", id: "C-10241", email: "w***@gmail.com", owned: true, date: "2026-10-18", method: "Web有效点击", firstTouch: "2026-10-18 09:12", reason: "30天归因窗口内首次点击，此后锁定" },
  { key: "w***@gmail.com", id: "C-10241", email: "w***@gmail.com", owned: true, date: "2026-10-18", method: "Web有效点击", firstTouch: "2026-10-18 09:12", reason: "30天归因窗口内首次点击，此后锁定" },
  { key: "C-10239", id: "C-10239", email: "n***@example.com", owned: false, date: "-", method: "App归因", firstTouch: "-", reason: "该客户已归属其他推广方，仅返回有限原因" }
];

AFF.deepLinks = {
  domain: "https://go.affiliate-cpa.example",
  promotionPath: "/register",
  pathVersion: "PATH-20261104-1",
  assets: [
    { id: "OFF-REGISTER", code: "register", name: "官方注册页", type: "落地页", path: "/register", mobilePath: "/m/register" },
    { id: "OFF-HOME", code: "home", name: "官方首页", type: "落地页", path: "/home", mobilePath: "/m/home" },
    { id: "OFF-STANDARD-MT5", code: "standard-mt5", name: "Standard·MT5开户页", type: "开户页", path: "/open-account/standard-mt5", mobilePath: "/m/open-account/standard-mt5" },
    { id: "OFF-PRO-MT4", code: "pro-mt4", name: "Pro·MT4开户页", type: "开户页", path: "/open-account/pro-mt4", mobilePath: "/m/open-account/pro-mt4" },
    { id: "OFF-ZERO-MT5", code: "zero-mt5", name: "Zero·MT5开户页", type: "开户页", path: "/open-account/zero-mt5", mobilePath: "/m/open-account/zero-mt5" }
  ],
  systems: ["iOS (App Store)", "Android (Google Play)"],
  languages: ["简体中文", "English", "ไทย", "Tiếng Việt"],
  get pages() {
    return this.assets.map(asset => asset.name);
  }
};

AFF.parameters = {
  qualification: "入金 + 真实交易组合条件",
  settlement: "日结 · 不设最低提现",
  hold: "动态结算：初始1天，超过30天转人工",
  demoTrade: "模拟盘不计入"
};
