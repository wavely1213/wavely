-- ============================================================
--  와벨리 — 익명 구직 성별(선택)  (스펙 §1: gender)
--  Supabase > SQL Editor 에 붙여넣고 RUN. idempotent.
--  선행: 36(job_posts), 43(age_range).
--
--  구직(seek) 익명 카드의 사전 노출용 성별('여'/'남'). null=미표기(선택 입력).
--  수락 전에도 노출되는 대략 정보라 민감 PII 아님(이름·연락처는 러브콜 수락 후 채팅서만).
-- ============================================================

alter table public.job_posts add column if not exists gender text
  check (gender is null or gender in ('여','남'));

-- 확인(선택): select column_name from information_schema.columns
--   where table_name='job_posts' and column_name in ('age_range','gender');
