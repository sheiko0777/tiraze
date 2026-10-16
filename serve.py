from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
import sys
import runpy
ROOT = Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
    def do_GET(self):
        path=urlsplit(self.path).path
        if not Path(path).suffix and not path.startswith('/assets/'):
            self.path='/index.html'
        super().do_GET()
    def end_headers(self):
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'none'")
        super().end_headers()
    def do_POST(self): self.send_error(405,'Preview only. No orders or messages are transmitted.')
if __name__=='__main__':
    runpy.run_path(str(ROOT / 'tools' / 'restore_large_assets.py'))
    port=int(sys.argv[1]) if len(sys.argv)>1 else 8088
    print(f'TIRAZE: http://localhost:{port}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',port),Handler).serve_forever()
