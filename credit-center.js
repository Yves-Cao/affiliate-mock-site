(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  /* D-CREDIT-04 (2026-11-07 user-confirmed): partner-facing levels are 1-5.
   * Internal keys stay C0-C4 (scheme v1.1); display maps C0->1 ... C4->5.
   * Point progress shows a bar WITHOUT numeric values (points are internal). */
  /* D-CREDIT-13: per-level benefit matrix. Mock values now, admin API later.
   * commission = 佣金加成；guaranteeCut = 保证金减免；holdDays = 保证金结算天数；
   * settleFree = 免结算额度（USD/月）。 */
  const levels = {
    C0: { display: "VIP1", ratio: 0, fixed: 0, label: ["启航合作", "Launch partnership"], guaranteeCut: 0, holdDays: 90, settleFree: 0 },
    C1: { display: "VIP2", ratio: 0.02, fixed: 0, label: ["正常合作", "Normal"], guaranteeCut: 5, holdDays: 75, settleFree: 0 },
    C2: { display: "VIP3", ratio: 0.04, fixed: 0, label: ["稳定合作", "Stable"], guaranteeCut: 10, holdDays: 60, settleFree: 10000 },
    C3: { display: "VIP4", ratio: 0.07, fixed: 0, label: ["优质合作", "Premium"], guaranteeCut: 15, holdDays: 45, settleFree: 50000 },
    C4: { display: "VIP5", ratio: 0.10, fixed: 0, label: ["战略合作", "Strategic"], guaranteeCut: 20, holdDays: 30, settleFree: 200000 }
  };
  const baseSettlementDays = 90;
  const settlementDayReduction = value => Math.max(0, baseSettlementDays - Number(value || 0));
  const order = Object.keys(levels);
  /* D-CREDIT-14: metrics that influence the level score — scope only, no values. */
  const HINT_METRICS = [
    [["客户质量", "有效转化占比、拒付与冲正率"], ["Client quality", "qualified-conversion share, chargeback and reversal rates"]],
    [["业绩规模", "首次入金与有效转化数量、活跃客户数"], ["Volume", "first-deposit and qualified-conversion counts, active clients"]],
    [["合作稳定性", "合作时长、违规事件记录"], ["Stability", "partnership duration, violation records"]],
    [["资料完备度", "KYB认证与财务资料状态"], ["Profile completeness", "KYB and finance info"]],
    [["交易行为", "客户交易活跃度与留存"], ["Trading behavior", "client activity and retention"]]
  ];
  function hintPanelMarkup() {
    const en = AFF.state.language === "en";
    return `<div class="credit-hint-panel" hidden role="tooltip">
      <p class="credit-hint-title">${t("等级由综合信用积分每日重算，以下指标影响积分：", "Level is recalculated daily from a composite credit score. Metrics that affect it:")}</p>
      <ul class="credit-hint-list">${HINT_METRICS.map(([zh, enText]) => { const [name, desc] = en ? enText : zh; return `<li><strong>${h(name)}</strong><span>${h(desc)}</span></li>`; }).join("")}</ul>
      <p class="credit-hint-footer">${t("各指标的权重与升降级阈值由平台配置，达到升级线自动升级。", "Metric weights and thresholds are platform-configured; crossing the upgrade line upgrades automatically.")}</p>
    </div>`;
  }
  function hintTrigger() {
    return `<button type="button" class="credit-hint-trigger" data-credit-hint aria-expanded="false" aria-label="${t("等级提升", "Level up")}">${t("等级提升", "Level up")}</button>`;
  }

  function summary() {
    let level = "C2";
    let reason = t("客户质量与稳定性表现稳定", "Stable client quality and performance");
    let nextStep = t("维持客户质量并降低拒付冲正", "Maintain client quality and reduce chargebacks");
    if (!AFF.state.kybCompleted && AFF.state.onboarding.submitted) {
      reason = t("资料与认证审核中", "Profile and verification reviewing");
      nextStep = t("等待审核完成后进入观察期", "Enter observation after review");
    }
    const simulated = AFF.simulation?.state().credit;
    if (simulated && levels[simulated.level]) {
      level = simulated.level;
      reason = t("模拟信用等级", "Simulated credit level");
    }
    const benefit = levels[level];
    /* Demo progress (mock only): share of the way to the next level's bar.
     * Ordinary pages show bar width only; points stay in the Mock console. */
    const idx = order.indexOf(level);
    const demoProgress = level === "C4" ? 1 : simulated
      ? simulated.points / AFF.simulation.creditPointsPerLevel
      : [0.1, 0.45, 0.1, 0.75, 1][idx];
    return {
      level,
      levelNumber: benefit.display,
      position: t(...benefit.label),
      ratio: benefit.ratio,
      fixed: benefit.fixed,
      reason,
      nextStep,
      progress: demoProgress,
      nextLevel: idx < order.length - 1 ? levels[order[idx + 1]].display : null,
      effectiveAt: simulated?.effectiveAt || AFF.finance.asOf,
      version: AFF.finance.configuration.version,
      stages: [
        ["ftd", t("首次入金段", "首次入金")],
        ["qftd", t("有效转化段", "Qualified conversion")],
        ["quality", t("质量升档", "Quality upgrade")]
      ].map(([key, label]) => ({ key, label, ratio: benefit.ratio, fixed: benefit.fixed }))
    };
  }

  function percent(value) { return `${Math.round(value * 1000) / 10}%`; }
  function fixedAmount(value) { return value ? `$${value.toFixed(2)}` : "$0.00"; }

  const BENEFIT_DEFINITIONS = [
    {
      key: "ratio",
      label: ["佣金加成", "Commission bonus"],
      format: value => `+${percent(value)}`,
      visible: value => Number(value) > 0
    },
    {
      key: "guaranteeCut",
      label: ["保证金减免", "Guarantee reduction"],
      format: value => `-${value}%`,
      visible: value => Number(value) > 0
    },
    {
      key: "holdDays",
      label: ["保证金结算天数减免", "Guarantee settlement-day reduction"],
      format: value => `${settlementDayReduction(value)}${t("天", "d")}`,
      visible: value => settlementDayReduction(value) > 0
    },
    {
      key: "settleFree",
      label: ["免结算额度", "Settlement-free quota"],
      format: value => `$${new Intl.NumberFormat("en-US").format(value)}${t("/月", "/mo")}`,
      visible: value => Number(value) > 0
    }
  ];

  function benefitSummaryMarkup(info) {
    const currentIndex = order.indexOf(info.level);
    // The card only ever summarizes the benefits the partner holds right now (never the next level's),
    // so the numbers cannot be mistaken for what is already earned. The full matrix lives in the modal.
    const cfg = levels[info.level];
    let items = "";
    // VIP1 has no earned benefits yet, so it gets the placeholder below.
    if (currentIndex > 0) {
      items = BENEFIT_DEFINITIONS
        .filter(definition => definition.visible(cfg[definition.key]))
        .map(definition => `<li><span>${h(t(...definition.label))}</span><strong>${h(definition.format(cfg[definition.key]))}</strong></li>`)
        .join("");
    }
    return `<div class="credit-benefit-summary" aria-label="${t("等级权益摘要", "Level benefit summary")}">
      <section class="credit-benefit-group is-current">
        <header><span>${h(t("当前等级权益", "Current-level benefits"))}</span><strong>${h(cfg.display)}</strong></header>
        ${items ? `<ul>${items}</ul>` : `<p class="credit-benefit-empty">${h(t("暂无额外权益，提升等级后解锁", "No extra benefits yet — unlock them by levelling up"))}</p>`}
      </section>
    </div>`;
  }

  /* D-CREDIT-14 (2026-11-07 redesign): deep-blue membership card.
   * Left: current level summary. Right: earned and next-level benefits.
   * Bottom: 5 segmented tier bars (achieved full / current partial / future empty). */
  function dashboardStrip() {
    const info = summary();
    const idx = order.indexOf(info.level);
    const segments = order.map((key, i) => {
      const cfg = levels[key];
      const state = i < idx ? "achieved" : i === idx ? "current" : "future";
      const fill = state === "achieved" ? 100 : state === "current" ? Math.round(info.progress * 100) : 0;
      return `<li class="credit-seg is-${state}" style="--fill:${fill}%" title="${h(t(...cfg.label))}">
        <i class="credit-seg-bar" aria-hidden="true"></i>
        <span class="credit-seg-name">${cfg.display}</span>
      </li>`;
    }).join("");
    return `<section class="card partner-credit-strip" aria-label="${t("信用等级", "Credit level")}">
      <header class="credit-card-top">
        <span class="credit-card-eyebrow">${t("当前信用等级", "Current credit level")}</span>
        <div class="credit-card-top-actions">
          ${hintTrigger()}
        </div>
      </header>
      <div class="credit-card-overview">
        <div class="credit-card-primary">
          <div class="credit-card-main">
            <strong class="credit-card-level" aria-label="${h(levels[info.level].display)}">${levels[info.level].display}</strong>
            <span class="credit-card-title">${h(info.position)}</span>
          </div>
          <p class="credit-card-meta"><button type="button" class="credit-date-help" data-credit-date-hint aria-expanded="false" aria-label="${t("等级计算规则", "Level calculation rules")}">${t("生效", "Effective")} ${h(info.effectiveAt)}</button></p>
          <div class="credit-card-actions">
            <button type="button" class="credit-benefits-trigger" data-credit-benefits>${t("等级权益", "Level benefits")}</button>
          </div>
        </div>
        ${benefitSummaryMarkup(info)}
      </div>
      <ol class="credit-segs" role="img" aria-label="${t("等级进度", "Level progress")}：${levels[info.level].display}">${segments}</ol>
      ${hintPanelMarkup()}
      <div class="credit-hint-panel credit-date-panel" hidden role="tooltip">
        <p class="credit-hint-title">${t("等级计算规则", "Level calculation rules")}</p>
        <p class="credit-hint-footer">${t("等级每90天重新计算，结算期内保持最高等级，超出时间重新根据最近90天内积分计算等级。", "The level is recalculated every 90 days. Your highest level is kept during the settlement period; after that, the level is recalculated from points earned in the most recent 90 days.")}</p>
      </div>
    </section>`;
  }

  /* Benefits modal (D-CREDIT-04): hidden by default, opened via entry points. */
  function benefitsModal(info) {
    /* D-CREDIT-13: full 4-dimension benefit matrix per level.
     * Mock values — swap for the admin API when available. */
    const money = value => value ? `$${new Intl.NumberFormat("en-US").format(value)}` : "—";
    const rows = order.map(key => {
      const cfg = levels[key];
      const current = key === info.level;
      return `<li class="partner-credit-lv ${current ? "is-current" : ""}">
        <span class="partner-credit-lv-head"><b>${cfg.display}</b> ${h(t(...cfg.label))}${current ? `<small>${t("当前", "current")}</small>` : ""}</span>
        <span class="partner-credit-lv-ratio">+${percent(cfg.ratio)}</span>
        <span class="partner-credit-lv-cell">${cfg.guaranteeCut ? `-${cfg.guaranteeCut}%` : "—"}</span>
        <span class="partner-credit-lv-cell">${settlementDayReduction(cfg.holdDays) ? `${settlementDayReduction(cfg.holdDays)}${t("天", "d")}` : "—"}</span>
        <span class="partner-credit-lv-cell">${money(cfg.settleFree)}${cfg.settleFree ? t("/月", "/mo") : ""}</span>
      </li>`;
    }).join("");
    showModal(modalShell(t("等级权益详情", "Level benefit details"), `
      <div class="partner-credit-lvlist" aria-label="${t("全部等级权益对照", "All-level benefit comparison")}">
        <p class="partner-credit-lvlist-caption">${t("全部等级权益对照", "All-level benefit comparison")}<small>${t("示例数值，以平台配置为准；佣金生成时锁定当时权益，等级变化不追溯已生成佣金。", "Sample values, platform config prevails; benefits lock when a commission is generated.")}</small></p>
        <div class="partner-credit-lvlist-head" aria-hidden="true"><span>${t("等级", "Level")}</span><span>${t("佣金加成", "Commission bonus")}</span><span>${t("保证金减免", "Guarantee cut")}</span><span>${t("保证金结算天数减免", "Guarantee settlement-day reduction")}</span><span>${t("免结算额度", "Settlement-free quota")}</span></div>
        <ul>${rows}</ul>
      </div>`, `<button class="button primary" type="button" data-action="close-modal">${t("关闭", "Close")}</button>`), false, t("等级权益详情", "Level benefit details"));
  }

  function accountPanel() {
    const info = summary();
    const idx = order.indexOf(info.level);
    const nodes = order.map((key, i) => {
      const cfg = levels[key];
      const state = i < idx ? "achieved" : i === idx ? "current" : "future";
      return `<li class="is-${state}" title="${h(t(...cfg.label))}"><span class="partner-rail-node">${cfg.display}</span><small>${h(t(...cfg.label))}</small></li>`;
    }).join("");
    return `<section class="account-panel partner-credit-panel">
      <header><h3>${t("信用等级", "Credit level")}</h3><span>${h(info.version)}</span></header>
      <div class="partner-credit-summary">
        <div><span>${t("当前等级", "Level")}</span><strong>${levels[info.level].display} · ${h(info.position)}</strong><small>${t("每日重算后更新", "Updated after daily recalculation")}</small></div>
        <div><span>${t("生效日期", "Effective")}</span><strong>${h(info.effectiveAt)}</strong><small>${t("等级变化不追溯已生成佣金", "No retroactive adjustment")}</small></div>
      </div>
      <div class="partner-credit-head partner-credit-head-panel">
        <span class="partner-credit-caption">${t("等级进度", "Level progress")}</span>
        ${hintTrigger()}
      </div>
      <div class="partner-rail partner-rail-panel" role="img" aria-label="${t("等级进度", "Level progress")}">
        <div class="partner-rail-track"><span style="width:${Math.round(info.progress * 100)}%"></span></div>
        <ul>${nodes}</ul>
      </div>
      <div class="account-actions">
        <button class="button secondary" type="button" data-account-action="credit">${t("等级详情", "Level details")}</button>
        <button class="button secondary" type="button" data-credit-benefits>${t("查看权益", "View benefits")}</button>
      </div>
      ${hintPanelMarkup()}
    </section>`;
  }

  /* Entry points: benefits modal and hint tooltip. */
  document.addEventListener("click", event => {
    const btn = event.target.closest("[data-credit-benefits]");
    if (!btn) return;
    benefitsModal(summary());
  });

  /* D-CREDIT-14: hint tooltip. Panel is position:fixed, placed by AFF.tooltip (D-04).
   * hover/focus shows, leave/blur hides, click toggles (touch), Escape closes. */
  let hintOpen = null;
  function hintPanelOf(trigger) {
    return trigger.closest("section")?.querySelector(trigger.matches("[data-credit-date-hint]") ? ".credit-date-panel" : ".credit-hint-panel:not(.credit-date-panel)") || null;
  }
  function hideHint() {
    if (!hintOpen) return;
    hintOpen.panel.hidden = true;
    hintOpen.trigger.setAttribute("aria-expanded", "false");
    hintOpen = null;
  }
  function showHint(trigger) {
    const panel = hintPanelOf(trigger);
    if (!panel) return;
    if (hintOpen && hintOpen.panel !== panel) hideHint();
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    hintOpen = { panel, trigger };
    AFF.tooltip.position(panel, trigger, { width: 320, align: "right", gap: 8 });
  }
  document.addEventListener("mouseover", event => {
    const trigger = event.target.closest("[data-credit-hint], [data-credit-date-hint]");
    if (trigger && !(hintOpen && hintOpen.trigger === trigger)) showHint(trigger);
  });
  document.addEventListener("mouseout", event => {
    const trigger = event.target.closest("[data-credit-hint], [data-credit-date-hint]");
    if (trigger && !trigger.contains(event.relatedTarget) && document.activeElement !== trigger) hideHint();
  });
  document.addEventListener("focusin", event => {
    const trigger = event.target.closest("[data-credit-hint], [data-credit-date-hint]");
    if (trigger) showHint(trigger);
  });
  document.addEventListener("focusout", event => {
    if (event.target.closest("[data-credit-hint], [data-credit-date-hint]")) hideHint();
  });
  document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-credit-hint], [data-credit-date-hint]");
    if (!trigger) return hideHint();
    if (hintOpen && hintOpen.trigger === trigger && document.activeElement !== trigger) hideHint();
    else showHint(trigger);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && hintOpen) hideHint();
  });
  window.addEventListener("resize", hideHint);

  AFF.creditCenter = { summary, dashboardStrip, accountPanel };
})();
