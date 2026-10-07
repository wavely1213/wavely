// 가사 분석: 음절 수, 라임(줄 끝 모음) 키. AI 없이 브라우저에서 계산한다.

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

// 중성 21개 → 라임 비교용 핵심 모음 (ㅐ/ㅔ, ㅚ/ㅙ/ㅞ 등은 실제 발음이 거의 같아 하나로 묶음)
const VOWEL_KEY = [
  'a', 'e', 'a', 'e', 'eo', 'e', 'eo', 'e', 'o', 'a', 'e', 'e',
  'o', 'u', 'eo', 'e', 'i', 'u', 'eu', 'i', 'i',
];

function isHangul(ch) {
  const c = ch.codePointAt(0);
  return c >= HANGUL_START && c <= HANGUL_END;
}

function englishSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

// 한 줄의 음절 수. 괄호 안 애드립은 따로 센다.
export function countSyllables(line) {
  const main = line.replace(/\([^)]*\)/g, ' ');
  let n = 0;
  for (const ch of main) if (isHangul(ch)) n += 1;
  const words = main.match(/[A-Za-z']+/g) || [];
  words.forEach((w) => { n += englishSyllables(w); });
  return n;
}

// 한 줄을 부를 음절 조각으로: 한글은 글자마다, 영어는 음절 수만큼 단어를 나눈다 (예: signal → sig·nal). 괄호 애드립은 뺀다.
export function syllableTokens(line) {
  const main = String(line || '').replace(/\([^)]*\)/g, ' ');
  const out = [];
  for (const m of main.matchAll(/[\uac00-\ud7a3]|[A-Za-z']+/g)) {
    const w = m[0];
    if (isHangul(w)) { out.push(w); continue; }
    const n = englishSyllables(w);
    const size = Math.ceil(w.length / n);
    for (let i = 0; i < n; i++) out.push(w.slice(i * size, (i + 1) * size) || w.slice(-1));
  }
  return out;
}

// 줄 끝 라임 키. 한글은 마지막 음절의 모음 + 받침 유무, 영어는 마지막 단어의 끝 모음군.
export function rhymeKey(line) {
  const main = line.replace(/\([^)]*\)/g, ' ').replace(/[\s.,!?~…"'-]+$/g, '').trim();
  if (!main) return '';
  const chars = [...main];
  const last = chars[chars.length - 1];
  if (isHangul(last)) {
    const code = last.codePointAt(0) - HANGUL_START;
    const jung = Math.floor((code % 588) / 28);
    const jong = code % 28;
    return VOWEL_KEY[jung] + (jong ? 'ㅇ' : '');
  }
  const word = (main.match(/[A-Za-z']+$/) || [''])[0].toLowerCase();
  if (!word) return '';
  const m = word.match(/[aeiouy]+[^aeiouy]*$/);
  return m ? m[0].replace(/e$/, '') || m[0] : word.slice(-2);
}

// 섹션 하나를 줄 단위로 분석. 같은 라임 키가 2번 이상 나오면 같은 그룹 번호를 준다.
export function analyzeSection(text) {
  const lines = text.split('\n');
  const keys = lines.map((l) => (l.trim() ? rhymeKey(l) : ''));
  const counts = {};
  keys.forEach((k) => { if (k) counts[k] = (counts[k] || 0) + 1; });
  const groupOf = {};
  let next = 0;
  return lines.map((line, i) => {
    const k = keys[i];
    let group = -1;
    if (k && counts[k] > 1) {
      if (!(k in groupOf)) groupOf[k] = next++;
      group = groupOf[k] % 4;
    }
    return { line, syllables: line.trim() ? countSyllables(line) : 0, key: k, group };
  });
}

// 한국어:영어 글자 비율 (실제 가사가 컨셉 비율에 맞는지 확인용)
export function languageRatio(text) {
  let ko = 0;
  let en = 0;
  for (const ch of text) {
    if (isHangul(ch)) ko += 1;
    else if (/[A-Za-z]/.test(ch)) en += 0.5; // 영어 2글자 ≈ 한글 1음절
  }
  const total = ko + en;
  return total ? Math.round((ko / total) * 100) : null;
}
