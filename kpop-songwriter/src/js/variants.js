// Suno 스타일 변형 A/B/C: 같은 곡을 세 방향으로 뽑아 보고 테이크 비교로 고른다. BPM·키는 그대로 둔다.
// 곡에 저장: song.styleVariants = { at, items: [{ id: 'A', idea, style: { genre, subgenre, vocals, instruments, production, extra } }] }
import { getSample } from './ai.js';
import { tasteBlock } from './learn/context.js';

export const VARIANT_IDS = ['A', 'B', 'C'];
const KEYS = ['genre', 'subgenre', 'vocals', 'instruments', 'production', 'extra'];

export function parseVariants(res) {
  const items = (Array.isArray(res?.variants) ? res.variants : []).map((v) => {
    const style = {};
    KEYS.forEach((k) => { if (typeof v?.[k] === 'string' && v[k].trim()) style[k] = v[k].trim().slice(0, 200); });
    return { id: '', idea: String(v?.idea ?? '').slice(0, 120), style };
  }).filter((v) => v.style.genre || v.style.production).slice(0, 3);
  if (!items.length) throw { code: 'invalid_json' };
  items.forEach((v, i) => { v.id = VARIANT_IDS[i]; });
  return { at: Date.now(), items };
}

// 변형을 곡 스타일에 겹친 것 (BPM·키·제외는 지금 값 그대로)
export function variantStyle(song, v) {
  return { ...song.style, ...v.style, bpm: song.style.bpm, key: song.style.key, exclude: song.style.exclude };
}

// 테이크 파일 이름에서 변형 찾기: "새벽 신호 B.wav", "song_c (1).mp3" → 'B', 'C'
export function variantFromName(name, song) {
  const ids = (song.styleVariants?.items || []).map((v) => v.id);
  const base = String(name || '').replace(/\.[a-z0-9]{2,5}$/i, '');
  const m = base.match(/(?:^|[\s_\-.(\[])([ABCabc])(?:$|[\s_\-.)\]])/g);
  if (!m) return '';
  const id = m[m.length - 1].replace(/[^ABCabc]/g, '').toUpperCase();
  return ids.includes(id) ? id : '';
}

export async function suggestVariants(song, { signal }) {
  const sample = await getSample();
  if (!sample) throw { code: 'not_granted' };
  const st = song.style;
  const prompt = [
    '너는 K-pop 프로듀서다. 같은 곡을 Suno로 세 방향으로 뽑아 비교하려 한다. Suno 스타일 재료를 세 벌 만든다 (영어, 짧은 구문).',
    'A: 지금 스타일에 충실하게 다듬은 것. B: 같은 장르 안에서 더 트렌디하거나 밝은 쪽. C: 결을 확 바꾼 대안(미니멀·어둡게·장르 혼합 등). 셋은 확실히 다르게 들려야 한다.',
    'BPM·키는 정해져 있으니 쓰지 않는다. 실존 아티스트·곡 이름은 쓰지 않는다 (Suno가 거부함).',
    tasteBlock('style'),
    `곡: ${song.title} / 주제: ${song.concept.theme} / 분위기: ${song.concept.moods.join(', ')}`,
    `지금 스타일: ${JSON.stringify({ genre: st.genre, subgenre: st.subgenre, vocals: st.vocals, instruments: st.instruments, production: st.production, extra: st.extra })}`,
    '출력은 JSON 하나만: {"variants":[{"idea":"한국어 한 줄 (어떤 방향인지)","genre":"","subgenre":"","vocals":"","instruments":"","production":"","extra":""}]} — 정확히 3개',
  ].filter(Boolean).join('\n\n');
  return parseVariants(await sample.json(prompt, { signal, cache: false }));
}
