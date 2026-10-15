# IRTH Collectibles — إرث مقتنيات

A bilingual luxury collectibles experience for **IRTH HOUSE**: handwoven silk rugs, objects with a story, and a curated RIHAL collaboration. This repository preserves the working prototype, original visual assets, design decisions, review history, verification tools and Shopify integration source.

## Run locally

```sh
python -X utf8 serve.py 8088
```

Open http://localhost:8088. Windows users can run `START-WINDOWS.bat`. Python 3 is required; no framework installation or build step is needed. JavaScript modules require HTTP, so do not open `index.html` directly.

Large original media files are stored as byte-exact parts under `assets/source-masters/` because the GitHub upload connection rejects multi-megabyte requests. `serve.py` restores those assets on first launch and checks their SHA-256 hashes. To restore them without starting the server, run `python tools/restore_large_assets.py`. The optimized WebP images remain directly usable. Do not rerun `tools/pack_large_assets.py` after cloning; it is the one-time upload preparation script.

## Design philosophy

The parent is **IRTH HOUSE**, the endorsed subbrand is **IRTH Collectibles / إرث مقتنيات**. The original gold IRTH emblem remains intact. A restrained navy and ivory palette, large editorial photography, generous spacing, craft storytelling and deliberate mobile section proportions carry the collection's identity. The parent house remains reachable from navigation, the mobile menu and footer.

[Jannat](https://jannat-shop.ru/) is the visual reference for rhythm, palette, typography and layout, with original IRTH collection content and imagery. Its Gourmet wordmark is a raster image: Liana is verified elsewhere on that reference site, but has **not** been established as the exact Gourmet logo typeface. It is used here as a stylistic approximation for Collectibles. Arabic headings use the parent house's Sakkal Seta font; English display text uses TTDrugs, with Raleway and locally supplied Arabic body fonts.

There is no claim of complete pixel equivalence. `MOBILE-COMPARISON.md` and `QA-REPORT.md` distinguish measured changes from visual checks and remaining limits. The hero film is approximately three seconds long. Product concept photography does not establish provenance or authenticity of physical pieces.

## Architecture and features

- Plain HTML, CSS and JavaScript ES modules; Python preview server with history fallback.
- `app.js`: bilingual rendering, client routing, menus, product gallery, search/filter/sort, favourites, selection bag and local inquiry draft.
- `data.js`: nine preview products, five collections, editorial stories and FAQs. RIHAL items retain partner attribution.
- Styles cascade in the order in `index.html`: foundation, refinements, reference geometry and subbrand rules. Preserve this order.
- All display assets are local, including original PNGs, optimized WebP/JPEG images, fonts and MP4.
- Language, favourites, selections and inquiry drafts use browser local storage. The prototype does not take payment or submit an order to a server.
- `integration/shopify/`: theme integration source. Deployment status and boundaries are documented separately; presence of source is not proof of deployment.

## Verification

With the preview server running:

```sh
python -X utf8 tools/verify.py
node tools/check_interactions.mjs
```

The verifier also uses Node and FFprobe. Latest pre-integration baseline: **81/81 structural checks and 69/69 interaction checks**. Interaction checks use DOM/storage doubles, not a substitute for browser visual review. Mobile and desktop sampled visual checks are recorded in `QA-REPORT.md`.

## Documentation

| Document | Purpose |
| --- | --- |
| [README-AR.md](README-AR.md) | Arabic operating notes and delivery history |
| [SUBBRAND-INTEGRATION.md](SUBBRAND-INTEGRATION.md) | Brand architecture and Shopify integration boundaries |
| [MOBILE-COMPARISON.md](MOBILE-COMPARISON.md) | Reference measurements and responsive decisions |
| [QA-REPORT.md](QA-REPORT.md) | Verification evidence and limits |
| [DESIGN-REVIEW.md](DESIGN-REVIEW.md) | Earlier design review; later reports take precedence |
| [ASSET-PROMPTS.md](ASSET-PROMPTS.md) | Original image direction and prompts |
| [ASSET-REFINEMENT-20260914.md](ASSET-REFINEMENT-20260914.md) | Editorial asset refinement history |
| [RIHAL-SOURCES.md](RIHAL-SOURCES.md) | Partner image and product attribution |
| [tools/README.md](tools/README.md) | Tooling and one-time migration notes |

## Repository boundaries

Includes the IRTH implementation, source visuals, working assets and development history documents. Duplicate ZIP releases, runtime logs, personal machine paths, raw third-party site mirrors, credentials and private Shopify exports are excluded. The separate Jannat offline mirror is a research input, not IRTH source. No open-source license is implied for the brand, reference fonts or partner imagery.

Shopify work must target an **unpublished duplicate** of the current live theme. Publishing, changing live theme files and enabling real commerce for unapproved concept products are separate decisions. Theme changes alone do not validate payment, shipping or third-party app operation.
