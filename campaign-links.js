(() => {
  const storageKey = "affiliate-campaign-links";
  const validCode = code => typeof code === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(code);
  const normalizeStatus = value => ["active", "活跃", "启用"].includes(value) ? "active" : "archived";

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
    const saved = registry();
    return Object.hasOwn(saved, campaign.code) ? saved[campaign.code].status : normalizeStatus(campaign.status);
  }

  function find(code) {
    if (!validCode(code)) return null;
    const saved = registry();
    const seed = AFF.campaigns.find(item => item.code === code);
    if (Object.hasOwn(saved, code)) return { ...seed, code, ...saved[code] };
    return seed || null;
  }

  function save(campaign, nextStatus) {
    if (!validCode(campaign?.code) || typeof campaign.name !== "string") throw new Error("Invalid campaign");
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
    const link = new URL("./campaign-link.html", location.href);
    link.searchParams.set("camp", campaign.code);
    link.searchParams.set("aff", "AFF1001");
    link.searchParams.set("sub", "default");
    link.searchParams.set("clickid", "demo_click_001");
    Object.entries(extraParams).forEach(([key, value]) => {
      if (key !== "camp" && value !== undefined && value !== null) link.searchParams.set(key, String(value));
    });
    return link.href;
  }

  AFF.campaignLinks = { status, url, setStatus, register, find, storageKey };
})();
