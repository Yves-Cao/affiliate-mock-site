/* 页面 19 活动与链接 / 20 素材库 / 21 回传与追踪 */
(function () {
  const ADM = window.ADM, esc = ADM.esc, $ = ADM.$, $$ = ADM.$$, U = ADM.ui;
  const NOW = "2026-11-19 10:30";
  const role = () => ADM.role().key, kv = U.kv;
  const TONE = { 活跃: "ok", 已归档: "", 生效: "ok", 已暂停: "warn", 已过期: "", 未知: "warn", 启用: "ok", 自停用: "", 平台限制: "bad", 待生效: "info", 停用: "warn", 过期: "", 归档: "", 成功: "ok", 失败: "bad", 超时: "warn", 重试中: "info", 待发送: "info", 重复已忽略: "", 测试中: "info", 暂停: "warn", 草稿: "", 有效: "ok", 风险拒绝: "bad", 判定中: "info" };
  const tg = (s) => `<span class="tag ${TONE[s] || ""}">${esc(s)}</span>`;
  const n = (v) => (v == null ? '<span style="color:var(--muted)">—</span>' : Number(v).toLocaleString("en-US"));
  const pn = (id) => { const p = ADM.partners.find((x) => x.id === id); return `${esc(p ? p.name : id)}<span class="sub">${id}</span>`; };
  const closeFoot = () => '<button class="btn" id="fc">关闭</button>';
  const closeBind = (d) => { const b = d.querySelector("#fc"); if (b) b.onclick = () => ADM.drawer.close(); };

  /* =============== 19 活动与链接 =============== */
  const CV = { view: "cmp", cmp: {}, lnk: {}, sub: {} };
  function renderCampaign(main, route) {
    if (["cmp", "lnk", "sub"].includes(route.query.view)) CV.view = route.query.view;
    const ops = role() === "ops";
    U.head(main, "推广", "活动与链接", ops ? "查看合作方活动、官方链接与 Sub ID 的状态和效果，并可发起链接暂停 / 恢复。官方链接由 CRM 生成，本页不创建、不编辑。" : "只读。任何角色都看不到风险阈值、内部评分与权重。");
    $("#fx").innerHTML = `<div id="cs"></div><div class="seg" style="margin-bottom:12px">${[["cmp", "活动"], ["lnk", "官方链接"], ["sub", "Sub ID"]].map((v) => `<button data-v="${v[0]}" aria-pressed="${CV.view === v[0]}">${v[1]}</button>`).join("")}</div><div id="cl"></div>`;
    const mount = () => {
      $$("[data-v]", main).forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === CV.view));
      const C = ADM.campaigns, L = ADM.links, S = ADM.subids, sum = (a, k) => (a.some((x) => x[k] == null) ? null : a.reduce((s, x) => s + x[k], 0));
      $("#cs").innerHTML = CV.view === "cmp" ? U.strip([["活跃活动", C.filter((c) => c.state === "活跃").length, "", 0], ["已归档", C.filter((c) => c.state === "已归档").length, "", 0], ["近 30 日点击", n(sum(C, "clicks")).replace(/<[^>]+>/g, ""), "同一指标版本", 0], ["近 30 日有效转化", sum(C, "qc") == null ? "—" : sum(C, "qc"), "缺数据显示“—”，不按 0", 0]])
        : CV.view === "lnk" ? U.strip([["生效链接", L.filter((x) => x.state === "生效").length, "", 0], ["已暂停", L.filter((x) => x.state === "已暂停").length, "", 0], ["已过期 / 退役", L.filter((x) => x.state === "已过期").length, "", 0], ["近 30 日点击", n(sum(L, "clicks")).replace(/<[^>]+>/g, ""), "", 0]])
        : U.strip([["启用", S.filter((x) => x.state === "启用").length, "", 0], ["自停用", S.filter((x) => x.state === "自停用").length, "", 0], ["平台限制", S.filter((x) => x.state === "平台限制").length, "合作方不可自行解除", 0], ["总数", S.length, "不随筛选缩减", 0]]);
      const box = $("#cl");
      if (CV.view === "cmp") U.list(box, { S: CV.cmp, empty: "暂无活动", kwHint: "活动名称、编号、合作方", minW: 1250, foot: "合作方活动分组，不是官方活动资产", rows: () => ADM.campaigns, kw: (c) => c.id + c.name + c.partner, filters: [["state", "状态", [["活跃", "活跃"], ["已归档", "已归档"]]]], match: (c, k, v) => c[k] === v,
        cols: [["活动", (c) => `<b>${esc(c.name)}</b><span class="sub">${c.id}</span>`], ["合作方", (c) => pn(c.partner)], ["状态", (c) => tg(c.state)], ["链接 / Sub ID", (c) => `${c.links} / ${c.subs}`, "num"], ["点击", (c) => n(c.clicks), "num"], ["注册", (c) => n(c.reg), "num"], ["首次入金", (c) => n(c.ftd), "num"], ["有效转化", (c) => n(c.qc), "num"], ["国家分布", (c) => c.countries], ["更新", (c) => c.upd]], actions: (c) => U.act("v", c.id, "查看"), onAct: (a, id) => { const c = ADM.campaigns.find((x) => x.id === id); ADM.drawer.open({ title: `${c.name}（${c.id}）`, sub: tg(c.state), foot: closeFoot, bind: closeBind, body: () => kv([["合作方", pn(c.partner)], ["链接数 / Sub ID 数", `${c.links} / ${c.subs}`], ["近 30 日点击", n(c.clicks)], ["近 30 日注册", n(c.reg)], ["首次入金", n(c.ftd)], ["有效转化", n(c.qc)]]) + '<div class="callout info" style="margin-top:12px">归档会阻断关联活动及其二级链接的新访问；归档 / 恢复不重算历史点击、归属与佣金。合作方自管，本页不提供归档 / 恢复。</div>' }); } });
      else if (CV.view === "lnk") U.list(box, { S: CV.lnk, empty: "暂无官方链接", kwHint: "链接号、合作方、Sub ID", minW: 1350, rows: () => ADM.links, kw: (l) => l.id + l.partner + l.sub, filters: [["state", "状态", ["生效", "已暂停", "已过期", "未知"].map((x) => [x, x])]], match: (l, k, v) => l[k] === v,
        cols: [["链接号", (l) => `<span class="id">${l.id}</span>`], ["合作方 / 活动", (l) => `${pn(l.partner)}<span class="sub">${l.campaign} · ${l.sub}</span>`], ["官方资产 / 路径", (l) => esc(l.path)], ["国家 / 语言 / 系统", (l) => esc(l.loc)], ["状态", (l) => tg(l.state) + (l.reason ? `<span class="sub">${l.reason}</span>` : "")], ["点击", (l) => n(l.clicks), "num"], ["有效点击", (l) => n(l.valid), "num"], ["生成时间", (l) => l.at]],
        actions: (l) => U.act("v", l.id, "查看") + (ops && l.state === "生效" ? U.act("p", l.id, "暂停") : ops && l.state === "已暂停" && l.reason !== "合作方状态联动" ? U.act("r", l.id, "恢复") : ""), onAct: (a, id, rp) => linkAct(a, id, rp) });
      else U.list(box, { S: CV.sub, empty: "暂无 Sub ID", kwHint: "Sub ID、合作方", minW: 1100, foot: "Sub ID 不产生下级合作身份或分润", rows: () => ADM.subids, kw: (s) => s.id + s.partner, filters: [["state", "状态", ["启用", "自停用", "平台限制"].map((x) => [x, x])]], match: (s, k, v) => s[k] === v,
        cols: [["Sub ID", (s) => `<span class="id">${s.id}</span>`], ["合作方 / 活动", (s) => `${pn(s.partner)}<span class="sub">${s.campaign}</span>`], ["状态", (s) => tg(s.state)], ["点击", (s) => n(s.clicks), "num"], ["注册", (s) => n(s.reg), "num"], ["首次入金", (s) => n(s.ftd), "num"], ["有效转化", (s) => n(s.qc), "num"], ["创建时间", (s) => s.at]], actions: (s) => U.act("v", s.id, "查看"), onAct: (a, id) => { const s = ADM.subids.find((x) => x.id === id); ADM.drawer.open({ title: s.id, sub: tg(s.state), foot: closeFoot, bind: closeBind, body: () => kv([["合作方", pn(s.partner)], ["活动", s.campaign], ["点击 / 注册", `${n(s.clicks)} / ${n(s.reg)}`], ["首次入金 / 有效转化", `${n(s.ftd)} / ${n(s.qc)}`]]) + (s.state === "平台限制" ? '<div class="callout warn" style="margin-top:12px">平台限制合作方不可自行解除；解除不在本页（风控 / 业务配置流程）。</div>' : "") }); } });
    };
    mount();
    $$("[data-v]", main).forEach((b) => (b.onclick = () => { CV.view = b.dataset.v; mount(); }));
  }
  function linkAct(a, id, rp) {
    const l = ADM.links.find((x) => x.id === id);
    if (a === "v") return ADM.drawer.open({ title: l.id, sub: tg(l.state), tabs: [{ key: "a", label: "概览" }, { key: "b", label: "生成快照" }], foot: closeFoot, bind: closeBind,
      body: (t) => t === "a" ? kv([["合作方", pn(l.partner)], ["活动 / Sub ID", `${l.campaign} / ${l.sub}`], ["状态", tg(l.state) + (l.reason ? ` ${l.reason}` : "")], ["点击 / 有效点击", `${n(l.clicks)} / ${n(l.valid)}`], ["生成时间", l.at]]) + '<div class="callout info" style="margin-top:12px">有效点击 = 通过路径、参数和风险门禁的点击，缺判定不算有效。风险拒绝只显示“命中风险规则”，不显示规则与阈值。</div>' : kv([["官方路径", esc(l.path)], ["选项快照", esc(l.loc)], ["必填参数", "合作方 ID、Sub ID、点击 ID"], ["路径 / 资产 / 选项版本", "v5 / v3 / v2（待确认）"]]) });
    const pause = a === "p";
    ADM.modal({ title: pause ? "暂停链接" : "恢复链接", danger: pause, body: `<p>${pause ? "暂停后该链接停止接受新点击；历史点击、归属与佣金不重算。" : "恢复前会检查合作方状态与官方路径。"}</p>${U.reasonRow("lkW", "原因（必填）")}`, okText: pause ? "确认暂停" : "确认恢复", onOk: (m) => { if (!U.needReason(m, "lkW")) return false; l.state = pause ? "已暂停" : "生效"; l.reason = pause ? "运营暂停" : undefined; ADM.toast(pause ? "已提交暂停，链接状态已更新" : "已恢复链接"); rp(); } });
  }

  /* =============== 20 素材库 =============== */
  const MS = { f: { state: "", type: "" }, q: "", grid: false, sel: new Set(), page: 1 };
  function renderMaterial(main) {
    const w = ADM.canWrite("material-list");
    U.head(main, "推广", "素材库", w ? "维护官方推广素材。上传后默认启用，无审核与发布审批；替换文件会新建版本，已使用的素材不能物理删除。" : "只读。", w ? '<button class="btn primary" id="upl">上传素材</button>' : "");
    const paint = () => {
      const all = ADM.materials;
      const stat = [["启用素材", all.filter((m) => m.state === "启用").length, "启用"], ["待生效", all.filter((m) => m.state === "待生效").length, "待生效"], ["近 30 日新增版本", all.filter((m) => m.vers.some((v) => v[1] >= "2026-10-20")).length, ""], ["已停用 / 归档", all.filter((m) => ["停用", "归档"].includes(m.state)).length, "停用"]];
      let r = all.filter((m) => (!MS.f.state || m.state === MS.f.state) && (!MS.f.type || m.type === MS.f.type));
      const q = MS.q.trim().toLowerCase(); if (q) r = r.filter((m) => (m.id + m.name).toLowerCase().includes(q));
      const size = 20, total = r.length; const view = r.slice((MS.page - 1) * size, MS.page * size);
      const thumb = (m) => `<span style="display:inline-grid;place-items:center;width:32px;height:32px;border-radius:6px;background:var(--surface-muted-1-0);color:var(--muted);font-size:11px">${{ 横幅: "图", 视频: "视", GIF: "GIF", 落地页: "页" }[m.type]}</span>`;
      const acts = (m) => `<button class="link" data-a="v" data-id="${m.id}">查看</button>` + (w ? (m.state === "启用" ? `<button class="link" data-a="stop" data-id="${m.id}">停用</button>` : ["停用", "过期"].includes(m.state) ? `<button class="link" data-a="res" data-id="${m.id}">恢复</button>` : "") + (["启用", "停用", "过期"].includes(m.state) ? (m.used > 0 ? '<span class="sub" style="display:inline" title="请先停用或处理引用">不可归档</span>' : `<button class="link" data-a="arc" data-id="${m.id}">归档</button>`) : "") : "");
      $("#fx").innerHTML = `<div class="stats">${stat.map((s) => `<button class="stat" data-st="${s[2]}" ${s[2] ? "" : "disabled"} aria-pressed="${s[2] && MS.f.state === s[2]}"><div class="name">${s[0]}</div><div class="val num">${s[1]}</div></button>`).join("")}</div>
        <div class="filters"><input class="field search" id="mq" placeholder="素材名称或编号" value="${esc(MS.q)}" aria-label="关键词"><select class="select" id="mt" aria-label="类型"><option value="">全部类型</option>${["横幅", "视频", "GIF", "落地页"].map((x) => `<option ${MS.f.type === x ? "selected" : ""}>${x}</option>`).join("")}</select><select class="select" id="ms" aria-label="状态"><option value="">全部状态</option>${["启用", "待生效", "停用", "过期", "归档"].map((x) => `<option ${MS.f.state === x ? "selected" : ""}>${x}</option>`).join("")}</select><div class="seg" style="margin-left:auto"><button data-g="0" aria-pressed="${!MS.grid}">表格</button><button data-g="1" aria-pressed="${MS.grid}">网格</button></div></div>
        ${MS.grid ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px">${view.map((m) => `<div class="panel"><div style="aspect-ratio:16/9;background:var(--surface-muted-1-0);display:grid;place-items:center;color:var(--muted);border-radius:12px 12px 0 0">${m.type}</div><div class="panel-body" style="padding:12px"><b>${esc(m.name)}</b><div style="margin:6px 0">${tg(m.state)} <span class="tag plain">v${m.ver}</span></div><div class="sub" style="font-size:12px;color:var(--muted)">${esc(m.scope)} · ${m.upd}</div><div class="rowact" style="margin-top:8px">${acts(m)}</div></div></div>`).join("")}</div>`
          : `<div class="table-wrap"><table class="dt" style="min-width:1250px"><thead><tr><th class="fixl"></th><th>素材</th><th>类型</th><th>当前版本</th><th>适用范围</th><th>官方落地页</th><th>状态</th><th class="num">使用中</th><th>更新时间</th><th class="fixr">操作</th></tr></thead><tbody>${view.length ? view.map((m) => `<tr><td class="fixl">${thumb(m)}</td><td><b>${esc(m.name)}</b><span class="sub">${m.id}</span></td><td>${m.type}</td><td><button class="link" data-a="v" data-id="${m.id}">v${m.ver}</button></td><td>${esc(m.scope)}</td><td>${esc(m.path)}</td><td>${tg(m.state)}</td><td class="num">${m.used}</td><td>${m.upd}</td><td class="fixr"><div class="rowact">${acts(m)}</div></td></tr>`).join("") : '<tr><td colspan="10"><div class="empty"><b>没有符合条件的素材</b>' + (w ? '<button class="btn" data-a="up">上传素材</button>' : "") + "</div></td></tr>"}</tbody></table></div>`}
        <div class="tfoot"><span>共 ${total} 条 · 不提供物理删除；素材状态变更不自动通知合作方</span></div>`;
    };
    paint();
    const fx = $("#fx");
    fx.onchange = (e) => { if (e.target.id === "mt") MS.f.type = e.target.value; if (e.target.id === "ms") MS.f.state = e.target.value; paint(); };
    fx.onkeydown = (e) => { if (e.key === "Enter" && e.target.id === "mq") { MS.q = e.target.value; paint(); $("#mq").focus(); } };
    fx.onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
      if (d.g) { MS.grid = d.g === "1"; paint(); } else if (d.st) { MS.f.state = MS.f.state === d.st ? "" : d.st; paint(); }
      else if (d.a === "up") upload(paint);
      else if (d.a) matAct(d.a, d.id, paint);
    };
    const u = $("#upl"); if (u) u.onclick = () => upload(paint);
  }
  function upload(rp) {
    ADM.modal({ title: "上传素材", wide: true, body: `<div class="form-row"><label for="uT">类型</label><select class="select" id="uT" style="width:100%"><option>横幅</option><option>视频</option><option>GIF</option><option>落地页</option></select></div><div class="form-row"><label for="uN">名称（必填）</label><input class="field" id="uN" style="width:100%"><div id="uNE" style="color:var(--danger);font-size:12px"></div></div><div class="form-row"><label for="uS">适用范围</label><input class="field" id="uS" style="width:100%" placeholder="国家 / 语言 / 设备，留空表示不限"></div><div class="form-row"><label for="uF">文件</label><input type="file" id="uF"><div id="uFE" style="color:var(--danger);font-size:12px"></div></div><p style="font-size:12px;color:var(--muted)">文件类型、大小、尺寸、时长限制以服务端返回为准（演示中不写死数值）。保存后默认启用，不产生审核任务。落地页类型只能引用官方路径，不上传正文。</p>`, okText: "保存", onOk: (m) => {
      const nm = m.querySelector("#uN").value.trim(), t = m.querySelector("#uT").value, f = m.querySelector("#uF").files.length;
      m.querySelector("#uNE").textContent = nm ? "" : "请填写素材名称"; m.querySelector("#uFE").textContent = f || t === "落地页" ? "" : "请选择文件";
      if (!nm || (!f && t !== "落地页")) return false;
      const id = "MT-" + (1009 + ADM.materials.length - 8); ADM.materials.unshift({ id, name: nm, type: t, ver: 1, scope: m.querySelector("#uS").value.trim() || "不限", path: "—", state: "启用", used: 0, upd: NOW.slice(0, 10), vers: [["v1", NOW.slice(0, 10), "首次上传"]], audit: [] });
      ADM.toast(`素材已上传并启用（${id}）`); rp();
    } });
  }
  function matAct(a, id, rp) {
    const m = ADM.materials.find((x) => x.id === id);
    if (a === "v") return ADM.drawer.open({ title: `${m.name}（${m.id}）`, sub: tg(m.state), tabs: [{ key: "a", label: "概览" }, { key: "b", label: "版本历史" }, { key: "c", label: "操作审计" }], foot: () => closeFoot() + (ADM.canWrite("material-list") ? '<button class="btn" id="rep">替换文件（新建版本）</button>' : ""), bind: (d) => { closeBind(d); const r = d.querySelector("#rep"); if (r) r.onclick = () => ADM.modal({ title: "替换文件", body: `<p>将新建 v${m.ver + 1}，旧版本进入历史，当前指针切换到新版本；影响引用 ${m.used} 个。</p><input type="file" id="rf"><div id="rfE" style="color:var(--danger);font-size:12px"></div>`, okText: "替换", onOk: (mm) => { if (!mm.querySelector("#rf").files.length) { mm.querySelector("#rfE").textContent = "请选择文件"; return false; } m.ver++; m.vers.unshift([`v${m.ver}`, NOW.slice(0, 10), "替换文件"]); m.upd = NOW.slice(0, 10); ADM.toast(`已新建 v${m.ver}`); ADM.drawer.paint(); rp(); } }); },
      body: (t) => t === "a" ? kv([["类型", m.type], ["当前版本", "v" + m.ver], ["适用范围", esc(m.scope)], ["官方落地页", esc(m.path)], ["使用中", m.used + " 个对象"], ["更新时间", m.upd]]) : t === "b" ? `<ol class="timeline">${m.vers.map((v) => `<li class="done"><b>${v[0]}</b><span>${v[1]} · ${esc(v[2])}</span></li>`).join("")}</ol>` : `<ol class="timeline">${(m.audit || []).map((x) => `<li class="done"><b>${esc(x[0])}</b><span>${x[1]} · ${esc(x[2])}</span></li>`).join("") || "<li><b>暂无状态变更记录</b><span></span></li>"}</ol>` });
    const L = { stop: ["停用", "停用后新引用不再匹配，历史引用保留。", "停用"], res: ["恢复", "恢复须通过当前适用范围校验。", "启用"], arc: ["归档", "仅无当前使用引用时可归档。", "归档"] }[a];
    ADM.modal({ title: L[0] + "素材", danger: a !== "res", body: `<p>${L[1]}</p>${U.reasonRow("mW", "原因（必填）")}`, okText: "确认" + L[0], onOk: (mm) => { const w = U.needReason(mm, "mW"); if (!w) return false; (m.audit = m.audit || []).unshift([`${m.state} → ${L[2]}`, NOW, `${ADM.user().name}：${w}（影响引用 ${m.used}）`]); m.state = L[2]; m.upd = NOW.slice(0, 10); ADM.toast(`素材已${L[0]}`); rp(); } });
  }

  /* =============== 21 回传与追踪 =============== */
  const PV = { view: "dlv", dlv: {}, cfg: {}, clk: {} };
  function renderPostback(main, route) {
    if (["dlv", "cfg", "clk"].includes(route.query.view)) PV.view = route.query.view;
    const ops = role() === "ops", adm = role() === "admin";
    U.head(main, "推广", "回传与追踪", "回传配置由合作方自管，本页只读配置、处理投递异常。任何角色都看不到签名、密钥、风险阈值或内部评分。");
    $("#fx").innerHTML = `<div id="ps"></div><div class="seg" style="margin-bottom:12px">${[["dlv", "投递记录"], ["cfg", "回传配置"], ["clk", "点击与会话"]].map((v) => `<button data-v="${v[0]}" aria-pressed="${PV.view === v[0]}">${v[1]}</button>`).join("")}</div><div id="pl"></div>`;
    const mount = () => {
      $$("[data-v]", main).forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === PV.view));
      const D = ADM.deliveries, C = ADM.pbConfigs, K = ADM.clicks;
      $("#ps").innerHTML = PV.view === "dlv" ? U.strip([["总投递", D.filter((x) => x.state !== "重复已忽略").length, "不含重复忽略", 1], ["成功", D.filter((x) => x.state === "成功").length, "仅权威回执", 1], ["失败 / 超时", D.filter((x) => ["失败", "超时"].includes(x.state)).length, "", 1], ["重试中 / 未知", D.filter((x) => ["重试中", "未知"].includes(x.state)).length, "未知既不算成功也不算失败", 1]])
        : PV.view === "cfg" ? U.strip([["配置总数", C.length, "", 0], ["启用", C.filter((x) => x.state === "启用").length, "", 0], ["暂停", C.filter((x) => x.state === "暂停").length, "", 0], ["近 30 日成功率", "—", "缺数据不按 0", 0]])
        : U.strip([["原始点击", K.length, "", 0], ["有效点击", K.filter((x) => x.valid === "有效").length, "缺判定不算有效", 0], ["风险拒绝", K.filter((x) => x.valid === "风险拒绝").length, "只显示类别", 0], ["判定中 / 未知", K.filter((x) => ["判定中", "未知"].includes(x.valid)).length, "", 0]]);
      $$("#ps [data-stat]").forEach((b) => (b.onclick = () => { if (PV.view !== "dlv") return; const i = +b.dataset.stat; PV.dlv = { f: i === 0 ? {} : i === 1 ? { state: "成功" } : i === 2 ? { state: "失败" } : { state: "重试中" }, q: "", page: 1 }; mount(); }));
      const box = $("#pl");
      if (PV.view === "dlv") U.list(box, { S: PV.dlv, empty: "暂无投递记录", kwHint: "投递号、合作方", minW: 1350, rows: () => D, kw: (x) => x.id + x.partner, filters: [["state", "状态", ["待发送", "成功", "失败", "超时", "未知", "重试中", "重复已忽略"].map((x) => [x, x])], ["ev", "事件类型", ["注册", "首次入金", "有效转化"].map((x) => [x, x])]], match: (x, k, v) => x[k] === v,
        cols: [["投递号", (x) => `<button class="link" data-act="v" data-id="${x.id}">${x.id}</button>`], ["合作方", (x) => pn(x.partner)], ["事件类型", (x) => x.ev], ["目标", (x) => (role() === "risk" ? '<span style="color:var(--muted)">无权查看</span>' : x.target)], ["状态", (x) => tg(x.state)], ["尝试 / 下次重试", (x) => `${x.tries}<span class="sub">${x.next}</span>`], ["最后错误", (x) => x.err], ["更新时间", (x) => x.upd]],
        actions: (x) => U.act("v", x.id, "查看") + (ops && ["失败", "超时", "未知"].includes(x.state) ? U.act("rt", x.id, "重试") + (x.task ? "" : U.act("tk", x.id, "生成任务")) : ""), onAct: (a, id, rp) => dlvAct(a, id, rp) });
      else if (PV.view === "cfg") U.list(box, { S: PV.cfg, empty: "暂无回传配置", kwHint: "配置名称、合作方", minW: 1200, foot: "配置变更请到合作方端完成，本页不提供编辑", rows: () => C, kw: (x) => x.id + x.name + x.partner, filters: [["state", "状态", ["草稿", "测试中", "启用", "暂停"].map((x) => [x, x])]], match: (x, k, v) => x[k] === v,
        cols: [["配置", (x) => `<b>${esc(x.name)}</b><span class="sub">${x.id}</span>`], ["合作方 / 平台", (x) => `${pn(x.partner)}<span class="sub">${x.platform}</span>`], ["回传事件", (x) => x.events], ["状态", (x) => tg(x.state)], ["近 30 日成功率", (x) => (x.rate == null ? "—" : x.rate), "num"], ["最近试投", (x) => esc(x.test)], ["密钥状态", (x) => x.secret], ["更新", (x) => x.upd]],
        actions: (x) => U.act("v", x.id, "查看") + (ops && x.state === "启用" ? U.act("p", x.id, "暂停") : ops && x.state === "暂停" ? U.act("r", x.id, "恢复") : ""), onAct: (a, id, rp) => cfgAct(a, id, rp) });
      else U.list(box, { S: PV.clk, empty: "暂无点击", kwHint: "点击号、会话、链接", minW: 1050, rows: () => K, kw: (x) => x.id + x.sess + x.link, filters: [["valid", "有效性", ["有效", "风险拒绝", "判定中", "未知"].map((x) => [x, x])]], match: (x, k, v) => x[k] === v,
        cols: [["点击", (x) => `<span class="id">${x.id}</span><span class="sub">${x.sess}</span>`], ["合作方", (x) => pn(x.partner)], ["链接 / Sub ID", (x) => `${x.link}<span class="sub">${x.sub}</span>`], ["时间", (x) => x.at], ["国家 / 设备", (x) => (role() === "fin" ? "—" : `${x.country} / ${x.device}`)], ["有效性", (x) => tg(x.valid)]], actions: (x) => U.act("v", x.id, "查看"), onAct: (a, id) => { const x = ADM.clicks.find((y) => y.id === id); ADM.drawer.open({ title: x.id, sub: tg(x.valid), foot: closeFoot, bind: closeBind, body: () => kv([["会话", x.sess], ["合作方", pn(x.partner)], ["链接 / Sub ID", `${x.link} / ${x.sub}`], ["时间", x.at], ["有效性", tg(x.valid)]]) + (x.valid === "风险拒绝" ? '<div class="callout info" style="margin-top:12px">命中风险规则；不显示规则与阈值。</div>' : "") + '<p style="color:var(--muted);font-size:12px;margin-top:12px">IP、设备等受限证据需额外授权，本演示不展示。</p>' }); } });
    };
    mount();
    $$("[data-v]", main).forEach((b) => (b.onclick = () => { PV.view = b.dataset.v; mount(); }));
  }
  function dlvAct(a, id, rp) {
    const x = ADM.deliveries.find((y) => y.id === id), adm = role() === "admin";
    if (a === "v") return ADM.drawer.open({ title: x.id, sub: tg(x.state), tabs: [{ key: "a", label: "概览" }, { key: "b", label: "请求与响应" }, { key: "c", label: "重试时间线" }], foot: closeFoot, bind: closeBind,
      body: (t) => t === "a" ? kv([["合作方", pn(x.partner)], ["事件类型", x.ev], ["目标", role() === "risk" ? "无权查看" : x.target], ["尝试次数", x.tries], ["最后错误", x.err], ["关联任务", x.task ? `<a href="#/tasks?task_id=${x.task}">${x.task}</a>` : "—"]]) + '<div class="callout info" style="margin-top:12px">发出 HTTP 请求不算成功，只有权威回执才算。重试复用原 delivery_id，不会产生第二次业务副作用。</div>' : t === "b" ? (adm ? kv([["请求摘要", "hash 7f3a…c21（安全摘录）"], ["响应摘要", x.err === "目标拒绝" ? "HTTP 4xx（内容已脱敏）" : "超时，无响应"], ["配置版本", "cfg-v6"], ["TraceId", "tr-" + x.id.slice(-5) + "ab"]]) : '<div class="callout info">响应详情仅系统管理员可见；任何角色都看不到签名与密钥。</div>') : `<ol class="timeline">${x.tl.map((t) => `<li class="done"><b>${esc(t[1])}</b><span>${t[0]} · 第 ${t[2]} 次</span></li>`).join("") || "<li><b>暂无重试</b><span></span></li>"}</ol>` });
    if (a === "rt") return ADM.modal({ title: "重试投递", body: x.state === "失败" ? "<p>复用原 delivery_id 与 outbound_event_id（幂等），已成功项不会重发。</p>" : `<div class="callout warn">当前为“${x.state}”：不会直接重发，先查询原请求结果；只有确认未成功时才重试。</div>`, okText: x.state === "失败" ? "确认重试" : "先查询结果", onOk: () => { if (x.state === "失败") { x.state = "重试中"; x.tries++; x.upd = NOW; x.tl.unshift([NOW.slice(11), "已登记重试", x.tries]); ADM.toast("已登记重试"); } else { x.state = "成功"; x.err = "—"; x.upd = NOW; ADM.toast("查询结果：原请求已成功，未重发"); } rp(); } });
    if (a === "tk") { const t = ADM.makeTask({ type: "integration", obj: x.partner, ref: x.id, title: `回传连续失败：${x.id}`, team: "平台运维组" }); x.task = t.id; rp(); }
  }
  function cfgAct(a, id, rp) {
    const x = ADM.pbConfigs.find((y) => y.id === id);
    if (a === "v") return ADM.drawer.open({ title: `${x.name}（${x.id}）`, sub: tg(x.state), foot: closeFoot, bind: closeBind, body: () => kv([["合作方", pn(x.partner)], ["平台", x.platform], ["回传事件", x.events], ["密钥状态", x.secret + "（不显示值）"], ["最近试投", esc(x.test)]]) + '<div class="callout info" style="margin-top:12px">回传模板不可改协议和主机，只能引用白名单变量；变更配置请到合作方端完成。</div>' });
    const p = a === "p";
    ADM.modal({ title: p ? "暂停回传" : "恢复回传", danger: p, body: `<p>${p ? "暂停只影响该目标的后续投递。" : "恢复后继续投递，已有失败不自动补发。"}</p>${U.reasonRow("pW", "原因（必填）")}`, okText: p ? "确认暂停" : "确认恢复", onOk: (m) => { if (!U.needReason(m, "pW")) return false; x.state = p ? "暂停" : "启用"; ADM.toast(p ? "已暂停" : "已恢复"); rp(); } });
  }

  ADM.pages["campaign-list"] = renderCampaign;
  ADM.pages["material-list"] = renderMaterial;
  ADM.pages["postback"] = renderPostback;
})();
