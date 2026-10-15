# TIRAZE source consolidation — 16 October 2026

## Sources

- Upstream: https://github.com/sheiko0777/jannat
- Upstream HEAD: 9dfa2b2a6648d1a9c4cec5e7eafee68d1b76c0a3
- Destination: https://github.com/sheiko0777/tiraze
- Local sources: sibling Irth-House and Tiraze-Concepts folders, plus original generated logo references.

Upstream history is retained in the local checkout. The destination receives a verified source snapshot through the connected GitHub API because local Git authentication belongs to another account. Only the new checkout's origin was changed to TIRAZE. The original IRTH project and repository were not changed.

## Reconciliation

Compared 103 non-runtime local files. After line-ending normalization, meaningful overlapping differences were limited to README.md, serve.py and tools/README.md. Retained the newer upstream versions, including automatic media restoration.

Verified nine local media masters against the upstream SHA-256 manifest and restored them locally: carpet.png, hero.mp4, hero.png, keyring.png, rawda.png, rihal-kaaba-box.jpg, safaa.png, silk-detail.png and silk-editorial.png. Exact bytes remain reproducible from tracked source-master parts; restored copies are ignored to avoid duplicate storage.

Excluded the local upload helper because it hard-codes the old repository. Runtime logs, PIDs, ZIP snapshots, credentials, private Shopify exports and the raw third-party Jannat mirror were not imported.

## Design references

Preserved four generated homepage concepts and the selected third wordmark board. Navy supersedes the earlier burgundy sample. Raster references are not final vector assets; favicon/app exports remain future work.

## Scope

This consolidation establishes the new repository foundation. The inherited IRTH catalog and Shopify files remain source material. No deployment, DNS change or live Shopify modification is included.

## Validation for this import

- 69/69 inherited rendering and interaction checks passed.
- All nine local masters match SHA-256 manifest entries.
- All nine tracked multipart masters reassemble to matching size and SHA-256.
- Credential-pattern scan of text source found no matches.
- No browser visual verification was needed for this source-only import; site appearance remains inherited.
