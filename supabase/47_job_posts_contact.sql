-- ============================================================
--  와벨리 — job_posts.contact (앱 알바 '연락처' 필드 통합)
--  앱은 원래 jobs.contact(전화 등)를 썼음. 앱을 job_posts(웹 공유)로 통합하면서
--  contact 컬럼을 job_posts에도 둬 앱 기능 보존 + 웹도 나중에 표시 가능.
--  Supabase > SQL Editor 붙여넣기 → RUN. idempotent. (앱 빌드 전에 실행)
-- ============================================================

alter table public.job_posts add column if not exists contact text;

notify pgrst, 'reload schema';
