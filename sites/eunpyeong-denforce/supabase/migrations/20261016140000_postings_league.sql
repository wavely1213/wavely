-- 포스팅 분류에 'league'(FK리그) 추가 — 한국풋살연맹 공식 유튜브 영상을 '뉴스'에서 따로 (D-032, 소유자 선택 "FK리그 탭")
-- 기존 글 옮기기는 데이터 파일(supabase/data/2026-10_postings.sql 끝)에서 한다 (새 프로젝트는 마이그레이션 뒤에 글을 넣으므로).
alter table public.postings drop constraint postings_kind_check;
alter table public.postings add constraint postings_kind_check check (kind in ('club', 'news', 'fan', 'league'));
