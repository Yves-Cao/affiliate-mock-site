#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {spawnSync} = require("node:child_process");

const scriptRoot = __dirname;
const outputRoot = path.resolve(scriptRoot, "../openapi");
const sourcePath = path.resolve(scriptRoot, "../../docs/PRD_EN/contracts/p0-minimum-closed-loop-traceability-v1.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const objectSchemas = JSON.parse(fs.readFileSync(path.join(outputRoot, "schemas/p0-object-schemas.json"), "utf8"));
const eventSchemas = JSON.parse(fs.readFileSync(path.join(outputRoot, "schemas/p0-event-schemas.json"), "utf8"));
const openapi = JSON.parse(fs.readFileSync(path.join(outputRoot, "p0-canonical-openapi.yaml"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(outputRoot, "p0-contract-test-manifest.json"), "utf8"));
const errors = [];

function fail(message) {
  errors.push(message);
}

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "affiliate-p0-contract-"));
const generated = spawnSync(process.execPath, [path.join(scriptRoot, "build-p0-contract.cjs"), temporaryRoot], {encoding: "utf8"});
if (generated.status !== 0) {
  fail(generated.stderr || generated.stdout || "generator failed");
} else {
  for (const relativePath of ["schemas/p0-object-schemas.json", "schemas/p0-openapi-schemas.json", "schemas/p0-event-schemas.json", "p0-canonical-openapi.yaml", "p0-contract-test-manifest.json"]) {
    const actual = fs.readFileSync(path.join(outputRoot, relativePath), "utf8");
    const expected = fs.readFileSync(path.join(temporaryRoot, relativePath), "utf8");
    if (actual !== expected) fail(`${relativePath} is stale; run npm run build:p0-contract`);
  }
}
fs.rmSync(temporaryRoot, {recursive: true, force: true});

const stageOperations = source.stages.flatMap(stage => stage.operations);
const stageEvents = source.stages.flatMap(stage => stage.events);
const stageRequirements = source.stages.flatMap(stage => stage.requirements);
if (source.requirementIdResolution?.status !== "resolved") fail("funds requirement ID resolution is not marked resolved");
for (const oldId of source.requirementIdResolution?.affectedRequirements || []) {
  if (stageRequirements.includes(oldId)) fail(`minimum loop still uses superseded ${oldId}`);
}
for (const newId of source.requirementIdResolution?.replacementIds || []) {
  if (!stageRequirements.includes(newId)) fail(`minimum loop does not exercise stable ${newId}`);
}
const operationIds = Object.values(openapi.paths).flatMap(pathItem => Object.values(pathItem).map(operation => operation.operationId));
if (new Set(operationIds).size !== operationIds.length) fail("duplicate operationId");
if (new Set(operationIds).size !== new Set(stageOperations).size) fail("operation set does not match source");
if (eventSchemas.oneOf.length !== new Set(stageEvents).size) fail("event oneOf set does not match source");
if (Object.keys(objectSchemas.definitions).length !== Object.keys(source.objectDictionary).length) fail("object schema count does not match source");

for (const stage of source.stages) {
  for (const objectName of stage.objects) {
    const schema = objectSchemas.definitions[objectName];
    if (!schema) fail(`missing object schema ${objectName}`);
    if (!Array.isArray(schema.required) || schema.required.length === 0) fail(`object ${objectName} has no required fields`);
  }
}

for (const [pathName, pathItem] of Object.entries(openapi.paths)) {
  for (const [method, operation] of Object.entries(pathItem)) {
    if (method !== "get") {
      const parameters = operation.parameters || [];
      const hasIdempotency = parameters.some(parameter => parameter.$ref === "#/components/parameters/IdempotencyKey");
      if (!hasIdempotency) fail(`mutation ${operation.operationId} lacks required idempotency parameter`);
      if (!Object.keys(operation.responses).includes("409")) fail(`mutation ${operation.operationId} lacks conflict response`);
    }
  }
  if (!pathName.startsWith("/p0/")) fail(`unexpected canonical path ${pathName}`);
}

const assertions = source.stages.flatMap(stage => stage.acceptanceTests);
if (assertions.length !== 37) fail(`expected 37 acceptance assertions, found ${assertions.length}`);
if (manifest.counts.operations !== new Set(stageOperations).size) fail("manifest operation count mismatch");
if (manifest.counts.events !== new Set(stageEvents).size) fail("manifest event count mismatch");
if (manifest.counts.objects !== Object.keys(source.objectDictionary).length) fail("manifest object count mismatch");

if (errors.length) {
  console.error(`P0 contract check failed:\n${errors.map(error => `- ${error}`).join("\n")}`);
  process.exit(1);
}
console.log(`P0 contract check passed: ${new Set(stageOperations).size} operations, ${new Set(stageEvents).size} events, ${Object.keys(source.objectDictionary).length} objects, ${assertions.length} assertions`);
