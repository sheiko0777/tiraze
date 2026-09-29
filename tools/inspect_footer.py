from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
r=next(x for x in json.loads((root/'reference-layout.json').read_text(encoding='utf-8')) if x['id']=='rec2187573461')
for e in r['elements']:
 a=e['attrs']
 print(e['type'],e['text'][:42],{k.replace('data-field-','').replace('-value',''):v for k,v in a.items() if 'res-320' in k and not 'animate' in k})
