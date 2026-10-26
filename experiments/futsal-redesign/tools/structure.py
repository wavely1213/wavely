"""정리된 원본 본문(html)을 페이지 종류별 구조 데이터로 바꾼다.

원본은 배치용 표로 화면을 짰기 때문에 그대로 옮기면 칸이 들쭉날쭉하다.
여기서는 글자·링크·그림을 하나도 바꾸지 않고(띄어 쓴 이름·항목명의 글자 사이 공백만 붙임)
어떤 값인지만 골라 담는다. 화면은 src/js/pages/views-struct.js 가 그린다.

  teams      FK리그구단소개: 구단 로고 목록
  team       구단 상세: 기본 정보 · 연혁 · 임원진(각오) · 선수단
  events     대회 목록(생활체육·FK리그일정·FK CUP·대회신청): 상태 · 대회명 · 장소 · 기간
  broadcasts FK리그/FK CUP 중계: 경기 · 대회 · 일시 · 중계 링크
  stadiums   풋살장현황: 구장 카드(사진·주소·홈페이지·면수·연락처)
  unions     산하단체현황: 시도연맹 → 시군구연맹 링크
  facts      찾아오시는길·기부금: 항목/값 표
"""
import re
from bs4 import BeautifulSoup

# 원본 상태 그림(common/images/stepN.gif)에 적힌 글자
STEP = {'1': '준비기간', '2': '접수기간', '3': '공람기간', '4': '진행기간', '5': '대회종료', '6': '접수마감'}
TEAM_PREFIX = 'mng_'
EVENT_PAGES = {'LeagueList', 'mng_GameList', 'mng_GameCupList', 'refereeLeagueList'}
BROADCAST_PAGES = {'popup_onstn_league', 'popup_onstn_cup'}


def soup(html):
    return BeautifulSoup(html, 'lxml')


def txt(el):
    s = el.get_text(' ', strip=True) if hasattr(el, 'get_text') else str(el)
    return re.sub(r'\s+', ' ', s).strip()


def unspace(s):
    """'주 소'·'정 시 운'처럼 글자마다 띄운 한글만 붙인다(여러 이름은 / , 로 나뉜 채 유지)."""
    parts = re.split(r'(\s*[/,]\s*)', s)
    return ''.join(p.strip().replace(' ', '') if re.fullmatch(r'\s*(?:[가-힣] )+[가-힣]\s*', p) else p
                   for p in parts).strip()


def lines(el):
    """<br> 로 나뉜 줄 목록."""
    html = re.sub(r'\s*\n\s*', ' ', el.decode_contents())  # 소스 줄바꿈은 공백
    html = re.sub(r'<br\s*/?>', '\n', html)
    return [re.sub(r'\s+', ' ', l).strip() for l in BeautifulSoup(html, 'lxml').get_text().split('\n') if l.strip()]


def link(el):
    a = el.find('a') if el else None
    return a.get('href') if a else None


def img(el):
    i = el.find('img') if el else None
    return i.get('src') if i else None


# ---------- 구단 ----------

def teams(page):
    s = soup(page['html'])
    items = []
    for a in s.select('td a[href]'):
        i = a.find('img')
        if i:
            items.append({'name': i.get('alt', '').strip(), 'href': a['href'], 'logo': i['src']})
    return dict(page, type='teams', items=items)


def team(page):
    s = soup(page['html'])
    tables = s.find_all('table')
    if len(tables) < 3:
        return page
    info_t, staff_t, roster_t = tables[0], tables[-2], tables[-1]
    info = [[unspace(txt(tr.th)), txt(tr.td)] for tr in info_t.find_all('tr') if tr.th and tr.td]
    # 연혁: 기본 정보 표를 담은 단 나눔 다음의 글 덩어리
    history = []
    cols = s.find(class_='cols')
    nxt = cols.find_next_sibling('div') if cols else None
    if nxt and not nxt.find('table') and not nxt.find('a'):
        history = lines(nxt)
    staff, messages = [], []
    for tr in staff_t.find_all('tr'):
        ths, tds = tr.find_all('th'), tr.find_all('td')
        if ths:
            row = [[unspace(txt(h)), unspace(txt(d))] for h, d in zip(ths, tds)]
            staff.extend(row)
            last = row
        elif tds and all(td.get('colspan') for td in tds):
            # 바로 위 줄 임원(단장·감독)의 각오
            for (role, name), td in zip(last, tds):
                if txt(td):
                    messages.append({'role': role, 'name': name, 'text': txt(td)})
    roster = []
    for tr in roster_t.find_all('tr')[1:]:
        cells = [txt(td) for td in tr.find_all('td')]
        for i in range(0, len(cells) - 2, 3):
            if cells[i]:
                roster.append({'name': cells[i], 'no': cells[i + 1], 'pos': cells[i + 2]})
    head = [unspace(txt(th)) for th in roster_t.find_all('tr')[0].find_all('th')[:3]]
    return dict(page, type='team', team={
        'name': next((v for k, v in info if k == '구단명'), page['title']),
        'photo': img(cols) if cols else None,
        'info': [kv for kv in info if kv[0] != '구단명'],
        'history': history, 'staff': staff, 'messages': messages,
        'rosterHead': head, 'roster': roster,
    })


