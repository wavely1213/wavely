// Claude에게 편곡·멜로디를 맡기는 호출. 결과는 앱이 쓰는 형식으로 검사해서만 반영한다.
import { getSample } from './ai.js';
import { sectionLabels, sungText } from './structure.js';
import { chordName, keyName, NOTE_NAMES, isChord, isDiatonic, parseChord, chordPitchClasses, degreeToMidi } from './music/theory.js';
import { ARRANGE_INSTRUMENTS } from './music/instruments.js';
import { DRUM_PATTERNS, BASS_PATTERNS } from './music/patterns.js';
import { describeAnalysis } from './music/analyze.js';
import { countSyllables } from './lyrictools.js';
import { tasteBlock } from './learn/context.js';
import { sectionRange, degreeRange, foldIntoRange, midiName } from './music/range.js';
import { MELODY_TEXT_NOTE } from './music/melodytext.js';
import { GROUP_TYPES } from './constants.js';
import { ARRANGE_RULES, GENRE_CHORDS, MELODY_RULES, presetBrief } from './ai-rules.js';
import { defaultSectionMusic } from './music/arrangement.js';
import { songGenre } from './music/genres.js';

function referenceBrief(song) {
  return song.references.filter((r) => r.use).map((r) => {
    const out = { 이름: r.name, 좋은점: r.likes.join(', '), 메모: r.note };
    if (r.analysis) {
      const d = describeAnalysis(r.analysis);
      Object.assign(out, { BPM: r.analysis.bpm, 키: d.key, 저음: d.bass, 밝기: d.bright, 에너지급상승: d.drops });
    }
    return out;
  });
}

function conceptBrief(song) {
  const c = song.concept;
  return {
    제목: song.title, 그룹: GROUP_TYPES[c.group] || c.group, 장르: song.style?.genre ? `${[song.style.genre, song.style.subgenre].filter(Boolean).join(', ')} (스타일 탭 값. 컨셉·분위기와 맞지 않으면 컨셉을 따른다)` : '',
    주제: c.theme, 스토리: c.story, 분위기: c.moods.join(', '), 키워드: c.keywords,
  };
}

