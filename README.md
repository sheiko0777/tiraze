# TIRAZE — طيراز

Project foundation for **tiraze.net**, a luxury brand specializing in handmade silk rugs.

Combines the latest published sheiko0777/jannat source, verified local media masters and TIRAZE design references. Upstream Git history is retained locally and in the destination repository.

## Current stage

TIRAZE identity is implemented across the bilingual site. The active catalog contains three silk rug concepts; navigation, stories, care content, storage, metadata and app icons use the new brand. See docs/IDENTITY-IMPLEMENTATION.md for changes and validation. Images in brand/ remain earlier design concepts; qa/ contains actual website screenshots.

## Approved identity

- Wordmark: option 3, title-case **Tiraze**, warm serif lettering.
- Secondary signature: **Silk Rugs**, small and subordinate.
- Navy: #101C2E. Ivory: #F5F1E8. Muted gold: #B49A6A.
- Favicon/app icons: navy field with a simplified ivory T; SVG plus 192px, 512px and Apple 180px PNG exports.
- Domain: tiraze.net, shown separately from the primary wordmark.

The selected wordmark reference is burgundy because it predates the navy decision; navy supersedes its sample color.

## Local preview

    python -X utf8 serve.py 8090

Open http://localhost:8090. The server restores original media from tracked parts and checks SHA-256 hashes. No package installation or build step is required. The inherited preview stores selections locally and does not submit orders or take payments.

## Files

- app.js, data.js, index.html, tiraze.css and assets/: implemented TIRAZE website.
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
