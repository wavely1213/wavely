-- 35_store_owner_delete.sql
-- 매장 소유자가 본인 매장을 삭제/수정할 수 있게(소비자웹 "내 매장 관리": 수정·삭제).
-- 기존: stores_read(select)/stores_insert/stores_update 만 존재 → delete 정책이 없어
--       RLS 기본 거부로 소유자도 삭제 불가였음. 소유자 delete 정책 추가 + update with check 보강.
-- 적용: Supabase SQL Editor에서 Run.

alter table public.stores enable row level security;

-- 소유자 삭제 허용 (place_rankings/place_analysis는 stores FK on delete cascade → 함께 정리됨)
drop policy if exists stores_delete on public.stores;
create policy stores_delete on public.stores
  for delete using (auth.uid() = owner_id);

-- 수정 정책에 with check 보강(owner_id 변조·타인 이관 방지). 정책 있을 때만 교체.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stores' and policyname = 'stores_update'
  ) then
    execute 'alter policy stores_update on public.stores '
         || 'using (auth.uid() = owner_id) with check (auth.uid() = owner_id)';
  end if;
end $$;

-- 확인용:
-- select policyname, cmd from pg_policies where tablename='stores' order by policyname;
