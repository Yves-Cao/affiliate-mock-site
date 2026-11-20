/* 页面 13 审计 / 27 权限与菜单 */
(function () {
  const ADM = window.ADM, esc = ADM.esc, $ = ADM.$, $$ = ADM.$$, U = ADM.ui, kv = U.kv;
  const NOW = "2026-11-19 10:30";
  const role = () => ADM.role().key;
  const tg = (s, t) => `<span class="tag ${t || ""}">${esc(s)}</span>`;
  const who = (u) => (ADM.users[u] ? ADM.users[u].name : u);
  const cf = () => '<button class="btn" id="fc">关闭</button>';
  const cb = (d) => { const b = d.querySelector("#fc"); if (b) b.onclick = () => ADM.drawer.close(); };

  /* =============== 13 审计 =============== */
  const AS = { S: {}, trace: "" };
  const RISK_ACTIONS = ["冻结", "批准", "驳回", "敏感查看", "执行", "提交"];
  function renderAudit(main) {
    const adm = role() === "admin";
    U.head(main, "权限与审计", "审计", "审计记录不可修改或删除，如需更正请发起更正记录。" + (adm ? "" : "当前为风控视角，仅显示与风控处置相关的记录。"), adm ? '<button class="btn" id="aexp">导出</button>' : "");
    const rows = () => ADM.audits.filter((a) => adm || (RISK_ACTIONS.includes(a.action) && /风控|系统|财务/.test(a.role) && /风险|熔断|案件|任务|客户|冲正|审批/.test(a.obj + a.reason)));
    $("#fx").innerHTML = `<div id="astat"></div><div id="alist"></div>`;
    const stats = () => { const v = rows(); $("#astat").innerHTML = U.strip([["今日记录数", v.filter((a) => a.at.startsWith("2026-11-19")).length, "", 0], ["自审操作", v.filter((a) => a.self).length, "self_review=true", adm ? 1 : 0], ["授权拒绝异常", v.filter((a) => a.res === "拒绝").length, "", 1], ["待处理更正", ADM.auditCorrections.filter((c) => c.state === "待审批").length, "", 0]]); $$("#astat [data-stat]").forEach((b) => (b.onclick = () => { const i = +b.dataset.stat; ADM.setS(AS, { f: i === 1 ? { self: "是" } : { res: "拒绝" }, q: "", page: 1 }); rp(); })); };
    stats();
    const rp = U.list($("#alist"), { S: AS.S, empty: "没有符合条件的审计记录，请调整筛选条件", kwHint: "TraceId、审批号、对象、审计号", minW: 1350, foot: "审计查询本身也会被记录；不提供编辑与删除", after: stats, rows: () => rows().concat(ADM.auditCorrections.map((c) => c.rec)), kw: (a) => a.id + a.trace + a.obj,
      filters: [["action", "动作类型", [...new Set(ADM.audits.map((a) => a.action))].map((x) => [x, x])], ["res", "结果", ["成功", "拒绝", "失败"].map((x) => [x, x])], ["self", "自审", [["是", "自审"], ["否", "非自审"]]]], match: (a, k, v) => (k === "self" ? (a.self ? "是" : "否") === v : a[k] === v),
      cols: [["审计号", (a) => `<button class="link" data-act="v" data-id="${a.id}">${a.id}</button>`], ["时间", (a) => a.at], ["操作人 / 角色", (a) => `${esc(who(a.who))}<span class="sub">${a.role}</span>`], ["动作", (a) => a.action], ["对象", (a) => esc(a.obj)], ["结果", (a) => tg(a.res, { 成功: "ok", 拒绝: "warn", 失败: "bad" }[a.res])], ["原因", (a) => `<span class="ellip" style="display:inline-block;max-width:200px" title="${esc(a.reason)}">${esc(a.reason)}</span>`], ["自审", (a) => (a.self ? tg("自审", "warn") : "否")], ["TraceId", (a) => `<button class="link" data-act="t" data-id="${a.id}">${a.trace}</button>`]],
      actions: (a) => U.act("v", a.id, "查看") + (adm && !a.corr && !ADM.auditCorrections.some((c) => c.target === a.id) ? U.act("c", a.id, "发起更正") : ""), onAct: (a, id, r) => auditAct(a, id, () => { stats(); r(); }) });
    const e = $("#aexp"); if (e) e.onclick = () => ADM.modal({ title: "发起导出", body: `<p>审计导出走导出中心，需授权；证据导出受合规限制。导出行为本身会被记录。</p>${U.reasonRow("xW", "用途（必填）")}`, okText: "创建导出任务", onOk: (m) => { const w = U.needReason(m, "xW", 4); if (!w) return false; const id = "EX-" + (7109 + ADM.exports.length - 8); ADM.exports.unshift({ id, src: "审计", obj: "审计记录", applicant: ADM.role().userId, purpose: w, scope: "近 7 天", sens: "敏感", rows: null, appr: "待审批", gen: "排队", exp: "—", dl: 0 }); ADM.toast(`导出任务已创建（${id}）`); } });
  }
  function auditAct(a, id, rp) {
    const all = ADM.audits.concat(ADM.auditCorrections.map((c) => c.rec)), x = all.find((y) => y.id === id);
    if (a === "t") { ADM.setS(AS, { f: {}, q: x.trace, page: 1 }); ADM.toast("已按 TraceId 过滤"); return rp(); }
    if (a === "v") return ADM.drawer.open({ title: x.id, sub: tg(x.res, { 成功: "ok", 拒绝: "warn", 失败: "bad" }[x.res]), tabs: [{ key: "a", label: "概览" }, { key: "b", label: "前后摘要" }, { key: "c", label: "关联" }], foot: cf, bind: cb,
      body: (t) => t === "a" ? kv([["时间", x.at + "（UTC+8）"], ["操作人 / 角色", `${esc(who(x.who))} / ${x.role}`], ["动作", x.action], ["对象与版本", esc(x.obj)], ["结果", x.res], ["原因", esc(x.reason)], ["自审", x.self ? "是（self_review=true）" : "否"]]) + (ADM.auditCorrections.some((c) => c.target === x.id) ? '<div class="callout info" style="margin-top:12px">该记录有关联更正记录；原记录保持不变。</div>' : "") : t === "b" ? kv([["before_summary", esc(x.before)], ["after_summary", esc(x.after)]]) + '<p style="color:var(--muted);font-size:12px;margin-top:12px">摘要只含安全的结构化内容，不含敏感原文。</p>' : kv([["TraceId", x.trace], ["链路", "API → 任务 → 事件 → 外部调用（演示省略）"]]) });
    ADM.modal({ title: "发起审计更正", wide: true, body: `<p>审计记录不可修改。更正通过审批后生成“关联更正记录”，原记录保持不变。</p><div class="callout info" style="margin-bottom:12px">更正对象：${x.id}（${esc(x.obj)}）。审批角色待确认（U-3），演示中由风控给出复核。</div>${U.reasonRow("cW", "更正原因（必填）")}${U.reasonRow("cE", "证据说明（必填）")}`, okText: "提交更正申请", onOk: (m) => { const w = U.needReason(m, "cW"), e = U.needReason(m, "cE"); if (!w || !e) return false; const ap = ADM.newApproval({ type: "审计更正", obj: "审计 " + x.id, summary: `审计更正：${x.id}`, amt: "—", capital: false, limitH: 24, chain: [{ name: "更正复核（角色待确认）", role: "risk" }], reason: w, diff: [["关联更正记录", "无", "新增"]], impact: "原记录不变。", refs: [x.id] }); const rec = { id: "AUD-C" + (ADM.auditCorrections.length + 1), at: NOW, who: ADM.role().userId, role: "系统管理员", action: "审计更正", obj: "更正 " + x.id, res: "成功", reason: w, self: false, trace: "tr-corr" + (ADM.auditCorrections.length + 1), before: "—", after: "关联更正记录", corr: true }; const c = { target: x.id, state: "待审批", rec }; ap.onApprove = () => { c.state = "已生效"; }; ap.onReject = () => { c.state = "已驳回"; }; ADM.auditCorrections.push(c); ADM.toast("更正申请已提交审批"); rp(); } });
  }

  /* =============== 27 权限与菜单 =============== */
  const PS = { view: "roles", users: {} };
  const adminCount = () => Object.values(ADM.users).filter((u) => u.role === "admin").length;
  function renderPerm(main, route) {
    if (["roles", "matrix", "scope", "extra", "users"].includes(route.query.view)) PS.view = route.query.view;
    U.head(main, "权限与审计", "权限与菜单", "角色固定为运营、风控、财务、系统管理员，本页不新建、删除或重命名角色。授权 = 角色 × 资源 × 动作 × 对象范围 × 字段策略 × 状态门禁；技术管理权不等于业务终审权。", '<button class="btn primary" id="chg">发起变更</button>');
    $("#fx").innerHTML = `<div id="ps"></div><div class="seg" style="margin-bottom:12px">${[["roles", "角色与菜单"], ["matrix", "权限矩阵"], ["scope", "数据范围与字段策略"], ["extra", "附加权限"], ["users", "用户与授权"]].map((v) => `<button data-v="${v[0]}" aria-pressed="${PS.view === v[0]}">${v[1]}</button>`).join("")}</div><div id="pb"></div>`;
    const mount = () => {
      $$("[data-v]", main).forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === PS.view));
      const pend = ADM.permApprovals.filter((a) => ADM.approvals.find((x) => x.id === a && x.status === "pending")).length;
      $("#ps").innerHTML = U.strip([["用户总数", Object.keys(ADM.users).length, "", 0], ["待审批变更", pend, "需另一位系统管理员审批", 0], ["7 日内到期授权", ADM.extraGrants.filter((g) => g.exp <= "2026-11-26").length, "", 0], ["自审操作", ADM.audits.filter((a) => a.self && /权限/.test(a.action)).length, "权限类 self_review", 0]]);
      ({ roles, matrix, scope, extra, users })[PS.view]($("#pb"), mount);
    };
    $$("[data-v]", main).forEach((b) => (b.onclick = () => { PS.view = b.dataset.v; mount(); }));
    $("#chg").onclick = () => changeModal(null, mount);
    mount();
  }
  const SYM = { w: "操", r: "读", n: "—" };
  function roles(box) {
    const vis = (i) => ADM.menu.reduce((s, g) => s + g.items.filter((it) => it.perm[i] !== "n").length, 0);
    box.innerHTML = `<div class="callout info" style="margin-bottom:12px">矩阵不可直接编辑：调整须发起“策略变更”（草稿 → 影响预览 → 另一位管理员审批 → 生效）。当前策略版本 policy-v4（待确认）。</div><div class="table-wrap"><table class="dt" style="min-width:900px"><thead><tr><th class="fixl">入口</th>${ADM.roleOrder.map((r) => `<th>${ADM.roles[r].name}<span style="display:block;font-weight:400">可见入口 ${vis(ADM.roleOrder.indexOf(r))}</span></th>`).join("")}</tr></thead><tbody>${ADM.menu.map((g) => g.items.map((it) => `<tr><td class="fixl"><span class="sub" style="display:inline;margin-right:6px">${g.group}</span><b>${it.label}</b><span class="sub">${it.id}</span></td>${[0, 1, 2, 3].map((i) => `<td>${it.perm[i] === "w" ? tg("操", "info") : it.perm[i] === "r" ? tg("读", "") : '<span style="color:var(--muted)">—</span>'}</td>`).join("")}</tr>`).join("")).join("")}</tbody></table></div>`;
  }
  function matrix(box) {
    const M = [["风险工作台", "发起复核", "—", "允许", "—", "—", "同来源同目的仅一个任务", "不适用"], ["风险工作台", "提交处置申请", "—", "允许", "—", "—", "草稿已保存且预览有效", "必须由他人审批，不允许自审"], ["提现订单", "核验 / 请求支付", "—", "—", "允许", "—", "仅待审核 / 已批准状态", "另一位财务审批，不允许自审"], ["提现订单", "查看收款账户", "—", "—", "允许（脱敏）", "—", "—", "不适用"], ["任务队列", "转办", "需附加权限", "需附加权限", "需附加权限", "需附加权限", "任务非终态", "不适用"], ["配置版本", "发布", "—", "—", "—", "允许", "已审批待发布", "低敏白名单可自审，其余需他人"], ["回传目标", "暂停 / 恢复", "需附加权限", "—", "—", "—", "—", "不适用"], ["审计记录", "查看", "—", "允许（相关）", "—", "允许", "—", "不适用"], ["导出任务", "撤销授权", "—", "—", "—", "允许", "未过期", "不适用"]];
    box.innerHTML = `<div class="table-wrap"><table class="dt" style="min-width:1200px"><thead><tr><th class="fixl">资源</th><th>动作</th><th>运营</th><th>风控</th><th>财务</th><th>系统管理员</th><th>状态门禁</th><th>审批策略</th></tr></thead><tbody>${M.map((r) => `<tr><td class="fixl">${r[0]}</td><td>${r[1]}</td>${r.slice(2, 6).map((c) => `<td>${c === "允许" || c.startsWith("允许") ? tg(c, "ok") : c === "—" ? '<span style="color:var(--muted)">不允许</span>' : tg(c, "warn")}</td>`).join("")}<td>${r[6]}</td><td>${r[7]}</td></tr>`).join("")}</tbody></table></div><p style="color:var(--muted);font-size:12px;margin-top:8px">状态门禁优先于角色。动作与资源的完整目录未冻结，行以现有页面文档为准（待确认）。</p>`;
  }
  function scope(box) {
    box.innerHTML = `<div class="stack"><div class="panel"><div class="panel-head"><h2>数据范围</h2><span class="meta">按用户配置，取交集：法人主体 · 国家 · 合作方分配 · 活动 / 渠道</span></div><div class="table-wrap" style="border:0"><table class="dt"><thead><tr><th>用户</th><th>角色</th><th>范围</th></tr></thead><tbody>${Object.keys(ADM.users).map((u) => `<tr><td>${esc(ADM.users[u].name)}</td><td>${ADM.roles[ADM.users[u].role].name}</td><td>${ADM.userScope[u]}</td></tr>`).join("")}</tbody></table></div><p style="padding:0 16px 12px;color:var(--muted);font-size:12px">无范围配置的用户看不到相关对象。</p></div>
      <div class="panel"><div class="panel-head"><h2>字段策略</h2></div><div class="table-wrap" style="border:0"><table class="dt"><thead><tr><th>字段类别</th><th>默认</th><th>揭示条件</th></tr></thead><tbody><tr><td>邮箱、手机、证件、银行 / 钱包账号</td><td>脱敏</td><td>单字段临时揭示：授权 + 原因 + ≤60 秒 + 留痕；复制需单独授权</td></tr><tr><td>风险明细、证据、触发快照</td><td>仅风控</td><td>证据全文需额外权限，访问与下载留痕</td></tr><tr><td>风险阈值、权重、内部评分、集群成员关系图</td><td>任何角色均不展示</td><td>不提供揭示</td></tr><tr><td>收款账户、钱包与保证金构成</td><td>仅财务</td><td>其他角色不返回</td></tr></tbody></table></div><p style="padding:0 16px 12px;color:var(--muted);font-size:12px">字段策略变更同样走版本化与审批；放宽敏感字段可见性需附原因与影响说明。</p></div></div>`;
  }
  function extra(box, mount) {
    box.innerHTML = `<div class="panel" style="margin-bottom:16px"><div class="panel-head"><h2>附加权限目录</h2><span class="meta">待冻结</span></div><div class="table-wrap" style="border:0"><table class="dt"><thead><tr><th>权限键</th><th>含义</th><th>典型持有者</th></tr></thead><tbody>${ADM.permCatalog.map((p) => `<tr><td class="id">${p[0]}</td><td>${p[1]}</td><td>${p[2]}</td></tr>`).join("")}</tbody></table></div></div><div class="panel"><div class="panel-head"><h2>已授予</h2></div><div class="table-wrap" style="border:0"><table class="dt"><thead><tr><th>用户</th><th>权限</th><th>原因</th><th>到期</th><th>操作</th></tr></thead><tbody>${ADM.extraGrants.map((g, i) => `<tr><td>${esc(who(g.uid))}</td><td class="id">${g.perm}</td><td>${esc(g.why)}</td><td>${g.exp}</td><td>${g.uid === ADM.role().userId ? '<span style="color:var(--muted)">不能撤销自己的权限</span>' : `<button class="link" data-rv="${i}">撤销</button>`}</td></tr>`).join("")}</tbody></table></div><p style="padding:0 16px 12px;color:var(--muted);font-size:12px">授予需原因与到期；授予人不能是被授予人本人；风险与资金类处置不因任何附加权限变为可自审。</p></div>`;
    $$("[data-rv]", box).forEach((b) => (b.onclick = () => ADM.modal({ title: "撤销附加权限", danger: true, body: `<p>撤销立即生效，并清空受限详情与本地草稿。</p>${U.reasonRow("vW", "原因（必填）")}`, okText: "确认撤销", onOk: (m) => { if (!U.needReason(m, "vW")) return false; const g = ADM.extraGrants[+b.dataset.rv]; if (g.perm === "tasks.assign" && ADM.users[g.uid]) ADM.users[g.uid].assign = false; ADM.extraGrants.splice(+b.dataset.rv, 1); ADM.audits.unshift({ id: "AUD-" + (Math.max(...ADM.audits.map((x) => +String(x.id).replace(/\D/g, ""))) + 1), at: NOW, who: ADM.role().userId, role: "系统管理员", action: "权限变更", obj: `用户 ${g.uid} · 附加权限`, res: "成功", reason: "撤销 " + g.perm, self: false, trace: "tr-rv" + Date.now().toString(16).slice(-6), before: g.perm, after: "无" }); ADM.toast("附加权限已撤销"); mount(); } })));
  }
  function users(box, mount) {
    U.list(box, { S: PS.users, empty: "暂无用户", kwHint: "姓名、账号标识", minW: 1100, rows: () => Object.keys(ADM.users).map((u) => Object.assign({ uid: u }, ADM.users[u])), kw: (u) => u.name + u.uid, filters: [["role", "角色", ADM.roleOrder.map((r) => [r, ADM.roles[r].name])]], match: (u, k, v) => u[k] === v,
      cols: [["用户", (u) => `${esc(u.name)}<span class="sub">${u.uid}@example.com（脱敏）</span>`], ["角色", (u) => ADM.roles[u.role].name], ["数据范围", (u) => ADM.userScope[u.uid]], ["附加权限", (u) => { const g = ADM.extraGrants.filter((x) => x.uid === u.uid); return g.length ? `${g.length} 项<span class="sub">最近到期 ${g.map((x) => x.exp).sort()[0]}</span>` : "—"; }], ["状态", (u) => tg(ADM.permApprovals.some((a) => ADM.approvals.find((x) => x.id === a && x.status === "pending" && x.obj.includes(u.uid))) ? "待审批变更" : "启用", "ok")], ["最近登录", (u) => ADM.userLogin[u.uid]]],
      actions: (u) => (u.uid === ADM.role().userId ? '<span style="color:var(--muted)">不能修改自己</span>' : U.act("c", u.uid, "发起变更")), onAct: (a, id) => changeModal(id, mount) });
  }
  function changeModal(uid, mount) {
    const list = Object.keys(ADM.users).filter((u) => u !== ADM.role().userId);
    const single = adminCount() < 2;
    ADM.modal({ title: "发起权限变更", wide: true, body: `<div class="form-row"><label for="cU">用户</label><select class="select" id="cU" style="width:100%">${list.map((u) => `<option value="${u}" ${u === uid ? "selected" : ""}>${esc(ADM.users[u].name)}（${ADM.roles[ADM.users[u].role].name}）</option>`).join("")}</select></div>
      <div class="form-row"><label for="cT">变更类型</label><select class="select" id="cT" style="width:100%"><option value="perm">授予附加权限</option><option value="scope">调整数据范围</option></select></div>
      <div class="form-row"><label for="cP">附加权限</label><select class="select" id="cP" style="width:100%">${ADM.permCatalog.map((p) => `<option value="${p[0]}">${p[0]} · ${p[1]}</option>`).join("")}</select></div>
      <div class="form-row"><label for="cX">到期日</label><input class="field" type="date" id="cX" value="2027-02-28"></div>${U.reasonRow("cW", "原因（必填）")}
      ${single ? '<label style="display:flex;gap:8px;line-height:24px"><input type="checkbox" id="cS"> 当前仅 1 名系统管理员：启用自审并标记 self_review=true（至少应配置两名系统管理员）</label>' : ""}
      <p style="font-size:12px;color:var(--muted)">管理员不能修改自己的角色、范围与附加权限；变更须经另一位系统管理员审批，影响预览：仅影响被授予人。</p>`, okText: "提交变更",
      onOk: (m) => {
        const u = m.querySelector("#cU").value, p = m.querySelector("#cP").value, ex = m.querySelector("#cX").value, w = U.needReason(m, "cW"); if (!w) return false;
        if (!ex || ex < "2026-11-20") { ADM.toast("到期日必须晚于今天", "err"); return false; }
        const selfOk = single && m.querySelector("#cS") && m.querySelector("#cS").checked;
        const apply = () => { ADM.extraGrants.push({ uid: u, perm: p, exp: ex, why: w }); if (p === "tasks.assign") ADM.users[u].assign = true; };
        if (selfOk) { apply(); ADM.audits.unshift({ id: "AUD-" + (Math.max(...ADM.audits.map((x) => +String(x.id).replace(/\D/g, ""))) + 1), at: NOW, who: ADM.role().userId, role: "系统管理员", action: "权限变更", obj: `用户 ${u} · 附加权限`, res: "成功", reason: `授予 ${p}（单人环境自审）`, self: true, trace: "tr-self" + Date.now().toString(16).slice(-5), before: "无", after: p }); ADM.toast("已生效，已记录自审（self_review=true）"); }
        else { const ap = ADM.newApproval({ type: "权限", obj: `用户 ${u} · 附加权限`, summary: `授予 ${p}（${ADM.users[u].name}）`, amt: "—", capital: false, limitH: 24, chain: [{ name: "系统管理员复核", role: "admin" }], reason: w, diff: [["附加权限", "无", p + "，到期 " + ex]], impact: "仅影响被授予人。", refs: [] }); ap.onApprove = apply; ADM.permApprovals.push(ap.id); ADM.toast(`变更已提交，待另一位系统管理员审批（${ap.id}）`); }
        mount();
      } });
  }

  ADM.pages["audit"] = renderAudit;
  ADM.pages["config-permission"] = renderPerm;
})();
