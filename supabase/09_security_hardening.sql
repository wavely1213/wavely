-- 09_security_hardening.sql  (2026-06-17 야간 보안감사 결과 통합)
-- ─────────────────────────────────────────────────────────────
-- 야간 자율 보안감사에서 나온 서버측 조치 통합본. 멱등(여러 번 실행 안전).
-- ⚠️ 일부는 이전 세션에서 이미 적용됐을 수 있음(메모리상 profiles/stores 트리장 컬럼 차단 완료) →
--    여기선 "재확인/재적용"이라 중복이어도 무방. 적용 후 (A) 점검쿼리로 확인 권장.
-- 적용: Supabase SQL Editor에 통째로 붙여넣고 RUN. (테이블 없으면 해당 블록만 건너뜀)

-- =====================================================================
-- (A) 먼저 실행: 현재 권한 점검 (읽기 전용) — 결과 보고 아래 적용
-- =====================================================================
select 'profiles trust cols' as chk, column_name, privilege_type, grantee
from information_schema.column_privileges
where table_schema='public' and table_name='profiles'
  and column_name in ('is_admin','biz_verified','role','company_id','ad_balance')
  and grantee in ('authenticated','anon')
union all
select 'stores trust cols', column_name, privilege_type, grantee
from information_schema.column_privileges
where table_schema='public' and table_name='stores'
  and column_name in ('is_ad','ad_weight','biz_verified','owner_id','rating')
  and grantee in ('authenticated','anon');
-- 위 결과에 UPDATE 행이 보이면 해당 신뢰필드가 사용자에게 열려 있다는 뜻 → 아래 (B)로 차단.

-- =====================================================================
-- (B) 가입 트리거: raw_user_meta_data 의 신뢰필드 무시 (자가 권한상승 차단)
--     기존: biz_verified/role/company_id 를 가입 메타에서 그대로 복사 → 위조 가능.
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname, role, biz_no, biz_verified, company_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', '회원'),
    'guest',            -- 항상 guest. owner는 사업자 인증(set_role/biz-cert)으로만.
    nullif(new.raw_user_meta_data->>'biz_no', ''),
    false,              -- 신뢰필드는 메타에서 안 받음
    null
  )
  on conflict (id) do nothing;
  return new;
end; $$;

-- =====================================================================
-- (C) profiles 신뢰필드 UPDATE 차단 + WITH CHECK
-- =====================================================================
revoke update (is_admin, biz_verified, role, company_id) on public.profiles from authenticated;
-- ad_balance 컬럼이 있으면 같이 차단
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='ad_balance') then
    execute 'revoke update (ad_balance) on public.profiles from authenticated';
  end if;
end $$;
-- profiles_update 에 WITH CHECK(본인행만) 보강
do $$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_update') then
    execute 'alter policy profiles_update on public.profiles using (auth.uid() = id) with check (auth.uid() = id)';
  end if;
end $$;

-- =====================================================================
-- (D) stores 신뢰필드 UPDATE 차단 + WITH CHECK + INSERT 가드 확장(is_ad/ad_weight)
-- =====================================================================
do $$
declare col text;
begin
  foreach col in array array['is_ad','ad_weight','biz_verified','owner_id','rating'] loop
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='stores' and column_name=col) then
      execute format('revoke update (%I) on public.stores from authenticated', col);
    end if;
  end loop;
end $$;
do $$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='stores' and policyname='stores_update') then
    execute 'alter policy stores_update on public.stores using (auth.uid() = owner_id) with check (auth.uid() = owner_id)';
  end if;
end $$;
-- INSERT 가드: 비관리자는 biz_verified/is_ad/ad_weight 강제 기본값 (05 확장)
create or replace function public.guard_store_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    new.biz_verified := false;
    begin new.is_ad := false; exception when undefined_column then null; end;
    begin new.ad_weight := 0; exception when undefined_column then null; end;
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_store_insert on public.stores;
create trigger trg_guard_store_insert before insert on public.stores
  for each row execute function public.guard_store_insert();

-- =====================================================================
-- (E) reviews.verified 자가인증 차단 (별점 조작 방지) — 관리자 RPC로만
-- =====================================================================
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='reviews') then
    execute 'revoke update (verified) on public.reviews from authenticated';
  end if;
