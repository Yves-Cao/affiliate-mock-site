(() => {
  const steps = [
    ["查看佣金奖励", "Commission rewards", "了解奖励组成与不同国家的参考佣金。", "Explore reward components and country reference commissions."],
    ["高转化地区", "Top converting regions", "比较地区与平台的客户转化表现。", "Compare client conversion across regions and platforms."],
    ["查看支持地区", "Supported regions", "确认推广国家支持的网页和移动平台。", "Check supported web and mobile platforms for each country."],
    ["素材库总览", "Asset library", "选择适合您的横幅、视频和落地页。", "Find banners, videos and landing pages for your channels."],
    ["收益与系统指引", "Earnings and system guide", "了解佣金结算、保证金与数据查看入口。", "Understand settlement, guarantees and reporting tools."],
    ["分享简介链接", "Share your link", "获取推广链接，按需配置进阶推广工具。", "Get promotion links and explore advanced tools when needed."]
  ];
  let trigger = null;

  function close(restoreFocus = true) {
    document.getElementById("program-navigation-root")?.remove();
    document.body.classList.remove("program-navigation-open");
    document.getElementById("profile-entry")?.setAttribute("aria-expanded", "false");
    if (restoreFocus && trigger?.isConnected) trigger.focus();
  }

  function go(step) {
    const reached = Math.min(6, Math.max(1, AFF.state.programMaxStep, AFF.state.applyStep));
    if (!Number.isInteger(step) || step < 1 || step > reached) return;
    close(false);
    AFF.state.applyStep = step;
    navigate("apply");
  }

  function open(source = document.activeElement) {
    close(false);
    trigger = source instanceof HTMLElement ? source : document.getElementById("profile-entry");
    const en = AFF.state.language === "en";
    const t = (zh, english) => en ? english : zh;
    const reached = Math.min(6, Math.max(1, AFF.state.programMaxStep, AFF.state.applyStep));
    const completed = AFF.state.programCompleted;
    const root = document.createElement("div");
    root.id = "program-navigation-root";
    root.innerHTML = `
      <div class="aff-drawer-overlay" data-program-nav-close></div>
      <aside class="aff-drawer program-navigation" role="dialog" aria-modal="true" aria-labelledby="program-navigation-title">
        <header>
          <h2 id="program-navigation-title">${t("合作者计划", "Partner Program")}</h2>
          <button class="aff-drawer-close" type="button" data-program-nav-close aria-label="${t("关闭计划目录", "Close program contents")}">×</button>
        </header>
        <div class="aff-drawer-body program-navigation-body">
          <section class="program-navigation-progress" aria-label="${t("学习进度", "Learning progress")}">
            <div><strong>${completed ? t("已完成指引", "Guide completed") : t("继续了解您的合作计划", "Continue your program guide")}</strong><span>${completed ? "6 / 6" : `${reached} / 6`}</span></div>
            <progress max="6" value="${completed ? 6 : reached}" aria-label="${t("已到达步骤", "Steps reached")}"></progress>
            <p>${completed ? t("随时回看奖励、结算规则与推广方式。", "Revisit rewards, settlement rules and promotion tools anytime.") : t("从上次进度继续，已到达的步骤可随时回看。", "Continue where you left off, or revisit any step you have reached.")}</p>
          </section>
          <ol class="program-navigation-list">
            ${steps.map((item, index) => {
              const number = index + 1;
              const done = completed || number < reached;
              const available = number <= reached;
              const status = done ? t("已浏览", "Visited") : available ? t("继续学习", "Continue") : t("待解锁", "Locked");
              return `<li><button class="program-navigation-step ${available && !done ? "is-current" : ""}" type="button" data-program-nav-step="${number}" ${available ? "" : "disabled"}>
                <span class="program-navigation-number" aria-hidden="true">${done ? "✓" : String(number).padStart(2, "0")}</span>
                <span class="program-navigation-copy"><strong>${en ? item[1] : item[0]}</strong><span>${en ? item[3] : item[2]}</span></span>
                <span class="program-navigation-status">${status}</span>
                <span aria-hidden="true">›</span>
              </button></li>`;
            }).join("")}
          </ol>
        </div>
        <footer>
          <button class="button secondary" type="button" data-program-nav-close>${t("稍后再看", "Later")}</button>
          <button class="button primary" type="button" data-program-nav-step="${reached}">${completed ? t("回看指引", "Review guide") : t("继续学习", "Continue")}</button>
        </footer>
      </aside>`;
    document.body.append(root);
    document.body.classList.add("program-navigation-open");
    document.getElementById("profile-entry")?.setAttribute("aria-expanded", "true");
    root.addEventListener("click", event => {
      if (event.target.closest("[data-program-nav-close]")) close();
      const button = event.target.closest("[data-program-nav-step]");
      if (button && !button.disabled) go(Number(button.dataset.programNavStep));
    });
    const drawer = root.querySelector(".aff-drawer");
    AFF.drawer?.bind(drawer, { returnFocus: () => trigger });
    AFF.drawer?.focusIn(drawer);
  }

  AFF.programNavigation = { steps, open, close };
})();
