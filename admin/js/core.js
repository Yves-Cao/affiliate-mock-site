/* 管理端 1.0 —— 核心：状态、图标、路由、外壳、提示/抽屉/弹窗、通用表格工具 */
(function () {
  const ADM = window.ADM;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  ADM.$ = $; ADM.$$ = $$; ADM.esc = esc;

  /* ---------- 图标（16/18px 线性）---------- */
  const P = {
    home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
    users: "M16 11a3 3 0 100-6 3 3 0 000 6zM8 11a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5M22 20c0-3-3-5-6-5M8 15c3 0 6 2 6 5",
    user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6",
    link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3A4 4 0 0011 18.7l1-1",
    flag: "M5 21V4M5 4h11l-2 4 2 4H5",
    image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5a1 1 0 100-.01",
    radar: "M12 12m-9 0a9 9 0 1018 0 9 9 0 10-18 0M12 12l6-6M12 12m-4 0a4 4 0 108 0",
    coins: "M12 6m-7 0a7 3 0 1014 0 7 3 0 10-14 0M5 6v6c0 1.7 3 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3 3 7 3s7-1.3 7-3v-6",
    wallet: "M3 7h16a2 2 0 012 2v10H5a2 2 0 01-2-2zM3 7l12-3v3M16 14h3",
    alert: "M12 3l10 18H2zM12 10v5M12 18v.01",
    shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
    gavel: "M14 4l6 6M8 10l6 6M4 20l7-7M12 6l6 6",
    tasks: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
    check: "M5 12l5 5 9-10M3 3h18v18H3z",
    chat: "M4 5h16v11H9l-5 4z",
    download: "M12 4v11M7 11l5 5 5-5M4 20h16",
    bell: "M6 16V11a6 6 0 1112 0v5l2 2H4zM10 21h4",
    plug: "M9 3v5M15 3v5M6 8h12v4a6 6 0 01-12 0zM12 18v3",
    chart: "M4 20V4M4 20h16M8 16v-5M13 16V8M18 16v-3",
    chart2: "M4 20h16M6 20V10M11 20V5M16 20v-8M21 20V8",
    key: "M14 10a4 4 0 11-4 4l-7 7v-3h3v-3h3l1-1",
    doc: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7",
    sliders: "M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
    gear: "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-2-4-2 1a7 7 0 00-2-1l-.5-2h-4L9.5 7a7 7 0 00-2 1l-2-1-2 4 2 1a7 7 0 000 2l-2 1 2 4 2-1a7 7 0 002 1l.5 2h4l.5-2a7 7 0 002-1l2 1 2-4-2-1",
    search: "M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5",
    chev: "M6 9l6 6 6-6",
    menu: "M4 6h16M4 12h16M4 18h16",
    refresh: "M20 11a8 8 0 10-2 6M20 4v7h-7",
    filter: "M4 5h16l-6 8v6l-4-2v-4z",
    close: "M6 6l12 12M18 6L6 18"
  };
  ADM.icon = (n, extra) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra || ""}><path d="${P[n] || P.doc}"/></svg>`;

  /* ---------- 状态 ---------- */
  const S = (ADM.state = {
    role: (function () { try { return sessionStorage.getItem("adm.role") || "ops"; } catch (e) { return "ops"; } })(),
    openGroups: {},
    route: { key: "admin-workbench", params: [], query: {} },
    offline: false
  });
  ADM.role = () => ADM.roles[S.role];
  ADM.user = () => ADM.users[ADM.role().userId];
  ADM.perm = (id, role) => {
    const r = role || S.role;
    for (const g of ADM.menu) for (const it of g.items) if (it.id === id) return it.perm[ADM.roleOrder.indexOf(r)] || "n";
    return "n";
  };
  ADM.canSee = (id) => ADM.perm(id) !== "n";
  ADM.canWrite = (id) => ADM.perm(id) === "w";
  ADM.menuItem = (id) => { for (const g of ADM.menu) for (const it of g.items) if (it.id === id) return it; return null; };
  ADM.userName = (uid) => (uid && ADM.users[uid] ? ADM.users[uid].name : "未分配");
  ADM.isSelf = (uid) => uid === ADM.role().userId;

  /* ---------- 提示 ---------- */
  ADM.toast = function (msg, kind, opts) {
    const box = $("#toasts");
    const n = document.createElement("div");
    n.className = "toast " + (kind === "err" ? "err" : "ok");
    n.setAttribute("role", kind === "err" ? "alert" : "status");
    const trace = kind === "err" ? `<br><span style="opacity:.8">traceId：${esc((opts && opts.traceId) || "tr-" + Math.random().toString(16).slice(2, 10))}</span>` : "";
    n.innerHTML = `<div>${esc(msg)}${trace}</div><button class="x" aria-label="关闭">×</button>`;
    box.appendChild(n);
    const kill = () => n.remove();
    n.querySelector(".x").onclick = kill;
    if (kind !== "err") setTimeout(kill, 3000);
  };

  /* ---------- 抽屉 / 弹窗 ---------- */
  let lastFocus = null;
  const drawer = (ADM.drawer = {
    cfg: null, tab: null,
    open(cfg) {
      lastFocus = document.activeElement;
      this.cfg = cfg; this.tab = cfg.tabs ? cfg.tabs[0].key : null;
      this.paint();
      $("#scrim").classList.add("open");
      const d = $("#drawer"); d.classList.add("open"); d.setAttribute("aria-hidden", "false");
      setTimeout(() => { const c = $(".close", d); c && c.focus(); }, 30);
    },
    paint() {
      const c = this.cfg; if (!c) return;
      const d = $("#drawer");
      const tabs = c.tabs ? `<div class="tabs" role="tablist">${c.tabs.map((t) => `<button role="tab" data-dtab="${t.key}" aria-selected="${t.key === this.tab}">${esc(t.label)}</button>`).join("")}</div>` : "";
      d.innerHTML = `<div class="drawer-head"><div class="row"><div><h3>${esc(c.title)}</h3><div style="color:var(--muted);font-size:13px">${c.sub || ""}</div></div><button class="close" aria-label="关闭">×</button></div>${tabs}</div>
        <div class="drawer-body">${c.body(this.tab)}</div>
        <div class="drawer-foot">${c.foot ? c.foot(this.tab) : ""}</div>`;
      $(".close", d).onclick = () => drawer.close();
      $$("[data-dtab]", d).forEach((b) => (b.onclick = () => { drawer.tab = b.dataset.dtab; drawer.paint(); if (c.onTab) c.onTab(drawer.tab); }));
      if (c.bind) c.bind(d, this.tab);
    },
    close() {
      const d = $("#drawer"); d.classList.remove("open"); d.setAttribute("aria-hidden", "true");
      if (!$("#modal").classList.contains("open")) $("#scrim").classList.remove("open");
      const cb = this.cfg && this.cfg.onClose; this.cfg = null;
      if (cb) cb();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
  });
  ADM.modal = function (cfg) {
    const m = $("#modal");
    m.className = "modal open" + (cfg.wide ? " wide" : "");
    m.innerHTML = `<h3>${esc(cfg.title)}</h3><div class="mbody">${cfg.body}</div><div class="mfoot"><button class="btn" data-m="cancel">${esc(cfg.cancelText || "取消")}</button>${cfg.hideOk ? "" : `<button class="btn ${cfg.danger ? "danger" : "primary"}" data-m="ok">${esc(cfg.okText || "确认")}</button>`}</div>`;
    $("#scrim").classList.add("open");
    const prevFocus = document.activeElement;
    const close = () => { m.className = "modal"; if (!$("#drawer").classList.contains("open")) $("#scrim").classList.remove("open"); if (prevFocus && prevFocus.isConnected && prevFocus.focus) prevFocus.focus(); };
    m.querySelector('[data-m="cancel"]').onclick = close;
    const ok = m.querySelector('[data-m="ok"]');
    if (ok) ok.onclick = () => { if (!cfg.onOk || cfg.onOk(m) !== false) close(); };
    if (cfg.bind) cfg.bind(m);
    setTimeout(() => { const f = m.querySelector("input,select,textarea,button.btn"); f && f.focus(); }, 30);
    ADM.closeModal = close;
  };
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if ($("#modal").classList.contains("open")) { ADM.closeModal && ADM.closeModal(); return; }
    if ($("#drawer").classList.contains("open")) drawer.close();
    $("#rolePop").classList.remove("open"); $(".adm-search-pop") && $(".adm-search-pop").classList.remove("open");
  });
  document.addEventListener("click", (e) => {
    if (e.target.id === "scrim") { if ($("#modal").classList.contains("open")) return; drawer.close(); }
    if (!e.target.closest("#rolePop, #roleBtn")) $("#rolePop").classList.remove("open");
    if (!e.target.closest(".adm-search")) { const p = $(".adm-search-pop"); p && p.classList.remove("open"); }
  });

  /* ---------- 路由 ---------- */
  ADM.pages = {};
  ADM.parseHash = function () {
    const raw = location.hash.replace(/^#\/?/, "");
    const [path, qs] = raw.split("?");
    const parts = (path || "admin-workbench").split("/").filter(Boolean);
    const q = {}; (qs || "").split("&").filter(Boolean).forEach((kv) => { const [k, v] = kv.split("="); q[decodeURIComponent(k)] = decodeURIComponent(v || ""); });
    return { key: parts[0], params: parts.slice(1), query: q };
  };
  /* 统一审计写入：所有会改变数据的动作都应调用 */
  ADM.audit = function (action, obj, reason, extra) {
    if (!ADM.audits) return null;
    const nums = ADM.audits.map((a) => +String(a.id).replace(/\D/g, "")).filter(Boolean);
    const id = "AUD-" + (Math.max(90000, ...nums) + 1);
    const e = Object.assign({ id, at: "2026-11-19 10:30", who: ADM.role().userId, role: ADM.role().name, action, obj, res: "成功", reason: reason || "—", self: false, trace: "tr-" + Math.random().toString(16).slice(2, 10), before: "—", after: "—" }, extra || {});
    ADM.audits.unshift(e);
    return e;
  };
  ADM.setS = (h, v) => { h.S = h.S || {}; Object.keys(h.S).forEach((k) => delete h.S[k]); Object.assign(h.S, v); };
  ADM.go = (hash) => { if (location.hash === "#/" + hash) route(); else location.hash = "#/" + hash; };
  const aliases = { "partner-360": "partner-list", "customer-360": "client-list" };
  function route() {
    const r = ADM.parseHash();
    r.menuKey = aliases[r.key] || r.key;
    S.route = r;
    if (ADM.pageCleanup) { ADM.pageCleanup(); ADM.pageCleanup = null; }
    if ($("#modal").classList.contains("open") && ADM.closeModal) ADM.closeModal();
    if (drawer.cfg) drawer.close();
    renderNav();
    const main = $("#main");
    main.onclick = main.onchange = main.oninput = main.onkeydown = null; /* 防止上一页遗留的处理器劫持当前页 */
    main.scrollTo && window.scrollTo(0, 0);
    const item = ADM.menuItem(r.menuKey);
    if (!item) { main.innerHTML = `<div class="forbidden"><b>页面不存在</b>地址 “${esc(r.key)}” 没有对应的入口。<br><a href="#/admin-workbench">返回仪表盘</a></div>`; return; }
    if (!ADM.canSee(r.menuKey)) {
      main.innerHTML = `<div class="forbidden"><b>当前角色无权访问“${esc(item.label)}”</b>你当前的视角是 ${esc(ADM.role().name)}。如需访问，请联系系统管理员调整角色，或切换到有权限的视角。<br><a class="btn" style="margin-top:12px" href="#/admin-workbench">返回仪表盘</a></div>`;
      return;
    }
    const page = ADM.pages[r.menuKey];
    if (page) page(main, r);
    else stub(main, item);
    $("#sidebar").classList.remove("open");
  }
  function stub(main, item) {
    const w = ADM.canWrite(item.id);
    main.innerHTML = `<div class="adm-crumb"><a href="#/admin-workbench">仪表盘</a><span>/</span><span>${esc(item.label)}</span></div>
      <div class="adm-pagehead"><div><h1>${esc(item.label)}</h1><p class="sub">${w ? "当前角色可操作" : "当前角色只读"}</p></div></div>
      <div class="stub"><b>本页待生成</b>本批次只生成 仪表盘、任务队列、合作方 360 三页。<br>设计文档：<code>${esc(item.doc)}</code></div>`;
  }
  ADM.route = route;

  /* ---------- 外壳 ---------- */
  function shell() {
    $("#topbar").innerHTML = `
      <button class="adm-iconbtn adm-menu-toggle" id="menuBtn" aria-label="打开菜单">${ADM.icon("menu")}</button>
      <div class="adm-brand"><div class="adm-brand-mark">A</div><div class="adm-brand-name">Affiliate<small>管理端</small></div></div>
      <div class="adm-search">${ADM.icon("search")}<input id="gsearch" type="search" placeholder="搜索合作方、客户、任务编号" autocomplete="off" aria-label="全局搜索"><div class="adm-search-pop" id="gpop"></div></div>
      <div class="adm-top-right">
        <span class="adm-env" title="演示数据，不连接真实系统">演示环境</span>
        <div class="adm-time" id="clock"></div>
        <button class="adm-iconbtn" id="bellBtn" aria-label="通知">${ADM.icon("bell")}<span class="adm-badge-dot" id="bellN">3</span></button>
        <button class="adm-role" id="roleBtn" aria-haspopup="menu" aria-expanded="false"><i></i><span id="roleName"></span>${ADM.icon("chev")}</button>
      </div>`;
    $("#menuBtn").onclick = () => $("#sidebar").classList.toggle("open");
    $("#bellBtn").onclick = () => ADM.go("notices");
    $("#roleBtn").onclick = (e) => {
      e.stopPropagation();
      const p = $("#rolePop"); p.classList.toggle("open");
      $("#roleBtn").setAttribute("aria-expanded", p.classList.contains("open"));
    };
    renderRolePop(); updateRoleUi(); tickClock(); setInterval(tickClock, 30000); bindSearch();
  }
  function tickClock() {
    const n = new Date(ADM.NOW.getTime() + (Date.now() - ADM.bootAt));
    const p = (x) => String(x).padStart(2, "0");
    $("#clock").innerHTML = `<b>${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())} ${p(n.getHours())}:${p(n.getMinutes())}</b>北京时间 (UTC+8)`;
  }
  ADM.bootAt = Date.now();
  function renderRolePop() {
    $("#rolePop").innerHTML = `<h4>切换角色视角（演示用）</h4>` + ADM.roleOrder.map((k) => `<button class="opt" role="menuitemradio" data-role="${k}" aria-checked="${k === S.role}"><b>${ADM.roles[k].name}</b><span>${esc(ADM.roleNote[k])}</span></button>`).join("") +
      `<div class="note">切换会写入审计记录；不同视角看到的菜单、数据和按钮不同。</div>`;
    $$("[data-role]", $("#rolePop")).forEach((b) => (b.onclick = () => setRole(b.dataset.role)));
  }
  function updateRoleUi() { $("#roleName").textContent = ADM.role().name; }
  function setRole(k) {
    if (k === S.role) { $("#rolePop").classList.remove("open"); return; }
    S.role = k; try { sessionStorage.setItem("adm.role", k); } catch (e) {}
    $("#rolePop").classList.remove("open"); renderRolePop(); updateRoleUi();
    ADM.audit("切换角色视角", `${ADM.roles[k].name}视角（演示）`, "演示环境角色切换");
    ADM.toast(`已切换为${ADM.roles[k].name}视角，已记录审计（演示）`);
    route();
  }
  function renderNav() {
    const cur = S.route.menuKey;
    const nav = $("#sidebar");
    nav.innerHTML = ADM.menu.map((g) => {
      const items = g.items.filter((it) => ADM.canSee(it.id));
      if (!items.length) return "";
      const open = S.openGroups[g.group] !== false;
      return `<div class="adm-group" data-open="${open}"><button class="adm-group-title" data-grp="${esc(g.group)}" aria-expanded="${open}"><span>${esc(g.group)}</span>${ADM.icon("chev")}</button><div class="adm-group-items">${items.map((it) => {
        const ro = ADM.perm(it.id) === "r";
        const cnt = it.badge ? ADM.badgeCount(it.badge) : 0;
        return `<a class="adm-nav" href="#/${it.id}" title="${esc(it.label)}" ${it.id === cur ? 'aria-current="page"' : ""}>${ADM.icon(it.icon)}<span class="label">${esc(it.label)}</span>${cnt ? `<span class="count">${cnt}</span>` : ro ? '<span class="ro">只读</span>' : ""}</a>`;
      }).join("")}</div></div>`;
    }).join("");
    $$("[data-grp]", nav).forEach((b) => (b.onclick = () => { const g = b.dataset.grp; S.openGroups[g] = S.openGroups[g] === false; renderNav(); }));
  }
  ADM.refreshNav = renderNav;
  ADM.badgeCount = (k) => {
    if (k === "tasks") return ADM.visibleTasks().filter((t) => ADM.isMine(t) && ADM.activeStates.includes(t.state)).length;
    if (k === "approvals") return ADM.approvalPendingForMe ? ADM.approvalPendingForMe() : 0;
    return 0;
  };
  function bindSearch() {
    const inp = $("#gsearch"), pop = $("#gpop");
    inp.oninput = () => {
      const q = inp.value.trim().toLowerCase();
      if (!q) { pop.classList.remove("open"); return; }
      const ps = ADM.partners.filter((p) => (p.id + p.name).toLowerCase().includes(q)).slice(0, 5);
      const ts = ADM.visibleTasks().filter((t) => (t.id + t.title).toLowerCase().includes(q)).slice(0, 5);
      let h = "";
      if (ADM.canSee("partner-list") && ps.length) h += `<div class="adm-search-group">合作方</div>` + ps.map((p) => `<button class="adm-search-item" data-to="partner-360/${p.id}"><b>${esc(p.name)}</b><span>${p.id}</span></button>`).join("");
      if (ts.length) h += `<div class="adm-search-group">任务</div>` + ts.map((t) => `<button class="adm-search-item" data-to="tasks?task_id=${t.id}"><b>${esc(t.id)}</b><span>${esc(t.title)}</span></button>`).join("");
      pop.innerHTML = h || `<div class="empty" style="padding:20px"><b>没有匹配结果</b>当前角色可见范围内未找到“${esc(inp.value)}”</div>`;
      pop.classList.add("open");
      $$("[data-to]", pop).forEach((b) => (b.onclick = () => { pop.classList.remove("open"); inp.value = ""; ADM.go(b.dataset.to); }));
    };
  }

  /* ---------- 任务可见范围 ---------- */
  ADM.visibleTasks = () => ADM.tasks.filter((t) => ADM.roleTaskTypes[S.role].includes(t.type));
  ADM.isMine = (t) => t.owner === ADM.role().userId;
  ADM.hoursText = (h) => {
    if (h == null) return "未配置";
    const a = Math.abs(h);
    const s = a >= 24 ? `${Math.floor(a / 24)} 天 ${a % 24} 小时` : `${a} 小时`;
    return h < 0 ? `已超时 ${s}` : `剩余 ${s}`;
  };
  ADM.slaTag = (t) => {
    if (!ADM.activeStates.includes(t.state)) return `<span class="tag plain">—</span>`;
    if (t.dueIn == null) return `<span class="tag plain">未配置</span>`;
    if (t.dueIn < 0) return `<span class="tag bad">${ADM.hoursText(t.dueIn)}</span>`;
    if (t.dueIn <= 6) return `<span class="tag warn">${ADM.hoursText(t.dueIn)}</span>`;
    return `<span class="tag ok">${ADM.hoursText(t.dueIn)}</span>`;
  };
  ADM.stateTag = (s) => { const x = ADM.taskStates[s]; return `<span class="tag ${x.tone}">${x.name}</span>`; };
  ADM.sensitive = (t) => ["guarantee_offset", "chargeback", "circuit_breaker", "hold_extend", "credit_review"].includes(t.type);

  /* ---------- 通用：分页 ---------- */
  ADM.pager = (total, page, size) => {
    const n = Math.max(1, Math.ceil(total / size));
    let b = `<button data-pg="${page - 1}" ${page <= 1 ? "disabled" : ""} aria-label="上一页">‹</button>`;
    for (let i = 1; i <= n; i++) b += `<button data-pg="${i}" ${i === page ? 'aria-current="page"' : ""}>${i}</button>`;
    b += `<button data-pg="${page + 1}" ${page >= n ? "disabled" : ""} aria-label="下一页">›</button>`;
    return b;
  };

  window.addEventListener("hashchange", route);
  window.addEventListener("online", () => $("#offlineBar") && $("#offlineBar").classList.remove("show"));
  ADM.boot = function () {
    shell();
    if (!location.hash) location.hash = "#/admin-workbench"; else route();
  };
})();
