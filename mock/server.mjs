import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 4000);
const DEFAULT_ROLE = "operator";
const DEFAULT_SCENARIO = "normal-flow";
const SCENARIOS = new Set([
  "normal-flow",
  "no-source",
  "ib-excluded",
  "high-risk",
  "dynamic-hold",
  "chargeback",
  "kyc-pending",
  "empty-state",
  "api-error"
]);
const ROLES = new Set(["partner", "operator", "compliance", "finance", "admin"]);

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), "utf8"));
}

const baseData = await readJson("mock/data/base.json");
const mockConfig = await readJson("mock/config/parameters.json");
const scenarioFiles = new Map();
for (const scenario of SCENARIOS) {
  scenarioFiles.set(scenario, await readJson(`mock/scenarios/${scenario}.json`));
}

function clone(value) {
  return structuredClone(value);
}

function buildState(scenarioName) {
  const scenario = scenarioFiles.get(scenarioName) || {};
  const state = clone(baseData);
  for (const key of [
    "users",
    "partners",
    "partnerAudits",
    "clients",
    "commissions",
    "commissionSummary",
    "settlements",
    "riskEvents"
  ]) {
    if (Array.isArray(state[key]) && Array.isArray(scenario[key])) {
      state[key] = clone(scenario[key]);
    } else if (scenario[key] && typeof scenario[key] === "object") {
      state[key] = { ...state[key], ...clone(scenario[key]) };
    }
  }
  return state;
}

const states = new Map([...SCENARIOS].map((scenario) => [scenario, buildState(scenario)]));
let traceCounter = 0;
const idempotencyStore = new Map();

function traceId() {
  traceCounter += 1;
  return `mock-trace-${String(traceCounter).padStart(6, "0")}`;
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload, null, 2);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    ...extraHeaders
  });
  response.end(body);
}

async function sendMockConsole(response) {
  const html = await fs.readFile(path.join(root, "prototype/mock-console.html"));
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html),
    "Cache-Control": "no-store"
  });
  response.end(html);
}

function success(response, data, extraHeaders = {}) {
  sendJson(response, 200, { data }, extraHeaders);
}

function error(response, statusCode, code, message, details = []) {
  sendJson(response, statusCode, {
    error: { code, message, details, traceId: traceId() }
  });
}

function pageOf(items, searchParams) {
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const requestedPageSize = Number(searchParams.get("pageSize") || 10);
  const pageSize = Math.min(100, Math.max(1, Number.isFinite(requestedPageSize) ? requestedPageSize : 10));
  const sort = searchParams.get("sort");
  let sortedItems = items;
  if (sort) {
    const direction = sort.startsWith("-") ? -1 : 1;
    const field = direction === -1 ? sort.slice(1) : sort;
    const isSortable = items.length > 0 && Object.prototype.hasOwnProperty.call(items[0], field);
    sortedItems = isSortable
      ? [...items].sort((left, right) => {
          if (left[field] < right[field]) return -1 * direction;
          if (left[field] > right[field]) return 1 * direction;
          return 0;
        })
      : [...items];
  }
  const start = (page - 1) * pageSize;
  return {
    data: sortedItems.slice(start, start + pageSize),
    page: { page, pageSize, total: items.length }
  };
}

function requireRole(request, response, allowedRoles) {
  const role = request.headers["x-mock-role"] || DEFAULT_ROLE;
  if (!ROLES.has(role)) {
    error(response, 401, "UNAUTHORIZED", `Unknown mock role: ${role}`);
    return false;
  }
  if (!allowedRoles.includes(role)) {
    error(response, 403, "FORBIDDEN", "Current role cannot access this resource.");
    return false;
  }
  return true;
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Invalid JSON body");
    error.statusCode = 400;
    throw error;
  }
}

function validateReason(response, body, reasonRequired) {
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if ((reasonRequired || body.reason !== undefined) && reason.length < 2) {
    error(response, 422, "UNPROCESSABLE", "A meaningful reason is required for this decision.");
    return false;
  }
  return true;
}

