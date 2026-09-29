from pathlib import Path
import urllib.request

base = 'https://media.zid.store/46012790-605f-44d1-a48e-7f4423fe1790/'
assets = {
    'rihal-kaaba-box': '312894a7-44d0-4e30-8ab3-e3ee0cfd568b.jpg',
    'rihal-kaaba': 'd684107b-798c-425a-9e5c-cb41bb22db8e.jpg',
    'rihal-uhud': '218054e6-aad8-4527-8426-91e88292f45a.jpeg',
    'rihal-salam': '8851a600-6338-44e6-9298-3e2d8e981fdf.jpg',
}
for name, remote in assets.items():
    target = Path('assets') / (name + '.jpg')
    if not target.exists():
        req = urllib.request.Request(base + remote, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://rihal.sa/'})
        with urllib.request.urlopen(req, timeout=45) as response:
            target.write_bytes(response.read())
    print(name, target.stat().st_size)
