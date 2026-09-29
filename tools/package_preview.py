from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from shutil import copy2
root = Path(__file__).resolve().parents[1]
target = root.parent / 'IRTH-House-Preview.zip'
previous = root.parent / 'IRTH-House-Preview-before-mobile-match.zip'
if target.exists() and not previous.exists():
    copy2(target, previous)
with ZipFile(target, 'w', ZIP_DEFLATED, compresslevel=6) as archive:
    for path in root.rglob('*'):
        if not path.is_file() or '__pycache__' in path.parts or path.suffix in ('.log', '.pid') or path.name in ('irth-live-source.html','irth-live-styles.css','reference-layout.json'):
            continue
        archive.write(path, Path('Irth-House') / path.relative_to(root))
print(target)
print('Bytes:', target.stat().st_size)
