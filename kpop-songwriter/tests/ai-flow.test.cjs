// AI 흐름 점검: 가짜 Claude(window.claude)를 넣어 claude.ai 밖에서도 AI 기능 전체를 돌려 본다.
// - 작사·훅·편곡·멜로디·스타일·홍보·취향 정리 응답이 화면에 반영되는지
// - 👍/👎·고친 내용이 취향 기록에 쌓이고, 다음 AI 요청 프롬프트에 취향이 들어가는지
// 실행: npm run build && npm run test:ai
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { chromium } = require(execSync('npm root -g').toString().trim() + '/playwright');
const TMP = path.join(__dirname, '.tmp');
fs.mkdirSync(TMP, { recursive: true });

// 브라우저 안에서 실행될 가짜 Claude
function fakeClaude() {
  window.__prompts = [];
  const idsAfter = (p, label) => {
    const m = p.match(new RegExp(`${label}: (\\[[^\\]]*\\])`));
    return m ? JSON.parse(m[1]) : [];
  };
  const answer = (p) => {
    if (p.includes('점수가 낮은 섹션을 고친다') && window.__worse) {
      return { sections: idsAfter(p, '가사를 쓸 섹션 id').map((id) => ({ id, lines: ['음'] })) };
    }
    if (p.includes('점수가 낮은 섹션을 고친다')) {
      return { sections: idsAfter(p, '가사를 쓸 섹션 id').map((id) => ({ id, lines: ['새벽 거리 위 너를 불러', '멈춘 시계 앞 너를 불러', 'signal on 다시 불러', '이 밤 끝에 너를 불러'] })) };
    }
    if (p.includes('가사를 쓸 섹션 id')) {
      return { sections: idsAfter(p, '가사를 쓸 섹션 id').map((id) => ({ id, lines: ['가짜 AI 첫 줄 너를 불러', '가짜 AI 둘째 줄 signal'] })) };
    }
    if (p.includes('편곡할 섹션 id')) {
      const ids = idsAfter(p, '편곡할 섹션 id');
      return { bpm: window.__arrBpm || 124, root: 'A', mode: 'minor', summary: '가짜 편곡 요약', sections: ids.map((id) => ({ id, bars: 4, chords: [1, 6, 3, 7], seventh: false, energy: 4, instruments: ['drums', 'b808', 'pluck', 'nope'], drum: 'trap', bass: 'halftime' })) };
    }
    if (p.includes('탑라이너(멜로디 작곡가)')) {
      const ids = [...p.matchAll(/"id":"([a-z0-9]+)","이름"/g)].map((x) => x[1]);
      return { sections: ids.map((id) => ({ id, notes: [{ s: 0, l: 4, d: 2, syl: '가' }, { s: 2, l: 2, d: 4, syl: '짜' }, { s: 8, l: 4, d: 30, syl: '멜' }] })) };
    }
    if (p.includes('영어 훅 후보')) return [{ hook: 'Signal on', meaning: '신호 켜', use: '코러스 첫 줄' }, { hook: 'Midnight call', meaning: '한밤의 전화', use: '프리코러스 끝' }];
    if (p.includes('Suno 스타일 프롬프트 재료')) return { genre: 'K-pop', subgenre: 'dark trap', bpm: 140, key: 'C minor', vocals: 'airy', instruments: '808', production: 'wide', extra: 'night', exclude: 'metal', why: '가짜 이유' };
    if (p.includes('반응 기록이다')) return { lyrics: '가짜 정리: 이미지로 감정을 보여 준다', sound: '가짜 정리: 808', avoid: '가짜 정리: 뻔한 단어', basis: '가짜 근거' };
    if (p.includes('번안 작사가')) {
      // 줄마다 원문 음절 수만큼의 가짜 번안 (마지막 줄만 일부러 5음 길게, 애드립만 있는 줄은 괄호)
      const src = JSON.parse(p.split('원문: ')[1].split('\n')[0]);
      const all = src.flatMap((s) => s.줄);
      return { sections: src.map((s) => ({ id: s.id, lines: s.줄.map((l) => {
        const n = l.음절수 + (l === all[all.length - 1] ? 5 : 0);
        return n ? { text: `テスト${'ラ'.repeat(n)}`.slice(0, n), kana: `てすと${'ら'.repeat(n)}`.slice(0, n) } : { text: '(オー)', kana: '(おー)' };
      }) })) };
    }
    if (p.includes('음악 저작권 검토')) {
      const first = (p.split('가사 (줄마다):\n')[1] || '').split('\n')[0].replace(/^- /, '');
      return { summary: '가짜 점검 요약', items: [{ line: first, like: '가짜 곡 - 가짜 가수', why: '훅 구절이 같음', level: 'high', fix: '가짜 새 줄 signal' }, { line: '가사에 없는 줄', like: 'x', why: 'x', level: 'check', fix: 'x' }] };
    }
    if (p.includes('레이블 홍보 담당자')) return { intro: '가짜 앨범 소개', tracks: [], sns: ['가짜 공지', '가짜 티저', '가짜 하이'], hashtags: '#가짜' };
    return {};
  };
  const sample = async (input, opts = {}) => {
    const p = typeof input === 'string' ? input : input.map((t) => t.content).join('\n');
    window.__prompts.push(p);
    const text = '1. 가짜 검토 결과\n2. 훅이 좋아요';
    opts.onText?.({ text, delta: text });
    return { text, truncated: false, modelTierApplied: 'default' };
  };
  sample.json = async (input) => {
    const p = typeof input === 'string' ? input : input.map((t) => t.content).join('\n');
    window.__prompts.push(p);
    await new Promise((r) => setTimeout(r, window.__delay || 30));
    return JSON.parse(JSON.stringify(answer(p)));
  };
  window.__saved = [];
  window.claude = {
    use: async (name) => {
      if (name === 'sample') return sample;
      if (name === 'downloads') return { save: async ({ filename }) => { window.__saved.push(filename); return { status: 'saved' }; } };
      return null; // db·user 없음 → 브라우저 저장
    },
  };
}

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(fakeClaude);
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await p.waitForSelector('.tab');
  const prompts = () => p.evaluate(() => window.__prompts);
  const taste = () => p.evaluate(() => JSON.parse(localStorage.getItem('kpop-writer-taste') || 'null'));
  const results = {};

  // 작사: Verse 다시 쓰기 → 반영 + 👎(이유) + 고치기 → 기록
  await p.click('.tab:text-is("구조·가사")');
  const verse = p.locator('article.section.t-verse').first();
  await verse.locator('text=AI로 다시 쓰기').click();
  await p.waitForFunction(() => [...document.querySelectorAll('textarea.lyrics')].some((t) => t.value.includes('가짜 AI 첫 줄')));
  results.lyricsApplied = true;
  await p.locator('article.section.t-verse').first().locator('text=👎 별로').click();
  await p.locator('article.section.t-verse').first().locator('.feedback .chip:text-is("유치해요")').click();
  // 줄 단위 ♥: 펼쳐서 한 줄만 좋아요 → 다시 그려도 펼친 채 ♥ 표시
  await p.locator('article.section.t-verse').first().locator('.line-likes summary').click();
  await p.locator('article.section.t-verse').first().locator('.line-likes button').first().click();
  results.lineLiked = await p.locator('article.section.t-verse').first().locator('.line-likes[open] button[aria-pressed="true"]').count();
  await p.locator('article.section.t-verse').first().screenshot({ path: path.join(TMP, 'line-likes.png') });
  const ta = p.locator('article.section.t-verse').first().locator('textarea.lyrics');
  await ta.fill('내가 고친 첫 줄 새벽을 불러\n가짜 AI 둘째 줄 signal');
  await p.waitForTimeout(5500); // 고친 내용은 멈춘 지 4초 뒤 기록
  // 자동 개선: 점수 낮은 섹션을 다시 쓰고 오른 것만 반영
  await p.click('button:has-text("섹션 자동 개선")');
  await p.waitForSelector('.report li');
  results.improve = await p.$$eval('.report li', (els) => els.map((e) => e.textContent));
  // 자동 개선 결과가 더 나쁘면 그대로 둔다
  await p.locator('article.section.t-bridge').first().locator('textarea.lyrics').fill('언젠가 너도 이 밤을 보면\n같은 불빛을 찾게 될 거야');
  await p.locator('article.section.t-bridge').first().locator('textarea.lyrics').press('Tab');
  await p.evaluate(() => { window.__worse = true; });
  await p.click('button:has-text("섹션 자동 개선")');
  await p.waitForFunction(() => [...document.querySelectorAll('.report li')].some((li) => li.textContent.includes('그대로 둠')));
  results.keptBridge = await p.locator('article.section.t-bridge textarea.lyrics').first().inputValue();
  await p.evaluate(() => { window.__worse = false; });
  // 훅 👍
  await p.click('text=훅 6개 추천받기');
  await p.waitForSelector('.hooks li');
  await p.locator('.hooks li').first().locator('text=👍 좋아요').click();
  // 검토(스트리밍 텍스트)
  await p.click('text=검토받기');
  await p.waitForSelector('#review-out:has-text("가짜 검토 결과")');
  results.review = true;

  // 편곡: 전체 AI 편곡 → 유효하지 않은 악기 id 걸러짐 + 👍
  await p.click('.tab:text-is("편곡")');
  await p.click('text=AI가 곡 전체 편곡하기');
  await p.waitForSelector('.note:has-text("가짜 편곡 요약")');
  results.arrangeKey = await p.textContent('.muted:has-text("현재")');
  await p.locator('.feedback').first().locator('text=👍 좋아요').click();

  // 멜로디: AI → 범위 밖 음(d=30)은 10으로 잘림
  await p.click('.tab:text-is("멜로디")');
  await p.click('button:has-text("AI로"):has-text("멜로디")');
  await p.waitForSelector('.pr-note:has-text("멜")');
  results.melodyNotes = await p.locator('.roll-grid .pr-note').count();
  results.melodyPromptRange = (await prompts()).filter((x) => x.includes('탑라이너')).pop().match(/"음역":"d -?\d+~-?\d+ \(/) !== null;
  await p.locator('text=👍 좋아요').first().click();

  // 스타일
  await p.click('.tab:text-is("Suno 스타일")');
  await p.click('text=컨셉으로 AI 제안');
  await p.waitForSelector('.note:has-text("가짜 이유")');
  results.styleBpm = await p.inputValue('#style-bpm');

  // 취향: 기록 확인 → AI 정리 → 프로필 반영
  await p.waitForTimeout(1800); // 자동 저장(1.2초 디바운스) 기다림
  const t1 = await taste();
  results.tasteLog = t1.log.map((e) => `${e.kind}:${e.rating}${e.reasons.length ? `(${e.reasons})` : ''}`);
  results.editRecorded = t1.log.some((e) => e.rating === 0 && e.after.includes('내가 고친'));
  await p.click('.song-item:has-text("내 취향")');
  await p.click('text=기록으로 AI가 정리하기');
  await p.waitForFunction(() => document.querySelector('#taste-lyrics')?.value.includes('가짜 정리'));
  await p.screenshot({ path: path.join(TMP, 'taste.png'), fullPage: true });
  await p.click('text=기록 내보내기');

  // 다음 AI 요청에 취향이 들어가는지
  await p.locator('.song-item').first().click();
  await p.click('.tab:text-is("구조·가사")');
  const before = (await prompts()).length;
  await p.locator('article.section.t-chorus').first().locator('text=AI로 다시 쓰기').click();
  await p.waitForFunction((n) => window.__prompts.length > n, before);
  const last = (await prompts()).slice(-1)[0];
  results.promptHasTaste = last.includes('작곡가의 취향') && last.includes('가짜 정리: 이미지로') && last.includes('내가 고친 첫 줄') && last.includes('유치해요') && last.includes('특히 좋다고 고른 줄');
  // 유사 표현 점검: 걸린 줄만 표시(가사에 없는 줄은 버림) → 제안으로 바꾸기
  await p.click('#similarity-run');
  await p.waitForSelector('.similar');
  results.similarCount = await p.locator('.similar').count();
  await p.locator('.similar').first().evaluate((el) => el.closest('.card').scrollIntoView());
  await p.locator('.similar').first().evaluate((el) => el.closest('.card').id = 'sim-card');
  await p.locator('#sim-card').screenshot({ path: path.join(TMP, 'similarity.png') });
  const flaggedLine = await p.textContent('.similar-line');
  await p.locator('.similar button:has-text("로 바꾸기")').click();
  results.similarFixed = (await p.textContent('.similar .pill')) === '바꿈'
    && (await p.$$eval('textarea.lyrics', (els) => els.some((t) => t.value.includes('가짜 새 줄 signal'))))
    && !(await p.$$eval('textarea.lyrics', (els, l) => els.some((t) => t.value.split('\n').some((x) => x.trim() === l)), flaggedLine));

  // 번안 가사: 내보내기 탭 → 일본어로 번안 → 원문과 음 수 비교, 길게 만든 한 줄만 경고, Suno 가사에 일본어
  await p.click('.tab:text-is("내보내기")');
  await p.click('#translate-run');
  await p.waitForSelector('.tr-row');
  results.trOff = await p.locator('.tr-dst .over').count();
  results.trLyrics = (await p.inputValue('#out-lyrics-tr')).includes('テス');
  results.trStyle = (await p.inputValue('#out-style-tr')).endsWith('Japanese lyrics');
  await p.locator('#translate-run').evaluate((el) => el.closest('.card').scrollIntoView());
  await p.screenshot({ path: path.join(TMP, 'translate.png') });

  // 느린 AI 편곡 중 다른 곡으로 바꿔도 결과는 원래 곡에만
  await p.locator('.song-item').first().click();
  const songA = await p.evaluate(() => document.querySelector('h1').textContent);
  await p.click('.tab:text-is("편곡")');
  await p.evaluate(() => { window.__delay = 1500; window.__arrBpm = 133; });
  await p.click('text=AI가 곡 전체 편곡하기');
  await p.click('text=+ 새 곡');
  await p.waitForTimeout(3500);
  await p.evaluate(() => { window.__delay = 0; });
  const songs = await p.evaluate(() => JSON.parse(localStorage.getItem('kpop-writer-songs')));
  const songAData = songs.find((x) => x.title === songA);
  const songBData = songs.find((x) => x.title === '제목 없는 곡');
  results.raceA = songAData.music.bpm;
  results.raceB = songBData.music.bpm;

  // 원클릭 초안: 주제만 적은 새 곡 → 가사·편곡·멜로디·스타일
  await p.evaluate(() => { window.__arrBpm = 128; });
  await p.click('text=+ 새 곡');
  await p.fill('#theme', '첫눈 오는 날 고백');
  await p.press('#theme', 'Tab');
  await p.click('button:text-is("초안 만들기")');
  await p.waitForSelector('.tab.on:text-is("구조·가사")', { timeout: 60000 });
  await p.waitForTimeout(1600);
  const draft = (await p.evaluate(() => JSON.parse(localStorage.getItem('kpop-writer-songs')))).find((x) => x.concept.theme === '첫눈 오는 날 고백');
  const lyricSecs = draft.sections.filter((x) => !['Intro', 'Outro', 'Dance Break'].includes(x.type));
  results.draft = {
    lyrics: lyricSecs.filter((x) => x.text.trim()).length + '/' + lyricSecs.length,
    arranged: !!draft.progress?.arranged,
    bpm: draft.music.bpm,
    melodySections: Object.values(draft.music.sections).filter((x) => x.melody.length).length,
    styleBpm: draft.style.bpm,
    styleKey: draft.style.key,
  };

  // 앨범 홍보
  await p.click('text=+ 새 앨범');
  await p.click('.tab:text-is("홍보")');
  await p.click('text=AI로 초안 쓰기');
  await p.waitForFunction(() => document.querySelector('#promo-intro')?.value === '가짜 앨범 소개');
  results.promo = true;
  results.saved = await p.evaluate(() => window.__saved);

  console.log(JSON.stringify(results, null, 1));
  const ok = results.lyricsApplied && results.review && results.improve.length > 0 && results.improve.every((t) => t.includes('반영')) && results.arrangeKey.includes('A minor') && results.melodyNotes === 3 && results.styleBpm === '140'
    && results.editRecorded && results.tasteLog.some((x) => x.startsWith('lyrics:-1(유치해요)')) && results.tasteLog.includes('hook:1') && results.lineLiked === 1 && results.similarCount === 1 && results.similarFixed && results.trOff === 1 && results.trLyrics && results.trStyle && results.tasteLog.includes('arrange:1')
    && results.tasteLog.includes('melody:1') && results.promptHasTaste && results.promo && results.draft.arranged && results.draft.bpm === 128 && results.draft.styleBpm === 128 && results.draft.styleKey === 'A minor' && results.draft.melodySections > 0 && results.draft.lyrics.split('/')[0] === results.draft.lyrics.split('/')[1] && results.keptBridge === '언젠가 너도 이 밤을 보면\n같은 불빛을 찾게 될 거야' && results.melodyPromptRange && results.raceA === 133 && results.raceB === 120 && results.saved.includes('taste-feedback.zip') && !errs.length;
  if (errs.length) console.log('ERRORS', errs);
  console.log(ok ? 'ai OK' : 'ai FAILED');
  if (!ok) process.exitCode = 1;
  await b.close();
})();
