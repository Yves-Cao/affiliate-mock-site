const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const tokens = read("design-tokens.css");
const styles = read("styles.css");
const authStyles = read("auth-page.css");
const html = read("index.html");
const app = read("app.js");
const pages = read("pages.js");
const reports = read("reports.js");
const reportData = read("report-data.js");
const reportStyles = read("reports.css");
const credit = read("credit-center.css");
const userStyleFiles = [
  "styles.css", "account-page.css", "clients-page.css", "credit-center.css", "date-range.css",
  "earnings.css", "export-center.css", "finance.css", "funds-availability.css", "reports.css",
  "statements-page.css", "subchannels.css", "support-page.css", "withdrawals.css", "partner-closure.css", "drawer-footer.css", "simulation-console.css", "auth-page.css"
  , "help-center.css"
];

const requiredTokens = [
  ["--shell-header-height", "62px"],
  ["--shell-sidebar-width", "240px"],
  ["--shell-sidebar-collapsed-width", "72px"],
  ["--main-max-width", "none"],
  ["--main-padding-x", "24px"],
  ["--topbar-border", "#eef2f6"],
  ["--topbar-icon-color", "#414651"],
  ["--topbar-icon-hover-bg", "#f9fafb"],
  ["--topbar-divider", "#eef2f6"],
  ["--brand-1-0", "#1a5bff"],
  ["--surface-muted-1-0", "#f3f4f6"],
  ["--surface-soft-1-0", "#f9fafb"],
  ["--border-subtle-1-0", "#e3e8ef"],
  ["--border-strong-1-0", "#cdd5df"],
  ["--text-strong-1-0", "#0a0d12"],
  ["--text-body-1-0", "#414651"],
  ["--text-muted-1-0", "#717680"],
  ["--text-disabled-1-0", "#a4a7ae"],
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
assert.ok(styles.includes("top: var(--shell-header-height);"), "Sidebar follows the 1.0 header height");
assert.ok(styles.includes("padding-top: var(--shell-header-height);"), "Workspace follows the 1.0 header height");
assert.ok(styles.includes("height: var(--shell-header-height);"), "Topbar uses the 1.0 header height");
assert.ok(styles.includes("width: var(--shell-sidebar-width);"), "Sidebar uses the 1.0 width");
assert.ok(styles.includes("margin-left: var(--shell-sidebar-width);"), "Workspace follows the 1.0 sidebar width");
assert.ok(app.includes('navGroups: ["仪表盘", "数据总览", "推广管理", "收益中心", "服务中心"]'), "User-side navigation groups default to the expanded portal pattern");
assert.ok(styles.includes("width: 216px;"), "Navigation items preserve the 1.0 216px hit target");
assert.ok(styles.includes("min-height: 40px;"), "Navigation items preserve the 1.0 40px height");
assert.ok(styles.includes("border-radius: 8px;"), "Navigation items use the 1.0 radius");
assert.ok(html.includes('id="mobile-nav-toggle"'), "Compact viewports keep a header navigation trigger instead of an icon rail");
assert.ok(styles.includes("transform: translateX(-100%);"), "Compact side navigation starts hidden like the 1.0 shell");
assert.ok(html.includes('id="theme-toggle"'), "Topbar includes the notifications-style theme switch");
assert.ok(html.includes('id="avatar-initial"') && html.includes('id="avatar-name"'), "Topbar avatar exposes the image and nickname");
assert.ok(html.includes("assets/reference/mygtc/topbar-avatar.png") && styles.includes("width: max-content;") && styles.includes("background: transparent;"), "Topbar user info uses the template avatar, adaptive nickname, and no hover fill");
assert.ok(html.includes('class="topbar-clock mt-time-display"'), "Topbar time uses the notifications-style two-row grid");
assert.ok(html.includes('class="wallet-tags"') && html.includes('class="wallet-identity"'), "Wallet keeps the notifications-style rich account layout");
assert.ok(html.includes("Affiliate CPA合作者") && html.includes('class="wallet-account-icon"'), "Wallet keeps one plain partner label and a line-style wallet icon");
assert.ok(!html.includes('id="wallet-system"') && !html.includes('id="wallet-channel"') && !html.includes("AFF1001") && !html.includes('class="wallet-type"'), "Wallet removes the system, channel, ID, and type pill tags");
assert.ok(styles.includes(".support-center:hover,") && styles.includes(".language-selector:hover,") && styles.includes(".message-icon:hover { background: transparent; }"), "Topbar circle actions do not add a hover background");
assert.ok(html.includes('class="header-icon-actions"'), "Topbar groups support, language, messages, and theme actions");
assert.ok(html.indexOf('id="message-count"') > html.indexOf('class="header-circle-icon"'), "Message badge anchors to the template circle icon");
assert.ok(app.includes('theme: "light"') && app.includes("function applyTheme("), "Theme state is explicit and persisted through Mock state");
assert.ok(app.includes('merged.theme = savedState.theme === "dark" ? "dark" : "light"'), "Saved theme values are validated");
assert.ok(styles.includes('body[data-theme="dark"]'), "Dark theme has a semantic token layer");
assert.ok(styles.includes(".theme-switch {"), "Theme switch uses the reference-style capsule");
assert.ok(styles.includes(".mt-time-display__rows {"), "Time rows use the reference grid");
assert.ok(styles.includes('font-family: "D-DIN-PRO", Arial, sans-serif;'), "Numeric time and balance use the template number font");
assert.ok(styles.includes("width: 100vw;"), "Topbar keeps the physical viewport width when a scrollbar is present");
assert.ok(styles.includes(".wallet-tags {"), "Wallet uses the reference account-selector rows");
assert.ok(styles.includes(".header-circle-icon {"), "Topbar actions use the reference circular icon geometry");
assert.ok(styles.includes("box-shadow: 0 2px 4px rgba(16, 24, 40, .10);"), "Circle icons use the template shadow blur");
assert.ok(styles.includes("border-bottom: 1px solid var(--topbar-border);"), "Topbar uses the 1.0 hairline border");
assert.ok(html.includes('class="topbar-divider"'), "Topbar separates account context from icon actions");
assert.ok(app.includes('document.body.classList.toggle("route-dash", route === "dash")'), "Dashboard owns its user-portal canvas state");
assert.ok(tokens.includes("--canvas: #ffffff;"), "White canvas trial removes the gray admin-like page background");
assert.ok(!pages.includes("dashboard-header") && pages.includes('class="dashboard-overview"'), "Dashboard starts with the merged overview surface and no redundant header");
assert.ok(reports.includes("perf: [\"clicks\", \"registrations\", \"ftd\", \"effective\", \"quality\", \"expected\"]"), "Performance chart exposes one core metric at a time");
assert.ok(reports.includes("summary: metricDefaults.summary.slice(0, 7)"), "Summary chart exposes the first seven table metric columns");
assert.ok(reportData.includes('label: "首次入金客户"') && reportData.includes('label: "有效转化客户"'), "Summary metric labels remove the stray space and use client wording");
assert.ok(reports.includes('const summaryMetrics = ["ftd", "effective", "quality", "held", "guarantee", "available"]'), "Summary cards show in-settlement commission instead of settled commission");
assert.ok(reports.includes('data-rp-view="table"') && reports.includes('data-rp-view="chart"'), "Performance data supports table/chart switching");
assert.ok(reports.includes('dataset.mode === "line" ? lineChart') && reports.includes(': barChart'), "Performance charts select line or bar from the grouping type");
assert.ok(reportStyles.includes(".report-view-switch {") && reportStyles.includes(".report-chart-metrics {"), "Performance chart controls use the 1.0 component language");
assert.ok(!reports.includes("Chart.js") && !reports.includes("echarts"), "Performance charts remain dependency-free Mock visuals");
assert.ok(styles.includes(".route-dash .dashboard-metrics,"), "Dashboard metrics use content-first grouping");
assert.ok(styles.includes(".route-dash .dashboard-credit-row,"), "Dashboard funnel and membership form one continuous surface");
assert.ok(styles.includes(".route-dash .dashboard-promotion-grid,"), "Dashboard promotion tools form one continuous surface");
assert.ok(styles.includes(".route-dash .dashboard-support-grid,"), "Dashboard guidance and trackers form one continuous surface");
assert.ok(styles.includes("box-shadow: none;"), "Dashboard pilot removes tiled card shadows");
assert.ok(html.includes('href="./auth-page.css?v=mygtc-user-20261116-8"'), "Authentication loads the dedicated /user clone stylesheet");
assert.ok(!html.includes("下载APP") && !html.includes("支持中心"), "Authentication header only keeps the language selector");
assert.ok(html.includes('data-auth-language-toggle') && html.includes('data-auth-language-options'), "Authentication language selector is interactive");
assert.ok(authStyles.includes("assets/reference/mygtc/login-bg.png") && html.includes("assets/affiliate-icon.svg"), "Login uses the cloned /user background and AffiliateCPA brand mark");
assert.ok(html.includes("assets/register-hero.png?v=source-20261116-1"), "Only the register hero uses the supplied authentication visual");
assert.ok(!html.includes("assets/login-bg.jpg") && !html.includes("assets/auth-visual.jpg"), "Legacy authentication visuals are not loaded");
assert.ok(html.includes("欢迎来到 AffiliateCPA") && html.includes("请登录您的账户"), "Login copy uses the AffiliateCPA brand");
assert.ok(html.includes("开设真实账户") && html.includes("创建新账号"), "Register copy follows the /user template");
for (const field of ["姓", "名", "居住国家", "手机号码", "电子邮箱", "邮箱验证码", "密码", "邀请码(选填)", "公司名称", "注册国家/地区"]) {
  assert.ok(html.includes(field), `Register template field missing: ${field}`);
}
assert.ok(html.includes("通行密钥") && html.includes("Google") && html.includes("Apple") && !html.includes("游客访问"), "Login alternative actions follow the approved Mock scope");
assert.ok(authStyles.includes("width: 606px;") && authStyles.includes("border-radius: 18px;"), "Login card uses the template geometry");
assert.ok(authStyles.includes("padding: 56px 32px 40px;"), "Login card padding follows the template");
assert.ok(authStyles.includes("min-height: 52px;") && authStyles.includes("border: 1px solid #cdd5df;"), "Authentication inputs use template geometry and border");
assert.ok(authStyles.includes("height: 60px;") && authStyles.includes("border-radius: 999px;"), "Register account tabs use the template capsule");
assert.ok(authStyles.includes("overflow-y: auto;"), "Register body remains internally scrollable");
assert.ok(app.includes("function setRegisterAccountType(") && app.includes("Mock 验证码：123456"), "Register interactions remain explicit Mock states");
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
