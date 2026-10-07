// 원클릭 초안: 컨셉만 있으면 가사 → 편곡 → 멜로디 → Suno 스타일을 차례로 AI가 채운다.
// 단계마다 결과를 그 곡에 바로 넣어서, 중간에 멈춰도 거기까지는 남는다.
import { writeLyrics, suggestStyle } from '../ai.js';
import { arrangeSong, writeMelody } from '../ai-music.js';
import { mutateSong, getState } from '../state.js';
import { INSTRUMENTAL_TYPES } from '../constants.js';
import { keyName } from '../music/theory.js';

const songById = (id) => getState().songs.find((s) => s.id === id);

// onStep(문구), 반환: 단계별 결과 요약
export async function makeDraft(songId, { signal, onStep = () => {} }) {
  const done = [];
  // 1) 가사: 비어 있는 섹션만 (이미 쓴 가사는 건드리지 않음)
  let song = songById(songId);
  const empty = song.sections.filter((s) => !s.text.trim() && !INSTRUMENTAL_TYPES.includes(s.type)
    && !song.sections.some((p) => p !== s && p.type === s.type && p.text.trim() && song.sections.indexOf(p) < song.sections.indexOf(s)));
  if (empty.length) {
    onStep('1/4 가사 쓰는 중');
    const out = await writeLyrics(song, { targetIds: empty.map((s) => s.id), signal });
    mutateSong(songId, (x) => out.forEach(({ id, text }) => { const sec = x.sections.find((y) => y.id === id); if (sec) sec.text = text; }));
    done.push(`가사 ${out.length}개 섹션`);
  }
  if (signal?.aborted) return done;

  // 2) 편곡: 곡 전체 (빠르기·키 포함)
  onStep('2/4 편곡하는 중');
  song = songById(songId);
  const arr = await arrangeSong(song, { signal });
  mutateSong(songId, (x) => {
    if (arr.bpm) x.music.bpm = arr.bpm;
    if (arr.root != null) x.music.root = arr.root;
    if (arr.mode) x.music.mode = arr.mode;
    arr.sections.forEach((r) => {
      const sm = x.music.sections[r.id];
      if (sm) Object.assign(sm, { bars: r.bars, chords: r.chords, seventh: r.seventh, energy: r.energy, instruments: r.instruments, drum: r.drum, bass: r.bass, drumGrid: null });
    });
    x.progress = { ...(x.progress || {}), arranged: true };
  });
  done.push('편곡');
  if (signal?.aborted) return done;

  // 3) 멜로디: 가사 있는 섹션, 3개씩 (한 번에 많이 요청하면 잘림)
  song = songById(songId);
  const withLyrics = song.sections.filter((s) => s.text.trim()).map((s) => s.id);
  for (let i = 0; i < withLyrics.length; i += 3) {
    if (signal?.aborted) return done;
    onStep(`3/4 멜로디 만드는 중 (${Math.min(i + 3, withLyrics.length)}/${withLyrics.length})`);
    const mel = await writeMelody(songById(songId), { targetIds: withLyrics.slice(i, i + 3), signal });
    mutateSong(songId, (x) => mel.forEach(({ id, notes }) => { if (x.music.sections[id]) x.music.sections[id].melody = notes; }));
  }
  if (withLyrics.length) done.push(`멜로디 ${withLyrics.length}개 섹션`);
  if (signal?.aborted) return done;

  // 4) Suno 스타일 (편곡에서 정한 빠르기·키를 그대로)
  onStep('4/4 Suno 스타일 정하는 중');
  song = songById(songId);
  const st = await suggestStyle(song, { signal });
  mutateSong(songId, (x) => {
    ['genre', 'subgenre', 'vocals', 'instruments', 'production', 'extra', 'exclude'].forEach((k) => {
      if (typeof st[k] === 'string' && st[k].trim()) x.style[k] = st[k].trim();
    });
    x.style.bpm = x.music.bpm;
    x.style.key = keyName(x.music.root, x.music.mode);
  });
  done.push('Suno 스타일');
  return done;
}
