from pathlib import Path
import urllib.request,re
assets=Path(__file__).resolve().parents[1]/'assets'
url='https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500&family=Raleway:wght@300;400;500&display=swap'
request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
css=urllib.request.urlopen(request,timeout=40).read().decode()
for i,url in enumerate(dict.fromkeys(re.findall(r'url\((https[^)]+)\)',css))):
    extension='.woff2' if '.woff2' in url else '.ttf'
    name=f'editorial-font-{i}'+extension
    request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
    (assets/name).write_bytes(urllib.request.urlopen(request,timeout=40).read())
    css=css.replace(url,f'/assets/{name}')
(assets/'editorial-fonts.css').write_text(css,encoding='utf-8')
print('Noto Sans Arabic 300/400/500 + Raleway 300/400/500 saved locally.')
