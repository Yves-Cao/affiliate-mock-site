(() => {
  const routes = [
    ["admin-config", "配置中心", "系统配置"],
    ["admin-risk", "风险事件处置", "运营管理"],
    ["admin-review", "人工复核台", "运营管理"],
    ["admin-performance", "ROI与质量看板", "数据统计"]
  ];
  const tabs = {
    "admin-config": [
      ["overview", "配置总览"], ["price", "价格表"], ["tiers", "资格档与里程碑"],
      ["hold", "动态Hold"], ["finance", "保证金 / 税费"], ["country", "国家与主体"],
      ["approval", "审批流"], ["trial", "试算结果"]
    ],
    "admin-risk": [["hard", "硬规则"], ["scored", "评分规则"], ["violation", "违规事件"], ["fraud", "CRM欺诈库"]],
    "admin-review": [["risk", "风险复核"], ["d30", "D+30冻结"], ["appeal", "申诉处理"], ["guarantee", "保证金抵扣"], ["cap", "上限与熔断"]],
    "admin-performance": [["roi", "合作方ROI"], ["quality", "质量看板"], ["guarantee", "保证金覆盖"]]
  };
  const state = {route: "admin-config", tab: "overview", query: "", detail: null};
  const h = value => String(value ?? "-").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const money = value => new Intl.NumberFormat("en-US", {style: "currency", currency: "USD"}).format(value);
  const currentRoute = () => routes.find(item => item[0] === location.hash.slice(1)) || routes[0];

  function navigate(route) { location.hash = route; }
  function toast(message) {
    let node = document.querySelector(".tm-toast");
    if (!node) {
      node = document.createElement("div"); node.className = "tm-toast"; node.setAttribute("role", "status");
      document.body.appendChild(node);
    }
    node.textContent = message; node.classList.add("show");
    clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove("show"), 2200);
  }
  const tag = (value, tone = "info") => `<span class="tm-tag tm-${tone}">${h(value)}</span>`;
  const riskTone = band => ["R4", "R3"].includes(band) ? "danger" : band === "R2" ? "warning" : "info";
  const statusTone = status => ["已生效", "已处置", "通过", "开放"].includes(status) ? "success" : ["草稿", "待处理", "待审批", "待补材料", "接近上限"].includes(status) ? "warning" : "info";

  function filtered(rows, keys) {
    const query = state.query.trim().toLowerCase();
    return query ? rows.filter(row => keys.some(key => String(row[key]).toLowerCase().includes(query))) : rows;
  }

  function stats(items) {
    return `<div class="tm-stats">${items.map(([label, value, hint]) => `<article><span>${h(label)}</span><strong>${h(value)}</strong><small>${h(hint)}</small></article>`).join("")}</div>`;
  }

  function table(columns, rows, detailKey) {
    return `<div class="tm-table-wrap"><table><thead><tr>${columns.map(column => `<th>${h(column.label)}</th>`).join("")}</tr></thead><tbody>${
      rows.length ? rows.map(row => `<tr ${detailKey ? `data-detail="${h(row[detailKey])}"` : ""}>${columns.map(column => `<td class="${column.numeric ? "numeric" : ""}">${column.render ? column.render(row) : h(row[column.key])}</td>`).join("")}</tr>`).join("")
        : `<tr><td colspan="${columns.length}" class="tm-empty">暂无数据</td></tr>`
    }</tbody></table></div>`;
  }

  function configPage() {
    if (state.tab === "price") return table([
      {key: "code", label: "国家代码"}, {key: "country", label: "国家"}, {key: "coefficient", label: "系数"},
      {key: "tier", label: "资格档"}, {key: "price", label: "参考CPA", numeric: true, render: row => money(row.price)},
      {key: "status", label: "状态", render: row => tag(row.status, statusTone(row.status))}
    ], filtered(AFF_ADMIN.prices, ["code", "country", "status", "tier"]), "code");
    if (state.tab === "tiers") return table([
      {key: "tier", label: "资格档"}, {key: "netDeposit", label: "净入金", numeric: true},
      {key: "volume", label: "交易量", numeric: true}, {key: "days", label: "交易日", numeric: true},
      {key: "basePrice", label: "基础价", numeric: true, render: row => money(row.basePrice)},
      {key: "ftdRate", label: "FTD段", render: row => `${row.ftdRate}%`},
      {key: "qftdRate", label: "有效FTD段", render: row => `${row.qftdRate}%`},
      {key: "qualityRate", label: "质量服务段", render: row => `${row.qualityRate}%`}
    ], AFF_ADMIN.tiers, "tier");
    if (state.tab === "hold") return table([
      {key: "band", label: "风险档"}, {key: "baseDays", label: "基础天数", numeric: true},
      {key: "countryAddition", label: "国家档附加", numeric: true}, {key: "paymentAddition", label: "支付档附加", numeric: true},
      {key: "note", label: "处理说明"}
    ], AFF_ADMIN.holdRules, "band");
    if (state.tab === "finance") return table([
      {key: "name", label: "配置项"}, {key: "value", label: "当前值"}, {key: "note", label: "说明"}
    ], AFF_ADMIN.financeRules, "name");
    if (state.tab === "country") return table([
      {key: "code", label: "代码"}, {key: "country", label: "国家"}, {key: "status", label: "状态", render: row => tag(row.status, statusTone(row.status))},
      {key: "entity", label: "开户主体"}, {key: "license", label: "牌照"}, {key: "score", label: "评估得分", numeric: true}, {key: "suggestion", label: "建议"}
    ], AFF_ADMIN.countries, "code");
    if (state.tab === "approval") return table([
      {key: "id", label: "审批ID"}, {key: "subject", label: "变更"}, {key: "submitter", label: "提交人"},
      {key: "flow", label: "会签流"}, {key: "status", label: "状态", render: row => tag(row.status, statusTone(row.status))}, {key: "note", label: "说明"}
    ], AFF_ADMIN.approvals, "id");
    if (state.tab === "trial") return `${stats([
      ["草稿影响", "合格客户 -2.6%", "当前版本对比v1.2草稿"], ["佣金影响", "-$10,200", "有效FTD+质量服务"], ["护栏命中", "3", "国家ZA数量上限"]
    ])}${table([
      {key: "metric", label: "指标"}, {key: "current", label: "当前版本"}, {key: "draft", label: "草稿版本"}, {key: "change", label: "变化"}
    ], AFF_ADMIN.trials)}`;
    return `${stats([
      ["当前版本", "v2026.10.27-P0", "含保证金与税费"], ["待审批草稿", "2", "国家系数与协议"], ["待公告变更", "1", "协议v4"], ["本月变更", "6", "不含未生效草稿"]
    ])}${table([
      {key: "id", label: "配置ID"}, {key: "group", label: "配置组"}, {key: "current", label: "当前值"},
      {key: "draft", label: "草稿值"}, {key: "status", label: "状态", render: row => tag(row.status, statusTone(row.status))},
      {key: "scope", label: "影响范围"}, {key: "effective", label: "生效时间"}, {key: "owners", label: "修改/审批"}
    ], filtered(AFF_ADMIN.configurations, ["id", "group", "current", "draft", "status", "scope", "owners"]), "id")}`;
  }

  function riskPage() {
    const type = {overview: "hard", hard: "hard", scored: "scored", violation: "violation", fraud: "fraud"}[state.tab] || "hard";
    const rows = AFF_ADMIN.risks.filter(row => row.type === type);
    return `${stats([
      ["今日事件", "126", "较昨日 +12"], ["硬规则命中", "18", "不进评分平衡"], ["待确认集群", "4", "设备/IP/支付/KYC"], ["CRM欺诈库命中", "9", "CRM为唯一事实源"]
    ])}${table([
      {key: "id", label: "事件ID"}, {key: "rule", label: "规则"}, {key: "object", label: "对象"},
      {key: "band", label: "风险带", render: row => tag(row.band, riskTone(row.band))},
      {key: "action", label: "建议动作"}, {key: "evidence", label: "证据"},
      {key: "status", label: "状态", render: row => tag(row.status, statusTone(row.status))}
    ], filtered(rows, ["id", "rule", "object", "action", "evidence"]), "id")}`;
  }

  function reviewPage() {
    const rows = state.tab === "overview" ? AFF_ADMIN.reviews : AFF_ADMIN.reviews.filter(row => row.type === state.tab);
    return `${stats([
      ["待处理", "38", "含队列与申诉"], ["超时", "2", "按任务SLA"], ["今日已处理", "16", "含解除/拒付/冲正"], ["申诉待复核", "5", "不自动解除"]
    ])}${table([
      {key: "id", label: "任务ID"}, {key: "typeName", label: "类型"}, {key: "object", label: "对象"},
      {key: "band", label: "风险带", render: row => tag(row.band, riskTone(row.band))},
      {key: "fundStatus", label: "资金动作", render: row => tag(row.fundStatus, ["冲正", "拒付"].includes(row.fundStatus) ? "danger" : "warning")},
      {key: "reason", label: "原因"}, {key: "status", label: "状态", render: row => tag(row.status, statusTone(row.status))}
    ], filtered(rows, ["id", "typeName", "object", "reason", "status"]), "id")}`;
  }

  function performancePage() {
    return `${stats([
      ["有效客户获客成本", money(178), "目标值后台配置"], ["有效FTD达成率", "72.4%", "有效FTD / FTD"],
      ["质量服务达成率", "81.6%", "质量服务 / 有效FTD"], ["保证金覆盖率", "18%", "滚动保证金 / 近90日佣金"]
    ])}${table([
      {key: "partner", label: "合作方"}, {key: "country", label: "国家"}, {key: "subId", label: "Sub ID"},
      {key: "clicks", label: "点击", numeric: true}, {key: "registrations", label: "注册", numeric: true},
      {key: "ftd", label: "FTD", numeric: true}, {key: "effective", label: "有效FTD", numeric: true},
      {key: "quality", label: "质量服务", numeric: true}, {key: "paid", label: "已付佣金", numeric: true, render: row => money(row.paid)},
      {key: "cac", label: "获客成本", numeric: true, render: row => money(row.cac)},
      {key: "reversal", label: "冲正率"}, {key: "guaranteeCoverage", label: "保证金覆盖"},
      {key: "band", label: "风险带", render: row => tag(row.band, riskTone(row.band))}
    ], filtered(AFF_ADMIN.performance, ["partner", "country", "subId", "band"]), "partner")}`;
  }

  function detail() {
    const [route] = currentRoute();
    const sets = {
      "admin-config": [...AFF_ADMIN.configurations, ...AFF_ADMIN.prices, ...AFF_ADMIN.tiers, ...AFF_ADMIN.holdRules, ...AFF_ADMIN.financeRules, ...AFF_ADMIN.countries, ...AFF_ADMIN.approvals],
      "admin-risk": AFF_ADMIN.risks,
      "admin-review": AFF_ADMIN.reviews,
      "admin-performance": AFF_ADMIN.performance
    };
    const row = sets[route].find(item => String(item.id || item.code || item.partner) === state.detail);
    if (!row) return "";
    return `<div class="tm-overlay" data-close></div><aside class="tm-drawer"><header><div><strong>详情</strong><span>${h(state.detail)}</span></div><button data-close aria-label="关闭">×</button></header>
      <div>${Object.entries(row).map(([key, value]) => `<div class="tm-detail-row"><span>${h(key)}</span><strong>${h(value)}</strong></div>`).join("")}</div>
      <footer><button class="tm-button secondary" data-close>关闭</button><button class="tm-button primary" data-action="review">生成复核任务</button></footer></aside>`;
  }

  function render() {
    const [route, label, group] = currentRoute();
    state.route = route;
    if (!tabs[route].some(([key]) => key === state.tab)) state.tab = tabs[route][0][0];
    document.title = `${label} · Affiliate Admin`;
    const pages = {"admin-config": configPage, "admin-risk": riskPage, "admin-review": reviewPage, "admin-performance": performancePage};
    document.querySelector("#admin-app").innerHTML = `
      <aside class="tm-sidebar"><strong>Affiliate Ops</strong><nav>${routes.map(([id, name]) => `<button class="${id === route ? "active" : ""}" data-route="${id}">${h(name)}</button>`).join("")}</nav><small>Mock Console</small></aside>
      <main class="tm-main"><header class="tm-topbar"><div><button class="tm-nav-button" data-nav aria-label="打开导航">≡</button><span>${h(group)}</span><strong>${h(label)}</strong></div><div class="tm-top-actions"><input data-search value="${h(state.query)}" placeholder="搜索ID / 对象 / 范围" aria-label="搜索"><span class="tm-delay">延迟 42ms</span><span class="tm-user">OP</span></div></header>
      <div class="tm-tabs">${tabs[route].map(([key, name]) => `<button class="${key === state.tab ? "active" : ""}" data-tab="${key}">${h(name)}</button>`).join("")}</div>
      <section class="tm-content"><div class="tm-page-head"><div><h1>${h(label)}</h1><p>P0配置、保证金、税费、审批与风控闭环演示；参数均为参考值。</p></div><div class="tm-head-actions"><button class="tm-button secondary" data-action="draft">保存草稿</button><button class="tm-button primary" data-action="approve">提交审批</button></div></div>${pages[route]()}</section></main>
      ${detail()}`;
  }

  document.addEventListener("click", event => {
    if (event.target.closest("[data-nav]")) return document.body.classList.toggle("tm-nav-open");
    if (!event.target.closest(".tm-sidebar")) document.body.classList.remove("tm-nav-open");
    const routeButton = event.target.closest("[data-route]");
    if (routeButton) return navigate(routeButton.dataset.route);
    const tabButton = event.target.closest("[data-tab]");
    if (tabButton) {state.tab = tabButton.dataset.tab; state.detail = null; return render();}
    const row = event.target.closest("[data-detail]");
    if (row) {state.detail = row.dataset.detail; return render();}
    if (event.target.closest("[data-close]")) {state.detail = null; return render();}
    if (event.target.closest("[data-action='review']")) {state.detail = null; render(); return toast("已生成人工复核任务");}
    if (event.target.closest("[data-action='draft']")) return toast("草稿已保存，护栏校验通过");
    if (event.target.closest("[data-action='approve']")) return toast("已提交审批，生成版本号后定时生效");
  });
  document.addEventListener("input", event => {
    if (!event.target.matches("[data-search]")) return;
    state.query = event.target.value; state.detail = null;
    const focus = document.querySelector("[data-search]"); render(); focus?.focus();
  });
  window.addEventListener("hashchange", () => {state.detail = null; state.tab = tabs[(currentRoute()[0])][0][0]; render();});
  render();
})();
