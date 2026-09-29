from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'reference-layout.json').read_text(encoding='utf-8'))
for r in data:
 if r['id'] not in ['rec1718259851','rec1717956801','rec1737618891','rec1711912421','rec1711932911']:continue
 print('\nRECORD',r['id'])
 for e in r['elements']:
  a=e['attrs']; print(e['id'],e['type'],e['text'],{k:v for k,v in a.items() if ('res-320' in k or k in ['data-field-top-value','data-field-left-value','data-field-width-value','data-field-height-value','data-field-file-value'])})
m=json.loads((root.parent/'Jannat-Offline/asset-map.json').read_text(encoding='utf-8'))
print('\nFONTS',[(k,v) for k,v in m.items() if re.search(r'woff|ttf|TTDrugs',str(k)+str(v),re.I)])
