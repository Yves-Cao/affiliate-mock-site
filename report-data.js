(() => {
  const now = "2026-10-27";
  const day = 86400000;
  const dateValue = value => Date.parse(`${value}T00:00:00Z`);
  const dateText = value => new Date(value).toISOString().slice(0, 10);
  const plusDays = (value, amount) => dateText(dateValue(value) + amount * day);
  let seed = 20261027;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const pick = values => values[Math.floor(random() * values.length)];
  const integer = (min, max) => min + Math.floor(random() * (max - min + 1));
  const canReach = value => value && value <= now;
  const dimensions = [
    { key: "date", label: "日期", en: "Date", category: "时间", time: true },
    { key: "week", label: "周", en: "Week", category: "时间", time: true },
    { key: "month", label: "月", en: "Month", category: "时间", time: true },
    { key: "year", label: "年", en: "Year", category: "时间", time: true },
    { key: "country", label: "国家/地区", en: "Country / region", category: "地区" },
    { key: "os", label: "设备操作系统", en: "Device OS", category: "设备与平台" },
    { key: "platform", label: "平台", en: "Platform", category: "设备与平台" },
    { key: "mediaSource", label: "媒体来源", en: "Media source", category: "来源" },
    { key: "agency", label: "机构", en: "Agency", category: "来源" },
    { key: "campaignCode", label: "活动代码", en: "Campaign code", category: "活动" },
    { key: "campaign", label: "活动", en: "Campaign", category: "活动" },
    { key: "source", label: "UTM 来源", en: "UTM source", category: "UTM" },
    { key: "medium", label: "UTM 媒介", en: "UTM medium", category: "UTM" },
    { key: "utmCampaign", label: "UTM 活动", en: "UTM campaign", category: "UTM" },
    { key: "content", label: "UTM 内容", en: "UTM content", category: "UTM" },
    { key: "term", label: "UTM 关键词", en: "UTM term", category: "UTM" },
    { key: "subId", label: "Sub ID", en: "Sub ID", category: "自定义标记" },
    { key: "device", label: "客户端设备", en: "Client device", category: "客户端" },
    { key: "browser", label: "客户端浏览器", en: "Client browser", category: "客户端" },
    { key: "sourceDomain", label: "来源域名", en: "Source domain", category: "来源" }
  ];
  const metrics = [
    { key: "clicks", label: "点击量", en: "Clicks", type: "count" },
    { key: "visitors", label: "访客数 UV", en: "Visitors UV", type: "count" },
    { key: "registrations", label: "注册客户", en: "Registrations", type: "count" },
    { key: "ftd", label: "FTD 客户", en: "FTD clients", type: "count" },
    { key: "effective", label: "有效 FTD", en: "Valid FTD", type: "count" },
    { key: "quality", label: "质量服务客户", en: "Quality service clients", type: "count" },
    { key: "traders", label: "开始交易客户", en: "Trading clients", type: "count" },
    { key: "ftdAmount", label: "首次入金金额", en: "FTD amount", type: "money" },
    { key: "expected", label: "预计佣金", en: "Projected commission", type: "money" },
    { key: "held", label: "暂扣佣金", en: "On hold commission", type: "money" },
    { key: "approved", label: "结算净额", en: "Settlement net", type: "money" },
    { key: "paid", label: "已支付佣金", en: "Paid commission", type: "money" },
    { key: "rejected", label: "已拒绝佣金", en: "Rejected commission", type: "money" },
    { key: "reversed", label: "冲正金额", en: "Reversed commission", type: "money" },
    { key: "registerRate", label: "点击→注册", en: "Click → registration", type: "rate" },
    { key: "ftdRate", label: "注册→FTD", en: "Registration → FTD", type: "rate" },
    { key: "effectiveRate", label: "FTD→有效 FTD", en: "FTD → valid FTD", type: "rate" },
    { key: "qualityRate", label: "有效 FTD→质量服务", en: "Valid FTD → quality service", type: "rate" },
    { key: "epc", label: "EPC", en: "EPC", type: "money" }
  ];
  const countries = ["新加坡", "马来西亚", "泰国", "越南", "印度尼西亚", "南非", "巴西", "墨西哥", "菲律宾", "阿联酋"];
  const campaigns = [
    ["CMP-1001", "秋季交易指南", "autumn-guide"],
    ["CMP-1002", "市场观察周刊", "market-weekly"],
    ["CMP-1003", "移动交易体验", "mobile-trading"],
    ["CMP-1004", "新客户入门", "new-client"],
    ["CMP-1005", "社区直播专场", "community-live"],
    ["CMP-1006", "全球市场专题", "global-markets"]
  ];
  const channels = [
    ["社交媒体", "Telegram", "social", "t.me"],
    ["社交媒体", "Facebook", "social", "facebook.com"],
    ["视频平台", "YouTube", "video", "youtube.com"],
    ["搜索推广", "Google", "cpc", "google.com"],
    ["内容推荐", "Newsletter", "email", "newsletter.example.com"],
    ["内容推荐", "Blog", "referral", "market-notes.example.com"]
  ];
  const agencies = ["自主推广", "远景传媒", "星河互动", "海拓营销"];
  const content = ["banner-a", "banner-b", "video-horizontal", "video-vertical", "landing-guide", "gif-market"];
  const terms = ["forex", "trading", "market", "gold", "investment", "未记录"];
  const commissionLabels = {
    pending: "待检查",
    held: "暂扣",
    approved: "已入账",
    paid: "已支付",
    rejected: "已拒绝",
    reversed: "已冲正"
  };

  function deviceInfo() {
    const platform = pick(["Web", "Web", "Web", "Android", "iOS"]);
    const os = platform === "Android" ? "Android" : platform === "iOS" ? "iOS" : pick(["Windows", "macOS", "Android", "iOS", "Linux"]);
    const device = ["Android", "iOS"].includes(os) ? pick(["手机", "手机", "平板"]) : "电脑";
    const browser = platform !== "Web" ? "不适用" : os === "iOS" ? pick(["Safari", "Chrome"]) : pick(["Chrome", "Edge", "Firefox", "Safari"]);
    return { platform, os, device, browser };
  }

  function attribution() {
    const campaign = pick(campaigns);
    const channel = pick(channels);
    return {
      ...deviceInfo(),
      mediaSource: channel[0],
      agency: pick(agencies),
      campaignCode: campaign[0],
      campaign: campaign[1],
      source: channel[1],
      medium: channel[2],
      utmCampaign: campaign[2],
      content: pick(content),
      term: pick(terms),
      subId: `placement_${String(integer(1, 18)).padStart(2, "0")}`,
      sourceDomain: channel[3]
    };
  }

  const rows = [];
  for (let index = 0; index < 960; index += 1) {
    const date = plusDays(now, -integer(0, 89));
    const registrationCandidate = plusDays(date, integer(0, 2));
    const registeredAt = canReach(registrationCandidate) ? registrationCandidate : date;
    const kyc = pick(["通过", "通过", "通过", "通过", "未提交", "审核中", "失败"]);
    const ftdCandidate = plusDays(registeredAt, integer(0, 6));
    const ftdAt = kyc === "通过" && random() < 0.78 && canReach(ftdCandidate) ? ftdCandidate : null;
    const effectiveCandidate = ftdAt ? plusDays(ftdAt, integer(0, 2)) : null;
    const effectiveAt = ftdAt && random() < 0.88 && canReach(effectiveCandidate) ? effectiveCandidate : null;
    const tradeCandidate = ftdAt ? plusDays(ftdAt, integer(0, 4)) : null;
    const tradedAt = ftdAt && random() < 0.82 && canReach(tradeCandidate) ? tradeCandidate : null;
    const qualifiedCandidate = effectiveAt && tradedAt ? plusDays(effectiveAt > tradedAt ? effectiveAt : tradedAt, integer(0, 2)) : null;
    const qualifiedAt = qualifiedCandidate && random() < 0.87 && canReach(qualifiedCandidate) ? qualifiedCandidate : null;
    const commissionStatus = effectiveAt ? pick(["pending", "held", "held", "approved", "approved", "approved", "rejected", "reversed"]) : "pending";
    const country = kyc === "通过" ? pick(countries) : "待确认";
    const tier = effectiveAt ? pick(["L1", "L2", "L3", "L4"]) : "-";
    const expected = effectiveAt ? AFF.partnerProgram.commissionPrice(country, tier) : 0;
    rows.push({
      id: `EV-${String(index + 1).padStart(5, "0")}`,
      date,
      visitorId: `V-${String(index + 1).padStart(5, "0")}`,
      clicks: integer(1, 6),
      clientId: `C-${12000 + index}`,
      email: `${String.fromCharCode(97 + index % 26)}***@example.com`,
      registeredAt,
      kycAt: kyc === "通过" ? registeredAt : null,
      ftdAt,
      effectiveAt,
      tradedAt,
      qualifiedAt,
      kyc,
      country,
      ...attribution(),
      tier,
      commissionStatus,
      ftdAmount: ftdAt ? integer(1, 40) * 50 : 0,
      expected,
      held: commissionStatus === "held" ? expected : 0,
      approved: commissionStatus === "approved" ? expected : 0,
      rejected: commissionStatus === "rejected" ? expected : 0,
      reversed: commissionStatus === "reversed" ? expected : 0
    });
  }
  for (let index = 0; index < 480; index += 1) {
    const returning = index % 3 === 0 ? rows[integer(0, 959)] : null;
    rows.push({
      id: `EV-${String(index + 961).padStart(5, "0")}`,
      date: plusDays(now, -integer(0, 89)),
      visitorId: returning ? returning.visitorId : `V-A${String(index + 1).padStart(4, "0")}`,
      clicks: integer(1, 6),
      clientId: null,
      email: null,
      registeredAt: null,
      kycAt: null,
      ftdAt: null,
      effectiveAt: null,
      tradedAt: null,
      qualifiedAt: null,
      kyc: "不适用",
      country: "待确认",
      ...attribution(),
      tier: "-",
      commissionStatus: "pending",
      ftdAmount: 0,
      expected: 0,
      held: 0,
      approved: 0,
      rejected: 0,
      reversed: 0
    });
  }
  rows.sort((left, right) => right.date.localeCompare(left.date) || left.id.localeCompare(right.id));
  const commissionReasons = {
    rejected: [
      ["CLIENT-DUPLICATE", "复核发现客户身份重复，不符合新客户计佣条件。", "Review found a duplicate client identity that does not qualify for a new-client commission."],
      ["DEPOSIT-INELIGIBLE", "复核发现首次入金不符合适用奖励条件。", "Review found that the first deposit does not meet the applicable reward conditions."],
      ["SOURCE-INELIGIBLE", "推广来源不符合佣金结算要求。", "The promotion source does not meet commission settlement requirements."]
    ],
    reversed: [
      ["DEPOSIT-REFUNDED", "首次入金发生退款，关联佣金已冲正。", "The first deposit was refunded and the related commission was reversed."],
      ["DEPOSIT-CHARGEBACK", "首次入金发生拒付，关联佣金已冲正。", "The first deposit was charged back and the related commission was reversed."],
      ["ELIGIBILITY-REVIEW", "客户资格复核结果变更，原佣金已冲正。", "A client eligibility review changed the original decision and the commission was reversed."]
    ]
  };
  rows.forEach((row, index) => {
    row.qualityAt = row.qualifiedAt;
    row.firstCommissionAt = row.effectiveAt;
    row.qualityCommissionAt = row.qualityAt;
    row.eligibilityStatus = !row.registeredAt
      ? "pending_attribution"
      : row.kyc === "失败" ? "kyc_failed"
      : row.country === "待确认" ? "risk_investigation"
      : "attributed";
    const clientIdNumber = Number(String(row.clientId || "0").replace(/\D/g, ""));
    row.milestoneStatus = !row.registeredAt ? "pending_attribution"
      : row.kyc !== "通过" ? "pending"
      : !row.ftdAt ? "ftd_in_progress"
      : !row.effectiveAt ? "qftd_in_progress"
      : !row.qualityAt ? (clientIdNumber % 17 === 0 ? "quality_pending" : "quality_in_progress")
      : "quality";
    row.fundStatus = !row.effectiveAt ? "not_generated"
      : row.commissionStatus === "held" ? "held"
      : row.commissionStatus === "approved" ? "payable"
      : row.commissionStatus === "rejected" ? "rejected"
      : row.commissionStatus === "reversed" ? "clawed_back"
      : "pending_review";
    if (row.effectiveAt && clientIdNumber % 23 === 0) row.fundStatus = "manual_review";
    if (row.effectiveAt && clientIdNumber % 37 === 0) row.fundStatus = "frozen";
    if (row.commissionStatus === "approved" && (clientIdNumber % 11 === 0 || row.effectiveAt >= plusDays(now, -30))) row.fundStatus = "paid";
    row.voidedStage = "";
    row.voidedReason = "";
    if (row.registeredAt && !row.ftdAt && row.date < plusDays(now, -60)) {
      row.milestoneStatus = "voided";
      row.voidedStage = "FTD";
      row.voidedReason = "window_expired";
    }
    if (row.effectiveAt && !row.qualityAt && row.effectiveAt < plusDays(now, -60)) {
      row.milestoneStatus = "voided";
      row.voidedStage = "QUALITY";
      row.voidedReason = "window_expired";
    }
    const originalExpected = row.expected;
    const firstAmount = row.effectiveAt ? Math.round(originalExpected * 0.75) : 0;
    const qualityAmount = row.qualityAt ? originalExpected - firstAmount : 0;
    row.commissionCases = [
      {
        id: `COM-${row.clientId}-QF`,
        type: "qftd_batch",
        segments: ["FTD", "QFTD"],
        confirmedAt: row.effectiveAt,
        amount: firstAmount,
        status: firstAmount ? (row.fundStatus === "paid" ? "paid" : row.commissionStatus) : "not_generated"
      },
      {
        id: `COM-${row.clientId}-QS`,
        type: "quality_service",
        segments: ["QUALITY"],
        confirmedAt: row.qualityAt,
        amount: qualityAmount,
        status: qualityAmount ? (row.fundStatus === "paid" ? "paid" : row.commissionStatus) : "not_generated"
      }
    ].filter(item => item.amount > 0);
    row.expected = row.commissionCases.reduce((sum, item) => sum + item.amount, 0);
    row.held = row.commissionCases.filter(item => item.status === "held").reduce((sum, item) => sum + item.amount, 0);
    row.approved = row.commissionCases.filter(item => item.status === "approved").reduce((sum, item) => sum + item.amount, 0);
    row.paid = row.commissionCases.filter(item => item.status === "paid").reduce((sum, item) => sum + item.amount, 0);
    row.rejected = row.commissionCases.filter(item => item.status === "rejected").reduce((sum, item) => sum + item.amount, 0);
    row.reversed = row.commissionCases.filter(item => item.status === "reversed").reduce((sum, item) => sum + item.amount, 0);
    row.commissionId = row.commissionCases[0]?.id || null;
    const reason = commissionReasons[row.commissionStatus]?.[index % 3];
    row.commissionReasonCode = reason?.[0] || "";
    row.commissionReason = reason?.[1] || "";
    row.commissionReasonEn = reason?.[2] || "";
  });

  function value(row, key) {
    if (key === "week") {
      const date = new Date(`${row.date}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
      return date.toISOString().slice(0, 10);
    }
    if (key === "month") return row.date.slice(0, 7);
    if (key === "year") return row.date.slice(0, 4);
    return row[key] ?? "未记录";
  }

  function filterRows(filters = {}) {
    return rows.filter(row => {
      if (filters.from && row.date < filters.from) return false;
      if (filters.to && row.date > filters.to) return false;
      return dimensions.every(dimension => {
        const expected = filters[dimension.key];
        if (expected === undefined || expected === null || expected === "" || expected === "全部") return true;
        return Array.isArray(expected) ? !expected.length || expected.includes(value(row, dimension.key)) : value(row, dimension.key) === expected;
      });
    });
  }

  function totals(sourceRows) {
    const clients = new Map();
    const visitors = new Set();
    let clicks = 0;
    for (const row of sourceRows) {
      clicks += row.clicks;
      visitors.add(row.visitorId);
      if (row.clientId) clients.set(row.clientId, row);
    }
    const registered = [...clients.values()];
    const counts = {
      clicks,
      visitors: visitors.size,
      registrations: registered.length,
      ftd: registered.filter(row => row.ftdAt).length,
      effective: registered.filter(row => row.effectiveAt).length,
      quality: registered.filter(row => row.qualityAt).length,
      qualified: registered.filter(row => row.qualityAt).length,
      traders: registered.filter(row => row.tradedAt).length
    };
    counts.ftdAmount = registered.reduce((sum, row) => sum + row.ftdAmount, 0);
    counts.expected = registered.reduce((sum, row) => sum + row.expected, 0);
    counts.held = registered.filter(row => row.fundStatus === "held").reduce((sum, row) => sum + row.held, 0);
    counts.approved = registered.filter(row => row.fundStatus === "payable").reduce((sum, row) => sum + row.approved, 0);
    counts.paid = registered.filter(row => row.fundStatus === "paid").reduce((sum, row) => sum + row.paid, 0);
    counts.inProgress = registered.filter(row => !["paid", "payable", "rejected", "clawed_back"].includes(row.fundStatus))
      .reduce((sum, row) => sum + row.expected, 0);
    counts.rejected = registered.filter(row => row.fundStatus === "rejected").reduce((sum, row) => sum + row.rejected, 0);
    counts.reversed = registered.filter(row => row.fundStatus === "clawed_back").reduce((sum, row) => sum + row.reversed, 0);
    const ratio = (numerator, denominator) => denominator ? numerator / denominator : null;
    return {
      ...counts,
      registerRate: ratio(counts.registrations, counts.clicks),
      ftdRate: ratio(counts.ftd, counts.registrations),
      effectiveRate: ratio(counts.effective, counts.ftd),
      qualityRate: ratio(counts.quality, counts.effective),
      qualifiedRate: ratio(counts.quality, counts.effective),
      epc: ratio(counts.expected, counts.clicks)
    };
  }

  function aggregate(sourceRows, groups = []) {
    if (groups.length > 2 || new Set(groups).size !== groups.length ||
        groups.some(key => !dimensions.some(dimension => dimension.key === key)) ||
        groups.filter(key => dimensions.find(dimension => dimension.key === key).time).length > 1) {
      throw new Error("Invalid reporting dimensions");
    }
    if (!sourceRows.length) return [];
    if (!groups.length) return [{ key: "all", values: ["全部"], metrics: totals(sourceRows) }];
    const buckets = new Map();
    for (const row of sourceRows) {
      const values = groups.map(key => value(row, key));
      const key = JSON.stringify(values);
      if (!buckets.has(key)) buckets.set(key, { key, values, rows: [] });
      buckets.get(key).rows.push(row);
    }
    return [...buckets.values()].map(bucket => ({ key: bucket.key, values: bucket.values, metrics: totals(bucket.rows) }));
  }

  function options(key) {
    if (!dimensions.some(dimension => dimension.key === key)) return [];
    return [...new Set(rows.map(row => value(row, key)))].sort((left, right) => String(left).localeCompare(String(right), "zh-CN"));
  }

  AFF.reporting = {
    now,
    from: plusDays(now, -89),
    dimensions,
    metrics,
    fields: {
      dimensions: Object.fromEntries(dimensions.map(dimension => [dimension.key, { ...dimension, values: options(dimension.key) }])),
      metrics: Object.fromEntries(metrics.map(metric => [metric.key, metric])),
      commissionStatus: commissionLabels,
      cohortDate: "date",
      currency: "USD",
      timezone: "UTC+08:00"
    },
    rows,
    commissionPrice: AFF.partnerProgram.commissionPrice,
    value,
    options,
    filterRows,
    aggregate,
    totals
  };
})();
