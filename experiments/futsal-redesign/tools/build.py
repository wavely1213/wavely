"""첫 화면을 하나의 HTML 로 묶는다(이미지·데이터 인라인). 메뉴 링크는 원본 사이트로 간다.
사용: python3 -I tools/build.py             -> dist/index.html (로컬 미리보기)
      python3 -I tools/build.py --artifact  -> dist/artifact.html (공유 링크용: 비공식 시안 배너 포함)
여러 페이지짜리 배포본은 tools/build_web.py 를 쓴다."""
import base64, json, mimetypes, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildlib import (BANNER, CONCEPT_TITLE, ROOT, SKIP, block_files, bundle, includes, load_json,  # noqa: E402
                      menu_js, read, replace_block, script, SRC)

ARTIFACT = '--artifact' in sys.argv


def images():
    out = {}
    base = os.path.join(ROOT, 'assets', 'img')
    for d, _, fs in os.walk(base):
        for f in sorted(fs):
            path = os.path.join(d, f)
            key = os.path.relpath(path, base).replace(os.sep, '/')
            with open(path, 'rb') as fh:
                out[key] = 'data:%s;base64,%s' % (mimetypes.guess_type(f)[0], base64.b64encode(fh.read()).decode())
    return out


html = includes(read(SRC, 'index.html'))
html = replace_block(html, 'css', '<style>\n%s\n</style>' % bundle(block_files(html, 'css', r'href="([^"]+\.css)"')))
html = replace_block(html, 'headjs', script(bundle(block_files(html, 'headjs', r'src="([^"]+\.js)"'))))
imgs = images()
inline = menu_js() + 'KFL.DATA=%s;KFL.IMG=%s;' % (
    json.dumps(load_json('data', 'data.json'), ensure_ascii=False, separators=(',', ':')),
    json.dumps(imgs, separators=(',', ':')))
html = replace_block(html, 'js', script(inline + '\n' + bundle(block_files(html, 'js', r'src="([^"]+\.js)"'))))
html = re.sub(r'\.\./assets/img/([\w./-]+)', lambda m: imgs[m.group(1)], html)
if ARTIFACT:
    # 공유본: 문서 골격은 게시 시 씌워지므로 title·font·style·본문만 남긴다
    head = html[html.index('<head>') + 6:html.index('</head>')]
    body = html[html.index('<body>') + 6:html.index('</body>')]
    head = re.sub(r'<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*', '', head)
    head = head.replace('<title>한국풋살연맹</title>', '<title>%s</title>\n<meta name="claude:viewport-fit-sides" content="cover">' % CONCEPT_TITLE)
    html = head.strip() + '\n' + body.replace(SKIP, SKIP + '\n' + BANNER, 1)
out = os.path.join(ROOT, 'dist', 'artifact.html' if ARTIFACT else 'index.html')
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
print('built', out, '%.0f KB' % (os.path.getsize(out) / 1024))
