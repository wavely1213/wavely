-- 19_rls_followup.sql — 런칭 점검(2026-06-25, 멀티에이전트) 발견 RLS 보강 초안
-- ============================================================================
-- ⚠️ 적용 전 반드시 검토. 라이브 공유 Supabase(ref: tjsjxbbqyrtjblajmose)에
--    Supabase SQL 에디터에서 수동 적용. Vercel은 이 파일을 자동 실행하지 않음.
-- ⚠️ likes/scraps/ads 테이블 DDL은 대시보드에서 생성돼 레포에 없음 → 컬럼명/기존정책을
--    실제 DB에서 확인 후 적용할 것. 아래는 information_schema 가드 + drop-if-exists로
--    멱등하게 작성했으나, 적용 후 앱(①)·소비자웹(②)·관리자웹(③)에서 동작 회귀 검증 필수.
-- 출처: data-security 확정 4건 (#13 likes/scraps, #14 ad_events, #15·#16 ads, #17 profiles)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────
-- (#13) likes / scraps — 소유자만 INSERT/DELETE (클라가 user_id 지정 → 위조 차단)
--   user_id 컬럼만 검사하므로 likes 스키마(post_id vs target_type/target_id) 무관하게 안전.
-- ────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='likes') then
    execute 'alter table public.likes enable row level security';
    execute 'drop policy if exists likes_read on public.likes';
    execute 'create policy likes_read on public.likes for select using (true)';          -- 좋아요 수 공개
    execute 'drop policy if exists likes_owner_ins on public.likes';
    execute 'create policy likes_owner_ins on public.likes for insert with check (auth.uid() = user_id)';
    execute 'drop policy if exists likes_owner_del on public.likes';
    execute 'create policy likes_owner_del on public.likes for delete using (auth.uid() = user_id)';
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='scraps') then
    execute 'alter table public.scraps enable row level security';
    execute 'drop policy if exists scraps_read on public.scraps';
    execute 'create policy scraps_read on public.scraps for select using (auth.uid() = user_id)';   -- 스크랩은 본인만
    execute 'drop policy if exists scraps_owner_ins on public.scraps';
    execute 'create policy scraps_owner_ins on public.scraps for insert with check (auth.uid() = user_id)';
    execute 'drop policy if exists scraps_owner_del on public.scraps';
    execute 'create policy scraps_owner_del on public.scraps for delete using (auth.uid() = user_id)';
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────────────
-- (#14) ad_events — 직접 INSERT 차단, 기록은 log_ad_event RPC로만.
--   가짜 노출/클릭으로 경쟁사 광고비 소진·자기 통계 부풀리기 방지.
--   (소비자웹 logAdEvent는 이미 sb.rpc('log_ad_event')로 변경 배포됨.)
--   ※ 2026-06-15 하드닝에서 이미 적용됐을 수 있음 — 멱등 재확인.
-- ────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='ad_events') then
    execute 'revoke insert on public.ad_events from anon, authenticated';
  end if;
end $$;
-- anon(비로그인) 노출/클릭도 기록되도록 RPC 실행권한 부여(있으면 무해).
grant execute on function public.log_ad_event(uuid, text) to anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────
-- (#15 #16) ads — 본인 명의 + 본인 소유 매장만 생성, 본인 광고만 수정.
--   현재 ads 테이블에 RLS/정책이 전무할 개연성 높음(레포에 없음). 적용 시:
--   - 소비자웹 fetchActiveAds()는 status='active' 광고를 직접 select 하므로 SELECT는 active 공개 허용.
--   - status='active' 직접 INSERT로 검수 우회 못하게 INSERT는 under_review/pending_payment만 허용.
-- ────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='ads') then
    execute 'alter table public.ads enable row level security';

    execute 'drop policy if exists ads_read on public.ads';
    execute $p$create policy ads_read on public.ads for select using (
      status = 'active'
      or auth.uid() = owner_id
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    )$p$;

    execute 'drop policy if exists ads_owner_ins on public.ads';
    execute $p$create policy ads_owner_ins on public.ads for insert with check (
      auth.uid() = owner_id
      and status in ('under_review','pending_payment')
      and exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
    )$p$;

    execute 'drop policy if exists ads_owner_upd on public.ads';
    execute 'create policy ads_owner_upd on public.ads for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id)';
  end if;
end $$;

-- (#16b) ads 자가 활성화 차단 트리거 — 사장님이 client UPDATE로 status를 'active'로 못 바꾸게.
--   활성화는 관리자 검수(ad-activate 엣지펑션, service_role) / 결제 RPC만 수행. 비관리자가 'active'로
--   바꾸려 하면 직전 상태로 되돌림(paused↔비active 토글·내용수정은 허용).
create or replace function public.guard_ad_active() returns trigger language plpgsql security definer set search_path=public as $fn$
begin
  if new.status = 'active' and (old.status is distinct from 'active') then
    if not exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.is_admin,false)) then
      new.status := old.status;   -- 비관리자 자가 활성화 무력화
    end if;
  end if;
  return new;
end $fn$;
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='ads') then
    execute 'drop trigger if exists trg_guard_ad_active on public.ads';
    execute 'create trigger trg_guard_ad_active before update on public.ads for each row execute function public.guard_ad_active()';
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────────────
-- (#17) profiles — 익명(anon) 전체 열람 차단 (HIGH)
--   현재 profiles_read = using(true) 라 공개 anon키로 누구나 전 사용자의
--   ad_balance(잔액)·role·is_admin·biz_no(사업자번호 PII)를 enumeration 가능.
--   anon은 posts_read=authenticated 라 게시글/닉네임 조인이 애초에 불가 → anon 차단해도 무회귀.
-- ────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='profiles') then
    execute 'drop policy if exists profiles_read on public.profiles';
    execute 'create policy profiles_read on public.profiles for select using (auth.role() = ''authenticated'')';
    execute 'revoke select on public.profiles from anon';
  end if;
end $$;
-- ⚠️ 잔여(중간위험): 로그인 사용자는 여전히 타인 profiles의 민감 컬럼을 직접 select 가능.
--   완전 차단하려면 (a) 민감컬럼 column-level revoke + 공개컬럼(id,nickname,avatar_url)만 grant,
--   (b) 본인 전체행은 SECURITY DEFINER RPC(my_profile())로 읽도록 클라(앱/웹) 변경.
--   현재 클라가 select('...,ad_balance')로 본인 행을 직접 읽으므로 (a)는 (b)와 함께 적용해야 안 깨짐.

notify pgrst, 'reload schema';
