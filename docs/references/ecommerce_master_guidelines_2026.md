# الدليل المرجعي الشامل لهندسة وتطوير وتصميم مواقع التجارة الإلكترونية الحديثة (2026)

يمثل هذا الدليل المرجعي خارطة طريق هندسية وتصميمية متكاملة لبناء منصة تجارة إلكترونية حديثة فائقة السرعة، آمنة، قابلة للتوسع تحت ضغط الطلبات المليونية، ومُهيأة لمحركات البحث التقليدية ومحركات الذكاء الاصطناعي التوليدية، استناداً إلى أحدث المعايير التقنية العالمية.

## 1. البنية المعمارية وهيكلة الكود (Architecture & Code Structure)

تعتمد منصات التجارة الإلكترونية الحديثة على الفصل بين الواجهات والعمليات الخلفية لضمان المرونة والقدرة على التوسع المستقل لكل خدمة دون توقف النظام الكلي.

### المبادئ المعمارية الأساسية
* **معمارية MACH والتجارة القابلة للتركيب ([MACH Architecture - Commercetools](https://www.google.com/search?q=https%3A%2F%2Fcommercetools.com%2Fblog%2Fmach-r-technology-unveiled-powering-modern-digital-commerce-experiences)):**
  * **Microservices (الخدمات المصغرة):** تقسيم النظام إلى خدمات مستقلة (الكتالوج، السلة، الدفع، المخزون، الحسابات) يمكن تطويرها ونشرها وتوسيعها بشكل منفصل، أو البدء بنمط **Modular Monolith** (مونوليث معياري) واضح الحدود لتقليل التعقيد التشغيلي في البداية ثم التحول التدريجي عبر نمط **Strangler Pattern**.
  * **API-First (الأولوية لواجهات البرمجة):** بناء كافة الوظائف كواجهات برمجية موحدة (REST / GraphQL / gRPC) لتمكين الربط السلس بين الويب، تطبيقات الموبايل، نقاط البيع، ووكلاء التسوق بالذكاء الاصطناعي (Agentic Commerce).
  * **Cloud-Native (السحابية الأصلية):** الاعتماد على الحاويات ([Docker \& Kubernetes - Metamindz](https://www.google.com/search?q=https%3A%2F%2Fwww.metamindz.co.uk%2Fpost%2Fbuilding-scalable-e-commerce-architecture-best-practices)) والتوسع التلقائي (Auto-scaling) والتخزين السحابي المرن.
  * **Headless (فصل الواجهة عن الخلفية):** فصل طبقة العرض الأمامية (Next.js / Nuxt / Astro) عن منطق التجارة الخلفي لتقديم سرعة فائقة وتجربة مخصصة لكل قناة.
* **منهجية التطبيقات ذات الـ 12 عاملاً ([The Twelve-Factor App](https://www.google.com/search?q=https%3A%2F%2F12factor.net%2F)):**
  * **عمليات عديمة الحالة ([Stateless Processes](https://www.google.com/search?q=https%3A%2F%2F12factor.net%2Fprocesses)):** عدم تخزين جلسات المستخدم (Sessions) أو حالة السلة في ذاكرة الخادم المحلي، بل في مخزن خارجي مشترك مثل Redis لضمان إمكانية إضافة أو إيقاف الخوادم لحظياً دون فقدان بيانات المتسوق.
  * **فصل الإعدادات عن الكود (Config in Environment):** تخزين كافة مفاتيح بوابات الدفع وقواعد البيانات في متغيرات البيئة (Environment Variables) وعدم كتابتها داخل الكود المصدري.
  * **تطابق بيئات التطوير والإنتاج (Dev/Prod Parity):** توحيد نسخ قواعد البيانات والخدمات الخلفية عبر الحاويات لمنع الأخطاء المفاجئة عند الإطلاق.

### الهيكلة القياسية للمشروع (Feature-Based / Clean Architecture)
يُنصح بتنظيم الكود بناءً على النطاقات الوظيفية (Domain/Feature-Driven) بدلاً من تجميع كافة الملفات في مجلدات عامة:

```text
ecommerce-platform/
├── apps/
│   ├── storefront-web/                # واجهة المتجر (Next.js App Router / SSR + ISR)
│   │   ├── src/
│   │   │   ├── app/                   # المسارات (Routes): (shop), product/[slug], checkout
│   │   │   ├── modules/               # تقسيم حسب الميزة (Feature Modules)
│   │   │   │   ├── catalog/           # مكونات وخدمات عرض المنتجات والفلاتر
│   │   │   │   ├── cart/              # حالة السلة ومزامنتها
│   │   │   │   ├── checkout/          # خطوات الدفع والتحقق
│   │   │   │   └── search/            # البحث الفوري والاقتراحات
│   │   │   ├── shared/                # نظام التصميم (Design System UI), Hooks, Utils
│   │   │   └── seo/                   # مولدات JSON-LD, Open Graph, Sitemap, llms.txt
│   └── api-gateway/                   # بوابة التوجيه، التحقق، وتحديد المعدل (Rate Limiting)
├── services/                          # الخدمات الخلفية (أو الوحدات في Modular Monolith)
│   ├── catalog-service/               # إدارة المنتجات، التصنيفات، والخصائص
│   ├── inventory-service/             # حجز المخزون اللحظي (Redis + DB)
│   ├── order-service/                 # دورة حياة الطلبات ومعالجة الأحداث (Kafka/RabbitMQ)
│   └── payment-service/               # الربط المؤمن مع بوابات الدفع (Tokenization & Webhooks)
├── packages/
│   ├── database-schema/               # تعريفات الجداول والـ Migrations
│   └── event-contracts/               # مخططات الأحداث المشتركة (Schema Registry)
└── infrastructure/                    # إعدادات Docker, Kubernetes, Terraform, CDN
```

### اختيار وتصميم قواعد البيانات ([Database Performance - Metamindz](https://www.google.com/search?q=https%3A%2F%2Fwww.metamindz.co.uk%2Fpost%2Fbuilding-scalable-e-commerce-architecture-best-practices))
تشهد مواقع التجارة الإلكترونية نسبة **90% عمليات قراءة مقابل 10% عمليات كتابة**، مما يتطلب توزيع قواعد البيانات حسب طبيعة البيانات:

| نوع البيانات | التقنية الموصى بها | الاستخدام الهندسي في المتجر |
| :--- | :--- | :--- |
| البيانات العلائقية والمالية (SQL) | PostgreSQL / MySQL | الطلبات، الفواتير، أرصدة المخزون، وحسابات العملاء لضمان تكامل البيانات (ACID) |
| البيانات غير المهيكلة والمرنة (NoSQL) | MongoDB / DynamoDB | كتالوج المنتجات متعدد الخصائص، المراجعات، وسجلات التصفح |
| الذاكرة الفورية (In-Memory Cache) | Redis / Memcached | جلسات المستخدمين، السلة النشطة، عدادات المخزون اللحظية، والـ Rate Limiting |
| محرك البحث النصي والدلالي | Elasticsearch / Meilisearch / Typesense | البحث الفوري، الفلترة متعددة الأوجه (Faceted Search)، والبحث بالمعنى |

## 2. الاستقرار وتحمل الزيارات والطلبات الضخمة (High Concurrency & Stability)

لضمان صمود المتجر أثناء العروض الكبرى (Flash Sales / Black Friday) ومنع سقوط الخوادم أو البيع الزائد عن المخزون الفعلي (Overselling)، يجب تطبيق الأنماط الهندسية المعتمدة في الأنظمة عالية التزامن ([Scalable Backend for Flash Sales - DEV Community](https://www.google.com/search?q=https%3A%2F%2Fdev.to%2Fbudiwidhiyanto%2Fdesigning-a-scalable-backend-for-flash-sales-4g9o) و [High-Concurrency Order System - Stackademic](https://www.google.com/search?q=https%3A%2F%2Fblog.stackademic.com%2Fhow-to-design-a-high-concurrency-order-flash-sale-system-from-rate-limiting-to-eventual-8f89ab67cfce)).

### استراتيجيات إدارة الضغط العالي ومنع تضارب المخزون
* **فصل القراءة عن الكتابة (Read-Write Separation):** توجيه كافة عمليات إنشاء الطلبات وتعديل المخزون إلى قاعدة البيانات الرئيسية (Primary/Master)، وتوجيه عمليات تصفح المنتجات والطلبات السابقة إلى نسخ القراءة فقط (Read Replicas) مع تقسيم الجداول الضخمة (Database Sharding & Partitioning).
* **نظام حجز المخزون الذري (Atomic Inventory Reservation System):**
  * لتجنب **البيع الزائد (Overselling)** الناتج عن Race Conditions أو **البيع الناقص (Underselling)** الناتج عن تجميد المخزون في عربات متروكة، يتم تنفيذ الخصم المبدئي في **Redis** عبر عمليات ذرية (Atomic Decrement / Lua Scripts) مع تعيين وقت انتهاء صلاحية تلقائي (**TTL** مثلاً 300 ثانية / 5 دقائق).
  * إذا أتم العميل الدفع خلال المهلة، يتم تأكيد الطلب في قاعدة البيانات؛ وإذا انتهت المهلة دون دفع، يقوم مجدول مهام (Expiry Handler) بإعادة الكمية المحجوزة تلقائياً إلى المخزون المتاح.
* **القفل التفاؤلي (Optimistic Locking):** استخدام رقم إصدار (`version`) لكل سجل مخزون في قاعدة البيانات عند التحديث (`UPDATE inventory SET stock = stock - 1, version = version + 1 WHERE product_id = ? AND version = ?`) لمنع الكتابة المتضاربة دون تجميد الجداول.
* **طوابير الرسائل والعمليات غير المتزامنة (Event-Driven Queues):** استخدام **Apache Kafka** أو **RabbitMQ** لامتصاص ذروة الطلبات (Peak Shaving)؛ حيث يتم استلام الطلب وحجز المخزون فوراً، بينما تتم عمليات إصدار الفاتورة، إرسال البريد الإلكتروني، وإشعارات الشحن بشكل غير متزامن في الخلفية.
* **مفاتيح عدم التكرار (Idempotency Keys):** إرفاق مفتاح فريد (`Idempotency-Key`) مع كل طلب دفع أو إنشاء أوردر، لضمان عدم خصم المبلغ مرتين أو تكرار الطلب إذا ضغط المستخدم على زر الدفع عدة مرات أو انقطع الاتصال وأعيدت المحاولة.
* **أنماط المرونة وتحمل الأخطاء (Resiliency Patterns):**
  * **قواطع الدائرة (Circuit Breakers):** عزل أي خدمة خارجية بطيئة أو متعطلة تلقائياً لمنع انهيار النظام بالكامل (Cascading Failure).
  * **إعادة المحاولة الذكية (Exponential Backoff with Jitter):** عند فشل طلب مؤقت، تتم إعادة المحاولة بفواصل زمنية متزايدة عشوائياً لتجنب إغراق الخدمة المتعثرة.
  * **التدهور التدريجي الوظيفي (Graceful Degradation):** استخدام مفاتيح الميزات (Feature Toggles) لإيقاف الميزات غير الحرجة مؤقتاً وقت الذروة القصوى (مثل التوصيات المعقدة أو سجل المشاهدات) للحفاظ على سرعة واستقرار مسار الدفع (Checkout).
  * **تعدد بوابات الدفع (Multi-Gateway Failover):** الربط مع أكثر من بوابة دفع مع التبديل التلقائي الفوري في حال تعطل البوابة الرئيسية.

### نموذج كود: خصم ذري للمخزون في Redis عبر Lua Script لمنع الـ Overselling
```lua
-- KEYS[1]: مفتاح مخزون المنتج (مثلاً inventory:product:1024)
-- KEYS[2]: مفتاح حجز المستخدم (مثلاً reservation:product:1024:user:889)
-- ARGV[1]: الكمية المطلوبة
-- ARGV[2]: مهلة الحجز بالثواني (TTL = 300)

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

## 3. السرعة والأداء الفائق (Speed & Core Web Vitals)

تؤثر سرعة الموقع مباشرة على المبيعات؛ حيث إن تحسن سرعة الموقع بمقدار 0.1 ثانية يمكن أن يرفع معدل التحويل بنسبة 10.1% ([Metamindz Benchmarks](https://www.google.com/search?q=https%3A%2F%2Fwww.metamindz.co.uk%2Fpost%2Fbuilding-scalable-e-commerce-architecture-best-practices)). تشترط جوجل تحقيق المستويات القياسية لـ **Core Web Vitals** عند المئين الخامس والسبعين (**75th Percentile**) من زيارات المستخدمين الفعلية ([Web Vitals - web.dev](https://www.google.com/search?q=https%3A%2F%2Fweb.dev%2Farticles%2Fvitals) و [Top Ways to Improve Core Web Vitals - web.dev](https://www.google.com/search?q=https%3A%2F%2Fweb.dev%2Farticles%2Ftop-cwv)).

### المعايير القياسية لـ Core Web Vitals وخطوات تحقيقها

| المؤشر القياسي | الحد الأقصى المطلوب (الجيد) | أهم القواعد التقنية للتطبيق في المتجر الإلكتروني |
| :--- | :--- | :--- |
| **LCP** (Largest Contentful Paint) | **≤ 2.5 ثانية** | تقديم صفحات المنتجات عبر SSR/ISR، جعل صورة المنتج الرئيسية قابلة للاكتشاف مباشرة في كود HTML مع خاصية `fetchpriority="high"`، عدم وضع `loading="lazy"` على الصورة الرئيسية أبداً، واستخدام صيغ `AVIF` و `WebP` عبر CDN |
| **INP** (Interaction to Next Paint) | **≤ 200 مللي ثانية** | تقسيم المهام الطويلة في JavaScript التي تتجاوز 50ms باستخدام `scheduler.yield()`، تقليل حجم الحزم عبر Code Splitting، إزالة السكربتات غير المستخدمة في Tag Manager، واستخدام `content-visibility: auto` للأقسام السفلية |
| **CLS** (Cumulative Layout Shift) | **≤ 0.1** | تحديد أبعاد صريحة (`width` و `height` أو `aspect-ratio`) لكافة الصور والإعلانات والبانرات، حجز مساحة ثابتة (`min-height`) للمكونات الديناميكية، واستخدام `transform: translate()` بدلاً من تحريك `top`/`left`/`margin` |

### تقنيات التنقل اللحظي والتخزين المؤقت (Instant Navigations & Edge Caching)
* **تفعيل ذاكرة التخزين للخلف والأمام (`bfcache` - [web.dev](https://www.google.com/search?q=https%3A%2F%2Fweb.dev%2Farticles%2Ftop-cwv)):** تجنب استخدام `Cache-Control: no-store` على صفحات الكتالوج والمنتجات العامة، وعدم استخدام أحداث `unload` القديمة في JavaScript، حتى يتمكن المتصفح من استعادة صفحة قائمة المنتجات فوراً وبصفر إزاحة بصرية (CLS = 0) عند ضغط المتسوق على زر "الرجوع".
* **التحميل المسبق التنبؤي (`Speculation Rules API` - [web.dev](https://www.google.com/search?q=https%3A%2F%2Fweb.dev%2Farticles%2Ftop-cwv)):** استخدام واجهة `speculationrules` لتحميل صفحات المنتجات الأكثر احتمالاً للنقر عليها مسبقاً في الخلفية:

```html
<script type="speculationrules">
{
  "prerender": [
    {
      "where": { "href_matches": "/product/*" },
      "eagerness": "moderate"
    }
  ]
}
</script>
```

## 4. الأمان وحماية المدفوعات والواجهات (Security, API Protection & PCI DSS v4.0)

تستهدف الهجمات السيبرانية مواقع التجارة الإلكترونية بشكل مكثف؛ إذ تشهد 18% من هجمات المتاجر الإلكترونية حقن أكواد خبيثة في صفحات الدفع (Web Skimming / Magecart)، بينما تعرضت 78% من المؤسسات لحوادث أمنية مرتبطة بواجهات API ([Akamai PCI DSS v4.0 Guide](https://www.google.com/search?q=https%3A%2F%2Fwww.akamai.com%2Fblog%2Fsecurity%2Fmeet-pci-dss-v40-api-security-compliance)).

### قواعد الأمان الإلزامية
* **الامتثال لمعيار أمان بيانات بطاقات الدفع ([PCI DSS v4.0 - Akamai](https://www.google.com/search?q=https%3A%2F%2Fwww.akamai.com%2Fblog%2Fsecurity%2Fmeet-pci-dss-v40-api-security-compliance) و [PCI SSC Guidelines](https://www.google.com/search?q=https%3A%2F%2Fwww.pcisecuritystandards.org%2Fpdfs%2FPCI_DSS_v2_eCommerce_Guidelines.pdf)):**
  * **عدم تخزين بيانات البطاقات (Tokenized Checkout):** استخدام حقول الدفع المعزولة (Hosted Fields / Iframes / Payment Elements) مع الترميز (Tokenization) بحيث لا تمر أرقام البطاقات الائتمانية الخام أو رمز CVV عبر خوادمك إطلاقاً.
  * **جرد ومراقبة السكربتات والمكونات الخارجية (PCI DSS Requirements 6.2.3 & 6.3.2):** الاحتفاظ بجرد كامل لكافة المكتبات البرمجية والواجهات الخارجية، ومراقبة كافة سكربتات الطرف الثالث المحملة في صفحة الدفع لمنع سرقة بيانات المتسوقين.
* **حماية واجهات البرمجة وفق معيار ([OWASP API Security Top 10 - 2023](https://www.google.com/search?q=https%3A%2F%2Fowasp.org%2FAPI-Security%2Feditions%2F2023%2Fen%2F0x11-t10%2F)):**
  * **منع تجاوز صلاحيات الكائنات (`API1:2023 - BOLA`):** التحقق برمجياً في كل طلب من أن المستخدم الحالي يملك صلاحية الوصول إلى معرف الطلب (`order_id`) أو العنوان أو الفاتورة المطلوبة، وعدم الاعتماد على إخفاء المعرفات فقط (استخدم UUIDv4/v7 مع فحص الملكية).
  * **حماية خصائص الكائنات (`API3:2023 - BOPLA / Mass Assignment`):** تحديد الحقول المسموح للمستخدم بإرسالها بشكل صارم عبر مخططات تحقق (Strict DTO / Zod / Joi) لمنع المستخدم من تعديل حقول حساسة مثل `price` أو `role` أو `is_paid` داخل طلب الـ JSON.
  * **حماية مسارات الأعمال الحساسة من البوتات (`API6:2023 - Unrestricted Access to Sensitive Business Flows`):** حماية عمليات إضافة السلة، تطبيق الكوبونات، وشراء المنتجات المحدودة من بوتات الشراء الآلي (Scalping Bots) وحجم الطلبات المفرط (`API4:2023`).
* **ترويسات الأمان القياسية في المتصفح (HTTP Security Headers):**
  * **سياسة أمان المحتوى الصارمة ([Strict CSP - MDN](https://www.google.com/search?q=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FHTTP%2FGuides%2FCSP)):** استخدام Nonce عشوائي لكل طلب أو Hash مع `'strict-dynamic'`، ومنع التضمين الخارجي عبر `frame-ancestors 'none'` لحماية الموقع من هجمات XSS و Clickjacking، وتفعيل `require-trusted-types-for 'script'`.
  * **فرض الاتصال المشفر الصارم ([HSTS - MDN](https://www.google.com/search?q=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FHTTP%2FReference%2FHeaders%2FStrict-Transport-Security)):** إرسال ترويسة `Strict-Transport-Security` بعمر لا يقل عن سنة إلى سنتين مع تضمين النطاقات الفرعية والـ Preload.

### نموذج ترويسات الأمان القياسية (HTTP Response Headers)
```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: script-src 'nonce-{RANDOM_NONCE}' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; upgrade-insecure-requests; require-trusted-types-for 'script';
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=(self)
```

## 5. السيو التقني، الميتا داتا، والـ GEO (SEO, Metadata & Generative Engine Optimization)

يعتمد الظهور العضوي الحديث على محورين متكاملين: تصدر نتائج البحث التقليدية وحزم التسوق في Google، والتأكد من قدرة محركات الذكاء الاصطناعي التوليدية (ChatGPT, Gemini, Perplexity, Google AI Overviews) على قراءة بيانات الكتالوج والاستشهاد بها بدقة.

### أولاً: السيو التقني وهيكلة الروابط للمتاجر ([Google Search Central E-commerce SEO](https://www.google.com/search?q=https%3A%2F%2Fdevelopers.google.com%2Fsearch%2Fdocs%2Fspecialty%2Fecommerce))
* **تصميم بنية الروابط ([Ecommerce URL Structure - Google](https://www.google.com/search?q=https%3A%2F%2Fdevelopers.google.com%2Fsearch%2Fdocs%2Fspecialty%2Fecommerce%2Fdesigning-a-url-structure-for-ecommerce-sites)):**
  * استخدام روابط وصفية قصيرة وواضحة (`/category/running-shoes` و `/product/nike-pegasus-41-black`) وتجنب المعرفات المبهمة.
  * **إدارة متغيرات المنتج (Product Variants):** إعطاء كل متغير رئيسي (مثل اللون) رابطاً قابلاً للفهرسة إما بمسار مستقل أو بمعامل استعلام واضح (`?color=black`)، مع ربط المتغيرات ببعضها وتحديد الـ Canonical بدقة.
  * **التحكم في الفلترة متعددة الأوجه (Faceted Navigation):** منع زواحف البحث من الغرق في ملايين التركيبات اللانهائية للفلاتر (مثل ترتيب السعر + مقاسين + 3 ألوان) عبر استخدام `robots.txt` أو وسم `noindex` للتركيبات غير التسويقية، مع السماح بفهرسة صفحات الفئات ذات حجم البحث الفعلي.

### ثانياً: الميتا داتا وبروتوكول Open Graph والبيانات المهيكلة (Metadata & Schema.org)
* **بروتوكول Open Graph للمشاركة الاجتماعية ([The Open Graph Protocol - ogp.me](https://www.google.com/search?q=https%3A%2F%2Fogp.me%2F)):**
  * الالتزام بالخصائص الأربعة الإلزامية في كل صفحة (`og:title`, `og:type`, `og:image`, `og:url`) بالإضافة إلى الخصائص المهيكلة للصورة (`og:image:secure_url`, `og:image:width`, `og:image:height`, `og:image:alt`) واللغة (`og:locale` و `og:locale:alternate`).
* **البيانات المهيكلة للمنتجات وعروض التجار ([Merchant Listing Structured Data - Google](https://www.google.com/search?q=https%3A%2F%2Fdevelopers.google.com%2Fsearch%2Fdocs%2Fappearance%2Fstructured-data%2Fmerchant-listing)):**
  * تضمين كود `JSON-LD` من نوع `Product` يحتوي على السعر، العملة، حالة التوفر (`InStock` / `OutOfStock`)، المعرفات العالمية (`gtin13`, `mpn`, `sku`)، التقييمات (`AggregateRating`)، تفاصيل الشحن (`OfferShippingDetails`)، وسياسة الاسترجاع (`MerchantReturnPolicy`).

### نموذج كود متكامل: الميتا داتا + Open Graph + JSON-LD لصفحة منتج
```html
<head>
  <title>حذاء جري احترافي خفيف الوزن - موديل AeroRun Pro | اسم المتجر</title>
  <meta name="description" content="اطلب حذاء الجري AeroRun Pro بنعل كربوني مريح. شحن سريع خلال 24 ساعة واسترجاع مجاني خلال 30 يوماً." />
  <link rel="canonical" href="https://example.com/ar-eg/product/aerorun-pro-black" />

  <!-- Geo & International SEO (hreflang) -->
  <link rel="alternate" hreflang="ar-eg" href="https://example.com/ar-eg/product/aerorun-pro-black" />
  <link rel="alternate" hreflang="ar-sa" href="https://example.com/ar-sa/product/aerorun-pro-black" />
  <link rel="alternate" hreflang="en" href="https://example.com/en/product/aerorun-pro-black" />
  <link rel="alternate" hreflang="x-default" href="https://example.com/en/product/aerorun-pro-black" />

  <!-- Open Graph Protocol (ogp.me) -->
  <meta property="og:title" content="حذاء جري احترافي AeroRun Pro - أسود" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://example.com/ar-eg/product/aerorun-pro-black" />
  <meta property="og:image" content="https://example.com/images/products/aerorun-pro-black-1200x630.jpg" />
  <meta property="og:image:secure_url" content="https://example.com/images/products/aerorun-pro-black-1200x630.jpg" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="حذاء جري AeroRun Pro باللون الأسود من زاوية جانبية" />
  <meta property="og:locale" content="ar_EG" />
  <meta property="og:locale:alternate" content="ar_SA" />
  <meta property="og:site_name" content="اسم المتجر" />

  <!-- Schema.org Merchant Listing + Product Snippet (JSON-LD) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "حذاء جري احترافي AeroRun Pro - أسود",
    "image": [
      "https://example.com/images/products/aerorun-1x1.jpg",
      "https://example.com/images/products/aerorun-4x3.jpg",
      "https://example.com/images/products/aerorun-16x9.jpg"
    ],
    "description": "حذاء جري احترافي مزود بطبقة توسيد مزدوجة ومقاوم للانزلاق.",
    "sku": "ARP-BLK-42",
    "mpn": "ARP2026-42",
    "gtin13": "0123456789012",
    "brand": {
      "@type": "Brand",
      "name": "AeroSports"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": 4.8,
      "reviewCount": 245
    },
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

### ثالثاً: قواعد الـ GEO بشقيها (Generative Engine Optimization + Geo-Targeting)
1. **تحسين محركات البحث التوليدية والذكاء الاصطناعي ([GEO for Ecommerce - Veliu](https://www.google.com/search?q=https%3A%2F%2Fveliu.com%2Fen%2Fblog%2Fgenerative-engine-optimization-for-ecommerce) و [LLMs.txt Guide - Yotpo](https://www.google.com/search?q=https%3A%2F%2Fwww.yotpo.com%2Fblog%2Fwhat-is-llms-txt%2F) و [Google AI Optimization](https://www.google.com/search?q=https%3A%2F%2Fdevelopers.google.com%2Fsearch%2Fdocs%2Ffundamentals%2Fai-optimization-guide)):**
   * **منع تضارب البيانات (Zero Schema Drift):** ضمان التطابق الحرفي بنسبة 100% بين السعر والاسم وحالة التوفر واللون المعروض في نص الصفحة المرئي، وكود `JSON-LD`، وملف الخلاصة المرسل إلى Google Merchant Center.
   * **توفير المعرفات القياسية والحقائق النصية القابلة للزحف:** إدراج أرقام `GTIN` و `MPN` والأبعاد والمواد وشروط الاسترجاع والضمان كنص HTML واضح وقابل للقراءة الآلية (وليس داخل صور فقط أو نوافذ منبثقة تتطلب جلسة تصفح).
   * **فقرات الأسئلة والأجوبة المباشرة للمنتج (Product Q&A Blocks):** إضافة إجابات موجزة ومباشرة (من 40 إلى 70 كلمة لكل سؤال) في صفحة المنتج تجيب عن أسئلة المشتري الفعلية (مثل: التوافق، المقاس الفعلي، طريقة العناية، مدة التوصيل) لتسهيل اقتباسها حرفياً بواسطة نماذج الذكاء الاصطناعي.
   * **ملف `/llms.txt` والنسخ النصية بـ Markdown:** وضع ملف `/llms.txt` في جذر النطاق يوجه وكلاء الذكاء الاصطناعي إلى ملخصات نظيفة بصيغة Markdown لسياسات الشحن والاسترجاع، أدلة المقاسات، الفئات الرئيسية، والمنتجات الأكثر مبيعاً، مما يقلل استهلاك الـ Tokens بنحو 30% ويرفع دقة استرجاع البيانات ([Yotpo LLMs.txt](https://www.google.com/search?q=https%3A%2F%2Fwww.yotpo.com%2Fblog%2Fwhat-is-llms-txt%2F)).
2. **الاستهداف الجغرافي وتعدد الدول والعملات ([Localized Versions - Google Search Central](https://www.google.com/search?q=https%3A%2F%2Fdevelopers.google.com%2Fsearch%2Fdocs%2Fspecialty%2Finternational%2Flocalized-versions) و [Baymard Guideline #239](https://www.google.com/search?q=https%3A%2F%2Fbaymard.com%2Fblog%2Fecommerce-ux-best-practices)):**
   * استخدام وسوم `hreflang` ثنائية الاتجاه مع رابط `x-default` لتوجيه كل دولة إلى نسختها وعملتها الصحيحة في البحث.
   * تجنب إعادة التوجيه الإجبارية المبنية على الـ IP التي تمنع محركات البحث أو المستخدمين من تبديل الدولة، واستخدام محدد دولة وعملة واضح في أعلى الموقع دون نوافذ منبثقة معيقة على سطح المكتب.

### نموذج ملف `/llms.txt` القياسي لمتجر إلكتروني
```markdown
# اسم المتجر الإلكتروني (Store Name)

> متجر إلكتروني متخصص في الملابس والأحذية الرياضية المعتمدة، مع توصيل سريع واسترجاع مجاني خلال 30 يوماً.

## السياسات وأدلة التسوق الأساسية
- [سياسة الاستبدال والاسترجاع](https://example.com/policies/returns.md): شروط الاسترجاع المجاني خلال 30 يوماً واسترداد المدفوعات.
- [سياسة الشحن ومواعيد التوصيل](https://example.com/policies/shipping.md): أسعار ومواعيد التوصيل حسب المحافظة والدولة.
- [دليل المقاسات القياسي](https://example.com/guides/size-chart.md): جدول تحويل المقاسات (EU / US / UK / CM) وملاحظات القياس.

## الفئات الرئيسية للكتالوج
- [أحذية الجري الاحترافية](https://example.com/collections/running-shoes.md): المواصفات الفنية، الأوزان، ومقارنة الموديلات.
- [ملابس التدريب الرياضية](https://example.com/collections/training-apparel.md): الخامات، التهوية، وتعليمات الغسيل والعناية.
```

## 6. واجهة وتجربة المستخدم وإمكانية الوصول (UI/UX, Conversion & WCAG 2.2)

تُظهر أبحاث **Baymard Institute** المبنية على أكثر من 200,000 ساعة اختبار قابلية استخدام أن متوسط ترك عربات التسوق يبلغ **70.22%**، وأن المتاجر قادرة على رفع معدل التحويل بنسبة تصل إلى **35%** عبر إصلاح عيوب تصميم تجربة المستخدم وتدفق الدفع ([Baymard Checkout UX Guide](https://www.google.com/search?q=https%3A%2F%2Fbaymard.com%2Fblog%2Fcheckout-flow-ux-optimization) و [Baymard 35 Ecommerce Best Practices](https://www.google.com/search?q=https%3A%2F%2Fbaymard.com%2Fblog%2Fecommerce-ux-best-practices)).

### قواعد تصميم الصفحات ومسار الشراء (Baymard UX Standards)
* **الصفحة الرئيسية والتنقل (Homepage & Category Navigation):**
  * عرض تشكيلة واسعة تعكس **40% على الأقل** من فئات المنتجات في الصفحة الرئيسية لتوضيح نطاق المتجر فوراً (`Guideline #237`).
  * **إلغاء السلايدر المتحرك تلقائياً (Auto-rotating Carousels)** على الموبايل واستبداله بأقسام ثابتة واضحة (`Guideline #957`).
  * إبراز حقل البحث بتباين بصري واضح وأبعاد كبيرة (`Guideline #241`)، وجعل الفئات الرئيسية قابلة للنقر (`Guideline #266`) مع تقسيم الفئات الفرعية إلى مجموعات متوازنة (~10 فئات فرعية) وإضافة قسم "الأكثر مبيعاً" (`Guideline #1666`).
* **البحث الداخلي وقوائم المنتجات والفلترة (On-Site Search & Product Lists):**
  * دعم البحث بالاسم الدقيق أو رقم الموديل/SKU (`Guideline #333`)، المرادفات ونوع المنتج (`Guideline #334`)، البحث بالخصائص (`Guideline #340`)، والبحث بالمشكلة أو العرض (`Guideline #338`).
  * إظهار إجمالي عدد المنتجات في القائمة (`Guideline #531`)، واستبدال الترقيم التقليدي (Pagination) والتمرير اللانهائي (Infinite Scroll) بزر **"تحميل المزيد" (Load More)** مع الحفاظ على عمل زر الرجوع (`Guideline #501`).
  * عرض متوسط التقييم بالنجوم **مع عدد التقييمات رقمياً** بجانب كل منتج (`Guideline #441`)، وتوفير مربعات اختيار (Checkboxes) للفلاتر (`Guideline #479`)، وفلتر مستقل للعروض والخصومات (`Guideline #1191`)، والترتيب حسب (السعر، التقييم، الأكثر مبيعاً، الأحدث - `Guideline #511`).
* **صفحة تفاصيل المنتج (Product Details Page - PDP):**
  * توفير **3 إلى 5 صور عالية الدقة على الأقل** من زوايا متعددة (`Guideline #740`) مع فيديو توضيحي للمنتج (`Guideline #759`).
  * استخدام أقسام قابلة للطي عمودياً (Accordions) للمواصفات التفصيلية والشحن والاسترجاع (`Guideline #751`).
  * تمييز زر **"إضافة إلى السلة" (Add to Cart)** بلون وتصميم فريد لا ينافسه أي زر آخر في الصفحة (`Guideline #791`).
* **هندسة صفحة الدفع وإنهاء الطلب (Checkout Flow Optimization):**
  * **إبراز خيار الشراء كزائر (Guest Checkout First):** يتخلى **19%** من المتسوقين عن الشراء بسبب إجبارهم على إنشاء حساب؛ لذا يجب وضع زر "الشراء كزائر" كأبرز خيار في أعلى الشاشة مع تأجيل إنشاء الحساب لما بعد إتمام الطلب (`Guideline #652`).
  * **الشفافية المبكرة للتكاليف:** يترك **39%** من المتسوقين السلة بسبب الرسوم الإضافية المفاجئة؛ لذا يجب عرض تكلفة الشحن والضرائب وإجمالي الطلب مبكراً داخل السلة قبل بدء الدفع (`Guideline #732`).
  * **تقليص عدد الحقول المرئية إلى نحو 12 عنصراً:** دمج الاسم في حقل واحد ("الاسم الكامل" - `Guideline #557`)، إخفاء "سطر العنوان الثاني" خلف رابط اختياري (`Guideline #562`)، وتفعيل خيار "عنوان الفاتورة يطابق عنوان الشحن" افتراضياً (`Guideline #566`).
  * **تسهيل الإدخال على الموبايل والتحقق الذكي:** استخدام التسميات الثابتة فوق الحقول (`Guideline #685`)، تفعيل الإكمال التلقائي للعناوين (`Guideline #2266`)، إظهار لوحة المفاتيح الرقمية تلقائياً لحقول الهاتف والبطاقة (`Guideline #1100`)، وتنسيق رقم البطاقة بمسافات تلقائية مع التحقق عبر خوارزمية Luhn (`Guideline #594`).
  * **معالجة الأخطاء دون مسح البيانات أبداً:** عدم مسح أي بيانات أدخلها المستخدم عند حدوث خطأ في التحقق (`Guideline #720`)، التمرير التلقائي إلى الحقل الذي يحتوي على الخطأ (`Guideline #719`)، وعرض رسائل خطأ دقيقة وتكيفية توضح كيفية الإصلاح (`Guideline #722`).

### معايير إمكانية الوصول العالمية ([W3C WCAG 2.2 Level AA](https://www.google.com/search?q=https%3A%2F%2Fwww.w3.org%2FTR%2FWCAG22%2F))
* **تباين الألوان (`1.4.3 Contrast Minimum`):** تحقيق نسبة تباين لا تقل عن **4.5:1** للنصوص العادية و **3:1** للنصوص الكبيرة وعناصر الواجهة.
* **الحد الأدنى لحجم أهداف اللمس والنقر (`2.5.8 Target Size Minimum`):** ألا يقل حجم أي زر أو عنصر تفاعلي عن **24×24 بكسل CSS** كحد أدنى إلزامي (ويُفضل 44×44 بكسل على شاشات اللمس).
* **عدم حجب عنصر التركيز (`2.4.11 Focus Not Obscured`):** التأكد من أن الهيدر الثابت (Sticky Header) أو شريط الشراء السفلي لا يغطي العنصر الذي يقف عليه المستخدم بلوحة المفاتيح.
* **منع الإدخال المتكرر (`3.3.7 Redundant Entry`):** عدم مطالبة المستخدم بإعادة كتابة بيانات أدخلها بالفعل في خطوة سابقة داخل نفس الجلسة.
* **المصادقة الميسرة (`3.3.8 Accessible Authentication`):** السماح بلصق كلمات المرور (Paste)، ودعم مديري كلمات المرور ومفاتيح المرور (Passkeys / WebAuthn) دون إجبار المستخدم على حل ألغاز بصرية معقدة.

## 7. قائمة الفحص الهندسية قبل الإطلاق (Pre-Launch Readiness Checklist)

| المحور | بند الفحص والاعتماد | المعيار المستهدف |
| :--- | :--- | :--- |
| **البنية والاستقرار** | اختبار الضغط (Load Testing عبر k6 / JMeter) لمحاكاة 10 أضعاف الزيارات المعتادة | استقرار تام مع 0% Overselling في Redis |
| **الأداء والسرعة** | فحص Core Web Vitals على الموبايل والديسكتوب | LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 |
| **الأمان والمدفوعات** | فحص ترويسات CSP و HSTS وعزل حقول البطاقات (PCI DSS v4.0) | تقييم A+ في MDN HTTP Observatory |
| **السيو والـ GEO** | التحقق من تطابق كود `JSON-LD` مع الصفحة والـ Feed ووجود `/llms.txt` و `hreflang` | 0 أخطاء في اختبار النتائج الغنية (Rich Results) |
| **تجربة المستخدم** | تفعيل الشراء كزائر، تقليص حقول الدفع إلى ≤ 12 حقلاً، وحفظ المدخلات عند الخطأ | توافق كامل مع معايير Baymard و WCAG 2.2 AA |
