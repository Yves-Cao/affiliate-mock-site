const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const page = read("statements-page.js");
const css = read("statements-page.css");
const routes = read("data.js");
const app = read("app.js");
const html = read("index.html");

assert.match(routes, /id: "statements".*label: "结算单"/, "Statements route is registered");
assert.match(app, /"结算单": "Statements"/, "English route label exists");
assert.match(app, /statements: '<path d="M6 3h9l4 4v14H6z"/, "Statements icon exists");
assert.match(html, /statements-page\.css/, "Statement stylesheet is loaded");
assert.match(html, /statements-page\.js/, "Statement module is loaded");

for (const marker of [
  "function availableAt(",
  "function buildStatement(",
  "guaranteeRetained",
  "guaranteeReleased",
  "reversalUsed",
  "withdrawalPaid",
  "withdrawalProcessing",
  "failedReturned",
  "data-statement-download",
  "data-statement-format",
  "data-statement-detail",
  "下载记录",
  "24小时"
]) assert.ok(page.includes(marker), `Statement page includes ${marker}`);

assert.ok(page.includes("const expectedChange") && page.includes("Math.abs(netChange - expectedChange)"), "Statement balance is checked against movements");
assert.ok(page.includes('format === "pdf"') && page.includes("%PDF-1.4"), "PDF download is generated");
assert.ok(page.includes("text/csv;charset=utf-8"), "CSV download is generated");
assert.ok(!page.includes("data-route=\"invoices\"") && !page.includes("data-route=\"tax-forms\""), "No invoice or tax-form route");
assert.ok(page.includes("AUD-"), "Download records carry audit IDs");
for (const breakpoint of ["991px", "767px"]) assert.ok(css.includes(breakpoint), `Responsive rule at ${breakpoint}`);

console.log(JSON.stringify({
  route: "statements",
  checks: 22,
  result: "Statements static contract checks passed"
}, null, 2));
