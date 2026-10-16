# الدليل المرجعي الشامل لهندسة وتطوير وتصميم مواقع التجارة الإلكترونية الحديثة (نسخة السوق المصري والخليجي 2026)

يمثل هذا الدليل المرجعي وثيقة هندسية وتصميمية متكاملة لبناء منصة تجارة إلكترونية حديثة بمعايير عالمية، مع **تخصيص كامل للسوق المصري أولاً ثم التوسع الخليجي (السعودية والإمارات والكويت)**، وبناء معماري يعتمد على **الموبايل والتابلت أولاً (Mobile & Tablet-First)**، والفهرسة المتقدمة، والكاشينج متعدد الطبقات، وضغط الميديا الذكي، وتحمل الطلبات المليونية.

## 1. استراتيجية السوق المصري أولاً ثم التوسع الخليجي (Egypt-First & GCC Localization)

يتطلب النجاح في السوق المصري فهم واقع المدفوعات الرقمية واللوجستيات المحلية قبل التوسع إلى دول مجلس التعاون الخليجي؛ إذ تشير بيانات البنك المركزي المصري إلى وجود أكثر من **55.5 مليون محفظة إلكترونية (Meeza Digital)**، و**43.5 مليون بطاقة ميزة**، وأكثر من **16 مليون مستخدم لتطبيق InstaPay** بحجم معاملات يتجاوز 2.4 تريليون جنيه، بينما لا تتجاوز ملكية البطاقات البنكية التقليدية (Visa/Mastercard) نحو 10 إلى 12 مليون شخص ([Nilex Egypt Payment Gateways 2026](https://www.google.com/search?q=https%3A%2F%2Fnilexdigitalsystems.com%2Farticles%2Fpayment-gateways-egypt-paymob-fawry-instapay)).

### مقارنة البنية التحتية للمدفوعات والشحن والضرائب (مصر مقابل الخليج)

| المحور التشغيلي | السوق المصري (الأولوية الأولى - `ar-EG` / `EGP`) | السوق الخليجي (التوسع - `ar-SA`, `ar-AE`, `ar-KW`) |
| :--- | :--- | :--- |
| **وسائل الدفع الأساسية** | بطاقات **ميزة (Meeza)**، المحافظ الإلكترونية (Vodafone Cash, Orange Cash, e& money, WE Pay)، **InstaPay**، كود فوري النقدي (**Fawry Reference Code**)، البطاقات البنكية، Apple Pay، والدفع عند الاستلام (**COD**) ([Nilex 2026](https://www.google.com/search?q=https%3A%2F%2Fnilexdigitalsystems.com%2Farticles%2Fpayment-gateways-egypt-paymob-fawry-instapay)) | بطاقات **مدى (MADA)** في السعودية (إلزامية)، **KNET** في الكويت، **Apple Pay**، محفظة **STC Pay**، والبطاقات الائتمانية ([PaymentProviders UAE \& KSA 2026](https://www.google.com/search?q=https%3A%2F%2Fpaymentproviders.io%2Fblog%2Fbest-payment-gateways-uae-saudi-arabia)) |
| **الشراء الآن والدفع لاحقاً (BNPL)** | **valU** (تستحوذ على 25% من التمويل الاستهلاكي في مصر)، **Sympl**، **Souhoola**، **Halan**، **Contact / TRU** ([Nilex 2026](https://www.google.com/search?q=https%3A%2F%2Fnilexdigitalsystems.com%2Farticles%2Fpayment-gateways-egypt-paymob-fawry-instapay)) | **Tamara** (الأقوى في السعودية، 3–4 دفعات) و **Tabby** (الأقوى في الإمارات و5 دول خليجية)؛ ترفع متوسط السلة بنسبة 20%–40% ([PaymentProviders 2026](https://www.google.com/search?q=https%3A%2F%2Fpaymentproviders.io%2Fblog%2Fbest-payment-gateways-uae-saudi-arabia)) |
| **بوابات الدفع الموصى بها** | **Paymob** (أوسع تغطية للمحافظ والتقسيط وMarketplace)، **Kashier** (تسوية سريعة خلال 3 أيام عمل)، **FawryPay** (للدفع النقدي بالفروع)، و **Geidea** ([Kerolos Gad Egypt Gateways Comparison](https://www.google.com/search?q=https%3A%2F%2Fwww.kerolosxgad.com%2Fwriting%2Fpayment-gateways-egypt-comparison)) | **Tap Payments** (تغطية موحدة للخليج ومصر)، **HyperPay** (ممتازة للسعودية ومواسم الذروة)، **Moyasar** (تسوية T+1 لبطاقات مدى)، و **Checkout.com** ([PaymentProviders 2026](https://www.google.com/search?q=https%3A%2F%2Fpaymentproviders.io%2Fblog%2Fbest-payment-gateways-uae-saudi-arabia)) |
| **شركات الشحن واللوجستيات** | **Bosta**، **Mylerz**، **Aramex**، **J&T Express** (مع تقسيم التسعير: القاهرة والجيزة، الإسكندرية، الدلتا والقناة، الصعيد والبحر الأحمر) ([Weblak Cairo Ecommerce](https://www.google.com/search?q=https%3A%2F%2Fwww.weblak.net%2Fecommerce%2Fcairo)) | **SMSA Express**، **Aramex**، **DHL**، **SPL (البريد السعودي)**، **Quiqup** و **Fetchr/Jeebly** للتوصيل السريع نفس اليوم |
| **الضرائب والفوترة الإلكترونية** | ضريبة القيمة المضافة **14% VAT**، الربط مع منظومة **الإيصال الإلكتروني / الفاتورة الإلكترونية لمصلحة الضرائب المصرية (ETA)**، والالتزام بقانون حماية البيانات الشخصية رقم 151 لسنة 2020 ([Weblak Cairo](https://www.google.com/search?q=https%3A%2F%2Fwww.weblak.net%2Fecommerce%2Fcairo)) | السعودية: **15% VAT** والربط الإلزامي مع هيئة الزكاة والضريبة والجمارك (**ZATCA QR**) ([Saudi Developer Guide](https://www.google.com/search?q=https%3A%2F%2Flogiolegion.com%2Fblogs%2Fpayment-gateway-integration-saudi-arabia-developer-guide))؛ الإمارات: **5% VAT** |
| **موقع الاستضافة (Cloud Region)** | **أوروبا (Frankfurt / Milan / Marseille)** أو **الشرق الأوسط (AWS Bahrain / UAE)**؛ تجنب الاستضافة في أمريكا تماماً لأنها تسبب بطئاً ملحوظاً على شبكات الموبايل في مصر ([Weblak Cairo](https://www.google.com/search?q=https%3A%2F%2Fwww.weblak.net%2Fecommerce%2Fcairo)) | **AWS Middle East (Bahrain / UAE)** أو **Google Cloud Dammam / Doha** لضمان زمن استجابة (`Latency`) أقل من 25ms |

### قواعد هندسة المدفوعات والشحن في السوق المصري والخليجي
* **تصميم طبقة دفع قابلة للتبديل (Swappable Payment Adapter Pattern):** لا تربط كود المتجر مباشرة بـ API بوابة واحدة؛ بل صمّم واجهة برمجية موحدة (`PaymentProviderInterface`) توجه الطلب تلقائياً حسب عملة ودولة العميل (مثلاً: توجه طلبات `EGP` إلى **Paymob / Kashier / Fawry**، وطلبات `SAR` إلى **Moyasar / HyperPay / Tamara**، وطلبات `AED` إلى **Tap / Tabby**) ([Kerolos Gad Comparison](https://www.google.com/search?q=https%3A%2F%2Fwww.kerolosxgad.com%2Fwriting%2Fpayment-gateways-egypt-comparison)).
* **إدارة السيولة وزمن التسوية المالية (Settlement Lag Calculation):** في مصر، تسوية **Kashier** تستغرق نحو 3 أيام عمل بينما الخطة القياسية في **Paymob** أسبوعية؛ احسب دائماً رأس المال المحتجز عبر المعادلة: `(الإيراد الشهري ÷ 30) × أيام التسوية`، وراقب تأثير الرسوم الثابتة (مثل `2.75% + 3 EGP`) على الطلبات ذات القيمة المنخفضة ([Kerolos Gad Comparison](https://www.google.com/search?q=https%3A%2F%2Fwww.kerolosxgad.com%2Fwriting%2Fpayment-gateways-egypt-comparison)).
* **معالجة المدفوعات غير المتزامنة (Fawry Reference Code & InstaPay):**
  * عند اختيار العميل للدفع عبر **كود فوري (Pay at Fawry)**، ينشئ النظام الطلب في حالة `PENDING_PAYMENT` ويحجز المخزون لفترة محددة (مثلاً 24 ساعة) مع إلغاء الطلب وإرجاع المخزون تلقائياً إذا لم يصل إشعار الدفع الموقع (`Signed Webhook`) ([Nilex 2026](https://www.google.com/search?q=https%3A%2F%2Fnilexdigitalsystems.com%2Farticles%2Fpayment-gateways-egypt-paymob-fawry-instapay)).
  * لا تعتمد أبداً على صور الشاشة (Screenshots) لتأكيد تحويلات **InstaPay** في المتاجر ذات الطلبات العالية؛ اعتمد على الربط المؤتمت عبر بوابة الدفع أو التسوية البنكية الآلية ([Nilex 2026](https://www.google.com/search?q=https%3A%2F%2Fnilexdigitalsystems.com%2Farticles%2Fpayment-gateways-egypt-paymob-fawry-instapay)).
* **تقليل مرتجعات الدفع عند الاستلام (COD Return Reduction):**
  * تفعيل التحقق من رقم الموبايل عبر رسالة **WhatsApp / SMS OTP** تلقائية فور طلب الـ COD.
  * تقديم حافز واضح للدفع المسبق (مثل: "شحن مجاني أو خصم 5% عند الدفع بـ InstaPay أو المحفظة أو البطاقة") لتقليل نسبة الطلبات الوهمية والمرتجعات ([Nilex 2026](https://www.google.com/search?q=https%3A%2F%2Fnilexdigitalsystems.com%2Farticles%2Fpayment-gateways-egypt-paymob-fawry-instapay)).
  * هيكلة العناوين في مصر وفق: **المحافظة (Governorate) ← المدينة/المنطقة (City/District) ← الحي/الشارع ← علامة مميزة (Landmark)** لأن شركات الشحن المصرية (مثل Bosta و Mylerz) تعتمد بشكل كبير على تقسيم المناطق والعلامات المميزة لتسريع التوصيل.

## 2. التطوير والتصميم بمنهجية الموبايل والتابلت أولاً (Mobile-First & Tablet-First Engineering)

يمثل ترافيك الهواتف الذكية والتابلت أكثر من 75% إلى 85% من زيارات التجارة الإلكترونية في مصر والخليج (خصوصاً الزيارات القادمة من إعلانات TikTok و Instagram و Snapchat و Meta)، كما أن جوجل يعتمد حصرياً على نسخة الموبايل لتقييم وفهرسة الموقع بالكامل ([Google Mobile-First Indexing](https://www.google.com/search?q=https%3A%2F%2Fdevelopers.google.com%2Fsearch%2Fdocs%2Fcrawling-indexing%2Fmobile%2Fmobile-sites-mobile-first-indexing)).

### القواعد الهندسية والتصميمية للموبايل والتابلت (Mobile & Tablet UX/UI)
* **كتابة الـ CSS بمنهجية Mobile-First واستخدام Container Queries:**
  * اكتب الكود الأساسي دائماً للشاشات الصغيرة (`320px - 480px`)، ثم استخدم `@media (min-width: 768px)` للتابلت في الوضع الرأسي (Portrait)، و `@media (min-width: 1024px)` للتابلت في الوضع الأفقي (Landscape) والديسكتوب.
  * استخدم **CSS Container Queries (`@container`)** لتصميم بطاقات المنتجات بحيث تتكيف تلقائياً سواء عُرضت في شبكة من عمودين على الموبايل، أو 3 أعمدة على التابلت، أو داخل درج جانبي للسلة.
  * استخدم وحدات الارتفاع الديناميكية (`100dvh` و `100svh`) بدلاً من `100vh` التقليدية لمنع اختفاء الأزرار السفلية خلف شريط عنوان متصفح الموبايل (Safari iOS / Chrome Android).
* **بيئة عمل الإبهام وأهداف اللمس (Thumb-Zone Ergonomics & Touch Targets):**
  * **شريط الشراء السفلي الثابت (Sticky Bottom Add-to-Cart Bar):** تثبيت شريط سفلي أنيق في صفحة المنتج على الموبايل يحتوي على السعر، اختيار المقاس السريع، وزر "إضافة إلى السلة" ليبقى في نطاق حركة الإبهام طوال التمرير ([Baymard Product Page UX](https://www.google.com/search?q=https%3A%2F%2Fbaymard.com%2Fblog%2Fecommerce-ux-best-practices)).
  * **الأدراج السفلية بدلاً من القوائم المنسدلة (Bottom Sheets over Dropdowns):** فتح الفلاتر، الترتيب، اختيار المقاسات، وعربة التسوق المصغرة في نافذة تنزلق من أسفل الشاشة (`Bottom Sheet`) يسهل التحكم فيها بيد واحدة على الهاتف والتابلت.
  * **أبعاد أزرار اللمس القياسية:** الالتزام بمعيار [W3C WCAG 2.2 (2.5.8 Target Size)](https://www.google.com/search?q=https%3A%2F%2Fwww.w3.org%2FTR%2FWCAG22%2F) بحيث لا يقل أي عنصر قابل للمس عن **24×24 بكسل CSS** كحد أدنى، وتخصيص **44×44 بكسل إلى 48×48 بكسل** لأزرار الشراء والفلاتر وتحديد الكمية على الموبايل والتابلت.
  * **منع السلايدر المتحرك تلقائياً على الموبايل:** إيقاف التمرير التلقائي للبانرات (`Auto-rotating Carousels`) الذي يربك 52% من متسوقي الموبايل، واستبداله ببطاقات ثابتة أو معرض صور يدعم السحب باللمس (`Touch Swipe`) مع مؤشرات واضحة ([Baymard Guideline #957](https://www.google.com/search?q=https%3A%2F%2Fbaymard.com%2Fblog%2Fecommerce-ux-best-practices)).
* **تخصيص تجربة التابلت (Tablet-Specific Layout Optimization):**
  * عدم عرض نسخة الموبايل مكبرة بشكل مشوه على التابلت (`iPad / Galaxy Tab`)؛ بل اعتماد تخطيط هجين (2-Column Split Layout) في صفحة المنتج (معرض الصور على اليسار/اليمين وتفاصيل الشراء بجانبه) وشريط تنقل جانبي أو سفلي متكيف.
* **تهيئة لوحات مفاتيح الموبايل والأوتوفيل والتحقق السريع (`Mobile Input & WebOTP`):**
  * إجبار المتصفح على فتح لوحة المفاتيح المناسبة لكل حقل لتقليل الأخطاء المطبعية ([Baymard Guideline #1100](https://www.google.com/search?q=https%3A%2F%2Fbaymard.com%2Fblog%2Fcheckout-flow-ux-optimization)):
    * رقم الموبايل والبطاقة والرمز البريدي: `inputmode="numeric"` و `pattern="[0-9]*"`.
    * البريد الإلكتروني: `type="email"` مع إيقاف التصحيح التلقائي والأحرف الكبيرة (`autocorrect="off" autocapitalize="off"`).
  * تفعيل **WebOTP API** لقراءة كود التحقق المرسل عبر الـ SMS تلقائياً بضغطة واحدة في متصفح الموبايل (`autocomplete="one-time-code"`).
* **التحميل المتكيف مع سرعة شبكات الموبايل في مصر (Network-Aware Adaptive Loading):**
  * قراءة ترويسة `Save-Data` وواجهة `navigator.connection.effectiveType` في المتصفح؛ فإذا كان المستخدم متصلاً عبر شبكة موبايل ضعيفة (`3G` أو `2G` أو `saveData === true`)، يقوم الموقع تلقائياً بتحميل صور بجودة مضغوطة أعلى وإيقاف التحميل المسبق للفيديوهات.

### نموذج كود: حقول الدفع والتحقق المحسنة للموبايل (Mobile-First Checkout Inputs)
```html
<!-- حقل رقم الموبايل المصري/الخليجي مع فتح لوحة الأرقام تلقائياً -->
<div class="form-field">
  <label for="phone">رقم الموبايل (لإرسال تأكيد الطلب ومتابعة الشحنة)</label>
  <input
    id="phone"
    name="phone"
    type="tel"
    inputmode="numeric"
    autocomplete="tel"
    placeholder="01012345678"
    required
  />
</div>

<!-- حقل كود التحقق السريع (WebOTP API) يقرأ رسالة الـ SMS تلقائياً على الموبايل -->
<div class="form-field">
  <label for="otp">كود التأكيد المرسل في رسالة نصية</label>
  <input
    id="otp"
    name="otp"
    type="text"
    inputmode="numeric"
    autocomplete="one-time-code"
    maxlength="6"
    pattern="\d{6}"
  />
</div>
```

## 3. الفهرسة المتقدمة (Database, Instant Search & Google Mobile-First Indexing)

تعتمد سرعة استجابة المتجر وظهوره في نتائج البحث على ثلاث طبقات مترابطة من الفهرسة: فهرسة قاعدة البيانات، فهرسة محرك البحث الداخلي باللغة العربية، وفهرسة محركات البحث العالمية.

### أولاً: فهرسة قواعد البيانات العلائقية ([PostgreSQL Indexing Best Practices](https://www.google.com/search?q=https%3A%2F%2Fwww.postgresql.org%2Fdocs%2Fcurrent%2Findexes-types.html))
لضمان زمن استعلام أقل من `5ms` حتى مع وجود ملايين المنتجات والطلبات، يجب تصميم الفهارس بدقة وتجنب الفهرسة العشوائية التي تبطئ عمليات الكتابة:

* **الفهارس المركبة وترتيب الأعمدة ([Multicolumn B-Tree Indexes](https://www.google.com/search?q=https%3A%2F%2Fwww.postgresql.org%2Fdocs%2Fcurrent%2Findexes-multicolumn.html)):** رتب الأعمدة داخل الفهرس المركب بدءاً من العمود الذي يُفحص بالتساوي (`=`) ثم العمود الذي يُفحص بالنطاق أو الترتيب (`<, >, ORDER BY`)؛ مثل `(category_id, price)`.
* **الفهارس الجزئية لتقليل الحجم وتسريع التحديث ([Partial Indexes](https://www.google.com/search?q=https%3A%2F%2Fwww.postgresql.org%2Fdocs%2Fcurrent%2Findexes-partial.html)):** بدلاً من فهرسة جدول المنتجات أو الطلبات بالكامل (بما في ذلك المنتجات المحذوفة أو الطلبات المنتهية منذ سنوات)، أنشئ فهرساً جزئياً يقتصر على السجلات النشطة التي تستهدفها الاستعلامات الفعلية.
* **الفهارس الشاملة لمنع الرجوع للجدول الأصلي ([Covering Indexes / Index-Only Scans](https://www.google.com/search?q=https%3A%2F%2Fwww.postgresql.org%2Fdocs%2Fcurrent%2Findexes-index-only-scans.html)):** استخدم جملة `INCLUDE` لإرفاق الأعمدة المطلوبة للعرض في بطاقة المنتج (مثل الاسم، الصورة المصغرة، والرابط) داخل الفهرس نفسه.
* **فهارس GIN للخصائص الديناميكية والمصفوفات ([GIN Inverted Indexes](https://www.google.com/search?q=https%3A%2F%2Fwww.postgresql.org%2Fdocs%2Fcurrent%2Fgin.html)):** استخدم فهرس `GIN` على عمود `JSONB` الذي يخزن مواصفات المنتجات المتغيرة (مثل المقاسات، الألوان، سعة الذاكرة) لتسريع الفلترة متعددة الأوجه.

### نموذج كود SQL: الفهارس القياسية لمتجر إلكتروني ضخم في PostgreSQL
```sql
-- 1. فهرس جزئي وشامل (Partial + Covering Index) لصفحات الفئات وترتيب الأسعار
-- يقرأ البيانات مباشرة من الفهرس (Index-Only Scan) ويستبعد المنتجات غير النشطة أو النافدة
CREATE INDEX idx_products_active_catalog
ON products (category_id, price ASC)
INCLUDE (id, name_ar, slug, thumbnail_url, rating_avg, review_count)
WHERE status = 'published' AND stock_quantity > 0;

-- 2. فهرس GIN لفلترة خصائص المنتج الديناميكية (JSONB Faceted Filtering)
CREATE INDEX idx_products_attributes_gin
ON products USING GIN (attributes jsonb_path_ops)
WHERE status = 'published';

-- 3. فهرس جزئي للطلبات غير المدفوعة (لتسريع مهام إلغاء أكواد فوري والحجوزات المنتهية)
CREATE INDEX idx_orders_pending_expiry
ON orders (expires_at)
WHERE payment_status = 'pending';
```

### ثانياً: فهرسة محرك البحث الفوري ودعم اللغة العربية ([Meilisearch Language](https://www.google.com/search?q=https%3A%2F%2Fwww.meilisearch.com%2Fdocs%2Fresources%2Fhelp%2Flanguage) & [Typesense Locales](https://www.google.com/search?q=https%3A%2F%2Ftypesense.org%2Fdocs%2Fguide%2Flocale.html))
يفشل البحث التقليدي (`SQL LIKE '%...%'`) تماماً في المتاجر العربية بسبب اختلاف كتابة الهمزات والتاء المربوطة واللهجات المحلية بين مصر والخليج؛ لذا يجب استخدام محرك بحث مخصص مثل **Meilisearch** (المزود بمحلل `Charabia` للغة العربية) أو **Typesense** مع القواعد التالية:

* **التطبيع الصرفي العربي (Arabic Normalization):** توحيد أشكال الألف (`أ، إ، آ ← ا`)، التاء المربوطة والهاء (`ة ← ه`)، الياء والألف المقصورة (`ى ← ي`)، إزالة التشكيل، فصل أداة التعريف (`ال`)، وتحويل الأرقام الهندية (`٠١٢٣٤٥٦٧٨٩`) إلى أرقام عربية قياسية (`0123456789`) ([Meilisearch Arabic Support](https://www.google.com/search?q=https%3A%2F%2Fwww.meilisearch.com%2Fdocs%2Fresources%2Fhelp%2Flanguage)).
* **التسامح مع الأخطاء الإملائية ([Typo Tolerance](https://www.google.com/search?q=https%3A%2F%2Fwww.meilisearch.com%2Fdocs%2Fresources%2Finternals%2Ftypo_tolerance)):** مطابقة الكلمات حتى مع وجود خطأ إملائي بحرف أو حرفين على لوحة مفاتيح الموبايل.
* **قاموس المرادفات للهجة المصرية والخليجية والفرانكو (Dialect & Synonym Mapping):** ربط الكلمات المترادفة في الفهرس ليفهم المحرك نية المتسوق المصري والخليجي معاً:
  * مثال: `["حذاء رياضي", "كوتشي", "سنيكرز", "جزمة رياضية", "sneakers", "kotschy"]`
  * مثال: `["هاتف ذكي", "موبايل", "جوال", "تليفون", "smartphone"]`
  * مثال: `["ثلاجة", "تلاجة", "براد"]` و `["مكيف", "تكييف"]`

### ثالثاً: فهرسة محركات البحث (Google Mobile-First Indexing & Sitemaps)
* **تطابق نسخة الموبايل والديسكتوب ([Google Mobile-First Indexing](https://www.google.com/search?q=https%3A%2F%2Fdevelopers.google.com%2Fsearch%2Fdocs%2Fcrawling-indexing%2Fmobile%2Fmobile-sites-mobile-first-indexing)):** التأكد من أن نسخة الموبايل تحتوي على نفس النصوص الكاملة، نفس أكواد `JSON-LD` المهيكلة، نفس عناوين الميتا، ونفس الصور والروابط الداخلية دون حذف أي قسم بحجة صغر الشاشة (يمكن وضعها في Accordions قابلة للفتح بشرط وجودها في الـ DOM الأولي).
* **عدم حجب الموارد أو التحميل الكسول الخاطئ:** السماح لـ Googlebot بالوصول لكافة ملفات CSS و JS والصور، وعدم ربط ظهور محتوى المنتج الأساسي بأحداث تفاعل يدوية (`onclick` / `swipe`) لا ينفذها الزاحف.
* **تقسيم خرائط الموقع الذكي ([XML Sitemaps - Google](https://www.google.com/search?q=https%3A%2F%2Fdevelopers.google.com%2Fsearch%2Fdocs%2Fcrawling-indexing%2Fsitemaps%2Fbuild-sitemap)):** إنشاء ملف فهرس رئيسي (`sitemap_index.xml`) يقسم الروابط حسب الدولة والنوع (`sitemap-eg-products-1.xml`, `sitemap-sa-products-1.xml`, `sitemap-categories.xml`) بحد أقصى 50,000 رابط لكل ملف، مع تحديث حقل `<lastmod>` فقط عند تغير السعر أو المحتوى فعلياً.

## 4. استراتيجيات الكاشينج متعددة الطبقات (Multi-Tier Caching Architecture)

لتحقيق زمن استجابة شبه صفري وتخفيف الحمل عن قواعد البيانات بنسبة تتجاوز 90%، يتم بناء منظومة تخزين مؤقت من 4 طبقات متكاملة ([MDN HTTP Caching](https://www.google.com/search?q=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FHTTP%2FGuides%2FCaching) و [MDN Cache-Control](https://www.google.com/search?q=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FHTTP%2FReference%2FHeaders%2FCache-Control)).

### الطبقات الأربعة للكاشينج في المتجر الإلكتروني

| طبقة الكاش | التقنية / الموجهات القياسية | ماذا نخزن فيها؟ وكيف نبطلها (Invalidation)؟ |
| :--- | :--- | :--- |
| **1. كاش المتصفح (Browser & bfcache)** | `Cache-Control: public, max-age=31536000, immutable` | ملفات JS و CSS والخطوط والأيقونات المزودة ببصمة في الاسم (`app.8f9a2.js`)؛ لا تُطلب من الخادم أبداً حتى عند عمل Reload ([MDN Cache-Control](https://www.google.com/search?q=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FHTTP%2FReference%2FHeaders%2FCache-Control)) |
| **2. كاش الحافة والـ CDN (Edge Cache)** | `Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=86400, stale-if-error=86400` | صفحات المنتجات والفئات العامة؛ تُقدم من أقرب نقطة (القاهرة/البحرين/أوروبا) في أقل من `20ms` مع تحديثها في الخلفية أو مسحها لحظياً عبر **Cache Tags / Surrogate-Key** ([MDN Cache-Control](https://www.google.com/search?q=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FHTTP%2FReference%2FHeaders%2FCache-Control)) |
| **3. كاش إطار العمل (ISR / App Cache)** | `revalidateTag('product-1024')` / `revalidatePath` | مخرجات Server Components واستعلامات الكتالوج في Next.js/Nuxt؛ يتم تحديثها عند الطلب فقط (On-Demand ISR) عبر Webhook عند تعديل التاجر للسعر أو المخزون |
| **4. كاش الذاكرة الموزع (Redis Layer)** | **Cache-Aside + TTL with Jitter** + Redis Hashes | جلسات المستخدمين، السلة النشطة، أسعار الصرف، عدادات المخزون، ونتائج الفلاتر المتكررة ([Metamindz Scalable Architecture](https://www.google.com/search?q=https%3A%2F%2Fwww.metamindz.co.uk%2Fpost%2Fbuilding-scalable-e-commerce-architecture-best-practices)) |

### القواعد الذهبية لمنع كوارث الكاش في التجارة الإلكترونية
* **عزل البيانات الشخصية تماماً (`private, no-store`):** يجب أن تحمل كافة مسارات السلة (`/api/cart`)، صفحة الدفع (`/checkout`)، وحساب العميل (`/account`) ترويسة `Cache-Control: private, no-store` لمنع CDN من تخزين صفحة مستخدم وعرض بياناته الشخصية أو عنوانه لمستخدم آخر ([MDN Cache-Control](https://www.google.com/search?q=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FHTTP%2FReference%2FHeaders%2FCache-Control)).
* **فصل الجزء الثابت عن المتحرك في صفحة المنتج (Static Shell + Dynamic Island):** يتم تخزين هيكل صفحة المنتج (الاسم، الصور، الوصف، التقييمات، الميتا داتا) في كاش الـ CDN (`s-maxage`)، بينما يتم جلب حالة المخزون اللحظية أو العروض الخاصة بالمستخدم عبر طلب خفيف وسريع من الـ Edge أو Redis.
* **منع تدافع الكاش وقت الذروة (Cache Stampede / Thundering Herd Prevention):** إذا انتهت صلاحية كاش منتج شهير في اللحظة التي يزوره فيها 5,000 مستخدم، ستنهال 5,000 عملية قراءة على قاعدة البيانات في نفس المللي ثانية؛ الحل هو إضافة عشوائية بسيطة لوقت الانتهاء (**TTL Jitter**: مثلاً `300s + random(0, 60s)`) مع استخدام قفل توزيعي (**Distributed Lock / Mutex**) بحيث يقوم طلب واحد فقط بتحديث الكاش من قاعدة البيانات بينما تنتظر بقية الطلبات أو تقرأ النسخة القديمة (`stale`).

## 5. ضغط وتحسين الميديا والصور والفيديو (Media Compression & Delivery Pipeline)

تمثل الصور والفيديوهات أكثر من 70% من وزن صفحات المتاجر الإلكترونية، وضغطها الصحيح هو العامل الأول لتحقيق `LCP ≤ 2.5s` وتوفير باقة الإنترنت لمتسوقي الموبايل في مصر والخليج ([web.dev Image Performance](https://www.google.com/search?q=https%3A%2F%2Fweb.dev%2Flearn%2Fperformance%2Fimage-performance) و [web.dev Video Performance](https://www.google.com/search?q=https%3A%2F%2Fweb.dev%2Flearn%2Fperformance%2Fvideo-performance)).

### أولاً: هندسة وضغط الصور الفوتوغرافية والمنتجات
* **التسلسل الهرمي للصيغ الحديثة (`AVIF` ← `WebP` ← `JPEG`):**
  * اعتمد صيغة **AVIF** كخيار أول لأنها توفر أكثر من **50% من حجم الملف** مقارنة بـ JPEG بنفس الجودة البصرية وتدعم الشفافية والمدى الديناميكي العالي، مع توفير **WebP** كبديل ثانٍ، و **JPEG** كبديل أخير للمتصفحات القديمة ([web.dev Image Performance](https://www.google.com/search?q=https%3A%2F%2Fweb.dev%2Flearn%2Fperformance%2Fimage-performance)).
  * اضبط جودة الضغط الفاقد (Lossy Compression) لصور المنتجات عند مستوى **`q=75` إلى `q=80`** مع حذف بيانات الكاميرا الوصفية (`Strip EXIF Metadata`)، واستخدم صيغة **SVG** المضغوطة عبر `SVGO` لكافة الشعارات والأيقونات.
* **الصور المتجاوبة وتحديد كثافة البكسل للموبايل (`srcset` + `sizes` + DPR Capping):**
  * لا ترسل صورة بعرض `2000px` لهاتف شاشة عرضه `360px`؛ استخدم وسم `<picture>` أو خصائص `srcset` و `sizes` مع تحديد العرض الفعلي ([web.dev Image Performance](https://www.google.com/search?q=https%3A%2F%2Fweb.dev%2Flearn%2Fperformance%2Fimage-performance)).
  * **تقييد كثافة البكسل على الموبايل عند `2x`:** العين البشرية على شاشة الهاتف الصغيرة لا تفرق بين `2x DPR` و `3x DPR`، بينما تزيد صورة `3x` من حجم الملف بأكثر من الضعف؛ لذا قيد الصور على شاشات الموبايل الصغيرة عند حد أقصى `1000px` (`2x`) لتسريع التحميل على شبكات الجيل الرابع ([web.dev Image Performance](https://www.google.com/search?q=https%3A%2F%2Fweb.dev%2Flearn%2Fperformance%2Fimage-performance)).
* **التحويل التلقائي عبر Image CDN والـ `Accept` Header:**
  * استخدم خدمة Image CDN (مثل Cloudflare Images أو Imgix أو معالج `sharp` على الحافة) تقرأ ترويسة `Accept: image/avif,image/webp` من متصفح الزائر وتقدم الصيغة الأخف تلقائياً، مع إرسال ترويسة `Vary: Accept` لضمان تخزين كل صيغة بشكل صحيح في الكاش ([web.dev Image Performance](https://www.google.com/search?q=https%3A%2F%2Fweb.dev%2Flearn%2Fperformance%2Fimage-performance)).

### نموذج كود: الصورة الرئيسية للمنتج (LCP Image) والصورة الفرعية في القوائم
```html
<!-- 1. الصورة الرئيسية في صفحة المنتج (LCP Element): عالية الأولوية، بدون Lazy Loading -->
<picture>
  <source
    type="image/avif"
    srcset="
      /cdn-cgi/image/width=480,quality=75,format=avif/products/shoe-main.jpg 480w,
      /cdn-cgi/image/width=768,quality=75,format=avif/products/shoe-main.jpg 768w,
      /cdn-cgi/image/width=1080,quality=80,format=avif/products/shoe-main.jpg 1080w
    "
    sizes="(min-width: 1024px) 500px, (min-width: 768px) 50vw, 100vw"
  />
  <source
    type="image/webp"
    srcset="
      /cdn-cgi/image/width=480,quality=75,format=webp/products/shoe-main.jpg 480w,
      /cdn-cgi/image/width=768,quality=75,format=webp/products/shoe-main.jpg 768w,
      /cdn-cgi/image/width=1080,quality=80,format=webp/products/shoe-main.jpg 1080w
    "
    sizes="(min-width: 1024px) 500px, (min-width: 768px) 50vw, 100vw"
  />
  <img
    src="/cdn-cgi/image/width=768,quality=80,format=jpeg/products/shoe-main.jpg"
    alt="حذاء جري احترافي AeroRun Pro باللون الأسود - زاوية أمامية"
    width="1080"
    height="1080"
    fetchpriority="high"
    decoding="sync"
    style="aspect-ratio: 1 / 1; width: 100%; height: auto;"
  />
</picture>

<!-- 2. صور المنتجات السفلية في القوائم (Below the Fold): تحميل كسول وفك تشفير غير متزامن -->
<img
  src="/cdn-cgi/image/width=400,quality=75,format=auto/products/shoe-thumb.jpg"
  alt="حذاء جري AeroRun Pro"
  width="400"
  height="400"
  loading="lazy"
  decoding="async"
  style="aspect-ratio: 1 / 1; width: 100%; height: auto;"
/>
```

### ثانياً: ضغط الفيديوهات واستبدال الصور المتحركة ([web.dev Video Performance](https://www.google.com/search?q=https%3A%2F%2Fweb.dev%2Flearn%2Fperformance%2Fvideo-performance))
* **حظر استخدام صيغة GIF تماماً:** ملفات GIF المتحركة تستهلك عدة ميجابايتات وتدمر أداء الموبايل؛ استبدلها دائماً بوسم `<video autoplay muted loop playsinline>` مع حذف مسار الصوت الفارغ عبر أداة `FFmpeg` باستخدام الخيار `-an` وضبط معامل الجودة `-crf` (`ffmpeg -i input.mov -an -c:v libvpx-vp9 -crf 32 -b:v 0 output.webm`) ([web.dev Video Performance](https://www.google.com/search?q=https%3A%2F%2Fweb.dev%2Flearn%2Fperformance%2Fvideo-performance)).
* **ترتيب مصادر الفيديو (`WebM` قبل `MP4`):** ضع `<source src="video.webm" type="video/webm">` (بترميز `AV1` أو `VP9`) أولاً قبل `<source src="video.mp4" type="video/mp4">` لأن المتصفح يختار أول صيغة مدعومة يجدها في الكود ([web.dev Video Performance](https://www.google.com/search?q=https%3A%2F%2Fweb.dev%2Flearn%2Fperformance%2Fvideo-performance)).
* **تأجيل تحميل فيديوهات المراجعة والشرح (`preload="none"` & Facades):**
  * للفيديوهات التي يشغلها المستخدم بنفسه، اضبط `preload="none"` و `loading="lazy"` مع تحديد صورة غلاف خفيفة بصيغة AVIF/WebP في خاصية `poster` ([web.dev Video Performance](https://www.google.com/search?q=https%3A%2F%2Fweb.dev%2Flearn%2Fperformance%2Fvideo-performance)).
  * لا تقم بتضمين مشغل YouTube الافتراضي (`<iframe>`) مباشرة لأنه يجمد الخيط الرئيسي للمتصفح (`Main Thread`) لأكثر من **1.7 ثانية** ويسيء لمؤشر `INP`؛ استخدم نمط الواجهة الخفيفة (**Facade Pattern** مثل `lite-youtube-embed`) التي تعرض صورة مصغرة خفيفة ولا تحمل سكربتات المشغل إلا عند نقر المستخدم للتشغيل ([web.dev Video Performance](https://www.google.com/search?q=https%3A%2F%2Fweb.dev%2Flearn%2Fperformance%2Fvideo-performance)).

## 6. البنية المعمارية وهيكلة الكود الشاملة (Architecture & Code Structure)

تعتمد منصات التجارة الإلكترونية الحديثة على الفصل بين الواجهات والعمليات الخلفية لضمان المرونة والقدرة على التوسع المستقل لكل خدمة دون توقف النظام الكلي.

### المبادئ المعمارية الأساسية
* **معمارية MACH والتجارة القابلة للتركيب ([MACH Architecture - Commercetools](https://www.google.com/search?q=https%3A%2F%2Fcommercetools.com%2Fblog%2Fmach-r-technology-unveiled-powering-modern-digital-commerce-experiences)):**
  * **Microservices / Modular Monolith:** البدء بنمط **Modular Monolith** واضح الحدود (لتسريع الإطلاق وتقليل تكلفة التشغيل في البداية) ثم فصل الخدمات الأكثر ضغطاً (مثل المخزون والدفع) تدريجياً عبر نمط **Strangler Pattern**.
  * **API-First & Cloud-Native:** بناء كافة الوظائف كواجهات برمجية موحدة والاعتماد على الحاويات ([Docker \& Kubernetes - Metamindz](https://www.google.com/search?q=https%3A%2F%2Fwww.metamindz.co.uk%2Fpost%2Fbuilding-scalable-e-commerce-architecture-best-practices)).
  * **Headless Storefront:** فصل طبقة العرض الأمامية (Next.js App Router / Nuxt) عن الخلفية لتقديم سرعة فائقة وتجربة Mobile-First.
* **منهجية التطبيقات ذات الـ 12 عاملاً ([The Twelve-Factor App](https://www.google.com/search?q=https%3A%2F%2F12factor.net%2F)):**
  * تشغيل التطبيق كعمليات عديمة الحالة ([Stateless Processes](https://www.google.com/search?q=https%3A%2F%2F12factor.net%2Fprocesses))، حفظ الإعدادات والمفاتيح في متغيرات البيئة، وتوحيد بيئات التطوير والإنتاج.

### الهيكلة القياسية للمشروع (Feature-Based / Multi-Region Architecture)
```text
ecommerce-platform/
├── apps/
│   ├── storefront-web/                # واجهة المتجر (Next.js App Router / Mobile-First / RTL)
│   │   ├── src/
│   │   │   ├── app/[locale]/          # مسارات الدول واللغات: (ar-eg, ar-sa, ar-ae, en)
│   │   │   ├── modules/               # تقسيم حسب الميزة (Catalog, Cart, Checkout, Search)
│   │   │   ├── shared/                # نظام التصميم المتجاوب (Mobile Bottom Sheets, Touch UI)
│   │   │   └── seo/                   # مولدات JSON-LD, Open Graph, Sitemaps, llms.txt
│   └── api-gateway/                   # بوابة التوجيه، التحقق، وتحديد المعدل (Rate Limiting)
├── services/
│   ├── catalog-service/               # إدارة المنتجات والربط الفوري مع Meilisearch/Typesense
│   ├── inventory-service/             # حجز المخزون الذري (Redis Lua + PostgreSQL)
│   ├── order-service/                 # دورة حياة الطلبات، COD OTP، ومعالجة الأحداث (Kafka)
│   ├── payment-service/               # محولات الدفع (Paymob, Kashier, Fawry, Moyasar, Tap, Tabby, Tamara)
│   └── shipping-service/              # محولات الشحن (Bosta, Mylerz, Aramex, SMSA)
├── packages/
│   ├── database-schema/               # جداول PostgreSQL والفهارس المركبة والجزئية
│   └── media-pipeline/                # إعدادات ضغط الصور (AVIF/WebP) والفيديو (FFmpeg)
└── infrastructure/                    # Docker, Kubernetes, Cloudflare CDN Rules, Redis Cluster
```

## 7. الاستقرار وتحمل الزيارات والطلبات الضخمة (High Concurrency & Flash Sales)

لضمان صمود المتجر أثناء العروض الكبرى (الجمعة البيضاء / عروض رمضان) ومنع سقوط الخوادم أو البيع الزائد عن المخزون الفعلي (Overselling)، يجب تطبيق الأنماط المعتمدة في الأنظمة عالية التزامن ([Scalable Backend for Flash Sales - DEV Community](https://www.google.com/search?q=https%3A%2F%2Fdev.to%2Fbudiwidhiyanto%2Fdesigning-a-scalable-backend-for-flash-sales-4g9o) و [High-Concurrency Order System - Stackademic](https://www.google.com/search?q=https%3A%2F%2Fblog.stackademic.com%2Fhow-to-design-a-high-concurrency-order-flash-sale-system-from-rate-limiting-to-eventual-8f89ab67cfce)):

* **فصل القراءة عن الكتابة (Read-Write Separation):** توجيه عمليات الشراء وتحديث المخزون لقاعدة البيانات الرئيسية (`Primary`)، وتوجيه تصفح الكتالوج لنسخ القراءة (`Read Replicas`).
* **نظام حجز المخزون الذري (Atomic Inventory Reservation System):** تنفيذ الخصم المبدئي في **Redis** عبر `Lua Script` ذري مع تعيين وقت انتهاء صلاحية تلقائي (**TTL = 300s** للدفع بالبطاقة، أو مهلة محددة لكود فوري)، وإرجاع الكمية تلقائياً للمخزون إذا لم يكتمل الدفع.
* **القفل التفاؤلي (Optimistic Locking) ومفاتيح عدم التكرار (`Idempotency-Key`):** منع الكتابة المتضاربة في قاعدة البيانات، وضمان عدم خصم المبلغ مرتين إذا ضغط المتسوق على زر الدفع أكثر من مرة بسبب بطء شبكة الموبايل.
* **طوابير الرسائل وقواطع الدائرة (Event Queues & Circuit Breakers):** استخدام **Kafka / RabbitMQ** لمعالجة الفواتير الضريبية (ETA / ZATCA) وإشعارات الشحن بشكل غير متزامن، وتفعيل **Circuit Breakers** و **Graceful Degradation** لإيقاف الميزات الثانوية وقت الذروة القصوى.

### نموذج كود: خصم ذري للمخزون في Redis عبر Lua Script لمنع الـ Overselling
```lua
-- KEYS[1]: مفتاح مخزون المنتج (مثلاً inventory:product:1024)
-- KEYS[2]: مفتاح حجز المستخدم (مثلاً reservation:product:1024:user:889)
-- ARGV[1]: الكمية المطلوبة | ARGV[2]: مهلة الحجز بالثواني (TTL = 300)

if redis.call("EXISTS", KEYS[2]) == 1 then
    return -1 -- المستخدم لديه حجز نشط بالفعل لهذا المنتج
end

local current_stock = tonumber(redis.call("GET", KEYS[1]) or "0")
local requested_qty = tonumber(ARGV[1])

if current_stock < requested_qty then
    return 0 -- المخزون غير كافٍ
end

redis.call("DECRBY", KEYS[1], requested_qty)
redis.call("SETEX", KEYS[2], tonumber(ARGV[2]), requested_qty)
return 1 -- تم الحجز بنجاح
```

## 8. السرعة والأداء الفائق (Core Web Vitals على الموبايل والديسكتوب)

تشترط جوجل تحقيق المستويات القياسية لـ **Core Web Vitals** عند المئين الخامس والسبعين (**75th Percentile**) من زيارات المستخدمين الفعلية، خصوصاً على أجهزة الموبايل المتوسطة والاقتصادية المنتشرة في السوق ([Web Vitals - web.dev](https://www.google.com/search?q=https%3A%2F%2Fweb.dev%2Farticles%2Fvitals) و [Top Ways to Improve Core Web Vitals - web.dev](https://www.google.com/search?q=https%3A%2F%2Fweb.dev%2Farticles%2Ftop-cwv)):

* **LCP (Largest Contentful Paint ≤ 2.5s):** تقديم الصفحات عبر SSR/ISR، تحميل صورة المنتج الرئيسية بـ `fetchpriority="high"` دون `loading="lazy"`، واستخدام CDN قريب جغرافياً لخفض `TTFB`.
* **INP (Interaction to Next Paint ≤ 200ms):** تقسيم مهام JavaScript الطويلة (>50ms) عبر `scheduler.yield()`، تقليل حجم حزمة JS الأولية لأقل من `100KB` مضغوطة بـ Brotli، واستخدام `content-visibility: auto`.
* **CLS (Cumulative Layout Shift ≤ 0.1):** حجز أبعاد صريحة (`aspect-ratio` / `width` & `height`) لكافة الصور وبانرات العروض وأقسام التقسيط (valU / Tabby / Tamara)، وتفعيل `bfcache` و `Speculation Rules API`.

## 9. الأمان وحماية المدفوعات والواجهات (Security, API Protection & PCI DSS v4.0)

* **الامتثال لمعيار ([PCI DSS v4.0 - Akamai](https://www.google.com/search?q=https%3A%2F%2Fwww.akamai.com%2Fblog%2Fsecurity%2Fmeet-pci-dss-v40-api-security-compliance) و [PCI SSC Guidelines](https://www.google.com/search?q=https%3A%2F%2Fwww.pcisecuritystandards.org%2Fpdfs%2FPCI_DSS_v2_eCommerce_Guidelines.pdf)):** استخدام حقول الدفع المعزولة (`Hosted Fields / Embedded Iframe`) بحيث لا تلمس بيانات البطاقات خادمك أبداً، والتحقق من كل عملية دفع عبر **Signed Server-to-Server Webhook (HMAC)** وليس عبر إعادة توجيه المتصفح ([Nilex 2026](https://www.google.com/search?q=https%3A%2F%2Fnilexdigitalsystems.com%2Farticles%2Fpayment-gateways-egypt-paymob-fawry-instapay)).
* **حماية الـ APIs وفق ([OWASP API Security Top 10 - 2023](https://www.google.com/search?q=https%3A%2F%2Fowasp.org%2FAPI-Security%2Feditions%2F2023%2Fen%2F0x11-t10%2F)):** سد ثغرات صلاحيات الكائنات (`BOLA`)، منع التعديل الجماعي للخصائص (`Mass Assignment` على حقول السعر والخصم)، وحماية مسارات الكوبونات وطلبات الـ COD من البوتات (`Rate Limiting` + `Cloudflare Turnstile`).
* **ترويسات الأمان القياسية ([Strict CSP - MDN](https://www.google.com/search?q=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FHTTP%2FGuides%2FCSP) و [HSTS - MDN](https://www.google.com/search?q=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FHTTP%2FReference%2FHeaders%2FStrict-Transport-Security)):**

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: script-src 'nonce-{RANDOM_NONCE}' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; upgrade-insecure-requests; require-trusted-types-for 'script';
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=(self)
```

## 10. السيو التقني، الميتا داتا، والـ GEO (SEO, Metadata & Generative Engine Optimization)

* **السيو التقني وهيكلة الروابط ([Google Search Central E-commerce SEO](https://www.google.com/search?q=https%3A%2F%2Fdevelopers.google.com%2Fsearch%2Fdocs%2Fspecialty%2Fecommerce) و [URL Structure](https://www.google.com/search?q=https%3A%2F%2Fdevelopers.google.com%2Fsearch%2Fdocs%2Fspecialty%2Fecommerce%2Fdesigning-a-url-structure-for-ecommerce-sites)):** استخدام مسارات دولية واضحة (`/ar-eg/` لمصر كمسار أساسي، `/ar-sa/` للسعودية، `/ar-ae/` للإمارات) مع وسوم [hreflang](https://www.google.com/search?q=https%3A%2F%2Fdevelopers.google.com%2Fsearch%2Fdocs%2Fspecialty%2Finternational%2Flocalized-versions) ثنائية الاتجاه، ومنع فهرسة تركيبات الفلاتر اللانهائية للحفاظ على ميزانية الزحف.
* **الميتا داتا والبيانات المهيكلة ([Open Graph - ogp.me](https://www.google.com/search?q=https%3A%2F%2Fogp.me%2F) و [Merchant Listing JSON-LD](https://www.google.com/search?q=https%3A%2F%2Fdevelopers.google.com%2Fsearch%2Fdocs%2Fappearance%2Fstructured-data%2Fmerchant-listing)):** تضمين كود `Product` و `Offer` بالعملة المحلية لكل دولة (`EGP` في نسخة مصر، `SAR` في نسخة السعودية) مع سياسة الشحن والاسترجاع (`MerchantReturnPolicy`).
* **تحسين محركات البحث التوليدية ([GEO for Ecommerce - Veliu](https://www.google.com/search?q=https%3A%2F%2Fveliu.com%2Fen%2Fblog%2Fgenerative-engine-optimization-for-ecommerce) و [LLMs.txt Guide - Yotpo](https://www.google.com/search?q=https%3A%2F%2Fwww.yotpo.com%2Fblog%2Fwhat-is-llms-txt%2F) و [Google AI Optimization](https://www.google.com/search?q=https%3A%2F%2Fdevelopers.google.com%2Fsearch%2Fdocs%2Ffundamentals%2Fai-optimization-guide)):**
  * ضمان **Zero Schema Drift** (تطابق تام بين نص الصفحة المرئي على الموبايل، وكود `JSON-LD`، وخلاصة Google Merchant Center).
  * كتابة فقرات أسئلة وأجوبة مباشرة (`40–70 كلمة`) لكل منتج، وتوفير ملف `/llms.txt` في جذر الموقع يوجه وكلاء الذكاء الاصطناعي إلى ملخصات بصيغة Markdown لسياسات الشحن والاسترجاع في مصر والخليج وأدلة المقاسات.

### نموذج كود متكامل: الميتا داتا + hreflang (مصر والخليج) + Open Graph + JSON-LD
```html
<head>
  <title>حذاء جري احترافي AeroRun Pro - شحن سريع لجميع محافظات مصر | اسم المتجر</title>
  <meta name="description" content="اطلب حذاء الجري AeroRun Pro الأصلي. متاح الدفع عبر فوري، إنستا باي، فودافون كاش، وتقسيط فاليو مع استرجاع مجاني خلال 30 يوماً." />
  <link rel="canonical" href="https://example.com/ar-eg/product/aerorun-pro-black" />

  <!-- التوجيه الجغرافي للسوق المصري والخليجي (hreflang) -->
  <link rel="alternate" hreflang="ar-eg" href="https://example.com/ar-eg/product/aerorun-pro-black" />
  <link rel="alternate" hreflang="ar-sa" href="https://example.com/ar-sa/product/aerorun-pro-black" />
  <link rel="alternate" hreflang="ar-ae" href="https://example.com/ar-ae/product/aerorun-pro-black" />
  <link rel="alternate" hreflang="ar-kw" href="https://example.com/ar-kw/product/aerorun-pro-black" />
  <link rel="alternate" hreflang="x-default" href="https://example.com/ar-eg/product/aerorun-pro-black" />

  <!-- Open Graph Protocol (ogp.me) -->
  <meta property="og:title" content="حذاء جري احترافي AeroRun Pro - أسود" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://example.com/ar-eg/product/aerorun-pro-black" />
  <meta property="og:image" content="https://example.com/images/products/aerorun-pro-black-1200x630.jpg" />
  <meta property="og:image:secure_url" content="https://example.com/images/products/aerorun-pro-black-1200x630.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="حذاء جري AeroRun Pro باللون الأسود" />
  <meta property="og:locale" content="ar_EG" />
  <meta property="og:locale:alternate" content="ar_SA" />
  <meta property="og:locale:alternate" content="ar_AE" />

  <!-- Schema.org Merchant Listing (JSON-LD) لنسخة مصر -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "حذاء جري احترافي AeroRun Pro - أسود",
    "image": ["https://example.com/images/products/aerorun-1x1.avif"],
    "description": "حذاء جري احترافي مزود بطبقة توسيد مزدوجة ومقاوم للانزلاق.",
    "sku": "ARP-BLK-42",
    "mpn": "ARP2026-42",
    "gtin13": "0123456789012",
    "brand": { "@type": "Brand", "name": "AeroSports" },
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": 4.8, "reviewCount": 245 },
    "offers": {
      "@type": "Offer",
      "url": "https://example.com/ar-eg/product/aerorun-pro-black",
      "priceCurrency": "EGP",
      "price": 3450.00,
      "availability": "https://schema.org/InStock",
      "itemCondition": "https://schema.org/NewCondition",
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "EG",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": 30,
        "returnMethod": "https://schema.org/ReturnByMail",
        "returnFees": "https://schema.org/FreeReturn"
      }
    }
  }
  </script>
</head>
```

## 11. قائمة الفحص الهندسية الشاملة قبل الإطلاق (Master Pre-Launch Checklist)

| المحور الهندسي | بند الفحص والاعتماد | المعيار المستهدف |
| :--- | :--- | :--- |
| **تخصيص مصر والخليج** | تفعيل ميزة، المحافظ، InstaPay، فوري، valU لمصر + مدى، STC Pay، Tabby/Tamara للخليج مع التحقق عبر Signed Webhooks | 100% مطابقة مالية يومية (Daily Reconciliation) |
| **الموبايل والتابلت أولاً** | فحص الشريط السفلي الثابت، الـ Bottom Sheets، أحجام أزرار اللمس (≥ 44px)، ولوحات المفاتيح الرقمية + WebOTP | توافق كامل مع [Baymard UX](https://www.google.com/search?q=https%3A%2F%2Fbaymard.com%2Fblog%2Fcheckout-flow-ux-optimization) و [WCAG 2.2 AA](https://www.google.com/search?q=https%3A%2F%2Fwww.w3.org%2FTR%2FWCAG22%2F) |
| **الفهرسة والبحث العربي** | تفعيل فهارس PostgreSQL الجزئية والشاملة، وتطبيع اللغة العربية والمرادفات المصرية/الخليجية في Meilisearch/Typesense | زمن بحث `< 20ms` وتطابق 100% في Mobile-First Indexing |
| **الكاشينج متعدد الطبقات** | ضبط `immutable` للملفات الثابتة، و `s-maxage + stale-while-revalidate` للكتالوج، و `private, no-store` للسلة والدفع | نسبة إصابة كاش CDN (`Cache Hit Ratio`) تتجاوز 90% |
| **ضغط الميديا والفيديو** | تحويل الصور إلى `AVIF`/`WebP` مع `srcset`/`sizes` وتقييد DPR الموبايل عند `2x`، واستبدال GIF بفيديو `WebM` صامت | `LCP ≤ 2.5s`، `INP ≤ 200ms`، و `CLS ≤ 0.1` على شبكات 4G |
