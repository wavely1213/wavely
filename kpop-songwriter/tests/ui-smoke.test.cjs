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
    // 폰: 목록은 접혀 있고 제목이 첫 화면 위쪽에 보임, 넓은 화면: 접기 버튼 없음
    const navToggle = await p.locator('.nav-toggle').isVisible();
    const h1Top = await p.$eval('h1', (e) => e.getBoundingClientRect().top);
    global.navOk = (global.navOk ?? true) && (tag === 'phone' ? navToggle && h1Top < 200 : !navToggle);
    // 처음 온 사람 안내: 예시 곡 위에 보이고, 닫으면 새로고침해도 안 보임
    const welcome = await p.locator('#welcome').count();
    await p.click('#welcome-close');
    const welcomeClosed = await p.locator('#welcome').count();
    const welcomeFocus = await p.evaluate(() => document.activeElement?.classList.contains('tab'));
    await p.reload();
    await p.waitForSelector('.tab');
    global.welcomeOk = (global.welcomeOk ?? true) && welcome === 1 && welcomeClosed === 0 && welcomeFocus && (await p.locator('#welcome').count()) === 0;
    // 가사·마디 맞춤: 벌스(8마디)에 가사를 잔뜩 넣으면 "빠듯해요", 원래대로 돌리면 사라짐
    await p.click('.tab:text-is("구조·가사")');
    const verse = p.locator('textarea.lyrics').nth(1);
    const verseText = await verse.inputValue();
    const fitId = (await verse.getAttribute('id')).replace(/^lyr-/, 'fit-');
    const fitHiddenBefore = await p.isHidden(`#${fitId}`);
    await verse.fill(Array(12).fill('가나다라마바사아자차카타').join('\n'));
    const fitTight = (await p.isVisible(`#${fitId}`)) && (await p.textContent(`#${fitId}`)).includes('빠듯')
      && (await p.textContent(`#${fitId.replace('fit-', 'fit-tip-')}`)).includes('마디');
    await verse.fill(verseText);
    global.fitOk = (global.fitOk ?? true) && fitHiddenBefore && fitTight && await p.isHidden(`#${fitId}`);
    // 파트 분배: 멤버마다 "N% · N줄", 합이 100% 안팎
    const shares = await p.$$eval('.share-num', (els) => els.map((e) => e.textContent));
    const pctSum = shares.reduce((n, t) => n + Number((t.match(/^(\d+)%/) || [0, 0])[1]), 0);
    global.shareOk = (global.shareOk ?? true) && shares.length === 4 && shares.every((t) => /^\d+% · [\d.]+줄$/.test(t)) && pctSum >= 98 && pctSum <= 102;
    const tabs = await p.$$eval('.tab', els => els.map(e => e.textContent));
    for (const name of tabs) {
      await p.click(`.tab:text-is("${name}")`);
      const sw = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (sw) errs.push(`${tag} overflow on ${name}`);
      const onTab = await p.$eval('.tab.on', (e) => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; });
      if (!onTab) errs.push(`${tag} 고른 탭(${name})이 화면 밖`);
      if (['편곡','멜로디','사운드','레퍼런스','내보내기','마스터링'].includes(name)) await p.screenshot({ path: path.join(TMP, `${tag}-${name}.png`), fullPage: tag === 'desk' && name !== '편곡' });
    }
    // 편곡: 빠른 바꾸기, 드럼 직접 찍기, 재생/정지
    await p.click('.tab:text-is("편곡")');
    global.lengthOk = (global.lengthOk ?? true) && /^편곡 기준 길이 \d+:\d\d \(\d+마디\)/.test(await p.textContent('#song-length'));
    // 스페이스바: 포커스가 버튼·입력 칸이 아닐 때 전체 듣기/정지
    await p.evaluate(() => document.activeElement?.blur());
    await p.keyboard.press('Space');
    const spacePlay = await p.waitForSelector('.playbar button:has-text("정지"), .playbar button:has-text("불러오는 중")', { timeout: 15000 }).then(() => true).catch(() => false);
    await p.keyboard.press('Space');
    const spaceStop = await p.waitForSelector('.playbar button:has-text("▶ 전체 듣기")', { timeout: 5000 }).then(() => true).catch(() => false);
    global.spaceOk = (global.spaceOk ?? true) && spacePlay && spaceStop;
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
    // 가사 음절 넣기: 음표를 시작 순서대로 가사 음절로 채움
    if (await p.locator('#mel-fill-syl').count()) {
      await p.click('#mel-fill-syl');
      const syls = await p.$$eval('.pr-note', (els) => els.map((e) => e.textContent));
      global.sylOk = (global.sylOk ?? true) && syls.filter(Boolean).length >= Math.min(3, syls.length);
    }
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
    global.qcOk = (global.qcOk ?? true) && /^\d+곳$/.test(await p.textContent('#qc-clips')) && Number(await p.textContent('#qc-corr')) > 0;
    const stepHint = await p.textContent('.step-hint').catch(() => '');
    // 숏폼 하이라이트: 15초로 바꿔 구간 표시 → 받기 (zip 안 WAV)
    await p.click('.highlight .chip:text-is("15초")');
    global.hlRange = await p.textContent('#hl-range');
    const [hlDl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#hl-download')]);
    global.hlOk = (global.hlOk ?? true) && /_highlight_15s\.zip$/.test(hlDl.suggestedFilename()) && /^\d+:\d\d ~ \d+:\d\d$/.test(global.hlRange);
    // 곡 끝 자르기: 0:20에서 끝내기 → 다시 마스터링 → 결과 길이 20초 이하, "자름" 표시. 잘못 적으면 그대로.
    await p.fill('#master-end', '0:20');
    await p.press('#master-end', 'Tab');
    await p.waitForSelector('#end-note:has-text("0:20에서 끝내요")');
    await p.fill('#master-end', '9:99');
    await p.press('#master-end', 'Tab');
    await p.waitForSelector('#end-note:has-text("0:20에서 끝내요")');
    await p.click('#end-listen');
    await p.click('#end-listen:has-text("정지")');
    // 칸에 적고 곧바로 버튼을 눌러도 그 클릭이 사라지지 않음 (칸을 벗어날 때 화면 전체를 다시 그리지 않음)
    await p.fill('#master-end', '0:20.5');
    await p.click('text=마스터링 하기');
    await p.waitForSelector('.compare td:has-text("0:20.5에서 자름")', { timeout: 120000 });
    const cutLen = Number((await p.textContent('.compare td:has-text("에서 자름")')).match(/^([\d.]+)초/)[1]);
    global.endCutOk = cutLen > 15 && cutLen <= 20.55;
    await p.click('#end-clear');
    global.endCutOk = global.endCutOk && (await p.inputValue('#master-end')) === '' && (await p.evaluate(() => document.activeElement?.id)) === 'master-end' && await p.isDisabled('#end-listen');
    // 테이크 비교: 앱 데모 마스터(편곡과 일치) vs 단순 사인파 → 앞의 것이 "가장 가까움"
    const sine = path.join(TMP, 'take-sine.wav');
    if (!fs.existsSync(sine)) require('child_process').execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=523:duration=15', sine]);
    const demoTake = path.join(TMP, 'master-14.wav');
    if (fs.existsSync(demoTake)) {
      await p.setInputFiles('#take-files', [demoTake, sine]);
      await p.waitForFunction(() => document.querySelectorAll('.take .pill').length >= 2, null, { timeout: 90000 });
      global.takeBest = await p.locator('.take.best .track-title').first().textContent();
      // 처음 들을 때 음량을 재서 카드에 표시 (같은 음량으로 듣기)
      await p.locator('.take.best >> text=▶ 듣기').click();
      await p.waitForSelector('.take.best .take-lufs', { timeout: 30000 });
      global.takeLufs = await p.textContent('.take.best .take-lufs');
      await p.locator('.take.best >> text=■ 정지').click();
      await p.locator('.take.best >> text=이걸로 마스터링').click();
      await p.waitForSelector('.muted:has-text("master-14 ·")', { timeout: 30000 });
      await p.click('text=마스터링 하기');
      await p.waitForSelector('.compare', { timeout: 120000 });
    }
    // 레퍼런스 음색 맞추기: 오디오 레퍼런스(앱 데모 마스터)를 분석해 두고 → 마스터링에서 맞추기 → 설명 표시
    if (fs.existsSync(demoTake)) {
      await p.click('.tab:text-is("레퍼런스")');
      const refsBefore = await p.locator('.ref-name').count();
      await p.setInputFiles('#ref-file', demoTake);
      await p.waitForFunction((n) => document.querySelectorAll('.ref-name').length > n, refsBefore, { timeout: 60000 });
      await p.click('.tab:text-is("마스터링")');
      await p.click('#tone-match');
      await p.waitForSelector('#tone-note', { timeout: 60000 });
      global.toneNote = await p.textContent('#tone-note');
      global.toneOk = (global.toneOk ?? true) && /저음 .+ · 고음 /.test(global.toneNote) && (await p.locator('.chip.on:has-text("레퍼런스에 맞춤")').count()) === 1;
    }
    // 버전 저장/보기
    await p.click('.tab:text-is("버전")');
    await p.fill('#version-note', 'v1');
    await p.click('text=버전 저장');
    await p.waitForTimeout(300);
    await p.click('.version >> text=보기');
    await p.waitForTimeout(300);
    const vbody = await p.textContent('.version-body');
    await p.click('button[id^="diff-"]');
    global.diffSame = (global.diffSame ?? true) && (await p.locator('.version p.muted:text-is("지금과 같아요.")').count()) === 1;
    await p.click('button[id^="diff-"]');
    await p.click('.version >> text=복원');
    await p.waitForTimeout(300);
    const vcount = await p.locator('.version').count();
    // 앨범: 마스터링 결과를 "발매 준비로 보내기" → 싱글 앨범 자동 생성 + 마스터 자동 연결
    await p.click('.tab:text-is("마스터링")');
    await p.click('text=발매 준비로 보내기');
    await p.waitForSelector('.tab:text-is("수록곡")');
    const autoMaster = await p.locator('.pill:has-text("마스터링 탭 결과")').count();
    global.autoOk = (global.autoOk ?? true) && autoMaster === 1;
    // 앨범 진행 단계: 처음엔 정보·크레딧이 다음 (마스터는 이미 연결됨), '하러 가기'로 그 탭
    global.albumStep1 = await p.textContent('#album-step-hint strong');
    await p.click('#album-step-go');
    global.albumStepTab = await p.textContent('.tab.on');
    await p.click('.tab:text-is("수록곡")');
    // 앨범 되돌리기: 트랙 빼기 → ↶ → 트랙과 마스터가 그대로 돌아옴
    await p.click('button[aria-label="앨범에서 빼기"]');
    const tracksGone = await p.locator('button[aria-label="앨범에서 빼기"]').count();
    await p.click('button[aria-label^="되돌리기"]');
    const masterBack = await p.locator('.pill:has-text("마스터링 탭 결과")').count();
    global.albumUndoOk = (global.albumUndoOk ?? true) && tracksGone === 0 && masterBack === 1;
    await p.screenshot({ path: path.join(TMP, `${tag}-앨범새로.png`), fullPage: true });
    await p.click('.tab:text-is("정보·크레딧")');
    await p.fill('#album-title', 'Midnight Signal');
    await p.fill('#album-artist', '물결');
    await p.press('#album-artist', 'Tab');
    await p.click('text=빈 크레딧을');
    // 지분: 작사를 두 명으로 → 70/30으로 적기 → 합 100%
    await p.fill('input[id^="lyr-"]', '물결, 하늘');
    await p.press('input[id^="lyr-"]', 'Tab');
    await p.waitForSelector('input[id^="split-"][id$="-lyric-0"]');
    await p.fill('input[id^="split-"][id$="-lyric-0"]', '70');
    await p.press('input[id^="split-"][id$="-lyric-0"]', 'Tab');
    await p.waitForTimeout(100);
    await p.fill('input[id^="split-"][id$="-lyric-1"]', '30');
    await p.press('input[id^="split-"][id$="-lyric-1"]', 'Tab');
    await p.waitForTimeout(100);
    global.splitSum = await p.textContent('.split-row .mono');
    await p.click('.tab:text-is("커버")');
    // 분위기에 맞게 고르기 + 모양 한눈에 보기 4개 (누르면 그 모양)
    if (await p.locator('#cover-suggest:not([disabled])').count()) await p.click('#cover-suggest');
    const minis = await p.locator('.cover-mini-btn').count();
    await p.locator('.cover-mini-btn >> nth=2').click();
    const miniOn = await p.getAttribute('.cover-mini-btn >> nth=2', 'aria-pressed');
    const coverOverflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    global.coverPickOk = (global.coverPickOk ?? true) && minis === 4 && miniOn === 'true' && !coverOverflow && (await p.locator('#cover-suggest').count()) === 1;
    await p.click('text=이 커버 쓰기');
    await p.waitForSelector('.cover-thumb', { timeout: 30000 });
    if (tag === 'desk') await p.screenshot({ path: path.join(TMP, `${tag}-앨범커버.png`), fullPage: true });
    // 싱크 가사: 맞추기 시작 → 스페이스로 줄마다 찍기 → 싱크 완료, 제출 zip에 .lrc
    await p.click('.tab:text-is("싱크 가사")');
    await p.click('text=▶ 맞추기 시작');
    const nLines = await p.locator('.sync-line').count();
    for (let k = 0; k < nLines; k++) { await p.waitForTimeout(40); await p.keyboard.press('Space'); }
    await p.waitForSelector('.chip.on:has-text("싱크 완료")', { timeout: 10000 }).catch(() => {});
    const syncTimes = await p.$$eval('.sync-time', (els) => els.map((e) => e.textContent));
    const syncDone = await p.locator('.chip.on:has-text("싱크 완료")').count();
    const syncOverflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (tag === 'desk') await p.screenshot({ path: path.join(TMP, `${tag}-싱크.png`), fullPage: true });
    global.syncOk = (global.syncOk ?? true) && nLines > 3 && syncDone === 1 && !syncTimes.includes('--:--.--') && !syncOverflow;
    global.syncInfo = { nLines, first: syncTimes[0], last: syncTimes[syncTimes.length - 1], syncOverflow };
    await p.click('.tab:text-is("일정")');
    await p.click('.schedule input[type=checkbox] >> nth=0');
    const [icsDl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click('#sched-ics')]);
    const icsPath = path.join(TMP, `${tag}-schedule.ics`);
    await icsDl.saveAs(icsPath);
    const icsText = fs.readFileSync(icsPath, 'utf8');
    global.icsOk = (global.icsOk ?? true) && icsDl.suggestedFilename().endsWith('발매 일정.ics') && (icsText.match(/BEGIN:VEVENT/g) || []).length === 11;
    await p.click('.tab:text-is("제출")');
    if (tag === 'desk') await p.screenshot({ path: path.join(TMP, `${tag}-앨범제출.png`), fullPage: true });
    const errorsLeft = await p.locator('.checklist .lv-error').count();
    const [download] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('text=제출 패키지 받기')]);
    const zipPath = path.join(TMP, `${tag}-release.zip`);
    await download.saveAs(zipPath);
    global.zipLrc = (global.zipLrc ?? true) && fs.readFileSync(zipPath).includes(Buffer.from('.lrc'));
    await p.waitForTimeout(300);
    global.albumStep2 = await p.textContent('#album-step-hint strong');
    global.splitOk = (global.splitOk ?? true) && global.splitSum === '합 100%' && fs.readFileSync(zipPath).includes(Buffer.from('하늘,70')) === false && fs.readFileSync(zipPath).includes(Buffer.from('물결,70')) && fs.readFileSync(zipPath).includes(Buffer.from('하늘,30'));
    // 가사집: 제출 패키지에 booklet.html, 따로 받기도 됨 → 열어서 화면 확인
    const [bkDl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#booklet-download')]);
    const bkPath = path.join(TMP, `${tag}-booklet.html`);
    await bkDl.saveAs(bkPath);
    const bk = fs.readFileSync(bkPath, 'utf8');
    global.bookletOk = (global.bookletOk ?? true) && fs.readFileSync(zipPath).includes(Buffer.from('booklet.html')) && bkDl.suggestedFilename().endsWith('가사집.html') && bk.includes('<img src="data:image/');
    if (tag === 'desk') {
      const pb = await c.newPage();
      await pb.goto('file://' + bkPath);
      await pb.screenshot({ path: path.join(TMP, 'booklet.png') });
      await pb.close();
    }
    // 성과: 큰 숫자를 같은 날 두 번 기록해도 남고, 폰에서 가로로 넘치지 않음
    await p.click('.tab:text-is("성과")');
    await p.fill('input[id^="stat-"][type=number]', '3000000');
    await p.click('#stat-save');
    await p.fill('input[id^="stat-"][type=number]', '3100000');
    await p.click('#stat-save');
    const statCell = await p.textContent('.stat-table tbody td.mono');
    const statOverflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    global.statOk = (global.statOk ?? true) && statCell.replace(/\D/g, '') === '3100000' && !statOverflow;
    // 가사 카드: 홍보 탭에서 첫 코러스 첫 줄이 기본, 3줄로 바꿔 PNG 받기 → 1080×1350
    if (tag === 'desk') {
      await p.click('.tab:text-is("홍보")');
      const lcFirst = await p.$eval('#lc-start', (e) => e.selectedOptions[0].textContent);
      await p.selectOption('#lc-count', '3');
      const [lcDl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#lc-download')]);
      const lcPath = path.join(TMP, 'lyric-card.png');
      await lcDl.saveAs(lcPath);
      const png = fs.readFileSync(lcPath);
      global.lyricCard = { lcFirst, name: lcDl.suggestedFilename(), w: png.readUInt32BE(16), h: png.readUInt32BE(20) };
      global.lyricCardOk = lcFirst.startsWith('Midnight signal 너를 불러') && global.lyricCard.name.endsWith('_가사카드.png') && global.lyricCard.w === 1080 && global.lyricCard.h === 1350;
    } else global.lyricCardOk = true;
    // Inst. 버전 추가: 원곡 바로 뒤에 (Inst.) 트랙, 같은 곡에는 버튼이 다시 안 보임
    await p.click('.tab:text-is("수록곡")');
    await p.click('button[id^="inst-"]');
    const trackTitles = await p.$$eval('.track-title', (els) => els.map((e) => e.textContent));
    global.instOk = (global.instOk ?? true) && trackTitles.length === 2 && trackTitles[1].endsWith('(Inst.)') && (await p.locator('button[id^="inst-"]').count()) === 0;
    if (tag === 'desk') {
      // Inst. 곡의 내보내기 탭에는 연주곡 만드는 법 안내
      await p.click('.song-item:has-text("(Inst.)")');
      await p.click('.tab:text-is("내보내기")');
      global.instOk = global.instOk && (await p.locator('#inst-guide').count()) === 1;
      await p.click('.song-item:has-text("Midnight Signal") >> nth=-1');
    }
    // 새로고침해도 마스터·커버가 남는지 (IndexedDB)
    await p.waitForTimeout(1500);
    await p.reload();
    await p.waitForSelector('.tab');
    if (tag === 'phone') await p.click('.nav-toggle');
    await p.click('.song-item:has-text("Midnight Signal") >> nth=-1');
    await p.waitForSelector('.pill:has-text("규격 OK")', { timeout: 15000 }).catch(() => {});
    const keptMaster = await p.locator('.pill:has-text("규격 OK")').count();
    await p.click('.tab:text-is("커버")');
    await p.waitForSelector('.cover-thumb', { timeout: 15000 }).catch(() => {});
    const keptCover = await p.locator('.cover-thumb').count();
    global.persistOk = (global.persistOk ?? true) && keptMaster === 1 && keptCover === 1;
    // 백업: 이 브라우저 데이터를 받아, 빈 브라우저에 되살리기 (넓은 화면만)
    if (tag === 'desk') {
      const [bdl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#backup-all')]);
      const bpath = path.join(TMP, 'backup.json');
      await bdl.saveAs(bpath);
      const c2 = await b.newContext({ viewport: { width: w, height: hgt } });
      const p2 = await c2.newPage();
      p2.on('pageerror', (e) => errs.push('restore ' + e.message));
      await p2.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
      await p2.waitForSelector('.tab');
      await p2.setInputFiles('#import-song', bpath);
      await p2.waitForSelector('.toast:has-text("되살렸어요"), #toast:has-text("되살렸어요")', { timeout: 15000 }).catch(() => {});
      const restoredSongs = await p2.locator('.song-item:has-text("Midnight Signal")').count();
      const restoredExample = await p2.locator('.song-meta:text-is("예시")').count(); // 빈 브라우저의 예시 자리 곡은 빠져야 함
      global.backupInfo = { name: bdl.suggestedFilename(), restoredSongs, restoredExample, toast: await p2.textContent('#toast') };
      global.backupOk = /^kpop-backup-\d{8}-\d{4}\.json$/.test(bdl.suggestedFilename()) && restoredSongs >= 2 && restoredExample === 0;
      await c2.close();
      // 곡 사이 듣기: 둘째 트랙(Inst.)에도 마스터를 넣으면 1→2 이어 듣기가 생기고 재생·정지됨
      await p.click('.tab:text-is("수록곡")');
      // (master-14.wav는 npm run test:master가 만든다 — 없으면 건너뜀)
      if (fs.existsSync(path.join(TMP, 'master-14.wav'))) {
        const transBefore = await p.locator('#transitions').count();
        await p.setInputFiles('input[type=file][id^="master-"] >> nth=1', path.join(TMP, 'master-14.wav'));
        await p.waitForSelector('#tr-0', { timeout: 30000 });
        await p.click('#tr-0');
        const transPlaying = await p.waitForSelector('#tr-0:has-text("정지")', { timeout: 30000 }).then(() => true).catch(() => false);
        await p.click('#tr-0');
        const stopped = (await p.textContent('#tr-0')).includes('이어 듣기');
        // 누르자마자 다른 탭으로 가면 (파일을 푸는 사이) 소리를 내지 않음 → 돌아와도 "정지" 상태가 아님
        await p.evaluate(() => {
          document.getElementById('tr-0').click();
          [...document.querySelectorAll('.tab')].find((t) => t.textContent === '정보·크레딧').click();
        });
        await p.waitForTimeout(800);
        await p.click('.tab:text-is("수록곡")');
        const noLatePlay = (await p.textContent('#tr-0')).includes('이어 듣기');
        global.transition = { transBefore, transPlaying, stopped, noLatePlay };
        global.transitionOk = transBefore === 0 && transPlaying && stopped && noLatePlay;
      } else global.transitionOk = true;
      // 앨범의 새 곡: 수록곡 탭 → 새 곡의 컨셉 탭으로, 타이틀곡 멤버 4명 이어받음, 앨범 트랙 하나 늘어남
      const tracksBefore = await p.locator('.track-title').count();
      await p.click('#album-new-song');
      await p.waitForSelector('h1:text-is("제목 없는 곡")');
      const newMembers = await p.locator('.member-row').count();
      const onConcept = await p.locator('.tab.on:text-is("컨셉·멤버")').count();
      await p.click('.song-item:has-text("Midnight Signal") >> nth=-1');
      await p.click('.tab:text-is("수록곡")');
      const tracksAfter = await p.locator('.track-title').count();
      global.albumNewSong = { tracksBefore, tracksAfter, newMembers, onConcept };
      global.albumNewSongOk = tracksAfter === tracksBefore + 1 && newMembers === 4 && onConcept === 1;
      // 앨범 화면에서 "+ 새 곡" → 새 곡으로 이동, 멤버가 없으니 다른 곡 멤버 불러오기 (같은 구성은 하나만)
      await p.click('text=+ 새 곡');
      await p.waitForSelector('h1:text-is("제목 없는 곡")');
      const importChoices = await p.locator('#member-import option').count();
      await p.click('#member-import-run');
      const imported = await p.locator('.member-row').count();
      global.memberImport = { importChoices, imported };
      global.memberImportOk = importChoices === 1 && imported === 4 && (await p.locator('#member-import').count()) === 0;
    }
    console.log(tag, { custom, prog, before, after, refs, masterPill, albumSteps: [global.albumStep1, global.albumStepTab, global.albumStep2], sylOk: global.sylOk, hlRange: global.hlRange, takeBest: global.takeBest, takeLufs: global.takeLufs, toneNote: global.toneNote, sync: global.syncInfo, stepHint, autoMaster, keptMaster, keptCover, errorsLeft, zip: fs.statSync(zipPath).size, vbodyStart: vbody.slice(0, 30), vcount });
    await c.close();
  }
  // 태블릿 세로(834px, 목록이 옆에 있는 가장 좁은 폭): 어떤 탭을 골라도 그 탭이 탭 줄 안에 보임
  {
    const c3 = await b.newContext({ viewport: { width: 834, height: 1112 } });
    const p3 = await c3.newPage();
    await p3.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
    await p3.waitForSelector('.tab');
    for (const name of await p3.$$eval('.tab', (els) => els.map((e) => e.textContent))) {
      await p3.click(`.tab:text-is("${name}")`);
      const vis = await p3.$eval('.tab.on', (e) => { const r = e.getBoundingClientRect(); const w = e.closest('.tabs-wrap').getBoundingClientRect(); return r.left >= w.left - 1 && r.right <= w.right + 1; });
      if (!vis) errs.push(`834px 고른 탭(${name})이 탭 줄 밖`);
    }
    await c3.close();
  }
  if (!global.autoOk) errs.push('마스터 자동 연결 안 됨');
  if (!global.undoOk) errs.push('되돌리기·다시 하기 안 됨');
  if (!global.albumUndoOk) errs.push('앨범 되돌리기 안 됨');
  if (!global.syncOk) errs.push('싱크 가사 맞추기 안 됨');
  if (!global.navOk) errs.push('폰 목록 접기 이상');
  if (!global.icsOk) errs.push('캘린더 파일 이상');
  if (!global.diffSame) errs.push('버전 비교 이상');
  if (!global.qcOk) errs.push('소리 점검(QC) 표시 이상');
  if (!global.instOk) errs.push('Inst. 버전 추가 이상');
  if (!global.fitOk) errs.push('가사·마디 맞춤 표시 이상');
  if (!global.lyricCardOk) errs.push(`가사 카드 이상: ${JSON.stringify(global.lyricCard)}`);
  if (!global.lengthOk) errs.push('곡 길이 표시 이상');
  if (!global.spaceOk) errs.push('스페이스바 재생 이상');
  if (!global.shareOk) errs.push('파트 분배 표시 이상');
  if (!global.welcomeOk) errs.push('처음 안내 카드 이상');
  if (!global.transitionOk) errs.push(`곡 사이 듣기 이상: ${JSON.stringify(global.transition)}`);
  if (!global.albumNewSongOk) errs.push(`앨범의 새 곡 이상: ${JSON.stringify(global.albumNewSong)}`);
  if (!global.memberImportOk) errs.push(`멤버 불러오기 이상: ${JSON.stringify(global.memberImport)}`);
  if (!global.coverPickOk) errs.push('커버 추천·모양 미리보기 이상');
  if (!/^-1[34]\.\d LUFS$/.test(global.takeLufs || '')) errs.push(`테이크 음량 표시 이상: ${global.takeLufs}`);
  if (global.albumStep1 !== '다음: 정보·크레딧' || global.albumStepTab !== '정보·크레딧' || global.albumStep2 !== '다음: 발매 후 기록') errs.push(`앨범 진행 단계 이상: ${global.albumStep1} / ${global.albumStepTab} / ${global.albumStep2}`);
  if (global.sylOk !== true) errs.push('가사 음절 넣기 이상');
  if (!global.statOk) errs.push('성과 기록 이상');
  if (!global.bookletOk) errs.push('가사집 이상');
  if (!global.splitOk) errs.push(`지분 이상: ${global.splitSum}`);
  if (!global.hlOk) errs.push(`하이라이트 이상: ${global.hlRange}`);
  if (global.toneOk === false) errs.push(`레퍼런스 음색 맞추기 이상: ${global.toneNote}`);
  if (!global.backupOk) errs.push(`백업·복원 이상: ${JSON.stringify(global.backupInfo)}`);
  if (!global.zipLrc) errs.push('제출 패키지에 .lrc 없음');
  if (global.takeBest !== undefined && global.takeBest !== 'master-14') errs.push(`테이크 비교 결과 이상: ${global.takeBest}`);
  if (global.endCutOk !== true) errs.push('곡 끝 자르기 결과 이상');
  if (!global.keysOk) errs.push('피아노롤 키보드 안 됨');
  if (!global.helpOk) errs.push('도움말 안 열림');
  if (!global.persistOk) errs.push('새로고침 후 마스터·커버 유실');
  console.log('ERRORS:', errs);
  if (errs.length) process.exitCode = 1; else console.log('ui OK');
  await b.close();
})();
