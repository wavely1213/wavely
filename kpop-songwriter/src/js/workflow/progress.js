// 곡 하나의 발매까지 진행 상황: 단계마다 끝났는지 스스로 판단하고, 다음에 할 일을 알려 준다.
import { scoreSong } from '../optimize/lyricscore.js';
import { INSTRUMENTAL_TYPES } from '../constants.js';
import { releaseChecklist } from '../album/model.js';
import { mastersOf, coverOf, songMaster } from '../album/session.js';

export const STEPS = [
  { id: 'concept', name: '컨셉', tab: 'concept' },
  { id: 'lyrics', name: '가사', tab: 'editor' },
  { id: 'arrange', name: '편곡', tab: 'arrange' },
  { id: 'melody', name: '멜로디', tab: 'melody' },
  { id: 'suno', name: 'Suno 생성', tab: 'export' },
  { id: 'master', name: '마스터링', tab: 'master' },
  { id: 'release', name: '발매 준비', tab: null },
];

// 반환: { steps: [{...STEP, done, hint}], next: 첫 번째 안 끝난 단계 | null, album }
export function songProgress(song, { albums = [], songs = [] } = {}) {
  const p = song.progress || {};
  const c = song.concept;
  const album = albums.find((a) => a.tracks.some((t) => t.songId === song.id)) || null;
  const steps = STEPS.map((s) => ({ ...s, done: false, hint: '' }));
  const set = (id, done, hint) => { const s = steps.find((x) => x.id === id); s.done = done; s.hint = hint; };

  set('concept', !!(c.theme.trim() || c.story.trim() || c.keywords.trim()), '주제·스토리·키워드 중 하나를 적어 주세요.');

  const empty = song.sections.filter((s, i) => !INSTRUMENTAL_TYPES.includes(s.type) && !s.text.trim()
    && !song.sections.slice(0, i).some((x) => x.type === s.type && x.text.trim()));
  const score = scoreSong(song).score;
  set('lyrics', !empty.length && score >= 70, empty.length ? `${empty.length}개 섹션이 비어 있어요.` : `가사 점수 ${score}점 — 70점 이상이면 완료로 봐요.`);
  // 연주곡(Inst.) 버전은 가사·가이드 멜로디가 없는 게 맞다
  if (song.instOf) { set('lyrics', true, ''); set('melody', true, ''); }

  set('arrange', !!p.arranged, '편곡 탭에서 코드·악기를 고르거나 AI 편곡을 해 보세요.');
  if (!song.instOf) set('melody', Object.values(song.music.sections).some((sm) => sm.melody.length), '멜로디 탭에서 가이드 멜로디를 만들어 주세요.');
  set('suno', !!p.suno, '내보내기 탭에서 가사·스타일을 복사하거나 제작 패키지를 받아 Suno로 노래를 만들어 주세요.');

  const mastered = !!songMaster(song.id) || !!(album && mastersOf(album.id)[song.id]) || !!p.mastered;
  set('master', mastered, 'Suno 완성곡을 마스터링 탭에 넣어 발매 규격으로 맞춰 주세요.');

  if (!album) set('release', false, '"싱글 발매 준비"를 눌러 앨범 정보·커버·제출 패키지를 준비해요.');
  else {
    const errors = releaseChecklist(album, songs, { masters: mastersOf(album.id), coverInfo: coverOf(album.id) }).filter((i) => i.level === 'error');
    set('release', !errors.length, errors.length ? `발매 전 점검에서 꼭 고칠 것 ${errors.length}개가 남았어요.` : '');
  }
  return { steps, next: steps.find((s) => !s.done) || null, album };
}
