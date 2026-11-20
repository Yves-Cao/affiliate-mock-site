"use strict";

const http = require("node:http");
const {createP0Mod06Domain, DomainError} = require("./p0-mod06.cjs");

class InMemoryP0Mod06Repository {
  constructor() {
    this.operationReceipts = new Map();
    this.eventReceipts = [];
    this.stateSnapshots = [];
  }

  findOperation(key) {
    return this.operationReceipts.get(key) || null;
  }

  saveOperation(key, receipt) {
    this.operationReceipts.set(key, receipt);
  }

  appendEvents(events) {
    this.eventReceipts.push(...events.map(event => JSON.parse(JSON.stringify(event))));
  }

  saveSnapshot(snapshot) {
    this.stateSnapshots.push({
      sequence: this.stateSnapshots.length + 1,
      saved_at: new Date().toISOString(),
      state: JSON.parse(JSON.stringify(snapshot)),
    });
  }
}

function createP0Mod06Service(options = {}) {
  const domain = options.domain || createP0Mod06Domain(options);
  const repository = options.repository || new InMemoryP0Mod06Repository();
  let traceSequence = 0;

  const routes = new Map([
    ["/p0/settlement-run-ledger-conservation-deposit-and-statement/start-settlement-run", domain.startSettlementRun],
    ["/p0/settlement-run-ledger-conservation-deposit-and-statement/evaluate-settlement-case", domain.evaluateSettlementCase],
    ["/p0/settlement-run-ledger-conservation-deposit-and-statement/reserve-deposit", domain.reserveDeposit],
    ["/p0/settlement-run-ledger-conservation-deposit-and-statement/release-deposit", domain.releaseDeposit],
    ["/p0/settlement-run-ledger-conservation-deposit-and-statement/generate-statement", domain.generateStatement],
    ["/p0/withdrawal-request-and-fifo-allocation-lock/preview-withdrawal-allocation", domain.previewWithdrawalAllocation],
    ["/p0/withdrawal-request-and-fifo-allocation-lock/submit-withdrawal", domain.submitWithdrawal],
    ["/p0/withdrawal-request-and-fifo-allocation-lock/approve-withdrawal", domain.approveWithdrawal],
    ["/p0/withdrawal-request-and-fifo-allocation-lock/reject-withdrawal", domain.rejectWithdrawal],
    ["/p0/withdrawal-request-and-fifo-allocation-lock/cancel-withdrawal", domain.cancelWithdrawal],
    ["/p0/payout-attempt-provider-result-reconciliation-and-reversal/create-payout-attempt", domain.createPayoutAttempt],
    ["/p0/payout-attempt-provider-result-reconciliation-and-reversal/submit-payout-attempt", domain.submitPayoutAttempt],
    ["/p0/payout-attempt-provider-result-reconciliation-and-reversal/query-payout-attempt", domain.queryPayoutAttempt],
    ["/p0/payout-attempt-provider-result-reconciliation-and-reversal/reconcile-payout-attempt", domain.reconcilePayoutAttempt],
    ["/p0/payout-attempt-provider-result-reconciliation-and-reversal/create-reversal", domain.createReversal],
  ]);

  const explicitUnsupported = new Set([
    "/p0/settlement-run-ledger-conservation-deposit-and-statement/create-wallet-ledger-entries",
    "/p0/payout-attempt-provider-result-reconciliation-and-reversal/record-payment-result",
  ]);

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
    }
    return value;
  }
  const payloadHash = value => JSON.stringify(stableValue(value));
  const nextTrace = () => `trace-mod06-${String(++traceSequence).padStart(6, "0")}`;
  const statusFor = code => ({
    "AFF-40301": 403,
    "AFF-40401": 404,
    "AFF-40901": 409,
    "AFF-40902": 409,
    "AFF-40904": 409,
    "AFF-42201": 422,
    "AFF-42203": 422,
    "AFF-42204": 422,
    "AFF-42211": 422,
    "AFF-50002": 500,
  })[code] || 422;

  function handle(request) {
    const method = request.method || "POST";
    const path = request.path || request.pathname || "/";
    const headers = request.headers || {};
    const input = request.body === undefined || request.body === null ? {} : request.body;
    const traceId = String(headers["trace-id"] || headers.trace_id || nextTrace());
    if (method !== "POST") {
      return {status: 405, body: {code: "AFF-40501", message: "Method not allowed", trace_id: traceId}};
    }
    if (!String(headers.authorization || "").startsWith("Bearer ")) {
      return {status: 401, body: {code: "AFF-40101", message: "Bearer authorization required", trace_id: traceId}};
    }
    if (explicitUnsupported.has(path)) {
      return {
        status: 503,
        body: {
          code: "AFF-50301",
          message: "Generic canonical operation is prohibited by the product owner",
          trace_id: traceId,
          details: [{
            operation_path: path,
            blocker: "generic_call_prohibited",
            allowed_producer: path.includes("create-wallet-ledger-entries")
              ? "controlled settlement, reversal, reconciliation, and correction domain commands"
              : "provider callback/query contract mapped through the payment adapter",
          }],
        },
      };
    }
    const operation = routes.get(path);
    if (!operation) {
      return {status: 404, body: {code: "AFF-40401", message: "Operation not found", trace_id: traceId}};
    }
    const idempotencyKey = String(headers["idempotency-key"] || headers.idempotency_key || input.idempotency_key || "");
    if (idempotencyKey.length < 8) {
      return {
        status: 422,
        body: {
          code: "AFF-42201",
          message: "Idempotency-Key of at least 8 characters is required",
          trace_id: traceId,
          details: [{field: "Idempotency-Key"}],
        },
      };
    }

    const receiptKey = `${method}:${path}:${idempotencyKey}`;
    const hash = payloadHash({...input, idempotency_key: idempotencyKey});
    const prior = repository.findOperation(receiptKey);
    if (prior) {
      if (prior.payload_hash !== hash) {
        return {status: 409, body: {code: "AFF-40902", message: "Idempotency key conflicts with a different payload", trace_id: traceId}};
      }
      return {
        status: 200,
        body: {
          code: "OK",
          message: "success",
          data: {...prior.data, idempotent_replay: true},
          trace_id: traceId,
        },
      };
    }

    try {
      const eventCountBefore = domain.snapshot().events.length;
      const data = operation({...input, idempotency_key: idempotencyKey});
      const snapshotAfter = domain.snapshot();
      repository.appendEvents(snapshotAfter.events.slice(eventCountBefore));
      repository.saveSnapshot(snapshotAfter);
      repository.saveOperation(receiptKey, {
        operation_path: path,
        idempotency_key: idempotencyKey,
        payload_hash: hash,
        trace_id: traceId,
        data: JSON.parse(JSON.stringify(data)),
      });
      return {status: 200, body: {code: "OK", message: "success", data, trace_id: traceId}};
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      return {
        status: statusFor(error.code),
        body: {
          code: error.code,
          message: error.message,
          trace_id: traceId,
          details: error.details?.map(detail => ({detail: String(detail)})) || [],
        },
      };
    }
  }

  return {domain, repository, handle};
}

function createP0Mod06HttpServer(options = {}) {
  const service = createP0Mod06Service(options);
  const server = http.createServer((request, response) => {
    let rawBody = "";
    request.on("data", chunk => {
      rawBody += chunk;
      if (rawBody.length > 1024 * 1024) request.destroy();
    });
    request.on("end", () => {
      let body = {};
      try {
        body = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        response.writeHead(400, {"Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store"});
        response.end(JSON.stringify({code: "AFF-40001", message: "Invalid JSON body"}));
        return;
      }
      const result = service.handle({
        method: request.method,
        path: new URL(request.url, "http://127.0.0.1").pathname,
        headers: request.headers,
        body,
      });
      response.writeHead(result.status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Trace-Id, Idempotency-Key",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      });
      response.end(JSON.stringify(result.body));
    });
  });
  return {server, service};
}

module.exports = {
  createP0Mod06Service,
  createP0Mod06HttpServer,
  InMemoryP0Mod06Repository,
};
