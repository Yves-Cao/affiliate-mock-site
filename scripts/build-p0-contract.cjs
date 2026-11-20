#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const sourcePath = path.resolve(__dirname, "../../docs/PRD_EN/contracts/p0-minimum-closed-loop-traceability-v1.json");
const defaultOutputRoot = path.resolve(__dirname, "../openapi");
const outputRoot = path.resolve(process.argv[2] || defaultOutputRoot);
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

function kebab(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function operationMethod(name) {
  if (/^(get|list|query)/.test(name)) return "get";
  return "post";
}

function operationPath(stage, name) {
  return `/p0/${kebab(stage.name)}/${kebab(name)}`;
}

function splitKeyFields(value) {
  return String(value)
    .split("+")
    .map(item => item.trim())
    .filter(Boolean);
}

function identityFields(definition) {
  const fields = splitKeyFields(definition.identity || "");
  if (definition.uniqueKey) fields.push(...splitKeyFields(definition.uniqueKey));
  return fields.filter(Boolean);
}

function fieldType(field) {
  if (/_count$|count$/.test(field)) return {type: "integer", minimum: 0};
  if (/(^|_)(record|application|path|options|event|fact|statement|allocation_snapshot)_version$/.test(field)) return {type: "integer", minimum: 1};
  if (/_at$|_time$/.test(field)) return {type: "string", format: "date-time"};
  if (/(amount|price|fee)$/.test(field)) {
    return {type: "string", pattern: "^-?[0-9]+\\.[0-9]{2}$"};
  }
  if (/_refs$/.test(field) || /_ids$/.test(field) || field === "evidence_refs") {
    return {type: "array", items: {type: "string", minLength: 1}};
  }
  if (/_(snapshot|diff|impact|results|checkpoints?)$/.test(field)) return {type: "object"};
  if (/^(passed|failed|effective_click|accepted|acceptance|is_)/.test(field)) return {type: "boolean"};
  return {type: "string", minLength: 1};
}

function objectSchema(name, definition) {
  const required = [...new Set([...identityFields(definition), ...(definition.requiredFields || [])])];
  const properties = {};
  for (const field of required) properties[field] = fieldType(field);
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: `https://affiliate.local/schemas/p0/objects/${name}.schema.json`,
    title: `${name} P0 object`,
    type: "object",
    additionalProperties: true,
    required,
    properties,
    "x-affiliate-stable-identity": definition.identity,
    ...(definition.uniqueKey ? {"x-affiliate-unique-key": definition.uniqueKey} : {}),
    "x-affiliate-authority": definition.authority,
    "x-affiliate-notes": definition.notes
  };
}

function buildObjectSchemas() {
  const definitions = {};
  for (const [name, definition] of Object.entries(source.objectDictionary)) {
    definitions[name] = objectSchema(name, definition);
  }
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://affiliate.local/schemas/p0-object-schemas.json",
    title: "Affiliate P0 canonical object schemas",
    type: "object",
    additionalProperties: false,
    definitions
  };
}

function primaryObject(stage, eventName) {
  const objects = stage.objects;
  const rules = [
    [/partner_lifecycle/, "PartnerLifecycleRecord"],
    [/termination/, "TerminationHandoff"],
    [/registration/, "RegistrationFact"],
    [/touch/, "ExternalTouch"],
    [/candidate/, "AttributionCandidate"],
    [/correction|corrected/, "AttributionCorrection"],
    [/attribution/, "Attribution"],
    [/customer_fact|qualification/, "QualificationCase"],
    [/milestone/, "MilestoneSnapshot"],
    [/commission/, "CommissionCase"],
    [/risk_fact/, "RiskFact"],
    [/credit_point/, "CreditPointRecord"],
    [/credit_score/, "CreditScoreSnapshot"],
    [/credit_override/, "CreditOverride"],
    [/credit_level/, "CreditLevelSnapshot"],
    [/credit_benefit/, "CreditBenefitSnapshot"],
    [/signal/, "RiskSignal"],
    [/gate/, "SettlementGateEvaluation"],
    [/case_review/, "RiskCase"],
    [/quarantine/, "QuarantineRecord"],
    [/execution/, "RiskExecution"],
    [/settlement_run/, "SettlementRun"],
    [/ledger/, "LedgerEntry"],
    [/deposit/, "GuaranteeLine"],
    [/statement/, "StatementVersion"],
    [/settlement_case/, "SettlementCase"],
    [/payout|payment|provider/, "PayoutAttempt"],
    [/reconcil/, "ReconciliationRecord"],
    [/reversal/, "ReversalCase"],
    [/click/, "Click"],
    [/path|config|material/, "OfficialPath"],
    [/link/, "OfficialLink"],
    [/withdrawal|allocation/, "Withdrawal"],
    [/application|partner/, "Application"]
  ];
  for (const [pattern, preferred] of rules) {
    if (pattern.test(eventName) && objects.includes(preferred)) return preferred;
  }
  return objects[0];
}

