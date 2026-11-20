"use strict";

const assert = require("node:assert/strict");
const {createP0Mod06HttpServer} = require("../domain/p0-mod06-service.cjs");

let checks = 0;
async function test(name, fn) {
  await fn();
  checks += 1;
  console.log(`PASS ${name}`);
}

async function main() {

const settlementPath = "/p0/settlement-run-ledger-conservation-deposit-and-statement/start-settlement-run";
const previewPath = "/p0/withdrawal-request-and-fifo-allocation-lock/preview-withdrawal-allocation";
const submitPath = "/p0/withdrawal-request-and-fifo-allocation-lock/submit-withdrawal";

function baseCase(overrides = {}) {
  return {
    commission_case_id: "COMM-SVC",
    partner_id: "PRT-SVC",
    customer_id: "CUS-SVC",
    amount: "100.00",
    deposit_ratio: "0.10",
    currency: "USD",
    gate_evaluation_refs: ["GATE-SVC"],
    gate_result: "passed",
    hold_started_at: "2026-02-01T00:00:00Z",
    available_at: "2026-03-01T00:00:00Z",
    ...overrides,
  };
}

await test("service exposes canonical envelope, receipt, event, and snapshot persistence", async () => {
  const {server, service} = createP0Mod06HttpServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const settlementBody = {
    settlement_date: "2026-03-01",
    timezone: "UTC",
    config_version: "funds-service-test-v1",
    cases: [baseCase()],
  };
  const settlement = await fetch(`${base}${settlementPath}`, {
    method: "POST",
    headers: {authorization: "Bearer test", "idempotency-key": "SVC-SETTLE-1", "content-type": "application/json"},
    body: JSON.stringify(settlementBody),
  }).then(response => response.json());
  assert.equal(settlement.code, "OK");
  assert.equal(settlement.data.case_results[0].conservation_difference, "0.00");
  assert.match(settlement.trace_id, /^trace-mod06-/);

  const duplicate = await fetch(`${base}${settlementPath}`, {
    method: "POST",
    headers: {authorization: "Bearer test", "idempotency-key": "SVC-SETTLE-1", "content-type": "application/json"},
    body: JSON.stringify(settlementBody),
  }).then(response => response.json());
  assert.equal(duplicate.data.idempotent_replay, true);
  assert.equal(duplicate.data.case_results[0].settlement_case.settlement_case_id, settlement.data.case_results[0].settlement_case.settlement_case_id);

  const preview = await fetch(`${base}${previewPath}`, {
    method: "POST",
    headers: {authorization: "Bearer test", "idempotency-key": "SVC-PREVIEW-1", "content-type": "application/json"},
    body: JSON.stringify({partner_id: "PRT-SVC", requested_amount: "50.00", fee: "0.00"}),
  }).then(response => response.json());
  assert.equal(preview.data.sufficient, true);
  assert.equal(service.repository.operationReceipts.size, 2);
  assert.ok(service.repository.eventReceipts.length >= 1);
  assert.equal(service.repository.stateSnapshots.length, 2);
  server.close();
});

await test("service maps authorization, validation, conflict, unsupported, and not-found errors", async () => {
  const {server} = createP0Mod06HttpServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function post(path, body, headers = {}) {
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {"content-type": "application/json", authorization: "Bearer test", ...headers},
      body: JSON.stringify(body),
    });
    return {status: response.status, body: await response.json()};
  }
  const unauthorized = await fetch(base + previewPath, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: "{}",
  });
  assert.equal(unauthorized.status, 401);
  assert.equal((await unauthorized.json()).code, "AFF-40101");
  assert.equal((await post(previewPath, {}, {"idempotency-key": "SHORT"})).status, 422);
  assert.equal((await post("/p0/not-a-service", {}, {"idempotency-key": "NOT-A-SVC"})).status, 404);
  const unsupported = await post(
    "/p0/settlement-run-ledger-conservation-deposit-and-statement/create-wallet-ledger-entries",
    {}, {"idempotency-key": "SVC-LEDGER-1"},
  );
  assert.equal(unsupported.status, 503);
  assert.equal(unsupported.body.code, "AFF-50301");
  assert.equal(unsupported.body.details[0].blocker, "generic_call_prohibited");

  const settlementBody = {
    settlement_date: "2026-03-01", timezone: "UTC", config_version: "v1",
    cases: [baseCase({commission_case_id: "COMM-ERR", amount: "100.00"})],
  };
  await post(settlementPath, settlementBody, {"idempotency-key": "SVC-ERR-1"});
  const conflict = await post(settlementPath, {
    ...settlementBody,
    cases: [baseCase({commission_case_id: "COMM-ERR", amount: "101.00"})],
  }, {"idempotency-key": "SVC-ERR-1"});
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.code, "AFF-40902");
  server.close();
});

await test("service rejects insufficient balance without partial locking and exposes repository evidence", async () => {
  const {server, service} = createP0Mod06HttpServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function post(path, body, key) {
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {"content-type": "application/json", authorization: "Bearer test", "idempotency-key": key},
      body: JSON.stringify(body),
    });
    return {status: response.status, body: await response.json()};
  }
  await post(settlementPath, {
    settlement_date: "2026-03-01", timezone: "UTC", config_version: "v1",
    cases: [baseCase({commission_case_id: "COMM-INS", partner_id: "PRT-INS", customer_id: "CUS-INS"})],
  }, "SVC-INS-SETTLE");
  const rejected = await post(submitPath, {
    partner_id: "PRT-INS", request_ref: "REQ-INS", requested_amount: "150.00",
    fee: "0.00", currency: "USD",
  }, "SVC-INS-SUBMIT");
  assert.equal(rejected.status, 200);
  assert.equal(rejected.body.data.withdrawal.state, "rejected");
  assert.deepEqual(rejected.body.data.allocations, []);
  assert.equal(service.domain.availableBalance("PRT-INS"), "90.00");
  assert.equal(service.repository.operationReceipts.get("POST:" + submitPath + ":SVC-INS-SUBMIT").data.withdrawal.state, "rejected");
  server.close();
});

console.log(`P0 MOD-06 service checks passed: ${checks} scenarios`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
