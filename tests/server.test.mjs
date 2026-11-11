import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";

const port = 4177;
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["mock/server.mjs"], {
  cwd: new URL("..", import.meta.url),
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });

async function waitForHealth() {
  let lastError;
  for (let index = 0; index < 50; index += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return await response.json();
    } catch (caught) {
      lastError = caught;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Mock server failed to start: ${output || lastError}`);
}

async function get(path, headers = {}) {
  const response = await fetch(`${baseUrl}/api/v1${path}`, { headers });
  return { status: response.status, headers: response.headers, body: await response.json() };
}

async function post(path, body, headers = {}) {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  return { status: response.status, headers: response.headers, body: await response.json() };
}

test.before(async () => {
  await waitForHealth();
});

test.after(async () => {
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
});

test("health endpoint reports service and scenario", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "ok");
  assert.equal(body.service, "affiliate-mock");
});

test("mock console is served without replacing the frozen prototype", async () => {
  const response = await fetch(`${baseUrl}/console`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /text\/html/);
  const html = await response.text();
  assert.match(html, /Affiliate Mock Console/);
  assert.doesNotMatch(html, /Affiliate 评审原型 v0\.21/);
});

test("current user reflects incomplete profile", async () => {
  const response = await get("/me", { "X-Mock-Role": "partner", "X-Mock-Scenario": "kyc-pending" });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.profileComplete, false);
});

test("partner role cannot access operations partner list", async () => {
  const response = await get("/partners", { "X-Mock-Role": "partner", "X-Mock-Scenario": "normal-flow" });
  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "FORBIDDEN");
});

test("normal client has real trade", async () => {
  const response = await get("/clients/C-001", { "X-Mock-Role": "operator", "X-Mock-Scenario": "normal-flow" });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.attributionStatus, "attributed");
  assert.equal(response.body.data.hasRealTrade, true);
});

test("commission summary uses daily settlement rules", async () => {
  const response = await get("/commissions/summary", { "X-Mock-Role": "partner", "X-Mock-Scenario": "normal-flow" });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.minimumWithdrawal, "NONE");
  assert.equal(response.body.data.currency, "USD");
});

test("dynamic hold uses holding status", async () => {
  const response = await get("/commissions", { "X-Mock-Role": "partner", "X-Mock-Scenario": "dynamic-hold" });
  assert.equal(response.status, 200);
  assert.equal(response.body.data[0].status, "holding");
  assert.equal(response.body.data[0].holdDays, 5);
});

test("chargeback creates negative balance", async () => {
  const response = await get("/commissions/summary", { "X-Mock-Role": "partner", "X-Mock-Scenario": "chargeback" });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.withdrawable, "-120.00");
  assert.equal(response.body.data.paidReversed, "120.00");
});

test("no-source client is not attributed", async () => {
  const response = await get("/clients", { "X-Mock-Role": "operator", "X-Mock-Scenario": "no-source" });
  assert.equal(response.status, 200);
  assert.equal(response.body.data[0].attributionStatus, "no-source");
  assert.match(response.body.data[0].exclusionReason, /No affiliate click/);
});

test("high risk partner uses R4", async () => {
  const response = await get("/partners", { "X-Mock-Role": "operator", "X-Mock-Scenario": "high-risk" });
  assert.equal(response.status, 200);
  assert.equal(response.body.data[0].riskBand, "R4");
  assert.equal(response.body.data[0].riskScore, 86);
});

test("partner audit decision is stateful and idempotent", async () => {
  const headers = { "X-Mock-Role": "operator", "X-Mock-Scenario": "normal-flow", "Idempotency-Key": "audit-key-001" };
  const first = await post("/partner-audits/pa-001/decision", { decision: "approve", reason: "Complete" }, headers);
  assert.equal(first.status, 200);
  assert.equal(first.body.data.status, "approved");

  const second = await post("/partner-audits/pa-001/decision", { decision: "reject", reason: "Should replay" }, headers);
  assert.equal(second.status, 200);
  assert.equal(second.headers.get("Idempotent-Replayed"), "true");
  assert.equal(second.body.data.status, "approved");
});

test("idempotency keys do not leak across operations", async () => {
  const headers = { "X-Mock-Role": "operator", "X-Mock-Scenario": "normal-flow", "Idempotency-Key": "shared-key-001" };
  const audit = await post("/partner-audits/pa-001/decision", { decision: "approve", reason: "Complete" }, headers);
  assert.equal(audit.status, 200);
  assert.equal(audit.body.data.status, "approved");

  const settlement = await post(
    "/settlements/st-001/decision",
    { decision: "approve", reason: "Released" },
    headers
  );
  assert.equal(settlement.status, 200);
  assert.equal(settlement.body.data.settlementId, "st-001");
  assert.notEqual(settlement.headers.get("Idempotent-Replayed"), "true");
});

test("scenario changes preserve writes in their own scenario", async () => {
  const headers = { "X-Mock-Role": "operator", "X-Mock-Scenario": "normal-flow" };
  const decision = await post("/partner-audits/pa-001/decision", { decision: "approve", reason: "Complete" }, headers);
  assert.equal(decision.status, 200);

  await get("/partners", { "X-Mock-Role": "operator", "X-Mock-Scenario": "high-risk" });
  const restored = await get("/partner-audits", headers);
  assert.equal(restored.body.data[0].status, "approved");
});

test("settlement decision changes in-memory state", async () => {
  const headers = { "X-Mock-Role": "operator", "X-Mock-Scenario": "normal-flow" };
  const decision = await post("/settlements/st-001/decision", { decision: "approve", reason: "Released from Hold" }, headers);
  assert.equal(decision.status, 200);
  assert.equal(decision.body.data.status, "approved");

  const list = await get("/settlements", { "X-Mock-Role": "operator" });
  assert.equal(list.body.data[0].status, "approved");
});

test("negative decisions require a meaningful reason", async () => {
  const response = await post(
    "/settlements/st-001/decision",
    { decision: "reject", reason: "x" },
    { "X-Mock-Role": "operator", "X-Mock-Scenario": "normal-flow" }
  );
  assert.equal(response.status, 422);
  assert.equal(response.body.error.code, "UNPROCESSABLE");
});

test("partner list supports descending sort", async () => {
  const response = await get("/partners?sort=-riskScore", {
    "X-Mock-Role": "operator",
    "X-Mock-Scenario": "normal-flow"
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.data[0].partnerId, "P-002");
});

test("mock parameters are available to API consumers", async () => {
  const response = await get("/parameters", {
    "X-Mock-Role": "partner",
    "X-Mock-Scenario": "normal-flow"
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.settlement.cycle, "daily");
  assert.equal(response.body.data.settlement.minimumWithdrawal, "NONE");
  assert.equal(response.body.data.meta.mockOnly, true);
});

test("empty state returns empty arrays without inventing data", async () => {
  const response = await get("/commissions", { "X-Mock-Role": "partner", "X-Mock-Scenario": "empty-state" });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, []);
  assert.equal(response.body.page.total, 0);
});

test("api error returns structured 503", async () => {
  const response = await get("/commissions", { "X-Mock-Role": "operator", "X-Mock-Scenario": "api-error" });
  assert.equal(response.status, 503);
  assert.equal(response.body.error.code, "SERVICE_UNAVAILABLE");
  assert.ok(response.body.error.traceId);
});
