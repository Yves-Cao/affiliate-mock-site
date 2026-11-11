/* Smoke check: universal dropdown enhancement + alignment + change flow.
   Run: node scripts/tmp-dd-smoke.cjs (server must be up on 4179) */
const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:4179";
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; } else { fail++; console.error("FAIL:", msg); } };

(async () => {
  const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", e => { fail++; console.error("PAGEERROR:", e.message); });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.fill("#login-form input[name=email]", "dd-smoke@example.com");
  await page.fill("#login-form input[name=password]", "demo-password");
  await page.click("#login-form button[type=submit]");
  await page.waitForTimeout(500);

  // Routes with selects known from audit
  const routes = ["dashboard", "reports", "clients", "earnings", "messages", "postbacks", "subchannels", "account", "support", "guarantee", "appeals"];
  for (const route of routes) {
    let ok = true;
    try { await page.evaluate(r => navigate(r), route); } catch { ok = false; }
    if (!ok) continue;
    await page.waitForTimeout(350);
    const stats = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll("select"));
      const enhanced = selects.filter(s => s.closest(".aff-dd"));
      const bare = selects.filter(s => !s.closest(".aff-dd") && !s.multiple && s.dataset.affDd !== "off");
      return { total: selects.length, enhanced: enhanced.length, bare: bare.length, bareIds: bare.slice(0, 3).map(s => s.getAttribute("aria-label") || s.id || s.name || "?") };
    });
    check(stats.bare === 0, `${route}: ${stats.bare} unenhanced selects (${stats.bareIds.join(",")})`);
    if (stats.enhanced > 0) console.log(`${route}: ${stats.enhanced}/${stats.total} selects enhanced`);
  }

  // Alignment check on clients quick filter (stage select)
  await page.evaluate(() => navigate("clients"));
  await page.waitForTimeout(400);
  const stage = page.locator("select[data-rp-quick='stage']").first();
  check(await stage.count() > 0, "stage select exists");
  const trigger = page.locator("select[data-rp-quick='stage'] ~ .aff-dd-trigger, .client-quick-field .aff-dd-trigger").first();
  check(await trigger.count() > 0, "stage trigger rendered");
  await trigger.click();
  await page.waitForTimeout(150);
  const align = await page.evaluate(() => {
    const list = document.querySelector(".aff-dd-list:not([hidden])");
    if (!list) return null;
    const trig = list.closest(".aff-dd").querySelector(".aff-dd-trigger");
    const lr = list.getBoundingClientRect();
    const tr = trig.getBoundingClientRect();
    return { dLeft: +(lr.left - tr.left).toFixed(1), dRight: +(lr.right - tr.right).toFixed(1), dTop: +(lr.top - tr.bottom).toFixed(1), width: +lr.width.toFixed(0), triggerW: +tr.width.toFixed(0) };
  });
  check(align !== null, "quick-filter dropdown opens");
  if (align) {
    check(align.dLeft === 0 && align.dTop === 4, `quick-filter list aligns to trigger (dLeft=${align.dLeft}, dTop=${align.dTop})`);
    console.log("alignment:", JSON.stringify(align));
  }
  // Pick "KYC" and verify filter applies
  const kyc = page.locator(".aff-dd-list:not([hidden]) .aff-dd-option", { hasText: "KYC" }).first();
  if (await kyc.count()) {
    await kyc.click();
    await page.waitForTimeout(300);
    const val = await page.evaluate(() => document.querySelector("select[data-rp-quick='stage']").value);
    const rows = await page.locator(".report-client-table tbody tr").count();
    check(val === "KYC", `pick writes select.value (got "${val}")`);
    console.log(`after KYC filter: ${rows} rows`);
  }
  // Escape closes, and keyboard nav
  await trigger.click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  check(await page.locator(".aff-dd-list:not([hidden])").count() === 0, "Escape closes dropdown");

  // v1.1: list follows the trigger while the page scrolls (bug: fixed list stayed put)
  await trigger.click();
  await page.waitForTimeout(150);
  await page.evaluate(() => window.scrollBy(0, 120));
  await page.waitForTimeout(200);
  const followAlign = await page.evaluate(() => {
    const list = document.querySelector(".aff-dd-list:not([hidden])");
    if (!list) return null;
    const trig = list.closest(".aff-dd").querySelector(".aff-dd-trigger");
    const lr = list.getBoundingClientRect(); const tr = trig.getBoundingClientRect();
    return { dLeft: Math.abs(lr.left - tr.left), dTop: Math.abs(lr.top - tr.bottom - 4) };
  });
  check(followAlign !== null && followAlign.dLeft < 1 && followAlign.dTop < 1, "list follows trigger while scrolling");
  // scrolling the trigger fully out of view closes the list
  await page.evaluate(() => window.scrollBy(0, 5000));
  await page.waitForTimeout(200);
  check(await page.locator(".aff-dd-list:not([hidden])").count() === 0, "list closes when trigger scrolls out of view");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);

  // v1.1.0 style standard lock (00I): resting border/gradient/lift + open halo, no UA flash paths
  await page.evaluate(() => navigate("clients"));
  await page.waitForTimeout(400);
  await page.mouse.move(10, 10);   // move cursor off the trigger so :hover doesn't skew the reading
  await page.waitForTimeout(280);  // border-color transition is 150ms — let it settle fully
  const restStyle = await page.evaluate(() => {
    const el = document.querySelector("select[data-rp-quick='stage']").closest(".aff-dd").querySelector(".aff-dd-trigger");
    const cs = getComputedStyle(el);
    return { border: cs.borderColor, bg: cs.backgroundImage, shadow: cs.boxShadow, transition: cs.transitionProperty };
  });
  check(restStyle.border === "rgb(214, 222, 232)" && restStyle.shadow.includes("rgba(15, 34, 58, 0.04)")
    && !restStyle.transition.includes("box-shadow"), "v1.1.0 resting style standard holds (border/lift, no shadow transition)");
  await trigger.click();
  await page.waitForTimeout(250);
  const openStyle = await page.evaluate(() => {
    const el = document.querySelector("select[data-rp-quick='stage']").closest(".aff-dd").querySelector(".aff-dd-trigger");
    const cs = getComputedStyle(el);
    return { border: cs.borderColor, outline: cs.outlineStyle, shadow: cs.boxShadow };
  });
  check(openStyle.border === "rgba(0, 0, 0, 0)" && openStyle.outline === "none"
    && openStyle.shadow.includes("rgba(0, 91, 255, 0.22)"), "v1.1.0 open halo standard holds (transparent border, single halo)");

  console.log(`\nRESULT: ${pass} pass, ${fail} fail`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("SMOKE CRASH:", e.message); process.exit(1); });
