"use strict";

/**
 * CPA-internal domain kernel for P0 module 04: qualification and commission.
 * All numeric values come from explicitly supplied versioned test/configuration inputs.
 */

class DomainError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.retryable = Boolean(options.retryable);
    this.details = options.details || [];
  }
}

function createP0Mod04Domain(options = {}) {
  const clock = options.clock || (() => "2026-11-19T00:00:00Z");
  const state = {
    lockedAttributions: new Map(),
    customerFacts: new Map(),
    customerFactHistory: new Map(),
    priceSnapshots: new Map(),
    qualityUpgradeRules: new Map(),
    milestoneSnapshots: new Map(),
    qualificationCases: new Map(),
    commissionCases: new Map(),
    commissionLines: new Map(),
    commissionAdjustments: new Map(),
    events: [],
    audit: [],
  };
  const idempotency = new Map();
  let sequence = 0;
  let eventSequence = 0;

  const nextId = prefix => `${prefix}-${String(++sequence).padStart(4, "0")}`;
  const snapshot = value => JSON.parse(JSON.stringify(value));
  const stablePayload = value => JSON.stringify(value, Object.keys(value || {}).sort());

  function requireObject(value, fields) {
    const missing = fields.filter(field => value?.[field] === undefined || value?.[field] === null || value?.[field] === "");
    if (missing.length) throw new DomainError("AFF-42201", "Validation failed", {details: missing.map(field => `missing ${field}`)});
  }

  function idempotentCall(key, payload, action) {
    const payloadHash = stablePayload(payload);
    const prior = idempotency.get(key);
    if (prior) {
      if (prior.payloadHash !== payloadHash) throw new DomainError("AFF-40902", "Idempotency key conflicts with a different request payload");
      return {...prior.result, idempotent_replay: true};
    }
    const result = action(payload);
    idempotency.set(key, {payloadHash, result});
    return result;
  }

  function emit(eventType, objectType, objectId, data, context = {}, requirements = []) {
    const event = {
      event_id: `EVT-${String(++eventSequence).padStart(5, "0")}`,
      event_type: eventType,
      event_version: 1,
      occurred_at: clock(),
      processed_at: clock(),
      trace_id: context.trace_id || nextId("TRACE"),
      source: "cpa-internal-domain-double",
      object_type: objectType,
      object_id: objectId,
      fact_version: data.record_version || 1,
      rule_version: context.rule_version || "qualification-double-v1",
      idempotency_key: context.idempotency_key || nextId("IDEM"),
      visibility: context.visibility || "admin",
      audit: {
        actor_id: context.actor_id || "system-double",
        reason_code: context.reason_code || "domain_operation",
        impact: context.impact || {},
      },
      data,
      requirements,
    };
    state.events.push(event);
    return event;
  }

  function parseMoney(value) {
    if (!/^-?[0-9]+\.[0-9]{2}$/.test(String(value))) throw new DomainError("AFF-42203", "Money must be an exact decimal string with scale 2");
    const [whole, fraction] = String(value).split(".");
    const cents = Number(whole) * 100 + Number(fraction) * Math.sign(Number(whole) || 1);
    return cents;
  }

  function formatMoney(cents) {
    const sign = cents < 0 ? "-" : "";
    const absolute = Math.abs(cents);
    return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
  }

  function parseRatio(value) {
    if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/.test(String(value))) throw new DomainError("AFF-42204", "Ratio must be a non-negative decimal string");
    return Math.round(Number(value) * 1000000);
  }

  function multiplyMoneyRatio(amount, ratioMillionths) {
    return Math.round((amount * ratioMillionths) / 1000000);
  }

  function saveLockedAttribution(input) {
    requireObject(input, ["customer_id", "attribution_id", "partner_id", "state"]);
    if (input.state !== "locked") throw new DomainError("AFF-40901", "Only locked attribution may feed qualification");
    const attribution = {
      customer_id: input.customer_id,
      attribution_id: input.attribution_id,
      partner_id: input.partner_id,
      state: "locked",
      locked_at: input.locked_at || clock(),
      record_version: 1,
    };
    state.lockedAttributions.set(attribution.customer_id, attribution);
    return {attribution: snapshot(attribution)};
  }

  function savePriceSnapshot(input) {
    requireObject(input, ["price_version", "country", "qualification_tier", "base_price", "country_coefficient", "currency", "rounding_context", "m1_ratio", "m2_ratio"]);
    parseMoney(input.base_price);
    parseRatio(input.country_coefficient);
    parseRatio(input.m1_ratio);
    parseRatio(input.m2_ratio);
    if (parseRatio(input.m1_ratio) + parseRatio(input.m2_ratio) !== 1000000) {
      throw new DomainError("AFF-42205", "M1 and M2 ratios must total 100 percent");
    }
    const key = `${input.price_version}:${input.country}:${input.qualification_tier}`;
    if (state.priceSnapshots.has(key)) throw new DomainError("AFF-40901", "Price snapshot version already exists");
    const price = {
      price_version: input.price_version,
      country: input.country,
      qualification_tier: input.qualification_tier,
      base_price: input.base_price,
      country_coefficient: input.country_coefficient,
      currency: input.currency,
      rounding_context: input.rounding_context,
      m1_ratio: input.m1_ratio,
      m2_ratio: input.m2_ratio,
      record_version: 1,
    };
    state.priceSnapshots.set(key, price);
    return {price_snapshot: snapshot(price)};
  }

  function saveQualityUpgradeRule(input) {
    requireObject(input, ["m3_rule_version", "m3_percentage"]);
    const percentage = parseRatio(input.m3_percentage);
    if (percentage <= 0) throw new DomainError("AFF-42206", "M3 percentage must be positive");
    if (state.qualityUpgradeRules.has(input.m3_rule_version)) throw new DomainError("AFF-40901", "M3 rule version already exists");
    const rule = {
      m3_rule_version: input.m3_rule_version,
      m3_percentage: input.m3_percentage,
      record_version: 1,
    };
    state.qualityUpgradeRules.set(rule.m3_rule_version, rule);
    return {quality_upgrade_rule: snapshot(rule)};
  }

  function intakeCustomerFact(input) {
    requireObject(input, ["customer_fact_id", "record_version", "customer_id", "fact_type", "occurred_at", "source_ref", "quality_state"]);
    if (!["validated", "partial", "conflict", "invalid", "stale", "corrected"].includes(input.quality_state)) {
      throw new DomainError("AFF-42201", "Unknown customer-fact quality state");
    }
    return idempotentCall(`customer-fact:${input.customer_fact_id}:${input.record_version}`, input, payload => {
      const fact = {
        customer_fact_id: payload.customer_fact_id,
        record_version: payload.record_version,
        customer_id: payload.customer_id,
        fact_type: payload.fact_type,
        occurred_at: payload.occurred_at,
        source_ref: payload.source_ref,
        quality_state: payload.quality_state,
        correction_ref: payload.correction_ref || "none",
        values: payload.values || {},
        record_state: "history",
      };
      const history = state.customerFactHistory.get(fact.customer_fact_id) || [];
      const current = state.customerFacts.get(fact.customer_fact_id);
      let stored;
      if (!current || fact.record_version > current.record_version) {
        history.push(fact);
        fact.record_state = "current";
        state.customerFacts.set(fact.customer_fact_id, fact);
        state.customerFactHistory.set(fact.customer_fact_id, history);
        stored = fact;
      } else {
        history.push({...fact, record_state: "late"});
        state.customerFactHistory.set(fact.customer_fact_id, history);
        stored = {...fact, record_state: "late"};
      }
      const event = emit("customer_fact_intake", "CustomerFact", `${fact.customer_fact_id}:${fact.record_version}`, snapshot(stored), payload, ["AFF-REQ-C01", "FEATURE-QUAL-01"]);
      return {customer_fact: snapshot(stored), event_id: event.event_id, late: stored.record_state === "late"};
    });
  }

  function currentFacts(customerId, factTypes) {
    return [...state.customerFacts.values()].filter(fact =>
      fact.customer_id === customerId && factTypes.includes(fact.fact_type) && fact.record_state === "current",
    );
  }

  function priceFor(input) {
    const price = [...state.priceSnapshots.values()].find(item =>
      item.price_version === input.price_version &&
      item.country === input.country &&
      item.qualification_tier === input.qualification_tier,
    );
    if (!price) throw new DomainError("AFF-42207", "Required price snapshot is not configured", {details: ["price_snapshot"]});
    return price;
  }

  function evaluateQualification(input) {
    requireObject(input, ["customer_id", "milestone", "rule_version"]);
    if (!["first_deposit", "qualified_conversion", "quality_upgrade"].includes(input.milestone)) {
      throw new DomainError("AFF-42201", "Unknown qualification milestone");
    }
    const attribution = state.lockedAttributions.get(input.customer_id);
    if (!attribution || attribution.state !== "locked") {
      return {
        qualification_case: null,
        result: "data_pending",
        reason_code: "locked_attribution_missing",
        review_task_id: nextId("TASK"),
      };
    }
    const requiredFactTypes = input.required_fact_types || {
      first_deposit: ["first_deposit"],
      qualified_conversion: ["net_deposit", "valid_trading", "identity"],
      quality_upgrade: ["quality_upgrade"],
    }[input.milestone];
    const facts = currentFacts(input.customer_id, requiredFactTypes);
    const validFacts = facts.filter(fact => fact.quality_state === "validated" || fact.quality_state === "corrected");
    if (validFacts.length !== requiredFactTypes.length) {
      const qualificationCase = {
        qualification_case_id: nextId("QUAL"),
        customer_id: input.customer_id,
        attribution_id: attribution.attribution_id,
        milestone: input.milestone,
        fact_versions: validFacts.map(fact => `${fact.customer_fact_id}:${fact.record_version}`).join(",") || "none",
        rule_versions: input.rule_version,
        result: "data_pending",
        reason_code: "critical_fact_missing",
        record_version: 1,
      };
      state.qualificationCases.set(qualificationCase.qualification_case_id, qualificationCase);
      return {qualification_case: snapshot(qualificationCase), result: "data_pending", reason_code: "critical_fact_missing", review_task_id: nextId("TASK")};
    }

    const oldMilestone = [...state.milestoneSnapshots.values()].filter(item => item.customer_id === input.customer_id && item.milestone === input.milestone).at(-1)?.new_state || "not_reached";
    const milestoneSnapshot = {
      customer_id: input.customer_id,
      milestone: input.milestone,
      fact_version: Math.max(...validFacts.map(fact => fact.record_version)),
      source_fact_refs: validFacts.map(fact => fact.source_ref),
      inputs_cutoff: input.inputs_cutoff || clock(),
      old_state: oldMilestone,
      new_state: "reached",
      concluded_at: clock(),
      record_version: 1,
    };
    state.milestoneSnapshots.set(nextId("MILE"), milestoneSnapshot);

    let qualificationTier = "";
    if (input.milestone === "qualified_conversion") {
      const identity = validFacts.find(fact => fact.fact_type === "identity");
      const netDeposit = validFacts.find(fact => fact.fact_type === "net_deposit");
      const trading = validFacts.find(fact => fact.fact_type === "valid_trading");
      const identityTier = String(identity.values.qualification_tier || "");
      const fundingTier = String(netDeposit.values.qualification_tier || "");
      const tradingTier = String(trading.values.qualification_tier || "");
      const tiers = [identityTier, fundingTier, tradingTier].filter(Boolean);
      if (tiers.length !== 3) throw new DomainError("AFF-42208", "Qualified conversion facts are missing tier values");
      qualificationTier = tiers.sort()[0];
    }

    const qualificationCase = {
      qualification_case_id: nextId("QUAL"),
      customer_id: input.customer_id,
      attribution_id: attribution.attribution_id,
      milestone: input.milestone,
      fact_versions: validFacts.map(fact => `${fact.customer_fact_id}:${fact.record_version}`).join(","),
      rule_versions: input.rule_version,
      result: "qualified",
      reason_code: "all_critical_facts_valid",
      qualification_tier: qualificationTier,
      country: input.country || validFacts.map(fact => fact.values.country).find(Boolean) || "",
      record_version: 1,
    };
    state.qualificationCases.set(qualificationCase.qualification_case_id, qualificationCase);
    emit("qualification_evaluation", "QualificationCase", qualificationCase.qualification_case_id, snapshot(qualificationCase), {...input, rule_version: input.rule_version}, ["AFF-REQ-C01", "FEATURE-QUAL-01"]);
    emit("milestone_changed", "MilestoneSnapshot", `${qualificationCase.customer_id}:${input.milestone}`, snapshot(milestoneSnapshot), input, ["AFF-REQ-C02", "FEATURE-QUAL-01"]);
    return {qualification_case: snapshot(qualificationCase), milestone_snapshot: snapshot(milestoneSnapshot), result: "qualified", reason_code: "all_critical_facts_valid"};
  }

  function caseCountForCustomer(customerId) {
    return [...state.commissionCases.values()].filter(item => item.customer_id === customerId).length;
  }

  function generateCommissionCase(input) {
    requireObject(input, ["qualification_case_id", "case_type"]);
    if (!["base", "m3"].includes(input.case_type)) throw new DomainError("AFF-42201", "Unknown commission case type");
    const qualification = state.qualificationCases.get(input.qualification_case_id);
    if (!qualification) throw new DomainError("AFF-40401", "Qualification case not found");
    if (qualification.result !== "qualified") throw new DomainError("AFF-40901", `Qualification result is ${qualification.result}`);
    const attribution = state.lockedAttributions.get(qualification.customer_id);
    if (!attribution) throw new DomainError("AFF-40901", "Locked attribution is missing");
    if (caseCountForCustomer(qualification.customer_id) >= 5) throw new DomainError("AFF-40910", "Customer already has five commission records");

    const duplicate = [...state.commissionCases.values()].some(item =>
      item.customer_id === qualification.customer_id && item.case_type === input.case_type,
    );
    if (duplicate) throw new DomainError("AFF-40902", "Commission case type already exists for this customer");

    const caseId = nextId("COMM");
    let amountCents = 0;
    let lineDefinitions = [];
    let snapshotRefs = [];

    if (input.case_type === "base") {
      requireObject(input, ["price_version"]);
      const price = priceFor({
        price_version: input.price_version,
        country: qualification.country,
        qualification_tier: qualification.qualification_tier,
      });
      const baseCents = multiplyMoneyRatio(parseMoney(price.base_price), parseRatio(price.country_coefficient));
      const m1Cents = multiplyMoneyRatio(baseCents, parseRatio(price.m1_ratio));
      const m2Cents = baseCents - m1Cents;
      lineDefinitions = [
        {component: "M1", amount: formatMoney(m1Cents), snapshot_ref: `PRICE:${price.price_version}:${price.country}:${price.qualification_tier}`},
        {component: "M2", amount: formatMoney(m2Cents), snapshot_ref: `PRICE:${price.price_version}:${price.country}:${price.qualification_tier}`},
      ];
      amountCents = m1Cents + m2Cents;
      snapshotRefs = [`ATTRIBUTION:${qualification.attribution_id}`, `QUALIFICATION:${qualification.qualification_case_id}`, `PRICE:${price.price_version}:${price.country}:${price.qualification_tier}`];
    } else {
      requireObject(input, ["source_commission_case_id", "m3_rule_version"]);
      const source = state.commissionCases.get(input.source_commission_case_id);
      if (!source) throw new DomainError("AFF-40401", "Source commission case not found");
      if (source.customer_id !== qualification.customer_id) throw new DomainError("AFF-40301", "Source commission belongs to another customer");
      const rule = state.qualityUpgradeRules.get(input.m3_rule_version);
      if (!rule) throw new DomainError("AFF-42209", "M3 rule version is not configured");
      const sourceLines = [...state.commissionLines.values()].filter(line =>
        line.commission_case_id === source.commission_case_id && ["M1", "M2"].includes(line.component),
      );
      if (sourceLines.length !== 2) throw new DomainError("AFF-42210", "M3 requires immutable M1 and M2 source lines");
      const sourceAmountCents = sourceLines.reduce((sum, line) => sum + parseMoney(line.amount), 0);
      amountCents = multiplyMoneyRatio(sourceAmountCents, parseRatio(rule.m3_percentage));
      const m3Snapshot = {
        m3_rule_version: rule.m3_rule_version,
        source_commission_case_id: source.commission_case_id,
        m3_percentage: rule.m3_percentage,
        source_case_id: source.commission_case_id,
        source_amount_snapshot: {
          m1_amount: sourceLines.find(line => line.component === "M1").amount,
          m2_amount: sourceLines.find(line => line.component === "M2").amount,
          total_amount: formatMoney(sourceAmountCents),
        },
        record_version: 1,
      };
      state.qualityUpgradeRules.set(`${rule.m3_rule_version}:${source.commission_case_id}`, m3Snapshot);
      lineDefinitions = [
        {component: "M3", amount: formatMoney(amountCents), snapshot_ref: `M3:${rule.m3_rule_version}:${source.commission_case_id}`},
      ];
      snapshotRefs = [`ATTRIBUTION:${qualification.attribution_id}`, `QUALIFICATION:${qualification.qualification_case_id}`, `M3:${rule.m3_rule_version}:${source.commission_case_id}`];
    }

    const commissionCase = {
      commission_case_id: caseId,
      calculation_version: "1",
      case_type: input.case_type,
      partner_id: attribution.partner_id,
      customer_id: qualification.customer_id,
      attribution_id: qualification.attribution_id,
      qualification_case_id: qualification.qualification_case_id,
      amount: formatMoney(amountCents),
      currency: input.currency || "USD",
      snapshot_refs: snapshotRefs,
      state: "settlement_pending",
      record_version: 1,
    };
    state.commissionCases.set(caseId, commissionCase);
    for (const lineDefinition of lineDefinitions) {
      const line = {
        commission_line_id: nextId("LINE"),
        commission_case_id: caseId,
        component: lineDefinition.component,
        amount: lineDefinition.amount,
        snapshot_ref: lineDefinition.snapshot_ref,
        line_version: "1",
        record_version: 1,
      };
      state.commissionLines.set(line.commission_line_id, line);
    }
    const event = emit("commission_case_generated", "CommissionCase", caseId, snapshot(commissionCase), {...input, rule_version: qualification.rule_versions}, ["AFF-REQ-C03", "AFF-REQ-C04", "AFF-REQ-D01", "FEATURE-QUAL-01"]);
    return {commission_case: snapshot(commissionCase), commission_lines: lineDefinitions.map(line => ({...line})), event_id: event.event_id};
  }

  function createCommissionAdjustment(input) {
    requireObject(input, ["adjustment_id", "original_case_id", "direction", "difference_amount", "source_version", "rule_version"]);
    const original = state.commissionCases.get(input.original_case_id);
    if (!original) throw new DomainError("AFF-40401", "Original commission case not found");
    parseMoney(input.difference_amount);
    const adjustment = {
      adjustment_id: input.adjustment_id,
      original_case_id: original.commission_case_id,
      direction: input.direction,
      difference_amount: input.difference_amount,
      source_version: input.source_version,
      rule_version: input.rule_version,
      downstream_routing: "settlement_gate",
      record_version: 1,
    };
    state.commissionAdjustments.set(adjustment.adjustment_id, adjustment);
    const originalBefore = snapshot(original);
    const event = emit("commission_adjustment_created", "CommissionAdjustment", adjustment.adjustment_id, snapshot(adjustment), input, ["AFF-REQ-C12", "FEATURE-QUAL-03"]);
    return {adjustment: snapshot(adjustment), original_before: originalBefore, original_after: snapshot(original), event_id: event.event_id};
  }

  function queryCommissionSnapshot(input) {
    requireObject(input, ["customer_id", "requesting_partner_id"]);
    const items = [...state.commissionCases.values()]
      .filter(item => item.customer_id === input.customer_id)
      .map(item => {
        const authorized = item.partner_id === input.requesting_partner_id;
        return authorized ? snapshot(item) : {
          matched: false,
          reason_code: "standard_no_match",
          commission_case_id: "none",
        };
      });
    return {items, total: items.length};
  }

  return {
    saveLockedAttribution,
    savePriceSnapshot,
    saveQualityUpgradeRule,
    intakeCustomerFact,
    evaluateQualification,
    generateCommissionCase,
    createCommissionAdjustment,
    queryCommissionSnapshot,
    snapshot: () => ({
      lockedAttributions: [...state.lockedAttributions.values()].map(snapshot),
      customerFacts: [...state.customerFacts.values()].map(snapshot),
      customerFactHistory: [...state.customerFactHistory.values()].flat().map(snapshot),
      priceSnapshots: [...state.priceSnapshots.values()].map(snapshot),
      qualityUpgradeRules: [...state.qualityUpgradeRules.values()].map(snapshot),
      milestoneSnapshots: [...state.milestoneSnapshots.values()].map(snapshot),
      qualificationCases: [...state.qualificationCases.values()].map(snapshot),
      commissionCases: [...state.commissionCases.values()].map(snapshot),
      commissionLines: [...state.commissionLines.values()].map(snapshot),
      commissionAdjustments: [...state.commissionAdjustments.values()].map(snapshot),
      events: state.events.map(snapshot),
      audit: state.audit.map(snapshot),
    }),
    DomainError,
  };
}

module.exports = {createP0Mod04Domain, DomainError};