# ---------- 대회 목록 ----------

def events(page):
    s = soup(page['html'])
    note = ''
    cols = s.find(class_='cols')
    if cols:
        first = cols.find('div')
        note = txt(first) if first and '변경' in txt(first) else ''
    table = s.find('table')
    head = [unspace(txt(th)) for th in table.find('tr').find_all('th')]
    rows = []
    for tr in table.find_all('tr'):
        tds = tr.find_all('td', recursive=False)
        if len(tds) != len(head):
            continue
        rec = {}
        for h, td in zip(head, tds):
            if '상태' in h:
                m = re.search(r'step(\d)', img(td) or '')
                rec['status'] = STEP.get(m.group(1), '') if m else txt(td)
            elif h == '대회명':
                ls = lines(td)
                rec['name'] = ls[-1] if ls else ''
                if len(ls) > 1:
                    rec['region'] = ls[0]
                rec['href'] = link(td)
            else:
                key = {'대회참가': 'entry', '대회장소': 'place', '대회기간': 'period', '접수기간': 'receipt'}.get(h, h)
                rec[key] = re.sub(r'\s*~\s*', ' ~ ', txt(td))
        rows.append(rec)
    return dict(page, type='events', note=note, columns=head, rows=rows)


# ---------- 중계 ----------

def broadcasts(page):
    s = soup(page['html'])
    items = []
    for td in s.find_all('td'):
        ps = td.find_all('p')
        if not ps or not td.find('a'):
            continue
        match = txt(ps[0].find('b'))
        links = [{'label': txt(a).strip('[] ').strip(), 'href': a['href']} for a in td.find_all('a')]
        info = lines(ps[-1])
        comp = info[0].strip('<> ') if info else ''
        when = info[1] if len(info) > 1 else ''
        items.append({'match': match, 'comp': comp, 'when': when, 'links': links})
    return dict(page, type='broadcasts', items=items)


# ---------- 풋살장 ----------

def stadiums(page):
    s = soup(page['html'])
    # 원본 안내 "상세 정보는 경기장 클릭하면…"은 새 화면에 상세 보기가 없어 옮기지 않는다
    items = []
    for cols in s.find_all(class_='cols'):
        lis = cols.find_all('li')
        if not lis or not cols.find('img'):
            continue
        rec = {'name': txt(lis[0]), 'photo': img(cols)}
        for li in lis[1:]:
            b = li.find('b')
            if not b:
                continue
            key = txt(b).rstrip(': ').strip()
            val = txt(li)[len(txt(b)):].strip()
            k = {'주소': 'addr', '홈페이지': 'home', '면수': 'courts', '연락처': 'tel'}.get(key, key)
            rec[k] = link(li) if k == 'home' else val
        items.append(rec)
    return dict(page, type='stadiums', items=items)


# ---------- 산하단체 ----------

def unions(page):
    s = soup(page['html'])
    groups = []
    for th in s.find_all('th'):
        a = th.find('a')
        name = txt(th).split(':')[0].strip()
        tr = th.find_parent('tr').find_next_sibling('tr')
        subs = []
        if tr:
            for x in tr.find_all('a'):
                subs.append({'name': txt(x), 'href': x['href']})
        groups.append({'name': name, 'href': a['href'] if a else None, 'items': subs})
    return dict(page, type='unions', groups=groups)


# ---------- 항목/값 표 ----------

