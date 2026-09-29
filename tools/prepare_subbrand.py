from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / 'app.js'
source = path.read_text(encoding='utf-8')

def replace(old, new):
    global source
    if old not in source:
        raise RuntimeError('Expected source not found: ' + old[:100])
    source = source.replace(old, new)

start = source.index('const brand=')
end = source.index('const link=', start)
source = source[:start] + '''// Parent identity remains separate from this collection's local navigation.
const parentHouseUrl='https://www.irth-house.com/';
const wordmark=()=>'<span class="subbrand-lockup" dir="ltr"><span class="subbrand-name">IRTH</span><span class="subbrand-script">Collectibles</span></span>';
const parentLink=(cls='parent-house-link')=>`<a class="${cls}" href="${parentHouseUrl}">${t('بيت إرث','IRTH HOUSE')} <span aria-hidden="true">↗</span></a>`;
const brand=()=>`<a class="brand" href="/" aria-label="${t('إرث مقتنيات — الرئيسية','IRTH Collectibles — Home')}"><span class="official-logo"><img src="/assets/irth-logo-original.png" alt="إرث · IRTH" width="2508" height="2508"></span>${wordmark()}</a>`;
''' + source[end:]
replace("${link('/gifting','إهداءات خاصة','Private gifting','desktop-only')}", "${parentLink('parent-house-link desktop-only')}")
replace("<h1>${t('فن الاقتناء من بيت إرث','THE ART OF COLLECTING')}<span class=\"latin-title\">IRTH HOUSE</span></h1>", "<h1>${t('مقتنيات تبقى… وتحكي','OBJECTS TO TREASURE')}<span class=\"latin-title\">${wordmark()}</span></h1>")
replace("${t('فلسفة بيت إرث','THE PHILOSOPHY OF')}<span dir=\"ltr\">IRTH HOUSE</span>", "${t('مقتنيات من بيت إرث','A COLLECTION BY IRTH HOUSE')}<span class=\"philosophy-wordmark\">${wordmark()}</span>")
replace('إرث هو ما نحمله من حكايات، وما نختار أن نتركه من جمال. من عقدة حرير تصوغها يد صبور، إلى مقتنى يحتفظ بذاكرة المكان، نجمع قطعًا تُرى فيها عناية الصانع وتُلمس فيها قيمة المعنى. أشياء تُقتنى لتُورث.', 'إرث مقتنيات، عالم من القطع المختارة من بيت إرث. من عقدة حرير تصوغها يد صبور، إلى مقتنى يحتفظ بذاكرة المكان، نجمع جمال الصنعة وعمق المعنى. قطع للبيت وللإهداء، نختارها لترافقك اليوم وتبقى لمن بعدك.')
replace('Heritage lives in the stories we carry and the beauty we leave behind. From a silk knot shaped by a patient hand to an object that holds the memory of a place, our collection celebrates the maker’s care. Objects to treasure, and to pass on.', 'IRTH Collectibles is a world of considered objects by IRTH HOUSE. From hand-knotted silk to keepsakes that hold the memory of a place, we bring together the beauty of craft and the meaning of a gift. Pieces to treasure, and to pass on.')
replace('<span class="signature">by IRTH HOUSE</span>', '<span class="signature">IRTH Collectibles</span>')
replace('<span class="eyebrow">IRTH HOUSE</span>', '<span class="eyebrow">IRTH COLLECTIBLES · BY IRTH HOUSE</span>')
replace("case 'menu':openDialog(t('بيت إرث','IRTH HOUSE'),`<nav", "case 'menu':openDialog(wordmark(),`<p class=\"menu-endorsement\">${t('إرث مقتنيات · من بيت إرث','A collection by IRTH HOUSE')}</p><nav")
replace(".map(([h,a,n])=>link(h,a,n,'')).join('')}</nav>`,'drawer');break;", ".map(([h,a,n])=>link(h,a,n,'')).join('')}</nav><div class=\"menu-parent\">${parentLink()}<p>${t('اكتشف عالم الدار وهداياها','Explore the house and its gifts')}</p></div>`,'drawer');break;")
replace('<span class="footer-preview">', '<span class="footer-parent">${t(\'إرث مقتنيات · من \' ,\'IRTH Collectibles · By \')}${parentLink()}</span><span class="footer-preview">')
replace("const aliases={'/aboutus'", "const aliases={'/pages/collectibles':'/','/aboutus'")
replace("t('إرث — أشياء تُقتنى لتُورث | IRTH HOUSE','IRTH HOUSE — Chosen to be inherited')", "t('إرث مقتنيات — من بيت إرث | IRTH Collectibles','IRTH Collectibles — A collection by IRTH HOUSE')")
replace(".trim()+' | IRTH HOUSE'", ".trim()+' | IRTH Collectibles'")
path.write_text(source, encoding='utf-8')

index = root / 'index.html'
markup = index.read_text(encoding='utf-8')
markup = markup.replace('إرث | IRTH HOUSE — أشياء تُقتنى لتُورث', 'إرث مقتنيات | IRTH Collectibles — من بيت إرث')
markup = markup.replace('إرث — بيت للسجاد الحرير الطبيعي المنسوج يدوياً والمقتنيات الإسلامية المختارة. أشياء تُقتنى لتُورث.', 'إرث مقتنيات — مجموعة مختارة من بيت إرث: سجاد حرير يدوي ومقتنيات وتذكارات تحمل حكاية.')
markup = markup.replace('v=20260916', 'v=20260916-collectibles')
markup = markup.replace('  <link rel="preload" as="image"', '  <link rel="stylesheet" href="/subbrand.css?v=20260916-collectibles">\n  <link rel="preload" as="font" href="/assets/liana.woff" type="font/woff" crossorigin>\n  <link rel="preload" as="image"')
index.write_text(markup, encoding='utf-8')
print('Prepared IRTH Collectibles identity, parent links, and preview entry route.')
