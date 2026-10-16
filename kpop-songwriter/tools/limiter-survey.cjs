// 리미터 실측: 음원 폴더의 곡을 앱과 같은 마스터링(decodeFile → master)으로 돌려 리미터 최대 감소·음량을 잰다.
// 경고 문턱(music/master.js masterWarnings)을 실제 Suno 결과로 정할 때 쓴다 (BACKLOG '3번에서 남긴 것', D-029).
// 실행: node tools/limiter-survey.cjs <음원 폴더> [--targets=-14,-11,-9,-8] [--preset=kpop] [--out=결과.json] [--pages=2]
// - 음원은 ffmpeg가 읽는 형식이면 된다(wav·mp3·m4a·mp4). ffmpeg로 48kHz 32비트 WAV로 풀고, 브라우저에서 앱 함수로 처리한다.
// - Playwright(전역 설치)와 ffmpeg가 필요하다 (테스트와 같음).
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const { buildSync } = require('esbuild');
const { chromium } = require(execSync('npm root -g').toString().trim() + '/playwright');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
if (!dir) {
  console.error('사용법: node tools/limiter-survey.cjs <음원 폴더> [--targets=-14,-11,-9,-8] [--preset=kpop] [--out=결과.json] [--pages=2]');
  process.exit(1);
}
const targets = opt('targets', '-14,-11,-9,-8').split(',').map(Number);
const preset = opt('preset', 'kpop');
const outFile = opt('out', path.join(process.cwd(), 'limiter-survey.json'));
const pages = Math.max(1, Number(opt('pages', '2')));

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'limiter-'));
const bundle = buildSync({
  stdin: { contents: "import { master, masterWarnings, decodeFile } from './music/master.js'; window.M = { master, masterWarnings, decodeFile };", resolveDir: path.join(ROOT, 'src/js') },
  bundle: true, format: 'iife', write: false, tsconfigRaw: '{}',
}).outputFiles[0].text;
fs.writeFileSync(path.join(TMP, 'bundle.js'), bundle);
fs.writeFileSync(path.join(TMP, 'index.html'), '<meta charset=utf-8><script src=bundle.js></script>');

const files = fs.readdirSync(dir).filter((f) => /\.(wav|mp3|m4a|mp4|flac|aac|ogg|opus)$/i.test(f)).sort();
const server = http.createServer((req, res) => {
  const file = path.join(TMP, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.wav') ? 'audio/wav' : 'text/html' });
    res.end(data);
  });
});

async function measureOne(page, name) {
  const wav = `${path.basename(name).replace(/[^\w.-]+/g, '_')}.wav`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(dir, name), '-vn', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_f32le', path.join(TMP, wav)]);
  try {
    return await page.evaluate(async ({ wav, targets, preset }) => {
      const blob = await (await fetch(wav)).blob();
      const buf = await M.decodeFile(new File([blob], wav));
      const rows = [];
      for (const target of targets) {
        const r = await M.master(buf, { preset, target });
        rows.push({
          target, reached: r.reached, maxReduction: r.maxReduction, gainDb: r.gainDb,
          before: r.before, after: r.after, warnings: M.masterWarnings(r, target),
        });
      }
      return { seconds: buf.duration, rows };
    }, { wav, targets, preset });
  } finally {
    fs.rmSync(path.join(TMP, wav), { force: true });
  }
}

server.listen(0, async () => {
  const port = server.address().port;
  const browser = await chromium.launch();
  const results = [];
  let next = 0;
  const work = async () => {
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error('PAGEERR', e.message));
    await page.goto(`http://localhost:${port}/`);
    while (next < files.length) {
      const name = files[next++];
      try {
        const r = await measureOne(page, name);
        results.push({ file: name, ...r });
        const d = r.rows.find((x) => x.target === -9) || r.rows[0];
        console.log(`${results.length}/${files.length} ${name}: 원본 ${d.before.lufs.toFixed(1)} LUFS · 리미터 최대 ${d.maxReduction.toFixed(1)}dB (${d.target})`);
      } catch (e) {
        results.push({ file: name, error: String(e.message || e) });
        console.error(`실패 ${name}: ${e.message || e}`);
      }
    }
    await page.close();
  };
  await Promise.all(Array.from({ length: Math.min(pages, files.length) }, work));
  fs.writeFileSync(outFile, JSON.stringify({ preset, targets, results }, null, 1));
  console.log(`저장: ${outFile}`);
  await browser.close();
  server.close();
  fs.rmSync(TMP, { recursive: true, force: true });
});
