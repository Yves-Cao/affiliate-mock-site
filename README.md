# Affiliate User Mock

Public static demo for `affiliate.evecha.cn`. The site implements the ten Affiliate user-side pages defined by the product page specifications. All account names, client IDs, campaigns, commissions, assets, and amounts are synthetic.

## Pages

- `#/dash` Dashboard
- `#/perf` Performance data
- `#/clients` Client list
- `#/promo` Campaigns and Sub IDs
- `#/deep` Deep links
- `#/assets` Asset library
- `#/pay` Earnings and withdrawals
- `#/lookup` Attribution lookup
- `#/wd` Withdrawal
- `#/apply` Partner application

The demo login accepts any non-empty username and password. It is a presentation gate only, not authentication.

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
```

The check logs in, visits all ten routes, exercises performance filters and grouping, client details, campaign creation, Sub ID state, appeals, attribution lookup, asset unlock, the five-step application, withdrawal records, English navigation, and desktop/mobile layout bounds. It also fails on console errors and failed requests.

## Safety

- No internal product documents, competitor research, screenshots, WorkBuddy records, or CRM archives are published.
- No real customer data or credentials are stored in this repository.
- Business parameters remain synthetic; pending values must not be treated as approved policy.
