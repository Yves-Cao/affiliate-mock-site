/* 页面 01 仪表盘 */
(function () {
  const ADM = window.ADM, esc = ADM.esc, $ = ADM.$, $$ = ADM.$$;
  const st = { range: "7d", tab: "mine", trend: true, view: "line", metric: "reg", sig: "all" };
  let timer = null, left = 300;

  const queueTabs = [
    { k: "mine", n: "我的任务" }, { k: "approval", n: "待审批" }, { k: "soon", n: "即将超时" },
    { k: "over", n: "已超时" }, { k: "ext", n: "等待外部" }, { k: "all", n: "全部待处理" }
  ];
  function queue(tab) {
    const act = ADM.visibleTasks().filter((t) => ADM.activeStates.includes(t.state));
    switch (tab) {
      case "mine": return act.filter(ADM.isMine);
      case "approval": return act.filter((t) => t.state === "pending_approval" && !ADM.isMine(t));
      case "soon": return act.filter((t) => t.dueIn != null && t.dueIn >= 0 && t.dueIn <= 6);
      case "over": return act.filter((t) => t.dueIn != null && t.dueIn < 0);
      case "ext": return act.filter((t) => ["waiting_material", "executing", "pending_execution"].includes(t.state));
      default: return act;
    }
  }
  const k = () => ADM.ranges.find((r) => r.key === st.range).k;
  const rangeLabel = () => ADM.ranges.find((r) => r.key === st.range).label;

  function snapshot() {
    const K = k(), f = ADM.fmt;
    const role = ADM.role().key;
    const tip = (t) => `<span class="tip">${t}</span>`;
    const M = {
      ops: [
        ["新增注册", f.int(Math.round(4099 * K)), "↑ 3.2%", "up", "时间范围内完成注册的客户数；按归属合作方统计。"],
        ["首次入金", f.int(Math.round(930 * K)), "↑ 1.1%", "up", "时间范围内首次入金的客户数。"],
        ["有效转化", f.int(Math.round(498 * K)), "↓ 0.8%", "down", "满足有效转化口径的客户数；口径见业务配置。"],
        ["活跃合作方", "12", "较上周持平", "", "近 30 天有点击的正常状态合作方数，与时间范围无关。"],
        ["待我处理", String(queue("mine").length), "", "", "分配给你且未结束的任务数，不受时间范围影响。"]
      ],
      risk: [
        ["R2–R3 合作方", "5", "↑ 1", "down", "风险等级为 R2 或 R3 的合作方数量；R 等级与信用 C 等级分别计算。"],
        ["待复核事件", String(queue("all").length), "", "", "风控可见范围内未结束的任务总数。"],
        ["已超时", String(queue("over").length), "", "down", "已超过截止时间仍未处理的任务数。"],
        ["近期风险占比", "2.4%", "较上期 ↑ 0.3pt", "down", "时间范围内被标记的转化占全部转化的比例；数据未就绪时显示“未知”。"],
        ["待我处理", String(queue("mine").length), "", "", "分配给你且未结束的任务数。"]
      ],
      fin: [
        ["待结算佣金", f.usd(86420.5 * K / 4.1), "", "", "状态为结算中的佣金合计，USD。是否含冻结见资金页说明。"],
        ["待审批提现", "7", "", "", "等待另一位财务审批的提现申请数；资金类申请不允许自审。"],
        ["对账差异", "2", "合计 $310.00", "down", "内部对账与支付系统回执不一致的笔数。"],
        ["资金异常任务", String(queue("all").length), "", "", "财务可见范围内未结束的任务数。"],
        ["待我处理", String(queue("mine").length), "", "", "分配给你且未结束的任务数。"]
      ],
      admin: [
        ["待处理任务", String(queue("all").length), "", "", "系统管理员可见范围内未结束的任务总数。"],
        ["集成失败", "3", "↑ 1", "down", "回调、同步、回传连续失败的目标数。"],
        ["事件补数", "2", "", "", "进行中的事件补数批次。"],
        ["配置待发布", "1", "", "", "已通过审批、等待发布的配置版本。"],
        ["在线管理员", "2", "", "", "近 15 分钟活跃的管理端用户。"]
      ]
    }[role];
    return `<div class="stats">${M.map((m, i) => `<button class="stat" ${i === M.length - 1 && m[0] === "待我处理" ? "" : "disabled"} data-tomine="${m[0] === "待我处理" ? 1 : 0}" tabindex="0"><div class="name">${m[0]}</div><div class="val num">${m[1]}</div><div class="delta ${m[3]}">${m[2] || "&nbsp;"}</div>${tip(esc(m[4]))}</button>`).join("")}</div>`;
  }

  function signals() {
    const role = ADM.role().key;
    const rows = ADM.signals.filter((s) => s.roles.includes(role) && ADM.canSee(s.to));
    const shown = st.sig === "all" ? rows : rows.filter((s) => s.lv === st.sig);
    const lv = { P0: "bad", P1: "bad", P2: "warn", P3: "plain" };
    return `<div class="panel"><div class="panel-head"><h2>需要关注的信号</h2><span class="meta">${rows.length} 项 · 按严重程度排序</span><div class="right"><div class="seg" role="group" aria-label="信号级别">${["all", "P0", "P1", "P2", "P3"].map((x) => `<button data-sig="${x}" aria-pressed="${st.sig === x}">${x === "all" ? "全部" : x}</button>`).join("")}</div></div></div>
      ${shown.length ? `<div class="table-wrap" style="border:0;border-radius:0 0 12px 12px"><table class="dt"><thead><tr><th>级别</th><th>信号</th><th>状态</th><th class="num">对象数</th><th class="num">涉及金额 (USD)</th><th>首次出现</th><th>最近出现</th><th></th></tr></thead><tbody>${shown.map((s) => `<tr><td><span class="tag ${lv[s.lv]}">${s.lv}</span></td><td>${esc(s.name)}</td><td>${esc(s.status)}</td><td class="num">${s.objs || "—"}</td><td class="num">${s.amt == null ? "—" : s.amt}</td><td>${s.first}</td><td>${s.last}</td><td><a href="#/${s.to}">查看</a></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty"><b>该级别暂无信号</b>当前角色可见范围内没有 ${st.sig} 信号。</div>`}</div>`;
  }

  function queuePanel() {
    const rows = queue(st.tab);
    const tabs = queueTabs.map((t) => `<button role="tab" data-qtab="${t.k}" aria-selected="${st.tab === t.k}">${t.n}<span class="n num">${queue(t.k).length}</span></button>`).join("");
    const body = rows.length ? `<div class="table-wrap" style="border:0;border-radius:0"><table class="dt"><thead><tr><th>编号</th><th>任务</th><th>类型</th><th>优先级</th><th>状态</th><th>截止</th><th>负责人</th></tr></thead><tbody>${rows.slice(0, 10).map((t) => `<tr><td class="id"><a href="#/tasks?task_id=${t.id}">${t.id}</a></td><td class="ellip" title="${esc(t.title)}">${esc(t.title)}</td><td>${ADM.taskTypes[t.type].name}</td><td>${t.pri}</td><td>${ADM.stateTag(t.state)}</td><td>${ADM.slaTag(t)}</td><td>${esc(ADM.userName(t.owner))}</td></tr>`).join("")}</tbody></table></div>
      <div class="tfoot" style="padding:12px 16px;margin:0"><span>显示前 ${Math.min(10, rows.length)} 条，共 ${rows.length} 条</span><a href="#/tasks">查看完整列表</a></div>`
      : `<div class="empty"><b>这里没有待处理的任务</b>${st.tab === "mine" ? "你当前没有分配给自己的任务，可以到任务队列认领。" : "当前视角下没有符合条件的任务。"}${st.tab === "mine" ? '<br><a class="btn" href="#/tasks">去任务队列</a>' : ""}</div>`;
    return `<div class="panel"><div class="panel-head" style="padding-bottom:0;border-bottom:0"><h2>待处理队列</h2><span class="meta">不受时间范围影响</span></div><div style="padding:0 16px"><div class="tabs" role="tablist">${tabs}</div></div>${body}</div>`;
  }

  function trendPanel() {
    const K = ADM.trendBase;
    const names = { click: "点击", reg: "注册", ftd: "首次入金", qc: "有效转化" };
    const head = `<div class="panel-head"><h2>趋势</h2><span class="meta">${rangeLabel()} · 按日</span><div class="right">
      <select class="select" id="trMetric" aria-label="指标">${Object.keys(names).map((x) => `<option value="${x}" ${st.metric === x ? "selected" : ""}>${names[x]}</option>`).join("")}</select>
      <div class="seg">${[["line", "折线"], ["bar", "柱状"], ["table", "表格"]].map((v) => `<button data-view="${v[0]}" aria-pressed="${st.view === v[0]}">${v[1]}</button>`).join("")}</div>
      <button class="btn sm ghost" id="trToggle">${st.trend ? "收起" : "展开"}</button></div></div>`;
    if (!st.trend) return `<div class="panel">${head}</div>`;
    const vals = K.map((x) => x[st.metric]), max = Math.max(...vals) * 1.1, min = 0;
    const W = 860, H = 200, pl = 44, pb = 24, n = K.length;
    const xs = (i) => pl + (i * (W - pl - 12)) / (n - 1), ys = (v) => H - pb - ((v - min) / (max - min)) * (H - pb - 10);
    let svg;
    if (st.view === "table") svg = `<div class="table-wrap" style="border:0"><table class="dt"><thead><tr><th>日期</th>${Object.values(names).map((x) => `<th class="num">${x}</th>`).join("")}</tr></thead><tbody>${K.map((r) => `<tr><td>${r.d}</td>${Object.keys(names).map((x) => `<td class="num">${ADM.fmt.int(r[x])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    else {
      const grid = [0, 0.5, 1].map((p) => { const v = max * p, y = ys(v); return `<line x1="${pl}" x2="${W - 8}" y1="${y}" y2="${y}" stroke="var(--border)"/><text x="${pl - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${ADM.fmt.int(Math.round(v))}</text>`; }).join("");
      const lab = K.map((r, i) => `<text x="${xs(i)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--muted)">${r.d}</text>`).join("");
      let m;
      if (st.view === "line") m = `<polyline fill="none" stroke="var(--brand)" stroke-width="2" points="${K.map((r, i) => xs(i) + "," + ys(r[st.metric])).join(" ")}"/>` + K.map((r, i) => `<circle cx="${xs(i)}" cy="${ys(r[st.metric])}" r="3.5" fill="var(--surface)" stroke="var(--brand)" stroke-width="2"><title>${r.d}：${ADM.fmt.int(r[st.metric])}</title></circle>`).join("");
      else m = K.map((r, i) => `<rect x="${xs(i) - 16}" y="${ys(r[st.metric])}" width="32" height="${H - pb - ys(r[st.metric])}" rx="4" fill="var(--brand)" opacity=".85"><title>${r.d}：${ADM.fmt.int(r[st.metric])}</title></rect>`).join("");
      svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;max-height:240px" role="img" aria-label="${names[st.metric]}趋势">${grid}${m}${lab}</svg>`;
    }
    return `<div class="panel">${head}<div class="panel-body">${svg}<p class="meta" style="margin:8px 0 0;font-size:12px;color:var(--muted)">仅展示已收齐的日期；当日数据未收齐时单独标注，不按 0 计入。</p></div></div>`;
  }

  function funds() {
    const role = ADM.role().key;
    if (role === "ops") return "";
    const f = ADM.fmt, K = k() / 4.1;
    const cards = [
      ["待结算佣金", f.usd(86420.5 * K), "含结算中；是否含冻结见佣金与结算页", "commission-list"],
      ["待审批提现", f.usd(21300 * K), "7 笔 · 等待另一位财务审批", "withdrawal-list"],
      ["保证金覆盖不足", null, "覆盖率数据待风控接口回传，显示为“未知”，不按 0 计", "report-quality"],
      ["待追回金额", f.usd(6720), "来自冲正追回登记，需财务跟踪", "d-plus-n"]
    ].filter((c) => ADM.canSee(c[3]));
    if (!cards.length) return "";
    return `<div class="panel"><div class="panel-head"><h2>资金概览</h2><span class="meta">${rangeLabel()} · 单位 USD</span></div><div class="stats" style="border:0;border-radius:0 0 12px 12px;margin:0">${cards.map((c) => `<a class="stat" href="#/${c[3]}" style="text-decoration:none;color:inherit"><div class="name">${c[0]}</div><div class="val num ${c[1] == null ? "null" : ""}">${c[1] == null ? "未知" : c[1]}</div><div class="delta">${c[2]}</div></a>`).join("")}</div></div>`;
  }

  function entries() {
    const E = { ops: ["partner-list", "client-list", "campaign-list", "tasks", "appeals-service", "exports"], risk: ["risk-event", "risk-review", "tasks", "approvals", "appeals-service", "exports"], fin: ["commission-list", "withdrawal-list", "d-plus-n", "tasks", "approvals", "exports"], admin: ["integration-governance", "config-overview", "audit", "tasks", "config-permission", "system"] }[ADM.role().key];
    return `<div class="panel"><div class="panel-head"><h2>常用入口</h2></div><div class="panel-body" style="display:flex;gap:8px;flex-wrap:wrap">${E.filter(ADM.canSee).map((id) => { const it = ADM.menuItem(id); return `<a class="btn" href="#/${id}">${it.label}</a>`; }).join("")}</div></div>`;
  }

  function render(main) {
    const role = ADM.role();
    const delay = 420 + Math.round(Math.random() * 80);
    main.innerHTML = `<div class="adm-crumb"><span>总览</span><span>/</span><span>仪表盘</span></div>
      <div class="adm-pagehead"><div><h1>仪表盘</h1><p class="sub">${role.perspective}</p></div>
        <div class="actions"><span class="meta" id="fresh" style="font-size:12px;color:var(--muted)">数据更新于 2026-11-19 10:29，延迟 ${delay} ms</span>
        <button class="btn sm" id="refresh">${ADM.icon("refresh", 'style="width:14px;height:14px"')}刷新</button><span id="cd" style="font-size:12px;color:var(--muted)"></span>
        <select class="select" id="range" aria-label="时间范围">${ADM.ranges.map((r) => `<option value="${r.key}" ${r.key === st.range ? "selected" : ""}>${r.label}</option>`).join("")}<option value="custom">自定义（最长 90 天）</option></select></div></div>
      <div class="adm-offline" id="offlineBar">网络已断开，当前显示的是最后一次成功加载的数据。</div>
      <div id="snap"></div>
      <div class="stack"><div id="queue"></div><div id="sigs"></div><div id="trend"></div><div id="funds"></div><div id="ent"></div></div>`;
    const paint = () => {
      $("#snap").innerHTML = snapshot(); $("#queue").innerHTML = queuePanel(); $("#sigs").innerHTML = signals();
      $("#trend").innerHTML = trendPanel(); $("#funds").innerHTML = funds(); $("#ent").innerHTML = entries();
      $$("[data-tomine='1']", main).forEach((b) => (b.onclick = () => { st.tab = "mine"; paint(); }));
    };
    paint();
    main.onclick = (e) => {
      const t = e.target.closest("[data-qtab],[data-sig],[data-view],#trToggle");
      if (!t) return;
      if (t.dataset.qtab) st.tab = t.dataset.qtab;
      else if (t.dataset.sig) st.sig = t.dataset.sig;
      else if (t.dataset.view) st.view = t.dataset.view;
      else st.trend = !st.trend;
      paint();
    };
    main.onchange = (e) => {
      if (e.target.id === "range") {
        if (e.target.value === "custom") { ADM.toast("自定义范围最长 90 天，演示环境暂以最近 30 天展示"); st.range = "30d"; } else st.range = e.target.value;
        paint(); $("#range").value = st.range;
      }
      if (e.target.id === "trMetric") { st.metric = e.target.value; paint(); }
    };
    $("#refresh").onclick = () => { left = 300; $("#fresh").textContent = "数据更新于 2026-11-19 10:30，延迟 " + (400 + Math.round(Math.random() * 90)) + " ms"; paint(); ADM.toast("已刷新"); };
    left = 300; clearInterval(timer);
    timer = setInterval(() => {
      left--; const c = $("#cd"); if (!c) return clearInterval(timer);
      c.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} 后自动刷新`;
      if (left <= 0) $("#refresh").click();
    }, 1000);
    $("#cd").textContent = "5:00 后自动刷新";
    ADM.pageCleanup = () => clearInterval(timer);
  }
  ADM.pages["admin-workbench"] = render;
})();
