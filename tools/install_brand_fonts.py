from pathlib import Path
import re,urllib.request
root=Path(__file__).resolve().parents[1]
css=(root/'tools/irth-live-styles.css').read_text(encoding='utf-8')
faces=re.findall(r'@font-face\s*\{[^}]+\}',css)
out=[]
for face in faces:
 if not any(f"'{n}'" in face for n in ['IRTH Sakkal Seta','IRTH A Suls','IRTH Thmanyah Serif']):continue
 url=re.search(r'url\([\"\x27]([^\"\x27]+)',face).group(1)
 if url.startswith('//'):url='https:'+url
 family=re.search(r"font-family:\s*'([^']+)'",face).group(1)
 filename={'IRTH Sakkal Seta':'irth-sakkal-seta.ttf','IRTH A Suls':'irth-a-suls.ttf','IRTH Thmanyah Serif':'irth-thmanyah-serif.otf'}[family]
 p=root/'assets'/filename
 if not p.exists():p.write_bytes(urllib.request.urlopen(url,timeout=30).read())
 original_url=re.search(r'url\([\"\x27]([^\"\x27]+)',face).group(1)
 out.append(face.replace(original_url,'/assets/'+filename))
 print(family,p.stat().st_size)
(root/'assets/brand-fonts.css').write_text('\n'.join(dict.fromkeys(out)),encoding='utf-8')
html=(root/'tools/irth-live-source.html').read_text(encoding='utf-8')
for block in re.findall(r'<style[^>]*>(.*?)</style>',html,re.S):
 if 'IRTH Sakkal Seta' in block or 'IRTH Thmanyah Serif' in block:
  clean=re.sub(r'@font-face\s*\{[^}]+\}','',block)
  print('Arabic font rules:',clean[:7000])
