-- 30_password_reset.sql — 다단계 비밀번호 재설정(본인확인 → 인증번호 → 새 비번).
-- ⚠️ Supabase SQL Editor Run. 멱등.

-- (1) 실명 컬럼 — 가입 때 채움. 재설정 본인확인에 사용(자가입력 일치확인 수준).
alter table public.profiles add column if not exists real_name text;

-- (2) 본인확인: 이메일(아이디) [+ 실명] 이 계정과 일치하는지.
--     실명 미저장(기존 유저)이면 이메일만 확인 → graceful. SECURITY DEFINER 로 auth.users 조회.
--     ⚠️ anon 실행 허용 = 이메일 존재여부가 드러남(재설정 흐름의 통상 트레이드오프). 남용방지는 Supabase Auth rate-limit + OTP 로 보완.
create or replace function public.verify_reset_identity(p_email text, p_name text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_name text;
begin
  if p_email is null or btrim(p_email) = '' then return false; end if;
  select id into v_uid from auth.users where lower(email) = lower(btrim(p_email));
  if v_uid is null then return false; end if;                 -- 그 이메일 계정 없음
  if p_name is not null and btrim(p_name) <> '' then
    select real_name into v_name from public.profiles where id = v_uid;
    -- 저장된 실명이 있고, 입력과 다르면 불일치. (저장 안 된 기존계정은 통과)
    if v_name is not null and btrim(v_name) <> '' and lower(btrim(v_name)) <> lower(btrim(p_name)) then
      return false;
    end if;
  end if;
  return true;
end; $$;
revoke all on function public.verify_reset_identity(text, text) from public;
grant execute on function public.verify_reset_identity(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
