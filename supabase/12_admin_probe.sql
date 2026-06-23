-- 12_admin_probe.sql
-- 관리자 전용 '다른 매장 분석'(프로브) — 관리자가 임의 플레이스 ID를 등록해 자유롭게 분석.
-- 프로브 매장은 stores에 owner_id=관리자로 들어가되 is_probe=true 로 표시되어
-- 공개 지도/탐색/검색에는 노출되지 않는다(앱 쿼리에서 제외).
-- 적용: Supabase SQL Editor 또는 supabase db push. 적용 후 수집기 워커 재시작.

------------------------------------------------------------
-- 1) is_probe 플래그
------------------------------------------------------------
alter table public.stores add column if not exists is_probe boolean not null default false;
update public.stores set is_probe = false where is_probe is null;

------------------------------------------------------------
-- 2) 가드 — is_probe=true 는 관리자만 설정 가능 (비관리자 방어)
------------------------------------------------------------
create or replace function public.guard_store_probe()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if coalesce(new.is_probe, false)
     and not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    raise exception '프로브 매장은 관리자만 등록할 수 있어요.';
  end if;
  return new;
end; $$;
drop trigger if exists trg_store_probe_ins on public.stores;
create trigger trg_store_probe_ins before insert on public.stores
  for each row execute function public.guard_store_probe();
drop trigger if exists trg_store_probe_upd on public.stores;
create trigger trg_store_probe_upd before update of is_probe on public.stores
  for each row execute function public.guard_store_probe();

------------------------------------------------------------
-- 3) 분석요청 RLS 완화 — 프로브 매장은 biz_verified가 아니어도 관리자면 요청 가능
------------------------------------------------------------
drop policy if exists par_insert on public.place_analysis_requests;
create policy par_insert on public.place_analysis_requests for insert
  with check (exists (select 1 from public.stores s
                      where s.id = store_id and s.owner_id = auth.uid()
                        and (coalesce(s.biz_verified, false) = true
                             or coalesce((select is_admin from public.profiles where id = auth.uid()), false))));

notify pgrst, 'reload schema';
