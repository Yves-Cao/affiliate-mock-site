AFF.postbacks = (() => {
  const platforms = [
    { id: "custom", name: "自定义平台", en: "Custom platform" },
    { id: "binom", name: "Binom" },
    { id: "redtrack", name: "RedTrack" },
    { id: "voluum", name: "Voluum" },
    { id: "keitaro", name: "Keitaro" },
    { id: "affise", name: "Affise" },
    { id: "peerclick", name: "PeerClick" },
    { id: "bemob", name: "BeMob" },
    { id: "trackier", name: "Trackier" },
    { id: "funnelflux", name: "FunnelFlux" }
  ];
  const events = [
    ["registration", "注册", "Registration"],
    ["kyc_completed", "KYC完成", "KYC completed"],
    ["ftd_reached", "FTD达成", "FTD reached"],
    ["qualified_ftd", "有效FTD确认", "Valid FTD confirmed"],
    ["quality_service", "质量服务确认", "Quality service confirmed"],
    ["commission_status", "佣金状态变更", "Commission status changed"],
    ["commission_rejected", "佣金拒付", "Commission rejected"],
    ["commission_clawback", "佣金冲正", "Commission clawback"]
  ];
  const systemTokens = ["aff_cid", "aff_client", "aff_value"];
  const sensitiveKey = /^(email|phone|mobile|telephone|password|secret|token|api_key|address)$/i;
  let draft = null;
  let errors = {};
  let testContext = null;
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const h = value => AFF.helpers.h(value);
  const platformLabel = value => {
    const platform = platforms.find(item => item.id === value) || platforms[0];
    return t(platform.name, platform.en || platform.name);
  };
  const now = () => new Date().toLocaleString("sv-SE", { timeZone: "Asia/Shanghai", hour12: false });
  const id = prefix => `${prefix}-${crypto.randomUUID()}`;
  const eventLabel = value => {
    const item = events.find(event => event[0] === value);
    return item ? t(item[1], item[2]) : value;
  };
  const standardParameters = (event = "commission_status") => [
    { key: "clickid", value: "{clickid}" },
    { key: "event_id", value: "{aff_cid}" },
    ...["quality_service", "commission_status", "commission_rejected", "commission_clawback"].includes(event)
      ? [{ key: "amount", value: "{aff_value}" }] : []
  ];

  function state() {
    if (!AFF.state.postbacks || AFF.state.postbacks.schemaVersion !== 2) {
      AFF.state.postbacks = {
        schemaVersion: 2,
        tab: "configs",
        logPage: 1,
        filters: { config: "", event: "", result: "" },
        configs: AFF.trackers.map((row, index) => {
          const config = {
            id: row.id,
            platform: "custom",
            name: index === 0 ? "注册事件回传" : "佣金获批回传",
            event: index === 0 ? "registration" : "commission_status",
            mode: "generated",
            clickUrl: "https://track.example.com/click?clickid=demo_click_001&utm_source=telegram",
            endpoint: "https://tracker.example.com/postback",
            parameters: standardParameters(index === 0 ? "registration" : "commission_status"),
            manualUrl: "",
            status: row.status,
            updatedAt: row.updatedAt,
            version: 1
          };
          config.callbackUrl = template(config);
          return config;
        }),
        logs: []
      };
    }
    return AFF.state.postbacks;
  }

  function clickParameters(value) {
    try {
      const url = new URL(value);
      return [...new Set(url.searchParams.keys())]
        .filter(key => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && !sensitiveKey.test(key));
    } catch {
      return [];
    }
  }

  function tokens(config) {
    return [...new Set([...systemTokens, "clickid", ...clickParameters(config.clickUrl)])];
  }

  function template(config) {
    if (config.mode === "manual") return config.manualUrl.trim();
    try {
      const url = new URL(config.endpoint);
      for (const parameter of config.parameters) {
        if (parameter.key) url.searchParams.set(parameter.key, parameter.value);
      }
      return url.href.replace(/%7B/gi, "{").replace(/%7D/gi, "}");
    } catch {
      return "";
    }
  }

  function receiverError(value, supportedTokens) {
    if (!value || /[\s\\]/.test(value)) return t("请输入有效的HTTPS接收地址", "Enter a valid HTTPS receiver URL");
    if (/{{|}}|#[^?]*|%7b|%7d/i.test(value)) {
      return t("使用单层 {变量名}，地址不能包含片段或编码后的占位符", "Use single {token} placeholders without fragments or encoded braces");
    }
    const remaining = value.replace(/{[A-Za-z_][A-Za-z0-9_]*}/g, "");
    if (/[{}]/.test(remaining)) return t("占位符格式不完整", "A placeholder is malformed");
    const macros = [...value.matchAll(/{([A-Za-z_][A-Za-z0-9_]*)}/g)].map(match => match[1]);
    if (macros.some(macro => !supportedTokens.includes(macro))) {
      return t("存在不支持的变量，请核对点击URL与系统参数", "Unsupported token; check the click URL and system parameters");
    }
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase().replace(/\.$/, "");
      if (url.protocol !== "https:" || url.username || url.password || url.hash) {
        return t("接收地址必须为HTTPS，且不能带账号密码或片段", "Use HTTPS without credentials or a fragment");
      }
      if (!host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") ||
        /(^|\.)(localhost|local|internal|lan|home|test)$/.test(host)) {
        return t("接收地址需使用公网域名", "Use a public domain for the receiver URL");
      }
      if (/[{}]/.test(value.split("?")[0])) {
        return t("变量只能放在查询参数值中", "Tokens are allowed only in query parameter values");
      }
      const seenKeys = new Set();
      for (const [key] of url.searchParams) {
        if (/[{}]/.test(key) || sensitiveKey.test(key)) {
          return t("参数名称不能含变量或敏感信息字段", "Parameter names cannot contain tokens or sensitive fields");
        }
        if (seenKeys.has(key)) return t("接收字段名不能重复", "Receiver field names must be unique");
        seenKeys.add(key);
      }
      return "";
    } catch {
      return t("接收地址格式不正确", "The receiver URL is invalid");
    }
  }

  function validate(config) {
    const result = {};
    if (!config.name.trim()) result.name = t("请输入追踪器名称", "Enter a tracker name");
    if (!platforms.some(platform => platform.id === (config.platform || "custom"))) {
      result.platform = t("请选择回传平台", "Select a postback platform");
    }
    if (!events.some(item => item[0] === config.event)) result.event = t("请选择回传事件", "Select an event");
    if (config.clickUrl.trim()) {
      try {
        const clickUrl = new URL(config.clickUrl);
        if (!["http:", "https:"].includes(clickUrl.protocol) || clickUrl.username || clickUrl.password) throw new Error();
        if ([...clickUrl.searchParams.keys()].some(key => sensitiveKey.test(key))) {
          result.clickUrl = t("点击URL不得包含邮箱、手机号或密钥字段", "Do not include contact details or secrets in the click URL");
        }
      } catch {
        result.clickUrl = t("点击URL格式不正确", "The click URL is invalid");
      }
    }
    if (config.mode === "generated") {
      const seen = new Set();
      let endpointKeys = [];
      try { endpointKeys = [...new URL(config.endpoint).searchParams.keys()]; } catch {}
      config.parameters.forEach((parameter, index) => {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(parameter.key) || sensitiveKey.test(parameter.key)) {
          result[`parameter-${index}`] = t("填写有效的接收字段名", "Enter a valid receiver field name");
        } else if (seen.has(parameter.key) || endpointKeys.includes(parameter.key)) {
          result[`parameter-${index}`] = t("接收字段名不能重复", "Receiver field names must be unique");
        } else if (!parameter.value) {
          result[`parameter-${index}`] = t("请选择来源变量", "Select a source token");
        }
        seen.add(parameter.key);
      });
      const endpointProblem = receiverError(config.endpoint, []);
      if (endpointProblem) result.endpoint = endpointProblem;
    }
    const problem = receiverError(template(config), tokens(config));
    if (problem) result[config.mode === "manual" ? "manualUrl" : "endpoint"] = problem;
    return result;
  }

  function sample(config, eventId = id("EVT")) {
    const values = {
      aff_cid: eventId,
      aff_client: "CLIENT-DEMO-1001",
      aff_value: ["quality_service", "commission_status", "commission_rejected", "commission_clawback"].includes(config.event) ? "100.00" : "1",
      clickid: "demo_click_001"
    };
    for (const key of clickParameters(config.clickUrl)) {
      if (!(key in values)) values[key] = `demo_${key}`;
    }
    return {
      eventId,
      clickId: values.clickid,
      clientId: values.aff_client,
      requestUrl: template(config).replace(/{([A-Za-z_][A-Za-z0-9_]*)}/g, (_, key) => encodeURIComponent(values[key] || "")),
      value: values.aff_value
    };
  }

  function icon(name) {
    const paths = {
      add: '<path d="M12 5v14M5 12h14"/>',
      edit: '<path d="m16 3 5 5-12 12-6 1 1-6zM14 5l5 5"/>',
      copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
      play: '<path d="m8 4 12 8-12 8z"/>',
      pause: '<path d="M8 4v16M16 4v16"/>',
      test: '<path d="M9 3h6M10 3v6L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3M8 14h8"/>',
      retry: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',
      detail: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
      remove: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',
      connect: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M5 7v10M7 6l10 12M7 18 17 6"/>',
      chevron: '<path d="m9 5 7 7-7 7"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.detail}</svg>`;
  }

  function iconButton(action, label, iconName, attrs = "", tooltip = label) {
    return `<button class="button secondary small postback-icon" type="button" data-action="${action}" aria-label="${h(label)}" title="${h(tooltip)}" ${attrs}>${icon(iconName)}</button>`;
  }

  function badge(status) {
    const label = status === "启用" ? t("启用", "Enabled") : t("暂停", "Paused");
    return `<span class="tag tag-${status === "启用" ? "ok" : "warning"}">${label}</span>`;
  }

  function resultBadge(result) {
    return `<span class="tag tag-${result === "success" ? "ok" : "danger"}">${result === "success" ? t("成功", "Success") : result === "timeout" ? t("超时", "Timeout") : t("失败", "Failed")}</span>`;
  }

  function renderConfigs(store) {
    const rows = store.configs.map(config => [
      `<strong>${h(config.name)}</strong><small>${h(platformLabel(config.platform))}</small><small>${h(config.id)}</small>`,
      h(eventLabel(config.event)),
      `<code class="postback-url">${h(config.callbackUrl)}</code>`,
      badge(config.status),
      `${h(config.updatedAt)}<small>${t("版本", "Version")} ${config.version}</small>`,
      `<div class="table-actions">
        ${iconButton("postback-edit", t("编辑", "Edit"), "edit", `data-config-id="${h(config.id)}"`)}
        ${iconButton("postback-copy", t("复制地址", "Copy URL"), "copy", `data-config-id="${h(config.id)}"`)}
        ${iconButton("postback-toggle", config.status === "启用" ? t("暂停", "Pause") : t("启用", "Enable"), config.status === "启用" ? "pause" : "play", `data-config-id="${h(config.id)}"`)}
        ${iconButton("postback-test", t("本地测试", "Local test"), "test", `data-config-id="${h(config.id)}" ${config.status !== "启用" ? "disabled" : ""}`, config.status === "启用" ? t("本地测试", "Local test") : t("请先启用配置后再测试", "Enable this configuration before testing"))}
        ${iconButton("postback-delete", t("删除配置", "Delete configuration"), "remove", `data-config-id="${h(config.id)}"`)}
      </div>`
    ]);
    if (!rows.length) return `<div class="empty-state"><strong>${t("暂无回传配置", "No postback configurations")}</strong><button class="button primary" type="button" data-action="open-tracker-modal">${t("新建回传", "Create postback")}</button></div>`;
    return AFF.helpers.table({
      columns: [t("名称", "Name"), t("回传事件", "Event"), t("接收地址", "Receiver URL"), t("状态", "Status"), t("最近更新 · UTC+8", "Updated · UTC+8"), t("操作", "Actions")],
      rows
    });
  }

  function renderDashboard() {
    const configs = state().configs;
    const platformStatus = platformId => {
      const configured = configs.filter(config => (config.platform || "custom") === platformId);
      if (!configured.length) return "";
      const paused = configured.every(config => config.status !== "启用");
      return `<span class="postback-platform-state ${paused ? "is-paused" : ""}">${paused
        ? t("已暂停", "Paused")
        : t(`已配置 ${configured.length} 项`, `${configured.length} configured`)}</span>`;
    };
    return `<section class="card dashboard-postbacks" aria-label="${t("连接您的广告追踪器", "Connect your ad tracker")}">
      <div class="panel-header">
        <h2>${icon("connect")}${t("连接您的广告追踪器", "Connect your ad tracker")}</h2>
        <button class="postback-manage-link" type="button" data-action="postback-manage">${t("回传配置", "Manage postbacks")}</button>
      </div>
      <button class="postback-custom-platform" type="button" data-action="postback-connect" data-platform-id="custom">
        <span>${t("自定义平台", "Custom platform")}</span>
        ${platformStatus("custom")}${icon("chevron")}
      </button>
      <div class="postback-platforms">
        <h3>${t("广告追踪平台", "Ad tracking platforms")}</h3>
        <div class="postback-platform-grid">${platforms.slice(1).map(platform => `
          <button type="button" class="postback-platform" data-action="postback-connect" data-platform-id="${platform.id}" aria-label="${h(t(`配置 ${platform.name} 回传`, `Configure ${platform.name} postback`))}" title="${h(t(`配置 ${platform.name} 回传`, `Configure ${platform.name} postback`))}">
            <img src="./assets/trackers/${platform.id}.png" alt="${platform.name}" width="126" height="42">
            ${platformStatus(platform.id)}
          </button>`).join("")}</div>
      </div>
    </section>`;
  }

  function renderLogs(store) {
    const filtered = store.logs.filter(log =>
      (!store.filters.config || log.configId === store.filters.config) &&
      (!store.filters.event || log.event === store.filters.event) &&
      (!store.filters.result || log.result === store.filters.result));
    const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
    store.logPage = Math.min(Math.max(1, store.logPage), totalPages);
    const rows = filtered.slice((store.logPage - 1) * 10, store.logPage * 10).map(log => {
      const config = store.configs.find(item => item.id === log.configId);
      const canRetry = log.result !== "success" && config?.status === "启用" && config.version === log.configVersion;
      const retryHint = log.result === "success" ? t("成功记录无需重试", "Successful records do not need retrying")
        : !config ? t("配置已删除，无法重试", "The configuration has been deleted")
        : config.status !== "启用" ? t("请先启用配置后再重试", "Enable this configuration before retrying")
        : config.version !== log.configVersion ? t("配置已更新，请重新测试", "The configuration has changed; run a new test")
        : t("重试", "Retry");
      return [
        `${h(log.updatedAt)}<small>${t("本地测试", "Local test")}</small>`,
        `<strong>${h(log.configName)}</strong><small>${h(log.configId)} · v${log.configVersion}</small>`,
        h(eventLabel(log.event)),
        `<code class="postback-id">${h(log.eventId)}</code>`,
        `${resultBadge(log.result)}<small>${h(log.code)}</small>`,
        h(log.attempts.length),
        `<div class="table-actions">${iconButton("postback-log-detail", t("查看详情", "View details"), "detail", `data-log-id="${h(log.id)}"`)}${iconButton("postback-retry", t("重试", "Retry"), "retry", `data-log-id="${h(log.id)}" ${canRetry ? "" : "disabled"}`, retryHint)}</div>`
      ];
    });
    const configOptions = [...new Map(store.logs.map(log => [log.configId, log.configName])).entries()];
    const select = (key, label, choices) => `<label class="field"><span>${label}</span><select data-postback-filter="${key}" aria-label="${label}"><option value="">${t("全部", "All")}</option>${choices.map(([value, text]) => `<option value="${h(value)}" ${store.filters[key] === value ? "selected" : ""}>${h(text)}</option>`).join("")}</select></label>`;
    return `
      <div class="toolbar postback-filters">
        ${select("config", t("回传配置", "Configuration"), configOptions)}
        ${select("event", t("回传事件", "Event"), events.map(item => [item[0], eventLabel(item[0])]))}
        ${select("result", t("投递结果", "Result"), [["success", t("成功", "Success")], ["failed", t("失败", "Failed")], ["timeout", t("超时", "Timeout")]])}
        <button class="button secondary" type="button" data-action="postback-reset-filters">${t("重置", "Reset")}</button>
      </div>
      ${rows.length ? AFF.helpers.table({ columns: [t("时间 · UTC+8", "Time · UTC+8"), t("配置", "Configuration"), t("事件", "Event"), t("事件ID", "Event ID"), t("结果", "Result"), t("次数", "Attempts"), t("操作", "Actions")], rows }) : `<div class="empty-state"><strong>${t("暂无投递记录", "No delivery records")}</strong><span>${t("本地测试后可在此查看结果", "Local test results will appear here")}</span></div>`}
      <div class="table-footer"><span>${t(`共 ${filtered.length} 条记录`, `${filtered.length} records`)}</span><div class="pagination">
        <button type="button" data-action="postback-log-page" data-page="${store.logPage - 1}" aria-label="${t("上一页", "Previous page")}" ${store.logPage <= 1 ? "disabled" : ""}>‹</button>
        <span>${store.logPage} / ${totalPages}</span>
        <button type="button" data-action="postback-log-page" data-page="${store.logPage + 1}" aria-label="${t("下一页", "Next page")}" ${store.logPage >= totalPages ? "disabled" : ""}>›</button>
      </div></div>`;
  }

  function renderPage() {
    const store = state();
    return `<div class="postback-page">
      <div class="page-actions page-actions-top page-actions-start"><button class="button primary" type="button" data-action="open-tracker-modal">${icon("add")}${t("新建回传", "Create postback")}</button></div>
      ${AFF.helpers.cards([
        { label: t("追踪器总数", "Total trackers"), value: store.configs.length },
        { label: t("启用中", "Enabled"), value: store.configs.filter(config => config.status === "启用").length },
        { label: t("已暂停", "Paused"), value: store.configs.filter(config => config.status !== "启用").length }
      ])}
      <div class="postback-tabs" role="tablist" aria-label="${t("回传视图", "Postback views")}">
        <button type="button" role="tab" aria-selected="${store.tab === "configs"}" data-action="postback-tab" data-tab="configs">${t("回传配置", "Configurations")}</button>
        <button type="button" role="tab" aria-selected="${store.tab === "logs"}" data-action="postback-tab" data-tab="logs">${t("投递记录", "Delivery logs")}<span>${store.logs.length}</span></button>
      </div>
      <section class="card postback-table">${store.tab === "logs" ? renderLogs(store) : renderConfigs(store)}</section>
    </div>`;
  }

  function errorFor(key) {
    return `<p id="postback-error-${key}" class="postback-error" role="alert">${h(errors[key] || "")}</p>`;
  }

  function field(key, label, input) {
    return `<div class="field postback-field"><label for="postback-${key}">${label}</label>${input}${errorFor(key)}</div>`;
  }

  function editorHtml() {
    const title = draft.id ? t("编辑回传", "Edit postback") : t("新建回传", "Create postback");
    const available = tokens(draft);
    return `<div class="modal-card postback-modal">
      <div class="modal-head"><h2>${title}</h2><button class="close-button" type="button" data-action="close-modal" aria-label="${t("关闭", "Close")}">×</button></div>
      <div class="postback-body">
        ${field("platform", t("回传平台", "Postback platform"), `<select id="postback-platform" data-postback-field="platform" aria-describedby="postback-error-platform">${platforms.map(platform => `<option value="${platform.id}" ${(draft.platform || "custom") === platform.id ? "selected" : ""}>${h(platformLabel(platform.id))}</option>`).join("")}</select>`)}
        <div class="postback-form-grid">
          ${field("name", t("追踪器名称", "Tracker name"), `<input id="postback-name" data-postback-field="name" maxlength="80" value="${h(draft.name)}" aria-describedby="postback-error-name" placeholder="${t("输入名称", "Enter a name")}">`)}
          ${field("event", t("回传事件", "Event"), `<select id="postback-event" data-postback-field="event" aria-describedby="postback-error-event">${events.map(item => `<option value="${item[0]}" ${draft.event === item[0] ? "selected" : ""}>${h(eventLabel(item[0]))}</option>`).join("")}<option value="loyal_client" disabled>${t("忠诚客户 · 待开放", "Loyal client · Unavailable")}</option></select>`)}
        </div>
        <div class="postback-tabs postback-mode-tabs" role="tablist" aria-label="${t("配置方式", "Setup mode")}">
          <button type="button" role="tab" aria-selected="${draft.mode === "generated"}" data-action="postback-mode" data-mode="generated">${t("生成回传", "Generate postback")}</button>
          <button type="button" role="tab" aria-selected="${draft.mode === "manual"}" data-action="postback-mode" data-mode="manual">${t("手动设置", "Manual setup")}</button>
        </div>
        ${field("clickUrl", t("点击URL（选填）", "Click URL (optional)"), `<input id="postback-clickUrl" data-postback-field="clickUrl" value="${h(draft.clickUrl)}" placeholder="https://tracker.example.com/click?clickid=123" aria-describedby="postback-error-clickUrl">`)}
        ${draft.mode === "generated" ? `
          ${field("endpoint", t("接收地址", "Receiver URL"), `<input id="postback-endpoint" data-postback-field="endpoint" value="${h(draft.endpoint)}" placeholder="https://tracker.example.com/postback" aria-describedby="postback-error-endpoint">`)}
          <div class="postback-section-label"><h3>${t("参数映射", "Parameter mapping")}</h3><button class="button secondary small" type="button" data-action="postback-add-parameter">${icon("add")}${t("添加参数", "Add parameter")}</button></div>
          <div id="postback-parameters">${draft.parameters.map((parameter, index) => `
            <div class="postback-parameter">
              <div class="field"><label for="postback-key-${index}">${t("接收字段", "Receiver field")}</label><input id="postback-key-${index}" data-postback-key="${index}" value="${h(parameter.key)}" placeholder="clickid" aria-describedby="postback-error-parameter-${index}"></div>
              <div class="field"><label for="postback-value-${index}">${t("来源变量", "Source token")}</label><select id="postback-value-${index}" data-postback-value="${index}" aria-describedby="postback-error-parameter-${index}"><option value="">${t("请选择", "Select")}</option>${[...new Set([...available.map(value => `{${value}}`), parameter.value].filter(Boolean))].map(value => `<option value="${h(value)}" ${parameter.value === value ? "selected" : ""}>${h(value)}</option>`).join("")}</select></div>
              ${iconButton("postback-remove-parameter", t("移除参数", "Remove parameter"), "remove", `data-index="${index}"`)}
              ${errorFor(`parameter-${index}`)}
            </div>`).join("")}</div>
        ` : field("manualUrl", t("回传URL模板", "Postback URL template"), `<textarea id="postback-manualUrl" data-postback-field="manualUrl" rows="4" placeholder="${h(draft.platform && draft.platform !== "custom" ? t(`粘贴 ${platformLabel(draft.platform)} 的接收URL并映射回传变量`, `Paste your ${platformLabel(draft.platform)} receiver URL and map postback tokens`) : "https://tracker.example.com/postback?clickid={clickid}")}" aria-describedby="postback-error-manualUrl">${h(draft.manualUrl)}</textarea>`)}
        <dl class="postback-token-list"><div><dt>{aff_cid}</dt><dd>${t("事件ID", "Event ID")}</dd></div><div><dt>{aff_client}</dt><dd>${t("匿名客户标识", "Anonymous client ID")}</dd></div><div><dt>{aff_value}</dt><dd>${t("事件数值", "Event value")}</dd></div></dl>
        <dl class="postback-details"><div><dt>${t("请求方法", "Request method")}</dt><dd>GET</dd></div></dl>
        <div class="postback-preview"><h3>${t("回传地址预览", "Postback URL preview")}</h3><code id="postback-url-preview">${h(template(draft) || t("填写接收地址后显示", "Enter a receiver URL"))}</code></div>
      </div>
      <div class="drawer-actions postback-footer"><button class="button secondary" type="button" data-action="close-modal">${t("取消", "Cancel")}</button><button class="button primary" type="button" data-action="create-tracker">${t("保存", "Save")}</button></div>
    </div>`;
  }

  function showEditor(focusId = "") {
    showModal(editorHtml(), true, draft.id ? t("编辑回传", "Edit postback") : t("新建回传", "Create postback"));
    if (focusId) document.getElementById(focusId)?.focus();
  }

  function openEditor(configId, platformId = "custom") {
    const config = state().configs.find(item => item.id === configId);
    const platform = platforms.find(item => item.id === platformId) || platforms[0];
    draft = config ? structuredClone(config) : {
      name: platform.id === "custom" ? "" : t(`${platform.name} · 注册回传`, `${platform.name} · Registration postback`),
      platform: platform.id, event: "registration", mode: platform.id === "custom" ? "generated" : "manual", clickUrl: "", endpoint: "",
      parameters: standardParameters("registration"), manualUrl: "", status: "启用"
    };
    errors = {};
    showEditor(!config && platform.id !== "custom" ? "postback-manualUrl" : "postback-name");
  }

  function openConnect(platformId) {
    const platform = platforms.find(item => item.id === platformId);
    if (!platform) return;
    openEditor(undefined, platform.id);
  }

  function save() {
    if (!draft) return;
    errors = validate(draft);
    if (Object.keys(errors).length) {
      showEditor(`postback-${Object.keys(errors)[0]}`);
      return;
    }
    const store = state();
    const previous = store.configs.find(config => config.id === draft.id);
    const saved = {
      ...structuredClone(draft),
      id: draft.id || id("TRK"),
      name: draft.name.trim(),
      callbackUrl: template(draft),
      version: (previous?.version || 0) + 1,
      updatedAt: now()
    };
    if (previous) store.configs[store.configs.indexOf(previous)] = saved;
    else store.configs.unshift(saved);
    draft = null;
    persist();
    closeModal();
    render();
    showToast(t("回传配置已保存", "Postback configuration saved"));
  }

  function testHtml(config, log = null) {
    testContext = { configId: config.id, version: config.version, logId: log?.id || null, sample: log || sample(config) };
    return `<div class="modal-card postback-modal">
      <div class="modal-head"><h2>${log ? t("重试本地测试", "Retry local test") : t("本地测试", "Local test")}</h2><button class="close-button" type="button" data-action="close-modal" aria-label="${t("关闭", "Close")}">×</button></div>
      <div class="postback-body">
        <p class="postback-local-notice">${t("仅生成本地测试结果，不会向接收地址发送请求。", "Generates a local test result without sending a request to the receiver.")}</p>
        <dl class="postback-details"><div><dt>${t("配置", "Configuration")}</dt><dd>${h(config.name)}</dd></div><div><dt>${t("事件", "Event")}</dt><dd>${h(eventLabel(config.event))}</dd></div><div><dt>${t("事件ID", "Event ID")}</dt><dd>${h(testContext.sample.eventId)}</dd></div><div><dt>${t("请求方法", "Request method")}</dt><dd>GET</dd></div></dl>
        <div class="postback-preview"><h3>${t("请求预览", "Request preview")}</h3><code>${h(testContext.sample.requestUrl)}</code></div>
        <div class="field postback-field"><label for="postback-test-result">${t("测试结果", "Test result")}</label><select id="postback-test-result"><option value="success">${t("成功 · HTTP 200", "Success · HTTP 200")}</option><option value="failed">${t("失败 · HTTP 500", "Failed · HTTP 500")}</option><option value="timeout">${t("请求超时", "Request timeout")}</option></select></div>
        <div id="postback-test-output" aria-live="polite"></div>
      </div>
      <div class="drawer-actions postback-footer"><button class="button secondary" type="button" data-action="close-modal">${t("关闭", "Close")}</button><button class="button primary" type="button" data-action="postback-run-test">${t("运行本地测试", "Run local test")}</button></div>
    </div>`;
  }

  function openTest(configId, logId = null) {
    const store = state();
    const config = store.configs.find(item => item.id === configId);
    const log = logId ? store.logs.find(item => item.id === logId) : null;
    if (!config || config.status !== "启用" || (logId && (!log || log.result === "success" || log.configVersion !== config.version))) return;
    showModal(testHtml(config, log), true, t("本地测试", "Local test"));
  }

  function runTest(target) {
    if (!testContext || target.disabled) return;
    const store = state();
    const config = store.configs.find(item => item.id === testContext.configId);
    if (!config || config.status !== "启用" || config.version !== testContext.version) return;
    let log = store.logs.find(item => item.id === testContext.logId);
    if (log && log.result === "success") return;
    const result = document.getElementById("postback-test-result").value;
    const code = result === "success" ? "HTTP 200" : result === "failed" ? "HTTP 500" : "TIMEOUT";
    const reason = result === "success" ? t("本地测试通过", "Local test passed") : result === "failed" ? t("接收服务异常（本地测试）", "Receiver service error (local test)") : t("连接超时（本地测试）", "Connection timeout (local test)");
    if (!log) {
      log = {
        id: id("LOG"), configId: config.id, configName: config.name, configVersion: config.version,
        event: config.event, ...testContext.sample, attempts: []
      };
      store.logs.unshift(log);
    }
    log.result = result;
    log.code = code;
    log.reason = reason;
    log.updatedAt = now();
    log.attempts.push({ at: log.updatedAt, result, code, reason });
    testContext.logId = log.id;
    persist();
    target.disabled = true;
    document.getElementById("postback-test-output").innerHTML = `<div class="postback-test-result">${resultBadge(result)}<strong>${h(code)}</strong><p>${h(reason)}</p><span>${t("尝试次数", "Attempts")}: ${log.attempts.length}</span></div>`;
    render();
    showToast(t("本地测试结果已记录", "Local test result recorded"));
  }

  function openLog(logId) {
    const log = state().logs.find(item => item.id === logId);
    if (!log) return;
    showModal(`<div class="modal-card postback-modal">
      <div class="modal-head"><h2>${t("投递详情", "Delivery details")}</h2><button class="close-button" type="button" data-action="close-modal" aria-label="${t("关闭", "Close")}">×</button></div>
      <div class="postback-body"><p class="postback-local-notice">${t("本地测试记录", "Local test record")}</p>
        <dl class="postback-details">${[
          [t("配置", "Configuration"), `${log.configName} · v${log.configVersion}`],
          [t("回传事件", "Event"), eventLabel(log.event)],
          [t("事件ID", "Event ID"), log.eventId],
          [t("点击ID", "Click ID"), log.clickId],
          [t("匿名客户标识", "Anonymous client ID"), log.clientId],
          [t("请求方法", "Request method"), "GET"],
          [t("响应", "Response"), `${log.code} · ${log.reason}`]
        ].map(([key, value]) => `<div><dt>${h(key)}</dt><dd>${h(value)}</dd></div>`).join("")}</dl>
        <div class="postback-preview"><h3>${t("请求快照", "Request snapshot")}</h3><code>${h(log.requestUrl)}</code></div>
        <h3>${t("尝试记录", "Attempt history")}</h3>
        <ol class="postback-attempts">${log.attempts.map(attempt => `<li><span>${h(attempt.at)}</span>${resultBadge(attempt.result)}<code>${h(attempt.code)}</code></li>`).join("")}</ol>
      </div><div class="drawer-actions postback-footer"><button class="button secondary" type="button" data-action="close-modal">${t("关闭", "Close")}</button></div>
    </div>`, true, t("投递详情", "Delivery details"));
  }

  function updateDraft(event) {
    const target = event.target;
    if (!draft || !target.closest(".postback-modal")) return false;
    if (target.dataset.postbackField) draft[target.dataset.postbackField] = target.value;
    else if (target.dataset.postbackKey !== undefined) draft.parameters[Number(target.dataset.postbackKey)].key = target.value;
    else if (target.dataset.postbackValue !== undefined) draft.parameters[Number(target.dataset.postbackValue)].value = target.value;
    else return false;
    const preview = document.getElementById("postback-url-preview");
    if (preview) preview.textContent = template(draft) || t("填写接收地址后显示", "Enter a receiver URL");
    return true;
  }

  function handleChange(event) {
    const target = event.target;
    if (target.dataset.postbackFilter) {
      const store = state();
      store.filters[target.dataset.postbackFilter] = target.value;
      store.logPage = 1;
      render();
      return true;
    }
    if (updateDraft(event)) {
      if (target.dataset.postbackField === "clickUrl" && draft.mode === "generated") {
        const available = tokens(draft).map(value => `{${value}}`);
        document.querySelectorAll("[data-postback-value]").forEach(select => {
          const value = draft.parameters[Number(select.dataset.postbackValue)].value;
          const options = [...new Set([...available, value].filter(Boolean))];
          select.innerHTML = `<option value="">${t("请选择", "Select")}</option>${options.map(option => `<option value="${h(option)}" ${option === value ? "selected" : ""}>${h(option)}</option>`).join("")}`;
        });
      }
      return true;
    }
    return false;
  }

  async function copy(config) {
    try {
      await navigator.clipboard.writeText(config.callbackUrl);
      showToast(t("已复制", "Copied"));
    } catch {
      showToast(t("剪贴板不可用，可在编辑页选中地址复制", "Clipboard unavailable; select the URL in the editor to copy"));
    }
  }

  function handleAction(action, target) {
    if (!["open-tracker-modal", "create-tracker", "toggle-tracker"].includes(action) && !action.startsWith("postback-")) return false;
    if (target.disabled) return true;
    const store = state();
    const configId = target.dataset.configId || target.dataset.trackerId;
    const config = store.configs.find(item => item.id === configId);
    if (action === "postback-connect") openConnect(target.dataset.platformId);
    else if (action === "postback-manage") {
      store.tab = "configs";
      navigate("tracker");
    } else if (action === "open-tracker-modal") openEditor();
    else if (action === "create-tracker") save();
    else if (action === "postback-edit") openEditor(configId);
    else if (action === "postback-mode" && draft) {
      if (target.dataset.mode === "manual" && !draft.manualUrl) draft.manualUrl = template(draft);
      draft.mode = target.dataset.mode;
      errors = {};
      showEditor();
    } else if (action === "postback-add-parameter" && draft) {
      draft.parameters.push({ key: "", value: "" });
      showEditor(`postback-key-${draft.parameters.length - 1}`);
    } else if (action === "postback-remove-parameter" && draft) {
      draft.parameters.splice(Number(target.dataset.index), 1);
      errors = {};
      showEditor();
    } else if (action === "postback-toggle" || action === "toggle-tracker") {
      if (config) {
        config.status = config.status === "启用" ? "暂停" : "启用";
        config.updatedAt = now();
        persist();
        render();
        showToast(t("状态已更新", "Status updated"));
      }
    } else if (action === "postback-copy" && config) copy(config);
    else if (action === "postback-test" && config) openTest(configId);
    else if (action === "postback-run-test") runTest(target);
    else if (action === "postback-retry") {
      const log = store.logs.find(item => item.id === target.dataset.logId);
      if (log) openTest(log.configId, log.id);
    } else if (action === "postback-log-detail") openLog(target.dataset.logId);
    else if (action === "postback-tab") {
      store.tab = target.dataset.tab;
      render();
    } else if (action === "postback-log-page") {
      store.logPage = Number(target.dataset.page);
      render();
    } else if (action === "postback-reset-filters") {
      store.filters = { config: "", event: "", result: "" };
      store.logPage = 1;
      render();
    } else if (action === "postback-delete" && config) {
      showModal(`<div class="modal-card postback-confirm"><div class="modal-head"><h2>${t("删除回传配置", "Delete configuration")}</h2><button class="close-button" type="button" data-action="close-modal" aria-label="${t("关闭", "Close")}">×</button></div><p>${t("删除后停止此配置的后续回传，已有投递记录保留。", "Deletion stops future postbacks for this configuration. Existing delivery records are retained.")}</p><strong>${h(config.name)}</strong><div class="drawer-actions"><button class="button secondary" type="button" data-action="close-modal">${t("取消", "Cancel")}</button><button class="button danger" type="button" data-action="postback-confirm-delete" data-config-id="${h(config.id)}">${t("删除", "Delete")}</button></div></div>`, false, t("删除回传配置", "Delete configuration"));
    } else if (action === "postback-confirm-delete" && config) {
      store.configs = store.configs.filter(item => item.id !== configId);
      persist();
      closeModal();
      render();
      showToast(t("回传配置已删除", "Configuration deleted"));
    }
    return true;
  }

  return { render: renderPage, renderDashboard, openEditor, handleAction, handleInput: updateDraft, handleChange, validate, template, sample };
})();
