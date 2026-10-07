// 가사 자동 채점 (AI 없이). 섹션마다 0~100점과 고칠 점을 낸다. 자동 개선 루프의 기준이 된다.
import { analyzeSection, languageRatio } from '../lyrictools.js';
import { syllableShare, sectionLabels } from '../structure.js';
import { DEFAULT_SYLLABLES, FALLBACK_SYLLABLES, cachedRanges } from './calibrate.js';
import { currentTaste } from '../learn/context.js';

// 지금 쓰는 줄 길이 범위: 내 취향 기록으로 보정한 것이 있으면 그것, 없으면 기본값
export function rangeFor(type, ranges = cachedRanges(currentTaste())) {
  const own = ranges[type];
  return own ? { range: own.range, personal: true } : { range: DEFAULT_SYLLABLES[type] || FALLBACK_SYLLABLES, personal: false };
}

const SKIP = ['Intro', 'Outro', 'Dance Break'];

function words(line) {
  return line.replace(/\([^)]*\)/g, ' ').toLowerCase().split(/[\s,.!?~…"']+/).filter(Boolean);
}

// 섹션 안에서 2~4단어 묶음이 두 번 이상 나오면 훅 반복이 있다고 본다
function repeatedPhrase(lines) {
  const counts = {};
  lines.forEach((l) => {
    const w = words(l);
    for (let n = 2; n <= 4; n++) {
      for (let i = 0; i + n <= w.length; i++) {
        const k = w.slice(i, i + n).join(' ');
        counts[k] = (counts[k] || 0) + 1;
      }
    }
  });
  const best = Object.entries(counts).filter(([, c]) => c >= 2).sort((a, b) => b[0].length - a[0].length)[0];
  return best ? best[0] : '';
}

// ranges: 보정한 줄 길이 범위 (calibrate.js syllableRanges). 생략하면 지금 취향 기록으로 계산
export function scoreSection(section, ranges) {
  if (SKIP.includes(section.type)) return null;
  const rows = analyzeSection(section.text).filter((r) => r.line.trim());
  if (!rows.length) return { score: 0, tips: ['가사가 비어 있어요.'], parts: {} };
  const tips = [];
  const isRap = section.type === 'Rap';
  const isHook = ['Chorus', 'Hook', 'Post-Chorus'].includes(section.type);

  // 1) 라임: 줄 끝 모음이 다른 줄과 맞는 비율
  const rhymed = rows.filter((r) => r.group >= 0).length / rows.length;
  const rhymeGoal = isRap ? 0.75 : 0.5;
  const rhyme = Math.min(1, rhymed / rhymeGoal);
  if (rhyme < 0.8) tips.push(`라임이 약해요: 줄 끝 모음이 맞는 줄이 ${rows.filter((r) => r.group >= 0).length}/${rows.length}줄이에요. 줄 끝 모음을 맞춰 보세요.`);

  // 2) 음절: 권장 범위 + 줄 사이 균형
  const { range: [lo, hi], personal } = rangeFor(section.type, ranges);
  const syl = rows.map((r) => r.syllables);
  const inRange = syl.filter((n) => n >= lo && n <= hi).length / syl.length;
  const mean = syl.reduce((a, b) => a + b, 0) / syl.length;
  const cv = mean ? Math.sqrt(syl.reduce((a, b) => a + (b - mean) ** 2, 0) / syl.length) / mean : 0;
  const balance = Math.max(0, 1 - Math.max(0, cv - 0.15) * 2.5);
  const syllable = 0.5 * inRange + 0.5 * balance;
  if (inRange < 0.75) tips.push(`줄 길이: ${section.type}는 한 줄 ${lo}~${hi}음절이 부르기 좋아요${personal ? ' (내 취향 기준)' : ''} (지금 ${syl.join('/')}).`);
  else if (balance < 0.7) tips.push(`줄마다 길이 차이가 커요 (${syl.join('/')}). 비슷하게 맞추면 멜로디가 반복되기 쉬워요.`);

  // 3) 훅 반복 (코러스류만)
  let hook = 1;
  if (isHook) {
    const phrase = repeatedPhrase(rows.map((r) => r.line));
    hook = phrase ? 1 : 0.3;
    if (!phrase) tips.push('코러스에 반복되는 훅 문구가 없어요. 짧은 문구를 두 번 이상 반복해 보세요.');
  }

  // 5) 분량: 섹션 종류에 비해 너무 짧거나 김
  const want = isHook ? [2, 8] : isRap ? [4, 16] : [2, 8];
  const amount = rows.length < want[0] || rows.length > want[1] ? 0.5 : 1;
  if (amount < 1) tips.push(`${rows.length}줄이에요. ${section.type}는 보통 ${want[0]}~${want[1]}줄이에요.`);

  const w = isHook ? { rhyme: 0.3, syllable: 0.3, hook: 0.3, amount: 0.1 } : { rhyme: 0.45, syllable: 0.4, hook: 0, amount: 0.15 };
  const score = Math.round(100 * (w.rhyme * rhyme + w.syllable * syllable + w.hook * hook + w.amount * amount));
  return { score, tips, parts: { rhyme, syllable, hook, amount } };
}

// 곡 전체: 섹션 점수 평균(빈 반복 코러스 제외) + 곡 단위 점검
export function scoreSong(song, ranges) {
  const labels = sectionLabels(song.sections);
  const sections = song.sections.map((s, i) => {
    // 비워 둔 반복 섹션은 앞의 같은 섹션 가사를 쓰므로 채점하지 않는다
    const repeat = !s.text.trim() && song.sections.slice(0, i).some((p) => p.type === s.type && p.text.trim());
    return { id: s.id, label: labels[i], result: repeat ? null : scoreSection(s, ranges) };
  });
  const scored = sections.filter((s) => s.result);
  const avg = scored.length ? Math.round(scored.reduce((a, s) => a + s.result.score, 0) / scored.length) : 0;
  const tips = [];
  // 한/영 비율은 곡 전체로 본다 (벌스는 한국어만, 코러스는 영어가 많은 게 보통)
  const ko = languageRatio(song.sections.map((s) => s.text).join('\n'));
  if (ko != null && Math.abs(ko - song.concept.koRatio) > 20) tips.push(`곡 전체 한국어 비율이 ${ko}%예요 (컨셉 목표 ${song.concept.koRatio}%).`);
  const chorus = song.sections.find((s) => s.type === 'Chorus' && s.text.trim());
  if (!chorus) tips.push('코러스 가사가 없어요.');
  const title = song.title.replace(/^예시:\s*/, '').replace(/\(.*\)/, '').trim().toLowerCase();
  const titleWords = title.split(/\s+/).filter((w) => w.length > 1);
  if (chorus && titleWords.length && !titleWords.some((w) => chorus.text.toLowerCase().includes(w))) tips.push('곡 제목의 단어가 코러스에 없어요. 제목과 훅을 맞추면 기억되기 쉬워요.');
  if (song.members.length > 1) {
    const share = Object.values(syllableShare(song.sections, song.members)); // 화면의 파트 분배 막대와 같은 기준
    const total = share.reduce((a, b) => a + b, 0);
    if (total) {
      const max = Math.max(...share) / total;
      const min = Math.min(...share) / total;
      if (max - min > 0.35) tips.push('파트 분배 차이가 커요. 구조·가사의 "파트 분배" 막대를 확인해 보세요.');
    }
  }
  return { score: avg, sections, tips };
}

// 다시 쓰기 요청 문장 (자동 개선에 사용)
export function rewriteRequest(result) {
  return `아래 문제를 고쳐서 다시 써라. 내용과 분위기는 유지: ${result.tips.join(' ')}`;
}
