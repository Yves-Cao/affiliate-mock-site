/* 页面 25 经营与转化 / 26 质量与资金分析（只读分析页，同一报表快照） */
(function () {
  const ADM = window.ADM, esc = ADM.esc, $ = ADM.$, $$ = ADM.$$, U = ADM.ui, kv = U.kv;
  const role = () => ADM.role().key;
  const NOW = "2026-11-19 10:30";
  const n = (v) => (v == null ? '<span style="color:var(--muted)" title="未知，不按 0 计">—</span>' : Number(v).toLocaleString("en-US"));
  const rate = (a, b) => (a == null || b == null || b === 0 ? '<span style="color:var(--muted)">—</span>' : (a / b * 100).toFixed(1) + "%");
  const qtag = (q) => `<span class="tag ${q === "完整" ? "ok" : q === "部分" ? "warn" : "bad"}">${q}</span>`;
  const sum = (rows, k) => (rows.some((r) => r[k] == null) ? null : rows.reduce((s, r) => s + r[k], 0));
  const RANGES = [["7d", "近 7 日"], ["30d", "近 30 日（默认）"], ["90d", "近 90 日"], ["366d", "近 366 日（上限）"]];

  function snapBar() {
    const s = ADM.snapshot;
    return `<div class="callout" style="margin-bottom:16px;background:var(--surface-accent);display:flex;gap:20px;flex-wrap:wrap;font-size:12px"><span>报表快照 <b>${s.id}</b></span><span>数据截至 ${s.cut}</span><span>时区 ${s.tz}</span><span>指标定义 ${s.def}</span><span>数据质量 ${qtag(s.quality)}</span></div>`;
  }
  function exportBtn(src, obj) {
    return `<button class="btn" id="exp">导出</button>`;
  }
  function bindExport(src, obj, scope) {
    const b = $("#exp"); if (!b) return;
    b.onclick = () => ADM.modal({ title: "发起导出", body: `<p>导出走导出中心：异步、脱敏、绑定当前快照 <b>${ADM.snapshot.id}</b> 与全部匹配范围（不是当前页）；下载时重新校验权限。</p>${U.reasonRow("xW", "用途（必填）")}${src === "资金分析" ? '<div class="callout warn">财务金额导出需额外授权，将进入审批。</div>' : ""}`, okText: "创建导出任务", onOk: (m) => { const w = U.needReason(m, "xW", 4); if (!w) return false; const id = "EX-" + (7109 + ADM.exports.length - 8); ADM.exports.unshift({ id, src, obj, applicant: ADM.role().userId, purpose: w, scope: scope(), sens: "敏感", rows: null, appr: src === "资金分析" ? "待审批" : "无需审批", gen: "排队", exp: "—", dl: 0 }); ADM.toast(`导出任务已创建（${id}），请到导出中心查看`); } });
  }

  /* =============== 25 经营与转化 =============== */
  const S25 = { view: "funnel", range: "30d", country: "", partner: "" };
  function renderBiz(main, route) {
    if (["funnel", "channel", "partner", "economics"].includes(route.query.view)) S25.view = route.query.view;
    U.head(main, "报表", "经营与转化", "只读分析：所有数字来自同一报表快照，不推进任何业务状态。ROI、完整 LTV、回收期等在来源冻结前不展示。", exportBtn());
    const paint = () => {
      const ch = ADM.repChannels.filter((r) => (!S25.country || r.country === S25.country) && (!S25.partner || r.partner === S25.partner));
      const pt = ADM.repPartners.filter((r) => (!S25.country || r.country === S25.country) && (!S25.partner || r.id === S25.partner));
      const tot = { clicks: sum(ch, "clicks"), valid: sum(ch, "valid"), reg: sum(ch, "reg"), ftd: sum(ch, "ftd"), qc: sum(ch, "qc") };
      const countries = [...new Set(ADM.repChannels.map((r) => r.country))], partners = [...new Set(ADM.repPartners.map((r) => r.id))];
      const sel = (id, arr, cur, all) => `<select class="select" id="${id}" aria-label="${all}"><option value="">${all}</option>${arr.map((x) => `<option ${cur === x ? "selected" : ""}>${x}</option>`).join("")}</select>`;
      const chips = [["country", "国家", S25.country], ["partner", "合作方", S25.partner]].filter((c) => c[2]).map((c) => `<span class="chip">${c[1]}：${esc(c[2])}<button data-clear="${c[0]}" aria-label="移除${c[1]}">×</button></span>`).join("");
      let body = "";
      if (S25.view === "funnel") {
        const stages = [["有效点击", tot.valid], ["注册", tot.reg], ["首次入金", tot.ftd], ["有效转化", tot.qc]];
        const max = Math.max(...stages.map((s) => s[1] || 0), 1);
        body = `<div class="panel"><div class="panel-head"><h2>转化漏斗</h2><span class="meta">有效点击 → 注册 → 首次入金 → 有效转化 · 同期群基准：首次有效触点</span></div><div class="panel-body">${stages.map((s, i) => `<div style="display:grid;grid-template-columns:110px 1fr 160px;align-items:center;gap:12px;margin:10px 0"><span>${s[0]}</span><div style="height:22px;background:var(--surface-muted-1-0);border-radius:6px;overflow:hidden">${s[1] == null ? "" : `<div style="width:${Math.max(2, (s[1] / max) * 100)}%;height:100%;background:var(--brand);opacity:${1 - i * 0.18}"></div>`}</div><span>${n(s[1])}${i ? ` <span style="color:var(--muted);font-size:12px">上一阶段 ${rate(s[1], stages[i - 1][1])}</span>` : ""}</span></div>`).join("")}<p style="color:var(--muted);font-size:12px;margin:12px 0 0">合计含“未知”的阶段显示“—”，不按 0 计入；转化率分母为 0 或覆盖不完整同样显示“—”。</p></div></div>`;
      } else if (S25.view === "channel") body = `<div class="table-wrap"><table class="dt" style="min-width:1000px"><thead><tr><th class="fixl">渠道 / 国家</th><th>国家</th><th class="num">点击</th><th class="num">有效点击</th><th class="num">注册</th><th class="num">首次入金</th><th class="num">有效转化</th><th class="num">点击到注册</th><th class="num">风险拒绝占比</th><th>数据质量</th></tr></thead><tbody>${ch.map((r) => `<tr><td class="fixl">${esc(r.dim)}</td><td>${r.country}</td><td class="num">${n(r.clicks)}</td><td class="num">${n(r.valid)}</td><td class="num">${n(r.reg)}</td><td class="num">${n(r.ftd)}</td><td class="num">${n(r.qc)}</td><td class="num">${rate(r.reg, r.valid)}</td><td class="num">${r.rej}</td><td>${qtag(r.q)}</td></tr>`).join("") || '<tr><td colspan="10"><div class="empty"><b>没有符合条件的数据</b></div></td></tr>'}</tbody></table></div>`;
      else if (S25.view === "partner") body = `<div class="table-wrap"><table class="dt" style="min-width:1100px"><thead><tr><th class="fixl">合作方</th><th>国家</th><th class="num">点击</th><th class="num">有效点击</th><th class="num">注册</th><th class="num">首次入金</th><th class="num">有效转化</th><th class="num">佣金计提 (USD)</th><th>风险档 R</th><th>信用 C</th><th>数据质量</th></tr></thead><tbody>${pt.map((r) => `<tr><td class="fixl">${ADM.canSee("partner-list") ? `<a href="#/partner-360/${r.id}">${r.id}</a>` : r.id}</td><td>${r.country}</td><td class="num">${n(r.clicks)}</td><td class="num">${n(r.valid)}</td><td class="num">${n(r.reg)}</td><td class="num">${n(r.ftd)}</td><td class="num">${n(r.qc)}</td><td class="num">${r.comm}</td><td><span class="rband ${r.r.toLowerCase()}">${r.r}</span></td><td><span class="rband c">${r.c}</span></td><td>${qtag(r.q)}</td></tr>`).join("") || '<tr><td colspan="11"><div class="empty"><b>没有符合条件的数据</b></div></td></tr>'}</tbody></table></div><p style="color:var(--muted);font-size:12px;margin-top:8px">“已付佣金”“净 ROI”“建议”已删除；已付金额请看提现与对账。</p>`;
      else body = `<div class="callout info" style="margin-bottom:12px">本页为基础经济性，不构成投资回报结论。基准为“首次有效转化同期群”，不显示 ROI、完整 LTV、通用 CAC、留存经济性、回收期与收入预测。</div><div class="table-wrap"><table class="dt" style="min-width:1100px"><thead><tr><th class="fixl">维度</th><th class="num">有效转化客户</th><th class="num">成熟 / 未成熟</th><th class="num">成熟覆盖率</th><th>样本量</th><th class="num">获客成本</th><th class="num">扣除前净贡献</th><th class="num">扣除后净贡献</th><th>数据质量</th></tr></thead><tbody>${ADM.repEcon.map((r) => `<tr><td class="fixl">${r.dim}</td><td class="num">${n(r.qc)}</td><td class="num">${r.mature} / ${r.immature}</td><td class="num">${r.cover}</td><td>${r.sample === "未知" ? '<span class="tag warn">未知（阈值未发布）</span>' : `<span class="tag ${r.sample === "充足" ? "ok" : "warn"}">${r.sample}</span>`}</td>${["cost", "net", "net"].map(() => `<td class="num">${role() === "fin" || role() === "admin" ? '<span style="color:var(--muted)">待财务输入</span>' : '<span style="color:var(--muted)">无权查看</span>'}</td>`).join("")}<td>${qtag("部分")}</td></tr>`).join("")}</tbody></table></div>`;
      $("#fx").innerHTML = `${snapBar()}
        <div class="filters"><select class="select" id="rg" aria-label="时间">${RANGES.map((r) => `<option value="${r[0]}" ${S25.range === r[0] ? "selected" : ""}>${r[1]}</option>`).join("")}</select>${sel("fc", countries, S25.country, "全部国家")}${sel("fp", partners, S25.partner, "全部合作方")}<span style="margin-left:auto;font-size:12px;color:var(--muted)">切换视图或图表类型不改变筛选与快照</span></div>
        <div class="chips">${chips}${chips ? '<button class="btn sm ghost" data-clearall>清除全部</button>' : ""}</div>
        <div class="stats">${[["点击（原始）", tot.clicks], ["有效点击", tot.valid], ["注册", tot.reg], ["首次入金", tot.ftd], ["有效转化", tot.qc]].map((m) => `<div class="stat"><div class="name">${m[0]}</div><div class="val num">${m[1] == null ? "—" : m[1].toLocaleString("en-US")}</div><div class="delta">${m[1] == null ? "含未知项，合计不可得" : "&nbsp;"}</div></div>`).join("")}</div>
        <div class="seg" style="margin-bottom:12px">${[["funnel", "转化漏斗"], ["channel", "渠道与国家"], ["partner", "合作方"], ["economics", "基础经济性"]].map((v) => `<button data-v="${v[0]}" aria-pressed="${S25.view === v[0]}">${v[1]}</button>`).join("")}</div>${body}`;
      $("#fx").onchange = (e) => { if (e.target.id === "rg") S25.range = e.target.value; if (e.target.id === "fc") S25.country = e.target.value; if (e.target.id === "fp") S25.partner = e.target.value; paint(); };
      $("#fx").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.v) { S25.view = b.dataset.v; paint(); } else if (b.dataset.clear) { S25[b.dataset.clear] = ""; paint(); } else if (b.hasAttribute("data-clearall")) { S25.country = ""; S25.partner = ""; paint(); } };
    };
    paint(); bindExport("经营与转化", "经营报表", () => `${RANGES.find((r) => r[0] === S25.range)[1]} · ${S25.country || "全部国家"} · ${S25.partner || "全部合作方"}`);
  }

  /* =============== 26 质量与资金分析 =============== */
  const S26 = { view: null, range: "30d" };
  function allowedViews() { const r = role(); return [["quality", "质量"]].concat(r === "risk" || r === "admin" ? [["risk", "风控分析"]] : []).concat(r === "fin" || r === "admin" ? [["funds", "资金分析"]] : []); }
  function renderQuality(main, route) {
    const vs = allowedViews();
    const def = { ops: "quality", risk: "risk", fin: "funds", admin: "quality" }[role()];
    if (!S26.view || !vs.some((v) => v[0] === S26.view)) S26.view = def;
    if (route.query.view && vs.some((v) => v[0] === route.query.view)) S26.view = route.query.view;
    U.head(main, "报表", "质量与资金分析", role() === "ops" ? "只读：运营仅见质量视图，资金汇总不开放。" : "只读分析。规则、阈值、权重、模型分任何角色都不展示；报表可以创建对账任务，但不能改变资金。", exportBtn());
    const paint = () => {
      let body = "";
      if (S26.view === "quality") body = `<div class="table-wrap"><table class="dt" style="min-width:1050px"><thead><tr><th class="fixl">合作方</th><th class="num">有效转化</th><th class="num">质量升档</th><th class="num">升档占比</th><th class="num">成熟 / 未成熟</th><th>风险档分布（R）</th><th>数据质量</th></tr></thead><tbody>${ADM.repQuality.map((r) => `<tr><td class="fixl">${r.dim}</td><td class="num">${n(r.qc)}</td><td class="num">${n(r.up)}</td><td class="num">${rate(r.up, r.qc)}</td><td class="num">${r.mature == null ? "—" : r.mature + " / " + r.immature}</td><td>${r.dist.join(" · ")}</td><td>${qtag(r.q)}</td></tr>`).join("")}</tbody></table></div><p style="color:var(--muted);font-size:12px;margin-top:8px">风险档 R 与信用等级 C 分列，不混用；“留存率”“等级”列已删除（留存经济性在来源冻结前不得展示）。</p>`;
      else if (S26.view === "risk") body = `<div class="stack"><div class="panel"><div class="panel-head"><h2>规则命中</h2><span class="meta">不显示阈值、权重与评分公式</span></div><div class="table-wrap" style="border:0"><table class="dt"><thead><tr><th>规则与版本</th><th class="num">命中数</th><th>处置结果分布</th></tr></thead><tbody>${ADM.repRules.map((r) => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</tbody></table></div></div>
        <div class="panel"><div class="panel-head"><h2>阻断与时效</h2></div><div class="panel-body">${kv([["阻断案件数 / 金额 (USD)", "9 / 5,830.00（三元组去重）"], ["认领耗时（中位）", "2.4 小时"], ["复核耗时（中位）", "9 小时"], ["超时占比", "时限未配置的类型显示“未配置”"], ["申诉：创建 / 维持 / 改判", "7 / 1 / 0"]])}<p style="color:var(--muted);font-size:12px">命中率与误报率需指标发布后才显示；误报反馈只回流规则优化，不能自动修改生效规则。</p></div></div></div>`;
      else {
        const F = ADM.repFunds, blk = (t, rows) => `<div class="panel"><div class="panel-head"><h2>${t}</h2><span class="meta">财务快照 fs-1119</span></div><div class="panel-body">${kv(rows.map((r) => [r[0], r[1]]))}</div></div>`;
        body = `<div class="stack">${blk("佣金与结算 (USD)", F.comm)}${blk("保证金 (USD)", F.guar)}<div class="callout info">保证金覆盖率：口径待确认，未发布前不显示，也不用“潜在损失”自行推算。</div>${blk("提现（笔数）", F.wd)}${blk("债务与冲正", F.debt)}
          <div class="panel"><div class="panel-head"><h2>对账差异</h2><span class="meta">按方向，不相抵；来源缺失显示“未完成”</span></div><div class="table-wrap" style="border:0"><table class="dt"><thead><tr><th>差异</th><th>类型</th><th>差额 (USD)</th><th>状态</th><th>操作</th></tr></thead><tbody>${ADM.recon.filter((d) => d.status !== "已处理").map((d) => `<tr><td class="id">${d.id}</td><td>${d.type}</td><td>${d.diff}</td><td>${d.status}${d.task ? `<span class="sub">任务 ${d.task}</span>` : ""}</td><td>${role() === "fin" ? `<button class="link" data-rt="${d.id}">创建对账任务</button>` : "—"}</td></tr>`).join("")}</tbody></table></div></div></div>`;
      }
      $("#fx").innerHTML = `${snapBar()}<div class="filters"><select class="select" id="rg" aria-label="时间">${RANGES.map((r) => `<option value="${r[0]}" ${S26.range === r[0] ? "selected" : ""}>${r[1]}</option>`).join("")}</select></div><div class="seg" style="margin-bottom:12px">${vs.map((v) => `<button data-v="${v[0]}" aria-pressed="${S26.view === v[0]}">${v[1]}</button>`).join("")}</div>${body}`;
      $("#fx").onchange = (e) => { if (e.target.id === "rg") { S26.range = e.target.value; paint(); } };
      $("#fx").onclick = (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.v) { S26.view = b.dataset.v; paint(); }
        else if (b.dataset.rt) { const d = ADM.recon.find((x) => x.id === b.dataset.rt); if (d.task) { ADM.toast(`对账任务已存在（${d.task}）`); return; } const t = ADM.makeTask({ type: "commission_exception", obj: d.src.split(" ")[1] || "—", ref: d.id, title: `对账差异处理：${d.id}`, team: "结算财务组" }); d.task = t.id; paint(); }
      };
    };
    paint(); bindExport(S26.view === "funds" ? "资金分析" : "质量与资金分析", "分析报表", () => `${RANGES.find((r) => r[0] === S26.range)[1]} · ${allowedViews().find((v) => v[0] === S26.view)[1]}`);
  }

  ADM.pages["report-roi"] = renderBiz;
  ADM.pages["report-quality"] = renderQuality;
})();
