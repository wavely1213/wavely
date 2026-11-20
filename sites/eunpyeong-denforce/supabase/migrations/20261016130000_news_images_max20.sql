-- 구단소식 상세 사진 상한 10 → 20 장 (D-031)
-- 인스타그램 한 게시물 최대 장수(20)와 맞춘다. 2026-27 영입 선수 12명 공지처럼 10장을 넘는 글이 생김.
-- 관리자 서버 액션 MAX_NEWS_IMAGES 와 같은 값.
alter table public.news_posts drop constraint news_posts_images_max;
alter table public.news_posts add constraint news_posts_images_max check (cardinality(images) <= 20);
