// 곡 목록 찾기: 곡이 많아지면 목록 위에 찾기 칸. 한글 입력(조합 중)이 끊기지 않게 다시 그리지 않고 목록 줄만 숨긴다.
import { h } from '../dom.js';

export const SEARCH_FROM = 8; // 곡이 이만큼 넘으면 찾기 칸을 보여 준다
const query = { text: '' };

// 찾을 글자: 제목·주제·키워드 (소문자)
export function songHaystack(s) {
  return [s.title, s.concept?.theme, s.concept?.keywords].filter(Boolean).join(' ').toLowerCase();
}

export const songMatches = (s, q = query.text) => !q.trim() || songHaystack(s).includes(q.trim().toLowerCase());

function apply(list, none) {
  const q = query.text.trim().toLowerCase();
  let shown = 0;
  list.querySelectorAll(':scope > li').forEach((li) => {
    li.hidden = !!q && !li.dataset.find.includes(q);
    if (!li.hidden) shown++;
  });
  none.hidden = shown > 0;
}

// songs가 적으면 찾기 칸 없이 모두 보인다. 반환: { field, item(s, li) → li에 찾기 정보, none }
export function songSearch(songs) {
  const on = songs.length >= SEARCH_FROM;
  if (!on) query.text = '';
  const none = h('p', { class: 'muted small', id: 'song-none', hidden: !songs.some((s) => songMatches(s)) }, '찾는 곡이 없어요');
  const field = on ? h('input', {
    type: 'search', id: 'song-search', class: 'song-search', placeholder: '곡 찾기 (제목·주제)', 'aria-label': '곡 찾기 (제목·주제·키워드)', value: query.text,
    oninput: (e) => { query.text = e.target.value; apply(document.getElementById('song-list'), none); },
  }) : null;
  const item = (s, li) => {
    li.dataset.find = songHaystack(s);
    li.hidden = !songMatches(s);
    return li;
  };
  return { field, item, none };
}
