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
      "暂停": "warning", "结算中": "warning", "处理中": "warning", "待审核": "warning", "进行中": "warning", "持有": "warning", "申诉中": "warning", "已封禁": "danger",
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
  pagination() {
    // Deprecated (D-02): use AFF.pagination.component instead.
    return "<!-- deprecated: use AFF.pagination.component -->";
  }
};

AFF.pages = {};

AFF.dashboardData = (period = "past30") => {
  const data = AFF.reporting;
  const range = period === "all" ? { from: data.from, to: data.now }
    : period === "month" ? { from: `${data.now.slice(0, 7)}-01`, to: data.now }
    : AFF.reports.range(period) || AFF.reports.range("past30");
  const rows = data.filterRows(range);
  return {
    range, totals: data.totals(rows),
    inactive: rows.filter(row => row.clientId && !row.effectiveAt).length
  };
};

AFF.pages.dash = () => {
  const state = AFF.state;
  const t = (zh, en) => state.language === "en" ? en : zh;
  const number = value => new Intl.NumberFormat("en-US").format(value);
  const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  const clientButton = (metric, value, period, label) => `<button class="dashboard-number-link" type="button" data-action="dashboard-clients" data-metric="${metric}" data-period="${period}" title="${AFF.helpers.h(label)}">${value}</button>`;
  const languageCodes = { "简体中文": "zh-cn", "English": "en", "ไทย": "th", "Tiếng Việt": "vi" };
  const promotionAsset = AFF.deepLinks.assets.find(item => item.name === state.dashboardLinkPage) || AFF.deepLinks.assets[0];
  const promotionUrl = AFF.linkBuilder.build(`${AFF.deepLinks.domain}${AFF.deepLinks.promotionPath || "/register"}`, AFF.linkBuilder.trackingParams({
    page: promotionAsset.code,
    lang: languageCodes[state.dashboardLinkLanguage] || "zh-cn"
  }));
  const promotionLink = promotionUrl.href;
  const summaryPeriod = ["today", "past7", "past30", "lastWeek", "lastMonth"].includes(state.dashboardPeriod)
    ? state.dashboardPeriod : "past30";
  const summary = AFF.dashboardData(summaryPeriod).totals;
  const finance = AFF.finance.summary();
  const monthClients = AFF.dashboardData("month").totals;
  const periodOptions = [
    ["today", t("今日", "Today")],
    ["past7", t("过去7天", "Last 7 days")],
    ["past30", t("过去30天", "Last 30 days")],
    ["lastWeek", t("上周", "Last week")],
    ["lastMonth", t("上月", "Last month")]
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
  return `
    ${AFF.helpers.pageHeader("仪表盘", "查看资金状态与本月里程碑；所有金额与资金流水同源。")}
    <div class="cards dashboard-metrics">
      <article class="card metric">
        <span>${t("本月注册客户", "Registrations this month")}</span>
        ${clientButton("registrations", number(monthClients.registrations), "month", t("查看本月注册客户", "View registrations"))}
        <small>${AFF.reporting.now.slice(0, 7)}</small>
      </article>
      <article class="card metric">
        <span>${t("本月FTD", "FTD this month")}</span>
        ${clientButton("ftd", number(monthClients.ftd), "month", t("查看本月FTD", "View FTD"))}
        <small>${AFF.reporting.now.slice(0, 7)}</small>
      </article>
      <article class="card metric">
        <span>${t("本月有效FTD", "Valid FTD this month")}</span>
        ${clientButton("effective", number(monthClients.effective), "month", t("查看本月有效FTD", "View this month's valid FTD"))}
        <small>${AFF.reporting.now.slice(0, 7)}</small>
      </article>
      <article class="card metric">
        <span>${t("本月质量服务", "Quality service this month")}</span>
        ${clientButton("quality", number(monthClients.quality), "month", t("查看本月质量服务", "View quality service"))}
        <small>${AFF.reporting.now.slice(0, 7)}</small>
      </article>
    </div>
    ${AFF.creditCenter.dashboardRow()}
    <div class="dashboard-promotion-grid">
      <section class="card dashboard-link-card">
        <div class="panel-header"><h2>${t("我的推广链接", "My promotion link")}</h2><button class="button secondary small" type="button" data-route="deep">${t("深度链接设置", "Deep-link settings")}</button></div>
        <div class="panel-body dashboard-link-controls">
          ${linkPicker("page", t("到达页面", "Landing page"), AFF.deepLinkPageDisplayName(state.dashboardLinkPage), state.dashboardLinkPagePickerOpen, state.dashboardLinkPageQuery, t("搜索到达页面", "Search landing pages"))}
          ${linkPicker("language", t("语言支持", "Language"), AFF.languageDisplayName(state.dashboardLinkLanguage), state.dashboardLinkLanguagePickerOpen, state.dashboardLinkLanguageQuery, t("搜索语言", "Search languages"))}
          <div class="dashboard-link-address">
            <div class="link-text">${AFF.helpers.h(promotionLink)}</div>
            <button class="button secondary" type="button" data-copy="${AFF.helpers.h(promotionLink)}">${t("复制推广地址", "Copy link")}</button>
          </div>
        </div>
      </section>
      <section class="card dashboard-materials">
        <div class="panel-header"><h2>${state.language === "en" ? "Reach more people with our promotional materials" : "使用为您带来更多流量的素材"}</h2></div>
        <a class="dashboard-material-banner" href="#/assets">
          <div class="dashboard-material-copy">
            <span class="dashboard-material-label">Affiliate CPA</span>
            <strong>${state.language === "en" ? "Download our ready-to-use materials" : "下载由我们提供的现成素材"}</strong>
            <span class="dashboard-material-types">${state.language === "en" ? "Banners · Videos · Landing pages · GIFs" : "横幅 · 视频 · 落地页 · GIF"}</span>
            <span class="dashboard-material-cta">${state.language === "en" ? "Browse materials" : "浏览素材"} <span aria-hidden="true">→</span></span>
          </div>
          <img src="assets/auth-visual.jpg" alt="" class="dashboard-material-image">
        </a>
      </section>
    </div>
    <div class="dashboard-support-grid">
      <div class="dashboard-guidance-stack">
      <article class="card tutorial-card" data-route="apply" tabindex="0" role="button" aria-label="利用我们为您提供的优化建议，提升收入">
      <div class="tutorial-copy">
        <span class="eyebrow">${t("使用建议", "Recommendations")}</span>
        <h2>${t("利用我们为您提供的优化建议，提升收入", "Use our recommendations to grow revenue")}</h2>
        <p>${t("从高转化地区、推广链接和素材选择开始，逐步找到更适合您的推广方式。", "Start with high-converting markets, links, and materials to find a better promotion approach.")}</p>
      </div>
      </article>
      <section class="card dashboard-client-status">
        <div class="panel-header">
          <h2><span class="dashboard-status-icon" aria-hidden="true">${navIcon("clients")}</span>${state.language === "en" ? "Check client status" : "查看客户状态"}</h2>
        </div>
        <div class="panel-body dashboard-status-body">
          <p>${state.language === "en" ? "Check whether a client is linked to your partner account." : "查询客户是否已关联您的合作者账户。"}</p>
          <button class="button secondary" type="button" data-route="lookup">${state.language === "en" ? "Check" : "检查"}</button>
        </div>
      </section>
      </div>
      ${AFF.postbacks.renderDashboard()}
    </div>
      <section class="card dashboard-summary">
        <div class="panel-header">
          <h2>${t("推广数据汇总", "Promotion summary")}</h2>
          <label class="dashboard-summary-filter">
            <span>${t("时间范围", "Date range")}</span>
            <select data-dashboard-period aria-label="${t("数据时间范围", "Data date range")}">
              ${periodOptions.map(([value, label]) => `<option value="${value}" ${summaryPeriod === value ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="dashboard-summary-table-wrap">
          <table class="dashboard-summary-table">
            <thead><tr><th>${t("数据项", "Metric")}</th><th>${t("合计数量", "Total")}</th></tr></thead>
            <tbody>
              <tr><td>${t("注册量", "Registrations")}</td><td>${clientButton("registrations", number(summary.registrations), summaryPeriod, t("查看注册客户", "View registered clients"))}</td></tr>
              <tr><td>${t("有效FTD数量", "Valid FTD clients")}</td><td>${clientButton("effective", number(summary.effective), summaryPeriod, t("查看有效FTD客户", "View valid FTD clients"))}</td></tr>
              <tr><td>${t("已入账收入", "Credited revenue")}</td><td>${clientButton("revenue", money(summary.approved), summaryPeriod, t("查看收入对应客户", "View clients contributing to revenue"))}</td></tr>
            </tbody>
          </table>
        </div>
      </section>`;
};

AFF.pages.tracker = () => {
  return AFF.postbacks.render();
};

/* old perf page removed (superseded by reports.js, D-02 7A dead-code cleanup) */

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
  <div class="aff-drawer-overlay" data-action="close-perf-filter"></div>
  <aside class="aff-drawer filter-drawer" role="dialog" aria-modal="true" aria-labelledby="perf-filter-title">
    <header class="panel-header"><h2 id="perf-filter-title">筛选器</h2><button class="aff-drawer-close" type="button" data-action="close-perf-filter" aria-label="关闭">×</button></header>
    <div class="panel-body">
      <div class="field"><span>时间</span><input value="2026-09-23 — 2026-10-22" disabled></div>
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

/* old clients page removed (superseded by reports.js, D-02 7A dead-code cleanup) */

AFF.campaignData = (campaign, period = "past30") => {
  const range = AFF.reports.range(period);
  const rows = AFF.reporting.filterRows({ ...range, campaignCode: campaign.code });
  return { range, rows, totals: AFF.reporting.totals(rows) };
};

AFF.campaignNumber = (value, type = "count") => {
  if (value === null || value === undefined) return "—";
  if (type === "rate") return `${(value * 100).toFixed(1)}%`;
  return new Intl.NumberFormat("en-US", type === "money" ? { style: "currency", currency: "USD" } : {}).format(value);
};

AFF.campaignMetric = (campaign, metric, value, period = "past30", dimension = "", dimensionValue = "") => {
  const h = AFF.helpers.h;
  const label = AFF.reporting.metrics.find(item => item.key === metric);
  const title = AFF.state.language === "en" ? `View ${label.en}` : `查看${label.label}`;
  return `<button class="campaign-number-link" type="button" data-action="campaign-clients" data-code="${h(campaign.code)}" data-metric="${h(metric)}" data-period="${h(period)}" ${dimension ? `data-dimension="${h(dimension)}" data-value="${h(dimensionValue)}"` : ""} title="${h(title)}">${AFF.campaignNumber(value)}</button>`;
};

AFF.pages.promo = () => {
  const state = AFF.state;
  const t = (zh, en) => state.language === "en" ? en : zh;
  const copyIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3"/></svg>';
  const page = Math.min(Math.max(1, state.campaignPage || 1), Math.max(1, Math.ceil(AFF.campaigns.length / 10)));
  state.campaignPage = page;
  const campaignRows = AFF.campaigns.slice((page - 1) * 10, page * 10).map(row => {
    const { totals } = AFF.campaignData(row);
    const link = AFF.campaignLinks.url(row);
    const simulator = AFF.campaignLinks.mockUrl(row);
    const archived = AFF.campaignLinks.status(row) === "archived";
    const fixed = row.fixed || row.code === "DIRECT";
    return [
      `<strong>${AFF.helpers.h(AFF.dataText(row.name))}</strong><small>${AFF.helpers.h(row.code)}</small>`,
      AFF.partnerClosure.active() ? AFF.partnerClosure.campaignLinkCell(link, simulator, copyIcon) : `<div class="campaign-link"><a href="${AFF.helpers.h(simulator)}" target="_blank" rel="noopener" title="${AFF.helpers.h(link)}">${AFF.helpers.h(link)}</a><button class="icon-button campaign-copy" type="button" data-copy="${AFF.helpers.h(link)}" title="${t("复制链接", "Copy link")}" aria-label="${t("复制链接", "Copy link")}">${copyIcon}</button></div>`,
      AFF.partnerClosure.active() ? `<span class="tag tag-danger">${t("链接已下线", "Links offline")}</span>` : fixed ? `<span class="tag tag-info" title="${t("固定显示且无法归档", "Always shown and cannot be archived")}">${t("固定", "Fixed")}</span>` : `<span class="tag tag-${archived ? "muted" : "ok"}">${archived ? t("归档", "Archived") : t("活跃", "Active")}</span>`,
      AFF.campaignNumber(totals.clicks),
      ...["registrations", "ftd", "effective", "quality"].map(key => AFF.campaignMetric(row, key, totals[key])),
      AFF.campaignNumber(totals.expected, "money"),
      `<div class="table-actions"><button class="button secondary small" type="button" data-action="campaign-data" data-code="${AFF.helpers.h(row.code)}">${t("查看数据", "View data")}</button>${fixed ? "" : `<button class="button secondary small" type="button" data-action="campaign-status" data-code="${AFF.helpers.h(row.code)}" ${AFF.partnerClosure.active() ? "disabled" : ""}>${archived ? t("设为活跃", "Activate") : t("归档", "Archive")}</button>`}</div>`
    ];
  });
  return `
    <div class="campaign-page">
    ${AFF.partnerClosure.promotionNotice()}
    <div class="page-actions page-actions-top page-actions-start"><button class="button primary" type="button" data-action="open-campaign-modal" ${AFF.partnerClosure.active() ? "disabled" : ""}>${t("创建新活动", "Create campaign")}</button></div>
    <div class="toolbar campaign-toolbar">
      <strong>${t("活动", "Campaigns")}</strong>
      <span class="helper">${t("过去30天", "Last 30 days")} · ${AFF.reports.range("past30").from} — ${AFF.reporting.now}</span>
    </div>
    <section class="card campaign-list">${AFF.helpers.table({ columns: [t("活动", "Campaign"), t("链接", "Link"), t("状态", "Status"), t("点击", "Clicks"), t("注册客户", "Registrations"), t("FTD客户", "FTD clients"), t("有效客户", "Valid FTD clients"), t("质量服务客户", "Quality service clients"), t("预计佣金", "Projected commission"), t("操作", "Action")], rows: campaignRows, footer: AFF.pagination.component({ page, pageSize: 10, total: AFF.campaigns.length, channel: "promo", sizes: false }) })}</section>
    </div>`;
};

AFF.pages.deep = () => {
  const state = AFF.state;
  const t = (zh, en) => state.language === "en" ? en : zh;
  const linksAvailable = !AFF.partnerClosure.active();
  const languageCode = language => language === "简体中文" ? "zh-cn" : language === "English" ? "en" : language === "ไทย" ? "th" : "vi";
  const assetOf = id => AFF.deepLinks.assets.find(item => item.id === id) || AFF.deepLinks.assets[0];
  const desktopAsset = assetOf(state.deep.desktop.assetId);
  const mobileAsset = assetOf(state.deep.mobile.assetId);
  const desktop = AFF.linkBuilder.href(`${AFF.deepLinks.domain}${AFF.deepLinks.promotionPath || "/register"}`, AFF.linkBuilder.trackingParams({
    page: desktopAsset.code,
    lang: languageCode(state.deep.desktop.language)
  }));
  const mobile = AFF.linkBuilder.href(`${AFF.deepLinks.domain}${AFF.deepLinks.promotionPath || "/register"}`, AFF.linkBuilder.trackingParams({
    page: mobileAsset.code,
    lang: languageCode(state.deep.mobile.language),
    system: state.deep.mobile.system.includes("iOS") ? "ios" : "android"
  }));
  const control = (label, scope, key, values) => `
    <label class="field"><span>${label}</span>
      <select data-deep="${scope}.${key}" ${linksAvailable ? "" : "disabled"}>${values.map(value => `<option value="${AFF.helpers.h(value)}" ${state.deep[scope][key] === value ? "selected" : ""}>${AFF.helpers.h(key === "language" ? AFF.languageDisplayName(value) : value)}</option>`).join("")}</select>
    </label>`;
  const assetControl = (label, scope) => `
    <label class="field"><span>${label}</span>
      <select data-deep="${scope}.assetId" ${linksAvailable ? "" : "disabled"}>${AFF.deepLinks.assets.map(asset => `<option value="${asset.id}" ${state.deep[scope].assetId === asset.id ? "selected" : ""}>${AFF.helpers.h(AFF.deepLinkPageDisplayName(asset.name))} · ${AFF.helpers.h(t(asset.type, asset.type === "落地页" ? "Landing page" : "Account opening page"))}</option>`).join("")}</select>
    </label>`;
  return `
    ${AFF.helpers.pageHeader(t("深度链接", "Deep links"), t("选择官方资产与语言，生成电脑端、移动端直达链接。", "Choose official assets and languages to generate desktop and mobile links."))}
    ${AFF.partnerClosure.promotionNotice()}
    <div class="deep-link-page">
      <section class="card"><div class="panel-header"><h2>${t("电脑端", "Desktop")}</h2></div><div class="panel-body deep-link-body">
        <div class="deep-link-fields deep-link-desktop-fields">
          ${assetControl(t("官方资产", "Official asset"), "desktop")}${control(t("语言", "Language"), "desktop", "language", AFF.deepLinks.languages)}
        </div>
        <div class="deep-link-result">
          <div class="link-text">${AFF.helpers.h(desktop)}</div>
          <button class="button primary small" type="button" data-copy="${AFF.helpers.h(desktop)}" ${linksAvailable ? "" : "disabled"}>${t("复制链接", "Copy link")}</button>
        </div>
      </div></section>
      <section class="card"><div class="panel-header"><h2>${t("移动端", "Mobile")}</h2></div><div class="panel-body deep-link-body">
        <div class="deep-link-fields">
          ${control(t("目标系统", "Target system"), "mobile", "system", AFF.deepLinks.systems)}${assetControl(t("官方资产", "Official asset"), "mobile")}${control(t("语言", "Language"), "mobile", "language", AFF.deepLinks.languages)}
        </div>
        <div class="deep-link-result">
          <div class="link-text">${AFF.helpers.h(mobile)}</div>
          <button class="button primary small" type="button" data-copy="${AFF.helpers.h(mobile)}" ${linksAvailable ? "" : "disabled"}>${t("复制链接", "Copy link")}</button>
        </div>
      </div></section>
      <p class="report-footnote">${t("链接受点击风险校验保护；目标路径由官方路径库生成", "Links are protected by click-risk checks; paths come from the official path library")} · ${t("当前版本", "Version")} ${AFF.deepLinks.pathVersion}。</p>
    </div>`;
};

AFF.fundsStageChain = (activeStage = "calculated") => {
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const stages = [
    ["calculated", t("已计算", "Calculated"), t("资格与金额已生成", "Eligibility and amount generated")],
    ["settling", t("结算中", "In settlement"), t("观察、核验或复核进行中", "Observation, checks, or review in progress")],
    ["available", t("已入余额", "In balance"), t("计入可提现金额", "Counted as withdrawable")],
    ["paid", t("已支付", "Paid"), t("提现成功", "Withdrawal succeeded")]
  ];
  const activeIndex = Math.max(0, stages.findIndex(item => item[0] === activeStage));
  return `<ol class="funds-stage-chain" aria-label="${t("资金阶段", "Funds stages")}">${stages.map(([key, label, hint], index) => `
    <li class="${index < activeIndex ? "done" : ""} ${index === activeIndex ? "current" : ""}"><strong>${label}</strong><span>${hint}</span></li>`).join("")}</ol>`;
};

AFF.pages.pay = () => `
  ${AFF.helpers.pageHeader("收益数据", "钱包余额、收益四态与结算流水；动态结算后日结。", `<button class="button primary" type="button" data-route="wd">提现</button>`)}
  <section class="card funds-stage-card">${AFF.fundsStageChain("settling")}</section>
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
  const t = (zh, en) => state.language === "en" ? en : zh;
  const attributionRule = AFF.finance.configuration.attributionWindow;
  const resultTag = (ok, pending = false) => `<span class="tag tag-${ok ? "ok" : pending ? "warning" : "muted"}">${ok ? t("通过", "Matched") : pending ? t("待审核", "Pending review") : t("无匹配", "No match")}</span>`;
  const methodText = value => ({
    "Web有效点击": t("Web有效点击", "Valid web click"),
    "App归因": t("App归因", "App attribution"),
    "受控查询": t("受控查询", "Controlled lookup")
  })[value] || value || t("受控查询", "Controlled lookup");
  const reasonText = value => ({
    "30天归因窗口内首次点击，此后锁定": t(
      `按${attributionRule.name}判定：${attributionRule.days}天窗口内首次点击，此后锁定。`,
      `Judged by ${attributionRule.name}: first click within ${attributionRule.days} days, then locked.`
    ),
    "该客户已归属其他推广方，仅返回有限原因": t("该客户已归属其他推广方，仅返回有限原因", "This client is attributed to another partner; only a limited reason is returned")
  })[value] || value;
  const result = state.lookup.result;
  const cooldownSeconds = state.lookup.cooldownUntil
    ? Math.max(1, Math.ceil((state.lookup.cooldownUntil - Date.now()) / 1000)) : 0;
  return `
    ${AFF.helpers.pageHeader(t("归属查询", "Attribution lookup"), t("输入精准客户标识，查询归属状态与原因。", "Enter an exact client identifier to check attribution status and reason."))}
    <section class="card">
      <div class="toolbar">
        <label class="field" style="flex:1 1 320px"><span>${t("注册邮箱 / 交易账号 / 投资钱包账号", "Registration email / trading account / wallet account")}</span>
          <input id="lookup-input" value="${AFF.helpers.h(state.lookup.input)}" placeholder="${t("C-10241 或 w***@gmail.com", "C-10241 or w***@gmail.com")}">
        </label>
        <button class="button primary" type="button" data-action="lookup">${t("查询", "Check")}</button>
      </div>
      ${result ? `
        <div class="result-card info-grid">
          <div class="info-item"><span>${t("客户编号", "Client ID")}</span><strong>${AFF.helpers.h(result.id)}</strong></div>
          <div class="info-item"><span>${t("客户邮箱", "Client email")}</span><strong>${AFF.helpers.h(result.email)}</strong></div>
          <div class="info-item"><span>${t("归属状态", "Attribution status")}</span>${resultTag(result.owned)}</div>
          <div class="info-item"><span>${t("归属起始", "Attributed since")}</span><strong>${AFF.helpers.h(result.date)}</strong></div>
          <div class="info-item"><span>${t("归因方式", "Attribution method")}</span><strong>${AFF.helpers.h(methodText(result.method))}</strong></div>
          <div class="info-item"><span>${t("归因结果状态", "Result status")}</span>${resultTag(result.owned, true)}</div>
          <div class="info-item"><span>${t("首触时间", "First touch")}</span><strong>${AFF.helpers.h(result.firstTouch || t("不披露", "Not disclosed"))}</strong></div>
          <div class="info-item wide"><span>${t("适用归因规则", "Attribution rule")}</span><strong>${AFF.helpers.h(t(
            `${attributionRule.name} · ${attributionRule.days}天 · 自${attributionRule.start}起算 · ${attributionRule.version}`,
            `${attributionRule.name} · ${attributionRule.days} days · from ${attributionRule.start} · ${attributionRule.version}`
          ))}</strong></div>
          <div class="info-item wide"><span>${t("判定依据", "Decision reason")}</span><strong>${AFF.helpers.h(reasonText(result.reason))}</strong></div>
        </div>` : state.lookup.blocked ? `
        <div class="result-card info-grid" role="alert">
          <div class="info-item wide"><span>${t("安全提示", "Security notice")}</span><strong>${t("查询频次已达上限，请约", "Lookup rate limit reached. Try again in about")} ${cooldownSeconds} ${t("秒后再试。", "seconds.")}</strong></div>
          <div class="info-item wide"><span>${t("审计编号", "Audit ID")}</span><strong>${AFF.helpers.h(state.lookup.lastTraceId)}</strong></div>
        </div>` : `<div class="empty-state"><strong>${t("输入精准标识后查询", "Enter an exact identifier to check")}</strong><span>${t("为保障账户安全，60秒内最多查询5次；请求会进入审计日志", "For security, up to 5 lookups are allowed per 60 seconds; requests are audited")}</span></div>`}
    </section>`;
};

AFF.filteredAssets = () => {
  return AFF.assets.filter(item => AFF.state.assets.type === "全部" || item.type === AFF.state.assets.type);
};

AFF.visibleAssets = () => AFF.filteredAssets().slice(0, AFF.state.assets.page * 12);

AFF.assetPreviewImage = item => {
  const images = ["markets", "mobile", "campaign"];
  const index = Math.max(0, AFF.assets.findIndex(asset => asset.id === item.id));
  return `./assets/placeholder-${images[index % images.length]}.png`;
};

AFF.assetPreview = item => `<img class="asset-placeholder-image" src="${AFF.assetPreviewImage(item)}" alt="" loading="lazy">`;

AFF.assetVariantRow = (values, label) => `
  <div class="asset-variant-row" aria-label="${AFF.helpers.h(label)}">
    <strong>${AFF.helpers.h(label === "语言" ? AFF.assetLabel("语言", "Language") : AFF.assetLabel("尺寸", "Size"))}</strong>
    ${values.slice(0, 3).map(value => `<span>${AFF.helpers.h(label === "语言" ? AFF.languageDisplayName(value) : AFF.assetValueDisplayName(value))}</span>`).join("")}
    ${values.length > 3 ? `<em>+${values.length - 3}</em>` : ""}
  </div>`;

AFF.assetLabel = (zh, en) => AFF.state.language === "en" ? en : zh;
AFF.assetValueDisplayName = value => {
  if (AFF.state.language !== "en") return value;
  return { "横向": "Landscape", "纵向": "Portrait", "网页": "Web", "APP": "App", "全部": "All" }[value] || value;
};
AFF.assetTypeDisplayName = type => ({
  "全部": AFF.assetLabel("全部", "All"),
  "横幅": AFF.assetLabel("横幅", "Banners"),
  "视频": AFF.assetLabel("视频", "Videos"),
  "落地页": AFF.assetLabel("落地页", "Landing pages"),
  "GIF": "GIF"
})[type] || type;

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

AFF.deepLinkPageDisplayName = value => {
  if (AFF.state.language !== "en") return value;
  const asset = AFF.deepLinks.assets.find(item => item.name === value);
  const names = {
    "OFF-REGISTER": "Official registration",
    "OFF-HOME": "Official homepage",
    "OFF-STANDARD-MT5": "Standard · MT5 account",
    "OFF-PRO-MT4": "Pro · MT4 account",
    "OFF-ZERO-MT5": "Zero · MT5 account"
  };
  return asset ? names[asset.id] || asset.name : value;
};

AFF.assetTrackingUrl = (item, options = {}) => {
  return AFF.linkBuilder.href(AFF.dashboard.link, {
    utm_source: "partner",
    utm_campaign: "materials",
    utm_medium: "material",
    utm_content: item.id,
    ...(options.size ? { material_size: options.size } : {}),
    ...(options.language ? { material_language: options.language } : {}),
    ...(options.device ? { material_device: options.device } : {}),
    ...(options.platform ? { material_platform: options.platform } : {})
  });
};

AFF.assetAnchorTag = (item, options = {}) => {
  const link = AFF.assetTrackingUrl(item, options);
  return `<a href="${link}" target="_blank" rel="noopener noreferrer">${AFF.assetLabel("了解", "Learn about")} Affiliate CPA</a>`;
};

AFF.assetLandingUrl = (item, detail) => {
  return AFF.linkBuilder.href(`${AFF.deepLinks.domain}${AFF.deepLinks.promotionPath || "/register"}`, {
    utm_source: "partner",
    utm_campaign: "materials",
    utm_medium: "landing_page",
    utm_content: item.id,
    page: item.urlPath,
    material_language: detail.language
  });
};

AFF.assetIframeTag = (item, detail) => {
  const dimensions = detail.size === "纵向" ? { width: 720, height: 1280 } : { width: 1280, height: 720 };
  const url = AFF.linkBuilder.build(AFF.assetTrackingUrl(item, detail), {
    video_loop: detail.loop ? "1" : "0",
    video_muted: detail.muted ? "1" : "0",
    video_autoplay: detail.autoplay ? "1" : "0"
  });
  const allow = detail.autoplay ? "autoplay; fullscreen; picture-in-picture" : "fullscreen; picture-in-picture";
  return `<iframe src="${url.href}" width="${dimensions.width}" height="${dimensions.height}" title="${AFF.assetNameDisplayName(item)}" allow="${allow}" loading="lazy"></iframe>`;
};

AFF.assetNameDisplayName = item => {
  if (AFF.state.language !== "en") return item.name;
  return {
    "banner-brand": "Brand showcase banner",
    "banner-onboarding": "Onboarding banner",
    "banner-mobile": "Mobile promotion banner",
    "banner-campaign": "High-conversion campaign banner",
    "video-onboarding": "Onboarding video",
    "video-platform": "Platform feature video",
    "video-mobile": "Mobile tutorial video",
    "lp-standard": "Standard account landing page",
    "lp-mobile": "Mobile account landing page",
    "lp-fund": "Deposit guide landing page",
    "gif-telegram": "Telegram GIF",
    "gif-social": "Social media GIF"
  }[item.id] || item.name;
};

AFF.assetMetaText = value => {
  if (AFF.state.language !== "en") return value;
  return { "合规专员": "Compliance specialist", "当前有效": "Active" }[value] || value;
};

AFF.pages.assets = () => {
  const state = AFF.state;
  const t = (zh, en) => state.language === "en" ? en : zh;
  const filtered = AFF.filteredAssets();
  const visible = AFF.visibleAssets();
  const typeOptions = ["全部", "横幅", "视频", "落地页", "GIF"];
  const assetsAvailable = state.assetsAccepted && !AFF.partnerClosure.active();
  return `
    ${AFF.partnerClosure.promotionNotice()}
    <section class="card asset-tabs-card">
      <div class="tabs asset-tabs" role="tablist" aria-label="${t("素材类型", "Asset type")}">
        ${typeOptions.map(type => `<button class="${state.assets.type === type ? "active" : ""}" type="button" role="tab" aria-selected="${state.assets.type === type}" data-assets-filter="type" data-value="${AFF.helpers.h(type)}">${AFF.helpers.h(AFF.assetTypeDisplayName(type))}</button>`).join("")}
      </div>
    </section>
    <section class="card asset-list-card"><div class="panel-header">
      <h2>${t("素材列表", "Asset list")} <small>${t("已展示", "Showing")} ${visible.length} / ${filtered.length} ${t("个", "items")}</small></h2>
    </div>
    <div class="locked-region ${state.assetsAccepted ? "" : "locked"}">
      ${visible.length ? `<div class="asset-grid">${visible.map(item => {
        if (item.type === "横幅") {
          return `
        <article class="asset-card asset-banner-card">
          <button class="asset-preview asset-preview-button" type="button" data-action="open-asset-detail" data-asset-id="${AFF.helpers.h(item.id)}" ${assetsAvailable ? "" : "disabled"} aria-label="查看${AFF.helpers.h(item.name)}尺寸与语言">
            ${AFF.assetPreview(item)}
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
          <button class="asset-preview asset-preview-button" type="button" data-action="open-asset-detail" data-asset-id="${AFF.helpers.h(item.id)}" ${assetsAvailable ? "" : "disabled"} aria-label="查看${AFF.helpers.h(item.name)}语言与网址">
            ${AFF.assetPreview(item)}
          </button>
          <div class="asset-body">
            ${AFF.assetVariantRow(item.languages, "语言")}
          </div>
        </article>`;
        }
        if (item.type === "GIF") {
          return `
        <article class="asset-card asset-gif-card">
          <button class="asset-preview asset-preview-button" type="button" data-action="open-asset-detail" data-asset-id="${AFF.helpers.h(item.id)}" ${assetsAvailable ? "" : "disabled"} aria-label="查看${AFF.helpers.h(item.name)}语言与尺寸">
            ${AFF.assetPreview(item)}
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
          <button class="asset-preview asset-preview-button" type="button" data-action="open-asset-detail" data-asset-id="${AFF.helpers.h(item.id)}" ${assetsAvailable ? "" : "disabled"} aria-label="查看${AFF.helpers.h(item.name)}尺寸与语言">
            ${AFF.assetPreview(item)}
          </button>
          <div class="asset-body">
            ${AFF.assetVariantRow(item.sizes, "尺寸")}
            ${AFF.assetVariantRow(item.languages, "语言")}
          </div>
        </article>`;
        }
        return "";
      }).join("")}</div>` : `<div class="empty-state"><strong>${t("暂无素材", "No assets")}</strong><span>${t("尝试调整筛选条件", "Try adjusting filters")}</span><button class="button secondary" type="button" data-action="reset-asset-filters">${t("重置筛选", "Reset filters")}</button></div>`}
      ${visible.length < filtered.length ? `<div class="asset-load-more"><button class="button secondary" type="button" data-action="load-more-assets">${t("加载更多素材", "Load more assets")}</button></div>` : ""}
      ${state.assetsAccepted ? "" : `<div class="gate"><div class="gate-card" role="dialog" aria-labelledby="asset-gate-title"><strong id="asset-gate-title">${t("使用素材前，请先阅读推广行为准则", "Read the promotion guidelines before using assets")}</strong><p>${t("了解素材使用与推广要求，接受准则后即可预览、下载和复制素材代码。", "Review usage and promotion requirements. After acceptance, you can preview, download, and copy asset code.")}</p><button class="button primary" type="button" data-action="open-code-modal">${t("阅读并接受准则", "Read and accept")}</button></div></div>`}
    </div></section>
    ${state.assets.detail ? AFF.pages.assetDetail() : ""}`;
};

AFF.pages.assetDetail = () => {
  const detail = AFF.state.assets.detail;
  const item = AFF.assets.find(asset => asset.id === detail.id);
  if (!item) return "";
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const meta = AFF.assetMeta(item);
  const metaHtml = `<div class="asset-meta-grid">
    <div><span>${t("素材编号", "Asset ID")}</span><strong>${AFF.helpers.h(item.id)}</strong></div>
    <div><span>${t("版本", "Version")}</span><strong>${AFF.helpers.h(meta.version)}</strong></div>
    <div><span>${t("审批人", "Approved by")}</span><strong>${AFF.helpers.h(AFF.assetMetaText(meta.approvedBy))}</strong></div>
    <div><span>${t("上线时间", "Online at")}</span><strong>${AFF.helpers.h(meta.onlineAt)}</strong></div>
    <div><span>${t("下线时间", "Offline at")}</span><strong>${AFF.helpers.h(AFF.assetMetaText(meta.offlineAt))}</strong></div>
    <div><span>${t("风险提示", "Risk notice")}</span><strong>${t("官方素材已注入，不可删除", "Official asset code is embedded and cannot be removed")}</strong></div>
  </div>`;
  if (item.type === "GIF") {
    const anchorTag = AFF.assetAnchorTag(item, detail);
    const fields = [
      ["language", t("语言", "Language"), item.languages],
      ["size", t("尺寸", "Size"), item.sizes],
      ["platform", t("平台", "Platform"), item.platforms]
    ];
    return `
  <div class="aff-drawer-overlay" data-action="close-asset-detail"></div>
  <aside class="aff-drawer filter-drawer asset-detail-drawer asset-gif-drawer" role="dialog" aria-modal="true" aria-label="${t("GIF素材详情", "GIF asset details")}">
    <div class="panel-header"><h2>${AFF.helpers.h(AFF.assetNameDisplayName(item))}</h2><button class="aff-drawer-close" type="button" data-action="close-asset-detail" aria-label="${t("关闭素材详情", "Close asset details")}">×</button></div>
    <div class="asset-gif-layout">
      <div class="asset-gif-preview" aria-label="GIF大预览">${AFF.assetPreview(item)}</div>
      <div class="asset-gif-settings">
        ${metaHtml}
        <div class="asset-gif-fields">
          ${fields.map(([key, label, values]) => `
            <label class="field"><span>${AFF.helpers.h(label)}</span>
              <select data-asset-detail-option="${key}" aria-label="${AFF.helpers.h(label)}">
                ${values.map(value => `<option value="${AFF.helpers.h(value)}" ${detail[key] === value ? "selected" : ""}>${AFF.helpers.h(key === "language" ? AFF.languageDisplayName(value) : AFF.assetValueDisplayName(value))}</option>`).join("")}
              </select>
            </label>`).join("")}
        </div>
        <div class="asset-detail-code">
          <span>${t("a标签完整文本", "Full anchor tag")}</span>
          <code id="asset-gif-anchor-code">${AFF.helpers.h(anchorTag)}</code>
        </div>
      </div>
    </div>
    <div class="drawer-actions asset-detail-actions">
      <button class="button primary" type="button" data-action="download-asset-variant">${t("下载", "Download")}</button>
      <button class="button secondary" type="button" data-copy="${AFF.helpers.h(anchorTag)}">${t("复制", "Copy")}</button>
    </div>
  </aside>`;
  }
  if (item.type === "落地页") {
    const landingUrl = AFF.assetLandingUrl(item, detail);
    return `
  <div class="aff-drawer-overlay" data-action="close-asset-detail"></div>
  <aside class="aff-drawer filter-drawer asset-detail-drawer asset-landing-drawer" role="dialog" aria-modal="true" aria-label="${t("落地页素材详情", "Landing-page asset details")}">
    <div class="panel-header"><h2>${AFF.helpers.h(AFF.assetNameDisplayName(item))}</h2><button class="aff-drawer-close" type="button" data-action="close-asset-detail" aria-label="${t("关闭素材详情", "Close asset details")}">×</button></div>
    <div class="asset-landing-layout">
      <div class="asset-landing-preview" tabindex="0" role="region" aria-label="${t("落地页长图预览", "Landing-page preview")}">
        ${Array.from({ length: 12 }, (_, index) => `<section>${AFF.assetPreview(item)}<strong>${t("第", "Screen")} ${index + 1}</strong></section>`).join("")}
      </div>
      <div class="asset-landing-settings">
        ${metaHtml}
        <label class="field"><span>${t("语言", "Language")}</span>
          <select data-asset-detail-option="language" aria-label="${t("语言", "Language")}">
            ${item.languages.map(value => `<option value="${AFF.helpers.h(value)}" ${detail.language === value ? "selected" : ""}>${AFF.helpers.h(AFF.languageDisplayName(value))}</option>`).join("")}
          </select>
        </label>
        <div class="asset-detail-code">
          <span>${t("网址", "URL")}</span>
          <code id="asset-landing-url">${AFF.helpers.h(landingUrl)}</code>
        </div>
        <div class="asset-landing-actions">
          <a class="button primary" href="${AFF.helpers.h(landingUrl)}" target="_blank" rel="noopener noreferrer">${t("查看", "View")}</a>
          <button class="button secondary" type="button" data-copy="${AFF.helpers.h(landingUrl)}">${t("复制链接", "Copy link")}</button>
        </div>
      </div>
    </div>
  </aside>`;
  }
  if (item.type === "视频") {
    const iframeTag = AFF.assetIframeTag(item, detail);
    const switches = [
      ["loop", t("循环播放", "Loop")],
      ["muted", t("静音", "Mute")],
      ["autoplay", t("自动播放", "Autoplay")]
    ];
    return `
  <div class="aff-drawer-overlay" data-action="close-asset-detail"></div>
  <aside class="aff-drawer filter-drawer asset-detail-drawer" role="dialog" aria-modal="true" aria-label="${t("视频素材详情", "Video asset details")}">
    <div class="panel-header"><h2>${AFF.helpers.h(AFF.assetNameDisplayName(item))}</h2><button class="aff-drawer-close" type="button" data-action="close-asset-detail" aria-label="${t("关闭素材详情", "Close asset details")}">×</button></div>
    <div class="asset-detail-body">
      ${metaHtml}
      <div class="asset-detail-fields asset-video-fields">
        <label class="field"><span>${t("尺寸", "Size")}</span>
          <select data-asset-detail-option="size" aria-label="${t("尺寸", "Size")}">
            ${item.sizes.map(value => `<option value="${AFF.helpers.h(value)}" ${detail.size === value ? "selected" : ""}>${AFF.helpers.h(AFF.assetValueDisplayName(value))}</option>`).join("")}
          </select>
        </label>
        <label class="field"><span>${t("语言", "Language")}</span>
          <select data-asset-detail-option="language" aria-label="${t("语言", "Language")}">
            ${item.languages.map(value => `<option value="${AFF.helpers.h(value)}" ${detail.language === value ? "selected" : ""}>${AFF.helpers.h(AFF.languageDisplayName(value))}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="asset-video-options" aria-label="${t("播放选项", "Playback options")}">
        ${switches.map(([key, label]) => `
          <label class="asset-switch"><input type="checkbox" role="switch" ${detail[key] ? "checked" : ""} data-asset-video-option="${key}"><span aria-hidden="true"></span><em>${AFF.helpers.h(label)}</em></label>`).join("")}
      </div>
      <button class="asset-video-preview ${detail.playing ? "playing" : ""}" type="button" data-action="toggle-video-preview" aria-label="${detail.playing ? t("暂停视频", "Pause video") : t("播放视频", "Play video")}">
        ${AFF.assetPreview(item)}
        <span class="video-control" aria-hidden="true">${detail.playing ? "❚❚" : "▶"}</span>
        <span class="video-progress" aria-hidden="true"><i></i></span>
      </button>
      <div class="asset-detail-code">
        <span>${t("iframe标签代码", "iframe code")}</span>
        <code id="asset-iframe-code">${AFF.helpers.h(iframeTag)}</code>
      </div>
    </div>
    <div class="drawer-actions asset-detail-actions">
      <button class="button primary" type="button" data-action="download-asset-variant">${t("下载", "Download")}</button>
      <button class="button secondary" type="button" data-copy="${AFF.helpers.h(iframeTag)}">${t("复制", "Copy")}</button>
    </div>
  </aside>`;
  }
  const anchorTag = AFF.assetAnchorTag(item, detail);
  const fields = [
    ["size", t("尺寸", "Size"), item.sizes],
    ["language", t("语言", "Language"), item.languages],
    ["device", t("设备", "Device"), item.devices]
  ];
  return `
  <div class="aff-drawer-overlay" data-action="close-asset-detail"></div>
  <aside class="aff-drawer filter-drawer asset-detail-drawer" role="dialog" aria-modal="true" aria-label="${t("横幅素材详情", "Banner asset details")}">
    <div class="panel-header"><h2>${AFF.helpers.h(AFF.assetNameDisplayName(item))}</h2><button class="aff-drawer-close" type="button" data-action="close-asset-detail" aria-label="${t("关闭素材详情", "Close asset details")}">×</button></div>
    <div class="asset-detail-body">
      ${metaHtml}
      <div class="asset-detail-fields">
        ${fields.map(([key, label, values]) => `
          <label class="field"><span>${AFF.helpers.h(label)}</span>
            <select data-asset-detail-option="${key}" aria-label="${AFF.helpers.h(label)}">
              ${values.map(value => `<option value="${AFF.helpers.h(value)}" ${detail[key] === value ? "selected" : ""}>${AFF.helpers.h(key === "language" ? AFF.languageDisplayName(value) : AFF.assetValueDisplayName(value))}</option>`).join("")}
            </select>
          </label>`).join("")}
      </div>
      <div class="asset-detail-preview" aria-label="${t("素材大预览", "Large asset preview")}">${AFF.assetPreview(item)}</div>
      <div class="asset-detail-code">
        <span>${t("a标签完整文本", "Full anchor tag")}</span>
        <code id="asset-anchor-code">${AFF.helpers.h(anchorTag)}</code>
      </div>
    </div>
    <div class="drawer-actions asset-detail-actions">
      <button class="button primary" type="button" data-action="download-asset-variant">${t("下载", "Download")}</button>
      <button class="button secondary" type="button" data-copy="${AFF.helpers.h(anchorTag)}">${t("复制", "Copy")}</button>
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
      .sort((a, b) => Math.max(...b.tiers.map(tier => tier.price || 0)) - Math.max(...a.tiers.map(tier => tier.price || 0)))
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
  return values.filter(value => !query || `${value} ${
    field === "page" ? AFF.deepLinkPageDisplayName(value) : AFF.languageDisplayName(value)
  }`.toLowerCase().includes(query));
};

AFF.renderDashboardLinkOptions = field => {
  const values = AFF.filteredDashboardLinkOptions(field);
  const selected = field === "page" ? AFF.state.dashboardLinkPage : AFF.state.dashboardLinkLanguage;
  if (!values.length) return `<div class="dashboard-link-empty">暂无匹配选项</div>`;
  return values.map(value => {
    const isSelected = value === selected;
    const attribute = field === "page" ? "dashboard-link-page" : "dashboard-link-language";
    return `<button class="dashboard-link-option ${isSelected ? "selected" : ""}" type="button" role="option" aria-selected="${isSelected}" data-${attribute}="${AFF.helpers.h(value)}">
      <span>${AFF.helpers.h(field === "page" ? AFF.deepLinkPageDisplayName(value) : AFF.languageDisplayName(value))}</span><strong>${isSelected ? "✓" : ""}</strong>
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

AFF.onboardingOptions = field => {
  if (field === "channel" || field === "promotionMethods") {
    const choices = field === "channel"
      ? [["内容与社群", "Content & community"], ["付费广告", "Paid advertising"], ["邮件营销", "Email marketing"], ["线下活动", "Offline events"]]
      : [["自然流量", "Organic traffic"], ["付费投放", "Paid advertising"], ["社群运营", "Community"], ["内容营销", "Content marketing"], ["邮件", "Email"], ["线下活动", "Offline events"], ["其他", "Other"]];
    return choices.map(([value, en]) => ({ value, label: AFF.state.language === "en" ? en : value, search: `${value} ${en}` }));
  }
  const chinese = new Intl.DisplayNames(["zh-CN"], { type: "region" });
  const english = new Intl.DisplayNames(["en"], { type: "region" });
  const codes = [...new Set(["SG", "CN", "MY", "BR", "HK", "TW", "GB", "US", "AU", "CA", ...AFF.partnerProgram.commissionCountries.map(item => item.code)])];
  const options = codes.map(code => ({
    value: chinese.of(code),
    label: AFF.state.language === "en" ? english.of(code) : chinese.of(code),
    search: `${chinese.of(code)} ${english.of(code)} ${code}`
  }));
  options.push({ value: "其他", label: AFF.state.language === "en" ? "Other" : "其他", search: "其他 Other" });
  const current = AFF.state.account.country;
  if (current && !options.some(item => item.value === current)) options.unshift({ value: current, label: current, search: current });
  return options;
};

AFF.renderOnboardingOptions = (field, query = "") => {
  const options = AFF.onboardingOptions(field).filter(item => item.search.toLowerCase().includes(query.trim().toLowerCase()));
  if (!options.length) return `<div class="country-empty">暂无匹配结果</div>`;
  return options.map(item => {
    const selected = AFF.state.account[field] === item.value;
    return `<button class="dashboard-link-option ${selected ? "selected" : ""}" type="button" role="option" aria-selected="${selected}" data-action="select-onboarding-option" data-onboarding-field="${field}" data-value="${AFF.helpers.h(item.value)}"><span>${AFF.helpers.h(item.label)}</span><strong>${selected ? "✓" : ""}</strong></button>`;
  }).join("");
};

AFF.pages.onboarding = () => {
  const state = AFF.state;
  const steps = ["注册账号", "基本资料与渠道", "KYC 提交", "接受协议与准则", "资质审核"];
  const current = state.onboarding.step;
  const max = state.onboarding.maxStep;
  const allAgreed = state.onboarding.agreements.every(Boolean);
  const activeAgreement = AFF.onboardingAgreements[state.onboarding.agreementModal - 1];
  const trafficProfile = state.onboarding.trafficProfile;
  const detailsOpen = Boolean(state.onboarding.detailsOpen);
  const profileInput = (field, label, placeholder, type = "text", extra = "") => `
    <label class="onboarding-name"><span class="field-label">${label}</span>
      <input data-onboarding-profile="${field}" type="${type}" value="${AFF.helpers.h(trafficProfile[field])}" placeholder="${AFF.helpers.h(placeholder)}" ${extra}>
    </label>`;
  const profilePicker = (field, label) => {
    const selected = AFF.onboardingOptions(field).find(item => item.value === state.account[field]);
    const open = onboardingPicker === field;
    return `<div class="dashboard-link-picker onboarding-picker ${open ? "open" : ""}">
      <span class="field-label" id="onboarding-${field}-label">${label}</span>
      <button class="dashboard-link-picker-button" type="button" data-action="toggle-onboarding-picker" data-onboarding-field="${field}" aria-labelledby="onboarding-${field}-label onboarding-${field}-value" aria-haspopup="listbox" aria-controls="onboarding-${field}-options" aria-expanded="${open}">
        <span id="onboarding-${field}-value">${AFF.helpers.h(selected?.label || `请选择${label}`)}</span><small aria-hidden="true">▾</small>
      </button>
      <div class="dashboard-link-options" id="onboarding-${field}-options">
        <input data-onboarding-search="${field}" type="search" placeholder="搜索${label}" aria-label="搜索${label}" value="${AFF.helpers.h(open ? onboardingQuery : "")}">
        <div class="dashboard-link-option-list" role="listbox" aria-label="${label}" data-onboarding-options="${field}">${AFF.renderOnboardingOptions(field, open ? onboardingQuery : "")}</div>
      </div>
    </div>`;
  };

  const stepContent = () => {
    if (current === 1) return `
      <section class="onboarding-step">
        <div class="commission-page-head"><div><h2>账号已创建</h2><p>请先完成邮箱验证，再继续填写合作者资料。</p></div></div>
        <div class="onboarding-field-grid">
          <div class="info-item"><span>邮箱</span><strong>demo.publisher@example.com</strong></div>
          <div class="info-item"><span>邮箱验证</span>
            <div class="onboarding-inline-status">
              <span class="tag ${state.onboarding.emailVerified ? "tag-ok" : "tag-warning"}">${state.onboarding.emailVerified ? "已验证" : "未验证"}</span>
              ${state.onboarding.emailVerified ? "" : `<button class="button secondary small" type="button" data-action="verify-onboarding-email" title="仅用于本地Mock演示">演示：验证邮箱</button>`}
            </div>
          </div>
        </div>
      </section>`;

    if (current === 2) return `
      <section class="onboarding-step">
        <div class="commission-page-head"><div><h2>基本资料与渠道</h2><p>先填写姓名和国家即可继续；其他渠道资料可稍后补充，不影响当前申请流程。</p></div></div>
        <div class="onboarding-field-grid">
          <label class="onboarding-name"><span class="field-label">姓名</span><input name="onboarding-name" data-onboarding-name type="text" autocomplete="name" maxlength="80" required placeholder="请输入姓名" value="${AFF.helpers.h(state.onboarding.name)}"></label>
          ${profilePicker("country", "国家")}
        </div>
        <button class="button secondary onboarding-details-toggle" type="button" data-action="toggle-onboarding-details" aria-expanded="${detailsOpen}" aria-controls="onboarding-optional-details">
          ${detailsOpen ? "收起详细信息" : "详细信息"}
        </button>
        ${detailsOpen ? `
          <div class="onboarding-details-panel" id="onboarding-optional-details">
            <div class="onboarding-details-head">
              <strong>补充资料（选填）</strong>
              <span>用于完善渠道画像，填写后才会执行对应格式校验。</span>
            </div>
            <div class="onboarding-field-grid">
              ${profilePicker("channel", "推广渠道类型")}
              ${AFF.profileSelect.render({ key: "primaryCountries", label: "主要推广国家", options: AFF.onboardingOptions("country"), value: trafficProfile.primaryCountries, multiple: true, attributes: 'data-onboarding-country-selection' })}
              ${profileInput("websites", "网站 / App", "至少一个可访问URL；多个用逗号分隔")}
              <label class="onboarding-name"><span class="field-label">其他渠道说明</span><textarea data-onboarding-profile="otherExplanation" rows="3" maxlength="500" placeholder="补充渠道或投放方式说明（选填）">${AFF.helpers.h(trafficProfile.otherExplanation)}</textarea></label>
            </div>
            <div class="onboarding-kyc-panel">
              <div class="onboarding-kyc-head"><strong>画像审核状态</strong><span class="tag ${trafficProfile.status === "approved" ? "tag-ok" : trafficProfile.status === "reviewing" ? "tag-info" : "tag-warning"}">${{not_submitted: "待提交", reviewing: "审核中", approved: "已通过"}[trafficProfile.status] || "待提交"}</span></div>
              <p>补充资料后可用于首个推广链接启用资格审核；未填写时不会阻止继续申请。</p>
            </div>
          </div>
        ` : ""}
      </section>`;

    if (current === 3) return `
      <section class="onboarding-step">
        <div class="commission-page-head"><div><h2>KYC 提交</h2><p>请前往认证页面完成身份认证，完成后返回此页面继续申请。</p></div></div>
        <div class="onboarding-kyc-panel">
          <div class="onboarding-kyc-head"><strong>身份认证状态</strong><span class="tag ${state.onboarding.kycCompleted ? "tag-ok" : "tag-info"}">${state.onboarding.kycCompleted ? "已完成" : "待完成"}</span></div>
          <p>认证流程将在认证页面完成。请点击“去完成”进入认证页面，完成后返回本页，系统会同步最新状态。</p>
          <div class="onboarding-inline-status">
            <span class="tag ${state.onboarding.kycCompleted ? "tag-ok" : "tag-info"}">${state.onboarding.kycCompleted ? "认证已同步" : state.onboarding.kycRedirected ? "已打开认证页面" : "等待认证"}</span>
            ${state.onboarding.kycCompleted ? "" : `
              <button class="button primary small" type="button" data-action="open-onboarding-kyc">去完成</button>
              <button class="button secondary small" type="button" data-action="complete-onboarding-kyc" title="仅用于本地Mock演示，不代表CRM回执">演示：标记完成</button>
            `}
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
      </section>`;

    return `
      <section class="onboarding-step">
        <div class="commission-page-head"><div><h2>资质审核</h2><p>提交资料与协议记录后进入审核。</p></div></div>
        <div class="onboarding-kyc-panel">
          <div class="onboarding-kyc-head">
            <strong>审核范围：合作者身份资料、推广渠道、KYC资料与协议接受记录</strong>
            <span class="tag ${state.onboarding.submitted ? "tag-info" : "tag-warning"}">${state.onboarding.submitted ? "审核中" : "待提交"}</span>
          </div>
          <p>审核结果将通过站内消息通知。</p>
          <div class="onboarding-crm-states" aria-label="CRM同步状态说明">
            <div><span class="tag tag-info">待CRM确认</span><p>资料已提交，等待CRM同版确认；此时不推断链接已启用。</p></div>
            <div><span class="tag tag-danger">同步失败</span><p>CRM未收到或未确认本版本，可重试；重试前不创建新申请版本。</p></div>
            <div><span class="tag tag-warning">重试中</span><p>系统正在重新提交；结果未知时不重复提交。</p></div>
            <div><span class="tag tag-warning">需要补件</span><p>按CRM原因补充指定材料，提交后生成新版本。</p></div>
            <div><span class="tag tag-danger">版本冲突</span><p>CRM资料已更新，需重新加载后按最新版本提交。</p></div>
          </div>
        </div>
      </section>`;
  };

  return `
    <section class="card program-steps-card onboarding-card"><div class="panel-body">
      <div class="commission-page-head onboarding-head"><div><h2>入驻申请</h2><p>注册 → 资料 → KYC 提交 → 协议 → 资质审核。</p></div></div>
      <div class="steps">${steps.map((label, index) => {
        const number = index + 1;
        const status = number === current ? "current" : number <= max ? "done" : "disabled";
        return `<button class="step ${status}" type="button" data-action="onboarding-go" data-onboarding-step="${number}" ${number > max ? "disabled" : ""}><span class="step-number">${number < current || (number !== current && number <= max) ? "✓" : number}</span><span class="step-label">${AFF.helpers.h(label)}</span></button>`;
      }).join("")}</div>
      ${stepContent()}
      <div class="onboarding-actions">
        <button class="button secondary" type="button" data-action="onboarding-go" data-onboarding-step="${current - 1}" ${current <= 1 ? "disabled" : ""}>上一步</button>
        ${current < 5
          ? `<button class="button primary" type="button" data-action="onboarding-next" ${(current === 1 && !state.onboarding.emailVerified) || (current === 3 && !state.onboarding.kycCompleted) || (current === 4 && !allAgreed) ? "disabled" : ""}>下一步</button>`
          : `<button class="button primary" type="button" data-action="submit-onboarding" ${state.onboarding.submitted ? "disabled" : ""}>${state.onboarding.submitted ? "已提交" : "提交审核"}</button>`}
      </div>
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
  const steps = AFF.programNavigation.steps.map(item => item[state.language === "en" ? 1 : 0]);
  const reached = Math.max(state.programMaxStep || 1, state.applyStep);
  const content = AFF.pages.applyStep();
  return `
    ${AFF.helpers.pageHeader("合作者计划", "按国家看佣金、选市场、查端支持、取素材、学系统并分享链接。")}
    <section class="card program-steps-card"><div class="panel-body">
      <button class="button secondary program-contents-button" type="button" data-action="open-program-navigation">${state.language === "en" ? "Program contents" : "计划目录"}</button>
      <div class="steps">${steps.map((label, index) => {
        const number = index + 1;
        const status = number === state.applyStep ? "current" : number <= reached ? "done" : "disabled";
        return `<button class="step ${status}" type="button" data-apply-step="${number}" data-program-progress ${number > reached ? "disabled" : ""} ${number === state.applyStep ? 'aria-current="step"' : ""}><span class="step-number">${status === "done" ? "✓" : number}</span><span class="step-label">${label}</span></button>`;
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
  const rules = AFF.finance.configuration;
  const guaranteeRate = Number.isFinite(rules.guaranteeRate) ? `${Number((rules.guaranteeRate * 100).toFixed(2))}%` : "待确认";
  const guaranteePeriod = Number.isFinite(rules.guaranteeReleaseDays)
    ? `${rules.guaranteeReleaseDays}${state.language === "en" ? " days" : "天"}` : "待确认";

  const percent = value => `${value.toFixed(1)}%`;
  const effective = values => values[0] * values[1] * values[2] / 10000;

  if (state.applyStep === 1) {
    AFF.ensureCommissionCountries();
    const selectedCountries = AFF.sortedCommissionCountries().filter(item => state.programCommissionCountries.includes(item.code));
    const isEnglish = state.language === "en";
    const calculator = AFF.programCalculatorResult();
    const settlementAmount = calculator.gross - calculator.guarantee;
    const calculatorInput = (field, label, value, attributes = "") => `
      <label><span>${AFF.helpers.h(label)}</span><input data-calculator-field="${field}" value="${AFF.helpers.h(value)}" ${attributes}></label>`;
    const countryLabel = isEnglish ? "Country / Region" : "国家/地区";
    const searchLabel = isEnglish ? "Search countries" : "搜索国家";
    return `
    <section class="card commission-selector-card program-step-card"><div class="panel-body">
      <div class="commission-page-head">
        <div>
          <h2>L1-L4资格档与国家佣金</h2>
          <p>了解佣金的组成，再按推广国家查看相应资格要求与奖励。</p>
        </div>
      </div>
      <section class="program-reward-overview" aria-labelledby="program-reward-title">
        <h3 id="program-reward-title">佣金如何产生</h3>
        <ol class="program-reward-stages">
          <li><span class="program-stage-label">首次入金</span><h4>FTD</h4><p>客户完成首次入金，进入后续资格确认阶段。仅完成首次入金，尚不能获得可提现佣金。</p></li>
          <li><span class="program-stage-label">确认基础奖励</span><h4>有效FTD</h4><p>达到相应资格要求后，确认基础CPA佣金。FTD与有效FTD两段共同构成完整的基础奖励。</p></li>
          <li><span class="program-stage-label">获得额外奖励</span><h4>质量服务</h4><p>进一步达到质量服务要求，可获得基础CPA之外的额外奖励；未达成不影响已经成立的基础佣金。</p></li>
        </ol>
        <p class="program-rule-note">FTD与有效FTD两段的基础比例合计100%；三个阶段不代表分三次付款，质量服务奖励不占用基础CPA比例。</p>
      </section>
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
          <header><h3>${AFF.helpers.h(AFF.countryDisplayName(country))}</h3><span>${isEnglish ? "Country-specific CPA" : "国家专属CPA"}</span></header>
          <div class="commission-table-wrap"><table class="commission-table">
            <thead><tr><th>资格档</th><th>净入金 / 交易量 / 交易日</th><th>参考CPA</th></tr></thead>
            <tbody>${country.tiers.map(tier => `<tr><td>${tier.tier}</td><td>$${tier.netDeposit} / ${tier.volume}手 / ${tier.days}天</td><td>$${tier.price}</td></tr>`).join("")}</tbody>
          </table></div>
        </section>`).join("") : `<div class="card state-panel"><strong>暂无数据</strong><span>请至少选择一个国家</span></div>`}
    </div>
    <section class="card commission-calculator">
      <div class="panel-header"><h2>${isEnglish ? "Commission calculator" : "佣金计算器"}</h2><span class="helper">${isEnglish ? "Illustrative estimate" : "试算示例"}</span></div>
      <div class="panel-body calculator-grid">
        <div class="calculator-fields">
          <label><span>${isEnglish ? "Country" : "国家"}</span>
            <select data-calculator-field="country">${AFF.partnerProgram.commissionCountries.map(country => `<option value="${country.code}" ${state.programCalculator.country === country.code ? "selected" : ""}>${AFF.helpers.h(AFF.countryDisplayName(country))}</option>`).join("")}</select>
          </label>
          ${calculatorInput("netDeposit", isEnglish ? "Net deposit" : "净入金", state.programCalculator.netDeposit, 'type="number" min="0" step="50"')}
          ${calculatorInput("volume", isEnglish ? "Trading volume (lots)" : "交易量（手）", state.programCalculator.volume, 'type="number" min="0" step="0.1"')}
          ${calculatorInput("days", isEnglish ? "Trading days" : "交易日", state.programCalculator.days, 'type="number" min="0" step="1"')}
          <label><span>${isEnglish ? "Payment method" : "入金方式"}</span>
            <select data-calculator-field="payment">
              <option value="wire" ${state.programCalculator.payment === "wire" ? "selected" : ""}>${isEnglish ? "Bank transfer" : "银行转账"}</option>
              <option value="wallet" ${state.programCalculator.payment === "wallet" ? "selected" : ""}>${isEnglish ? "E-wallet" : "电子钱包"}</option>
              <option value="card" ${state.programCalculator.payment === "card" ? "selected" : ""}>${isEnglish ? "Card" : "银行卡"}</option>
            </select>
          </label>
        </div>
        <div class="calculator-result">
          <span>${isEnglish ? "Qualified tier" : "所达资格档"}</span><strong>${calculator.tier.tier}</strong>
          <div><span>${isEnglish ? "Commission total" : "佣金总额"}</span><strong>$${calculator.gross.toFixed(2)}</strong></div>
          <div><span>${isEnglish ? "Guarantee" : "保证金"} ${guaranteeRate}</span><strong>$${calculator.guarantee.toFixed(2)}</strong></div>
          <div class="program-settlement-amount"><span>${isEnglish ? "Settlement amount" : "结算金额"}</span><strong>$${settlementAmount.toFixed(2)}</strong></div>
          <small>${isEnglish ? "Payment method affects only the dynamic hold date, not price." : "入金方式只影响动态结算日期，不影响档位和佣金总额。"}</small>
          <small>${isEnglish ? "Illustrative settlement period" : "试算结算周期"} ${calculator.holdDays}${isEnglish ? "d" : "天"} · ${isEnglish ? "Estimated settlement" : "预计结算"} ${calculator.releaseDate}；${isEnglish ? "Estimated guarantee release" : "预计保证金释放"} ${calculator.guaranteeDate}</small>
          <small>比例、天数及日期仅供试算；实际以适用规则及核验结果为准。</small>
        </div>
      </div>
      <div class="program-settlement-summary">
        <p>佣金确认后进入结算流程，符合条件的金额按日自动结算。结算时按适用规则留存部分佣金作为保证金，保证金符合释放条件后可提现。</p>
        <details class="program-rule-details" open>
          <summary>了解结算与保证金</summary>
          <div class="program-detail-copy">
            <p><strong>结算周期：</strong>佣金需要经过适用的观察与核验周期，再参与每日自动结算。每日结算不代表新佣金次日一定可提现。</p>
            <p><strong>保证金：</strong>所有合作者均适用保证金规则。留存金额单独记录，满足期限及释放条件后转为可提现保证金；如涉及调整或抵扣，可查看明细与原因。</p>
            ${Math.max(state.programMaxStep || 1, state.applyStep) >= 5
              ? '<button class="program-text-link" type="button" data-apply-step="5">查看完整资金流程 <span aria-hidden="true">→</span></button>'
              : "<p>后续「收益与系统指引」将说明完整资金流程，以及在哪里查看进度。</p>"}
          </div>
        </details>
      </div>
    </section>
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

  if (state.applyStep === 4) {
    const slides = [
      { image: "placeholder-markets.png", title: "适合不同渠道的推广创意", text: "从网站横幅到社交内容，让推广更高效。" },
      { image: "placeholder-mobile.png", title: "用视频讲好您的推广内容", text: "为横向和纵向场景选择合适的视频素材。" },
      { image: "placeholder-campaign.png", title: "让每次点击都有合适的落点", text: "选择适合受众语言的落地页，连接您的推广流量。" }
    ];
    const index = Math.min(slides.length - 1, Math.max(0, state.programAssetSlide || 0));
    const slide = slides[index];
    const categories = [["横幅", "横幅广告", "assets"], ["视频", "视频", "video"], ["落地页", "落地页", "browser"], ["GIF", "GIF", "overview"]];
    return `
      <div class="program-intro">
        <h2>丰富的创意素材库</h2>
        <p>多种语言与格式的推广素材，帮助您为网站、应用和社交渠道准备合适的内容。</p>
      </div>
      <div class="program-material-layout">
      <section class="program-material-carousel" aria-roledescription="轮播" aria-label="推广素材预览">
        <div class="program-material-slide">
          <img src="./assets/${slide.image}" alt="${AFF.helpers.h(slide.title)}">
          <div class="program-material-caption"><strong>${slide.title}</strong><span>${slide.text}</span></div>
        </div>
        <div class="program-carousel-controls">
          <button class="icon-button" type="button" data-action="program-asset-slide" data-slide="${(index + slides.length - 1) % slides.length}" aria-label="上一张素材" title="上一张素材">‹</button>
          <div>${slides.map((item, number) => `<button class="program-slide-dot ${number === index ? "active" : ""}" type="button" data-action="program-asset-slide" data-slide="${number}" aria-label="第${number + 1}张素材" ${number === index ? 'aria-current="true"' : ""}></button>`).join("")}</div>
          <button class="icon-button" type="button" data-action="program-asset-slide" data-slide="${(index + 1) % slides.length}" aria-label="下一张素材" title="下一张素材">›</button>
        </div>
      </section>
      <div class="program-material-details">
        <div class="program-channel-list">
          <div><strong>网站与移动应用</strong><span>网页端 · iOS · Android</span></div>
          <div><strong>社交媒体与内容社区</strong><span>Instagram · TikTok · YouTube · Telegram</span></div>
        </div>
        <div class="program-material-description">
        <p>横幅、视频、落地页和 GIF 覆盖多种推广场景。进入素材库后，您可以按语言、尺寸和平台选择素材，下载文件或复制推广代码。</p>
        <p>推广前，建议检查素材语言与投放地区是否一致，并定期查看素材库中的最新内容。</p>
        <button class="program-text-link" type="button" data-action="program-open-assets">前往素材库 <span aria-hidden="true">→</span></button>
        </div>
      </div>
      </div>
      <div class="program-material-categories">${categories.map(([type, label, icon]) => `
        <button type="button" data-action="program-open-assets" data-type="${type}">
          <span class="program-category-icon" aria-hidden="true">${type === "GIF" ? "GIF" : navIcon(icon)}</span>
          <strong>${label}</strong>
          <small>${AFF.assets.filter(item => item.type === type).length} 份素材</small>
        </button>`).join("")}
      </div>`;
  }

  if (state.applyStep === 5) return `
    <div class="program-intro">
      <h2>收益与系统指引</h2>
      <p>了解佣金从确认到可提现的过程，以及在哪里查看客户、收益和保证金。</p>
    </div>
    <section class="program-funds-flow" aria-labelledby="program-funds-title">
      <h3 id="program-funds-title">从佣金确认到提现</h3>
      <ol class="program-funds-timeline">
        <li><span>01</span><strong>佣金确认</strong><p>达到有效FTD或质量服务要求，确认对应奖励。</p></li>
        <li><span>02</span><strong>结算中</strong><p>经过适用的观察与核验周期，符合条件后参与每日自动结算。</p></li>
        <li><span>03</span><strong>可提现佣金</strong><p>完成结算后，符合提现条件的佣金进入可提现余额。</p></li>
        <li><span>04</span><strong>申请提现</strong><p>完成所需资料并满足提现条件后，申请提取可提现余额。</p></li>
      </ol>
    </section>
    <div class="program-funds-rules">
      <section>
        <h3>佣金何时可以提现</h3>
        <p>佣金确认后开始观察与核验，周期按适用规则确定。符合条件的金额每日自动结算，通常在凌晨执行；准确时间与时区以适用规则为准。</p>
        <p>每日结算不代表新佣金次日一定可提现。需要补充资料或进一步核验时，收益详情会显示当前阶段与下一步；提现到账属于后续流程。</p>
      </section>
      <section>
        <h3>何时收取保证金</h3>
        <p>佣金完成结算时，系统按适用比例从本次佣金中留存保证金，所有合作者均适用。保证金单独记录，您可在保证金页面查看留存金额、对应佣金和预计释放时间。</p>
        <p>满足期限及释放条件后，保证金转为可提现金额，仍需申请提现；如涉及核验、调整或抵扣，可查看明细和原因。</p>
      </section>
    </div>
    <details class="program-rule-details program-rule-example">
      <summary>查看当前试算规则与金额说明</summary>
      <div class="program-detail-copy">
        <dl class="program-rule-values">
          <div><dt>结算频率</dt><dd>每日自动结算</dd></div>
          <div><dt>结算周期</dt><dd>按国家、入金方式及核验情况确定</dd></div>
          <div><dt>保证金比例示例</dt><dd>${guaranteeRate}</dd></div>
          <div><dt>保证金保留期限示例</dt><dd>${guaranteePeriod}</dd></div>
        </dl>
        <p>比例与天数为试算示例，实际以适用规则为准。预计结算及释放日期在具备充分依据时展示；仍在核验时，查看当前阶段与下一步。</p>
        <button class="program-text-link" type="button" data-apply-step="1">返回佣金计算器试算 <span aria-hidden="true">→</span></button>
      </div>
    </details>
    <div class="program-section-head program-entry-head"><div><h3>在哪里查看进度</h3><p>从客户转化到资金明细，随时回到对应页面查看。</p></div></div>
    <div class="program-guide-grid">
      <article>
        <span>客户转化</span><strong>查看客户数据</strong><p>查看客户的注册信息、KYC状态、转化阶段和对应佣金。</p>
        <button class="button secondary" type="button" data-route="clients">进入客户列表</button>
      </article>
      <article>
        <span>佣金结算</span><strong>查看收益数据</strong><p>查看逐笔佣金的金额、结算进度，以及需要您处理的事项。</p>
        <button class="button secondary" type="button" data-route="pay">进入收益数据</button>
      </article>
      <article>
        <span>保证金释放</span><strong>查看保证金</strong><p>查看保证金留存、预计释放时间、可提现金额和调整记录。</p>
        <button class="button secondary" type="button" data-route="guarantee">进入保证金</button>
      </article>
    </div>`;

  const webLink = AFF.linkBuilder.build(AFF.dashboard.link, AFF.linkBuilder.trackingParams({
    platform: "web",
    lang: state.language === "en" ? "en" : "zh-cn"
  }));
  const mobileLink = AFF.linkBuilder.build(webLink, { platform: "app" });
  return `
    <div class="program-intro">
      <h2>分享您的链接，开始赚取收入</h2>
      <p>复制您的专属推广链接，分享到网站、社交平台或社群，追踪客户转化与佣金。</p>
    </div>
    <div class="program-share-body">
      <p>申请与资质确认完成后，推广链接才会启用。链接可用时，客户通过您的专属链接注册后，可以在仪表盘查看推广效果；符合佣金条件的转化将计入收益。请选择适合投放场景的链接。</p>
      <div class="program-basic-tools">
        <h3>基础推广：先拿链接和素材</h3>
        <p>适合内容站、社群和KOL先开始投放；不需要先配置Sub ID或回传。</p>
      </div>
      <section class="funds-stage-card funds-stage-card-compact">${AFF.fundsStageChain("settling")}</section>
      <div class="program-share-links">
        ${[["网页链接", "适用于网站与桌面浏览器", webLink.href, "globe"], ["移动/手机链接", "适用于应用与移动端推广", mobileLink.href, "smartphone"]].map(([label, hint, url, icon]) => `
          <div class="program-share-link">
            <span class="program-share-icon" aria-hidden="true">${navIcon(icon)}</span>
            <div><strong>${label}</strong><span>${hint}</span><a href="${AFF.helpers.h(url)}" target="_blank" rel="noopener" title="${AFF.helpers.h(url)}">${AFF.helpers.h(url)}</a></div>
            <button class="button primary small" type="button" data-copy="${AFF.helpers.h(url)}" aria-label="复制${label}">复制链接</button>
          </div>`).join("")}
      </div>
      <p class="program-share-note">您可以随时返回仪表盘获取推广链接。投放前请查看支持地区，并根据受众的语言、设备和目标页面选择对应链接。</p>
      <section class="program-share-recap" aria-labelledby="program-recap-title">
        <h3 id="program-recap-title">推广前，再记住这三点</h3>
        <ul>
          <li>达到有效FTD要求后确认基础佣金，质量服务可带来额外奖励。</li>
          <li>佣金符合条件并完成结算后，才进入可提现余额。</li>
          <li>保证金单独记录，符合释放条件后可提现。</li>
        </ul>
      </section>
      <details class="program-advanced-tools">
        <summary>进阶优化与技术集成</summary>
        <p>以下能力适合专业买量团队或使用广告追踪器的合作者，可在基础推广运行后再配置。</p>
        <div class="program-share-shortcuts">
        <button class="program-text-link" type="button" data-route="deep">配置专属深度链接 <span aria-hidden="true">→</span></button>
        <button class="program-text-link" type="button" data-apply-step="1">查看奖励规则 <span aria-hidden="true">→</span></button>
        <button class="program-text-link" type="button" data-apply-step="5">查看结算规则 <span aria-hidden="true">→</span></button>
        </div>
      </details>
      </div>
      <section class="program-postback-guide" aria-labelledby="program-postback-title">
        <h3 id="program-postback-title">用回传链接连接您的追踪平台</h3>
        <p>适合使用广告追踪器或自建数据系统管理投放的合作者。</p>
        <p>配置回传链接后，系统会将您选择的转化事件发送至您的平台，帮助您关联广告点击与客户转化、比较渠道效果并优化投放。</p>
        <button class="program-text-link" type="button" data-route="tracker">配置回传链接 <span aria-hidden="true">→</span></button>
      </section>
    </div>`;
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

/* Unified pagination channel for promo (D-02): campaign list pages via data-aff-page. */
document.addEventListener("click", event => {
  const btn = event.target.closest('[data-aff-pagination="promo"] [data-aff-page]');
  if (!btn || btn.disabled) return;
  AFF.state.campaignPage = Number(btn.dataset.affPage);
  render();
  AFF.pagination.focusNav("promo");
});
