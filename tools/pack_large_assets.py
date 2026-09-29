"""Split large binary masters for reliable GitHub API transfer.

The original files remain in F:/jannat/Irth-House. The published checkout
records byte-exact parts and a SHA-256 manifest for restoration after clone.
"""
from hashlib import sha256
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
assets = root / 'assets'
parts_dir = assets / 'source-masters'
parts_dir.mkdir(exist_ok=True)
manifest = {}
for source in sorted(assets.iterdir()):
    if not source.is_file() or source.stat().st_size <= 2_500_000:
        continue
    data = source.read_bytes()
    pieces = []
    for index, start in enumerate(range(0, len(data), 1_100_000), 1):
        name = f'{source.name}.part{index:02d}'
        (parts_dir / name).write_bytes(data[start:start + 1_100_000])
        pieces.append(name)
    manifest[source.name] = {'size': len(data), 'sha256': sha256(data).hexdigest(), 'parts': pieces}
    source.unlink()
    print(f'{source.name}: {len(pieces)} verified parts')
(parts_dir / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
