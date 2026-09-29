from pathlib import Path

root = Path(__file__).resolve().parents[1]
app = root / 'app.js'
text = app.read_text(encoding='utf-8')
start = text.index('function footer(){')
end = text.index('function cookie(){', start)
replacement = '''function footer(){
 $('#footer').innerHTML=`<div class="container footer-inner"><div class="footer-grid"><div class="footer-brand">${brand()}<p>${t('بعض الأشياء لا تُصنع فحسب، بل تُقتنى لتُورث.','Some things are not simply made. They are chosen to be inherited.')}</p></div><div class="footer-catalog"><h3>${t('المجموعات','CATALOG')}</h3>${link('/catalog','جميع القطع','All pieces','')}${Object.entries(collections).map(([k,c])=>`<a href="/collections/${k}">${name(c)}</a>`).join('')}</div><div class="footer-menu"><h3>${t('بيت إرث','MENU')}</h3>${link('/','الرئيسية','Home','')}${link('/about','فلسفة إرث','Our philosophy','')}${link('/journal','حكايات إرث','Journal','')}${link('/buyers','دليل الاقتناء','Acquisition guide','')}${link('/concierge','الاقتناء الخاص','Private concierge','')}${link('/gifting','إهداءات الجهات','Institutional gifting','')}</div><div class="footer-care"><h3>${t('في خدمتك','CLIENT CARE')}</h3>${link('/provenance','المصدر والتوثيق','Provenance','')}${link('/care','العناية بالمقتنيات','Care guide','')}${link('/favorites','قطعك المفضلة','Your favourites','')}${link('/request','طلبك المحفوظ','Your saved request','')}${link('/contact','تواصل معنا','Contact us','')}${link('/privacy','سياسة الخصوصية','Privacy policy','')}${link('/terms','عن هذه النسخة','About this edition','')}</div></div><div class="footer-bottom"><a class="footer-contact" href="/contact">${t('تواصل مع مستشار إرث','Contact your IRTH advisor')}</a><span class="footer-copyright">© 2026 IRTH HOUSE · irth-house.com</span><span class="footer-preview">${t('المجموعة الجديدة — نسخة للمعاينة','THE NEW COLLECTION — PREVIEW EDITION')}</span></div></div>`;
}
'''
app.write_text(text[:start] + replacement + text[end:], encoding='utf-8')
index = root / 'index.html'
index.write_text(index.read_text(encoding='utf-8').replace('v=20260915','v=20260916'),encoding='utf-8')
print('Updated footer layout and asset versions.')
