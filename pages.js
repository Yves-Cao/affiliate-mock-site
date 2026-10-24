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
    return `
      <header class="page-header">
        <div><h1>${AFF.helpers.h(title)}</h1><p>${AFF.helpers.h(description)}</p></div>
        <div class="page-actions">${actions}</div>
      </header>`;
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
  const trend = AFF.dashboard.trends[state.dashboardMode];
  return `
    ${AFF.helpers.pageHeader("仪表盘", "我能提多少钱、客户激活情况、去哪拿链接。", `<button class="button primary" type="button" data-copy="${AFF.helpers.h(AFF.dashboard.link)}">复制推广链接</button>`)}
    ${AFF.helpers.cards(AFF.dashboard.metrics)}
    <div class="grid-2">
      <section class="card">
        <div class="panel-header"><h2>我的推广链接</h2><button class="button secondary small" type="button" data-route="deep">深度链接设置</button></div>
        <div class="panel-body link-box">
          <div class="link-text">${AFF.helpers.h(AFF.dashboard.link)}</div>
          <p class="helper">默认目标页：注册页 · 简体中文 · Web</p>
          <button class="button secondary" type="button" data-copy="${AFF.helpers.h(AFF.dashboard.link)}">复制链接</button>
        </div>
      </section>
      <section class="card">
        <div class="panel-header">
          <h2>收益趋势</h2>
          <div class="tabs">
            ${[["day", "天"], ["week", "周"], ["month", "月"]].map(([key, label]) => `<button class="${state.dashboardMode === key ? "active" : ""}" type="button" data-dashboard-mode="${key}">${label}</button>`).join("")}
          </div>
        </div>
        <div class="chart">${trend.map(value => `<div class="chart-column" title="$${value}"><i style="height:${Math.round(value / Math.max(...trend) * 100)}%"></i></div>`).join("")}</div>
        <div class="chart-x">${trend.map((_, index) => `<span>${index + 1}</span>`).join("")}</div>
      </section>
    </div>`;
};

