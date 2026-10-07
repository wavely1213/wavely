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
    await ctx.setOffline(true);
    await p.reload();
    const offlineTabs = await p.waitForSelector('.tab', { timeout: 15000 }).then(() => p.locator('.tab').count()).catch(() => 0);
    await ctx.setOffline(false);
    out.pwa = { ...manifest, offlineTabs };
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
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
