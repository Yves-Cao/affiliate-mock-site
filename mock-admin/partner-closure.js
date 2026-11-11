(() => {
  const h = value => AFF.helpers.h(value);
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  function active() {
    return AFF.state?.scenario === "closure-flow";
  }

  function summary() {
    const clientRows = AFF.reporting.rows.filter(row => row.clientId);
    const cases = clientRows.flatMap(row => row.commissionCases || []);
    const finance = AFF.finance.summary();
    return {
      stage: t("待处理案件结算", "Pending-case settlement"),
      next: t("等待佣金、保证金、申诉与提现单复核", "Awaiting commission, guarantee, appeal, and withdrawal review"),
      openCases: cases.filter(item => !["settled", "rejected", "reversed"].includes(item.status)).length,
      held: finance.held,
      guarantee: finance.guarantee,
      processingWithdrawals: AFF.finance.allWithdrawals().filter(item => item.status === "processing").length,
      openAppeals: AFF.finance.appeals.filter(item => !["closed", "blocked"].includes(item.status)).length
    };
  }

  function accountPanel() {
    if (!active()) return "";
    const info = summary();
    const impacts = [
      [t("有效链接", "Active links"), t("已下线", "Offline")],
      [t("新增流量", "New traffic"), t("已停止", "Stopped")],
      [t("新提现申请", "New withdrawals"), t("暂不可申请", "Unavailable")],
      [t("历史报表", "Historical reports"), t("保留查询", "Retained")]
    ];
    return `<section class="card closure-panel">
      <header>
        <div><h2>${t("合作清退与最终结算", "Partner closure and final settlement")}</h2><span>${info.stage} · ${info.next}</span></div>
        <span class="tag tag-danger">${t("清退中", "Closing")}</span>
      </header>
      <div class="closure-metrics">
        <article><span>${t("待处理佣金", "Pending commissions")}</span><strong>${info.openCases}</strong><small>${t("继续按原状态复核", "Reviewed under existing statuses")}</small></article>
        <article><span>${t("暂扣金额", "On hold")}</span><strong>${money(info.held)}</strong><small>${t("待结算前检查", "Pending pre-settlement checks")}</small></article>
        <article><span>${t("保证金", "Guarantee")}</span><strong>${money(info.guarantee)}</strong><small>${t("按释放、抵扣或保留处理", "Released, offset, or retained")}</small></article>
        <article><span>${t("处理中提现", "Processing withdrawals")}</span><strong>${info.processingWithdrawals}</strong><small>${t("已有订单继续处理", "Existing orders continue")}</small></article>
      </div>
      <div class="closure-body">
        <ol>
          <li class="done"><span>${t("发起终止与影响预览", "Termination and impact preview")}</span></li>
          <li class="done"><span>${t("链接下线并停止新流量", "Links offline; new traffic stopped")}</span></li>
          <li class="current"><span>${t("待处理案件与尾款计算", "Pending cases and final balance")}</span></li>
          <li><span>${t("保证金释放 / 抵扣 / 保留", "Guarantee release / offset / retention")}</span></li>
          <li><span>${t("资料归档与审计复核", "Archive and audit review")}</span></li>
        </ol>
        <dl>${impacts.map(([name, value]) => `<div><dt>${h(name)}</dt><dd>${h(value)}</dd></div>`).join("")}</dl>
      </div>
      <footer>
        <button class="button secondary" type="button" data-route="statements">${t("最终结算", "Final settlement")}</button>
        <button class="button secondary" type="button" data-route="guarantee">${t("保证金", "Guarantee")}</button>
        <button class="button secondary" type="button" data-route="appeals">${t("申诉", "Appeals")}</button>
      </footer>
      <p>${t("清退SLA、最终审批人和生产保留期待评审；本演示只展示阶段和下一步，不承诺具体完成时间。", "Closure SLA, final approvers, and production retention periods are pending review. This demo shows stage and next step only, not a promised completion time.")}</p>
    </section>`;
  }

  function statementsBanner() {
    if (!active()) return "";
    const info = summary();
    return `<section class="card closure-statements">
      <div><h2>${t("最终结算单", "Final settlement statement")}</h2><span>${t("范围：终止前归属客户、未结案件、保证金与提现单", "Scope: pre-termination clients, open cases, guarantee, and withdrawals")}</span></div>
      <div><span class="tag tag-warning">${t("生成中", "Generating")}</span><small>${info.next}</small></div>
    </section>`;
  }

  function withdrawalNotice() {
    if (!active()) return "";
    return `<section class="card closure-withdrawal">
      <strong>${t("清退复核期间暂不可发起新提现", "New withdrawals are unavailable during closure review")}</strong>
      <p>${t("已有提现单继续按原状态处理；最终可提现净额以最终结算单为准。", "Existing withdrawals continue under their current statuses. Final net available funds follow the final statement.")}</p>
    </section>`;
  }

  function promotionNotice() {
    if (!active()) return "";
    return `<section class="card closure-withdrawal">
      <strong>${t("合作清退期间推广链接已下线", "Promotional links are offline during closure")}</strong>
      <p>${t("活动和二级渠道的历史数据保留查询；不允许生成新活动、新链接或复制推广链接。", "Historical campaign and subchannel data remains available. New campaigns, links, and promo-link copying are disabled.")}</p>
    </section>`;
  }

  function campaignLinkCell(link, simulator, copyIcon) {
    if (!active()) return `<div class="campaign-link"><a href="${h(simulator)}" target="_blank" rel="noopener" title="${h(link)}">${h(link)}</a><button class="icon-button campaign-copy" type="button" data-copy="${h(link)}" title="${t("复制链接", "Copy link")}" aria-label="${t("复制链接", "Copy link")}">${copyIcon}</button></div>`;
    return `<div class="campaign-link campaign-link-offline"><span title="${h(link)}">${h(link)}</span></div>`;
  }

  function messages() {
    if (!active()) return [];
    return [{
      id: "MSG-CLOSURE-001", level: "required", type: "合作清退", title: t("合作清退流程已启动", "Partner closure started"),
      date: AFF.finance.asOf, status: "unread",
      body: t("链接已下线并停止新增流量。待处理佣金、保证金、申诉和提现单将继续复核；清退进度和最终结算结果会通过消息中心通知。", "Links are offline and new traffic has stopped. Pending commissions, guarantee, appeals, and withdrawals continue review; closure progress and the final settlement result will be sent here."),
      closureRequestId: "CLOSURE-001"
    }];
  }

  AFF.partnerClosure = { active, summary, accountPanel, statementsBanner, withdrawalNotice, promotionNotice, campaignLinkCell, messages };
})();
