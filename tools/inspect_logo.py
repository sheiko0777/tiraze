from pathlib import Path
from PIL import Image
p=Path('assets/irth-logo-original.png')
im=Image.open(p)
print(im.size, im.mode)
print('Corner:',im.getpixel((0,0)))
print('Bands:', im.getbands())
if 'A' in im.getbands():
    a=im.getchannel('A')
    print('Alpha extrema:',a.getextrema(),'Content bounds:',a.getbbox())
