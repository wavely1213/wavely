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
    const energyBefore = await p.locator('.sec-row >> nth=1 >> .energy button.on').count();
    await p.click('.sec-row >> nth=1 >> text=더 신나게');
    const energyUp = await p.locator('.sec-row >> nth=1 >> .energy button.on').count();
    await p.click('button[aria-label^="되돌리기"]');
    const energyUndo = await p.locator('.sec-row >> nth=1 >> .energy button.on').count();
    await p.keyboard.press('Control+Shift+Z');
    const energyRedo = await p.locator('.sec-row >> nth=1 >> .energy button.on').count();
    global.undoOk = (global.undoOk ?? true) && energyUp === energyBefore + 1 && energyUndo === energyBefore && energyRedo === energyUp;
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
    // 키보드: 선택한 음표를 ↑ 한 번, Delete로 지우기
    const nBefore = await p.locator('.pr-note').count();
    await p.keyboard.press('ArrowUp');
    await p.keyboard.press('Delete');
    const nAfter = await p.locator('.pr-note').count();
    global.keysOk = (global.keysOk ?? true) && nAfter === nBefore - 1;
    // 도움말 열기
    await p.click('.tab:text-is("편곡")');
    await p.click('details.help >> nth=0 >> summary');
    global.helpOk = (global.helpOk ?? true) && (await p.locator('details.help[open] p').count()) === 1;
    await p.click('.tab:text-is("멜로디")');
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
    const stepHint = await p.textContent('.step-hint').catch(() => '');
    // 테이크 비교: 앱 데모 마스터(편곡과 일치) vs 단순 사인파 → 앞의 것이 "가장 가까움"
    const sine = path.join(TMP, 'take-sine.wav');
    if (!fs.existsSync(sine)) require('child_process').execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=523:duration=15', sine]);
    const demoTake = path.join(TMP, 'master-14.wav');
    if (fs.existsSync(demoTake)) {
      await p.setInputFiles('#take-files', [demoTake, sine]);
      await p.waitForFunction(() => document.querySelectorAll('.take .pill').length >= 2, null, { timeout: 90000 });
      global.takeBest = await p.locator('.take.best .track-title').first().textContent();
      await p.locator('.take.best >> text=이걸로 마스터링').click();
      await p.waitForSelector('.muted:has-text("master-14 ·")', { timeout: 30000 });
      await p.click('text=마스터링 하기');
      await p.waitForSelector('.compare', { timeout: 120000 });
    }
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
    // 앨범: 마스터링 결과를 "발매 준비로 보내기" → 싱글 앨범 자동 생성 + 마스터 자동 연결
    await p.click('.tab:text-is("마스터링")');
    await p.click('text=발매 준비로 보내기');
    await p.waitForSelector('.tab:text-is("수록곡")');
    const autoMaster = await p.locator('.pill:has-text("마스터링 탭 결과")').count();
    global.autoOk = (global.autoOk ?? true) && autoMaster === 1;
    await p.screenshot({ path: path.join(TMP, `${tag}-앨범새로.png`), fullPage: true });
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
    // 새로고침해도 마스터·커버가 남는지 (IndexedDB)
    await p.waitForTimeout(1500);
    await p.reload();
    await p.waitForSelector('.tab');
    await p.click('.song-item:has-text("Midnight Signal") >> nth=-1');
    await p.waitForSelector('.pill:has-text("규격 OK")', { timeout: 15000 }).catch(() => {});
    const keptMaster = await p.locator('.pill:has-text("규격 OK")').count();
    await p.click('.tab:text-is("커버")');
    await p.waitForSelector('.cover-thumb', { timeout: 15000 }).catch(() => {});
    const keptCover = await p.locator('.cover-thumb').count();
    global.persistOk = (global.persistOk ?? true) && keptMaster === 1 && keptCover === 1;
    console.log(tag, { custom, prog, before, after, refs, masterPill, takeBest: global.takeBest, stepHint, autoMaster, keptMaster, keptCover, errorsLeft, zip: fs.statSync(zipPath).size, vbodyStart: vbody.slice(0, 30), vcount });
    await c.close();
  }
  if (!global.autoOk) errs.push('마스터 자동 연결 안 됨');
  if (!global.undoOk) errs.push('되돌리기·다시 하기 안 됨');
  if (global.takeBest !== undefined && global.takeBest !== 'master-14') errs.push(`테이크 비교 결과 이상: ${global.takeBest}`);
  if (!global.keysOk) errs.push('피아노롤 키보드 안 됨');
  if (!global.helpOk) errs.push('도움말 안 열림');
  if (!global.persistOk) errs.push('새로고침 후 마스터·커버 유실');
  console.log('ERRORS:', errs);
  if (errs.length) process.exitCode = 1; else console.log('ui OK');
  await b.close();
})();