AFF.pages.perf = () => {
  const state = AFF.state;
  const fixed = AFF.performance.metrics;
  const groups = state.perf.groups.length ? state.perf.groups : ["全部"];
  const columns = [...groups, ...fixed];
  const rows = AFF.performance.rows
    .filter(row => !state.perf.source || row[2] === state.perf.source)
    .map(row => {
      const groupValues = state.perf.groups.length ? state.perf.groups.map(group => row[AFF.performance.dimensions.indexOf(group)]) : ["全部"];
      return [...groupValues, ...row.slice(7).map((value, index) => index === 8 || index >= 14 ? AFF.helpers.h(value) : AFF.helpers.h(value))];
    });
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
      ${AFF.helpers.table({ columns, rows, numeric: numericIndexes, footer: AFF.helpers.pagination(rows.length, state.perf.page, "perf-page") })}
    </section>
    ${state.perf.drawer ? AFF.pages.perfDrawer() : ""}`;
};

AFF.pages.perfDrawer = () => `
  <div class="overlay" data-action="close-perf-filter"></div>
  <aside class="filter-drawer" aria-label="筛选器">
    <div class="panel-header"><h2>筛选器</h2><button class="close-button" type="button" data-action="close-perf-filter">×</button></div>
    <div class="panel-body">
      <div class="field"><span>时间</span><input type="date" value="2026-09-23"><input type="date" value="2026-10-22"></div>
      <div class="field" style="margin-top:14px"><span>活动</span><select><option>全部活动</option><option>十月 Telegram 投放</option><option>财经博客内容位</option></select></div>
      <p class="helper" style="margin-top:18px">UTM 来源</p>
      <div class="chips">
        ${["全部", "Telegram", "Facebook", "谷歌广告", "推荐链接"].map(item => `<button class="chip ${item === "全部" ? "active" : ""}" type="button" data-perf-source="${AFF.helpers.h(item)}">${item}</button>`).join("")}
      </div>
    </div>
    <div class="drawer-actions">
      <button class="button secondary" type="button" data-action="reset-perf-filter">重置</button>
      <button class="button primary" type="button" data-action="apply-perf-filter">应用</button>
    </div>
  </aside>`;

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
    return (!loyal || loyal === "全部" || (loyal === "是" ? row.loyal : !row.loyal)) &&
      (!kyc || kyc === "全部" || row.kyc === kyc);
  });
  const columns = ["客户编号 / 邮箱", "状态", "注册日期", "国家", "平台", "KYC", "UTM Source", "UTM Medium", "UTM Campaign", "UTM Term", "UTM Content", "忠诚客户", "资格日期", "Tier", "Sub ID", "预计", "已付", "已拒", "暂扣", "操作"];
  const rows = filtered.map(row => [
    `${AFF.helpers.h(row.clientId)}<br><span class="muted">${AFF.helpers.h(row.email)}</span>`,
    `<div class="status-line">${AFF.helpers.tag(row.status === "qualified" ? "合格" : row.status === "holding" ? "持有" : "已注册")}<button class="question-button" type="button" data-client-info="${row.clientId}">?</button></div>`,
    row.registeredAt, row.country, row.platform, AFF.helpers.tag(row.kyc), row.source, row.medium, row.campaign, row.term, row.content,
    AFF.helpers.tag(row.loyal ? "是" : "否"), row.qualifiedAt, row.tier, row.subId, row.expected, row.paid, row.rejected, row.held,
    `<button class="button secondary small" type="button" data-client-info="${row.clientId}">详情</button>`
  ]);
  return `
    ${AFF.helpers.pageHeader("客户列表", "客户从哪来、是否合格、钱在什么状态。")}
    <section class="card">
      <div class="toolbar">
        <button class="button secondary small" type="button" data-action="toggle-client-filter">${state.clientFilterOpen ? "收起筛选" : "筛选条件"}</button>
        ${state.clientFilterOpen ? filters.map(([label, values]) => `
          <div class="field"><span>${label}</span><div class="chips">${values.map(value => `<button class="chip ${state.clientFilters[label] === value ? "active" : ""}" type="button" data-client-filter="${AFF.helpers.h(label)}" data-value="${AFF.helpers.h(value)}">${value}</button>`).join("")}</div></div>`).join("") : ""}
      </div>
      ${AFF.helpers.table({ columns, rows, numeric: [15, 16, 17, 18], footer: AFF.helpers.pagination(rows.length, state.clientsPage, "clients-page") })}
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
  const lang = state.deep.language === "简体中文" ? "zh-cn" : state.deep.language === "English" ? "en" : state.deep.language === "ไทย" ? "th" : "vi";
  const desktop = `https://example.com/${state.deep.page === "首页" ? "" : state.deep.page.toLowerCase().replace(/[^a-z0-9]+/g, "-")}?lang=${lang}`;
  const mobile = `https://app.example.com/${state.deep.system.includes("iOS") ? "ios" : "android"}/${state.deep.page.toLowerCase().replace(/[^a-z0-9]+/g, "-")}?lang=${lang}`;
  const control = (label, key, values) => `
    <label class="field"><span>${label}</span>
      <select data-deep="${key}">${values.map(value => `<option ${state.deep[key] === value ? "selected" : ""}>${AFF.helpers.h(value)}</option>`).join("")}</select>
    </label>`;
  return `
    ${AFF.helpers.pageHeader("深度链接", "按目标页与语言生成电脑端、移动端直达链接。")}
    <div class="grid-2">
      <section class="card"><div class="panel-header"><h2>电脑端</h2></div><div class="panel-body link-box">
        ${control("目标页", "page", AFF.deepLinks.pages)}${control("语言", "language", AFF.deepLinks.languages)}
        <div class="link-text">${AFF.helpers.h(desktop)}</div><button class="button primary" type="button" data-copy="${AFF.helpers.h(desktop)}">复制链接</button>
      </div></section>
      <section class="card"><div class="panel-header"><h2>移动端</h2></div><div class="panel-body link-box">
        ${control("目标系统", "system", AFF.deepLinks.systems)}${control("目标页", "page", AFF.deepLinks.pages)}${control("语言", "language", AFF.deepLinks.languages)}
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
        </div>` : `<div class="empty-state"><strong>输入精准标识后查询</strong><span>本演示限制连续查询次数；请求会进入审计日志</span></div>`}
    </section>`;
};

AFF.pages.assets = () => {
  const state = AFF.state;
  const filtered = AFF.assets.filter(item => state.assetType === "全部" || item.type === state.assetType);
  return `
    ${AFF.helpers.pageHeader("素材库", "未接受《推广行为准则》前锁定下载。", state.assetsAccepted ? "" : `<button class="button primary" type="button" data-action="open-code-modal">阅读并接受准则</button>`)}
    <section class="card" style="margin-bottom:16px"><div class="toolbar"><div class="chips">
      ${["全部", "网幅", "视频", "落地页", "GIF", "标志"].map(type => `<button class="chip ${state.assetType === type ? "active" : ""}" type="button" data-asset-type="${type}">${type}</button>`).join("")}
    </div></div></section>
    <div class="locked-region ${state.assetsAccepted ? "" : "locked"}">
      <div class="asset-grid">${filtered.map(item => `
        <article class="asset-card">
          <div class="asset-preview">${AFF.helpers.h(item.preview)}</div>
          <div class="asset-body">
            <strong class="asset-name">${AFF.helpers.h(item.name)}</strong>
            <span class="asset-meta">${AFF.helpers.h(item.type)} · ${AFF.helpers.h(item.size)}</span>
            <span class="asset-meta">更新：${AFF.helpers.h(item.date)}</span>
            <div class="asset-actions">
              <button class="button secondary small" type="button" ${state.assetsAccepted ? "" : "disabled"} data-download="${AFF.helpers.h(item.name)}">下载</button>
              <button class="button secondary small" type="button" ${state.assetsAccepted ? "" : "disabled"} data-copy="${AFF.helpers.h("https://assets.example.com/" + item.name)}">复制链接</button>
            </div>
          </div>
        </article>`).join("")}</div>
      ${state.assetsAccepted ? "" : `<div class="gate"><div class="gate-card"><strong>素材区已锁定</strong><p>请先阅读并接受《推广行为准则》后再下载素材。</p><button class="button primary" type="button" data-action="open-code-modal">阅读并接受准则</button></div></div>`}
    </div>`;
};

AFF.pages.apply = () => {
  const state = AFF.state;
  const steps = ["注册账号", "基本资料", "KYC认证", "协议准则", "提交审核"];
  return `
    ${AFF.helpers.pageHeader("入驻申请", "完成注册、资料、KYC、协议和提交审核。")}
    <section class="card"><div class="panel-body">
      <div class="steps">${steps.map((label, index) => {
        const number = index + 1;
        const status = number < state.applyStep ? "done" : number === state.applyStep ? "current" : "disabled";
        return `<div class="step ${status}"><span class="step-number">${number < state.applyStep ? "✓" : number}</span><span>${label}</span></div>`;
      }).join("")}</div>
      ${AFF.pages.applyStep()}
      <div class="action-row">
        <button class="button secondary" type="button" data-apply-step="${state.applyStep - 1}" ${state.applyStep <= 1 ? "disabled" : ""}>上一步</button>
        ${state.applyStep < 5 ? `<button class="button primary" type="button" data-apply-step="${state.applyStep + 1}" ${state.applyStep >= 4 && !state.agreements.every(Boolean) ? "disabled" : ""}>下一步</button>` : `<button class="button primary" type="button" data-action="submit-apply" ${state.applySubmitted ? "disabled" : ""}>${state.applySubmitted ? "已提交审核" : "提交审核"}</button>`}
      </div>
    </div></section>`;
};

AFF.pages.applyStep = () => {
  const state = AFF.state;
  if (state.applyStep === 1) return `
    <div class="form-grid">
      <label class="field wide"><span>邮箱</span><input value="partner@example.com" readonly></label>
      <div class="wide"><button class="button secondary" type="button" data-action="verify-email">${state.emailVerified ? "已验证" : "模拟验证"}</button></div>
    </div>`;
  if (state.applyStep === 2) return `
    <div class="form-grid">
      <label class="field"><span>姓名</span><input value="Mock Partner"></label>
      <label class="field"><span>国家</span><select><option>新加坡</option><option>马来西亚</option><option>巴西</option></select></label>
      <label class="field wide"><span>推广渠道类型</span><select><option>社交媒体</option><option>内容网站</option><option>付费投放</option></select></label>
    </div>`;
  if (state.applyStep === 3) return `
    <div class="info-grid">
      <div class="info-item"><span>KYC状态</span><strong>${state.kycDone ? "已通过" : "待完成"}</strong></div>
      <div class="info-item"><span>同步方式</span><strong>读取客户端实名状态</strong></div>
      <div class="info-item wide"><span>流程</span><strong>登录客户端 → 实名认证 → 上传证件 → 审核通过自动同步</strong></div>
    </div><button class="button secondary" type="button" data-action="simulate-kyc" style="margin-top:14px">${state.kycDone ? "已完成" : "模拟完成KYC"}</button>`;
  if (state.applyStep === 4) return `
    <div class="form-grid">
      ${["主协议", "推广行为准则", "客户归属与佣金规则"].map((name, index) => `
        <label class="checkbox-line wide"><input type="checkbox" data-agreement="${index}" ${state.agreements[index] ? "checked" : ""}><span>${name}<button class="button secondary small" type="button" data-action="open-protocol" style="margin-left:8px">查看协议</button></span></label>`).join("")}
    </div>`;
  return `<div class="info-grid"><div class="info-item"><span>申请状态</span>${AFF.helpers.tag(state.applySubmitted ? "待审核" : "处理中")}</div><div class="info-item"><span>审核方</span><strong>运营管理端</strong></div></div>`;
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