end $$;
create or replace function public.admin_set_review_verified(p_review uuid, p_verified boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not coalesce((select is_admin from public.profiles where id=auth.uid()), false) then
    raise exception 'forbidden';
  end if;
  update public.reviews set verified=p_verified where id=p_review;
end; $$;
-- ⚠️ 클라(store/[id].tsx approveReview, place/[id].tsx)도 reviews.update({verified}) →
--    supabase.rpc('admin_set_review_verified', {p_review, p_verified}) 로 교체 필요(별도 커밋).

-- =====================================================================
-- (F) reports 관리자 전용 (신고자 신원·내용 보호 + status 조작 방지). INSERT는 열어둠.
-- =====================================================================
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='reports') then
    execute 'alter table public.reports enable row level security';
    execute 'drop policy if exists reports_admin_rw on public.reports';
    execute 'create policy reports_admin_rw on public.reports for select using (coalesce((select is_admin from public.profiles where id=auth.uid()),false))';
    execute 'drop policy if exists reports_admin_update on public.reports';
    execute 'create policy reports_admin_update on public.reports for update using (coalesce((select is_admin from public.profiles where id=auth.uid()),false)) with check (coalesce((select is_admin from public.profiles where id=auth.uid()),false))';
    -- 신고 등록은 로그인 사용자 누구나
    execute 'drop policy if exists reports_insert on public.reports';
    execute 'create policy reports_insert on public.reports for insert with check (auth.uid() is not null)';
  end if;
end $$;

-- =====================================================================
-- (G) place_analysis_requests: 매장당 동시 1건 + requested_by 위조 차단
-- =====================================================================
-- 매장당 pending/running 1건만 (큐 폭주·수집기 DoS 방지)
create unique index if not exists par_one_active_per_store
  on public.place_analysis_requests (store_id)
  where status in ('pending','running');
-- requested_by 는 본인만
alter table public.place_analysis_requests alter column requested_by set default auth.uid();
drop policy if exists par_insert on public.place_analysis_requests;
create policy par_insert on public.place_analysis_requests for insert
  with check (
    (requested_by is null or requested_by = auth.uid())
    and exists (select 1 from public.stores s
                where s.id = store_id and s.owner_id = auth.uid()
                  and coalesce(s.biz_verified,false) = true)
  );

-- =====================================================================
-- (H) likes / scraps 중복 방지 유니크 (좋아요·인기글 조작 차단) — 있으면
-- =====================================================================
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='likes')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='likes' and column_name='target_type') then
    execute 'create unique index if not exists likes_uniq on public.likes (target_type, target_id, user_id)';
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='scraps')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='scraps' and column_name='user_id') then
    execute 'create unique index if not exists scraps_uniq on public.scraps (target_type, target_id, user_id)';
  end if;
end $$;

-- =====================================================================
-- (I) 텍스트 길이 제한 (DoS·렌더폭탄 방지). NOT VALID=기존행 검사 안 함, 신규만.
--     테이블/컬럼 있으면만. 한도는 보수적으로.
-- =====================================================================
do $$
declare t record;
begin
  for t in
    select * from (values
      ('posts','title',120),('posts','body',5000),
      ('comments','body',2000),
      ('market_items','title',120),('market_items','body',5000),
      ('jobs','title',120),('jobs','body',5000),
      ('reviews','body',2000),
      ('reports','detail',2000),
      ('messages','body',3000),
      ('place_rank_keywords','keyword',40),
      ('keyword_subs','keyword',40),
      ('profiles','nickname',24)
    ) as v(tbl,col,maxlen)
  loop
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name=t.tbl and column_name=t.col) then
      begin
        execute format('alter table public.%I add constraint %I check (char_length(%I) <= %s) not valid',
                       t.tbl, t.tbl||'_'||t.col||'_len', t.col, t.maxlen);
      exception when duplicate_object then null; when others then null;
      end;
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
-- 적용 후 (A) 점검쿼리 다시 돌려 trust 컬럼 UPDATE 행이 사라졌는지 확인.
