-- ============================================================
-- 와벨리 미적용 SQL 일괄 적용 번들 (2026-06-26)
-- Supabase SQL 에디터에 통째로 붙여넣고 RUN. 순서대로 실행됨.
-- 포함: 19(RLS+광고활성가드) 20(CPC과금 rank/place/infeed) 21(promo게시판)
--       22(active_ads_public 공개RPC) 23(매장/장소 사진 컬럼)
-- ============================================================


-- ▼▼▼ 19_rls_followup.sql ▼▼▼
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
-- ▲▲▲ 19_rls_followup.sql ▲▲▲


-- ▼▼▼ 20_ad_format_billing.sql ▼▼▼
-- 20_ad_format_billing.sql — 광고 format 어휘 불일치로 인한 과금 누수 수정 (DRAFT, 검토 후 적용)
-- ============================================================================
-- 문제: log_ad_event(18_biz_money_reward.sql)는 클릭 과금을 v_format='rank'에만 적용.
--   그런데 관리자웹(wavely-admin)은 CPC 광고를 format='place'|'infeed'로 저장 → active·노출·클릭
--   되지만 클릭당 광고비가 0원으로 차감 안 됨(무료 클릭 = 매출 누수). 앱은 'rank'를 써서 정상.
-- 수정: 클릭 과금 조건의 format을 ('rank','place','infeed')로 확장. (나머지 로직은 18과 동일)
-- ⚠️ 빌링 함수이므로 적용 전 검토. Supabase SQL 에디터에서 수동 RUN. 18의 정의를 대체함(create or replace).
--
-- ✅ 적용 가능 — 선결 조건이 이번 세션에 모두 충족됨(2026-06-26):
--   (a) 관리자웹 AdBuilder가 CPC 광고의 bid_amount에 '클릭당 단가'(플레이스 220·인피드 180, 슬라이더 조정)를
--       저장하도록 수정됨. '예산'은 예상 클릭 산정용 표시값일 뿐 DB에 안 들어감. → 클릭 1회=클릭당 단가 차감(정상).
--       부수효과로 ad_weight=round(bid/500) 도 정상화(과거 총예산 저장 때 항상 18로 포화되던 문제 해소).
--   (b) 앱(explore.tsx)·소비자웹(main.jsx)이 부스트 매장 카드 클릭 시 active_ads_public()로 store_id→ad_id를
--       매핑해 log_ad_event('click')를 호출하도록 배선됨(22_active_ads_public.sql 동반 적용 필요).
--   → 적용 순서: 18 → (19) → 20(이 파일) → 22. 셋 다 적용해야 place/infeed CPC 과금이 끝까지 동작.
-- ============================================================================
create or replace function public.log_ad_event(p_ad_id uuid, p_type text)
returns void language plpgsql security definer set search_path=public as $function$
declare v_format text; v_status text; v_bid int; v_owner uuid; v_store uuid; v_admin boolean; v_bal int; v_new int;
begin
  if p_type not in ('impression','click') then return; end if;
  select format, status, coalesce(bid_amount,0), owner_id, store_id into v_format, v_status, v_bid, v_owner, v_store
  from public.ads where id = p_ad_id;
  if not found then return; end if;
  insert into public.ad_events(ad_id, store_id, type) values (p_ad_id, v_store, p_type);
  if p_type = 'click' and v_format in ('rank','place','infeed') and v_status = 'active' and v_bid > 0 then
    select coalesce(is_admin,false) into v_admin from public.profiles where id = v_owner;
    if v_admin then return; end if;
    perform public._expire_free(v_owner);
    select ad_balance into v_bal from public.profiles where id = v_owner for update;
    v_bal := coalesce(v_bal, 0);
    v_new := greatest(v_bal - v_bid, 0);
    update public.profiles set ad_balance = v_new, ad_free = greatest(0, ad_free - (v_bal - v_new)) where id = v_owner;  -- 무료 우선
    insert into public.ad_ledger(user_id, type, amount, balance_after, ref, memo)
      values (v_owner, 'deduct', -(v_bal - v_new), v_new, p_ad_id::text, '클릭 광고비');
    if v_new <= 0 then
      update public.ads set status = 'paused' where id = p_ad_id;
      update public.stores set is_ad = false, ad_weight = 0 where id = v_store;
    end if;
  end if;
end $function$;

notify pgrst, 'reload schema';
-- ▲▲▲ 20_ad_format_billing.sql ▲▲▲


