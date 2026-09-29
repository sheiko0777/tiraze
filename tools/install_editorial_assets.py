from pathlib import Path
import shutil,subprocess
root=Path(__file__).resolve().parents[1]
source=Path('C:/Users/sheri/.codex/generated_images/01a08d63-f316-7072-b5f0-9318b41c423b')
mapping={'silk-editorial':'exec-ed44e6c8-978f-4f00-9fef-0386f637665f.png','silk-detail':'exec-281f6794-14cb-4f83-ae8a-1e1b26b01084.png'}
for key,name in mapping.items():
    target=root/'assets'/f'{key}.png'
    shutil.copy2(source/name,target)
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(target),'-c:v','libwebp','-quality','92',str(target.with_suffix('.webp'))],check=True)
    print(key,target.with_suffix('.webp').stat().st_size)
