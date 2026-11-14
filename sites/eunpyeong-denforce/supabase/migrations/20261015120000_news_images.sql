-- 구단소식 상세 사진 여러 장 (D-017)
-- thumbnail_url 은 목록 카드용 대표 사진으로 그대로 두고, 상세 화면 사진은 images 에 순서대로 담는다.
-- 개수 상한은 관리자 서버 액션(MAX_NEWS_IMAGES)과 같다.
alter table public.news_posts
  add column images text[] not null default '{}'
  constraint news_posts_images_max check (cardinality(images) <= 10);