function buildEventSchemas() {
  const envelopeRequired = source.commonEnvelope.event.filter(field => !field.includes("."));
  const definitions = {
    EventEnvelope: {
      type: "object",
      additionalProperties: false,
      required: envelopeRequired,
      properties: {
        event_id: {type: "string", minLength: 1},
        event_type: {type: "string", minLength: 1},
        event_version: {type: "integer", minimum: 1},
        occurred_at: {type: "string", format: "date-time"},
        processed_at: {type: "string", format: "date-time"},
        trace_id: {type: "string", minLength: 1},
        source: {type: "string", enum: ["affiliate", "crm", "payment", "salesforce", "analytics", "test"]},
        object_type: {type: "string", minLength: 1},
        object_id: {type: "string", minLength: 1},
        fact_version: {type: "string", minLength: 1},
        rule_version: {type: "string", minLength: 1},
        idempotency_key: {type: "string", minLength: 1},
        visibility: {type: "string", enum: ["partner_limited", "admin", "audit_only"]},
        data: {type: "object"},
        audit: {
          type: "object",
          required: ["actor_id", "reason_code"],
          properties: {
            actor_id: {type: "string", minLength: 1},
            reason_code: {type: "string", minLength: 1},
            impact: {type: "object"}
          }
        }
      }
    }
  };
  const oneOf = [];
  for (const stage of source.stages) {
    for (const eventName of stage.events) {
      const objectName = primaryObject(stage, eventName);
      definitions[eventName] = {
        allOf: [
          {$ref: "#/definitions/EventEnvelope"},
          {
            type: "object",
            properties: {
              event_type: {const: eventName},
              object_type: {const: objectName},
              data: {$ref: `p0-object-schemas.json#/definitions/${objectName}`}
            }
          }
        ],
        "x-affiliate-stage": stage.id,
        "x-affiliate-requirements": stage.requirements,
        "x-affiliate-primary-object": objectName
      };
      oneOf.push({$ref: `#/definitions/${eventName}`});
    }
  }
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://affiliate.local/schemas/p0-event-schemas.json",
    title: "Affiliate P0 target event schemas",
    oneOf,
    definitions
  };
}

function buildOpenApiObjectSchemas(objectSchemas) {
  const definitions = {};
  for (const [name, schema] of Object.entries(objectSchemas.definitions)) {
    definitions[name] = JSON.parse(JSON.stringify(schema));
    delete definitions[name].$schema;
    delete definitions[name].$id;
  }
  return {
    $id: "https://affiliate.local/schemas/p0-openapi-schemas.json",
    title: "Affiliate P0 OpenAPI-compatible object schemas",
    type: "object",
    additionalProperties: false,
    definitions
  };
}

function errorResponse(description) {
  return {
    description,
    content: {"application/json": {schema: {$ref: "#/components/schemas/ErrorEnvelope"}}}
  };
}

function buildOpenAPI() {
  const openapi = {
    openapi: "3.0.3",
    info: {
      title: "Affiliate CPA P0 Canonical Contract",
      version: "0.1.0",
      license: {name: "UNLICENSED", url: "https://example.com/unlicensed"},
      description: "Generated from the P0 minimum closed-loop traceability source. Logical paths are CPA-internal contract surfaces, not production provider endpoints."
    },
    servers: [{url: "http://affiliate.invalid/p0"}],
    security: [{bearerAuth: []}],
    tags: source.stages.map(stage => ({name: stage.id, description: stage.name})),
    paths: {},
    components: {
      securitySchemes: {bearerAuth: {type: "http", scheme: "bearer", bearerFormat: "JWT"}},
      parameters: {
        TraceId: {name: "X-Trace-Id", in: "header", required: true, schema: {type: "string", minLength: 1}},
        IdempotencyKey: {name: "X-Idempotency-Key", in: "header", required: true, schema: {type: "string", minLength: 1}}
      },
      schemas: {
        SuccessEnvelope: {
          type: "object",
          required: ["success", "data", "trace_id", "data_as_of", "data_quality"],
          properties: {
            success: {type: "boolean", enum: [true]},
            data: {type: "object"},
            trace_id: {type: "string", minLength: 1},
            data_as_of: {type: "string", format: "date-time"},
            data_quality: {type: "string", enum: ["valid", "unknown", "missing", "stale", "partial", "conflict", "duplicate", "blocked"]}
          }
        },
        ErrorEnvelope: {
          type: "object",
          required: ["success", "code", "message", "trace_id", "retryable"],
          properties: {
            success: {type: "boolean", enum: [false]},
            code: {type: "string", pattern: "^AFF-[0-9]{5}$"},
            message: {type: "string", minLength: 1},
            display_message: {type: "string"},
            trace_id: {type: "string", minLength: 1},
            retryable: {type: "boolean"},
            retry_after_seconds: {type: "integer", minimum: 0},
            details: {type: "array", items: {type: "object"}},
            source: {type: "object"}
          }
        }
      }
    },
    "x-affiliate-source": path.relative(process.cwd(), sourcePath),
    "x-affiliate-object-schemas": "./schemas/p0-object-schemas.json",
    "x-affiliate-event-schemas": "./schemas/p0-event-schemas.json"
  };

  for (const stage of source.stages) {
    for (const operationName of stage.operations) {
      const method = operationMethod(operationName);
      const path = operationPath(stage, operationName);
      const mutation = method !== "get";
      const parameters = [{$ref: "#/components/parameters/TraceId"}];
      if (mutation) parameters.push({$ref: "#/components/parameters/IdempotencyKey"});
      const operation = {
        tags: [stage.id],
        operationId: operationName,
        summary: `${stage.name}: ${operationName}`,
        security: [{bearerAuth: []}],
        parameters,
        "x-affiliate-stage": stage.id,
        "x-aff-req": stage.requirements,
        "x-affiliate-features": stage.features,
        "x-affiliate-events": stage.events,
        "x-affiliate-objects": stage.objects,
        "x-affiliate-p0loop-tests": stage.acceptanceTests.map(item => item.match(/P0LOOP-AC\d+/)?.[0]).filter(Boolean),
        responses: {
          200: {
            description: "Success",
            content: {"application/json": {schema: {$ref: "#/components/schemas/SuccessEnvelope"}}}
          },
          400: errorResponse("Validation error"),
          401: errorResponse("Authentication required"),
          403: errorResponse("Forbidden"),
          404: errorResponse("Not found"),
          409: errorResponse("State, version, or idempotency conflict"),
          422: errorResponse("Business rejection"),
          429: errorResponse("Rate limited"),
          500: errorResponse("Internal error"),
          503: errorResponse("Dependency unavailable")
        }
      };
      if (mutation) {
        operation.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: {$ref: "./schemas/p0-openapi-schemas.json#/definitions/" + primaryObject(stage, operationName)}
            }
          }
        };
      }
      openapi.paths[path] = openapi.paths[path] || {};
      openapi.paths[path][method] = operation;
    }
  }
  return openapi;
}

