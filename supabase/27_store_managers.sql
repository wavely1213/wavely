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
