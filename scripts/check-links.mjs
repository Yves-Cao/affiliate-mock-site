import fs from "node:fs/promises";
import path from "node:path";

async function collectMarkdownFiles(dir, files = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "mock-admin", "flowcharts", "PRD"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectMarkdownFiles(full, files);
    else if (entry.name.endsWith(".md")) files.push(full);
  }
  return files;
}

const errors = [];
for (const file of await collectMarkdownFiles(".")) {
  const content = await fs.readFile(file, "utf8");
  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^(https?:|mailto:|git@)/.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), target);
    try {
      await fs.access(resolved);
    } catch {
      errors.push(`${path.relative(".", file)} -> ${target}`);
    }
  }
}

if (errors.length) {
  console.error(`Broken local Markdown links:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log("Markdown local links valid");
