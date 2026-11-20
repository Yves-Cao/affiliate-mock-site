#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {spawnSync} = require("node:child_process");

function findCachedRedocly() {
  if (process.env.REDOCLY_BIN) return process.env.REDOCLY_BIN;
  const npxRoot = path.join(os.homedir(), ".npm", "_npx");
  if (!fs.existsSync(npxRoot)) return null;
  for (const entry of fs.readdirSync(npxRoot)) {
    const candidate = path.join(npxRoot, entry, "node_modules", ".bin", "redocly");
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const cachedBin = findCachedRedocly();
const command = cachedBin || "npx";
const target = process.argv[2] || "openapi/affiliate-mock-openapi.yaml";
const args = cachedBin
  ? ["lint", target]
  : ["--yes", "--package", "@redocly/cli@1.34.2", "redocly", "lint", target];

const result = spawnSync(command, args, {stdio: "inherit"});
if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 0);
