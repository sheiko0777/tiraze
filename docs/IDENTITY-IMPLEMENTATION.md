# TIRAZE identity implementation — 16 October 2026

Approved direction: title-case Tiraze wordmark (option 3), Silk Rugs signature, navy #101C2E, ivory #F5F1E8, muted gold #B49A6A.

Implemented: header, homepage, mobile menu, footer, Arabic/English content, page titles/description, favicon, app icons and web manifest. The active catalog contains three rug concepts (Noor, Safaa, Rawda), grouped into navy, ivory and botanical edits. Search, favourites, selection bag and local request drafts use the isolated tiraze- storage namespace.

Removed IRTH endorsement and non-rug products from the active experience. Legacy source and Shopify integration remain in history/reference files. No live store or DNS was changed. Requests remain local preview drafts.

The original hero video includes the former brand's keepsakes, so this edition uses a newly generated still rug photograph. The original video is preserved with the inherited source masters.

## Asset generation

Built-in image_gen mode was used for these two edits:
- assets/tiraze-wordmark.png: preserve only the selected board's title-case Tiraze lettering; change burgundy to solid navy; output a single horizontal wordmark with transparent alpha, no icons or secondary text.
- assets/tiraze-hero.png: preserve the source rug, wood, cinematic lighting and palette; remove keepsake box, beads, pendant and IRTH lettering; fill naturally with dark wood and folded silk rug edges, keeping room for website text.

The wordmark is a transparent raster asset used as a CSS mask for exact solid-color navy/ivory versions. It is not represented as a vector master. The native SVG T favicon/app artwork is a simplified companion drawing; PNG sizes are 192px, 512px and Apple 180px.

## Validation

- 54 isolated rendering/interaction checks passed in Arabic and English.
- 5 real Edge headless browser scenarios passed: widths 1440/390/320 with full image decode and no horizontal overflow; mobile menu → catalog → ivory filter → product → selection bag; language switch to English.
- No browser JavaScript errors or asset HTTP failures.
- Actual screenshots and browser report: qa/. These are implemented-site captures, distinct from the earlier generated brand/concepts images.

Preview: http://localhost:8090
