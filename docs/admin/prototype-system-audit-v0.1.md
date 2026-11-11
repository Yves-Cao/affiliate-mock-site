# Affiliate Admin Prototype System Audit

Version: v0.1  
Date: 2026-11-05  
Scope: Operations admin prototype only. This note belongs to the prototype repository and does not replace product documents maintained in the document workspace.  
Decision: User selected Main Line 1 - task closure first.

## 1. Current Strength

The current admin prototype already provides:

1. Four business routes and thirty business tabs.
2. TradeMaster-style warm admin visual baseline.
3. Eight summary cards per tab.
4. Insight panels, filters, sortable table, pagination, column settings, and detail drawer.
5. Role and scenario switches.
6. Action modal with reason, impact preview, and self-review hint.
7. Domain-specific enhancement for the configuration center.
8. Configuration center v0.35 opens on a complete business-version list, with view/edit/copy/new actions, historical-version preservation, and a separate system-configuration page that does not generate business versions.

## 2. System-Level Gaps

| Capability | Gap | Priority |
|---|---|---|
| Global workbench | No first screen showing what the administrator should handle today | P0 |
| Unified task center | Review, approval, integration, and appeal tasks are scattered across tabs | P0 |
| Object 360 view | Detail drawer lacks cross-object context | P0 |
| Global search | Implemented through prototype v0.24; continue expanding indexed fields when API contracts replace synthetic rows | P1 |
| Open-page tab bar | Missing TradeMaster-style opened page management | P1 |
| Notifications | No approval-timeout, integration-failure, or risk-alert entry | P1 |
| Batch operations | No row checkbox or batch claim/reassign/export/approval flow | P0 |
| Saved views | Repeated filters cannot be saved | P1 |
| Configuration release package | No combined release, diff, schedule, and rollback flow | P0 |
| Configuration rollback | Version timeline and rollback preview are missing | P0 |
| Approval impact preview | Current impact preview is generic | P0 |
| Risk relation graph | No visual graph for partner/client/device/IP/payment/commission links | P0 |
| Case group split/merge | Group conclusion and per-case financial action are not visually separated | P0 |
| Unified quarantine queue | Missing source tag, waiting days, blocked amount, and recheck flow | P0 |
| Investigation SLA | Missing reminder, escalation, and tiered link restriction view | P0 |
| Financial reconciliation view | Commission, tax, guarantee, withdrawal, and reversal are not connected | P0/P1 |
| Report charts | Report tabs remain generic tables | P0 |
| Report drilldown | Cannot drill from dimension to client, commission, or risk case | P0 |
| Audit center | Only local mock audit sections; no global audit search | P0 |
| Export center | No async export task list, masked fields, expiry, or download audit | P0 |
| Integration health | No external system status, backlog, retry rate, or callback failure view | P0/P1 |
| Data governance | Export, deletion, sensitive-field authorization, and breach flow are absent | P1 |
| Permission visibility | Role switch exists, but field/data-range permission differences are not visible | P0 |
| System footer | Missing low-weight product footer | P2 |

## 3. Selected Main Line

Selected: **Main Line 1 - Task closure first.**

Reason:

1. It connects the existing thirty tabs into one operating system.
2. It exposes missing horizontal capabilities faster than adding more pages.
3. It provides a natural entry for approvals, timeouts, integration failures, risk review, and audit.

## 4. Main Line 1 Acceptance Scope

1. Global workbench route outside the four business routes.
2. Task queues: My Tasks, Pending Approval, Overdue, Integration Failures, All Tasks.
3. Eight workbench summary cards.
4. Task table with row selection.
5. Batch claim, batch reassign, and export entry.
6. Task detail drawer with context, linked objects, SLA, and audit.
7. Global audit drawer with keyword search and recent audit records.
8. Role-aware available actions.
9. Existing four-route / thirty-tab architecture remains unchanged.

## 5. Maintenance

