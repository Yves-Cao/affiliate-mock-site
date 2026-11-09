const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const page = read("account-page.js");
const app = read("app.js");
const routes = read("data.js");
const html = read("index.html");
const css = read("account-page.css");

const requiredPageMarkers = [
  '["overview", "概览", "Overview"]',
  '["profile", "资料", "Profile"]',
  '["finance", "财务资料", "Financial details"]',
  '["security", "通知与安全", "Notifications & security"]',
  'data-account-action="status"',
  'data-account-action="payout"',
  'data-account-finance-form="payout"',
  'data-account-finance-form="tax"',
  'data-account-finance-draft="explanation"',
  'data-account-finance-submit=',
  'data-account-pref=',
  '接收邮件通知',
  'AFF.pages.account = renderPage'
];

for (const marker of requiredPageMarkers) {
  assert.ok(page.includes(marker), `Account page implements ${marker}`);
}

assert.match(routes, /id: "account".*label: "个人中心"/, "Personal center route is registered");
assert.match(app, /"个人中心": "Personal center"/, "Personal center route has an English label");
assert.match(app, /account: '<circle cx="12" cy="8" r="3\.5"\/>/, "Account route has a matching icon");
assert.match(html, /account-page\.css/, "Account stylesheet is loaded");
assert.match(html, /account-page\.js/, "Account module is loaded");
assert.match(html, /data-route="account"/, "Avatar menu opens the account center");
assert.match(app, /route => !route\.hidden && !\["apply", "onboarding"\]\.includes\(route\.id\)/, "Sidebar respects route visibility");
assert.doesNotMatch(html, /data-action="open-account"/, "Avatar menu no longer opens only the timezone modal");

assert.ok(page.includes("**** **** **** 4821"), "Payout account is masked");
assert.ok(page.includes("S******123A"), "Tax ID is masked");
assert.ok(page.includes("financeRequests"), "Finance and tax change requests are tracked");
assert.ok(page.includes("accountRequestId"), "Finance and tax changes notify Messages");
assert.ok(page.includes("资料已确认，受保护字段不可直接修改"), "Profile locks after confirmation");
assert.ok(page.includes("可用能力"), "Account status includes available capabilities");
assert.ok(page.includes("CRM SSO"), "Account security reflects the CRM source of truth");
assert.doesNotMatch(page, /资料与认证|发起KYC\/KYB|限制与恢复|待办列表|当前生效协议|协议留痕/, "Removed legacy account modules are absent");

for (const breakpoint of ["991px", "767px"]) {
  assert.ok(css.includes(breakpoint), `Account page has ${breakpoint} responsive rules`);
}
assert.ok(css.includes("grid-template-columns: 1fr"), "Mobile layout collapses to one column");

console.log(JSON.stringify({
  route: "account",
  tabs: 4,
  checks: requiredPageMarkers.length + 14,
  result: "Account center static contract checks passed"
}, null, 2));
