"""src/ 의 모듈(CSS·JS)과 data/·assets/ 를 하나의 HTML 로 묶는다.
사용: python3 -I tools/build.py             -> dist/index.html (로컬 미리보기)
      python3 -I tools/build.py --artifact  -> dist/artifact.html (공유 링크용: 비공식 시안 배너 포함)"""
import base64, json, mimetypes, os, re, sys

ARTIFACT = '--artifact' in sys.argv
BANNER = ('<div class="concept-banner" role="note"><p class="container">'
          '비공식 리디자인 시안입니다. 한국풋살연맹 공식 사이트가 아니며, 내용은 2026-10-24에 '
          '<a href="http://www.futsal.or.kr/" target="_blank" rel="noopener">futsal.or.kr</a>에서 가져왔습니다.</p></div>')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')

def read(*p):
    with open(os.path.join(*p), encoding='utf-8') as f:
        return f.read()

def block(html, name, pattern, wrap):
    start, end = '<!-- build:%s -->' % name, '<!-- /build:%s -->' % name
    i, j = html.index(start), html.index(end) + len(end)
    files = re.findall(pattern, html[i:j])
    body = '\n'.join(read(SRC, f) for f in files)
    return html[:i] + wrap % body.replace('</script', '<\\/script') + html[j:]

def images():
    out = {}
    base = os.path.join(ROOT, 'assets', 'img')
    for d, _, fs in os.walk(base):
        for f in fs:
            path = os.path.join(d, f)
            key = os.path.relpath(path, base).replace(os.sep, '/')
            mime = mimetypes.guess_type(f)[0]
            with open(path, 'rb') as fh:
                out[key] = 'data:%s;base64,%s' % (mime, base64.b64encode(fh.read()).decode())
    return out

html = read(SRC, 'index.html')
html = block(html, 'css', r'href="([^"]+\.css)"', '<style>\n%s\n</style>')
data = json.load(open(os.path.join(ROOT, 'data', 'data.json'), encoding='utf-8'))
inline = 'window.KFL=window.KFL||{};KFL.DATA=%s;KFL.IMG=%s;' % (
    json.dumps(data, ensure_ascii=False, separators=(',', ':')),
    json.dumps(images(), separators=(',', ':')))  # noqa
html = block(html, 'js', r'src="([^"]+\.js)"', '<script>\n' + inline.replace('%', '%%') + '\n%s\n</script>')
imgs = images()
html = re.sub(r'\.\./assets/img/([\w./-]+)', lambda m: imgs[m.group(1)], html)
if ARTIFACT:
    # 공유본: 문서 골격은 게시 시 씌워지므로 title·font·style·본문만 남긴다
    head = html[html.index('<head>') + 6:html.index('</head>')]
    body = html[html.index('<body>') + 6:html.index('</body>')]
    head = re.sub(r'<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*', '', head)
    head = head.replace('<title>한국풋살연맹</title>', '<title>풋살연맹 리디자인 시안</title>\n<meta name="claude:viewport-fit-sides" content="cover">')
    html = head.strip() + '\n' + BANNER + body
os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
out = os.path.join(ROOT, 'dist', 'artifact.html' if ARTIFACT else 'index.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
print('built', out, '%.0f KB' % (os.path.getsize(out) / 1024))
