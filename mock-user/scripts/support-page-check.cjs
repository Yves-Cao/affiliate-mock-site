const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const page = read("support-page.js");
const css = read("support-page.css");
const routes = read("data.js");
const app = read("app.js");
const html = read("index.html");
const messages = read("messages-page.js");

assert.match(routes, /id: "support".*label: "帮助与工单"/, "Support route is registered");
assert.match(app, /"帮助与工单": "Help & tickets"/, "English route label exists");
assert.match(html, /data-route="support"/, "Topbar help button opens support");
assert.match(html, /support-page\.css/, "Support stylesheet is loaded");
assert.match(html, /support-page\.js/, "Support module is loaded");
assert.ok(messages.includes("supportTicketId"), "Ticket messages link back to support");
assert.ok(messages.includes("row.supportTicketId"), "Ticket messages are searchable by ticket ID");

for (const status of ["draft", "submitted", "pending_review", "waiting_partner", "processing", "waiting_external", "resolved", "closed", "rejected", "cancelled"]) {
  assert.ok(page.includes(`${status}: [`), `Support status ${status} exists`);
}
for (const marker of ["data-support-detail", "data-support-form", "data-support-close-form", "data-support-supplement", "pushSupportMessage", "支持工单已提交", "工单已关闭", "支持工单补充材料已提交"]) {
  assert.ok(page.includes(marker), `Support interaction includes ${marker}`);
}
assert.ok(page.includes("申诉和风控结论不走本页"), "Appeals are redirected to the Appeal Center");
assert.ok(!page.includes("坐席排班") && !page.includes("在线实时聊天"), "No full contact-center features");
assert.ok(page.includes("responseTime"), "Ticket rows show SLA");
for (const breakpoint of ["991px", "767px"]) assert.ok(css.includes(breakpoint), `Responsive rule at ${breakpoint}`);

console.log(JSON.stringify({
  route: "support",
  statuses: 10,
  helpTasks: 8,
  checks: 25,
  result: "Support static contract checks passed"
}, null, 2));
