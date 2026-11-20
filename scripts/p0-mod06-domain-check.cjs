"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createP0Mod06Domain} = require("../domain/p0-mod06.cjs");

const schemas = JSON.parse(fs.readFileSync(path.join(__dirname, "../openapi/schemas/p0-object-schemas.json"), "utf8")).definitions;

function validate(value, schema, at = "$") {
  if (schema.type === "integer" && !Number.isInteger(value)) return `${at}: expected integer`;
  if (schema.type === "array" && !Array.isArray(value)) return `${at}: expected array`;
  if (schema.type === "object" && (typeof value !== "object" || value === null || Array.isArray(value))) return `${at}: expected object`;
  if (schema.type === "string" && typeof value !== "string") return `${at}: expected string`;
  if (schema.type === "object") {
    for (const field of schema.required || []) if (!(field in value) || value[field] === null || value[field] === undefined) return `${at}.${field}: required`;
    for (const [field, child] of Object.entries(schema.properties || {})) if (field in value) {
      const error = validate(value[field], child, `${at}.${field}`);
      if (error) return error;
    }
  }
  if (schema.type === "array") for (const item of value) {
    const error = validate(item, schema.items, at);
    if (error) return error;
  }
  if (typeof value === "string") {
    if (schema.minLength && value.length < schema.minLength) return `${at}: too short`;
    if (schema.pattern && !(new RegExp(schema.pattern)).test(value)) return `${at}: pattern mismatch`;
  }
  return undefined;
}

let checks = 0;
function test(name, fn) {
  fn();
  checks += 1;
  console.log(`PASS ${name}`);
}
function error(fn, code) {
  assert.throws(fn, item => item.code === code);
}

function businessCase(overrides = {}) {
  return {
    commission_case_id: "COMM-A",
    partner_id: "PRT-A",
    customer_id: "CUS-A",
    amount: "100.00",
    deposit_ratio: "0.10",
    currency: "USD",
    gate_evaluation_refs: ["GATE-A"],
    gate_result: "passed",
    hold_started_at: "2026-02-01T00:00:00Z",
    available_at: "2026-03-01T00:00:00Z",
    ...overrides,
  };
}

function settleOne(domain, overrides = {}) {
  return domain.startSettlementRun({
    settlement_date: "2026-03-01",
    timezone: "UTC",
    config_version: overrides.config_version || "funds-test-v1",
    idempotency_key: overrides.run_id || "RUN-A",
    cases: [businessCase(overrides)],
  });
}

function submittedWithdrawal(domain, amount = "100.00", requestRef = "REQ-A") {
  const result = domain.submitWithdrawal({
    partner_id: "PRT-A", request_ref: requestRef, requested_amount: amount,
    fee: "0.00", currency: "USD", idempotency_key: `IDEM-${requestRef}`,
  });
  assert.equal(result.withdrawal.state, "pending_review");
  return result;
}

test("AC23 ledger conservation difference is zero for a successful case", () => {
  const domain = createP0Mod06Domain();
  const result = settleOne(domain);
  const settlementCase = result.case_results[0].settlement_case;
  assert.equal(settlementCase.state, "settled");
  assert.equal(settlementCase.deposit_amount, "10.00");
  assert.equal(settlementCase.withdrawable_amount, "90.00");
  assert.equal(domain.conservationDifference(`SETTLE:${settlementCase.commission_case_id}`), "0.00");
  assert.equal(domain.availableBalance("PRT-A"), "90.00");
});

test("AC24 statement correction creates a readable new version", () => {
  const domain = createP0Mod06Domain();
  const generated = domain.generateStatement({
    partner_id: "PRT-A", period_start: "2026-03-01", period_end: "2026-03-31",
    timezone: "UTC", legal_entity: "test-entity", currency: "USD",
    opening_amount: "0.00", closing_amount: "100.00", case_refs: ["COMM-A"],
    idempotency_key: "STM-A", status: "closed",
  });
  const corrected = domain.correctStatement({
    statement_id: generated.statement.statement_id, closing_amount: "90.00",
    correction_diff: {closing_amount: "-10.00"}, reason_code: "commission_correction",
    actor_id: "finance-reviewer", idempotency_key: "STM-CORR-A",
  });
  assert.equal(corrected.statement_version.statement_version, 2);
  assert.equal(corrected.prior_version_readable.statement_version, 1);
  assert.equal(corrected.prior_version_readable.closing_amount, "100.00");
  assert.equal(corrected.task.owner_role, "finance");
});

