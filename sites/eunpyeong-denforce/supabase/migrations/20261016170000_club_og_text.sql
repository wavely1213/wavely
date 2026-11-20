-- 링크 미리보기(카카오톡·SNS) 제목·설명을 관리자 화면에서 교체 (D-038)
-- og_*: 홈페이지 주소용, admin_og_*: /admin 주소용. 비우면(null) 기본 문구 (src/lib/og.ts, admin/layout.tsx)
alter table public.club_settings
  add column og_title text check (og_title is null or length(og_title) between 1 and 60),
  add column og_description text check (og_description is null or length(og_description) between 1 and 200),
  add column admin_og_title text check (admin_og_title is null or length(admin_og_title) between 1 and 60),
  add column admin_og_description text check (admin_og_description is null or length(admin_og_description) between 1 and 200);
