/* 页面 02 任务队列 */
(function () {
  const ADM = window.ADM, esc = ADM.esc, $ = ADM.$, $$ = ADM.$$;
  const base = () => ({ scope: "mine", q: "", type: "", state: "", pri: "", sla: "", team: "", owner: "", date: "", page: 1, size: 20, sel: new Set(), panel: false, stat: "" });
  let F = base(), D = base(), loadedRole = null;
  const FILTER_KEYS = ["q", "type", "state", "pri", "sla", "team", "owner", "date"];
  const LABEL = { q: "关键词", type: "类型", state: "状态", pri: "优先级", sla: "时限", team: "团队", owner: "负责人", date: "更新日期" };

  function scoped() {
    let rows = ADM.visibleTasks();
    if (F.scope === "mine") rows = rows.filter((t) => ADM.isMine(t) && ADM.activeStates.includes(t.state));
    else if (F.scope === "claim") rows = rows.filter((t) => t.state === "open" && !t.owner);
    else if (F.scope === "team") rows = rows.filter((t) => t.team === ADM.user().team);
    return rows;
  }
  function filtered() {
    let rows = scoped();
    if (F.stat === "over") rows = rows.filter((t) => t.dueIn != null && t.dueIn < 0 && ADM.activeStates.includes(t.state));
    if (F.stat === "soon") rows = rows.filter((t) => t.dueIn != null && t.dueIn >= 0 && t.dueIn <= 6 && ADM.activeStates.includes(t.state));
    if (F.stat === "appr") rows = rows.filter((t) => t.state === "pending_approval");
    if (F.stat === "fail") rows = rows.filter((t) => t.state === "execution_failed");
    const q = F.q.trim().toLowerCase();
    if (q) rows = rows.filter((t) => (t.id + t.title + t.obj + t.ref).toLowerCase().includes(q));
    if (F.type) rows = rows.filter((t) => t.type === F.type);
    if (F.state) rows = rows.filter((t) => t.state === F.state);
    if (F.pri) rows = rows.filter((t) => t.pri === F.pri);
    if (F.team) rows = rows.filter((t) => t.team === F.team);
    if (F.owner === "none") rows = rows.filter((t) => !t.owner);
    else if (F.owner) rows = rows.filter((t) => t.owner === F.owner);
    if (F.date) rows = rows.filter((t) => t.upd.slice(0, 10) >= F.date);
    if (F.sla === "over") rows = rows.filter((t) => t.dueIn != null && t.dueIn < 0);
    if (F.sla === "soon") rows = rows.filter((t) => t.dueIn != null && t.dueIn >= 0 && t.dueIn <= 6);
    if (F.sla === "none") rows = rows.filter((t) => t.dueIn == null);
    return rows.sort((a, b) => (a.dueIn == null ? 1e9 : a.dueIn) - (b.dueIn == null ? 1e9 : b.dueIn));
  }
  const get = (id) => ADM.tasks.find((t) => t.id === id);

  function stats() {
    const all = ADM.visibleTasks().filter((t) => ADM.activeStates.includes(t.state));
    const S = [
      ["", "待处理", all.length, "可见范围内未结束"],
      ["over", "已超时", all.filter((t) => t.dueIn != null && t.dueIn < 0).length, "已超过截止时间"],
      ["soon", "即将超时", all.filter((t) => t.dueIn != null && t.dueIn >= 0 && t.dueIn <= 6).length, "6 小时内到期"],
      ["appr", "待审批", all.filter((t) => t.state === "pending_approval").length, "等待独立审批人"],
      ["fail", "执行失败", all.filter((t) => t.state === "execution_failed").length, "需人工查看原因并重试"]
    ];
    return `<div class="stats">${S.map((s) => `<button class="stat" data-stat="${s[0]}" aria-pressed="${s[0] !== "" && F.stat === s[0]}"><div class="name">${s[1]}</div><div class="val num">${s[2]}</div><div class="delta">${s[3]}</div></button>`).join("")}</div>`;
  }

  function chips() {
    const out = [];
    FILTER_KEYS.forEach((k) => {
      if (!F[k]) return;
      let v = F[k];
      if (k === "type") v = ADM.taskTypes[v].name;
      if (k === "state") v = ADM.taskStates[v].name;
      if (k === "sla") v = { over: "已超时", soon: "即将超时", none: "未配置" }[v];
      if (k === "owner") v = v === "none" ? "未分配" : ADM.userName(v);
      out.push(`<span class="chip">${LABEL[k]}：${esc(v)}<button data-clear="${k}" aria-label="移除${LABEL[k]}">×</button></span>`);
    });
    if (F.stat) out.push(`<span class="chip">指标：${{ over: "已超时", soon: "即将超时", appr: "待审批", fail: "执行失败" }[F.stat]}<button data-clear="stat" aria-label="移除指标">×</button></span>`);
    return out.length ? out.join("") + `<button class="btn sm ghost" data-clearall>清除全部</button>` : "";
  }

  function filters() {
    const types = ADM.roleTaskTypes[ADM.role().key];
    const teams = [...new Set(ADM.visibleTasks().map((t) => t.team))];
    const owners = Object.keys(ADM.users).filter((u) => ADM.visibleTasks().some((t) => t.owner === u));
    const opt = (arr, cur, all) => `<option value="">${all}</option>` + arr.map((a) => `<option value="${a[0]}" ${cur === a[0] ? "selected" : ""}>${esc(a[1])}</option>`).join("");
    const dirty = FILTER_KEYS.some((k) => D[k] !== F[k]);
    return `<div class="filters">
      <input class="field search" id="fq" placeholder="搜索任务编号、标题、对象" value="${esc(D.q)}" aria-label="关键词">
      <select class="select" id="ftype" aria-label="类型">${opt(types.map((t) => [t, ADM.taskTypes[t].name]), D.type, "全部类型")}</select>
      <select class="select" id="fstate" aria-label="状态">${opt(Object.keys(ADM.taskStates).map((s) => [s, ADM.taskStates[s].name]), D.state, "全部状态")}</select>
      <button class="btn" id="fpanelBtn" aria-expanded="${F.panel}">${ADM.icon("filter", 'style="width:14px;height:14px"')}更多筛选</button>
      <button class="btn primary" id="fapply">应用</button>${dirty ? '<span class="unapplied">有未应用的筛选</span>' : ""}</div>
      <div class="filter-panel ${F.panel ? "open" : ""}" id="fpanel"><div class="filter-grid">
        <label>优先级<select class="select" id="fpri">${opt(["高", "中", "低"].map((x) => [x, x]), D.pri, "全部")}</select></label>
        <label>时限<select class="select" id="fsla">${opt([["over", "已超时"], ["soon", "即将超时"], ["none", "未配置"]], D.sla, "全部")}</select></label>
        <label>团队<select class="select" id="fteam">${opt(teams.map((x) => [x, x]), D.team, "全部")}</select></label>
        <label>负责人<select class="select" id="fowner">${opt([["none", "未分配"]].concat(owners.map((u) => [u, ADM.userName(u)])), D.owner, "全部")}</select></label>
        <label>更新日期不早于<input class="field" type="date" id="fdate" value="${D.date}"></label></div>
        <div class="filter-actions"><button class="btn" id="fcancel">取消</button><button class="btn" id="freset">重置</button><button class="btn primary" id="fapply2">应用</button></div></div>`;
  }

  function table() {
    const rows = filtered();
    const total = rows.length, pages = Math.max(1, Math.ceil(total / F.size));
    if (F.page > pages) F.page = pages;
    const view = rows.slice((F.page - 1) * F.size, F.page * F.size);
    const canAssign = ADM.user().assign;
    const body = view.length ? view.map((t) => `<tr data-row="${t.id}" class="${F.sel.has(t.id) ? "selected" : ""}">
      <td class="fixl" style="width:40px"><input type="checkbox" data-sel="${t.id}" ${F.sel.has(t.id) ? "checked" : ""} aria-label="选择 ${t.id}"></td>
      <td class="id">${t.id}</td><td class="ellip" title="${esc(t.title)}"><button class="link" data-open="${t.id}">${esc(t.title)}</button></td>
      <td>${ADM.taskTypes[t.type].name}</td><td>${t.obj}<span class="sub">${esc(t.ref)}</span></td>
      <td>${t.pri}</td><td><span class="rband ${t.risk === "R0" ? "r0" : t.risk === "R1" ? "r1" : t.risk === "R2" ? "r2" : "r3"}">${t.risk}</span></td>
      <td class="num">${t.amt}</td><td>${ADM.stateTag(t.state)}</td><td>${ADM.slaTag(t)}</td>
      <td>${esc(ADM.userName(t.owner))}<span class="sub">${esc(t.team)}</span></td><td>${t.upd}</td>
      <td class="fixr"><div class="rowact"><button class="link" data-open="${t.id}">查看</button>${t.state === "open" && !t.owner ? `<button class="link" data-claim="${t.id}">认领</button>` : ""}</div></td></tr>`).join("")
      : `<tr><td colspan="13"><div class="empty"><b>没有符合条件的任务</b>${FILTER_KEYS.some((k) => F[k]) || F.stat ? "试试清除部分筛选。" : F.scope === "mine" ? "你当前没有待办，可切到“待认领”领取任务。" : "当前范围内暂无任务。"}${FILTER_KEYS.some((k) => F[k]) || F.stat ? '<br><button class="btn" data-clearall>清除全部筛选</button>' : ""}</div></td></tr>`;
    const allChecked = view.length && view.every((t) => F.sel.has(t.id));
    return `<div class="batchbar ${F.sel.size ? "show" : ""}"><span>已选 ${F.sel.size} 项</span><span class="sp"></span><button class="btn sm" id="bClaim">批量认领</button><button class="btn sm" id="bTransfer" ${canAssign ? "" : 'disabled title="需要任务分派权限"'}>批量转派</button><button class="btn sm ghost" id="bClear">取消选择</button></div>
      <div class="table-wrap"><table class="dt" style="min-width:1280px"><thead><tr><th class="fixl"><input type="checkbox" id="selAll" ${allChecked ? "checked" : ""} aria-label="全选当前页"></th><th>编号</th><th>任务</th><th>类型</th><th>对象 / 引用</th><th>优先级</th><th>风险</th><th class="num">涉及金额 (USD)</th><th>状态</th><th>时限</th><th>负责人</th><th>更新时间</th><th class="fixr">操作</th></tr></thead><tbody>${body}</tbody></table></div>
      <div class="tfoot"><span>共 ${total} 条</span><div class="pager">${ADM.pager(total, F.page, F.size)}</div></div>`;
  }

  function render(main, r) {
    if (loadedRole !== ADM.role().key) { F = base(); D = base(); loadedRole = ADM.role().key; }
    const scopes = [["mine", "我的待办"], ["claim", "待认领"], ["team", "团队任务"], ["all", "全部可见"]];
    const paint = () => {
      $("#tq").innerHTML = stats() + `<div class="seg" style="margin-bottom:12px" role="group" aria-label="范围">${scopes.map((s) => `<button data-scope="${s[0]}" aria-pressed="${F.scope === s[0]}">${s[1]}</button>`).join("")}</div>` + filters() + `<div class="chips" id="chips">${chips()}</div>` + table();
    };
    main.innerHTML = `<div class="adm-crumb"><a href="#/admin-workbench">工作台</a><span>/</span><span>任务队列</span></div>
      <div class="adm-pagehead"><div><h1>任务队列</h1><p class="sub">${ADM.role().name}可见的人工任务。任务只能经审批与执行后自动完成，不提供“手动完成”。</p></div><div class="actions"><button class="btn" id="tqRefresh">${ADM.icon("refresh", 'style="width:14px;height:14px"')}刷新</button></div></div>
      <div id="tq"></div>`;
    paint();
    const applyDraft = () => { FILTER_KEYS.forEach((k) => (F[k] = D[k])); F.page = 1; F.sel.clear(); paint(); };
    const readDraft = () => {
      const v = (id) => { const e = $(id); return e ? e.value : ""; };
      D.q = v("#fq"); D.type = v("#ftype"); D.state = v("#fstate");
      if ($("#fpri")) { D.pri = v("#fpri"); D.sla = v("#fsla"); D.team = v("#fteam"); D.owner = v("#fowner"); D.date = v("#fdate"); }
    };
    const tq = $("#tq");
    tq.onchange = (e) => {
      const t = e.target;
      if (t.dataset.sel) { t.checked ? F.sel.add(t.dataset.sel) : F.sel.delete(t.dataset.sel); paint(); return; }
      if (t.id === "selAll") { const ids = $$("[data-row]", tq).map((x) => x.dataset.row); ids.forEach((i) => (t.checked ? F.sel.add(i) : F.sel.delete(i))); paint(); return; }
      if (t.closest(".filters,.filter-panel")) { readDraft(); const u = $(".unapplied"); if (!u) { const b = $("#fapply"); b.insertAdjacentHTML("afterend", '<span class="unapplied">有未应用的筛选</span>'); } }
    };
    tq.oninput = (e) => { if (e.target.id === "fq") { readDraft(); } };
    tq.onkeydown = (e) => { if (e.key === "Enter" && e.target.id === "fq") { readDraft(); applyDraft(); } };
    tq.onclick = (e) => {
      const t = e.target.closest("button,a");
      if (!t) return;
      const d = t.dataset;
      if (d.scope) { F.scope = d.scope; F.page = 1; F.sel.clear(); paint(); }
      else if (d.stat !== undefined) { F.stat = F.stat === d.stat ? "" : d.stat; F.page = 1; paint(); }
      else if (t.id === "fpanelBtn") { readDraft(); F.panel = !F.panel; paint(); }
      else if (t.id === "fapply" || t.id === "fapply2") { readDraft(); applyDraft(); }
      else if (t.id === "fcancel") { D = Object.assign(base(), { sel: F.sel }); FILTER_KEYS.forEach((k) => (D[k] = F[k])); F.panel = false; paint(); }
      else if (t.id === "freset") { FILTER_KEYS.forEach((k) => (D[k] = "")); paint(); }
      else if (d.clear) { if (d.clear === "stat") F.stat = ""; else { F[d.clear] = ""; D[d.clear] = ""; } F.page = 1; paint(); }
      else if (t.hasAttribute("data-clearall")) { FILTER_KEYS.forEach((k) => (F[k] = D[k] = "")); F.stat = ""; F.page = 1; paint(); }
      else if (d.pg) { F.page = +d.pg; paint(); }
      else if (d.open) openTask(d.open, paint);
      else if (d.claim) claimModal([d.claim], paint);
      else if (t.id === "bClaim") claimModal([...F.sel], paint);
      else if (t.id === "bTransfer") transferModal([...F.sel], paint);
      else if (t.id === "bClear") { F.sel.clear(); paint(); }
    };
    $("#tqRefresh").onclick = () => { paint(); ADM.toast("已刷新"); };
    if (r.query.task_id && !ADM.visibleTasks().some((t) => t.id === r.query.task_id)) ADM.toast(`任务 ${r.query.task_id} 不存在或当前角色无权查看`, "err");
    else if (r.query.task_id && get(r.query.task_id)) setTimeout(() => openTask(r.query.task_id, paint), 0);
  }

  /* ---------- 认领 / 转派 ---------- */
  function claimModal(ids, done) {
    const list = ids.map(get);
    const okList = list.filter((t) => t.state === "open" && !t.owner);
    const bad = list.filter((t) => !okList.includes(t));
    ADM.modal({
      title: `认领 ${ids.length} 个任务`,
      body: `<p>认领后任务进入“处理中”，负责人为你本人（${esc(ADM.user().name)}）。</p>${bad.length ? `<div class="callout warn">其中 ${bad.length} 个任务已被认领或不在待认领状态，将被跳过：${bad.map((t) => t.id).join("、")}</div>` : ""}<p>可认领：<b>${okList.length}</b> 个</p>`,
      okText: "确认认领",
      onOk: () => {
        if (!okList.length) { ADM.toast("没有可认领的任务", "err"); return false; }
        okList.forEach((t) => { t.owner = ADM.role().userId; t.state = "processing"; t.team = ADM.user().team; t.version++; t.upd = "2026-11-19 10:30"; });
        F.sel.clear();
        ADM.toast(bad.length ? `已认领 ${okList.length} 个，跳过 ${bad.length} 个` : `已认领 ${okList.length} 个任务`);
        done(); ADM.refreshNav();
        return true;
      }
    });
  }
  function transferModal(ids, done) {
    if (!ADM.user().assign) { ADM.toast("你没有任务分派权限，请联系系统管理员授权", "err"); return; }
    const list = ids.map(get).filter(Boolean);
    const cand = Object.keys(ADM.users).filter((u) => u !== ADM.role().userId);
    ADM.modal({
      title: `转派 ${list.length} 个任务`, wide: true,
      body: `<div class="form-row"><label for="tTo">转派给</label><select class="select" id="tTo" style="width:100%"><option value="">请选择</option>${cand.map((u) => `<option value="${u}">${esc(ADM.users[u].name)}（${ADM.roles[ADM.users[u].role].name} · ${esc(ADM.users[u].team)}）</option>`).join("")}</select><div class="err" id="tToE" style="color:var(--danger);font-size:12px"></div></div>
        <div class="form-row"><label for="tWhy">转派原因（必填）</label><textarea class="field" id="tWhy" rows="3" style="width:100%;height:auto;padding:8px 12px" placeholder="说明转派原因，将写入操作记录"></textarea><div class="err" id="tWhyE" style="color:var(--danger);font-size:12px"></div></div>
        <p style="font-size:12px;color:var(--muted)">只能转给有对应任务类型处理权限的人；不符合的任务会在结果中列出。</p>`,
      okText: "确认转派",
      onOk: () => {
        const to = $("#tTo").value, why = $("#tWhy").value.trim();
        $("#tToE").textContent = to ? "" : "请选择接收人"; $("#tWhyE").textContent = why ? "" : "请填写转派原因";
        if (!to || why.length < 5) { if (why.length < 5) $("#tWhyE").textContent = "请填写至少 5 个字的转派原因"; return false; }
        const role = ADM.users[to].role, fail = [];
        list.forEach((t) => {
          if (!ADM.roleTaskTypes[role].includes(t.type)) fail.push([t.id, "接收人角色无该类型任务的处理权限"]);
          else if (!ADM.activeStates.includes(t.state)) fail.push([t.id, "任务已结束"]);
          else { t.owner = to; t.team = ADM.users[to].team; if (t.state === "open") t.state = "processing"; t.version++; t.upd = "2026-11-19 10:30"; }
        });
        F.sel.clear();
        const okN = list.length - fail.length;
        if (fail.length) {
          setTimeout(() => ADM.modal({ title: "转派结果：部分成功", body: `<p>成功 ${okN} 个，失败 ${fail.length} 个。</p><div class="table-wrap"><table class="dt"><thead><tr><th>任务</th><th>原因</th></tr></thead><tbody>${fail.map((f) => `<tr><td class="id">${f[0]}</td><td>${f[1]}</td></tr>`).join("")}</tbody></table></div>`, hideOk: true, cancelText: "关闭" }), 50);
        } else ADM.toast(`已转派 ${okN} 个任务给 ${ADM.users[to].name}`);
        done(); return true;
      }
    });
  }

  /* ---------- 详情抽屉 ---------- */
  function openTask(id, done, ro) {
    const t = get(id); if (!t) return;
    ADM.drawer.open({
      title: `${t.id}　${t.title}`,
      sub: `${ADM.stateTag(t.state)} <span style="margin-left:8px">${ADM.taskTypes[t.type].name}</span>`,
      tabs: ro ? [{ key: "ov", label: "概览" }, { key: "log", label: "操作记录" }] : [{ key: "ov", label: "概览" }, { key: "ev", label: "证据与处理" }, { key: "ap", label: "审批与执行" }, { key: "log", label: "操作记录" }],
      body: (tab) => body(t, tab) + (ro ? '<div class="callout info" style="margin-top:16px">当前角色只读：仅显示任务摘要，不含证据与风险明细。</div>' : ""),
      foot: () => (ro ? '<button class="btn" id="dClose">关闭</button>' : foot(t)),
      bind: (d) => bindDrawer(d, t, done),
      onClose: () => { if (location.hash.includes("task_id")) history.replaceState(null, "", "#/tasks"); }
    });
  }
  const kv = (rows) => `<dl class="kv kv-2">${rows.map((r) => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join("")}</dl>`;
  function body(t, tab) {
    if (tab === "ov") return kv([["任务编号", t.id], ["任务类型", ADM.taskTypes[t.type].name], ["关联对象", t.obj], ["引用", esc(t.ref)], ["优先级", t.pri], ["风险等级", `<span class="rband ${t.risk.toLowerCase()}">${t.risk}</span>`], ["涉及金额 (USD)", t.amt], ["时限", ADM.slaTag(t)], ["负责人", esc(ADM.userName(t.owner))], ["团队", esc(t.team)], ["最近更新", t.upd], ["版本", "v" + t.version]]) +
      (ADM.sensitive(t) ? `<div class="callout warn" style="margin-top:16px">该任务涉及资金或风险处置，申请人不能审批自己提交的处置，须由另一位有权限的同事独立审批。</div>` : "") +
      (t.dueIn == null ? `<div class="callout info" style="margin-top:12px">未配置时限：生产值待确认，暂不计算超时。</div>` : "");
    if (tab === "ev") return `<div class="section"><h4>触发原因</h4><p>${esc(t.title)}。系统根据规则自动生成，规则版本与阈值生产值待确认。</p></div>
      <div class="section"><h4>证据</h4><ul style="margin:0;padding-left:18px;line-height:24px"><li>关联事件：${esc(t.ref)}</li><li>关联对象：${t.obj}</li><li>相关数据更新时间：${t.upd}</li><li>缺失数据：部分字段未回传，显示为“未知”，未按 0 处理</li></ul></div>
      <div class="section"><h4>处理说明</h4>${ADM.activeStates.includes(t.state) ? `<textarea class="field" id="note" rows="4" style="width:100%;height:auto;padding:8px 12px" placeholder="记录核查过程与依据，将写入操作记录"></textarea><div style="margin-top:8px"><button class="btn" id="saveNote">保存说明</button></div>` : '<p style="color:var(--muted)">任务已结束，不可再编辑。</p>'}</div>`;
    if (tab === "ap") {
      const steps = [["提交处理方案", ["pending_approval", "returned", "pending_execution", "executing", "execution_failed", "done"].includes(t.state)], ["独立审批", ["pending_execution", "executing", "execution_failed", "done"].includes(t.state)], ["系统执行", ["done"].includes(t.state)]];
      let act = "";
      if (t.state === "pending_approval") {
        act = ADM.isMine(t) ? `<div class="callout bad">你是该任务的处理人，不能审批自己提交的处置（不允许自审）。请等待另一位同事审批。</div>` : `<div class="callout info">你可以审批此处置。审批结果将写入审计，并触发系统执行。</div>`;
      } else if (t.state === "execution_failed") act = `<div class="callout bad">执行失败：下游返回超时。可重试执行，重试会保留同一幂等键，不会重复处理。</div>`;
      else if (!["pending_execution", "executing", "done", "closed", "returned"].includes(t.state)) act = `<div class="callout">尚未提交处理方案。完成核查后，在页面底部“提交处理方案”，由系统流转到审批。</div>`;
      return `<ol class="timeline">${steps.map((s) => `<li class="${s[1] ? "done" : ""}"><b>${s[0]}</b><span>${s[1] ? "已完成" : "未开始"}</span></li>`).join("")}</ol>${act}`;
    }
    return `<ol class="timeline"><li class="done"><b>任务创建</b><span>系统 · ${t.upd.slice(0, 10)} 08:00</span></li>${t.owner ? `<li class="done"><b>已分配给 ${esc(ADM.userName(t.owner))}</b><span>${t.upd}</span></li>` : ""}<li class="done"><b>最近更新</b><span>${t.upd}</span></li></ol><p style="color:var(--muted);font-size:12px">操作记录不可删改。</p>`;
  }
  function foot(t) {
    const b = [];
    b.push('<button class="btn" id="dClose">关闭</button>');
    if (t.state === "open" && !t.owner) b.push(`<button class="btn primary" id="dClaim">认领</button>`);
    if (ADM.activeStates.includes(t.state) && ADM.user().assign) b.push(`<button class="btn" id="dTransfer">转派</button>`);
    if (["processing", "returned", "waiting_material"].includes(t.state) && ADM.isMine(t)) b.push(`<button class="btn primary" id="dSubmit">提交处理方案</button>`);
    if (t.state === "pending_approval" && !ADM.isMine(t)) {
      const apx = ADM.approvals.find((a) => a.taskId === t.id && a.status === "pending");
      const own = (ADM.taskTypes[t.type] || {}).owner === ADM.role().key;
      if (apx) b.push(`<a class="btn primary" href="#/approvals">到审批队列处理 ${apx.id}</a>`);
      else if (own) b.push(`<button class="btn" id="dReturn">退回补充</button><button class="btn primary" id="dApprove">审批通过</button>`);
    }
    if (t.state === "execution_failed") b.push(`<button class="btn primary" id="dRetry">重试执行</button>`);
    return b.join("");
  }
  function bindDrawer(d, t, done) {
    const on = (id, fn) => { const e = d.querySelector("#" + id); if (e) e.onclick = fn; };
    const reopen = () => { done(); ADM.drawer.paint(); };
    on("dClose", () => ADM.drawer.close());
    on("dClaim", () => claimModal([t.id], () => { done(); ADM.drawer.paint(); }));
    on("dTransfer", () => transferModal([t.id], () => { done(); ADM.drawer.paint(); }));
    on("saveNote", () => ADM.toast("处理说明已保存"));
    on("dSubmit", () => ADM.modal({ title: "提交处理方案", body: `<p>提交后任务进入“待审批”，由另一位有权限的同事独立审批。</p>${ADM.sensitive(t) ? '<div class="callout warn">该处置涉及资金或风险，提交人不能审批自己的方案。</div>' : ""}`, okText: "确认提交", onOk: () => { t.state = "pending_approval"; t.version++; t.upd = "2026-11-19 10:30"; ADM.toast("已提交，等待独立审批"); reopen(); } }));
    on("dApprove", () => ADM.modal({ title: "审批通过", danger: ADM.sensitive(t), body: `<p>通过后系统将自动执行，执行结果会回写到任务状态。</p>`, okText: "确认通过", onOk: () => { t.state = "pending_execution"; t.version++; t.upd = "2026-11-19 10:30"; ADM.toast("已通过，等待系统执行"); reopen(); } }));
    on("dReturn", () => ADM.modal({ title: "退回补充", body: `<div class="form-row"><label for="rWhy">退回原因（必填）</label><textarea class="field" id="rWhy" rows="3" style="width:100%;height:auto;padding:8px 12px"></textarea><div id="rWhyE" style="color:var(--danger);font-size:12px"></div></div>`, okText: "确认退回", onOk: () => { if ($("#rWhy").value.trim().length < 5) { $("#rWhyE").textContent = "请填写至少 5 个字的退回原因"; return false; } t.state = "returned"; t.version++; ADM.toast("已退回补充"); reopen(); } }));
    on("dRetry", () => { t.state = "executing"; t.version++; t.upd = "2026-11-19 10:30"; ADM.toast("已重新提交执行"); reopen(); });
  }

  ADM.openTask = openTask;
  ADM.pages["tasks"] = render;
})();
