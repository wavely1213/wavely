// 반복 섹션 멜로디: 같은 종류에 같은 가사를 부르는 섹션(비워 둔 반복은 앞 섹션 가사를 다시 부름)은
// 첫 섹션 멜로디를 그대로 쓴다. 그래야 데모 WAV·MIDI의 코러스 반복 자리가 비지 않고, 훅이 매번 달라지지 않는다.
import { sungText } from '../structure.js';
import { sectionRange, foldIntoRange } from './range.js';
import { melodyText } from './melodytext.js';

const norm = (t) => t.split('\n').map((l) => l.trim()).filter(Boolean).join('\n');

// 같은 멜로디를 쓸 섹션끼리 같은 열쇠 (부를 가사가 없으면 '')
export function sungKey(sections, i) {
  const t = norm(sungText(sections, i));
  return t ? `${sections[i].type}\n${t}` : '';
}

// targets: AI에 맡길 섹션(같은 열쇠의 첫 섹션), copies: 그 멜로디를 받아 쓸 반복 섹션
export function melodyPlan(sections) {
  const first = {};
  const targets = [];
  const copies = [];
  sections.forEach((s, i) => {
    const k = sungKey(sections, i);
    if (!k) return;
    if (first[k] == null) {
      first[k] = s.id;
      targets.push(s.id);
    } else {
      copies.push({ from: first[k], to: s.id, emptyText: !s.text.trim() });
    }
  });
  return { targets, copies };
}

// 음표 복사본을 bars 마디 안으로 자른다
export function copyMelody(notes, bars) {
  const max = bars * 16;
  return notes.filter((n) => n.s < max).map((n) => ({ ...n, l: Math.min(n.l, max - n.s) }));
}

// 이 섹션(i번째)이 멜로디를 받아 올 앞 섹션의 번호 (같은 열쇠, 멜로디 있음). 없으면 -1
export function repeatSource(song, i) {
  const k = sungKey(song.sections, i);
  if (!k) return -1;
  return song.sections.findIndex((p, j) => j < i && song.music.sections[p.id]?.melody.length && sungKey(song.sections, j) === k);
}

// 받아 올 멜로디를 이 섹션 마디 수로 자르고, 부를 멤버 음역 안으로 옥타브를 옮긴다 (AI 멜로디와 같은 규칙)
export function fitCopy(song, section, notes) {
  const out = copyMelody(notes, song.music.sections[section.id].bars);
  const range = sectionRange(song, section);
  return range && !range.conflict ? foldIntoRange(out, song.music.root, song.music.mode, range) : out;
}

// 옮겨 넣고, 손대지 않은 복사본인지 나중에 알아보게 표기를 남긴다
export function putCopy(song, section, notes) {
  const sm = song.music.sections[section.id];
  sm.melody = fitCopy(song, section, notes);
  sm.copied = melodyText(sm.melody);
}

// AI가 doneIds 멜로디를 만든 뒤 반복 섹션에 옮긴다 (mutate 안에서). 가사를 따로 적은 반복은 '전부'가 원래 덮던 자리라 늘 덮고,
// 비워 둔 반복은 멜로디가 없거나 손대지 않은 예전 복사본일 때만 (손으로 찍거나 고친 음표는 말없이 지우지 않음). 옮긴 섹션 id를 돌려준다.
export function applyCopies(song, plan, doneIds) {
  const copied = [];
  plan.copies.filter((c) => doneIds.includes(c.from)).forEach((c) => {
    const from = song.music.sections[c.from];
    const sm = song.music.sections[c.to];
    const to = song.sections.find((s) => s.id === c.to);
    if (!from?.melody.length || !sm || !to) return;
    if (c.emptyText && sm.melody.length && melodyText(sm.melody) !== sm.copied) return;
    putCopy(song, to, from.melody);
    copied.push(c.to);
  });
  return copied;
}
