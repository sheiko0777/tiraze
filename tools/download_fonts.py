from pathlib import Path
import urllib.request,re
assets=Path(__file__).resolve().parents[1]/'assets'
request=urllib.request.Request('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Manrope:wght@400;500;600&display=swap',headers={'User-Agent':'Mozilla/5.0'})
css=urllib.request.urlopen(request,timeout=30).read().decode()
for i,url in enumerate(dict.fromkeys(re.findall(r'url\((https[^)]+)\)',css))):
    name=f'font-{i}.woff2'
    request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
    (assets/name).write_bytes(urllib.request.urlopen(request,timeout=30).read())
    css=css.replace(url,f'/assets/{name}')
(assets/'fonts.css').write_text(css,encoding='utf-8')
print('Fonts saved locally')
