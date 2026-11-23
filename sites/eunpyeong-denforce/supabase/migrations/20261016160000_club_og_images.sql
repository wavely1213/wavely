-- 링크 미리보기(카카오톡·문자·SNS) 이미지를 관리자 화면(구단정보)에서 교체 (D-037)
-- og_image_url: 사이트 주소용, admin_og_image_url: /admin 주소용. 비우면(null) 기본 이미지(public/og/*.jpg)
alter table public.club_settings
  add column og_image_url text
    check (og_image_url is null or (og_image_url ~ '^https://' and length(og_image_url) <= 500)),
  add column admin_og_image_url text
    check (admin_og_image_url is null or (admin_og_image_url ~ '^https://' and length(admin_og_image_url) <= 500));
