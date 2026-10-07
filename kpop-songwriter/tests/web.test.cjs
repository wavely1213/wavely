// 웹사이트 빌드 점검 (mulgyeol.kr/music): Vercel처럼 /music, /music/ 둘 다 열리는지, 샘플이 /music/samples/에서 오는지,
// 일반 다운로드가 되는지, 콘솔 오류가 없는지. 실행: npm run build:web && npm run test:web
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require(execSync('npm root -g').toString().trim() + '/playwright');

const ROOT = path.join(__dirname, '..', 'dist-web');
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/music' || url.endsWith('/')) url = `${url.replace(/\/$/, '')}/index.html`;
  const file = path.join(ROOT, url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(0, async () => {
  const port = server.address().port;
  // 컨테이너에 UTF-8 로캘이 없으면 한글 파일명이 'download'로 바뀐다 (앱 문제 아님)
  const b = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
  const out = {};
  const errs = [];
  for (const entry of ['/music', '/music/']) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const samples = [];
    p.on('response', (r) => { if (r.url().includes('/samples/')) samples.push(`${r.status()} ${new URL(r.url()).pathname}`); });
    p.on('pageerror', (e) => errs.push(`${entry} ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(`${entry} ${m.text()}`); });
    await p.goto(`http://localhost:${port}${entry}`);
    await p.waitForSelector('.tab');
    const title = await p.title();
    const banner = await p.textContent('.warn.card');
    await p.click('.tab:text-is("편곡")');
    await p.click('text=▶ 전체 듣기');
    await p.waitForSelector('text=■ 정지', { timeout: 30000 });
    await p.click('text=■ 정지');
    await p.click('.tab:text-is("내보내기")');
    await p.uncheck('#pkg-wav');
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('text=zip 받기')]);
    const scroll = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    out[entry] = { title, webBanner: banner.includes('웹사이트에서는'), samples: samples.slice(0, 3), sampleCount: samples.length, download: dl.suggestedFilename(), overflow: scroll };
    await p.close();
  }
  // PWA: 매니페스트·아이콘, 서비스 워커가 페이지를 맡은 뒤 인터넷을 끊고 새로고침해도 열림
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(`pwa ${e.message}`));
    await p.goto(`http://localhost:${port}/music/`);
    await p.waitForSelector('.tab');
    const manifest = await p.evaluate(async () => {
      const href = document.querySelector('link[rel=manifest]').href;
      const m = await (await fetch(href)).json();
      const icons = await Promise.all(m.icons.map(async (i) => (await fetch(new URL(i.src, href))).status));
      return { start: m.start_url, scope: m.scope, display: m.display, icons };
    });
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.reload();
    await p.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
    // 다른 파일(sw.js)을 주소창으로 열어도 보관한 앱 화면이 바뀌지 않아야 함
    await p.goto(`http://localhost:${port}/music/sw.js`);
    await p.goto(`http://localhost:${port}/music/`);
    await p.waitForSelector('.tab');
    await ctx.setOffline(true);
    await p.reload();
    const offlineTabs = await p.waitForSelector('.tab', { timeout: 15000 }).then(() => p.locator('.tab').count()).catch(() => 0);
    await ctx.setOffline(false);
    out.pwa = { ...manifest, offlineTabs };
    await ctx.close();
  }
  // 앱으로 설치: 브라우저가 설치 창을 줄 수 있다고 알리면(beforeinstallprompt) 목록에 버튼 → 누르면 설치 창, 설치하면 사라짐
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(`install ${e.message}`));
    await p.goto(`http://localhost:${port}/music/`);
    await p.waitForSelector('.tab');
    const before = await p.locator('#install-app').count();
    await p.evaluate(() => {
      const e = new Event('beforeinstallprompt', { cancelable: true });
      e.prompt = () => { window.__installPrompted = true; return Promise.resolve(); };
      e.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(e);
    });
    await p.click('#install-app');
    const prompted = await p.evaluate(() => window.__installPrompted === true);
    await p.waitForTimeout(200);
    out.install = { before, prompted, after: await p.locator('#install-app').count() };
    await ctx.close();
  }
  // 저장 공간: 70% 넘게 차면 목록 아래 경고, 꽉 차서 저장이 안 되면 머리말에 "꽉 차서" (다시 시도하라는 말 대신)
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(`storage ${e.message}`));
    await p.goto(`http://localhost:${port}/music/`);
    await p.waitForSelector('.tab');
    // 처음 안내: 웹은 AI가 없으니 직접 쓰는 안내, "내 첫 곡 만들기"로 새 곡
    const welcomeNoAi = await p.waitForSelector('#welcome:has-text("AI를 쓸 수 없어요")', { timeout: 10000 }).then(() => true).catch(() => false);
    await p.click('#welcome-new');
    const firstSong = await p.waitForSelector('h1:text-is("제목 없는 곡")', { timeout: 5000 }).then(() => true).catch(() => false);
    const warnBefore = await p.locator('#storage-warn').count();
    await p.evaluate(() => localStorage.setItem('fill-0', 'a'.repeat(3_700_000)));
    await p.reload();
    await p.waitForSelector('.tab');
    const warnText = await p.textContent('#storage-warn').catch(() => '');
    await p.evaluate(() => {
      // 큰 조각 → 작은 조각 순서로 빈틈 없이 채운다
      let i = 1;
      for (const size of [20_000, 1_000, 50]) {
        try { for (let k = 0; k < 400; k++) localStorage.setItem(`fill-${i++}`, 'a'.repeat(size)); } catch { /* 이 크기로는 꽉 참 */ }
      }
    });
    await p.click('.tab:text-is("구조·가사")');
    await p.locator('textarea.lyrics').first().fill('꽉 찬 저장 공간에서 고친 가사'.repeat(300));
    const fullLabel = await p.waitForFunction(() => /꽉 차서/.test(document.getElementById('save-status')?.textContent || ''), null, { timeout: 10000 }).then(() => true).catch(() => false);
    out.storage = { welcomeNoAi, firstSong, warnBefore, warnText: warnText.slice(0, 30), fullLabel, fullWarn: await p.locator('#storage-warn:has-text("100%")').count() };
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  const storage = out.storage;
  delete out.storage;
  const inst = out.install;
  delete out.install;
  if (!(inst.before === 0 && inst.prompted && inst.after === 0)) errs.push(`앱 설치 버튼 이상: ${JSON.stringify(inst)}`);
  if (!(storage.welcomeNoAi && storage.firstSong && storage.warnBefore === 0 && /약 7\d%/.test(storage.warnText) && storage.fullLabel && storage.fullWarn === 1)) errs.push(`저장 공간 경고 이상: ${JSON.stringify(storage)}`);
  const pwa = out.pwa;
  delete out.pwa;
  const pwaOk = pwa.start === '/music/' && pwa.scope === '/music/' && pwa.display === 'standalone' && pwa.icons.every((st) => st === 200) && pwa.offlineTabs > 5;
  if (!pwaOk) errs.push(`PWA 이상: ${JSON.stringify(pwa)}`);
  const ok = Object.values(out).every((r) => r.title.startsWith('물결 뮤직') && r.webBanner && r.sampleCount > 0 && r.samples.every((s) => s.startsWith('200 /music/samples/')) && r.download.endsWith('.zip') && r.download.includes('새벽') && !r.overflow) && !errs.length;
  if (errs.length) console.log('ERRORS', errs);
  console.log(ok ? 'web OK' : 'web FAILED');
  if (!ok) process.exitCode = 1;
  await b.close();
  server.close();
});
