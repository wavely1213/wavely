// 화면 점검: 모든 탭 열기·가로 넘침, 편곡·멜로디·사운드·레퍼런스·버전 흐름. 실행: npm run build && npm run test:ui
const path = require('path');
const fs = require('fs');
const TMP = path.join(__dirname, '.tmp');
fs.mkdirSync(TMP, { recursive: true });
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch();
  const errs = [];
  for (const [w, hgt, tag] of [[1280, 900, 'desk'], [390, 844, 'phone']]) {
    const c = await b.newContext({ viewport: { width: w, height: hgt } });
    const p = await c.newPage();
    p.on('pageerror', e => errs.push(tag + ' ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(tag + ' console ' + m.text()); });
    await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
    await p.waitForSelector('.tab');
    const tabs = await p.$$eval('.tab', els => els.map(e => e.textContent));
    for (const name of tabs) {
      await p.click(`.tab:text-is("${name}")`);
      const sw = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (sw) errs.push(`${tag} overflow on ${name}`);
      if (['편곡','멜로디','사운드','레퍼런스','내보내기','마스터링'].includes(name)) await p.screenshot({ path: path.join(TMP, `${tag}-${name}.png`), fullPage: tag === 'desk' && name !== '편곡' });
    }
    // 편곡: 빠른 바꾸기, 드럼 직접 찍기, 재생/정지
    await p.click('.tab:text-is("편곡")');
    await p.click('.sec-row >> nth=1 >> text=더 신나게');
    await p.click('.sec-row >> nth=1 >> text=드럼 직접 찍기');
    await p.click('.sec-row >> nth=1 >> .dg >> nth=3');
    const custom = await p.locator('.sec-row >> nth=1 >> option:text("직접 찍은 드럼")').count();
    await p.click('text=▶ 전체 듣기');
    await p.waitForTimeout(1200);
    const prog = await p.$eval('#play-progress', e => e.style.width);
    await p.click('text=■ 정지');
    // 멜로디: 빈 칸 클릭 → 음표 추가 → 선택 후 높게
    await p.click('.tab:text-is("멜로디")');
    const before = await p.locator('.pr-note').count();
    const g = await p.$('.roll-grid'); await g.scrollIntoViewIfNeeded(); const bb = await g.boundingBox();
    await p.mouse.click(bb.x + 22 * 5 + 5, bb.y + 26 * 3 + 5);
    const after = await p.locator('.pr-note').count();
    await p.click('text=▲ 높게');
    // 사운드: 음색 바꾸기 + 미리듣기
    await p.click('.tab:text-is("사운드")');
    await p.selectOption('#var-drums', 'boom');
    await p.click('.mixer-row >> nth=0 >> text=미리듣기');
    // 레퍼런스: 이름으로 추가
    await p.click('.tab:text-is("레퍼런스")');
    await p.fill('#ref-name', '테스트 레퍼런스');
    await p.click('text=이름으로 추가');
    await p.click('.section >> nth=0 >> text=드럼 그루브');
    const refs = await p.locator('.ref-name').count();
    // 마스터링: 앱 데모로 → 마스터링 → 결과 표
    await p.click('.tab:text-is("마스터링")');
    await p.click('text=앱 데모로 해 보기');
    await p.waitForSelector('text=마스터링 하기 >> xpath=self::button[not(@disabled)]', { timeout: 60000 });
    await p.click('text=마스터링 하기');
    await p.waitForSelector('.compare', { timeout: 120000 });
    const masterPill = await p.textContent('.pill');
    // 버전 저장/보기
    await p.click('.tab:text-is("버전")');
    await p.fill('#version-note', 'v1');
    await p.click('text=버전 저장');
    await p.waitForTimeout(300);
    await p.click('.version >> text=보기');
    await p.waitForTimeout(300);
    const vbody = await p.textContent('.version-body');
    await p.click('.version >> text=복원');
    await p.waitForTimeout(300);
    const vcount = await p.locator('.version').count();
    // 앨범: 새 앨범 → 곡 넣기 → 마스터 WAV → 정보 → 커버 → 제출 패키지
    await p.click('text=+ 새 앨범');
    await p.screenshot({ path: path.join(TMP, `${tag}-앨범새로.png`), fullPage: true });
    if (await p.locator('text=+ 곡 넣기').count()) await p.click('text=+ 곡 넣기');
    const masterWav = path.join(TMP, 'master-14.wav');
    if (fs.existsSync(masterWav)) {
      await p.setInputFiles('input[id^="master-"]', masterWav);
      await p.waitForSelector('.pill:has-text("규격 OK")', { timeout: 60000 });
    }
    await p.click('.tab:text-is("정보·크레딧")');
    await p.fill('#album-title', 'Midnight Signal');
    await p.fill('#album-artist', '물결');
    await p.press('#album-artist', 'Tab');
    await p.click('text=빈 크레딧을');
    await p.click('.tab:text-is("커버")');
    await p.click('text=이 커버 쓰기');
    await p.waitForSelector('.cover-thumb', { timeout: 30000 });
    if (tag === 'desk') await p.screenshot({ path: path.join(TMP, `${tag}-앨범커버.png`), fullPage: true });
    await p.click('.tab:text-is("일정")');
    await p.click('.schedule input[type=checkbox] >> nth=0');
    await p.click('.tab:text-is("제출")');
    if (tag === 'desk') await p.screenshot({ path: path.join(TMP, `${tag}-앨범제출.png`), fullPage: true });
    const errorsLeft = await p.locator('.checklist .lv-error').count();
    const [download] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('text=제출 패키지 받기')]);
    const zipPath = path.join(TMP, `${tag}-release.zip`);
    await download.saveAs(zipPath);
    console.log(tag, { custom, prog, before, after, refs, masterPill, errorsLeft, zip: fs.statSync(zipPath).size, vbodyStart: vbody.slice(0, 30), vcount });
    await c.close();
  }
  console.log('ERRORS:', errs);
  if (errs.length) process.exitCode = 1; else console.log('ui OK');
  await b.close();
})();
