/* 页面 16 合作方 360（业务状态 4 态：草稿 / 正常 / 暂停 / 已终止；原因用标签表达） */
(function () {
  const ADM = window.ADM, esc = ADM.esc, $ = ADM.$, $$ = ADM.$$;
  const L = { view: "all", q: "", state: "", c: "", r: "", kyc: "", panel: false, page: 1, size: 20 };
  const TABS = [["overview", "概览"], ["promotion", "推广"], ["compliance", "合规与资料"], ["finance", "资金"], ["risk", "风险与信用"], ["follow-up", "跟进"]];
  const stTag = (p) => { const s = ADM.partnerStates[p.state]; return `<span class="tag ${s.tone}">${s.name}</span>` + p.tags.map((x) => `<span class="tag plain pill" style="margin-left:4px;background:var(--surface-muted-1-0)">${x}</span>`).join(""); };
  const bandR = (r) => (r === "—" ? "—" : `<span class="rband ${r.toLowerCase()}">${r}</span>`);
  const bandC = (c) => (c === "—" ? "—" : `<span class="rband c">${c}</span>`);

  function list(main) {
    const role = ADM.role().key, w = ADM.canWrite("partner-list");
    const all = ADM.partners;
    const stat = [["全部", all.length], ["正常", all.filter((p) => p.state === "active").length], ["暂停", all.filter((p) => p.state === "suspended").length], ["草稿（入驻中）", all.filter((p) => p.state === "draft").length], ["已终止", all.filter((p) => p.state === "terminated").length]];
    const paint = () => {
      let rows = all.filter((p) => (L.view === "onboard" ? p.state === "draft" : true));
      const q = L.q.trim().toLowerCase();
      if (q) rows = rows.filter((p) => (p.id + p.name).toLowerCase().includes(q));
      if (L.state) rows = rows.filter((p) => p.state === L.state);
      if (L.c) rows = rows.filter((p) => p.c === L.c);
      if (L.r) rows = rows.filter((p) => p.r === L.r);
      if (L.kyc) rows = rows.filter((p) => p.kyc === L.kyc);
      const total = rows.length, pages = Math.max(1, Math.ceil(total / L.size)); if (L.page > pages) L.page = pages;
      const view = rows.slice((L.page - 1) * L.size, L.page * L.size);
      const onb = L.view === "onboard";
      const opt = (arr, cur, all) => `<option value="">${all}</option>` + arr.map((a) => `<option value="${a[0]}" ${cur === a[0] ? "selected" : ""}>${a[1]}</option>`).join("");
      const chips = [["state", "状态", L.state && ADM.partnerStates[L.state].name], ["c", "信用", L.c], ["r", "风险", L.r], ["kyc", "KYC/KYB", L.kyc], ["q", "关键词", L.q]].filter((c) => c[2]).map((c) => `<span class="chip">${c[1]}：${esc(c[2])}<button data-clear="${c[0]}" aria-label="移除${c[1]}">×</button></span>`).join("");
      $("#pl").innerHTML = `<div class="stats">${stat.map((s) => `<div class="stat"><div class="name">${s[0]}</div><div class="val num">${s[1]}</div></div>`).join("")}</div>
        <div class="seg" style="margin-bottom:12px"><button data-view="all" aria-pressed="${!onb}">全部合作方</button><button data-view="onboard" aria-pressed="${onb}">入驻审核</button></div>
        <div class="filters"><input class="field search" id="pq" placeholder="搜索合作方名称或编号" value="${esc(L.q)}" aria-label="关键词">
          <select class="select" id="pstate" aria-label="状态">${opt(Object.keys(ADM.partnerStates).map((k) => [k, ADM.partnerStates[k].name]), L.state, "全部状态")}</select>
          <select class="select" id="pc" aria-label="信用等级">${opt(["C0", "C1", "C2", "C3", "C4"].map((x) => [x, x]), L.c, "全部信用等级")}</select>
          <select class="select" id="pr" aria-label="风险等级">${opt(["R0", "R1", "R2", "R3"].map((x) => [x, x]), L.r, "全部风险等级")}</select>
          ${role === "risk" || role === "admin" || role === "ops" ? "" : ""}<span style="margin-left:auto;color:var(--muted);font-size:12px">信用 C 等级与风险 R 等级分别计算，不可混用</span></div>
        <div class="chips">${chips}${chips ? '<button class="btn sm ghost" data-clearall>清除全部</button>' : ""}</div>
        <div class="table-wrap"><table class="dt" style="min-width:1080px"><thead><tr><th class="fixl">合作方</th><th>类型 / 地区</th><th>业务状态</th><th>信用 C</th><th>风险 R</th><th>${onb ? "入驻进度" : "KYC/KYB"}</th><th class="num">有效转化</th><th class="num">累计佣金 (USD)</th><th>负责人</th><th class="fixr">操作</th></tr></thead><tbody>
        ${view.length ? view.map((p) => `<tr><td class="fixl"><button class="link" data-go="${p.id}">${esc(p.name)}</button><span class="sub">${p.id}${p.blockers && p.blockers.some((b) => b.s === "blocking") ? ' · <span style="color:var(--danger)">有阻断</span>' : ""}</span></td><td>${p.kind}<span class="sub">${p.country}</span></td><td>${stTag(p)}</td><td>${bandC(p.c)}</td><td>${bandR(p.r)}</td><td>${onb ? esc(p.app || "—") : esc(p.kyc)}</td><td class="num">${p.valid}</td><td class="num">${p.comm}</td><td>${esc(ADM.userName(p.owner))}</td><td class="fixr"><button class="link" data-go="${p.id}">查看</button></td></tr>`).join("") : `<tr><td colspan="10"><div class="empty"><b>${onb ? "没有待审核的入驻申请" : "没有符合条件的合作方"}</b>${chips ? '<button class="btn" data-clearall>清除全部筛选</button>' : "新的入驻申请会出现在这里。"}</div></td></tr>`}
        </tbody></table></div><div class="tfoot"><span>共 ${total} 个</span><div class="pager">${ADM.pager(total, L.page, L.size)}</div></div>`;
    };
    main.innerHTML = `<div class="adm-crumb"><span>合作方</span><span>/</span><span>合作方 360</span></div>
      <div class="adm-pagehead"><div><h1>合作方 360</h1><p class="sub">${w ? "查看合作方全貌，并处理入驻、暂停、恢复等业务动作。" : "当前角色只读：可查看合作方信息，不能修改业务状态。"}</p></div>${w ? '<div class="actions"><button class="btn primary" id="newP">新建入驻申请</button></div>' : ""}</div><div id="pl"></div>`;
    paint();
    const pl = $("#pl");
    pl.onchange = (e) => { const t = e.target; if (t.id === "pstate") L.state = t.value; if (t.id === "pc") L.c = t.value; if (t.id === "pr") L.r = t.value; L.page = 1; paint(); };
    pl.onkeydown = (e) => { if (e.key === "Enter" && e.target.id === "pq") { L.q = e.target.value; L.page = 1; paint(); $("#pq").focus(); } };
    pl.onclick = (e) => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.view) { L.view = t.dataset.view; L.page = 1; paint(); }
      else if (t.dataset.go) ADM.go("partner-360/" + t.dataset.go);
      else if (t.dataset.clear) { L[t.dataset.clear] = ""; paint(); }
      else if (t.hasAttribute("data-clearall")) { Object.assign(L, { q: "", state: "", c: "", r: "", kyc: "" }); paint(); }
      else if (t.dataset.pg) { L.page = +t.dataset.pg; paint(); }
    };
    const nb = $("#newP"); if (nb) nb.onclick = () => ADM.toast("入驻申请表单属于入驻流程页，本批次不生成");
  }

  function detail(main, id, tab) {
    const p = ADM.partners.find((x) => x.id === id);
    if (!p) { main.innerHTML = `<div class="forbidden"><b>找不到合作方 ${esc(id)}</b>该合作方不存在或不在你的可见范围内。<br><a class="btn" style="margin-top:12px" href="#/partner-list">返回合作方列表</a></div>`; return; }
    tab = TABS.some((t) => t[0] === tab) ? tab : "overview";
    ADM.cpa.ensurePartner(p);
    const role = ADM.role().key, w = ADM.canWrite("partner-list"), canCpa = ADM.cpa.can();
    const bl = p.blockers || [];
    const blocker = bl.length ? `<div class="panel" style="margin-bottom:16px"><div class="panel-body" style="padding:10px 16px">${bl.map((b) => `<div style="display:flex;gap:12px;align-items:center;padding:4px 0"><span class="tag ${b.s === "blocking" ? "bad" : b.s === "warning" ? "warn" : "info"}">${{ blocking: "阻断", warning: "注意", info: "提示" }[b.s]}</span><span>${esc(b.t)}</span><a style="margin-left:auto" href="#/partner-360/${p.id}?tab=${b.tab}">去查看</a></div>`).join("")}</div></div>` : "";
    const acts = [];
    if (w && p.state === "active") acts.push('<button class="btn" id="aPause">暂停合作</button>');
    if (canCpa) acts.push('<button class="btn primary" id="aCpa">编辑 CPA 数据</button>');
    if (w && p.state === "suspended" && !p.tags.includes("清退中") && (role === "risk" || !p.tags.some((t) => ["冻结", "观察"].includes(t)))) acts.push('<button class="btn" id="aResume">恢复合作</button>');
    if (w && p.state === "draft") acts.push('<button class="btn primary" id="aReview">处理入驻</button>');
    const kv = (rows) => `<dl class="kv kv-2">${rows.map((r) => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join("")}</dl>`;
    const f = ADM.fmt;
    const elig = (v) => `<span class="tag ${v === "受限" ? "warn" : "ok"}">${v}</span>`;
    const panels = {
      overview: kv([["合作方编号", p.id], ["类型 / 地区", `${p.kind} / ${p.country}`], ["业务状态", stTag(p)], ["信用等级 C", bandC(p.c)], ["风险等级 R", bandR(p.r)], ["KYC/KYB", esc(p.kyc)], ["负责人", esc(ADM.userName(p.owner))], ["有效转化（近 30 天）", p.valid], ["累计佣金 (USD)", p.comm]].concat(role === "fin" ? [["结算资格", elig(p.settle)], ["提现资格", elig(p.withdraw)]] : [["信用分", p.cs == null ? "未评估" : p.cs], ["风险分", p.rs == null ? "未评估" : p.rs], ["结算资格", elig(p.settle)], ["提现资格", elig(p.withdraw)], ["备注", esc(p.note || "—")]])) + `<p style="color:var(--muted);font-size:12px;margin-top:8px">KYC、账户、身份等 CRM 来源资料只读；信用、风险、资格、责任运营、备注为 CPA 自有数据${canCpa ? "，可点“编辑 CPA 数据”修改" : ""}。</p>`,
      promotion: `<div class="callout info">推广数据来自活动与链接、回传与追踪。当前合作方 ${p.valid ? "有" : "暂无"}推广记录。</div>` + kv([["活动数", p.valid ? 3 : 0], ["官方链接", p.valid ? 5 : 0], ["回传状态", bl.some((b) => b.t.includes("回传")) ? '<span class="tag warn">连续失败 3 次</span>' : '<span class="tag ok">正常</span>']]),
      compliance: kv([["KYC/KYB", esc(p.kyc)], ["入驻进度", esc(p.app || "已完成")], ["资料说明", "证件与收款资料仅展示脱敏后的摘要"], ["CRM 同步", p.kyc === "未知" ? '<span class="tag warn">未知，等待 CRM 确认</span>' : '<span class="tag ok">已同步</span>']]) + `<p style="color:var(--muted);font-size:12px">未知表示尚未拿到确认结果，不等于通过或未通过。</p>`,
      finance: role === "ops" ? `<div class="callout info">运营仅查看资金摘要；明细请联系财务。</div>` + kv([["累计佣金 (USD)", p.comm], ["结算状态", p.state === "suspended" ? "结算中 / 受限" : "正常"]]) : kv([["累计佣金 (USD)", p.comm], ["待结算 (USD)", f.usd(parseFloat(p.comm.replace(/,/g, "")) * 0.18)], ["保证金覆盖", '<span style="color:var(--muted)">未知</span>'], ["待追回 (USD)", p.id === "P-10009" ? "5,600.00" : "0.00"]]),
      risk: role === "fin" ? `<div class="callout info">风险与信用明细仅运营、风控可见。你可以看到风险等级与是否有阻断。</div>` + kv([["风险等级 R", bandR(p.r)], ["信用等级 C", bandC(p.c)]]) : kv([["风险等级 R", bandR(p.r)], ["风险分", p.rs == null ? "未评估" : p.rs], ["信用等级 C", bandC(p.c)], ["信用分", p.cs == null ? "未评估" : p.cs], ["近期事件", p.r === "R3" ? "风险占比超阈、日上限熔断" : p.r === "R2" ? "超时冻结信号待复核" : "无"], ["关联任务", ADM.visibleTasks().filter((t) => t.obj === p.id).map((t) => `<a href="#/tasks?task_id=${t.id}">${t.id}</a>`).join("、") || "无"]]),
      "follow-up": `<ol class="timeline">${(p.follows || []).map((x) => `<li class="done"><b>${esc(x.text)}</b><span>${esc(ADM.userName(x.by))} · ${x.at}</span></li>`).join("")}<li class="done"><b>最近跟进</b><span>${esc(ADM.userName(p.owner))} · 2026-11-17</span></li><li class="done"><b>创建合作方档案</b><span>系统</span></li></ol>` + (w ? '<button class="btn" id="addNote">添加跟进记录</button>' : "") + `<h4 style="margin:20px 0 8px">CPA 数据修改记录</h4>${ADM.cpa.history(p)}`
    };
    main.innerHTML = `<div class="adm-crumb"><a href="#/partner-list">合作方 360</a><span>/</span><span>${esc(p.name)}</span></div>
      <div class="adm-pagehead"><div><h1>${esc(p.name)}</h1><p class="sub">${p.id} · ${stTag(p)}</p></div><div class="actions">${acts.join("")}</div></div>
      ${blocker}
      <div class="panel"><div style="padding:0 16px"><div class="tabs" role="tablist">${TABS.map((t) => `<button role="tab" data-tab="${t[0]}" aria-selected="${t[0] === tab}">${t[1]}</button>`).join("")}</div></div><div class="panel-body">${panels[tab]}</div></div>`;
    main.onclick = (e) => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.tab) ADM.go(`partner-360/${p.id}?tab=${t.dataset.tab}`);
      else if (t.id === "aPause") ADM.modal({ title: "暂停合作", danger: true, body: `<p>暂停后 ${esc(p.name)} 的链接停止计费推广，结算按规则继续。</p><div class="form-row"><label for="pw">原因（必填）</label><textarea class="field" id="pw" rows="3" style="width:100%;height:auto;padding:8px 12px"></textarea><div id="pwE" style="color:var(--danger);font-size:12px"></div></div>`, okText: "确认暂停", onOk: () => { const v = $("#pw").value.trim(); if (v.length < 5) { $("#pwE").textContent = "请填写至少 5 个字的暂停原因"; return false; } p.state = "suspended"; if (!p.tags.includes("人工暂停")) p.tags.push("人工暂停"); ADM.audit("暂停合作", `合作方 ${p.id}`, v, { before: "正常", after: "暂停" }); ADM.toast("已暂停合作"); detail(main, id, tab); } });
      else if (t.id === "aCpa") ADM.cpa.editPartner(p, () => detail(main, id, tab));
      else if (t.id === "aResume") ADM.modal({ title: "恢复合作", body: `<p>恢复后合作方回到“正常”状态。</p><div class="form-row"><label for="rw">恢复原因（必填，至少 5 个字）</label><textarea class="field" id="rw" rows="3" style="width:100%;height:auto;padding:8px 12px"></textarea><div id="rwE" style="color:var(--danger);font-size:12px"></div></div>`, okText: "确认恢复", onOk: () => { const v = $("#rw").value.trim(); if (v.length < 5) { $("#rwE").textContent = "请填写至少 5 个字的恢复原因"; return false; } p.state = "active"; p.tags = []; ADM.audit("恢复合作", `合作方 ${p.id}`, v, { before: "暂停", after: "正常" }); ADM.toast("已恢复合作"); detail(main, id, tab); } });
      else if (t.id === "aReview") ADM.toast("入驻审批表单属于入驻流程页，本批次不生成");
      else if (t.id === "addNote") ADM.modal({ title: "添加跟进记录", body: `<div class="form-row"><label for="nt">跟进内容（必填，至少 5 个字）</label><textarea class="field" id="nt" rows="3" style="width:100%;height:auto;padding:8px 12px"></textarea><div id="ntE" style="color:var(--danger);font-size:12px"></div></div>`, okText: "保存记录", onOk: () => { const v = $("#nt").value.trim(); if (v.length < 5) { $("#ntE").textContent = "请填写至少 5 个字"; return false; } (p.follows = p.follows || []).unshift({ at: "2026-11-19 10:30", by: ADM.role().userId, text: v }); ADM.audit("添加跟进记录", `合作方 ${p.id}`, v); ADM.toast("跟进记录已保存"); detail(main, id, tab); } });
    };
  }

  ADM.pages["partner-list"] = function (main, r) {
    if (r.key === "partner-360" && r.params[0]) detail(main, r.params[0], r.query.tab);
    else list(main);
  };
})();
