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
    html = re.sub(r'<br\s*/?>', '\n', el.decode_contents())
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
    if slug == 'intr_sponLoad':
        return sponsors(page)
    if slug in ('mng_FKRule', 'intr_historyLoad'):
        return law(page)
    if slug.startswith(TEAM_PREFIX) and '구단명' in page['html']:
        return team(page)
    return unfold_tables(page)
