-- ============================================================
--  와벨리 — 알바 구인구직 보안 하드닝 (감사 P1 3건)
--  Supabase > SQL Editor 에 통째로 붙여넣고 RUN.
--  전부 idempotent(drop policy if exists / revoke·grant 재실행 안전).
--  선행: 36(job_posts, _APPLY_35-37.sql)이 이미 적용돼 있어야 함.
--
--  P1-authz-1 = job_update 역할게이트 부재 → seek로 넣고 hire로 UPDATE 시 구인 제한 우회
--  P1-authz-2 = store_id 소유권 미검증 → 남의 매장 사칭 구인글
--  P1-integrity-1 = boost 컬럼 자가조작(update{boost:N}) → 무료 최상단 영구점유(옥션 붕괴)
-- ============================================================


-- ─────────────────────────────────────────────
-- authz-2: job_insert 재정의 — 역할게이트(기존) + store_id 소유권 검사(신규)
--   store_id 는 NULL 허용(개인 구직/매장 미연결 구인). 값이 있으면 반드시 본인 소유 매장.
-- ─────────────────────────────────────────────
drop policy if exists job_insert on public.job_posts;
create policy job_insert on public.job_posts for insert with check (
  auth.uid() = author_id
  and (
    kind = 'seek'
    or (kind = 'hire' and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','staff')
    ))
  )
  and (
    store_id is null
    or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  )
);


-- ─────────────────────────────────────────────
-- authz-1 + authz-2: job_update 재정의 — insert와 대칭(역할게이트 + store 소유권)
--   기존 정책은 author_id 만 검사 → kind 를 hire 로 승격하는 우회를 허용했음.
-- ─────────────────────────────────────────────
drop policy if exists job_update on public.job_posts;
create policy job_update on public.job_posts for update
  using (auth.uid() = author_id)
  with check (
    auth.uid() = author_id
    and (
      kind = 'seek'
      or (kind = 'hire' and exists (
        select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','staff')
      ))
    )
    and (
      store_id is null
      or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
    )
  );


-- ─────────────────────────────────────────────
-- integrity-1: boost(상위노출) 컬럼 단위 보호
--   전체 UPDATE 권한 회수 후, 실제로 필요한 컬럼만 재부여. boost·kind·author_id·created_at 제외.
--   → 작성자는 자기 공고의 내용/상태만 고칠 수 있고, boost 는 서버(광고옥션/service_role)에서만 SET.
--   09_security_hardening 의 profiles 신뢰컬럼 패턴과 동일.
-- ─────────────────────────────────────────────
revoke update on public.job_posts from authenticated;
grant update (title, body, category, wage, wage_type, work_time, dong, lat, lng, status, store_id)
  on public.job_posts to authenticated;
-- 참고: boost 를 올리는 정식 경로(사장님 유료 부스트)는 향후 SECURITY DEFINER RPC 또는 service_role 로만.


-- ============================================================
--  확인(선택): 주석 풀고 실행하면 적용 결과 확인
-- ============================================================
-- select policyname, cmd from pg_policies where tablename='job_posts' and policyname in ('job_insert','job_update');
-- select column_name, privilege_type from information_schema.column_privileges
--   where table_name='job_posts' and grantee='authenticated' and privilege_type='UPDATE' order by column_name;
--   -- boost 가 목록에 없어야 정상.