def location(page):
    s = soup(page['html'])
    a = s.find('a')
    rows = [[txt(tr.th), txt(tr.td)] for tr in s.find_all('tr') if tr.th and tr.td]
    return dict(page, type='facts', map={'href': a['href'], 'img': img(a), 'alt': a.find('img').get('alt', '')} if a else None,
                rows=rows)


def donation(page):
    s = soup(page['html'])
    t = s.find_all('table')[-1]
    head = [txt(th) for th in t.find('tr').find_all('th')]
    body = [[txt(td) for td in tr.find_all('td')] for tr in t.find_all('tr')[1:]]
    width = max(len(r) for r in body)
    head = [''] * (width - len(head)) + head  # 원본 머리글이 한 칸 모자람(번호 칸) — 빈 칸으로 맞춤
    return dict(page, type='ledger', tabs=[txt(td) for td in s.find('table').find_all('td')], columns=head, rows=body)


# ---------- 후원사 ----------

def sponsors(page):
    s = soup(page['html'])
    items = []
    for box in s.select('.cols > div'):
        a = box.find('a')
        name = txt(box).lstrip('| ').strip()
        if a and a.find('img'):
            items.append({'name': name, 'href': a['href'], 'logo': img(a)})
    return dict(page, type='logos', items=items)


# ---------- 규정·정관: 장 · 조 · 문단 ----------

CHAPTER = re.compile(r'^(제\s*\d+\s*장(?=\s|$)|부\s*칙|별첨\s*\d*)')
ARTICLE = re.compile(r'^제\s*[\d０-９]+\s*조(?=\s|\(|$)')
ITEM = re.compile(r'^(\d+\.|[가-하]\.|[①-⑳]|\(\d+\)|-\s|\*)')


def law(page):
    s = soup(page['html'])
    ls = [re.sub(r'\s+', ' ', l).strip() for l in s.get_text('\n').split('\n') if l.strip()]
    title = []
    if '목 차' in ls:
        k = ls.index('목 차')
        title = ls[:k]
        first = ls[k + 1]
        ls = ls[k + 2:]
        ls = ls[ls.index(first):]  # 원본 목차는 건너뛰고(새로 만든다) 본문 첫 장부터
    blocks = []
    for l in ls:
        last = blocks[-1] if blocks else None
        if last and last['t'] in ('chapter', 'article') and last['text'].count('(') > last['text'].count(')'):
            last['text'] += ' ' + l  # 줄에서 잘린 조 제목 "제6조(윤리강령 및 축구, 풋살인" + "헌장)"
        elif CHAPTER.match(l):
            blocks.append({'t': 'chapter', 'text': l})
        elif ARTICLE.match(l):
            blocks.append({'t': 'article', 'text': l})
        elif ITEM.match(l) or not last or last['t'] != 'p':
            blocks.append({'t': 'p', 'text': l, 'item': bool(ITEM.match(l))})
        else:
            last['text'] += ' ' + l
    return dict(page, type='law', heading=title, blocks=blocks)


# ---------- 같은 머리글이 두 번 이어진 표(연도|개최국|우승국|연도|개최국|우승국) → 한 줄 머리글로 ----------

def unfold_tables(page):
    s = soup(page['html'])
    changed = False
    for t in s.find_all('table'):
        rows = t.find_all('tr')
        if not rows:
            continue
        head = [txt(c) for c in rows[0].find_all(['th', 'td'])]
        n = len(head) // 2
        if n < 2 or len(head) % 2 or head[:n] != head[n:]:
            continue
        left, right = [], []
        for tr in rows[1:]:
            cells = [c.extract() for c in tr.find_all(['th', 'td'])]
            left.append(cells[:n])
            if len(cells) >= 2 * n and any(txt(c) for c in cells[n:]):
                right.append(cells[n:])
            tr.decompose()
        for c in rows[0].find_all(['th', 'td'])[n:]:
            c.decompose()
        for cells in left + right:
            tr = s.new_tag('tr')
            for c in cells:
                tr.append(c)
            t.append(tr)
        changed = True
    if changed:
        body = s.body or s
        page = dict(page, html=body.decode_contents())
    return page


# ---------- 글 페이지(인사말·비전&목표): 문단을 다시 잇고, 그림 속 글자는 옮겨 적는다 ----------

SENT_END = re.compile(r'[.!?。…”"\'다요]\s*$')


