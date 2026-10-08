const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');
const path = require('path');
const { buildSync } = require('esbuild');
// 음악 엔진 점검: MIDI·zip 생성, WAV 렌더(무음/NaN/클리핑), 레퍼런스 분석 정확도. 실행: npm run test:engine
const TMP = path.join(__dirname, '.tmp');
fs.mkdirSync(TMP, { recursive: true });
buildSync({ entryPoints: [path.join(__dirname, 'engine-entry.js')], bundle: true, format: 'iife', tsconfigRaw: '{}', outfile: path.join(TMP, 'bundle.js') });
fs.writeFileSync(path.join(TMP, 'index.html'), '<meta charset=utf-8><script src=bundle.js></script>');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.goto('file://' + path.join(TMP, 'index.html'));
  const r = await p.evaluate(async () => {
    const s = T.normalizeMusic(T.exampleSong());
    const tl = T.buildTimeline(s);
    const midi = T.buildMidi(s);
    const t0 = performance.now();
    const buf = await T.renderSong(s);
    const renderMs = performance.now() - t0;
    const ch = buf.getChannelData(0);
    let peak = 0, sum = 0; for (let i = 0; i < ch.length; i++) { const a = Math.abs(ch[i]); if (a > peak) peak = a; sum += a*a; }
    const nan = ch.some(Number.isNaN);
    const wav = T.encodeWav(buf);
    // 합성 레퍼런스: 128 BPM 킥 + A minor 코드 패드, 30초
    const sr = 44100, dur = 30, off = new OfflineAudioContext(1, sr*dur, sr);
    const beat = 60/128;
    for (let t = 0; t < dur; t += beat) { const o = off.createOscillator(); const g = off.createGain(); o.frequency.setValueAtTime(140,t); o.frequency.exponentialRampToValueAtTime(45,t+0.1); g.gain.setValueAtTime(0.9,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.25); o.connect(g).connect(off.destination); o.start(t); o.stop(t+0.3); }
    [57,60,64,69,72,76, 52].forEach(m => { const o = off.createOscillator(); o.type='triangle'; o.frequency.value = 440*2**((m-69)/12); const g = off.createGain(); g.gain.value = 0.06; o.connect(g).connect(off.destination); o.start(0); o.stop(dur); });
    const ref = await off.startRendering();
    const refWav = T.encodeWav(ref);
    const file = new File([refWav], 'ref.wav');
    const a = await T.analyzeAudio(file);
    const pkg = await T.buildPackage(s, { includeWav: false, lyricOpts: { memberTags: true, keepAdlibs: true }, onStep: () => {} });
    const zipBytes = Array.from(new Uint8Array(await pkg.blob.arrayBuffer()));
    return { events: tl.events.length, totalSteps: tl.totalSteps, midiLen: midi.length, midi: Array.from(midi), renderMs: Math.round(renderMs), seconds: buf.duration.toFixed(1), peak: peak.toFixed(2), rms: Math.sqrt(sum/ch.length).toFixed(3), nan, wavLen: wav.length, analysis: { ...a, energy: a.energy.length }, zipBytes, zipName: pkg.filename };
  });
  fs.writeFileSync(path.join(TMP, 'out.mid'), Buffer.from(r.midi));
  fs.writeFileSync(path.join(TMP, 'out.zip'), Buffer.from(r.zipBytes));
  delete r.midi; delete r.zipBytes;
  console.log(JSON.stringify(r, null, 1));
  const ok = !r.nan && Number(r.peak) <= 1 && Number(r.rms) > 0.01 && Math.abs(r.analysis.bpm - 128) <= 2
    && r.analysis.root === 9 && r.analysis.mode === 'minor' && r.midiLen > 1000;
  console.log(ok ? 'engine OK' : 'engine FAILED');
  if (!ok) process.exitCode = 1;
  await b.close();
})();
