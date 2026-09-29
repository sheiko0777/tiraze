from pathlib import Path
import subprocess,sys,urllib.request,time,os
root=Path(__file__).resolve().parents[1]
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def ready():
    try:
        with opener.open('http://127.0.0.1:8088',timeout=1) as response:
            return b'IRTH' in response.read()
    except Exception:return False
if ready():
    print('Preview already available: http://localhost:8088')
    raise SystemExit(0)
log=open(root/'preview-server.log','ab')
flags=(subprocess.CREATE_NO_WINDOW|subprocess.CREATE_NEW_PROCESS_GROUP) if os.name=='nt' else 0
process=subprocess.Popen([sys.executable,'-X','utf8',str(root/'serve.py'),'8088'],cwd=root,stdin=subprocess.DEVNULL,stdout=log,stderr=log,creationflags=flags,close_fds=True)
(root/'preview-server.pid').write_text(str(process.pid))
for _ in range(20):
    if ready():print('Preview ready: http://localhost:8088');break
    time.sleep(.25)
else:raise SystemExit('Preview did not become ready; inspect preview-server.log')
