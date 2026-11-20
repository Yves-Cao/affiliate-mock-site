#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const outputRoot = path.resolve(__dirname, "../openapi");
const schemaFiles = {
  "p0-object-schemas.json": JSON.parse(fs.readFileSync(path.join(outputRoot, "schemas/p0-object-schemas.json"), "utf8")),
  "p0-event-schemas.json": JSON.parse(fs.readFileSync(path.join(outputRoot, "schemas/p0-event-schemas.json"), "utf8")),
  "p0-openapi-schemas.json": JSON.parse(fs.readFileSync(path.join(outputRoot, "schemas/p0-openapi-schemas.json"), "utf8"))
};
const manifest = JSON.parse(fs.readFileSync(path.join(outputRoot, "p0-contract-test-manifest.json"), "utf8"));
const failures = [];

function resolveRef(ref, currentFile) {
  const [fileName, fragment = "#"] = ref.split("#");
  const document = fileName ? schemaFiles[path.basename(fileName)] : schemaFiles[currentFile];
  if (!document) return undefined;
  let value = document;
  for (const part of fragment.split("/").filter(Boolean)) value = value[part.replace(/~1/g, "/").replace(/~0/g, "~")];
  return value;
}

function isDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function validate(value, schema, currentFile) {
  if (!schema) return "schema reference cannot be resolved";
  if (schema.$ref) return validate(value, resolveRef(schema.$ref, currentFile), currentFile);
  if (schema.allOf) {
    for (const item of schema.allOf) {
      const result = validate(value, item, currentFile);
      if (result) return result;
    }
  }
  if (schema.oneOf) {
    const matched = schema.oneOf.filter(item => !validate(value, item, currentFile)).length;
    if (matched !== 1) return "value must match exactly one oneOf branch";
  }
  if (schema.const !== undefined && value !== schema.const) return "const mismatch";
  if (schema.enum && !schema.enum.includes(value)) return "enum mismatch";
  if (schema.type) {
    const validType = Array.isArray(schema.type)
      ? schema.type.some(type => validate(value, {...schema, type}, currentFile) === undefined)
      : (
        (schema.type === "object" && value && typeof value === "object" && !Array.isArray(value)) ||
        (schema.type === "array" && Array.isArray(value)) ||
        (schema.type === "string" && typeof value === "string") ||
        (schema.type === "integer" && Number.isInteger(value)) ||
        (schema.type === "number" && typeof value === "number") ||
        (schema.type === "boolean" && typeof value === "boolean")
      );
    if (!validType) return `expected ${schema.type}`;
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) return "string is too short";
    if (schema.pattern && !(new RegExp(schema.pattern)).test(value)) return "string pattern mismatch";
    if (schema.format === "date-time" && !isDate(value)) return "invalid date-time";
  }
  if (Array.isArray(value) && (schema.minItems !== undefined && value.length < schema.minItems)) return "array is too short";
  if (Array.isArray(value) && schema.items) {
    for (const item of value) {
      const result = validate(item, schema.items, currentFile);
      if (result) return result;
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const field of schema.required || []) {
      if (!(field in value)) return `missing required field ${field}`;
    }
    for (const [field, child] of Object.entries(schema.properties || {})) {
      if (field in value) {
        const result = validate(value[field], child, currentFile);
        if (result) return `${field}: ${result}`;
      }
    }
  }
  return undefined;
}

function exampleFromSchema(schema, currentFile) {
  if (schema.$ref) return exampleFromSchema(resolveRef(schema.$ref, currentFile), currentFile);
  if (schema.allOf || schema.oneOf) {
    const branches = schema.allOf || schema.oneOf;
    const example = {};
    for (const branch of branches) {
      for (const [field, property] of Object.entries(branch.properties || {})) {
        if (property.const !== undefined) example[field] = property.const;
      }
      Object.assign(example, exampleFromSchema(branch, currentFile));
    }
    return example;
  }
  if (schema.type === "object" || schema.properties) {
    const example = {};
    for (const field of schema.required || []) {
      if (!schema.properties?.[field]) {
        example[field] = `${field}-fixture`;
      } else {
        example[field] = exampleFromSchema(schema.properties[field], currentFile);
      }
    }
    return example;
  }
  if (schema.type === "array") return [exampleFromSchema(schema.items, currentFile)];
  if (schema.type === "integer") return schema.minimum ?? 0;
  if (schema.type === "boolean") return true;
  if (schema.type === "string") {
    if (schema.format === "date-time") return "2026-11-18T00:00:00Z";
    if (schema.pattern?.includes("[0-9]")) return "100.00";
    if (schema.enum?.length) return schema.enum[0];
    return "fixture";
  }
  return null;
}

const objectSchemas = schemaFiles["p0-object-schemas.json"].definitions;
for (const [name, schema] of Object.entries(objectSchemas)) {
  const example = exampleFromSchema(schema, "p0-object-schemas.json");
  const valid = validate(example, schema, "p0-object-schemas.json");
  if (valid) failures.push(`object ${name} fixture: ${valid}`);
  const missing = Object.keys(example)[0];
  if (missing) {
    const invalidExample = {...example};
    delete invalidExample[missing];
    const invalid = validate(invalidExample, schema, "p0-object-schemas.json");
    if (!invalid) failures.push(`object ${name} accepted missing required field ${missing}`);
  }
}

const eventSchemas = schemaFiles["p0-event-schemas.json"].definitions;
for (const [name, schema] of Object.entries(eventSchemas)) {
  if (name === "EventEnvelope") continue;
  const example = exampleFromSchema(schema, "p0-event-schemas.json");
  example.event_type = name;
  const valid = validate(example, schema, "p0-event-schemas.json");
  if (valid) failures.push(`event ${name} fixture: ${valid}`);
  const invalid = validate({...example, event_type: `${name}-invalid`}, schema, "p0-event-schemas.json");
  if (!invalid) failures.push(`event ${name} accepted an invalid event_type`);
}

const amountSchema = objectSchemas.LedgerEntry.properties.amount;
if (validate("100.00", amountSchema, "p0-object-schemas.json")) failures.push("decimal string schema did not accept a valid amount");
if (!validate("100.0", amountSchema, "p0-object-schemas.json")) failures.push("decimal string schema accepted an invalid amount");
if (manifest.counts.objects !== Object.keys(objectSchemas).length) failures.push("manifest object count does not match schemas");
if (manifest.counts.events !== Object.keys(eventSchemas).length - 1) failures.push("manifest event count does not match schemas");
if (manifest.counts.acceptanceAssertions !== 37) failures.push("manifest acceptance assertion count mismatch");

if (failures.length) {
  console.error(`P0 contract tests failed:\n${failures.map(failure => `- ${failure}`).join("\n")}`);
  process.exit(1);
}
console.log(`P0 contract tests passed: ${Object.keys(objectSchemas).length} objects, ${Object.keys(eventSchemas).length - 1} events, ${manifest.counts.acceptanceAssertions} assertions`);
