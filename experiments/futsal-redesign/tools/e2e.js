const { chromium } = require('playwright');
const path = require('path');
// 사용: node tools/e2e.js dist/index.html <스크린샷 폴더>  (playwright 필요)
const file = 'file://' + path.resolve(process.argv[2]);
const out = process.argv[3];
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const check = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
  for (const [name, vp] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const p = await b.newPage({ viewport: vp });
    p.on('pageerror', e => errs.push(name + ': ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/pretendard|net::ERR/i.test(m.text())) errs.push(name + ' console: ' + m.text()); });
    await p.goto(file, { waitUntil: 'load' });
    await p.waitForTimeout(500);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    check(sw <= vp.width, `${name}: no horizontal scroll (${sw} <= ${vp.width})`);
    await p.screenshot({ path: `${out}/${name}-full.png`, fullPage: true });
    if (name === 'desktop') {
      check(await p.locator('#gnb-list > li').count() === 9, 'GNB has 9 top items');
      check(await p.locator('.sub a').count() === 31, 'submenus have 31 links');
      check(await p.locator('#news-list li').count() === 3, '3 news');
      check(await p.locator('#boards .post-list li').count() === 10, '10 notices');
      await p.locator('#boards [role=tab]').nth(0).focus();
      await p.keyboard.press('ArrowRight');
      check(await p.locator('#boards [role=tab]').nth(1).getAttribute('aria-selected') === 'true', 'arrow key switches board tab');
      check((await p.locator('#boards .post-list li').first().innerText()).includes('심판강습회'), 'contest news shown');
      check(await p.locator('.match').count() === 31, 'FK CUP 남자부 31 matches');
      await p.click('.division .chip >> nth=1');
      check(await p.locator('.match').count() === 7, '여자1부 7 matches');
      check((await p.locator('#fkcup-title').innerText()).includes('여자1부'), 'title follows division');
      await p.click('#fk-views [role=tab] >> text=경기순위');
      check(await p.locator('#fkcup tbody tr').count() === 8, '여자1부 rank 8 rows');
      await p.click('#fk-views [role=tab] >> text=퇴장');
      check(await p.locator('#fkcup .empty').count() === 1, 'empty 퇴장 shows message');
      await p.click('.division .chip >> nth=0');
      await p.click('#fk-views [role=tab] >> text=득점');
      check(await p.locator('#fkcup tbody tr:not([hidden])').count() === 10, 'goal table limited to 10');
      await p.click('#fkcup .btn-more');
      check(await p.locator('#fkcup tbody tr:not([hidden])').count() === 125, 'more expands to 125');
      await p.locator('#fkcup').screenshot({ path: `${out}/fkcup.png` });
      await p.fill('#player-q', '강원FS');
      const n = await p.locator('#players tbody tr').count();
      check(n > 0 && (await p.locator('#players tbody tr').allInnerTexts()).every(t => t.includes('강원FS')), `search filters players (${n})`);
      await p.click('#players [role=tab] >> text=여자부');
      await p.fill('#player-q', '');
      check((await p.locator('#players tbody tr').first().innerText()).includes('한희은'), '여자부 first is 한희은');
      await p.click('.gnb-btn >> nth=0');
      check(await p.locator('#sub-0').isVisible(), 'dropdown opens on click');
      await p.screenshot({ path: `${out}/desktop-menu.png` });
      await p.keyboard.press('Escape');
      check(!(await p.locator('#sub-0').isVisible()), 'Escape closes dropdown');
      await p.keyboard.press('Tab'); // focus stays sane
      await p.goto(file); await p.keyboard.press('Tab');
      check(await p.evaluate(() => document.activeElement.className) === 'skip', 'first Tab hits skip link');
      const imgs = await p.evaluate(() => [...document.images].filter(i => !i.complete || i.naturalWidth === 0).length);
      check(imgs === 0, 'all images loaded');
      const bg = () => p.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const before = await bg();
      await p.click('#theme-toggle');
      check(await bg() !== before && (await p.locator('#theme-toggle').innerText()).includes('끄기'), 'theme toggle switches to dark');
      await p.reload();
      check(await p.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'theme choice remembered after reload');
      await p.click('#theme-toggle');
      check(await bg() === before, 'theme toggle back to light');
      const noAlt = await p.evaluate(() => [...document.images].filter(i => !i.hasAttribute('alt')).length);
      check(noAlt === 0, 'every img has alt');
    } else {
      check(!(await p.locator('#gnb').isVisible()), 'mobile menu hidden initially');
      await p.click('#menu-toggle');
      await p.click('.gnb-btn >> text=FK리그');
      check(await p.locator('#sub-2').isVisible(), 'mobile accordion opens');
      await p.screenshot({ path: `${out}/mobile-menu.png` });
      await p.click('#menu-toggle');
      const small = await p.evaluate(() => [...document.querySelectorAll('main a, main button, header button')]
        .filter(e => e.offsetParent && !e.classList.contains('stretched') && e.getBoundingClientRect().height < 40).map(e => e.textContent.trim().slice(0, 20)));
      check(small.length === 0, 'tap targets >= 40px ' + JSON.stringify(small.slice(0, 5)));
    }
    await p.close();
  }
  check(errs.length === 0, 'no JS errors ' + JSON.stringify(errs));
  await b.close();
})();
