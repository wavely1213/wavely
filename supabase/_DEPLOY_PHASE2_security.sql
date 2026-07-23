-- ============================================================================
--  와벨리 PHASE-2 보안 SQL  (2026-07-23)  ⚠️ 사장님 검토 후 RUN.
--  선행: _DEPLOY_2026-07-22.sql 적용됨. gps-verify/receipt-ocr 엣지함수 수정본과 '함께' 배포해야 함.
--
--  [S1] guard_review_verified 트리거를 service_role 허용으로 교체.
--       현재 트리거는 auth.uid() 기반이라, gps-verify/receipt-ocr(service_role, auth.uid()=null)가
--       verified=true를 써도 되돌려버림 → 방문인증이 실제로 안 됐음(라이브 gps인증 0건과 일치).
--       수정: 직접(authenticated/anon) 세션의 verified 변경만 차단하고, service_role(엣지함수)은 통과.
--       ※ 수정된 gps-verify/receipt-ocr가 이미 '본인 리뷰(author_id===uid)'만 승격하도록 검증하므로 안전.
-- ============================================================================

create or replace function public.guard_review_verified()
returns trigger language plpgsql as $$
begin
  -- 직접(로그인 유저/익명) 세션이 verified를 바꾸려 하면 원래값으로 되돌림(별점 자가인증 차단).
  -- service_role(gps-verify/receipt-ocr 엣지함수·관리자 RPC)은 current_user가 달라 통과 → 정상 방문인증 승격 허용.
  if current_user in ('authenticated', 'anon')
     and new.verified is distinct from old.verified then
    new.verified := old.verified;
  end if;
  return new;
end $$;
-- 트리거 자체는 09에서 이미 생성됨(함수만 교체하면 반영). 없으면 아래로 생성:
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='reviews') then
    execute 'drop trigger if exists trg_guard_review_verified on public.reviews';
    execute 'create trigger trg_guard_review_verified before update on public.reviews for each row execute function public.guard_review_verified()';
  end if;
end $$;

notify pgrst, 'reload schema';

-- ── (후속·별도 검토 필요, 여기 미포함) ──
--  · handle_new_user의 company_id 신뢰(28에서 부활) → company_id=null 고정. 함수 전체 재정의 필요라 실제 정의 확인 후 별도.
--  · job_posts.contact anon 컬럼 revoke + 매칭성사자 RPC 노출(익명구직 전화 보호) → 앱 알바 흐름 영향 검토 후.
--  · messages/conversations/payments RLS enable/정책 검증 → pg_class 확인쿼리 결과 보고 판단(리포트).