test("AC25 monthly statement is not a withdrawal prerequisite", () => {
  const domain = createP0Mod06Domain();
  settleOne(domain);
  domain.generateStatement({
    partner_id: "PRT-A", period_start: "2026-03-01", period_end: "2026-03-31",
    timezone: "UTC", legal_entity: "test-entity", currency: "USD",
    opening_amount: "0.00", closing_amount: "90.00", case_refs: ["COMM-A"],
    idempotency_key: "STM-B", status: "draft",
  });
  const withdrawal = submittedWithdrawal(domain, "90.00", "REQ-STATEMENT");
  assert.equal(withdrawal.withdrawal.state, "pending_review");
});

test("AC26 preview does not lock balance", () => {
  const domain = createP0Mod06Domain();
  settleOne(domain);
  const preview = domain.previewWithdrawalAllocation({partner_id: "PRT-A", requested_amount: "50.00", fee: "0.00"});
  assert.equal(preview.sufficient, true);
  assert.equal(domain.availableBalance("PRT-A"), "90.00");
  assert.equal(domain.snapshot().withdrawalAllocations.length, 0);
});

test("AC27 submit atomically locks the full FIFO allocation", () => {
  const domain = createP0Mod06Domain();
  settleOne(domain, {commission_case_id: "COMM-FIFO-1", amount: "60.00", deposit_ratio: "0.00", run_id: "RUN-FIFO-1"});
  settleOne(domain, {commission_case_id: "COMM-FIFO-2", amount: "40.00", deposit_ratio: "0.00", run_id: "RUN-FIFO-2"});
  const result = submittedWithdrawal(domain, "100.00", "REQ-FIFO");
  assert.deepEqual(result.allocations.map(item => item.allocated_amount), ["60.00", "40.00"]);
  assert.equal(domain.availableBalance("PRT-A"), "0.00");
  assert.equal(result.withdrawal.state, "pending_review");
});

test("AC28 duplicate submit returns the same withdrawal", () => {
  const domain = createP0Mod06Domain();
  settleOne(domain);
  const first = domain.submitWithdrawal({
    partner_id: "PRT-A", request_ref: "REQ-DUP", requested_amount: "90.00",
    fee: "0.00", currency: "USD", idempotency_key: "IDEM-DUP",
  });
  const duplicate = domain.submitWithdrawal({
    partner_id: "PRT-A", request_ref: "REQ-DUP", requested_amount: "90.00",
    fee: "0.00", currency: "USD", idempotency_key: "IDEM-DUP",
  });
  assert.equal(duplicate.idempotent_replay, true);
  assert.equal(duplicate.withdrawal.withdrawal_id, first.withdrawal.withdrawal_id);
  assert.equal(domain.snapshot().withdrawals.length, 1);
});

test("AC29 insufficient balance rejects the whole request", () => {
  const domain = createP0Mod06Domain();
  settleOne(domain);
  const result = domain.submitWithdrawal({
    partner_id: "PRT-A", request_ref: "REQ-INSUFFICIENT", requested_amount: "150.00",
    fee: "0.00", currency: "USD", idempotency_key: "IDEM-INSUFFICIENT",
  });
  assert.equal(result.withdrawal.state, "rejected");
  assert.equal(result.withdrawal.status_reason_code, "insufficient_balance");
  assert.deepEqual(result.allocations, []);
  assert.equal(domain.availableBalance("PRT-A"), "90.00");
});