| Date | Change | Basis |
|---|---|---|
| 2026-11-05 | Recorded system audit and selected task-closure main line | User selected option 1 |
| 2026-11-05 | Added prototype v0.15 global search and global jump | Task-closure self-review |
| 2026-11-05 | Added prototype v0.16 search shortcut, recent searches, and role-filtered visibility | User authorized direct continuation |
| 2026-11-05 | Added prototype v0.17 TradeMaster shell correction and local UI/UX standard | User installed clone-page and requested re-extraction from the reference page |
| 2026-11-05 | Added prototype v0.18 task cockpit and usable control scale | User approved direct usability correction |
| 2026-11-05 | Added prototype v0.19 role-specific dashboard and API-style data presentation | User requested the dashboard name, role-specific views, and removal of demo-data labels |
| 2026-11-05 | Added prototype v0.20 fixed dashboard information order | User required summary panel first, pending table second, and statistics third |
| 2026-11-05 | Added prototype v0.21 complete sidebar product blueprint | User confirmed the menu structure is a complete product blueprint for review |
| 2026-11-05 | Added prototype v0.22 sidebar interaction correction | User required single-group expansion, child icons, no parent arrows, and no visible scrollbar |
| 2026-11-05 | Added prototype v0.23 complete P1/P2 module pages | User required completing the blueprint menus into a full realistic mock prototype |
| 2026-11-05 | Added prototype v0.24 business-specific module experiences | User required continuing refinement of the complete realistic mock prototype |
| 2026-11-05 | Added prototype v0.25 page implementation inventory and route-integrity regression | User required a page-by-page implementation handoff for development |
| 2026-11-05 | Added prototype v0.26 deep interaction layer for all unique pages | User required deep interactive complete function pages for every page |

## 6. Implementation Status

Main Line 1 is implemented in admin prototype v0.26:

