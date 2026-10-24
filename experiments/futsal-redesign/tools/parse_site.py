"""raw/site 에 저장한 원본 페이지를 새 사이트용 데이터로 바꾼다.

출력
  data/site/<slug>.json          메뉴 페이지 하나 (종류: html·board·news·photo·video·table)
  data/site/posts/<slug>/<id>.json 게시글·뉴스 본문
  data/site/images.json          새 사이트가 쓰는 원본 이미지 경로 목록 (crawl.py images 단계가 사용)
사용: python3 -I tools/parse_site.py
"""
import json, os, re, sys
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sitelib import BASE, Sanitizer, content_block, img_url, slug_for, text  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'raw', 'site')
OUT = os.path.join(ROOT, 'data', 'site')
MENU = json.load(open(os.path.join(ROOT, 'data', 'menu.json'), encoding='utf-8'))
IDX = json.load(open(os.path.join(RAW, 'index.json'), encoding='utf-8'))

PAGES = {}  # slug → (분류, 이름, 원본 경로)
for g in MENU:
    for it in g.get('items', []):
        s = slug_for(it['href'])
        if s:
            PAGES[s] = (g['label'], it['label'], it['href'])
    if g.get('href') and slug_for(g['href']):
        PAGES[slug_for(g['href'])] = (g['label'], g['label'], g['href'])

KIND = {
    'board-00': 'board', 'board-03': 'board', 'board-05': 'board', 'board-09': 'board', 'board-10': 'board', 'board-14': 'board',
    'mng_newsList': 'news', 'photo': 'photo', 'VideoList': 'video',
    'RefereeList': 'table', 'NewClubList': 'table', 'fal_stadiumLoad': 'table',
}
TEAMS = {}  # 구단 상세 slug → 이름 (구단소개 페이지에서 채움)


def raw(path, post=None):
    key = 'POST:%s?%s' % (path, post) if post else path
    rel = IDX.get(key)
    if not rel:
        return None
    with open(os.path.join(RAW, rel), encoding='utf-8', errors='replace') as f:
        return f.read()


def pages_of(path):
    """목록의 1쪽부터 마지막 쪽까지 원본 HTML"""
    out, n = [], 1
    sep = '&' if '?' in path else '?'
    while True:
        h = raw(path if n == 1 else '%s%spageNum=%d' % (path, sep, n))
        if h is None:
            return out
        out.append(h)
        n += 1


def link_map(current):
    """원본 링크(href 또는 onclick) → 새 사이트 주소"""
    board = re.search(r'board-(\d+)', current)

    def f(s):
        s = s.strip()
        m = re.search(r"readBoard\('(\d+)'(?:\s*,\s*'(\d+)')?\)", s)
        if m:
            bid = m.group(2) or (board.group(1) if board else None)
            return 'board-%s.html?id=%s' % (bid, m.group(1)) if bid else None
        m = re.search(r'news_(?:read|view)\((\d+)\)', s)
        if m:
            return 'mng_newsList.html?id=' + m.group(1)
        m = re.search(r"league_?[rR]ead\('?(\d+)'?\)", s)
        if m:
            return BASE + 'leagueRead.action?league_seq=%s&menu_sub_id=1' % m.group(1)
        m = re.search(r"subSitePop\('([^']+)'\)", s)
        if m:
            return BASE + m.group(1)
        m = re.search(r"clubSitePop\('([^']+)'\)", s)
        if m:
            return m.group(1)
        if s.startswith(('http://', 'https://', 'mailto:', 'tel:')):
            return s
        if s.startswith('javascript') or not s:
            return None
        path = s.lstrip('/').replace('FutsalUnite/', '', 1)
        sl = slug_for(path)
        if sl in PAGES or sl in TEAMS:
            return sl + '.html'
        if re.match(r'(upload/|attacheDown|[A-Za-z_]+\.action)', path):
            return BASE + path
        return None
    return f


def save(rel, obj):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))


IMAGES = set()


def sanitize(slug, fragment, drop=()):
    s = Sanitizer(link_map(slug))
    out = s.clean(fragment, drop)
    IMAGES.update(s.images)
    return out


def meta(slug):
    cat, label, href = PAGES.get(slug) or ('FK리그', TEAMS.get(slug, slug), slug + '.action')
    return {'slug': slug, 'cat': cat, 'title': label, 'origin': BASE + href}


# ---------- 종류별 변환 ----------

