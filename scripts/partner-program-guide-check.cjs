const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

async function main() {
  const artifacts = path.join(__dirname, "..", ".artifacts", "partner-program-guide");
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  let checks = 0;
  const check = (value, message) => { assert.ok(value, message); checks += 1; };
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(process.env.REPORT_BASE_URL || "http://127.0.0.1:4179");
    await page.fill("#login-form input[name=email]", "partner-guide@example.com");
    await page.fill("#login-form input[name=password]", "demo-password");
    await page.click("#login-form button[type=submit]");
    await page.evaluate(() => {
      AFF.state.applyStep = 1;
      AFF.state.programMaxStep = 1;
      AFF.state.programCompleted = false;
      navigate("apply");
    });
    const businessSnapshot = () => page.evaluate(() => JSON.stringify({
      onboarding: AFF.state.onboarding,
      settlements: AFF.finance.settlements,
      guarantees: AFF.finance.guaranteeRecords,
      withdrawals: AFF.finance.allWithdrawals()
    }));
    const before = await businessSnapshot();
    check(await page.locator(".steps .step").count() === 6, "Six-step flow retained");
    check(await page.locator(".steps [data-apply-step='5']").isDisabled(), "Future step remains gated");
    check(await page.locator(".program-reward-stages li").count() === 3, "Three earning stages");
    let text = await page.locator("#main").innerText();
    check(text.includes("尚不能获得可提现佣金") && text.includes("基础比例合计100%") &&
      text.includes("三个阶段不代表分三次付款"), "FTD and three-stage payment boundaries are explicit");
    check(text.includes("基础CPA之外的额外奖励") && text.includes("不影响已经成立"), "Quality reward is additional");
    const details = page.locator(".program-settlement-summary details");
    check(await details.evaluate(node => node.open), "Settlement detail is initially expanded");
    await details.locator("summary").click();
    check(!await details.evaluate(node => node.open), "Settlement detail can be collapsed");
    await details.locator("summary").focus();
    await page.keyboard.press("Enter");
    check(await details.evaluate(node => node.open), "Keyboard opens settlement details");
    check((await details.innerText()).includes("每日结算不代表新佣金次日一定可提现"), "Daily settlement is not a next-day promise");
    const calculation = await page.evaluate(() => AFF.programCalculatorResult());
    const displayedSettlement = await page.locator(".program-settlement-amount strong").innerText();
    check(displayedSettlement === `$${(calculation.gross - calculation.guarantee).toFixed(2)}` &&
      calculation.tax > 0 && calculation.available === calculation.gross - calculation.guarantee - calculation.tax,
      "Inclusive settlement display does not change after-tax wallet calculation");
    check(await page.locator(".program-amount-details").count() === 0 &&
      !/税费|结算入账/.test(await page.locator(".calculator-result").innerText()), "Calculator omits tax rows and explanations");
    await page.selectOption("[data-calculator-field='payment']", "card");
    check(await page.locator(".calculator-result").isVisible(), "Calculator remains interactive");
    for (let step = 2; step <= 5; step += 1) {
      await page.locator(".program-action-card .button.primary").click();
      check(await page.evaluate(() => AFF.state.applyStep) === step, `Advance to step ${step}`);
    }
    check(await page.locator(".program-funds-timeline li").count() === 4, "Four main funding stages");
    check(await page.locator(".program-guarantee-branch").count() === 0, "Redundant guarantee branch removed");
    check((await page.locator(".program-funds-rules").innerText()).includes("何时收取保证金") &&
      (await page.locator(".program-funds-rules").innerText()).includes("佣金完成结算时"), "Guarantee copy explains collection timing");
    check(await page.locator(".program-funds-flow").evaluate(node =>
      getComputedStyle(node).backgroundColor === getComputedStyle(document.documentElement).getPropertyValue("--row-hover").trim() ||
      getComputedStyle(node).backgroundColor === "rgb(238, 247, 255)"), "Funds flow uses the light-blue design token");
    const ruleDetails = page.locator(".program-rule-example");
    await ruleDetails.locator("summary").click();
    const ruleText = await ruleDetails.innerText();
    check(!ruleText.includes("税费"), "Expanded guide omits tax explanation");
    check(ruleText.includes("10%") && ruleText.includes("90天") && ruleText.includes("试算示例"), "Existing parameters labelled illustrative");
    for (const [field, value, expected] of [
      ["guaranteeRate", 0.125, "12.5%"],
      ["guaranteeReleaseDays", 120, "120天"]
    ]) {
      const original = await page.evaluate(({ field, value }) => {
        const previous = AFF.finance.configuration[field];
        AFF.finance.configuration[field] = value;
        render();
        return previous;
      }, { field, value });
      check((await page.locator(".program-rule-example").textContent()).includes(expected), `${field} reads shared configuration`);
      await page.evaluate(({ field, original }) => {
        AFF.finance.configuration[field] = original;
        render();
      }, { field, original });
    }
    await page.evaluate(() => {
      const rules = AFF.finance.configuration;
      window.guideSavedRules = { rate: rules.guaranteeRate, days: rules.guaranteeReleaseDays };
      delete rules.guaranteeRate;
      delete rules.guaranteeReleaseDays;
      render();
    });
    check((await page.locator(".program-rule-example").textContent()).match(/待确认/g)?.length === 2,
      "Missing rule parameters do not invent production defaults");
    await page.evaluate(() => {
      AFF.finance.configuration.guaranteeRate = window.guideSavedRules.rate;
      AFF.finance.configuration.guaranteeReleaseDays = window.guideSavedRules.days;
      delete window.guideSavedRules;
      render();
    });
    for (const route of ["clients", "pay", "guarantee"]) {
      await page.locator(`.program-guide-grid [data-route='${route}']`).click();
      check(await page.evaluate(() => AFF.state.route) === route, `${route} entry navigates correctly`);
      await page.evaluate(() => navigate("apply"));
      check(await page.evaluate(() => AFF.state.applyStep) === 5, "Leaving and returning preserves guide step");
    }
    await page.locator(".program-action-card .button.primary").click();
    check(await page.locator(".program-share-link").count() === 2, "Web and app link actions retained");
    check(await page.locator(".program-share-recap li").count() === 3, "Three brief takeaways on sharing step");
    check(await page.locator(".program-share-shortcuts .program-text-link > span[aria-hidden='true']").count() === 3 &&
      (await page.locator(".program-share-shortcuts [data-apply-step='5']").innerText()).includes("查看结算规则"),
      "Sharing shortcuts use the settlement-rules label and matching trailing arrows");
    const postbackText = await page.locator(".program-postback-guide").innerText();
    check(postbackText.includes("广告追踪器或自建数据系统") &&
      postbackText.includes("转化事件发送至您的平台") && postbackText.includes("比较渠道效果"),
      "Postback guide explains its audience, outbound direction and purpose");
    await page.locator(".program-postback-guide [data-route='tracker']").click();
    check(await page.evaluate(() => AFF.state.route === "tracker") &&
      await page.locator("[data-action='open-tracker-modal']").isVisible(), "Postback entry opens existing configuration page");
    await page.evaluate(() => navigate("apply"));
    check(await page.evaluate(() => AFF.state.applyStep === 6 && AFF.state.programMaxStep === 6),
      "Returning from postback configuration preserves guide progress");
    await page.locator(".program-share-shortcuts [data-apply-step='1']").click();
    check(await page.evaluate(() => AFF.state.applyStep === 1 && AFF.state.programMaxStep === 6), "Reward revisit preserves furthest step");
    await page.locator(".program-settlement-summary [data-apply-step='5']").click();
    check(await page.evaluate(() => AFF.state.applyStep) === 5, "Unlocked funds shortcut works");
    for (const width of [1920, 1440, 992, 912, 768, 390]) {
      await page.setViewportSize({ width, height: width < 480 ? 844 : 1000 });
      await page.mouse.move(width - 5, 120);
      for (const step of [1, 5, 6]) {
        await page.evaluate(step => { AFF.state.applyStep = step; render(); }, step);
        if (step === 5) await page.locator(".program-rule-example summary").click();
        const layout = await page.evaluate(() => {
          const selector = AFF.state.applyStep === 1 ? ".program-reward-stages p" : ".program-funds-flow p";
          const text = document.querySelector(selector);
          const footer = document.querySelector(".program-action-card").getBoundingClientRect();
          const launcher = document.querySelector(".simulation-launcher")?.getBoundingClientRect();
          const main = document.querySelector("#main").getBoundingClientRect();
          return {
            overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
            font: text ? getComputedStyle(text).fontSize : null,
            footerFits: footer.left >= 0 && footer.right <= innerWidth + 1,
            launcherClear: !launcher || launcher.bottom <= footer.top || launcher.top >= footer.bottom,
            nestedCards: document.querySelectorAll("#main .card .card").length,
            mainWidth: main.width
          };
        });
        check(!layout.overflow && layout.footerFits && layout.launcherClear && layout.nestedCards === 0,
          `${width}px step ${step}: no overflow, nested cards or footer clipping`);
        if (layout.font) check(layout.font === "14px", `${width}px step ${step}: readable body typography`);
        if ([1440, 912, 390].includes(width)) {
          await page.evaluate(() => {
            document.activeElement?.blur();
            window.scrollTo(0, 0);
          });
          await page.screenshot({ path: path.join(artifacts, `step-${step}-${width}.png`), fullPage: true });
        }
      }
    }
    await page.evaluate(() => { AFF.state.language = "en"; AFF.state.applyStep = 5; render(); });
    const english = await page.locator(".program-step-card").innerText();
    check(!/[\u3400-\u9fff]/.test(english), `New funds guide supports English without mixed-language copy: ${english}`);
    await page.locator(".program-rule-example summary").click();
    check(!/[\u3400-\u9fff]/.test(await page.locator(".program-rule-example").innerText()), "Expanded rules support English");
    await page.evaluate(() => { AFF.state.applyStep = 6; render(); });
    check(!/[\u3400-\u9fff]/.test(await page.locator(".program-postback-guide").innerText()) &&
      (await page.locator(".program-share-shortcuts").innerText()).includes("View settlement rules"),
      "Postback guide and renamed shortcuts support English");
    await page.evaluate(() => { AFF.state.language = "zh"; AFF.state.applyStep = 6; render(); window.scrollTo(0, document.body.scrollHeight); });
    const finalAction = await page.locator(".program-postback-guide [data-route='tracker']").boundingBox();
    const footer = await page.locator(".program-action-card").boundingBox();
    check(finalAction.y + finalAction.height < footer.y, "Last content remains accessible above the fixed footer at scroll end");
    check(await businessSnapshot() === before, "Reading, navigation and trial configuration do not change business state");
    check(errors.length === 0, `No browser errors: ${errors.join(", ")}`);
    console.log(JSON.stringify({ result: "passed", checks, widths: [1920, 1440, 992, 912, 768, 390], artifacts }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
