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
    { key: "qualified", label: "合格客户", en: "Qualified clients", type: "count" },
    { key: "traders", label: "开始交易客户", en: "Trading clients", type: "count" },
    { key: "ftdAmount", label: "首次入金金额", en: "FTD amount", type: "money" },
    { key: "expected", label: "预计佣金", en: "Projected commission", type: "money" },
    { key: "held", label: "暂扣佣金", en: "On hold commission", type: "money" },
    { key: "approved", label: "已入账佣金", en: "Credited commission", type: "money" },
    { key: "rejected", label: "已拒绝佣金", en: "Rejected commission", type: "money" },
    { key: "reversed", label: "冲正金额", en: "Reversed commission", type: "money" },
    { key: "registerRate", label: "点击→注册", en: "Click → registration", type: "rate" },
    { key: "ftdRate", label: "注册→FTD", en: "Registration → FTD", type: "rate" },
    { key: "effectiveRate", label: "FTD→有效 FTD", en: "FTD → valid FTD", type: "rate" },
    { key: "qualifiedRate", label: "有效 FTD→合格", en: "Valid FTD → qualified", type: "rate" },
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
    const commissionStatus = qualifiedAt ? pick(["pending", "held", "held", "approved", "approved", "approved", "rejected", "reversed"]) : "pending";
    const expected = qualifiedAt ? pick([80, 120, 180, 240, 320, 400, 550, 700]) : 0;
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
      country: kyc === "通过" ? pick(countries) : "待确认",
      ...attribution(),
      tier: qualifiedAt ? pick(["T1", "T2", "T3", "T4"]) : "-",
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
    row.commissionId = row.expected ? `COM-${row.clientId}` : null;
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
      qualified: registered.filter(row => row.qualifiedAt).length,
      traders: registered.filter(row => row.tradedAt).length
    };
    for (const key of ["ftdAmount", "expected", "held", "approved", "rejected", "reversed"]) {
      counts[key] = registered.reduce((sum, row) => sum + row[key], 0);
    }
    const ratio = (numerator, denominator) => denominator ? numerator / denominator : null;
    return {
      ...counts,
      registerRate: ratio(counts.registrations, counts.clicks),
      ftdRate: ratio(counts.ftd, counts.registrations),
      effectiveRate: ratio(counts.effective, counts.ftd),
      qualifiedRate: ratio(counts.qualified, counts.effective),
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
    value,
    options,
    filterRows,
    aggregate,
    totals
  };
})();
