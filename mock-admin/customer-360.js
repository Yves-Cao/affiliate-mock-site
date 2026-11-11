(() => {
  "use strict";

  const esc = value => String(value ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const money = value => new Intl.NumberFormat("en-US", {style: "currency", currency: "USD", minimumFractionDigits: 2}).format(Number(value || 0));
  const fmt = value => new Intl.NumberFormat("en-US").format(Number(value || 0));
  const statusTone = value => {
    if (["已激活", "已计佣", "已释放", "正常", "已关闭", "无阻断", "已确认"].includes(value)) return "success";
    if (["观察", "待确认", "调查中", "结算中", "复核中", "待处理"].includes(value)) return "warning";
    if (["高风险", "R3", "R4", "冻结", "阻断", "缺数", "冲突"].includes(value)) return "danger";
    return "info";
  };
  const status = value => `<span class="c360-status ${statusTone(value)}">${esc(value)}</span>`;
  const risk = value => `<span class="c360-risk ${String(value).toLowerCase()}">${esc(value)}</span>`;
  const iso = "2026-11-08T09:30:00+08:00";

  const baseCases = [
    {
      commission_case_id: "CC-202611-88231-01",
      settlement_case_id: "SC-202611-88231-01",
      settlement_batch_id: "SB-2026-11-A",
      commission_status: "已计佣",
      settlement_status: "已释放",
      commission_amount: 96,
      settled_amount: 96,
      block_reason: "无阻断",
      risk_signal: "无",
      price_version: "price-v13",
      rule_version: "rule-v11",
      config_version: "cfg-20261101",
      generated_at: "2026-11-06 09:12:07",
      settlement_due_at: "2026-11-20",
      trace_id: "tr-7a3f"
    }
  ];

  const defaultAttribution = {
    registration_id: "REG-88231-01", attribution_id: "ATTR-88231-01", click_id: "CLK-7a3f", link_id: "L-2001", link_url_masked: "go••••/id-2001", sub_id: "siteresia", campaign_ref: "CMP-ID-Q4", campaign_name: "Indonesia Q4", utm_source: "telegram", utm_medium: "affiliate", utm_campaign: "q4-id", utm_content: "creator-14", utm_term: "—", custom_attribution_params: {placement: "creator-14", landing: "lp-02"}, first_touch_at: "2026-11-02 11:18:03", locked_at: "2026-11-02 11:24:21", lock_rule_version: "attr-v7", conflict_code: "—", exclusion_reason: "—"
  };
  const customers = {
    "C-88231": {
      customer_id: "C-88231", country_code: "ID", country_name: "印度尼西亚 / Indonesia",
      crm_customer_status: "已激活", lifecycle_stage: "有效FTD", lifecycle_updated_at: "2026-11-06 09:12:07",
      registered_at: "2026-11-02 11:24:18", email_masked: "r••••@example.test", phone_masked: "+62 •••• 4821",
      partner_id: "AF-1023", partner_name: "Meridian Leads", attribution_status: "已锁定",
      risk_band: "R1", risk_status: "正常", risk_score: 18, open_tasks: 0, cluster_members: 0,
      ftd_count: 1, ftd_amount: 250, valid_ftd_count: 1, valid_ftd_amount: 250,
      data_as_of: iso, last_synced_at: "2026-11-08 09:28:11", cases: baseCases,
      attribution: defaultAttribution,
      path: [
        ["点击", "2026-11-02 11:18:03", "完成", "done"],
        ["注册", "2026-11-02 11:24:18", "完成", "done"],
        ["FTD", "2026-11-06 09:12:04", "完成", "done"],
        ["有效FTD", "2026-11-06 09:12:06", "通过", "done"],
        ["计佣", "2026-11-06 09:12:07", "已生成", "current"],
        ["结算", "2026-11-20", "已释放", "done"]
      ],
      events: [
        ["点击", "Tracking", "成功", "2026-11-02 11:18:03", "tr-7a3f", "首点击归因已记录"],
        ["注册", "CRM", "成功", "2026-11-02 11:24:18", "tr-7a3f", "客户主档创建"],
        ["FTD", "CRM", "成功", "2026-11-06 09:12:04", "tr-7a3f", "CRM确认到账"],
        ["计佣", "Affiliate", "成功", "2026-11-06 09:12:07", "tr-7a3f", "价格与资格快照已锁定"]
      ],
      risks: [], clusters: [], tasks: [], audit: [["2026-11-06 09:12:07", "system", "生成佣金案件", "成功", "tr-7a3f"]]
    },
    "C-88479": {
      customer_id: "C-88479", country_code: "MX", country_name: "墨西哥 / Mexico",
      crm_customer_status: "已激活", lifecycle_stage: "有效FTD", lifecycle_updated_at: "2026-11-06 09:41:08",
      registered_at: "2026-11-05 14:09:38", email_masked: "l••••@example.test", phone_masked: "+52 •••• 9130",
      partner_id: "AF-1023", partner_name: "Meridian Leads", attribution_status: "已锁定",
      risk_band: "R2", risk_status: "观察", risk_score: 44, open_tasks: 1, cluster_members: 3,
      ftd_count: 1, ftd_amount: 350, valid_ftd_count: 1, valid_ftd_amount: 350,
      data_as_of: iso, last_synced_at: "2026-11-08 09:27:42",
      cases: [
        {...baseCases[0], commission_case_id: "CC-202611-88479-01", settlement_case_id: "SC-202611-88479-01", settlement_batch_id: "SB-2026-11-A", commission_amount: 96, settled_amount: 0, settlement_status: "结算中", block_reason: "调查中", risk_signal: "RS-88479-01", generated_at: "2026-11-06 09:41:11", settlement_due_at: "2026-11-21", trace_id: "tr-7a3f"},
        {...baseCases[0], commission_case_id: "CC-202611-88479-02", settlement_case_id: "SC-202611-88479-02", settlement_batch_id: "SB-2026-11-B", commission_amount: 60, settled_amount: 60, settlement_status: "已释放", block_reason: "无阻断", risk_signal: "无", generated_at: "2026-10-26 10:00:05", settlement_due_at: "2026-11-10", trace_id: "tr-8b11"}
      ],
      attribution: {...defaultAttribution},
      path: [["点击", "2026-11-05 14:02:11", "完成", "done"], ["注册", "2026-11-05 14:09:38", "完成", "done"], ["FTD", "2026-11-06 09:12:04", "完成", "done"], ["有效FTD", "2026-11-06 09:41:08", "观察", "current"], ["计佣", "2026-11-06 09:41:11", "已生成", "done"], ["结算", "2026-11-21", "调查中", "blocked"]],
      events: [["点击", "Tracking", "成功", "2026-11-05 14:02:11", "tr-7a3f", "设备与来源已登记"], ["注册", "CRM", "成功", "2026-11-05 14:09:38", "tr-7a3f", "客户主档创建"], ["FTD", "CRM", "成功", "2026-11-06 09:12:04", "tr-7a3f", "CRM确认到账"], ["风险信号", "Affiliate Risk", "观察", "2026-11-06 09:41:09", "tr-7a3f", "同设备关联3个客户"]],
      risks: [["RS-88479-01", "设备关联", "观察中", "2026-11-06 09:41:09", "当前案件 CC-202611-88479-01", "共享设备指纹••8F2A"]], clusters: [["CL-204", "设备 + IP", "4", "观察中", "当前客户及3个关联客户"]], tasks: [["TASK-88479-01", "风险复核", "处理中", "当前案件结算阻断，等待风控结论"]], audit: [["2026-11-06 09:41:11", "system", "生成佣金案件", "成功", "tr-7a3f"], ["2026-11-06 09:41:12", "risk-engine", "创建风险信号", "观察", "tr-7a3f"]]
    },
    "C-88354": {
      customer_id: "C-88354", country_code: "NG", country_name: "尼日利亚 / Nigeria",
      crm_customer_status: "已激活", lifecycle_stage: "有效FTD", lifecycle_updated_at: "2026-11-03 21:50:19",
      registered_at: "2026-11-03 21:50:19", email_masked: "m••••@example.test", phone_masked: "+234 •••• 7720",
      partner_id: "AF-0921", partner_name: "Lagos Partners", attribution_status: "待复核",
      risk_band: "R3", risk_status: "调查中", risk_score: 78, open_tasks: 2, cluster_members: 10,
      ftd_count: 1, ftd_amount: 500, valid_ftd_count: 0, valid_ftd_amount: 0, data_as_of: iso, last_synced_at: "2026-11-08 09:10:09",
      cases: [{...baseCases[0], commission_case_id: "CC-202611-88354-01", settlement_case_id: "SC-202611-88354-01", settlement_batch_id: "SB-2026-11-A", commission_status: "已计佣", settlement_status: "冻结", commission_amount: 96, settled_amount: 0, block_reason: "关键事件缺数", risk_signal: "RS-88354-01", generated_at: "2026-11-03 21:50:23", settlement_due_at: "2026-11-17", trace_id: "tr-9b21"}],
      attribution: {...defaultAttribution, registration_id: "REG-88354-01", attribution_id: "ATTR-88354-01", link_id: "L-2009", sub_id: "ng_bulk"},
      path: [["点击", "2026-11-03 21:44:02", "完成", "done"], ["注册", "2026-11-03 21:50:19", "完成", "done"], ["FTD", "—", "缺数", "missing"], ["有效FTD", "—", "待确认", "missing"], ["计佣", "2026-11-03 21:50:23", "已生成", "current"], ["结算", "2026-11-17", "冻结", "blocked"]],
      events: [["点击", "Tracking", "成功", "2026-11-03 21:44:02", "tr-9b21", "首点击归因已记录"], ["注册", "CRM", "成功", "2026-11-03 21:50:19", "tr-9b21", "客户主档创建"], ["FTD", "CRM", "缺数", "—", "tr-9b21", "CRM事实尚未到达，结算前检查阻断"], ["计佣", "Affiliate", "成功", "2026-11-03 21:50:23", "tr-9b21", "佣金已计算，缺数只阻断结算"]],
      risks: [["RS-88354-01", "关键事件缺数", "已确认", "2026-11-03 21:50:24", "当前案件 CC-202611-88354-01", "FTD事实缺失"]], clusters: [["CL-118", "设备 + IP + 支付工具", "11", "调查中", "客户是当前集群成员"]], tasks: [["TASK-88354-01", "风险复核", "待认领", "R3风险与缺数需要人工核对"], ["TASK-88354-02", "事件补数", "处理中", "CRM FTD事实同步失败"]], audit: [["2026-11-03 21:50:23", "system", "生成佣金案件", "成功", "tr-9b21"], ["2026-11-03 21:50:24", "risk-engine", "创建风险信号", "已确认", "tr-9b21"]]
    },
    "C-88301": {
      customer_id: "C-88301", country_code: "TH", country_name: "泰国 / Thailand",
      crm_customer_status: "已注册", lifecycle_stage: "注册", lifecycle_updated_at: "2026-11-03 16:10:01",
      registered_at: "2026-11-03 16:05:22", email_masked: "t••••@example.test", phone_masked: "+66 •••• 2104",
      partner_id: "AF-1042", partner_name: "Siam Clicks", attribution_status: "已锁定",
      risk_band: "R0", risk_status: "正常", risk_score: 2, open_tasks: 0, cluster_members: 0,
      ftd_count: 0, ftd_amount: 0, valid_ftd_count: 0, valid_ftd_amount: 0, data_as_of: iso, last_synced_at: "2026-11-08 09:26:03",
      cases: [], attribution: {...defaultAttribution, registration_id: "REG-88301-01", attribution_id: "ATTR-88301-01", link_id: "L-2005", sub_id: "fb_th"},
      path: [["点击", "2026-11-03 15:58:11", "完成", "done"], ["注册", "2026-11-03 16:05:22", "完成", "done"], ["FTD", "—", "未发生", "missing"], ["有效FTD", "—", "未发生", "missing"], ["计佣", "—", "未生成", "missing"], ["结算", "—", "未生成", "missing"]],
      events: [["点击", "Tracking", "成功", "2026-11-03 15:58:11", "tr-2c10", "点击已登记"], ["注册", "CRM", "成功", "2026-11-03 16:05:22", "tr-2c10", "客户主档创建"]], risks: [], clusters: [], tasks: [], audit: []
    }
  };

  const fallback = customers["C-88231"];
  const state = {customer: fallback, tab: "overview", caseId: "", scenario: "normal", toast: "", taskCreated: false};

  function parseHash() {
    const raw = (location.hash || "#/customer-360/C-88231").replace(/^#\/?/, "");
    const [path, query] = raw.split("?");
    const parts = path.split("/").filter(Boolean);
    const params = new URLSearchParams(query || "");
    const id = parts[0] === "customer-360" ? parts[1] : "C-88231";
    return {id, tab: params.get("tab") || "overview", caseId: params.get("commission_case_id") || "", scenario: params.get("scenario") || "normal"};
  }
  function scenarioCustomer(customer, scenario) {
    if (scenario === "forbidden") return null;
    if (scenario === "crm-stale") return {...customer, last_synced_at: "2026-11-04 10:12:09", stale: true};
    if (scenario === "partial-failure") return {...customer, partialFailure: "风险与关联"};
    if (scenario === "no-case") return {...customer, cases: [], open_tasks: 0};
    return customer;
  }
  function currentCase() {
    const list = state.customer?.cases || [];
    return list.find(item => item.commission_case_id === state.caseId) || list.find(item => item.settlement_status === "结算中" || item.settlement_status === "冻结") || list[0] || null;
  }
  function setHash(patch = {}) {
    const current = parseHash();
    const id = patch.id || current.id;
    const tab = patch.tab || current.tab || "overview";
    const params = new URLSearchParams();
    const caseId = patch.caseId === undefined ? current.caseId : patch.caseId;
    const scenario = patch.scenario === undefined ? current.scenario : patch.scenario;
    if (tab !== "overview") params.set("tab", tab);
    if (caseId) params.set("commission_case_id", caseId);
    if (scenario && scenario !== "normal") params.set("scenario", scenario);
    location.hash = `#/customer-360/${encodeURIComponent(id)}${params.toString() ? `?${params.toString()}` : ""}`;
  }
  function toast(message) {
    state.toast = message;
    render();
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => { state.toast = ""; render(); }, 2200);
  }
  function linked(text) { return `<button class="c360-link" data-copy="${esc(text)}" title="复制 ${esc(text)}">${esc(text)}</button>`; }
  function kv(pairs) { return `<dl class="c360-kv">${pairs.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`).join("")}</dl>`; }
  function customerSummary(customer, selected) {
    return `<section class="c360-card">
      <div class="c360-summary">
        <div class="c360-summary-block"><div class="c360-summary-title"><strong>身份摘要</strong><small>CRM事实源</small></div>${kv([
          ["客户编号", linked(customer.customer_id)], ["CRM客户状态", status(customer.crm_customer_status)], ["国家/地区", esc(customer.country_code + " · " + customer.country_name)],
          ["注册时间", esc(customer.registered_at)], ["联系邮箱", esc(customer.email_masked)], ["联系手机号", esc(customer.phone_masked)]
        ])}</div>
        <div class="c360-summary-block"><div class="c360-summary-title"><strong>归属摘要</strong><small>Affiliate归属事实</small></div>${kv([
          ["合作方", linked(customer.partner_id + " · " + customer.partner_name)], ["归属状态", status(customer.attribution_status)], ["风险档", risk(customer.risk_band)], ["当前案件", selected ? status(selected.settlement_status) : `<span class="c360-status neutral">无案件</span>`]
        ])}</div>
        <div class="c360-summary-block"><div class="c360-summary-title"><strong>关键指标</strong><small>客户全生命周期</small></div><div class="c360-metrics">
          <div class="c360-metric"><small>FTD</small><strong>${customer.ftd_count} / ${money(customer.ftd_amount)}</strong><em>CRM确认到账</em></div>
          <div class="c360-metric"><small>有效FTD</small><strong>${customer.valid_ftd_count} / ${money(customer.valid_ftd_amount)}</strong><em>${customer.valid_ftd_count ? "资格已确认" : "待确认"}</em></div>
          <div class="c360-metric"><small>佣金案件</small><strong>${customer.cases.length}</strong><em>客户全生命周期</em></div>
          <div class="c360-metric"><small>开放风险任务</small><strong>${customer.open_tasks}</strong><em>open / processing</em></div>
          <div class="c360-metric"><small>集群关联</small><strong>${customer.cluster_members}</strong><em>有效集群成员</em></div>
        </div></div>
      </div>
    </section>`;
  }
  function caseBar(customer, selected) {
    const cases = customer.cases || [];
    return `<section class="c360-card c360-casebar"><label for="c360-case">案件上下文</label><select id="c360-case" data-case-select ${cases.length ? "" : "disabled"}><option value="">${cases.length ? "默认案件（最新未关闭）" : "暂无佣金案件"}</option>${cases.map(item => `<option value="${esc(item.commission_case_id)}" ${selected?.commission_case_id === item.commission_case_id ? "selected" : ""}>${esc(item.commission_case_id)} · ${esc(item.settlement_status)} · ${money(item.commission_amount)}</option>`).join("")}</select>${selected ? `<span class="c360-case-triple">冻结/申诉/风险绑定 <code>${esc(customer.customer_id)}</code> + <code>${esc(selected.commission_case_id)}</code> + <code>${esc(selected.settlement_case_id)}</code></span>` : `<span class="c360-case-triple">本客户暂无佣金案件，显示注册和事件事实。</span>`}</section>`;
  }
  function tabs() {
    const items = [["overview", "概览"], ["attribution", "归属与转化"], ["finance", "佣金与结算"], ["risk", "风险与关联"], ["events", "事件时间线"]];
    return `<nav class="c360-tabs" role="tablist">${items.map(([id, label]) => `<button type="button" class="${state.tab === id ? "active" : ""}" data-tab="${id}" role="tab" aria-selected="${state.tab === id}">${label}</button>`).join("")}</nav>`;
  }
  function overview(customer, selected) {
    const path = customer.path || [];
    return `<div class="c360-grid">
      <section class="c360-card"><div class="c360-card-head"><div><h2>生命周期与转化</h2><p>最近阶段：${esc(customer.lifecycle_stage)} · ${esc(customer.lifecycle_updated_at)}</p></div>${status(customer.lifecycle_stage)}</div><div class="c360-path">${path.map(([name, time, desc, tone]) => `<div class="c360-path-step ${tone}"><strong>${esc(name)}</strong><small>${esc(desc)}</small><small>${esc(time)}</small></div>`).join("")}</div><div class="c360-note">转化路径按客户全生命周期展示；案件级冻结只影响当前案件，不扩展到其他案件。</div></section>
      <section class="c360-card"><div class="c360-card-head"><div><h2>当前案件摘要</h2><p>仅显示选中案件的资金影响</p></div>${selected ? status(selected.settlement_status) : ""}</div>${selected ? kv([["佣金案件", linked(selected.commission_case_id)], ["结算案件", linked(selected.settlement_case_id)], ["佣金状态", status(selected.commission_status)], ["结算状态", status(selected.settlement_status)], ["佣金金额", esc(money(selected.commission_amount))], ["阻断原因", status(selected.block_reason)], ["风险信号", esc(selected.risk_signal)], ["TraceId", linked(selected.trace_id)]]) : `<div class="c360-empty"><strong>暂无佣金案件</strong>客户仍可查看CRM资料、归属与事件事实。</div>`}</section>
      <section class="c360-card"><div class="c360-card-head"><div><h2>风险与人工任务</h2><p>风险结论与处置动作分离</p></div>${risk(customer.risk_band)}</div>${customer.risks?.length ? customer.risks.map(item => `<div class="c360-task"><div><strong>${esc(item[0])} · ${esc(item[1])}</strong><small>${esc(item[3])} · ${esc(item[4])}</small></div>${status(item[2])}</div>`).join("") : `<div class="c360-empty"><strong>暂无活动风险事件</strong>当前客户没有开放风险信号。</div>`}${customer.tasks?.length ? `<div class="c360-task-list">${customer.tasks.map(task => `<div class="c360-task"><div><strong>${esc(task[0])} · ${esc(task[1])}</strong><small>${esc(task[3])}</small></div>${status(task[2])}</div>`).join("")}</div>` : ""}</section>
    </div>`;
  }
  function attribution(customer) {
    const a = customer.attribution || {};
    const primary = [
      ["注册编号", linked(a.registration_id)],
      ["归属编号", linked(a.attribution_id)],
      ["合作方", linked(customer.partner_id + " · " + customer.partner_name)],
      ["推广链接", esc(a.link_id + " · " + a.link_url_masked)],
      ["Sub ID", linked(a.sub_id)],
      ["活动", esc(a.campaign_ref + " · " + a.campaign_name)],
      ["首次点击", esc(a.first_touch_at + " · " + a.click_id)],
      ["归属锁定", esc(a.locked_at + " · " + a.lock_rule_version)],
      ["冲突/排除", esc(a.conflict_code || "—")],
      ["排除原因", esc(a.exclusion_reason || "—")]
    ];
    const params = [
      ["utm_source", esc(a.utm_source)],
      ["utm_medium", esc(a.utm_medium)],
      ["utm_campaign", esc(a.utm_campaign)],
      ["utm_content", esc(a.utm_content)],
      ["utm_term", esc(a.utm_term)],
      ["自定义参数", esc(JSON.stringify(a.custom_attribution_params || {}))]
    ];
    return `<div class="c360-grid"><section class="c360-card"><div class="c360-card-head"><div><h2>注册与归属锁定</h2><p>原始参数保留，标准化字段可追溯</p></div>${status(customer.attribution_status)}</div>${kv(primary)}</section>
      <section class="c360-card"><div class="c360-card-head"><div><h2>UTM 与自定义参数</h2><p>来自CRM注册归因表/视图</p></div></div>${kv(params)}<div class="c360-note">邮箱、手机号、完整链接和原始敏感证据均保持脱敏；本页不修改CRM归属事实。</div></section></div>`;
  }
  function finance(customer) {
    const cases = customer.cases || [];
    return `<section class="c360-card"><div class="c360-card-head"><div><h2>客户案件与结算状态</h2><p>结算批次只作聚合上下文，不代表整批冻结</p></div><small>${cases.length} 笔案件</small></div>${cases.length ? `<div class="c360-table-wrap"><table class="c360-table"><thead><tr><th>佣金案件</th><th>结算案件</th><th>结算批次</th><th>计佣状态</th><th>结算状态</th><th class="right">佣金金额</th><th class="right">已结算</th><th>阻断原因</th><th>配置快照</th></tr></thead><tbody>${cases.map(item => `<tr><td>${linked(item.commission_case_id)}</td><td>${linked(item.settlement_case_id)}</td><td>${esc(item.settlement_batch_id)}<br><small>仅聚合</small></td><td>${status(item.commission_status)}</td><td>${status(item.settlement_status)}</td><td class="right">${esc(money(item.commission_amount))}</td><td class="right">${esc(money(item.settled_amount))}</td><td>${status(item.block_reason)}</td><td>${esc(item.price_version + " / " + item.rule_version)}</td></tr>`).join("")}</tbody></table></div>${cases.some(item => item.block_reason !== "无阻断") ? `<div class="c360-notice danger"><span>!</span><div>当前案件存在结算影响。冻结对象严格绑定客户、佣金案件和结算案件三元组；批次金额仅作聚合展示。</div></div>` : ""}` : `<div class="c360-empty"><strong>暂无佣金案件</strong>没有可展示的计佣或结算记录。</div>`}</section>`;
  }
  function riskPanel(customer, selected) {
    if (customer.partialFailure === "风险与关联") return `<section class="c360-notice danger"><span>!</span><div><strong>RISK_DOMAIN_PARTIAL_FAILURE</strong><br>风险与关联数据加载失败，已保留客户摘要和案件上下文。traceId: <code>trace-c360-risk-884</code><br><button class="c360-btn secondary" data-retry-risk>重试风险区块</button></div></section>`;
    return `<div class="c360-grid"><section class="c360-card"><div class="c360-card-head"><div><h2>当前风险快照</h2><p>风险档、分数和案件状态分开显示</p></div>${risk(customer.risk_band)}</div>${kv([["风险分数", esc(customer.risk_score + " / 100")], ["风险档", risk(customer.risk_band)], ["风险状态", status(customer.risk_status)], ["计算时间", esc(customer.lifecycle_updated_at)], ["当前案件", selected ? linked(selected.commission_case_id) : esc("—")], ["CRM欺诈引用", customer.risk_band === "R3" ? status("已引用") : esc("无")]])}<div class="c360-note">CRM欺诈事实只读引用，本系统不展示原始敏感证据，也不在本页直接改变风险结论。</div></section>
      <section class="c360-card"><div class="c360-card-head"><div><h2>风险事件与关联集群</h2><p>证据摘要默认脱敏</p></div><small>${customer.cluster_members} 个关联成员</small></div>${customer.risks?.length ? `<div class="c360-task-list">${customer.risks.map(item => `<div class="c360-task"><div><strong>${esc(item[0])} · ${esc(item[1])}</strong><small>${esc(item[3])} · ${esc(item[4])} · ${esc(item[5])}</small></div>${status(item[2])}</div>`).join("")}</div>` : `<div class="c360-empty"><strong>暂无风险事件</strong>当前客户没有风险信号。</div>`}${customer.clusters?.length ? `<div class="c360-task-list" style="margin-top:10px">${customer.clusters.map(item => `<div class="c360-task"><div><strong>${esc(item[0])} · ${esc(item[1])}</strong><small>${esc(item[2])} 个成员 · ${esc(item[4])}</small></div>${status(item[3])}</div>`).join("")}</div>` : ""}</section>
      <section class="c360-card"><div class="c360-card-head"><div><h2>风险复核任务</h2><p>唯一业务动作：按权限生成任务</p></div><button class="c360-btn primary" data-create-task ${state.taskCreated ? "disabled" : ""}>${state.taskCreated ? "已生成任务" : "生成风险复核任务"}</button></div>${customer.tasks?.length ? customer.tasks.map(task => `<div class="c360-task"><div><strong>${esc(task[0])} · ${esc(task[1])}</strong><small>${esc(task[3])}</small></div>${status(task[2])}</div>`).join("") : `<div class="c360-empty"><strong>暂无开放任务</strong>生成任务后会进入风险复核队列并写入审计。</div>`}</section>
    </div>`;
  }
  function events(customer) {
    return `<div class="c360-grid"><section class="c360-card"><div class="c360-card-head"><div><h2>事件时间线</h2><p>按服务端时间展示，TraceId可复制</p></div><small>${customer.events?.length || 0} 个事件</small></div>${customer.events?.length ? `<div class="c360-timeline">${customer.events.map(item => `<div class="c360-event ${item[2] === "成功" ? "done" : item[2] === "缺数" ? "missing" : "blocked"}"><span class="c360-dot"></span><div><strong>${esc(item[0])} · ${esc(item[1])} ${status(item[2])}</strong><small>${esc(item[5])} · ${linked(item[4])}</small></div><time>${esc(item[3])}</time></div>`).join("")}</div>` : `<div class="c360-empty"><strong>暂无事件</strong>当前客户没有可展示的事件链。</div>`}</section>
      <section class="c360-card"><div class="c360-card-head"><div><h2>审计引用</h2><p>页面查询和任务动作均保留可追溯记录</p></div></div>${customer.audit?.length ? `<div class="c360-task-list">${customer.audit.map(item => `<div class="c360-task"><div><strong>${esc(item[2])}</strong><small>${esc(item[0])} · ${esc(item[1])} · ${esc(item[4])}</small></div>${status(item[3])}</div>`).join("")}</div>` : `<div class="c360-empty"><strong>暂无页面审计记录</strong>客户事实仍来自CRM和Affiliate事件链。</div>`}</section></div>`;
  }
  function body(customer, selected) {
    if (state.tab === "overview") return overview(customer, selected);
    if (state.tab === "attribution") return attribution(customer);
    if (state.tab === "finance") return finance(customer);
    if (state.tab === "risk") return riskPanel(customer, selected);
    return events(customer);
  }
  function shell(customer, selected) {
    const freshNotice = customer.stale ? `<div class="c360-notice warn"><span>!</span><div>CRM数据同步已过期：最近同步 ${esc(customer.last_synced_at)}。页面保留最近成功快照，禁止把过期数据当作最新事实。</div></div>` : "";
    const blockNotice = selected && selected.block_reason !== "无阻断" ? `<div class="c360-notice danger"><span>!</span><div><strong>当前案件存在结算影响 · ${esc(selected.block_reason)}</strong><br>影响对象：${esc(customer.customer_id)} + ${esc(selected.commission_case_id)} + ${esc(selected.settlement_case_id)}。批次 ${esc(selected.settlement_batch_id)} 只作聚合上下文。</div></div>` : "";
    return `<div class="c360-frame">
      <header class="c360-topbar"><div class="c360-brand"><strong>Affiliate Ops</strong><span>TradeMaster风格 · 客户与归因</span></div><div class="c360-topbar-spacer"></div><div class="c360-topbar-meta"><span>系统 2026-11-08 09:30 UTC+0</span><span>本地 17:30 UTC+8</span><span>延迟 42ms</span><button class="c360-top-icon" title="通知">♧</button><span class="c360-user"><i>运</i><span>运营</span></span></div></header>
      <aside class="c360-aside"><div class="c360-space"><small>工作空间</small><strong>Affiliate 运营</strong></div><nav><div class="c360-nav-group"><span>工作台</span><button class="c360-nav-item">工作台</button></div><div class="c360-nav-group"><span>客户与归因</span><button class="c360-nav-item active">客户列表</button><button class="c360-nav-item">归属管理</button><button class="c360-nav-item">事件流水</button></div><div class="c360-nav-group"><span>风控</span><button class="c360-nav-item">风险工作台</button><button class="c360-nav-item">一般工单</button></div><div class="c360-nav-group"><span>财务</span><button class="c360-nav-item">佣金记录</button><button class="c360-nav-item">结算单</button></div></nav></aside>
      <main class="c360-main"><div class="c360-breadcrumb"><span>客户与归因</span><i>/</i><button class="c360-link" data-back>客户列表</button><i>/</i><strong>客户360</strong><i>/</i><strong>${esc(customer.customer_id)}</strong></div>
        <section class="c360-page-head"><div><h1>${esc(customer.customer_id)} <span class="c360-status ${statusTone(customer.crm_customer_status)}">${esc(customer.crm_customer_status)}</span></h1><p>客户360 · 只读查询与案件关联工作台 · 数据截至 ${esc(customer.data_as_of)}</p></div><div class="c360-head-actions"><select class="c360-select" data-scenario aria-label="演示场景">${["normal","crm-stale","partial-failure","no-case","forbidden"].map(item => `<option value="${item}" ${state.scenario === item ? "selected" : ""}>${item === "normal" ? "正常" : item === "crm-stale" ? "CRM同步过期" : item === "partial-failure" ? "风险区块局部失败" : item === "no-case" ? "无案件" : "Forbidden"}</option>`).join("")}</select><button class="c360-btn secondary" data-refresh>刷新</button><button class="c360-btn ghost" data-back>返回客户列表</button></div></section>
        ${freshNotice}${blockNotice}${customerSummary(customer, selected)}${caseBar(customer, selected)}${tabs()}${body(customer, selected)}<footer class="c360-footer">Affiliate Ops · Mock合成脱敏数据 · 只读页面 · API目标：/admin/customers/${esc(customer.customer_id)}/360</footer>
      </main>${state.toast ? `<div class="c360-toast">${esc(state.toast)}</div>` : ""}
    </div>`;
  }
  function render() {
    const parsed = parseHash();
    state.tab = ["overview", "attribution", "finance", "risk", "events"].includes(parsed.tab) ? parsed.tab : "overview";
    state.scenario = parsed.scenario;
    const source = customers[parsed.id] || fallback;
    state.customer = scenarioCustomer(source, state.scenario);
    if (!state.customer) {
      document.querySelector("#customer-360-app").innerHTML = `<div class="c360-frame"><main class="c360-main" style="grid-column:1/-1"><div class="c360-page-head"><div><h1>无法访问客户360</h1><p>FORBIDDEN · 当前角色无权访问客户360或客户不存在。</p></div><button class="c360-btn secondary" data-back>返回客户列表</button></div><div class="c360-notice danger"><span>!</span><div>错误码：FORBIDDEN<br>traceId：trace-c360-forbidden-001</div></div></main></div>`;
      return;
    }
    const selected = currentCase();
    document.querySelector("#customer-360-app").innerHTML = shell(state.customer, selected);
  }

  document.addEventListener("click", event => {
    const tab = event.target.closest("[data-tab]");
    if (tab) return setHash({tab: tab.dataset.tab});
    const back = event.target.closest("[data-back]");
    if (back) return window.location.href = "./admin-dev.html#/admin-modules/client-list";
    const copy = event.target.closest("[data-copy]");
    if (copy) { navigator.clipboard?.writeText(copy.dataset.copy); return toast(`已复制 ${copy.dataset.copy}`); }
    if (event.target.closest("[data-refresh]")) return toast("已刷新客户360数据");
    if (event.target.closest("[data-retry-risk]")) { state.customer.partialFailure = ""; return render(); }
    if (event.target.closest("[data-create-task]")) {
      if (state.taskCreated) return;
      state.taskCreated = true;
      state.customer.open_tasks += 1;
      state.customer.tasks = [...(state.customer.tasks || []), ["TASK-NEW-884", "风险复核", "待认领", "由客户360生成 · 已写入审计"]];
      state.customer.audit = [["2026-11-08 17:30:00", "operations", "生成风险复核任务", "成功", "trace-c360-task-001"], ...(state.customer.audit || [])];
      return toast("已生成风险复核任务 · 已写入审计");
    }
  });
  document.addEventListener("change", event => {
    if (event.target.matches("[data-case-select]")) return setHash({caseId: event.target.value});
    if (event.target.matches("[data-scenario]")) return setHash({scenario: event.target.value, tab: state.tab});
  });
  window.addEventListener("hashchange", render);
  render();
})();
