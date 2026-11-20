"use strict";

/**
 * CPA-internal domain kernel for P0 module 06: funds, withdrawal, and payout.
 * Provider results are deterministic doubles; no production payment API is called.
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

function createP0Mod06Domain(options = {}) {
  const clock = options.clock || (() => "2026-11-19T00:00:00Z");
  const state = {
    settlementRuns: new Map(),
    settlementCases: new Map(),
    ledgerEntries: new Map(),
    wallets: new Map(),
    walletLots: new Map(),
    depositEntries: new Map(),
    statements: new Map(),
    statementVersions: new Map(),
    withdrawals: new Map(),
    withdrawalAllocations: new Map(),
    payoutAttempts: new Map(),
    providerCallbacks: new Map(),
    reconciliations: new Map(),
    reversalCases: new Map(),
    debts: new Map(),
    tasks: [],
    events: [],
    audit: [],
  };
  const idempotency = new Map();
  let sequence = 0;
  let eventSequence = 0;

  const nextId = prefix => `${prefix}-${String(++sequence).padStart(4, "0")}`;
  const snapshot = value => JSON.parse(JSON.stringify(value));
  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
    }
    return value;
  }
  const stablePayload = value => JSON.stringify(stableValue(value));

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
      rule_version: context.rule_version || context.config_version || "funds-double-v1",
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
    const sign = whole.startsWith("-") ? -1 : 1;
    const absoluteWhole = sign < 0 ? whole.slice(1) : whole;
    return sign * (Number(absoluteWhole) * 100 + Number(fraction));
  }

  function formatMoney(cents) {
    const sign = cents < 0 ? "-" : "";
    const absolute = Math.abs(cents);
    return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
  }

  function parseRatio(value) {
    if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/.test(String(value))) throw new DomainError("AFF-42204", "Ratio must be a non-negative decimal string");
    const millionths = Math.round(Number(value) * 1000000);
    if (millionths < 0 || millionths > 1000000) throw new DomainError("AFF-42204", "Ratio must be between 0 and 1");
    return millionths;
  }

  function walletFor(partnerId, currency = "USD") {
    let wallet = state.wallets.get(partnerId);
    if (!wallet) {
      wallet = {
        wallet_id: `WLT-${partnerId}`,
        partner_id: partnerId,
        currency,
        deposit_by_customer: {},
        other_deposit_by_customer: {},
        record_version: 1,
      };
      state.wallets.set(partnerId, wallet);
    }
    return wallet;
  }

  function addLedgerEntry(input) {
    requireObject(input, ["wallet_id", "entry_type", "amount", "currency", "conservation_group", "before_ref", "after_ref", "idempotency_key"]);
    parseMoney(input.amount);
    if (state.ledgerEntries.has(input.idempotency_key)) {
      const prior = state.ledgerEntries.get(input.idempotency_key);
      if (stablePayload(prior) !== stablePayload(input)) throw new DomainError("AFF-40902", "Ledger idempotency key payload conflict");
      return prior;
    }
    const entry = {
      ledger_entry_id: nextId("LED"),
      ...input,
      record_version: 1,
      created_at: clock(),
    };
    state.ledgerEntries.set(entry.idempotency_key, entry);
    return entry;
  }

  function addWithdrawableLot(partnerId, amountCents, sourceEntryId, availableAt, currency = "USD") {
    walletFor(partnerId, currency);
    const lotId = nextId("LOT");
    const lot = {
      lot_id: lotId,
      partner_id: partnerId,
      source_ledger_entry_id: sourceEntryId,
      original_amount: formatMoney(amountCents),
      remaining_amount: formatMoney(amountCents),
      available_at: availableAt || clock(),
      allocation_sort_key: `${availableAt || clock()}:${lotId}`,
      record_version: 1,
    };
    state.walletLots.set(lotId, lot);
    return lot;
  }

  function activeAllocationsByLot(partnerId) {
    const result = new Map();
    for (const allocation of state.withdrawalAllocations.values()) {
      if (allocation.partner_id !== partnerId || !["active", "partially_consumed"].includes(allocation.state)) continue;
      result.set(allocation.lot_id, (result.get(allocation.lot_id) || 0) + parseMoney(allocation.locked_amount));
    }
    return result;
  }

  function availableLots(partnerId) {
    const locked = activeAllocationsByLot(partnerId);
    return [...state.walletLots.values()]
      .filter(lot => lot.partner_id === partnerId)
      .sort((left, right) => left.allocation_sort_key.localeCompare(right.allocation_sort_key))
      .map(lot => ({
        lot,
        available_cents: parseMoney(lot.remaining_amount) - (locked.get(lot.lot_id) || 0),
      }))
      .filter(item => item.available_cents > 0);
  }

  function availableBalanceCents(partnerId) {
    return availableLots(partnerId).reduce((total, item) => total + item.available_cents, 0);
  }

  function planFifo(partnerId, amountCents) {
    const plan = [];
    let remaining = amountCents;
    for (const item of availableLots(partnerId)) {
      if (remaining <= 0) break;
      const use = Math.min(remaining, item.available_cents);
      plan.push({lot: item.lot, amount_cents: use});
      remaining -= use;
    }
    return {plan, sufficient: remaining === 0, shortfall_cents: remaining};
  }

  function reserveDeposit(input) {
    requireObject(input, ["partner_id", "customer_id", "amount", "source_ref", "idempotency_key", "config_version"]);
    return idempotentCall(`reserveDeposit:${input.idempotency_key}`, input, payload => {
      const amountCents = parseMoney(payload.amount);
      if (amountCents <= 0) throw new DomainError("AFF-42203", "Deposit amount must be positive");
      const wallet = walletFor(payload.partner_id, payload.currency || "USD");
      const before = wallet.deposit_by_customer[payload.customer_id] || 0;
      const entry = addLedgerEntry({
        wallet_id: wallet.wallet_id,
        entry_type: "deposit_reserve",
        amount: payload.amount,
        currency: payload.currency || "USD",
        conservation_group: payload.conservation_group || `DEPOSIT:${payload.source_ref}`,
        before_ref: `${wallet.wallet_id}:deposit:${payload.customer_id}:${formatMoney(before)}`,
        after_ref: `${wallet.wallet_id}:deposit:${payload.customer_id}:${formatMoney(before + amountCents)}`,
        idempotency_key: payload.idempotency_key,
      });
      wallet.deposit_by_customer[payload.customer_id] = before + amountCents;
      wallet.record_version += 1;
      const record = {
        deposit_entry_id: nextId("DEP"),
        partner_id: payload.partner_id,
        customer_id: payload.customer_id,
        amount: payload.amount,
        source_ref: payload.source_ref,
        config_version: payload.config_version,
        state: "reserved",
        ledger_entry_id: entry.ledger_entry_id,
        record_version: 1,
      };
      state.depositEntries.set(record.deposit_entry_id, record);
      emit("deposit_entry_changed", "DepositEntry", record.deposit_entry_id, snapshot(record), payload, ["AFF-REQ-F05", "FEATURE-FUND-02"]);
      return {deposit_entry: snapshot(record), ledger_entry: snapshot(entry), wallet_version: wallet.record_version};
    });
  }

  function releaseDeposit(input) {
    requireObject(input, ["deposit_entry_id", "reason_code", "idempotency_key"]);
    const record = state.depositEntries.get(input.deposit_entry_id);
    if (!record || record.state !== "reserved") throw new DomainError("AFF-40901", "Reserved deposit entry not found");
    return idempotentCall(`releaseDeposit:${input.idempotency_key}`, input, payload => {
      const wallet = walletFor(record.partner_id);
      const amountCents = parseMoney(record.amount);
      const before = wallet.deposit_by_customer[record.customer_id] || 0;
      if (before < amountCents) throw new DomainError("AFF-50002", "Deposit conservation failure");
      const entry = addLedgerEntry({
        wallet_id: wallet.wallet_id,
        entry_type: "deposit_release",
        amount: formatMoney(-amountCents),
        currency: "USD",
        conservation_group: `DEPOSIT:${record.source_ref}`,
        before_ref: `${wallet.wallet_id}:deposit:${record.customer_id}:${formatMoney(before)}`,
        after_ref: `${wallet.wallet_id}:deposit:${record.customer_id}:${formatMoney(before - amountCents)}`,
        idempotency_key: payload.idempotency_key,
      });
      wallet.deposit_by_customer[record.customer_id] = before - amountCents;
      wallet.record_version += 1;
      record.state = "released";
      record.record_version += 1;
      const lot = addWithdrawableLot(record.partner_id, amountCents, entry.ledger_entry_id, payload.available_at, "USD");
      emit("deposit_entry_changed", "DepositEntry", record.deposit_entry_id, snapshot(record), payload, ["AFF-REQ-F05", "FEATURE-FUND-02"]);
      return {deposit_entry: snapshot(record), ledger_entry: snapshot(entry), wallet_lot: snapshot(lot)};
    });
  }

  function evaluateSettlementCase(input) {
    requireObject(input, ["commission_case_id", "partner_id", "customer_id", "amount", "deposit_ratio", "config_version", "gate_evaluation_refs", "gate_result", "hold_started_at"]);
    const priorCase = [...state.settlementCases.values()]
      .find(item => item.commission_case_id === input.commission_case_id);
    if (priorCase) {
      if (priorCase.source_input_hash !== stablePayload(input)) {
        throw new DomainError("AFF-40902", "Commission case already settled with different inputs");
      }
      return {settlement_case: snapshot(priorCase), conservation_difference: "0.00", idempotent_replay: true};
    }
    const amountCents = parseMoney(input.amount);
    const ratioMillionths = parseRatio(input.deposit_ratio);
    if (amountCents <= 0) throw new DomainError("AFF-42203", "Settlement amount must be positive");
    if (input.gate_result !== "passed") {
      const blocked = {
        settlement_case_id: nextId("SET"),
        commission_case_id: input.commission_case_id,
        partner_id: input.partner_id,
        customer_id: input.customer_id,
        gate_evaluation_refs: input.gate_evaluation_refs,
        state: input.gate_result === "data_blocked" ? "data_blocked" : "blocked",
        reason_code: input.reason_code || `${input.gate_result}_gate`,
        hold_started_at: input.hold_started_at,
        commission_amount: input.amount,
        source_input_hash: stablePayload(input),
        deposit_amount: "0.00",
        withdrawable_amount: "0.00",
        record_version: 1,
      };
      state.settlementCases.set(blocked.settlement_case_id, blocked);
      const blockedEvent = emit("settlement_case_changed", "SettlementCase", blocked.settlement_case_id, snapshot(blocked), input, ["AFF-REQ-FND-101", "FEATURE-FUND-01"]);
      return {settlement_case: snapshot(blocked), conservation_difference: "0.00", event_id: blockedEvent.event_id};
    }

    const depositCents = Math.round((amountCents * ratioMillionths) / 1000000);
    const withdrawableCents = amountCents - depositCents;
    const conservationGroup = `SETTLE:${input.commission_case_id}`;
    const wallet = walletFor(input.partner_id, input.currency || "USD");
    const sourceEntry = addLedgerEntry({
      wallet_id: wallet.wallet_id,
      entry_type: "commission_source_release",
      amount: formatMoney(-amountCents),
      currency: input.currency || "USD",
      conservation_group: conservationGroup,
      before_ref: `${input.commission_case_id}:payable`,
      after_ref: `${input.commission_case_id}:released`,
      idempotency_key: `${input.commission_case_id}:source`,
    });
    const settlementCase = {
      settlement_case_id: nextId("SET"),
      commission_case_id: input.commission_case_id,
      partner_id: input.partner_id,
      customer_id: input.customer_id,
      gate_evaluation_refs: input.gate_evaluation_refs,
      state: "settled",
      reason_code: "accounting_complete",
      hold_started_at: input.hold_started_at,
      commission_amount: input.amount,
      source_input_hash: stablePayload(input),
      deposit_amount: formatMoney(depositCents),
      withdrawable_amount: formatMoney(withdrawableCents),
      conservation_group: conservationGroup,
      record_version: 1,
    };
    state.settlementCases.set(settlementCase.settlement_case_id, settlementCase);

    const depositBefore = wallet.deposit_by_customer[input.customer_id] || 0;
    const depositEntry = addLedgerEntry({
      wallet_id: wallet.wallet_id,
      entry_type: "deposit_credit",
      amount: formatMoney(depositCents),
      currency: input.currency || "USD",
      conservation_group: conservationGroup,
      before_ref: `${wallet.wallet_id}:deposit:${input.customer_id}:${formatMoney(depositBefore)}`,
      after_ref: `${wallet.wallet_id}:deposit:${input.customer_id}:${formatMoney(depositBefore + depositCents)}`,
      idempotency_key: `${input.commission_case_id}:deposit`,
    });
    wallet.deposit_by_customer[input.customer_id] = depositBefore + depositCents;
    wallet.record_version += 1;

    const withdrawableEntry = addLedgerEntry({
      wallet_id: wallet.wallet_id,
      entry_type: "withdrawable_credit",
      amount: formatMoney(withdrawableCents),
      currency: input.currency || "USD",
      conservation_group: conservationGroup,
      before_ref: `${wallet.wallet_id}:available:${formatMoney(availableBalanceCents(input.partner_id))}`,
      after_ref: `${wallet.wallet_id}:available:${formatMoney(availableBalanceCents(input.partner_id) + withdrawableCents)}`,
      idempotency_key: `${input.commission_case_id}:withdrawable`,
    });
    const lot = addWithdrawableLot(input.partner_id, withdrawableCents, withdrawableEntry.ledger_entry_id, input.available_at, input.currency || "USD");
    settlementCase.ledger_entry_ids = [sourceEntry.ledger_entry_id, depositEntry.ledger_entry_id, withdrawableEntry.ledger_entry_id];
    settlementCase.wallet_lot_id = lot.lot_id;
    const event = emit("settlement_case_changed", "SettlementCase", settlementCase.settlement_case_id, snapshot(settlementCase), input, ["AFF-REQ-FND-101", "AFF-REQ-FND-103", "FEATURE-FUND-01"]);
    return {
      settlement_case: snapshot(settlementCase),
      ledger_entries: [snapshot(sourceEntry), snapshot(depositEntry), snapshot(withdrawableEntry)],
      wallet_lot: snapshot(lot),
      conservation_difference: formatMoney(depositCents + withdrawableCents - amountCents),
      event_id: event.event_id,
    };
  }

  function startSettlementRun(input) {
    requireObject(input, ["settlement_date", "timezone", "config_version", "cases", "idempotency_key"]);
    return idempotentCall(`startSettlementRun:${input.idempotency_key}`, input, payload => {
      const runId = nextId("RUN");
      const run = {
        settlement_run_id: runId,
        settlement_date: payload.settlement_date,
        timezone: payload.timezone,
        config_version: payload.config_version,
        run_state: "running",
        case_count: payload.cases.length,
        passed_count: 0,
        blocked_count: 0,
        failed_count: 0,
        recovery_checkpoint: {last_case_index: 0},
        record_version: 1,
      };
      state.settlementRuns.set(runId, run);
      const results = [];
      payload.cases.forEach((caseWithRunFields, index) => {
        const {run_id, ...businessCase} = caseWithRunFields;
        const result = evaluateSettlementCase({...businessCase, config_version: payload.config_version});
        results.push(result);
        if (result.settlement_case.state === "settled") run.passed_count += 1;
        else run.blocked_count += 1;
        run.recovery_checkpoint = {last_case_index: index + 1, last_case_id: result.settlement_case.settlement_case_id};
      });
      run.run_state = "completed";
      run.record_version += 1;
      emit("settlement_run_completed", "SettlementRun", runId, snapshot(run), payload, ["AFF-REQ-FND-101", "FEATURE-FUND-01"]);
      return {
        settlement_run: snapshot(run),
        case_results: results.map(item => ({
          settlement_case: item.settlement_case,
          conservation_difference: item.conservation_difference,
          idempotent_replay: item.idempotent_replay || false,
        })),
      };
    });
  }

  function conservationDifference(group) {
    const entries = [...state.ledgerEntries.values()].filter(entry => entry.conservation_group === group);
    return formatMoney(entries.reduce((total, entry) => total + parseMoney(entry.amount), 0));
  }

  function generateStatement(input) {
    requireObject(input, ["partner_id", "period_start", "period_end", "timezone", "legal_entity", "currency", "opening_amount", "closing_amount", "case_refs", "idempotency_key"]);
    return idempotentCall(`generateStatement:${input.idempotency_key}`, input, payload => {
      parseMoney(payload.opening_amount);
      parseMoney(payload.closing_amount);
      const statementId = `STM-${payload.partner_id}-${payload.period_start}`;
      let statement = state.statements.get(statementId);
      if (!statement) {
        statement = {
          statement_id: statementId,
          partner_id: payload.partner_id,
          period_start: payload.period_start,
          period_end: payload.period_end,
          timezone: payload.timezone,
          legal_entity: payload.legal_entity,
          currency: payload.currency,
          current_version: "1",
          source_input_hash: stablePayload(payload),
          record_version: 1,
        };
        state.statements.set(statementId, statement);
      } else if (statement.source_input_hash !== stablePayload(payload)) {
        throw new DomainError("AFF-40902", "Statement period already generated with different inputs");
      } else {
        const existing = state.statementVersions.get(`${statementId}:1`);
        return {statement: snapshot(statement), statement_version: snapshot(existing), idempotent_replay: true};
      }
      const version = {
        statement_id: statementId,
        statement_version: 1,
        version_type: "original",
        case_refs: payload.case_refs,
        opening_amount: payload.opening_amount,
        closing_amount: payload.closing_amount,
        status: payload.status || "draft",
        correction_diff: {},
        record_version: 1,
      };
      state.statementVersions.set(`${statementId}:1`, version);
      const event = emit("statement_generated", "StatementVersion", `${statementId}:1`, snapshot(version), payload, ["AFF-REQ-A15", "FEATURE-FUND-02"]);
      return {statement: snapshot(statement), statement_version: snapshot(version), event_id: event.event_id};
    });
  }

  function correctStatement(input) {
    requireObject(input, ["statement_id", "closing_amount", "correction_diff", "reason_code", "actor_id", "idempotency_key"]);
    return idempotentCall(`correctStatement:${input.idempotency_key}`, input, payload => {
      const statement = state.statements.get(payload.statement_id);
      if (!statement) throw new DomainError("AFF-40401", "Statement not found");
      const versions = [...state.statementVersions.keys()]
        .filter(key => key.startsWith(`${payload.statement_id}:`))
        .map(key => Number(key.split(":").at(-1)));
      const priorVersion = Math.max(...versions);
      const prior = state.statementVersions.get(`${payload.statement_id}:${priorVersion}`);
      const nextVersionNumber = priorVersion + 1;
      const corrected = {
        ...snapshot(prior),
        statement_version: nextVersionNumber,
        version_type: "correction",
        closing_amount: payload.closing_amount,
        status: "correction_pending_reconciliation",
        correction_diff: payload.correction_diff,
        correction_of_version: priorVersion,
        corrected_at: clock(),
        corrected_by: payload.actor_id,
        reason_code: payload.reason_code,
        record_version: 1,
      };
      state.statementVersions.set(`${payload.statement_id}:${nextVersionNumber}`, corrected);
      statement.current_version = String(nextVersionNumber);
      statement.record_version += 1;
      const task = {task_id: nextId("TASK"), task_type: "statement_reconciliation", source_ref: `${payload.statement_id}:${nextVersionNumber}`, state: "open", owner_role: "finance"};
      state.tasks.push(task);
      const event = emit("statement_corrected", "StatementVersion", `${payload.statement_id}:${nextVersionNumber}`, snapshot(corrected), payload, ["AFF-REQ-A15", "FEATURE-FUND-02"]);
      return {statement: snapshot(statement), statement_version: snapshot(corrected), prior_version_readable: snapshot(prior), task, event_id: event.event_id};
    });
  }

  function previewWithdrawalAllocation(input) {
    requireObject(input, ["partner_id", "requested_amount", "fee"]);
    const requested = parseMoney(input.requested_amount);
    const fee = parseMoney(input.fee);
    if (requested <= 0 || fee < 0 || fee > requested) throw new DomainError("AFF-42203", "Invalid withdrawal amount or fee");
    const plan = planFifo(input.partner_id, requested);
    if (!plan.sufficient) {
      return {
        sufficient: false,
        available_amount: formatMoney(availableBalanceCents(input.partner_id)),
        shortfall_amount: formatMoney(plan.shortfall_cents),
        allocations: [],
      };
    }
    return {
      sufficient: true,
      available_amount: formatMoney(availableBalanceCents(input.partner_id)),
      net_amount: formatMoney(requested - fee),
      allocations: plan.plan.map(item => ({
        lot_id: item.lot.lot_id,
        ledger_entry_id: item.lot.source_ledger_entry_id,
        allocated_amount: formatMoney(item.amount_cents),
        available_at: item.lot.available_at,
        allocation_sort_key: item.lot.allocation_sort_key,
      })),
    };
  }

  function submitWithdrawal(input) {
    requireObject(input, ["partner_id", "request_ref", "requested_amount", "fee", "currency", "idempotency_key"]);
    return idempotentCall(`submitWithdrawal:${input.partner_id}:${input.request_ref}`, input, payload => {
      const requested = parseMoney(payload.requested_amount);
      const fee = parseMoney(payload.fee);
      if (requested <= 0 || fee < 0 || fee > requested) throw new DomainError("AFF-42203", "Invalid withdrawal amount or fee");
      const plan = planFifo(payload.partner_id, requested);
      const withdrawalId = nextId("WDR");
      const withdrawal = {
        withdrawal_id: withdrawalId,
        partner_id: payload.partner_id,
        request_ref: payload.request_ref,
        requested_amount: payload.requested_amount,
        fee: payload.fee,
        net_amount: formatMoney(requested - fee),
        currency: payload.currency,
        state: plan.sufficient ? "pending_review" : "rejected",
        status_reason_code: plan.sufficient ? "allocation_locked" : "insufficient_balance",
        allocation_snapshot_version: 1,
        record_version: 1,
      };
      state.withdrawals.set(withdrawalId, withdrawal);
      if (!plan.sufficient) {
        const event = emit("withdrawal_rejected", "Withdrawal", withdrawalId, snapshot(withdrawal), payload, ["AFF-REQ-FND-104", "FEATURE-FUND-04"]);
        return {withdrawal: snapshot(withdrawal), allocations: [], event_id: event.event_id};
      }
      const allocations = plan.plan.map(item => {
        const allocation = {
          allocation_id: nextId("ALLOC"),
          withdrawal_id: withdrawalId,
          partner_id: payload.partner_id,
          lot_id: item.lot.lot_id,
          ledger_entry_id: item.lot.source_ledger_entry_id,
          allocated_amount: formatMoney(item.amount_cents),
          locked_amount: formatMoney(item.amount_cents),
          available_at: item.lot.available_at,
          allocation_sort_key: item.lot.allocation_sort_key,
          state: "active",
          record_version: 1,
        };
        state.withdrawalAllocations.set(allocation.allocation_id, allocation);
        return allocation;
      });
      const event = emit("withdrawal_submitted", "Withdrawal", withdrawalId, snapshot(withdrawal), payload, ["AFF-REQ-FND-104", "FEATURE-FUND-04"]);
      return {withdrawal: snapshot(withdrawal), allocations: allocations.map(snapshot), event_id: event.event_id};
    });
  }

  function setWithdrawalState(input, allowedFrom, nextState, reason, eventType) {
    requireObject(input, ["withdrawal_id", "actor_id", "reason_code"]);
    const withdrawal = state.withdrawals.get(input.withdrawal_id);
    if (!withdrawal) throw new DomainError("AFF-40401", "Withdrawal not found");
    if (!allowedFrom.includes(withdrawal.state)) throw new DomainError("AFF-40901", `Illegal withdrawal transition ${withdrawal.state} -> ${nextState}`);
    withdrawal.state = nextState;
    withdrawal.status_reason_code = reason;
    withdrawal.record_version += 1;
    if (["rejected", "cancelled"].includes(nextState)) {
      for (const allocation of state.withdrawalAllocations.values()) {
        if (allocation.withdrawal_id === withdrawal.withdrawal_id && allocation.state !== "released") {
          allocation.state = "released";
          allocation.record_version += 1;
        }
      }
    }
    const event = emit(eventType, "Withdrawal", withdrawal.withdrawal_id, snapshot(withdrawal), input, ["AFF-REQ-FND-104", "FEATURE-FUND-04"]);
    return {withdrawal: snapshot(withdrawal), event_id: event.event_id};
  }

  function approveWithdrawal(input) {
    return setWithdrawalState(input, ["pending_review"], "approved", input.reason_code || "finance_approved", "withdrawal_approved");
  }

  function rejectWithdrawal(input) {
    return setWithdrawalState(input, ["pending_review"], "rejected", input.reason_code || "finance_rejected", "withdrawal_rejected");
  }

  function cancelWithdrawal(input) {
    return setWithdrawalState(input, ["pending_review", "approved"], "cancelled", input.reason_code || "partner_cancelled", "withdrawal_cancelled");
  }

  function createPayoutAttempt(input) {
    requireObject(input, ["withdrawal_id", "idempotency_key"]);
    const withdrawal = state.withdrawals.get(input.withdrawal_id);
    if (!withdrawal) throw new DomainError("AFF-40401", "Withdrawal not found");
    if (withdrawal.state !== "approved") throw new DomainError("AFF-40901", "Only an approved withdrawal can create a payout");
    return idempotentCall(`createPayoutAttempt:${input.idempotency_key}`, input, payload => {
      const attemptNumber = [...state.payoutAttempts.values()].filter(item => item.withdrawal_id === withdrawal.withdrawal_id).length + 1;
      const payout = {
        payout_attempt_id: nextId("PAY"),
        withdrawal_id: withdrawal.withdrawal_id,
        partner_id: withdrawal.partner_id,
        attempt: String(attemptNumber),
        amount: input.amount || withdrawal.requested_amount,
        provider_operation: input.provider_operation || "test-double:create-payout",
        provider_request_ref: "none",
        provider_transaction_ref: "none",
        state: "created",
        raw_status: "not_submitted",
        mapped_status: "not_submitted",
        paid_amount: "0.00",
        unpaid_amount: input.amount || withdrawal.requested_amount,
        query_count: 0,
        record_version: 1,
      };
      state.payoutAttempts.set(payout.payout_attempt_id, payout);
      const event = emit("payout_attempt_created", "PayoutAttempt", payout.payout_attempt_id, snapshot(payout), payload, ["AFF-REQ-FND-106", "FEATURE-FUND-06"]);
      return {payout_attempt: snapshot(payout), event_id: event.event_id};
    });
  }

  function consumeAllocations(withdrawalId, amountCents) {
    let remaining = amountCents;
    for (const allocation of state.withdrawalAllocations.values()) {
      if (allocation.withdrawal_id !== withdrawalId || !["active", "partially_consumed"].includes(allocation.state)) continue;
      if (remaining <= 0) break;
      const locked = parseMoney(allocation.locked_amount);
      const consumed = Math.min(locked, remaining);
      allocation.locked_amount = formatMoney(locked - consumed);
      allocation.state = parseMoney(allocation.locked_amount) === 0 ? "consumed" : "partially_consumed";
      allocation.record_version += 1;
      const lot = state.walletLots.get(allocation.lot_id);
      if (!lot) throw new DomainError("AFF-50002", "Wallet lot missing during payout");
      lot.remaining_amount = formatMoney(parseMoney(lot.remaining_amount) - consumed);
      lot.record_version += 1;
      remaining -= consumed;
    }
    if (remaining !== 0) throw new DomainError("AFF-50002", "Payout allocation conservation failure");
  }

  function applyProviderResult(payout, result, context) {
    requireObject(context, ["provider_request_ref"]);
    payout.provider_request_ref = context.provider_request_ref;
    payout.provider_transaction_ref = context.provider_transaction_ref || payout.provider_transaction_ref;
    payout.raw_status = result.raw_status || result;
    payout.mapped_status = result.mapped_status || result;
    payout.query_count += result.query ? 1 : 0;
    payout.record_version += 1;
    const amountCents = parseMoney(payout.amount);
    if (payout.mapped_status === "success") {
      payout.state = "success";
      payout.paid_amount = payout.amount;
      payout.unpaid_amount = "0.00";
      consumeAllocations(payout.withdrawal_id, amountCents);
      const withdrawal = state.withdrawals.get(payout.withdrawal_id);
      withdrawal.state = "paid";
      withdrawal.status_reason_code = "provider_success";
      withdrawal.record_version += 1;
    } else if (payout.mapped_status === "partial_success") {
      requireObject(result, ["paid_amount", "unpaid_amount"]);
      const paid = parseMoney(result.paid_amount);
      const unpaid = parseMoney(result.unpaid_amount);
      if (paid + unpaid !== amountCents || paid <= 0 || unpaid < 0) throw new DomainError("AFF-42203", "Partial amounts must equal payout amount");
      payout.state = "partial_success";
      payout.paid_amount = result.paid_amount;
      payout.unpaid_amount = result.unpaid_amount;
      consumeAllocations(payout.withdrawal_id, paid);
      const withdrawal = state.withdrawals.get(payout.withdrawal_id);
      withdrawal.state = "partial_success";
      withdrawal.status_reason_code = "provider_partial_success";
      withdrawal.record_version += 1;
    } else if (payout.mapped_status === "failed") {
      payout.state = "failed";
      payout.unpaid_amount = payout.amount;
      const withdrawal = state.withdrawals.get(payout.withdrawal_id);
      withdrawal.state = "approved";
      withdrawal.status_reason_code = "provider_failed";
      withdrawal.record_version += 1;
    } else if (payout.mapped_status === "unknown" || payout.mapped_status === "processing") {
      payout.state = "unknown";
      payout.unpaid_amount = payout.amount;
      const withdrawal = state.withdrawals.get(payout.withdrawal_id);
      withdrawal.state = "unknown";
      withdrawal.status_reason_code = "provider_result_unknown";
      withdrawal.record_version += 1;
    } else {
      throw new DomainError("AFF-42201", "Unknown provider result");
    }
    return payout;
  }

  function submitPayoutAttempt(input) {
    requireObject(input, ["payout_attempt_id", "provider_request_ref", "idempotency_key"]);
    const payout = state.payoutAttempts.get(input.payout_attempt_id);
    if (!payout) throw new DomainError("AFF-40401", "Payout attempt not found");
    return idempotentCall(`submitPayoutAttempt:${input.idempotency_key}`, input, payload => {
      if (payout.state === "unknown") throw new DomainError("AFF-40901", "Query the original provider operation before retry");
      applyProviderResult(payout, payload.provider_result || {raw_status: "timeout", mapped_status: "unknown"}, payload);
      const event = emit("payout_attempt_submitted", "PayoutAttempt", payout.payout_attempt_id, snapshot(payout), payload, ["AFF-REQ-FND-106", "FEATURE-FUND-06"]);
      return {payout_attempt: snapshot(payout), event_id: event.event_id};
    });
  }

  function queryPayoutAttempt(input) {
    requireObject(input, ["payout_attempt_id", "provider_result", "provider_request_ref", "idempotency_key"]);
    const payout = state.payoutAttempts.get(input.payout_attempt_id);
    if (!payout) throw new DomainError("AFF-40401", "Payout attempt not found");
    return idempotentCall(`queryPayoutAttempt:${input.idempotency_key}`, input, payload => {
      if (payout.state !== "unknown") throw new DomainError("AFF-40901", "Only an unknown payout result can be replaced by a provider query");
      applyProviderResult(payout, {...payload.provider_result, query: true}, payload);
      const event = emit("payout_attempt_queried", "PayoutAttempt", payout.payout_attempt_id, snapshot(payout), payload, ["AFF-REQ-FND-106", "FEATURE-FUND-06"]);
      return {payout_attempt: snapshot(payout), event_id: event.event_id};
    });
  }

  function applyPayoutCallback(input) {
    requireObject(input, ["payout_attempt_id", "provider_event_id", "provider_request_ref", "provider_result", "idempotency_key"]);
    const callbackKey = `applyPayoutCallback:${input.provider_event_id}`;
    const prior = idempotency.get(callbackKey);
    if (prior) {
      if (prior.payloadHash !== stablePayload(input)) throw new DomainError("AFF-40902", "Provider event key conflicts with a different payload");
      return {...prior.result, idempotent_replay: true, duplicate_ignored: true};
    }
    const action = payload => {
      const payout = state.payoutAttempts.get(payload.payout_attempt_id);
      if (!payout) throw new DomainError("AFF-40401", "Payout attempt not found");
      if (payout.state === "success") return {payout_attempt: snapshot(payout), duplicate_ignored: true};
      applyProviderResult(payout, payload.provider_result, payload);
      state.providerCallbacks.set(payload.provider_event_id, {
        provider_event_id: payload.provider_event_id,
        payout_attempt_id: payout.payout_attempt_id,
        provider_transaction_ref: payout.provider_transaction_ref,
        received_at: clock(),
      });
      const event = emit("payout_callback_received", "PayoutAttempt", payout.payout_attempt_id, snapshot(payout), payload, ["AFF-REQ-FND-106", "FEATURE-FUND-06"]);
      return {payout_attempt: snapshot(payout), event_id: event.event_id};
    };
    const result = action(input);
    idempotency.set(callbackKey, {payloadHash: stablePayload(input), result});
    return result;
  }

  function retryPayoutUnpaid(input) {
    requireObject(input, ["withdrawal_id", "idempotency_key"]);
    const withdrawal = state.withdrawals.get(input.withdrawal_id);
    if (!withdrawal || withdrawal.state !== "partial_success") throw new DomainError("AFF-40901", "Partial-success withdrawal not found");
    const prior = [...state.payoutAttempts.values()]
      .filter(item => item.withdrawal_id === withdrawal.withdrawal_id)
      .sort((left, right) => Number(left.attempt) - Number(right.attempt))
      .at(-1);
    if (!prior || parseMoney(prior.unpaid_amount) <= 0) throw new DomainError("AFF-40901", "No explicit unpaid amount remains");
    return idempotentCall(`retryPayoutUnpaid:${input.idempotency_key}`, input, payload => {
      const attemptNumber = [...state.payoutAttempts.values()].filter(item => item.withdrawal_id === withdrawal.withdrawal_id).length + 1;
      const retry = {
        ...snapshot(prior),
        payout_attempt_id: nextId("PAY"),
        attempt: String(attemptNumber),
        amount: prior.unpaid_amount,
        paid_amount: "0.00",
        unpaid_amount: prior.unpaid_amount,
        provider_request_ref: "none",
        provider_transaction_ref: "none",
        state: "created",
        raw_status: "not_submitted",
        mapped_status: "not_submitted",
        query_count: 0,
        record_version: 1,
      };
      state.payoutAttempts.set(retry.payout_attempt_id, retry);
      const event = emit("payout_retry_created", "PayoutAttempt", retry.payout_attempt_id, snapshot(retry), payload, ["AFF-REQ-FND-106", "FEATURE-FUND-06"]);
      return {payout_attempt: snapshot(retry), event_id: event.event_id};
    });
  }

  function reconcilePayoutAttempt(input) {
    requireObject(input, ["payout_attempt_id", "provider_amount", "ledger_amount", "provider_fact_refs", "idempotency_key"]);
    return idempotentCall(`reconcilePayoutAttempt:${input.idempotency_key}`, input, payload => {
      const payout = state.payoutAttempts.get(payload.payout_attempt_id);
      if (!payout) throw new DomainError("AFF-40401", "Payout attempt not found");
      const difference = parseMoney(payload.provider_amount) - parseMoney(payload.ledger_amount);
      const task = difference === 0 ? null : {
        task_id: nextId("TASK"),
        task_type: "payment_reconciliation",
        source_ref: payout.payout_attempt_id,
        state: "open",
        owner_role: "finance",
      };
      if (task) state.tasks.push(task);
      const record = {
        reconciliation_id: nextId("REC"),
        payout_attempt_id: payout.payout_attempt_id,
        provider_fact_refs: payload.provider_fact_refs,
        ledger_refs: payload.ledger_refs || [payout.payout_attempt_id],
        difference_amount: formatMoney(difference),
        result: difference === 0 ? "matched" : "difference",
        task_id: task ? task.task_id : "none",
        record_version: 1,
      };
      state.reconciliations.set(record.reconciliation_id, record);
      const event = emit("withdrawal_reconciled", "ReconciliationRecord", record.reconciliation_id, snapshot(record), payload, ["AFF-REQ-FND-107", "FEATURE-FUND-06"]);
      return {reconciliation_record: snapshot(record), task, event_id: event.event_id};
    });
  }

  function debitWithdrawable(partnerId, amountCents, reversalId) {
    const plan = planFifo(partnerId, amountCents);
    if (!plan.sufficient) throw new DomainError("AFF-42211", "Withdrawable balance insufficient for reversal offset");
    const wallet = walletFor(partnerId);
    for (const item of plan.plan) {
      item.lot.remaining_amount = formatMoney(parseMoney(item.lot.remaining_amount) - item.amount_cents);
      item.lot.record_version += 1;
      addLedgerEntry({
        wallet_id: wallet.wallet_id,
        entry_type: "reversal_withdrawable_debit",
        amount: formatMoney(-item.amount_cents),
        currency: "USD",
        conservation_group: `REVERSAL:${reversalId}`,
        before_ref: `${item.lot.lot_id}:${formatMoney(parseMoney(item.lot.remaining_amount) + item.amount_cents)}`,
        after_ref: `${item.lot.lot_id}:${item.lot.remaining_amount}`,
        idempotency_key: `${reversalId}:withdrawable:${item.lot.lot_id}`,
      });
    }
  }

  function createReversal(input) {
    requireObject(input, ["partner_id", "customer_id", "external_ref", "original_case_ref", "payment_ref", "approved_amount", "unreleased_case_action", "offset_order_version", "idempotency_key"]);
    return idempotentCall(`createReversal:${input.external_ref}`, input, payload => {
      const approved = parseMoney(payload.approved_amount);
      if (approved <= 0) throw new DomainError("AFF-42203", "Reversal amount must be positive");
      const wallet = walletFor(payload.partner_id);
      let remaining = approved;
      const unreleasedAction = Math.min(parseMoney(payload.unreleased_case_action || "0.00"), remaining);
      remaining -= unreleasedAction;
      const sameCustomerAvailable = wallet.deposit_by_customer[payload.customer_id] || 0;
      const sameCustomerDeduction = Math.min(sameCustomerAvailable, remaining);
      remaining -= sameCustomerDeduction;
      if (sameCustomerDeduction > 0) {
        wallet.deposit_by_customer[payload.customer_id] = sameCustomerAvailable - sameCustomerDeduction;
        addLedgerEntry({
          wallet_id: wallet.wallet_id,
          entry_type: "reversal_same_customer_deposit_debit",
          amount: formatMoney(-sameCustomerDeduction),
          currency: "USD",
          conservation_group: `REVERSAL:${payload.external_ref}`,
          before_ref: `${wallet.wallet_id}:deposit:${payload.customer_id}:${formatMoney(sameCustomerAvailable)}`,
          after_ref: `${wallet.wallet_id}:deposit:${payload.customer_id}:${formatMoney(sameCustomerAvailable - sameCustomerDeduction)}`,
          idempotency_key: `${payload.external_ref}:same-customer-deposit`,
        });
      }
      const withdrawableAvailable = availableBalanceCents(payload.partner_id);
      const withdrawableDeduction = Math.min(withdrawableAvailable, remaining);
      remaining -= withdrawableDeduction;
      if (withdrawableDeduction > 0) debitWithdrawable(payload.partner_id, withdrawableDeduction, payload.external_ref);
      const otherDepositAvailable = Object.values(wallet.other_deposit_by_customer).reduce((total, value) => total + value, 0);
      const otherDepositDeduction = Math.min(otherDepositAvailable, remaining);
      remaining -= otherDepositDeduction;
      if (otherDepositDeduction > 0) {
        let toDeduct = otherDepositDeduction;
        for (const customer of Object.keys(wallet.other_deposit_by_customer)) {
          const available = wallet.other_deposit_by_customer[customer];
          const use = Math.min(available, toDeduct);
          wallet.other_deposit_by_customer[customer] = available - use;
          toDeduct -= use;
          if (toDeduct === 0) break;
        }
        addLedgerEntry({
          wallet_id: wallet.wallet_id,
          entry_type: "reversal_same_partner_other_deposit_debit",
          amount: formatMoney(-otherDepositDeduction),
          currency: "USD",
          conservation_group: `REVERSAL:${payload.external_ref}`,
          before_ref: `${wallet.wallet_id}:other-deposit:${formatMoney(otherDepositAvailable)}`,
          after_ref: `${wallet.wallet_id}:other-deposit:${formatMoney(otherDepositAvailable - otherDepositDeduction)}`,
          idempotency_key: `${payload.external_ref}:other-deposit`,
        });
      }
      let debt = null;
      if (remaining > 0) {
        debt = {
          debt_id: nextId("DEBT"),
          partner_id: payload.partner_id,
          source_reversal_ref: payload.external_ref,
          original_amount: formatMoney(remaining),
          remaining_amount: formatMoney(remaining),
          state: "active",
          record_version: 1,
        };
        state.debts.set(debt.debt_id, debt);
      }
      const reversal = {
        reversal_case_id: nextId("REV"),
        partner_id: payload.partner_id,
        customer_id: payload.customer_id,
        external_ref: payload.external_ref,
        original_case_ref: payload.original_case_ref,
        payment_ref: payload.payment_ref,
        approved_amount: payload.approved_amount,
        unreleased_case_action: formatMoney(unreleasedAction),
        same_customer_deposit_deduction: formatMoney(sameCustomerDeduction),
        same_partner_withdrawable_deduction: formatMoney(withdrawableDeduction),
        same_partner_other_deposit_deduction: formatMoney(otherDepositDeduction),
        offset_order_version: payload.offset_order_version,
        debt_ref: debt ? debt.debt_id : "none",
        debt_amount: formatMoney(remaining),
        state: remaining > 0 ? "debt_registered" : "offset_complete",
        record_version: 1,
      };
      state.reversalCases.set(reversal.reversal_case_id, reversal);
      const event = emit("reversal_created", "ReversalCase", reversal.reversal_case_id, snapshot(reversal), payload, ["AFF-REQ-F06", "AFF-REQ-FND-105", "FEATURE-FUND-03"]);
      return {reversal_case: snapshot(reversal), debt: debt ? snapshot(debt) : null, event_id: event.event_id};
    });
  }

  function creditSamePartnerOtherDepositForDouble(input) {
    requireObject(input, ["partner_id", "customer_id", "amount", "idempotency_key"]);
    return idempotentCall(`otherDeposit:${input.idempotency_key}`, input, payload => {
      const wallet = walletFor(payload.partner_id);
      const amount = parseMoney(payload.amount);
      wallet.other_deposit_by_customer[payload.customer_id] = (wallet.other_deposit_by_customer[payload.customer_id] || 0) + amount;
      wallet.record_version += 1;
      return {wallet_version: wallet.record_version};
    });
  }

  return {
    startSettlementRun,
    evaluateSettlementCase,
    reserveDeposit,
    releaseDeposit,
    conservationDifference,
    generateStatement,
    correctStatement,
    previewWithdrawalAllocation,
    submitWithdrawal,
    approveWithdrawal,
    rejectWithdrawal,
    cancelWithdrawal,
    createPayoutAttempt,
    submitPayoutAttempt,
    queryPayoutAttempt,
    applyPayoutCallback,
    retryPayoutUnpaid,
    reconcilePayoutAttempt,
    createReversal,
    creditSamePartnerOtherDepositForDouble,
    availableBalance: partnerId => formatMoney(availableBalanceCents(partnerId)),
    snapshot: () => ({
      settlementRuns: [...state.settlementRuns.values()].map(snapshot),
      settlementCases: [...state.settlementCases.values()].map(snapshot),
      ledgerEntries: [...state.ledgerEntries.values()].map(snapshot),
      wallets: [...state.wallets.values()].map(snapshot),
      walletLots: [...state.walletLots.values()].map(snapshot),
      depositEntries: [...state.depositEntries.values()].map(snapshot),
      statements: [...state.statements.values()].map(snapshot),
      statementVersions: [...state.statementVersions.values()].map(snapshot),
      withdrawals: [...state.withdrawals.values()].map(snapshot),
      withdrawalAllocations: [...state.withdrawalAllocations.values()].map(snapshot),
      payoutAttempts: [...state.payoutAttempts.values()].map(snapshot),
      reconciliationRecords: [...state.reconciliations.values()].map(snapshot),
      reversalCases: [...state.reversalCases.values()].map(snapshot),
      debts: [...state.debts.values()].map(snapshot),
      tasks: state.tasks.map(snapshot),
      events: state.events.map(snapshot),
      audit: state.audit.map(snapshot),
    }),
    DomainError,
  };
}

module.exports = {createP0Mod06Domain, DomainError};
