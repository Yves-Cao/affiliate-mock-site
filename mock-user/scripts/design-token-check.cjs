const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const tokens = read("design-tokens.css");
const styles = read("styles.css");
const html = read("index.html");
const credit = read("credit-center.css");
const userStyleFiles = [
  "styles.css", "account-page.css", "clients-page.css", "credit-center.css", "date-range.css",
  "earnings.css", "export-center.css", "finance.css", "funds-availability.css", "reports.css",
  "statements-page.css", "subchannels.css", "support-page.css", "withdrawals.css", "partner-closure.css", "drawer-footer.css", "simulation-console.css"
];

const requiredTokens = [
  ["--brand-deep", "#00187e"],
  ["--brand", "#005bff"],
  ["--nav-text", "#6b7897"],
  ["--side-icon", "#828a9a"],
  ["--side-text", "#2c3751"],
  ["--brand-gradient", "linear-gradient(135deg,#0c2176 0%,#005bff 100%)"],
  ["--brand-gradient-reverse", "linear-gradient(135deg,#015bfe 0%,#0c2176 100%)"],
  ["--blue-black", "#0f1b3d"],
  ["--gold", "#b48755"],
  ["--gold-gradient", "linear-gradient(135deg,#f7e4cf 0%,#b48755 100%)"]
];

for (const [token, value] of requiredTokens) {
  const normalizedValue = value.replace(/,\s*/g, ",").replace(/\s+/g, "");
  const normalizedTokens = tokens.replace(/,\s*/g, ",").replace(/\s+/g, "");
  assert.ok(normalizedTokens.includes(`${token}:${normalizedValue};`), `${token} must equal the Figma/DESIGN value ${value}`);
}

const textTokens = [
  "--font-text-14-r", "--font-text-14-m", "--font-text-16-r", "--font-text-16-m",
  "--font-text-18-b", "--font-text-20-b", "--font-text-24-b"
];
for (const token of textTokens) assert.ok(tokens.includes(`${token}:`), `Missing typography token ${token}`);

assert.ok(!styles.includes(":root"), "styles.css must not duplicate the design token root block");
assert.ok(html.includes('design-tokens.css?v='), "index.html must load design-tokens.css before page styles");
assert.ok(html.indexOf("design-tokens.css") < html.indexOf("styles.css"), "Design tokens must load before styles.css");
assert.ok(styles.includes("font: var(--font-text-14-r);"), "Body uses Figma 14px R / 20");
assert.ok(styles.includes("font: var(--font-text-24-b);"), "Core metrics use Figma 24px B / 32");
assert.ok(styles.includes("font: var(--font-text-14-m);"), "Panel titles use Figma 14px M / 20");
assert.ok(styles.includes("color: var(--nav-text);"), "Topbar auxiliary text uses Figma nav text color");
assert.ok(credit.includes("var(--brand)"), "Credit level uses brand block (D-CREDIT-08, gold flourish removed)");
assert.ok(!tokens.match(/letter-spacing:\s*-/), "User-side tokens must not introduce negative letter spacing");
for (const file of userStyleFiles) {
  const css = read(file);
  assert.ok(!/font-weight:\s*(?:550|650|750|800|900)/.test(css), `${file} must use standard 400/500/600/700 weights`);
}
for (const file of ["support-page.css", "statements-page.css", "funds-availability.css", "export-center.css", "finance.css"]) {
  const css = read(file);
  assert.ok(css.includes("var(--table-header-bg)") && css.includes("var(--table-row-border)"), `${file} must use shared table tokens`);
}
for (const file of ["earnings.css", "finance.css", "reports.css", "subchannels.css", "withdrawals.css"]) {
  assert.ok(read(file).includes("font: var(--font-text-18-b);"), `${file} drawer headings must use Figma 18px B / 26`);
}

console.log(JSON.stringify({
  colorTokens: requiredTokens.length,
  typographyTokens: textTokens.length,
  result: "User-side Figma design token checks passed"
}, null, 2));