async function handleIdempotency(request, response, scenarioName, makeResponse) {
  const key = request.headers["idempotency-key"];
  if (!key) return makeResponse();
  const cached = {};
  const scopeKey = [
    request.method,
    request.url,
    request.headers["x-mock-role"] || DEFAULT_ROLE,
    scenarioName,
    key
  ].join("|");
  if (idempotencyStore.has(scopeKey)) {
    const stored = await idempotencyStore.get(scopeKey);
    sendJson(response, stored.status, stored.body, { "Idempotent-Replayed": "true" });
    return;
  }
  const chunks = [];
  let resolveCompletion;
  idempotencyStore.set(scopeKey, new Promise((resolve) => { resolveCompletion = resolve; }));
  const originalWriteHead = response.writeHead.bind(response);
  const originalEnd = response.end.bind(response);
  response.writeHead = (statusCode, headers) => {
    cached.status = statusCode;
    return originalWriteHead(statusCode, headers);
  };
  response.end = (body) => {
    cached.body = body ? JSON.parse(body.toString()) : {};
    resolveCompletion(clone(cached));
    return originalEnd(body);
  };
  return makeResponse();
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://localhost:${PORT}`);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    const requestedScenario = request.headers["x-mock-scenario"] || url.searchParams.get("scenario");
    if (requestedScenario && !SCENARIOS.has(requestedScenario)) {
      error(response, 400, "BAD_REQUEST", `Unknown scenario: ${requestedScenario}`);
      return;
    }
    const scenarioName = requestedScenario || DEFAULT_SCENARIO;
    const state = states.get(scenarioName);

    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Idempotency-Key,X-Mock-Role,X-Mock-Scenario",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
      });
      response.end();
      return;
    }

    if (["/", "/console", "/mock-console"].includes(pathname) && request.method === "GET") {
      await sendMockConsole(response);
      return;
    }

    if (pathname === "/health") {
      sendJson(response, 200, {
        status: "ok",
        service: "affiliate-mock",
        scenario: scenarioName,
        time: new Date().toISOString()
      });
      return;
    }

    if (pathname === "/__reset" && request.method === "POST") {
      states.set(scenarioName, buildState(scenarioName));
      idempotencyStore.clear();
      sendJson(response, 200, { reset: true, scenario: scenarioName });
      return;
    }

    if (!pathname.startsWith("/api/v1/")) {
      error(response, 404, "NOT_FOUND", "Resource not found.");
      return;
    }

    if (scenarioName === "api-error") {
      error(
        response,
        503,
        "SERVICE_UNAVAILABLE",
        "Mock service intentionally returns an error in the api-error scenario."
      );
      return;
    }

    const route = pathname.slice("/api/v1".length);
    const method = request.method;

    if (route === "/me" && method === "GET") {
      if (!requireRole(request, response, [...ROLES])) return;
      const role = request.headers["x-mock-role"] || DEFAULT_ROLE;
      success(response, state.users[role]);
      return;
    }

    if (route === "/parameters" && method === "GET") {
      if (!requireRole(request, response, [...ROLES])) return;
      success(response, mockConfig);
      return;
    }

    if (route === "/partners" && method === "GET") {
      if (!requireRole(request, response, ["operator", "compliance", "finance", "admin"])) return;
      let partners = state.partners;
      const status = url.searchParams.get("status");
      if (status) partners = partners.filter((item) => item.status === status);
      const result = pageOf(partners, url.searchParams);
      sendJson(response, 200, result);
      return;
    }

    const partnerMatch = route.match(/^\/partners\/(P-[0-9]+)$/);
    if (partnerMatch && method === "GET") {
      if (!requireRole(request, response, ["operator", "compliance", "finance", "admin"])) return;
      const found = state.partners.find((item) => item.partnerId === partnerMatch[1]);
      if (!found) {
        error(response, 404, "NOT_FOUND", `Partner ${partnerMatch[1]} not found.`);
        return;
      }
      success(response, found);
      return;
    }

    if (route === "/partner-audits" && method === "GET") {
      if (!requireRole(request, response, ["operator", "compliance", "admin"])) return;
      sendJson(response, 200, pageOf(state.partnerAudits, url.searchParams));
      return;
    }

    const auditDecisionMatch = route.match(/^\/partner-audits\/(pa-[0-9]+)\/decision$/);
    if (auditDecisionMatch && method === "POST") {
      if (!requireRole(request, response, ["operator", "compliance", "admin"])) return;
      await handleIdempotency(request, response, scenarioName, async () => {
        const body = await readBody(request);
        const found = state.partnerAudits.find((item) => item.auditId === auditDecisionMatch[1]);
        if (!found) {
          error(response, 404, "NOT_FOUND", `Audit ${auditDecisionMatch[1]} not found.`);
          return;
        }
        const map = { approve: "approved", reject: "rejected", "materials-required": "materials-required" };
        if (!map[body.decision]) {
          error(response, 422, "UNPROCESSABLE", "decision must be approve, reject, or materials-required.");
          return;
        }
        if (!validateReason(response, body, ["reject", "materials-required"].includes(body.decision))) return;
        found.status = map[body.decision];
        found.reason = body.reason || "";
        success(response, found);
      });
      return;
    }

    if (route === "/clients" && method === "GET") {
      if (!requireRole(request, response, ["partner", "operator", "compliance", "admin"])) return;
      sendJson(response, 200, pageOf(state.clients, url.searchParams));
      return;
    }

    const clientMatch = route.match(/^\/clients\/(C-[0-9]+)$/);
    if (clientMatch && method === "GET") {
      if (!requireRole(request, response, ["partner", "operator", "compliance", "admin"])) return;
      const found = state.clients.find((item) => item.clientId === clientMatch[1]);
      if (!found) {
        error(response, 404, "NOT_FOUND", `Client ${clientMatch[1]} not found.`);
        return;
      }
      success(response, found);
      return;
    }

    if (route === "/commissions" && method === "GET") {
      if (!requireRole(request, response, ["partner", "operator", "compliance", "finance", "admin"])) return;
      sendJson(response, 200, pageOf(state.commissions, url.searchParams));
      return;
    }

    if (route === "/commissions/summary" && method === "GET") {
      if (!requireRole(request, response, ["partner", "operator", "compliance", "finance", "admin"])) return;
      success(response, state.commissionSummary);
      return;
    }

    if (route === "/settlements" && method === "GET") {
      if (!requireRole(request, response, ["operator", "finance", "admin"])) return;
      sendJson(response, 200, pageOf(state.settlements, url.searchParams));
      return;
    }

    const settlementDecisionMatch = route.match(/^\/settlements\/(st-[0-9]+)\/decision$/);
    if (settlementDecisionMatch && method === "POST") {
      if (!requireRole(request, response, ["operator", "finance", "admin"])) return;
      await handleIdempotency(request, response, scenarioName, async () => {
        const body = await readBody(request);
        const found = state.settlements.find((item) => item.settlementId === settlementDecisionMatch[1]);
        if (!found) {
          error(response, 404, "NOT_FOUND", `Settlement ${settlementDecisionMatch[1]} not found.`);
          return;
        }
        const map = { approve: "approved", reject: "rejected", freeze: "frozen" };
        if (!map[body.decision]) {
          error(response, 422, "UNPROCESSABLE", "decision must be approve, reject, or freeze.");
          return;
        }
        if (!validateReason(response, body, ["reject", "freeze"].includes(body.decision))) return;
        found.status = map[body.decision];
        found.reason = body.reason || "";
        success(response, found);
      });
      return;
    }

    if (route === "/risk-events" && method === "GET") {
      if (!requireRole(request, response, ["operator", "compliance", "admin"])) return;
      sendJson(response, 200, pageOf(state.riskEvents, url.searchParams));
      return;
    }

    const riskDecisionMatch = route.match(/^\/risk-events\/(re-[0-9]+)\/decision$/);
    if (riskDecisionMatch && method === "POST") {
      if (!requireRole(request, response, ["operator", "compliance", "admin"])) return;
      await handleIdempotency(request, response, scenarioName, async () => {
        const body = await readBody(request);
        const found = state.riskEvents.find((item) => item.eventId === riskDecisionMatch[1]);
        if (!found) {
          error(response, 404, "NOT_FOUND", `Risk event ${riskDecisionMatch[1]} not found.`);
          return;
        }
        const map = { resolve: "resolved", escalate: "escalated" };
        if (!map[body.decision]) {
          error(response, 422, "UNPROCESSABLE", "decision must be resolve or escalate.");
          return;
        }
        if (!validateReason(response, body, body.decision === "escalate")) return;
        found.status = map[body.decision];
        found.reason = body.reason || "";
        success(response, found);
      });
      return;
    }

    error(response, 404, "NOT_FOUND", "Resource not found.");
  } catch (caught) {
    const statusCode = caught.statusCode || 500;
    const code = statusCode === 400 ? "BAD_REQUEST" : "INTERNAL_ERROR";
    error(response, statusCode, code, caught.message || "Unexpected mock error.");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Affiliate mock listening on http://127.0.0.1:${PORT}`);
  console.log(`Default scenario: ${DEFAULT_SCENARIO}; role header default: ${DEFAULT_ROLE}`);
});
