# Affiliate User Mock

Public static demo for `affiliate.evecha.cn`. The site implements the fourteen Affiliate user-side pages defined by the product page specifications. All account names, client IDs, campaigns, commissions, assets, and amounts are synthetic.

## Pages

- `#/dash` Dashboard
- `#/perf` Performance data
- `#/clients` Client data with conversion milestones and commission details
- `#/summary` General statistics with six summary cards and grouped reporting
- `#/promo` Campaigns and Sub IDs
- `#/subchannels` Subchannel creation, state, links, and performance details
- `#/deep` Deep links
- `#/tracker` Postback configurations, generated/manual templates, parameter mappings, local tests, and delivery history
- `#/assets` Asset library
- `#/pay` Earnings and withdrawals
- `#/lookup` Attribution lookup
- `#/wd` Withdrawal
- `#/apply` Partner program: a six-step guide covering searchable multi-country commission tiers with top-reward defaults and bulk selection, desktop/mobile conversion rates, device-system support, creative-asset filters, system navigation entries, share-intro/deep-link actions, and a persistent bottom action bar
- `#/onboarding` Onboarding application: email verification, profile confirmation, simulated KYC, three agreement documents, and pending-review submission

Login follows the approved CRM visual language with the full-page exported background (`assets/login-bg.jpg`) and a centered white card; the card height adapts to its content to avoid excessive vertical spacing. Registration keeps the CRM split layout: the left side is the exported brand visual (`assets/auth-visual.jpg`) and the right side contains the registration form. Login uses email and password; registration uses email, password, confirm password, and country, followed by the required legal declaration.

The demo login is a presentation gate only, not authentication. A successful mock registration is stored in the current browser session and returns to the login form with the email prefilled.

Hover the top-right account avatar to open account management and logout. Account management opens as a fullscreen mock dialog and saves editable profile fields to the current browser session; logout clears the demo session.

The normal user view keeps internal scenario controls out of the visible top bar.

## Reporting

Performance and general statistics share 20 selectable dimensions, with at most two selected at a time. Date/week/month/year are mutually exclusive. The source contains 1,440 deterministic synthetic visit records, including 960 unique clients over 90 days. All groupings, filters, totals, rates, sorting, pagination, milestone drilldowns, and CSV exports use this source. Email addresses stay masked in views and exports.

Date filters select click-attribution cohorts; subsequent conversion milestones are observed through October 27, 2026, in UTC+08:00. These are cohort results, not counts of conversion events occurring in the selected dates. Commission statuses and attributed device/source fields demonstrate interaction only; production field mappings and event ingestion remain subject to the approved backend contracts.

```bash
npm run test:reports-data
npm run test:reports
```

The browser check uses the local server on port 4179 by default; `REPORT_BASE_URL` can target another local preview. Screenshots are written to `.artifacts/reports-*.png`.

## Local Run

```bash
npm run check
npm run serve
```

Open `http://127.0.0.1:4179`.

## UI Check

With Playwright available to Node:

```bash
npm run test:ui
npm run test:postbacks
npm run test:dashboard-postbacks
```

The check covers login and registration validation, mock registration success, login, the account dropdown, fullscreen account management, logout, all fourteen routes, performance filters and grouping, client details, campaign creation, subchannel state and details, tracker creation and state changes, appeals, attribution lookup, asset unlock, the five-step onboarding application, the six-step partner program, withdrawal records, empty/error mock states, English navigation, and desktop/mobile layout bounds. It also fails on console errors and failed requests.

The focused Postback check covers receiver URL validation, generated and manual templates, click parameter mapping, editing and cancellation, session persistence, simulated success/failure/timeout, retry identity, paused configurations, and desktop/mobile layouts. Screenshots are written under `.artifacts/`.

## Postbacks

The dashboard (`#/dash`) provides a "Connect your ad tracker" panel beside the tutorial. It includes a custom platform and Binom, RedTrack, Voluum, Keitaro, Affise, PeerClick, BeMob, Trackier, and FunnelFlux. Each entry opens configuration directly on the dashboard. Platform logos are local crops from the user-supplied reference screenshot; their presence indicates a setup entry, not a verified production integration.

The partner supplies their own receiver URL. Named platforms start with an empty manual template; custom setup offers generated mappings. Dashboard indicators show local configuration counts or paused status. Open `#/tracker` under Campaigns to manage the same configurations and delivery history, saved in the current browser session. `{aff_cid}` identifies an event, `{aff_client}` is an opaque client reference, and click parameters such as `{clickid}` identify the original click.

Tests are local simulations. They render synthetic requests and responses without making requests to the configured receiver. A successful local test is not proof of live integration or commission approval. Production event definitions, delivery timing, signatures, authorization, retry policy, and server-side destination validation require a separate backend contract. The loyal-client event stays unavailable until its business definition is confirmed.

## Safety

- No internal product documents, competitor research, screenshots, WorkBuddy records, or CRM archives are published.
- No real customer data or credentials are stored in this repository.
- Email addresses and phone numbers are always masked in displayed CRM-derived data; precise matching must happen only in a controlled backend service.
- Business parameters remain synthetic; pending values must not be treated as approved policy.