def parse_html(slug):
    path = PAGES[slug][2] if slug in PAGES else slug + '.action'
    parts = [content_block(h) for h in pages_of(path)]
    if slug == 'mng_FKLeagueTeam':
        for a, name in re.findall(r'href="(mng_[A-Za-z]+)\.action"[^>]*>\s*<img[^>]*alt="([^"]+)"', parts[0]):
            TEAMS[a] = name.strip()
    html = '\n'.join(sanitize(slug, p) for p in parts)
    m = meta(slug)
    # 글 없이 그림 한 장인 페이지(조직도 등)는 그림 설명으로 페이지 이름을 쓴다
    if not BeautifulSoup(html, 'lxml').get_text(strip=True) and html.count('<img') == 1:
        html = html.replace('alt=""', 'alt="%s"' % m['title'], 1)
    return dict(m, type='html', html=html)


def parse_board(slug):
    path = PAGES[slug][2]
    bid = slug.split('-')[1]
    posts, seen = [], set()
    for h in pages_of(path):
        soup = BeautifulSoup(content_block(h), 'lxml')
        for tr in soup.find_all('tr'):
            a = tr.find('a', href=re.compile(r'readBoard'))
            if not a:
                continue
            seq = re.search(r"readBoard\('(\d+)'", a['href']).group(1)
            if seq in seen:
                continue
            seen.add(seq)
            tds = [text(td) for td in tr.find_all('td')]
            pinned = '[상시]' in tds[0]
            dates = [t for t in tds if re.fullmatch(r'\d{4}-\d{2}-\d{2}', t)]
            nums = [t for t in tds[tds.index(dates[0]) + 1:] if t.isdigit()] if dates else []
            posts.append({'id': seq, 'no': None if pinned else tds[0], 'pinned': pinned, 'title': text(a),
                          'date': dates[0] if dates else '', 'views': int(nums[0]) if nums else None})
            body = raw('brd_boardRead.action?seq=%s&board_id=%s' % (seq, bid))
            if body:
                save('posts/%s/%s.json' % (slug, seq), parse_post(slug, body))
    return dict(meta(slug), type='board', posts=posts)


def parse_post(slug, h):
    """게시글·뉴스 상세: 제목, 글쓴이, 작성일, 조회수, 첨부, 본문"""
    soup = BeautifulSoup(content_block(h), 'lxml')
    table = soup.select_one('table.table_type4') or soup
    rows = table.find_all('tr', recursive=False) or table.find_all('tr')
    title = text(rows[0]) if rows else ''
    info = text(rows[1]) if len(rows) > 1 else ''
    get = lambda k: (re.search(k + r'\s*:\s*([^\s].*?)(?=\s+(?:글쓴이|작성일|조회수)\s*:|$)', info) or [None, ''])[1].strip()
    files, body = [], ''
    for tr in rows[2:]:
        links = tr.find_all('a', href=re.compile(r'attacheDown'))
        if links and not files:
            files = [{'name': text(a), 'href': BASE + a['href']} for a in links]
            continue
        body += tr.td.decode_contents() if tr.td else str(tr)
    return {'title': title, 'author': get('글쓴이'), 'date': get('작성일'), 'views': get('조회수'),
            'files': files, 'html': sanitize(slug, body)}


def parse_news(slug):
    items = []
    for h in pages_of(PAGES[slug][2]):
        soup = BeautifulSoup(content_block(h), 'lxml')
        for box in soup.select('.newsBox'):
            m = re.search(r'news_(?:read|view)\((\d+)\)', str(box))
            if not m:
                continue
            seq = m.group(1)
            img = box.find('img')
            src = None
            if img and img.get('src'):
                p = img['src'].replace('/FutsalUnite/', '', 1).lstrip('/')
                IMAGES.add(p)
                src = img_url(p)
            lis = box.select('li.right li')
            title = text(lis[0]) if lis else ''
            summary = text(lis[1]) if len(lis) > 1 else ''
            date = re.search(r'\d{4}-\d{2}-\d{2}', text(box))
            items.append({'id': seq, 'title': title, 'summary': summary if summary != title else '',
                          'date': date.group(0) if date else '', 'img': src})
            body = raw('mng_newsView.action?b_seq=' + seq)
            if body:
                save('posts/%s/%s.json' % (slug, seq), parse_post(slug, body))
    return dict(meta(slug), type='news', posts=items)


def parse_photo(slug):
    items = []
    for h in pages_of(PAGES[slug][2]):
        soup = BeautifulSoup(content_block(h), 'lxml')
        for img in soup.find_all('img', onclick=re.compile(r'photoView')):
            seq = re.search(r'photoView\((\d+)', img['onclick']).group(1)
            p = img['src'].replace('/FutsalUnite/', '', 1).lstrip('/')
            cap = img.find_next('td', class_='tx_center')
            IMAGES.add(p)
            items.append({'id': seq, 'title': text(cap) if cap else '', 'img': img_url(p)})
    return dict(meta(slug), type='photo', posts=items)


