import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const explicitSources = new Map([
  ["docs/mrd-v1.1.md", "Affiliate/Affiliate市场需求文档-MRD-v1.1.md"],
  ["docs/risk-v0.3.md", "Affiliate/Affiliate CPA风控方案-v0.3.md"],
  ["docs/interface-v0.2.md", "Affiliate/接口文档/Affiliate接口文档-v0.2-设计稿.md"],
  ["docs/event-flow-v0.3.md", "Affiliate/接口文档/事件流转综合文档-v0.3.md"],
  ["docs/mock-release-plan-v0.1.md", "Affiliate/Affiliate Mock发布包方案-v0.1.md"],
  ["docs/confirmed-decisions.md", "Affiliate/待决事项.md: derived confirmed-decision summary"],
  ["docs/api-conventions.md", "affiliate-mock: repo-native contract convention"],
  ["docs/rbac.md", "affiliate-mock: repo-native permission draft"],
  ["prototype/v0.21.html", "Affiliate/原型/Affiliate评审原型-v0.21.html"],
  ["prototype/mock-console.html", "affiliate-mock: zero-dependency contract console"],
  ["contracts/openapi-ui.json", "affiliate-mock: generated contract source"],
  ["traceability.json", "affiliate-mock: generated traceability source"]
]);

async function sha256(file) {
  return crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");
}

async function collect(directory, files = []) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(full, files);
    else files.push(full);
  }
  return files;
}

const files = new Set(explicitSources.keys());
for (const directory of ["docs/page-specs", "contracts", "mock/config", "mock/data", "mock/scenarios"]) {
  for (const file of await collect(directory)) files.add(path.toNamespacedPath ? file : file);
}

const entries = [];
for (const file of [...files].sort()) {
  const normalized = file.split(path.sep).join("/");
  if (!(await fs.access(file).then(() => true).catch(() => false))) continue;
  entries.push({
    path: normalized,
    source: explicitSources.get(normalized) || `affiliate-mock: ${normalized}`,
    sha256: await sha256(file)
  });
}

const manifest = {
  schemaVersion: "1.0",
  generatedAt: new Date().toISOString(),
  sourceOfTruth: "Affiliate project master documents; repo-native files are owned by this repository",
  files: entries
};

await fs.writeFile("release-manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`release-manifest.json written with ${entries.length} files`);
