from pathlib import Path
from bs4 import BeautifulSoup
import json
root=Path(__file__).resolve().parents[2]
s=BeautifulSoup((root/'Jannat-Offline/capture-tools/source-home.html').read_text(encoding='utf-8'),'html.parser')
out=[]
for x in s.select('.r'):
    out.append({'id':x.get('id'),'type':x.get('data-record-type'),'text':x.get_text(' ',strip=True)[:180],'artboards':[dict(a.attrs) for a in x.select('.t396__artboard')],'elements':[{'id':e.get('data-elem-id'),'type':e.get('data-elem-type'),'text':e.get_text(' ',strip=True)[:100],'attrs':dict(e.attrs)} for e in x.select('.tn-elem')],'styles':[a.get_text() for a in x.select('style')]})
(root/'Irth-House/reference-layout.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
for x in out: print(x['id'],x['type'],x['text'][:90],[(a.get('data-artboard-height'),a.get('data-artboard-height-res-320')) for a in x['artboards']])
print('STYLESHEETS', [x.get('href') for x in s.select('link[rel=stylesheet]')])
