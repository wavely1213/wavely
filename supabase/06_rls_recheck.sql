-- 06_rls_recheck.sql
-- 목적: 1.0 감사에서 "코드가 RLS를 신뢰 중"으로 표시된 부분을 서버에서 재확인·하드닝.
-- 사용법: Supabase SQL Editor에서 (A) 점검 쿼리로 현재상태 확인 → (B) 필요한 부분만 적용.
--         ⚠️ (B)의 reviews/reports 부분은 아래 주석을 읽고 적용할 것(클라 동작과 맞물림).

------------------------------------------------------------
-- (A) 현재 권한·정책 점검 (읽기 전용 — 먼저 실행해서 상태 확인)
------------------------------------------------------------
-- 1) market_items / jobs 에서 anon 이 body·contact 컬럼을 못 읽는지 확인
select table_name, column_name, privilege_type, grantee
from information_schema.column_privileges
where table_schema='public' and grantee='anon'
  and table_name in ('market_items','jobs')
  and column_name in ('body','contact')
order by table_name, column_name;
-- 기대결과: 행이 없어야 함(= anon 에게 body/contact SELECT 권한 없음). 행이 있으면 (B-1) 실행.

-- 2) reviews / reports 테이블 정책 목록
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname='public' and tablename in ('reviews','reports')
order by tablename, cmd;

-- 3) reviews.verified UPDATE 권한이 authenticated 에게 열려 있는지
select column_name, privilege_type, grantee
from information_schema.column_privileges
where table_schema='public' and table_name='reviews'
  and grantee in ('authenticated','anon') and column_name='verified';

------------------------------------------------------------
-- (B-1) [안전·멱등] 목록공개/상세게이트 정책의 서버 근거 재확인
--        이미 적용돼 있어도 다시 실행해 무방. anon 에서 body/contact 제외.
------------------------------------------------------------
revoke select on public.market_items from anon;
grant  select (id, seller_id, title, price, category, status, images, dong, lat, lng, view_count, created_at)
       on public.market_items to anon;
grant  select on public.market_items to authenticated;

revoke select on public.jobs from anon;
grant  select (id, author_id, kind, title, store_id, pay_type, pay, work_time, dong, status, created_at)
       on public.jobs to anon;
grant  select on public.jobs to authenticated;

notify pgrst, 'reload schema';

------------------------------------------------------------
-- (B-2) [검토 후 적용] reviews.verified 신뢰필드 보호
--   현재 클라(store/[id].tsx approveReview, place/[id].tsx)가
--   reviews.update({verified:true}) 를 직접 호출 → RLS가 막지 않으면 누구나 자기 리뷰 인증 가능.
--   권장: verified 변경을 관리자 전용 RPC로 옮기고, 컬럼 UPDATE 권한 회수.
--   ⚠️ 아래를 적용하면 클라의 직접 update 가 막히므로, approve_review RPC로 교체 필요(요청 시 작업).
--
-- create or replace function public.admin_set_review_verified(p_review uuid, p_verified boolean)
-- returns void language plpgsql security definer set search_path=public as $$
-- begin
--   if not coalesce((select is_admin from public.profiles where id=auth.uid()), false) then
--     raise exception 'forbidden';
--   end if;
--   update public.reviews set verified=p_verified where id=p_review;
-- end; $$;
-- revoke update (verified) on public.reviews from authenticated;

------------------------------------------------------------
-- (B-3) [검토 후 적용] reports 관리자 전용
--   클라에는 이미 비관리자 조회 차단을 넣었지만(방어적), 서버에서도 막는 게 정석.
--   reports SELECT/UPDATE 를 is_admin 인 사람만 가능하도록 정책 확인/추가.
--   ⚠️ 기존 정책명과 충돌하지 않게 (A-2) 결과를 보고 policyname 조정.
--
-- alter table public.reports enable row level security;
-- drop policy if exists reports_admin_all on public.reports;
-- create policy reports_admin_all on public.reports for all
--   using (coalesce((select is_admin from public.profiles where id=auth.uid()), false))
--   with check (coalesce((select is_admin from public.profiles where id=auth.uid()), false));
-- (단, 신고 INSERT는 일반 사용자도 가능해야 하므로, INSERT 정책은 별도로 authenticated 허용 유지할 것.)
