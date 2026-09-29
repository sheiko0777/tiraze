from pathlib import Path
import json, shutil, subprocess, urllib.request
ROOT = Path(__file__).resolve().parents[1]
assets = ROOT / 'assets'
for name, source in json.loads((ROOT/'tools/assets.json').read_text(encoding='utf-8')).items():
    shutil.copy2(source, assets/f'{name}.png')
    subprocess.run(['ffmpeg','-y','-i',str(assets/f'{name}.png'),'-quality','88',str(assets/f'{name}.webp')], capture_output=True, check=True)
try:
    req = urllib.request.Request('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Manrope:wght@400;500;600&display=swap',headers={'User-Agent':'Mozilla/5.0'})
    css = urllib.request.urlopen(req).read().decode()
    import re
    for i,url in enumerate(dict.fromkeys(re.findall(r'url\((https[^)]+)\)',css))):
        name = f'font-{i}.woff2'
        (assets/name).write_bytes(urllib.request.urlopen(url).read())
        css=css.replace(url,f'/assets/{name}')
    (assets/'fonts.css').write_text(css,encoding='utf-8')
except Exception as e:
    print('Font download unavailable; system fallbacks remain:',str(e))
print('Prepared',len(list(assets.glob('*.webp'))),'optimized images')
