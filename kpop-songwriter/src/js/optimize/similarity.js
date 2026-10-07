// 유사 표현 점검: 상업 발매 전에, 널리 알려진 곡의 가사·훅과 눈에 띄게 비슷한 줄을 AI가 짚는다.
// AI 기억에 기댄 참고용이다 (놓치거나 잘못 짚을 수 있음). 결과는 곡에 저장: song.similarity
//   = { key, at, summary, items: [{ id, line, like, why, level: 'high'|'check', fix, ok(괜찮다고 표시) }] }
import { getSample } from '../ai.js';
import { lyricLines, lyricsKey } from '../album/lyrics.js';
import { uid } from '../dom.js';

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

// 'none' 안 함 | 'stale' 점검 뒤 가사가 바뀜 | 'flagged' 확인할 줄 남음 | 'clear' 걸린 줄 없음(또는 모두 괜찮다고 표시)
export function similarityStatus(song) {
  const r = song.similarity;
  if (!r) return 'none';
  if (r.key !== lyricsKey(song)) return 'stale';
  return r.items.some((i) => !i.ok) ? 'flagged' : 'clear';
}

// AI 답을 검사해서 지금 가사에 실제로 있는 줄만 남긴다
export function parseSimilarity(res, song) {
  const lines = lyricLines(song);
  const byNorm = new Map(lines.map((l) => [norm(l), l]));
  const seen = new Set();
  const items = (Array.isArray(res?.items) ? res.items : []).map((x) => {
    const line = byNorm.get(norm(x?.line)) || lines.find((l) => norm(x?.line).length > 3 && norm(l).includes(norm(x.line)));
    if (!line || seen.has(line)) return null;
    seen.add(line);
    return {
      id: uid(),
      line,
      like: String(x.like ?? '').slice(0, 80),
      why: String(x.why ?? '').slice(0, 200),
      level: x.level === 'high' ? 'high' : 'check',
      fix: String(x.fix ?? '').split('\n')[0].slice(0, 120),
      ok: false,
    };
  }).filter(Boolean).slice(0, 12);
  return { key: lyricsKey(song), at: Date.now(), summary: String(res?.summary ?? '').slice(0, 300), items };
}

export async function checkSimilarity(song, { signal }) {
  const sample = await getSample();
  if (!sample) throw { code: 'not_granted' };
  const lines = lyricLines(song);
  if (!lines.length) throw { code: 'empty_completion' };
  const prompt = [
    '너는 음악 저작권 검토를 돕는 K-pop A&R이다. 아래 가사를 발매 전에 점검한다.',
    '널리 알려진 곡(국내외 K-pop·팝)의 가사나 훅과 눈에 띄게 비슷한 줄(같은 문장, 특징적인 훅 구절, 독특한 표현의 조합)을 찾아라.',
    '흔한 표현("사랑해", "baby", "oh yeah", "I need you" 같은 관용구 한 마디)은 짚지 않는다. 확신이 없으면 level을 "check"로, 거의 같은 문장이면 "high"로.',
    '원곡 가사를 길게 인용하지 않는다 (곡명·아티스트와 이유만). 각 항목에 같은 뜻으로 바꿀 수 있는 새 줄(fix)을 하나 제안한다. 없으면 items는 빈 배열.',
    `곡 제목: ${song.title}`,
    `가사 (줄마다):\n${lines.map((l) => `- ${l}`).join('\n')}`,
    '출력은 JSON 하나만: {"summary":"한국어 한두 문장","items":[{"line":"가사의 그 줄 그대로","like":"비슷한 곡명 - 아티스트","why":"무엇이 비슷한지 짧게","level":"high|check","fix":"바꿀 줄"}]}',
  ].join('\n\n');
  const res = await sample.json(prompt, { signal, cache: false });
  if (!res || typeof res !== 'object') throw { code: 'invalid_json' };
  return parseSimilarity(res, song);
}

// 섹션 가사에서 그 줄을 새 줄로 바꾼다 (처음 나오는 섹션들 전부, 줄 단위로 정확히 같은 것만)
export function replaceLine(song, line, next) {
  let n = 0;
  song.sections.forEach((s) => {
    const rows = s.text.split('\n');
    const out = rows.map((r) => (r.trim() === line ? (n++, r.replace(line, next)) : r));
    if (out.some((r, i) => r !== rows[i])) s.text = out.join('\n');
  });
  return n;
}
