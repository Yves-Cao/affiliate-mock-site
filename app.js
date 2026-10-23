const baseState = {
  users: {
    partner: {
      userId: "U-P-001", name: "Mock Partner", role: "partner", profileComplete: true,
      permissions: ["clients:read", "commissions:read", "withdrawals:create"]
    },
    operator: {
      userId: "U-OP-001", name: "Mock Operator", role: "operator", profileComplete: true,
      permissions: ["partners:read", "partner-audits:decide", "settlements:decide", "risk-events:decide"]
    },
    compliance: {
      userId: "U-CO-001", name: "Mock Compliance", role: "compliance", profileComplete: true,
      permissions: ["partners:read", "partner-audits:decide", "risk-events:decide"]
    },
    finance: {
      userId: "U-FI-001", name: "Mock Finance", role: "finance", profileComplete: true,
      permissions: ["partners:read", "settlements:decide"]
    }
  },
  partners: [
    { partnerId: "P-001", displayName: "Mock Partner Alpha", emailMasked: "a***@example.com", status: "active", country: "SG", riskScore: 12, riskBand: "R0", validFtd: 12 },
    { partnerId: "P-002", displayName: "Mock Partner Beta", emailMasked: "b***@example.com", status: "pending", country: "BR", riskScore: 43, riskBand: "R2", validFtd: 1 }
  ],
  audits: [
    { auditId: "pa-001", partnerId: "P-002", displayName: "Mock Partner Beta", emailMasked: "b***@example.com", status: "pending", submittedAt: "2026-10-23T08:00:00Z" }
  ],
  clients: [
    { clientId: "C-001", emailMasked: "c***@example.com", country: "SG", attribution: "attributed", qualification: "qualified", realTrade: true },
    { clientId: "C-002", emailMasked: "d***@example.com", country: "BR", attribution: "attributed", qualification: "trading", realTrade: true }
  ],
  commissions: [
    { commissionId: "cm-001", partnerId: "P-001", clientId: "C-001", amount: "120.00", status: "approved", holdDays: 1, occurredAt: "2026-10-22T10:00:00Z" }
  ],
  summary: { withdrawable: "120.00", holding: "0.00", rejected: "0.00", paidReversed: "0.00", currency: "USD", minimumWithdrawal: "NONE" },
  settlements: [
    { settlementId: "st-001", partnerId: "P-001", clientId: "C-001", amount: "120.00", status: "pending", settlementDate: "2026-10-23" }
  ],
  riskEvents: [
    { eventId: "re-001", partnerId: "P-002", eventType: "traffic-anomaly", severity: "medium", status: "open", detectedAt: "2026-10-23T09:00:00Z" }
  ]
};

const scenarios = {
  "normal-flow": {},
  "no-source": {
    clients: [
      { clientId: "C-003", emailMasked: "n***@example.com", country: "SG", attribution: "no-source", qualification: "registered", realTrade: false }
    ]
  },
  "ib-excluded": {
    clients: [
      { clientId: "C-004", emailMasked: "i***@example.com", country: "BR", attribution: "ib-excluded", qualification: "registered", realTrade: false }
    ]
  },
  "high-risk": {
    partners: [
      { partnerId: "P-001", displayName: "Mock Partner Alpha", emailMasked: "a***@example.com", status: "active", country: "SG", riskScore: 86, riskBand: "R4", validFtd: 12 },
      { partnerId: "P-002", displayName: "Mock Partner Beta", emailMasked: "b***@example.com", status: "pending", country: "BR", riskScore: 43, riskBand: "R2", validFtd: 1 }
    ],
    riskEvents: [
      { eventId: "re-002", partnerId: "P-001", eventType: "device-cluster", severity: "high", status: "open", detectedAt: "2026-10-23T09:20:00Z" }
    ]
  },
  "dynamic-hold": {
    commissions: [
      { commissionId: "cm-002", partnerId: "P-001", clientId: "C-002", amount: "80.00", status: "holding", holdDays: 5, occurredAt: "2026-10-23T08:30:00Z" }
    ],
    summary: { withdrawable: "40.00", holding: "80.00", rejected: "0.00", paidReversed: "0.00", currency: "USD", minimumWithdrawal: "NONE" }
  },
  chargeback: {
    commissions: [
      { commissionId: "cm-003", partnerId: "P-001", clientId: "C-001", amount: "-120.00", status: "reversed", holdDays: 0, occurredAt: "2026-10-23T10:00:00Z" }
    ],
    summary: { withdrawable: "-120.00", holding: "0.00", rejected: "0.00", paidReversed: "120.00", currency: "USD", minimumWithdrawal: "NONE" }
  },
  "kyc-pending": {
    users: {
      partner: { userId: "U-P-002", name: "Incomplete Partner", role: "partner", profileComplete: false, permissions: ["clients:read", "commissions:read"] }
    },
    clients: []
  },
  "empty-state": {
    partners: [], audits: [], clients: [], commissions: [], settlements: [], riskEvents: [],
    summary: { withdrawable: "0.00", holding: "0.00", rejected: "0.00", paidReversed: "0.00", currency: "USD", minimumWithdrawal: "NONE" }
  },
  "api-error": {}
};