1. Dashboard route: `#/admin-workbench`, displayed as `仪表盘`.
2. Five task queues: My Tasks, Pending Approval, Overdue, Integration Failures, All Tasks.
3. Four cockpit summary cards answering my tasks, pending approvals, overdue items, and blocked funds.
4. Row selection on task and business tables.
5. Batch claim, reassign, approval, and export entries.
6. Workbench task detail with source, SLA, overdue state, and linked objects.
7. Global audit drawer with keyword search and recent audit records.
8. Existing four business routes and thirty business tabs remain unchanged.
9. Workbench tasks carry source route, source tab, source object, partner, client, commission, and risk-case context.
10. Workbench task actions write status and owner back to the source business object.
11. Workbench task details include object 360, source entry, SLA, overdue state, and task timeline.
12. Business object details include a shared TraceId-based object 360 section.
13. Global notification center with approval, integration, risk, staging, export, and guarantee alerts.
14. Notification unread badge, single-read, mark-all-read, and source-page navigation.
15. Opened-page tab bar with navigation and close behavior.
16. Personal saved views persisted in local storage; views capture filters, sorting, page size, hidden columns, and workbench queue.
17. Permission visibility drawer showing data scope, allowed and forbidden actions, masked fields, always-hidden fields, and export boundaries.
18. Low-weight system footer with prototype version and synthetic-data notice.
19. Configuration release-package closure inside the existing Config Overview tab.
20. Five synthetic release packages covering pending approval, approved, scheduled, active, and activation-failed states.
21. Release-package details include combined domains, current-to-next diff, simulation impact, guardrails, signoffs, timeline, and failure reason.
22. Role-aware release actions: sign-off, schedule, activate, rollback, and recovery.
23. Release actions update package status, append timeline, and write global audit records.
24. Risk-case closure is embedded in the existing Cluster Identification and Risk Review tabs.
25. Three synthetic risk cases cover investigation, group confirmation, and manual-required states.
26. Risk-case details include an SVG relation graph, feature chips, members, devices, IP ranges, payment tools, commissions, investigation SLA, quarantine, and timeline.
27. Group conclusions remain separate from member-level commission actions; each commission can be independently released or held.
28. Role-aware actions cover mis-merged member split, investigation escalation, group conclusion confirmation, and quarantine release with settlement recheck.
29. Risk-case actions append case timeline and global audit records without automatically changing unrelated commission funds.
30. Report-operation closure is embedded in the existing three Report Center tabs.
31. Each report tab includes three SVG charts: ROI uses conversion funnel, commission trend, and reversal loss; quality uses grade distribution, retention, and loss composition; guarantee coverage uses coverage trend, potential-loss composition, and release delay.
32. Report dimensions support drilldown to clients, commission cases, risk cases, and recommendation context.
33. Report suggestions require a reason, generate a suggestion task, and write global audit; suggestions do not directly modify partner status, commission, configuration, or funds.
34. Async export center covers ready, processing, expired, and cancelled tasks with masked fields, scope, row count, 24-hour expiry, download, and cancellation.
35. Integration-health closure is embedded in the existing Integration Tasks tab.
36. Three charts cover API success rate, event backlog, and callback failure rate.
37. Four external systems cover CRM, payment, IMC, and event outbox with status, latency, success rate, backlog, retry rate, callback failure rate, dependencies, blocked amount, and health timeline.
38. Event gaps distinguish critical and secondary data gaps; critical gaps block automatic settlement and expose affected commission cases and amounts.
39. Idempotent backfill uses a stable key, prevents duplicate delivery, links to integration tasks, and writes audit records.
40. Integration tasks support retry and cancellation; health checks change abnormal systems to recovering and append health timeline records without directly releasing funds.
41. Data-governance closure is embedded in the existing Integration Tasks tab.
42. Data classifications cover public, internal, sensitive, and restricted fields with field-level display and export policies.
43. Retention policies cover click evidence, identity data, export files, and audit logs; expiry feeds deletion or anonymization tasks.
44. Sensitive-field authorization supports approve and reject/revoke with applicant, purpose, expiry, and audit.
45. The export center now includes data level, masking, approval status, 24-hour expiry, download, cancellation, and audit.
46. Deletion/anonymization tasks require governance approval and record status and SLA; the prototype does not delete real data.
47. Breach incidents record severity, affected data, notification SLA, containment status, and notification audit.
48. Global search is available from the top bar and opens a dedicated right drawer.
49. Search indexes business objects from the existing thirty business tabs, configuration release packages, risk cases, report dimensions, integration systems, event gaps, integration tasks, export tasks, and audit records.
50. Search supports multi-word keywords, type filtering, TraceId/ID lookup, result jump, route navigation, and special-object drawers.
51. Opening a result closes the search drawer immediately; route hash changes may then render the target page and drawer.
52. A new search session resets the previous keyword and type filter so results cannot be unintentionally constrained.
53. Escape closes the search drawer and follows the existing drawer/modal closing order.
54. Search UI uses the TradeMaster warm palette, tabular IDs, dense result cards, and responsive single-column behavior on small screens.
55. The architecture remains one global workbench route, four business routes, and thirty business tabs; no new business tab is introduced.
56. `Ctrl/Cmd + K` opens or closes global search and automatically focuses the keyword input.
57. Recent searches keep up to eight successful keywords, support one-click reuse, and can be cleared.
58. Recent searches are stored separately by role in local storage so one role does not inherit another role's search intent.
59. Search result types and result objects are filtered by the current role's prototype search visibility policy.
60. Allowed related objects can still appear: for example, Operations may search a risk-case ID and see an allowed report dimension, but not the forbidden risk-case object or type chip.
61. Search supports `ArrowDown` focus movement and `Enter` to open the focused result; pressing Enter twice from the input opens the first result.
62. The permission visibility drawer now lists the current role's searchable object types.
63. Prototype-local visual contract is maintained in `trademaster-ui-ux-standard-v0.1.md`.
64. `clone-page` captured the reference login page screenshot and base theme; logged-in work-area evidence remains sourced from the existing `DESIGN-ADMIN.md` captured styles.
65. The sidebar now has brand, workspace identity, grouped navigation, version footer, and compact responsive behavior.
66. The topbar now has breadcrumb, system/local time, latency, appearance, language, search, notification, permission, audit, and account areas.
67. Demo role/scenario controls moved from the production-like topbar into a collapsed bottom-right floating panel.
68. Workspace H1 removed the login-only serif font and negative letter spacing.
69. Statistics changed from repeated cards to a TradeMaster-style horizontal strip with boundary lines and denser metrics.
70. Tables use fixed layout, `#F8F6F1` header tone, minimum row density, `#F8F4ED` hover, fixed selection/action columns, and ellipsis for long values.
71. The global workbench now opens with a task cockpit instead of an eight-card statistics wall.
72. The cockpit priority list sorts by overdue state and impact amount and exposes one `处理` action per task.
73. The cockpit abnormal-signal panel links directly to risk cases and abnormal integration systems.
74. Workbench H1 is fixed at 24px; page primary buttons are 40px, page secondary buttons 36px, filter buttons 34px, row actions 30px, and topbar icon buttons 34x34.
75. Topbar search, notifications, permissions, and audit use icon buttons with `title` and `aria-label`; the notification unread count remains visible.
76. The demo panel automatically hides while any drawer, modal, or global search is open, preventing interception of footer actions.
77. Workbench generic statistics and insight cards were removed from the first screen; queue filters, advanced filters, and the complete task table remain below the cockpit.
78. The global workbench entry is renamed `仪表盘`.
79. The dashboard renders a different four-metric summary, priority-task rule, abnormal-signal source, and quick-link set for each of the seven roles.
80. Role dashboards cover Operations, Risk, Risk Supervisor, Finance, Compliance, System Administrator, and Audit.
81. The dashboard header shows the current role, dashboard objective, data source, and update time.
82. UI copy no longer displays `演示环境`, `虚构数据`, or `演示数据`; the workspace uses `Affiliate Admin API` and an update timestamp.
83. Static prototype data remains local and realistic; production customer data is not connected or written into the mock.
84. Dashboard order is fixed as data summary panel, pending-data table, then data statistics.
85. The pending-data table shows eight role-specific rows with task, object, status, risk, SLA, amount, and action.
86. The statistics section appears after the pending table and shows eight aggregate metrics.
87. Queue filters, advanced filters, and the complete task table remain below the three primary dashboard sections.
88. The sidebar now renders the complete product blueprint: 10 groups and 75 entries.
89. Menu entries are staged as MVP, P1, or P2; the current blueprint contains 42 MVP entries, 32 P1 entries, and 1 P2 entry.
90. MVP entries navigate to the existing dashboard, 30 business tabs, or global audit; planned entries open a blueprint drawer.
91. The blueprint drawer explains menu positioning, core objects, core actions, dependencies, and current mapping.
92. The menu blueprint does not change the underlying `1 dashboard route + 4 business routes + 30 business tabs` architecture.
93. The sidebar opens only the current menu group by default; opening another group closes the previous one.
94. Parent menus no longer display arrows or icons and no longer show `implemented/total` ratios.
95. All 75 child menu entries have semantic icons; child menus keep indentation and a connecting rail.
96. The sidebar scrollbar is hidden while retaining scroll behavior.
97. Below 1279px, child menu entries collapse to icon-only form.
98. A unified `admin-modules` route now carries 33 P1/P2 menu pages.
99. Each module page has a unique URL, module brief, eight statistics cards, insight panels, filters, a 20-row table, detail drawer, and role-aware actions.
100. Module objects use realistic synthetic names, countries, owners, statuses, amounts, SLA values, risks, TraceIds, and timelines.
101. The complete prototype now has one dashboard route, four existing business routes, one unified module route, 30 existing business tabs, and 33 module pages.
102. The module route intentionally hides the top tab bar because its 33 entries are already selectable from the complete left sidebar.
103. Seventy-three sidebar entries navigate to real pages and two entries open global audit; no menu entry leads to an empty page.
104. Module primary actions are business-specific rather than a global claim action: partner list exports partners, onboarding claims review, client risk creates review, campaign creates a draft, withdrawal claims payment review, channel report generates a suggestion, and permission creates a permission draft.
105. Module insight panels switch by business domain: partner lifecycle, attribution source/risk, promotion type/country, funds status/type, risk distribution, processing priority/status, analytics conclusion/country, and configuration version/owner.
106. Module detail drawers add a domain-specific business path plus object 360, source system, impact scope, and dependency capability.
107. The page implementation inventory documents all 75 menu entries, 64 unique route pages, two global-audit entries, data sources, filters, components, layouts, and primary actions.
108. Sidebar regression now proves every routed menu entry points to a real route and tab.
109. The violation-event menu now maps to `#/admin-risk/violation`; CRM fraud now maps to `#/admin-risk/fraud`.
110. v0.34 removed the all-page deep interaction workbench after review because it duplicated page-specific filters, stage boards, tables, drawers, and task queues.
111. Lifecycle stage boards remain only on business pages that have a lifecycle meaning and continue to filter their own tables.
112. Object context is provided by business detail drawers, event-chain drawers, risk-case drawers, and report drilldowns instead of a shared object inspector.
113. Row actions and business action modals retain role checks, dynamic execution parameters, reason capture, self-review, audit writeback, and object timeline updates.
114. New-draft actions still create visible local objects; export actions still create async export-center tasks.

