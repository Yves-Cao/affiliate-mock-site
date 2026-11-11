import fs from "node:fs/promises";

const traceability = JSON.parse(await fs.readFile("traceability.json", "utf8"));
const spec = JSON.parse(await fs.readFile("contracts/openapi-ui.json", "utf8"));
const errors = [];

if (!Array.isArray(traceability.records) || traceability.records.length === 0) {
  errors.push("traceability.records must not be empty");
}

for (const record of traceability.records || []) {
  for (const required of ["id", "sourceRefs", "requirement", "pageSpec", "api", "scenarios", "implementationStatus"]) {
    if (!record[required]) errors.push(`${record.id || "unknown"} lacks ${required}`);
  }
  if (record.pageSpec) {
    try { await fs.access(record.pageSpec); } catch { errors.push(`${record.id}: missing pageSpec ${record.pageSpec}`); }
  }
  if (record.api && !record.api.startsWith("/")) {
    errors.push(`${record.id}: api must start with /`);
  }
  const contractPath = record.api?.replace(/^\/api\/v1(?=\/|$)/, "");
  if (contractPath?.includes("{")) {
    const template = contractPath.replace(/\{[^}]+\}/g, "[^/]+");
    const matches = Object.keys(spec.paths).some((route) => new RegExp(`^${template}$`).test(route));
    if (!matches) errors.push(`${record.id}: API route not found in OpenAPI: ${record.api}`);
  } else if (contractPath && !spec.paths[contractPath]) {
    errors.push(`${record.id}: API route not found in OpenAPI: ${record.api}`);
  }
  for (const scenario of record.scenarios || []) {
    try { await fs.access(`mock/scenarios/${scenario}.json`); } catch {
      errors.push(`${record.id}: missing scenario ${scenario}`);
    }
  }
}

const requiredScenarios = ["normal-flow", "dynamic-hold", "chargeback", "empty-state", "api-error"];
const present = new Set((traceability.records || []).flatMap((record) => record.scenarios || []));
for (const scenario of requiredScenarios) {
  if (!present.has(scenario)) errors.push(`Traceability lacks required scenario ${scenario}`);
}

if (errors.length) {
  console.error(`Traceability check failed:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log(`Traceability valid: ${traceability.records.length} records`);
