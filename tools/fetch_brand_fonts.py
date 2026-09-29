from pathlib import Path
import urllib.request,re,json
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parents[1]
opener=urllib.request.build_opener()
def fetch(url):
 return opener.open(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=25).read()
try:
 html=fetch('https://irth-house.com/').decode('utf-8')
 (root/'tools/irth-live-source.html').write_text(html,encoding='utf-8')
 soup=BeautifulSoup(html,'html.parser')
 links=[x['href'] for x in soup.select('link[rel=stylesheet][href]')]
 print('CSS links',links)
 print('Inline font families',sorted(set(re.findall(r'font-family\s*:[^;}]+',html))))
 css='\n'.join(x.get_text() for x in soup.select('style'))
 for url in links:
  if url.startswith('//'):url='https:'+url
  if url.startswith('/'):url='https://irth-house.com'+url
  try:css+='\n'+fetch(url).decode('utf-8')
  except Exception as e:print('CSS unavailable',url,str(e))
 (root/'tools/irth-live-styles.css').write_text(css,encoding='utf-8')
 print('Font families',sorted(set(re.findall(r'font-family\s*:[^;}]+',css))))
 print('Font faces',re.findall(r'@font-face\s*\{[^}]+\}',css))
except Exception as e:print(type(e).__name__,str(e))
