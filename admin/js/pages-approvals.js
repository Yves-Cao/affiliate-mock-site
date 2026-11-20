/* 页面 03 审批队列 */
(function () {
  const ADM = window.ADM, esc = ADM.esc, $ = ADM.$, $$ = ADM.$$;
  const F = { seg: "mine", type: "", status: "", q: "", limit: "", page: 1, size: 20 };
  const NOW = "2026-11-19 10:30";
  const role = () => ADM.role().key, me = () => ADM.role().userId;
  const cur = (a) => a.chain[a.step];
  const visible = (a) => role() === "admin" || a.chain.some((c) => c.role === role()) || a.applicant === me();
  const reviewed = (a) => a.records.some((r) => r.who === ADM.user().name && r.decision === "通过");
  const mine = (a) => a.status === "pending" && cur(a).role === role() && a.applicant !== me() && !reviewed(a);
  const active = (a) => ["pending", "pending_exec", "executing", "exec_failed"].includes(a.status);
  const limitState = (a) => (a.status !== "pending" ? "none" : a.limitH == null ? "unset" : a.waitH > a.limitH ? "over" : a.waitH >= a.limitH * 0.75 ? "soon" : "ok");
  ADM.approvalPendingForMe = () => ADM.approvals.filter(mine).length;
  const person = (u) => (ADM.users[u] ? `${ADM.users[u].name}<span class="sub">${ADM.roles[ADM.users[u].role].name}</span>` : "—");
  const waitCell = (a) => {
    if (a.status !== "pending") return "—";
    const s = limitState(a), t = a.waitH < 1 ? "不足 1 小时" : a.waitH + " 小时";
    return s === "over" ? `<span style="color:var(--danger)">${t}（已超时）</span>` : s === "soon" ? `<span style="color:var(--warning)">${t}</span>` : s === "unset" ? t + '<span class="sub">时限未配置</span>' : t;
  };
  const stTag = (s) => `<span class="tag ${ADM.approvalStatus[s].t}">${ADM.approvalStatus[s].n}</span>`;

  function rows() {
    let r = ADM.approvals.filter(visible);
    if (F.seg === "mine") r = r.filter(mine);
    else if (F.seg === "sub") r = r.filter((a) => a.applicant === me() && active(a));
    else if (F.seg === "done") r = r.filter((a) => !["pending"].includes(a.status));
    if (F.type) r = r.filter((a) => a.type === F.type);
    if (F.status) r = r.filter((a) => a.status === F.status);
    if (F.limit) r = r.filter((a) => limitState(a) === F.limit);
    const q = F.q.trim().toLowerCase();
    if (q) r = r.filter((a) => (a.id + a.obj + a.summary + (ADM.users[a.applicant] || {}).name).toLowerCase().includes(q));
    return r.sort((a, b) => b.waitH - a.waitH);
  }

  function render(main) {
    const segs = [["mine", "待我审批"], ["sub", "我提交的"], ["done", "已处理"]].concat(role() === "admin" ? [["all", "全部可见"]] : []);
    if (!segs.some((s) => s[0] === F.seg)) F.seg = "mine";
    const paint = () => {
      const vis = ADM.approvals.filter(visible), m = vis.filter(mine);
      const stats = [["待我审批", m.length, "mine", ""], ["即将超时", m.filter((a) => limitState(a) === "soon").length, "limit:soon", "待我审批中接近处理时限"], ["已超时", m.filter((a) => limitState(a) === "over").length, "limit:over", "超过时限只提醒与升级，不自动通过"], ["我提交的", vis.filter((a) => a.applicant === me() && active(a)).length, "sub", "我提交且未结束"]];
      const list = rows(), total = list.length, pages = Math.max(1, Math.ceil(total / F.size));
      if (F.page > pages) F.page = pages;
      const view = list.slice((F.page - 1) * F.size, F.page * F.size);
      const opt = (arr, cur, all) => `<option value="">${all}</option>` + arr.map((a) => `<option value="${a[0]}" ${cur === a[0] ? "selected" : ""}>${a[1]}</option>`).join("");
      const chips = [["type", "类型", F.type], ["status", "状态", F.status && ADM.approvalStatus[F.status].n], ["limit", "时限", { soon: "预警", over: "已超时", unset: "未配置" }[F.limit]], ["q", "关键词", F.q]].filter((c) => c[2]).map((c) => `<span class="chip">${c[1]}：${esc(c[2])}<button data-clear="${c[0]}" aria-label="移除${c[1]}">×</button></span>`).join("");
      $("#ap").innerHTML = `<div class="stats">${stats.map((s) => `<button class="stat" data-stat="${s[2]}" aria-pressed="${(s[2] === "mine" && F.seg === "mine" && !F.limit) || (s[2] === "sub" && F.seg === "sub") || s[2] === "limit:" + F.limit}"><div class="name">${s[0]}</div><div class="val num">${s[1]}</div><div class="delta">${s[3] || "&nbsp;"}</div></button>`).join("")}</div>
        <div class="seg" style="margin-bottom:12px" role="group">${segs.map((s) => `<button data-seg="${s[0]}" aria-pressed="${F.seg === s[0]}">${s[1]}</button>`).join("")}</div>
        <div class="filters"><input class="field search" id="aq" placeholder="审批号、对象、申请人" value="${esc(F.q)}" aria-label="关键词">
          <select class="select" id="atype" aria-label="审批类型">${opt(ADM.approvalTypes.map((t) => [t, t]), F.type, "全部类型")}</select>
          <select class="select" id="astatus" aria-label="状态">${opt(Object.keys(ADM.approvalStatus).map((k) => [k, ADM.approvalStatus[k].n]), F.status, "全部状态")}</select>
          <select class="select" id="alimit" aria-label="处理时限">${opt([["soon", "预警"], ["over", "已超时"], ["unset", "未配置"]], F.limit, "全部时限")}</select></div>
        <div class="chips">${chips}${chips ? '<button class="btn sm ghost" data-clearall>清除全部</button>' : ""}</div>
        <div class="table-wrap"><table class="dt" style="min-width:1240px"><thead><tr><th class="fixl">审批号</th><th>类型</th><th>对象</th><th>摘要</th><th class="num">影响金额 (USD)</th><th>申请人</th><th>提交时间</th><th>等待时长</th><th>当前节点</th><th>状态</th><th class="fixr">操作</th></tr></thead><tbody>
        ${view.length ? view.map((a) => `<tr><td class="fixl id"><button class="link" data-open="${a.id}">${a.id}</button></td><td>${a.type}${a.capital ? '<span class="sub">资金类</span>' : ""}</td><td>${esc(a.obj)}</td><td class="ellip" title="${esc(a.summary)}">${esc(a.summary)}</td><td class="num">${a.amt}</td><td>${person(a.applicant)}</td><td>${a.at}</td><td>${waitCell(a)}</td><td>${a.status === "pending" ? esc(cur(a).name) + `（${a.step + 1}/${a.chain.length}）` : "—"}</td><td>${stTag(a.status)}</td><td class="fixr"><div class="rowact">${mine(a) ? `<button class="link" data-open="${a.id}">审批</button>` : `<button class="link" data-open="${a.id}">详情</button>`}${a.status === "pending" && a.applicant === me() ? '<span class="sub" style="display:inline">待他人审批</span>' : ""}</div></td></tr>`).join("")
          : `<tr><td colspan="11"><div class="empty"><b>${chips ? "当前筛选条件下暂无审批事项" : "暂无待审批事项"}</b>${chips ? '<button class="btn" data-clearall>清除全部筛选</button>' : "新的审批申请会出现在这里。"}</div></td></tr>`}
        </tbody></table></div><div class="tfoot"><span>共 ${total} 条 · 本页不提供批量审批</span><div class="pager">${ADM.pager(total, F.page, F.size)}</div></div>`;
    };
    main.innerHTML = `<div class="adm-crumb"><a href="#/admin-workbench">工作台</a><span>/</span><span>审批队列</span></div>
      <div class="adm-pagehead"><div><h1>审批队列</h1><p class="sub">所有审批的统一入口。通过审批不等于已执行，资金与风险动作由领域服务按门禁执行。${role() === "admin" ? "系统管理员只读观察业务审批，无业务终审权。" : ""}</p></div><div class="actions"><button class="btn" id="apRefresh">${ADM.icon("refresh", 'style="width:14px;height:14px"')}刷新</button></div></div><div id="ap"></div>`;
    paint();
    const ap = $("#ap");
    ap.onchange = (e) => { const t = e.target; if (t.id === "atype") F.type = t.value; if (t.id === "astatus") F.status = t.value; if (t.id === "alimit") F.limit = t.value; F.page = 1; paint(); };
    ap.onkeydown = (e) => { if (e.key === "Enter" && e.target.id === "aq") { F.q = e.target.value; F.page = 1; paint(); $("#aq").focus(); } };
    ap.onclick = (e) => {
      const t = e.target.closest("button"); if (!t) return;
      const d = t.dataset;
      if (d.seg) { F.seg = d.seg; F.page = 1; paint(); }
      else if (d.stat) { if (d.stat.startsWith("limit:")) { F.seg = "mine"; F.limit = F.limit === d.stat.slice(6) ? "" : d.stat.slice(6); } else { F.seg = d.stat; F.limit = ""; } F.page = 1; paint(); }
      else if (d.clear) { F[d.clear] = ""; paint(); }
      else if (t.hasAttribute("data-clearall")) { Object.assign(F, { type: "", status: "", q: "", limit: "" }); paint(); }
      else if (d.pg) { F.page = +d.pg; paint(); }
      else if (d.open) openAp(d.open, paint);
    };
    $("#apRefresh").onclick = () => { paint(); ADM.toast("已刷新"); };
    ADM.reloadApprovals = paint;
  }

  /* ---------- 抽屉 ---------- */
  const kv = (rows) => `<dl class="kv kv-2">${rows.map((r) => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join("")}</dl>`;
  function openAp(id, done) {
    const a = ADM.approvals.find((x) => x.id === id); if (!a) return;
    ADM.drawer.open({
      title: `${a.id}　${a.summary}`, sub: `${stTag(a.status)}<span style="margin-left:8px">${a.type}${a.capital ? " · 资金类" : ""}</span>`,
      tabs: [{ key: "a", label: "申请" }, { key: "d", label: "变更与影响" }, { key: "r", label: "审批记录" }, { key: "o", label: "关联对象" }],
      body: (tab) => {
        if (tab === "a") return kv([["申请号", a.id], ["类型", a.type], ["申请人", person(a.applicant)], ["提交时间", a.at], ["对象", esc(a.obj)], ["影响金额 (USD)", a.amt], ["当前节点", a.status === "pending" ? `${esc(cur(a).name)}（${a.step + 1}/${a.chain.length}）` : "—"], ["等待时长", waitCell(a)]]) + `<div class="section"><h4>申请原因</h4><p>${esc(a.reason || "未填写")}</p></div>`;
        if (tab === "d") return `<div class="section"><h4>变更前后</h4>${a.diff.length ? `<div class="table-wrap"><table class="dt"><thead><tr><th>项目</th><th>原值</th><th>新值</th></tr></thead><tbody>${a.diff.map((d) => `<tr><td>${esc(d[0])}</td><td>${esc(d[1])}</td><td><b>${esc(d[2])}</b></td></tr>`).join("")}</tbody></table></div>` : "<p>无参数差异。</p>"}</div><div class="section"><h4>影响范围</h4><p>${esc(a.impact || "—")}</p></div>` + (a.previewValid ? "" : `<div class="callout bad">影响范围已变化，请重新预览后提交。申请人需退回修订，当前不能通过。</div>`) + (a.limitH == null && a.status === "pending" ? '<div class="callout info">该类审批的处理时限未配置，生产值待确认。</div>' : "");
        if (tab === "r") return `<ol class="timeline">${a.records.map((r) => `<li class="done"><b>${esc(r.node)} · ${esc(r.decision)}</b><span>${esc(r.who)}（${r.role}）· ${r.at}${r.self ? " · 自审" : ""}${r.note ? "<br>" + esc(r.note) : ""}</span></li>`).join("")}${a.status === "pending" ? a.chain.slice(a.step).map((c, i) => `<li><b>${esc(c.name)}</b><span>${i === 0 ? "待审批" : "未开始"}（需要角色：${ADM.roles[c.role].name}）</span></li>`).join("") : ""}</ol>`;
        return `<ul style="margin:0;padding-left:18px;line-height:28px">${a.refs.map((x) => `<li>${esc(x)}${/^T-/.test(x) ? ` · <a href="#/tasks?task_id=${x}">打开任务</a>` : ""}</li>`).join("")}</ul><p style="color:var(--muted);font-size:12px">链接按你的权限授权，无权对象不会显示。</p>`;
      },
      foot: () => {
        const b = ['<button class="btn" id="aClose">关闭</button>'];
        if (mine(a)) b.push('<button class="btn" id="aReturn">退回补充</button><button class="btn danger" id="aReject">驳回</button>', `<button class="btn primary" id="aApprove" ${a.previewValid ? "" : 'disabled title="影响范围已变化，请重新预览"'}>通过</button>`);
        else if (a.status === "pending" && a.applicant === me()) { b.push(a.records.length <= 1 ? '<button class="btn" id="aWithdraw">撤回申请</button>' : ""); b.push('<span style="margin-right:auto;color:var(--muted);align-self:center">待他人审批' + (a.capital ? "（资金类不允许自审）" : "") + "</span>"); }
        else if (a.status === "returned" && a.applicant === me()) b.push('<span style="margin-right:auto;color:var(--muted);align-self:center">已退回，补充后可重新提交</span><button class="btn primary" id="aResub">补充并重新提交</button>');
        else if (a.status === "pending") b.push('<span style="margin-right:auto;color:var(--muted);align-self:center">您没有该审批的权限</span>');
        return b.join("");
      },
      bind: (d) => {
        const on = (i, fn) => { const e = d.querySelector("#" + i); if (e) e.onclick = fn; };
        const meName = ADM.user().name, rl = ADM.role().name;
        const task = a.taskId && ADM.tasks.find((t) => t.id === a.taskId);
        const finish = (msg) => { ADM.toast(msg); ADM.refreshNav(); done(); ADM.drawer.paint(); };
        on("aClose", () => ADM.drawer.close());
        on("aWithdraw", () => ADM.modal({ title: "撤回申请", body: "<p>撤回后状态为“已撤回”，来源任务回到处理中。</p>", okText: "确认撤回", onOk: () => { a.status = "withdrawn"; if (a.onRevert) a.onRevert(); if (task) task.state = "processing"; ADM.audit("撤回审批", `${a.type} ${a.obj}`, "申请人撤回", { before: "待审批", after: "已撤回" }); finish(`已撤回审批 ${a.id}`); } }));
        on("aResub", () => ADM.modal({ title: "补充并重新提交", body: '<div class="form-row"><label for="rsN">补充说明（必填，至少 5 个字）</label><textarea class="field" id="rsN" rows="3" style="width:100%;height:auto;padding:8px 12px"></textarea><div id="rsNE" style="color:var(--danger);font-size:12px"></div></div>', okText: "重新提交", onOk: (m) => { const v = m.querySelector("#rsN").value.trim(); if (v.length < 5) { m.querySelector("#rsNE").textContent = "请填写至少 5 个字的补充说明"; return false; } a.records.push({ node: "提交", who: meName, role: rl, decision: "补充后重新提交", note: v, at: NOW }); a.status = "pending"; a.step = 0; a.waitH = 0; if (task) task.state = "pending_approval"; ADM.audit("重新提交审批", `${a.type} ${a.obj}`, v, { before: "已退回", after: "待审批" }); finish(`已重新提交审批 ${a.id}`); } }));
        on("aApprove", () => ADM.modal({
          title: "通过审批", danger: a.capital, body: `<p>${a.step + 1 < a.chain.length ? "通过后进入下一节点：" + esc(a.chain[a.step + 1].name) + "。" : "这是末节点，通过后进入“待执行”，由领域服务执行。"}</p><div class="form-row"><label for="apNote">附言（可选）</label><textarea class="field" id="apNote" rows="3" style="width:100%;height:auto;padding:8px 12px"></textarea></div>`, okText: "确认通过",
          onOk: (m) => {
            a.records.push({ node: cur(a).name, who: meName, role: rl, decision: "通过", note: m.querySelector("#apNote").value.trim(), at: NOW });
            if (a.step + 1 < a.chain.length) a.step++; else { a.status = "pending_exec"; if (task) task.state = "pending_execution"; if (a.onApprove) a.onApprove(); }
            ADM.audit("审批通过", `${a.type} ${a.obj}`, m.querySelector("#apNote").value.trim() || "通过", { before: "待审批", after: a.status === "pending" ? "下一节点" : "待执行" });
            finish(`已通过审批 ${a.id}`);
          }
        }));
        on("aReject", () => ADM.modal({
          title: "驳回审批", danger: true, body: `<p>驳回是业务否决，申请结束，不会解冻、放款或回写。</p><div class="form-row"><label for="apWhy">驳回原因（必填，至少 5 个字）</label><textarea class="field" id="apWhy" rows="3" style="width:100%;height:auto;padding:8px 12px" placeholder="请填写驳回原因（将写入审计）"></textarea><div id="apWhyE" style="color:var(--danger);font-size:12px"></div></div>`, okText: "确认驳回",
          onOk: (m) => {
            const v = m.querySelector("#apWhy").value.trim();
            if (v.length < 5) { m.querySelector("#apWhyE").textContent = "驳回原因至少 5 个字"; return false; }
            a.records.push({ node: cur(a).name, who: meName, role: rl, decision: "驳回", note: v, at: NOW }); a.status = "rejected"; if (a.onReject) a.onReject();
            if (task) task.state = "done";
            ADM.audit("审批驳回", `${a.type} ${a.obj}`, v, { before: "待审批", after: "已驳回" });
            finish(`已驳回审批 ${a.id}`);
          }
        }));
        on("aReturn", () => ADM.modal({
          title: "退回补充", body: `<p>退回不是驳回：申请回到申请人，补充后可再次提交。</p><div class="form-row"><label for="apItems">补充项（必填）</label><textarea class="field" id="apItems" rows="3" style="width:100%;height:auto;padding:8px 12px" placeholder="请列出需要补充的内容"></textarea><div id="apItemsE" style="color:var(--danger);font-size:12px"></div></div>`, okText: "确认退回",
          onOk: (m) => {
            const v = m.querySelector("#apItems").value.trim();
            if (v.length < 5) { m.querySelector("#apItemsE").textContent = "请列出需要补充的内容（至少 5 个字）"; return false; }
            a.records.push({ node: cur(a).name, who: meName, role: rl, decision: "退回补充", note: v, at: NOW }); a.status = "returned";
            if (task) task.state = "returned";
            ADM.audit("退回补充", `${a.type} ${a.obj}`, v, { before: "待审批", after: "已退回" });
            finish(`已退回审批 ${a.id}，等待申请人补充`);
          }
        }));
      }
    });
  }
  ADM.openApproval = openAp;
  ADM.pages["approvals"] = render;
})();
