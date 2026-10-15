# TIRAZE — طيراز

Project foundation for **tiraze.net**, a luxury brand specializing in handmade silk rugs.

Combines the latest published sheiko0777/jannat source, verified local media masters and TIRAZE design references. Upstream Git history is retained locally; GitHub receives a verified source snapshot through the connected API.

## Current stage

Source consolidation is complete. The runnable site remains the inherited **IRTH Collectibles** implementation. Applying TIRAZE branding, the rug-only catalog and content is the next stage. Images in brand/ are concepts, not implemented screenshots or production vector logos.

## Approved identity

- Wordmark: option 3, title-case **Tiraze**, warm serif lettering.
- Secondary signature: **Silk Rugs**, small and subordinate.
- Navy: #101C2E. Ivory: #F5F1E8. Muted gold: #B49A6A.
- Favicon/app concept: navy field with light T derived from the selected lettering. Final exports still need to be drawn.
- Domain: tiraze.net, shown separately from the primary wordmark.

The selected wordmark reference is burgundy because it predates the navy decision; navy supersedes its sample color.

## Local preview

    python -X utf8 serve.py 8090

Open http://localhost:8090. The server restores original media from tracked parts and checks SHA-256 hashes. No package installation or build step is required. The inherited preview stores selections locally and does not submit orders or take payments.

## Files

- app.js, data.js, index.html, styles and assets/: inherited website.
- assets/source-masters/: original media parts with SHA-256 manifest.
- brand/concepts/: four homepage concepts and generation notes.
- brand/selected-wordmark-reference.png: chosen lettering and icon concept board.
- brand/selected-homepage-reference.png: chosen homepage concept.
- docs/SOURCE-MIGRATION.md: provenance, reconciliation and validation.
- docs/legacy/IRTH-BASELINE-README.md: original operating notes.
- integration/shopify/: inherited IRTH reference, not a TIRAZE deployment.

## Checks

    node tools/check_interactions.mjs

The inherited tools/verify.py contains IRTH-specific expectations and assumes port 8088. Historical reports remain baseline evidence, not new TIRAZE validation.

The original IRTH checkout and repository remain independent. Fonts, imagery and partner branding retain their original ownership; this import does not grant an open-source license.
