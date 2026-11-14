-- 매치데이 포스터 (D-096) — 경기 당일 홈 팝업에 보일 포스터 이미지.
-- 관리자 › 경기 폼에서 올리거나(media/matchday/), instagram-sync 가 MATCH DAY 게시물 사진을 비어 있을 때만 넣는다(관리자 값 우선).
-- 권한은 기존 matches 그대로(누구나 읽기, 관리자 쓰기). 다시 실행해도 된다.
alter table public.matches
  add column if not exists matchday_poster_url text
    constraint matches_matchday_poster_url_check check (matchday_poster_url is null or (matchday_poster_url ~ '^https://' and length(matchday_poster_url) <= 500));
