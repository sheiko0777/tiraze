from pathlib import Path
import json,re,subprocess,urllib.request
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def check(label,result):
    checks.append({'check':label,'passed':bool(result)})
    print(('PASS ' if result else 'FAIL ')+label)
for name in ['index.html','styles.css','refinement.css','reference-match.css','subbrand.css','app.js','data.js','serve.py','assets/editorial-fonts.css','assets/reference-fonts.css','assets/brand-fonts.css','assets/hero.mp4','integration/shopify/irth-collectibles-entry.liquid']:
    p=ROOT/name
    check('File '+name,p.exists() and p.stat().st_size>0)
for key in ['hero','carpet','beads','pendant','keyring','craft','architecture','safaa','rawda','silk-editorial','silk-detail']:
    check('Image '+key,(ROOT/'assets'/f'{key}.webp').exists())
for name in ['app.js','data.js']:
    result=subprocess.run(['node','--check',str(ROOT/name)],capture_output=True,text=True)
    check('JavaScript syntax '+name,result.returncode==0)
    if result.returncode: print(result.stderr)
css='\n'.join((ROOT/f'assets/{name}.css').read_text(encoding='utf-8') for name in ['editorial-fonts','reference-fonts','brand-fonts'])
for font in set(re.findall(r'url\(([^)]+)\)',css)):
    font=font.strip('\"\x27')
    check('Local font '+font,(ROOT/font.lstrip('/')).exists())
code='\n'.join((ROOT/x).read_text(encoding='utf-8') for x in ['index.html','app.js','data.js','styles.css','refinement.css','reference-match.css','subbrand.css'])
check('No Jannat brand or Russian source text in deliverable',not re.search(r'jannat|[\u0400-\u04ff]',code,re.I))
check('No external image, script or style resources',not re.search(r'(?:src=|url\()[\s\"\x27]*https?://',code))
check('External links use official parent or partner domains',all(x.startswith(('https://rihal.sa/','https://www.irth-house.com/')) for x in re.findall(r'https?://[^\s\"\x27<>]+',code)))
liquid=(ROOT/'integration/shopify/irth-collectibles-entry.liquid').read_text(encoding='utf-8')
schema=json.loads(re.search(r'{% schema %}(.*?){% endschema %}',liquid,re.S).group(1))
check('Shopify entry schema has valid URL settings',all('default' not in item or item['default'] in ('/collections','/collections/all') for item in schema['settings'] if item['type']=='url'))
for name in ['irth-logo-original.png','rihal-kaaba.jpg','rihal-kaaba-box.jpg','rihal-uhud.jpg','rihal-salam.jpg']:
    check('Partner and brand asset '+name,(ROOT/'assets'/name).stat().st_size>1000)
try:
    video=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(ROOT/'assets/hero.mp4')],text=True))
    stream=next(s for s in video['streams'] if s['codec_type']=='video')
    check('Hero video 1920x1080',stream['width']==1920 and stream['height']==1080)
    print('Video duration:',video['format']['duration'])
except Exception as e: check('Hero video readable',False);print(e)
routes=['/','/catalog','/collections/silk','/collections/beads','/collections/kiswah','/collections/gifts','/products/noor-silk','/products/safaa-silk','/products/rawda-silk','/products/uhud-beads','/products/kiswah-pendant','/products/kiswah-keyring','/about','/concierge','/gifting','/buyers','/journal','/journal/the-language-of-silk','/journal/a-record-that-remains','/journal/the-art-of-giving','/provenance','/contact','/care','/privacy','/terms','/favorites','/request']
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
routes += ['/collections/rihal','/products/rihal-kaaba-door','/products/rihal-uhud-necklace','/products/rihal-salam-beads','/pages/collectibles']
for route in routes:
    try:
        response=opener.open('http://127.0.0.1:8088'+route,timeout=4)
        check('HTTP '+route,response.status==200 and b'id="main"' in response.read())
    except Exception as e: check('HTTP '+route,False);print(str(e));break
(ROOT/'verification.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
print('SUMMARY',sum(c['passed'] for c in checks),'/',len(checks))
raise SystemExit(0 if all(c['passed'] for c in checks) else 1)
