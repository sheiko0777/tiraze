# Catalogue import

A catalog-role staff session with verified email, TOTP and a current 15-minute step-up can validate CSV in /ar/admin or /en/admin. The role is checked at the server on every request.

Download/construct headers from IMPORT_COLUMNS in packages/core/src/catalogImport.ts. Fields: sku_code, product_key, slug_ar, slug_en, title_ar, title_en, description_ar, description_en, category, kind, width_cm, length_cm, color, material, technique, origin_note, price_egp, quantity, unique_piece, weight_g, package_length_cm, package_width_cm, package_height_cm, image_urls, image_alt_ar, image_alt_en, status.

UTF-8; quote fields containing commas/newlines; double embedded quotation marks. At most 1000 rows and 1.5 MB in the staff browser form. Multiple rows can share a product_key for variants, but every product-level field must agree. SKU codes are unique and existing products use the editor rather than a second import. A unique piece has at most one unit. Money has no more than two decimal places. Published rows need provenance text. Images must be HTTPS on an approved MEDIA_HOSTS domain, with Arabic and English alternatives. Separate image URLs with a pipe. No remote image is fetched by the importer.

1. Validate the file and review all row errors; any error rejects the file.
2. Review the reported row/product count and import ID.
3. Approve the import explicitly. The browser stages one SKU per guarded D1 transaction and displays progress.
4. Resume the same ID after a network interruption. Do not start a duplicate import.
5. Publication is one final transaction after all rows are staged. Until then the products are drafts. Successful replay does not duplicate stock.

New imported records are intended merchant data. Use only verified prices, quantities, materials, provenance and owned/licensed images. Never upload test data to a merchant environment. Production CSV/image quality and 1000-row import throughput still need staging acceptance; the current automated volume test covers catalogue queries rather than import throughput.

Price edits affect new checkout snapshots; existing orders retain their lines. Inventory corrections require a reason and create a ledger/audit record. Returned stock is restored only after physical inspection through an explicit adjustment.