const endpoints = {
  me: { method: "GET", path: "/api/v1/me", roles: ["partner", "operator", "compliance", "finance"] },
  clients: { method: "GET", path: "/api/v1/clients", roles: ["partner", "operator", "compliance"] },
  commissions: { method: "GET", path: "/api/v1/commissions", roles: ["partner", "operator", "compliance", "finance"] },
  partners: { method: "GET", path: "/api/v1/partners", roles: ["operator", "compliance", "finance"] },
  audits: { method: "GET", path: "/api/v1/partner-audits", roles: ["operator", "compliance"] },
  settlements: { method: "GET", path: "/api/v1/settlements", roles: ["operator", "finance"] },
  "risk-events": { method: "GET", path: "/api/v1/risk-events", roles: ["operator", "compliance"] }
};

let currentRole = "operator";
let currentScenario = "normal-flow";
let currentEndpoint = "me";
let state = buildState();

const elements = {
  loginView: document.querySelector("#login-view"),
  appView: document.querySelector("#app-view"),
  loginForm: document.querySelector("#login-form"),
  loginName: document.querySelector("#login-name"),
  logout: document.querySelector("#logout"),
  role: document.querySelector("#role"),
  scenario: document.querySelector("#scenario"),
  reset: document.querySelector("#reset-state"),
  method: document.querySelector("#request-method"),
  path: document.querySelector("#request-path"),
  status: document.querySelector("#response-status"),
  metrics: document.querySelector("#metric-row"),
  statePanel: document.querySelector("#state-panel"),
  table: document.querySelector("#table-container"),
  json: document.querySelector("#json-view")
};

function buildState() {
  const next = structuredClone(baseState);
  const override = scenarios[currentScenario] || {};
  for (const [key, value] of Object.entries(override)) {
    if (key === "users") Object.assign(next.users, structuredClone(value));
    else next[key] = structuredClone(value);
  }
  return next;
}

function response(status, data) {
  return { status, body: status >= 400 ? { error: data } : { data } };
}

function permissionDenied() {
  return response(403, {
    code: "FORBIDDEN",
    message: "Current role cannot access this resource.",
    details: [],
    traceId: `mock-${Math.random().toString(16).slice(2, 8)}`
  });
}

function endpointResult(name = currentEndpoint) {
  const endpoint = endpoints[name];
  if (!endpoint.roles.includes(currentRole)) return permissionDenied();
  if (currentScenario === "api-error") {
    return response(503, {
      code: "SERVICE_UNAVAILABLE",
      message: "Mock service intentionally returns an error in this scenario.",
      details: [],
      traceId: `mock-${Math.random().toString(16).slice(2, 8)}`
    });
  }

  if (name === "me") return response(200, state.users[currentRole]);
  if (name === "clients") return response(200, state.clients);
  if (name === "commissions") return response(200, { items: state.commissions, summary: state.summary });
  if (name === "partners") return response(200, state.partners);
  if (name === "audits") return response(200, state.audits);
  if (name === "settlements") return response(200, state.settlements);
  if (name === "risk-events") return response(200, state.riskEvents);
  return response(404, { code: "NOT_FOUND", message: "Endpoint not found" });
}

function tagClass(value) {
  if (["active", "approved", "qualified", "attributed", "resolved", "low"].includes(value)) return "good";
  if (["pending", "holding", "materials-required", "investigating", "medium"].includes(value)) return "warn";
  if (["banned", "rejected", "reversed", "open", "escalated", "high", "no-source", "ib-excluded"].includes(value)) return "bad";
  if (["trading", "registered"].includes(value)) return "info";
  return "neutral";
}

function render() {
  const endpoint = endpoints[currentEndpoint];
  elements.method.textContent = endpoint.method;
  elements.path.textContent = endpoint.path;

  const result = endpointResult();
  elements.status.textContent = result.status;
  elements.status.classList.toggle("error", result.status >= 400);
  elements.json.textContent = JSON.stringify(result.body, null, 2);
  renderMetrics(result);
  renderActions();
  renderTable(result);
}

function renderMetrics(result) {
  const data = result.body.data;
  let metrics = [];

  if (currentEndpoint === "commissions" && data?.summary) {
    metrics = [
      ["Withdrawable", data.summary.withdrawable],
      ["Holding", data.summary.holding],
      ["Rejected", data.summary.rejected],
      ["Paid reversed", data.summary.paidReversed]
    ];
  } else if (currentEndpoint === "partners" && Array.isArray(data)) {
    metrics = [
      ["Partners", String(data.length)],
      ["Active", String(data.filter(item => item.status === "active").length)],
      ["Pending", String(data.filter(item => item.status === "pending").length)],
      ["R4", String(data.filter(item => item.riskBand === "R4").length)]
    ];
  } else if (currentEndpoint === "clients" && Array.isArray(data)) {
    metrics = [
      ["Clients", String(data.length)],
      ["Attributed", String(data.filter(item => item.attribution === "attributed").length)],
      ["No source", String(data.filter(item => item.attribution === "no-source").length)],
      ["IB excluded", String(data.filter(item => item.attribution === "ib-excluded").length)]
    ];
  } else if (currentEndpoint === "me" && data) {
    metrics = [
      ["Role", data.role],
      ["Profile", data.profileComplete ? "Complete" : "Incomplete"],
      ["User ID", data.userId],
      ["Permissions", String(data.permissions.length)]
    ];
  }

  elements.metrics.innerHTML = metrics.map(([label, value]) => `
    <div class="metric"><span>${label}</span><strong>${escapeHtml(String(value))}</strong></div>
  `);
}

