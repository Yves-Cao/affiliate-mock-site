const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const baseUrl = process.env.ACCOUNT_BASE_URL || "http://127.0.0.1:4179";

(async () => {
  const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(baseUrl);
    await page.fill("#login-form input[name=email]", "profile-controls@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.waitForSelector("#app-view:not(.hidden)");
    await page.evaluate(() => {
      AFF.state.kybCompleted = false;
      AFF.state.onboarding.trafficProfile.primaryCountries = "越南、泰国";
      AFF.state.onboarding.trafficProfile.promotionMethods = ["内容营销", "邮件"];
      navigate("account");
    });
    await page.click("[data-account-tab='profile']");
    const picker = key => page.locator(".profile-select").filter({ has: page.locator(`[data-account-profile='${key}']`) });
    const select = async (key, query, value) => {
      const root = picker(key);
      await root.locator("summary").click();
      await root.locator("[data-profile-selection-search]").fill(query);
      await root.locator(`[data-profile-selection-choice][value='${value}']`).check();
    };
    for (const key of ["country", "channel", "primaryCountries", "promotionMethods"]) {
      assert.equal(await page.locator(`select[data-account-profile='${key}']`).count(), 1);
    }
    assert.equal(await page.locator("[data-account-profile='expectedTraffic'], [data-account-profile='historicalPlatforms']").count(), 0);
    assert.ok(!(await page.locator(".account-page").innerText()).includes("预计月流量"));
    assert.equal(await picker("primaryCountries").locator("[data-profile-selection-choice]:checked").count(), 2, "legacy country selections are restored");
    assert.equal(await picker("promotionMethods").locator("[data-profile-selection-choice]:checked").count(), 2, "legacy methods remain selected");
    const before = await page.evaluate(() => AFF.state.account.country);
    await select("country", "Thailand", "泰国");
    assert.equal(await page.evaluate(() => AFF.state.account.country), before, "account edits are only saved on Save");
    await select("channel", "Paid", "付费广告");
    await picker("promotionMethods").locator("summary").click();
    await picker("promotionMethods").locator("[data-profile-selection-clear]").click();
    await picker("promotionMethods").locator("[data-profile-selection-search]").fill("Organic");
    await picker("promotionMethods").locator("[value='自然流量'][data-profile-selection-choice]").check();
    await picker("promotionMethods").locator("[data-profile-selection-search]").fill("Paid");
    await picker("promotionMethods").locator("[value='付费投放'][data-profile-selection-choice]").check();
    await page.keyboard.press("Escape");
    assert.equal(await picker("promotionMethods").locator("details").getAttribute("open"), null);
    assert.ok(await picker("promotionMethods").locator("summary").evaluate(node => node === document.activeElement));
    await page.click("[data-account-action='save-profile']");
    const saved = await page.evaluate(() => ({
      country: AFF.state.account.country, channel: AFF.state.account.channel,
      methods: AFF.state.onboarding.trafficProfile.promotionMethods,
      fields: AFF.accountCenter.profileFields().map(item => item.key)
    }));
    assert.equal(saved.country, "泰国");
    assert.equal(saved.channel, "付费广告");
    assert.deepEqual(saved.methods.sort(), ["自然流量", "付费投放"].sort());
    assert.ok(!saved.fields.includes("expectedTraffic") && !saved.fields.includes("historicalPlatforms"));
    await page.reload();
    await page.waitForSelector("[data-account-profile='country']");
    assert.equal(await page.locator("[data-account-profile='country']").inputValue(), "泰国");
    assert.equal(await picker("promotionMethods").locator("[data-profile-selection-choice]:checked").count(), 2);
    await page.evaluate(() => { AFF.state.language = "en"; render(); });
    assert.ok((await picker("country").locator("summary").innerText()).includes("Thailand"));
    assert.ok((await picker("channel").locator("summary").innerText()).includes("Paid advertising"));
    assert.ok((await picker("promotionMethods").locator("summary").innerText()).includes("Organic traffic"));
    await picker("country").locator("summary").click();
    await picker("country").locator("[data-profile-selection-search]").fill("no-such-country");
    assert.ok(await picker("country").locator(".profile-select-empty").isVisible());
    await page.locator(".account-panel h3").click();
    assert.equal(await picker("country").locator("details").getAttribute("open"), null, "outside click closes menu");
    await page.evaluate(() => { AFF.state.language = "zh"; render(); });
    for (const width of [1440,1113,390]) {
      await page.setViewportSize({ width, height: 1000 });
      await picker("country").locator("summary").click();
      await picker("country").locator("[data-profile-selection-search]").fill("泰");
      const fits = await picker("country").locator(".profile-select-panel").evaluate(node => {
        const box = node.getBoundingClientRect();
        return box.left >= 0 && box.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1;
      });
      assert.ok(fits, `${width}: selector stays within the viewport`);
      await page.screenshot({ path: `/tmp/affiliate-account-profile-${width}.png`, fullPage: true, animations: "disabled" });
      await page.keyboard.press("Escape");
    }
    await page.evaluate(() => { AFF.state.kybCompleted = true; render(); });
    assert.ok(await page.locator("[data-account-action='save-profile']").isDisabled());
    for (const key of ["country","channel","primaryCountries","promotionMethods"]) {
      assert.ok(await page.locator(`[data-account-profile='${key}']`).isDisabled());
      await picker(key).locator("summary").click();
      assert.equal(await picker(key).locator("details").getAttribute("open"), null, "confirmed fields cannot open");
    }
    await page.evaluate(() => {
      AFF.state.kybCompleted = false;
      AFF.state.onboarding.step = 2;
      AFF.state.onboarding.maxStep = 5;
      AFF.state.onboarding.detailsOpen = true;
      navigate("onboarding");
    });
    assert.equal(await page.locator("[data-onboarding-profile='expectedTraffic'], [data-onboarding-profile-method]").count(), 0);
    const countries = page.locator(".profile-select").filter({ has: page.locator("[data-onboarding-country-selection]") });
    assert.equal(await countries.locator("[data-profile-selection-choice]:checked").count(), 2);
    await countries.locator("summary").click();
    await countries.locator("[data-profile-selection-clear]").click();
    assert.equal(await page.evaluate(() => AFF.state.onboarding.trafficProfile.primaryCountries), "");
    await countries.locator("[data-profile-selection-search]").fill("VN");
    await countries.locator("[data-profile-selection-choice][value='越南']").check();
    assert.equal(await page.evaluate(() => AFF.state.onboarding.trafficProfile.primaryCountries), "越南");
    await page.keyboard.press("Escape");
    for (const width of [1113,390]) {
      await page.setViewportSize({ width, height: 1000 });
      await countries.locator("summary").click();
      await countries.locator("[data-profile-selection-search]").fill("Viet");
      await page.screenshot({ path: `/tmp/affiliate-onboarding-countries-${width}.png`, fullPage: true, animations: "disabled" });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.keyboard.press("Escape");
    }
    assert.deepEqual(errors, []);
    console.log("PASS: profile country/channel/method selection, search, multi-select, clear, save/reload, language, confirmed-field locks, onboarding sharing and desktop/mobile layout.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
