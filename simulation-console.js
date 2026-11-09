(() => {
  const root = document.getElementById("simulation-console-root");
  const launcher = document.getElementById("simulation-toggle");
  let open = false;
  let tab = "time";
  let recordDraft = null;
  let violationDraft = null;
  let importText = "";
  let error = "";

  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

  function defaults() {
    const date = AFF.simulation.date();
    return {
      record: {
        date, country: "VN", platform: "Web", campaignCode: "CMP-1001", campaign: "秋季交易指南",
        source: "Simulation", kyc: "通过", milestone: "effective", ftdAmount: 500,
        netDeposit: 800, volume: 3, tradingDays: 5, subId: "simulation_entry"
      },
      violation: { targetId: "", type: "false_traffic", occurredAt: date, reason: "", evidenceScope: "", allowAppeal: true }
    };
  }

  function scenarios() {
    return [
      ["normal-flow", "正常流", "恢复默认演示链路"],
      ["closure-flow", "合作清退", "链接下线并暂停新提现"],
      ["loading-flow", "加载中", "显示稳定骨架屏"],
      ["empty-state", "空态", "展示无数据状态"],
      ["api-error", "API异常", "展示错误码、TraceId和重试"]
    ];
  }

  function summaryDelta() {
    const state = AFF.simulation.state();
    if (!state.previousSummary) return "";
    const before = state.previousSummary.summary;
    const after = AFF.finance.summary();
    const fields = [["expected", "佣金总额"], ["held", "结算中金额"], ["guarantee", "保证金"], ["available", "可提现"], ["rejected", "拒绝佣金"], ["reversed", "冲正金额"]];
    const rows = fields.map(([key, label]) => ({ label, before: before?.[key] || 0, after: after[key] || 0, delta: Number(((after[key] || 0) - (before?.[key] || 0)).toFixed(2)) }));
    return `<section class="sim-summary">
      <h3>${t("时间推进结果", "Time advance result")}</h3>
      <p>${state.previousSummary.date} → ${state.previousSummary.targetDate} · +${state.previousSummary.days}${t("天", "days")}</p>
      <dl>${rows.map(row => `<div><dt>${row.label}</dt><dd>${money(row.before)} → ${money(row.after)} <b>${row.delta >= 0 ? "+" : ""}${money(row.delta)}</b></dd></div>`).join("")}</dl>
    </section>`;
  }

  function timePanel() {
    return `${summaryDelta()}<section class="sim-section">
      <h3>${t("模拟时间", "Mock time")}</h3>
      <p>当前Mock日期：<b>${AFF.simulation.date()}</b></p>
      <div class="sim-time-actions">${[1, 7, 30].map(days => `<button type="button" data-sim-advance="${days}">+${days}${t("天", "d")}</button>`).join("")}</div>
      <form data-sim-time-form><label><span>${t("自定义天数", "Custom days")}</span><input type="number" min="1" max="180" value="1" data-sim-days></label><button type="submit" class="button primary">${t("推进时间", "Advance")}</button></form>
      <p>${t("时间推进会重放数据管道：动态结算、保证金、结算周期、提现和申诉阶段同步更新。人工任务不会自动通过。", "Time advance replays the data pipeline: dynamic hold, guarantee, settlement periods, withdrawals, and appeal stages update together. Manual tasks do not auto-pass.")}</p>
    </section>`;
  }

  function recordPanel() {
    const draft = recordDraft ||= { ...defaults().record };
    const campaigns = AFF.campaigns.map(item => [item.code, AFF.dataText(item.name)]);
    return `<section class="sim-section"><h3>${t("录入仿真客户", "Add synthetic client")}</h3>
      <form data-sim-record-form>
        <label><span>${t("事件日期", "Event date")}</span><input type="date" max="${AFF.simulation.date()}" data-sim-record="date" value="${h(draft.date)}"></label>
        <label><span>${t("国家/地区", "Country / region")}</span><input data-sim-record="country" value="${h(draft.country)}"></label>
        <label><span>${t("平台", "Platform")}</span><select data-sim-record="platform">${["Web", "Android", "iOS"].map(value => `<option ${value === draft.platform ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <label><span>${t("活动", "Campaign")}</span><select data-sim-record="campaignCode">${campaigns.map(([code, name]) => `<option value="${h(code)}" ${code === draft.campaignCode ? "selected" : ""}>${h(name)} · ${h(code)}</option>`).join("")}</select></label>
        <label><span>${t("来源", "Source")}</span><input data-sim-record="source" value="${h(draft.source)}"></label>
        <label><span>${t("KYC", "KYC")}</span><select data-sim-record="kyc">${["通过", "审核中", "未提交", "失败"].map(value => `<option ${value === draft.kyc ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <label><span>${t("转化阶段", "Milestone")}</span><select data-sim-record="milestone">${[["registered", "注册"], ["ftd", "FTD"], ["effective", "有效FTD"], ["quality", "质量服务"]].map(([value, label]) => `<option value="${value}" ${value === draft.milestone ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        <label><span>${t("首次入金", "FTD amount")}</span><input type="number" min="0" step="50" data-sim-record="ftdAmount" value="${h(draft.ftdAmount)}"></label>
        <label><span>${t("净入金", "Net deposit")}</span><input type="number" min="0" step="50" data-sim-record="netDeposit" value="${h(draft.netDeposit)}"></label>
        <label><span>${t("交易量（手）", "Volume")}</span><input type="number" min="0" step="0.1" data-sim-record="volume" value="${h(draft.volume)}"></label>
        <label><span>${t("交易日", "Trading days")}</span><input type="number" min="0" data-sim-record="tradingDays" value="${h(draft.tradingDays)}"></label>
        <label><span>${t("Sub ID", "Sub ID")}</span><input data-sim-record="subId" value="${h(draft.subId)}"></label>
        <button type="submit" class="button primary">${t("录入并重放", "Add and replay")}</button>
      </form><p>${t("生成对象使用SIM前缀，邮箱始终脱敏；本入口不采集真实个人隐私。", "Generated objects use the SIM prefix and masked emails. This entry does not collect real personal privacy data.")}</p>
    </section>`;
  }

  function violationPanel() {
    const draft = violationDraft ||= { ...defaults().violation };
    const types = [["fraud_hit", "欺诈库命中"], ["identity_duplicate", "重复身份"], ["non_new_customer", "非新客户"], ["prohibited_region", "禁推地区"], ["chargeback", "支付拒付"], ["payment_abnormal", "支付异常"], ["false_traffic", "虚假流量"], ["brand_bidding", "品牌词违规竞价"], ["self_referral", "自荐或亲属注册"], ["material_violation", "素材违规"], ["cluster_risk", "集群风险"]];
    return `<section class="sim-section"><h3>${t("注入违规事件", "Inject violation event")}</h3>
      <form data-sim-violation-form>
        <label><span>${t("目标客户ID", "Target client ID")}</span><input data-sim-violation="targetId" value="${h(draft.targetId)}" placeholder="${t("留空自动生成SIM客户", "Leave empty to generate a SIM client")}"></label>
        <label><span>${t("违规类型", "Violation type")}</span><select data-sim-violation="type">${types.map(([value, label]) => `<option value="${value}" ${value === draft.type ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        <label><span>${t("发生日期", "Occurred at")}</span><input type="date" max="${AFF.simulation.date()}" data-sim-violation="occurredAt" value="${h(draft.occurredAt)}"></label>
        <label><span>${t("原因说明", "Reason")}</span><textarea rows="3" data-sim-violation="reason">${h(draft.reason)}</textarea></label>
        <label><span>${t("证据范围", "Evidence scope")}</span><input data-sim-violation="evidenceScope" value="${h(draft.evidenceScope)}"></label>
        <label class="sim-check"><input type="checkbox" data-sim-violation-check="allowAppeal" ${draft.allowAppeal ? "checked" : ""}><span>${t("允许申诉", "Allow appeal")}</span></label>
        <button type="submit" class="button primary">${t("注入并自动联动", "Inject and link")}</button>
      </form><p>${t("事件将按模拟状态机自动更新客户、佣金、资金原因、消息与申诉；不暴露内部评分、阈值或完整证据。", "Events automatically update client, commission, fund reasons, messages, and appeals through the simulated state machine. Internal scores, thresholds, and full evidence stay hidden.")}</p>
    </section>`;
  }

  function scenarioPanel() {
    return `<section class="sim-section"><h3>${t("一键场景", "Scenarios")}</h3><div class="sim-scenarios">${scenarios().map(([id, zh, en]) => `<button type="button" class="${AFF.state.scenario === id ? "active" : ""}" data-sim-scenario="${id}"><strong>${zh}</strong><span>${en}</span></button>`).join("")}</div></section>`;
  }

  function dataPanel() {
    const state = AFF.simulation.state();
    return `<section class="sim-section"><h3>${t("数据管理", "Data management")}</h3>
      <dl class="sim-state"><div><dt>${t("Mock日期")}</dt><dd>${state.date}</dd></div><div><dt>${t("仿真客户")}</dt><dd>${state.records.length}</dd></div><div><dt>${t("违规事件")}</dt><dd>${state.violations.length}</dd></div><div><dt>${t("操作日志")}</dt><dd>${state.logs.length}</dd></div></dl>
      <div class="sim-actions-row"><button type="button" data-sim-copy-snapshot>${t("复制快照", "Copy snapshot")}</button><button type="button" data-sim-download-snapshot>${t("下载快照", "Download snapshot")}</button></div>
      <label><span>${t("导入快照JSON", "Import snapshot JSON")}</span><textarea rows="7" data-sim-import>${h(importText)}</textarea></label>
      <button type="button" data-sim-import-snapshot>${t("导入并重放", "Import and replay")}</button>
      <button type="button" class="danger" data-sim-reset>${t("重置模拟环境", "Reset mock environment")}</button>
      <p>${t("重置仅恢复初始Mock日期（2026-10-27）与正常流场景；仿真客户、违规事件和操作日志全部保留，可继续查看。", "Reset only restores the initial mock date (2026-10-27) and the normal-flow scenario. Synthetic clients, violations, and logs are all kept for continued review.")}</p>
    </section>`;
  }

  function logPanel() {
    const logs = AFF.simulation.state().logs;
    return `<section class="sim-section"><h3>${t("操作日志", "Operation log")}</h3>${logs.length ? `<ol>${logs.map(item => `<li><strong>${item.action}</strong><span>${item.operatedAt.replace("T", " ").slice(0, 19)}</span><p>${h(item.detail)}</p></li>`).join("")}</ol>` : `<p>${t("暂无操作日志")}</p>`}</section>`;
  }

  function render() {
    launcher.setAttribute("aria-expanded", String(open));
    if (!open) {
      root.innerHTML = "";
      return;
    }
    const tabs = [["time", "时间"], ["record", "录入"], ["violation", "违规"], ["scenario", "场景"], ["data", "数据"], ["log", "日志"]];
    root.innerHTML = `<div class="aff-drawer-overlay aff-drawer-overlay--top" data-sim-close></div><aside class="aff-drawer aff-drawer--compact sim-drawer" role="dialog" aria-modal="true" aria-labelledby="simulation-title">
      <header><div><h2 id="simulation-title">${t("模拟控制台", "Simulation console")}</h2><span>${t("Mock演示 · 不代表生产参数", "Mock demo · not production parameters")}</span></div><button type="button" data-sim-close aria-label="${t("关闭", "Close")}">×</button></header>
      <div class="sim-tabs" role="tablist" aria-label="模拟控制台页签">${tabs.map(([id, label]) => `<button type="button" class="${tab === id ? "active" : ""}" data-sim-tab="${id}">${label}</button>`).join("")}</div>
      <div class="sim-body">${error ? `<p class="sim-error" role="alert">${h(error)}</p>` : ""}${tab === "time" ? timePanel() : ""}${tab === "record" ? recordPanel() : ""}${tab === "violation" ? violationPanel() : ""}${tab === "scenario" ? scenarioPanel() : ""}${tab === "data" ? dataPanel() : ""}${tab === "log" ? logPanel() : ""}</div>
      <footer><button type="button" class="button secondary" data-sim-close>${t("关闭", "Close")}</button></footer>
    </aside>`;
    root.querySelector("[data-sim-close]")?.focus();
  }

  function replay() {
    sessionStorage.setItem("affiliate-simulation-console-open", "1");
    location.reload();
  }

  function submitRecord(event) {
    event.preventDefault();
    const draft = recordDraft;
    if (!draft.date || draft.date > AFF.simulation.date()) {
      error = "事件日期不能晚于当前Mock日期。";
      return render();
    }
    const campaign = AFF.campaigns.find(item => item.code === draft.campaignCode) || AFF.campaigns[0];
    const sequence = AFF.simulation.state().records.length + 1;
    const milestone = draft.milestone;
    AFF.simulation.addRecord({
      date: draft.date, clientId: `SIM-C-${String(10000 + sequence)}`, email: "s***@example.com",
      country: draft.country, platform: draft.platform, campaignCode: campaign.code, campaign: AFF.dataText(campaign.name),
      source: draft.source, kyc: draft.kyc, ftd: ["ftd", "effective", "quality"].includes(milestone),
      effective: ["effective", "quality"].includes(milestone) && draft.kyc === "通过", quality: milestone === "quality" && draft.kyc === "通过",
      ftdAmount: Number(draft.ftdAmount) || 0, netDeposit: Number(draft.netDeposit) || 0, volume: Number(draft.volume) || 0,
      tradingDays: Number(draft.tradingDays) || 0, subId: draft.subId
    });
    replay();
  }

  function submitViolation(event) {
    event.preventDefault();
    const draft = violationDraft;
    if (!draft.occurredAt || draft.occurredAt > AFF.simulation.date()) {
      error = "违规发生日期不能晚于当前Mock日期。";
      return render();
    }
    let targetId = draft.targetId.trim();
    if (targetId && !AFF.reporting.rows.some(row => row.clientId === targetId)) {
      error = `未找到目标客户：${targetId}`;
      return render();
    }
    if (!targetId) {
      const sequence = AFF.simulation.state().records.length + 1;
      targetId = `SIM-RISK-${String(10000 + sequence)}`;
      AFF.simulation.addRecord({
        date: draft.occurredAt, clientId: targetId, email: "r***@example.com", country: "VN", platform: "Web",
        campaignCode: AFF.campaigns[0].code, campaign: AFF.dataText(AFF.campaigns[0].name), source: "Violation simulation",
        kyc: "通过", ftd: true, effective: true, quality: false, ftdAmount: 800, netDeposit: 800, volume: 3,
        tradingDays: 5, subId: "violation_simulation"
      });
    }
    AFF.simulation.addViolation({ ...draft, targetId, category: ({ fraud_hit: "欺诈库命中", identity_duplicate: "重复身份", non_new_customer: "非新客户", prohibited_region: "禁推地区", chargeback: "支付拒付", payment_abnormal: "支付异常", false_traffic: "虚假流量", brand_bidding: "品牌词违规竞价", self_referral: "自荐或亲属注册", material_violation: "素材违规", cluster_risk: "集群风险" })[draft.type] });
    replay();
  }

  launcher.addEventListener("click", () => { open = true; error = ""; render(); });
  root.addEventListener("click", event => {
    const tabButton = event.target.closest("[data-sim-tab]");
    if (tabButton) {
      tab = tabButton.dataset.simTab;
      return render();
    }
    if (event.target.closest("[data-sim-close]")) {
      open = false; sessionStorage.removeItem("affiliate-simulation-console-open"); return render();
    }
    const advance = event.target.closest("[data-sim-advance]");
    if (advance) { AFF.simulation.advanceDays(Number(advance.dataset.simAdvance), AFF.finance.summary()); return replay(); }
    const scenario = event.target.closest("[data-sim-scenario]");
    if (scenario) {
      const id = scenario.dataset.simScenario;
      AFF.simulation.setScenario(id); AFF.state.scenario = id; persist(); return render();
    }
    if (event.target.closest("[data-sim-copy-snapshot]")) { try { navigator.clipboard.writeText(AFF.simulation.exportSnapshot()); showToast("模拟数据快照已复制"); } catch { showToast("剪贴板不可用"); } }
    if (event.target.closest("[data-sim-download-snapshot]")) {
      const blob = new Blob([AFF.simulation.exportSnapshot()], { type: "application/json" });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `affiliate-simulation-${AFF.simulation.date()}.json`; link.click(); URL.revokeObjectURL(link.href);
    }
    if (event.target.closest("[data-sim-import-snapshot]")) {
      try { AFF.simulation.importSnapshot(importText); replay(); } catch (parseError) { error = `快照导入失败：${parseError.message}`; render(); }
    }
    if (event.target.closest("[data-sim-reset]")) {
      // D-08: window.confirm replaced by an in-UI two-step confirmation.
      const btn = event.target.closest("[data-sim-reset]");
      if (btn.dataset.confirming === "1") {
        delete btn.dataset.confirming;
        AFF.simulation.reset(); replay();
      } else {
        btn.dataset.confirming = "1";
        btn.dataset.label = btn.textContent;
        btn.textContent = "再次点击确认重置";
        setTimeout(() => { if (btn.dataset.confirming === "1") { delete btn.dataset.confirming; btn.textContent = btn.dataset.label; } }, 3000);
      }
    }
  });
  root.addEventListener("submit", event => {
    if (event.target.matches("[data-sim-time-form]")) {
      event.preventDefault(); const days = Number(root.querySelector("[data-sim-days]")?.value) || 1;
      AFF.simulation.advanceDays(days, AFF.finance.summary()); return replay();
    }
    if (event.target.matches("[data-sim-record-form]")) return submitRecord(event);
    if (event.target.matches("[data-sim-violation-form]")) return submitViolation(event);
  });
  root.addEventListener("input", event => {
    const recordField = event.target.closest("[data-sim-record]");
    const violationField = event.target.closest("[data-sim-violation]");
    const importField = event.target.closest("[data-sim-import]");
    if (recordField) recordDraft[recordField.dataset.simRecord] = recordField.value;
    if (violationField) violationDraft[violationField.dataset.simViolation] = violationField.value;
    if (importField) importText = importField.value;
  });
  root.addEventListener("change", event => {
    const check = event.target.closest("[data-sim-violation-check]");
    if (check) violationDraft[check.dataset.simViolationCheck] = check.checked;
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && open) { open = false; sessionStorage.removeItem("affiliate-simulation-console-open"); render(); launcher.focus(); }
  });
  if (sessionStorage.getItem("affiliate-simulation-console-open") === "1") { open = true; render(); }
})();
