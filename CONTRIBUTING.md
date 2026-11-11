# Contributing

## Source of truth

1. Business decisions come from the Affiliate master project and are summarized in `docs/confirmed-decisions.md`.
2. Page structure comes from `docs/page-specs/`.
3. API behavior comes from `contracts/openapi-ui.json`.
4. Demonstration behavior comes from `mock/scenarios/`.
5. The frozen prototype under `prototype/` is read-only reference material.

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | Stable, tested contract and Mock package |
| `spec/*` | Page or business specification change |
| `contract/*` | OpenAPI or contract convention change |
| `feat/*` | Mock capability or future app feature |
| `fix/*` | Defect fix |

## Pull request checklist

- [ ] `npm test` passes.
- [ ] The PR links a Q/CFD-D/S number, or explains why it is mock-only.
- [ ] OpenAPI paths, schemas, examples, and tests stay consistent.
- [ ] Mock values that are not confirmed are marked `mock-only` or `pending`.
- [ ] No real account, customer, key, screenshot, competitor dump, or internal system URL is added.
- [ ] `release-manifest.json` is regenerated when a managed file changes.

## Definition of ready

- Business source is identified.
- Affected page specs are named.
- API path and fields are clear.
- Expected states and permissions are clear.
- Required Mock scenario is named or proposed.

## Definition of done

- OpenAPI updated when API behavior changes.
- Mock scenario updated when state or data changes.
- Traceability record updated or added.
- Tests cover the change.
- Documentation mentions any new command or behavior.
- Product reviewer and engineering reviewer approve as applicable.

## Versioning

The contract package uses semantic versioning:

- `PATCH`: clarifications, tests, fixture fixes, non-breaking documentation changes
- `MINOR`: additive fields, endpoints, scenarios, or enums
- `MAJOR`: removed or incompatible fields, enums, routes, or response envelopes
