const assert = require("node:assert/strict");
const {startAdminMockServer} = require("../mock-server/admin-mock.cjs");

async function request(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer local-admin-mock-token",
      "X-Mock-Role": options.role || "system_admin",
      "X-Mock-Scenario": options.scenario || "success",
      ...(options.headers || {})
    }
  });
  return {status: response.status, body: await response.json()};
}

(async () => {
  const server = await startAdminMockServer(0);
  const base = `http://127.0.0.1:${server.address().port}/admin/api/v1`;
  try {
    const unauthenticated = await fetch(base + "/partners");
    assert.equal(unauthenticated.status, 401);

    const session = await request(base, "/session");
    assert.equal(session.body.data.role.id, "system_admin");
    assert.match(session.body.data.user.email_masked, /^[^@]{1,3}\*\*\*@/);

    const partners = await request(base, "/partners?page=1&page_size=20");
    assert.equal(partners.body.data.total, 6);
    assert.ok(partners.body.data.items.every(row => row.email_masked.includes("***")));

    const filteredClients = await request(base, "/clients?partner_id=partner-1001");
    assert.equal(filteredClients.body.data.total, 2);
    assert.ok(filteredClients.body.data.items.every(row => row.partner_id === "partner-1001"));

    const partner = await request(base, "/partners/partner-1001");
    assert.equal(partner.body.data.commissions.length, 3);
    assert.equal(partner.body.data.clients.length, 2);

    const commission = await request(base, "/commissions/comm-3001");
    assert.equal(
      Number(commission.body.data.gross_amount_minor) -
      Number(commission.body.data.tax_amount_minor) -
      Number(commission.body.data.guarantee_amount_minor),
      Number(commission.body.data.net_amount_minor)
    );

    const withdrawal = await request(base, "/withdrawals/wd-5001");
    assert.equal(
      withdrawal.body.data.allocations.reduce((sum, row) => sum + Number(row.amount_minor), 0),
      Number(withdrawal.body.data.amount.amount_minor)
    );
    assert.equal(withdrawal.body.data.partner.partner_id, "partner-1001");

    const operationsFreeze = await request(base, "/partners/partner-1003/actions/freeze", {
      method: "POST", body: JSON.stringify({reason: "risk review"}), role: "operations"
    });
    assert.equal(operationsFreeze.status, 403);

    const riskWithoutReason = await request(base, "/partners/partner-1003/actions/freeze", {
      method: "POST", body: JSON.stringify({}), role: "risk"
    });
    assert.equal(riskWithoutReason.status, 422);

    const riskFreeze = await request(base, "/partners/partner-1003/actions/freeze", {
      method: "POST", body: JSON.stringify({reason: "risk review"}), role: "risk"
    });
    assert.equal(riskFreeze.status, 200);
    assert.equal(riskFreeze.body.data.status, "frozen");
    assert.equal(riskFreeze.body.data.audit_recorded, true);

    const empty = await request(base, "/partners", {scenario: "empty"});
    assert.deepEqual(empty.body.data.items, []);

    const forbidden = await request(base, "/partners", {scenario: "forbidden"});
    assert.equal(forbidden.status, 403);

    const timeout = await request(base, "/partners", {scenario: "external_timeout"});
    assert.equal(timeout.status, 504);

    const operationsTasks = await request(base, "/integration-tasks", {role: "operations"});
    assert.equal(operationsTasks.status, 403);

    const task = await request(base, "/integration-tasks/int-6004");
    assert.equal(task.body.data.client.client_id, "client-2004");

    const retryTask = await request(base, "/integration-tasks/int-6004/actions/retry", {method: "POST", body: "{}"});
    assert.equal(retryTask.body.data.status, "retrying");
    assert.equal(retryTask.body.data.object_id, "int-6004");

    console.log(JSON.stringify({
      partners: partners.body.data.total,
      clients: filteredClients.body.data.total,
      commission: commission.body.data.commission_id,
      withdrawal: withdrawal.body.data.withdrawal_id,
      result: "Admin API mock checks passed"
    }, null, 2));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
