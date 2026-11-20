/* 页面 06–09 业务配置（总览与版本管理） / 10 系统配置 */
(function () {
  const ADM = window.ADM, esc = ADM.esc, $ = ADM.$, $$ = ADM.$$, U = ADM.ui, kv = U.kv;
  const NOW = "2026-11-19 10:30";
  const role = () => ADM.role().key, me = () => ADM.role().userId;
  const tg = (s, t) => `<span class="tag ${t || ""}">${esc(s)}</span>`;
  const STT = { 已锁定: "ok", 生效中: "ok", 草稿: "", 审批中: "info", 已审批: "info", 待生效: "info", 生效失败: "bad", 未配置: "warn", 已作废: "" };
  const LABEL = { 已审批: "待发布" };
  const st = (s) => tg(LABEL[s] || s, STT[s]);
  const WORK = ["草稿", "审批中", "已审批", "待生效", "生效失败"];
  const cur = (it) => it.versions.filter((v) => v.state === "已锁定").sort((a, b) => (a.ver < b.ver ? 1 : -1))[0] || null;
  const work = (it) => it.versions.find((v) => WORK.includes(v.state)) || null;
  const itemState = (it) => { const w = work(it); return w ? w.state : cur(it) ? "生效中" : "未配置"; };
  const canEdit = (it) => role() === it.owner || role() === "admin";
  const nextVer = (it) => "v" + (Math.max(0, ...it.versions.map((v) => +v.ver.slice(1))) + 1);
  const vstag = (s) => tg(s, { 已确认: "ok", 待评审: "warn", 待技术核验: "warn", "Mock 演示": "info" }[s]);
  const num = (v) => (typeof v === "number" ? v : /^-?\d+(\.\d+)?$/.test(String(v).trim()) ? Number(v) : NaN);

  /* ---------- 校验与试算 ---------- */
  function validate(it, v) {
    const L = [], p = (k) => v.params.find((x) => x.key === k), val = (k) => (p(k) ? num(p(k).value) : NaN);
    const add = (ok, t) => L.push({ ok, t });
    const unsigned = v.params.filter((x) => String(x.value).includes("待确认"));
    add(unsigned.length === 0, unsigned.length ? `未签核数值只能保存为草稿，不能提交生效：${unsigned.map((x) => x.name).join("、")}` : "无未签核数值");
    v.params.forEach((x) => { if (typeof x.value === "string" && x.unit && /^[\d.]+$/.test(x.value) === false && !String(x.value).includes("待确认") && ["天", "次", "客户", "%", "USD", "小时"].includes(x.unit) && isNaN(num(x.value))) add(false, `${x.name} 必须是数字`); });
    if (it.code === "B01" && p("ftd_ratio")) add(val("ftd_ratio") + val("valid_ftd_ratio") === 100, `首次入金与有效转化阶段基础比例合计必须为 100%（当前 ${val("ftd_ratio") + val("valid_ftd_ratio")}%）`);
    if (it.code === "B02") add(val("ftd_threshold") <= val("valid_ftd_threshold"), "首次入金门槛不得高于有效转化门槛");
    if (it.code === "B03") add(val("active_trading_days") <= val("observation_days"), "最低活跃交易日不得超过观察期");
    if (it.code === "B07") add(Number.isInteger(val("freeze_threshold_days")) && val("freeze_threshold_days") > 0, "冻结阈值必须为正整数");
    if (it.code === "B06") add(Number.isInteger(val("window_days")) && val("window_days") > 0, "归因窗口必须为正整数天");
    if (it.code === "B07") add(!!ADM.cfgItems.find((i) => i.code === "B04").versions.some((x) => x.state === "已锁定"), "依赖配置“信用与权益”存在且有效期覆盖目标版本");
    add(true, "同一配置键与范围无重叠的有效期");
    return L;
  }
  function trial(it, v) {
    const base = cur(it);
    const changed = v.params.filter((x) => !base || String((base.params.find((y) => y.key === x.key) || {}).value) !== String(x.value));
    v.trial = { at: NOW, partners: 12 + changed.length, samples: 1240, objs: 38 + changed.length * 7, diff: it.funds ? (changed.length ? "+USD 1,820.00（预估）" : "USD 0.00") : "不涉及资金", note: it.code === "B07" || it.code === "B10" ? "影子重放：命中 21，疑似误报 2（仅评估）" : "—" };
  }

  /* =============== 业务配置 =============== */
  const BS = { tab: "overview", S: {} };
  function renderConfig(main, route) {
    const adm = role() === "admin";
    if (route.query.tab === "trial") BS.tab = "trial";
    U.head(main, "系统设置", "业务配置", "版本化管理会改变资格、佣金、风险、结算、提现等结果的配置。草稿由专业角色创建，专业角色审批，系统管理员最终发布；未签核的生产数值只能保存为草稿。", adm ? '<a class="btn" href="#/system">系统配置 →</a>' : "");
    $("#fx").innerHTML = `<div id="cs"></div>${`<div class="tabs" style="margin-bottom:16px">${[["overview", "总览"], ["trial", "试算结果"]].map((t) => `<button role="tab" data-tab="${t[0]}" aria-selected="${BS.tab === t[0]}">${t[1]}</button>`).join("")}</div>`}<div id="cl"></div>`;
    const stats = () => { const I = ADM.cfgItems; $("#cs").innerHTML = U.strip([["待审批", I.filter((i) => itemState(i) === "审批中").length, "审批中的版本", 1], ["待生效", I.filter((i) => itemState(i) === "待生效").length, "已审批并设置未来时间", 1], ["生效失败", I.filter((i) => itemState(i) === "生效失败").length, "需处理", 1], ["未配置项", I.filter((i) => itemState(i) === "未配置").length, "相关业务动作会被阻断", 1]]); $$("#cs [data-stat]").forEach((b) => (b.onclick = () => { BS.tab = "overview"; BS.S = { f: { state: ["审批中", "待生效", "生效失败", "未配置"][+b.dataset.stat] }, q: "", page: 1 }; mount(); })); };
    const mount = () => {
      stats(); $$("[data-tab]", main).forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === BS.tab));
      if (BS.tab === "trial") return trialTab($("#cl"));
      U.list($("#cl"), { S: BS.S, empty: "暂无配置项", kwHint: "配置项名称、编号", minW: 1400, foot: "总览以配置项为行；不含系统配置", after: stats, rows: () => ADM.cfgItems, kw: (i) => i.code + i.name,
        filters: [["domain", "配置域", ADM.cfgDomains.map((d) => [d, d])], ["state", "状态", ["未配置", "草稿", "审批中", "已审批", "待生效", "生效中", "生效失败"].map((s) => [s, LABEL[s] || s])], ["owner", "责任角色", ADM.roleOrder.map((r) => [r, ADM.roles[r].name])]], match: (i, k, v) => (k === "state" ? itemState(i) === v : i[k] === v),
        cols: [["配置项", (i) => `<button class="link" data-act="v" data-id="${i.code}">${esc(i.name)}</button><span class="sub">${i.code} · ${i.domain}</span>`], ["当前使用版本", (i) => (cur(i) ? cur(i).ver : '<span style="color:var(--warning)">未配置</span>')], ["当前配置参数", (i) => (cur(i) ? esc(cur(i).params.slice(0, 2).map((p) => `${p.name} ${p.value}${p.unit && typeof p.value === "number" ? p.unit : ""}`).join("；")) : "—")], ["定时 / 待处理版本", (i) => { const w = work(i); return w ? `${w.ver} ${st(w.state)}` : "无"; }], ["计划生效时间", (i) => { const w = work(i); return w && w.state === "待生效" ? w.eff + "（UTC+8）" : "—"; }], ["状态", (i) => st(itemState(i))], ["责任角色", (i) => ADM.roles[i.owner].name], ["最后修改", (i) => { const w = work(i) || cur(i); return w ? `${esc(ADM.userName(w.by))}<span class="sub">${w.at}</span>` : "—"; }]],
        actions: (i) => U.act("v", i.code, "查看") + (canEdit(i) && !work(i) ? U.act("n", i.code, cur(i) ? "复制为新草稿" : "新建草稿") : "") + (canEdit(i) && !work(i) && i.versions.filter((v) => v.state === "已锁定").length > 1 ? U.act("rb", i.code, "创建回退草稿") : ""),
        onAct: (a, code, rp) => { const it = ADM.cfgItems.find((x) => x.code === code); const done = () => { stats(); rp(); }; if (a === "v") return openVersion(it, work(it) || cur(it), done); if (a === "n") return editModal(it, cur(it), "new", done); if (a === "rb") return rollbackModal(it, done); } });
    };
    $$("[data-tab]", main).forEach((b) => (b.onclick = () => { BS.tab = b.dataset.tab; mount(); }));
    mount();
  }
  function trialTab(box) {
    const rows = []; ADM.cfgItems.forEach((it) => it.versions.forEach((v) => { if (v.trial) rows.push([it, v]); }));
    box.innerHTML = rows.length ? `<div class="table-wrap"><table class="dt" style="min-width:1000px"><thead><tr><th>配置项</th><th>版本</th><th class="num">涉及合作方</th><th class="num">样本数</th><th class="num">命中对象</th><th>金额差异</th><th>备注</th><th>试算时间</th></tr></thead><tbody>${rows.map(([it, v]) => `<tr><td>${esc(it.name)}<span class="sub">${it.code}</span></td><td>${v.ver}</td><td class="num">${v.trial.partners}</td><td class="num">${v.trial.samples}</td><td class="num">${v.trial.objs}</td><td>${v.trial.diff}</td><td>${esc(v.trial.note)}</td><td>${v.trial.at}</td></tr>`).join("")}</tbody></table></div><p style="color:var(--muted);font-size:12px;margin-top:8px">试算只展示对“在途且未锁定”对象的影响，不改变正式账务。</p>` : '<div class="empty"><b>暂无试算结果</b>在版本详情里运行“试算”后会出现在这里。</div>';
  }

  /* ---------- 编辑 / 回退 ---------- */
  function editModal(it, base, mode, done, ver) {
    const nv = ver || nextVer(it), params = (base ? base.params : it.versions.length ? it.versions[0].params : defaultParams(it)).map((p) => Object.assign({}, p));
    ADM.modal({ title: `${mode === "edit" ? "编辑草稿" : cur(it) ? "复制为新草稿" : "新建草稿"} · ${it.name}（${nv}）`, wide: true,
      body: `<p style="font-size:12px;color:var(--muted)">不会覆盖已生效版本；来源 ${base ? base.ver : "无"}。值为“待确认”的项只能保存为草稿。</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${params.map((p, i) => `<div class="form-row" style="margin:0"><label for="pm${i}">${esc(p.name)} ${p.unit ? `（${p.unit}）` : ""} ${vstag(p.vs)}</label><input class="field" id="pm${i}" style="width:100%" value="${esc(p.value)}">${p.range ? `<div style="font-size:12px;color:var(--muted)">参考范围：${esc(p.range)}</div>` : ""}</div>`).join("")}</div>${U.reasonRow("eW", "变更原因（必填）")}`,
      okText: "保存草稿", onOk: (m) => { const w = U.needReason(m, "eW"); if (!w) return false; params.forEach((p, i) => { const raw = m.querySelector("#pm" + i).value.trim(); p.value = typeof p.value === "number" || /^\d+(\.\d+)?$/.test(raw) ? (isNaN(num(raw)) ? raw : num(raw)) : raw; if (!String(p.value).includes("待确认") && p.vs === "待评审") { /* 保留评审状态 */ } });
        if (mode === "edit") { base.params = params; base.note = w; base.trial = null; base.finOk = false; ADM.toast(`草稿 ${base.ver} 已保存，需重新校验与试算`); } else { it.versions.unshift(V2(nv, "草稿", params, base ? base.ver : null, w)); ADM.toast(`已创建草稿 ${nv}`); }
        done(); } });
  }
  const V2 = (ver, state, params, prev, note) => ({ ver, state, by: me(), at: NOW, eff: null, prev, params, approval: null, trial: null, finOk: false, note });
  const defaultParams = (it) => [{ key: "value", name: "配置值", value: "", unit: "", vs: "待评审", range: "" }];
  function rollbackModal(it, done) {
    const olds = it.versions.filter((v) => v.state === "已锁定").sort((a, b) => (a.ver < b.ver ? 1 : -1)).slice(1);
    ADM.modal({ title: `创建回退草稿 · ${it.name}`, wide: true, body: `<p>回退不是恢复旧字段：将以旧版本为来源生成新草稿，需重新校验、试算、审批、生效。</p><div class="form-row"><label for="rbV">目标旧版本</label><select class="select" id="rbV" style="width:100%">${olds.map((v) => `<option>${v.ver}</option>`).join("")}</select></div>${U.reasonRow("rW", "回退原因（必填）")}`, okText: "创建回退草稿", onOk: (m) => { const w = U.needReason(m, "rW"); if (!w) return false; const src = it.versions.find((v) => v.ver === m.querySelector("#rbV").value); it.versions.unshift(V2(nextVer(it), "草稿", src.params.map((p) => Object.assign({}, p)), src.ver, "回退：" + w)); ADM.toast("已创建回退草稿"); done(); } });
  }

  /* ---------- 版本详情 ---------- */
  function openVersion(it, v, done) {
    if (!v) { ADM.toast("该配置项尚无版本，请先新建草稿", "err"); return; }
    ADM.drawer.open({ title: `${it.name} · ${v.ver}`, get sub() { return `${st(v.state)} <span style="margin-left:8px">${it.code} · ${it.domain}</span>`; },
      tabs: [{ key: "p", label: "参数" }, { key: "d", label: "差异" }, { key: "v", label: "校验" }, { key: "t", label: "试算" }, { key: "a", label: "审批" }, { key: "h", label: "历史" }],
      body: (t) => body(it, v, t), foot: () => foot(it, v), bind: (d) => bindV(d, it, v, done) });
  }
  function body(it, v, t) {
    if (t === "p") return `<div class="table-wrap"><table class="dt"><thead><tr><th>设置项</th><th>字段键</th><th>值</th><th>值状态</th><th>参考范围</th></tr></thead><tbody>${v.params.map((p) => `<tr><td>${esc(p.name)}</td><td class="id">${p.key}</td><td>${esc(p.value)}${p.unit && typeof p.value === "number" ? " " + p.unit : ""}</td><td>${vstag(p.vs)}</td><td>${esc(p.range || "—")}</td></tr>`).join("")}</tbody></table></div><p style="color:var(--muted);font-size:12px;margin-top:8px">未签核数值只显示“待确认”并附参考范围，不冒充已批准配置。${v.state === "已锁定" ? "已锁定版本只允许查看、复制、创建回退草稿。" : ""}</p>${v.fail ? `<div class="callout bad" style="margin-top:12px">生效失败：${esc(v.fail)}。当前生效版本未改变。</div>` : ""}`;
    if (t === "d") { const base = cur(it) && cur(it) !== v ? cur(it) : v.prev ? it.versions.find((x) => x.ver === v.prev) : null; const rows = v.params.filter((p) => !base || String((base.params.find((y) => y.key === p.key) || {}).value) !== String(p.value)); return base ? `<p style="color:var(--muted)">对比 ${base.ver}（当前生效）→ ${v.ver}</p>${rows.length ? `<div class="table-wrap"><table class="dt"><thead><tr><th>设置项</th><th>旧值</th><th>新值</th></tr></thead><tbody>${rows.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc((base.params.find((y) => y.key === p.key) || { value: "—" }).value)}</td><td><b>${esc(p.value)}</b></td></tr>`).join("")}</tbody></table></div>` : "<p>与当前生效版本无差异。</p>"}` : "<p>首个版本，无可对比的生效版本。</p>"; }
    if (t === "v") { const L = validate(it, v); return `<ul style="list-style:none;margin:0;padding:0;line-height:30px">${L.map((x) => `<li>${x.ok ? tg("通过", "ok") : tg("失败", "bad")} ${esc(x.t)}</li>`).join("")}</ul>`; }
    if (t === "t") return v.trial ? kv([["涉及合作方", v.trial.partners], ["样本数", v.trial.samples], ["命中对象数", v.trial.objs], ["金额差异 (USD)", v.trial.diff], ["备注", esc(v.trial.note)], ["试算时间", v.trial.at]]) + (it.funds ? `<div class="callout ${v.finOk ? "info" : "warn"}" style="margin-top:12px">${v.finOk ? "财务已确认试算。" : "涉及资金影响：试算须财务确认后才能提交审批。"}</div>` : "") + '<p style="color:var(--muted);font-size:12px">试算只展示对在途且未锁定对象的影响，不改变正式账务。</p>' : '<div class="empty"><b>尚未试算</b>在底部点击“试算”。</div>';
    if (t === "a") { const ap = v.approval && ADM.approvals.find((a) => a.id === v.approval); return ap ? `<p>审批 ${ap.id}：${ADM.approvalStatus[ap.status].n}</p><ol class="timeline">${ap.records.map((r) => `<li class="done"><b>${esc(r.node)} · ${esc(r.decision)}</b><span>${esc(r.who)} · ${r.at}${r.self ? " · 自审" : ""}</span></li>`).join("")}${ap.status === "pending" ? ap.chain.slice(ap.step).map((c, i) => `<li><b>${esc(c.name)}</b><span>${i === 0 ? "待审批" : "未开始"}</span></li>`).join("") : ""}</ol>` : `<p>尚未提交审批。审批链：${it.chain.map((c) => esc(c.name)).join(" → ")}。${it.funds ? "资金类配置不允许自审。" : ""}</p>`; }
    return `<ol class="timeline">${it.versions.slice().sort((a, b) => (a.ver < b.ver ? 1 : -1)).map((x) => `<li class="${x.state === "已锁定" ? "done" : ""}"><b>${x.ver} · ${LABEL[x.state] || x.state}</b><span>${esc(ADM.userName(x.by))} · ${x.at}${x.eff ? " · 生效 " + x.eff : ""}${x.prev ? " · 来源 " + x.prev : ""}</span></li>`).join("")}</ol>`;
  }
  function foot(it, v) {
    const b = ['<button class="btn" id="fc">关闭</button>'], ed = canEdit(it) && ["草稿"].includes(v.state), adm = role() === "admin";
    if (ed) b.push('<button class="btn" id="vEdit">编辑草稿</button><button class="btn" id="vVal">校验</button><button class="btn" id="vTrial">试算</button>');
    if (v.state === "草稿" && it.funds && role() === "fin") b.push('<button class="btn" id="vFin">财务确认试算</button>');
    if (ed) b.push('<button class="btn primary" id="vSub">提交审批</button><button class="btn danger" id="vVoid">作废草稿</button>');
    if (v.state === "审批中" && v.by === me()) b.push('<button class="btn" id="vWd">撤回</button>');
    if (adm && v.state === "已审批") b.push('<button class="btn primary" id="vPub">发布 / 设置生效时间</button>');
    if (adm && v.state === "生效失败") b.push('<button class="btn primary" id="vRetry">重试发布</button>');
    if (v.state === "待生效" && adm) b.push('<button class="btn" id="vCancel">取消定时</button>');
    if (canEdit(it) && v.state === "已锁定" && !work(it)) b.push('<button class="btn" id="vCopy">复制为新草稿</button>');
    return b.join("");
  }
  function bindV(d, it, v, done) {
    const on = (i, f) => { const e = d.querySelector("#" + i); if (e) e.onclick = f; };
    const re = () => { done(); ADM.drawer.paint(); };
    on("fc", () => ADM.drawer.close());
    on("vEdit", () => editModal(it, v, "edit", re, v.ver));
    on("vVal", () => { ADM.drawer.tab = "v"; ADM.drawer.paint(); });
    on("vTrial", () => { trial(it, v); v.finOk = false; ADM.toast("试算完成（不改变正式账务）"); ADM.drawer.tab = "t"; re(); });
    on("vFin", () => { if (!v.trial) { ADM.toast("请先运行试算", "err"); return; } v.finOk = true; ADM.toast("财务已确认试算"); re(); });
    on("vSub", () => {
      const bad = validate(it, v).filter((x) => !x.ok);
      if (bad.length) { ADM.modal({ title: "无法提交审批", body: `<div class="callout bad">${bad.map((x) => esc(x.t)).join("<br>")}</div>`, hideOk: true, cancelText: "关闭" }); return; }
      if (!v.trial) { ADM.toast("请先运行试算", "err"); return; }
      if (it.funds && !v.finOk) { ADM.modal({ title: "无法提交审批", body: '<div class="callout warn">涉及资金影响的试算须财务确认后才能提交审批。</div>', hideOk: true, cancelText: "关闭" }); return; }
      const selfOk = !it.funds && it.selfOk && it.chain.length === 1 && it.chain[0].role === role();
      ADM.modal({ title: "提交审批", body: `<p>审批链：${it.chain.map((c) => esc(c.name)).join(" → ")}</p><p>试算：涉及合作方 ${v.trial.partners}，金额差异 ${v.trial.diff}。</p><div class="callout warn">${it.funds ? "资金类配置不允许自审，请等待其他审批人。" : selfOk ? "您具有该事项的审批权限，是否自动审核？选择后将同时记录提交与通过。" : "发起人不能审批自己的草稿；该类申请不允许自审，请等待其他审批人。"}</div>${selfOk ? '<label style="display:flex;gap:8px;line-height:24px"><input type="checkbox" id="selfRv"> 自动审核（写入提交与通过两条审计，self_review=true）</label>' : ""}`, okText: "提交审批", onOk: (mm) => {
        const auto = selfOk && mm.querySelector("#selfRv").checked;
        const cu = cur(it), diff = v.params.filter((p) => !cu || String((cu.params.find((y) => y.key === p.key) || {}).value) !== String(p.value)).map((p) => [p.name, cu ? (cu.params.find((y) => y.key === p.key) || { value: "—" }).value : "—", p.value]);
        const ap = ADM.newApproval({ type: "配置发布", obj: `业务配置 ${it.code} · ${v.ver}`, summary: `${it.name} ${v.ver}`, amt: "—", capital: it.funds, limitH: 24, chain: it.chain.map((c) => Object.assign({}, c)), reason: v.note || "配置变更", diff, impact: `涉及合作方 ${v.trial.partners}；金额差异 ${v.trial.diff}`, refs: [it.code] });
        ap.onApprove = () => { v.state = "已审批"; }; ap.onReject = () => { v.state = "草稿"; }; v.state = "审批中"; v.approval = ap.id;
        if (auto) {
          ap.selfReview = true; ap.records.push({ node: it.chain[0].name, who: ADM.user().name, role: ADM.role().name, decision: "通过", note: "自动审核", at: NOW, self: true });
          ap.status = "pending_exec"; ap.onApprove();
          ["提交", "审批通过"].forEach((x, i) => ADM.audits.unshift({ id: "AUD-" + (Math.max(...ADM.audits.map((x) => +String(x.id).replace(/\D/g, ""))) + 1), at: NOW, who: me(), role: ADM.role().name, action: x, obj: `业务配置 ${it.code} · ${v.ver}`, res: "成功", reason: "低敏配置，自动审核", self: true, trace: "tr-self" + i + Date.now().toString(16).slice(-4), before: i ? "待审批" : "草稿", after: i ? "已审批" : "待审批" }));
        }
        ADM.toast(auto ? `已提交并自动审核通过（${ap.id}），等待系统管理员发布` : `已提交审批（${ap.id}）`); ADM.refreshNav(); ADM.drawer.tab = "a"; re(); } });
    });
    on("vVoid", () => ADM.modal({ title: "作废草稿", danger: true, body: `<p>作废后不可恢复。</p>${U.reasonRow("vW", "原因（必填）")}`, okText: "确认作废", onOk: (m) => { const w = U.needReason(m, "vW"); if (!w) return false; v.state = "已作废"; v.note = "作废：" + w; ADM.audit("作废草稿", `业务配置 ${it.code} · ${v.ver}`, w, { before: "草稿", after: "已作废" }); ADM.toast("草稿已作废（版本记录保留）"); done(); ADM.drawer.close(); } }));
    on("vWd", () => ADM.modal({ title: "撤回审批", body: "<p>撤回后版本回到草稿。</p>", okText: "确认撤回", onOk: () => { const ap = ADM.approvals.find((a) => a.id === v.approval); if (ap && ap.status === "pending") ap.status = "withdrawn"; v.state = "草稿"; ADM.toast("已撤回"); ADM.refreshNav(); re(); } }));
    on("vPub", () => ADM.modal({ title: "发布 / 设置生效时间", body: `<div class="form-row"><label for="pM">生效方式</label><select class="select" id="pM" style="width:100%"><option value="now">立即生效</option><option value="at">定时生效</option></select></div><div class="form-row"><label for="pT">生效时间（定时必填，不得早于当前时间）</label><input class="field" type="datetime-local" id="pT" value="2026-11-25T00:00"></div>${U.reasonRow("pW", "发布原因（立即生效必填）")}<p style="font-size:12px;color:var(--muted)">影响范围：见试算。回滚方式：创建回退草稿并重新审批。发布失败不会改变当前生效版本。</p>`, okText: "确认发布", onOk: (m) => {
      const mode = m.querySelector("#pM").value, t = m.querySelector("#pT").value, w = m.querySelector("#pW").value.trim();
      if (mode === "now" && w.length < 5) { m.querySelector("#pWE").textContent = "立即生效须填写至少 5 个字的原因"; return false; }
      if (mode === "at" && (!t || t.replace("T", " ") <= NOW)) { ADM.toast("生效时间不得早于当前时间", "err"); return false; }
      if (mode === "now") { v.state = "已锁定"; v.eff = NOW; ADM.toast(`${v.ver} 已生效并锁定`); } else { v.state = "待生效"; v.eff = t.replace("T", " "); ADM.toast(`已设置定时生效：${v.eff}`); }
      ADM.audit("配置发布", `业务配置 ${it.code} · ${v.ver}`, mode === "now" ? w : "定时发布", { before: cur(it) ? cur(it).ver : "—", after: v.ver }); const apx = ADM.approvals.find((x) => x.id === v.approval); if (apx && apx.status === "pending_exec" && mode === "now") apx.status = "approved"; ADM.refreshNav(); re(); } }));
    on("vRetry", () => { v.retry = (v.retry || 0) + 1; if (v.retry < 2) { ADM.toast("重试失败：依赖仍不满足，当前生效版本未改变", "err"); } else { v.state = "已锁定"; v.eff = NOW; delete v.fail; ADM.toast("重试成功，已生效"); } re(); });
    on("vCancel", () => ADM.modal({ title: "取消定时生效", body: "<p>取消后版本回到“已审批，待发布”。</p>", okText: "确认取消", onOk: () => { v.state = "已审批"; v.eff = null; ADM.toast("已取消定时"); re(); } }));
    on("vCopy", () => { ADM.drawer.close(); editModal(it, v, "new", done); });
  }

  /* =============== 系统配置 =============== */
  const adminN = () => Object.values(ADM.users).filter((u) => u.role === "admin").length;
  function renderSystem(main) {
    U.head(main, "系统设置", "系统配置", "只修改不改变业务计算结果的技术运行参数；不进入业务版本。当前仅开放三项。", '<a class="btn" href="#/config-overview">← 返回业务配置</a><button class="btn" id="log">变更记录</button><button class="btn primary" id="pub">发布变更</button>');
    const paint = () => {
      const S = ADM.sysItems, n = S.filter((s) => s.pend != null).length;
      $("#pub").textContent = `发布变更（${n}）`; $("#pub").disabled = !n;
      $("#fx").innerHTML = `<div class="callout info" style="margin-bottom:16px">系统配置不进入业务版本，不参与复制、回退与定时生效。已生效的变更不可撤回，只能通过再次修改恢复。</div>${n ? `<div class="callout warn" style="margin-bottom:16px">有 ${n} 项待发布变更。<button class="btn sm" id="wd" style="margin-left:12px">撤回变更集</button></div>` : ""}<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:16px;align-items:start">${S.map((s, i) => `<div class="panel" style="margin:0"><div class="panel-head"><h2>${s.name}</h2>${s.sens ? tg("敏感", "warn") : tg("普通", "")}<span class="meta" style="margin-left:auto">${s.key}</span></div><div class="panel-body"><p style="margin:0 0 12px;color:var(--muted);font-size:13px">${s.desc}</p>
        <div style="display:flex;align-items:center;gap:8px"><input class="field" type="number" id="sv${i}" min="${s.min}" max="${s.max}" value="${s.pend != null ? s.pend : s.cur}" style="width:140px"><span>${s.unit}</span><span style="color:var(--muted);font-size:12px;margin-left:8px">范围 ${s.min}–${s.max}</span></div><div id="se${i}" style="color:var(--danger);font-size:12px;min-height:18px"></div>
        <dl class="kv kv-2" style="margin:8px 0"><div><dt>当前生效值</dt><dd>${s.cur} ${s.unit}</dd></div><div><dt>待发布值</dt><dd>${s.pend != null ? `<b>${s.pend} ${s.unit}</b>` : "—"}</dd></div></dl>
        <div style="display:flex;gap:8px"><button class="btn" data-save="${i}">保存到变更集</button><button class="btn ghost" data-reset="${i}">重置修改</button></div></div></div>`).join("")}</div>`;
      $$("[data-save]").forEach((b) => (b.onclick = () => { const i = +b.dataset.save, s = S[i], raw = $("#sv" + i).value.trim(), v = Number(raw); if (!/^\d+$/.test(raw) || v < s.min || v > s.max) { $("#se" + i).textContent = `请输入 ${s.min}–${s.max} 之间的整数（${s.unit}）`; return; } if (v === s.cur && s.pend == null) { $("#se" + i).textContent = "值未变化"; return; } s.pend = v === s.cur ? null : v; ADM.toast(`${s.name} 已保存到变更集（待发布）`); paint(); }));
      $$("[data-reset]").forEach((b) => (b.onclick = () => { const s = S[+b.dataset.reset]; s.pend = null; paint(); }));
      const wd = $("#wd"); if (wd) wd.onclick = () => ADM.modal({ title: "撤回变更集", body: `<p>仅未发布的变更可撤回。</p>${U.reasonRow("wW", "原因（必填）")}`, okText: "确认撤回", onOk: (m) => { if (!U.needReason(m, "wW")) return false; S.forEach((s) => (s.pend = null)); ADM.toast("变更集已撤回"); paint(); } });
    };
    paint();
    $("#log").onclick = () => ADM.drawer.open({ title: "变更记录", foot: () => '<button class="btn" id="fc">关闭</button>', bind: (d) => { d.querySelector("#fc").onclick = () => ADM.drawer.close(); }, body: () => `<ol class="timeline">${ADM.sysLog.map((l) => `<li class="done"><b>${l.key}</b><span>${l.at} · ${esc(ADM.userName(l.by))} · ${l.before} → ${l.after} · ${l.res}</span><span>原因：${esc(l.why)} · 确认链：${l.confirm} · ${l.trace}</span></li>`).join("")}</ol>` });
    $("#pub").onclick = () => {
      const S = ADM.sysItems.filter((s) => s.pend != null), sens = S.some((s) => s.sens), single = adminN() < 2;
      ADM.modal({ title: "发布变更", wide: true, body: `<div class="table-wrap"><table class="dt"><thead><tr><th>参数</th><th>当前值</th><th>待发布值</th></tr></thead><tbody>${S.map((s) => `<tr><td>${s.name}${s.sens ? " " + tg("敏感", "warn") : ""}</td><td>${s.cur} ${s.unit}</td><td><b>${s.pend} ${s.unit}</b></td></tr>`).join("")}</tbody></table></div>${U.reasonRow("pW", "变更原因（必填）")}${sens ? `<div class="callout warn" style="margin-top:12px">含敏感项：需要另一名系统管理员独立确认。${single ? '当前仅 1 名系统管理员，可启用自审（标记 self_review=true）。' : ""}</div>${single ? '<label style="display:flex;gap:8px;line-height:24px"><input type="checkbox" id="pS"> 启用自审并写入提交与通过两条审计</label>' : ""}` : ""}`, okText: "确认发布",
        onOk: (m) => { const w = U.needReason(m, "pW"); if (!w) return false; if (sens && single && !m.querySelector("#pS").checked) { ADM.toast("敏感项需独立确认；单管理员环境请勾选启用自审", "err"); return false; }
          S.forEach((s) => { ADM.sysLog.unshift({ at: NOW, key: s.key, before: `${s.cur} ${s.unit}`, after: `${s.pend} ${s.unit}`, by: me(), why: w, res: "已生效", trace: "tr-sys" + Date.now().toString(16).slice(-4), confirm: s.sens ? (single ? "自审（self_review=true）" : "待确认") : "—" }); ADM.audits.unshift({ id: "AUD-" + (Math.max(...ADM.audits.map((x) => +String(x.id).replace(/\D/g, ""))) + 1), at: NOW, who: me(), role: "系统管理员", action: "配置发布", obj: `系统配置 ${s.key}`, res: "成功", reason: w, self: !!(s.sens && single), trace: "tr-sys" + Date.now().toString(16).slice(-4), before: String(s.cur), after: String(s.pend) }); s.cur = s.pend; s.pend = null; });
          ADM.toast(`已发布 ${S.length} 项变更`); paint(); } });
    };
  }

  ADM.pages["config-overview"] = renderConfig;
  ADM.pages["system"] = renderSystem;
})();
