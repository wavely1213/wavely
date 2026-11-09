"""원본 페이지 HTML을 새 사이트용으로 정리하는 공용 함수.

- content_block(): 원본 페이지에서 본문(#content)만 잘라낸다
- slug_for(): 원본 주소 → 새 사이트 페이지 이름
- Sanitizer: 스크립트·스타일·폼·장식 요소를 걷어내고, 링크와 이미지를 새 사이트 경로로 바꾼다
"""
import html, re
from urllib.parse import quote, unquote
from bs4 import BeautifulSoup, Comment, NavigableString

BASE = 'http://www.futsal.or.kr/'
ORIGIN_IMG = re.compile(r'^/?(?:FutsalUnite/)?((?:upload|common/images)/.+)$', re.I)


def content_block(raw):
    i = raw.find('<div id="content">')
    if i < 0:
        i = raw.find('<body')
    j = raw.find('<!-- footer start -->', i)
    return raw[i:j if j > 0 else len(raw)]


def slug_for(href):
    """원본 경로를 새 사이트 페이지 이름으로. 외부 주소면 None."""
    if not href or href.startswith('http'):
        return None
    m = re.match(r'brd_boardLoad\.action\?board_id=(\d+)', href)
    if m:
        return 'board-' + m.group(1)
    return href.split('?')[0].replace('.action', '')


def img_url(path):
    """원본 이미지 경로(upload/… 또는 common/images/…) → 새 사이트 주소.
    이미지는 저장하지 않고 Vercel 이 /o/ 아래로 원본을 HTTPS로 대신 받아 준다(vercel.json rewrites)."""
    return 'o/' + quote(unquote(path), safe='/')


class Sanitizer:
    """본문 HTML 정리. images 에 필요한 원본 이미지 경로가 모인다."""

    DROP = {'script', 'style', 'noscript', 'form', 'input', 'select', 'option', 'button', 'textarea',
            'iframe', 'object', 'embed', 'meta', 'link', 'i'}
    UNWRAP = {'span', 'font', 'o:p', 'center', 'u', 'ins', 'label', 'nobr', 'colgroup', 'col', 'tbody', 'thead'}
    KEEP_ATTRS = {'a': {'href'}, 'img': {'src', 'alt'}, 'td': {'colspan', 'rowspan'}, 'th': {'colspan', 'rowspan'}}
    # 장식용 원본 이미지(글머리표·버튼·아이콘)
    DECOR = re.compile(r'(re_dot|point\d|bullet|icon|btn|open\.gif|close\.gif|ajax-loader|blank|arrow|more|_bg\.|line\.)', re.I)

    def __init__(self, link_map):
        self.link_map = link_map  # (onclick/href 문자열) → 새 주소 또는 None
        self.images = set()

    def clean(self, fragment, drop_selectors=()):
        soup = BeautifulSoup(fragment, 'lxml')
        for c in soup.find_all(string=lambda s: isinstance(s, Comment)):
            c.extract()
        for sel in ('.subNav', '.Navi', '.paging', '.page', '.search', '#loading') + tuple(drop_selectors):
            for el in soup.select(sel):
                el.decompose()
        for el in soup.find_all(list(self.DROP)):
            el.decompose()
        # 원본이 배치용으로 쓴 목록(ul.cols·ul.subcols)은 글머리표 없는 단 나눔으로
        for ul in soup.select('ul.cols, ul.subcols'):
            ul.name = 'div'
            ul.attrs = {'class': 'cols'}
            for li in ul.find_all('li', recursive=False):
                li.name = 'div'
                li.attrs = {}
        # hwp 편집기가 남긴 JSON 블록
        for el in soup.select('[id^=hwpEditor]'):
            el.unwrap()
        for el in soup.find_all(True):
            if el.name in self.UNWRAP:
                el.unwrap()
                continue
            if el.name == 'img':
                self._img(el)
                continue
            if el.name == 'a':
                self._a(el)
                continue
            keep = self.KEEP_ATTRS.get(el.name, set())
            cls = 'cols' if el.get('class') in ('cols', ['cols']) else None
            el.attrs = {k: v for k, v in el.attrs.items() if k in keep}
            if cls:
                el.attrs['class'] = cls
        # 글자 없는 빈 문단(<p><b><br></b></p> 등) 정리
        for el in soup.find_all(['p', 'div', 'b', 'strong']):
            if not el.get_text(strip=True) and not el.find(['img', 'table', 'a', 'iframe']):
                el.decompose()
        body = soup.body or soup
        out = body.decode_contents()
        return self._tidy(out)

    def _img(self, el):
        src = (el.get('src') or '').strip()
        m = ORIGIN_IMG.match(src.replace(BASE, '/'))
        if not m or self.DECOR.search(src):
            el.decompose()
            return
        path = m.group(1)
        self.images.add(path)
        alt = el.get('alt') or ''
        el.attrs = {'src': img_url(path), 'alt': alt, 'loading': 'lazy'}

    def _a(self, el):
        href = (el.get('href') or '').strip()
        onclick = el.get('onclick') or ''
        target = None
        for key in (href, onclick):
            if key and key != '#':
                target = self.link_map(key)
                if target:
                    break
        if not target:
            el.unwrap()
            return
        el.attrs = {'href': target}
        if target.startswith('http'):
            el.attrs.update({'target': '_blank', 'rel': 'noopener'})

    @staticmethod
    def _tidy(s):
        s = s.replace('\xa0', ' ').replace('﻿', '')
        s = re.sub(r'<(p|div|li|td|th|h\d)>\s*(?:<br/?>\s*)*</\1>', '', s)  # 빈 블록
        s = re.sub(r'(<br/?>\s*){3,}', '<br><br>', s)
        s = re.sub(r'[ \t]+', ' ', s)
        s = re.sub(r'\n\s*\n+', '\n', s)
        return s.strip()


def text(el):
    return re.sub(r'\s+', ' ', html.unescape(el.get_text(' ', strip=True))).replace('﻿', '').strip()
