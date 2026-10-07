// 처음 온 사람 안내: 예시 곡만 있을 때 맨 위에 "이렇게 만들어요" 카드. 닫으면 이 브라우저에서는 다시 안 보인다.
import { h } from '../dom.js';
import { newSong, refresh } from '../state.js';

const KEY = 'kpop-writer-welcome-closed';
let closedNow = false; // 저장소를 못 쓰는 화면에서도 닫기는 되게

function isClosed() {
  if (closedNow) return true;
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

function close() {
  closedNow = true;
  try { localStorage.setItem(KEY, '1'); } catch { /* 저장소를 못 써도 이번에는 닫힘 */ }
  refresh();
}

export function renderWelcome(song, { aiAvailable = true } = {}) {
  if (!song.example || isClosed()) return null;
  return h('section', { class: 'card welcome', id: 'welcome', 'aria-label': '처음 쓰는 분을 위한 안내' },
    h('h2', null, '처음이세요? 이렇게 만들어요'),
    h('ol', { class: 'welcome-steps' },
      h('li', null, h('strong', null, '컨셉·멤버'), aiAvailable
        ? ' — 주제를 한 줄 적고 "초안 만들기"를 누르면 가사·편곡·멜로디·Suno 스타일이 차례로 채워져요. 아이디어가 없으면 "컨셉 아이디어 3개 받기".'
        : ' — 주제와 멤버를 적고, 구조·가사 탭에서 가사를 직접 써요 (이 화면에서는 AI를 쓸 수 없어요).'),
      h('li', null, h('strong', null, '고치고 들어 보기'), ' — 구조·가사, 편곡, 멜로디 탭에서 마음에 들게 고치고, 편곡 탭의 재생 버튼으로 데모를 들어요.'),
      h('li', null, h('strong', null, 'Suno로 노래 만들기'), ' — 내보내기 탭에서 가사·스타일을 복사해 Suno에 붙여 넣어요.'),
      h('li', null, h('strong', null, '발매 준비'), ' — 마스터링 탭에 Suno 결과를 넣어 발매용 WAV로 만들고, "싱글 발매 준비"에서 커버·정보·제출 패키지까지.')),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn primary', id: 'welcome-new', onclick: () => { close(); newSong(); } }, '+ 내 첫 곡 만들기'),
      h('button', { type: 'button', class: 'btn ghost', id: 'welcome-close', onclick: close }, '예시부터 둘러볼게요')),
    h('p', { class: 'muted small' }, '아래는 예시 곡이에요. 고치면 내 곡으로 저장돼요.'));
}
