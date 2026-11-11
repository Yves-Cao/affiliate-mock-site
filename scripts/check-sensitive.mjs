import fs from "node:fs/promises";
import path from "node:path";

const denyPatterns = [
  { name: "local user path", pattern: /\/Users\/[^\s`]+/g },
  { name: "GitHub token", pattern: /gh[pousr]_[A-Za-z0-9_]+/g },
  { name: "generic secret assignment", pattern: /(api[_-]?key|secret|password|access[_-]?token)\s*[:=]\s*['"][^'"]{8,}}/gi },
  { name: "private key block", pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g }
];

const textExtensions = new Set([".md", ".json", ".yaml", ".yml", ".js", ".mjs", ".html", ".txt"]);
const errors = [];

async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "mock-admin"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
      continue;
    }
    if (!textExtensions.has(path.extname(entry.name))) continue;
    const content = await fs.readFile(full, "utf8");
    for (const rule of denyPatterns) {
      const match = content.match(rule.pattern);
      if (match) errors.push(`${path.relative(".", full)}: ${rule.name}`);
    }
  }
}

await walk(".");
if (errors.length) {
  console.error(`Sensitive content check failed:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log("Sensitive content check passed");
