"""원본(futsal.or.kr)의 메뉴 페이지 전체를 raw/site/ 에 저장한다.

1단계 pages : 메뉴 31개 페이지
2단계 lists : 여러 쪽짜리 목록의 모든 쪽 (pageNum=2..마지막), clubs: 클럽 목록(POST)
3단계 details: 목록에서 찾은 글·뉴스·포토·구단 상세 페이지
4단계 images : 저장한 페이지가 참조하는 업로드 이미지

이미 받은 URL은 건너뛰므로 중단 후 다시 실행해도 된다. 서버 부담을 줄이려고
요청 사이에 간격을 두고 동시 요청은 하지 않는다.
사용: python3 -I tools/crawl.py [pages|lists|clubs|details|images|all]
"""
import hashlib, json, os, re, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'raw', 'site')
INDEX = os.path.join(RAW, 'index.json')
BASE = 'http://www.futsal.or.kr/'
DELAY = 0.25

# config.js 의 메뉴와 같은 목록 (외부 사이트 제외)
MENU = [
    'intr_speechLoad.action', 'intr_introduceLoad.action', 'intr_groupLoad.action', 'UniteList.action',
    'intr_historyLoad.action', 'DonationList.action', 'intr_locationLoad.action',
    'fal_infoLoad.action', 'fal_historyLoad.action', 'brd_boardLoad.action?board_id=10', 'fal_stadiumLoad.action',
    'mng_FKLeagueTeam.action', 'brd_boardLoad.action?board_id=14', 'mng_GameList.action', 'mng_FKRule.action',
    'brd_boardLoad.action?board_id=03', 'brd_boardLoad.action?board_id=09', 'LeagueList.action', 'mng_GameCupList.action',
    'brd_boardLoad.action?board_id=00', 'mng_newsList.action', 'photo.action', 'VideoList.action',
    'popup_onstn_league.action', 'popup_onstn_cup.action',
    'NewClubList.action', 'clubjoin.action', 'mng_stadiumList.action',
    'RefereeList.action', 'brd_boardLoad.action?board_id=05', 'refereeLeagueList.action',
    'intr_sponLoad.action',
]


def load_index():
    try:
        with open(INDEX, encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def save_index(idx):
    with open(INDEX + '.tmp', 'w', encoding='utf-8') as f:
        json.dump(idx, f, ensure_ascii=False, indent=0)
    os.replace(INDEX + '.tmp', INDEX)


def name_for(url, binary):
    h = hashlib.md5(url.encode()).hexdigest()[:16]
    ext = os.path.splitext(url.split('?')[0])[1].lower() if binary else '.html'
    return ('img/' if binary else 'html/') + h + (ext or '.bin')


def fetch(idx, path, binary=False, post=None):
    """path(사이트 기준 상대 경로)를 받아 저장하고 로컬 파일 경로를 돌려준다.
    post가 있으면 그 본문으로 POST 요청하고, 색인 키는 'POST:경로?본문'으로 둔다."""
    key = 'POST:%s?%s' % (path, post) if post else path
    if key in idx:
        return os.path.join(RAW, idx[key])
    rel = name_for(key, binary)
    out = os.path.join(RAW, rel)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    for attempt in range(4):
        cmd = ['curl', '-sSL', '-m', '60', '-A', 'Mozilla/5.0', '-o', out, '-w', '%{http_code}']
        if post:
            cmd += ['-X', 'POST', '-d', post]
        r = subprocess.run(cmd + [BASE + path], capture_output=True, text=True)
        if r.stdout == '200':
            break
        time.sleep(2 ** attempt)
    else:
        print('FAIL', r.stdout, path, file=sys.stderr)
        return None
    idx[key] = rel
    time.sleep(DELAY)
    return out


def read(p):
    with open(p, encoding='utf-8', errors='replace') as f:
        return f.read()


def max_page(html):
    nums = [int(n) for n in re.findall(r'pageNum=(\d+)', html)]
    return max(nums) if nums else 1


def list_pages(page):
    """목록 페이지의 모든 쪽 경로"""
    sep = '&' if '?' in page else '?'
    return lambda n: page + sep + 'pageNum=' + str(n)


def details_from(page, html):
    """목록 HTML에서 상세 페이지 경로를 뽑는다"""
    out = []
    m = re.search(r'board_id=(\d+)', page)
    if m:
        out += ['brd_boardRead.action?seq=%s&board_id=%s' % (s, m.group(1))
                for s in re.findall(r"readBoard\('(\d+)'", html)]
    if page.startswith('mng_newsList'):
        out += ['mng_newsView.action?b_seq=' + s for s in re.findall(r'news_(?:read|view)\((\d+)\)', html)]
    # 포토는 목록에 사진·제목이 다 있어 상세를 받지 않는다
    if page.startswith('mng_FKLeagueTeam'):
        out += re.findall(r'href="(mng_[A-Za-z]+\.action)"', html)
    return out


def images_from(html):
    srcs = re.findall(r'(?:src|href)=["\']?(/(?:FutsalUnite/)?upload/[^"\'\s>]+)', html, re.I)
    return [s.replace('/FutsalUnite/', '/', 1).lstrip('/') for s in srcs]


def main(stage):
    idx = load_index()
    try:
        if stage in ('pages', 'all'):
            for p in MENU:
                fetch(idx, p)
            save_index(idx)
        if stage in ('lists', 'all'):
            for p in MENU:
                html = read(fetch(idx, p))
                url = list_pages(p)
                for n in range(2, max_page(html) + 1):
                    fetch(idx, url(n))
                save_index(idx)
                print('list', p, max_page(html), flush=True)
        if stage in ('clubs', 'all'):
            # 전체클럽현황은 목록을 POST로 불러온다
            form = 'searchValue=&searchKey=&areacode1=&areacode2=&codeView01=area&pageNum=%d'
            first = read(fetch(idx, 'SearchClubList.action', post=form % 1))
            last = max([int(n) for n in re.findall(r"ClubListPaging\('\d+','(\d+)'\)", first)] or [1])
            for n in range(2, last + 1):
                fetch(idx, 'SearchClubList.action', post=form % n)
            save_index(idx)
            print('clubs', last, flush=True)
        if stage in ('details', 'all'):
            pages = [k for k in list(idx) if k.split('?')[0].split('&')[0] in [m.split('?')[0] for m in MENU]]
            targets = []
            for p in pages:
                for d in details_from(p, read(os.path.join(RAW, idx[p]))):
                    if d not in targets:
                        targets.append(d)
            print('details', len(targets), flush=True)
            for i, d in enumerate(targets):
                fetch(idx, d)
                if i % 50 == 0:
                    save_index(idx)
                    print(' ', i, flush=True)
            save_index(idx)
        if stage in ('images', 'all'):
            imgs = []
            for k, v in list(idx.items()):
                if v.startswith('html/'):
                    for s in images_from(read(os.path.join(RAW, v))):
                        if s not in imgs and s not in idx:
                            imgs.append(s)
            print('images', len(imgs), flush=True)
            for i, s in enumerate(imgs):
                fetch(idx, s, binary=True)
                if i % 50 == 0:
                    save_index(idx)
                    print(' ', i, flush=True)
            save_index(idx)
    finally:
        save_index(idx)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'all')
