from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]
source=root.parent/'Jannat-Offline/dist/assets'
fonts=[('cf259d13d6d42c3d3afe.woff','TTDrugs','ttdrugs-regular',400),('19c4f813cf353dca88c5.woff','Raleway','raleway-regular',400),('8de57a37cfcbf8847271.woff','Raleway','raleway-medium',500),('2f27cc9224fe0ff67708.woff','Liana','liana',400)]
css=[]
for filename,family,name,weight in fonts:
 shutil.copy2(source/filename,root/f'assets/{name}.woff')
 css.append(f"@font-face{{font-family:'{family}';font-style:normal;font-weight:{weight};font-display:swap;src:url('/assets/{name}.woff') format('woff')}}")
(root/'assets/reference-fonts.css').write_text('\n'.join(css),encoding='utf-8')
print('Installed original TTDrugs, Raleway and Liana font files.')
