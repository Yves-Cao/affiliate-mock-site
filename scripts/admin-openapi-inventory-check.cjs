#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const openapiPath = path.join(__dirname, "..", "openapi", "affiliate-mock-openapi.yaml");
const inventoryPath = path.join(__dirname, "..", "openapi", "admin-openapi-inventory.json");
const openapi = fs.readFileSync(openapiPath, "utf8");
const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));

function yamlOperations() {
  const operations = [];
  let currentPath;
  let currentMethod;
  let inPaths = false;
  for (const line of openapi.split(/\r?\n/)) {
    if (line === "paths:") {
      inPaths = true;
      continue;
    }
    if (line === "components:") break;
    if (!inPaths) continue;

    const pathMatch = line.match(/^ "([^"]+)"\s*:\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      currentMethod = null;
      continue;
    }

    const methodMatch = line.match(/^\s+"?(get|post|put|patch|delete)"?\s*:\s*(?:\{)?$/);
    if (methodMatch) {
      currentMethod = methodMatch[1].toUpperCase();
      continue;
    }

    const operationMatch = line.match(/^\s+"?operationId"?\s*:\s*"?([A-Za-z0-9_-]+)"?,?\s*$/);
    if (operationMatch && currentPath && currentMethod) {
      operations.push({path: currentPath, method: currentMethod, operationId: operationMatch[1]});
    }
  }
  return operations;
}

const expected = yamlOperations();
const actual = inventory.operations || [];
const expectedIds = new Set(expected.map(operation => operation.operationId));
const actualIds = new Set(actual.map(operation => operation.operationId));
const duplicateActualIds = actual.map(operation => operation.operationId)
  .filter((id, index, ids) => ids.indexOf(id) !== index);
const missing = expected.filter(operation => !actualIds.has(operation.operationId));
const extra = actual.filter(operation => !expectedIds.has(operation.operationId));
const changed = actual.filter(operation => {
  const source = expected.find(item => item.operationId === operation.operationId);
  return source && (source.path !== operation.path || source.method !== operation.method);
});

const errors = [];
if (inventory.generated_from !== "affiliate-mock-openapi.yaml") errors.push("generated_from must name affiliate-mock-openapi.yaml");
if (duplicateActualIds.length) errors.push(`duplicate inventory operation IDs: ${duplicateActualIds.join(", ")}`);
if (missing.length) errors.push(`operations missing from inventory (${missing.length}): ${missing.map(operation => operation.operationId).join(", ")}`);
if (extra.length) errors.push(`extra inventory operations (${extra.length}): ${extra.map(operation => operation.operationId).join(", ")}`);
if (changed.length) errors.push(`path/method drift (${changed.length}): ${changed.map(operation => operation.operationId).join(", ")}`);

if (errors.length) {
  console.error(`admin-openapi-inventory check failed: YAML operations=${expected.length}, inventory operations=${actual.length}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`admin-openapi-inventory check passed: ${expected.length} operations aligned`);
