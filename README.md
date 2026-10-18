# TIRAZE — تيراز

Project foundation for **tiraze.net**, a luxury brand specializing in handmade silk rugs.

Combines the latest published sheiko0777/jannat source, verified local media masters and TIRAZE design references. Upstream Git history is retained locally and in the destination repository.

## Engineering standards

The Arabic name is **تيراز**. The commercial launch must include real online payments and orders. The current site is still a local preview.

- [Engineering guidelines](docs/ENGINEERING-GUIDELINES.md)
- [Full implementation plan](docs/IMPLEMENTATION-PLAN.md)
- [Implementation status and verified checks](docs/IMPLEMENTATION-STATUS.md)
- [Custom Egypt commerce decision](docs/decisions/0002-custom-egypt-commerce.md)
- [Launch gates](docs/LAUNCH-CHECKLIST.md)
- [Current engineering baseline](docs/ENGINEERING-BASELINE.md)
- [Review of supplied references](docs/REFERENCE-REVIEW.md)
- [Architecture decision](docs/decisions/0001-commerce-launch-boundaries.md)

## Current stage

The custom commerce application now runs locally: bilingual Astro SSR storefront, verified accounts/TOTP, server cart, guarded order/payment/inventory services, staff workflows and a jobs worker. Checkout and mail are closed by default. This is a development implementation, not a merchant-verified production release. See [status and evidence](docs/IMPLEMENTATION-STATUS.md).

~~~powershell
pnpm install --frozen-lockfile
pnpm setup:local
pnpm dev
~~~

Open the printed local URL, normally http://localhost:4321/ar. For the built preview run pnpm build, then pnpm --filter @tiraze/web preview --host 127.0.0.1 --port 4330. Details: [local setup](docs/runbooks/local-development.md), [operations](docs/runbooks/operations.md), [catalogue import](docs/runbooks/catalog-import.md), [backup/restore](docs/runbooks/backup-restore.md), [implementation ADR](docs/decisions/0003-local-commerce-implementation.md).

Run pnpm typecheck, pnpm test and pnpm build. With the built preview running on port 4330, pnpm test:e2e exercises the actual browser. No remote resources or paid plans are provisioned by these commands. The following preview remains independent.

TIRAZE identity is implemented across the bilingual site. The active catalog contains three silk rug concepts; navigation, stories, care content, storage, metadata and app icons use the new brand. See docs/IDENTITY-IMPLEMENTATION.md for changes and validation. Images in brand/ remain earlier design concepts; qa/ contains actual website screenshots.

## Approved identity

- Wordmark: option 3, title-case **Tiraze**, warm serif lettering.
- Secondary signature: **Silk Rugs**, small and subordinate.
- Navy: #101C2E. Ivory: #F5F1E8. Muted gold: #B49A6A.
- Favicon/app icons: navy field with a simplified ivory T; SVG plus 192px, 512px and Apple 180px PNG exports.
- Domain: tiraze.net, shown separately from the primary wordmark.

The selected wordmark reference is burgundy because it predates the navy decision; navy supersedes its sample color.

## Legacy local preview

    python -X utf8 serve.py 8090

Open http://localhost:8090. The server restores original media from tracked parts and checks SHA-256 hashes. No package installation or build step is required. The inherited preview stores selections locally and does not submit orders or take payments.

## Files

- apps/web/: SSR storefront, account and staff application; apps/jobs/: scheduled worker.
- packages/core/ and packages/db/: validated rules, data services, migrations and test fixtures.
- app.js, data.js, index.html, tiraze.css and assets/: preserved legacy identity preview and editorial source.
- assets/source-masters/: original media parts with SHA-256 manifest.
- brand/concepts/: four homepage concepts and generation notes.
- brand/selected-wordmark-reference.png: chosen lettering and icon concept board.
- brand/selected-homepage-reference.png: chosen homepage concept.
- docs/SOURCE-MIGRATION.md: provenance, reconciliation and validation.
- docs/legacy/IRTH-BASELINE-README.md: original operating notes.
- integration/shopify/: inherited IRTH reference, not a TIRAZE deployment.

## Checks

    node tools/check_interactions.mjs

54 isolated checks pass. Real browser verification uses tools/check_browser.cjs with Playwright available; 5 scenarios passed in Edge at desktop and mobile sizes. Browser screenshots and report are in qa/.

The inherited tools/verify.py contains IRTH-specific expectations and assumes port 8088. Historical reports remain baseline evidence, not new TIRAZE validation.

The original IRTH checkout and repository remain independent. Fonts, imagery and partner branding retain their original ownership; this import does not grant an open-source license.