def paras_of(container):
    """<p> 들을 문단으로. 문장 중간에서 끊긴 <p>(끝이 마침표 등이 아님)는 다음 <p>와 잇는다."""
    out = []
    pending = ''
    for p in container.find_all('p'):
        if p.find('img'):
            continue
        t = txt(p)
        if not t:
            continue
        pending = (pending + ' ' + t).strip() if pending else t
        if SENT_END.search(pending):
            out.append(pending)
            pending = ''
    if pending:
        out.append(pending)
    return out


def greeting(page):
    s = soup(page['html'])
    photo = img(s)
    blocks = []
    sign = None
    for p in s.find_all('p'):
        parts = lines(p)
        if not parts:
            continue
        if p.find('b') and p is s.find_all('p')[-1]:
            name = unspace(txt(p.find('b')))
            sign = {'role': txt(p)[:-len(txt(p.find('b')))].strip(), 'name': name}
            continue
        if parts[0].startswith('*'):
            blocks.append({'t': 'h', 'text': parts[0].lstrip('* ').strip()})
            parts = parts[1:]
        # <br> 은 문단 나눔으로(lines), 소스 줄바꿈은 한 문단 안 공백으로
        blocks.extend({'t': 'p', 'text': x} for x in parts)
    # 첫 문단(인사)은 크게
    if blocks and blocks[0]['t'] == 'p':
        blocks[0]['t'] = 'lead'
    alt = (sign['role'] + ' ' + sign['name']) if sign else ''
    return dict(page, type='article', aside={'img': photo, 'alt': alt}, blocks=blocks, sign=sign or None)


# 비전&목표의 그림(re_vision_img.gif · re_vision_img2.gif)에 적힌 글자를 그대로 옮겨 적은 것
AGE_PYRAMIDS = [
    {'title': '타 종목 연령대분포도', 'shape': 'inverted', 'levels': ['성인', '청소년', '유아']},
    {'title': '풋살 연령대 분포도', 'shape': 'pyramid', 'levels': ['30-40대부,여자부', 'U-16, U19, 20대부', 'U-7, U-9, U-11, U-13']},
]
EFFECTS = {
    'center': '참여스포츠, 엘리트스포츠, 관람 스포츠로서의 발전가능성',
    'items': ['유,청소년 생활체육부터 튼튼한 기반을 쌓는 풋살',
              '풋살 보급화를 통해 언제, 누구나 풋살을 즐길 수 있는 환경 조성',
              '생활체육과 엘리트체육의 선순환 발전 구조',
              '풋살 발전을 통한 대한민국 축구발전 가능성'],
}


def vision(page):
    s = soup(page['html'])
    blocks = []
    top = s.find('img', src=re.compile('vision_img4'))
    if top:
        blocks.append({'t': 'figure', 'img': top['src'], 'alt': '한국풋살연맹과 국민생활체육 전국풋살연합회 로고'})
    for box in s.select('div > div > div'):
        head = box.find('b')
        if head and txt(head) in ('목표', '기대효과'):
            blocks.append({'t': 'h', 'text': txt(head)})
            items = [txt(p) for p in box.find_all('p') if txt(p) and not p.find('b') and not p.find('img')]
            plain = [x for x in items if not x.startswith('-')]
            bullets = [x.lstrip('- ').strip() for x in items if x.startswith('-')]
            blocks.extend({'t': 'p', 'text': x} for x in plain)
            if bullets:
                blocks.append({'t': 'list', 'items': bullets})
            if box.find('img', src=re.compile(r'vision_img\.gif')):
                blocks.append({'t': 'pyramids', 'items': AGE_PYRAMIDS})
            if box.find('img', src=re.compile('vision_img2')):
                blocks.append({'t': 'effects', **EFFECTS})
        elif not head and box.find('p') and not box.find('img'):
            blocks.extend({'t': 'p', 'text': x} for x in paras_of(box))
    return dict(page, type='article', aside=None, blocks=blocks, sign=None)


# 조직도 그림(re_organization.jpg)을 옮겨 적은 것. 글자 사이 공백("회 장")만 붙였다.
ORG = {
    'assembly': {'name': '대의원총회', 'children': ['시도연맹', 'FK리그구단']},
    'head': '회장',
    'audit': ['감사', '고문'],
    'chain': ['부회장단', '전무이사', '사무총장'],
    'board': {'name': '이사회', 'children': ['분과위원회'], 'after': '부회장단'},
    'teams': [{'name': '사업팀', 'children': ['FK리그', '생활체육']}, {'name': '총무팀', 'children': []}],
}


