from pathlib import Path
p=Path('app.js')
for i,line in enumerate(p.read_text(encoding='utf-8').splitlines(),1):
    if i>=65:
        print(f'{i}: {line}')
