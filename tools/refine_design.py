from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'app.js'; app=p.read_text(encoding='utf-8')
lines=app.splitlines()
for i,line in enumerate(lines):
    if line.startswith('const brand='):
        lines[i]=line.replace('</span></a>`;', '</span><span class="brand-title" dir="ltr">IRTH HOUSE</span></a>`;')
    if line.startswith(' <section class="craft-banner">'):
        lines[i]=''' <section class="craft-story"><figure class="craft-banner">${img('craft',t('تفاصيل الحياكة اليدوية على نول الحرير','Silk being knotted by hand on a traditional loom'))}<figcaption class="craft-caption">${t('صُنعت بتمهّل… لتبقى طويلاً','MADE SLOWLY. MADE TO STAY.')}</figcaption></figure><div class="craft-footnote"><div class="craft-footnote-copy"><span class="eyebrow">THE ART OF HAND KNOTTING</span><h2>${t('حكاية كل عقدة','A STORY IN EVERY KNOT')}</h2><p>${t('خيط من الحرير، ووقت تمنحه اليد لكل تفصيلة.','A thread of silk. A moment of care in every detail.')}</p></div><a href="/journal/the-language-of-silk" class="craft-detail-link">${img('silk-detail',t('لقطة قريبة لنسيج الحرير والعقد اليدوية','A close view of silk and hand-tied knots'))}<span>${t('اكتشف الحرفة','DISCOVER THE CRAFT')}<b aria-hidden="true">${t('←','→')}</b></span></a></div></section>'''
    if line.startswith(' <section class="new-editorial">'):
        lines[i]=line.replace("img('hero',", "img('silk-editorial',",1).replace("['beads','pendant','carpet']", "['beads','pendant','silk-detail']")
app='\n'.join(lines)+'\n'
app=app.replace('<span class="eyebrow">THE ART OF INHERITANCE</span>','')
app=app.replace("'فلسفة البيت<br>إرث','THE PHILOSOPHY<br>OF IRTH HOUSE'","'فلسفة بيت إرث','THE PHILOSOPHY OF IRTH HOUSE'")
app=app.replace("'إصدارات جديدة<br>وحكايات باقية','NEW PIECES.<br>LASTING STORIES.'","'حرفة تستحق<br>أن تبقى','CRAFTED<br>TO ENDURE.'")
app=app.replace("'New 2026'", "'New 2026'")
p.write_text(app,encoding='utf-8')
p=root/'index.html'; html=p.read_text(encoding='utf-8');html=html.replace('href="/assets/fonts.css"','href="/assets/editorial-fonts.css"');html=html.replace('<script type="module"', '<link rel="stylesheet" href="/refinement.css">\n<script type="module"',1);p.write_text(html,encoding='utf-8')
print('Refined brand, craft composition and editorial image sequence.')
