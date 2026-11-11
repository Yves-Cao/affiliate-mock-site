const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.EARNINGS_BASE_URL || "http://127.0.0.1:4179";
const artifacts = path.join(process.cwd(), ".artifacts");
fs.mkdirSync(artifacts, { recursive: true });
const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const typeOf = row => row.status === "reversed" ? "reversal" : row.status === "settled" ? "settlement" : "accrual";

async function main() {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.fill("#login-form input[name=email]", "earnings-review@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForSelector("#app-view:not(.hidden)");
    await page.evaluate(() => navigate("pay"));
    await page.waitForSelector(".earn-page");
    assert.equal(await page.title(), "收益数据 · Affiliate CPA");
    const source = await page.evaluate(() => AFF.earnings.records());
    const range = await page.evaluate(() => ({ from: AFF.reporting.from, to: AFF.reporting.now }));
    const finance = await page.evaluate(() => AFF.finance.summary());
    assert.ok(source.length >= 200);
    assert.equal(new Set(source.map(row => row.id)).size, source.length);
    const total = async () => Number(await page.locator("[data-aff-total]").textContent());
    const financialSnapshot = () => page.evaluate(() => JSON.stringify({
      rows: AFF.reporting.rows,
      metrics: AFF.dashboard.metrics,
      totalRevenue: AFF.dashboard.totalRevenue
    }));
    const baseline = await financialSnapshot();
    const sorted = rows => [...rows].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
    const expectedRows = filter => sorted(source.filter(row =>
      (!filter.from || row.date >= filter.from) &&
      (!filter.to || row.date <= filter.to) &&
      (!filter.status || row.status === filter.status) &&
      (!filter.withdrawalStatus || row.withdrawal?.key === filter.withdrawalStatus) &&
      (!filter.caseType || row.caseType === filter.caseType) &&
      (!filter.type || typeOf(row) === filter.type) &&
      (!filter.settlementId || row.settlement?.id?.toLowerCase().includes(filter.settlementId.toLowerCase()))
    ));
    async function openFilters() {
      if (!(await page.locator(".earn-filter-drawer").count())) {
        await page.locator("[data-earn-action='filters']").click();
        await page.locator(".earn-filter-drawer").waitFor();
      }
    }
    async function setDates(filter = {}) {
      await openFilters();
      const dates = { from: filter.from || range.from, to: filter.to || range.to };
      await page.evaluate(dates => {
        const root = document.querySelector("[data-range-id='earnings-filter-range']");
        root.dataset.rangeFrom = dates.from;
        root.dataset.rangeTo = dates.to;
        root.dispatchEvent(new CustomEvent("date-range-change", {
          bubbles: true,
          detail: { id: "earnings-filter-range", ...dates }
        }));
      }, dates);
    }
    async function apply(filter = {}) {
      await setDates(filter);
      for (const key of ["status", "withdrawalStatus", "type", "caseType"]) await page.selectOption(`[data-earn-filter="${key}"]`, filter[key] || "");
      if ("settlementId" in filter) await page.fill("[data-earn-filter='settlementId']", filter.settlementId || "");
      await page.locator("[data-earn-action='filter-apply']").click();
    }
    async function assertRows(filter = {}) {
      const expected = expectedRows({ ...range, ...filter });
      assert.equal(await total(), expected.length);
      const shown = await page.locator(".earn-table tbody tr [data-earn-detail]").evaluateAll(nodes => nodes.map(node => node.dataset.earnDetail));
      const size = Number(await page.locator("[data-aff-page-size]").inputValue());
      assert.deepEqual(shown, expected.slice(0, size).map(row => row.id));
      const expectedStats = {
        totalRevenue: finance.totalRevenue,
        paid: finance.paid + finance.paidGuarantee,
        held: finance.held,
        guarantee: finance.guarantee
      };
      for (const [key, value] of Object.entries(expectedStats)) {
        assert.equal(await page.locator(`[data-earn-stat="${key}"]`).textContent(), money(value));
      }
    }
    const defaultRows = expectedRows(range);
    assert.equal(await total(), defaultRows.length);
    assert.equal(await page.locator(".earn-stat").count(), 4);
    assert.equal(await page.locator(".earn-table th").count(), 11);
    assert.ok(await page.locator(".earn-table").innerText().then(text => text.includes("佣金状态") && text.includes("提现状态")));
    await assertRows();
    await page.selectOption("[data-aff-page-size]", "50");
    const allIds = [];
    for (let index = 1; index <= Math.ceil(defaultRows.length / 50); index += 1) {
      allIds.push(...await page.locator("[data-earn-detail]").evaluateAll(nodes => nodes.map(node => node.dataset.earnDetail)));
      if (index < Math.ceil(defaultRows.length / 50)) await page.getByRole("button", { name: "下一页", exact: true }).click();
    }
    assert.deepEqual(allIds, defaultRows.map(row => row.id));
    await page.locator('[data-earn-action="quick-reset"]').click();
    await page.selectOption("[data-aff-page-size]", "10");

    await page.selectOption('[data-earn-quick="status"]', "held");
    assert.equal(await total(), expectedRows({ ...range, status: "held" }).length);
    await page.locator('[data-earn-action="quick-reset"]').click();
    const withdrawalStatus = source.find(row => row.withdrawal?.key === "paid")?.withdrawal?.key || "available";
    await page.selectOption('[data-earn-quick="withdrawalStatus"]', withdrawalStatus);
    assert.equal(await total(), expectedRows({ ...range, withdrawalStatus }).length);
    await page.locator('[data-earn-action="quick-reset"]').click();
    await apply({ status: "held" });
    await assertRows({ status: "held" });
    for (const status of ["pending", "held", "settled", "rejected", "reversed"]) {
      await apply({ status });
      await assertRows({ status });
      const expected = expectedRows({ ...range, status })[0];
      const rowLocator = page.locator(".earn-table tbody tr").first();
      assert.ok((await rowLocator.innerText()).includes(expected.client.email));
      assert.ok(/^[^@]+\*+@/.test(expected.client.email));
      assert.equal(await rowLocator.locator(".earn-amount").textContent(), money(status === "reversed" ? -Math.abs(expected.amount) : Math.abs(expected.amount)));
      await page.locator(`[data-earn-detail="${expected.id}"]`).click();
      const drawer = page.locator(".earn-drawer");
      await drawer.waitFor();
      assert.ok((await drawer.innerText()).includes(expected.client.clientId));
      assert.ok((await drawer.innerText()).includes(expected.client.email));
      assert.ok((await drawer.innerText()).includes("佣金流向"));
      if (["rejected", "reversed"].includes(status)) {
        assert.ok((await drawer.innerText()).includes(expected.client.commissionReason));
        assert.ok((await drawer.innerText()).includes(expected.client.commissionReasonCode));
        assert.ok(await drawer.locator(`[data-earn-appeal="${expected.id}"]`).isEnabled());
      } else {
        assert.equal(await drawer.locator("[data-earn-appeal]").count(), 0);
      }
      if (status === "held") {
        const details = await drawer.locator(".earn-detail-grid").allInnerTexts();
        assert.ok(details.some(value => value.includes("暂扣开始日期") && value.includes("预计释放日期") && value.includes("本次暂扣天数")));
        const hold = await page.evaluate(id => AFF.earnings.records().find(item => item.id === id).hold, expected.id);
        const holdLength = (Date.parse(hold.expectedReleaseAt) - Date.parse(hold.startedAt)) / 86400000;
        assert.equal(holdLength, hold.totalDays);
        assert.ok(hold.totalDays >= 1 && hold.totalDays <= 30);
        assert.ok(hold.expectedReleaseAt > range.to);
        const trigger = drawer.locator('[data-earn-action="detail-help"]');
        await trigger.scrollIntoViewIfNeeded();
        await trigger.hover();
        await page.locator("#earn-detail-help").waitFor({ state: "visible" });
        assert.ok((await page.locator("#earn-detail-help").innerText()).includes("预计日期不代表届时一定可提现"));
        const popup = await page.locator("#earn-detail-help").boundingBox();
        assert.ok(popup.x >= 0 && popup.x + popup.width <= 1441 && popup.y >= 0 && popup.y + popup.height <= 1001);
        await page.locator("#earn-detail-help").hover();
        assert.ok(await page.locator("#earn-detail-help").isVisible());
        await page.mouse.move(700, 20);
        await page.locator("#earn-detail-help").waitFor({ state: "hidden" });
        await trigger.focus();
        await page.keyboard.press("Tab");
        await page.keyboard.press("Shift+Tab");
        await page.locator("#earn-detail-help").waitFor({ state: "visible" });
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("#earn-detail-help").isVisible(), false);
        assert.equal(await page.locator(".earn-drawer").count(), 1);
      }
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".earn-drawer").count(), 0);
      assert.equal(await page.locator(`[data-earn-detail="${expected.id}"]`).evaluate(node => node === document.activeElement), true);
    }
    for (const type of ["accrual", "settlement", "reversal"]) {
      await apply({ type });
      await assertRows({ type });
    }
    const settledWithStatement = source.find(row => row.settlement?.id);
    assert.ok(settledWithStatement?.settlement?.id);
    await apply({ settlementId: settledWithStatement.settlement.id });
    await assertRows({ settlementId: settledWithStatement.settlement.id });
    assert.equal(await page.locator(".earn-table tbody tr").count(), 1);
    assert.ok((await page.locator(".earn-table tbody tr").first().innerText()).includes("结算单号"));
    await apply({ status: "held", type: "settlement" });
    assert.equal(await total(), 0);
    assert.ok(await page.getByText("暂无佣金记录", { exact: true }).isVisible());
    await apply({ status: "frozen" });
    assert.equal(await total(), 0);
    await page.locator('[data-earn-action="quick-reset"]').click();
    await assertRows();
    await setDates({ from: "2026-10-20", to: "2026-10-01" });
    await page.locator("[data-earn-action='filter-apply']").click();
    assert.ok((await page.locator("#earn-filter-error").innerText()).includes("开始日期不得晚于结束日期"));
    assert.equal(await total(), defaultRows.length);
    await setDates({ from: "2026-10-20", to: "2026-10-28" });
    await page.locator("[data-earn-action='filter-apply']").click();
    assert.ok((await page.locator("#earn-filter-error").innerText()).includes("结束日期不得晚于数据截止日"));
    assert.equal(await total(), defaultRows.length);
    await apply({ from: "2026-10-01", to: "2026-10-15" });
    await assertRows({ from: "2026-10-01", to: "2026-10-15" });
    await apply({ from: "2025-01-01", to: "2025-01-02" });
    assert.equal(await total(), 0);
    await page.locator('[data-earn-action="quick-reset"]').click();
    assert.equal(await total(), defaultRows.length);
    assert.equal(await page.evaluate(() => AFF.state.earnings.filters.from), range.from);

    const rejected = expectedRows({ ...range, status: "rejected" })[0];
    await apply({ status: "rejected" });
    await page.locator(`[data-earn-appeal="${rejected.id}"]`).click();
    await page.fill("#earn-appeal-reason", "   ");
    await page.locator('[data-earn-action="submit-appeal"]').click();
    assert.ok((await page.locator("#earn-appeal-error").innerText()).includes("请填写申诉说明"));
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(id => Boolean(AFF.state.clientCommissionAppeals?.[id]), rejected.id), false);
    await page.locator(`[data-earn-appeal="${rejected.id}"]`).click();
    await page.fill("#earn-appeal-reason", "请复核此笔佣金的客户资格与入金记录。");
    await page.locator('[data-earn-action="submit-appeal"]').click();
    assert.ok(await page.locator(`.earn-drawer [data-earn-appeal="${rejected.id}"]`).isDisabled());
    assert.equal(await page.evaluate(id => AFF.state.clientCommissionAppeals[id].clientId, rejected.id), rejected.client.clientId);
    assert.equal(await financialSnapshot(), baseline);
    await page.reload();
    await page.waitForSelector(".earn-page");
    assert.ok(await page.locator(`[data-earn-appeal="${rejected.id}"]`).isDisabled());
    await page.evaluate(({ id, range }) => {
      AFF.reports.openClients({ ...range, search: id }, "registrations");
    }, { id: rejected.client.clientId, range });
    await page.waitForSelector(".report-page");
    assert.ok(await page.locator(`[data-rp-appeal="${rejected.client.clientId}"]`).isDisabled());

    const reversed = expectedRows({ ...range, status: "reversed" })[0];
    await page.evaluate(({ id, range }) => AFF.reports.openClients({ ...range, search: id }, "registrations"), { id: reversed.client.clientId, range });
    await page.locator(`[data-rp-appeal="${reversed.client.clientId}"]`).click();
    await page.fill("#rp-appeal-reason", "请重新核对该笔冲正对应的原始入金。");
    await page.locator('[data-rp-action="submit-client-appeal"]').click();
    await page.evaluate(() => navigate("pay"));
    await apply({ status: "reversed" });
    assert.ok(await page.locator(`[data-earn-appeal="${reversed.id}"]`).isDisabled());
    assert.equal(await financialSnapshot(), baseline);

    const screenshots = [];
    for (const language of ["zh", "en"]) {
      for (const width of [1440, 1111, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(language => { AFF.state.language = language; render(); }, language);
        await page.locator('[data-earn-action="quick-reset"]').click();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        const columns = await page.locator(".earn-stat").evaluateAll(nodes =>
          new Set(nodes.map(node => Math.round(node.getBoundingClientRect().left))).size
        );
        assert.equal(columns, width >= 1200 ? 4 : width >= 480 ? 2 : 1);
        const listFile = path.join(artifacts, `earnings-${language}-${width}.png`);
        await page.screenshot({ path: listFile, fullPage: true });
        screenshots.push(listFile);
        await apply({ status: "held" });
        const held = expectedRows({ ...range, status: "held" })[0];
        await page.locator(`[data-earn-detail="${held.id}"]`).click();
        await page.locator('.earn-drawer [data-earn-action="detail-help"]').click();
        const bounds = await page.locator(".earn-drawer").boundingBox();
        assert.ok(bounds.x >= -1 && bounds.x + bounds.width <= width + 1);
        assert.ok(await page.locator(".earn-drawer").evaluate(node => node.scrollWidth <= node.clientWidth + 1));
        const footer = await page.locator(".earn-drawer > footer").boundingBox();
        assert.ok(footer.y >= 0 && footer.y + footer.height <= 1001);
        for (const button of await page.locator(".earn-drawer > footer button").all()) {
          const box = await button.boundingBox();
          assert.ok(box.x >= -1 && box.x + box.width <= width + 1 && box.y + box.height <= 1001);
        }
        const detailFile = path.join(artifacts, `earnings-hold-${language}-${width}.png`);
        await page.screenshot({ path: detailFile });
        screenshots.push(detailFile);
        await page.keyboard.press("Escape");
        await page.keyboard.press("Escape");
        await apply({ status: "rejected" });
        const other = expectedRows({ ...range, status: "rejected" }).find(row => row.id !== rejected.id);
        await page.locator(`[data-earn-appeal="${other.id}"]`).click();
        const textarea = await page.locator("#earn-appeal-reason").boundingBox();
        const appealFooter = await page.locator(".earn-drawer > footer").boundingBox();
        assert.ok(textarea.x >= 0 && textarea.x + textarea.width <= width + 1);
        assert.ok(textarea.y >= 0 && textarea.y + textarea.height <= appealFooter.y + 1);
        const appealFile = path.join(artifacts, `earnings-appeal-${language}-${width}.png`);
        await page.screenshot({ path: appealFile });
        screenshots.push(appealFile);
        await page.keyboard.press("Escape");
        if (width > 390) {
          await page.locator(`[data-earn-detail="${other.id}"]`).click();
          await page.locator(".aff-drawer-overlay").click({ position: { x: 10, y: 100 } });
          assert.equal(await page.locator(".earn-drawer").count(), 0);
        }
      }
    }
    assert.equal(await financialSnapshot(), baseline);
    assert.deepEqual(errors, []);
    const touch = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await touch.goto(baseUrl);
    await touch.fill("#login-form input[name=email]", "touch-review@example.com");
    await touch.fill("#login-form input[name=password]", "demo-password");
    await touch.click("#login-form button[type=submit]");
    await touch.waitForSelector("#app-view:not(.hidden)");
    await touch.evaluate(() => {
      navigate("pay");
      AFF.earnings.state().filters.status = "held";
      render();
    });
    await touch.locator("[data-earn-detail]").first().tap();
    const touchHelp = touch.locator('[data-earn-action="detail-help"]');
    await touchHelp.tap();
    assert.ok(await touch.locator("#earn-detail-help").isVisible());
    const touchPopup = await touch.locator("#earn-detail-help").boundingBox();
    assert.ok(touchPopup.x >= 0 && touchPopup.x + touchPopup.width <= 391 && touchPopup.y >= 0 && touchPopup.y + touchPopup.height <= 845);
    await touchHelp.tap();
    await touch.waitForTimeout(250);   // toggle close runs through the 120ms pointerout timer
    assert.equal(await touch.locator("#earn-detail-help").isVisible(), false);
    await touchHelp.tap();
    await touch.waitForTimeout(250);   // pointerout close delay is 120ms — let it settle
    await touch.locator(".earn-drawer > header h2").tap();
    assert.equal(await touch.locator("#earn-detail-help").isVisible(), false);
    await touch.close();
  console.log(JSON.stringify({ commissions: source.length, statuses: 6, languages: 2, viewports: [1440, 1111, 390], screenshots, checks: "same-source totals, pagination, staged filters, date errors, empty states, status details, hold durations, shared appeals, reload persistence, unchanged financials, responsive layout, hover popup, keyboard and touch, Escape and overlay" }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
