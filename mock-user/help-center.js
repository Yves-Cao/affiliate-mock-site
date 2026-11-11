(() => {
  const h = value => AFF.helpers.h(value);
  const text = value => Array.isArray(value) ? (AFF.state.language === "en" ? value[1] : value[0]) : value;
  const t = (zh, en) => AFF.state.language === "en" ? en : zh;
  let assistantSearchComposition = false;

  const categories = [
    { id: "start", name: ["快速入门", "Getting started"], description: ["认识计划与基础流程。", "Understand the program and basic flow."] },
    { id: "program", name: ["合作者计划", "Partner Program"], description: ["完成申请、审核与准备。", "Complete application and preparation."] },
    { id: "promo", name: ["推广与素材", "Promotion and assets"], description: ["使用链接、素材和渠道。", "Use links, assets, and channels."] },
    { id: "clients", name: ["客户与归属", "Clients and attribution"], description: ["了解客户状态和归属。", "Understand client status and attribution."] },
    { id: "funds", name: ["佣金与提现", "Commission and withdrawal"], description: ["查看结算、保证金和提现。", "Review settlement, guarantee, and withdrawal."] },
    { id: "account", name: ["账户与安全", "Account and security"], description: ["维护资料、认证和安全。", "Maintain profile, verification, and security."] }
  ];

  const articles = [
    {
      id: "join-program",
      category: "start",
      title: ["如何加入合作者计划？", "How do I join the Partner Program?"],
      summary: ["提交基础资料并通过审核后，即可进入合作者计划并获取推广入口。", "Submit basic information and pass review to enter the program and access promotion tools."],
      body: [
        ["您可以从首页或合作者计划入口开始，填写必要资料并提交审核。审核结果会显示在页面顶部和合作者计划进度中。", "Start from the dashboard or Partner Program entry, complete the required information, and submit the review. Results appear in the top notice and program progress."],
        ["审核通过前，请先不要对外投放。审核通过后，系统会为您开放可用推广链接和相关素材。", "Please wait for approval before external promotion. After approval, the system enables your promotion links and related assets."]
      ],
      tags: ["加入", "申请", "注册", "join", "apply", "register"]
    },
    {
      id: "program-steps",
      category: "program",
      title: ["合作者计划需要完成哪些步骤？", "What steps does the Partner Program include?"],
      summary: ["按页面进度完成资料、审核、规则学习和链接准备，不需要重复提交同类资料。", "Follow the page progress for information, review, guidelines, and link preparation without duplicate submissions."],
      body: [
        ["合作者计划会引导您完成基础资料、资质审核、规则确认和推广准备。每一步只处理当前任务，已完成步骤可以回看。", "The program guides you through basic information, qualification review, guideline confirmation, and promotion preparation. Each step handles only its current task, and completed steps remain viewable."],
        ["如页面显示资料待完善，请优先补充对应资料；如显示审核中，请等待审核结果，不要重复提交相同版本。", "If the page asks for missing information, complete it first. If review is in progress, wait for the result instead of resubmitting the same version."]
      ],
      tags: ["步骤", "进度", "审核", "steps", "progress", "review"]
    },
    {
      id: "promotion-link",
      category: "promo",
      title: ["如何创建和使用推广链接？", "How do I create and use promotion links?"],
      summary: ["选择活动、到达页面和语言后复制链接；深度需求可使用深度链接设置。", "Select campaign, landing page, and language, then copy the link; use deep-link settings for advanced needs."],
      body: [
        ["在仪表盘或活动页选择活动后，可以复制当前推广链接。链接中的参数用于识别合作者、活动和渠道。", "From the dashboard or Campaigns page, select a campaign and copy the promotion link. Parameters identify the partner, campaign, and channel."],
        ["如需要直达指定页面或移动端应用，请使用深度链接设置。复制前请确认链接资格和目标页面仍然有效。", "For a specific page or mobile app, use deep-link settings. Confirm link eligibility and destination validity before sharing."]
      ],
      tags: ["链接", "推广", "活动", "复制", "link", "campaign", "copy"]
    },
    {
      id: "use-assets",
      category: "promo",
      title: ["如何使用推广素材？", "How do I use promotional assets?"],
      summary: ["按类型筛选素材，选择语言、尺寸或平台后下载与复制对应代码。", "Filter assets by type, select language, size, or platform, then download or copy the code."],
      body: [
        ["素材库提供横幅、视频、落地页和GIF。不同素材支持的尺寸、语言和平台不同，请在详情内确认后再使用。", "The asset library provides banners, videos, landing pages, and GIFs. Supported sizes, languages, and platforms differ by asset, so confirm them in detail before use."],
        ["首次使用素材前需要接受使用规范。请只将素材投放至允许的平台，不要修改品牌和法律信息。", "Accept the usage guidelines before first use. Use assets only on allowed platforms and do not alter brand or legal information."]
      ],
      tags: ["素材", "横幅", "视频", "落地页", "GIF", "asset", "banner", "video"]
    },
    {
      id: "subchannel",
      category: "promo",
      title: ["什么是二级渠道和 Sub ID？", "What are subchannels and Sub IDs?"],
      summary: ["二级渠道用于区分网站、社群、广告账户等流量来源，链接会附带Sub ID。", "Subchannels distinguish sources such as sites, communities, and ad accounts; links carry a Sub ID."],
      body: [
        ["二级渠道是在活动下继续拆分流量来源的方式。创建后，系统会在链接中加入Sub ID参数，用于报表和分析。", "A subchannel further splits traffic under a campaign. After creation, the system adds a Sub ID parameter for reports and analysis."],
        ["建议按可长期维护的投放位置创建二级渠道，避免为每次点击创建新渠道。归档前请确认相关链接不再使用。", "Create subchannels by durable placement, not for every click. Confirm related links are no longer used before archiving."]
      ],
      tags: ["二级渠道", "Sub ID", "subid", "渠道", "subchannel"]
    },
    {
      id: "client-attribution",
      category: "clients",
      title: ["客户如何归属到我？", "How is a client attributed to me?"],
      summary: ["客户通过您的有效推广链接注册，并在适用归属窗口内完成关联。", "A client registers through your valid promotion link and is associated within the applicable attribution window."],
      body: [
        ["当客户点击您的推广链接并完成注册后，系统会按点击时间、参数和适用归属窗口计算归属结果。", "After a client clicks your promotion link and registers, the system calculates attribution using click time, parameters, and the applicable window."],
        ["您可以在归属查询中输入允许的精准标识查询结果。页面只展示受控结果，不显示内部评分或证据全文。", "Use Attribution Lookup with an allowed exact identifier. The page shows controlled results only, without internal scoring or full evidence."]
      ],
      tags: ["客户", "归属", "注册", " attribution", "client"]
    },
    {
      id: "commission-settlement",
      category: "funds",
      title: ["佣金如何确认和结算？", "How are commissions confirmed and settled?"],
      summary: ["客户达到适用资格后确认佣金，再经过核验周期参与结算。", "Commissions are confirmed when a client meets applicable eligibility, then join settlement after verification."],
      body: [
        ["佣金成立后先进入确认或结算中状态。系统会在适用观察与核验周期后参与结算，不会因单一状态变化直接放款。", "After establishment, a commission enters confirmed or in-settlement status. It joins settlement after applicable observation and checks; a status change alone does not release payment."],
        ["您可以在收益数据中查看佣金状态、关联客户和可下钻明细。页面只显示用户可见状态和有限原因。", "Review commission status, related clients, and drill-down details in Earnings. The page shows only user-visible statuses and limited reasons."]
      ],
      tags: ["佣金", "结算", "收益", "commission", "settlement", "earnings"]
    },
    {
      id: "guarantee",
      category: "funds",
      title: ["保证金如何收取和释放？", "How is the guarantee retained and released?"],
      summary: ["结算时按适用规则留存保证金，满足期限和条件后转为可提现。", "A guarantee is retained at settlement under applicable rules and becomes withdrawable after conditions are met."],
      body: [
        ["保证金用于覆盖后续可能发生的更正或冲正。结算时会按适用规则留存，并在满足期限及条件后释放。", "The guarantee covers later corrections or chargebacks. It is retained at settlement under applicable rules and released after period and conditions are met."],
        ["您可以在保证金页面查看留存、释放和提现状态。页面不展示内部风控规则或评分。", "Review retention, release, and withdrawal status on the Guarantee page. Internal risk rules and scores are not shown."]
      ],
      tags: ["保证金", "留存", "释放", "guarantee", "retention", "release"]
    },
    {
      id: "withdraw",
      category: "funds",
      title: ["如何申请提现？", "How do I request a withdrawal?"],
      summary: ["确认可提现金额和收款方式后提交申请，可在提现记录中查看进度。", "Confirm available amount and payout method, submit the request, and follow progress in withdrawal records."],
      body: [
        ["提交提现前，请确认可提现金额、收款账户和必要的资料状态。申请提交后会在提现记录中显示处理进度。", "Before submitting, confirm available amount, payout account, and required profile status. After submission, progress appears in withdrawal records."],
        ["如提现失败或需要补充资料，请按记录中的说明处理。不要在未知结果时重复提交相同申请。", "If a withdrawal fails or needs more information, follow the record instructions. Do not repeatedly submit the same request before the result is known."]
      ],
      tags: ["提现", "出金", "withdraw", "payout"]
    },
    {
      id: "profile-verification",
      category: "account",
      title: ["如何完善资料并完成认证？", "How do I complete profile and verification?"],
      summary: ["按页面指引维护资料并完成认证；已认证的关键资料不可随意修改。", "Maintain profile information and complete verification as guided; verified key data cannot be freely changed."],
      body: [
        ["个人中心集中维护资料、认证、通知和安全设置。若资料未完善，页面会提示可能受影响的功能。", "Personal Center manages profile, verification, notifications, and security. Missing information triggers a notice about potentially limited features."],
        ["认证由外部系统处理。完成后状态会同步到用户端；已认证资料如需更正，请按页面提供的流程提交。", "Verification is handled by the external system and synced back after completion. To correct verified data, follow the provided process."]
      ],
      tags: ["资料", "认证", "KYC", "KYB", "profile", "verification"]
    }
  ];

  const routeRecommendations = {
    dash: ["program-steps", "commission-settlement", "withdraw"],
    apply: ["join-program", "program-steps", "promotion-link"],
    onboarding: ["profile-verification", "join-program", "program-steps"],
    promo: ["promotion-link", "subchannel", "use-assets"],
    subchannels: ["subchannel", "promotion-link", "client-attribution"],
    deep: ["promotion-link", "subchannel", "use-assets"],
    assets: ["use-assets", "promotion-link", "program-steps"],
    tracker: ["use-assets", "subchannel", "client-attribution"],
    clients: ["client-attribution", "commission-settlement", "program-steps"],
    lookup: ["client-attribution", "commission-settlement", "profile-verification"],
    perf: ["client-attribution", "subchannel", "commission-settlement"],
    summary: ["commission-settlement", "client-attribution", "subchannel"],
    pay: ["commission-settlement", "guarantee", "withdraw"],
    statements: ["commission-settlement", "guarantee", "withdraw"],
    wd: ["withdraw", "commission-settlement", "guarantee"],
    guarantee: ["guarantee", "commission-settlement", "withdraw"],
    account: ["profile-verification", "program-steps", "withdraw"],
    support: ["program-steps", "profile-verification", "withdraw"]
  };

  const faqIds = ["join-program", "promotion-link", "client-attribution", "commission-settlement", "withdraw"];

  function state() {
    if (!AFF.state.helpAssistant) {
      AFF.state.helpAssistant = {
        assistantOpen: false, drawerOpen: false, assistantQuery: "", query: "",
        expandedId: null, faqId: null, category: null, article: null,
        recentRoutes: [], clickedArticles: []
      };
    }
    return AFF.state.helpAssistant;
  }

  function root() {
    return document.getElementById("help-center-root");
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function article(id) {
    return articles.find(item => item.id === id);
  }

  function category(id) {
    return categories.find(item => item.id === id);
  }

  function searchArticles(query) {
    const q = normalize(query);
    if (!q) return [];
    const terms = [...new Set([q, ...q.split(/\s+/).filter(Boolean)])];
    return articles.map(item => {
      const title = normalize(text(item.title));
      const summary = normalize(text(item.summary));
      const tags = item.tags.map(normalize).join(" ");
      const body = item.body.map(part => normalize(text(part))).join(" ");
      let score = 0;
      for (const term of terms) {
        if (title.includes(term)) score += 12;
        if (summary.includes(term)) score += 7;
        if (tags.includes(term)) score += 5;
        if (body.includes(term)) score += 2;
        for (const tag of item.tags) if (tag && term.includes(normalize(tag))) score += 3;
      }
      return { item, score };
    }).filter(result => result.score > 0).sort((a, b) => b.score - a.score).map(result => result.item);
  }

  function recommendations() {
    const s = state();
    const ids = [
      ...[...(s.clickedArticles || [])].reverse(),
      ...(routeRecommendations[AFF.state.route] || ["join-program", "promotion-link", "withdraw"])
    ];
    return [...new Set(ids)].slice(0, 3).map(article).filter(Boolean);
  }

  function highlight(value, query) {
    const safe = h(value);
    const q = normalize(query);
    if (!q) return safe;
    const terms = [...new Set([q, ...q.split(/\s+/).filter(Boolean)])].sort((a, b) => b.length - a.length);
    return terms.reduce((output, term) => {
      const source = h(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!source) return output;
      return output.replace(new RegExp(source, "g"), match => `<mark>${match}</mark>`);
    }, safe);
  }

  function assistantPanel() {
    const s = state();
    const expanded = s.expandedId ? article(s.expandedId) : null;
    const recommended = recommendations();
    return `
      <section class="help-assistant" id="help-assistant-panel" role="dialog" aria-label="${h(t("智能客服", "Smart assistant"))}" ${s.assistantOpen ? "" : "hidden"}>
        <header class="help-assistant-head">
          <div>
            <h2>${h(t("智能客服", "Smart assistant"))}</h2>
            <p>${h(t("本地演示 · 暂未接入AI", "Local demo · AI not connected"))}</p>
          </div>
          <button class="help-icon-button" type="button" data-help-action="close-assistant" aria-label="${h(t("关闭智能客服", "Close assistant"))}">×</button>
        </header>
        <div class="help-assistant-body">
          <div class="help-assistant-results" data-help-assistant-results>${assistantResultsMarkup(s.assistantQuery)}</div>
          <section class="help-assistant-section">
            <h3>${h(t("可能想问", "You may ask"))}</h3>
            <div class="help-question-list">
              ${recommended.map(item => `
                <button type="button" data-help-action="assistant-question" data-article="${h(item.id)}" aria-expanded="${expanded?.id === item.id}">
                  <span>${h(text(item.title))}</span><i aria-hidden="true">▾</i>
                </button>
              `).join("")}
            </div>
          </section>
          ${expanded ? `
            <button class="help-direct-answer" type="button" data-help-action="open-drawer" data-article="${h(expanded.id)}" aria-label="${h(t("查看全文", "View full article"))}：${h(text(expanded.title))}">
              <span>
                <strong>${h(text(expanded.title))}</strong>
                <em>${h(text(expanded.summary))}</em>
              </span>
              <i aria-hidden="true">›</i>
            </button>
          ` : ""}
        </div>
        <footer class="help-assistant-footer">
          <div class="help-assistant-composer">
            <input type="search" data-help-assistant-search value="${h(s.assistantQuery)}" aria-label="${h(t("描述您的问题", "Describe your issue"))}" placeholder="${h(t("描述您的问题", "Describe your issue"))}">
            <button type="button" data-help-action="open-drawer" title="${h(t("打开帮助中心", "Open help center"))}" aria-label="${h(t("打开帮助中心", "Open help center"))}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19V5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z"/><path d="M8 7h7M8 11h7"/></svg>
            </button>
          </div>
        </footer>
      </section>
    `;
  }

  function assistantResultsMarkup(query) {
    const results = searchArticles(query);
    if (!query.trim()) return "";
    return results.slice(0, 4).map(item => `
      <button class="help-result" type="button" data-help-action="assistant-question" data-article="${h(item.id)}">
        <strong>${highlight(text(item.title), query)}</strong>
        <span>${h(text(item.summary))}</span>
      </button>
    `).join("") || `<p class="help-empty">${h(t("没有找到匹配内容，可打开帮助中心继续查看。", "No matches. Open the help center for more."))}</p>`;
  }

  function drawerBody() {
    const s = state();
    if (s.query) {
      const results = searchArticles(s.query);
      return `
        <section class="help-drawer-section">
          <div class="help-search-summary">
            <strong>${h(t("搜索结果", "Search results"))}</strong>
            <button class="button secondary small" type="button" data-help-action="clear-search">${h(t("清除", "Clear"))}</button>
          </div>
          ${results.map(item => `
            <button class="help-article-row" type="button" data-help-action="drawer-article" data-article="${h(item.id)}">
              <span>${h(text(category(item.category).name))}</span>
              <strong>${highlight(text(item.title), s.query)}</strong>
              <small>${h(text(item.summary))}</small>
            </button>
          `).join("") || `<p class="help-empty">${h(t("没有匹配的文章，可换个关键词或创建工单。", "No matching articles. Try another keyword or create a ticket."))}</p>`}
        </section>
      `;
    }
    if (s.article) {
      const item = article(s.article);
      const cat = category(item.category);
      return `
        <section class="help-drawer-section help-article-detail">
          <button class="help-back" type="button" data-help-action="drawer-back">${h(t("返回", "Back"))}</button>
          <span class="help-article-category">${h(text(cat.name))}</span>
          <h3>${h(text(item.title))}</h3>
          ${item.body.map(part => `<p>${h(text(part))}</p>`).join("")}
        </section>
      `;
    }
    if (s.category) {
      const cat = category(s.category);
      return `
        <section class="help-drawer-section">
          <button class="help-back" type="button" data-help-action="drawer-back">${h(t("全部分类", "All categories"))}</button>
          <h3>${h(text(cat.name))}</h3>
          <p>${h(text(cat.description))}</p>
          ${articles.filter(item => item.category === s.category).map(item => `
            <button class="help-article-row" type="button" data-help-action="drawer-article" data-article="${h(item.id)}">
              <strong>${h(text(item.title))}</strong>
              <small>${h(text(item.summary))}</small>
            </button>
          `).join("")}
        </section>
      `;
    }
    return `
      <section class="help-drawer-section">
        <h3>${h(t("帮助目录", "Help directory"))}</h3>
        <div class="help-toc-list">
          ${categories.map(cat => {
            const groupArticles = articles.filter(item => item.category === cat.id);
            return `
            <article class="help-toc-group">
              <button type="button" data-help-action="drawer-category" data-category="${h(cat.id)}" aria-label="${h(t("查看分类", "View category"))}：${h(text(cat.name))}">
                <span class="help-toc-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V6a2 2 0 0 1 2-2h4l2 3h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 12h8"/></svg></span>
                <span class="help-toc-copy">
                  <strong>${h(text(cat.name))}</strong>
                  <small>${h(text(cat.description))}</small>
                </span>
                <span class="help-toc-count">${groupArticles.length}${h(t("篇", " articles"))}</span>
                <i aria-hidden="true">›</i>
              </button>
              <div class="help-toc-children">
                ${groupArticles.map(item => `
                  <button type="button" data-help-action="drawer-article" data-article="${h(item.id)}">
                    <span>${h(text(item.title))}</span>
                    <i aria-hidden="true">›</i>
                  </button>
                `).join("")}
              </div>
            </article>
            `;
          }).join("")}
        </div>
      </section>
      <section class="help-drawer-section">
        <h3>${h(t("常见问题", "FAQ"))}</h3>
        <div class="help-faq-list">
          ${faqIds.map(id => {
            const item = article(id);
            const open = s.faqId === id;
            return `
              <div class="help-faq-item ${open ? "open" : ""}">
                <button type="button" data-help-action="toggle-faq" data-article="${h(id)}" aria-expanded="${open}">${h(text(item.title))}<i aria-hidden="true">▾</i></button>
                ${open ? `<div><p>${h(text(item.summary))}</p><button type="button" data-help-action="drawer-article" data-article="${h(id)}">${h(t("查看全文", "View full article"))}</button></div>` : ""}
              </div>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function helpDrawer() {
    const s = state();
    if (!s.drawerOpen) return "";
    return `
      <div class="aff-drawer-overlay help-drawer-overlay" data-help-action="close-drawer"></div>
      <aside class="aff-drawer aff-drawer--compact help-drawer" role="dialog" aria-modal="true" aria-labelledby="help-center-title">
        <header>
          <div class="aff-drawer-title-wrap">
            <h2 id="help-center-title">${h(t("帮助中心", "Help center"))}</h2>
            <p>${h(t("搜索、按两级目录浏览和查看详情。", "Search, browse the two-level directory, and read details."))}</p>
          </div>
          <div class="help-drawer-header-actions">
            ${(s.article || s.category) ? `<button class="help-drawer-back-link" type="button" data-help-action="drawer-home">${h(t("返回列表", "Back to list"))}</button>` : ""}
            <button class="aff-drawer-close" type="button" data-help-action="close-drawer" aria-label="${h(t("关闭帮助中心", "Close help center"))}">×</button>
          </div>
        </header>
        <div class="aff-drawer-body help-drawer-body">
          <label class="help-drawer-search">
            <span>${h(t("搜索帮助", "Search help"))}</span>
            <input type="search" data-help-search value="${h(s.query)}" placeholder="${h(t("搜索问题、关键词或流程", "Search questions, keywords, or flows"))}">
          </label>
          ${drawerBody()}
        </div>
      </aside>
    `;
  }

  function render(focusTarget = "") {
    const node = root();
    if (!node) return;
    const s = state();
    const appHidden = document.getElementById("app-view")?.classList.contains("hidden");
    const currentRoute = AFF.routes.some(item => item.id === AFF.state.route) ? AFF.state.route : "dash";
    if (!appHidden && s.recentRoutes[0] !== currentRoute) {
      s.recentRoutes = [currentRoute, ...(s.recentRoutes || [])].slice(0, 8);
    }
    node.innerHTML = appHidden ? "" : `
      <button class="help-launcher" type="button" data-help-open="assistant" aria-expanded="${s.assistantOpen}" aria-controls="help-assistant-panel" aria-label="${h(t("智能客服", "Smart assistant"))}">
        <span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6a8 8 0 0 1 8-8h2a8 8 0 0 1 8 3z"/><path d="M8 11h8M8 14h5"/></svg></span>
      </button>
      ${assistantPanel()}
      ${helpDrawer()}
    `;
    document.querySelector('[data-help-open="assistant"]')?.setAttribute("aria-expanded", String(s.assistantOpen));
    wireHelpControls(node);
    if (focusTarget) node.querySelector(focusTarget)?.focus();
  }

  function rememberArticle(id) {
    const s = state();
    if (!article(id)) return;
    s.clickedArticles = [id, ...(s.clickedArticles || []).filter(item => item !== id)].slice(0, 8);
  }

  function openAssistant(trigger) {
    const s = state();
    if (s.assistantOpen) {
      s.assistantOpen = false;
      render(".help-launcher");
      const returnTarget = trigger?.classList?.contains("help-launcher")
        ? root()?.querySelector(".help-launcher")
        : trigger;
      returnTarget?.focus();
      return;
    }
    s.assistantOpen = true;
    render("[data-help-assistant-search]");
    if (trigger) trigger.setAttribute("aria-expanded", "true");
  }

  function closeAssistant(returnFocus = true) {
    const s = state();
    s.assistantOpen = false;
    render(".help-launcher");
    if (!returnFocus) root()?.querySelector(".help-launcher")?.focus();
  }

  function updateAssistantSearch(value) {
    const s = state();
    s.assistantQuery = value;
    const results = root()?.querySelector("[data-help-assistant-results]");
    if (results) {
      results.innerHTML = assistantResultsMarkup(value);
      wireHelpControls(results);
    } else {
      render("[data-help-assistant-search]");
    }
  }

  function updateDrawerSearch(value) {
    const s = state();
    s.query = value;
    s.article = null;
    s.category = null;
    const input = root()?.querySelector("[data-help-search]");
    const position = input?.selectionStart ?? value.length;
    render();
    const next = root()?.querySelector("[data-help-search]");
    next?.focus();
    next?.setSelectionRange(position, position);
  }

  function openDrawer(articleId = null) {
    const s = state();
    s.drawerOpen = true;
    if (articleId) {
      rememberArticle(articleId);
      s.article = articleId;
      s.category = article(articleId)?.category || null;
      s.faqId = null;
    } else {
      s.article = null;
      s.category = null;
      s.faqId = null;
      s.query = "";
    }
    render(".help-drawer-close");
  }

  function processHelpAction(target) {
    const action = target.dataset.helpAction;
    const s = state();
    if (action === "close-assistant") return closeAssistant(false);
    if (action === "open-drawer") return openDrawer(target.dataset.article || null);
    if (action === "close-drawer") {
      s.drawerOpen = false;
      render('[data-help-action="open-drawer"]');
      return;
    }
    if (action === "assistant-question" || action === "drawer-article") {
      const id = target.dataset.article;
      rememberArticle(id);
      if (action === "assistant-question") {
        s.expandedId = s.expandedId === id ? null : id;
        render(`.help-question-list [data-article="${CSS.escape(id)}"]`);
      } else {
        s.article = id;
        s.category = article(id)?.category || null;
        s.faqId = null;
        render(".help-article-detail h3");
      }
      return;
    }
    if (action === "drawer-category") {
      s.category = target.dataset.category;
      s.article = null;
      s.faqId = null;
      return render(".help-drawer-section h3");
    }
    if (action === "drawer-back") {
      if (s.article) {
        s.article = null;
        render(".help-article-row");
      } else {
        s.category = null;
        render(".help-category-grid button");
      }
      return;
    }
    if (action === "drawer-home") {
      s.article = null;
      s.category = null;
      s.faqId = null;
      s.query = "";
      return render("[data-help-search]");
    }
    if (action === "toggle-faq") {
      const id = target.dataset.article;
      s.faqId = s.faqId === id ? null : id;
      rememberArticle(id);
      return render(`[data-help-action="toggle-faq"][data-article="${CSS.escape(id)}"]`);
    }
    if (action === "clear-search") {
      s.query = "";
      return render("[data-help-search]");
    }
  }

  function wireHelpControls(container) {
    container.querySelectorAll("[data-help-action]").forEach(control => {
      control.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        processHelpAction(control);
      });
    });
    const assistantSearch = container.querySelector("[data-help-assistant-search]");
    assistantSearch?.addEventListener("input", event => {
      if (event.isComposing || assistantSearchComposition) return;
      updateAssistantSearch(event.target.value);
    });
    assistantSearch?.addEventListener("compositionstart", () => {
      assistantSearchComposition = true;
    });
    assistantSearch?.addEventListener("compositionend", event => {
      assistantSearchComposition = false;
      updateAssistantSearch(event.target.value);
    });
    container.querySelector("[data-help-search]")?.addEventListener("input", event => updateDrawerSearch(event.target.value));
  }

  document.addEventListener("click", event => {
    const opener = event.target.closest("[data-help-open]");
    if (!opener) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openAssistant(opener);
  });

  document.addEventListener("keydown", event => {
    const s = state();
    if (event.key === "Escape" && (s.assistantOpen || s.drawerOpen)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (s.drawerOpen) {
        s.drawerOpen = false;
        render('[data-help-action="open-drawer"]');
      } else {
        closeAssistant(false);
      }
      return;
    }
    if (event.key === "Enter" && event.target.matches("[data-help-assistant-search]")) {
      if (event.isComposing || assistantSearchComposition) return;
      const first = searchArticles(s.assistantQuery)[0];
      if (first) {
        event.preventDefault();
        rememberArticle(first.id);
        s.expandedId = first.id;
        render(".help-direct-answer h3");
      }
      return;
    }
    if (event.key === "Tab" && s.drawerOpen) {
      const drawer = root()?.querySelector(".help-drawer");
      if (!drawer?.contains(document.activeElement)) return;
      const focusable = [...drawer.querySelectorAll("button, input, [href], [tabindex]:not([tabindex='-1'])")].filter(item => !item.disabled && item.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    }
  }, true);

  AFF.help = { render, openAssistant, articles, categories, searchArticles, recommendations };
})();
