import fs from "node:fs/promises";
import path from "node:path";

const file = path.resolve("contracts/openapi-ui.json");
const spec = JSON.parse(await fs.readFile(file, "utf8"));
const errors = [];

if (spec.openapi !== "3.1.0") errors.push("OpenAPI version must be 3.1.0");
if (!spec.info?.title || !spec.info?.version) errors.push("info.title and info.version are required");

const requiredPaths = [
  "/me",
  "/parameters",
  "/partners",
  "/partner-audits",
  "/partner-audits/{auditId}/decision",
  "/clients",
  "/clients/{clientId}",
  "/commissions",
  "/commissions/summary",
  "/settlements",
  "/settlements/{settlementId}/decision",
  "/risk-events",
  "/risk-events/{eventId}/decision"
];
for (const route of requiredPaths) {
  if (!spec.paths?.[route]) errors.push(`Missing path: ${route}`);
}

const operationIds = [];
for (const [route, pathItem] of Object.entries(spec.paths || {})) {
  for (const [method, operation] of Object.entries(pathItem)) {
    if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
    if (!operation.operationId) errors.push(`${method} ${route} lacks operationId`);
    else operationIds.push(operation.operationId);
    if (!operation.responses?.default?.$ref) errors.push(`${method} ${route} lacks default error response`);
  }
}
const duplicateIds = operationIds.filter((id, index) => operationIds.indexOf(id) !== index);
if (duplicateIds.length) errors.push(`Duplicate operationIds: ${duplicateIds.join(", ")}`);

function resolveRef(ref) {
  if (!ref?.startsWith("#/")) return undefined;
  let value = spec;
  for (const part of ref.slice(2).split("/")) {
    value = value?.[part.replace(/~1/g, "/").replace(/~0/g, "~")];
  }
  return value;
}

function walk(value, parent = "$") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${parent}[${index}]`));
    return;
  }
  if (value.$ref) {
    if (resolveRef(value.$ref) === undefined) errors.push(`Unresolved $ref ${value.$ref} at ${parent}`);
  }
  for (const [key, child] of Object.entries(value)) walk(child, `${parent}.${key}`);
}
walk(spec);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`OpenAPI structure valid: ${Object.keys(spec.paths).length} paths, ${operationIds.length} operations`);
