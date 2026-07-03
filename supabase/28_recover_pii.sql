-- 28_recover_pii.sql — 원본 핸드오프 SQL(컬럼 DROP→profiles_private) 실행으로 가입/인증/탈퇴가 깨진 것 복구.
-- 방식: 드롭된 컬럼 되돌림(→트리거·엣지함수·앱 다시 작동) + profiles_private 데이터 원위치·제거
--       + 안전한 "컬럼단위 SELECT 권한 회수"로 PII 재잠금(25번 방식 = DROP 안 함).
-- ⚠️ Supabase SQL Editor에 통째로 Run. 멱등(여러 번 돌려도 안전).

begin;

-- (1) 드롭된 컬럼 복구 (트리거 handle_new_user·biz-cert-verify·delete-account·앱이 이 컬럼들을 write함)
alter table public.profiles
  add column if not exists phone        text,
  add column if not exists biz_no       text,
  add column if not exists biz_verified boolean default false,
  add column if not exists biz_rep_name text,
  add column if not exists biz_open_dt  date,
  add column if not exists biz_cert_url text,
  add column if not exists username     text,
  add column if not exists friend_code  text;

-- (2) profiles_private 에 옮겨졌던 값 되돌리고(있으면) 그 테이블 제거 — 우린 컬럼권한 방식으로 감
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='profiles_private') then
    update public.profiles p set
      phone        = coalesce(p.phone, pp.phone),
      biz_no       = coalesce(p.biz_no, pp.biz_no),
      biz_verified = coalesce(p.biz_verified, pp.biz_verified),
      biz_rep_name = coalesce(p.biz_rep_name, pp.biz_rep_name),
      biz_open_dt  = coalesce(p.biz_open_dt, pp.biz_open_dt),
      biz_cert_url = coalesce(p.biz_cert_url, pp.biz_cert_url),
      username     = coalesce(p.username, pp.username),
      friend_code  = coalesce(p.friend_code, pp.friend_code)
    from public.profiles_private pp where pp.id = p.id;
    drop table public.profiles_private cascade;
  end if;
end $$;

-- (3) 가입 트리거 정상화 + 닉네임 고유화(가입500 예방). 신뢰필드는 메타에서 안 받음(권한상승 차단, 09 하드닝 유지).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname, role, biz_no, biz_verified, company_id)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nickname',''),
             '회원' || substr(replace(new.id::text,'-',''), 1, 6)),
    'guest',
    nullif(new.raw_user_meta_data->>'biz_no', ''),
    false,
    nullif(new.raw_user_meta_data->>'company_id','')::uuid
  )
  on conflict (id) do nothing;
  return new;
end; $$;

-- is_admin() 헬퍼(없으면 생성; 핸드오프가 만들었을 수도)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

commit;

-- (4) PII 재잠금: 컬럼 DROP 아님. PII 컬럼의 SELECT 권한만 회수(비PII만 재부여) → 남 PII 못 읽음, write는 무관.
begin;
do $$
declare col text;
begin
  execute 'revoke select on public.profiles from anon';
  execute 'revoke select on public.profiles from authenticated';
  for col in
    select column_name from information_schema.columns
    where table_schema='public' and table_name='profiles'
      and column_name not in ('phone','biz_no','biz_rep_name','biz_open_dt','biz_cert_url','username','friend_code')
  loop
    execute format('grant select (%I) on public.profiles to authenticated', col);
  end loop;
  execute 'drop policy if exists profiles_read on public.profiles';
  execute 'create policy profiles_read on public.profiles for select to authenticated using (true)';
end $$;
commit;

notify pgrst, 'reload schema';
