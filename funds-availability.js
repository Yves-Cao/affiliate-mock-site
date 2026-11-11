(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  function commissionCases() {
    return AFF.reporting.rows
      .filter(row => row.clientId)
      .flatMap(row => (row.commissionCases || []).map(item => ({ ...item, client: row })));
  }

  function sumCases(cases) {
    return Number(cases.reduce((sum, item) => sum + item.amountCents / 100, 0).toFixed(2));
  }

  function earliest(cases, key = "theoreticalReleaseAt") {
    return cases.map(item => item[key]).filter(Boolean).sort((left, right) => left.localeCompare(right))[0] || "-";
  }

  function releaseStage(cases, key = "theoreticalReleaseAt") {
    const future = cases.filter(item => item[key] && item[key] > AFF.reporting.now);
    if (future.length) return `${t("最早预计", "Earliest estimate")} ${earliest(future, key)}`;
    return t("已超过原预计日期，等待复核", "Past the original estimate; awaiting review");
  }

  function reasonRows() {
    const cases = commissionCases();
    const finance = AFF.finance.summary();
    const held = cases.filter(item => ["held", "pending"].includes(item.status));
    const manual = cases.filter(item => item.status === "manual_review" || item.status === "frozen");
    const investigating = cases.filter(item => item.client.riskHandlingStatus === "investigating");
    const quarantined = cases.filter(item => item.client.riskHandlingStatus === "quarantined");
    const retainedGuarantee = AFF.finance.guaranteeRecords.filter(item => ["retained", "frozen"].includes(item.status));
    const rows = [];
    const push = row => { if (row.active) rows.push(row); };

    push({ id: "investigation", order: 1, group: t("待复核", "Pending review"), label: t("调查中", "Investigation"), amount: sumCases(investigating), time: t("材料补充与人工复核", "Evidence and manual review"), impact: `${investigating.length} ${t("个佣金对象", "commission objects")}`, next: t("查看消息并补充材料", "Check messages and add evidence"), route: "messages", active: investigating.length > 0 });
    push({ id: "quarantine", order: 2, group: t("待复核", "Pending review"), label: t("隔离中", "Quarantined"), amount: sumCases(quarantined), time: t("隔离复核阶段", "Quarantine review"), impact: `${quarantined.length} ${t("个佣金对象", "commission objects")}`, next: t("查看申诉或消息", "View appeals or messages"), route: "appeals", active: quarantined.length > 0 });
    push({ id: "manual-review", order: 3, group: t("待复核", "Pending review"), label: t("人工复核", "Manual review"), amount: sumCases(manual), time: t("等待复核结论", "Awaiting review"), impact: `${manual.length} ${t("个佣金对象", "commission objects")}`, next: t("查看关联对象", "View related objects"), route: "pay", active: manual.length > 0 });
    push({ id: "kyc", order: 4, group: t("待补齐", "Information required"), label: t("KYC/KYB未完成", "KYC/KYB incomplete"), amount: null, time: t("资料完成度待确认", "Profile completeness pending"), impact: t("新提现申请", "New withdrawal requests"), next: t("前往个人中心", "Go to personal center"), route: "account", active: !AFF.state.kybCompleted });
    push({ id: "payout-account", order: 5, group: t("待补齐", "Information required"), label: t("收款账户未验证", "Payout account unverified"), amount: null, time: t("收款资料待复核", "Payout profile pending"), impact: t("新提现申请", "New withdrawal requests"), next: t("前往财务税务", "Go to finance profile"), route: "account", active: !AFF.state.kybCompleted });
    push({ id: "tax-profile", order: 6, group: t("待补齐", "Information required"), label: t("税务资料未验证", "Tax profile unverified"), amount: null, time: t("税务资料待复核", "Tax profile pending"), impact: t("新提现申请", "New withdrawal requests"), next: t("前往财务税务", "Go to finance profile"), route: "account", active: !AFF.state.kybCompleted });
    push({ id: "dynamic-hold", order: 7, group: t("待释放", "Pending release"), label: t("动态Hold", "Dynamic hold"), amount: sumCases(held), time: releaseStage(held), impact: `${held.length} ${t("个佣金对象", "commission objects")}`, next: t("查看佣金详情", "View commission details"), route: "pay", active: held.length > 0 });
    push({ id: "guarantee", order: 8, group: t("待释放", "Pending release"), label: t("滚动保证金", "Rolling guarantee"), amount: finance.guarantee, time: releaseStage(retainedGuarantee, "estimatedReleaseAt"), impact: `${retainedGuarantee.length} ${t("条保留记录", "retained records")}`, next: t("查看保证金", "View guarantee"), route: "guarantee", active: retainedGuarantee.length > 0 });
    push({ id: "negative-balance", order: 9, group: t("待处理", "Processing"), label: t("挂负余额", "Negative balance"), amount: Math.abs(finance.available), time: t("抵扣或补足阶段", "Offset or repayment"), impact: t("合作方账户", "Partner account"), next: t("查看资金详情", "View fund details"), route: "pay", active: finance.available < 0 });
    return rows.sort((left, right) => left.order - right.order);
  }

  function untriggeredReasons(activeRows = []) {
    const activeIds = new Set(activeRows.map(row => row.id));
    return [
      { id: "quantity-cap", text: t("数量上限未触发", "Quantity cap not triggered") },
      { id: "fuse", text: t("熔断未触发", "Fuse not triggered") },
      { id: "critical-event-gap", text: t("关键事件缺数未触发", "No critical event gap") },
      { id: "manual-review", text: t("人工复核已闭环", "Manual review closed") },
      { id: "risk-review", exclude: ["investigation", "quarantine"], text: t("调查与隔离已解除", "Investigation and quarantine released") }
    ].filter(item => !activeIds.has(item.id) && !(item.exclude || []).some(id => activeIds.has(id))).map(item => item.text);
  }

  function data() {
    const finance = AFF.finance.summary();
    const reasons = reasonRows();
    return {
      finance,
      reasons,
      processing: Number((finance.held + finance.guarantee).toFixed(2)),
      mainReason: reasons[0]?.label || t("无待处理原因", "No pending reason"),
      generatedAvailable: Number((finance.available + finance.paid).toFixed(2))
    };
  }

  function walletSummary() {
    const info = data();
    return {
      available: info.finance.available,
      availableCommission: info.finance.availableCommission,
      availableGuarantee: info.finance.availableGuarantee,
      totalRevenue: info.finance.totalRevenue,
      inSettlement: info.finance.held,
      processing: info.processing,
      mainReason: info.mainReason
    };
  }

  function full(context = "pay") {
    const info = data();
    const finance = info.finance;
    const titles = { pay: t("收益到可提现的完整路径", "From earnings to available funds"), wd: t("提现前资金检查", "Pre-withdrawal fund checks") };
    const scope = context === "pay"
      ? t("账户全量口径；不随佣金流水筛选变化。", "Account-wide totals; independent of commission-record filters.")
      : t("账户全量口径；金额与佣金、保证金、提现同源。", "Account-wide totals shared with commissions, guarantee, and withdrawals.");
    const waterfall = [
      [t("佣金总额", "Gross commission"), finance.expected, "total"],
      [t("拒绝佣金", "Rejected"), -finance.rejected, "minus"],
      [t("冲正金额", "Reversed"), -finance.reversed, "minus"],
      [t("动态Hold", "Dynamic hold"), -finance.held, "minus"],
      [t("结算税费", "Tax"), -finance.tax, "minus"],
      [t("保证金扣留", "Guarantee retained"), -finance.guarantee, "minus"],
      [t("可提现已生成", "Available generated"), info.generatedAvailable, "total"],
      [t("已支付", "Paid"), -finance.paid, "minus"],
      [t("当前可提现", "Current available"), finance.available, "result"]
    ];
    return `<section class="card funds-availability" data-funds-context="${h(context)}" aria-label="${h(titles[context] || titles.pay)}">
      <div class="funds-header"><div><h2>${h(titles[context] || titles.pay)}</h2><span>${h(scope)}</span></div><span class="tag tag-info">USD</span></div>
      <div class="funds-cards">
        <article><span>${t("当前可提现", "Current available")}</span><strong>${money(finance.available)}</strong><small>${t("可立即申请提现", "Available now")}</small></article>
        <article><span>${t("待释放 / 待复核", "Pending release / review")}</span><strong>${money(info.processing)}</strong><small>${h(info.mainReason)}</small></article>
        <article><span>${t("滚动保证金", "Rolling guarantee")}</span><strong>${money(finance.guarantee)}</strong><small>${t("按释放规则逐步可用", "Released by schedule")}</small></article>
        <article><span>${t("已支付", "Paid")}</span><strong>${money(finance.paid)}</strong><small>${t("成功出金合计", "Successful withdrawals")}</small></article>
      </div>
      <div class="funds-body">
        <div><h3>${t("资金瀑布", "Fund waterfall")}</h3><ol class="funds-waterfall">${waterfall.map(([label, value, kind]) => `<li class="funds-${kind}"><span>${h(label)}</span><strong>${money(value)}</strong></li>`).join("")}</ol><p>${t("瀑布展示账务拆解；调查、隔离等复核项可能对应同一笔佣金，不在总额中重复扣减。", "The waterfall shows accounting splits. Review reasons may reference the same commission and are not deducted twice.")}</p></div>
        <div><h3>${t("未可提现明细", "Unavailable-fund details")}</h3><div class="funds-table-wrap"><table>
          <thead><tr><th>${t("分类", "Type")}</th><th>${t("原因", "Reason")}</th><th>${t("金额/影响", "Amount / impact")}</th><th>${t("时间/阶段", "Time / stage")}</th><th>${t("下一步", "Next step")}</th></tr></thead>
          <tbody>${info.reasons.length ? info.reasons.map(row => `<tr><td>${h(row.group)}</td><td>${h(row.label)}</td><td>${row.amount === null ? h(row.impact) : money(row.amount)}</td><td>${h(row.time)}</td><td><button class="button secondary small" type="button" data-route="${row.route}">${h(row.next)}</button></td></tr>`).join("") : `<tr><td colspan="5" class="funds-empty">${t("当前佣金均可提现", "All commissions are available")}</td></tr>`}</tbody>
        </table></div><p class="funds-time-note">${t("结算中与保证金的预计日期可能随复核结果调整，不代表承诺；人工复核项仅显示当前阶段和下一步。", "Expected hold and guarantee dates may change after review and are not commitments. Manual-review items show only the current stage and next step.")}</p><div class="funds-untriggered"><strong>${t("当前未触发", "Not currently triggered")}</strong><span>${untriggeredReasons(info.reasons).map(h).join(" · ")}</span></div></div>
      </div>
    </section>`;
  }

  AFF.fundsAvailability = { data, walletSummary, full, reasonRows, untriggeredReasons };
})();
