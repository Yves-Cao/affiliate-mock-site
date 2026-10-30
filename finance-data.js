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
    新加坡: "T3", 马来西亚: "T2", 泰国: "T1", 越南: "T1", 印度尼西亚: "T2",
    南非: "T2", 巴西: "T3", 墨西哥: "T2", 菲律宾: "T1", 阿联酋: "T0"
  };
  const countryHold = { 新加坡: 2, 马来西亚: 3, 泰国: 4, 越南: 5, 印度尼西亚: 5, 南非: 7, 巴西: 7, 墨西哥: 7, 菲律宾: 4, 阿联酋: 2 };
  const paymentMethods = ["wire", "wallet"];
  const scenarioLabels = {
    normal_l1: "正常L1全链路", normal_l2: "正常L2全链路", tier_downgrade: "档位取低",
    ftd_only: "仅FTD", qftd_pending: "有效FTD待确认", quality_void: "质量服务未达标",
    hold_extended: "动态Hold延长", frozen_d30: "D+30冻结", chargeback: "拒付冲正",
    not_new_customer: "非新客户", fraud_hit: "欺诈库命中", appeal_overturned: "申诉改判"
  };

  const configuration = {
    id: "CFG-P0-FINANCE",
    version: "v2026.10.27-P0",
    guaranteeRate: 0.10,
    guaranteeReleaseDays: 90,
    terminationRetentionDays: 30,
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
    { code: "normal_l1", country: "越南", kyc: "通过", date: "2026-07-01", registeredAt: "2026-07-02", ftdAt: "2026-07-05", effectiveAt: "2026-07-12", tradedAt: "2026-07-12", qualityAt: "2026-08-20", expected: 320, tier: "L1", commissionStatus: "approved", holdOverride: 5, netDepositBalance: 350, tradingVolume: 1.2, tradingDays: 4 },
    { code: "normal_l2", country: "泰国", kyc: "通过", date: "2026-06-20", registeredAt: "2026-06-21", ftdAt: "2026-06-24", effectiveAt: "2026-07-01", tradedAt: "2026-07-01", qualityAt: "2026-08-10", expected: 550, tier: "L2", commissionStatus: "approved", holdOverride: 4, netDepositBalance: 950, tradingVolume: 3.4, tradingDays: 6 },
    { code: "tier_downgrade", country: "南非", kyc: "通过", date: "2026-07-10", registeredAt: "2026-07-11", ftdAt: "2026-07-15", effectiveAt: "2026-07-22", tradedAt: "2026-07-23", qualityAt: "2026-09-02", expected: 320, tier: "L1", commissionStatus: "approved", netDepositBalance: 4200, tradingVolume: 1.1, tradingDays: 4 },
    { code: "ftd_only", country: "马来西亚", kyc: "通过", date: "2026-09-10", registeredAt: "2026-09-11", ftdAt: "2026-09-15", effectiveAt: null, tradedAt: null, qualityAt: null, expected: 0, tier: "-", commissionStatus: "pending", netDepositBalance: 500, tradingVolume: 0, tradingDays: 0 },
    { code: "qftd_pending", country: "印度尼西亚", kyc: "通过", date: "2026-10-01", registeredAt: "2026-10-02", ftdAt: "2026-10-06", effectiveAt: null, tradedAt: "2026-10-12", qualityAt: null, expected: 0, tier: "-", commissionStatus: "pending", netDepositBalance: 900, tradingVolume: 3, tradingDays: 5 },
    { code: "quality_void", country: "巴西", kyc: "通过", date: "2026-07-20", registeredAt: "2026-07-21", ftdAt: "2026-07-24", effectiveAt: "2026-08-01", tradedAt: "2026-08-02", qualityAt: null, expected: 360, tier: "L2", commissionStatus: "approved", netDepositBalance: 1000, tradingVolume: 3.2, tradingDays: 5 },
    { code: "hold_extended", country: "巴西", kyc: "通过", date: "2026-10-14", registeredAt: "2026-10-15", ftdAt: "2026-10-18", effectiveAt: "2026-10-22", tradedAt: "2026-10-22", qualityAt: "2026-10-24", expected: 420, tier: "L2", commissionStatus: "held", paymentRisk: "card", netDepositBalance: 1100, tradingVolume: 3.5, tradingDays: 6 },
    { code: "frozen_d30", country: "墨西哥", kyc: "通过", date: "2026-08-10", registeredAt: "2026-08-11", ftdAt: "2026-08-14", effectiveAt: "2026-08-20", tradedAt: "2026-08-21", qualityAt: "2026-09-20", expected: 480, tier: "L2", commissionStatus: "pending", forceFund: "frozen", netDepositBalance: 1200, tradingVolume: 4, tradingDays: 6 },
    { code: "chargeback", country: "新加坡", kyc: "通过", date: "2026-07-05", registeredAt: "2026-07-06", ftdAt: "2026-07-08", effectiveAt: "2026-07-15", tradedAt: "2026-07-16", qualityAt: "2026-08-18", expected: 600, tier: "L3", commissionStatus: "reversed", netDepositBalance: 1600, tradingVolume: 5.2, tradingDays: 6 },
    { code: "not_new_customer", country: "泰国", kyc: "不适用", date: "2026-10-20", registeredAt: null, ftdAt: null, effectiveAt: null, tradedAt: null, qualityAt: null, expected: 0, tier: "-", commissionStatus: "pending" },
    { code: "fraud_hit", country: "新加坡", kyc: "不适用", date: "2026-10-22", registeredAt: null, ftdAt: null, effectiveAt: null, tradedAt: null, qualityAt: null, expected: 0, tier: "-", commissionStatus: "pending" },
    { code: "appeal_overturned", country: "菲律宾", kyc: "通过", date: "2026-06-10", registeredAt: "2026-06-11", ftdAt: "2026-06-14", effectiveAt: "2026-06-20", tradedAt: "2026-06-21", qualityAt: "2026-07-25", expected: 380, tier: "L2", commissionStatus: "approved", netDepositBalance: 900, tradingVolume: 3.1, tradingDays: 5 }
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
      reasonCode: row.commissionReasonCode,
      reason: row.commissionReason
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
      item.settlement = {
        id: `STL-${item.id}`,
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
        date: item.theoreticalReleaseAt, taxTier, rate: taxRate, amount: taxAmount,
        status: "withheld", ruleVersion: configuration.version
      });
      const releaseDate = shiftDate(item.theoreticalReleaseAt, configuration.guaranteeReleaseDays);
      const guarantee = {
        id: `GL-${item.id}`, type: "retained", clientId: row.clientId, commissionCaseId: item.id,
        date: item.theoreticalReleaseAt, rate: configuration.guaranteeRate, amount: guaranteeAmount,
        status: releaseDate <= now ? "released" : "retained",
        retainedAt: item.theoreticalReleaseAt, normalReleaseAt: releaseDate,
        estimatedReleaseAt: releaseDate, ruleVersion: configuration.version
      };
      guaranteeRecords.push(guarantee);
      item.guarantee = guarantee;
      availableLots.push({
        id: `LOT-${item.id}-NET`, source: "commission", sourceId: item.id, clientId: row.clientId,
        date: item.theoreticalReleaseAt, amount: availableAmount, remaining: availableAmount, staticRemaining: availableAmount
      });
      if (guarantee.status === "released") {
        availableLots.push({
          id: `LOT-${item.id}-GR`, source: "guarantee_release", sourceId: guarantee.id,
          commissionCaseId: item.id, clientId: row.clientId, date: releaseDate,
          amount: guaranteeAmount, remaining: guaranteeAmount, staticRemaining: guaranteeAmount
        });
      }
    } else if (sourceStatus === "reversed") {
      item.status = "reversed";
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
    } else if (row.forceFund === "frozen") {
      item.status = "frozen";
    } else if (row.forceFund === "manual_review") {
      item.status = "manual_review";
    } else if (item.released) {
      item.status = original.status;
    } else {
      item.status = "held";
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
    const order = {
      id: `WOD-${String(staticWithdrawals.length + 1).padStart(5, "0")}`,
      date: shiftDate(lots.at(-1).date, 1) > now ? now : shiftDate(lots.at(-1).date, 1),
      method,
      amount, estimatedFee: feeFor(amount, method), fee,
      received: amount - fee,
      status: failed ? "failed" : "paid",
      receiver: "A*** P***", account: "**** 6621",
      ruleVersion: configuration.version,
      allocations: lots.map(lot => ({
        lotId: lot.id, source: lot.source, sourceId: lot.sourceId,
        commissionCaseId: lot.commissionCaseId || lot.sourceId, clientId: lot.clientId, amount: lot.amount
      }))
    };
    if (!failed) lots.forEach(lot => { lot.remaining = 0; lot.staticRemaining = 0; });
    staticWithdrawals.push(order);
  }

  function runtimeWithdrawals() {
    return AFF.state?.withdrawalOrders || [];
  }

  function runtimeAllocated(lotId) {
    return runtimeWithdrawals().filter(order => !["failed", "timeout", "closed"].includes(order.status))
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
        commissionCaseId: lot.commissionCaseId || lot.sourceId, clientId: lot.clientId, amount: take
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
    const order = {
      id: `WOD-U${String(orders.length + 1).padStart(4, "0")}`,
      date: now, method, amount: preview.amount, estimatedFee: preview.estimatedFee,
      fee: 0, received: 0, status: "processing", receiver: "A*** P***", account: "**** 6621",
      ruleVersion: configuration.version, allocations: allocate(preview.amount)
    };
    orders.push(order);
    return order;
  }

  function setWithdrawalStatus(id, status) {
    const order = runtimeWithdrawals().find(item => item.id === id);
    if (!order || !["processing", "paid", "failed", "timeout"].includes(status)) return null;
    order.status = status;
    order.fee = status === "paid" ? order.estimatedFee : 0;
    order.received = status === "paid" ? order.amount - order.fee : 0;
    return order;
  }

  function summary(sourceRows = clientRows) {
    const unique = new Map(sourceRows.filter(row => row.clientId).map(row => [row.clientId, row]));
    const rows = [...unique.values()];
    const sum = key => rows.reduce((total, row) => total + (row[key] || 0), 0);
    const runtimePaid = runtimeWithdrawals().filter(order => order.status === "paid")
      .reduce((sum, order) => sum + order.allocations.reduce((total, allocation) => total + allocation.amount, 0), 0);
    return {
      registrations: rows.length,
      ftd: rows.filter(row => row.ftdAt).length,
      effective: rows.filter(row => row.effectiveAt).length,
      quality: rows.filter(row => row.qualityAt).length,
      expected: sum("expected"),
      held: sum("held"),
      approved: sum("approved"),
      paid: sum("paid"),
      rejected: sum("rejected"),
      reversed: sum("reversed"),
      guarantee: sum("guarantee"),
      tax: sum("tax"),
      available: sourceRows === clientRows ? Number((balance() / 100).toFixed(2)) : Number(sum("available").toFixed(2)),
      paid: Number((sum("paid") + runtimePaid / 100).toFixed(2))
    };
  }

  clientRows.forEach(row => {
    const cases = row.commissionCases || [];
    row.expected = cases.reduce((sum, item) => sum + money(item.amountCents), 0);
    row.held = cases.filter(item => ["held", "pending", "manual_review", "frozen"].includes(item.status))
      .reduce((sum, item) => sum + item.amountCents / 100, 0);
    row.approved = cases.filter(item => item.status === "settled")
      .reduce((sum, item) => sum + item.settlement.availableAmount / 100, 0);
    row.tax = cases.filter(item => item.status === "settled")
      .reduce((sum, item) => sum + item.settlement.taxAmount / 100, 0);
    row.guarantee = (row.commissionCases || []).reduce((sum, item) => {
      if (item.guarantee?.status === "retained") return sum + item.guarantee.amount / 100;
      if (item.guarantee?.status === "frozen") return sum + item.guarantee.amount / 100;
      return sum;
    }, 0);
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
    row.commissionStatus = row.fundStatus;
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
    { key: "tax", label: "税费", en: "Tax", type: "money" },
    { key: "guarantee", label: "滚动保证金", en: "Rolling guarantee", type: "money" },
    { key: "available", label: "可提现净额", en: "Available net", type: "money" }
  );
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
    { id: "MSG-001", level: "required", type: "规则变更", title: "保证金规则更新", date: "2026-10-20", status: "unread", body: "自下一结算版本起，佣金结算时按10%扣留滚动保证金，90个自然日后无风险自动释放。", version: configuration.version },
    { id: "MSG-002", level: "normal", type: "Hold延长", title: "1笔佣金延长观察期", date: "2026-10-23", status: "unread", body: "因国家与支付方式风险档叠加，对应佣金动态Hold延长。", commissionCaseId: "COM-C-12006-QS" },
    { id: "MSG-003", level: "normal", type: "申诉进度", title: "申诉已改判", date: "2026-10-18", status: "read", body: "复核确认误扣保证金，相关金额已释放至可提现余额。", appealId: "APL-0012" },
    { id: "MSG-004", level: "info", type: "系统维护", title: "报表延迟维护完成", date: "2026-10-16", status: "read", body: "数据报表延迟10分钟，已恢复。" }
  ];
  const appeals = [
    { id: "APL-0012", object: "保证金抵扣", objectId: "GL-C-12011-QF", clientId: "C-12011", submittedAt: "2026-10-11", dueAt: "2026-10-18", status: "overturned", reason: "CRM欺诈库命中误报", result: "保证金释放并补发佣金", canAppeal: true },
    { id: "APL-0011", object: "佣金冲正", objectId: "COM-C-12008-QF", clientId: "C-12008", submittedAt: "2026-10-21", dueAt: "2026-10-28", status: "reviewing", reason: "客户拒付原因待银行确认", canAppeal: true },
    { id: "APL-0010", object: "客户资格无效", objectId: "C-12009", clientId: "C-12009", submittedAt: "2026-10-19", dueAt: "2026-10-26", status: "materials", reason: "需补充CRM开户时间截图", canAppeal: true },
    { id: "APL-0009", object: "硬拦截", objectId: "C-12010", clientId: "C-12010", submittedAt: "-", dueAt: "-", status: "blocked", reason: "欺诈库确权命中不可申诉", canAppeal: false }
  ];

  AFF.finance = {
    asOf: now,
    configuration,
    scenarioLabels,
    scenarioRows,
    clients,
    commissionCases,
    settlements,
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
    setWithdrawalStatus,
    summary,
    allWithdrawals: () => [...runtimeWithdrawals(), ...staticWithdrawals].sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id))
  };
})();
