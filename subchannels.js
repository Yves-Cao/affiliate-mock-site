(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const initialized = new WeakSet();
  let returnFocus = null;

  function state() {
    AFF.state.subchannels ||= {
      rows: structuredClone(AFF.subIds),
      filters: { search: "", status: "", from: "", to: "" },
      page: 1, pageSize: 10, sort: "updatedAt", direction: "desc"
    };
    const s = AFF.state.subchannels;
    if (!initialized.has(s)) {
      s.dialog = null;
      s.detailId = null;
      s.breakdown = "platform";
      s.error = "";
      s.filterDraft = { ...s.filters };
      initialized.add(s);
    }
    AFF.subIds = s.rows;
    return s;
  }

  function format(value, type) {
    if (value === null || value === undefined) return "—";
    if (type === "money") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
    if (type === "rate") return `${(value * 100).toFixed(1)}%`;
    return new Intl.NumberFormat("en-US").format(value);
  }

  function icon(name) {
    const paths = {
      add: '<path d="M12 5v14M5 12h14"/>',
      close: '<path d="m6 6 12 12M6 18 18 6"/>',
      copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
      left: '<path d="m14 6-6 6 6 6"/>',
      right: '<path d="m10 6 6 6-6 6"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  }

  function link(row) {
    const campaign = AFF.campaigns.find(item => [item.code, item.id, item.name].filter(Boolean).includes(row.campaignId));
    if (campaign) return AFF.campaignLinks.url(campaign, { subid: row.id });
    const url = new URL(AFF.dashboard.link);
    url.searchParams.set("subid", row.id);
    return url.href;
  }

  function filteredRows() {
    const s = state();
    const f = s.filters;
    return s.rows.filter(row =>
      (!f.search || `${row.id} ${row.name || ""}`.toLowerCase().includes(f.search.toLowerCase())) &&
      (!f.status || row.status === f.status) &&
      (!f.from || row.updatedAt.slice(0, 10) >= f.from) &&
      (!f.to || row.updatedAt.slice(0, 10) <= f.to)
    ).sort((left, right) => {
      const result = String(left[s.sort] || "").localeCompare(String(right[s.sort] || ""), "zh-CN", { numeric: true });
      return (s.direction === "asc" ? result : -result) || left.id.localeCompare(right.id);
    });
  }

  function rerender(focus) {
    render();
    if (focus) document.querySelector(focus)?.focus();
  }

  function field(label, content) {
    return `<div><dt>${h(label)}</dt><dd>${content}</dd></div>`;
  }

  function status(row) {
    return `<span class="tag ${row.status === "启用" ? "tag-ok" : "tag-danger"}">${row.status === "启用" ? t("启用", "Enabled") : t("已封禁", "Blocked")}</span>`;
  }

  function heading(key, zh, en) {
    const s = state();
    return `<th scope="col" aria-sort="${s.sort === key ? (s.direction === "asc" ? "ascending" : "descending") : "none"}">
      <button type="button" data-sc-sort="${key}">${t(zh, en)}<span aria-hidden="true">${s.sort === key ? (s.direction === "asc" ? "↑" : "↓") : "↕"}</span></button></th>`;
  }

  function pagination(total) {
    const s = state();
    const pages = Math.max(1, Math.ceil(total / s.pageSize));
    s.page = Math.min(pages, Math.max(1, s.page));
    return `<footer class="table-footer sc-footer">
      <span>${t("共", "Total")} <b data-sc-total>${total}</b> ${t("条记录", "channels")}</span>
      <div class="sc-pagination"><label>${t("每页", "Per page")}<select data-sc-page-size aria-label="${t("每页条数", "Rows per page")}">${[10, 20, 50].map(value => `<option ${s.pageSize === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <div class="pagination"><button type="button" data-sc-page="${s.page - 1}" aria-label="${t("上一页", "Previous page")}" ${s.page === 1 ? "disabled" : ""}>${icon("left")}</button>
          <span>${s.page} / ${pages}</span>
          <button type="button" data-sc-page="${s.page + 1}" aria-label="${t("下一页", "Next page")}" ${s.page === pages ? "disabled" : ""}>${icon("right")}</button>
        </div>
      </div>
    </footer>`;
  }

  function filters() {
    const s = state();
    const f = s.filterDraft;
    return `<form class="sc-filter-form" data-sc-filter-form>
      <label><span>Sub ID / ${t("名称", "Name")}</span><input type="search" data-sc-filter="search" value="${h(f.search)}" placeholder="${t("搜索二级渠道", "Search channels")}"></label>
      <label><span>${t("状态", "Status")}</span><select data-sc-filter="status">
        <option value="">${t("全部", "All")}</option><option value="启用" ${f.status === "启用" ? "selected" : ""}>${t("启用", "Enabled")}</option><option value="已封禁" ${f.status === "已封禁" ? "selected" : ""}>${t("已封禁", "Blocked")}</option>
      </select></label>
      <label><span>${t("更新开始日期", "Updated from")}</span><input type="date" data-sc-filter="from" value="${h(f.from)}"></label>
      <label><span>${t("更新结束日期", "Updated to")}</span><input type="date" data-sc-filter="to" value="${h(f.to)}"></label>
      <div class="sc-filter-actions"><button class="button primary small" type="submit">${t("查询", "Search")}</button><button class="button secondary small" type="button" data-sc-action="reset">${t("重置", "Reset")}</button></div>
      <p class="sc-validation" id="sc-filter-error" role="alert">${h(s.filterError || "")}</p>
    </form>`;
  }

  function page() {
    const s = state();
    const rows = filteredRows();
    const footer = pagination(rows.length);
    const visible = rows.slice((s.page - 1) * s.pageSize, s.page * s.pageSize);
    return `<div class="sc-page">
      <div class="page-actions page-actions-top page-actions-start"><button class="button primary" type="button" data-sc-action="create">${icon("add")}${t("创建二级渠道", "Create subchannel")}</button></div>
      <div class="sc-stats">${[
        [t("二级渠道总数", "Total subchannels"), s.rows.length],
        [t("启用中", "Enabled"), s.rows.filter(row => row.status === "启用").length],
        [t("已封禁", "Blocked"), s.rows.filter(row => row.status === "已封禁").length]
      ].map(([label, value]) => `<article class="card sc-stat"><span>${label}</span><strong>${format(value)}</strong></article>`).join("")}</div>
      <section class="card sc-panel">
        ${filters()}
        <div class="table-wrap sc-table-scroll"><table class="sc-table"><thead><tr>
          ${heading("id", "Sub ID", "Sub ID")}${heading("status", "状态", "Status")}${heading("updatedAt", "更新时间", "Updated at")}
          <th scope="col">${t("二级链接", "Subchannel link")}</th><th scope="col">${t("操作", "Actions")}</th>
        </tr></thead><tbody>${visible.length ? visible.map(row => `<tr>
          <td><strong>${h(row.id)}</strong><small>${h(row.name || "")}</small></td><td>${status(row)}</td><td>${h(row.updatedAt)}</td>
          <td><div class="sc-link"><a href="${h(link(row))}" target="_blank" rel="noopener noreferrer" title="${h(link(row))}">${h(link(row))}</a>
            <button class="sc-copy" type="button" data-copy="${h(link(row))}" title="${t("复制链接", "Copy link")}" aria-label="${t("复制链接", "Copy link")}">${icon("copy")}</button></div></td>
          <td><div class="sc-row-actions"><button class="button secondary small" type="button" data-sc-detail="${h(row.id)}">${t("详情", "Details")}</button><button class="button secondary small" type="button" data-sc-toggle="${h(row.id)}">${row.status === "启用" ? t("封禁", "Block") : t("启用", "Enable")}</button></div></td>
        </tr>`).join("") : `<tr><td colspan="5" class="sc-empty">${t("暂无二级渠道，请调整筛选或创建渠道。", "No subchannels. Adjust filters or create a channel.")}</td></tr>`}</tbody></table></div>
        ${footer}
      </section>
      ${s.dialog === "create" ? createDialog() : s.dialog === "detail" ? renderDetail() : ""}
    </div>`;
  }

  function createDialog() {
    const s = state();
    const draft = s.createDraft;
    return `<div class="sc-modal-layer"><div class="overlay" data-sc-action="close"></div>
      <section class="sc-modal" role="dialog" aria-modal="true" aria-labelledby="sc-create-title">
        <header><h2 id="sc-create-title">${t("创建二级渠道", "Create subchannel")}</h2><button class="sc-icon-button" type="button" data-sc-action="close" aria-label="${t("关闭", "Close")}">${icon("close")}</button></header>
        <form data-sc-create-form novalidate><div class="sc-modal-body">
          <label><span>${t("渠道名称", "Channel name")} <b>*</b></span><input data-sc-create="name" maxlength="80" required value="${h(draft.name)}" placeholder="${t("输入渠道名称", "Enter a channel name")}"></label>
          <label><span>Sub ID <b>*</b></span><input data-sc-create="id" maxlength="64" required value="${h(draft.id)}" placeholder="${t("如 newsletter_01", "e.g. newsletter_01")}" aria-describedby="sc-id-hint sc-create-error"><small id="sc-id-hint">${t("1–64位字母、数字、下划线或连字符，以字母或数字开头。", "1–64 letters, digits, underscores or hyphens; start with a letter or digit.")}</small></label>
          <label><span>${t("所属活动（可选）", "Campaign (optional)")}</span><select data-sc-create="campaignId"><option value="">${t("不关联活动", "No campaign")}</option>${AFF.campaigns.map(item => `<option value="${h(item.id || item.name)}" ${draft.campaignId === (item.id || item.name) ? "selected" : ""}>${h(item.name)}</option>`).join("")}</select></label>
          <p class="sc-validation" id="sc-create-error" role="alert">${h(s.error || "")}</p>
        </div><footer><button class="button secondary" type="button" data-sc-action="close">${t("取消", "Cancel")}</button><button class="button primary" type="submit">${t("创建", "Create")}</button></footer></form>
      </section>
    </div>`;
  }

  function renderDetail() {
    const s = state();
    const row = s.rows.find(item => item.id === s.detailId);
    if (!row) return "";
    const source = AFF.reporting.rows.filter(item => item.subId === row.id);
    const totals = AFF.reporting.totals(source);
    const groups = AFF.reporting.aggregate(source, [s.breakdown]);
    const metrics = [
      ["clicks", t("点击量", "Clicks")], ["registrations", t("注册客户", "Registrations")],
      ["ftd", "FTD"], ["effective", t("有效 FTD", "Valid FTD")],
      ["expected", t("预计佣金", "Projected commission"), "money"],
      ["approved", t("已入账佣金", "Credited commission"), "money"]
    ];
    return `<div class="overlay sc-overlay" data-sc-action="close"></div>
      <aside class="sc-drawer" role="dialog" aria-modal="true" aria-labelledby="sc-detail-title">
        <header><div><h2 id="sc-detail-title">${h(row.name || row.id)}</h2><p>Sub ID: ${h(row.id)}</p></div><button class="sc-icon-button" type="button" data-sc-action="close" aria-label="${t("关闭", "Close")}">${icon("close")}</button></header>
        <div class="sc-drawer-body">
          <dl class="sc-detail-meta">${field(t("链接状态", "Link status"), status(row))}${field(t("更新时间", "Updated at"), h(row.updatedAt))}</dl>
          <div class="sc-detail-link"><a href="${h(link(row))}" target="_blank" rel="noopener noreferrer">${h(link(row))}</a><button class="sc-copy" type="button" data-copy="${h(link(row))}" title="${t("复制链接", "Copy link")}" aria-label="${t("复制链接", "Copy link")}">${icon("copy")}</button></div>
          <div class="sc-detail-section-head"><h3>${t("渠道表现", "Channel performance")}</h3><span>${h(AFF.reporting.from)} — ${h(AFF.reporting.now)}</span></div>
          <dl class="sc-detail-metrics">${metrics.map(([key, label, type]) => field(label, format(totals[key], type))).join("")}</dl>
          <h3>${t("转化率", "Conversion rates")}</h3>
          <dl class="sc-detail-rates">${[
            ["registerRate", t("点击→注册", "Click → registration")], ["ftdRate", t("注册→FTD", "Registration → FTD")],
            ["effectiveRate", t("FTD→有效 FTD", "FTD → valid FTD")]
          ].map(([key, label]) => field(label, format(totals[key], "rate"))).join("")}</dl>
          <div class="sc-detail-section-head"><h3>${t("数据明细", "Breakdown")}</h3><select data-sc-breakdown aria-label="${t("明细维度", "Breakdown dimension")}">
            <option value="platform" ${s.breakdown === "platform" ? "selected" : ""}>${t("按平台", "By platform")}</option><option value="country" ${s.breakdown === "country" ? "selected" : ""}>${t("按国家/地区", "By country / region")}</option>
          </select></div>
          <div class="table-wrap"><table class="sc-breakdown-table"><thead><tr><th>${s.breakdown === "platform" ? t("平台", "Platform") : t("国家/地区", "Country / region")}</th><th class="numeric">${t("点击", "Clicks")}</th><th class="numeric">${t("注册", "Registrations")}</th><th class="numeric">FTD</th><th class="numeric">${t("有效 FTD", "Valid FTD")}</th><th class="numeric">${t("预计佣金", "Projected commission")}</th></tr></thead>
            <tbody>${groups.length ? groups.map(group => `<tr><td>${h(group.values[0])}</td>${["clicks", "registrations", "ftd", "effective", "expected"].map(key => `<td class="numeric">${format(group.metrics[key], key === "expected" ? "money" : "count")}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="6" class="sc-empty">${t("暂无推广数据", "No promotion data yet")}</td></tr>`}</tbody>
          </table></div>
        </div><footer><button class="button secondary" type="button" data-sc-action="close">${t("关闭", "Close")}</button></footer>
      </aside>`;
  }

  function close() {
    state().dialog = null;
    rerender(returnFocus);
  }

  function handleClick(event) {
    if (AFF.state?.route !== "subchannels") return false;
    const target = event.target.closest("[data-sc-action], [data-sc-detail], [data-sc-toggle], [data-sc-page], [data-sc-sort]");
    if (!target || target.disabled) return false;
    const s = state();
    if (target.dataset.scAction === "close") { close(); return true; }
    if (target.dataset.scAction === "create") {
      returnFocus = '[data-sc-action="create"]';
      s.dialog = "create"; s.createDraft = { name: "", id: "", campaignId: "" }; s.error = "";
      rerender('[data-sc-create="name"]');
      return true;
    }
    if (target.dataset.scAction === "reset") {
      s.filters = { search: "", status: "", from: "", to: "" };
      s.filterDraft = { ...s.filters }; s.filterError = ""; s.page = 1;
      rerender('[data-sc-filter="search"]'); return true;
    }
    if (target.dataset.scDetail) {
      returnFocus = `[data-sc-detail="${CSS.escape(target.dataset.scDetail)}"]`;
      s.detailId = target.dataset.scDetail; s.dialog = "detail"; s.breakdown = "platform";
      rerender('.sc-drawer [data-sc-action="close"]'); return true;
    }
    if (target.dataset.scToggle) {
      const row = s.rows.find(item => item.id === target.dataset.scToggle);
      if (!row) return false;
      row.status = row.status === "启用" ? "已封禁" : "启用";
      row.updatedAt = new Date().toLocaleDateString("en-CA");
      showToast(t("渠道状态已更新", "Channel status updated"));
      rerender(); return true;
    }
    if (target.dataset.scSort) {
      const key = target.dataset.scSort;
      if (!["id", "status", "updatedAt"].includes(key)) return false;
      s.direction = s.sort === key && s.direction === "asc" ? "desc" : "asc";
      s.sort = key; s.page = 1; rerender(); return true;
    }
    if (target.dataset.scPage) {
      s.page = Math.max(1, Number(target.dataset.scPage) || 1);
      rerender(); return true;
    }
    return false;
  }

  function handleInput(event) {
    if (AFF.state?.route !== "subchannels") return false;
    const target = event.target;
    if (target.matches("[data-sc-filter]")) { state().filterDraft[target.dataset.scFilter] = target.value; return true; }
    if (target.matches("[data-sc-create]")) { state().createDraft[target.dataset.scCreate] = target.value; return true; }
    return false;
  }

  function handleChange(event) {
    if (handleInput(event)) return true;
    if (AFF.state?.route !== "subchannels") return false;
    const target = event.target;
    if (target.matches("[data-sc-page-size]")) {
      const value = Number(target.value);
      if (![10, 20, 50].includes(value)) return false;
      state().pageSize = value; state().page = 1; rerender("[data-sc-page-size]"); return true;
    }
    if (target.matches("[data-sc-breakdown]") && ["platform", "country"].includes(target.value)) {
      state().breakdown = target.value; rerender("[data-sc-breakdown]"); return true;
    }
    return false;
  }

  function handleSubmit(event) {
    if (AFF.state?.route !== "subchannels") return;
    const s = state();
    if (event.target.matches("[data-sc-filter-form]")) {
      event.preventDefault();
      if (s.filterDraft.from && s.filterDraft.to && s.filterDraft.from > s.filterDraft.to) {
        s.filterError = t("开始日期不能晚于结束日期。", "The start date must not be later than the end date.");
        document.querySelector("#sc-filter-error").textContent = s.filterError;
        return;
      }
      s.filters = { ...s.filterDraft, search: s.filterDraft.search.trim() };
      s.filterError = ""; s.page = 1; rerender('[data-sc-filter="search"]');
    }
    if (!event.target.matches("[data-sc-create-form]")) return;
    event.preventDefault();
    const draft = s.createDraft;
    const name = draft.name.trim();
    const id = draft.id.trim();
    s.error = !name ? t("请输入渠道名称。", "Enter a channel name.") :
      name.length > 80 ? t("渠道名称最多80个字符。", "Channel names must be at most 80 characters.") :
      !/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(id) ? t("请输入有效的 Sub ID，使用1–64位字母、数字、下划线或连字符。", "Enter a valid Sub ID using 1–64 letters, digits, underscores or hyphens.") :
      s.rows.some(row => row.id.toLowerCase() === id.toLowerCase()) ? t("该 Sub ID 已存在，请使用其他值。", "This Sub ID already exists. Choose another value.") : "";
    if (s.error) {
      document.querySelector("#sc-create-error").textContent = s.error;
      return;
    }
    s.rows.unshift({ id, name, campaignId: draft.campaignId, status: "启用", updatedAt: new Date().toLocaleDateString("en-CA") });
    s.filters = { search: "", status: "", from: "", to: "" };
    s.filterDraft = { ...s.filters }; s.dialog = null; s.page = 1; s.sort = "updatedAt"; s.direction = "desc";
    showToast(t("二级渠道已创建", "Subchannel created"));
    rerender(`[data-sc-detail="${CSS.escape(id)}"]`);
  }

  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleChange);
  document.addEventListener("submit", handleSubmit);
  document.addEventListener("keydown", event => {
    if (AFF.state?.route !== "subchannels" || !state().dialog) return;
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key !== "Tab") return;
    const dialog = document.querySelector(".sc-modal, .sc-drawer");
    const nodes = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]')];
    const first = nodes[0]; const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  window.addEventListener("hashchange", () => {
    if (AFF.state?.subchannels) AFF.state.subchannels.dialog = null;
  });
  AFF.subchannels = { state, filteredRows, link, renderDetail, handleClick, handleChange, handleInput };
  AFF.pages.subchannels = page;
})();
