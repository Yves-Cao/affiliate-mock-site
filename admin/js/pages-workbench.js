/* 页面 04 申诉与客服服务 / 11 导出中心 / 12 通知与公告 / 05 集成与数据治理 */
(function () {
  const ADM = window.ADM, esc = ADM.esc, $ = ADM.$, $$ = ADM.$$, U = ADM.ui, kv = U.kv;
  const NOW = "2026-11-19 10:30";
  const role = () => ADM.role().key, me = () => ADM.role().userId;
  const TONE = { 已提交: "info", 待补材料: "warn", 审阅中: "info", 已决定: "ok", 已关闭: "", 已撤回: "", 就绪: "ok", 生成中: "info", 排队: "info", 失败: "bad", 已过期: "", 已撤销: "", 待审批: "warn", 已通过: "ok", 已驳回: "bad", 无需审批: "", 已发布: "ok", 已定时: "info", 草稿: "", 可见: "info", 已读: "ok", 已确认: "ok", 已送达: "ok", 退信: "bad", 未知: "warn", 重试中: "info", 补数中: "info", 成功: "ok", 结果未知: "warn", 受限: "warn", 生效: "ok", 冲突: "bad", 部分: "warn", 陈旧: "warn", 有效: "ok", 已更正: "ok", 引用冲突: "bad", 状态未知: "warn", 处理中: "info", 已解决: "ok", 审批中: "info", 已完成: "ok", 已复盘: "ok" };
  const tg = (s) => `<span class="tag ${TONE[s] || ""}">${esc(s)}</span>`;
  const pn = (id) => { const p = ADM.partners.find((x) => x.id === id); return p ? `${esc(p.name)}<span class="sub">${id}</span>` : id; };
  const cf = () => '<button class="btn" id="fc">关闭</button>';
  const cb = (d) => { const b = d.querySelector("#fc"); if (b) b.onclick = () => ADM.drawer.close(); };
  const tabsBar = (tabs, cur) => `<div class="tabs" style="margin-bottom:16px" role="tablist">${tabs.map((t) => `<button role="tab" data-tab="${t[0]}" aria-selected="${t[0] === cur}">${t[1]}</button>`).join("")}</div>`;
  const slaTxt = (h) => (h == null ? "未配置" : h < 0 ? `已超时 ${-h} 小时` : `剩余 ${h} 小时`);

  /* =============== 04 申诉与客服服务 =============== */
  const AS = { view: "appeals", S: { f: { state: "ongoing" } } };
  const canAct = (a) => (role() === "ops" || role() === "risk") && a.domain === role();
  function renderAppeals(main, route) {
    if (route.query.view === "service" && role() !== "fin") AS.view = "service";
    const views = [["appeals", "申诉"]].concat(role() !== "fin" ? [["service", "客服服务"]] : []);
    U.head(main, "工作台", "申诉与客服服务", "申诉由 CPA 完全处理；客服工单由 Salesforce 接管，本页只接收和记录（入口、案件引用、异常任务、访问审计）。");
    $("#fx").innerHTML = `<div class="seg" style="margin-bottom:16px">${views.map((v) => `<button data-v="${v[0]}" aria-pressed="${AS.view === v[0]}">${v[1]}</button>`).join("")}</div><div id="av"></div>`;
    const mount = () => { $$("[data-v]", main).forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === AS.view)); AS.view === "appeals" ? appealsView() : serviceView(); };
    mount(); $$("[data-v]", main).forEach((b) => (b.onclick = () => { AS.view = b.dataset.v; mount(); }));
  }
  function appealsView() {
    const A = ADM.appeals, box = $("#av");
    const closed = A.filter((a) => a.state === "已关闭" && a.concl), rate = closed.length ? Math.round((closed.filter((a) => a.concl === "改判").length / closed.length) * 100) + "%" : "—";
    box.innerHTML = `<div id="astat"></div><div id="alist"></div>`;
    const stats = () => ($("#astat").innerHTML = U.strip([["待受理", A.filter((a) => a.state === "已提交" && !a.reviewer).length, "已提交、尚无审阅人", 1], ["待补证", A.filter((a) => a.state === "待补材料").length, "", 1], ["审阅中", A.filter((a) => a.state === "审阅中").length, "", 1], ["即将超时", A.filter((a) => a.dueIn != null && a.dueIn >= 0 && a.dueIn <= 8 && !["已关闭", "已决定"].includes(a.state)).length, "审阅时限预警", 0], ["改判率", rate, "已关闭申诉中改判占比 · 指标 v1", 0]]));
    stats();
    $$("#astat [data-stat]").forEach((b) => (b.onclick = () => { const s = [["已提交"], ["待补材料"], ["审阅中"]][+b.dataset.stat]; if (s) { AS.S.f = { state: s[0] }; AS.S.page = 1; rp(); } }));
    const rp = U.list($("#alist"), { S: AS.S, empty: "暂无申诉", kwHint: "申诉号、合作方", minW: 1350, foot: "提交申诉不恢复资金、不撤销原决定；改判只生成补救事项", rows: () => A, kw: (a) => a.id + a.partner + a.obj,
      filters: [["state", "申诉状态", [["ongoing", "进行中"], ["已提交", "已提交"], ["待补材料", "待补材料"], ["审阅中", "审阅中"], ["已决定", "已决定"], ["已关闭", "已关闭"], ["已撤回", "已撤回"]]], ["cat", "决定类别", ["佣金拒绝", "冲正", "保证金抵扣", "结算延长", "资格失效", "风险等级上调", "结算冻结"].map((x) => [x, x])]],
      match: (a, k, v) => (k === "state" && v === "ongoing" ? ["已提交", "待补材料", "审阅中"].includes(a.state) : a[k] === v),
      cols: [["申诉号", (a) => `<button class="link" data-act="v" data-id="${a.id}">${a.id}</button>`], ["合作方", (a) => pn(a.partner)], ["原决定", (a) => `${a.cat}<span class="sub">${esc(a.obj)}</span>`], ["影响金额 (USD)", (a) => a.amt, "num"], ["状态", (a) => tg(a.state) + (a.pendingAp ? '<span class="sub">已决定待审批</span>' : "")], ["审阅人", (a) => (a.reviewer ? esc(ADM.userName(a.reviewer)) : "待认领")], ["已用 / 上限", (a) => a.used], ["提交 / 窗口截止", (a) => `${a.at}<span class="sub">${a.win}</span>`], ["审阅时限", (a) => (["已关闭", "已决定", "已撤回"].includes(a.state) ? "—" : slaTxt(a.dueIn))]],
      actions: (a) => U.act("v", a.id, "查看") + (canAct(a) && a.state === "已提交" && !a.reviewer ? U.act("c", a.id, "认领") : ""), onAct: (act, id, r) => appealAct(act, id, () => { stats(); r(); }) });
  }
  function appealAct(act, id, rp) {
    const a = ADM.appeals.find((x) => x.id === id);
    if (act === "c") { a.reviewer = me(); a.state = "审阅中"; a.log.push({ t: NOW, e: `${ADM.user().name} 认领，进入审阅` }); ADM.toast("已认领，进入审阅中"); return rp(); }
    ADM.drawer.open({ title: `${a.id} · ${a.cat}`, sub: tg(a.state), tabs: [{ key: "a", label: "申诉" }, { key: "b", label: "原决定与证据" }, { key: "c", label: "审阅与结论" }, { key: "d", label: "补救路由" }, { key: "e", label: "操作记录" }],
      body: (t) => {
        if (t === "a") return kv([["合作方", pn(a.partner)], ["原因", esc(a.reason)], ["提交时间", a.at], ["窗口截止", a.win], ["申诉次数", a.used], ["策略版本", "appeal-policy-v2（待确认）"]]) + '<div class="callout info" style="margin-top:12px">资格由服务端基于当前权威对象和策略评估；每个对象在策略次数内只有一个进行中的申诉，重复提交返回原案件。</div>';
        if (t === "b") return kv([["原决定对象", esc(a.obj)], ["决定类别", a.cat], ["资格评估", a.cat === "结算冻结" ? "eligible（超时信号已驳回、窗口与次数允许）" : "eligible"], ["原证据引用", "EVD-" + a.id.slice(-4) + "（只读）"]]) + '<p style="color:var(--muted);font-size:12px;margin-top:12px">申诉附件为只读安全预览，迟到证据保留提交时间，由审阅人判断是否采纳。不可申诉：制裁、已确认欺诈、监管禁止、明确协议违反。</p>';
        if (t === "c") return a.concl ? kv([["结论", a.concl], ["状态", a.state]]) + (a.pendingAp ? `<div class="callout info" style="margin-top:12px">结论已提交审批 ${a.pendingAp}，批准前申诉暂为“已决定待审批”。</div>` : "") : canAct(a) && a.reviewer === me() ? '<p>在页面底部选择“要求补证”或“提交结论”。结论提交后进入审批队列，批准才生效；改判只生成补救事项，不立即付款或放款。</p>' : `<div class="callout info">${canAct(a) ? "请先认领申诉。" : "当前角色只读。"}</div>`;
        if (t === "d") return a.remedy.length ? `<div class="table-wrap"><table class="dt"><thead><tr><th>目标领域</th><th>补救内容</th><th>任务</th><th>领域回执</th></tr></thead><tbody>${a.remedy.map((r) => `<tr><td>${r.dom}</td><td>${esc(r.item)}</td><td>${r.task ? `<a href="#/tasks?task_id=${r.task}">${r.task}</a>` : "—"}</td><td>${r.receipt}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty"><b>暂无补救事项</b>仅改判后会生成补救事项，并按归属领域的当前门禁执行。</div>';
        return `<ol class="timeline">${a.log.map((l) => `<li class="done"><b>${esc(l.e)}</b><span>${l.t}</span></li>`).join("")}</ol>`;
      },
      foot: () => cf() + (canAct(a) && a.reviewer === me() && a.state === "审阅中" && !a.pendingAp ? '<button class="btn" id="need">要求补证</button><button class="btn primary" id="concl">提交结论</button>' : ""),
      bind: (d) => {
        cb(d); const on = (i, f) => { const e = d.querySelector("#" + i); if (e) e.onclick = f; };
        on("need", () => ADM.modal({ title: "要求补证", body: `${U.reasonRow("nW", "材料清单（必填）", "请列出需要补充的材料")}<p style="font-size:12px;color:var(--muted)">截止时间不得晚于规则上限，提交后通知合作者。</p>`, okText: "确认要求补证", onOk: (m) => { const w = U.needReason(m, "nW", 3); if (!w) return false; a.state = "待补材料"; a.log.push({ t: NOW, e: "要求补证：" + w }); ADM.toast("已要求补证"); rp(); ADM.drawer.close(); } }));
        on("concl", () => ADM.modal({ title: "提交结论", wide: true, body: `<div class="form-row"><label for="cC">结论</label><select class="select" id="cC" style="width:100%"><option>维持</option><option>部分支持</option><option>改判</option></select></div><div class="form-row"><label for="cK">原因代码</label><select class="select" id="cK" style="width:100%"><option>证据不足</option><option>事实更正</option><option>政策适用</option></select></div>${U.reasonRow("cW", "对合作者的安全原因说明（必填）")}<p style="font-size:12px;color:var(--muted)">提交后生成审批申请；改判批准后只创建补救事项，不执行资金动作。</p>`, okText: "提交审批", onOk: (m) => { const w = U.needReason(m, "cW"); if (!w) return false; const c = m.querySelector("#cC").value; const ap = ADM.newApproval({ type: "申诉", obj: "申诉 " + a.id, summary: `申诉结论：${c}（${a.id}）`, amt: a.amt, capital: false, limitH: 24, chain: [{ name: "审阅复核", role: a.domain }], reason: w, diff: [["申诉结论", "审阅中", c]], impact: "批准后" + (c === "改判" ? "生成补救事项" : "关闭申诉") + "；不立即付款。", refs: [a.id] }); ap.onApprove = () => { a.state = "已决定"; a.concl = c; a.pendingAp = null; if (c === "改判") { const t = ADM.makeTask({ type: a.domain === "ops" ? "attribution_review" : "risk_review", obj: a.partner, ref: a.id, title: `申诉补救：${a.id}`, team: "运营一组" }); a.remedy.push({ dom: a.domain === "ops" ? "佣金" : "风险", item: "按改判重新评估原决定", task: t.id, receipt: "已接收" }); } a.log.push({ t: NOW, e: "审批通过，结论：" + c }); }; ap.onReject = () => { a.state = "审阅中"; a.pendingAp = null; a.log.push({ t: NOW, e: "结论被驳回，退回审阅" }); }; a.pendingAp = ap.id; a.log.push({ t: NOW, e: `提交结论 ${c}，待审批 ${ap.id}` }); ADM.toast(`结论已提交审批（${ap.id}）`); rp(); ADM.drawer.close(); } }));
      } });
  }
  function serviceView() {
    const box = $("#av"), sf = ADM.sfStatus, adm = role() === "admin";
    const tabs = [["a", "入口与授权"], ["b", "案件引用"], ["c", "服务异常任务"], ["d", "访问审计"]];
    let cur = "a";
    const paint = () => {
      let body = "";
      if (cur === "a") body = `<div class="table-wrap"><table class="dt"><thead><tr><th>授权</th><th>合作方</th><th>范围</th><th>用途</th><th>到期</th><th>状态</th><th>操作</th></tr></thead><tbody>${ADM.sfGrants.map((g) => `<tr><td class="id">${g.id}</td><td>${pn(g.partner)}</td><td>${g.scope}</td><td>${g.purpose}</td><td>${g.exp}</td><td>${tg(g.state)}</td><td>${adm && g.state === "生效" ? `<button class="link" data-rev="${g.id}">撤销授权</button>` : "—"}</td></tr>`).join("")}</tbody></table></div><p style="color:var(--muted);font-size:12px;margin-top:8px">授权按最小对象 / 字段 / 动作 + 用途 + 脱敏 + 到期评估，传入其他合作方 ID 不能放大授权；拒绝也写审计。</p>`;
      if (cur === "b") body = `<div class="table-wrap"><table class="dt"><thead><tr><th>合作方</th><th>Salesforce 案件</th><th>安全状态类别</th><th>状态时间</th><th>标记</th><th>操作</th></tr></thead><tbody>${ADM.sfCases.map((c) => `<tr><td>${pn(c.partner)}</td><td class="id">${c.sf}</td><td>${tg(c.st)}</td><td>${c.at}</td><td>${c.flag}</td><td>${c.flag === "冲突" && (adm || role() === "ops") ? `<button class="link" data-mk="${c.sf}">生成异常任务</button>` : "—"}</td></tr>`).join("")}</tbody></table></div><p style="color:var(--muted);font-size:12px;margin-top:8px">静默、超时、回调缺失一律显示“状态未知”，不推断为已关闭或已解决。</p>`;
      if (cur === "c") body = `<div class="table-wrap"><table class="dt"><thead><tr><th>任务</th><th>标题</th><th>状态</th></tr></thead><tbody>${ADM.tasks.filter((t) => /服务|Salesforce/.test(t.title)).map((t) => `<tr><td><a href="#/tasks?task_id=${t.id}">${t.id}</a></td><td>${esc(t.title)}</td><td>${ADM.stateTag(t.state)}</td></tr>`).join("") || '<tr><td colspan="3"><div class="empty" style="padding:20px"><b>暂无服务异常任务</b>入口失败、授权拒绝、引用冲突等会生成任务，请到任务队列处理。</div></td></tr>'}</tbody></table></div>`;
      if (cur === "d") body = `<div class="table-wrap"><table class="dt"><thead><tr><th>时间</th><th>事件</th><th>合作方</th><th>结果</th></tr></thead><tbody>${ADM.sfAudit.map((x) => `<tr><td>${x.at}</td><td>${x.ev}</td><td>${x.partner}</td><td>${x.res}</td></tr>`).join("")}</tbody></table></div>`;
      box.innerHTML = `<div class="stats" style="grid-template-columns:repeat(4,1fr)"><div class="stat"><div class="name">Salesforce 入口</div><div class="val" style="font-size:20px">${tg(sf.entry)}</div></div><div class="stat"><div class="name">入口版本</div><div class="val" style="font-size:16px;line-height:36px">${sf.ver}</div></div><div class="stat"><div class="name">数据授权版本</div><div class="val" style="font-size:16px;line-height:36px">${sf.grant}</div></div><div class="stat"><div class="name">最近检查</div><div class="val" style="font-size:16px;line-height:36px">${sf.checked}</div></div></div><div class="callout info" style="margin-bottom:16px">客服对话、分派与服务时限都在 Salesforce 内完成；Salesforce 不可用时显示“服务暂不可用”，不生成本地兜底工单。${adm ? "" : "当前角色只读。"}</div>${tabsBar(tabs, cur)}${body}`;
      $$("[data-tab]", box).forEach((b) => (b.onclick = () => { cur = b.dataset.tab; paint(); }));
      $$("[data-rev]", box).forEach((b) => (b.onclick = () => ADM.modal({ title: "撤销授权", danger: true, body: `<p>撤销后立即生效，并写入审计。</p>${U.reasonRow("rW", "原因（必填）")}`, okText: "确认撤销", onOk: (m) => { if (!U.needReason(m, "rW")) return false; const g = ADM.sfGrants.find((x) => x.id === b.dataset.rev); g.state = "已撤销"; ADM.sfAudit.unshift({ at: NOW, ev: "撤销授权", partner: g.partner, res: "成功" }); ADM.toast("授权已撤销"); paint(); } })));
      $$("[data-mk]", box).forEach((b) => (b.onclick = () => ADM.makeTask({ type: "integration", obj: "P-10014", ref: b.dataset.mk, title: `Salesforce 案件引用冲突：${b.dataset.mk}`, team: "平台运维组" })));
    };
    paint();
  }

  /* =============== 11 导出中心 =============== */
  const EXS = { S: {} };
  const exVisible = () => ADM.exports.filter((e) => role() === "admin" || e.applicant === me());
  function renderExports(main) {
    const adm = role() === "admin";
    U.head(main, "工作台", "导出中心", adm ? "查看全部导出任务，可撤销授权；不得审批自己申请的导出。" : "查看自己发起的导出任务并下载；导出由各业务页发起，本页不能创建任意报表。");
    $("#fx").innerHTML = `<div id="es"></div><div id="el"></div>`;
    const stats = () => { const v = exVisible(); $("#es").innerHTML = U.strip([["待审批", v.filter((e) => e.appr === "待审批").length, "", 1], ["生成中", v.filter((e) => ["排队", "生成中"].includes(e.gen) && e.appr !== "待审批" && e.appr !== "已驳回").length, "", 1], ["可下载", v.filter((e) => e.gen === "就绪").length, "", 1], ["已过期 / 失败", v.filter((e) => ["已过期", "失败"].includes(e.gen)).length, "", 1]]); $$("#es [data-stat]").forEach((b) => (b.onclick = () => { const i = +b.dataset.stat; ADM.setS(EXS, { f: i === 0 ? { appr: "待审批" } : i === 2 ? { gen: "就绪" } : i === 3 ? { gen: "已过期" } : { gen: "生成中" }, q: "", page: 1 }); rp(); })); };
    stats();
    const rp = U.list($("#el"), { S: EXS.S, empty: "暂无导出任务", kwHint: "导出号、来源页面、用途", minW: 1450, foot: "导出为异步 CSV，下载每次重新鉴权", after: stats, rows: exVisible, kw: (e) => e.id + e.src + e.purpose,
      filters: [["src", "来源页面", [...new Set(ADM.exports.map((e) => e.src))].map((x) => [x, x])], ["appr", "审批状态", ["无需审批", "待审批", "已通过", "已驳回"].map((x) => [x, x])], ["gen", "生成状态", ["排队", "生成中", "就绪", "失败", "已过期", "已撤销"].map((x) => [x, x])]], match: (e, k, v) => e[k] === v,
      cols: [["导出号", (e) => `<button class="link" data-act="v" data-id="${e.id}">${e.id}</button>`], ["来源页面与对象", (e) => `${e.src}<span class="sub">${e.obj}</span>`], ["申请人", (e) => (adm ? esc(ADM.userName(e.applicant)) : "本人")], ["用途", (e) => esc(e.purpose)], ["范围 / 敏感级别", (e) => `${esc(e.scope)}<span class="sub">${e.sens}</span>`], ["行数", (e) => (e.rows == null ? "—" : e.rows.toLocaleString("en-US")), "num"], ["审批", (e) => tg(e.appr)], ["生成", (e) => tg(e.gen)], ["过期时间", (e) => e.exp], ["下载次数", (e) => e.dl, "num"]],
      actions: (e) => U.act("v", e.id, "查看") + (e.gen === "就绪" ? U.act("d", e.id, "下载") : "") + (e.applicant === me() && e.gen === "排队" && e.appr !== "已驳回" ? U.act("x", e.id, "取消") : "") + (adm && ["就绪", "生成中", "排队"].includes(e.gen) ? U.act("r", e.id, "撤销授权") : ""), onAct: (a, id, r) => exAct(a, id, () => { stats(); r(); }) });
  }
  function exAct(a, id, rp) {
    const e = ADM.exports.find((x) => x.id === id);
    if (a === "d") { const why = e.revoked ? "授权已撤销" : e.gen === "已过期" ? "文件已过期，请重新发起导出" : e.appr === "待审批" ? "尚未审批通过" : (role() !== "admin" && e.applicant !== me()) ? "您已无权下载该文件" : null; if (why) { ADM.toast(why, "err"); return; } e.dl++; e.log = (e.log || []); e.log.unshift([NOW, ADM.user().name, "下载"]); ADM.toast("已开始下载（演示环境不产生真实文件）"); return rp(); }
    if (a === "x") return ADM.modal({ title: "取消导出", body: "<p>仅排队中的任务可以取消。</p>", okText: "确认取消", onOk: () => { e.gen = "已撤销"; ADM.toast("已取消"); rp(); } });
    if (a === "r") return ADM.modal({ title: "撤销授权", danger: true, body: `<p>确认撤销该导出授权？已生成的下载链接将立即失效。</p>${U.reasonRow("rW", "原因（必填）")}`, okText: "确认撤销", onOk: (m) => { if (!U.needReason(m, "rW")) return false; e.revoked = true; e.gen = "已撤销"; (e.log = e.log || []).unshift([NOW, ADM.user().name, "撤销授权"]); ADM.toast("授权已撤销，旧链接已失效"); rp(); } });
    ADM.drawer.open({ title: e.id, sub: tg(e.gen), tabs: [{ key: "a", label: "概览" }, { key: "b", label: "审批" }, { key: "c", label: "下载记录" }, { key: "d", label: "操作记录" }], foot: cf, bind: cb,
      body: (t) => t === "a" ? kv([["来源", `${e.src} · ${e.obj}`], ["用途", esc(e.purpose)], ["范围", esc(e.scope)], ["敏感级别", e.sens], ["文件名", `${e.src}_20261119_${e.id}.csv`], ["行数", e.rows == null ? "—（估算不作为结果）" : e.rows], ["过期", e.exp]]) + '<p style="color:var(--muted);font-size:12px;margin-top:12px">UTF-8 BOM；以 = + - @ 开头的文本做公式注入防护；不导出附件与内部调查全文。</p>' : t === "b" ? `<p>审批状态：${tg(e.appr)}。审批在审批队列完成，申请人不得审批自己的导出。</p>` : t === "c" ? `<p>共 ${e.dl} 次下载，每次下载均重新鉴权并写审计。</p><ol class="timeline">${(e.log || []).filter((l) => l[2] === "下载").map((l) => `<li class="done"><b>${esc(l[1])} 下载</b><span>${l[0]}</span></li>`).join("")}</ol>` : `<ol class="timeline"><li class="done"><b>创建导出</b><span>${esc(ADM.userName(e.applicant))}</span></li>${(e.log || []).map((l) => `<li class="done"><b>${esc(l[2])}</b><span>${l[0]} · ${esc(l[1])}</span></li>`).join("")}</ol>` });
  }

  /* =============== 12 通知与公告 =============== */
  const NS = { tab: "delivery", d: {}, a: {} };
  function renderNotices(main, route) {
    if (["delivery", "ann"].includes(route.query.tab)) NS.tab = route.query.tab;
    const ops = role() === "ops";
    U.head(main, "工作台", "通知与公告", ops ? "监控通知投递并处理退信与失败；创建、提交、撤回公告。" : "只读" + (role() === "admin" ? "（含最终发布，经审批队列）" : "") + "。", "");
    $("#fx").innerHTML = `${tabsBar([["delivery", "通知投递"], ["ann", "公告"]], NS.tab)}<div id="nb"></div>`;
    const mount = () => { $$("[data-tab]", main).forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === NS.tab)); NS.tab === "delivery" ? deliveryView() : annView(); };
    $$("[data-tab]", main).forEach((b) => (b.onclick = () => { NS.tab = b.dataset.tab; mount(); }));
    mount();
  }
  function deliveryView() {
    const ops = role() === "ops", N = ADM.notifs;
    $("#nb").innerHTML = `<div id="ns"></div><div id="nl"></div>`;
    const stats = () => ($("#ns").innerHTML = U.strip([["已发出", N.filter((n) => !["排队"].includes(n.state)).length, "", 0], ["邮件退信 / 失败占比", Math.round((N.filter((n) => n.ch === "邮件" && ["退信", "失败"].includes(n.state)).length / N.filter((n) => n.ch === "邮件").length) * 100) + "%", "", 0], ["未确认强制确认", N.filter((n) => n.mand && n.ack === "未确认").length, "已读不等于已确认", 0], ["结果未知", N.filter((n) => n.state === "未知").length, "未知不转为成功", 0]]));
    stats();
    U.list($("#nl"), { S: NS.d, empty: "暂无通知记录", kwHint: "通知号、模板", minW: 1300, after: stats, rows: () => N, kw: (n) => n.id + n.tpl + n.obj, filters: [["ch", "渠道", [["站内", "站内"], ["邮件", "邮件"]]], ["state", "状态", ["可见", "已读", "已确认", "已送达", "退信", "失败", "未知"].map((x) => [x, x])], ["cat", "类别", ["规则", "佣金", "保证金", "协议", "不利政策", "运营通知"].map((x) => [x, x])]], match: (n, k, v) => n[k] === v,
      cols: [["通知号", (n) => `<button class="link" data-act="v" data-id="${n.id}">${n.id}</button>`], ["类别", (n) => n.cat], ["触发对象 / 模板", (n) => `${esc(n.obj)}<span class="sub">${n.tpl}</span>`], ["渠道 / 语言", (n) => `${n.ch}<span class="sub">${n.lang}</span>`], ["接收方", (n) => n.rcpt], ["状态", (n) => tg(n.state) + (n.ch === "邮件" && n.state === "未知" ? '<span class="sub">供应商结果未知，尚未确认送达</span>' : "")], ["强制确认", (n) => (n.mand ? `是 · ${n.ack || "—"}` : "否")], ["更新", (n) => n.upd]],
      actions: (n) => U.act("v", n.id, "查看") + (ops && ["失败", "退信"].includes(n.state) ? U.act("rt", n.id, "重试") : "") + (ops && n.state === "未知" ? U.act("q", n.id, "查询状态") : ""),
      onAct: (a, id, r) => { const n = ADM.notifs.find((x) => x.id === id); if (a === "v") return ADM.drawer.open({ title: n.id, sub: tg(n.state), tabs: [{ key: "a", label: "概览" }, { key: "b", label: "投递尝试" }, { key: "c", label: "渲染快照" }], foot: cf, bind: cb, body: (t) => t === "a" ? kv([["类别", n.cat], ["触发对象", esc(n.obj)], ["模板版本", n.tpl], ["渠道 / 语言", `${n.ch} / ${n.lang}`], ["接收方", n.rcpt], ["强制确认", n.mand ? "是（合作者不能关闭）" : "否"]]) + (n.ch === "邮件" ? '<div class="callout info" style="margin-top:12px">供应商已受理，不代表已送达。</div>' : "") : t === "b" ? `<ol class="timeline">${n.tries.map((x) => `<li class="done"><b>${esc(x.r)}</b><span>${x.t}</span></li>`).join("")}</ol>` : '<p>渲染快照为模板版本与变量的只读快照（演示省略正文）。</p>' });
        if (a === "rt") return ADM.modal({ title: "重试投递", body: `<p>仅失败 / 退信且策略允许时可重试，次数与退避由策略决定（待确认）。</p>${U.reasonRow("tW", "原因（必填）")}`, okText: "登记重试", onOk: (m) => { if (!U.needReason(m, "tW")) return false; n.state = "重试中"; n.tries.push({ t: NOW, r: "已登记重试" }); ADM.toast("已登记重试"); r(); } });
        n.qn = (n.qn || 0) + 1; if (n.qn < 2) { n.tries.push({ t: NOW, r: "已查询：供应商暂无事实，仍为未知" }); ADM.toast("供应商暂无事实，状态仍为未知"); } else { n.state = "已送达"; n.tries.push({ t: NOW, r: "供应商确认送达" }); ADM.toast("供应商确认：已送达"); } r(); } });
  }
  function annView() {
    const ops = role() === "ops", A = ADM.anns;
    $("#nb").innerHTML = `<div id="as"></div><div id="al"></div>`;
    const stats = () => ($("#as").innerHTML = U.strip([["草稿", A.filter((x) => x.state === "草稿").length, "", 0], ["待审批", A.filter((x) => x.state === "待审批").length, "", 0], ["已发布", A.filter((x) => x.state === "已发布").length, "已定时不计入", 0], ["已撤回 / 已过期", A.filter((x) => ["已撤回", "已过期"].includes(x.state)).length, "", 0]]));
    stats();
    if (ops) { $(".adm-pagehead .actions").innerHTML = '<button class="btn primary" id="newAn">新建公告</button>'; $("#newAn").onclick = () => annForm(null, () => { stats(); rp(); }); }
    const rp = U.list($("#al"), { S: NS.a, empty: "暂无公告", kwHint: "公告号、标题", minW: 1200, after: stats, rows: () => A, kw: (x) => x.id + x.title, filters: [["state", "状态", ["草稿", "待审批", "已定时", "已发布", "已撤回", "已过期"].map((x) => [x, x])], ["lang", "语言", ["中文", "英语"].map((x) => [x, x])]], match: (x, k, v) => x[k] === v,
      cols: [["公告号", (x) => `<span class="id">${x.id}</span>`], ["标题", (x) => esc(x.title)], ["语言 / 版本", (x) => `${x.lang}<span class="sub">v${x.ver}</span>`], ["受众", (x) => esc(x.aud)], ["状态", (x) => tg(x.state) + (x.state === "已定时" ? '<span class="sub">已定时，尚未发布</span>' : "")], ["发布 / 到期", (x) => `${x.at}<span class="sub">${x.exp}</span>`], ["创建人", (x) => esc(ADM.userName(x.by))]],
      actions: (x) => (ops && x.state === "草稿" ? U.act("e", x.id, "编辑") + U.act("s", x.id, "提交审批") : "") + (ops && ["已发布", "已定时"].includes(x.state) ? U.act("w", x.id, "撤回") : "") + (x.state === "待审批" ? '<a class="link" href="#/approvals">去审批</a>' : ""),
      onAct: (a, id, r) => { const x = ADM.anns.find((y) => y.id === id); if (a === "e") return annForm(x, r); if (a === "s") return ADM.modal({ title: "提交公告审批", body: `<p>审批链：风控给出合规意见 → 系统管理员最终发布。运营不得自审。公告仅含公开内容，不含个人、资金、风险细节。</p>`, okText: "提交审批", onOk: () => { const ap = ADM.newApproval({ type: "公告", obj: "公告 " + x.id, summary: `公告发布：${x.title}`, amt: "—", capital: false, limitH: 24, chain: [{ name: "合规意见（风控）", role: "risk" }, { name: "最终发布（系统管理员）", role: "admin" }], diff: [["公告状态", "草稿", "已发布"]], impact: `受众：${x.aud}`, refs: [x.id], reason: "运营提交公告发布" }); ap.onApprove = () => { x.state = x.at !== "—" && x.at > NOW ? "已定时" : "已发布"; if (x.at === "—") x.at = NOW; }; ap.onReject = () => { x.state = "草稿"; }; x.state = "待审批"; ADM.toast("公告已提交审批"); r(); } });
        ADM.modal({ title: "撤回公告", danger: true, body: `<p>确认撤回该公告？合作者将不再看到它；已读记录保留。</p>${U.reasonRow("wW", "原因（必填）")}`, okText: "确认撤回", onOk: (m) => { if (!U.needReason(m, "wW")) return false; x.state = "已撤回"; ADM.toast("公告已撤回"); r(); } }); } });
  }
  function annForm(x, rp) {
    ADM.modal({ title: x ? "编辑公告" : "新建公告", wide: true, body: `<div class="form-row"><label for="aT">标题（必填）</label><input class="field" id="aT" style="width:100%" value="${esc(x ? x.title : "")}"><div id="aTE" style="color:var(--danger);font-size:12px"></div></div><div class="form-row"><label for="aB">正文（必填）</label><textarea class="field" id="aB" rows="4" style="width:100%;height:auto;padding:8px 12px"></textarea><div id="aBE" style="color:var(--danger);font-size:12px"></div></div><div style="display:flex;gap:12px"><select class="select" id="aL" aria-label="语言"><option>中文</option><option>英语</option></select><select class="select" id="aA" aria-label="受众"><option>全部合作方</option><option>使用自建回传的合作方</option></select></div><p style="font-size:12px;color:var(--muted)">已发布的公告不能原地修改，编辑会生成新版本并重新审批。</p>`, okText: "保存草稿", onOk: (m) => { const t = m.querySelector("#aT").value.trim(), b = m.querySelector("#aB").value.trim(); m.querySelector("#aTE").textContent = t ? "" : "请填写标题"; m.querySelector("#aBE").textContent = b ? "" : "请填写正文"; if (!t || !b) return false; if (x) { x.title = t; ADM.toast("草稿已更新"); } else { ADM.anns.unshift({ id: "AN-" + (308 + ADM.anns.length - 5), title: t, lang: m.querySelector("#aL").value, aud: m.querySelector("#aA").value, ver: 1, state: "草稿", at: "—", exp: "—", by: me() }); ADM.toast("草稿已保存"); } rp(); } });
  }

  /* =============== 05 集成与数据治理 =============== */
  const IG = { tab: "integration", i: {}, q: {} };
  function renderIntegration(main, route) {
    const adm = role() === "admin";
    const tabs = [["integration", "集成与失败"], ["quality", "数据质量"], ["exports", "导出授权"]].concat(adm ? [["governance", "数据治理"]] : []);
    if (route.query.tab && tabs.some((t) => t[0] === route.query.tab)) IG.tab = route.query.tab;
    if (!tabs.some((t) => t[0] === IG.tab)) IG.tab = "integration";
    U.head(main, "工作台", "集成与数据治理", adm ? "查看外部依赖与数据链路的失败、缺数与冲突，登记受控重试与补数，并做数据治理。处理统一在任务队列。" : "只读：仅显示与你角色相关的来源。");
    $("#fx").innerHTML = `${tabsBar(tabs, IG.tab)}<div id="ib"></div>`;
    const mount = () => { $$("[data-tab]", main).forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === IG.tab)); ({ integration: integView, quality: qualView, exports: exView, governance: govView })[IG.tab](); };
    $$("[data-tab]", main).forEach((b) => (b.onclick = () => { IG.tab = b.dataset.tab; mount(); }));
    mount();
  }
  const srcOk = (j) => role() === "admin" || (role() === "ops" && ["CRM", "事件总线", "邮件 / 通知", "Salesforce"].includes(j.sys)) || (role() === "fin" && ["支付"].includes(j.sys));
  function integView() {
    const adm = role() === "admin", J = ADM.integrations;
    $("#ib").innerHTML = `<div id="is"></div><div id="il"></div>`;
    const vis = () => J.filter(srcOk);
    const stats = () => { const v = vis(); $("#is").innerHTML = U.strip([["失败待处理", v.filter((j) => j.state === "失败").length, "未被受控重试覆盖", 1], ["重试中", v.filter((j) => j.state === "重试中").length, "", 1], ["结果未知", v.filter((j) => j.state === "结果未知").length, "需先查询状态", 1], ["缺数积压", ADM.quality.filter((q) => ["部分", "陈旧", "冲突"].includes(q.st)).length, "", 1], ["补数中", v.filter((j) => j.state === "补数中").length, "", 1]]); $$("#is [data-stat]").forEach((b) => (b.onclick = () => { const i = +b.dataset.stat; if (i === 3) { IG.tab = "quality"; ADM.route(); return; } IG.i = { f: { state: ["失败", "重试中", "结果未知", "", "补数中"][i] }, q: "", page: 1 }; rp(); })); };
    stats();
    const rp = U.list($("#il"), { S: IG.i, empty: "没有符合条件的集成作业", kwHint: "作业号、事件、任务号", minW: 1350, after: stats, rows: vis, kw: (j) => j.id + j.rel + j.op, filters: [["sys", "外部系统", ["CRM", "支付", "事件总线", "邮件 / 通知", "Salesforce", "配置发布"].map((x) => [x, x])], ["state", "状态", ["失败", "重试中", "结果未知", "成功", "补数中"].map((x) => [x, x])]], match: (j, k, v) => j[k] === v,
      cols: [["作业", (j) => `<button class="link" data-act="v" data-id="${j.id}">${j.id}</button><span class="sub">${j.op}</span>`], ["来源系统", (j) => j.sys], ["状态", (j) => tg(j.state)], ["最近结果", (j) => esc(j.last)], ["可重试", (j) => j.retry], ["关联事件 / 任务", (j) => esc(j.rel)], ["影响范围", (j) => esc(j.scope)], ["更新", (j) => j.upd]],
      actions: (j) => U.act("v", j.id, "查看") + (adm && j.state === "结果未知" && !j.queried ? U.act("q", j.id, "查询状态") : "") + (adm && ["失败", "结果未知"].includes(j.state) && !/^否/.test(j.retry) && (j.state !== "结果未知" || j.queried) ? U.act("rt", j.id, "登记重试") : "") + (adm && j.state === "失败" ? U.act("bf", j.id, "登记补数") : ""),
      onAct: (a, id, r) => { const j = ADM.integrations.find((x) => x.id === id);
        if (a === "v") return ADM.drawer.open({ title: j.id, sub: tg(j.state), foot: cf, bind: cb, body: () => kv([["操作", j.op], ["来源系统", j.sys], ["最近结果", esc(j.last)], ["可重试", j.retry], ["关联", esc(j.rel)], ["影响范围", esc(j.scope)], ["幂等键", "idem-" + j.id.slice(-4) + "…（摘要）"]]) + '<div class="callout info" style="margin-top:12px">本页只展示状态并登记重试；处理统一在任务队列。重复回调内容不同会标记冲突并阻断受影响动作，乱序旧版本不能回滚新结论。</div>' });
        if (a === "q") { j.queried = true; ADM.toast("已查询：外部确认未成功，可登记重试"); return r(); }
        if (a === "rt") return ADM.modal({ title: "登记重试", body: `<p>重试由策略执行器按幂等键执行，不修改接收地址、密钥或支付金额；仍受熔断、次数、审批约束。</p>${U.reasonRow("tW", "原因与状态查询结果（必填）")}`, okText: "登记重试", onOk: (m) => { if (!U.needReason(m, "tW")) return false; j.state = "重试中"; j.upd = NOW; ADM.makeTask({ type: "integration", obj: "—", ref: j.id, title: `集成重试跟踪：${j.id}`, team: "平台运维组" }); ADM.toast("已登记重试，任务队列已关联"); r(); } });
        ADM.modal({ title: "登记补数", wide: true, body: `<div class="form-row"><label for="bE">缺失事件（按事件 ID 去重）</label><input class="field" id="bE" style="width:100%" placeholder="例如 EVT-8801, EVT-8802"><div id="bEE" style="color:var(--danger);font-size:12px"></div></div>${U.reasonRow("bW", "原因（必填）")}<p style="font-size:12px;color:var(--muted)">只重跑受影响案件；财务结果会变时需审批；不得在表单里伪造 CRM 事实。</p>`, okText: "创建补数任务", onOk: (m) => { const e = m.querySelector("#bE").value.trim(); m.querySelector("#bEE").textContent = e ? "" : "请填写缺失事件"; if (!e || !U.needReason(m, "bW")) return false; ADM.makeTask({ type: "data_backfill", obj: "—", ref: j.id, title: `事件补数：${e}`, team: "平台运维组" }); r(); } }); } });
  }
  function qualView() {
    const Q = ADM.quality, adm = role() === "admin";
    $("#ib").innerHTML = `${U.strip([["有效", Q.filter((q) => q.st === "有效").length, "", 0], ["部分", Q.filter((q) => q.st === "部分").length, "", 0], ["陈旧", Q.filter((q) => q.st === "陈旧").length, "", 0], ["冲突", Q.filter((q) => q.st === "冲突").length, "", 0], ["被阻断的自动资金动作", Q.filter((q) => /已阻断/.test(q.act)).length, "", 0]])}<div class="callout info" style="margin-bottom:12px">“已接收”不等于有效；未知、缺失、陈旧、冲突、重复的关键数据不转为 0、成功或失败，只阻断受影响的精确范围。</div><div class="table-wrap"><table class="dt" style="min-width:1100px"><thead><tr><th>来源对象</th><th>记录 / 版本</th><th>状态</th><th>失败检查项</th><th>新鲜度窗口</th><th>受影响自动动作</th><th>最近更正</th><th>操作</th></tr></thead><tbody>${Q.map((q, i) => `<tr><td>${esc(q.obj)}</td><td>${q.rec}<span class="sub">${q.ver}</span></td><td>${tg(q.st)}</td><td>${esc(q.fail)}</td><td>${q.fresh}</td><td>${esc(q.act)}</td><td>${q.fix}</td><td>${adm && !["有效", "已更正"].includes(q.st) ? `<button class="link" data-fix="${i}">数据更正</button>` : "—"}</td></tr>`).join("")}</tbody></table></div>`;
    $$("[data-fix]", $("#ib")).forEach((b) => (b.onclick = () => ADM.modal({ title: "数据更正", wide: true, body: `<p>更正产生新版本或关联更正记录；已被佣金 / 结算 / 风险 / 支付 / 报表使用的记录不原地覆盖。</p><div class="callout info">影响评估：受影响对象 1 个；已用结论需重算。</div>${U.reasonRow("fW", "更正后的事实与原因（必填）")}`, okText: "提交审批", onOk: (m) => { if (!U.needReason(m, "fW")) return false; const ap = ADM.newApproval({ type: "配置变更", obj: "数据更正 " + ADM.quality[+b.dataset.fix].rec, summary: "数据更正：" + ADM.quality[+b.dataset.fix].obj, amt: "—", capital: false, chain: [{ name: "风控复核", role: "risk" }], diff: [["事实版本", ADM.quality[+b.dataset.fix].ver, "新版本"]], impact: "产生新版本，不原地覆盖。", refs: [] }); ADM.toast(`更正申请已提交审批（${ap.id}）`); } })));
  }
  function exView() {
    const v = exVisible();
    $("#ib").innerHTML = `${U.strip([["待审批", v.filter((e) => e.appr === "待审批").length, "", 0], ["已生成待下载", v.filter((e) => e.gen === "就绪").length, "", 0], ["已过期", v.filter((e) => e.gen === "已过期").length, "", 0], ["已撤销", v.filter((e) => e.gen === "已撤销").length, "", 0]])}<div class="table-wrap"><table class="dt" style="min-width:1000px"><thead><tr><th>导出号</th><th>申请人</th><th>用途</th><th>范围</th><th class="num">行数</th><th>审批</th><th>生成</th><th>过期</th></tr></thead><tbody>${v.map((e) => `<tr><td class="id">${e.id}</td><td>${esc(ADM.userName(e.applicant))}</td><td>${esc(e.purpose)}</td><td>${esc(e.scope)}</td><td class="num">${e.rows == null ? "—" : e.rows}</td><td>${tg(e.appr)}</td><td>${tg(e.gen)}</td><td>${e.exp}</td></tr>`).join("")}</tbody></table></div><p style="color:var(--muted);font-size:12px;margin-top:8px">下载与撤销授权请到 <a href="#/exports">导出中心</a>；审批在审批队列完成。</p>`;
  }
  function govView() {
    const sec = (t, h) => `<div class="panel"><div class="panel-head"><h2>${t}</h2></div>${h}</div>`;
    $("#ib").innerHTML = `<div class="stack">${sec("数据分级与敏感字段", `<div class="table-wrap" style="border:0"><table class="dt"><thead><tr><th>字段</th><th>运营</th><th>风控</th><th>财务</th><th>系统管理员</th></tr></thead><tbody><tr><td>客户邮箱 / 手机</td><td>omit</td><td>masked</td><td>omit</td><td>omit</td></tr><tr><td>收款账户</td><td>omit</td><td>omit</td><td>masked</td><td>omit</td></tr><tr><td>IP / 设备标识</td><td>omit</td><td>hashed_or_summary</td><td>omit</td><td>masked</td></tr></tbody></table></div><p style="padding:0 16px 12px;color:var(--muted);font-size:12px">变更须审批；“明文查看”为独立授权并写审计；精确匹配仅在服务端。</p>`)}
      ${sec("敏感字段授权", `<div class="table-wrap" style="border:0"><table class="dt"><thead><tr><th>授权</th><th>字段</th><th>申请人</th><th>原因</th><th>到期</th><th>状态</th><th>操作</th></tr></thead><tbody>${ADM.grants.map((g) => `<tr><td class="id">${g.id}</td><td>${g.field}</td><td>${esc(ADM.userName(g.who))}</td><td>${esc(g.why)}</td><td>${g.exp}</td><td>${tg(g.state)}</td><td>${g.state === "生效" ? `<button class="link" data-g="${g.id}">撤销</button>` : "—"}</td></tr>`).join("")}</tbody></table></div><p style="padding:0 16px 12px;color:var(--muted);font-size:12px">批准人不得为申请人本人；到期自动失效；撤销立即生效。</p>`)}
      ${sec("保留策略", `<div class="table-wrap" style="border:0"><table class="dt"><thead><tr><th>数据类别</th><th>保留期</th><th>例外</th></tr></thead><tbody>${ADM.retention.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</tbody></table></div>`)}
      ${sec("删除与匿名化任务（DSAR）", `<div class="table-wrap" style="border:0"><table class="dt"><thead><tr><th>任务</th><th>类型</th><th>请求人</th><th>范围</th><th>依据</th><th>例外</th><th>状态</th></tr></thead><tbody>${ADM.dsar.map((d) => `<tr><td class="id">${d.id}</td><td>${d.type}</td><td>${d.req}</td><td>${d.scope}</td><td>${d.basis}</td><td>${d.exc}</td><td>${tg(d.state)}</td></tr>`).join("")}</tbody></table></div><p style="padding:0 16px 12px;color:var(--muted);font-size:12px">删除不覆盖审计历史；审计与风险决定不可物理删除。</p>`)}
      ${sec("Breach 响应", `<div class="table-wrap" style="border:0"><table class="dt"><thead><tr><th>事件</th><th>发现时间</th><th>分类</th><th>影响范围</th><th>遏制</th><th>通知决定</th><th>状态</th></tr></thead><tbody>${ADM.breaches.map((b) => `<tr><td class="id">${b.id}</td><td>${b.found}</td><td>${b.cls}</td><td>${b.scope}</td><td>${b.contain}</td><td>${b.notify}</td><td>${tg(b.state)}</td></tr>`).join("")}</tbody></table></div><p style="padding:0 16px 12px;color:var(--muted);font-size:12px">通知时限为合规放行项，生产参数待定。</p>`)}</div>`;
    $$("[data-g]", $("#ib")).forEach((b) => (b.onclick = () => ADM.modal({ title: "撤销敏感字段授权", danger: true, body: `<p>撤销立即生效并写入审计。</p>${U.reasonRow("gW", "原因（必填）")}`, okText: "确认撤销", onOk: (m) => { if (!U.needReason(m, "gW")) return false; ADM.grants.find((x) => x.id === b.dataset.g).state = "已撤销"; ADM.toast("授权已撤销"); govView(); } })));
  }

  ADM.pages["appeals-service"] = renderAppeals;
  ADM.pages["exports"] = renderExports;
  ADM.pages["notices"] = renderNotices;
  ADM.pages["integration-governance"] = renderIntegration;
})();
