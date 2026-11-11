(() => {
  const params = new URLSearchParams(location.search);
  const code = params.get("camp");
  const english = params.get("lang") === "en";
  const t = (zh, en) => english ? en : zh;
  const title = document.getElementById("campaign-access-title");
  const description = document.getElementById("campaign-access-description");
  const campaignName = document.getElementById("campaign-access-name");
  const statusLabel = document.getElementById("campaign-access-status");
  const continueButton = document.getElementById("campaign-access-continue");

  function renderAccess() {
    const campaign = AFF.campaignLinks.find(code);
    const active = campaign && AFF.campaignLinks.status(campaign) === "active";
    title.textContent = active ? t("继续创建账户", "Continue to create an account") : t("链接已失效", "This link is no longer available");
    description.textContent = active
      ? t("该推广链接可用，您可以继续前往注册。", "This referral link is available. You can continue to registration.")
      : campaign
        ? t("该活动已归档，请联系邀请方获取新的推广链接。", "This campaign has been archived. Contact the person who invited you for a new referral link.")
        : t("该推广链接不存在或已停用，请联系邀请方确认。", "This referral link does not exist or is no longer available. Contact the person who invited you.");
    statusLabel.textContent = active ? t("链接可用", "Link available") : t("无法继续访问", "Access unavailable");
    statusLabel.classList.toggle("is-unavailable", !active);
    campaignName.textContent = campaign?.name || "";
    campaignName.hidden = !campaign;
    continueButton.hidden = !active;
    continueButton.disabled = !active;
    continueButton.textContent = t("继续注册", "Continue to registration");
    document.title = `${active ? t("推广链接", "Referral link") : t("链接已失效", "Link unavailable")} · Affiliate CPA`;
    return active;
  }

  continueButton.addEventListener("click", () => {
    if (!renderAccess()) return;
    const target = new URL("./index.html", location.href);
    target.search = location.search;
    target.hash = "/register";
    location.assign(target.href);
  });
  window.addEventListener("storage", event => {
    if (event.key === AFF.campaignLinks.storageKey || event.key === null) renderAccess();
  });
  window.addEventListener("affiliate-campaign-links-change", renderAccess);
  window.addEventListener("pageshow", renderAccess);
  window.addEventListener("focus", renderAccess);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderAccess();
  });
  document.documentElement.lang = english ? "en" : "zh-CN";
  renderAccess();
})();
