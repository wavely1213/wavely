// 앨범 발매 진행 단계: 점검표(꼭 고칠 것)를 탭별로 나눠 단계로 보여 주고, 다음에 할 일 하나를 고른다.
import { releaseChecklist, daysUntil } from '../album/model.js';

// 제출 패키지에 들어가는 것의 지문: 받은 뒤 이게 바뀌면 다시 받아야 한다
export function packageKey(album, { masters = {}, coverInfo = null } = {}) {
  return JSON.stringify([
    album.title, album.artist, album.releaseDate, album.type, album.cLine, album.pLine, album.upc,
    album.tracks.map((t) => [t.songId, t.isTitle, t.isrc, t.lyricists, t.composers, t.arrangers, t.featuring, t.explicit, t.splits || {}, masters[t.songId] ? [masters[t.songId].name, Math.round(masters[t.songId].duration || 0)] : null]),
    coverInfo ? [coverInfo.width, coverInfo.height, coverInfo.name || '', coverInfo.drawnWith || null] : null,
  ]);
}

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
    { id: 'package', tab: 'submit', name: '제출 패키지', done: allClear && album.submittedAt > 0 && album.submittedKey === packageKey(album, { masters, coverInfo }),
      hint: album.submittedAt > 0 ? '패키지를 받은 뒤 바뀐 것이 있어요. 다시 받아 유통사에 올려요.' : '제출 패키지를 받아 유통사에 올려요.' },
    { id: 'after', tab: 'stats', name: '발매 후 기록', done: (album.stats || []).length > 0, hint: left != null && left > 0 ? `발매 뒤(D-${left})에 곡별 재생 수를 적어 반응을 봐요.` : '곡별 재생 수를 적어 반응 좋은 곡을 다음 곡에 반영해요.' },
  ];
  const next = steps.find((s) => !s.done) || null;
  return { steps, next, errors: items.filter((i) => i.level === 'error').length };
}