test("AC30 unknown provider result queries before retry", () => {
  const domain = createP0Mod06Domain();
  settleOne(domain);
  const withdrawal = submittedWithdrawal(domain, "90.00", "REQ-UNKNOWN");
  domain.approveWithdrawal({withdrawal_id: withdrawal.withdrawal.withdrawal_id, actor_id: "finance", reason_code: "approved"});
  const created = domain.createPayoutAttempt({
    withdrawal_id: withdrawal.withdrawal.withdrawal_id, idempotency_key: "PAY-CREATE-UNKNOWN",
  });
  const submitted = domain.submitPayoutAttempt({
    payout_attempt_id: created.payout_attempt.payout_attempt_id,
    provider_request_ref: "PROV-REQ-UNKNOWN", idempotency_key: "PAY-SUBMIT-UNKNOWN",
    provider_result: {raw_status: "timeout", mapped_status: "unknown"},
  });
  assert.equal(submitted.payout_attempt.state, "unknown");
  assert.equal(submitted.payout_attempt.query_count, 0);
  error(() => domain.submitPayoutAttempt({
    payout_attempt_id: submitted.payout_attempt.payout_attempt_id,
    provider_request_ref: "PROV-REQ-UNKNOWN-2", idempotency_key: "PAY-RETRY-BEFORE-QUERY",
    provider_result: {raw_status: "timeout", mapped_status: "unknown"},
  }), "AFF-40901");
  const queried = domain.queryPayoutAttempt({
    payout_attempt_id: submitted.payout_attempt.payout_attempt_id,
    provider_request_ref: "PROV-REQ-UNKNOWN", idempotency_key: "PAY-QUERY-UNKNOWN",
    provider_result: {raw_status: "settled", mapped_status: "success"},
  });
  assert.equal(queried.payout_attempt.state, "success");
  assert.equal(queried.payout_attempt.query_count, 1);
  assert.equal(domain.snapshot().payoutAttempts.length, 1);
});

test("AC31 partial success retries only the explicit unpaid amount", () => {
  const domain = createP0Mod06Domain();
  settleOne(domain);
  const withdrawal = submittedWithdrawal(domain, "90.00", "REQ-PARTIAL");
  domain.approveWithdrawal({withdrawal_id: withdrawal.withdrawal.withdrawal_id, actor_id: "finance", reason_code: "approved"});
  const created = domain.createPayoutAttempt({withdrawal_id: withdrawal.withdrawal.withdrawal_id, idempotency_key: "PAY-PARTIAL-CREATE"});
  const partial = domain.submitPayoutAttempt({
    payout_attempt_id: created.payout_attempt.payout_attempt_id,
    provider_request_ref: "PROV-REQ-PARTIAL", idempotency_key: "PAY-PARTIAL-SUBMIT",
    provider_result: {raw_status: "partial", mapped_status: "partial_success", paid_amount: "60.00", unpaid_amount: "30.00"},
  });
  assert.equal(partial.payout_attempt.paid_amount, "60.00");
  assert.equal(partial.payout_attempt.unpaid_amount, "30.00");
  const retry = domain.retryPayoutUnpaid({withdrawal_id: withdrawal.withdrawal.withdrawal_id, idempotency_key: "PAY-RETRY-UNPAID"});
  assert.equal(retry.payout_attempt.amount, "30.00");
  const paidRetry = domain.submitPayoutAttempt({
    payout_attempt_id: retry.payout_attempt.payout_attempt_id,
    provider_request_ref: "PROV-REQ-RETRY", idempotency_key: "PAY-RETRY-SUBMIT",
    provider_result: {raw_status: "settled", mapped_status: "success"},
  });
  assert.equal(paidRetry.payout_attempt.state, "success");
  assert.equal(paidRetry.payout_attempt.amount, "30.00");
  assert.equal(domain.snapshot().withdrawals[0].state, "paid");
});

test("AC32 duplicate callback cannot duplicate payment", () => {
  const domain = createP0Mod06Domain();
  settleOne(domain);
  const withdrawal = submittedWithdrawal(domain, "90.00", "REQ-CALLBACK");
  domain.approveWithdrawal({withdrawal_id: withdrawal.withdrawal.withdrawal_id, actor_id: "finance", reason_code: "approved"});
  const created = domain.createPayoutAttempt({withdrawal_id: withdrawal.withdrawal.withdrawal_id, idempotency_key: "PAY-CALLBACK-CREATE"});
  const input = {
    payout_attempt_id: created.payout_attempt.payout_attempt_id,
    provider_event_id: "PROV-EVT-DUP", provider_request_ref: "PROV-REQ-CALLBACK",
    provider_result: {raw_status: "settled", mapped_status: "success"},
    idempotency_key: "PAY-CALLBACK-1",
  };
  const first = domain.applyPayoutCallback(input);
  const duplicate = domain.applyPayoutCallback(input);
  assert.equal(first.payout_attempt.state, "success");
  assert.equal(duplicate.duplicate_ignored, true);
  assert.equal(domain.snapshot().payoutAttempts.length, 1);
  assert.equal(domain.availableBalance("PRT-A"), "0.00");
});