function buildTestManifest(openapi, objectSchemas, eventSchemas) {
  const operationTests = [];
  for (const [path, pathItem] of Object.entries(openapi.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      const mutation = method !== "get";
      operationTests.push({
        id: `P0-OP-${operation.operationId}`,
        operationId: operation.operationId,
        method: method.toUpperCase(),
        path,
        requirements: operation["x-aff-req"],
        expectedEvents: operation["x-affiliate-events"],
        assertions: [
          "request matches the generated object schema",
          "response uses SuccessEnvelope or ErrorEnvelope",
          "trace_id is accepted and returned",
          "authorization denial is enforced",
          ...(mutation ? [
            "missing X-Idempotency-Key is rejected",
            "duplicate X-Idempotency-Key returns the original result",
            "conflicting X-Idempotency-Key payload is rejected",
            "illegal state transition returns a conflict error"
          ] : [])
        ]
      });
    }
  }
  return {
    id: "P0-CONTRACT-TEST-MANIFEST",
    version: "0.1.0",
    generatedFrom: path.relative(process.cwd(), sourcePath),
    schemaFiles: ["schemas/p0-object-schemas.json", "schemas/p0-openapi-schemas.json", "schemas/p0-event-schemas.json", "p0-canonical-openapi.yaml"],
    counts: {
      stages: source.stages.length,
      operations: operationTests.length,
      events: eventSchemas.oneOf.length,
      objects: Object.keys(objectSchemas.definitions).length,
      acceptanceAssertions: source.stages.flatMap(stage => stage.acceptanceTests).length
    },
    operationTests,
    eventTests: source.stages.flatMap(stage => stage.events.map(eventName => ({
      id: `P0-EV-${eventName}`,
      eventType: eventName,
      schemaRef: `p0-event-schemas.json#/definitions/${eventName}`,
      requirements: stage.requirements,
      assertions: [
        "event envelope is valid",
        "event_type is the expected constant",
        "object_type and object_id reference the primary object",
        "fact_version and rule_version are present",
        "duplicate idempotency_key does not create a second business effect"
      ]
    }))),
    acceptanceTests: source.stages.flatMap(stage => stage.acceptanceTests)
  };
}

const objectSchemas = buildObjectSchemas();
const openApiObjectSchemas = buildOpenApiObjectSchemas(objectSchemas);
const eventSchemas = buildEventSchemas();
const openapi = buildOpenAPI();
const testManifest = buildTestManifest(openapi, objectSchemas, eventSchemas);
const files = {
  "schemas/p0-object-schemas.json": objectSchemas,
  "schemas/p0-openapi-schemas.json": openApiObjectSchemas,
  "schemas/p0-event-schemas.json": eventSchemas,
  "p0-canonical-openapi.yaml": openapi,
  "p0-contract-test-manifest.json": testManifest
};

for (const [relativePath, content] of Object.entries(files)) {
  const target = path.join(outputRoot, relativePath);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, `${JSON.stringify(content, null, 2)}\n`, "utf8");
}

console.log(`Generated P0 contract artifacts in ${path.relative(process.cwd(), outputRoot)}: ${Object.keys(files).length} files`);
