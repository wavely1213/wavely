"""Vercel 배포용 여러 페이지 사이트를 dist/web/ 에 만든다.

dist/web/
  index.html            첫 화면 (메뉴는 아래 하위 페이지로 연결)
  <slug>.html           메뉴 페이지 31개 + 구단 상세
  assets/site.css       공용 스타일
  assets/home.js        첫 화면 스크립트 / assets/page.js 하위 페이지 스크립트
  assets/home/          첫 화면 이미지 (assets/img)
  data/site/            페이지·게시글 데이터 (data/site)
  (하위 페이지 이미지는 저장하지 않고 /o/ 주소로 원본을 대신 받는다 — vercel.json)
사용: python3 -I tools/build_web.py
"""
import html as H, json, os, re, shutil, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildlib import (CONCEPT_TITLE, ROOT, SRC, block_files, bundle, includes, load_json, mark_concept,  # noqa: E402
                      menu_js, read, replace_block, script)

OUT = os.path.join(ROOT, 'dist', 'web')
PAGE_JS = ['js/config.js', 'js/util.js', 'js/tabs.js', 'js/menu.js', 'js/sections/footer.js',
           'js/pages/shell.js', 'js/pages/views.js', 'js/pages/views-struct.js', 'js/pages/page-main.js']


def write(rel, text):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(text)


def copytree(src, dst):
    if os.path.isdir(src):
        shutil.copytree(src, os.path.join(OUT, dst), dirs_exist_ok=True)


def site_pages():
    """data/site/*.json 중 페이지 데이터만: slug → (분류, 이름, 원본 주소, 상위 slug)"""
    base = os.path.join(ROOT, 'data', 'site')
    teams = {t['slug'] for t in load_json('data', 'site', 'teams.json')} if os.path.exists(os.path.join(base, 'teams.json')) else set()
    pages = {}
    for f in sorted(os.listdir(base)):
        if not f.endswith('.json') or f in ('images.json', 'teams.json'):
            continue
        d = load_json('data', 'site', f)
        pages[d['slug']] = {'slug': d['slug'], 'cat': d['cat'], 'title': d['title'], 'origin': d['origin'],
                            'parent': 'mng_FKLeagueTeam' if d['slug'] in teams else None}
    return pages


def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    index = includes(read(SRC, 'index.html'))
    page = includes(read(SRC, 'page.html'))

    css = bundle(block_files(index, 'css', r'href="([^"]+\.css)"') + ['css/page.css', 'css/page-struct.css'])
    write('assets/site.css', css.replace('../../assets/fonts/', 'fonts/'))
    copytree(os.path.join(ROOT, 'assets', 'fonts'), 'assets/fonts')
    head_js = script(bundle(block_files(index, 'headjs', r'src="([^"]+\.js)"')))
    pages = site_pages()
    # 첫 화면·푸터 이미지(assets/img) → 배포 경로
    imgs = {}
    for d, _, fs in os.walk(os.path.join(ROOT, 'assets', 'img')):
        for f in fs:
            key = os.path.relpath(os.path.join(d, f), os.path.join(ROOT, 'assets', 'img')).replace(os.sep, '/')
            imgs[key] = 'assets/home/' + key
    shared = menu_js() + 'KFL.LOCAL=true;KFL.PAGES=%s;KFL.IMG=%s;' % (
        json.dumps({k: 1 for k in pages}, separators=(',', ':')), json.dumps(imgs, separators=(',', ':')))
    write('assets/home.js', shared + '\n' + bundle(block_files(index, 'js', r'src="([^"]+\.js)"')))
    write('assets/page.js', shared + '\n' + bundle(PAGE_JS))
    link_css = '<link rel="stylesheet" href="assets/site.css">'

    # 첫 화면: 데이터는 인라인, 이미지는 파일
    copytree(os.path.join(ROOT, 'assets', 'img'), 'assets/home')
    home = replace_block(index, 'css', link_css)
    home = replace_block(home, 'headjs', head_js)
    home = replace_block(home, 'js', script('window.KFL=window.KFL||{};KFL.DATA=%s;' % (
        json.dumps(load_json('data', 'data.json'), ensure_ascii=False, separators=(',', ':')))) + '\n<script src="assets/home.js"></script>')
    home = re.sub(r'\.\./assets/img/([\w./-]+)', r'assets/home/\1', home)
    write('index.html', mark_concept(home, CONCEPT_TITLE))

    # 하위 페이지
    shell = replace_block(page, 'css', link_css)
    shell = replace_block(shell, 'headjs', head_js)
    shell = replace_block(shell, 'js', '<script src="assets/page.js"></script>')
    shell = re.sub(r'\.\./assets/img/([\w./-]+)', r'assets/home/\1', shell)
    for slug, meta in pages.items():
        out = shell
        for k in ('title', 'cat', 'origin'):
            out = out.replace('{{%s}}' % k, H.escape(meta[k]))
        out = out.replace('{{page_json}}', json.dumps(meta, ensure_ascii=False).replace('</', '<\\/'))
        write(slug + '.html', mark_concept(out, '%s | %s' % (H.escape(meta['title']), CONCEPT_TITLE)))

    copytree(os.path.join(ROOT, 'data', 'site'), 'data/site')
    n = sum(len(fs) for _, _, fs in os.walk(OUT))
    size = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(OUT) for f in fs)
    print('built %s: %d pages, %d files, %.1f MB' % (OUT, len(pages) + 1, n, size / 1e6))


if __name__ == '__main__':
    main()