-- ▼▼▼ 21_board_promo_check.sql ▼▼▼
-- 21_board_promo_check.sql — 게시판 CHECK 제약에 'promo'(홍보) 추가 (검토 후 적용)
-- ============================================================================
-- 문제: schema.sql:43 posts.board CHECK가 ('free','owner','staff')만 허용 → 'promo' 누락.
--   앱(constants/app.ts BOARDS)·소비자웹(main.jsx BOARDS)은 '홍보(promo)' 게시판을 노출하고
--   해당 board로 INSERT를 시도하므로, 라이브 DB가 schema.sql 그대로면 홍보 글쓰기가 CHECK 위반(23514)으로 실패.
-- ⚠️ 적용 전 라이브 DB 실제 제약 확인:
--   select pg_get_constraintdef(oid) from pg_constraint where conname like '%board%' and conrelid='public.posts'::regclass;
--   이미 promo 포함이면 적용 불필요(멱등).
-- ============================================================================
do $$
declare cname text;
begin
  select conname into cname from pg_constraint
   where conrelid = 'public.posts'::regclass and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%board%';
  if cname is not null then
    execute format('alter table public.posts drop constraint %I', cname);
  end if;
  alter table public.posts add constraint posts_board_check
    check (board in ('free','owner','staff','promo'));
end $$;
-- ▲▲▲ 21_board_promo_check.sql ▲▲▲


-- ▼▼▼ 22_active_ads_public.sql ▼▼▼
-- 22_active_ads_public.sql — 활성 광고 공개 조회 RPC (DRAFT, 검토 후 Supabase SQL 에디터에서 RUN)
-- ============================================================================
-- 문제: ads 테이블 SELECT는 소유자/관리자 전용(RLS). 그래서 소비자웹 fetchActiveAds()의
--   직접 `from('ads').select(...)`는 "남의 광고"를 못 읽어 [] 반환 → 광고 마켓플레이스가
--   다른 사장님 광고를 전혀 노출하지 못함(현재 광고 0건이라 잠복). 또한 우리동네 목록의
--   플레이스 광고(is_ad 부스트 매장)를 클릭해도 ad_id를 알 수 없어 CPC 클릭 과금이 0이었음.
-- 해결: 입찰가/소유자/결제 정보를 빼고 '활성 광고'만 공개로 반환하는 보안정의 RPC.
--   (배너 전용 active_banners()의 일반화 버전. 렌더링 + store_id→ad_id 매핑 둘 다 이걸로 해결.)
-- 노출 필드: id, format, headline, banner_image, store_id, 매장 일부(name/category/rating/
--   review_count/address/photo). bid_amount·monthly_fee·owner_id는 절대 노출하지 않음.
-- ============================================================================
create or replace function public.active_ads_public()
returns jsonb language sql security definer set search_path=public stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'format', a.format,
    'headline', a.headline,
    'banner_image', a.banner_image,
    'store_id', a.store_id,
    'stores', case when s.id is null then null else jsonb_build_object(
        'name', s.name, 'category', s.category, 'rating', s.rating,
        'review_count', s.review_count, 'address', s.address, 'photo', s.photo) end
  )), '[]'::jsonb)
  from (select id, format, headline, banner_image, store_id
        from public.ads where status = 'active'
        order by created_at desc limit 50) a
  left join public.stores s on s.id = a.store_id;
$$;

revoke all on function public.active_ads_public() from public;
grant execute on function public.active_ads_public() to anon, authenticated;

notify pgrst, 'reload schema';
-- ▲▲▲ 22_active_ads_public.sql ▲▲▲


-- ▼▼▼ 23_place_photos.sql ▼▼▼
-- 23_place_photos.sql — 매장/장소 대표사진 여러 장(갤러리) 저장용 컬럼
-- ============================================================================
-- 기존 stores.photo(cover 1장) + (places엔 photo 없음)에 더해, 네이버 플레이스 대표사진을
-- 4~5장씩 크롤해 담을 배열 컬럼(photos jsonb)을 추가한다. photos[0] = cover(= 기존 photo와 동일).
-- 정책: 인증매장(biz_verified)은 사장님이 관리자웹 '매장 설정'에서 직접 사진 관리 → 수집기 백필이
--   덮어쓰지 않음(backfill_photos.py가 biz_verified 제외). 미인증 매장/카탈로그 장소만 크롤로 채움.
-- 수집기: 260616 place_collector/backfill_photos.py 가 이 컬럼에 photo(cover)+photos[] 적재.
-- Supabase SQL 에디터에서 RUN.
-- ============================================================================

-- 1) stores: 갤러리 배열(기존 photo는 cover로 유지).
alter table public.stores
  add column if not exists photos jsonb not null default '[]'::jsonb;

-- 2) places(춘천 장소 카탈로그): cover + 갤러리 둘 다 신설.
alter table public.places
  add column if not exists photo text;
alter table public.places
  add column if not exists photos jsonb not null default '[]'::jsonb;

-- 3) 공개 읽기 권한(컬럼단위 grant 환경 대비 — 비로그인 목록 사진 노출).
grant select (photos) on public.stores to anon, authenticated;
grant select (photo, photos) on public.places to anon, authenticated;

notify pgrst, 'reload schema';
-- ▲▲▲ 23_place_photos.sql ▲▲▲

