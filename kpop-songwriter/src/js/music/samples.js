// 실제 악기 샘플 불러오기. 아티팩트와 함께 발행된 samples/*.json을 받아 AudioBuffer로 푼다.
// 받지 못하면(로컬 파일로 열었을 때 등) 신스 음색으로 대신 소리 낸다.

// 악기·음색 → 샘플 묶음 이름. 여기 없는 조합(808, 플럭, 아르페지오, 신스 리드)은 신스가 더 어울려 신스를 쓴다.
export const SAMPLE_KEYS = {
  'drums:tight': 'drums-tight',
  'drums:boom': 'drums-boom',
  'drums:electro': 'drums-electro',
  'bass:synth': 'bass-synth',
  'bass:round': 'bass-round',
  'bass:growl': 'bass-growl',
  'piano:grand': 'piano-grand',
  'piano:electric': 'piano-electric',
  'piano:lofi': 'piano-grand',
  'pad:warm': 'pad-warm',
  'pad:airy': 'pad-airy',
  'pad:dark': 'pad-dark',
  'strings:ensemble': 'strings-ensemble',
  'strings:soft': 'strings-soft',
  'guitar:clean': 'guitar-clean',
  'guitar:acoustic': 'guitar-acoustic',
  'lead:voice': 'lead-voice',
  'lead:flute': 'lead-flute',
};

const cache = new Map(); // 묶음 이름 → Promise<{notes: Map<midi, AudioBuffer>} | {hits: {kind: AudioBuffer}} | null>
let decoder = null;

function getDecoder() {
  if (!decoder) decoder = new OfflineAudioContext(2, 1, 44100);
  return decoder;
}

function b64ToBuffer(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

async function decode(b64) {
  return getDecoder().decodeAudioData(b64ToBuffer(b64));
}

function loadPack(key) {
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      // 로컬 파일(file://)로 열면 fetch가 막히므로 바로 신스로 대신한다
      if (location.protocol === 'file:') return null;
      try {
        const res = await fetch(`samples/${key}.json`);
        if (!res.ok) return null;
        const pack = await res.json();
        if (pack.hits) {
          const hits = {};
          await Promise.all(Object.entries(pack.hits).map(async ([k, v]) => { hits[k] = await decode(v); }));
          return { hits };
        }
        const notes = new Map();
        await Promise.all(Object.entries(pack.notes).map(async ([m, v]) => { notes.set(Number(m), await decode(v)); }));
        return { notes, sorted: [...notes.keys()].sort((a, b) => a - b) };
      } catch {
        return null;
      }
    })());
  }
  return cache.get(key);
}

export function sampleKey(inst, variant) {
  return SAMPLE_KEYS[`${inst}:${variant}`] || null;
}

// 곡에서 실제로 쓰는 악기 음색의 샘플만 미리 불러온다. 결과: { [묶음 이름]: 묶음 }
export async function loadBank(song, onlyInsts) {
  const used = new Set(onlyInsts || []);
  if (!onlyInsts) {
    Object.values(song.music.sections).forEach((sm) => {
      sm.instruments.forEach((i) => used.add(i));
      if (sm.melody.length) used.add('lead');
    });
  }
  const keys = [...used].map((i) => sampleKey(i, song.music.sounds[i]?.variant)).filter(Boolean);
  const bank = {};
  await Promise.all([...new Set(keys)].map(async (k) => { bank[k] = await loadPack(k); }));
  return bank;
}

// 가장 가까운 샘플과 재생 속도
export function nearestNote(pack, midi) {
  const s = pack.sorted;
  let best = s[0];
  for (const m of s) if (Math.abs(m - midi) < Math.abs(best - midi)) best = m;
  return { buffer: pack.notes.get(best), rate: 2 ** ((midi - best) / 12) };
}