def org(page):
    return dict(page, type='org', org=ORG)


# ---------- 원본 글(풋살이란·풋살의역사): <br><br> 은 문단, <br> 하나는 원본 편집기의 줄바꿈이라 잇는다 ----------

def join_soft(a, b):
    """원본이 단어 중간에서 줄을 바꾼 경우("우루과<br>이 몬테비데오")는 붙이고, 아니면 한 칸 띄워 잇는다."""
    if not a:
        return b
    if re.match(r'^[가-힣](?:[\s,.)]|$)', b) and re.search(r'[가-힣]$', a):
        return a + b
    return a + ' ' + b


def text_paras(el):
    html = re.sub(r'\s*\n\s*', ' ', el.decode_contents())
    out = []
    for chunk in re.split(r'(?:<br\s*/?>\s*){2,}', html):
        para = ''
        for line in re.split(r'<br\s*/?>', chunk):
            t = re.sub(r'\s+', ' ', BeautifulSoup(line, 'lxml').get_text()).strip()
            if t:
                para = join_soft(para, t)
        if para:
            out.append(para)
    return out


def html_blocks(root):
    blocks, aside = [], None
    for el in root.find_all(['div', 'h1', 'h2', 'h3', 'table', 'li', 'img'], recursive=True):
        if el.name == 'img':
            if el.find_parent('table') is None:
                aside = {'img': el['src'], 'alt': el.get('alt', '')}
            continue
        if el.name in ('h1', 'h2', 'h3'):
            blocks.append({'t': 'h', 'text': txt(el)})
        elif el.name == 'table':
            rows = el.find_all('tr')
            head = [unspace(txt(c)) for c in rows[0].find_all(['th', 'td'])]
            body = [[unspace(txt(c)) for c in tr.find_all(['th', 'td'])] for tr in rows[1:]]
            blocks.append({'t': 'table', 'head': head, 'rows': [r for r in body if any(r)]})
        elif el.name == 'li' or (el.name == 'div' and not el.find(['div', 'table', 'ul', 'h1', 'h2', 'img'])):
            if el.find_parent('table') is None:
                blocks.extend({'t': 'p', 'text': x} for x in text_paras(el))
    return blocks, aside


def prose_article(page):
    s = soup(unfold_tables(page)['html'])
    blocks, aside = html_blocks(s.body or s)
    # 따옴표로 시작하는 짧은 첫 줄들은 머리말(크게)
    for b in blocks[:2]:
        if b['t'] == 'p' and b['text'].startswith('“') and len(b['text']) < 40:
            b['t'] = 'lead'
    return dict(page, type='article', aside=aside, blocks=blocks, sign=None)


# 클럽등록: 원본 단계 그림(re_step01.gif)의 글자를 옮겨 적음. 등록 자체는 원본 사이트에서만 된다
CLUB_STEPS = ['약관동의', '정보입력', '등록완료']


def club_join(page):
    return dict(page, type='article', aside=None, sign=None, blocks=[
        {'t': 'steps', 'items': CLUB_STEPS},
        {'t': 'p', 'text': '클럽 등록은 원본 사이트(futsal.or.kr)에서 약관 동의 후 진행합니다.'},
        {'t': 'link', 'href': page['origin'], 'text': '원본 사이트에서 클럽 등록하기'},
    ])


def structure(page):
    slug = page['slug']
    if slug == 'mng_FKLeagueTeam':
        return teams(page)
    if slug in EVENT_PAGES:
        return events(page)
    if slug in BROADCAST_PAGES:
        return broadcasts(page)
    if slug == 'mng_stadiumList':
        return stadiums(page)
    if slug == 'UniteList':
        return unions(page)
    if slug == 'intr_locationLoad':
        return location(page)
    if slug == 'DonationList':
        return donation(page)
    if slug == 'intr_speechLoad':
        return greeting(page)
    if slug == 'intr_introduceLoad':
        return vision(page)
    if slug == 'intr_groupLoad':
        return org(page)
    if slug in ('fal_infoLoad', 'fal_historyLoad'):
        return prose_article(page)
    if slug == 'clubjoin':
        return club_join(page)
    if slug == 'intr_sponLoad':
        return sponsors(page)
    if slug in ('mng_FKRule', 'intr_historyLoad'):
        return law(page)
    if slug.startswith(TEAM_PREFIX) and '구단명' in page['html']:
        return team(page)
    return unfold_tables(page)
