import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const manifest = JSON.parse(await fs.readFile("release-manifest.json", "utf8"));
const errors = [];
const listed = new Set();

async function sha256(file) {
  return crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");
}

for (const entry of manifest.files || []) {
  listed.add(entry.path);
  try {
    const actual = await sha256(entry.path);
    if (actual !== entry.sha256) errors.push(`${entry.path}: hash mismatch`);
  } catch {
    errors.push(`${entry.path}: missing`);
  }
}

async function collect(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(full));
    else files.push(full);
  }
  return files;
}

for (const directory of ["docs/page-specs", "contracts", "mock/config", "mock/data", "mock/scenarios"]) {
  for (const file of await collect(directory)) {
    if (!listed.has(file)) errors.push(`Unlisted managed file: ${file}`);
  }
}

if (errors.length) {
  console.error(`Release manifest verification failed:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log(`Release manifest valid: ${listed.size} managed files`);
