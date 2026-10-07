// 샘플 음색·마스터링 점검 (로컬 웹서버로 samples/를 실제로 불러온다). 실행: npm run build && npm run test:master
// - LUFS 측정기: 997Hz -20dBFS 스테레오 사인 → -20.0 LUFS (BS.1770 기준값)
// - 샘플 묶음 로딩, 샘플로 렌더한 데모의 무음·NaN 여부
// - 마스터링 결과를 ffmpeg ebur128(독립 측정기)로 재측정: 목표 ±0.5 LU, 트루 피크 ≤ -0.8 dBTP
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const { buildSync } = require('esbuild');
const { chromium } = require(execSync('npm root -g').toString().trim() + '/playwright');

const ROOT = path.join(__dirname, '..');
const TMP = path.join(__dirname, '.tmp');
fs.mkdirSync(TMP, { recursive: true });
const worker = buildSync({ entryPoints: [path.join(ROOT, 'src/js/music/dsp-worker.js')], bundle: true, format: 'iife', write: false, tsconfigRaw: '{}' }).outputFiles[0].text;
buildSync({ entryPoints: [path.join(__dirname, 'engine-entry.js')], bundle: true, format: 'iife', tsconfigRaw: '{}', define: { __DSP_WORKER__: JSON.stringify(worker) }, outfile: path.join(TMP, 'bundle.js') });
fs.writeFileSync(path.join(TMP, 'index.html'), '<meta charset=utf-8><script src=bundle.js></script>');

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = url.startsWith('/samples/') ? path.join(ROOT, 'dist', url) : path.join(TMP, url === '/' ? 'index.html' : url);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': file.endsWith('.json') ? 'application/json' : file.endsWith('.js') ? 'text/javascript' : 'text/html' });
    res.end(data);
  });
});

function ebur128(file) {
  let out = '';
  try { execFileSync('ffmpeg', ['-nostats', '-hide_banner', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] }); } catch (e) { out = String(e.stderr); }
  out = out || execFileSync('sh', ['-c', `ffmpeg -nostats -hide_banner -i "${file}" -af ebur128=peak=true -f null - 2>&1`]).toString();
  const summary = out.slice(out.lastIndexOf('Summary:'));
  return { I: Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)[1]), TP: Number(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)[1]) };
}

server.listen(0, async () => {
  const port = server.address().port;
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await p.goto(`http://localhost:${port}/`);
  const r = await p.evaluate(async () => {
    const sr = 48000; const n = sr * 10;
    const sine = new Float32Array(n);
    for (let i = 0; i < n; i++) sine[i] = 0.1 * Math.sin((2 * Math.PI * 997 * i) / sr);
    const sineLufs = T.integratedLoudness([sine, sine], sr);

    // 모든 샘플 묶음이 이 브라우저에서 풀리는지
    const keys = ['bass-synth','bass-round','bass-growl','piano-grand','piano-electric','pad-warm','pad-airy','pad-dark','strings-ensemble','strings-soft','guitar-clean','guitar-acoustic','lead-voice','lead-flute','drums-boom','drums-tight','drums-electro'];
    const dec = new OfflineAudioContext(2, 1, 44100);
    const allPacks = {};
    for (const k of keys) {
      try {
        const pack = await (await fetch(`samples/${k}.json`)).json();
        const items = Object.values(pack.notes || pack.hits);
        let shortest = Infinity;
        for (const b64 of items) {
          const bin = atob(b64); const u = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
          shortest = Math.min(shortest, (await dec.decodeAudioData(u.buffer)).duration);
        }
        allPacks[k] = `${items.length}개, 최단 ${shortest.toFixed(2)}s`;
      } catch (e) { allPacks[k] = false; }
    }

    const song = T.normalizeMusic(T.exampleSong());
    const t0 = performance.now();
    const bank = await T.loadBank(song);
    const loadMs = Math.round(performance.now() - t0);
    const packs = Object.fromEntries(Object.entries(bank).map(([k, v]) => [k, !!v]));
    const t1 = performance.now();
    const buf = await T.renderSong(song);
    const renderMs = Math.round(performance.now() - t1);
    const ch = buf.getChannelData(0);
    let sum = 0; let nan = false;
    for (let i = 0; i < ch.length; i++) { sum += ch[i] * ch[i]; if (Number.isNaN(ch[i])) nan = true; }

    const toB64 = (bytes) => new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result.split(',')[1]); fr.readAsDataURL(new Blob([bytes])); });
    const out = {};
    for (const target of [-14, -8]) {
      const t2 = performance.now();
      const m = await T.master(buf, { preset: 'kpop', target });
      out[target] = { ms: Math.round(performance.now() - t2), before: m.before, after: m.after, gr: m.maxReduction, reached: m.reached, via: m.via,
        wav: await toB64(T.encodeWav({ channels: m.channels, sampleRate: m.rate }, { bits: 24, normalize: false })) };
    }
    return { sineLufs, allPacks, loadMs, packs, renderMs, rms: Math.sqrt(sum / ch.length), nan, out };
  });
  let ok = Math.abs(r.sineLufs + 20) < 0.1 && Object.values(r.allPacks).every(Boolean) && Object.values(r.packs).every(Boolean) && !r.nan && r.rms > 0.01;
  console.log('all packs', r.allPacks);
  console.log('sine LUFS', r.sineLufs.toFixed(2), '| samples', r.packs, `load ${r.loadMs}ms render ${r.renderMs}ms rms ${r.rms.toFixed(3)}`);
  for (const [target, m] of Object.entries(r.out)) {
    const file = path.join(TMP, `master${target}.wav`);
    fs.writeFileSync(file, Buffer.from(m.wav, 'base64'));
    const ff = ebur128(file);
    // 목표에 닿았다고 하면 ffmpeg로도 ±0.5 LU, 못 닿았다고 하면 리미터가 한계(12dB)까지 갔어야 한다. 피크는 항상 지킨다.
    const loud = m.reached ? Math.abs(ff.I - Number(target)) <= 0.5 : m.gr >= 11.5 && Math.abs(ff.I - m.after.lufs) <= 0.5;
    const pass = loud && ff.TP <= -0.8 && (Number(target) !== -14 || m.reached) && m.via === 'worker';
    ok = ok && pass;
    console.log(`target ${target}: app ${m.after.lufs.toFixed(2)} LUFS ${m.after.peak.toFixed(2)} dBTP | ffmpeg ${ff.I} LUFS ${ff.TP} dBTP | GR ${m.gr.toFixed(1)}dB reached=${m.reached} via=${m.via} | ${m.ms}ms | ${pass ? 'OK' : 'FAIL'}`);
  }
  console.log(ok ? 'master OK' : 'master FAILED');
  if (!ok) process.exitCode = 1;
  await b.close();
  server.close();
});
