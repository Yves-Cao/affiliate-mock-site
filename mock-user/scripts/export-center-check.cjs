const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const source = read("export-center.js");
const css = read("export-center.css");
const reports = read("reports.js");
const html = read("index.html");

assert.ok(html.includes("export-center.css") && html.includes("export-center.js"), "Export-center assets are loaded");
assert.ok(reports.includes("AFF.exportCenter.panel()"), "Report pages embed export center");
assert.ok(reports.includes("function exportCsv()"), "Report module exposes a reusable CSV snapshot");
assert.ok(reports.includes('data-export-action="create"'), "Report toolbar creates an export task");
assert.ok(!reports.includes('data-rp-action="export"'), "Immediate export action is replaced by task flow");

for (const status of ["processing", "ready", "failed", "expired"]) assert.ok(source.includes(`${status}: [`), `Status ${status} exists`);
for (const marker of ["data-export-action='create'", "data-export-action='download'", "data-export-action='retry'", "24小时", "AUD-", "csv: snapshot.csv"]) {
  assert.ok(source.includes(marker), `Export task flow includes ${marker}`);
}
assert.ok(source.includes("Exports all matched rows, not only the current page"), "Export scope is not limited to the visible page");
assert.ok(source.includes("Contact data stays masked"), "Export note preserves contact masking");
assert.ok(reports.includes("if (/^[=+\\-@\\t\\r]/.test(text))"), "CSV keeps formula-injection protection");
for (const breakpoint of ["991px", "767px"]) assert.ok(css.includes(breakpoint), `Responsive rule at ${breakpoint}`);

console.log(JSON.stringify({
  component: "export-center",
  embedded: ["perf", "summary", "clients"],
  statuses: 4,
  checks: 20,
  result: "Export center static contract checks passed"
}, null, 2));