test("AC33 reconciliation difference creates an ownable task", () => {
  const domain = createP0Mod06Domain();
  settleOne(domain);
  const withdrawal = submittedWithdrawal(domain, "90.00", "REQ-RECON");
  domain.approveWithdrawal({withdrawal_id: withdrawal.withdrawal.withdrawal_id, actor_id: "finance", reason_code: "approved"});
  const created = domain.createPayoutAttempt({withdrawal_id: withdrawal.withdrawal.withdrawal_id, idempotency_key: "PAY-RECON-CREATE"});
  const reconciled = domain.reconcilePayoutAttempt({
    payout_attempt_id: created.payout_attempt.payout_attempt_id,
    provider_amount: "80.00", ledger_amount: "90.00",
    provider_fact_refs: ["PROV-FACT-1"], ledger_refs: ["LED-RECON"],
    idempotency_key: "RECON-DIFF",
  });
  assert.equal(reconciled.reconciliation_record.difference_amount, "-10.00");
  assert.equal(reconciled.reconciliation_record.result, "difference");
  assert.equal(reconciled.task.owner_role, "finance");
});

test("AC34 reversal follows the partner-scoped offset order without double counting", () => {
  const domain = createP0Mod06Domain();
  domain.reserveDeposit({
    partner_id: "PRT-REV", customer_id: "CUS-REV", amount: "60.00",
    source_ref: "DEP-REV", idempotency_key: "DEP-REV-IDEM", config_version: "funds-test-v1",
  });
  settleOne(domain, {
    partner_id: "PRT-REV", customer_id: "CUS-REV", commission_case_id: "COMM-REV",
    amount: "25.00", deposit_ratio: "0.00", run_id: "RUN-REV",
  });
  domain.creditSamePartnerOtherDepositForDouble({
    partner_id: "PRT-REV", customer_id: "CUS-OTHER", amount: "5.00",
    idempotency_key: "OTHER-DEP-REV",
  });
  const reversal = domain.createReversal({
    partner_id: "PRT-REV", customer_id: "CUS-REV", external_ref: "REV-EXT-A",
    original_case_ref: "COMM-REV", payment_ref: "PAY-REV", approved_amount: "100.00",
    unreleased_case_action: "5.00", offset_order_version: "reversal-order-v1",
    idempotency_key: "REV-A",
  });
  assert.equal(reversal.reversal_case.unreleased_case_action, "5.00");
  assert.equal(reversal.reversal_case.same_customer_deposit_deduction, "60.00");
  assert.equal(reversal.reversal_case.same_partner_withdrawable_deduction, "25.00");
  assert.equal(reversal.reversal_case.same_partner_other_deposit_deduction, "5.00");
  assert.equal(reversal.reversal_case.debt_amount, "5.00");
  assert.equal(reversal.debt.remaining_amount, "5.00");
  const wallet = domain.snapshot().wallets[0];
  assert.equal(wallet.deposit_by_customer["CUS-REV"], 0);
  assert.equal(domain.availableBalance("PRT-REV"), "0.00");
  assert.equal(wallet.other_deposit_by_customer["CUS-OTHER"], 0);
});

test("duplicate settlement and terminal provider mutations remain protected", () => {
  const domain = createP0Mod06Domain();
  const first = settleOne(domain, {commission_case_id: "COMM-IDEM", run_id: "RUN-IDEM-1"});
  const duplicate = settleOne(domain, {commission_case_id: "COMM-IDEM", run_id: "RUN-IDEM-2"});
  assert.equal(duplicate.case_results[0].idempotent_replay, true);
  assert.equal(domain.snapshot().settlementCases.length, 1);
  assert.equal(domain.availableBalance("PRT-A"), "90.00");
  error(() => settleOne(domain, {commission_case_id: "COMM-IDEM", amount: "101.00", run_id: "RUN-IDEM-3"}), "AFF-40902");

  const withdrawal = submittedWithdrawal(domain, "90.00", "REQ-IDEM");
  domain.approveWithdrawal({withdrawal_id: withdrawal.withdrawal.withdrawal_id, actor_id: "finance", reason_code: "approved"});
  const created = domain.createPayoutAttempt({withdrawal_id: withdrawal.withdrawal.withdrawal_id, idempotency_key: "PAY-IDEM-CREATE"});
  const submitInput = {
    payout_attempt_id: created.payout_attempt.payout_attempt_id,
    provider_request_ref: "PROV-IDEM", idempotency_key: "PAY-IDEM-SUBMIT",
    provider_result: {raw_status: "timeout", mapped_status: "unknown"},
  };
  domain.submitPayoutAttempt(submitInput);
  const replay = domain.submitPayoutAttempt(submitInput);
  assert.equal(replay.idempotent_replay, true);
  error(() => domain.cancelWithdrawal({
    withdrawal_id: withdrawal.withdrawal.withdrawal_id, actor_id: "partner", reason_code: "cancel_unknown",
  }), "AFF-40901");
  domain.queryPayoutAttempt({
    payout_attempt_id: created.payout_attempt.payout_attempt_id,
    provider_request_ref: "PROV-IDEM", idempotency_key: "PAY-IDEM-QUERY",
    provider_result: {raw_status: "settled", mapped_status: "success"},
  });
  error(() => domain.queryPayoutAttempt({
    payout_attempt_id: created.payout_attempt.payout_attempt_id,
    provider_request_ref: "PROV-IDEM", idempotency_key: "PAY-IDEM-QUERY-2",
    provider_result: {raw_status: "failed", mapped_status: "failed"},
  }), "AFF-40901");
});

