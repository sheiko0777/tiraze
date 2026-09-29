from pathlib import Path
import json, subprocess, sys, zipfile
root=Path(__file__).resolve().parents[1]
interaction=json.loads((root/'interaction-verification.json').read_text(encoding='utf-8'))
http=json.loads((root/'verification.json').read_text(encoding='utf-8'))
assert interaction['passed']>0 and all(x['passed'] for x in http)
report=f'''# متابعة الفحص — 13 سبتمبر 2026

أضيف البحث العام ورابط مختارات رحال إلى قائمة الموبايل.

- فحوص الملفات وصياغة JavaScript وخادم HTTP: {len(http)}/{len(http)} ناجحة.
- فحوص منطق العرض والتفاعل: {interaction['passed']} ناجحة، تشمل القطع التسع باللغتين والصفحات والمجموعات والبحث والتصفية والحقيبة وتبديل اللغة.
- فحوص التفاعل نُفذت في JavaScript باستخدام محاكاة معزولة للمستند والتخزين، وليست فحوصاً بصرية لمتصفح حقيقي. لم تُغيّر بيانات المستخدم.
- الفحص البصري للموبايل ما زال غير مكتمل بسبب انتهاء مهلة اتصال أداة المتصفح، رغم نجاح فحوص خادم الموقع.
- النسخة محلية ولم تُنشر على irth-house.com، ولا تتضمن دفعاً أو إرسالاً فعلياً للطلبات.

النتائج المفصلة في verification.json وinteraction-verification.json. سجل الفحوص السابق في QA-REPORT.md.
'''
(root/'CONTINUATION-REPORT.md').write_text(report,encoding='utf-8')
with (root/'QA-REPORT.md').open('a',encoding='utf-8') as f:
    f.write('\n\n## تحديث 13 سبتمبر 2026\n\n'+report.split('\n\n',1)[1])
subprocess.run([sys.executable,str(root/'tools/package_preview.py')],cwd=root,check=True)
archive=root.parent/'IRTH-House-Preview.zip'
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert any(n.endswith('CONTINUATION-REPORT.md') for n in z.namelist())
print('Verified updated ZIP:',archive,flush=True)
