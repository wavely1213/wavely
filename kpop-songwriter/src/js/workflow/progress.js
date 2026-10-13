// 곡 하나의 발매까지 진행 상황: 단계마다 끝났는지 스스로 판단하고, 다음에 할 일을 알려 준다.
import { scoreSong } from '../optimize/lyricscore.js';
import { INSTRUMENTAL_TYPES } from '../constants.js';
import { releaseChecklist } from '../album/model.js';
import { mastersOf, coverOf, songMaster, sessionRev } from '../album/session.js';
import { remakeOf, adaptSummary } from '../remake/model.js';
import { recordingOf } from '../recording/model.js';

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
  const remake = remakeOf(song, songs);
  if (remake) set('concept', !!(remake.original.title.trim() && remake.original.artist.trim()), '컨셉 탭에 원곡 제목·아티스트를 적어 주세요.');

  const empty = song.sections.filter((s, i) => !INSTRUMENTAL_TYPES.includes(s.type) && !s.text.trim()
    && !song.sections.slice(0, i).some((x) => x.type === s.type && x.text.trim()));
  const score = scoreSong(song).score;
  set('lyrics', !empty.length && score >= 70, empty.length ? `${empty.length}개 섹션이 비어 있어요.` : `가사 점수 ${score}점 — 70점 이상이면 완료로 봐요.`);
  // 리메이크·커버는 원곡 가사를 그대로 부르니 점수 대신 빈 섹션만, 번안은 줄마다 원곡 음 수와 맞는지로 본다 (D-026)
  if (remake && !song.instOf && remake.kind !== 'adapt') set('lyrics', !empty.length, empty.length ? `${empty.length}개 섹션이 비어 있어요.` : '');
  if (remake && !song.instOf && remake.kind === 'adapt') {
    const a = adaptSummary(song);
    set('lyrics', a.lines > 0 && !a.missing && !a.unread && !a.off && !a.extra, !a.lines ? '구조·가사 탭에 원곡 가사를 붙여넣어 주세요 (이미 쓴 가사는 그대로 두고 붙일 수 있어요).'
      : a.missing ? `한국어 가사가 빈 줄이 ${a.missing}개예요.` : a.unread ? `읽기(かな)를 적지 않은 한자 줄이 ${a.unread}개예요 (음 수를 셀 수 없음).`
        : a.off ? `원곡 음 수와 크게 다른 줄이 ${a.off}개예요.` : `원곡보다 많은 줄이 ${a.extra}개예요.`);
  }
  // 연주곡(Inst.) 버전은 가사·가이드 멜로디가 없는 게 맞다
  if (song.instOf) { set('lyrics', true, ''); set('melody', true, ''); }

  set('arrange', !!p.arranged, '편곡 탭에서 코드·악기를 고르거나 AI 편곡을 해 보세요.');
  if (!song.instOf) set('melody', Object.values(song.music.sections).some((sm) => sm.melody.length), '멜로디 탭에서 가이드 멜로디를 만들어 주세요.');
  const self = !!recordingOf(song); // 직접 녹음해서 발매 (D-027): Suno는 MR·가이드까지
  set('suno', !!p.suno, self ? '내보내기 탭에서 가사·스타일을 복사해 Suno로 가이드 보컬이 든 곡을 만들고, MR(스템)을 받아 주세요.'
    : '내보내기 탭에서 가사·스타일을 복사하거나 제작 패키지를 받아 Suno로 노래를 만들어 주세요.');

  const mastered = !!songMaster(song.id) || !!(album && mastersOf(album.id)[song.id]) || !!p.mastered;
  set('master', mastered, self ? 'MR에 직접 녹음해 믹스한 WAV를 마스터링 탭에 넣어 발매용으로 맞춰 주세요.' : 'Suno 완성곡을 마스터링 탭에 넣어 발매용 WAV로 맞춰 주세요.');

  if (!album) set('release', false, '"싱글 발매 준비"를 눌러 앨범 정보·커버·제출 패키지를 준비해요.');
  else {
    const errors = releaseChecklist(album, songs, { masters: mastersOf(album.id), coverInfo: coverOf(album.id) }).filter((i) => i.level === 'error');
    set('release', !errors.length, errors.length ? `발매 전 점검에서 꼭 고칠 것 ${errors.length}개가 남았어요.` : '');
  }
  return { steps, next: steps.find((s) => !s.done) || null, album };
}

// 곡 목록에 보일 "끝난 단계 수". 가사 채점·점검표가 들어 있어 곡이 많으면 무거우므로,
// 결과에 영향을 주는 것(이 곡·앨범·같은 앨범 다른 곡의 수정 시각, 마스터·커버 변경 번호, 취향 기록 — 가사 채점 기준)이 같으면 지난 값을 쓴다.
const countCache = new Map();
export function progressCount(song, { albums = [], songs = [], taste = null } = {}) {
  const album = albums.find((a) => a.tracks.some((t) => t.songId === song.id));
  const others = album ? album.tracks.map((t) => songs.find((x) => x.id === t.songId)?.updatedAt || 0).join(',') : '';
  const log = taste?.log || [];
  // Inst. 사본의 컨셉 단계는 원곡 곡의 리메이크 기록을 본다 (같은 앨범이 아니어도)
  const src = song.instOf ? songs.find((x) => x.id === song.instOf)?.updatedAt || 0 : '';
  const key = [song.updatedAt, album?.id, album?.updatedAt, others, src, sessionRev(), log.length, log[log.length - 1]?.id].join('|');
  const hit = countCache.get(song.id);
  if (hit?.key === key) return hit.done;
  const done = songProgress(song, { albums, songs }).steps.filter((s) => s.done).length;
  countCache.set(song.id, { key, done });
  return done;
}
