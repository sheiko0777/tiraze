# تيراز — Tiraze

متجر مخصص للسجاد الحرير اليدوي، بهوية Tiraze الكحلية وتوقيع Silk Rugs الذهبي وأيقونة T العاجية. الاسم العربي المعتمد **تيراز**، وفيديو الهيرو الأصلي محفوظ.

التطبيق الجديد يعمل محليًا: واجهة عربية/إنجليزية، حساب مؤكد البريد ومصادقة ثنائية، سلة خادم، طلبات ومخزون ومعاملات دفع محمية، إدارة وشحن وتحصيل، ومهام خلفية. **استقبال الطلبات وإرسال البريد مغلقان افتراضيًا؛ تكامل التاجر والإطلاق لم يُعتمدا بعد.**

~~~powershell
pnpm install --frozen-lockfile
pnpm setup:local
pnpm dev
~~~

افتح العنوان الذي يظهر، عادة http://localhost:4321/ar. للنسخة المبنية: pnpm build ثم pnpm --filter @tiraze/web preview --host 127.0.0.1 --port 4330، ثم http://localhost:4330/ar.

الفحوص: pnpm typecheck وpnpm test وpnpm build. وبعد تشغيل المعاينة المبنية على 4330 شغّل pnpm test:e2e. هذه أوامر محلية ولا تنشئ موارد إنتاج أو اشتراكات.

- [حالة التنفيذ والأدلة والحدود](docs/IMPLEMENTATION-STATUS.md)
- [التشغيل المحلي](docs/runbooks/local-development.md)
- [إدارة المتجر والحوادث](docs/runbooks/operations.md)
- [استيراد الكتالوج](docs/runbooks/catalog-import.md)
- [النسخ والاستعادة](docs/runbooks/backup-restore.md)
- [الخطة الكاملة](docs/IMPLEMENTATION-PLAN.md) و[معايير الهندسة](docs/ENGINEERING-GUIDELINES.md)
- [بوابات الإطلاق](docs/LAUNCH-CHECKLIST.md) و[القرار المعماري](docs/decisions/0003-local-commerce-implementation.md)

المعاينة القديمة مستقلة: python -X utf8 serve.py 8090 ثم http://localhost:8090. تصورات نور وصفاء وروضة ليست مخزون بيع مؤكدًا. لا نضع أسعارًا أو منشأً أو سياسات فعلية دون اعتمادها.
