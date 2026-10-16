# TIRAZE — 16 October 2026

54/54 isolated rendering and interaction checks; 5/5 real Edge browser scenarios. See docs/IDENTITY-IMPLEMENTATION.md and qa/browser-report.json. Reports below are preserved IRTH history.

# IRTH preview — validation record

## IRTH Collectibles subbrand revision — 16 September 2026

Applied the endorsed IRTH Collectibles lockup, Liana lettering, parent-house navigation, homepage copy, page titles and mobile gallery spacing fixes. Added a parent-store Shopify entry section and SUBBRAND-INTEGRATION.md. Validation: 81/81 file, font, syntax, schema and HTTP checks; 69/69 isolated rendering and interaction checks. The original logo's Gourmet lettering is a raster image, so Liana is a reference-site script choice, not a verified identification of the logo font.

Post-edit browser checks subsequently succeeded: screenshots reviewed the Arabic mobile hero/header, product cards, menu, philosophy and craft inset at 390 × 844, plus the desktop hero/header at 1280 × 900. The script font computed as Liana. At 320px the brand occupied x13–184.4, the bag group x209–244 and the menu x255–292, without overlap. No horizontal overflow at 320, 390, 1280 or the restored 1440px viewport. The mobile collector measured 946.875px and FAQ 650px, resolving the prior measured height differences. The parent-house URL was present in navigation and footer. These are sampled visual checks, not full pixel parity or device certification. Shopify installation, checkout integration and visual testing of the Liquid section remain future steps.

## Current revision — 16 September 2026

The homepage and mobile footer now follow the measured Jannat reference geometry. See MOBILE-COMPARISON.md for the changes and source font choices. After the footer update, 77/77 file, font, syntax and HTTP checks and 69/69 isolated rendering/interaction checks passed. The earlier browser checks below describe previous revisions: final screenshots of this rebuilt version remain unverified because browser connections repeatedly time out. No pixel-identical claim is made. The opening video is still 3.008 seconds and remains a production-quality gap.

Reference: https://jannat-shop.ru/ and the locally captured Jannat-Offline site. Source live page content was rechecked after the user supplied the URL.

## Browser checks completed

- Desktop home: navy/ivory palette, centered cinematic introduction, brand philosophy, editorial craft image, illustrated collection area, full-width new-edition section, product cards, dark gallery, FAQ and contact/footer reviewed.
- Catalog initially rendered four pieces. Selecting the Kiswah category returned the pendant and keyring only.
- Pendant favourite toggled on and remained selected on the product detail page.
- Long-chain option added to the selection with the correct label. Quantity increased from 1 to 2.
- A synthetic preview request using `preview@example.com` was saved locally with the long-chain option and quantity 2.
- Reload preserved the saved request. Switching to English translated the selected item and option correctly.
- Hero video decoded and played: readyState 4, paused false, 1920×1080.
- Local fonts reported loaded after downloading and reloading.
- Desktop home had scroll width 1265 at viewport width 1280 (no horizontal overflow).
- Mobile home at 390×844 had scroll width 375 (no horizontal overflow); Arabic header, centered hero and film control were visually reviewed.

## Changes after those sampled browser checks

- Two additional carpet concepts were added: Safaa and Rawda, bringing the catalog to six pieces.
- Homepage document title was corrected to avoid duplicated brand wording.

## Scope of evidence

The browser checks are sampled manual checks, not exhaustive parity testing. The original live browser tab later timed out; its content was available through the web reader. The final static and HTTP results, when run, are written to `verification.json`.

The test request and selection were created only in the agent's local browser preview. They are not shipped in source files and were never sent to an external service.

No live payment, real order, real form delivery, physical mobile device, Safari or production Shopify integration was tested. This is not a pixel-identical certification against all Jannat pages.

Final verification: 53/53 static and HTTP checks passed. The live Jannat website was subsequently opened successfully and its hero and collection composition were reviewed. Twelve main IRTH pages were checked in the browser with expected headings, no broken loaded images and no horizontal overflow. Safaa search and corrected image zoom passed. Synthetic request data was removed before delivery.

## فحص تحديث رحال والشعار

تم التحقق بصرياً من شعار إرث الأصلي على الرئيسية، ومجموعة رحال (3 قطع)، وصفحة مجسم باب الكعبة، والتبديل بين صورته وتفاصيله، وفتح الصورة المكبرة. تم التحقق من إضافة المجسم إلى حقيبة الاختيارات بالاسم والصورة الصحيحين. انتهت فحوص الملفات والصياغة وروابط 31 صفحة بنتيجة 63/63.

تأخر اتصال أداة المتصفح أثناء الفحص الأخير؛ لم تكتمل إعادة فحص الموبايل والإنجليزية بعد إضافة رحال. فحوص الموبايل والإنجليزية السابقة تخص النسخة الأساسية. وقد تبقى قطعة المجسم التجريبية في حقيبة المعاينة المحلية ويمكن إزالتها من الحقيبة؛ لا يوجد طلب مرسل أو دفع.

بعد الترتيب النهائي للمجموعات وإضافة نسبة صور رحال إلى نص التوثيق، أُعيد فحص الملفات وصياغة JavaScript بنجاح. إعادة فحص HTTP توقفت عند `/collections/gifts` بسبب انتهاء مهلة الاستجابة (37 فحصاً ناجحاً من 38 منفذاً)، لذلك لا تُعد جولة التحقق الأخيرة مكتملة. نتيجة 63/63 أعلاه تخص الجولة السابقة لتعديلات الترتيب والنص النهائية. يحتفظ `verification.json` بنتيجة الجولة الأحدث دون إخفاء المهلة.
