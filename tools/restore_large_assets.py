"""Reassemble exact media masters from source-masters/manifest.json."""
from hashlib import sha256
import json
from pathlib import Path

assets = Path(__file__).resolve().parents[1] / 'assets'
parts_dir = assets / 'source-masters'
manifest_path = parts_dir / 'manifest.json'
if manifest_path.exists():
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    for name, info in manifest.items():
        target = assets / name
        if target.exists() and target.stat().st_size == info['size'] and sha256(target.read_bytes()).hexdigest() == info['sha256']:
            continue
        data = b''.join((parts_dir / part).read_bytes() for part in info['parts'])
        if len(data) != info['size'] or sha256(data).hexdigest() != info['sha256']:
            raise ValueError(f'Integrity verification failed for {name}')
        target.write_bytes(data)
        print(f'Restored {name}')
