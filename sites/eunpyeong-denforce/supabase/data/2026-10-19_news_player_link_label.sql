-- 2026-10-19 구단뉴스 영입 글 14건 — 본문 '선수 소개: https://eunpyeong-fs.com/team/players/…' 에서 앞의 '선수 소개: ' 를 뺀다.
-- 우리 주소 링크는 화면에서 '선수 소개 보기'로 보여서(BR-017, D-053) '선수 소개: 선수 소개 보기'로 겹쳐 보이던 것 (I-041, 소유자 "추천대로 진행").
-- 다시 돌려도 같은 결과 (이미 뺀 글은 바뀌지 않음).
update public.news_posts
set body = regexp_replace(body, '선수 소개\s*:\s*(https://eunpyeong-fs\.com/team/players/)', '\1', 'g')
where body ~ '선수 소개\s*:\s*https://eunpyeong-fs\.com/team/players/';
