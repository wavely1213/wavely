-- 2026-10-19 구단사진 '2025-26 시즌 현장 사진 (사진: 덴포스)' 한 글(사진 9장)을 사진 한 장씩 9개 글로 나눔
-- (소유자 "2025-26 시즌 현장 사진도 하나씩 뜯어줘. 하나로 둘 필요는 없는 것 같아서", "게시글 많아보이는게 좋지 않을까")
-- 제목 '2025-26 시즌 현장 사진 N (사진: 덴포스)', 대표 사진 = 그 사진, 날짜/요약/본문은 원래 글 그대로.
-- 목록 자리: 원래 글의 등록 시각에서 1초씩 앞당겨(1번이 맨 앞) 원래 글이 있던 자리에 놓인다 — 최근 영입 소식을 밀어내지 않게.
-- 운영 DB 적용 2026-10-19 (원래 글 d96e38c6-419a-45b6-923a-223ba059d296 은 행만 지움 — 사진 파일은 새 글들이 그대로 씀).
insert into public.news_posts (category, title, date, thumbnail_url, images, summary, body, featured, published, created_at)
select 'photo', '2025-26 시즌 현장 사진 ' || i || ' (사진: 덴포스)', o.date, o.images[i], array[o.images[i]], o.summary, o.body,
       false, true, o.created_at - make_interval(secs => i - 1)
from public.news_posts o, generate_series(1, 9) as i
where o.id = 'd96e38c6-419a-45b6-923a-223ba059d296';
delete from public.news_posts where id = 'd96e38c6-419a-45b6-923a-223ba059d296';