function parseRoot(v, fallback) {
  const mt = String(v ?? '').trim().match(/^([A-Ga-g])([#b♯♭]?)/);
  if (!mt) return fallback;
  const base = NOTE_NAMES.indexOf(mt[1].toUpperCase());
  const acc = mt[2] === '#' || mt[2] === '♯' ? 1 : mt[2] ? -1 : 0;
  return (base + acc + 12) % 12;
}

// 피아노롤에 보이는 범위(-3~10) 밖이면 옥타브(7)씩 옮겨 넣는다
function foldRange(d) {
  let x = d;
  while (x > 10) x -= 7;
  while (x < -3) x += 7;
  return x;
}

const int = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

export async function arrangeSong(song, { targetIds, request, signal }) {
  const sample = await getSample();
  if (!sample) throw { code: 'not_granted' };
  const labels = sectionLabels(song.sections);
  const m = song.music;
  const ids = targetIds?.length ? targetIds : song.sections.map((s) => s.id);
  const whole = !targetIds?.length;
  const prompt = [
    '너는 K-pop 프로듀서다. 아래 곡을 편곡한다. 정해진 선택지 안에서만 고른다.',
    `악기 id: ${ARRANGE_INSTRUMENTS.map((i) => `${i.id}(${i.name})`).join(', ')}`,
    `드럼 id: none(드럼 없음), ${Object.entries(DRUM_PATTERNS).map(([k, v]) => `${k}(${v.name})`).join(', ')}`,
    `베이스 id: ${Object.entries(BASS_PATTERNS).map(([k, v]) => `${k}(${v.name})`).join(', ')}`,
    "chords는 마디마다 하나(마디 수보다 짧으면 반복). 음계 안 화음은 스케일 도수 숫자 1~7. 음계 밖 화음은 글자로: '4m'(그 도수의 단3화음, 장조의 iv), '5M'(그 도수의 장3화음, 단조의 V·IV·I), '3d7'(그 도수의 도미넌트7, III7·VI7·II7·단조의 V7), 'b7M'(반음 내린 도수의 장3화음, 장조의 ♭VII·♭VI, 단조의 ♭II). 음계 밖 화음은 아래 장르별 진행과 프리셋에 있는 것만 쓴다." +
    ' energy는 1(조용)~5(폭발). bars는 2~16, 4의 배수 권장.',
    ARRANGE_RULES,
    GENRE_CHORDS,
    presetBrief(),
    `곡 컨셉: ${JSON.stringify(conceptBrief(song))}`,
    `현재 설정: BPM ${m.bpm}, 키 ${keyName(m.root, m.mode)}`,
    `레퍼런스(반영할 것): ${JSON.stringify(referenceBrief(song))}`,
    tasteBlock('arrange'),
    request ? `작곡가 요청: ${request}` : '',
    `섹션: ${JSON.stringify(song.sections.map((s, i) => ({ id: s.id, 이름: labels[i], 가사줄수: s.text.split('\n').filter((l) => l.trim()).length, 현재: m.sections[s.id] })))}`,
    `편곡할 섹션 id: ${JSON.stringify(ids)}${whole ? ' (곡 전체이므로 bpm·root·mode도 정한다)' : ' (bpm·root·mode는 바꾸지 말고 생략)'}`,
    `출력은 JSON 하나만: {${whole ? '"bpm":120,"root":"C# 처럼 음이름","mode":"major|minor",' : ''}"summary":"한국어 한두 문장","sections":[{"id":"","bars":8,"chords":[4,5,3,6],"seventh":false,"energy":3,"instruments":["drums"],"drum":"pop","bass":"sync"}]}`,
  ].filter(Boolean).join('\n\n');
  const res = await sample.json(prompt, { signal, cache: false });
  const instIds = ARRANGE_INSTRUMENTS.map((i) => i.id);
  // 모르는 드럼·베이스 id는 곡 장르의 섹션 기본값으로 (예전엔 서양 팝 비트 'pop')
  const genre = songGenre(song);
  const mode = whole ? (res?.mode === 'minor' ? 'minor' : 'major') : m.mode;
  const fallback = (id) => defaultSectionMusic(song.sections.find((s) => s.id === id)?.type, mode, genre);
  // AI가 드럼 악기를 넣었는데 기본값이 '드럼 없음'이면 그 장르의 후렴 드럼으로 (드럼 칩만 켜지고 소리가 안 나지 않게)
  const fallbackDrum = (x) => {
    const d = fallback(String(x.id)).drum;
    return d === 'none' && Array.isArray(x.instruments) && x.instruments.includes('drums') ? defaultSectionMusic('Chorus', mode, genre).drum : d;
  };
  const sections = (Array.isArray(res?.sections) ? res.sections : [])
    .filter((x) => ids.includes(String(x.id)))
    .map((x) => ({
      id: String(x.id),
      bars: int(x.bars, 1, 16, 4),
      // 음계 안 화음은 숫자 1~7, 음계 밖 화음은 정해진 글자('4m'·'5M'·'3d7'·'b7M')만 받는다
      chords: (Array.isArray(x.chords) ? x.chords : []).map((d) => (typeof d === 'string' && isChord(d.trim()) ? d.trim() : int(d, 1, 7, 1))).slice(0, 16),
      seventh: !!x.seventh,
      energy: int(x.energy, 1, 5, 3),
      instruments: (Array.isArray(x.instruments) ? x.instruments : []).map(String).filter((i) => instIds.includes(i)),
      drum: x.drum === 'none' || DRUM_PATTERNS[x.drum] ? String(x.drum) : fallbackDrum(x),
      bass: BASS_PATTERNS[x.bass] ? String(x.bass) : fallback(String(x.id)).bass,
    }))
    .filter((x) => x.chords.length);
  if (!sections.length) throw { code: 'invalid_json' };
  const out = { sections, summary: String(res.summary || '') };
  if (whole) {
    out.bpm = int(res.bpm, 60, 200, m.bpm);
    out.root = parseRoot(res.root, m.root);
    out.mode = res.mode === 'minor' ? 'minor' : 'major';
  }
  return out;
}

// 멜로디 음표: {s: 섹션 안 시작 칸(16분), l: 길이 칸, d: 스케일 인덱스(0=으뜸음 C4 근처), syl: 가사 음절}
export async function writeMelody(song, { targetIds, request, signal }) {
  const sample = await getSample();
  if (!sample) throw { code: 'not_granted' };
  const labels = sectionLabels(song.sections);
  const m = song.music;
  const targets = song.sections.filter((s) => targetIds.includes(s.id));
  const info = targets.map((s) => {
    const sm = m.sections[s.id];
    const i = song.sections.indexOf(s);
    return {
      id: s.id,
      이름: labels[i],
      부르는멤버: s.members.map((id) => song.members.find((x) => x.id === id)).filter(Boolean).map((x) => `${x.name}(${x.position || '포지션 없음'})`).join(', ') || '없음',
      마디수: sm.bars,
      총칸수: sm.bars * 16,
      마디별코드: Array.from({ length: sm.bars }, (_, b) => {
        const c = sm.chords[b % sm.chords.length];
        if (isDiatonic(c)) {
          const d = parseChord(c).d;
          return `${b + 1}마디 ${chordName(m.root, m.mode, c, sm.seventh)} (도수${d}, 코드톤 인덱스 ${[d - 1, d + 1, d + 3].join('/')})`;
        }
        // 음계 밖 화음: 음계에 있는 구성음의 인덱스만 (멜로디는 음계 안 음만 쓴다)
        const pcs = chordPitchClasses(m.root, m.mode, c);
        const idx = [0, 1, 2, 3, 4, 5, 6].filter((i) => pcs.includes(((degreeToMidi(m.root, m.mode, i) % 12) + 12) % 12));
        return `${b + 1}마디 ${chordName(m.root, m.mode, c, sm.seventh)} (음계 밖 화음, 어울리는 음 인덱스 ${idx.join('/') || '없음'}, 옥타브마다 ±7)`;
      }),
      // 비워 둔 반복 섹션은 앞 섹션 가사를 다시 부른다 (허밍이 아니라)
      가사줄: sungText(song.sections, i).split('\n').map((l) => l.trim()).filter(Boolean).map((l) => ({ 가사: l, 음절수: countSyllables(l) })),
      음역: (() => {
        const r = sectionRange(song, s);
        const dr = r && degreeRange(m.root, m.mode, r);
        return dr ? `d ${Math.max(-3, dr.lo)}~${Math.min(10, dr.hi)} (${midiName(r.low)}~${midiName(r.high)}, ${r.names.join('·')}이 부름)` : '제한 없음';
      })(),
    };
  });
  const prompt = [
    '너는 K-pop 탑라이너(멜로디 작곡가)다. 아래 섹션의 보컬 멜로디를 만든다.',
    `키 ${keyName(m.root, m.mode)}, BPM ${m.bpm}, 4/4박자, 한 마디 = 16칸(16분음표).`,
    '음높이 d는 스케일 인덱스다: 0=으뜸음, 1=2음, … 7=한 옥타브 위 으뜸음, 음수는 아래. 범위 -3~10.',
    '각 섹션의 "음역" 범위를 벗어나는 d를 쓰지 않는다 (부를 멤버의 음역).',
    '규칙: 가사 한 음절당 음표 하나(영어는 음절 단위), 음표에 그 음절을 syl로 붙인다. (괄호) 애드립도 음절로 처리. 음표끼리 겹치지 않는다. s+l은 총칸수를 넘지 않는다.',
    '강박(마디의 0, 4, 8, 12칸)에는 코드톤을 우선 쓴다. 줄 끝 음은 길게(4칸 이상) 끌어 숨 쉴 자리를 둔다. 줄은 대략 1~2마디씩 차지한다.',
    MELODY_RULES,
    '가사가 없는 섹션이면 "우-", "오-" 같은 허밍 멜로디를 짧게 만든다. 실존 곡 멜로디를 베끼지 않는다.',
    tasteBlock('melody') ? `${MELODY_TEXT_NOTE}\n${tasteBlock('melody')}` : '',
    request ? `작곡가 요청: ${request}` : '',
    `곡 분위기: ${JSON.stringify(conceptBrief(song))}`,
    `섹션: ${JSON.stringify(info)}`,
    '출력은 JSON 하나만: {"sections":[{"id":"","notes":[{"s":0,"l":2,"d":4,"syl":"불"}]}]}',
  ].filter(Boolean).join('\n\n');
  const res = await sample.json(prompt, { signal, cache: false });
  const out = (Array.isArray(res?.sections) ? res.sections : [])
    .filter((x) => targetIds.includes(String(x.id)) && Array.isArray(x.notes))
    .map((x) => {
      const max = m.sections[String(x.id)].bars * 16;
      const notes = x.notes
        .map((n) => ({ s: int(n.s, 0, max - 1, -1), l: int(n.l, 1, 32, 2), d: foldRange(int(n.d, -14, 21, 0)), syl: String(n.syl ?? '').slice(0, 8) }))
        .filter((n) => n.s >= 0)
        .sort((a, b) => a.s - b.s);
      notes.forEach((n, i) => {
        const next = notes[i + 1];
        if (next && n.s + n.l > next.s) n.l = Math.max(1, next.s - n.s);
        if (n.s + n.l > max) n.l = max - n.s;
      });
      const sec = song.sections.find((y) => y.id === String(x.id));
      const range = sec ? sectionRange(song, sec) : null;
      const clean = notes.filter((n, i) => !i || n.s !== notes[i - 1].s);
      // AI가 음역을 넘겨도 옥타브를 옮겨 부를 수 있게 만든다
      return { id: String(x.id), notes: range && !range.conflict ? foldIntoRange(clean, m.root, m.mode, range) : clean };
    });
  if (!out.length) throw { code: 'invalid_json' };
  return out;
}
