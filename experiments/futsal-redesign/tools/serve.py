"""dist/web 를 로컬에서 띄운다. Vercel 처럼 /o/… 요청은 원본 사이트로 대신 받아 준다.
사용: python3 -I tools/serve.py [포트=8765]"""
import http.server, os, sys, urllib.request
from urllib.parse import unquote

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'dist', 'web')
ORIGIN = 'http://www.futsal.or.kr/'


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_GET(self):
        if self.path.startswith('/o/'):
            url = ORIGIN + self.path[3:]
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30) as r:
                    body = r.read()
                    self.send_response(200)
                    self.send_header('Content-Type', r.headers.get('Content-Type', 'application/octet-stream'))
                    self.send_header('Content-Length', str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
            except Exception as e:  # 원본에 없는 이미지 등
                self.send_error(404, str(e))
            return
        path = unquote(self.path.split('?')[0])
        if path != '/' and not os.path.splitext(path)[1] and os.path.exists(os.path.join(ROOT, path.lstrip('/') + '.html')):
            self.path = path + '.html'  # cleanUrls 흉내
        super().do_GET()

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
