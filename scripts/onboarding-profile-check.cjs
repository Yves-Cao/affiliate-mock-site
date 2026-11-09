const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const baseUrl = process.env.ONBOARDING_BASE_URL || "http://127.0.0.1:4179";

async function typography(page, selector) {
  return page.locator(selector).first().evaluate(node => {
    const style = getComputedStyle(node);
    return { fontSize: style.fontSize, lineHeight: style.lineHeight, fontWeight: style.fontWeight };
  });
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(`${baseUrl}/#/onboarding`, { waitUntil: "domcontentloaded" });
    await page.fill("#login-form input[name=email]", "onboarding-profile@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForSelector("#app-view:not(.hidden)");
    await page.evaluate(() => navigate("onboarding"));
    await page.waitForSelector("[data-action='verify-onboarding-email']");

    assert.deepEqual(await typography(page, ".onboarding-card .onboarding-head h2"), {
      fontSize: "20px", lineHeight: "28px", fontWeight: "700"
    }, "Onboarding main title typography");
    assert.deepEqual(await typography(page, ".onboarding-step > .commission-page-head h2"), {
      fontSize: "18px", lineHeight: "26px", fontWeight: "700"
    }, "Onboarding step title typography");
    assert.deepEqual(await typography(page, ".onboarding-card .info-item > span"), {
      fontSize: "14px", lineHeight: "20px", fontWeight: "500"
    }, "Onboarding info label typography");
    assert.deepEqual(await typography(page, ".onboarding-card .step.disabled .step-label"), {
      fontSize: "14px", lineHeight: "20px", fontWeight: "400"
    }, "Onboarding step label typography");
    assert.deepEqual(await typography(page, ".onboarding-card .button.small"), {
      fontSize: "13px", lineHeight: "20px", fontWeight: "500"
    }, "Onboarding small button typography");

    await page.click("[data-action='verify-onboarding-email']");
    await page.click("[data-action='onboarding-next']");
    assert.ok((await page.locator("#main").innerText()).includes("基本资料与渠道"));
    assert.equal(await page.locator("[data-onboarding-country-selection]").count(), 0, "Optional profile fields stay hidden");
    assert.equal(await page.locator("[data-action='toggle-onboarding-details']").innerText(), "详细信息");
    assert.deepEqual(await typography(page, ".onboarding-name .field-label"), {
      fontSize: "14px", lineHeight: "20px", fontWeight: "500"
    }, "Onboarding form label typography");
    assert.deepEqual(await typography(page, ".onboarding-name input"), {
      fontSize: "14px", lineHeight: "20px", fontWeight: "400"
    }, "Onboarding form control typography");
    await page.fill("[data-onboarding-name]", "CX Partner");
    await page.click("[data-action='onboarding-next']");
    assert.ok((await page.locator(".onboarding-step h2").first().innerText()).includes("KYC 提交"), "Name and country are sufficient");

    await page.click("[data-action='onboarding-go'][data-onboarding-step='2']");
    await page.click("[data-action='toggle-onboarding-details']");
    assert.equal(await page.locator("[data-onboarding-country-selection][multiple]").count(), 1, "Country multi-select expands");
    assert.equal(await page.locator("[data-onboarding-profile='expectedTraffic'], [data-onboarding-profile-method]").count(), 0, "Removed fields are absent");
    assert.deepEqual(await typography(page, ".onboarding-kyc-panel p"), {
      fontSize: "14px", lineHeight: "20px", fontWeight: "400"
    }, "Onboarding guide typography");
    const countries = page.locator(".profile-select").filter({ has: page.locator("[data-onboarding-country-selection]") });
    await countries.locator("summary").click();
    await countries.locator("[data-profile-selection-search]").fill("Vietnam");
    await countries.locator("[data-profile-selection-choice][value='越南']").check();
    await countries.locator("[data-profile-selection-search]").fill("Thailand");
    await countries.locator("[data-profile-selection-choice][value='泰国']").check();
    await countries.locator("summary").click();
    assert.deepEqual(await page.evaluate(() => AFF.state.onboarding.trafficProfile.primaryCountries.split("、").sort()), ["泰国", "越南"].sort());
    await page.fill("[data-onboarding-profile='websites']", "example.com");
    await page.evaluate(() => { AFF.state.onboarding.trafficProfile.expectedTraffic = "invalid-legacy-value"; });
    await page.click("[data-action='onboarding-next']");
    assert.ok((await page.locator(".onboarding-step h2").first().innerText()).includes("基本资料"), "Invalid optional URL still validates when supplied");

    await page.fill("[data-onboarding-profile='websites']", "https://example.com,https://app.example.com");
    await page.click("[data-action='onboarding-next']");
    const kycText = await page.locator("#main").innerText();
    assert.ok(kycText.includes("KYC 提交") && kycText.includes("认证页面") && kycText.includes("去完成"));
    assert.ok(!kycText.includes("模拟提交 KYC") && !kycText.includes("CRM"));
    assert.ok(await page.locator("[data-action='onboarding-next']").isDisabled());

    await page.click("[data-action='open-onboarding-kyc']");
    assert.ok((await page.locator("#toast").innerText()).includes("已打开认证页面"));
    assert.ok(await page.locator("[data-action='onboarding-next']").isDisabled());
    await page.click("[data-action='complete-onboarding-kyc']");
    assert.ok((await page.locator("#main").innerText()).includes("接受协议与准则"));

    for (let index = 0; index < 3; index += 1) {
      await page.check(`[data-onboarding-agreement='${index}']`);
    }
    await page.click("[data-action='onboarding-next']");
    const review = await page.locator("#main").innerText();
    assert.ok(review.includes("审核范围：合作者身份资料、推广渠道、KYC资料与协议接受记录"));
    assert.ok(!review.includes("首个链接启用门禁") && !review.includes("实时硬风控") && !review.includes("端到端staging"));
    assert.ok(await page.locator("[data-action='submit-onboarding']").isEnabled());

    await page.click("[data-action='submit-onboarding']");
    const enabled = await page.locator("#main").innerText();
    assert.ok(enabled.includes("审核中") && enabled.includes("已提交"));
    assert.equal(await page.locator(".onboarding-submitted, [data-action='simulate-onboarding-review']").count(), 0);
    assert.ok(!enabled.includes("等待资质审核结果") && !enabled.includes("首次提现前仍需完成"));
    assert.ok(await page.locator("[data-action='submit-onboarding']").isDisabled());
    assert.notEqual(await page.evaluate(() => AFF.state.onboarding.trafficProfile.status), "approved", "Submitting does not approve the application");
    assert.ok(!enabled.includes("首个链接启用门禁") && !enabled.includes("不可启用"));
    assert.ok(!enabled.includes("内部阈值") && !enabled.includes("评分："));

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#app-view:not(.hidden)");
    const persisted = await page.locator("#main").innerText();
    assert.ok(persisted.includes("审核中") && persisted.includes("已提交"));
    assert.equal(await page.locator(".onboarding-submitted, [data-action='simulate-onboarding-review']").count(), 0);

    for (const width of [1440, 992, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      assert.equal(await page.evaluate(() =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      ), true, `${width}: onboarding has no document overflow`);
      await page.screenshot({ path: `/tmp/affiliate-onboarding-submit-${width}.png`, fullPage: true, animations: "disabled" });
    }
    assert.equal(errors.length, 0, `No page errors: ${errors.join("; ")}`);
    console.log("PASS: traffic profile fields, URL and traffic validation, KYC submission, review status, persistence and responsive layout.");
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
