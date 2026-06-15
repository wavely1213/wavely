-- ============================================================
--  가입하면 프로필 자동 생성 (이메일 인증을 켜도 안전하게 저장)
--  Supabase > SQL Editor 에 붙여넣고 RUN 하세요.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, role, biz_no, biz_verified, company_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', '회원'),
    coalesce(new.raw_user_meta_data->>'role', 'guest'),
    nullif(new.raw_user_meta_data->>'biz_no', ''),
    coalesce((new.raw_user_meta_data->>'biz_verified')::boolean, false),
    nullif(new.raw_user_meta_data->>'company_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 회원(auth) 생성 시 위 함수가 자동 실행되도록 연결
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
