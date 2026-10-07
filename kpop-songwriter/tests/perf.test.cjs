// 성능 점검: 곡 50개(섹션 2배)를 넣고 탭 전환·입력·저장 시간을 잰다. 실행: npm run build && npm run test:perf
// 기준(넘으면 실패): 탭 전환 중간값 150ms, 입력 한 글자 평균 30ms, 저장 한 번 150ms
const path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
  await p.goto(url);
  await p.waitForSelector('.tab');
  // 예시 곡을 한 번 고쳐 저장되게 한 뒤, 그 곡으로 50곡을 만든다
  await p.click('.tab:text-is("구조·가사")');
  await p.locator('textarea.lyrics').first().fill('성능 점검 첫 줄\n둘째 줄');
  await p.waitForFunction(() => (localStorage.getItem('kpop-writer-songs') || '[]').length > 100, null, { timeout: 10000 });
  const bytes = await p.evaluate(() => {
    const [song] = JSON.parse(localStorage.getItem('kpop-writer-songs'));
    const many = Array.from({ length: 50 }, (_, i) => {
      const s = JSON.parse(JSON.stringify(song));
      s.id = `perf${i}`;
      s.title = `성능 곡 ${i}`;
      // 섹션 2배 (id를 새로 만들고 편곡·멜로디도 복사)
      const extra = s.sections.map((x) => ({ ...x, id: `${x.id}b` }));
      extra.forEach((x, k) => { s.music.sections[x.id] = JSON.parse(JSON.stringify(s.music.sections[s.sections[k].id])); });
      s.sections = [...s.sections, ...extra];
      s.updatedAt = Date.now() - i;
      return s;
    });
    const text = JSON.stringify(many);
    localStorage.setItem('kpop-writer-songs', text);
    return text.length;
  });
  // AI 만족도 추이가 보이도록 👍/👎 12개(처음 6개 중 2개 👍, 최근 6개 중 5개 👍)를 취향 기록에 넣어 둔다
  await p.evaluate(() => {
    const log = Array.from({ length: 12 }, (_, i) => ({ id: `t${i}`, at: 1000 + i, kind: 'lyrics', rating: (i < 6 ? i < 2 : i < 11) ? 1 : -1, text: 'x', before: '', after: '', reasons: [], context: {} }));
    localStorage.setItem('kpop-writer-taste', JSON.stringify({ enabled: true, profile: {}, log }));
  });
  await p.reload();
  await p.waitForSelector('.tab');
  const sections = await p.locator('.song-item').count();
  // 곡 찾기: "곡 1" → 1, 10~19 (11곡). 탭을 바꿔 다시 그려도 찾기가 유지. 없는 말이면 안내.
  const visible = () => p.$$eval('#song-list > li', (els) => els.filter((e) => !e.hidden).length);
  const noneAtStart = await p.isVisible('#song-none');
  await p.fill('#song-search', '곡 1');
  const found = await visible();
  await p.click('.tab:text-is("편곡")');
  const kept = (await visible()) === found && (await p.inputValue('#song-search')) === '곡 1' && !(await p.isVisible('#song-none'));
  await p.fill('#song-search', '없는노래');
  await p.click('.tab:text-is("멜로디")'); // 다시 그려도 "찾는 곡이 없어요"가 맞게
  const none = (await visible()) === 0 && await p.isVisible('#song-none');
  await p.fill('#song-search', '');
  await p.click('.song-item:has-text("내 취향")');
  const trend = await p.textContent('#taste-trend');
  await p.locator('.song-item').first().click();
  const searchOk = trend === '처음 6개 33% → 최근 6개 83% (좋아지고 있어요)' && !noneAtStart && found === 11 && kept && none && (await visible()) === 50 && !(await p.isVisible('#song-none'));
  // 탭 전환: 클릭부터 다음 그리기까지
  const tabs = await p.$$eval('.tab', (els) => els.map((e) => e.textContent));
  const times = {};
  for (let round = 0; round < 2; round++) {
    for (const name of tabs) {
      const t = await p.evaluate(async (n) => {
        const el = [...document.querySelectorAll('.tab')].find((x) => x.textContent === n);
        const t0 = performance.now();
        el.click();
        await new Promise((r) => requestAnimationFrame(() => r()));
        return performance.now() - t0;
      }, name);
      if (round === 1) times[name] = Math.round(t);
    }
  }
  const sorted = Object.values(times).sort((x, y) => x - y);
  const median = sorted[Math.floor(sorted.length / 2)];
  // 입력: 가사 칸에 20글자
  await p.click('.tab:text-is("구조·가사")');
  const ta = p.locator('textarea.lyrics').first();
  await ta.click();
  const t0 = Date.now();
  await ta.pressSequentially('가나다라마바사아자차카타파하abcdef', { delay: 0 });
  const perKey = (Date.now() - t0) / 20;
  // 저장 한 번 (곡 50개 목록을 다시 쓰는 시간)
  const saveMs = await p.evaluate(() => {
    const t = performance.now();
    const list = JSON.parse(localStorage.getItem('kpop-writer-songs'));
    localStorage.setItem('kpop-writer-songs', JSON.stringify(list));
    return performance.now() - t;
  });
  const out = { songs: sections, search: { found, kept, none }, storageKB: Math.round(bytes / 1024), tabMs: times, tabMedian: median, keyMs: Math.round(perKey * 10) / 10, saveMs: Math.round(saveMs) };
  console.log(JSON.stringify(out, null, 1));
  const ok = !errs.length && searchOk && median < 150 && perKey < 30 && saveMs < 150;
  if (errs.length) console.log('ERRORS', errs);
  console.log(ok ? 'perf OK' : 'perf FAILED');
  if (!ok) process.exitCode = 1;
  await b.close();
})();
