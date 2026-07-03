-- ============================================================================
--  wavely_APPLY.sql — 와벨리 Supabase 적용 "합본" (2026-07)
--  이 파일 하나만 SQL Editor에 붙여넣고 Run 하면 아래 3개가 전부 반영됩니다.
--  전부 멱등(여러 번 Run 해도 안전). 개별 이력은 26_/27_/28_ 파일 참고.
--    ① 보안: profiles PII 잠금 + (핸드오프 DROP으로 깨진) 가입/인증/탈퇴 복구
--    ② 대행사 위임(store_managers) + 광고 RLS(과금은 매장주 잔액)
--    ③ 웹 매장추가 필드(menu/parking/biz_cert_url)
-- ============================================================================

-- ═══════════════ ① 보안 + 가입복구 ═══════════════
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
  add column if not exists biz_open_dt  text,
  add column if not exists biz_cert_url text,
  add column if not exists username     text,
  add column if not exists friend_code  text;

-- (2) profiles_private 에 옮겨졌던 값 되돌리고(있으면) 그 테이블 제거 — 우린 컬럼권한 방식으로 감
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='profiles_private') then
    begin  -- 데이터 이관(있으면). 타입불일치 등 에러 나도 스킵하고 테이블은 확실히 제거.
      update public.profiles p set
        phone        = coalesce(p.phone, pp.phone),
        biz_no       = coalesce(p.biz_no, pp.biz_no),
        biz_verified = coalesce(p.biz_verified, pp.biz_verified),
        biz_rep_name = coalesce(p.biz_rep_name, pp.biz_rep_name),
        biz_open_dt  = coalesce(p.biz_open_dt, pp.biz_open_dt::text),
        biz_cert_url = coalesce(p.biz_cert_url, pp.biz_cert_url),
        username     = coalesce(p.username, pp.username),
        friend_code  = coalesce(p.friend_code, pp.friend_code)
      from public.profiles_private pp where pp.id = p.id;
    exception when others then
      raise notice 'profiles_private 이관 스킵(비었거나 타입불일치): %', sqlerrm;
    end;
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


-- ═══════════════ ② 대행사 위임 ═══════════════
-- 27_store_managers.sql — 대행사 위임(매장 관리 권한) v1
-- 양방향(사장님 초대 OR 대행사 신청) + 상대 승인. 소유권=사장님 유지. 광고비=매장주 잔액.
-- ⚠️ Supabase SQL Editor에 Run. is_admin()은 25_profiles_pii_lockdown.sql에서 이미 생성됨(선행 필요).
-- ⚠️ 적용 전 pg_policies로 실제 정책명(ads_owner_ins/upd, ad_keywords_owner, stores_update) 재확인 권장.
--    guard_ad_active 트리거(19_*)와 stores 컬럼권한 revoke(09_*)는 절대 손대지 않음(유지).
begin;

-- (1) 위임 테이블 --------------------------------------------------------------
create table if not exists public.store_managers (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores(id)   on delete cascade,
  manager_id   uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','active','rejected','revoked')),
  requested_by text not null check (requested_by in ('owner','manager')),  -- 누가 시작했나
  invited_by   uuid,          -- 초대/신청 누른 auth.uid()
  responded_by uuid,          -- 승인/거절 누른 사람
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (store_id, manager_id)
);
create index if not exists sm_store_idx   on public.store_managers (store_id);
create index if not exists sm_manager_idx on public.store_managers (manager_id) where status = 'active';
alter table public.store_managers enable row level security;

-- (2) 헬퍼: 소유자 OR active 매니저 OR admin / 매장주 uid -----------------------
create or replace function public.can_manage_store(p_store uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.stores s where s.id = p_store and s.owner_id = auth.uid())
      or exists (select 1 from public.store_managers m
                  where m.store_id = p_store and m.manager_id = auth.uid() and m.status = 'active')
      or public.is_admin();
$$;
grant execute on function public.can_manage_store(uuid) to authenticated;

create or replace function public.store_owner(p_store uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select owner_id from public.stores where id = p_store;
$$;
grant execute on function public.store_owner(uuid) to authenticated;

-- (3) store_managers RLS ------------------------------------------------------
drop policy if exists sm_read on public.store_managers;
create policy sm_read on public.store_managers for select using (
  manager_id = auth.uid()
  or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  or public.is_admin()
);
drop policy if exists sm_insert on public.store_managers;
create policy sm_insert on public.store_managers for insert with check (
  status = 'pending' and invited_by = auth.uid() and (
    (requested_by = 'owner'   and exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
    or (requested_by = 'manager' and manager_id = auth.uid())
  )
);
drop policy if exists sm_update on public.store_managers;
create policy sm_update on public.store_managers for update using (
  manager_id = auth.uid()
  or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  or public.is_admin()
) with check (
  case  -- 승인(active)은 '상대편'만: owner가 낸 건 매니저가, 매니저가 낸 건 owner가 수락
    when status = 'active' and requested_by = 'owner'   then manager_id = auth.uid()
    when status = 'active' and requested_by = 'manager' then
         exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()) or public.is_admin()
    else true  -- rejected/revoked/재요청 pending은 양쪽 가능
  end
);
revoke all on public.store_managers from anon;
grant select, insert, update on public.store_managers to authenticated;

-- (4) 기존 정책 확장: owner → can_manage_store, 광고 owner_id=매장주 강제(과금 귀속) ----
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='ads') then
    execute 'drop policy if exists ads_owner_ins on public.ads';
    execute $p$create policy ads_owner_ins on public.ads for insert with check (
      status in ('under_review','pending_payment')
      and owner_id = public.store_owner(store_id)   -- ★ 매장주로 강제 → 클릭과금이 매장주 잔액에서
      and public.can_manage_store(store_id)
    )$p$;
    execute 'drop policy if exists ads_owner_upd on public.ads';
    execute $p$create policy ads_owner_upd on public.ads for update
      using (public.can_manage_store(store_id))
      with check (public.can_manage_store(store_id) and owner_id = public.store_owner(store_id))$p$;
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='ad_keywords') then
    execute 'drop policy if exists ad_keywords_owner on public.ad_keywords';
    execute $p$create policy ad_keywords_owner on public.ad_keywords for all
      using      (exists (select 1 from public.ads a where a.id = ad_id and public.can_manage_store(a.store_id)))
      with check (exists (select 1 from public.ads a where a.id = ad_id and public.can_manage_store(a.store_id)))$p$;
  end if;

  -- stores UPDATE: 매니저도 매장정보 수정 가능(단, 신뢰컬럼은 09_* column-revoke로 여전히 잠김)
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='stores') then
    execute 'drop policy if exists stores_update on public.stores';
    execute 'create policy stores_update on public.stores for update using (public.can_manage_store(id)) with check (public.can_manage_store(id))';
  end if;
end $$;

commit;
notify pgrst, 'reload schema';


-- ═══════════════ ③ 웹 매장추가 필드 ═══════════════
-- 26_store_fields.sql — 웹 매장등록 폼용 stores 컬럼 추가
-- Supabase SQL Editor에 Run. (미적용이어도 웹 매장등록은 코어 필드만 저장하는 graceful 폴백 있음 —
--  적용하면 추천메뉴·주차·사업자등록증까지 저장됨.)
alter table public.stores
  add column if not exists menu         text,   -- 추천메뉴
  add column if not exists parking      text,   -- 주차: 주차 가능/불가/주변 유료주차/발렛
  add column if not exists biz_cert_url text;   -- 사업자등록증 이미지 URL(관리자 인증검토용)

notify pgrst, 'reload schema';
