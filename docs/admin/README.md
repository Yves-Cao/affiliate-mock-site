# Affiliate Admin API Mock

This package provides the v0.5 admin-side UI entry, OpenAPI contract, local mock API, and deterministic synthetic fixtures for the partner -> client -> commission -> withdrawal chain.

```bash
npm run mock:admin
npm run serve
```

- UI: `http://127.0.0.1:4179/admin-dev.html`
- API: `http://127.0.0.1:4020/admin/api/v1`

All data is synthetic. The public admin demo must not be deployed until Cloudflare Access is enabled.

## Target 30-Tab Contract

`openapi/affiliate-mock-openapi.yaml` is the target contract skeleton for the 4-route / 30-tab operations admin. It is separate from the older v0.5 technical contract in `openapi/admin-api.yaml`.

Current coverage:

- 30 OpenAPI tags, one per operations-admin tab.
- 250 paths and 272 generated operations.
- 96 component schemas.
- Draft lifecycle, read-only identification, action-oriented review, report, export, and audit operation families.
- Shared self-review approval, idempotency, reference-range metadata, masked data, and trace metadata contracts.
- External JSON schemas in `openapi/schemas/common.json` and `openapi/schemas/admin.json`.

Validate the target contract:

```bash
npm run test:target-openapi
```

The target contract is not implemented by `mock-server/admin-mock.cjs` yet. The existing server remains the v0.5 technical validation package and must not be represented as the completed 30-tab API.

## Prototype System Audit

The task queue was replaced inside the unified prototype at `#/tasks`, with task details, serial approvals, source-case settlement rechecks, and the existing export center. Its current implementation, fixed identities, screenshots, acceptance mapping, and Mock/HTTP boundary are recorded in [task-queue-implementation-v1.0.md](task-queue-implementation-v1.0.md).

The current system-level prototype audit and selected task-closure workstream are recorded in [prototype-system-audit-v0.1.md](prototype-system-audit-v0.1.md). The admin prototype v0.35 keeps the unified mock architecture, dynamic action forms with object writeback, the page implementation inventory, sidebar route-integrity regression, business-specific module actions, domain insights, and detail workflows on top of 21 consolidated module pages, corrected sidebar interaction, complete sidebar product blueprint, fixed dashboard order, role-specific dashboard, API-style data-source presentation, no demo-data labels, usable control scale, collapsed environment panel, task source writeback, object 360, global search and jump, search shortcut, role-isolated recent searches, role-filtered search visibility, notifications, opened-page tabs, saved views, permission visibility, global audit entry, configuration release-package closure, risk-case closure, report-operation closure, integration-health closure, data-governance closure, and the TradeMaster shell correction. The former all-page deep interaction workbench was removed after review because it duplicated page-specific filters, stage boards, tables, drawers, and task queues.

The configuration center now opens on the complete business configuration version list. Version rows support view, edit, copy, and new-version actions; edit/copy create a new pending draft and preserve the source version. Non-versioned runtime, notification, interface, and integration parameters are isolated at `#/admin-config/system`; saving them writes system-configuration audit only and does not create a business version.

The current development handoff for the business-configuration pages is recorded in [business-config-layout-fields-v0.3.md](business-config-layout-fields-v0.3.md). It defines the five-domain information architecture, 20 subgroup field contracts, final version statuses, subgroup-level version model, field-control matrix, R0-R3/C0-C4 boundary, D1-D10 controls, approval and audit contracts, API/data-model examples, page states, error codes, and acceptance tests. [business-config-layout-fields-v0.2.md](business-config-layout-fields-v0.2.md) remains the previous design draft, while [business-config-mock-layout-fields-v0.1.md](business-config-mock-layout-fields-v0.1.md) remains the implementation snapshot for comparing the current Mock against the design.

## TradeMaster UI/UX Standard

Shared table column containment, overflow behavior, tooltip preservation, and browser regression scope are recorded in [table-column-boundaries-v1.2.md](table-column-boundaries-v1.2.md). Run `npm run test:admin-tables` for the representative admin table checks.

The prototype-local visual and interaction contract is recorded in [trademaster-ui-ux-standard-v0.1.md](trademaster-ui-ux-standard-v0.1.md). It combines the user-specified reference site, `clone-page` evidence, and the already captured logged-in computed-style baseline in `DESIGN-ADMIN.md`.

## Admin Menu Blueprint

The current high-frequency sidebar blueprint is recorded in [admin-menu-blueprint-v0.2.md](admin-menu-blueprint-v0.2.md). The sidebar renders 10 groups and 20 entries, including dedicated system settings and permissions/audit entry points; low-frequency rules, views, governance actions, and legacy aliases remain available through page tabs, drawers, queues, global search, and compatible URLs. The 21 consolidated module pages continue to use one unified module route with business-specific actions, filters, detail workflows, and role-aware behavior. The previous 10-group/75-entry blueprint remains available as historical reference in [admin-menu-blueprint-v0.1.md](admin-menu-blueprint-v0.1.md).

## Page Implementation Inventory

The page-by-page development handoff is recorded in [admin-page-implementation-inventory-v0.1.md](admin-page-implementation-inventory-v0.1.md). It covers the global shell, dashboard, 30 existing business tabs, 21 consolidated module pages, global audit, and horizontal drawers. Every menu entry documents its route, purpose, data source, filters, components, layout, and primary action. Business paths remain in the relevant detail drawers; there is no shared deep interaction workbench layer.

The customer-service page now uses `admin-dev.html#/tickets` and replaces the previous support-ticket presentation. Its current implementation, 21 local service operations, 23 passing browser cases, 98 service assertions, screenshots, acceptance coverage and outstanding cross-end/production work are recorded in [customer-service-mock-delivery-v0.1.md](customer-service-mock-delivery-v0.1.md). This page uses the unified prototype's in-memory service, not the HTTP mock API described above.

## Session Scope

This repository/session boundary is recorded in [SESSION-SCOPE.md](SESSION-SCOPE.md). Current work is limited to the operations admin mock prototype.

## Prototype Delivery Rule

The permanent admin prototype delivery rule is recorded in [PROTOTYPE-DELIVERY-RULE.md](PROTOTYPE-DELIVERY-RULE.md). Admin work must be delivered inside the unified mock prototype and API/data architecture; standalone HTML design pages are prohibited.
