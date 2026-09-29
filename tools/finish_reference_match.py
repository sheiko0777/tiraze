from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'app.js';s=p.read_text(encoding='utf-8')
s=s.replace("text(p,'description')||text(p,'line')","text(p,'desc')||text(p,'line')")
s=s.replace('<div class="gallery-stage" id="gallery-stage">${gallery()}</div>','<div id="gallery-stage">${gallery()}</div>')
# Preserve the five-question acquisition guide, with the original four-row rhythm on the homepage.
s=s.replace('function faqList(){return `<div class="faq-list">${faqs.map','function faqList(limit=faqs.length){return `<div class="faq-list">${faqs.slice(0,limit).map')
s=s.replace('<section class="faq" id="faq"><h2>FAQ</h2>${faqList()}</section>','<section class="faq" id="faq"><h2>FAQ</h2>${faqList(4)}</section>')
p.write_text(s,encoding='utf-8')
p=root/'index.html';s=p.read_text(encoding='utf-8').replace('<link rel="stylesheet" href="/assets/reference-fonts.css">','<link rel="stylesheet" href="/assets/reference-fonts.css">\n  <link rel="stylesheet" href="/assets/brand-fonts.css">')
p.write_text(s,encoding='utf-8')
print('Descriptions, gallery structure, four-row FAQ and brand font loading updated.')
