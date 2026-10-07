// 앨범 발매 진행 단계: 점검표(꼭 고칠 것)를 탭별로 나눠 단계로 보여 주고, 다음에 할 일 하나를 고른다.
import { releaseChecklist, daysUntil } from '../album/model.js';

// masters·coverInfo는 album/session.js에서 (화면 메모리)
export function albumProgress(album, songs, { masters = {}, coverInfo = null, today = new Date() } = {}) {
  const items = releaseChecklist(album, songs, { masters, coverInfo, today });
  const errorsIn = (tabs) => items.filter((i) => i.level === 'error' && tabs.includes(i.go?.song ? 'tracks' : i.go?.tab)).length;
  const left = daysUntil(album.releaseDate, today);
  const allClear = !items.some((i) => i.level === 'error');
  const steps = [
    { id: 'tracks', tab: 'tracks', name: '수록곡·마스터', done: album.tracks.length > 0 && !errorsIn(['tracks']), hint: '곡을 넣고 곡마다 발매용 마스터 WAV를 연결해요.' },
    { id: 'meta', tab: 'meta', name: '정보·크레딧', done: !errorsIn(['meta']), hint: '앨범 제목·아티스트·작사·작곡 크레딧을 채워요.' },
    { id: 'cover', tab: 'cover', name: '커버', done: !errorsIn(['cover']), hint: '3000×3000 커버를 만들거나 넣어요.' },
    { id: 'schedule', tab: 'schedule', name: '발매일', done: !errorsIn(['schedule']), hint: '발매 예정일을 정하면 할 일 일정이 나와요.' },
    { id: 'check', tab: 'submit', name: '점검 통과', done: allClear, hint: '제출 탭의 꼭 고칠 것을 모두 해결해요.' },
    { id: 'package', tab: 'submit', name: '제출 패키지', done: allClear && album.submittedAt > 0, hint: '제출 패키지를 받아 유통사에 올려요.' },
    { id: 'after', tab: 'stats', name: '발매 후 기록', done: (album.stats || []).length > 0, hint: left != null && left > 0 ? `발매 뒤(D-${left})에 곡별 재생 수를 적어 반응을 봐요.` : '곡별 재생 수를 적어 반응 좋은 곡을 다음 곡에 반영해요.' },
  ];
  const next = steps.find((s) => !s.done) || null;
  return { steps, next, errors: items.filter((i) => i.level === 'error').length };
}
