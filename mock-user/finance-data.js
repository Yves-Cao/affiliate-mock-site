(() => {
  const now = AFF.reporting.now;
  const dayMs = 86400000;
  const dateNumber = value => Date.parse(`${value}T00:00:00Z`);
  const shiftDate = (value, days) => new Date(dateNumber(value) + days * dayMs).toISOString().slice(0, 10);
  const digits = value => Number(String(value || "0").replace(/\D/g, ""));
  const money = cents => Number((cents / 100).toFixed(2));
  const cents = value => Math.round(Number(value || 0) * 100);
  const taxRates = {
    T0: { rate: 0, label: "免税/完税证明" },
    T1: { rate: 0.05, label: "低税档" },
    T2: { rate: 0.10, label: "默认税档" },
    T3: { rate: 0.15, label: "高税档" }
  };
  const countryTax = {
    VN: "T1", TH: "T1", ID: "T2", ZA: "T2", NG: "T1",
    PK: "T1", EG: "T0", KW: "T0", QA: "T0", KZ: "T2",
    SA: "T0", BD: "T1"
  };
  const countryHold = { VN: 5, TH: 4, ID: 5, ZA: 7, NG: 7, PK: 6, EG: 6, KW: 2, QA: 2, KZ: 3, SA: 2, BD: 5 };
  const paymentMethods = ["wire", "wallet"];
  const scenarioLabels = {
    normal_l1: "正常L1全链路", normal_l2: "正常L2全链路", tier_downgrade: "档位取低",
    ftd_only: "仅FTD", qftd_pending: "有效FTD待确认", quality_void: "质量服务未达标",
    hold_extended: "动态结算延长", frozen_d30: "结算超时复核", chargeback: "拒付冲正",
    not_new_customer: "非新客户", fraud_hit: "欺诈库命中", appeal_overturned: "申诉改判"
  };

  const configuration = {
    id: "CFG-P0-FINANCE",
    version: "v2026.10.27-P0",
    attributionWindow: {
      name: "标准点击归属窗口",
      days: 30,
      start: "有效点击时间",
      version: "ATTR-20261027-1"
    },
    guaranteeRate: 0.10,
    guaranteeReleaseDays: 90,
    terminationRetentionDays: 30,
    settlementFreezeThresholdDays: 30,
    taxRates,
    countryTax,
    countryHold,
    paymentHold: { wire: 2, wallet: 5, card: 10 },
    feeRules: {
      wire: { fixed: 300, rate: 0.005 },
      wallet: { fixed: 0, rate: 0.01 },
      minimum: 100,
      maximum: 3000
    },
    appealSlaDays: 7
  };

  const scenarioConfigs = [
    { code: "normal_l1", country: "VN", kyc: "通过", date: "2026-07-01", registeredAt: "2026-07-02", ftdAt: "2026-07-05", effectiveAt: "2026-07-12", tradedAt: "2026-07-12", qualityAt: "2026-08-20", expected: 200, tier: "L1", commissionStatus: "approved", holdOverride: 5, netDepositBalance: 350, tradingVolume: 1.2, tradingDays: 4 },
    { code: "normal_l2", country: "TH", kyc: "通过", date: "2026-06-20", registeredAt: "2026-06-21", ftdAt: "2026-06-24", effectiveAt: "2026-07-01", tradedAt: "2026-07-01", qualityAt: "2026-08-10", expected: 480, tier: "L2", commissionStatus: "approved", holdOverride: 4, netDepositBalance: 950, tradingVolume: 3.4, tradingDays: 6 },
    { code: "tier_downgrade", country: "ZA", kyc: "通过", date: "2026-07-10", registeredAt: "2026-07-11", ftdAt: "2026-07-15", effectiveAt: "2026-07-22", tradedAt: "2026-07-23", qualityAt: "2026-09-02", expected: 220, tier: "L1", commissionStatus: "approved", netDepositBalance: 4200, tradingVolume: 1.1, tradingDays: 4 },
    { code: "ftd_only", country: "PK", kyc: "通过", date: "2026-09-10", registeredAt: "2026-09-11", ftdAt: "2026-09-15", effectiveAt: null, tradedAt: null, qualityAt: null, expected: 0, tier: "-", commissionStatus: "pending", netDepositBalance: 500, tradingVolume: 0, tradingDays: 0 },
    { code: "qftd_pending", country: "ID", kyc: "通过", date: "2026-10-01", registeredAt: "2026-10-02", ftdAt: "2026-10-06", effectiveAt: null, tradedAt: "2026-10-12", qualityAt: null, expected: 0, tier: "-", commissionStatus: "pending", netDepositBalance: 900, tradingVolume: 3, tradingDays: 5 },
    { code: "quality_void", country: "BD", kyc: "通过", date: "2026-07-20", registeredAt: "2026-07-21", ftdAt: "2026-07-24", effectiveAt: "2026-08-01", tradedAt: "2026-08-02", qualityAt: null, expected: 300, tier: "L2", commissionStatus: "approved", netDepositBalance: 1000, tradingVolume: 3.2, tradingDays: 5 },
    { code: "hold_extended", country: "BD", kyc: "通过", date: "2026-10-14", registeredAt: "2026-10-15", ftdAt: "2026-10-18", effectiveAt: "2026-10-22", tradedAt: "2026-10-22", qualityAt: "2026-10-24", expected: 400, tier: "L2", commissionStatus: "held", paymentRisk: "card", netDepositBalance: 1100, tradingVolume: 3.5, tradingDays: 6 },
    { code: "frozen_d30", country: "KZ", kyc: "通过", date: "2026-08-10", registeredAt: "2026-08-11", ftdAt: "2026-08-14", effectiveAt: "2026-08-20", tradedAt: "2026-08-21", qualityAt: "2026-09-20", expected: 440, tier: "L2", commissionStatus: "pending", forceFund: "frozen", netDepositBalance: 1200, tradingVolume: 4, tradingDays: 6 },
    { code: "chargeback", country: "SA", kyc: "通过", date: "2026-07-05", registeredAt: "2026-07-06", ftdAt: "2026-07-08", effectiveAt: "2026-07-15", tradedAt: "2026-07-16", qualityAt: "2026-08-18", expected: 980, tier: "L3", commissionStatus: "reversed", netDepositBalance: 1600, tradingVolume: 5.2, tradingDays: 6 },
    { code: "not_new_customer", country: "TH", kyc: "不适用", date: "2026-10-20", registeredAt: null, ftdAt: null, effectiveAt: null, tradedAt: null, qualityAt: null, expected: 0, tier: "-", commissionStatus: "pending" },
    { code: "fraud_hit", country: "EG", kyc: "不适用", date: "2026-10-22", registeredAt: null, ftdAt: null, effectiveAt: null, tradedAt: null, qualityAt: null, expected: 0, tier: "-", commissionStatus: "pending" },
    { code: "appeal_overturned", country: "EG", kyc: "通过", date: "2026-06-10", registeredAt: "2026-06-11", ftdAt: "2026-06-14", effectiveAt: "2026-06-20", tradedAt: "2026-06-21", qualityAt: "2026-07-25", expected: 240, tier: "L2", commissionStatus: "approved", netDepositBalance: 900, tradingVolume: 3.1, tradingDays: 5 }
  ];

  const scenarioRows = AFF.reporting.rows.slice(0, scenarioConfigs.length);
  scenarioRows.forEach((row, index) => {
    const config = scenarioConfigs[index];
    Object.assign(row, {
      scenarioCode: config.code,
      scenarioLabel: scenarioLabels[config.code],
      date: config.date,
      registeredAt: config.registeredAt,
      kycAt: config.kyc === "通过" ? config.registeredAt : null,
      kyc: config.kyc,
      ftdAt: config.ftdAt,
      effectiveAt: config.effectiveAt,
      tradedAt: config.tradedAt,
      qualifiedAt: config.qualityAt,
      qualityAt: config.qualityAt,
      country: config.country,
      tier: config.tier,
      commissionStatus: config.commissionStatus,
      expected: config.expected,
      ftdAmount: config.ftdAt ? 500 : 0,
      netDepositBalance: config.netDepositBalance || 0,
      tradingVolume: config.tradingVolume || 0,
      tradingDays: config.tradingDays || 0,
      paymentRisk: config.paymentRisk || "wire",
      forceFund: config.forceFund || "",
      holdOverride: config.holdOverride || 0
    });
    if (config.effectiveAt && config.tier !== "-") {
      row.expected = AFF.partnerProgram.commissionPrice(config.country, config.tier);
    }
    if (config.code === "not_new_customer") {
      row.eligibilityStatus = "not_new_customer";
      row.eligibilityReasonCode = "EXISTING-CRM-ACCOUNT";
      row.eligibilityReason = "CRM已有账户或IB归属，不符合新客户条件。";
    } else if (config.code === "fraud_hit") {
      row.eligibilityStatus = "fraud_hit";
      row.eligibilityReasonCode = "CRM-FRAUD-HIGH";
      row.eligibilityReason = "CRM欺诈库高风险命中，注册与计佣已阻断。";
    } else {
      row.eligibilityStatus = "attributed";
      row.eligibilityReasonCode = "";
      row.eligibilityReason = "";
    }
  });

  scenarioRows.forEach(row => {
    if (!["ftd_only", "qftd_pending"].includes(row.scenarioCode) && row.effectiveAt && row.expected) {
      const firstAmount = Math.round(row.expected * 0.75);
      const qualityAmount = row.qualityAt ? row.expected - firstAmount : 0;
      row.commissionCases = [
        { id: `COM-${row.clientId}-QF`, type: "qftd_batch", segments: ["FTD", "QFTD"], confirmedAt: row.effectiveAt, amount: firstAmount, status: row.commissionStatus },
        { id: `COM-${row.clientId}-QS`, type: "quality_service", segments: ["QUALITY"], confirmedAt: row.qualityAt, amount: qualityAmount, status: row.commissionStatus }
      ].filter(item => item.amount > 0);
    }
  });

  const clientRows = AFF.reporting.rows.filter(row => row.clientId);
  const clients = new Map(clientRows.map(row => [row.clientId, row]));
  const commissionCases = [];
  const settlements = [];
  const taxRecords = [];
  const guaranteeRecords = [];
  const availableLots = [];

  function holdDays(row, item) {
    if (row.holdOverride) return row.holdOverride;
    const id = digits(item.id);
    const base = [1, 3, 7, 15][id % 4];
    const country = countryHold[row.country] || 3;
    const payment = configuration.paymentHold[row.paymentRisk] || configuration.paymentHold[item.id.includes("-QS") ? "wallet" : "wire"];
    return base + country + payment;
  }

  function buildCase(row, original, index) {
    if (!original?.amount) return;
    const sourceStatus = row.scenarioCode ? row.commissionStatus : original.status;
    const commissionStatus = sourceStatus === "reversed" ? "reversed"
      : sourceStatus === "rejected" ? "rejected"
      : sourceStatus === "approved" ? "approved"
      : "holding";
    const item = {
      ...original,
      clientId: row.clientId,
      country: row.country,
      tier: row.tier,
      confirmedAt: original.confirmedAt,
      amountCents: cents(original.amount),
      holdDays: holdDays(row, original),
      holdStartedAt: original.confirmedAt,
      theoreticalReleaseAt: shiftDate(original.confirmedAt, holdDays(row, original)),
      status: sourceStatus,
      commissionStatus,
      settlementStatus: "processing",
      withdrawalStatus: "unavailable",
      statementId: null,
      reasonCode: row.commissionReasonCode,
      reason: row.commissionReason,
      settlementCaseId: `SET-${row.clientId}-${String(index + 1).padStart(2, "0")}`,
      riskSignalId: row.forceFund === "frozen" ? `RISK-${row.clientId}-SETTLEMENT` : "",
      freezeThresholdDays: configuration.settlementFreezeThresholdDays,
      appealVisible: false
    };
    item.released = item.theoreticalReleaseAt <= now;
    const canSettle = ["approved", "paid"].includes(sourceStatus) && item.released && !["frozen", "manual_review"].includes(row.forceFund);

    if (canSettle) {
      const taxTier = row.scenarioCode === "appeal_overturned" ? "T1" : (countryTax[row.country] || "T2");
      const taxRate = taxRates[taxTier].rate;
      const taxAmount = Math.round(item.amountCents * taxRate);
      const guaranteeAmount = Math.round(item.amountCents * configuration.guaranteeRate);
      const availableAmount = item.amountCents - taxAmount - guaranteeAmount;
      item.status = "settled";
      item.commissionStatus = "approved";
      item.settlementStatus = "settled";
      item.settlement = {
        id: `STL-${item.id}`,
        statementId: null,
        commissionCaseId: item.id,
        settledAt: item.theoreticalReleaseAt,
        grossAmount: item.amountCents,
        taxAmount,
        guaranteeAmount,
        availableAmount,
        taxTier,
        taxRate,
        ruleVersion: configuration.version
      };
      settlements.push(item.settlement);
      taxRecords.push({
        id: `TAX-${item.id}`, type: "withheld", clientId: row.clientId, commissionCaseId: item.id,
        statementId: null, date: item.theoreticalReleaseAt, taxTier, rate: taxRate, amount: taxAmount,
        status: "withheld", ruleVersion: configuration.version
      });
      const releaseDate = shiftDate(item.theoreticalReleaseAt, configuration.guaranteeReleaseDays);
      const guarantee = {
        id: `GL-${item.id}`, type: "retained", clientId: row.clientId, commissionCaseId: item.id,
        statementId: null,
        date: item.theoreticalReleaseAt, rate: configuration.guaranteeRate, amount: guaranteeAmount,
        status: releaseDate <= now ? "released" : "retained",
        retainedAt: item.theoreticalReleaseAt, normalReleaseAt: releaseDate,
        estimatedReleaseAt: releaseDate, ruleVersion: configuration.version
      };
      guaranteeRecords.push(guarantee);
      item.guarantee = guarantee;
      availableLots.push({
        id: `LOT-${item.id}-NET`, source: "commission", sourceId: item.id, clientId: row.clientId,
        statementId: null, commissionCaseId: item.id, date: item.theoreticalReleaseAt, amount: availableAmount, remaining: availableAmount, staticRemaining: availableAmount
      });
      if (guarantee.status === "released") {
        availableLots.push({
          id: `LOT-${item.id}-GR`, source: "guarantee_release", sourceId: guarantee.id,
          statementId: null, commissionCaseId: item.id, clientId: row.clientId, date: releaseDate,
          amount: guaranteeAmount, remaining: guaranteeAmount, staticRemaining: guaranteeAmount
        });
      }
    } else if (sourceStatus === "reversed") {
      item.status = "reversed";
      item.commissionStatus = "reversed";
      item.settlementStatus = "failed";
      const taxAmount = Math.round(item.amountCents * taxRates[countryTax[row.country] || "T2"].rate);
      item.reversal = { taxAmount, guaranteeUsed: Math.round(item.amountCents * configuration.guaranteeRate) };
      taxRecords.push({
        id: `TAX-${item.id}-RV`, type: "reversal", clientId: row.clientId, commissionCaseId: item.id,
        date: now, taxTier: countryTax[row.country] || "T2", amount: taxAmount, status: "reversed",
        ruleVersion: configuration.version
      });
      guaranteeRecords.push({
        id: `GL-${item.id}-USE`, type: "used", clientId: row.clientId, commissionCaseId: item.id,
        date: now, amount: item.reversal.guaranteeUsed, status: "used",
        reasonCode: row.commissionReasonCode || "DEPOSIT-CHARGEBACK", ruleVersion: configuration.version
      });
    } else if (sourceStatus === "rejected") {
      item.status = "rejected";
      item.commissionStatus = "rejected";
      item.settlementStatus = "blocked";
    } else if (row.forceFund === "frozen") {
      item.status = "frozen";
      item.commissionStatus = "holding";
      item.settlementStatus = "frozen";
      item.freezeReasonCode = "SETTLEMENT-OVERDUE";
      item.freezeReason = `结算观察超过${configuration.settlementFreezeThresholdDays}天，等待人工复核。`;
      item.appealVisible = false;
    } else if (row.forceFund === "manual_review") {
      item.status = "manual_review";
      item.commissionStatus = "holding";
      item.settlementStatus = "blocked";
    } else if (item.released) {
      item.status = original.status;
      item.settlementStatus = "processing";
    } else {
      item.status = "held";
      item.commissionStatus = "holding";
      item.settlementStatus = "processing";
    }
    commissionCases.push(item);
    return item;
  }

  clientRows.forEach((row, rowIndex) => {
    const originals = row.commissionCases?.length ? row.commissionCases : [];
    const rebuilt = [];
    if (row.scenarioCode === "ftd_only" || row.scenarioCode === "qftd_pending") {
      row.commissionCases = [];
    } else {
      originals.forEach((original, index) => {
        const first = buildCase(row, original, rowIndex + index);
        if (first) rebuilt.push(first);
      });
      row.commissionCases = rebuilt;
    }
    if (row.scenarioCode === "quality_void") {
      row.commissionCases = row.commissionCases.filter(item => item.type === "qftd_batch");
      row.milestoneStatus = "voided";
      row.voidedStage = "QUALITY";
      row.voidedReason = "window_expired";
    }
    if (row.scenarioCode === "qftd_pending") {
      row.milestoneStatus = "qftd_pending";
      row.fundStatus = "not_generated";
    }
  });

  const frozenGuarantee = guaranteeRecords.find(item =>
    item.status === "retained" && item.normalReleaseAt > now && Number(String(item.clientId).replace(/\D/g, "")) % 31 === 0
  );
  if (frozenGuarantee) {
    frozenGuarantee.status = "frozen";
    frozenGuarantee.freezeReasonCode = "GUARANTEE-RISK-REVIEW";
    frozenGuarantee.freezeReason = "关联客户风险复核中，释放自动暂停。";
  }

  function feeFor(amountCents, method) {
    const rule = configuration.feeRules[method] || configuration.feeRules.wire;
    const raw = rule.fixed + Math.round(amountCents * rule.rate);
    return Math.max(configuration.feeRules.minimum, Math.min(configuration.feeRules.maximum, raw));
  }

  const staticWithdrawals = [];
  const consumableLots = availableLots
    .filter(lot => lot.date <= now)
    .sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id));
  const selectedLots = consumableLots.filter((lot, index) => index % 4 !== 1);
  for (let index = 0; index < selectedLots.length;) {
    const groupSize = 1 + index % 3;
    const lots = selectedLots.slice(index, index + groupSize);
    index += groupSize;
    const amount = lots.reduce((sum, lot) => sum + lot.amount, 0);
    const method = paymentMethods[digits(lots[0].sourceId) % paymentMethods.length];
    const failed = staticWithdrawals.length % 17 === 9;
    const fee = failed ? 0 : feeFor(amount, method);
    const orderId = `WOD-${String(staticWithdrawals.length + 1).padStart(5, "0")}`;
    const statementId = `STMT-${orderId}`;
    const order = {
      id: orderId,
      statementId,
      date: shiftDate(lots.at(-1).date, 1) > now ? now : shiftDate(lots.at(-1).date, 1),
      method,
      amount, estimatedFee: feeFor(amount, method), fee,
      received: amount - fee,
      status: failed ? "failed" : "paid",
      receiver: "A*** P***", account: "**** 6621",
      ruleVersion: configuration.version,
      allocations: lots.map(lot => ({
        lotId: lot.id, source: lot.source, sourceId: lot.sourceId,
        commissionCaseId: lot.commissionCaseId || lot.sourceId, settlementId: statementId, clientId: lot.clientId, amount: lot.amount
      }))
    };
    lots.forEach(lot => {
      lot.statementId = statementId;
      if (lot.commissionCaseId) {
        const settlement = settlements.find(item => item.commissionCaseId === lot.commissionCaseId);
        if (settlement) settlement.statementId = statementId;
        const guarantee = guaranteeRecords.find(item => item.id === lot.sourceId || item.commissionCaseId === lot.commissionCaseId);
        if (guarantee) guarantee.statementId = statementId;
      }
    });
    if (!failed) lots.forEach(lot => { lot.remaining = 0; lot.staticRemaining = 0; });
    staticWithdrawals.push(order);
  }

  function runtimeWithdrawals() {
    return AFF.state?.withdrawalOrders || [];
  }

  function buildStatementBatches() {
    return [...runtimeWithdrawals(), ...staticWithdrawals].map(order => {
      const allocations = order.allocations || [];
      const commissionCaseIds = [...new Set(allocations.map(item => item.commissionCaseId).filter(Boolean))];
      const guaranteeIds = [...new Set(allocations.filter(item => item.source === "guarantee_release").map(item => item.sourceId).filter(Boolean))];
      const batchSettlements = settlements.filter(item => commissionCaseIds.includes(item.commissionCaseId));
      const batchGuarantees = guaranteeRecords.filter(item => guaranteeIds.includes(item.id));
      return {
        id: order.statementId || `STMT-${order.id}`,
        withdrawalId: order.id,
        statementStatus: order.statementStatus || "generated",
        period: order.date?.slice(0, 7) || now.slice(0, 7),
        settledAt: order.date,
        commissionCaseIds,
        guaranteeIds,
        grossAmount: batchSettlements.reduce((sum, item) => sum + item.grossAmount, 0),
        taxAmount: batchSettlements.reduce((sum, item) => sum + item.taxAmount, 0),
        guaranteeAmount: batchSettlements.reduce((sum, item) => sum + item.guaranteeAmount, 0),
        availableAmount: allocations.reduce((sum, item) => sum + item.amount, 0),
        ruleVersion: order.ruleVersion || configuration.version
      };
    });
  }

  function runtimeAllocated(lotId) {
    return runtimeWithdrawals().filter(order => !["failed", "timeout", "returned", "closed", "rejected"].includes(order.status))
      .reduce((sum, order) => sum + order.allocations.filter(allocation => allocation.lotId === lotId)
        .reduce((total, allocation) => total + allocation.amount, 0), 0);
  }

  function balance() {
    return availableLots.reduce((sum, lot) =>
      sum + (lot.staticRemaining ? Math.max(0, lot.remaining - runtimeAllocated(lot.id)) : 0), 0);
  }

  function allocate(amountCents) {
    const allocations = [];
    let remaining = amountCents;
    for (const lot of availableLots.slice().sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id))) {
      if (!remaining) break;
      if (!lot.staticRemaining) continue;
      const take = Math.min(remaining, Math.max(0, lot.remaining - runtimeAllocated(lot.id)));
      if (!take) continue;
      allocations.push({
        lotId: lot.id, source: lot.source, sourceId: lot.sourceId,
        commissionCaseId: lot.commissionCaseId || lot.sourceId, settlementId: lot.statementId || "", clientId: lot.clientId, amount: take
      });
      remaining -= take;
    }
    if (remaining) throw new Error("Insufficient available balance");
    return allocations;
  }

  function previewWithdrawal(amount, method = "wire") {
    const amountCents = cents(amount);
    if (!Number.isFinite(amountCents) || amountCents <= 0) throw new Error("Invalid withdrawal amount");
    if (amountCents > balance()) throw new Error("Insufficient available balance");
    const estimatedFee = feeFor(amountCents, method);
    return { amount: amountCents, method, estimatedFee, received: amountCents - estimatedFee };
  }

  function createWithdrawal(amount, method = "wire") {
    const preview = previewWithdrawal(amount, method);
    const orders = runtimeWithdrawals();
    const id = `WOD-U${String(orders.length + 1).padStart(4, "0")}`;
    const statementId = `STMT-${id}`;
    const allocations = allocate(preview.amount).map(item => ({ ...item, settlementId: statementId }));
    const order = {
      id,
      statementId,
      date: now, method, amount: preview.amount, estimatedFee: preview.estimatedFee,
      fee: 0, received: 0, status: "pending_review", receiver: "A*** P***", account: "**** 6621",
      statementStatus: "generated",
      ruleVersion: configuration.version, allocations
    };
    if (!Array.isArray(AFF.state?.withdrawalOrders)) AFF.state.withdrawalOrders = orders;
    orders.push(order);
    return order;
  }

  function approveWithdrawal(id) {
    const order = runtimeWithdrawals().find(item => item.id === id);
    if (!order || order.status !== "pending_review") return null;
    order.status = "processing";
    order.reviewedAt = now;
    order.reviewStatus = "approved";
    order.statementStatus = "reviewing";
    order.crmPayout = {
      requestId: `CRM-REQ-${order.id}`,
      payoutId: "",
      status: "processing",
      statusReason: "Affiliate审核通过，等待CRM打款",
      requestedAt: now,
      updatedAt: now,
      retryCount: 0,
      reconciliationStatus: "pending"
    };
    return order;
  }

  function rejectWithdrawal(id, reason = "人工审核未通过") {
    const order = runtimeWithdrawals().find(item => item.id === id);
    if (!order || order.status !== "pending_review") return null;
    order.status = "rejected";
    order.reviewedAt = now;
    order.reviewStatus = "rejected";
    order.reviewReason = reason;
    order.statementStatus = "cancelled";
    order.fee = 0;
    order.received = 0;
    return order;
  }

  function setWithdrawalStatus(id, status) {
    const order = runtimeWithdrawals().find(item => item.id === id);
    const transitions = {
      pending_review: ["processing", "rejected"],
      processing: ["paid", "failed", "timeout", "returned"]
    };
    if (!order || !transitions[order.status]?.includes(status)) return null;
    order.status = status;
    order.fee = status === "paid" ? order.estimatedFee : 0;
    order.received = status === "paid" ? order.amount - order.fee : 0;
    order.crmPayout = {
      ...(order.crmPayout || {}),
      requestId: order.crmPayout?.requestId || `CRM-REQ-${order.id}`,
      payoutId: order.crmPayout?.payoutId || `CRM-PAY-${order.id}`,
      status,
      statusReason: status === "paid" ? "CRM已返回成功回执" : status === "returned" ? "CRM返回银行退回" : status === "failed" ? "CRM返回打款失败" : "等待CRM处理",
      externalTransactionId: status === "paid" ? `EXT-${order.id}` : (order.crmPayout?.externalTransactionId || ""),
      updatedAt: now,
      reconciliationStatus: status === "paid" ? "synced" : "pending"
    };
    return order;
  }

  function runAutomaticSettlement() {
    const simulationState = AFF.simulation?.state?.() || {};
    const runs = Array.isArray(simulationState.settlementRuns)
      ? simulationState.settlementRuns
      : (Array.isArray(AFF.state?.settlementRuns) ? AFF.state.settlementRuns : []);
    const existing = runs.find(item => item.date === now);
    if (existing) return existing;
    const beforeSummary = summary();
    const eligibleCases = commissionCases.filter(item => item.settlementStatus === "settled");
    const blockedCases = commissionCases.filter(item => ["blocked", "frozen"].includes(item.settlementStatus));
    const failedCases = commissionCases.filter(item => item.settlementStatus === "failed");
    const run = {
      id: `SET-RUN-${now.replace(/\D/g, "").slice(0, 12)}`,
      date: now,
      executionTimezone: "UTC+8",
      scheduledAt: `${now} 00:00:00`,
      startedAt: `${now} 00:00:00`,
      executedAt: `${now} 00:03:00`,
      completedAt: `${now} 00:03:00`,
      ruleVersion: configuration.version,
      processedCount: eligibleCases.length,
      processedAmount: eligibleCases.reduce((sum, item) => sum + item.amountCents, 0),
      blockedCount: blockedCases.length,
      blockedAmount: blockedCases.reduce((sum, item) => sum + item.amountCents, 0),
      failedCount: failedCases.length,
      failedAmount: failedCases.reduce((sum, item) => sum + item.amountCents, 0),
      processedCaseIds: eligibleCases.map(item => item.id),
      blockedCaseIds: blockedCases.map(item => item.id),
      failedCaseIds: failedCases.map(item => item.id),
      beforeSummary: {
        available: beforeSummary.available,
        held: beforeSummary.held,
        guarantee: beforeSummary.guarantee,
        settled: beforeSummary.settled
      },
      status: "completed",
      traceId: `trace-${now}-settlement`,
      resultMode: "recalculated",
      note: "Mock按当前日期重算结算结果并记录运行快照；不创建提现记录，也不直接打款。"
    };
    runs.unshift(run);
    AFF.state.settlementRuns = runs;
    simulationState.settlementRuns = runs;
    const afterSummary = summary();
    run.afterSummary = {
      available: afterSummary.available,
      held: afterSummary.held,
      guarantee: afterSummary.guarantee,
      settled: afterSummary.settled
    };
    AFF.simulation?.log?.("settlement-snapshot", `记录每日自动结算快照 ${run.id}：处理${run.processedCount}，阻断${run.blockedCount}，失败${run.failedCount}`, [run.id, ...run.processedCaseIds]);
    return run;
  }

  function summary(sourceRows = clientRows) {
    const unique = new Map(sourceRows.filter(row => row.clientId).map(row => [row.clientId, row]));
    const rows = [...unique.values()];
    const sum = key => rows.reduce((total, row) => total + (row[key] || 0), 0);
    const runtimePaid = runtimeWithdrawals().filter(order => order.status === "paid")
      .reduce((sum, order) => sum + order.allocations.reduce((total, allocation) => total + allocation.amount, 0), 0);
    const frozen = rows.reduce((total, row) => total + (row.commissionCases || [])
      .filter(item => item.status === "frozen")
      .reduce((amount, item) => amount + item.amountCents / 100, 0), 0);
    const guaranteeAll = guaranteeRecords.reduce((total, item) => total + (item.amount || 0), 0) / 100;
    const guaranteeLotIds = new Set(availableLots.filter(lot => lot.source === "guarantee_release").map(lot => lot.id));
    const allWithdrawals = [...staticWithdrawals, ...runtimeWithdrawals().filter(order => order.status === "paid")];
    const paidGuarantee = allWithdrawals.reduce((total, order) => total + order.allocations
      .filter(allocation => guaranteeLotIds.has(allocation.lotId))
      .reduce((amount, allocation) => amount + allocation.amount, 0), 0) / 100;
    const paidCommission = Number((sum("paid") + runtimePaid / 100 - paidGuarantee).toFixed(2));
    const availableCommissionCents = sourceRows === clientRows
      ? availableLots.filter(lot => lot.source === "commission" && lot.staticRemaining)
          .reduce((total, lot) => total + Math.max(0, lot.remaining - runtimeAllocated(lot.id)), 0)
      : 0;
    const availableGuaranteeCents = sourceRows === clientRows
      ? availableLots.filter(lot => lot.source === "guarantee_release" && lot.staticRemaining)
          .reduce((total, lot) => total + Math.max(0, lot.remaining - runtimeAllocated(lot.id)), 0)
      : 0;
    const available = sourceRows === clientRows
      ? Number(((availableCommissionCents + availableGuaranteeCents) / 100).toFixed(2))
      : Number(sum("available").toFixed(2));
    return {
      registrations: rows.length,
      ftd: rows.filter(row => row.ftdAt).length,
      effective: rows.filter(row => row.effectiveAt).length,
      quality: rows.filter(row => row.qualityAt).length,
      expected: sum("expected"),
      settled: sum("settled"),
      held: sum("held"),
      approved: sum("approved"),
      paid: sum("paid"),
      rejected: sum("rejected"),
      reversed: sum("reversed"),
      guarantee: sum("guarantee"),
      guaranteeAll: Number(guaranteeAll.toFixed(2)),
      paidGuarantee: Number(paidGuarantee.toFixed(2)),
      tax: sum("tax"),
      frozen: Number(frozen.toFixed(2)),
      available,
      availableCommission: Number((availableCommissionCents / 100).toFixed(2)),
      availableGuarantee: Number((availableGuaranteeCents / 100).toFixed(2)),
      paid: paidCommission,
      totalRevenue: Number((paidCommission + available + guaranteeAll).toFixed(2))
    };
  }

  clientRows.forEach(row => {
    const cases = row.commissionCases || [];
    row.expected = cases.reduce((sum, item) => sum + money(item.amountCents), 0);
    row.settled = cases.filter(item => item.settlement)
      .reduce((sum, item) => sum + Number(item.settlement.grossAmount || 0) / 100, 0);
    row.held = cases.filter(item => ["held", "pending", "manual_review", "frozen"].includes(item.status))
      .reduce((sum, item) => sum + item.amountCents / 100, 0);
    row.approved = cases.filter(item => item.status === "settled")
      .reduce((sum, item) => sum + item.settlement.availableAmount / 100, 0);
    row.tax = cases.filter(item => item.status === "settled")
      .reduce((sum, item) => sum + item.settlement.taxAmount / 100, 0);
    row.taxAssessmentStatus = cases.some(item => item.settlement?.taxAmount != null) ? "calculated" : "not_calculated";
    row.guarantee = (row.commissionCases || []).reduce((sum, item) => {
      if (item.guarantee?.status === "retained") return sum + item.guarantee.amount / 100;
      if (item.guarantee?.status === "frozen") return sum + item.guarantee.amount / 100;
      return sum;
    }, 0);
    row.guaranteeStatus = row.guarantee > 0
      ? (cases.some(item => item.guarantee?.status === "frozen") ? "frozen" : "retained")
      : "released";
    row.rejected = cases.filter(item => item.status === "rejected").reduce((sum, item) => sum + item.amountCents / 100, 0);
    row.reversed = cases.filter(item => item.status === "reversed").reduce((sum, item) => sum + item.amountCents / 100, 0);
    row.available = availableLots.filter(lot => lot.clientId === row.clientId && lot.staticRemaining)
      .reduce((sum, lot) => sum + Math.max(0, lot.remaining - runtimeAllocated(lot.id)) / 100, 0);
    row.paid = staticWithdrawals.filter(order => order.status === "paid").flatMap(order => order.allocations)
      .filter(allocation => allocation.clientId === row.clientId)
      .reduce((sum, allocation) => sum + allocation.amount / 100, 0);
    row.fundStatus = !cases.length ? "not_generated"
      : row.scenarioCode === "chargeback" ? "clawed_back"
      : row.scenarioCode === "frozen_d30" ? "frozen"
      : cases.every(item => item.status === "settled") ? "settled_partial"
      : cases.some(item => item.status === "settled") ? "settled_partial"
      : cases.some(item => item.status === "rejected") ? "rejected"
      : cases.some(item => item.status === "reversed") ? "clawed_back"
      : cases.some(item => item.status === "frozen") ? "frozen"
      : cases.some(item => item.status === "manual_review") ? "manual_review"
      : cases.some(item => item.status === "held") ? "held" : "pending_review";
    row.commissionStatus = !cases.length ? "not_generated"
      : cases.some(item => item.commissionStatus === "reversed") ? "reversed"
      : cases.some(item => item.commissionStatus === "rejected") ? "rejected"
      : cases.every(item => item.commissionStatus === "approved") ? "approved"
      : "holding";
    row.settlementStatus = !cases.length ? "not_generated"
      : cases.some(item => item.settlementStatus === "frozen") ? "frozen"
      : cases.some(item => item.settlementStatus === "blocked") ? "blocked"
      : cases.every(item => item.settlementStatus === "settled") ? "settled"
      : "processing";
    const rowAllocations = [...staticWithdrawals, ...runtimeWithdrawals()]
      .flatMap(order => (order.allocations || []).map(allocation => ({ ...allocation, order })))
      .filter(allocation => allocation.clientId === row.clientId);
    row.withdrawalStatus = rowAllocations.some(item => item.order.status === "paid") ? "paid"
      : rowAllocations.some(item => ["pending_review", "approved", "processing"].includes(item.order.status)) ? "processing"
      : "unavailable";
    row.commissionId = cases[0]?.id || null;
    row.progress = {
      kyc: row.kyc === "通过",
      ftd: Boolean(row.ftdAt),
      effective: Boolean(row.effectiveAt),
      quality: Boolean(row.qualityAt),
      currentTier: row.tier,
      nextTierGap: row.tradingVolume ? `${row.tradingVolume} 手 / ${row.tradingDays} 天` : "-",
      remainingDays: row.effectiveAt && !row.qualityAt
        ? Math.max(0, Math.round((dateNumber(shiftDate(row.effectiveAt, 60)) - dateNumber(now)) / dayMs))
        : row.registeredAt && !row.ftdAt
          ? Math.max(0, Math.round((dateNumber(shiftDate(row.registeredAt, 60)) - dateNumber(now)) / dayMs))
          : 0
    };
  });

  const originalTotals = AFF.reporting.totals;
  AFF.reporting.metrics.push(
    { key: "settled", label: "已结算佣金", en: "Settled commission", type: "money" },
    { key: "tax", label: "税费", en: "Tax", type: "money" },
    { key: "guarantee", label: "滚动保证金", en: "Rolling guarantee", type: "money" },
    { key: "available", label: "可提现净额", en: "Available net", type: "money" }
  );
  AFF.reporting.fields.metrics.settled = AFF.reporting.metrics.find(item => item.key === "settled");
  AFF.reporting.fields.metrics.tax = AFF.reporting.metrics.find(item => item.key === "tax");
  AFF.reporting.fields.metrics.guarantee = AFF.reporting.metrics.find(item => item.key === "guarantee");
  AFF.reporting.fields.metrics.available = AFF.reporting.metrics.find(item => item.key === "available");
  AFF.reporting.totals = sourceRows => {
    const base = originalTotals(sourceRows);
    const finance = summary(sourceRows);
    const unique = new Map(sourceRows.filter(row => row.clientId).map(row => [row.clientId, row]));
    const rows = [...unique.values()];
    let clicks = 0;
    const visitors = new Set();
    sourceRows.forEach(row => { clicks += row.clicks; visitors.add(row.visitorId); });
    const ratio = (numerator, denominator) => denominator ? numerator / denominator : null;
    return {
      ...base,
      clicks,
      visitors: visitors.size,
      registrations: finance.registrations,
      ftd: finance.ftd,
      effective: finance.effective,
      quality: finance.quality,
      qualified: finance.quality,
      ftdAmount: rows.reduce((sum, row) => sum + row.ftdAmount, 0),
      expected: finance.expected,
      settled: finance.settled,
      held: finance.held,
      approved: finance.available,
      paid: finance.paid,
      rejected: finance.rejected,
      reversed: finance.reversed,
      guarantee: finance.guarantee,
      tax: finance.tax,
      available: finance.available,
      inProgress: finance.held,
      registerRate: ratio(finance.registrations, clicks),
      ftdRate: ratio(finance.ftd, finance.registrations),
      effectiveRate: ratio(finance.effective, finance.ftd),
      qualityRate: ratio(finance.quality, finance.effective),
      qualifiedRate: ratio(finance.quality, finance.effective),
      epc: ratio(finance.expected, clicks)
    };
  };

  const messages = [
    { id: "MSG-001", level: "required", type: "规则变更", title: "保证金规则更新", date: "2026-10-20", status: "unread", body: `自下一结算版本起，佣金结算时按${configuration.guaranteeRate * 100}%扣留滚动保证金，${configuration.guaranteeReleaseDays}个自然日后无风险自动释放。`, version: configuration.version },
    { id: "MSG-002", level: "normal", type: "结算延长", title: "1笔佣金延长观察期", date: "2026-10-23", status: "unread", body: "因国家与支付方式风险档叠加，对应佣金动态结算延长。", commissionCaseId: "COM-C-12006-QS" },
    { id: "MSG-003", level: "normal", type: "申诉进度", title: "申诉已改判", date: "2026-10-18", status: "read", body: "复核确认误扣保证金，相关金额已释放至可提现余额。", appealId: "APL-0012" },
    { id: "MSG-004", level: "info", type: "系统维护", title: "报表延迟维护完成", date: "2026-10-16", status: "read", body: "数据报表延迟10分钟，已恢复。" }
  ];
  const appeals = [
    { id: "APL-0012", object: "保证金抵扣", objectId: "GL-C-12011-QF", clientId: "C-12011", submittedAt: "2026-10-11", dueAt: "2026-10-18", status: "overturned", reason: "CRM欺诈库命中误报", result: "保证金释放并补发佣金", canAppeal: true },
    { id: "APL-0011", object: "佣金冲正", objectId: "COM-C-12008-QF", clientId: "C-12008", submittedAt: "2026-10-21", dueAt: "2026-10-28", status: "reviewing", reason: "客户拒付原因待银行确认", canAppeal: true },
    { id: "APL-0010", object: "客户资格无效", objectId: "C-12009", clientId: "C-12009", submittedAt: "2026-10-19", dueAt: "2026-10-26", status: "materials", reason: "需补充CRM开户时间截图", canAppeal: true },
    { id: "APL-0009", object: "硬拦截", objectId: "C-12010", clientId: "C-12010", submittedAt: "-", dueAt: "-", status: "blocked", reason: "欺诈库确权命中不可申诉", canAppeal: false }
  ];
  AFF.simulation.state().violations.forEach(violation => {
    if (violation.occurredAt > now) return;
    const client = AFF.reporting.rows.find(row => row.clientId === violation.targetId);
    if (!client) return;
    const caseId = client.commissionCases?.[0]?.id || "-";
    messages.push({
      id: `MSG-${violation.id}`,
      level: "required",
      type: "风控通知",
      title: "仿真违规事件已触发",
      date: violation.occurredAt,
      status: "unread",
      body: `客户${violation.targetId}触发${violation.category || violation.type}模拟事件。关联佣金保留处理记录，处理结果以复核结论为准。`,
      simulationViolationId: violation.id,
      commissionCaseId: caseId
    });
    if (violation.allowAppeal) {
      appeals.unshift({
        id: `APL-${violation.id}`,
        object: "仿真违规事件",
        objectId: violation.id,
        clientId: violation.targetId,
        submittedAt: violation.occurredAt,
        dueAt: shiftDate(violation.occurredAt, 7),
        status: "reviewing",
        reason: violation.reason || "仿真违规事件等待复核",
        canAppeal: true
      });
    } else {
      appeals.push({
        id: `APL-${violation.id}`,
        object: "仿真违规事件",
        objectId: violation.id,
        clientId: violation.targetId,
        submittedAt: "-",
        dueAt: "-",
        status: "blocked",
        reason: "该仿真事件设置为不可申诉",
        canAppeal: false
      });
    }
  });

  AFF.finance = {
    asOf: now,
    configuration,
    scenarioLabels,
    scenarioRows,
    clients,
    commissionCases,
    settlements,
    get statementBatches() { return buildStatementBatches(); },
    taxRecords,
    guaranteeRecords,
    availableLots,
    staticWithdrawals,
    messages,
    appeals,
    feeFor,
    balance,
    previewWithdrawal,
    createWithdrawal,
    approveWithdrawal,
    rejectWithdrawal,
    setWithdrawalStatus,
    runAutomaticSettlement,
    summary,
    allWithdrawals: () => [...runtimeWithdrawals(), ...staticWithdrawals].sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id))
  };
})();
