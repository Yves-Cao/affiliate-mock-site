/* 页面 22 佣金与结算 / 23 提现与对账 / 24 资金异常任务 */
(function () {
  const ADM = window.ADM, esc = ADM.esc, $ = ADM.$, $$ = ADM.$$;
  const NOW = "2026-11-19 10:30";
  const role = () => ADM.role().key;
  const isFin = () => role() === "fin";
  const kv = (rows) => `<dl class="kv kv-2">${rows.map((r) => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join("")}</dl>`;
  const money = (v) => (v == null ? '<span style="color:var(--muted)">金额待核验</span>' : v);
  const tone = (s) => ({ 成功: "ok", 已支付: "ok", 已封账: "ok", 可结算: "ok", 已更正: "ok", 已执行: "ok", 已处理: "ok", 已清: "ok", 已批准: "info", 打款中: "info", 运行中: "info", 结算中: "info", 待财务确认: "info", 更正中: "warn", 部分失败: "warn", 部分成功: "warn", 超时: "warn", 待审核: "warn", 待处理: "warn", 待核验: "warn", 待放行: "warn", 冻结: "bad", 失败: "bad", 已驳回: "bad", 已退回: "bad", 部分: "warn", 已记债: "bad", 处理中: "info" }[s] || "");
  const tag = (s) => `<span class="tag ${tone(s)}">${esc(s)}</span>`;

  /* ---------- 通用列表引擎 ---------- */
  function list(box, cfg) {
    const S = cfg.S; S.f = S.f || {}; S.q = S.q || ""; S.page = S.page || 1;
    const paint = () => {
      let rows = cfg.rows().filter((r) => Object.keys(S.f).every((k) => !S.f[k] || cfg.match(r, k, S.f[k])));
      const q = S.q.trim().toLowerCase(); if (q) rows = rows.filter((r) => cfg.kw(r).toLowerCase().includes(q));
      const size = 20, total = rows.length, pages = Math.max(1, Math.ceil(total / size)); if (S.page > pages) S.page = pages;
      const view = rows.slice((S.page - 1) * size, S.page * size);
      const chips = Object.keys(S.f).filter((k) => S.f[k]).map((k) => { const f = cfg.filters.find((x) => x[0] === k); const o = f[2].find((x) => x[0] === S.f[k]); return `<span class="chip">${f[1]}：${esc(o ? o[1] : S.f[k])}<button data-clear="${k}" aria-label="移除${f[1]}">×</button></span>`; }).join("") + (S.q ? `<span class="chip">关键词：${esc(S.q)}<button data-clear="q" aria-label="移除关键词">×</button></span>` : "");
      const n = cfg.cols.length;
      box.innerHTML = `<div class="filters"><input class="field search kw" placeholder="${cfg.kwHint || "关键词"}" value="${esc(S.q)}" aria-label="关键词">${cfg.filters.map((f) => `<select class="select" data-f="${f[0]}" aria-label="${f[1]}"><option value="">全部${f[1]}</option>${f[2].map((o) => `<option value="${o[0]}" ${S.f[f[0]] === o[0] ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>`).join("")}<span style="margin-left:auto;font-size:12px;color:var(--muted)">${cfg.hint || ""}</span></div>
        <div class="chips">${chips}${chips ? '<button class="btn sm ghost" data-clearall>清除全部</button>' : ""}</div>
        <div class="table-wrap"><table class="dt" style="min-width:${cfg.minW || 1100}px"><thead><tr>${cfg.cols.map((c, i) => `<th class="${i === 0 ? "fixl" : ""} ${c[2] === "num" ? "num" : ""}">${c[0]}</th>`).join("")}<th class="fixr">操作</th></tr></thead><tbody>
        ${view.length ? view.map((r) => `<tr>${cfg.cols.map((c, i) => `<td class="${i === 0 ? "fixl id" : ""} ${c[2] === "num" ? "num" : ""}">${c[1](r)}</td>`).join("")}<td class="fixr"><div class="rowact">${cfg.actions(r)}</div></td></tr>`).join("") : `<tr><td colspan="${n + 1}"><div class="empty"><b>${chips ? "没有符合条件的记录，请调整筛选条件" : cfg.empty}</b>${chips ? '<button class="btn" data-clearall>清除全部筛选</button>' : ""}</div></td></tr>`}</tbody></table></div>
        <div class="tfoot"><span>共 ${total} 条${cfg.foot ? " · " + cfg.foot : ""}</span><div class="pager">${ADM.pager(total, S.page, size)}</div></div>`;
    };
    box.onchange = (e) => { const k = e.target.dataset.f; if (k) { S.f[k] = e.target.value; S.page = 1; paint(); } };
    box.oninput = (e) => { if (e.target.classList.contains("kw")) S.q = e.target.value; };
    box.onkeydown = (e) => { if (e.key === "Enter" && e.target.classList.contains("kw")) { S.q = e.target.value; S.page = 1; paint(); const k = $(".kw", box); k && k.focus(); } };
    box.onclick = (e) => {
      const t = e.target.closest("button"); if (!t) return; const d = t.dataset;
      if (d.clear) { if (d.clear === "q") S.q = ""; else S.f[d.clear] = ""; paint(); }
      else if (t.hasAttribute("data-clearall")) { S.f = {}; S.q = ""; paint(); }
      else if (d.pg) { S.page = +d.pg; paint(); }
      else if (d.act) cfg.onAct(d.act, d.id, repaint);
    };
    const repaint = () => { paint(); if (cfg.after) cfg.after(); ADM.refreshNav(); };
    paint();
    return repaint;
  }
  const act = (a, id, label) => `<button class="link" data-act="${a}" data-id="${id}">${label}</button>`;
  const head = (main, group, title, sub, actions) => { main.innerHTML = `<div class="adm-crumb"><span>${group}</span><span>/</span><span>${title}</span></div><div class="adm-pagehead"><div><h1>${title}</h1><p class="sub">${sub}</p></div><div class="actions">${actions || ""}</div></div><div id="fx"></div>`; };
  const reasonRow = (id, label, ph) => `<div class="form-row"><label for="${id}">${label}</label><textarea class="field" id="${id}" rows="3" style="width:100%;height:auto;padding:8px 12px" placeholder="${ph || ""}"></textarea><div id="${id}E" style="color:var(--danger);font-size:12px"></div></div>`;
  const needReason = (m, id, min) => { const v = m.querySelector("#" + id).value.trim(); if (v.length < (min || 5)) { m.querySelector("#" + id + "E").textContent = `请填写至少 ${min || 5} 个字的原因`; return null; } return v; };
  const strip = (items) => `<div class="stats">${items.map((s, i) => `<button class="stat" data-stat="${i}" ${s[3] ? "" : "disabled"}><div class="name">${s[0]}</div><div class="val num ${s[1] == null ? "null" : ""}">${s[1] == null ? "—" : s[1]}</div><div class="delta">${s[2] || "&nbsp;"}</div></button>`).join("")}</div>`;
  const selfNote = '<div class="callout warn" style="margin-top:12px">该类申请不允许自审，请等待其他审批人。审批通过不等于已入账或已付款。</div>';

  /* =============== 22 佣金与结算 =============== */
  const C = { view: "batches", batches: {}, cases: {}, statements: {} };
  function renderCommission(main, route) {
    if (["batches", "cases", "statements"].includes(route.query.view)) C.view = route.query.view;
    head(main, "资金", "佣金与结算", isFin() ? "核对佣金案件、每日结算运行与月度结算单。风险处置在任务中执行，打款在“提现与对账”。" : "只读：可看案件状态、阻断原因和金额摘要；钱包与保证金构成不可见。", isFin() ? '<button class="btn" id="genSt">月度补生成</button>' : "");
    const fx = $("#fx");
    fx.innerHTML = `<div id="cstats"></div><div class="seg" style="margin-bottom:12px">${[["batches", "结算批次"], ["cases", "佣金明细"], ["statements", "月度结算单"]].map((v) => `<button data-v="${v[0]}" aria-pressed="${C.view === v[0]}">${v[1]}</button>`).join("")}</div><div id="clist"></div>`;
    const stats = () => {
      const cs = ADM.cases, sum = (a) => { const unk = a.filter((c) => c.amt == null).length; return a.reduce((s, c) => s + (c.amt == null ? 0 : parseFloat(String(c.amt).replace(/,/g, ""))), 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (unk ? `（另 ${unk} 项金额待核验，未计入）` : ""); };
      const blk = cs.filter((c) => c.blocks.length);
      $("#cstats").innerHTML = strip([["待结算金额", sum(cs.filter((c) => ["待放行", "结算中", "可结算"].includes(c.settle))), "按三元组去重，USD", 1], ["结算中金额", sum(cs.filter((c) => c.settle === "结算中")), "与已冻结分开", 1], ["阻断金额 / 案件数", `${sum(blk)} / ${blk.length}`, "多原因不重复计额", 1], ["待审批批次", ADM.batches.filter((b) => b.appr === "待审批").length, "不等于待确认月度单", 1], ["月度待确认 / 失败", `${ADM.statements.filter((s) => s.status === "待财务确认").length} / 0`, "按当前版本", 1]]);
    };
    const mount = () => {
      stats(); $$("[data-v]", fx).forEach((b) => (b.setAttribute("aria-pressed", b.dataset.v === C.view)));
      const box = $("#clist");
      if (C.view === "batches") list(box, { S: C.batches, after: stats, empty: "暂无结算运行", kwHint: "批次号、日期", minW: 1250, foot: "批次号不是月度单号", rows: () => ADM.batches, kw: (r) => r.id + r.date, filters: [["run", "运行状态", ["待运行", "运行中", "成功", "部分失败", "失败"].map((x) => [x, x])], ["appr", "审批状态", ["无需", "待审批", "已通过", "已驳回"].map((x) => [x, x])]], match: (r, k, v) => r[k] === v,
        cols: [["批次号", (r) => `<button class="link" data-act="b" data-id="${r.id}">${r.id}</button>`], ["运行日期 / 时区", (r) => `${r.date}<span class="sub">${r.tz} · ${r.entity} · USD</span>`], ["案件数", (r) => r.cases == null ? "—" : r.cases, "num"], ["计算 (USD)", (r) => r.calc || "—", "num"], ["扣减 (USD)", (r) => r.deduct || "—", "num"], ["可结算 (USD)", (r) => r.ok || "—", "num"], ["阻断数 / 额", (r) => (r.blockN == null ? "—" : `${r.blockN} / ${r.blockAmt}`), "num"], ["运行状态", (r) => tag(r.run) + (r.fail ? `<span class="sub">失败 ${r.fail.n} 项</span>` : "")], ["审批", (r) => r.appr]],
        actions: (r) => act("b", r.id, "查看") + (isFin() && ["部分失败", "失败"].includes(r.run) ? (r.rerun ? '<span class="sub" style="display:inline">补跑申请中</span>' : act("rerun", r.id, "申请补跑")) : ""), onAct: (a, id, rp) => batchAct(a, id, rp) });
      else if (C.view === "cases") list(box, { S: C.cases, after: stats, empty: "暂无佣金案件", kwHint: "案件号、客户、合作方", minW: 1300, rows: () => ADM.cases, kw: (r) => r.cm + r.cs + r.cust + r.partner, filters: [["settle", "结算状态", ["待放行", "结算中", "冻结", "可结算", "已支付", "已拒绝", "已关闭"].map((x) => [x, x])], ["blk", "阻断情况", [["yes", "有阻断"], ["no", "无阻断"]]]], match: (r, k, v) => (k === "blk" ? (v === "yes") === r.blocks.length > 0 : r[k] === v),
        cols: [["案件", (r) => `<button class="link" data-act="c" data-id="${r.cm}">${r.cm}</button><span class="sub">${r.cs}</span>`], ["客户 / 合作方", (r) => `${r.cust}<span class="sub">${r.partner}</span>`], ["里程碑与构成", (r) => r.ms], ["佣金 (USD)", (r) => money(r.amt), "num"], ["计佣状态", (r) => r.calc], ["结算状态", (r) => tag(r.settle)], ["阻断", (r) => r.blocks.length ? `<span class="tag bad">${esc(r.blocks[0])}</span>${r.blocks.length > 1 ? ` <span class="tag plain">+${r.blocks.length - 1}</span>` : ""}` : "—"], ["到期", (r) => r.due], ["批次 / 版本", (r) => `${r.batch}<span class="sub">${r.ver}</span>`]],
        actions: (r) => act("c", r.cm, "查看") + (r.blocks.length && ADM.canSee("risk-event") ? `<a class="link" href="#/risk-event">风险处理</a>` : ""), onAct: (a, id) => caseDrawer(id) });
      else list(box, { S: C.statements, after: stats, empty: "暂无月度结算单", kwHint: "单号、合作方", minW: 1400, rows: () => ADM.statements, kw: (r) => r.id + r.partner, filters: [["status", "状态", ["草稿", "待财务确认", "已封账", "更正中", "已更正"].map((x) => [x, x])], ["type", "类型", [["月结", "月结"], ["更正版", "更正版"]]]], match: (r, k, v) => r[k] === v,
        cols: [["单号", (r) => `<button class="link" data-act="s" data-id="${r.id}">${r.id}</button>`], ["类型", (r) => r.type], ["月度状态", (r) => tag(r.status) + (r.apId && ADM.approvals.find((a) => a.id === r.apId && a.status === "pending") ? '<span class="sub">待审批</span>' : "")], ["期初 (USD)", (r) => r.open, "num"], ["期末 (USD)", (r) => r.close, "num"], ["佣金 (USD)", (r) => r.comm, "num"], ["保证金", (r) => (isFin() ? r.guar : "无权查看"), "num"], ["可用 / 阻断", (r) => (isFin() ? r.avail : "无权查看") + `<span class="sub">阻断 ${r.blocked}</span>`, "num"], ["提现引用", (r) => r.wd, "num"]],
        actions: (r) => act("s", r.id, "查看") + (isFin() ? (r.status === "草稿" ? act("recalc", r.id, "重算") + act("confirm", r.id, "提交确认") : r.status === "待财务确认" ? act("recalc", r.id, "重算") : r.status === "已封账" ? act("correct", r.id, "更正") : "") : ""), onAct: (a, id, rp) => stAct(a, id, rp) });
    };
    mount();
    fx.addEventListener("click", (e) => { const b = e.target.closest("[data-v],[data-stat]"); if (!b) return; if (b.dataset.v) { C.view = b.dataset.v; mount(); } else { const i = +b.dataset.stat; const m = [["cases", { settle: "" }], ["cases", { settle: "结算中" }], ["cases", { blk: "yes" }], ["batches", { appr: "待审批" }], ["statements", { status: "待财务确认" }]][i]; C.view = m[0]; C[m[0]] = { f: m[1], q: "", page: 1 }; mount(); } });
    const g = $("#genSt"); if (g) g.onclick = () => genModal(mount);
    C.mount = mount;
  }
  function batchAct(a, id, rp) {
    const b = ADM.batches.find((x) => x.id === id);
    if (a === "rerun") return ADM.modal({ title: "申请补跑", body: `<p>补跑锁定日期 ${b.date}、${esc(b.entity)}、USD 与原配置版本，只重试未完成项（${b.fail.n} 项），已成功项不会重复入账；不创建提现，也不直接调用外部支付。</p><div class="callout info">失败原因：${esc(b.fail.reason)}</div>`, okText: "提交补跑申请", onOk: () => { b.rerun = true; ADM.toast("补跑申请已提交"); rp(); } });
    ADM.drawer.open({ title: b.id, sub: tag(b.run), tabs: [{ key: "a", label: "运行摘要" }, { key: "b", label: "案件" }, { key: "c", label: "审批与时间线" }], foot: () => '<button class="btn" id="fClose">关闭</button>', bind: (d) => { const c = d.querySelector("#fClose"); if (c) c.onclick = () => ADM.drawer.close(); },
      body: (t) => t === "a" ? kv([["运行日期", b.date], ["时区 / 主体 / 币种", `${b.tz} / ${esc(b.entity)} / USD`], ["案件数", b.cases == null ? "—" : b.cases], ["计算 / 扣减 / 可结算", `${b.calc || "—"} / ${b.deduct || "—"} / ${b.ok || "—"}`], ["阻断", b.blockN == null ? "—" : `${b.blockN} 个，${b.blockAmt}`], ["审批", b.appr]]) + (b.fail ? `<div class="callout bad" style="margin-top:12px">部分案件处理失败（${b.fail.n} 项）：${esc(b.fail.reason)}。可重试失败项，成功项不会重复。</div>` : "") : t === "b" ? `<p>成功、阻断、失败项分别列示；阻断仅作用于此案件，不影响该客户其他案件。</p><div class="table-wrap"><table class="dt"><thead><tr><th>案件</th><th>状态</th></tr></thead><tbody>${ADM.cases.filter((c) => c.batch === b.id).map((c) => `<tr><td>${c.cm}</td><td>${tag(c.settle)}</td></tr>`).join("") || '<tr><td colspan="2">暂无</td></tr>'}</tbody></table></div>` : `<ol class="timeline"><li class="done"><b>运行创建</b><span>${b.date} 00:05</span></li>${b.run !== "待运行" ? `<li class="done"><b>运行结束：${b.run}</b><span>${b.date} 00:20</span></li>` : ""}</ol>` });
  }
  function caseDrawer(id) {
    const c = ADM.cases.find((x) => x.cm === id);
    ADM.drawer.open({ title: `${c.cm} · ${c.cs}`, sub: tag(c.settle), foot: () => '<button class="btn" id="fClose">关闭</button>', bind: (d) => { d.querySelector("#fClose").onclick = () => ADM.drawer.close(); },
      body: () => kv([["客户", c.cust], ["合作方", c.partner], ["佣金案件", c.cm], ["结算案件", c.cs], ["里程碑", c.ms], ["佣金 (USD)", money(c.amt)], ["计佣状态", c.calc], ["预计结算", c.due], ["批次 / 版本", `${c.batch} / ${c.ver}`], ["配置版本", "v7（待确认）"]]) + `<div class="section"><h4>阻断链</h4>${c.blocks.length ? "<ul style=\"margin:0;padding-left:18px;line-height:26px\">" + c.blocks.map((b) => `<li>${esc(b)}</li>`).join("") + "</ul>" : "<p>无阻断。</p>"}<p style="color:var(--muted);font-size:12px">阻断仅作用于此案件，不影响该客户其他案件。信用等级 C0 本身不阻断结算。</p></div>${c.settle === "冻结" ? '<div class="callout info">驳回信号或申诉不会自动解冻，需完成复核与结算前检查。</div>' : ""}${c.blocks.includes("数据缺失") ? '<div class="callout warn" style="margin-top:12px">部分数据暂不可用，相关处理已暂停；不按 0 计算。</div>' : ""}<p style="color:var(--muted);font-size:12px;margin-top:12px">TraceId：tr-${c.cs.toLowerCase().replace(/\W/g, "")}</p>` });
  }
  function stAct(a, id, rp) {
    const s = ADM.statements.find((x) => x.id === id);
    if (a === "s") return ADM.drawer.open({ title: s.id, sub: tag(s.status), foot: () => '<button class="btn" id="fClose">关闭</button>', bind: (d) => { d.querySelector("#fClose").onclick = () => ADM.drawer.close(); }, body: () => kv([["合作方", s.partner], ["月份（UTC+8）", s.month], ["类型", s.type], ["期初 / 期末 (USD)", `${s.open} / ${s.close}`], ["佣金 (USD)", s.comm], ["保证金 / 可用", isFin() ? `${s.guar} / ${s.avail}` : "无权查看"], ["阻断 (USD)", s.blocked], ["提现引用", s.wd + " 笔（不一一对应）"]]) + (s.status === "已封账" ? '<div class="callout info" style="margin-top:12px">封账版只读；错账请走“更正”，原版与原差异保留。</div>' : "") + '<p style="color:var(--muted);font-size:12px;margin-top:12px">下载为按版本的异步任务，未完成版本不可下载；批次下载不是封账凭证。</p>' });
    if (a === "recalc") return ADM.modal({ title: "封账前重算", wide: true, body: `<p>保留原版本，不重写佣金事实。预览差异：</p><div class="callout info">当前版本期末 ${s.close}；重算后预计 ${s.close}（数据版本 d-1119）。差异 0.00 时仍可提交，但需写明原因。</div>${reasonRow("rcW", "重算原因（必填）")}${selfNote}`, okText: "提交重算审批", onOk: (m) => { const w = needReason(m, "rcW"); if (!w) return false; const ap = ADM.newApproval({ type: "结算", obj: "月度单 " + s.id, summary: "封账前重算 " + s.id, amt: "—", chain: [{ name: "财务复核", role: "fin" }], reason: w, diff: [["版本", "当前", "重算草稿"]], impact: "仅重算，不改写已发生事实。", refs: [s.id] }); ADM.toast(`重算申请已提交审批（${ap.id}）`); rp(); } });
    if (a === "confirm") return ADM.modal({ title: "提交确认封账", body: `<p>依赖检查：佣金事实完整 ✓ · 对账差异无阻断 ✓ · 提现分摊锁定完整 ✓</p><p>由另一位财务审批；审批通过后才执行封账，执行失败仍显示上一版本。</p>${selfNote}`, okText: "提交审批", onOk: () => { const prevSt = s.status; const ap = ADM.newApproval({ type: "结算", obj: "月度单 " + s.id, summary: "确认封账 " + s.id, amt: s.close, chain: [{ name: "财务复核", role: "fin" }], diff: [["月度状态", s.status, "已封账"]], impact: "封账后原版只读。", refs: [s.id] }); ap.onApprove = () => { s.status = "已封账"; }; ap.onReject = ap.onRevert = () => { s.status = prevSt; s.apId = null; }; s.status = "待财务确认"; s.apId = ap.id; ADM.toast(`已提交封账审批（${ap.id}）`); rp(); } });
    if (a === "correct") return ADM.modal({ title: "封账后更正", wide: true, body: `<p>原封账版保持只读；提交后创建更正版与对账任务。</p>${reasonRow("coW", "错账依据与范围（必填）")}${selfNote}`, okText: "提交更正申请", onOk: (m) => { const w = needReason(m, "coW"); if (!w) return false; const cid = s.id.replace(/v\d+$/, "v2"); if (ADM.statements.some((x) => x.id === cid)) { ADM.toast("该月度单已有更正版或在途更正申请", "err"); return false; } const ap = ADM.newApproval({ type: "结算", obj: "月度单 " + s.id, summary: "封账后更正 " + s.id, amt: "—", chain: [{ name: "财务复核", role: "fin" }], reason: w, diff: [["版本", "已封账", "更正版 v2"]], impact: "创建更正版与对账任务。", refs: [s.id] }); ADM.statements.push(Object.assign({}, s, { id: s.id.replace(/v\d+$/, "v2"), type: "更正版", status: "更正中", apId: ap.id })); ap.onReject = ap.onRevert = () => { const i = ADM.statements.findIndex((x) => x.id === cid && x.status === "更正中"); if (i >= 0) ADM.statements.splice(i, 1); }; ADM.toast(`更正申请已提交（${ap.id}）`); rp(); } });
  }
  function genModal(rp) {
    ADM.modal({ title: "月度补生成", body: `<div class="form-row"><label for="gP">合作方</label><select class="select" id="gP" style="width:100%">${ADM.partners.filter((p) => p.state !== "draft").map((p) => `<option value="${p.id}">${p.id} ${esc(p.name)}</option>`).join("")}</select></div><div class="form-row"><label for="gM">月份</label><select class="select" id="gM" style="width:100%"><option>2026-10</option><option>2026-09</option></select></div><p style="font-size:12px;color:var(--muted)">服务端确认业务键无重复有效任务；重复请求不会生成双单。</p>${selfNote}`, okText: "提交补生成", onOk: (m) => { const p = m.querySelector("#gP").value, mo = m.querySelector("#gM").value; if (ADM.statements.some((s) => s.partner === p && s.month === mo && s.type === "月结")) { ADM.toast(`${p} ${mo} 已有有效月度单，未重复生成`, "err"); return false; } const ap = ADM.newApproval({ type: "结算", obj: `月度单 ${p} ${mo}`, summary: `月度补生成 ${p} ${mo}`, amt: "—", chain: [{ name: "财务复核", role: "fin" }], diff: [["月度单", "无", "新建 v1"]], impact: "仅生成快照。", refs: [p] }); ADM.statements.push({ id: `ST-${p.replace("-", "")}-${mo}-v1`, partner: p, month: mo, type: "月结", status: "草稿", open: "—", close: "—", comm: "—", guar: "—", avail: "—", blocked: "—", wd: 0 }); ADM.toast(`补生成申请已提交（${ap.id}）`); rp(); } });
  }

  /* =============== 23 提现与对账 =============== */
  const WS = { view: "wd", wd: {}, rv: {}, rc: {} };
  function renderWithdrawals(main, route) {
    if (["wd", "rv", "rc"].includes(route.query.view)) WS.view = route.query.view;
    head(main, "资金", "提现与对账", isFin() ? "审核提现、跟踪支付结果，处理冲正追回与内部对账。打款由支付系统执行，页面不伪造回执。" : "只读：风控与系统管理员看不到收款账户信息。");
    const fx = $("#fx");
    fx.innerHTML = `<div id="wstats"></div><div class="seg" style="margin-bottom:12px">${[["wd", "提现订单"], ["rv", "冲正与追回"], ["rc", "对账与关账"]].map((v) => `<button data-v="${v[0]}" aria-pressed="${WS.view === v[0]}">${v[1]}</button>`).join("")}</div><div id="wlist"></div>`;
    const mount = () => {
      $$("[data-v]", fx).forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === WS.view));
      const w = ADM.withdrawals, r = ADM.reversals, c = ADM.recon, num = (s) => parseFloat(String(s).replace(/,/g, "")) || 0, f2 = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const open = c.filter((x) => x.status !== "已处理");
      $("#wstats").innerHTML = WS.view === "wd" ? strip([["待审核订单", w.filter((x) => x.state === "待审核").length, "", 1], ["待核验支付", w.filter((x) => ["超时", "打款中"].includes(x.state)).length, "超时或未知，待查询回执", 1], ["失败待处理", w.filter((x) => ["失败", "部分成功", "已退回"].includes(x.state)).length, "", 1], ["已付金额 (USD)", f2(w.filter((x) => x.state === "已支付").reduce((s, x) => s + num(x.net), 0)), "成功部分，费用包含其中", 1]])
        : WS.view === "rv" ? strip([["待审批冲正", r.filter((x) => x.apId && ADM.approvals.find((a) => a.id === x.apId && a.status === "pending")).length, "", 0], ["执行中 / 部分", r.filter((x) => ["部分", "执行中"].includes(x.state)).length, "", 0], ["已登记债务", r.filter((x) => x.state === "已记债").length, "", 0], ["待追回金额 (USD)", f2(r.reduce((s, x) => s + num(x.rest), 0)), "", 0]])
        : strip([["未处理差异数", open.length, "差异对象去重", 0], ["差异金额 (USD)", "10.00 + 955.20…", "按方向，不相抵；另有 2 项未知", 0], ["待核验支付", c.filter((x) => x.status === "待核验").length, "", 0], ["待完成更正", ADM.statements.filter((s) => s.status === "更正中").length, "", 0]]);
      $$("#wstats [data-stat]").forEach((b) => (b.onclick = () => { if (WS.view === "wd") { const i = +b.dataset.stat; WS.wd = { f: i === 0 ? { state: "待审核" } : i === 1 ? { state: "超时" } : i === 2 ? { state: "失败" } : { state: "已支付" }, q: "", page: 1 }; mount(); } }));
      const box = $("#wlist");
      if (WS.view === "wd") list(box, { S: WS.wd, after: () => mount(), empty: "暂无提现订单", kwHint: "订单号、合作方、支付引用", minW: 1500, rows: () => ADM.withdrawals, kw: (r) => r.id + r.partner + r.ref, filters: [["state", "状态", ["待审核", "已批准", "打款中", "已支付", "失败", "部分成功", "已退回", "超时", "已驳回", "已取消"].map((x) => [x, x])], ["method", "方式", [["银行", "银行"], ["电子钱包", "电子钱包"]]]], match: (r, k, v) => r[k] === v,
        cols: [["订单", (r) => `<button class="link" data-act="w" data-id="${r.id}">${r.id}</button>`], ["合作方 / 主体", (r) => `${r.partner}<span class="sub">${r.entity} · ${r.at}</span>`], ["申请 (USD)", (r) => r.applied, "num"], ["手续费 / 到账", (r) => `${r.fee}<span class="sub">到账 ${r.net}</span>`, "num"], ["账户", (r) => (isFin() ? `${r.method}<span class="sub">${r.acct}</span>` : '<span style="color:var(--muted)">无权查看</span>')], ["状态", (r) => tag(r.state) + (r.verify === "doing" ? '<span class="sub">核验中</span>' : r.apId && ADM.approvals.find((a) => a.id === r.apId && a.status === "pending") ? '<span class="sub">待审批</span>' : "")], ["分摊", (r) => esc(r.snap)], ["支付", (r) => `${r.ref}<span class="sub">${esc(r.receipt)}</span>`]],
        actions: (r) => act("w", r.id, "查看") + wdActions(r), onAct: (a, id, rp) => wdAct(a, id, rp) });
      else if (WS.view === "rv") list(box, { S: WS.rv, after: () => mount(), empty: "暂无冲正案件", kwHint: "案件号、合作方", minW: 1300, foot: "风控批准不代替财务终审与执行", rows: () => ADM.reversals, kw: (r) => r.id + r.partner, filters: [["state", "状态", ["草稿", "已批准", "部分", "已执行", "已记债"].map((x) => [x, x])], ["src", "来源", ["已付异常", "风控转财务", "更正"].map((x) => [x, x])]], match: (r, k, v) => r[k] === v,
        cols: [["冲正案件", (r) => `<button class="link" data-act="r" data-id="${r.id}">${r.id}</button>`], ["合作方 / 来源", (r) => `${r.partner}<span class="sub">${r.src}</span>`], ["总额 / 已抵扣", (r) => `${r.total}<span class="sub">已抵扣 ${r.done} · 剩余 ${r.rest}</span>`, "num"], ["抵扣明细", (r) => r.seg.filter((s) => s[1] !== "0.00").map((s) => `${s[0]} ${s[1]}`).join(" · ") || "—"], ["状态", (r) => tag(r.state) + (r.apId && ADM.approvals.find((a) => a.id === r.apId && a.status === "pending") ? '<span class="sub">待审批</span>' : "")], ["债务状态", (r) => r.debt]],
        actions: (r) => act("r", r.id, "查看") + (isFin() && r.state === "草稿" && !(r.apId && ADM.approvals.find((a) => a.id === r.apId && a.status === "pending")) ? act("rsub", r.id, "提交审批") : "") + (isFin() && ["部分"].includes(r.state) ? act("rretry", r.id, "重试失败项") : ""), onAct: (a, id, rp) => rvAct(a, id, rp) });
      else list(box, { S: WS.rc, after: () => mount(), empty: "当前没有对账差异", kwHint: "差异号、对象", minW: 1400, foot: "差异只能通过有依据的结果更新，不能手工标记已解决", rows: () => ADM.recon, kw: (r) => r.id + r.src, filters: [["status", "状态", ["待处理", "待核验", "处理中", "已处理"].map((x) => [x, x])], ["type", "差异类型", ["金额不平", "缺流水", "重复流水", "状态不一致", "未知原因码"].map((x) => [x, x])]], match: (r, k, v) => r[k] === v,
        cols: [["差异", (r) => `<button class="link" data-act="d" data-id="${r.id}">${r.id}</button>`], ["周期", (r) => r.period + "（UTC+8）"], ["类型 / 原因", (r) => `${r.type}<span class="sub">${esc(r.cause)}</span>`], ["来源对象", (r) => esc(r.src)], ["比较值 / 差额", (r) => `${esc(r.a)} ↔ ${esc(r.b)}<span class="sub">差额 ${r.diff}（${r.dir}）</span>`], ["处理状态", (r) => tag(r.status) + (r.task ? `<span class="sub">任务 ${r.task}</span>` : "")], ["责任 / 时间", (r) => `${r.owner}<span class="sub">${r.upd}</span>`]],
        actions: (r) => act("d", r.id, "查看") + (isFin() && r.status !== "已处理" ? (r.task ? "" : act("dtask", r.id, "生成任务")) + act("dre", r.id, "重新核验") : ""), onAct: (a, id, rp) => rcAct(a, id, rp), after: mount_closeBtn });
    };
    function mount_closeBtn() {}
    mount();
    fx.addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (b) { WS.view = b.dataset.v; mount(); } });
    if (isFin()) { $(".adm-pagehead .actions").innerHTML = '<button class="btn" id="closeBtn">提交关账申请</button><button class="btn" id="newRun">发起对账</button>'; $("#closeBtn").onclick = closeModal; $("#newRun").onclick = () => ADM.modal({ title: "发起对账", body: `<p>期间 2026-10（UTC+8）· 主体 SG-01 · USD。保存运行与幂等键。</p><div class="callout warn">支付商侧来源能力待核验：该来源显示“未完成”，不生成“无差异”。</div>`, okText: "创建对账运行", onOk: () => { ADM.toast("对账运行已创建；来源缺失项显示“未完成”"); mount(); } }); }
    ADM.refreshWd = mount;
  }
  const wdActions = (r) => {
    if (!isFin()) return "";
    if (r.state === "待审核") return r.verify === "none" ? act("wstart", r.id, "开始核验") : r.verify === "doing" ? act("wverify", r.id, "提交核验") : r.apId ? '<a class="link" href="#/approvals">去审批</a>' : "";
    if (r.state === "已批准") return act("wpay", r.id, "请求支付");
    if (["打款中", "超时"].includes(r.state)) return act("wq", r.id, "查询回执");
    if (["失败", "部分成功"].includes(r.state)) return act("wretry", r.id, "登记重试");
    return "";
  };
  function wdAct(a, id, rp) {
    const w = ADM.withdrawals.find((x) => x.id === id);
    if (a === "w") return ADM.drawer.open({ title: w.id, sub: tag(w.state), tabs: [{ key: "a", label: "订单" }, { key: "b", label: "核验与审批" }, { key: "c", label: "支付尝试" }], foot: () => '<button class="btn" id="fClose">关闭</button>', bind: (d) => { d.querySelector("#fClose").onclick = () => ADM.drawer.close(); },
      body: (t) => t === "a" ? kv([["合作方 / 主体", `${w.partner} / ${w.entity}`], ["申请时间", w.at], ["申请 / 手续费 / 到账 (USD)", `${w.applied} / ${w.fee} / ${w.net}`], ["账户", isFin() ? `${w.method} ${w.acct}（仅脱敏摘要，不可复制）` : "无权查看"], ["分摊快照", esc(w.snap)], ["外部支付单号", w.ref], ["最近回执", esc(w.receipt)]]) + '<div class="callout info" style="margin-top:12px">待审核或已批准都不等于已付款；无回执不显示已付款。已可用的日结资金无需等待月结封账即可提现。</div>' : t === "b" ? `<ol class="timeline"><li class="${w.verify === "none" ? "" : "done"}"><b>核验</b><span>${w.verify === "none" ? "未开始" : w.verify === "doing" ? "核验中（由你占用）" : "已完成"}</span></li><li class="${["已批准", "打款中", "已支付"].includes(w.state) ? "done" : ""}"><b>审批</b><span>${w.apId ? w.apId : "未提交"}（另一位财务审批）</span></li></ol>` : `<ol class="timeline">${w.tries.map((t) => `<li class="done"><b>${esc(t.r)}</b><span>${t.at}</span></li>`).join("") || "<li><b>尚未发起支付</b><span></span></li>"}</ol><p style="color:var(--muted);font-size:12px">多次尝试各自保留，不覆盖原失败证据。</p>` });
    if (a === "wstart") { w.verify = "doing"; ADM.toast("已占用核验"); return rp(); }
    if (a === "wverify") return ADM.modal({ title: "提交核验", wide: true, body: `<p>核验清单（关键缺数不能默认通过）：</p>${["认证与 KYC/KYB 已通过", "收款账户校验通过", "余额来源与分摊锁定完整", "风险状态无新增限制", "无重复支付", "金额与手续费、配置版本一致"].map((x, i) => `<label style="display:flex;gap:8px;line-height:28px"><input type="checkbox" class="ck"> ${x}</label>`).join("")}<div id="ckE" style="color:var(--danger);font-size:12px"></div>${selfNote}`, okText: "提交核验并送审", onOk: (m) => { if ($$(".ck", m).some((c) => !c.checked)) { m.querySelector("#ckE").textContent = "存在未通过项，不能通过；请创建补数或风险任务"; return false; } const ap = ADM.newApproval({ type: "提现", obj: "合作方 " + w.partner, summary: `提现放行 USD ${w.applied}`, amt: w.applied, chain: [{ name: "财务复核", role: "fin" }], diff: [["提现状态", "待审核", "放行"]], impact: `单笔提现 USD ${w.applied}。`, refs: [w.id] }); ap.onApprove = () => { w.state = "已批准"; }; ap.onReject = () => { w.state = "已驳回"; w.verify = "none"; w.apId = null; }; ap.onRevert = () => { w.verify = "none"; w.apId = null; }; w.verify = "done"; w.apId = ap.id; ADM.toast(`核验已提交，已送审（${ap.id}）`); rp(); } });
    if (a === "wpay") return ADM.modal({ title: "请求支付", body: `<p>沿用原订单与幂等键，提交支付系统。返回 202 表示已受理，结果以回执为准；不会重复创建。</p>`, okText: "确认请求支付", onOk: () => { w.state = "打款中"; w.ref = "PAY-" + (88300 + ADM.withdrawals.length); w.receipt = "待确认"; w.tries.push({ at: NOW, r: "已提交，等待回执" }); ADM.toast("已提交支付，结果待确认，勿重复提交"); rp(); } });
    if (a === "wq") { w.q = (w.q || 0) + 1; if (w.q < 2) { w.tries.push({ at: NOW, r: "已查询：结果待确认" }); ADM.toast("结果待确认，请稍后查看，勿重复提交"); } else { w.state = "已支付"; w.receipt = "成功 " + w.net; w.tries.push({ at: NOW, r: "已支付" }); ADM.toast("回执已确认：已支付"); } return rp(); }
    if (a === "wretry") return ADM.modal({ title: "登记重试", body: `<p>已核实所有尝试与外部流水。仅对确认未支付或已终止的剩余部分重试，复用原订单与幂等键；已付部分禁止再次打款。</p>`, okText: "确认重试", onOk: () => { w.state = "打款中"; w.receipt = "待确认"; w.tries.push({ at: NOW, r: "登记重试，等待回执" }); ADM.toast("已登记重试"); rp(); } });
  }
  function rvAct(a, id, rp) {
    const r = ADM.reversals.find((x) => x.id === id);
    if (a === "r") return ADM.drawer.open({ title: r.id, sub: tag(r.state), foot: () => '<button class="btn" id="fClose">关闭</button>', bind: (d) => { d.querySelector("#fClose").onclick = () => ADM.drawer.close(); },
      body: () => kv([["合作方", r.partner], ["来源", r.src], ["总额 (USD)", r.total], ["已抵扣 / 剩余", `${r.done} / ${r.rest}`], ["债务状态", r.debt]]) + `<div class="section"><h4>抵扣顺序与明细</h4><div class="table-wrap"><table class="dt"><thead><tr><th>顺序</th><th>资金类型</th><th class="num">已抵扣 (USD)</th></tr></thead><tbody>${r.seg.map((s, i) => `<tr><td>${i + 1}</td><td>${s[0]}</td><td class="num">${s[1]}</td></tr>`).join("")}</tbody></table></div><p style="color:var(--muted);font-size:12px;margin-top:8px">固定顺序：同客户未放行佣金 → 同客户可用保证金 → 同合作方可提现余额 → 同合作方其他客户可用保证金 → 不足则立即记债。不得跨合作方扣款，不重复计算。</p></div>` });
    if (a === "rsub") return ADM.modal({ title: "提交冲正审批", body: `<p>由另一位财务审批；风险来源另追加风控节点。通过后由领域执行器执行，已成功项不重复。</p>${selfNote}`, okText: "提交审批", onOk: () => { const ap = ADM.newApproval({ type: "冲正/抵扣", obj: "合作方 " + r.partner, summary: `冲正追回 USD ${r.total}`, amt: r.total, chain: [{ name: "财务复核", role: "fin" }], diff: [["债务登记", "无", "USD " + r.total]], impact: "按固定顺序抵扣，不足记债。", refs: [r.id] }); ap.onApprove = () => { r.state = "已批准"; }; ap.onReject = () => {}; r.apId = ap.id; ADM.toast(`已提交审批（${ap.id}）`); rp(); } });
    if (a === "rretry") return ADM.modal({ title: "重试失败项", body: "<p>只重试失败项，已成功项不会重复；复用原执行计划，不创建第二笔财务执行。</p>", okText: "确认重试", onOk: () => { r.state = "已执行"; r.done = r.total; r.rest = "0.00"; r.debt = "已清"; ADM.toast("失败项已重试并执行"); rp(); } });
  }
  function rcAct(a, id, rp) {
    const d0 = ADM.recon.find((x) => x.id === id);
    if (a === "d") return ADM.drawer.open({ title: d0.id, sub: tag(d0.status), foot: () => '<button class="btn" id="fClose">关闭</button>', bind: (d) => { d.querySelector("#fClose").onclick = () => ADM.drawer.close(); }, body: () => kv([["周期", d0.period], ["类型", d0.type], ["原因", esc(d0.cause)], ["来源", esc(d0.src)], ["比较值", `${esc(d0.a)} ↔ ${esc(d0.b)}`], ["差额", `${d0.diff}（${d0.dir}）`], ["最近核验", d0.upd]]) + '<div class="callout info" style="margin-top:12px">差异不能刷新即消失，也不能手工勾选“已解决”；资金修正需通过有来源的正/反向流水或更正版本。</div>' });
    if (a === "dtask") { const n = "T-" + (24127 + ADM.tasks.length - 26); ADM.tasks.push({ id: n, title: `对账差异处理：${d0.id}`, type: "commission_exception", obj: d0.src.split(" ")[1] || "—", ref: d0.id, pri: "中", state: "open", owner: null, team: "结算财务组", dueIn: 24, risk: "R0", amt: d0.diff, upd: NOW, version: 1 }); d0.task = n; ADM.toast(`已生成处理任务 ${n}`); return rp(); }
    if (a === "dre") { d0.upd = NOW; ADM.toast("新快照已保存：差异仍存在，需按依据处理"); return rp(); }
  }
  function closeModal() {
    const bl = ADM.recon.filter((x) => x.block && x.status !== "已处理");
    ADM.modal({ title: "提交关账申请", wide: true, hideOk: bl.length > 0, body: bl.length ? `<div class="callout bad">无法提交：存在 ${bl.length} 个阻断差异（${bl.map((x) => x.id).join("、")}），或来源不完整。须先处理，或取得专业批准的例外；没有批准的容忍阈值不填数。</div>` : "<p>来源完整，阻断差异已处理。提交后进入审批，月度封账与对账关账各自留痕，都不额外阻止可用日结资金提现。</p>", cancelText: "关闭", okText: "提交关账申请" });
  }

  /* =============== 24 资金异常任务 =============== */
  const T = { group: "all", scope: "all", q: "", state: "", sla: "", stat: "", page: 1 };
  const FG = [["all", "全部", ["settlement_overdue", "guarantee_offset", "chargeback", "commission_exception"]], ["dn", "D+N 冻结", ["settlement_overdue"]], ["gt", "保证金抵扣", ["guarantee_offset"]], ["cb", "冲正追回", ["chargeback"]], ["ce", "佣金异常", ["commission_exception"]]];
  function renderFundTasks(main) {
    const fin = isFin(), me = ADM.role().userId;
    const act0 = (t) => ADM.activeStates.includes(t.state);
    head(main, "资金", "资金异常任务", "任务队列的资金视角预置视图，只保留资金侧：D+N 冻结（跟踪）、保证金抵扣、冲正追回、佣金异常。结算延长与熔断在“案件与合规任务”。");
    const paint = () => {
      const all = ADM.tasks.filter((t) => FG[0][2].includes(t.type) && act0(t));
      const frozen = all.filter((t) => t.type === "settlement_overdue").reduce((s, t) => s + parseFloat(t.amt.replace(/,/g, "") || 0), 0);
      const stats = [["冻结金额 (USD)", frozen.toLocaleString("en-US", { minimumFractionDigits: 2 }), "dn"], ["待处理任务", all.length, "act"], ["即将超时", all.filter((t) => t.dueIn != null && t.dueIn >= 0 && t.dueIn <= 6).length, "soon"], ["已超时", all.filter((t) => t.dueIn != null && t.dueIn < 0).length, "over"], ["待审批", all.filter((t) => t.state === "pending_approval").length, "appr"], ["执行失败", all.filter((t) => t.state === "execution_failed").length, "fail"]];
      let r = ADM.tasks.filter((t) => FG.find((g) => g[0] === T.group)[2].includes(t.type));
      if (T.scope === "mine") r = r.filter((t) => t.owner === me && act0(t)); else if (T.scope === "claim") r = r.filter((t) => t.state === "open" && !t.owner);
      if (T.stat === "act") r = r.filter(act0); if (T.stat === "soon") r = r.filter((t) => t.dueIn != null && t.dueIn >= 0 && t.dueIn <= 6 && act0(t)); if (T.stat === "over") r = r.filter((t) => t.dueIn != null && t.dueIn < 0 && act0(t)); if (T.stat === "appr") r = r.filter((t) => t.state === "pending_approval"); if (T.stat === "fail") r = r.filter((t) => t.state === "execution_failed");
      if (T.state) r = r.filter((t) => t.state === T.state); if (T.sla === "over") r = r.filter((t) => t.dueIn != null && t.dueIn < 0); if (T.sla === "none") r = r.filter((t) => t.dueIn == null);
      const q = T.q.trim().toLowerCase(); if (q) r = r.filter((t) => (t.id + t.title + t.obj + t.ref).toLowerCase().includes(q));
      r.sort((a, b) => (a.dueIn == null ? 1e9 : a.dueIn) - (b.dueIn == null ? 1e9 : b.dueIn));
      const total = r.length, size = 20, pages = Math.max(1, Math.ceil(total / size)); if (T.page > pages) T.page = pages; const view = r.slice((T.page - 1) * size, T.page * size);
      const filtered = T.q || T.state || T.sla || T.stat;
      $("#fx").innerHTML = `${fin ? "" : '<div class="callout info" style="margin-bottom:16px">当前角色只读：仅显示类型、状态、对象与金额摘要。</div>'}
        <div class="stats">${stats.map((s) => `<button class="stat" data-stat="${s[2]}" aria-pressed="${T.stat === s[2] || (s[2] === "dn" && T.group === "dn")}"><div class="name">${s[0]}</div><div class="val num">${s[1]}</div></button>`).join("")}</div>
        <div class="tabs" style="margin-bottom:12px" role="tablist">${FG.map((g) => `<button role="tab" data-g="${g[0]}" aria-selected="${T.group === g[0]}">${g[1]}</button>`).join("")}</div>
        <div class="filters"><div class="seg">${[["mine", "我的待办"], ["claim", "待认领"], ["all", "全部可见"]].map((s) => `<button data-scope="${s[0]}" aria-pressed="${T.scope === s[0]}">${s[1]}</button>`).join("")}</div><input class="field search" id="fq" placeholder="任务号、合作方、案件号" value="${esc(T.q)}" aria-label="关键词">
          <select class="select" id="fstate" aria-label="状态"><option value="">全部状态</option>${Object.keys(ADM.taskStates).map((k) => `<option value="${k}" ${T.state === k ? "selected" : ""}>${ADM.taskStates[k].name}</option>`).join("")}</select>
          <select class="select" id="fsla" aria-label="处理时限"><option value="">全部时限</option><option value="over" ${T.sla === "over" ? "selected" : ""}>已超时</option><option value="none" ${T.sla === "none" ? "selected" : ""}>未配置</option></select></div>
        ${T.group === "dn" || T.group === "all" ? '<div class="callout" style="margin-bottom:12px;background:var(--surface-accent)">冻结仅作用于此案件，不影响该客户其他案件。驳回信号或申诉不会自动解冻，需完成复核与结算前检查；D+N 的信号复核与解除重检由风控处理，财务只读跟踪。</div>' : ""}
        <div class="table-wrap"><table class="dt" style="min-width:1200px"><thead><tr><th class="fixl">任务号</th><th>类型 / 目的</th><th>对象</th><th class="num">影响金额 (USD)</th><th class="num">冻结天数 / 阈值</th><th>状态</th><th>处理人</th><th>处理时限</th><th class="fixr">操作</th></tr></thead><tbody>
        ${view.length ? view.map((t) => { const dn = ADM.dnDays[t.id]; const ro = !fin || t.type === "settlement_overdue"; return `<tr><td class="fixl id"><button class="link" data-open="${t.id}" data-ro="${ro ? 1 : 0}">${t.id}</button></td><td>${ADM.taskTypes[t.type].name}${t.type === "settlement_overdue" ? '<span class="sub">D+N 冻结 · 信号复核</span>' : ""}</td><td>${t.obj}<span class="sub">${esc(t.ref)}</span></td><td class="num">${t.amt}</td><td class="num">${dn ? dn[0] + " / " + dn[1] + "（配置值待确认）" : "—"}</td><td>${ADM.stateTag(t.state)}</td><td>${t.owner ? esc(ADM.userName(t.owner)) : "待分配"}</td><td>${ADM.slaTag(t)}</td><td class="fixr"><div class="rowact"><button class="link" data-open="${t.id}" data-ro="${ro ? 1 : 0}">查看</button>${fin && t.state === "open" && !t.owner && t.type !== "settlement_overdue" ? `<button class="link" data-claim="${t.id}">认领</button>` : ""}</div></td></tr>`; }).join("") : `<tr><td colspan="9"><div class="empty"><b>${filtered ? "没有符合条件的任务，请调整筛选条件" : "当前没有待处理的资金异常任务"}</b>${filtered ? '<button class="btn" data-clearall>清除全部筛选</button>' : ""}</div></td></tr>`}</tbody></table></div>
        <div class="tfoot"><span>共 ${total} 条 · 与任务队列同一份任务，无独立状态机</span><div class="pager">${ADM.pager(total, T.page, size)}</div></div>`;
    };
    paint();
    const fx = $("#fx");
    fx.onchange = (e) => { if (e.target.id === "fstate") T.state = e.target.value; if (e.target.id === "fsla") T.sla = e.target.value; T.page = 1; paint(); };
    fx.onkeydown = (e) => { if (e.key === "Enter" && e.target.id === "fq") { T.q = e.target.value; T.page = 1; paint(); $("#fq").focus(); } };
    fx.onclick = (e) => {
      const t = e.target.closest("button"); if (!t) return; const d = t.dataset;
      if (d.g) { T.group = d.g; T.stat = ""; T.page = 1; paint(); }
      else if (d.scope) { T.scope = d.scope; T.page = 1; paint(); }
      else if (d.stat) { if (d.stat === "dn") { T.group = T.group === "dn" ? "all" : "dn"; T.stat = ""; } else T.stat = T.stat === d.stat ? "" : d.stat; T.page = 1; paint(); }
      else if (t.hasAttribute("data-clearall")) { Object.assign(T, { q: "", state: "", sla: "", stat: "" }); paint(); }
      else if (d.pg) { T.page = +d.pg; paint(); }
      else if (d.open) ADM.openTask(d.open, paint, d.ro === "1");
      else if (d.claim) { const k = ADM.tasks.find((x) => x.id === d.claim); if (k.owner) ADM.toast("任务已被他人认领", "err"); else { k.owner = me; k.state = "processing"; k.team = ADM.user().team; k.version++; ADM.toast("已认领 1 个任务"); } ADM.refreshNav(); paint(); }
    };
  }

  ADM.ui = { list, act, head, kv, tag, strip, reasonRow, needReason, selfNote };
  ADM.pages["commission-list"] = renderCommission;
  ADM.pages["withdrawal-list"] = renderWithdrawals;
  ADM.pages["d-plus-n"] = renderFundTasks;
})();
