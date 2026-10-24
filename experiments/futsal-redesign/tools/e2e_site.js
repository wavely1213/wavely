// 배포본(dist/web) 점검: 모든 페이지 로드·가로 넘침·오류, 게시판·뉴스·포토·표 동작
// 사용: python3 -I tools/serve.py 8765 & 그다음 node tools/e2e_site.js http://127.0.0.1:8765
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const base = (process.argv[2] || 'http://127.0.0.1:8765').replace(/\/$/, '');
const dist = path.join(__dirname, '..', 'dist', 'web');

(async () => {
  const b = await chromium.launch();
  let fails = 0;
  const check = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const pages = fs.readdirSync(dist).filter(f => f.endsWith('.html'));

  // 1) 모든 페이지: 내용이 그려지고, 스크립트 오류 없고, 모바일에서 가로로 넘치지 않음
  const broken = [];
  for (const f of pages) {
    const p = await b.newPage({ viewport: { width: 390, height: 900 } });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(`${base}/${f}`, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => !document.querySelector('#page .loading'), null, { timeout: 15000 }).catch(() => errs.push('still loading'));
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    const empty = f !== 'index.html' && await p.evaluate(() => { const e = document.querySelector('#page'); return !e || (e.textContent.trim().length < 2 && !e.querySelector('img')); });
    if (errs.length || sw > 390 || empty) broken.push(`${f} err=${errs.join('|')} sw=${sw} empty=${empty}`);
    await p.close();
  }
  check(broken.length === 0, `${pages.length} pages render without errors/overflow ${JSON.stringify(broken)}`);

  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const ready = () => p.waitForFunction(() => !document.querySelector('#page .loading'));

  // 2) 첫 화면: 메뉴·더보기 링크가 만들어 둔 페이지로
  await p.goto(`${base}/index.html`);
  const gnb = await p.$$eval('#gnb .sub a', as => as.map(a => a.getAttribute('href')));
  check(gnb.filter(h => /^[\w-]+\.html$/.test(h)).length >= 29, `GNB links internal (${gnb.filter(h => /\.html$/.test(h)).length}/${gnb.length})`);
  check(await p.$eval('a[data-href="photo.action"]', a => a.getAttribute('href')) === 'photo.html', 'home more-link goes to photo.html');
  check((await p.$eval('#boards .post-list a', a => a.getAttribute('href'))).startsWith('board-00.html?id='), 'home notice links to internal post');

  // 3) 게시판: 상시 글 먼저, 15건, 쪽 이동, 검색, 글 보기
  await p.goto(`${base}/board-00.html`); await ready();
  check(await p.$eval('#subnav-list [aria-current=page]', a => a.textContent) === '공지사항', 'subnav marks 공지사항');
  check(await p.locator('.board-list li').count() === 15 && await p.locator('.board-list li').first().getAttribute('class') === 'pinned', 'board: 15 rows, pinned first');
  await p.click('.pager button[data-page="2"]');
  check(new URL(p.url()).searchParams.get('page') === '2' && await p.locator('.board-list li.pinned').count() === 0, 'board page 2 via pager (URL updated)');
  await p.fill('#board-q', '심판'); await p.press('#board-q', 'Enter');
  const titles = await p.$$eval('.board-list .title', as => as.map(a => a.textContent));
  check(titles.length > 0 && titles.every(t => t.includes('심판')), `board search filters (${titles.length})`);
  await p.click('.board-list .title >> nth=0'); await ready();
  check(await p.locator('.post-head h2').count() === 1 && await p.locator('.back-row a').count() === 1, 'post view opens with back link');

  // 4) 뉴스: 목록 → 본문
  await p.goto(`${base}/mng_newsList.html`); await ready();
  check(await p.locator('.news-item').count() === 10, 'news: 10 per page');
  await p.click('.news-item h3 a >> nth=0'); await ready();
  check((await p.locator('.post-body').innerText()).length > 20, 'news detail has body');

  // 5) 포토: 크게 보기 열고 닫기
  await p.goto(`${base}/photo.html`); await ready();
  check(await p.locator('.gallery li').count() === 24, 'photo: 24 per page');
  await p.click('.gallery button >> nth=0');
  check(await p.locator('dialog.lightbox[open]').count() === 1, 'lightbox opens');
  await p.keyboard.press('ArrowRight');
  check((await p.locator('.lightbox figcaption span').innerText()).includes('2 /'), 'lightbox arrow key moves');
  await p.keyboard.press('Escape');
  check(await p.locator('dialog.lightbox[open]').count() === 0, 'Escape closes lightbox');

  // 6) 표: 지역 필터 + 검색
  await p.goto(`${base}/NewClubList.html`); await ready();
  const total = await p.$eval('.list-count b', e => e.textContent);
  await p.selectOption('[data-filter]', '제주');
  const regions = await p.$$eval('tbody td:nth-child(2)', tds => tds.map(t => t.textContent));
  check(regions.length > 0 && regions.every(r => r === '제주') && (await p.$eval('.list-count b', e => e.textContent)) !== total, `club region filter (${regions.length})`);

  // 7) 구단 상세는 FK리그구단소개 탭 아래
  await p.goto(`${base}/mng_Lbfs.html`); await ready();
  check(await p.$eval('#subnav-list [aria-current=page]', a => a.textContent) === 'FK리그구단소개', 'team page under 구단소개 tab');

  console.log(fails ? `${fails} FAILED` : 'ALL PASS');
  process.exitCode = fails ? 1 : 0;
  await b.close();
})();
