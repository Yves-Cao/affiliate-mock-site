/* CPA 自有数据编辑（合作方 360 / 客户 360 共用）。
   决策（2026-11-20）：CRM 来源的身份、KYC、账户、入金事实只读；CPA 自有字段（信用、风险、资格、归属、有效性、责任人、备注）
   运营与风控均可编辑，原因必填（≥5 字），保存即生效，写入变更记录与审计，不走审批。 */
(function () {
  const ADM = window.ADM, esc = ADM.esc, U = ADM.ui;
  const NOW = "2026-11-19 10:30";
  const role = () => ADM.role().key;
  const cpa = (ADM.cpa = {});
  cpa.can = () => role() === "ops" || role() === "risk";
  cpa.C_SCORE = { C0: 20, C1: 40, C2: 60, C3: 75, C4: 90 };
  cpa.R_SCORE = { R0: 10, R1: 35, R2: 60, R3: 85 };
  cpa.ensurePartner = (p) => {
    if (p.cs == null) p.cs = cpa.C_SCORE[p.c] == null ? null : cpa.C_SCORE[p.c];
    if (p.rs == null) p.rs = cpa.R_SCORE[p.r] == null ? null : cpa.R_SCORE[p.r];
    if (!p.settle) p.settle = p.state === "suspended" ? "受限" : "可结算";
    if (!p.withdraw) p.withdraw = p.state === "suspended" ? "受限" : "可提现";
    if (p.note == null) p.note = "";
    if (!p.edits) p.edits = [];
    return p;
  };
  const ownerOpts = () => Object.keys(ADM.users).filter((u) => ADM.users[u].role === "ops").map((u) => [u, ADM.users[u].name]);
  const show = (f, v) => (v == null || v === "" ? "（空）" : f.opts ? (f.opts.find((o) => o[0] === v) || [0, v])[1] : v + (f.unit || ""));

  /* 通用编辑弹窗 */
  function editor(cfg) {
    const input = (f, i) => {
      const id = "ce" + i, cur = f.cur;
      if (f.type === "select") return `<select class="select" id="${id}" style="width:100%">${f.opts.map((o) => `<option value="${esc(o[0])}" ${o[0] === cur ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>`;
      if (f.type === "text") return `<textarea class="field" id="${id}" rows="2" maxlength="${f.max || 200}" style="width:100%;height:auto;padding:8px 12px">${esc(cur || "")}</textarea>`;
      return `<input class="field" id="${id}" inputmode="numeric" style="width:100%" value="${cur == null ? "" : esc(cur)}" placeholder="${f.min}–${f.max}${f.unit || ""}">`;
    };
    ADM.modal({
      title: cfg.title, wide: true,
      body: `<div class="callout info" style="margin-bottom:12px">${cfg.hint}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 16px">${cfg.fields.map((f, i) => `<div class="form-row" style="margin:0${f.type === "text" ? ";grid-column:1/-1" : ""}"><label for="ce${i}">${f.label}${f.sens ? ' <span class="tag warn">影响结算/提现判断</span>' : ""}</label>${input(f, i)}<div id="ce${i}E" style="color:var(--danger);font-size:12px;min-height:16px"></div>${f.help ? `<div style="font-size:12px;color:var(--muted)">${f.help}</div>` : ""}</div>`).join("")}</div>${U.reasonRow("ceW", "修改原因（必填，至少 5 个字，将写入变更记录与审计）")}`,
      okText: "保存修改",
      onOk: (m) => {
        const nv = {}, ch = []; let bad = false;
        cfg.fields.forEach((f, i) => {
          const el = m.querySelector("#ce" + i), err = m.querySelector("#ce" + i + "E"); err.textContent = "";
          let v = el.value.trim();
          if (f.type === "int") {
            if (v === "") { v = null; } else if (!/^\d+$/.test(v) || +v < f.min || +v > f.max) { err.textContent = `请输入 ${f.min}–${f.max} 的整数`; bad = true; return; } else v = +v;
          }
          if (f.type === "select" && f.cur == null && v === "") v = null;
          nv[f.k] = v;
          if (String(v == null ? "" : v) !== String(f.cur == null ? "" : f.cur)) ch.push({ f, from: f.cur, to: v });
        });
        if (bad) return false;
        const err2 = cfg.validate && cfg.validate(nv, ch);
        if (err2) { m.querySelector("#ceWE").textContent = err2; return false; }
        if (!ch.length) { m.querySelector("#ceWE").textContent = "没有任何字段发生变化，无需保存"; return false; }
        const w = U.needReason(m, "ceW"); if (!w) return false;
        cfg.apply(nv, ch);
        const diffTxt = ch.map((c) => `${c.f.label}：${show(c.f, c.from)} → ${show(c.f, c.to)}`);
        cfg.obj.edits.unshift({ at: NOW, by: ADM.role().userId, role: ADM.role().name, why: w, diff: diffTxt });
        ADM.audit("编辑 CPA 数据", cfg.objLabel, w, { before: ch.map((c) => show(c.f, c.from)).join(" / "), after: ch.map((c) => show(c.f, c.to)).join(" / ") });
        ADM.toast(`已保存 ${ch.length} 项修改，已写入变更记录与审计`);
        cfg.done && cfg.done();
      }
    });
  }

  cpa.history = (obj) => (obj.edits && obj.edits.length
    ? `<ol class="timeline">${obj.edits.map((e) => `<li class="done"><b>${esc(e.diff.join("；"))}</b><span>${e.at} · ${esc(ADM.userName(e.by))}（${esc(e.role)}）</span><span>原因：${esc(e.why)}</span></li>`).join("")}</ol>`
    : '<p style="color:var(--muted)">暂无 CPA 数据修改记录。</p>');

  cpa.editPartner = function (p, done) {
    cpa.ensurePartner(p);
    const C = ["C0", "C1", "C2", "C3", "C4"].map((x) => [x, x]), R = ["R0", "R1", "R2", "R3"].map((x) => [x, x]);
    editor({
      title: `编辑 CPA 数据 · ${p.name}`, obj: p, objLabel: `合作方 ${p.id}`, done,
      hint: "仅 CPA 自有字段可改；KYC、账户、身份等 CRM 来源资料保持只读。保存后立即生效：新值用于之后的结算与提现判断，已生成的案件不会被改写。",
      fields: [
        { k: "c", label: "信用等级 C", type: "select", opts: C, cur: p.c, sens: true },
        { k: "cs", label: "信用分", type: "int", min: 0, max: 100, cur: p.cs, sens: true, help: "0–100，留空表示未评估" },
        { k: "r", label: "风险等级 R", type: "select", opts: R, cur: p.r, sens: true },
        { k: "rs", label: "风险分", type: "int", min: 0, max: 100, cur: p.rs, sens: true, help: "0–100，留空表示未评估" },
        { k: "settle", label: "结算资格", type: "select", opts: [["可结算", "可结算"], ["受限", "受限"]], cur: p.settle, sens: true },
        { k: "withdraw", label: "提现资格", type: "select", opts: [["可提现", "可提现"], ["受限", "受限"]], cur: p.withdraw, sens: true },
        { k: "owner", label: "责任运营", type: "select", opts: ownerOpts(), cur: p.owner },
        { k: "note", label: "备注", type: "text", cur: p.note, max: 200 }
      ],
      validate: (nv) => (nv.cs != null && nv.c && Math.abs(nv.cs - cpa.C_SCORE[nv.c]) > 40 ? "信用分与信用等级明显不匹配，请核对后再保存" : nv.rs != null && nv.r && Math.abs(nv.rs - cpa.R_SCORE[nv.r]) > 40 ? "风险分与风险等级明显不匹配，请核对后再保存" : ""),
      apply: (nv) => { Object.assign(p, nv); }
    });
  };

  cpa.editCustomer = function (c, done) {
    if (!c.edits) c.edits = []; if (c.note == null) c.note = "";
    const partners = [["", "（无）"]].concat(ADM.partners.map((x) => [x.id, `${x.id} ${x.name}`]));
    editor({
      title: `编辑 CPA 数据 · 客户 ${c.id}`, obj: c, objLabel: `客户 ${c.id}`, done,
      hint: "客户身份、注册与入金事实来自 CRM，只读；这里只改 CPA 自有的风险档、有效性、归属与备注。保存后立即生效，不改写已生成的佣金案件。",
      fields: [
        { k: "r", label: "风险档", type: "select", opts: [["", "待评估"], ["R0", "R0"], ["R1", "R1"], ["R2", "R2"], ["R3", "R3"]], cur: c.r, sens: true },
        { k: "life", label: "有效性 / 生命周期", type: "select", opts: ["已注册", "已首次入金", "有效转化", "流失"].map((x) => [x, x]), cur: c.life, sens: true, help: "标记“有效转化”需要有首次入金事实" },
        { k: "partner", label: "归属合作方", type: "select", opts: partners, cur: c.partner || "", sens: true },
        { k: "attr", label: "归属状态", type: "select", opts: ["已锁定", "冲突", "待核验"].map((x) => [x, x]), cur: c.attr, sens: true },
        { k: "note", label: "备注", type: "text", cur: c.note, max: 200 }
      ],
      validate: (nv) => {
        if (nv.life === "有效转化" && !c.ftd) return "该客户没有首次入金事实，不能标记为“有效转化”（未知不等于有效）";
        if (nv.attr === "已锁定" && !nv.partner) return "归属状态为“已锁定”时必须选择归属合作方";
        if (nv.attr === "冲突" && !(c.cands && c.cands.length > 1)) return "没有多个候选合作方，不能标为“冲突”；如需复核请发起归属争议复核任务";
        return "";
      },
      apply: (nv) => {
        const lockNow = nv.attr === "已锁定" && c.attr !== "已锁定";
        Object.assign(c, { r: nv.r || null, life: nv.life, partner: nv.partner || null, attr: nv.attr, note: nv.note });
        if (lockNow) { c.lock = NOW.slice(0, 16); c.cands = undefined; }
      }
    });
  };
})();
