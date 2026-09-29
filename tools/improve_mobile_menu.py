from pathlib import Path
p=Path('app.js'); code=p.read_text(encoding='utf-8')
lines=code.splitlines()
for i,line in enumerate(lines):
    if line.startswith(" case 'menu':openDialog"):
        lines[i]=line.replace('<nav class="menu-links">','<nav class="menu-links"><button class="mobile-search-link" data-action="search">${icon(\'search\')}${t(\'ابحث في عالم إرث\',\'Search the collection\')}</button>')
        lines[i]=lines[i].replace("['/catalog','الكتالوج','Collection'],", "['/catalog','الكتالوج','Collection'],['/collections/rihal','مختارات رحال','The RIHAL selection'],")
        break
else: raise SystemExit('Mobile menu handler not found')
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('Mobile menu: global search and RIHAL entry added.')