def parse_video(slug):
    items = []
    soup = BeautifulSoup(content_block(raw(PAGES[slug][2])), 'lxml')
    for a in soup.find_all('a', href=re.compile(r"show\('\d+'\)")):
        seq = re.search(r"show\('(\d+)'\)", a['href']).group(1)
        img = a.find('img')
        p = img['src'].replace('/FutsalUnite/', '', 1).lstrip('/') if img else None
        if p:
            IMAGES.add(p)
        cap = a.find_next('td', class_='tx_center')
        lines = [t.strip() for t in cap.get_text('\n').split('\n') if t.strip()] if cap else []
        date = next((l.strip('[]') for l in lines if re.fullmatch(r'\[\d{4}-\d{2}-\d{2}\]', l)), '')
        lines = [l for l in lines if not l.startswith('[')]
        items.append({'id': seq, 'title': lines[0] if lines else '', 'sub': lines[1] if len(lines) > 1 else '',
                      'date': date, 'img': img_url(p) if p else None,
                      'href': BASE + 'VideoList.action'})
    return dict(meta(slug), type='video', posts=items)


def table_rows(htmls, head_hint):
    """여러 쪽의 표를 하나로: 머리글에 head_hint 가 들어간 표를 찾는다"""
    columns, rows = None, []
    for h in htmls:
        soup = BeautifulSoup(h, 'lxml')
        for t in soup.find_all('table'):
            ths = [text(th) for th in t.find_all('th')]
            if head_hint not in ths:
                continue
            columns = columns or ths
            for tr in t.find_all('tr'):
                tds = [text(td) for td in tr.find_all('td')]
                if len(tds) == len(columns):
                    rows.append(tds)
    return columns or [], rows


def parse_table(slug):
    if slug == 'NewClubList':
        form = 'searchValue=&searchKey=&areacode1=&areacode2=&codeView01=area&pageNum=%d'
        htmls, n = [], 1
        while True:
            h = raw('SearchClubList.action', post=form % n)
            if h is None:
                break
            htmls.append(h)
            n += 1
        columns, rows = table_rows(htmls, '클럽 명')
    elif slug == 'RefereeList':
        columns, rows = table_rows([content_block(h) for h in pages_of(PAGES[slug][2])], '성명')
    else:  # 전국풋살구장: 지역별 표 → 지역 열을 붙여 하나로
        soup = BeautifulSoup(content_block(raw(PAGES[slug][2])), 'lxml')
        columns, rows = ['시도'], []
        for t in soup.find_all('table'):
            ths = [text(th) for th in t.find_all('th')]
            if '경기장 명칭' not in ths:
                continue
            region = t.find_previous(string=re.compile(r'\S'))
            prev = t.find_previous(['h1', 'h2', 'h3', 'h4', 'p', 'div', 'span', 'b', 'strong'])
            region = text(prev) if prev else ''
            if len(columns) == 1:
                columns += ths
            for tr in t.find_all('tr'):
                tds = [text(td) for td in tr.find_all('td')]
                if len(tds) == len(ths):
                    rows.append([region] + tds)
    return dict(meta(slug), type='table', columns=columns, rows=rows)


PARSERS = {'html': parse_html, 'board': parse_board, 'news': parse_news, 'photo': parse_photo,
           'video': parse_video, 'table': parse_table}


def main():
    os.makedirs(OUT, exist_ok=True)
    order = ['mng_FKLeagueTeam'] + [s for s in PAGES if s != 'mng_FKLeagueTeam']
    summary = {}
    for slug in order:
        kind = KIND.get(slug, 'html')
        if raw(PAGES[slug][2]) is None:
            print('skip (not crawled)', slug)
            continue
        page = PARSERS[kind](slug)
        save(slug + '.json', page)
        summary[slug] = (kind, len(page.get('posts') or page.get('rows') or []) or len(page.get('html', '')))
    for slug, name in TEAMS.items():
        if raw(slug + '.action'):
            page = parse_html(slug)
            page['title'] = name
            save(slug + '.json', page)
            summary[slug] = ('team', len(page['html']))
    save('teams.json', [{'slug': k, 'name': v} for k, v in TEAMS.items()])
    save('images.json', sorted(IMAGES))
    for k, v in summary.items():
        print('%-28s %-6s %s' % (k, v[0], v[1]))
    print('images', len(IMAGES))


if __name__ == '__main__':
    main()