test("generated canonical objects validate against P0 schemas", () => {
  const domain = createP0Mod06Domain();
  const settled = settleOne(domain, {commission_case_id: "COMM-SCHEMA"});
  const run = settled.settlement_run;
  const settlementCase = settled.case_results[0].settlement_case;
  const ledgerEntry = domain.snapshot().ledgerEntries[0];
  const statement = domain.generateStatement({
    partner_id: "PRT-A", period_start: "2026-03-01", period_end: "2026-03-31",
    timezone: "UTC", legal_entity: "test-entity", currency: "USD",
    opening_amount: "0.00", closing_amount: "90.00", case_refs: ["COMM-SCHEMA"],
    idempotency_key: "STM-SCHEMA",
  });
  const withdrawal = submittedWithdrawal(domain, "90.00", "REQ-SCHEMA");
  domain.approveWithdrawal({withdrawal_id: withdrawal.withdrawal.withdrawal_id, actor_id: "finance", reason_code: "approved"});
  const payout = domain.createPayoutAttempt({withdrawal_id: withdrawal.withdrawal.withdrawal_id, idempotency_key: "PAY-SCHEMA"});
  domain.submitPayoutAttempt({
    payout_attempt_id: payout.payout_attempt.payout_attempt_id,
    provider_request_ref: "PROV-SCHEMA", idempotency_key: "PAY-SCHEMA-SUBMIT",
    provider_result: {raw_status: "partial", mapped_status: "partial_success", paid_amount: "50.00", unpaid_amount: "40.00"},
  });
  const reconciliation = domain.reconcilePayoutAttempt({
    payout_attempt_id: payout.payout_attempt.payout_attempt_id,
    provider_amount: "50.00", ledger_amount: "50.00", provider_fact_refs: ["PROV-SCHEMA"],
    idempotency_key: "RECON-SCHEMA",
  });
  domain.reserveDeposit({
    partner_id: "PRT-REV2", customer_id: "CUS-REV2", amount: "10.00",
    source_ref: "DEP-SCHEMA", idempotency_key: "DEP-SCHEMA", config_version: "funds-test-v1",
  });
  const reversal = domain.createReversal({
    partner_id: "PRT-REV2", customer_id: "CUS-REV2", external_ref: "REV-SCHEMA",
    original_case_ref: "COMM-SCHEMA", payment_ref: "PAY-SCHEMA", approved_amount: "10.00",
    unreleased_case_action: "0.00", offset_order_version: "reversal-order-v1", idempotency_key: "REV-SCHEMA",
  });
  const examples = {
    SettlementRun: run,
    SettlementCase: settlementCase,
    LedgerEntry: ledgerEntry,
    Statement: statement.statement,
    StatementVersion: statement.statement_version,
    Withdrawal: withdrawal.withdrawal,
    WithdrawalAllocation: domain.snapshot().withdrawalAllocations[0],
    PayoutAttempt: domain.snapshot().payoutAttempts[0],
    ReconciliationRecord: reconciliation.reconciliation_record,
    ReversalCase: reversal.reversal_case,
  };
  for (const [name, value] of Object.entries(examples)) {
    const invalid = validate(value, schemas[name], name);
    assert.equal(invalid, undefined, `${name}: ${invalid}`);
  }
});

console.log(`P0 MOD-06 domain checks passed: ${checks} scenarios`);