## 7. v0.26 Verification

Verified locally with:

```bash
npm run check
npm run test:admin-prototype
npm run test:admin-api
```

Browser regression covers removal of the deep interaction workbench on the dashboard, every consolidated module page, and every existing business tab, while retaining lifecycle stage filters, dynamic action fields, new-draft object writeback, async export creation, sidebar route integrity, corrected violation and CRM-fraud navigation, all 21 module pages, 20-row pagination, module write actions, business-specific primary actions, domain insight panels, module business-path drawers, module blueprint drawer, 9 sidebar blueprint groups, 19 sidebar entries, single-open-group behavior, child icons, hidden scrollbar, MVP-entry navigation, global-audit menu entry, dashboard section order, pending rows, role dashboards, API-style data-source display, removal of demo-data labels, cockpit signal jump, object search, partner jump, TraceId jump, release-package drawer, risk-case drawer, integration-system drawer, audit jump, type filtering, search closing after result actions, Escape closing, `Ctrl/Cmd + K`, recent-search reuse and clearing, role-filtered visibility, keyboard result selection, TradeMaster workspace identity, breadcrumb, time/latency, collapsed environment panel, drawer auto-hide, H1 typography, control scale, statistics strip, fixed table layout, and table header tone. The generated evidence screenshot is `.artifacts/admin-prototype-v34.png`.
