/* 页面 14 风险工作台 + 页面 15 案件与合规任务 */
(function () {
  const ADM = window.ADM, esc = ADM.esc, $ = ADM.$, $$ = ADM.$$;
  const NOW = "2026-11-19 10:30";
  const role = () => ADM.role().key;
  const isRisk = () => role() === "risk";
  const showAmt = () => role() === "risk" || role() === "fin";
  const BAND = { R0: ["r0", "正常"], R1: ["r1", "关注"], R2: ["r2", "较高"], R3: ["r3", "高"] };
  const bandTag = (r, agg) => (r ? `<span class="rband ${BAND[r][0]}">${r} ${BAND[r][1]}</span>${agg ? '<span class="sub">关联最高</span>' : ""}` : '<span class="tag plain">待评估</span>');
  const amtTxt = (a) => (!showAmt() ? "无权查看" : a == null || a === "—" ? "—" : a);
  const kv = (rows) => `<dl class="kv kv-2">${rows.map((r) => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join("")}</dl>`;
  const RISK_TYPES = ["risk_review", "settlement_overdue", "hold_extend", "circuit_breaker", "credit_review"];
  const purposeOf = (t) => t.purpose || (t.type === "risk_review" ? "risk_investigation" : t.type === "settlement_overdue" ? "signal_review" : null);
  const typeOfPurpose = { risk_investigation: "risk_review", signal_review: "settlement_overdue", settlement_recheck: "hold_extend", cluster_determination: "risk_review", cluster_member_correction: "risk_review", blacklist_add: "risk_review", blacklist_remove: "risk_review" };

  /* =============== 风险工作台 =============== */
  const V = { view: "obj", page: 1, size: 20, f: { obj: {}, evt: {}, clu: {}, bl: {} }, panel: false, more: { q: "", from: "", to: "", min: "" } };
  const attnOpts = [["unassigned", "未分配"], ["mine", "本人处理中"], ["approval", "待审批"], ["failed", "执行失败"], ["over", "已超时"], ["pending", "指标待处理"]];
  const CFG = {
    obj: { name: "风险对象", filters: [["type", "对象类型", [["合作方", "合作方"], ["客户", "客户"], ["集群", "集群"]]], ["band", "风险档", [["high", "较高、高"], ["R0", "R0 正常"], ["R1", "R1 关注"], ["R2", "R2 较高"], ["R3", "R3 高"], ["na", "待评估"]]], ["attn", "处理关注", attnOpts], ["country", "国家", [["PH", "PH"], ["MY", "MY"], ["TH", "TH"], ["ID", "ID"], ["VN", "VN"], ["SG", "SG"]]]] },
    evt: { name: "风险事件", filters: [["type", "事件类型", ["合作方风险聚合", "结算超时信号", "硬规则命中", "CRM 欺诈库命中", "集群", "违规", "规则评分事件"].map((x) => [x, x])], ["det", "认定", [["待认定", "待认定"], ["成立", "成立"], ["已排除", "已排除"]]], ["sig", "信号状态", [["待处理", "待处理"], ["调查中", "调查中"], ["已关闭", "已关闭"]]], ["attn", "处理关注", attnOpts], ["settle", "结算状态", [["冻结", "含冻结"]]]] },
    clu: { name: "集群", filters: [["det", "认定", [["待核验", "待核验"], ["已确认", "已确认"], ["已清除", "已清除"]]], ["ctrl", "控制状态", [["无", "无"], ["复核中", "复核中"], ["结算延长", "结算延长"], ["需人工", "需人工"]]], ["band", "风险档", ["R0", "R1", "R2", "R3"].map((x) => [x, x])], ["attn", "处理关注", attnOpts]] },
    bl: { name: "黑名单", filters: [["type", "类型", ["设备", "银行账户", "IP 段", "身份凭证"].map((x) => [x, x])], ["source", "来源", [["本地", "本地"], ["CRM", "CRM"]]], ["state", "状态", [["生效", "生效"], ["已失效", "已失效"]]], ["scope", "作用域", ["合作方", "活动", "渠道", "全局"].map((x) => [x, x])]] }
  };
  const data = (v) => ({ obj: ADM.riskObjects, evt: ADM.riskEvents, clu: ADM.riskClusters, bl: ADM.riskBlacklist }[v]);
  function attn(it, k) {
    const t = it.task || "";
    if (k === "unassigned") return t === "待认领";
    if (k === "mine") return t === "处理中";
    if (k === "approval") return t === "待审批" || it.appr === "待审批";
    if (k === "failed") return t === "执行失败";
    if (k === "over") return /已超时/.test(it.sla || "") || t === "已超时";
    if (k === "pending") return it.r === null;
    return true;
  }
  function match(v, it, f) {
    return Object.keys(f).every((k) => {
      const val = f[k]; if (!val) return true;
      if (k === "attn") return attn(it, val);
      if (k === "band") return val === "high" ? it.r === "R2" || it.r === "R3" : val === "na" ? it.r === null : it.r === val;
      if (k === "settle") return /冻结/.test(it.settle);
      if (k === "sig") return it.sig === val;
      return it[k] === val;
    });
  }
  const moreOn = () => !!(V.more.q || V.more.from || V.more.to || V.more.min);
  const amtNum = (a) => (a == null || a === "—" ? null : parseFloat(String(a).replace(/,/g, "")));
  const moreMatch = (it) => {
    const m = V.more, q = m.q.trim().toLowerCase();
    if (q && !JSON.stringify(it).toLowerCase().includes(q)) return false;
    const day = String(it.upd || it.at || it.from || "").slice(0, 10);
    if ((m.from || m.to) && !day) return false;
    if (m.from && day < m.from) return false;
    if (m.to && day > m.to) return false;
    if (m.min && showAmt()) { const n = amtNum(it.amt); if (n == null || n < parseFloat(m.min)) return false; }
    return true;
  };
  const rowsOf = () => data(V.view).filter((it) => match(V.view, it, V.f[V.view]) && moreMatch(it));
  const taskPill = (it) => (it.task === "—" ? "—" : `${esc(it.task)}<span class="sub">${esc(it.sla || "")}</span>`);

  function table(view) {
    const r = rowsOf(), total = r.length, pages = Math.max(1, Math.ceil(total / V.size)); if (V.page > pages) V.page = pages;
    const rows = r.slice((V.page - 1) * V.size, V.page * V.size);
    const rk = isRisk();
    const open = (id) => `data-open="${V.view}:${id}"`;
    let head, body;
    if (V.view === "obj") {
      head = "<th class='fixl'>对象</th><th>风险档</th><th>信用等级 C</th><th>主要原因</th><th class='num'>受影响案件</th><th class='num'>影响金额 (USD)</th><th>处理状态</th><th>结算资格</th><th>更新时间</th><th class='fixr'>操作</th>";
      body = rows.map((o) => `<tr><td class="fixl"><button class="link" ${open(o.id)}>${o.id}</button><span class="sub">${o.type}</span></td><td>${bandTag(o.r, o.agg)}</td><td>${o.c ? `<span class="rband c">${o.c}</span>` : "—"}</td><td>${rk ? esc(o.reasons[0]) + (o.reasons.length > 1 ? ` <span class="tag plain">+${o.reasons.length - 1} 项</span>` : "") : '<span style="color:var(--muted)">无权查看</span>'}</td><td class="num">${o.cases}</td><td class="num">${o.amt == null ? "金额待核验" : amtTxt(o.amt)}</td><td>${taskPill(o)}</td><td>${o.elig[0] === "可结算" ? '<span class="tag ok">可结算</span>' : `<span class="tag warn">受限</span><span class="sub">${esc(o.elig[1])}</span>`}</td><td>${o.upd}</td><td class="fixr"><div class="rowact"><button class="link" ${open(o.id)}>查看档案</button>${rk ? `<button class="link" data-review="obj:${o.id}">发起复核</button>` : ""}</div></td></tr>`).join("");
    } else if (V.view === "evt") {
      head = "<th class='fixl'>事件号</th><th>类型 / 来源</th><th>主对象</th><th>风险档 / 事件分</th><th>认定</th><th>信号</th><th>任务</th><th>审批</th><th>执行</th><th>结算</th><th class='num'>影响案件 / 金额</th><th>发生时间</th><th class='fixr'>操作</th>";
      body = rows.map((e) => `<tr><td class="fixl"><button class="link" ${open(e.id)}>${e.id}</button></td><td>${e.type}<span class="sub">${e.src}</span></td><td>${e.obj}${e.n > 1 ? `<span class="sub">关联 ${e.n} 个对象</span>` : ""}</td><td title="${esc(e.rule)}">${bandTag(e.r)}<span class="sub">${rk ? e.score + " 分" : "—"}</span></td><td>${e.det}</td><td>${e.sig}</td><td>${e.task}</td><td>${e.appr}</td><td>${e.exec}</td><td>${e.settle}</td><td class="num">${e.cases}<span class="sub">${amtTxt(e.amt)}</span></td><td>${e.at}</td><td class="fixr"><div class="rowact"><button class="link" ${open(e.id)}>查看</button>${rk ? `<button class="link" data-review="evt:${e.id}">发起复核</button>` : ""}</div></td></tr>`).join("");
    } else if (V.view === "clu") {
      head = "<th class='fixl'>集群号</th><th class='num'>成员 / 合作方</th><th>识别依据</th><th>认定</th><th>控制状态</th><th>风险档</th><th class='num'>影响金额 (USD)</th><th class='fixr'>操作</th>";
      body = rows.map((c) => `<tr><td class="fixl"><button class="link" ${open(c.id)}>${c.id}</button></td><td class="num">${c.members} / ${c.partners}</td><td>${esc(c.basis)}</td><td>${c.det}</td><td>${c.ctrl}</td><td>${bandTag(c.r)}</td><td class="num">${amtTxt(c.amt)}</td><td class="fixr"><div class="rowact"><button class="link" ${open(c.id)}>查看</button>${rk ? `<button class="link" data-review="clu:${c.id}">发起集群认定</button>` : ""}</div></td></tr>`).join("");
    } else {
      head = "<th class='fixl'>名单号</th><th>类型 / 脱敏标识</th><th>作用域</th><th>来源</th><th>状态 / 待变更</th><th>生效</th><th>到期</th><th class='fixr'>操作</th>";
      body = rows.map((b) => `<tr><td class="fixl"><button class="link" ${open(b.id)}>${b.id}</button></td><td>${b.type}<span class="sub">${b.mask}</span></td><td>${b.scope}</td><td>${b.source}${b.source === "CRM" ? '<span class="sub">只读</span>' : ""}</td><td>${b.state === "生效" ? '<span class="tag ok">生效</span>' : '<span class="tag">已失效</span>'}${b.pending !== "无" ? `<span class="sub">${b.pending}</span>` : ""}</td><td>${b.from}</td><td>${b.to}</td><td class="fixr"><div class="rowact"><button class="link" ${open(b.id)}>查看</button>${rk && b.source === "本地" && b.state === "生效" && b.pending === "无" ? `<button class="link" data-review="bl:${b.id}">发起移出</button>` : ""}</div></td></tr>`).join("");
    }
    const cols = head.split("<th").length - 1;
    return `<div class="table-wrap"><table class="dt" style="min-width:1100px"><thead><tr>${head}</tr></thead><tbody>${rows.length ? body : `<tr><td colspan="${cols}"><div class="empty"><b>${(moreOn() || Object.keys(V.f[V.view]).some((k) => V.f[V.view][k])) ? "没有符合条件的记录，请调整筛选条件" : "当前授权范围内没有未关闭的风险对象"}</b>${(moreOn() || Object.keys(V.f[V.view]).some((k) => V.f[V.view][k])) ? '<button class="btn" data-clearall>清除全部筛选</button>' : ""}</div></td></tr>`}</tbody></table></div><div class="tfoot"><span>共 ${total} 条 · 无批量冻结、放行、拒付等操作</span><div class="pager">${ADM.pager(total, V.page, V.size)}</div></div>`;
  }

  function renderRisk(main, route) {
    if (route.query.view && CFG[route.query.view]) V.view = route.query.view;
    const paint = () => {
      const objs = ADM.riskObjects, riskTasks = ADM.tasks.filter((t) => RISK_TYPES.includes(t.type) && ADM.activeStates.includes(t.state));
      const stats = [["未关闭高风险对象", objs.filter((o) => o.r === "R2" || o.r === "R3").length, "高风险", () => { V.view = "obj"; V.f.obj = { band: "high" }; }, "有未排除且未关闭事件的 R2/R3 对象；无直接快照的不计入"],
        ["待处理风险任务", riskTasks.length, "任务", () => { V.view = "evt"; V.f.evt = { attn: "unassigned" }; }, "风险来源任务中非终态数"],
        ["待审批风险处置", ADM.approvals.filter((a) => a.status === "pending" && ["任务处置", "调级", "黑名单", "清退"].includes(a.type)).length, "审批", () => { V.view = "evt"; V.f.evt = { attn: "approval" }; }, "风险来源审批中待审批数"],
        ["冻结案件金额", showAmt() ? "19,420.50" : "—", "冻结", () => { V.view = "evt"; V.f.evt = { settle: "冻结" }; }, "按案件三元组去重后的冻结金额合计，USD；不把多事件重复金额直接求和"]];
      V._stats = stats;
      const failed = objs.filter((o) => o.task === "执行失败").length;
      const f = V.f[V.view], cfg = CFG[V.view];
      const chips = Object.keys(f).filter((k) => f[k]).map((k) => { const fl = cfg.filters.find((x) => x[0] === k); const o = fl[2].find((x) => x[0] === f[k]); return `<span class="chip">${fl[1]}：${esc(o ? o[1] : f[k])}<button data-clear="${k}" aria-label="移除${fl[1]}">×</button></span>`; }).join("");
      $("#rk").innerHTML = `${failed ? `<div class="callout bad" style="margin-bottom:16px">有 ${failed} 项处置执行失败，请到 <a href="#/tasks">任务队列</a> 重试失败项；已成功项不会重复执行。</div>` : ""}
        ${isRisk() ? "" : `<div class="callout info" style="margin-bottom:16px">当前为${ADM.role().name}视角：仅显示摘要（风险档、认定状态、影响案件数）${role() === "fin" ? "和冻结金额" : ""}；风险明细、证据与触发快照不可见。</div>`}
        <div class="stats">${stats.map((s, i) => `<button class="stat" data-stat="${i}"><div class="name">${s[0]}</div><div class="val num ${s[1] === "—" ? "null" : ""}">${s[1]}</div><div class="delta">${s[1] === "—" ? "无权查看金额" : "&nbsp;"}</div><span class="tip">${esc(s[4])}</span></button>`).join("")}</div>
        <div class="seg" style="margin-bottom:12px" role="group" aria-label="视角">${Object.keys(CFG).map((k) => `<button data-view="${k}" aria-pressed="${V.view === k}">${CFG[k].name}</button>`).join("")}</div>
        <div class="filters">${cfg.filters.map((fl) => `<select class="select" data-f="${fl[0]}" aria-label="${fl[1]}"><option value="">全部${fl[1]}</option>${fl[2].map((o) => `<option value="${o[0]}" ${f[fl[0]] === o[0] ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>`).join("")}<button class="btn" data-more aria-expanded="${V.panel}">${ADM.icon("filter", 'style="width:14px;height:14px"')}更多筛选${moreOn() ? " ●" : ""}</button><span style="margin-left:auto;color:var(--muted);font-size:12px">默认显示未关闭 / 仍有影响的记录，不按近 30 天隐藏旧冻结</span></div>
        ${V.panel ? `<div class="filters" style="border-top:1px solid var(--line);padding-top:12px;align-items:end"><label style="font-size:12px;color:var(--muted)">关键词<br><input class="field" id="mq" style="width:200px" placeholder="对象 / 事件号 / 原因" value="${esc(V.more.q)}"></label><label style="font-size:12px;color:var(--muted)">时间起<br><input class="field" type="date" id="mf" value="${V.more.from}"></label><label style="font-size:12px;color:var(--muted)">时间止<br><input class="field" type="date" id="mt" value="${V.more.to}"></label>${showAmt() ? `<label style="font-size:12px;color:var(--muted)">影响金额不低于 (USD)<br><input class="field" id="mm" style="width:140px" inputmode="decimal" value="${esc(V.more.min)}"></label>` : ""}<button class="btn primary" data-moreok>应用</button><button class="btn ghost" data-moreclr>重置</button></div>` : ""}
        <div class="chips">${chips}${chips || moreOn() ? '<button class="btn sm ghost" data-clearall>清除全部</button>' : ""}</div>${table()}`;
    };
    main.innerHTML = `<div class="adm-crumb"><span>风控与合规</span><span>/</span><span>风险工作台</span></div>
      <div class="adm-pagehead"><div><h1>风险工作台</h1><p class="sub">定位风险对象、查明事实与受影响案件，经统一任务与审批处置。本页不直接付款、不改佣金。</p></div><div class="actions"><button class="btn" id="rkRefresh">${ADM.icon("refresh", 'style="width:14px;height:14px"')}刷新</button></div></div><div id="rk"></div>`;
    paint();
    const rk = $("#rk");
    rk.onchange = (e) => { const k = e.target.dataset.f; if (k) { V.f[V.view][k] = e.target.value; V.page = 1; paint(); } };
    rk.onclick = (e) => {
      const t = e.target.closest("button"); if (!t) return; const d = t.dataset;
      if (d.view) { V.view = d.view; V.page = 1; paint(); }
      else if (d.stat) { V._stats[+d.stat][3](); V.page = 1; paint(); }
      else if (d.clear) { V.f[V.view][d.clear] = ""; paint(); }
      else if (t.hasAttribute("data-more")) { V.panel = !V.panel; paint(); }
      else if (t.hasAttribute("data-moreok")) { const g = (i) => (rk.querySelector("#" + i) || { value: "" }).value.trim(); const mn = g("mm"); if (mn && !/^\d+(\.\d{1,2})?$/.test(mn)) { ADM.toast("金额请填写非负数字", "err"); return; } V.more = { q: g("mq"), from: g("mf"), to: g("mt"), min: mn }; if (V.more.from && V.more.to && V.more.from > V.more.to) { V.more.to = ""; ADM.toast("结束日期早于开始日期，已清空结束日期", "err"); } V.page = 1; paint(); }
      else if (t.hasAttribute("data-moreclr")) { V.more = { q: "", from: "", to: "", min: "" }; V.page = 1; paint(); }
      else if (t.hasAttribute("data-clearall")) { V.f[V.view] = {}; V.more = { q: "", from: "", to: "", min: "" }; paint(); }
      else if (d.pg) { V.page = +d.pg; paint(); }
      else if (d.open) { const [v, id] = d.open.split(":"); openArchive(v, id, paint); }
      else if (d.review) { const [v, id] = d.review.split(":"); reviewModal(v, id, paint); }
    };
    $("#rkRefresh").onclick = () => { paint(); ADM.toast("已刷新"); };
  }

  /* ---------- 发起复核 ---------- */
  function purposesFor(v, id) {
    if (v === "obj") { const o = ADM.riskObjects.find((x) => x.id === id); return o && o.type === "集群" ? ["cluster_determination", "cluster_member_correction", "risk_investigation"] : ["risk_investigation"]; }
    if (v === "evt") { const e = ADM.riskEvents.find((x) => x.id === id); return e.type === "结算超时信号" ? ["signal_review", "risk_investigation"] : e.type === "集群" ? ["cluster_determination", "risk_investigation"] : ["risk_investigation"]; }
    if (v === "clu") return ["cluster_determination", "cluster_member_correction"];
    return ["blacklist_remove"];
  }
  const objOf = (v, id) => (v === "evt" ? ADM.riskEvents.find((x) => x.id === id).obj : v === "bl" ? id : id);
  function reviewModal(v, id, done) {
    const ps = purposesFor(v, id), target = objOf(v, id);
    ADM.modal({
      title: "发起复核", wide: false,
      body: `<div class="form-row"><label for="rvP">任务目的</label><select class="select" id="rvP" style="width:100%">${ps.map((p) => `<option value="${p}">${ADM.riskPurposes[p].n}</option>`).join("")}</select></div>
        <div class="form-row"><label for="rvW">原因说明（10–1000 字）</label><textarea class="field" id="rvW" rows="4" style="width:100%;height:auto;padding:8px 12px"></textarea><div id="rvE" style="color:var(--danger);font-size:12px"></div></div>
        <p style="font-size:12px;color:var(--muted)">仅创建复核任务，不执行任何业务处置。同一对象同一目的只保留一个处理中任务。</p>`,
      okText: "创建复核任务",
      onOk: (m) => {
        const p = m.querySelector("#rvP").value, w = m.querySelector("#rvW").value.trim();
        if (w.length < 10 || w.length > 1000) { m.querySelector("#rvE").textContent = "请填写 10–1000 字的原因说明"; return false; }
        const ex = ADM.tasks.find((t) => t.obj === target && purposeOf(t) === p && ADM.activeStates.includes(t.state));
        if (ex) { ADM.toast(`该对象已有同目的的处理中任务（${ex.id}）`); return true; }
        const n = "T-" + (24127 + ADM.tasks.length - 26);
        ADM.tasks.push({ id: n, title: `${ADM.riskPurposes[p].n}：${target}`, type: typeOfPurpose[p], obj: target, ref: id, pri: "中", state: "open", owner: null, team: "风控复核组", dueIn: 24, risk: (ADM.riskObjects.find((o) => o.id === target) || {}).r || "R1", amt: "—", upd: NOW, version: 1, purpose: p, reason: w });
        ADM.toast(`复核任务已创建（${n}）`); ADM.refreshNav(); done(); return true;
      }
    });
  }

  /* ---------- 抽屉：档案 / 证据 / 案件影响 / 统一任务 / 审批与执行 ---------- */
  function openArchive(v, id, done) {
    const target = objOf(v, id);
    const tabsAll = [["pro", "档案"], ["evi", "证据"], ["cas", "案件影响"], ["tsk", "统一任务"], ["apv", "审批与执行"]];
    const allowed = isRisk() ? tabsAll : role() === "fin" ? tabsAll.filter((t) => ["pro", "cas"].includes(t[0])) : tabsAll.filter((t) => t[0] === "pro");
    const it = data(v).find((x) => x.id === id);
    ADM._rd = ADM._rd || {}; const st = ADM._rd[target] || (ADM._rd[target] = { plan: "", why: "", preview: false, ok: false });
    ADM.drawer.open({
      title: `${id}　${{ obj: "风险对象", evt: "风险事件", clu: "集群", bl: "黑名单" }[v]}`,
      sub: v === "obj" ? bandTag(it.r, it.agg) : v === "evt" ? `${it.type} · ${bandTag(it.r)}` : "",
      tabs: allowed.map((t) => ({ key: t[0], label: t[1] })),
      body: (tab) => bodyOf(v, it, target, tab, st),
      foot: (tab) => (isRisk() && tab === "tsk" ? tskFoot(target, st) : '<button class="btn" id="rkClose">关闭</button>'),
      bind: (d, tab) => bindDrawer(d, v, id, target, tab, st, done)
    });
  }
  function bodyOf(v, it, target, tab, st) {
    const rk = isRisk();
    if (tab === "pro") {
      let h = "";
      if (v === "obj") h = kv([["对象", `${it.type} ${it.id}`], ["风险档", bandTag(it.r, it.agg)], ["信用等级 C（独立展示）", it.c || "—"], ["国家", it.country], ["结算资格", it.elig[0] + (it.elig[1] ? "：" + esc(it.elig[1]) : "")], ["数据更新", it.upd]]) +
        (rk ? `<div class="section"><h4>风险依据与评分</h4><div class="table-wrap"><table class="dt"><thead><tr><th>事件</th><th class="num">基础分</th><th class="num">权重</th><th class="num">贡献</th><th>规则版本</th></tr></thead><tbody>${ADM.riskEvents.filter((e) => e.obj === it.id).map((e) => `<tr><td>${e.id}</td><td class="num">${e.score}</td><td class="num">1.0</td><td class="num">${e.score}</td><td>${esc(e.rule)}</td></tr>`).join("") || '<tr><td colspan="5">暂无直接事件（关联最高）</td></tr>'}</tbody></table></div></div><div class="section"><h4>主要原因</h4><p>${it.reasons.map(esc).join("、")}</p></div>` : `<div class="callout info" style="margin-top:12px">风险明细、评分与触发快照仅风控可见。</div>`) +
        (it.r === null ? '<div class="callout info" style="margin-top:12px">尚无直接风险快照，显示“待评估”，不按 R0 处理。</div>' : "");
      if (v === "evt") {
        h = kv([["事件号", it.id], ["类型 / 来源", `${it.type} / ${it.src}`], ["主对象", it.obj + (it.n > 1 ? `（关联 ${it.n} 个）` : "")], ["认定", it.det], ["信号", it.sig], ["任务 / 审批 / 执行", `${it.task} / ${it.appr} / ${it.exec}`], ["结算", it.settle], ["发生时间", it.at]]);
        h += rk ? `<div class="section"><h4>触发快照与当前观察值</h4><div class="table-wrap"><table class="dt"><tbody>${it.trig.map((x) => `<tr><td>${esc(x[0])}</td><td><b>${esc(x[1])}</b></td></tr>`).join("")}</tbody></table></div><p style="color:var(--muted);font-size:12px;margin-top:8px">${esc(it.now)}</p><p style="color:var(--muted);font-size:12px">规则版本：${esc(it.rule)}</p></div>` : `<div class="callout info" style="margin-top:12px">触发快照与证据仅风控可见。</div>`;
      }
      if (v === "clu") h = kv([["集群号", it.id], ["成员 / 合作方", `${it.members} / ${it.partners}`], ["识别依据", esc(it.basis)], ["认定 / 控制", `${it.det} / ${it.ctrl}`], ["风险档", bandTag(it.r)], ["影响金额 (USD)", amtTxt(it.amt)]]) + `<div class="section"><h4>特征（脱敏）</h4><p>${it.feats.join("、")}</p></div><div class="callout info">确认集群须有两条独立有效特征或权威例外；认定不直接解除控制状态。</div>`;
      if (v === "bl") h = kv([["名单号", it.id], ["类型 / 标识", `${it.type} / ${it.mask}`], ["作用域", it.scope], ["来源", it.source], ["状态", it.state + (it.pending !== "无" ? "（" + it.pending + "）" : "")], ["生效 / 到期", `${it.from} / ${it.to}`]]) + (it.source === "CRM" ? '<div class="callout info" style="margin-top:12px">该名单来自 CRM，仅可查看。</div>' : "") + '<p style="color:var(--muted);font-size:12px;margin-top:12px">本页没有“新增黑名单”入口；加入申请从对象档案、事件或集群中发起。</p>';
      if (role() === "admin") h += `<div class="section"><h4>排障信息</h4>${kv([["数据来源", v === "evt" ? it.src : "规则引擎 / CRM"], ["TraceId", "tr-" + String(it.id).replace(/\W/g, "").toLowerCase().slice(0, 8) + "a1"], ["数据质量", "完整"]])}<p style="color:var(--muted);font-size:12px">技术排查权限不等于风险审批或财务执行。</p></div>`;
      return h;
    }
    if (tab === "evi") return `<div class="table-wrap"><table class="dt"><thead><tr><th>证据</th><th>来源</th><th>采集时间</th><th>扫描</th><th>访问级别</th></tr></thead><tbody>
      <tr><td>触发快照导出</td><td>规则引擎 v3</td><td>2026-11-19 09:12</td><td><span class="tag ok">通过</span></td><td>摘要</td></tr>
      <tr><td>点击与转化明细</td><td>事件流水</td><td>2026-11-19 09:10</td><td><span class="tag ok">通过</span></td><td>摘要（全文需额外授权）</td></tr>
      <tr><td>人工补充截图</td><td>上传</td><td>2026-11-18 16:40</td><td><span class="tag warn">待扫描</span></td><td>摘要</td></tr>
      <tr><td>旧版设备记录</td><td>CRM</td><td>2026-09-02</td><td><span class="tag bad">已过期</span></td><td>无权</td></tr></tbody></table></div><p style="color:var(--muted);font-size:12px;margin-top:8px">扫描未通过、无权或过期的证据不能用于提交。全文预览与下载需额外授权并留痕；证据上传策略值待确认，未配置时上传禁用。</p>`;
    if (tab === "cas") {
      const o = ADM.riskObjects.find((x) => x.id === target) || { cases: 1, amt: null }, n = Math.min(o.cases, 4);
      const rowsH = Array.from({ length: n }).map((_, i) => `<tr><td>C-${80300 + i * 17}</td><td>CM-${4400 + i * 9}</td><td>CS-${5530 + i * 7}</td><td class="num">${showAmt() ? (400 + i * 130).toFixed(2) : "—"}</td><td class="num">${showAmt() ? (i < 2 ? (400 + i * 130).toFixed(2) : "0.00") : "—"}</td><td>${i < 2 ? '<span class="tag warn">冻结</span>' : '<span class="tag ok">可结算</span>'}</td><td>${i < 2 ? "风险事件未关闭" : "—"}</td></tr>`).join("");
      return `<div class="table-wrap"><table class="dt"><thead><tr><th>客户</th><th>佣金案件</th><th>结算案件</th><th class="num">佣金 (USD)</th><th class="num">冻结 (USD)</th><th>结算状态</th><th>阻断原因</th></tr></thead><tbody>${rowsH}</tbody></table></div><div class="callout info" style="margin-top:12px">限制按案件三元组绑定：同客户其他案件、同合作方其他客户、同批次其他案件不连带。佣金与冻结金额分列，不混用。</div>`;
    }
    if (tab === "tsk") {
      const ts = ADM.tasks.filter((t) => t.obj === target && RISK_TYPES.includes(t.type));
      const mineT = myTask(target);
      let f = "";
      if (rk) {
        f = mineT ? `<div class="section"><h4>处置申请（任务 ${mineT.id}）</h4>
          <div class="form-row"><label for="plan">处置计划项</label><select class="select" id="plan" style="width:100%"><option value="">请选择</option>${(ADM.riskPurposes[purposeOf(mineT) || "risk_investigation"] || ADM.riskPurposes.risk_investigation).plans.map((p) => `<option ${st.plan === p ? "selected" : ""}>${p}</option>`).join("")}</select></div>
          <div class="form-row"><label for="why">处置理由</label><textarea class="field" id="why" rows="3" style="width:100%;height:auto;padding:8px 12px">${esc(st.why)}</textarea></div>
          <button class="btn" id="preview">预览影响</button>
          ${st.preview ? `<div class="callout info" style="margin-top:12px">影响预览：去重后金额 USD ${amtTxt((ADM.riskObjects.find((o) => o.id === target) || {}).amt)}；影响案件 ${(ADM.riskObjects.find((o) => o.id === target) || { cases: 1 }).cases} 个；所需审批：风控节点（审批人须为他人）${/转财务/.test(st.plan) ? " + 财务节点" : ""}。观察不能关闭任务；放行不能与冻结同批并存。</div><label style="display:flex;gap:8px;margin-top:8px"><input type="checkbox" id="ack" ${st.ok ? "checked" : ""}> 我已确认上述影响范围</label>` : ""}</div>` : `<div class="callout info" style="margin-top:12px">你名下没有该对象处理中的任务。请先认领任务，或点击“发起复核”创建。</div>`;
      }
      return `<div class="table-wrap"><table class="dt"><thead><tr><th>任务</th><th>目的</th><th>状态</th><th>处理人</th><th>时限</th></tr></thead><tbody>${ts.map((t) => `<tr><td class="id"><a href="#/tasks?task_id=${t.id}">${t.id}</a></td><td>${esc((ADM.riskPurposes[purposeOf(t)] || { n: ADM.taskTypes[t.type].name }).n)}</td><td>${ADM.stateTag(t.state)}</td><td>${esc(ADM.userName(t.owner))}</td><td>${ADM.slaTag(t)}</td></tr>`).join("") || '<tr><td colspan="5"><div class="empty" style="padding:16px">暂无相关任务</div></td></tr>'}</tbody></table></div>${f}${rk ? '<div class="callout warn" style="margin-top:12px">风险处置申请不允许自行审批，请等待其他审批人。资金类建议只创建关联财务任务，风控批准不代替财务终审。</div>' : ""}`;
    }
    const aps = ADM.approvals.filter((a) => a.obj.includes(target) || a.refs.some((r) => ADM.tasks.some((t) => t.id === r && t.obj === target)));
    return aps.length ? aps.map((a) => `<div class="section"><h4>${a.id} · ${a.summary}</h4><p>${ADM.approvalStatus[a.status].n}；审批链：${a.chain.map((c, i) => (i < a.step || a.status !== "pending" && a.status !== "returned" ? "✓ " : i === a.step && a.status === "pending" ? "● " : "○ ") + c.name).join(" → ")}</p><button class="btn sm" data-ap="${a.id}">查看审批</button></div>`).join("") + '<p style="color:var(--muted);font-size:12px">批准与执行分开；部分成功逐项展示，失败项可按原范围重试。</p>' : '<div class="empty"><b>尚无相关审批</b>在“统一任务”页提交处置申请后，审批会显示在这里。</div>';
  }
  const myTask = (target) => ADM.tasks.find((t) => t.obj === target && RISK_TYPES.includes(t.type) && t.owner === ADM.role().userId && ["processing", "returned"].includes(t.state));
  function tskFoot(target, st) {
    const t = myTask(target);
    return '<button class="btn" id="rkClose">关闭</button>' + (t ? `<button class="btn" id="saveDraft">保存草稿</button><button class="btn primary" id="submitAp" ${st.preview && st.ok && st.plan ? "" : "disabled"}>提交审批</button>` : "");
  }
  function bindDrawer(d, v, id, target, tab, st, done) {
    const on = (i, fn) => { const e = d.querySelector("#" + i); if (e) e.onclick = fn; };
    on("rkClose", () => ADM.drawer.close());
    $$("[data-ap]", d).forEach((b) => (b.onclick = () => { ADM.drawer.close(); ADM.openApproval(b.dataset.ap, () => {}); }));
    const pl = d.querySelector("#plan"); if (pl) pl.onchange = () => { st.plan = pl.value; st.preview = false; st.ok = false; ADM.drawer.paint(); };
    const wy = d.querySelector("#why"); if (wy) wy.oninput = () => (st.why = wy.value);
    const ack = d.querySelector("#ack"); if (ack) ack.onchange = () => { st.ok = ack.checked; ADM.drawer.paint(); };
    on("preview", () => { if (!st.plan) { ADM.toast("请先选择处置计划项", "err"); return; } if (st.plan.indexOf("观察") >= 0 && !st.why) { ADM.toast("观察须填写复查时间说明", "err"); return; } st.preview = true; ADM.drawer.paint(); });
    on("saveDraft", () => ADM.toast("草稿已保存：关闭后再次打开仍保留处置选择与理由（演示期内有效）"));
    on("submitAp", () => {
      const t = myTask(target); if (!t) return;
      if ((st.why || "").trim().length < 5) { ADM.toast("请填写至少 5 个字的处置理由", "err"); const wy = d.querySelector("#why"); if (wy) wy.focus(); return; }
      const n = "AP-" + (3114 + ADM.approvals.length - 13);
      const chain = [{ name: "风控复核", role: "risk" }].concat(/转财务/.test(st.plan) ? [{ name: "财务复核", role: "fin" }] : []);
      ADM.approvals.push({ id: n, type: "任务处置", obj: "对象 " + target, summary: `${st.plan}（${t.id}）`, amt: (ADM.riskObjects.find((o) => o.id === target) || {}).amt || "—", applicant: ADM.role().userId, at: NOW, waitH: 0, limitH: 24, chain, step: 0, status: "pending", capital: false, previewValid: true, taskId: t.id, refs: [t.id], diff: [["处置计划", "无", st.plan]], impact: "按预览范围执行；不连带其他案件。", reason: st.why || "—", records: [{ node: "提交", who: ADM.user().name, role: ADM.role().name, decision: "提交申请", note: "", at: NOW }] });
      t.state = "pending_approval"; t.version++; t.upd = NOW;
      delete ADM._rd[target]; ADM.audit("提交风险处置审批", "对象 " + target, st.why, { before: "处理中", after: "待审批" }); delete ADM._rd[target]; ADM.audit("提交风险处置审批", "对象 " + target, st.why, { before: "处理中", after: "待审批" }); ADM.toast(`处置申请已提交审批（${n}）`); ADM.refreshNav(); ADM.drawer.close(); done();
    });
  }

  /* =============== 案件与合规任务 =============== */
  const G = { group: "all", scope: "mine", q: "", state: "", sla: "", stat: "", page: 1, size: 20 };
  const GROUPS = [["all", "全部风控任务", RISK_TYPES], ["risk", "风险复核", ["risk_review"]], ["settle", "结算复核", ["settlement_overdue", "hold_extend"]], ["cb", "熔断复核", ["circuit_breaker"]], ["credit", "信用调级", ["credit_review"]]];
  function renderReview(main) {
    const rk = isRisk(), me = ADM.role().userId;
    const base = () => ADM.tasks.filter((t) => GROUPS.find((g) => g[0] === G.group)[2].includes(t.type));
    const act = (t) => ADM.activeStates.includes(t.state);
    const paint = () => {
      const all = ADM.tasks.filter((t) => RISK_TYPES.includes(t.type) && act(t));
      const stats = [["我的待办", all.filter((t) => t.owner === me).length, "mine"], ["待认领", all.filter((t) => t.state === "open" && !t.owner).length, "claim"], ["即将超时", all.filter((t) => t.dueIn != null && t.dueIn >= 0 && t.dueIn <= 6).length, "soon"], ["已超时", all.filter((t) => t.dueIn != null && t.dueIn < 0).length, "over"], ["待审批", all.filter((t) => t.state === "pending_approval").length, "appr"], ["执行失败", all.filter((t) => t.state === "execution_failed").length, "fail"]];
      let r = base();
      if (G.scope === "mine") r = r.filter((t) => t.owner === me && act(t)); else if (G.scope === "claim") r = r.filter((t) => t.state === "open" && !t.owner); else if (G.scope === "team") r = r.filter((t) => t.team === (ADM.users[me] || {}).team);
      if (G.stat === "soon") r = r.filter((t) => t.dueIn != null && t.dueIn >= 0 && t.dueIn <= 6 && act(t));
      if (G.stat === "over") r = r.filter((t) => t.dueIn != null && t.dueIn < 0 && act(t));
      if (G.stat === "appr") r = r.filter((t) => t.state === "pending_approval");
      if (G.stat === "fail") r = r.filter((t) => t.state === "execution_failed");
      if (G.state) r = r.filter((t) => t.state === G.state);
      if (G.sla === "over") r = r.filter((t) => t.dueIn != null && t.dueIn < 0); if (G.sla === "none") r = r.filter((t) => t.dueIn == null);
      const q = G.q.trim().toLowerCase(); if (q) r = r.filter((t) => (t.id + t.title + t.obj + t.ref).toLowerCase().includes(q));
      r.sort((a, b) => (a.dueIn == null ? 1e9 : a.dueIn) - (b.dueIn == null ? 1e9 : b.dueIn));
      const total = r.length, pages = Math.max(1, Math.ceil(total / G.size)); if (G.page > pages) G.page = pages;
      const view = r.slice((G.page - 1) * G.size, G.page * G.size);
      const filtered = G.q || G.state || G.sla || G.stat;
      $("#rv").innerHTML = `${rk ? "" : `<div class="callout info" style="margin-bottom:16px">当前角色只读：仅显示任务类型、状态、对象与时限，不含证据与风险明细。</div>`}
        <div class="callout" style="margin-bottom:16px;background:var(--surface-accent)">申诉复核请前往 <a href="#/appeals-service">申诉与客服服务</a>，本页不处理申诉。</div>
        <div class="stats">${stats.map((s) => `<button class="stat" data-stat="${s[2]}" aria-pressed="${G.stat === s[2] || (s[2] === "mine" && G.scope === "mine" && !G.stat && false)}"><div class="name">${s[0]}</div><div class="val num">${s[1]}</div></button>`).join("")}</div>
        <div class="tabs" style="margin-bottom:12px" role="tablist">${GROUPS.map((g) => `<button role="tab" data-g="${g[0]}" aria-selected="${G.group === g[0]}">${g[1]}</button>`).join("")}</div>
        <div class="filters"><div class="seg">${[["mine", "我的待办"], ["claim", "待认领"], ["team", "团队任务"], ["all", "全部可见"]].map((s) => `<button data-scope="${s[0]}" aria-pressed="${G.scope === s[0]}">${s[1]}</button>`).join("")}</div>
          <input class="field search" id="rq" placeholder="任务号、来源单号、合作方 / 客户 ID" value="${esc(G.q)}" aria-label="关键词">
          <select class="select" id="rstate" aria-label="状态"><option value="">全部状态</option>${Object.keys(ADM.taskStates).map((k) => `<option value="${k}" ${G.state === k ? "selected" : ""}>${ADM.taskStates[k].name}</option>`).join("")}</select>
          <select class="select" id="rsla" aria-label="处理时限"><option value="">全部时限</option><option value="over" ${G.sla === "over" ? "selected" : ""}>已超时</option><option value="none" ${G.sla === "none" ? "selected" : ""}>未配置</option></select></div>
        <div class="table-wrap"><table class="dt" style="min-width:1100px"><thead><tr><th class="fixl">任务号</th><th>类型 / 目的</th><th>对象</th><th>风险档 / 信用</th><th class="num">影响金额 (USD)</th><th>状态</th><th>处理人</th><th>处理时限</th><th class="fixr">操作</th></tr></thead><tbody>
        ${view.length ? view.map((t) => { const m = /(C\d) → (C\d)/.exec(t.title); const p = purposeOf(t); return `<tr><td class="fixl id"><button class="link" data-open="${t.id}">${t.id}</button></td><td>${ADM.taskTypes[t.type].name}${p ? `<span class="sub">${ADM.riskPurposes[p].n}</span>` : ""}</td><td>${t.obj}<span class="sub">${esc(t.ref)}</span></td><td><span class="rband ${t.risk.toLowerCase()}">${t.risk}</span>${m ? `<span class="sub">信用 ${m[1]} → ${m[2]}</span>` : ""}</td><td class="num">${rk || role() === "fin" ? t.amt : "无权查看"}</td><td>${ADM.stateTag(t.state)}</td><td>${t.owner ? esc(ADM.userName(t.owner)) : "待分配"}</td><td>${ADM.slaTag(t)}</td><td class="fixr"><div class="rowact"><button class="link" data-open="${t.id}">查看</button>${rk && t.state === "open" && !t.owner ? `<button class="link" data-claim="${t.id}">认领</button>` : ""}</div></td></tr>`; }).join("")
          : `<tr><td colspan="9"><div class="empty"><b>${filtered ? "没有符合条件的任务，请调整筛选条件" : "当前没有待处理的风控任务"}</b>${filtered ? '<button class="btn" data-clearall>清除全部筛选</button>' : ""}</div></td></tr>`}</tbody></table></div>
        <div class="tfoot"><span>共 ${total} 条 · 与任务队列同一份任务，无独立状态机</span><div class="pager">${ADM.pager(total, G.page, G.size)}</div></div>`;
    };
    main.innerHTML = `<div class="adm-crumb"><span>风控与合规</span><span>/</span><span>案件与合规任务</span></div>
      <div class="adm-pagehead"><div><h1>案件与合规任务</h1><p class="sub">任务队列的风控视角预置视图：风险复核、结算复核、熔断复核、信用调级。</p></div></div><div id="rv"></div>`;
    paint();
    const rv = $("#rv");
    rv.onchange = (e) => { if (e.target.id === "rstate") G.state = e.target.value; if (e.target.id === "rsla") G.sla = e.target.value; G.page = 1; paint(); };
    rv.onkeydown = (e) => { if (e.key === "Enter" && e.target.id === "rq") { G.q = e.target.value; G.page = 1; paint(); $("#rq").focus(); } };
    rv.onclick = (e) => {
      const t = e.target.closest("button"); if (!t) return; const d = t.dataset;
      if (d.g) { G.group = d.g; G.page = 1; paint(); }
      else if (d.scope) { G.scope = d.scope; G.stat = ""; G.page = 1; paint(); }
      else if (d.stat) { if (d.stat === "mine") { G.scope = "mine"; G.stat = ""; } else if (d.stat === "claim") { G.scope = "claim"; G.stat = ""; } else { G.scope = "all"; G.stat = G.stat === d.stat ? "" : d.stat; } G.page = 1; paint(); }
      else if (t.hasAttribute("data-clearall")) { Object.assign(G, { q: "", state: "", sla: "", stat: "" }); paint(); }
      else if (d.pg) { G.page = +d.pg; paint(); }
      else if (d.open) ADM.openTask(d.open, paint, !rk);
      else if (d.claim) { const t0 = ADM.tasks.find((x) => x.id === d.claim); if (t0.owner) { ADM.toast("任务已被他人认领", "err"); } else { t0.owner = me; t0.state = "processing"; t0.team = ADM.user().team; t0.version++; ADM.toast("已认领 1 个任务"); ADM.refreshNav(); } paint(); }
    };
  }

  ADM.pages["risk-event"] = renderRisk;
  ADM.pages["risk-review"] = renderReview;
})();
