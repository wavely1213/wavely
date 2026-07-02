-- 25_profiles_pii_lockdown.sql — profiles PII 읽기 차단(HIGH) + 가입 500 수정
-- ============================================================================
-- 출처: 외부 펜테스트 인수인계(2026-07) 발견 #1(로그인 유저가 남의 profiles PII 열람) + #3(가입 500).
-- ⚠️ 라이브 공유 Supabase(ref tjsjxbbqyrtjblajmose) → Supabase SQL 에디터에 붙여넣고 Run.
--    Vercel은 이 파일을 자동 실행하지 않음.
--
-- ★ 인수인계의 원안(민감 컬럼을 profiles에서 DROP해 profiles_private로 이전)은 위험해서 안 씀:
--   가입 트리거 handle_new_user(profiles에 biz_no·biz_verified INSERT), 앱 signup upsert,
--   앱 프로필편집(phone UPDATE), biz-cert-verify/delete-account 엣지함수가 그 컬럼들을
--   profiles에 write 중 → DROP하면 가입·사업자인증·회원탈퇴가 전부 깨짐.
--
-- ★ 대신 "컬럼단위 SELECT 권한 회수" 방식:
--   - PII 컬럼(phone, biz_no, biz_rep_name, biz_open_dt, biz_cert_url, username, friend_code)의
--     SELECT 권한만 anon/authenticated에서 회수 → 남의 것도 본인 것도 클라가 못 읽음(=유출 차단).
--   - INSERT/UPDATE 권한과 SECURITY DEFINER 트리거·service_role(엣지함수)은 영향 없음 → write 안 깨짐.
--   - nickname 등 비PII 컬럼은 계속 SELECT 허용 → posts/comments의 profiles(nickname) 조인 유지
--     → 소비자웹/관리자웹/앱 코드 변경 불필요.
--   - 동적 루프로 "존재하는 모든 비PII 컬럼"을 허용 → 실제 스키마와 무관하게 안전·멱등.
-- ============================================================================

begin;

-- ── 관리자 판별 헬퍼(없으면 생성; 재귀 방지 위해 SECURITY DEFINER) ──
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- ── (1) profiles: 익명 전체 차단 + 로그인 유저는 PII 제외 컬럼만 SELECT ──
do $$
declare col text;
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='profiles') then
    -- 익명(anon): profiles 조회 자체 불가 (닉네임 조인은 authenticated 문맥에서만 발생)
    execute 'revoke select on public.profiles from anon';

    -- 로그인 유저: 테이블 전체 SELECT 회수 후, PII 아닌 컬럼만 개별 재부여
    execute 'revoke select on public.profiles from authenticated';
    for col in
      select column_name from information_schema.columns
      where table_schema='public' and table_name='profiles'
        and column_name not in
            ('phone','biz_no','biz_rep_name','biz_open_dt','biz_cert_url','username','friend_code')
    loop
      execute format('grant select (%I) on public.profiles to authenticated', col);
    end loop;

    -- 행 조회 정책은 로그인 유저 전체 허용 유지(닉네임 조인용). PII는 위 컬럼권한으로 가려짐.
    execute 'drop policy if exists profiles_read on public.profiles';
    execute 'create policy profiles_read on public.profiles for select to authenticated using (true)';
  end if;
end $$;

-- ── (2) 가입 500 수정: 기본 닉네임 ''회원'' 중복 → lower(nickname) 유니크 충돌(23505) ──
--    닉네임 기본값을 고유값으로. (09_security_hardening의 신뢰필드 하드닝은 그대로 보존.)
--    ⚠️ 대시보드에서 handle_new_user를 이 09버전 이후로 수정한 적 있으면, 통째 교체 대신
--       아래 nickname 대입부만 병합할 것. 현재 def 확인: select pg_get_functiondef('public.handle_new_user'::regproc);
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname, role, biz_no, biz_verified, company_id)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nickname',''),
             '회원' || substr(replace(new.id::text,'-',''), 1, 6)),  -- 고유 기본닉네임
    'guest',                                        -- 항상 guest(메타 신뢰 안 함)
    nullif(new.raw_user_meta_data->>'biz_no', ''),
    false,                                          -- 신뢰필드는 메타에서 안 받음
    null
  )
  on conflict (id) do nothing;
  return new;
end; $$;

commit;

notify pgrst, 'reload schema';

-- ============================================================================
-- (선택 A) 본인 PII 읽기용 RPC — 앱 프로필편집에서 본인 phone/biz_* 프리필이 필요하면.
--   위 (1) 이후 클라는 본인 PII도 직접 select 못 하므로, 필요 시 이 RPC로 읽고
--   앱 account-edit를 supabase.rpc('get_my_private')로 바꾸면 됨(웹은 PII를 안 읽어 불필요).
--   ※ 존재하지 않는 컬럼이 있으면 에러 → 스키마에 맞게 컬럼 조정 후 실행.
-- ----------------------------------------------------------------------------
-- create or replace function public.get_my_private()
-- returns table(phone text, biz_no text, biz_rep_name text, biz_open_dt date, biz_cert_url text)
-- language sql stable security definer set search_path=public as $$
--   select phone, biz_no, biz_rep_name, biz_open_dt, biz_cert_url
--   from public.profiles where id = auth.uid();
-- $$;
-- grant execute on function public.get_my_private() to authenticated;

-- ============================================================================
-- (선택 B) stores 익명 PII 축소 — 사업자등록번호(biz_no)는 아무도 클라로 안 읽음(웹 COLS에 없음).
--   실매장 유입 전 미리 잠가둠. phone/owner_id는 프론트가 읽으므로 건드리지 않음.
-- ----------------------------------------------------------------------------
-- do $$
-- begin
--   if exists (select 1 from information_schema.columns
--              where table_schema='public' and table_name='stores' and column_name='biz_no') then
--     execute 'revoke select on public.stores from anon';       -- 아래서 비PII만 재부여
--     -- ⚠️ stores는 익명 매장목록이 공개일 수 있어 컬럼 재부여 목록을 실제 프론트 COLS와 맞춰야 함.
--     --    간단·안전하게 biz_no만 막고 싶으면 테이블 전체회수 대신 컬럼 재부여 방식을 (1)처럼 적용.
--   end if;
-- end $$;
