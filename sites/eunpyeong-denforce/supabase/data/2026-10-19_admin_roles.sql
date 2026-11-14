-- 2026-10-19 관리자 등급 지정 (D-057) — 마이그레이션 20261019120000_admin_roles.sql 뒤에 실행.
-- 최고 관리자를 먼저 정한다 (최고 관리자가 0명이 되는 변경은 막혀 있다). 그 밖의 등급/권한은 관리자 › 관리자 계정에서 최고 관리자가 고른다.
update public.admins set role = 'owner' where email = 'wavely1213@naver.com';
-- 미디어 계정: 구단소식/포스팅 자료 업로드 전용, 공개는 최고 관리자가 검토 후 (소유자 2026-10-19). 권한 칸은 처음엔 모두 꺼 둔다
update public.admins set role = 'media', can_publish = false, can_feature = false, can_set_date = false, can_edit_published = false
where email = 'admin@eunpyeong-fs.com';
