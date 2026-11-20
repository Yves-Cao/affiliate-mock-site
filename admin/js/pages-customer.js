/* 页面 17 客户 360 / 页面 18 归属与事件 */
(function () {
  const ADM = window.ADM, esc = ADM.esc, $ = ADM.$, $$ = ADM.$$, U = ADM.ui;
  const NOW = "2026-11-19 10:30";
  const role = () => ADM.role().key;
  const kv = U.kv;
  const TONE = { 有效转化: "ok", 已首次入金: "info", 已注册: "", 流失: "", 已锁定: "ok", 冲突: "bad", 待确定: "warn", "IB 排除": "", 无有效来源: "warn", 已释放: "", 事实不完整: "warn", 版本乱序: "warn", 配置缺失: "warn", 注册早于点击: "warn" };
  const tg = (s) => `<span class="tag ${TONE[s] || ""}">${esc(s)}</span>`;
  const partnerName = (id) => { const p = ADM.partners.find((x) => x.id === id); return id ? `${esc(p ? p.name : id)}<span class="sub">${id}</span>` : "未归属"; };
  const rb = (r) => (r ? `<span class="rband ${r.toLowerCase()}">${r}</span>` : '<span class="tag plain">待评估</span>');
  const canR = () => role() === "risk" || role() === "admin" || role() === "ops";
  const commSum = (c) => (c.comm.length ? c.comm.map((x) => `${x[0]} ${x[1]}`).join(" · ") : "—");

  /* 创建（或复用）任务：同对象同目的只保留一个处理中任务 */
  function makeTask(o) {
    const ex = ADM.tasks.find((t) => t.obj === o.obj && t.type === o.type && ADM.activeStates.includes(t.state));
    if (ex) { ADM.toast(`该对象已有同目的的处理中任务（${ex.id}）`); return ex; }
    const n = "T-" + (24127 + ADM.tasks.length - 26);
    const t = { id: n, title: o.title, type: o.type, obj: o.obj, ref: o.ref || "—", pri: "中", state: "open", owner: null, team: o.team, dueIn: 24, risk: o.risk || "R0", amt: "—", upd: NOW, version: 1, reason: o.reason };
    ADM.tasks.push(t); ADM.toast(`任务已创建（${n}）`); ADM.refreshNav(); return t;
  }
  ADM.makeTask = makeTask;
  function reviewModal(title, o, done) {
    ADM.modal({ title, body: `<p>只创建任务，不修改归属、事件或佣金事实。</p>${U.reasonRow("rvW", "原因（10–1000 字，必填）")}`, okText: "创建任务", onOk: (m) => { const w = m.querySelector("#rvW").value.trim(); if (w.length < 10 || w.length > 1000) { m.querySelector("#rvWE").textContent = "请填写 10–1000 字的原因"; return false; } makeTask(Object.assign({ reason: w }, o)); if (done) done(); } });
  }

  /* =============== 客户 360 =============== */
  const CL = { S: {}, stat: "" };
  function renderClient(main, route) {
    if (route.key === "customer-360" && route.params[0]) return detail(main, route.params[0], route.query.tab);
    U.head(main, "客户与归因", "客户 360", "只读：客户由 CRM 注册产生，统一以客户 ID 标识，不显示姓名、邮箱、手机号或证件。归属争议、事件缺数通过任务处理。");
    const all = ADM.customers;
    const abn = all.filter((c) => ["冲突", "待确定"].includes(c.attr) || c.missing);
    $("#fx").innerHTML = `<div class="stats"><button class="stat" data-s="all"><div class="name">客户总数</div><div class="val num">${all.length}</div><div class="delta">授权范围内去重</div></button><button class="stat" data-s="qc"><div class="name">有效转化客户</div><div class="val num">${all.filter((c) => c.life === "有效转化").length}</div><div class="delta">&nbsp;</div></button><button class="stat" data-s="abn"><div class="name">归属异常</div><div class="val num">${abn.length}</div><div class="delta">冲突 / 事实不完整 / 乱序</div></button><button class="stat" ${canR() ? 'data-s="risk"' : "disabled"}><div class="name">有风险关联</div><div class="val num ${canR() ? "" : "null"}">${canR() ? all.filter((c) => c.r === "R2" || c.r === "R3").length : "—"}</div><div class="delta">${canR() ? "&nbsp;" : "当前角色无权查看"}</div></button></div><div id="cl"></div>`;
    const repaint = U.list($("#cl"), { S: CL.S, empty: "暂无客户", kwHint: "客户 ID（精确）、合作方 ID", minW: 1250, foot: "无批量处理；导出请到导出中心",
      rows: () => all.filter((c) => !CL.stat || (CL.stat === "qc" ? c.life === "有效转化" : CL.stat === "abn" ? abn.includes(c) : c.r === "R2" || c.r === "R3")),
      kw: (c) => c.id + (c.partner || ""), filters: [["life", "生命周期", ["已注册", "已首次入金", "有效转化", "流失"].map((x) => [x, x])], ["attr", "归属状态", ["待确定", "已锁定", "冲突", "IB 排除", "无有效来源", "已释放"].map((x) => [x, x])], ["country", "国家", ["SG", "TH", "ID", "PH", "VN", "MY"].map((x) => [x, x])]], match: (c, k, v) => c[k] === v,
      cols: [["客户 ID", (c) => `<button class="link" data-act="o" data-id="${c.id}">${c.id}</button>`], ["归属合作方", (c) => partnerName(c.partner)], ["来源", (c) => `${esc(c.campaign)}<span class="sub">${c.sub}</span>`], ["国家", (c) => c.country], ["生命周期", (c) => tg(c.life)], ["归属状态", (c) => tg(c.attr)], ["佣金 / 结算", (c) => commSum(c)], ["风险档", (c) => (role() === "ops" || role() === "fin" || canR() ? rb(c.r) : "—")], ["注册 / 首次入金", (c) => `${c.reg}<span class="sub">${c.ftd || "—"}</span>`]],
      actions: (c) => U.act("o", c.id, "查看 360"), onAct: (a, id) => ADM.go("customer-360/" + id) });
    $$("[data-s]", main).forEach((b) => (b.onclick = () => { CL.stat = b.dataset.s === "all" ? "" : b.dataset.s; CL.S.page = 1; repaint(); }));
  }

  const TABS = [["overview", "概览"], ["attribution", "归属与转化"], ["finance", "佣金与结算"], ["risk", "风险与关联"], ["events", "事件时间线"]];
  function judge(c) {
    if (!c.click) return { r: "无点击", t: "无有效来源：不按国家、IP、设备推测归属。" };
    const k = new Date(c.click.replace(" ", "T") + ":00+08:00"), g = new Date(c.reg.replace(" ", "T") + ":00+08:00");
    if (g < k) return { r: "待核验", t: "注册早于点击，属事实异常，标“待核验”。" };
    const end = new Date(k.getTime() + c.win * 24 * 3600 * 1000);
    return g < end ? { r: "窗口内", t: `${c.click} ≤ ${c.reg} < ${c.click} + ${c.win} 天（窗口取自配置版本，生产值待确认）` } : { r: "窗口外", t: "恰好到期视为窗口外。" };
  }
  function detail(main, id, tab) {
    const c = ADM.customers.find((x) => x.id === id);
    if (!c) { main.innerHTML = `<div class="forbidden"><b>客户不存在或无权查看</b><a class="btn" style="margin-top:12px" href="#/client-list">返回客户列表</a></div>`; return; }
    tab = TABS.some((t) => t[0] === tab) ? tab : "overview";
    const bl = [];
    if (c.attr === "冲突") bl.push(["blocking", "归属冲突，多个有效候选，待复核", "attribution"]);
    if (c.comm.some((x) => x[0] === "冻结")) bl.push(["blocking", "存在冻结的案件（仅作用于对应案件）", "finance"]);
    if (c.r === "R3") bl.push(["warning", "风险档 R3", "risk"]);
    if (c.missing) bl.push(["warning", "CRM 事实不完整：" + c.missing.join("、") + "，已生成补数需求", "attribution"]);
    const j = judge(c), tasks = ADM.tasks.filter((t) => t.obj === c.id || t.ref === c.id);
    const evts = ADM.events.filter((e) => e.cust === c.id);
    const steps = [["注册", c.reg], ["首次入金", c.ftd], ["有效转化", c.life === "有效转化" ? c.ftd : null], ["流失", c.life === "流失" ? "已标记" : null]];
    const casesRows = c.comm.map((x, i) => `<tr><td>${c.id}</td><td>CM-${44000 + c.id.slice(-3) * 1 % 900 + i}</td><td>CS-${55000 + c.id.slice(-3) * 1 % 900 + i}</td><td>${tgS(x[0])}</td><td class="num">${x[1]}</td><td>${x[0] === "冻结" ? "结算超时信号" : "—"}</td></tr>`).join("");
    function tgS(s) { return `<span class="tag ${{ 已支付: "ok", 可结算: "ok", 冻结: "bad", 结算中: "info", 待放行: "warn" }[s] || ""}">${s}</span>`; }
    const body = {
      overview: kv([["客户 ID", `${c.id}`], ["国家", c.country], ["注册时间", c.reg], ["生命周期", tg(c.life)], ["归属合作方", partnerName(c.partner)], ["归属状态", tg(c.attr)], ["佣金 / 结算", commSum(c)], ["开放任务", tasks.filter((t) => ADM.activeStates.includes(t.state)).length + " 个"]].concat(role() === "fin" ? [] : [["备注", esc(c.note || "—")]])) + `<p style="color:var(--muted);font-size:12px">注册、入金、账户等 CRM 事实只读；风险档、有效性、归属、备注为 CPA 自有数据${ADM.cpa.can() ? "，可点“编辑 CPA 数据”修改" : ""}。</p>` + `<div class="section"><h4>CPA 数据修改记录</h4>${ADM.cpa.history(c)}</div><div class="section"><h4>生命周期</h4><ol class="timeline">${steps.map((s) => `<li class="${s[1] ? "done" : ""}"><b>${s[0]}</b><span>${s[1] || "未达成"}</span></li>`).join("")}</ol></div><div class="section"><h4>最近关键事件</h4>${evts.slice(0, 3).map((e) => `<p style="margin:4px 0">${e.at} · ${esc(e.type)} · ${esc(e.result)}</p>`).join("") || "<p>暂无事件</p>"}</div><p style="color:var(--muted);font-size:12px">事实源：注册、入金为 CRM；归属、资格快照、佣金、风险为 Affiliate。数据截至 ${NOW}。</p>`,
      attribution: `<div class="section"><h4>归属结论</h4>${kv([["归属合作方", partnerName(c.partner)], ["状态", tg(c.attr)], ["锁定时间", c.lock || "—"], ["归因窗口版本", "attr-v3（待确认）"]])}</div>${c.cands ? `<div class="callout bad">存在 ${c.cands.length} 个有效候选（${c.cands.join("、")}），按规则不自动选最后点击；已锁定归属不被后续点击更改。</div>` : ""}<div class="section"><h4>判定过程</h4>${kv([["点击时间", c.click || "—"], ["注册时间", c.reg], ["窗口", `${c.win} 天`], ["结果", `<b>${j.r}</b>`]])}<p style="color:var(--muted);font-size:12px">${esc(j.t)} 使用绝对时刻判断，不按浏览器日期。</p></div><div class="section"><h4>转化资格</h4><p>首次入金：${c.ftd || "未发生"}；有效转化：${c.life === "有效转化" ? "已确认（资格快照 q-v2）" : "未达成"}。归属更正会产生新快照，历史保留。</p></div><div class="callout info">IB 与 CPA 渠道完全隔离，不显示也不支持跨渠道转换；本页不提供手工改归属。</div>`,
      finance: c.comm.length ? `<div class="table-wrap"><table class="dt"><thead><tr><th>客户</th><th>佣金案件</th><th>结算案件</th><th>结算状态</th><th class="num">佣金 (USD)</th><th>阻断原因</th></tr></thead><tbody>${casesRows}</tbody></table></div><div class="callout info" style="margin-top:12px">阻断仅作用于此案件，不影响该客户其他案件。多案件分别展示，不合并为单一状态。</div>` : '<div class="empty"><b>暂无佣金案件</b>客户尚未产生佣金案件。</div>',
      risk: `${kv([["风险档", rb(c.r) + (c.r ? '<span class="sub">依据：直接</span>' : "")], ["相关事件数", ADM.riskEvents.filter((e) => e.obj === c.id).length]])}${canR() && role() === "risk" ? `<div class="section"><h4>风险事件与关联</h4>${ADM.riskEvents.filter((e) => e.obj === c.id).map((e) => `<p style="margin:4px 0">${e.id} · ${e.type} · ${e.det}</p>`).join("") || "<p>暂无事件</p>"}<p style="color:var(--muted);font-size:12px">证据与触发快照仅风控可见；本页不冻结、解除或改信用。</p></div>` : `<div class="callout info" style="margin-top:12px">当前角色只见风险档与事件数量；风险明细与证据仅风控可见。</div>`}`,
      events: `<div class="filters"><input class="field search" id="trq" placeholder="按 TraceId 过滤" aria-label="TraceId"></div><div class="table-wrap"><table class="dt"><thead><tr><th>时间</th><th>事件</th><th>来源</th><th>结果</th><th>TraceId</th><th>关联</th></tr></thead><tbody id="evb"></tbody></table></div>`
    }[tab];
    const acts = [];
    if (ADM.cpa.can()) acts.push('<button class="btn primary" id="aCpa">编辑 CPA 数据</button>');
    if (role() === "ops") acts.push('<button class="btn" id="aRev">发起归属争议复核</button>');
    if (role() === "risk") acts.push('<button class="btn" id="aRisk">发起风险复核</button>');
    main.innerHTML = `<div class="adm-crumb"><a href="#/client-list">客户 360</a><span>/</span><span>${c.id}</span></div>
      <div class="adm-pagehead"><div><h1>${c.id}</h1><p class="sub">${tg(c.life)} <span style="margin:0 6px">${partnerName(c.partner).replace(/<span.*?<\/span>/, "")}</span> ${tg(c.attr)}</p></div><div class="actions">${acts.join("")}</div></div>
      ${bl.length ? `<div class="panel" style="margin-bottom:16px"><div class="panel-body" style="padding:10px 16px">${bl.map((b) => `<div style="display:flex;gap:12px;align-items:center;padding:4px 0"><span class="tag ${b[0] === "blocking" ? "bad" : "warn"}">${b[0] === "blocking" ? "阻断" : "注意"}</span><span>${esc(b[1])}</span><a style="margin-left:auto" href="#/customer-360/${c.id}?tab=${b[2]}">去查看</a></div>`).join("")}</div></div>` : ""}
      <div class="panel"><div style="padding:0 16px"><div class="tabs" role="tablist">${TABS.map((t) => `<button role="tab" data-tab="${t[0]}" aria-selected="${t[0] === tab}">${t[1]}</button>`).join("")}</div></div><div class="panel-body">${body}</div></div>`;
    const paintEv = () => { const q = ($("#trq") || {}).value || ""; const rows = evts.filter((e) => (role() !== "fin" || /结算|佣金|入金|转化/.test(e.type)) && e.trace.includes(q)); $("#evb").innerHTML = rows.map((e) => `<tr><td>${e.at}</td><td>${esc(e.type)}</td><td>${e.src}</td><td>${esc(e.result)}</td><td>${role() === "admin" || role() === "risk" || role() === "ops" ? `<button class="link" data-tr="${e.trace}">${e.trace}</button>` : "—"}</td><td>${e.rel}</td></tr>`).join("") || '<tr><td colspan="6"><div class="empty" style="padding:16px">没有符合条件的事件</div></td></tr>'; };
    if (tab === "events") { paintEv(); $("#trq").oninput = paintEv; $("#evb").onclick = (e) => { const b = e.target.closest("[data-tr]"); if (b) { $("#trq").value = b.dataset.tr; paintEv(); } }; }
    $$("[data-tab]", main).forEach((b) => (b.onclick = () => ADM.go(`customer-360/${c.id}?tab=${b.dataset.tab}`)));
    const rc = $("#aCpa"); if (rc) rc.onclick = () => ADM.cpa.editCustomer(c, () => detail(main, id, tab));
    const r1 = $("#aRev"); if (r1) r1.onclick = () => reviewModal("发起归属争议复核", { type: "attribution_review", obj: c.partner || c.id, ref: c.id, title: `归属争议复核：客户 ${c.id}`, team: "运营一组" });
    const r2 = $("#aRisk"); if (r2) r2.onclick = () => reviewModal("发起风险复核", { type: "risk_review", obj: c.id, ref: c.id, title: `风险复核：客户 ${c.id}`, team: "风控复核组", risk: c.r || "R1" }, () => ADM.toast("可到风险工作台查看档案"));
  }

  /* =============== 归属与事件 =============== */
  const AV = { view: "exc", exc: {}, rel: {}, evt: {} };
  function renderAttr(main, route) {
    if (["exc", "rel", "evt"].includes(route.query.view)) AV.view = route.query.view;
    const ops = role() === "ops";
    U.head(main, "客户与归因", "归属与事件", ops ? "查看归属异常、归属关系与事件流水，并发起复核与补数申请（只创建任务）。" : "只读视角；补数与集成任务在“集成与数据治理”处理。", ops ? '<button class="btn" id="bf">发起事件补数申请</button>' : "");
    $("#fx").innerHTML = `<div id="as"></div><div class="seg" style="margin-bottom:12px">${[["exc", "归属异常"], ["rel", "归属关系"], ["evt", "事件流水"]].map((v) => `<button data-v="${v[0]}" aria-pressed="${AV.view === v[0]}">${v[1]}</button>`).join("")}</div><div id="al"></div>`;
    const mount = () => {
      $$("[data-v]", main).forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === AV.view));
      const ex = ADM.attrExceptions, cs = ADM.customers;
      $("#as").innerHTML = AV.view === "exc" ? U.strip([["冲突待复核", ex.filter((x) => x.type === "冲突").length, "不自动取最后点击", 1], ["事实不完整", ex.filter((x) => x.type === "事实不完整").length, "已生成补数任务", 1], ["版本乱序 / 已更正", ex.filter((x) => x.type === "版本乱序").length, "", 1], ["配置缺失", ex.filter((x) => x.type === "配置缺失").length, "", 1]]) : AV.view === "rel" ? U.strip([["已锁定", cs.filter((c) => c.attr === "已锁定").length, "", 0], ["IB 排除", cs.filter((c) => c.attr === "IB 排除").length, "只展示，不可更改", 0], ["无有效来源", cs.filter((c) => c.attr === "无有效来源").length, "不推测归属", 0], ["已释放", cs.filter((c) => c.attr === "已释放").length, "", 0]]) : U.strip([["事件总数", ADM.events.length, "", 0], ["CRM 来源", ADM.events.filter((e) => e.src === "CRM").length, "", 0], ["Affiliate 来源", ADM.events.filter((e) => e.src === "Affiliate").length, "", 0], ["补数完成", ADM.events.filter((e) => /补数/.test(e.type)).length, "", 0]]);
      $$("#as [data-stat]").forEach((b) => (b.onclick = () => { if (AV.view !== "exc") return; const t = ["冲突", "事实不完整", "版本乱序", "配置缺失"][+b.dataset.stat]; AV.exc = { f: { type: t }, q: "", page: 1 }; mount(); }));
      const box = $("#al");
      if (AV.view === "exc") U.list(box, { S: AV.exc, empty: "当前没有归属异常", kwHint: "客户 ID", minW: 1150, rows: () => ex, kw: (x) => x.cust, filters: [["type", "异常类型", ["冲突", "事实不完整", "版本乱序", "配置缺失", "注册早于点击"].map((x) => [x, x])]], match: (x, k, v) => x[k] === v,
        cols: [["客户 ID", (x) => (ADM.customers.some((c) => c.id === x.cust) ? `<a href="#/customer-360/${x.cust}?tab=attribution">${x.cust}</a>` : x.cust)], ["异常类型", (x) => tg(x.type)], ["候选合作方", (x) => (x.cands.length ? x.cands.slice(0, 3).join("、") + (x.cands.length > 3 ? ` +${x.cands.length - 3}` : "") : "—")], ["涉及金额 (USD)", (x) => (x.amt == null ? "—" : x.amt), "num"], ["任务", (x) => (x.task ? `<a href="#/tasks?task_id=${x.task}">${x.task}</a>` : "—")], ["发现时间 / 持续", (x) => `${x.found}<span class="sub">${x.days} 天</span>`]],
        actions: (x) => U.act("v", x.cust, "查看") + (ops && !x.task ? U.act("r", x.cust, "发起复核") : ""), onAct: (a, id, rp) => { const x = ex.find((y) => y.cust === id); if (a === "v") ADM.drawer.open({ title: id, sub: tg(x.type), foot: () => '<button class="btn" id="fc">关闭</button>', bind: (d) => { d.querySelector("#fc").onclick = () => ADM.drawer.close(); }, body: () => kv([["异常类型", x.type], ["候选合作方", x.cands.join("、") || "—"], ["发现时间", x.found], ["持续", x.days + " 天"]]) + '<div class="callout info" style="margin-top:12px">窗口判定：点击 ≤ 注册 < 点击 + 配置窗口，恰好到期为窗口外；多个有效候选为冲突，不自动选最后点击；无有效来源不按国家、IP、设备推测。授权释放与 CRM 更正在 CRM 完成，本页只发起复核。</div>' }); else reviewModal("发起归属争议复核", { type: "attribution_review", obj: x.cands[0] || id, ref: id, title: `归属争议复核：客户 ${id}`, team: "运营一组" }, rp); } });
      else if (AV.view === "rel") U.list(box, { S: AV.rel, empty: "暂无归属关系", kwHint: "客户 ID、TraceId", minW: 1200, rows: () => cs, kw: (c) => c.id, filters: [["attr", "归属状态", ["待确定", "已锁定", "冲突", "IB 排除", "无有效来源", "已释放"].map((x) => [x, x])], ["country", "国家", ["SG", "TH", "ID", "PH", "VN", "MY"].map((x) => [x, x])]], match: (c, k, v) => c[k] === v,
        cols: [["客户 ID", (c) => `<a href="#/customer-360/${c.id}?tab=attribution">${c.id}</a>`], ["归属合作方", (c) => partnerName(c.partner)], ["活动 / Sub ID", (c) => `${esc(c.campaign)}<span class="sub">${c.sub}</span>`], ["规则 / 窗口版本", (c) => "attr-v3 / " + c.win + " 天"], ["状态", (c) => tg(c.attr)], ["锁定 / 注册时间", (c) => `${c.lock || "—"}<span class="sub">${c.reg}</span>`]], actions: (c) => U.act("v", c.id, "查看 360") + (ops ? U.act("r", c.id, "发起复核") : ""), onAct: (a, id, rp) => { if (a === "v") ADM.go(`customer-360/${id}?tab=attribution`); else reviewModal("发起归属争议复核", { type: "attribution_review", obj: (cs.find((c) => c.id === id) || {}).partner || id, ref: id, title: `归属争议复核：客户 ${id}`, team: "运营一组" }, rp); } });
      else U.list(box, { S: AV.evt, empty: "暂无事件", kwHint: "客户 ID、TraceId、事件号", minW: 1150, rows: () => ADM.events, kw: (e) => e.id + e.cust + e.trace, filters: [["type", "事件类型", [...new Set(ADM.events.map((e) => e.type))].map((x) => [x, x])], ["src", "来源系统", [...new Set(ADM.events.map((e) => e.src))].map((x) => [x, x])]], match: (e, k, v) => e[k] === v,
        cols: [["事件", (e) => `<span class="id">${e.id}</span>`], ["时间", (e) => e.at], ["类型", (e) => esc(e.type)], ["来源", (e) => e.src], ["客户", (e) => `<a href="#/customer-360/${e.cust}?tab=events">${e.cust}</a>`], ["结果", (e) => esc(e.result)], ["TraceId", (e) => (role() === "fin" ? "—" : e.trace)], ["关联", (e) => e.rel]], actions: (e) => U.act("v", e.id, "查看"), onAct: (a, id) => { const e = ADM.events.find((x) => x.id === id); ADM.drawer.open({ title: e.id, sub: esc(e.type), foot: () => '<button class="btn" id="fc">关闭</button>', bind: (d) => { d.querySelector("#fc").onclick = () => ADM.drawer.close(); }, body: () => kv([["时间", e.at], ["来源系统", e.src], ["客户", e.cust], ["结果", esc(e.result)], ["TraceId", e.trace], ["关联对象", e.rel]]) + (role() === "admin" ? '<div class="callout info" style="margin-top:12px">完整链路与接口错误请到“集成与数据治理”排查。</div>' : "") }); } });
    };
    mount();
    $$("[data-v]", main).forEach((b) => (b.onclick = () => { AV.view = b.dataset.v; mount(); }));
    const bf = $("#bf"); if (bf) bf.onclick = () => ADM.modal({ title: "发起事件补数申请", body: `<div class="form-row"><label for="bfC">客户 ID</label><input class="field" id="bfC" style="width:100%" placeholder="例如 C-80760"><div id="bfCE" style="color:var(--danger);font-size:12px"></div></div>${U.reasonRow("bfW", "缺失内容与原因（必填）")}<p style="font-size:12px;color:var(--muted)">只创建补数任务，由系统管理员在“集成与数据治理”处理；不编造事实。</p>`, okText: "创建补数任务", onOk: (m) => { const c = m.querySelector("#bfC").value.trim(), w = m.querySelector("#bfW").value.trim(); m.querySelector("#bfCE").textContent = c ? "" : "请填写客户 ID"; if (!c || w.length < 5) { m.querySelector("#bfWE").textContent = "请填写至少 5 个字的原因"; return false; } makeTask({ type: "data_backfill", obj: c, ref: c, title: `事件补数：客户 ${c}`, team: "平台运维组", reason: w }); } });
  }

  ADM.pages["client-list"] = renderClient;
  ADM.pages["attribution-links"] = renderAttr;
})();
