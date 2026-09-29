from pathlib import Path

root=Path(__file__).resolve().parents[1]
p=root/'data.js'; data=p.read_text(encoding='utf-8')
lines=data.splitlines()
partner=next(x for x in lines if x.startswith(' rihal:'))
lines.remove(partner)
data='\n'.join(lines)+'\n'
data=data.replace('export const faqs = [','collections.rihal = '+partner.strip()[6:].rstrip(',')+';\nexport const faqs = [',1)
data=data.replace('الصور في هذه النسخة تصورات للمجموعة القادمة.','صور مجموعة إرث تصورات للمجموعة القادمة؛ صور مختارات رحال من متجر رحال الرسمي.')
data=data.replace('The images in this edition are concepts for a future collection.','IRTH collection images are concepts for a future collection; RIHAL selection images come from RIHAL’s official store.')
p.write_text(data,encoding='utf-8')
p=root/'app.js'; app=p.read_text(encoding='utf-8')
app=app.replace('بصور مولّدة خصيصاً لتصور الهوية.','بصور مولّدة خصيصاً لتصور هوية إرث، وصور أصلية من رحال لقسم التعاون.')
app=app.replace('with images generated to visualise its identity.','with generated images for IRTH’s identity and original RIHAL images for the collaboration selection.')
p.write_text(app,encoding='utf-8')
# Remove the obsolete temporary ornamental identity from the philosophy section.
old="const ornament=()=>'<svg class=\"ornament\""
lines=app.splitlines()
for i,line in enumerate(lines):
    if line.startswith(old):
        lines[i]='const ornament=()=>\'<span class="philosophy-logo official-logo"><img src="/assets/irth-logo-original.png" alt="إرث · IRTH" width="2508" height="2508"></span>\';'
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('Collection order and asset attribution finalized.')
