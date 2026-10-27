AFF.helpers = {
  h(value) {
    return String(value ?? "-")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  },
  tag(value) {
    const map = {
      "启用": "ok", "通过": "ok", "合格": "ok", "已批准": "ok", "已到账": "ok", "已支付": "ok", "已验证": "ok", "已接受": "ok",
      "暂停": "warning", "暂扣": "warning", "处理中": "warning", "待审核": "warning", "进行中": "warning", "持有": "warning", "申诉中": "warning", "已封禁": "danger",
      "拒绝": "danger", "已拒绝": "danger", "追回中": "danger", "失败": "danger", "未提交": "muted", "注册": "info", "已注册": "info"
    };
    return `<span class="tag tag-${map[value] || "muted"}">${AFF.helpers.h(value)}</span>`;
  },
  pageHeader(title, description, actions = "") {
    return actions ? `<div class="page-actions page-actions-top">${actions}</div>` : "";
  },
  cards(items) {
    return `<div class="cards">${items.map(item => `
      <article class="card metric">
        <span>${AFF.helpers.h(item.label)}</span>
        <strong>${AFF.helpers.h(item.value)}</strong>
        ${item.hint ? `<small>${AFF.helpers.h(item.hint)}</small>` : ""}
      </article>`).join("")}</div>`;
  },
  table({ columns, rows, numeric = [], footer = "" }) {
    if (!rows.length) {
      return `<div class="empty-state"><strong>暂无数据</strong><span>尝试调整筛选条件</span></div>${footer}`;
    }
    return `
      <div class="table-wrap">
        <table>
          <thead><tr>${columns.map(column => `<th>${AFF.helpers.h(column)}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows.map(row => `<tr>${columns.map((column, index) => `<td class="${numeric.includes(index) ? "numeric" : ""}">${row[index]}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>${footer}`;
  },
  pagination(total, page, handler) {
    const pages = Math.max(1, Math.ceil(total / 10));
    return `
      <div class="table-footer">
        <span>共 ${total} 条记录</span>
        <div class="pagination">
          <button type="button" data-action="${handler}" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>‹</button>
          ${Array.from({ length: pages }, (_, index) => index + 1).map(item => `<button class="${item === page ? "active" : ""}" type="button" data-action="${handler}" data-page="${item}">${item}</button>`).join("")}
          <button type="button" data-action="${handler}" data-page="${page + 1}" ${page >= pages ? "disabled" : ""}>›</button>
        </div>
      </div>`;
  }
};

AFF.pages = {};

AFF.pages.dash = () => {
  const state = AFF.state;
  const pageCodes = {
    "注册页": "register",
    "首页": "home",
    "Standard·MT5开户页": "standard-mt5",
    "Pro·MT4开户页": "pro-mt4",
    "Zero·MT5开户页": "zero-mt5"
  };
  const languageCodes = { "简体中文": "zh-cn", "English": "en", "ไทย": "th", "Tiếng Việt": "vi" };
  const promotionUrl = new URL(AFF.dashboard.link);
  promotionUrl.searchParams.set("page", pageCodes[state.dashboardLinkPage] || "register");
  promotionUrl.searchParams.set("lang", languageCodes[state.dashboardLinkLanguage] || "zh-cn");
  const promotionLink = promotionUrl.href;
  const summary = AFF.dashboard.summaryPeriods[state.dashboardPeriod] || AFF.dashboard.summaryPeriods.past30;
  const periodOptions = [
    ["today", "今日"],
    ["past7", "过去7天"],
    ["past30", "过去30天"],
    ["lastWeek", "上周"],
    ["lastMonth", "上月"]
  ];
  const linkPicker = (field, label, value, isOpen, query, placeholder) => `
    <div class="dashboard-link-picker ${isOpen ? "open" : ""}">
      <span class="field-label">${AFF.helpers.h(label)}</span>
      <button class="dashboard-link-picker-button" type="button" data-action="toggle-dashboard-picker" data-dashboard-picker="${field}" aria-haspopup="listbox" aria-expanded="${isOpen}">
        <span>${AFF.helpers.h(value)}</span><small>▾</small>
      </button>
      <div class="dashboard-link-options" role="listbox" aria-label="${AFF.helpers.h(label)}">
        <input data-dashboard-link-search="${field}" type="search" placeholder="${AFF.helpers.h(placeholder)}" value="${AFF.helpers.h(query)}" aria-label="${AFF.helpers.h(placeholder)}">
        <div class="dashboard-link-option-list" data-dashboard-link-option-list="${field}">${AFF.renderDashboardLinkOptions(field)}</div>
      </div>
    </div>`;
  const walletMetric = AFF.dashboard.metrics[0];
  const otherMetrics = AFF.dashboard.metrics.slice(1);
  return `
    ${AFF.helpers.pageHeader("仪表盘", "我能提多少钱、客户激活情况、去哪拿链接。")}
    <div class="cards dashboard-metrics">
      <article class="card metric dashboard-wallet-card">
        <div class="metric-header">
          <span>${AFF.helpers.h(walletMetric.label)}</span>
          <button class="button secondary small" type="button" data-route="wd">提现</button>
        </div>
        <strong>${AFF.helpers.h(walletMetric.value)}</strong>
        <small>总收益：${AFF.helpers.h(AFF.dashboard.totalRevenue)}</small>
      </article>
      ${otherMetrics.map(item => `
        <article class="card metric">
          <span>${AFF.helpers.h(item.label)}</span>
          <strong>${AFF.helpers.h(item.value)}</strong>
          ${item.hint ? `<small>${AFF.helpers.h(item.hint)}</small>` : ""}
        </article>`).join("")}
    </div>
      <section class="card">
        <div class="panel-header"><h2>我的推广链接</h2><button class="button secondary small" type="button" data-route="deep">深度链接设置</button></div>
        <div class="panel-body dashboard-link-controls">
          ${linkPicker("page", "到达页面", state.dashboardLinkPage, state.dashboardLinkPagePickerOpen, state.dashboardLinkPageQuery, "搜索到达页面")}
          ${linkPicker("language", "语言支持", state.dashboardLinkLanguage, state.dashboardLinkLanguagePickerOpen, state.dashboardLinkLanguageQuery, "搜索语言")}
          <div class="dashboard-link-address">
            <div class="link-text">${AFF.helpers.h(promotionLink)}</div>
            <button class="button secondary" type="button" data-copy="${AFF.helpers.h(promotionLink)}">复制推广地址</button>
          </div>
        </div>
      </section>
    <div class="dashboard-support-grid">
      <article class="card tutorial-card" data-route="apply" tabindex="0" role="button" aria-label="利用我们为您提供的优化建议，提升收入">
      <div class="tutorial-copy">
        <span class="eyebrow">新手教程</span>
        <h2>利用我们为您提供的优化建议，提升收入</h2>
        <p>从高转化地区、推广链接和素材选择开始，逐步找到更适合您的推广方式。</p>
      </div>
      </article>
      ${AFF.postbacks.renderDashboard()}
    </div>
      <section class="card dashboard-summary">
        <div class="panel-header">
          <h2>推广数据汇总</h2>
          <label class="dashboard-summary-filter">
            <span>时间范围</span>
            <select data-dashboard-period aria-label="数据时间范围">
              ${periodOptions.map(([value, label]) => `<option value="${value}" ${state.dashboardPeriod === value ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="dashboard-summary-table-wrap">
          <table class="dashboard-summary-table">
            <thead><tr><th>数据项</th><th>合计数量</th></tr></thead>
            <tbody>
              <tr><td>注册量</td><td>${AFF.helpers.h(summary.registrations)}</td></tr>
              <tr><td>有效FTD数量</td><td>${AFF.helpers.h(summary.qualified)}</td></tr>
              <tr><td>收入金额</td><td>${AFF.helpers.h(summary.revenue)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>`;
};

AFF.pages.tracker = () => {
  return AFF.postbacks.render();
};

AFF.pages.perf = () => {
  const state = AFF.state;
  const fixed = AFF.performance.metrics;
  const groups = state.perf.groups.length ? state.perf.groups : ["全部"];
  const columns = [...groups, ...fixed];
  const dimensionIndex = {
    activity: 4,
    source: 2,
    medium: 3,
    campaign: 4,
    term: 5,
    content: 6
  };
  const rows = AFF.performance.rows
    .filter(row => Object.entries(state.perf.filters).every(([key, value]) => {
      if (value === "全部" || value === "全部活动") return true;
      return String(row[dimensionIndex[key]]).includes(value.replace(" Telegram 投放", "投放"));
    }))
    .map(row => {
      const groupValues = state.perf.groups.length ? state.perf.groups.map(group => row[AFF.performance.dimensions.indexOf(group)]) : ["全部"];
      return [...groupValues, ...row.slice(7).map((value, index) => index === 8 || index >= 14 ? AFF.helpers.h(value) : AFF.helpers.h(value))];
    });
  const pagedRows = rows.slice((state.perf.page - 1) * 10, state.perf.page * 10);
  const numericIndexes = columns.map((_, index) => index >= groups.length).map((value, index) => value ? index : -1).filter(index => index >= 0);
  return `
    ${AFF.helpers.pageHeader("业绩数据", "按时间、活动、UTM 查看流量漏斗、客户质量与收益状态。", `<button class="button secondary" type="button" data-action="open-perf-filter">筛选器 (${state.perf.count})</button>`)}
    <section class="card">
      <div class="toolbar">
        <div class="chips">
          ${state.perf.groups.map(group => `<button class="chip active" type="button" data-perf-group="${AFF.helpers.h(group)}">${AFF.helpers.h(group)} ×</button>`).join("")}
          <button class="chip" type="button" data-action="add-perf-group">＋ 添加分组</button>
        </div>
        <div class="toolbar-spacer"></div>
        <span class="helper">数据每2小时更新</span>
      </div>
      ${AFF.helpers.table({ columns, rows: pagedRows, numeric: numericIndexes, footer: AFF.helpers.pagination(rows.length, state.perf.page, "perf-page") })}
    </section>
    ${state.perf.drawer ? AFF.pages.perfDrawer() : ""}`;
};

AFF.pages.perfDrawer = () => {
  const state = AFF.state;
  const filterOptions = {
    activity: ["全部活动", "十月 Telegram 投放", "财经博客内容位", "九月测试"],
    source: ["全部", "Telegram", "Facebook", "谷歌广告", "推荐链接"],
    medium: ["全部", "社交媒体", "竞价广告", "推荐流量"],
    campaign: ["全部", "十月投放", "财经博客", "九月测试"],
    term: ["全部", "外汇", "交易"],
    content: ["全部", "横幅A", "视频B"]
  };
  const labels = {
    activity: "活动", source: "UTM 来源 utm_source", medium: "UTM 媒介 utm_medium",
    campaign: "UTM 活动 utm_campaign", term: "UTM 关键词 utm_term", content: "UTM 内容 utm_content"
  };
  return `
  <div class="overlay" data-action="close-perf-filter"></div>
  <aside class="filter-drawer" aria-label="筛选器">
    <div class="panel-header"><h2>筛选器</h2><button class="close-button" type="button" data-action="close-perf-filter">×</button></div>
    <div class="panel-body">
      <div class="field"><span>时间</span><input type="date" value="2026-09-23" disabled><input type="date" value="2026-10-22" disabled></div>
      ${Object.entries(filterOptions).map(([key, values], index) => `
        <label class="field" style="margin-top:${index === 0 ? 14 : 12}px">
          <span>${labels[key]}</span>
          <select data-perf-filter="${key}">
            ${values.map(value => `<option value="${AFF.helpers.h(value)}" ${state.perf.draft[key] === value ? "selected" : ""}>${AFF.helpers.h(value)}</option>`).join("")}
          </select>
        </label>`).join("")}
      <p class="helper" style="margin-top:14px">筛选器为暂存状态，点击应用后才更新表格。</p>
    </div>
    <div class="drawer-actions">
      <button class="button secondary" type="button" data-action="reset-perf-filter">重置</button>
      <button class="button primary" type="button" data-action="apply-perf-filter">应用</button>
    </div>
  </aside>`;
};

AFF.pages.clients = () => {
  const state = AFF.state;
  const filters = [
    ["注册时间", ["近30天", "近7天", "全部"]],
    ["忠诚客户", ["全部", "是", "否"]],
    ["KYC", ["全部", "通过", "未提交", "失败"]],
    ["资格日期", ["全部", "本月", "上月"]]
  ];
  const filtered = AFF.clients.filter(row => {
    const loyal = state.clientFilters["忠诚客户"];
    const kyc = state.clientFilters["KYC"];
    const registerFilter = state.clientFilters["注册时间"];
    const qualificationFilter = state.clientFilters["资格日期"];
    const mockNow = Date.parse("2026-10-22");
    const registered = Date.parse(row.registeredAt);
    const qualification = row.qualifiedAt === "-" ? null : Date.parse(row.qualifiedAt);
    const loyalMatches = loyal === "全部" || (loyal === "是" ? row.loyal : !row.loyal);
    const kycMatches = kyc === "全部" || row.kyc === kyc;
    const registerMatches = registerFilter === "全部" ||
      mockNow - registered <= (registerFilter === "近7天" ? 7 : 30) * 86400000;
    const qualificationMatches = qualificationFilter === "全部" ||
      (qualification && qualification.getFullYear() === 2026 &&
        qualification.getMonth() === (qualificationFilter === "本月" ? 9 : 8));
    return loyalMatches && kycMatches && registerMatches && qualificationMatches;
  });
  const columns = ["客户编号 / 邮箱", "状态", "注册日期", "国家", "平台", "KYC", "UTM Source", "UTM Medium", "UTM Campaign", "UTM Term", "UTM Content", "忠诚客户", "资格日期", "Tier", "Sub ID", "预计", "已付", "已拒", "暂扣", "操作"];
  const allRows = filtered.map(row => [
    `${AFF.helpers.h(row.clientId)}<br><span class="muted">${AFF.helpers.h(row.email)}</span>`,
    `<div class="status-line">${AFF.helpers.tag(row.status === "qualified" ? "合格" : row.status === "holding" ? "持有" : "已注册")}<button class="question-button" type="button" data-client-info="${row.clientId}">?</button></div>`,
    row.registeredAt, row.country, row.platform, AFF.helpers.tag(row.kyc), row.source, row.medium, row.campaign, row.term, row.content,
    AFF.helpers.tag(row.loyal ? "是" : "否"), row.qualifiedAt, row.tier, row.subId, row.expected, row.paid, row.rejected, row.held,
    `<button class="button secondary small" type="button" data-client-info="${row.clientId}">详情</button>`
  ]);
  const rows = allRows.slice((state.clientsPage - 1) * 10, state.clientsPage * 10);
  return `
    ${AFF.helpers.pageHeader("客户列表", "客户从哪来、是否合格、钱在什么状态。")}
    <section class="card">
      <div class="toolbar">
        <button class="button secondary small" type="button" data-action="toggle-client-filter">${state.clientFilterOpen ? "收起筛选" : "筛选条件"}</button>
        ${state.clientFilterOpen ? filters.map(([label, values]) => `
          <div class="field"><span>${label}</span><div class="chips">${values.map(value => `<button class="chip ${state.clientFilters[label] === value ? "active" : ""}" type="button" data-client-filter="${AFF.helpers.h(label)}" data-value="${AFF.helpers.h(value)}">${value}</button>`).join("")}</div></div>`).join("") : ""}
      </div>
      ${AFF.helpers.table({ columns, rows, numeric: [15, 16, 17, 18], footer: AFF.helpers.pagination(allRows.length, state.clientsPage, "clients-page") })}
    </section>`;
};

AFF.pages.promo = () => {
  const state = AFF.state;
  const campaignRows = AFF.campaigns.map(row => [row.name, `<span class="link-text">${AFF.helpers.h(row.link)}</span>`, AFF.helpers.tag(row.status), row.registrations, row.qualified, row.expected, `<button class="button secondary small" type="button" data-copy="${AFF.helpers.h(row.link)}">复制</button>`]);
  const subRows = AFF.subIds.map(row => [row.id, AFF.helpers.tag(row.status), row.updatedAt, `<button class="button secondary small" type="button" data-sub-toggle="${row.id}">${row.status === "启用" ? "封禁" : "解封"}</button>`]);
  return `
    ${AFF.helpers.pageHeader("推广链接与活动", "活动是链接分组，Sub ID 用于二级渠道统计。", `<button class="button primary" type="button" data-action="open-campaign-modal">创建新活动</button>`)}
    ${state.promoTab === "campaign" ? `
      <section class="card">${AFF.helpers.table({ columns: ["活动", "链接", "状态", "注册", "合格", "预计收益", "操作"], rows: campaignRows, numeric: [3, 4, 5] })}</section>` : `
      ${AFF.helpers.cards([{ label: "Sub ID总数", value: AFF.subIds.length }, { label: "启用中", value: AFF.subIds.filter(item => item.status === "启用").length }, { label: "已封禁", value: AFF.subIds.filter(item => item.status === "已封禁").length }])}
      <section class="card">${AFF.helpers.table({ columns: ["Sub ID", "链接状态", "更新日期", "操作"], rows: subRows })}</section>`}
    <div class="toolbar" style="margin-top:14px;border:1px solid var(--border);border-radius:6px;background:#fff">
      <div class="tabs">
        <button class="${state.promoTab === "campaign" ? "active" : ""}" type="button" data-promo-tab="campaign">活动</button>
        <button class="${state.promoTab === "sub" ? "active" : ""}" type="button" data-promo-tab="sub">Sub ID</button>
      </div>
      <p class="helper">Sub ID 仅做渠道统计，不承诺多级分佣。</p>
    </div>`;
};

AFF.pages.deep = () => {
  const state = AFF.state;
  const languageCode = language => language === "简体中文" ? "zh-cn" : language === "English" ? "en" : language === "ไทย" ? "th" : "vi";
  const slug = page => page === "首页" ? "" : page.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const desktop = `https://example.com/${slug(state.deep.desktop.page)}?lang=${languageCode(state.deep.desktop.language)}`;
  const mobile = `https://app.example.com/${state.deep.mobile.system.includes("iOS") ? "ios" : "android"}/${slug(state.deep.mobile.page)}?lang=${languageCode(state.deep.mobile.language)}`;
  const control = (label, scope, key, values) => `
    <label class="field"><span>${label}</span>
      <select data-deep="${scope}.${key}">${values.map(value => `<option ${state.deep[scope][key] === value ? "selected" : ""}>${AFF.helpers.h(value)}</option>`).join("")}</select>
    </label>`;
  return `
    ${AFF.helpers.pageHeader("深度链接", "按目标页与语言生成电脑端、移动端直达链接。")}
    <div class="grid-2">
      <section class="card"><div class="panel-header"><h2>电脑端</h2></div><div class="panel-body link-box">
        ${control("目标页", "desktop", "page", AFF.deepLinks.pages)}${control("语言", "desktop", "language", AFF.deepLinks.languages)}
        <div class="link-text">${AFF.helpers.h(desktop)}</div><button class="button primary" type="button" data-copy="${AFF.helpers.h(desktop)}">复制链接</button>
      </div></section>
      <section class="card"><div class="panel-header"><h2>移动端</h2></div><div class="panel-body link-box">
        ${control("目标系统", "mobile", "system", AFF.deepLinks.systems)}${control("目标页", "mobile", "page", AFF.deepLinks.pages)}${control("语言", "mobile", "language", AFF.deepLinks.languages)}
        <div class="link-text">${AFF.helpers.h(mobile)}</div><button class="button primary" type="button" data-copy="${AFF.helpers.h(mobile)}">复制链接</button>
      </div></section>
    </div>`;
};

AFF.pages.pay = () => `
  ${AFF.helpers.pageHeader("收益与提现", "钱包余额、收益四态与结算流水；动态Hold后日结。", `<button class="button primary" type="button" data-route="wd">提现</button>`)}
  ${AFF.helpers.cards(AFF.commissions.metrics)}
  <section class="card">
    <div class="panel-header"><h2>结算流水</h2><span class="helper">日结 · 不设最低提现 · 手续费因方式而异</span></div>
    ${AFF.helpers.table({
      columns: ["日期", "类型", "说明", "金额", "状态", "操作"],
      rows: AFF.commissions.rows.map(row => [
        row.date, row.type, row.note, row.amount, AFF.helpers.tag(row.status),
        row.appealOpen && row.action === "申诉" ? `<button class="button secondary small" type="button" data-action="open-appeal">申诉</button>` : "-"
      ]),
      numeric: [3]
    })}
  </section>`;

AFF.pages.lookup = () => {
  const state = AFF.state;
  const result = state.lookup.result;
  return `
    ${AFF.helpers.pageHeader("客户归属查询", "输入精准客户标识，查询归属状态与原因。")}
    <section class="card">
      <div class="toolbar">
        <label class="field" style="flex:1 1 320px"><span>注册邮箱 / 交易账号 / 投资钱包账号</span>
          <input id="lookup-input" value="${AFF.helpers.h(state.lookup.input)}" placeholder="C-10241 或 w***@gmail.com">
        </label>
        <button class="button primary" type="button" data-action="lookup">查询</button>
      </div>
      ${result ? `
        <div class="result-card info-grid">
          <div class="info-item"><span>客户编号</span><strong>${AFF.helpers.h(result.id)}</strong></div>
          <div class="info-item"><span>客户邮箱</span><strong>${AFF.helpers.h(result.email)}</strong></div>
          <div class="info-item"><span>归属状态</span>${AFF.helpers.tag(result.owned ? "通过" : "拒绝")}</div>
          <div class="info-item"><span>归属起始</span><strong>${AFF.helpers.h(result.date)}</strong></div>
          <div class="info-item wide"><span>判定依据</span><strong>${AFF.helpers.h(result.reason)}</strong></div>
        </div>` : `<div class="empty-state"><strong>输入精准标识后查询</strong><span>为保障账户安全，连续查询次数有限制；请求会进入审计日志</span></div>`}
    </section>`;
};

AFF.filteredAssets = () => {
  return AFF.assets.filter(item => AFF.state.assets.type === "全部" || item.type === AFF.state.assets.type);
};

AFF.visibleAssets = () => AFF.filteredAssets().slice(0, AFF.state.assets.page * 12);

AFF.assetVariantRow = (values, label) => `
  <div class="asset-variant-row" aria-label="${AFF.helpers.h(label)}">
    <strong>${AFF.helpers.h(label)}</strong>
    ${values.slice(0, 3).map(value => `<span>${AFF.helpers.h(label === "语言" ? AFF.languageDisplayName(value) : value)}</span>`).join("")}
    ${values.length > 3 ? `<em>+${values.length - 3}</em>` : ""}
  </div>`;

AFF.languageDisplayName = value => {
  const codes = {
    "简体中文": "zh-Hans", "English": "en", "ไทย": "th", "Tiếng Việt": "vi",
    "العربية": "ar", "Bahasa Indonesia": "id", "Español": "es", "Português": "pt",
    "Français": "fr", "हिन्दी": "hi", "日本語": "ja", "한국어": "ko",
    "Русский": "ru", "Türkçe": "tr", "Italiano": "it"
  };
  const locale = AFF.state.language === "en" ? "en" : "zh-Hans-CN";
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(codes[value] || value);
  } catch {
    return value;
  }
};

AFF.assetTrackingUrl = (item, options = {}) => {
  const url = new URL(AFF.dashboard.link);
  url.searchParams.set("utm_campaign", "materials");
  url.searchParams.set("utm_medium", "material");
  url.searchParams.set("utm_content", item.id);
  if (options.size) url.searchParams.set("material_size", options.size);
  if (options.language) url.searchParams.set("material_language", options.language);
  if (options.device) url.searchParams.set("material_device", options.device);
  if (options.platform) url.searchParams.set("material_platform", options.platform);
  return url.href;
};

AFF.assetAnchorTag = (item, options = {}) => {
  const link = AFF.assetTrackingUrl(item, options);
  return `<a href="${link}" target="_blank" rel="noopener noreferrer">了解 Affiliate APC</a>`;
};

AFF.assetLandingUrl = (item, detail) => {
  const url = new URL(`https://example.com/lp/${item.urlPath}`);
  url.searchParams.set("utm_source", "partner");
  url.searchParams.set("utm_campaign", "materials");
  url.searchParams.set("utm_medium", "landing_page");
  url.searchParams.set("utm_content", item.id);
  url.searchParams.set("material_language", detail.language);
  return url.href;
};

AFF.assetIframeTag = (item, detail) => {
  const dimensions = detail.size === "纵向" ? { width: 720, height: 1280 } : { width: 1280, height: 720 };
  const url = new URL(AFF.assetTrackingUrl(item, detail));
  url.searchParams.set("video_loop", detail.loop ? "1" : "0");
  url.searchParams.set("video_muted", detail.muted ? "1" : "0");
  url.searchParams.set("video_autoplay", detail.autoplay ? "1" : "0");
  const allow = detail.autoplay ? "autoplay; fullscreen; picture-in-picture" : "fullscreen; picture-in-picture";
  return `<iframe src="${url.href}" width="${dimensions.width}" height="${dimensions.height}" title="${item.name}" allow="${allow}" loading="lazy"></iframe>`;
};

AFF.pages.assets = () => {
  const state = AFF.state;
  const filtered = AFF.filteredAssets();
  const visible = AFF.visibleAssets();
  const typeOptions = ["全部", "横幅", "视频", "落地页", "GIF"];
  return `
    ${AFF.helpers.pageHeader("素材库", "未接受《推广行为准则》前锁定下载。", state.assetsAccepted ? "" : `<button class="button primary" type="button" data-action="open-code-modal">阅读并接受准则</button>`)}
    <section class="card asset-tabs-card">
      <div class="tabs asset-tabs" role="tablist" aria-label="素材类型">
        ${typeOptions.map(type => `<button class="${state.assets.type === type ? "active" : ""}" type="button" role="tab" aria-selected="${state.assets.type === type}" data-assets-filter="type" data-value="${AFF.helpers.h(type)}">${AFF.helpers.h(type)}</button>`).join("")}
      </div>
    </section>
    <section class="card asset-list-card"><div class="panel-header">
      <h2>素材列表 <small>已展示 ${visible.length} / ${filtered.length} 个</small></h2>
    </div>
    <div class="locked-region ${state.assetsAccepted ? "" : "locked"}">
      ${visible.length ? `<div class="asset-grid">${visible.map(item => {
        if (item.type === "横幅") {
          return `
        <article class="asset-card asset-banner-card">
          <button class="asset-preview asset-preview-button" type="button" data-action="open-asset-detail" data-asset-id="${AFF.helpers.h(item.id)}" ${state.assetsAccepted ? "" : "disabled"} aria-label="查看${AFF.helpers.h(item.name)}尺寸与语言">
            <span class="mosaic-placeholder" aria-hidden="true"></span>
          </button>
          <div class="asset-body">
            ${AFF.assetVariantRow(item.sizes, "尺寸")}
            ${AFF.assetVariantRow(item.languages, "语言")}
          </div>
        </article>`;
        }
        if (item.type === "落地页") {
          return `
        <article class="asset-card asset-landing-card">
          <button class="asset-preview asset-preview-button" type="button" data-action="open-asset-detail" data-asset-id="${AFF.helpers.h(item.id)}" ${state.assetsAccepted ? "" : "disabled"} aria-label="查看${AFF.helpers.h(item.name)}语言与网址">
            <span aria-hidden="true">X</span>
          </button>
          <div class="asset-body">
            ${AFF.assetVariantRow(item.languages, "语言")}
          </div>
        </article>`;
        }
        if (item.type === "GIF") {
          return `
        <article class="asset-card asset-gif-card">
          <button class="asset-preview asset-preview-button" type="button" data-action="open-asset-detail" data-asset-id="${AFF.helpers.h(item.id)}" ${state.assetsAccepted ? "" : "disabled"} aria-label="查看${AFF.helpers.h(item.name)}语言与尺寸">
            <span class="mosaic-placeholder" aria-hidden="true"></span>
          </button>
          <div class="asset-body">
            ${AFF.assetVariantRow(item.languages, "语言")}
            ${AFF.assetVariantRow(item.sizes, "尺寸")}
          </div>
        </article>`;
        }
        if (item.type === "视频") {
          return `
        <article class="asset-card asset-video-card">
          <button class="asset-preview asset-preview-button" type="button" data-action="open-asset-detail" data-asset-id="${AFF.helpers.h(item.id)}" ${state.assetsAccepted ? "" : "disabled"} aria-label="查看${AFF.helpers.h(item.name)}尺寸与语言">
            <span class="mosaic-placeholder" aria-hidden="true"></span>
          </button>
          <div class="asset-body">
            ${AFF.assetVariantRow(item.sizes, "尺寸")}
            ${AFF.assetVariantRow(item.languages, "语言")}
          </div>
        </article>`;
        }
        return "";
      }).join("")}</div>` : `<div class="empty-state"><strong>暂无素材</strong><span>尝试调整筛选条件</span><button class="button secondary" type="button" data-action="reset-asset-filters">重置筛选</button></div>`}
      ${visible.length < filtered.length ? `<div class="asset-load-more"><button class="button secondary" type="button" data-action="load-more-assets">加载更多素材</button></div>` : ""}
      ${state.assetsAccepted ? "" : `<div class="gate"><div class="gate-card"><strong>素材区已锁定</strong><p>请先阅读并接受《推广行为准则》后再下载素材。</p><button class="button primary" type="button" data-action="open-code-modal">阅读并接受准则</button></div></div>`}
    </div></section>
    ${state.assets.detail ? AFF.pages.assetDetail() : ""}`;
};

AFF.pages.assetDetail = () => {
  const detail = AFF.state.assets.detail;
  const item = AFF.assets.find(asset => asset.id === detail.id);
  if (!item) return "";
  if (item.type === "GIF") {
    const anchorTag = AFF.assetAnchorTag(item, detail);
    const fields = [
      ["language", "语言", item.languages],
      ["size", "尺寸", item.sizes],
      ["platform", "平台", item.platforms]
    ];
    return `
  <div class="overlay" data-action="close-asset-detail"></div>
  <aside class="filter-drawer asset-detail-drawer asset-gif-drawer" aria-label="GIF素材详情">
    <div class="panel-header"><h2>${AFF.helpers.h(item.name)}</h2><button class="close-button" type="button" data-action="close-asset-detail" aria-label="关闭素材详情">×</button></div>
    <div class="asset-gif-layout">
      <div class="asset-gif-preview" aria-label="GIF大预览占位"><span aria-hidden="true">X</span></div>
      <div class="asset-gif-settings">
        <div class="asset-gif-fields">
          ${fields.map(([key, label, values]) => `
            <label class="field"><span>${AFF.helpers.h(label)}</span>
              <select data-asset-detail-option="${key}" aria-label="${AFF.helpers.h(label)}">
                ${values.map(value => `<option value="${AFF.helpers.h(value)}" ${detail[key] === value ? "selected" : ""}>${AFF.helpers.h(key === "language" ? AFF.languageDisplayName(value) : value)}</option>`).join("")}
              </select>
            </label>`).join("")}
        </div>
        <div class="asset-detail-code">
          <span>a标签完整文本</span>
          <code id="asset-gif-anchor-code">${AFF.helpers.h(anchorTag)}</code>
        </div>
      </div>
    </div>
    <div class="drawer-actions asset-detail-actions">
      <button class="button primary" type="button" data-action="download-asset-variant">下载</button>
      <button class="button secondary" type="button" data-copy="${AFF.helpers.h(anchorTag)}">复制</button>
    </div>
  </aside>`;
  }
  if (item.type === "落地页") {
    const landingUrl = AFF.assetLandingUrl(item, detail);
    return `
  <div class="overlay" data-action="close-asset-detail"></div>
  <aside class="filter-drawer asset-detail-drawer asset-landing-drawer" aria-label="落地页素材详情">
    <div class="panel-header"><h2>${AFF.helpers.h(item.name)}</h2><button class="close-button" type="button" data-action="close-asset-detail" aria-label="关闭素材详情">×</button></div>
    <div class="asset-landing-layout">
      <div class="asset-landing-preview" tabindex="0" role="region" aria-label="落地页长图预览">
        ${Array.from({ length: 12 }, (_, index) => `<section><span aria-hidden="true">X</span><strong>第 ${index + 1} 屏</strong></section>`).join("")}
      </div>
      <div class="asset-landing-settings">
        <label class="field"><span>语言</span>
          <select data-asset-detail-option="language" aria-label="语言">
            ${item.languages.map(value => `<option value="${AFF.helpers.h(value)}" ${detail.language === value ? "selected" : ""}>${AFF.helpers.h(AFF.languageDisplayName(value))}</option>`).join("")}
          </select>
        </label>
        <div class="asset-detail-code">
          <span>网址</span>
          <code id="asset-landing-url">${AFF.helpers.h(landingUrl)}</code>
        </div>
        <div class="asset-landing-actions">
          <a class="button primary" href="${AFF.helpers.h(landingUrl)}" target="_blank" rel="noopener noreferrer">查看</a>
          <button class="button secondary" type="button" data-copy="${AFF.helpers.h(landingUrl)}">复制链接</button>
        </div>
      </div>
    </div>
  </aside>`;
  }
  if (item.type === "视频") {
    const iframeTag = AFF.assetIframeTag(item, detail);
    const switches = [
      ["loop", "循环播放"],
      ["muted", "静音"],
      ["autoplay", "自动播放"]
    ];
    return `
  <div class="overlay" data-action="close-asset-detail"></div>
  <aside class="filter-drawer asset-detail-drawer" aria-label="视频素材详情">
    <div class="panel-header"><h2>${AFF.helpers.h(item.name)}</h2><button class="close-button" type="button" data-action="close-asset-detail" aria-label="关闭素材详情">×</button></div>
    <div class="asset-detail-body">
      <div class="asset-detail-fields asset-video-fields">
        <label class="field"><span>尺寸</span>
          <select data-asset-detail-option="size" aria-label="尺寸">
            ${item.sizes.map(value => `<option value="${AFF.helpers.h(value)}" ${detail.size === value ? "selected" : ""}>${AFF.helpers.h(value)}</option>`).join("")}
          </select>
        </label>
        <label class="field"><span>语言</span>
          <select data-asset-detail-option="language" aria-label="语言">
            ${item.languages.map(value => `<option value="${AFF.helpers.h(value)}" ${detail.language === value ? "selected" : ""}>${AFF.helpers.h(AFF.languageDisplayName(value))}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="asset-video-options" aria-label="播放选项">
        ${switches.map(([key, label]) => `
          <label class="asset-switch"><input type="checkbox" role="switch" ${detail[key] ? "checked" : ""} data-asset-video-option="${key}"><span aria-hidden="true"></span><em>${AFF.helpers.h(label)}</em></label>`).join("")}
      </div>
      <button class="asset-video-preview ${detail.playing ? "playing" : ""}" type="button" data-action="toggle-video-preview" aria-label="${detail.playing ? "暂停视频" : "播放视频"}">
        <span class="video-placeholder" aria-hidden="true">X</span>
        <span class="video-control" aria-hidden="true">${detail.playing ? "❚❚" : "▶"}</span>
        <span class="video-progress" aria-hidden="true"><i></i></span>
      </button>
      <div class="asset-detail-code">
        <span>iframe标签代码</span>
        <code id="asset-iframe-code">${AFF.helpers.h(iframeTag)}</code>
      </div>
    </div>
    <div class="drawer-actions asset-detail-actions">
      <button class="button primary" type="button" data-action="download-asset-variant">下载</button>
      <button class="button secondary" type="button" data-copy="${AFF.helpers.h(iframeTag)}">复制</button>
    </div>
  </aside>`;
  }
  const anchorTag = AFF.assetAnchorTag(item, detail);
  const fields = [
    ["size", "尺寸", item.sizes],
    ["language", "语言", item.languages],
    ["device", "设备", item.devices]
  ];
  return `
  <div class="overlay" data-action="close-asset-detail"></div>
  <aside class="filter-drawer asset-detail-drawer" aria-label="横幅素材详情">
    <div class="panel-header"><h2>${AFF.helpers.h(item.name)}</h2><button class="close-button" type="button" data-action="close-asset-detail" aria-label="关闭素材详情">×</button></div>
    <div class="asset-detail-body">
      <div class="asset-detail-fields">
        ${fields.map(([key, label, values]) => `
          <label class="field"><span>${AFF.helpers.h(label)}</span>
            <select data-asset-detail-option="${key}" aria-label="${AFF.helpers.h(label)}">
              ${values.map(value => `<option value="${AFF.helpers.h(value)}" ${detail[key] === value ? "selected" : ""}>${AFF.helpers.h(key === "language" ? AFF.languageDisplayName(value) : value)}</option>`).join("")}
            </select>
          </label>`).join("")}
      </div>
      <div class="asset-detail-preview" aria-label="大预览占位"><span aria-hidden="true">X</span></div>
      <div class="asset-detail-code">
        <span>a标签完整文本</span>
        <code id="asset-anchor-code">${AFF.helpers.h(anchorTag)}</code>
      </div>
    </div>
    <div class="drawer-actions asset-detail-actions">
      <button class="button primary" type="button" data-action="download-asset-variant">下载</button>
      <button class="button secondary" type="button" data-copy="${AFF.helpers.h(anchorTag)}">复制</button>
    </div>
  </aside>`;
};

AFF.countryDisplayName = country => {
  const locale = AFF.state.language === "en" ? "en" : "zh-CN";
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(country.code);
  } catch {
    return country.name.replace(/\s*\([^)]+\)\s*$/, "");
  }
};

AFF.sortedCommissionCountries = () => {
  const locale = AFF.state.language === "en" ? "en" : "zh-Hans-CN";
  return [...AFF.partnerProgram.commissionCountries].sort((a, b) =>
    AFF.countryDisplayName(a).localeCompare(AFF.countryDisplayName(b), locale)
  );
};

AFF.ensureCommissionCountries = () => {
  if (!Array.isArray(AFF.state.programCommissionCountries)) {
    AFF.state.programCommissionCountries = [...AFF.partnerProgram.commissionCountries]
      .sort((a, b) => Math.max(...b.tiers.map(tier => tier.commission || 0)) - Math.max(...a.tiers.map(tier => tier.commission || 0)))
      .slice(0, 3)
      .map(item => item.code);
  }
  return AFF.state.programCommissionCountries;
};

AFF.commissionCountrySummary = () => {
  const selected = AFF.sortedCommissionCountries().filter(item => AFF.ensureCommissionCountries().includes(item.code));
  if (!selected.length) return AFF.state.language === "en" ? "No country selected" : "未选择国家";
  const names = selected.map(AFF.countryDisplayName);
  const shown = names.slice(0, 3).join("、");
  return names.length > 3 ? `${shown} 等 ${names.length} 个国家` : shown;
};

AFF.filteredCommissionCountries = () => {
  const query = AFF.state.programCountryQuery.trim().toLowerCase();
  return AFF.sortedCommissionCountries().filter(item => {
    if (!query) return true;
    const displayName = AFF.countryDisplayName(item).toLowerCase();
    return displayName.includes(query) || item.name.toLowerCase().includes(query) || item.code.toLowerCase().includes(query);
  });
};

AFF.renderCommissionCountryOptions = () => {
  const countries = AFF.filteredCommissionCountries();
  if (!countries.length) return `<div class="country-empty">暂无匹配国家</div>`;
  return countries.map(item => {
    const selected = AFF.ensureCommissionCountries().includes(item.code);
    return `<button class="country-option ${selected ? "selected" : ""}" type="button" role="option" aria-selected="${selected}" data-country-code="${item.code}">
      <span>${AFF.helpers.h(AFF.countryDisplayName(item))}</span><small>${item.code}</small><strong>${selected ? "✓" : ""}</strong>
    </button>`;
  }).join("");
};

AFF.filteredSupportCountries = () => {
  const query = AFF.state.programSupportQuery.trim().toLowerCase();
  if (!query) return AFF.partnerProgram.supportCountries;
  return AFF.partnerProgram.supportCountries.filter(item => item.name.toLowerCase().includes(query));
};

AFF.ensureSupportCountries = () => {
  if (!Array.isArray(AFF.state.programSupportCountries)) {
    AFF.state.programSupportCountries = AFF.partnerProgram.supportCountries.slice(0, 3).map(item => item.name);
  }
  return AFF.state.programSupportCountries;
};

AFF.supportCountrySummary = () => {
  const selected = AFF.ensureSupportCountries();
  if (!selected.length) return "未选择地区";
  const shown = selected.slice(0, 3).join("、");
  return selected.length > 3 ? `${shown} 等 ${selected.length} 个地区` : shown;
};

AFF.filteredDashboardLinkOptions = field => {
  const values = field === "page" ? AFF.deepLinks.pages : AFF.deepLinks.languages;
  const queryKey = field === "page" ? "dashboardLinkPageQuery" : "dashboardLinkLanguageQuery";
  const query = AFF.state[queryKey].trim().toLowerCase();
  return values.filter(value => !query || value.toLowerCase().includes(query));
};

AFF.renderDashboardLinkOptions = field => {
  const values = AFF.filteredDashboardLinkOptions(field);
  const selected = field === "page" ? AFF.state.dashboardLinkPage : AFF.state.dashboardLinkLanguage;
  if (!values.length) return `<div class="dashboard-link-empty">暂无匹配选项</div>`;
  return values.map(value => {
    const isSelected = value === selected;
    const attribute = field === "page" ? "dashboard-link-page" : "dashboard-link-language";
    return `<button class="dashboard-link-option ${isSelected ? "selected" : ""}" type="button" role="option" aria-selected="${isSelected}" data-${attribute}="${AFF.helpers.h(value)}">
      <span>${AFF.helpers.h(value)}</span><strong>${isSelected ? "✓" : ""}</strong>
    </button>`;
  }).join("");
};

AFF.renderSupportCountryOptions = () => {
  const countries = AFF.filteredSupportCountries();
  if (!countries.length) return `<div class="country-empty">暂无匹配地区</div>`;
  return countries.map(item => {
    const selected = AFF.ensureSupportCountries().includes(item.name);
    const supportedCount = [item.web, item.android, item.ios].filter(Boolean).length;
    return `<button class="country-option ${selected ? "selected" : ""}" type="button" role="option" aria-selected="${selected}" data-support-country="${AFF.helpers.h(item.name)}">
      <span>${AFF.helpers.h(item.name)}</span><small>${supportedCount}/3端</small><strong>${selected ? "✓" : ""}</strong>
    </button>`;
  }).join("");
};

AFF.pages.onboarding = () => {
  const state = AFF.state;
  const steps = ["注册账号", "填写基本资料", "KYC 实名认证", "接受协议与准则", "提交审核"];
  const current = state.onboarding.step;
  const max = state.onboarding.maxStep;
  const allAgreed = state.onboarding.agreements.every(Boolean);
  const activeAgreement = AFF.onboardingAgreements[state.onboarding.agreementModal - 1];

  const stepContent = () => {
    if (current === 1) return `
      <section class="onboarding-step">
        <div class="commission-page-head"><div><h2>账号已创建</h2><p>请先完成邮箱验证，再继续填写合作者资料。</p></div></div>
        <div class="onboarding-field-grid">
          <div class="info-item"><span>邮箱</span><strong>demo.publisher@example.com</strong></div>
          <div class="info-item"><span>邮箱验证</span>
            <div class="onboarding-inline-status">
              <span class="tag ${state.onboarding.emailVerified ? "tag-ok" : "tag-warning"}">${state.onboarding.emailVerified ? "已验证" : "未验证"}</span>
              ${state.onboarding.emailVerified ? "" : `<button class="button secondary small" type="button" data-action="verify-onboarding-email">模拟验证</button>`}
            </div>
          </div>
        </div>
        <div class="onboarding-actions">
          <button class="button primary" type="button" data-action="onboarding-next" ${state.onboarding.emailVerified ? "" : "disabled"}>下一步</button>
        </div>
      </section>`;

    if (current === 2) return `
      <section class="onboarding-step">
        <div class="commission-page-head"><div><h2>基本资料</h2><p>资料来自注册账户与账户管理设置。</p></div></div>
        <div class="onboarding-field-grid">
          <div class="info-item"><span>姓名</span><strong>${AFF.helpers.h(state.account.displayName)}</strong></div>
          <div class="info-item"><span>国家</span><strong>${AFF.helpers.h(state.account.country)}</strong></div>
          <div class="info-item"><span>推广渠道类型</span><strong>${AFF.helpers.h(state.account.channel)}</strong></div>
        </div>
        <div class="onboarding-actions">
          <button class="button primary" type="button" data-action="onboarding-next">下一步</button>
        </div>
      </section>`;

    if (current === 3) return `
      <section class="onboarding-step">
        <div class="commission-page-head"><div><h2>KYC 实名认证</h2><p>本平台不单独提交 KYC 材料 · KYC 门槛为硬门禁第一支柱。</p></div></div>
        <div class="onboarding-kyc-panel">
          <div class="onboarding-kyc-head">
            <strong>请前往客户端完成实名认证</strong>
            <button class="button primary small" type="button" data-action="open-client-kyc">去完成</button>
          </div>
          <p>KYC 流程在客户端内完成：登录客户端 → 实名认证 → 上传证件并提交 → 审核通过后自动同步回本平台。完成后返回本页继续下一步。</p>
          <div class="onboarding-inline-status">
            <span class="tag ${state.onboarding.kycDone ? "tag-ok" : "tag-info"}">${state.onboarding.kycDone ? "已完成" : "未完成"}</span>
            ${state.onboarding.kycDone ? "" : `<button class="button secondary small" type="button" data-action="complete-onboarding-kyc">模拟完成 KYC</button>`}
          </div>
        </div>
      </section>`;

    if (current === 4) return `
      <section class="onboarding-step">
        <div class="commission-page-head"><div><h2>接受协议与准则</h2><p>请逐份查看并勾选接受，全部接受后方可进入下一步。</p></div></div>
        <div class="onboarding-agreements">
          ${AFF.onboardingAgreements.map((agreement, index) => `
            <label class="onboarding-agreement-row">
              <input type="checkbox" ${state.onboarding.agreements[index] ? "checked" : ""} data-onboarding-agreement="${index}">
              <span>${AFF.helpers.h(agreement.title)}</span>
              <button class="button secondary small" type="button" data-action="open-onboarding-agreement" data-agreement-index="${index + 1}">查看协议</button>
            </label>`).join("")}
        </div>
        <div class="onboarding-actions">
          <button class="button primary" type="button" data-action="onboarding-next" ${allAgreed ? "" : "disabled"}>下一步</button>
        </div>
      </section>`;

    return `
      <section class="onboarding-step">
        <div class="commission-page-head"><div><h2>提交审核</h2><p>提交后状态变更为「待审核」，站内与邮件双通道通知，运营侧在「合作者审核」处理。</p></div></div>
        ${state.onboarding.submitted ? `
          <div class="onboarding-submitted">
            <div><span class="tag tag-info">待审核</span><strong>已提交</strong></div>
            <p>审核结果将通过站内消息与邮件通知。</p>
          </div>` : `<button class="button primary" type="button" data-action="submit-onboarding">提交审核</button>`}
      </section>`;
  };

  return `
    <section class="card program-steps-card"><div class="panel-body">
      <div class="commission-page-head onboarding-head"><div><h2>入驻申请</h2><p>客户端准入流程：注册 → 资料 → KYC → 协议 → 提交审核。</p></div></div>
      <div class="steps">${steps.map((label, index) => {
        const number = index + 1;
        const status = number === current ? "current" : number <= max ? "done" : "disabled";
        return `<button class="step ${status}" type="button" data-action="onboarding-go" data-onboarding-step="${number}" ${number > max ? "disabled" : ""}><span class="step-number">${number < current || (number !== current && number <= max) ? "✓" : number}</span><span class="step-label">${AFF.helpers.h(label)}</span></button>`;
      }).join("")}</div>
      ${stepContent()}
    </div></section>
    ${activeAgreement ? `
      <div class="modal-layer">
        <div class="overlay" data-action="close-onboarding-agreement"></div>
        <div class="modal-card onboarding-agreement-modal">
          <div class="modal-head"><h2>${AFF.helpers.h(activeAgreement.title)}</h2><button class="close-button" type="button" data-action="close-onboarding-agreement" aria-label="关闭协议">×</button></div>
          <p>${AFF.helpers.h(activeAgreement.summary)}</p>
          <label class="onboarding-agreement-row modal-agreement"><input type="checkbox" ${state.onboarding.agreementDraft ? "checked" : ""} data-onboarding-agreement-draft><span>我已阅读并同意</span></label>
          <div class="onboarding-actions">
            <button class="button secondary" type="button" data-action="close-onboarding-agreement">取消</button>
            <button class="button primary" type="button" data-action="accept-onboarding-agreement">同意</button>
          </div>
        </div>
      </div>` : ""}`;
};

AFF.pages.apply = () => {
  const state = AFF.state;
  const steps = ["查看佣金奖励", "高转化地区", "查看支持地区", "素材库总览", "系统使用指引", "分享简介链接"];
  const content = AFF.pages.applyStep();
  return `
    ${AFF.helpers.pageHeader("合作者计划", "按国家看佣金、选市场、查端支持、取素材、学系统并分享链接。")}
    <section class="card program-steps-card"><div class="panel-body">
      <div class="steps">${steps.map((label, index) => {
        const number = index + 1;
        const status = number < state.applyStep ? "done" : number === state.applyStep ? "current" : "disabled";
        return `<button class="step ${status}" type="button" data-apply-step="${number}" ${number > state.applyStep ? "disabled" : ""}><span class="step-number">${number < state.applyStep ? "✓" : number}</span><span class="step-label">${label}</span></button>`;
      }).join("")}</div>
    </div></section>
    ${state.applyStep === 1 || state.applyStep === 2 || state.applyStep === 3 ? content : `<section class="card program-step-card"><div class="panel-body">${content}</div></section>`}
    <section class="card program-action-card"><div class="panel-body">
      <div class="action-row">
        <button class="button secondary" type="button" data-apply-step="${state.applyStep - 1}" ${state.applyStep <= 1 ? "disabled" : ""}>上一步</button>
        ${state.applyStep < 6
          ? `<button class="button primary" type="button" data-apply-step="${state.applyStep + 1}">下一步</button>`
          : `<button class="button primary" type="button" data-action="complete-program" ${state.programCompleted ? "disabled" : ""}>${state.programCompleted ? "已完成引导" : "完成引导"}</button>`}
      </div>
    </div></section>`;
};

AFF.pages.applyStep = () => {
  const state = AFF.state;

  const percent = value => `${value.toFixed(1)}%`;
  const effective = values => values[0] * values[1] * values[2] / 10000;

  if (state.applyStep === 1) {
    AFF.ensureCommissionCountries();
    const selectedCountries = AFF.sortedCommissionCountries().filter(item => state.programCommissionCountries.includes(item.code));
    const isEnglish = state.language === "en";
    const countryLabel = isEnglish ? "Country / Region" : "国家/地区";
    const searchLabel = isEnglish ? "Search countries" : "搜索国家";
    return `
    <section class="card commission-selector-card program-step-card"><div class="panel-body">
      <div class="commission-page-head">
        <div>
          <h2>不同国家佣金奖励</h2>
          <p>不同地区根据入金门槛提供阶梯奖励</p>
        </div>
      </div>
      <div class="country-picker ${state.programCountryPickerOpen ? "open" : ""}">
        <span class="field-label">${AFF.helpers.h(countryLabel)}</span>
        <button class="country-picker-button" type="button" data-action="toggle-country-picker" aria-haspopup="listbox" aria-expanded="${state.programCountryPickerOpen}">
          <span>${AFF.helpers.h(AFF.commissionCountrySummary())}</span><small>▾</small>
        </button>
        <div class="country-options" role="listbox" aria-multiselectable="true" aria-label="${AFF.helpers.h(countryLabel)}">
          <input data-country-search type="search" placeholder="${AFF.helpers.h(searchLabel)}" value="${AFF.helpers.h(state.programCountryQuery)}" aria-label="${AFF.helpers.h(searchLabel)}">
          <div class="country-option-actions">
            <button class="button secondary small" type="button" data-action="select-all-commission-countries">全选</button>
            <button class="button secondary small" type="button" data-action="clear-all-commission-countries">取消全选</button>
          </div>
          <div class="country-option-list" data-country-option-list>${AFF.renderCommissionCountryOptions()}</div>
        </div>
      </div>
    </div></section>
    <div class="commission-module-grid">
      ${selectedCountries.length ? selectedCountries.map(country => `
        <section class="commission-module">
          <header><h3>${AFF.helpers.h(AFF.countryDisplayName(country))}</h3><span>${country.code}</span></header>
          <div class="commission-table-wrap"><table class="commission-table">
            <thead><tr><th>入金金额</th><th>佣金</th></tr></thead>
            <tbody>${country.tiers.map(tier => `<tr><td>${tier.label}</td><td>${tier.commission ? `$${tier.commission}` : "-"}</td></tr>`).join("")}</tbody>
          </table></div>
        </section>`).join("") : `<div class="card state-panel"><strong>暂无数据</strong><span>请至少选择一个国家</span></div>`}
    </div>
    <section class="commission-info-grid">
      <article class="commission-info-card">
        <h3>如何获得佣金</h3>
        <ol>
          <li>将您的专属链接分享给交易客户。</li>
          <li>点击您链接的客户必须注册并且在平台进行交易。</li>
          <li>每名有效的交易者可以为您带来佣金收益。</li>
        </ol>
      </article>
      <article class="commission-info-card">
        <h3>如何成为有效交易者</h3>
        <ul>
          <li>最低首次入金达到对应国家佣金奖励标准。</li>
          <li>有充足的交易活跃度。</li>
          <li>满足平台《有效客户条款和条件》中规定的资格要求。</li>
        </ul>
      </article>
    </section>`;
  }

  if (state.applyStep === 2) return `
    <section class="card conversion-selector-card program-step-card"><div class="panel-body">
      <div class="commission-page-head conversion-page-head">
        <div>
          <h2>建议将高转化率国家作为推广重点</h2>
          <p>根据数据，将营销中心转移到高转化率地区</p>
          <div class="conversion-page-notes">
            <p>查看三个月各地区的转化率最高的六个国家。</p>
            <p><strong>重点关注转化率最高的地区，数据展示点击→注册、注册→FTD（首次入金）、FTD→有效FTD三个环节双端的转化数据。</strong></p>
          </div>
        </div>
      </div>
    </div></section>
    <div class="conversion-module-grid">
      ${AFF.partnerProgram.conversionCountries
        .map(country => {
          const desktopEffective = effective(country.desktop);
          const mobileEffective = effective(country.mobile);
          return { ...country, desktopEffective, mobileEffective, totalEffective: desktopEffective + mobileEffective };
        })
        .sort((a, b) => b.totalEffective - a.totalEffective)
        .slice(0, 6)
        .map((country, index) => `
          <section class="conversion-module">
            <header>
              <h3>${index + 1}. ${AFF.helpers.h(country.name)}</h3>
            </header>
            <table class="conversion-table">
              <thead><tr><th>环节</th><th>电脑端</th><th>移动端</th></tr></thead>
              <tbody>
                <tr><td>点击→注册</td><td>${percent(country.desktop[0])}</td><td>${percent(country.mobile[0])}</td></tr>
                <tr><td>注册→FTD</td><td>${percent(country.desktop[1])}</td><td>${percent(country.mobile[1])}</td></tr>
                <tr><td>FTD→有效FTD</td><td>${percent(country.desktop[2])}</td><td>${percent(country.mobile[2])}</td></tr>
              </tbody>
            </table>
          </section>`).join("")}
    </div>`;

  if (state.applyStep === 3) return `
    ${(() => {
      AFF.ensureSupportCountries();
      const support = value => `<span class="support-badge ${value ? "yes" : "no"}">${value ? "✓ 支持" : "✗ 不支持"}</span>`;
      const selectedCountries = AFF.partnerProgram.supportCountries.filter(item => state.programSupportCountries.includes(item.name));
      return `
    <section class="card commission-selector-card program-step-card"><div class="panel-body">
      <div class="commission-page-head">
        <div>
          <h2>查看哪些地区支持</h2>
          <p>验证哪些地区可以在平台参与转化</p>
        </div>
      </div>
      <p class="support-selection-note">选择国家/地区后，查看网页端、Android端和iOS端可参与佣金结算的平台。请优先将流量引导至标识为「✓ 支持」的平台；标识为「✗ 不支持」的平台即使当地应用可安装，也不会计入佣金。</p>
      <div class="country-picker ${state.programSupportPickerOpen ? "open" : ""}">
        <span class="field-label">国家/地区</span>
        <button class="country-picker-button" type="button" data-action="toggle-support-picker" aria-haspopup="listbox" aria-expanded="${state.programSupportPickerOpen}">
          <span>${AFF.helpers.h(AFF.supportCountrySummary())}</span><small>▾</small>
        </button>
        <div class="country-options" role="listbox" aria-multiselectable="true" aria-label="国家/地区">
          <input data-support-country-search type="search" placeholder="搜索地区" value="${AFF.helpers.h(state.programSupportQuery)}" aria-label="搜索地区">
          <div class="country-option-actions">
            <button class="button secondary small" type="button" data-action="select-all-support-countries">全选</button>
            <button class="button secondary small" type="button" data-action="clear-all-support-countries">取消全选</button>
          </div>
          <div class="country-option-list" data-support-option-list>${AFF.renderSupportCountryOptions()}</div>
        </div>
      </div>
    </div></section>
    <div class="commission-module-grid">
      ${selectedCountries.length ? selectedCountries.map(country => {
        const supportedCount = [country.web, country.android, country.ios].filter(Boolean).length;
        return `
      <section class="commission-module">
        <header><h3>${AFF.helpers.h(country.name)}</h3><span>${supportedCount}/3端支持</span></header>
        <div class="commission-table-wrap"><table class="commission-table support-table">
          <thead><tr><th>端系统</th><th>支持状态</th></tr></thead>
          <tbody>
            <tr><td>网页端</td><td>${support(country.web)}</td></tr>
            <tr><td>安卓端</td><td>${support(country.android)}</td></tr>
            <tr><td>iOS端</td><td>${support(country.ios)}</td></tr>
          </tbody>
        </table></div>
      </section>`;
      }).join("") : `<div class="card state-panel"><strong>暂无数据</strong><span>请至少选择一个地区</span></div>`}
    </div>`;
    })()}`;

  if (state.applyStep === 4) return `
    <div class="program-section-head">
      <div><h3>素材库重点</h3><p>按设备、社交平台、素材类型和分辨率筛选，快速找到适合渠道的素材。</p></div>
      ${AFF.helpers.tag(state.assetsAccepted ? "已解锁" : "待解锁")}
    </div>
    ${[
      ["device", ["全部", "网站", "安卓", "iOS"]],
      ["platform", ["全部", "抖音", "YouTube", "Telegram"]],
      ["type", ["全部", "落地页", "横幅广告", "视频", "GIF"]]
    ].map(([key, values]) => `
      <div class="program-filter-group"><span>${key === "device" ? "设备" : key === "platform" ? "社交平台" : "素材类型"}</span>
        <div class="chips">${values.map(value => `<button class="chip ${state.programAssetFilters[key] === value ? "active" : ""}" type="button" data-program-asset="${key}" data-value="${AFF.helpers.h(value)}">${value}</button>`).join("")}</div>
      </div>`).join("")}
    ${(() => {
      const filters = state.programAssetFilters;
      const rows = AFF.partnerProgram.assets.filter(item =>
        (filters.device === "全部" || item.device === filters.device) &&
        (filters.platform === "全部" || item.platform === filters.platform) &&
        (filters.type === "全部" || item.type === filters.type)
      );
      return `${AFF.helpers.table({
        columns: ["素材", "设备", "社交平台", "素材类型", "分辨率"],
        rows: rows.length ? rows.map(item => [item.name, item.device, item.platform, item.type, item.resolution]) : [["暂无数据", "-", "-", "-", "-"]]
      })}<p class="helper">当前 ${rows.length} / ${AFF.partnerProgram.assets.length} 个素材</p>`;
    })()}
    <div class="action-row"><span class="helper">素材下载状态与推广行为准则绑定。</span><button class="button secondary" type="button" data-route="assets">进入完整素材库</button></div>`;

  if (state.applyStep === 5) return `
    <div class="program-section-head">
      <div><h3>系统使用指引</h3><p>三个入口覆盖客户数据、业绩明细和整体数据，帮助合作者定位问题并决定投入。</p></div>
      ${AFF.helpers.tag("快速入口")}
    </div>
    <div class="program-guide-grid">
      <article>
        <span>入口 01</span><strong>查看客户数据</strong><p>按客户看注册、KYC、国家、资格日期、预计收益、已付、拒绝和暂扣状态。</p>
        <button class="button secondary" type="button" data-route="clients">进入客户列表</button>
      </article>
      <article>
        <span>入口 02</span><strong>查看业绩</strong><p>按国家、活动、UTM和平台分析点击、注册、首次入金、交易与合格客户。</p>
        <button class="button secondary" type="button" data-route="perf">进入业绩数据</button>
      </article>
      <article>
        <span>入口 03</span><strong>查看整体数据</strong><p>从仪表盘看钱包余额、未激活客户、总收益、合格客户和时间范围汇总。</p>
        <button class="button secondary" type="button" data-route="dash">进入仪表盘</button>
      </article>
    </div>`;

  return `
    ${(() => {
      const shareText = `${AFF.partnerProgram.shareIntro}${AFF.dashboard.link}`;
      return `
    <div class="program-hero">
      <div>
        <span>最后一步</span>
        <strong>复制分享简介</strong>
        <p>给客户一段可直接发送的简介和链接，也可以进入深度链接配置目标页与应用商店。</p>
      </div>
      ${AFF.helpers.tag(state.programCompleted ? "已完成" : "进行中")}
    </div>
    <div class="link-box program-link-panel">
      <textarea class="share-text" rows="5" readonly aria-label="分享简介">${AFF.helpers.h(shareText)}</textarea>
      <div class="program-link-actions">
        <button class="button primary" type="button" data-copy="${AFF.helpers.h(shareText)}">复制简介和链接</button>
        <button class="button secondary" type="button" data-route="deep">配置深度链接</button>
      </div>
    </div>
    <div class="info-grid">
      <div class="info-item"><span>简介用途</span><strong>社交私信、社群公告、内容评论区</strong></div>
      <div class="info-item"><span>归因窗口</span><strong>30天首次点击</strong></div>
      <div class="info-item wide"><span>合规提示</span><strong>不得承诺收益；正式话术需经合规评审后配置。</strong></div>
    </div>`;
    })()}`;
};

AFF.pages.wd = () => {
  const state = AFF.state;
  return `
    ${AFF.helpers.pageHeader("提现", "出金方案确认后开放；记录与05页流水同源。")}
    <div class="tabs" style="margin-bottom:16px">
      <button class="${state.wdTab === "withdraw" ? "active" : ""}" type="button" data-wd-tab="withdraw">出金</button>
      <button class="${state.wdTab === "records" ? "active" : ""}" type="button" data-wd-tab="records">记录</button>
    </div>
    ${state.wdTab === "withdraw" ? `
      <section class="card"><div class="notice-panel"><strong>出金方案确认后开放</strong><p>支付渠道与手续费待定；已确认不设最低提现门槛。</p></div></section>` : `
      <section class="card">${AFF.helpers.table({
        columns: ["申请日期", "方式", "金额", "状态", "备注"],
        rows: AFF.withdrawals.map(row => [row.date, row.method, row.amount, AFF.helpers.tag(row.status), row.note]),
        numeric: [2]
      })}</section>`}`;
};
