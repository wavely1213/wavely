"""build.py(한 장짜리)와 build_web.py(여러 페이지)가 같이 쓰는 빌드 함수"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')

# 배너는 '본문 바로가기' 다음에 둬서 첫 Tab이 바로가기 링크에 닿게 한다
SKIP = '<a class="skip" href="#main">본문 바로가기</a>'
CONCEPT_TITLE = '풋살연맹 리디자인 시안'
BANNER = ('<div class="concept-banner" role="note"><p class="container">'
          '비공식 리디자인 시안입니다. 한국풋살연맹 공식 사이트가 아니며, 내용은 2026-10-24에 '
          '<a href="http://www.futsal.or.kr/" target="_blank" rel="noopener">futsal.or.kr</a>에서 가져왔습니다.</p></div>')
NOINDEX = '<meta name="robots" content="noindex, nofollow">'


def read(*p):
    with open(os.path.join(*p), encoding='utf-8') as f:
        return f.read()


def load_json(*p):
    with open(os.path.join(ROOT, *p), encoding='utf-8') as f:
        return json.load(f)


def includes(html):
    """<!-- include:header --> 같은 표시를 src/partials/ 파일로 바꾼다"""
    return re.sub(r'<!-- include:(\w+) -->', lambda m: read(SRC, 'partials', m.group(1) + '.html'), html)


def block_files(html, name, pattern):
    start, end = '<!-- build:%s -->' % name, '<!-- /build:%s -->' % name
    i, j = html.index(start), html.index(end) + len(end)
    return re.findall(pattern, html[i:j])


def replace_block(html, name, text):
    start, end = '<!-- build:%s -->' % name, '<!-- /build:%s -->' % name
    i, j = html.index(start), html.index(end) + len(end)
    return html[:i] + text + html[j:]


def bundle(files):
    return '\n'.join(read(SRC, f) for f in files)


def script(code):
    return '<script>\n%s\n</script>' % code.replace('</script', '<\\/script')


def menu_js():
    return 'window.KFL=window.KFL||{};KFL.MENU=%s;' % json.dumps(load_json('data', 'menu.json'), ensure_ascii=False, separators=(',', ':'))


def mark_concept(html, title):
    """공개본 표시: 제목에 '시안', 검색 노출 차단, 상단 배너"""
    html = re.sub(r'<title>.*?</title>', '<title>%s</title>\n%s' % (title, NOINDEX), html, count=1, flags=re.S)
    return html.replace(SKIP, SKIP + '\n' + BANNER, 1)
