from pathlib import Path
import urllib.request
url='https://cdn.creativeclaw.co/u/ffb564c6/videos/fb18e679-a567-4c2a-9c01-9d088943ee26.mp4'
dest=Path(__file__).resolve().parents[1]/'assets/hero.mp4'
request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://app.creativeclaw.co/'})
with urllib.request.urlopen(request,timeout=45) as response:
    dest.write_bytes(response.read())
print('Saved hero video:',dest.stat().st_size,'bytes')
