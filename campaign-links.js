(() => {
  const storageKey = "affiliate-campaign-links";
  const validCode = code => typeof code === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(code);
  const normalizeStatus = value => ["active", "活跃", "启用"].includes(value) ? "active" : "archived";

  function build(base, params = {}) {
    const url = base instanceof URL
      ? new URL(base.href)
      : new URL(String(base), location.href);
    Object.entries(params || {}).forEach(([key, value]) => {
      if (!key || value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
    return url;
  }

  function href(base, params = {}) {
    return build(base, params).href;
  }

  function trackingParams(extra = {}) {
    return {
      aff: "AFF1001",
      sub: "default",
      clickid: "demo_click_001",
      path_version: AFF.deepLinks?.pathVersion,
      ...extra
    };
  }

  AFF.linkBuilder = { build, href, trackingParams };

  function registry() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
      return Object.fromEntries(Object.entries(saved).filter(([code, item]) =>
        validCode(code) && item && typeof item.name === "string" && ["active", "archived"].includes(item.status)
      ));
    } catch {
      return {};
    }
  }

  function status(campaign) {
    if (!validCode(campaign?.code)) return "archived";
    if (campaign.fixed || campaign.code === "DIRECT") return "active";
    const saved = registry();
    return Object.hasOwn(saved, campaign.code) ? saved[campaign.code].status : normalizeStatus(campaign.status);
  }

  function find(code) {
    if (!validCode(code)) return null;
    const saved = registry();
    const seed = AFF.campaigns.find(item => item.code === code);
    if (seed?.fixed || code === "DIRECT") return { ...seed, status: "启用", fixed: true };
    if (Object.hasOwn(saved, code)) return { ...seed, code, ...saved[code] };
    return seed || null;
  }

  function save(campaign, nextStatus) {
    if (!validCode(campaign?.code) || typeof campaign.name !== "string") throw new Error("Invalid campaign");
    if (campaign.fixed || campaign.code === "DIRECT") {
      if (nextStatus !== "active") throw new Error("Fixed campaign cannot be archived");
      return "active";
    }
    const saved = registry();
    Object.defineProperty(saved, campaign.code, {
      value: { name: campaign.name, status: nextStatus },
      enumerable: true, configurable: true, writable: true
    });
    localStorage.setItem(storageKey, JSON.stringify(saved));
    window.dispatchEvent(new CustomEvent("affiliate-campaign-links-change", { detail: { code: campaign.code } }));
    return nextStatus;
  }

  function register(campaign) {
    return save(campaign, status(campaign));
  }

  function setStatus(campaign, nextStatus) {
    if (!["active", "archived"].includes(nextStatus)) throw new Error("Invalid campaign status");
    return save(campaign, nextStatus);
  }

  function url(campaign, extraParams = {}) {
    if (!validCode(campaign?.code)) throw new Error("Invalid campaign");
    if (campaign.fixed || campaign.code === "DIRECT") {
      return href(new URL(AFF.deepLinks.promotionPath || "/register", AFF.deepLinks.domain), trackingParams({
        utm_source: "direct",
        ...extraParams
      }));
    }
    return href(new URL(AFF.deepLinks.promotionPath || "/register", AFF.deepLinks.domain), trackingParams({
      camp: campaign.code,
      ...extraParams
    }));
  }

  function mockUrl(campaign, extraParams = {}) {
    if (!validCode(campaign?.code)) throw new Error("Invalid campaign");
    return href("./campaign-link.html", { camp: campaign.code, ...extraParams });
  }

  AFF.campaignLinks = { status, url, mockUrl, setStatus, register, find, storageKey };
})();
