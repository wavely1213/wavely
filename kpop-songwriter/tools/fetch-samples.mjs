// 악기 샘플을 내려받아 악기별 JSON(base64)로 묶는다. 결과: assets/samples/*.json
// 출처·라이선스는 assets/samples/CREDITS.md. 실행: npm run samples
// 드럼 원본(ogg/m4a)은 브라우저마다 디코딩 지원이 달라 ffmpeg로 MP3(192k)로 바꾼다 (ffmpeg 필요)
import { mkdirSync, writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FLUID = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM';
const SALAMANDER = 'https://tonejs.github.io/audio/salamander';
const DRUMS = 'https://smpldsnds.github.io/drum-machines';
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const SHARP = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
const name = (midi, table) => `${table[midi % 12]}${Math.floor(midi / 12) - 1}`;

// 3반음 간격(C, D#, F#, A)으로 받고 사이 음은 재생 속도로 맞춘다
function every3(lo, hi) {
  const out = [];
  for (let m = lo; m <= hi; m++) if ([0, 3, 6, 9].includes(m % 12)) out.push(m);
  return out;
}

const MELODIC = {
  'bass-synth': { src: 'fluid', inst: 'synth_bass_1', range: [24, 60] },
  'bass-round': { src: 'fluid', inst: 'electric_bass_finger', range: [24, 60] },
  'bass-growl': { src: 'fluid', inst: 'synth_bass_2', range: [24, 60] },
  'piano-grand': { src: 'salamander', range: [33, 96] },
  'piano-electric': { src: 'fluid', inst: 'electric_piano_1', range: [36, 96] },
  'pad-warm': { src: 'fluid', inst: 'pad_2_warm', range: [36, 96] },
  'pad-airy': { src: 'fluid', inst: 'pad_4_choir', range: [36, 96] },
  'pad-dark': { src: 'fluid', inst: 'pad_3_polysynth', range: [36, 96] },
  'strings-ensemble': { src: 'fluid', inst: 'string_ensemble_1', range: [36, 96] },
  'strings-soft': { src: 'fluid', inst: 'string_ensemble_2', range: [36, 96] },
  'guitar-clean': { src: 'fluid', inst: 'electric_guitar_clean', range: [40, 88] },
  'guitar-acoustic': { src: 'fluid', inst: 'acoustic_guitar_steel', range: [40, 88] },
  'lead-voice': { src: 'fluid', inst: 'choir_aahs', range: [48, 88] },
  'lead-flute': { src: 'fluid', inst: 'flute', range: [55, 96] },
};

const KITS = {
  'drums-boom': { dir: 'TR-808', map: { kick: 'kick/bd7575', snare: 'snare/sd5050', clap: 'clap/cp', hat: 'hihat-close/ch', ohat: 'hihat-open/oh25', crash: 'cymbal/cy5050' } },
  'drums-tight': { dir: 'LM-2', map: { kick: 'kick', snare: 'snare-m', clap: 'clap', hat: 'hhclosed', ohat: 'hhopen', crash: 'crash' } },
  'drums-electro': { dir: 'MFB-512', map: { kick: 'kick', snare: 'snare', clap: 'clap', hat: 'hihat-closed', ohat: 'hihat-open', crash: 'cymbal' } },
};

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function toMp3(data, ext) {
  const dir = mkdtempSync(join(tmpdir(), 'smp-'));
  try {
    writeFileSync(join(dir, `in.${ext}`), data);
    execFileSync('ffmpeg', ['-v', 'error', '-i', join(dir, `in.${ext}`), '-ar', '44100', '-b:a', '192k', join(dir, 'out.mp3')]);
    return readFileSync(join(dir, 'out.mp3'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function firstOk(urls) {
  for (const u of urls) {
    try { return { url: u, data: await get(u) }; } catch { /* 다음 후보 */ }
  }
  throw new Error(`못 받음: ${urls.join(' | ')}`);
}

mkdirSync('assets/samples', { recursive: true });
let total = 0;
for (const [key, def] of Object.entries(MELODIC)) {
  const notes = {};
  for (const m of every3(...def.range)) {
    const url = def.src === 'salamander' ? `${SALAMANDER}/${name(m, SHARP)}.mp3` : `${FLUID}/${def.inst}-mp3/${name(m, FLAT)}.mp3`;
    const { data } = await firstOk([url]);
    notes[m] = data.toString('base64');
  }
  const json = JSON.stringify({ type: 'mp3', notes });
  writeFileSync(`assets/samples/${key}.json`, json);
  total += json.length;
  console.log(key, Object.keys(notes).length, 'notes', (json.length / 1024).toFixed(0), 'KB');
}
for (const [key, kit] of Object.entries(KITS)) {
  const hits = {};
  for (const [kind, path] of Object.entries(kit.map)) {
    const { url, data } = await firstOk([`${DRUMS}/${kit.dir}/${path}.ogg`, `${DRUMS}/${kit.dir.toLowerCase()}/${path}.ogg`]);
    hits[kind] = toMp3(data, url.split('.').pop()).toString('base64');
  }
  const json = JSON.stringify({ type: 'mp3', hits });
  writeFileSync(`assets/samples/${key}.json`, json);
  total += json.length;
  console.log(key, (json.length / 1024).toFixed(0), 'KB');
}
console.log('total', (total / 1024 / 1024).toFixed(1), 'MB');