function renderActions() {
  const actionMap = {
    audits: [
      { label: "Approve pa-001", run: () => { const item = state.audits[0]; if (item) item.status = "approved"; } },
      { label: "Require materials", run: () => { const item = state.audits[0]; if (item) item.status = "materials-required"; } }
    ],
    settlements: [
      { label: "Approve st-001", run: () => { const item = state.settlements[0]; if (item) item.status = "approved"; } },
      { label: "Freeze st-001", run: () => { const item = state.settlements[0]; if (item) item.status = "frozen"; } }
    ],
    "risk-events": [
      { label: "Resolve event", run: () => { const item = state.riskEvents[0]; if (item) item.status = "resolved"; } },
      { label: "Escalate event", run: () => { const item = state.riskEvents[0]; if (item) item.status = "escalated"; } }
    ]
  };

  const actions = actionMap[currentEndpoint] || [];
  elements.statePanel.innerHTML = "";
  elements.statePanel.classList.toggle("hidden", actions.length === 0);
  for (const action of actions) {
    const button = document.createElement("button");
    button.className = "action";
    button.type = "button";
    button.textContent = action.label;
    button.disabled = currentScenario === "empty-state" || currentScenario === "api-error";
    button.addEventListener("click", () => {
      action.run();
      render();
    });
    elements.statePanel.append(button);
  }
}

function columnsFor(name) {
  return {
    me: ["userId", "name", "role", "profileComplete"],
    clients: ["clientId", "emailMasked", "country", "attribution", "qualification", "realTrade"],
    commissions: ["commissionId", "partnerId", "clientId", "amount", "status", "holdDays"],
    partners: ["partnerId", "displayName", "emailMasked", "status", "country", "riskScore", "riskBand", "validFtd"],
    audits: ["auditId", "partnerId", "displayName", "emailMasked", "status", "submittedAt"],
    settlements: ["settlementId", "partnerId", "clientId", "amount", "status", "settlementDate"],
    "risk-events": ["eventId", "partnerId", "eventType", "severity", "status", "detectedAt"]
  }[name] || [];
}

function renderTable(result) {
  const data = result.body.data;
  let rows = [];
  if (currentEndpoint === "commissions" && data?.items) rows = data.items;
  else if (Array.isArray(data)) rows = data;
  else if (data) rows = [data];

  const columns = columnsFor(currentEndpoint);
  if (!columns.length || !rows.length) {
    elements.table.innerHTML = "";
    return;
  }

  elements.table.innerHTML = `
    <table>
      <thead><tr>${columns.map(column => `<th>${column}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows.map(row => `<tr>${columns.map(column => `<td>${renderCell(row[column])}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  `;
}

function renderCell(value) {
  if (typeof value === "boolean") return `<span class="tag ${value ? "good" : "neutral"}">${value ? "Yes" : "No"}</span>`;
  if (typeof value === "string" && ["active", "pending", "approved", "rejected", "holding", "reversed", "qualified", "trading", "registered", "attributed", "no-source", "ib-excluded", "materials-required", "frozen", "open", "resolved", "escalated", "low", "medium", "high"].includes(value)) {
    return `<span class="tag ${tagClass(value)}">${value}</span>`;
  }
  return escapeHtml(value === undefined || value === null ? "" : String(value));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

elements.loginForm.addEventListener("submit", event => {
  event.preventDefault();
  const username = event.currentTarget.username.value.trim();
  const password = event.currentTarget.password.value;
  if (!username || !password) return;
  sessionStorage.setItem("affiliate-mock-user", username);
  showApp(username);
});

elements.logout.addEventListener("click", () => {
  sessionStorage.removeItem("affiliate-mock-user");
  elements.loginView.classList.remove("hidden");
  elements.appView.classList.add("hidden");
});

elements.role.addEventListener("change", event => {
  currentRole = event.target.value;
  render();
});

elements.scenario.addEventListener("change", event => {
  currentScenario = event.target.value;
  state = buildState();
  render();
});

elements.reset.addEventListener("click", () => {
  state = buildState();
  render();
});

document.querySelectorAll(".endpoint").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".endpoint").forEach(item => item.classList.remove("selected"));
    button.classList.add("selected");
    currentEndpoint = button.dataset.endpoint;
    render();
  });
});

function showApp(username) {
  elements.loginName.textContent = username;
  elements.loginView.classList.add("hidden");
  elements.appView.classList.remove("hidden");
  render();
}

const savedUser = sessionStorage.getItem("affiliate-mock-user");
if (savedUser) showApp(savedUser);
