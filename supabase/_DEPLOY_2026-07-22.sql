-- ============================================================================
--  와벨리 통합 배포 SQL  (2026-07-22)  —  아침에 위→아래 순서로 한 번에 RUN
--  Supabase > SQL Editor 에 이 파일 전체를 붙여넣고 RUN. 전부 idempotent(재실행 안전).
--
--  이 파일에 담긴 것 = 밤샘 감사에서 "미적용(라이브 DB에 없음)"으로 확정된 마이그레이션
--  + 검증(CONFIRMED)된 보안 회수 1건. (위험/재작성 필요한 결제·보안 개선은 여기 없음 —
--   리포트에서 승인 후 별도 처리.)
--
--  [0] pricing 테이블 버전관리(라이브엔 이미 존재 → 무해). label 컬럼 포함.
--  [1] 47_job_posts_contact  — job_posts.contact 컬럼(앱 알바 연락처). ★미적용 확정
--  [2] 24_ad_auction_keywords — 키워드 CPC 옥션(ad_keywords·w_score·active_ads_public·log_ad_event 3인자). ★미적용=키워드광고 전면 먹통 상태
--  [3] 32_geo_targeting_v2    — 다중동+반경 타게팅(24 뒤에 와야 함). ★미적용
--  [4] 29_superadmin (A~4)    — 관리자 광고승인·비즈머니충전 RPC + 보안트리거. ★미적용=관리자 광고승인 전부 실패 상태
--       ※ 29의 (Z) 슈퍼관리자 재지정 블록은 '락아웃 위험'이라 제외함(파일 맨 아래 주석 참고).
--  [9] 보안: payments·billing_keys·messages 등 민감테이블 anon 권한 회수(검증 CONFIRMED, 앱 무영향).
--
--  ⚠️ 실행 전 확인: 이 프로젝트는 Supabase 1개 공유(스테이징=prod). 아래는 전부 라이브에 적용됨.
-- ============================================================================


-- ========================== [0] pricing 테이블 ==============================
-- 라이브엔 이미 존재(관리자 가격설정·promote_job·단가표시가 의존). 버전관리 목적 + 신규DB 대비.
-- label 컬럼 포함(관리자 fetchPricingAll이 key,amount,label select).
create table if not exists public.pricing (
  key text primary key,
  amount int not null,
  label text,
  updated_at timestamptz default now()
);
alter table public.pricing enable row level security;
drop policy if exists pricing_read on public.pricing;
create policy pricing_read on public.pricing for select using (true);
drop policy if exists pricing_write on public.pricing;
create policy pricing_write on public.pricing for all using (public.is_admin()) with check (public.is_admin());
insert into public.pricing(key, amount, label) values
  ('job_instant',1000,'알바 즉시게시'),('job_extra',1000,'알바 추가게시'),
  ('job_boost',3000,'알바 상위노출/일'),('job_extend',500,'알바 노출연장/일'),
  ('pro_monthly',29000,'Pro 월구독'),('ad_bid_min',100,'입찰가 하한'),('ad_bid_max',5000,'입찰가 상한')
on conflict (key) do nothing;
notify pgrst, 'reload schema';


-- ========================== [1] 47_job_posts_contact =======================
-- ============================================================
--  와벨리 — job_posts.contact (앱 알바 '연락처' 필드 통합)
--  앱은 원래 jobs.contact(전화 등)를 썼음. 앱을 job_posts(웹 공유)로 통합하면서
--  contact 컬럼을 job_posts에도 둬 앱 기능 보존 + 웹도 나중에 표시 가능.
--  Supabase > SQL Editor 붙여넣기 → RUN. idempotent. (앱 빌드 전에 실행)
-- ============================================================

alter table public.job_posts add column if not exists contact text;

notify pgrst, 'reload schema';

-- ========================== [2] 24_ad_auction_keywords =====================
-- 24_ad_auction_keywords.sql — 경쟁형(옥션) 광고 + 플레이스 키워드 타게팅 (검토 후 Supabase SQL 에디터 RUN)
-- ============================================================================
-- 사용자 결정(2026-06-28):
--   ① 배너·플레이스·인피드 전부 "경쟁형" — 노출 순위/빈도를 (입찰가 x 지수)로 결정.
--      지수 = N지수(네이버) + W지수(와벨리 커뮤니티) 블렌드. score = weight * (1 + (N+W)/2).
--      · 배너: 정액(monthly_fee) 유지 + 노출빈도 경쟁(weight=monthly_fee, 가중 랜덤 회전).
--      · 인피드: CPC(bid_amount) + 노출빈도/순서 경쟁(weight=bid_amount).
--      · 플레이스: CPC + "키워드별 개별 단가" 타게팅. 소비자 키워드 검색 시 노출, 그 키워드 단가로 클릭 과금.
--   ② 입찰가(원)는 소비자/타 사장님에게 노출 금지 — 서버에서 정렬만 하고 "순서"로만 반환.
-- 선행: 이 파일이 18/20의 log_ad_event, 22의 active_ads_public 을 대체(drop 후 재정의)함.
-- N,W 각 0~2 스케일 → multiplier 1~3. (calcNScore/calcWScore와 동일 공식)
-- ============================================================================

-- ── 1) 플레이스 광고 키워드 타게팅 테이블 (키워드별 개별 클릭단가) ──────────────
create table if not exists public.ad_keywords (
  id         uuid primary key default gen_random_uuid(),
  ad_id      uuid not null references public.ads(id) on delete cascade,
  keyword    text not null,
  bid_amount int  not null default 0,         -- 이 키워드 클릭당 단가(원)
  created_at timestamptz not null default now()
);
create unique index if not exists ad_keywords_uq on public.ad_keywords (ad_id, lower(keyword));
create index if not exists ad_keywords_ad_idx on public.ad_keywords (ad_id);
create index if not exists ad_keywords_kw_idx on public.ad_keywords (lower(keyword));

alter table public.ad_keywords enable row level security;
-- 소유자(광고주)/관리자만 자기 광고 키워드 읽기·쓰기. 소비자는 active_ads_public(정의자권한)으로만 간접 노출.
drop policy if exists ad_keywords_owner on public.ad_keywords;
create policy ad_keywords_owner on public.ad_keywords for all
  using (exists (select 1 from public.ads a where a.id = ad_id
                 and (a.owner_id = auth.uid()
                      or coalesce((select is_admin from public.profiles where id = auth.uid()), false))))
  with check (exists (select 1 from public.ads a where a.id = ad_id
                 and (a.owner_id = auth.uid()
                      or coalesce((select is_admin from public.profiles where id = auth.uid()), false))));

-- ── 2) ad_events 에 keyword 컬럼 (키워드별 성과 집계용) ──────────────────────
alter table public.ad_events add column if not exists keyword text;

-- ── 3) 매장 W지수 캐시 컬럼 + 갱신 함수 (커뮤니티 글 집계는 무거우니 캐시) ────────
alter table public.stores add column if not exists w_score numeric not null default 0;   -- 0~2

create or replace function public.refresh_w_scores()
returns int language plpgsql security definer set search_path=public as $$
declare r record; v_m numeric; v_l numeric; v_c numeric; v_sc numeric; cnt int := 0;
begin
  for r in select id, name from public.stores where name is not null and length(name) >= 2 loop
    -- 멘션수 + 좋아요합
    select least(1, count(*)::numeric / 10), least(1, coalesce(sum(like_count),0)::numeric / 50)
      into v_m, v_l
      from public.posts where place_name is not null and place_name ilike '%' || r.name || '%';
    -- 댓글합 (fan-out 방지 위해 별도 집계)
    select least(1, count(*)::numeric / 34) into v_c
      from public.comments c join public.posts p on p.id = c.post_id
     where p.place_name is not null and p.place_name ilike '%' || r.name || '%';
    v_sc := round((coalesce(v_m,0)*0.45 + coalesce(v_l,0)*0.30 + coalesce(v_c,0)*0.25) * 2, 3);
    update public.stores set w_score = v_sc where id = r.id and w_score is distinct from v_sc;
    cnt := cnt + 1;
  end loop;
  return cnt;
end $$;
revoke all on function public.refresh_w_scores() from anon, public;   -- 관리자/크론(수집기)만

-- ── 4) 매장 N지수 헬퍼 (place_analysis 최신행 → 0~2) ────────────────────────
create or replace function public._n_score(p_store uuid)
returns numeric language sql stable security definer set search_path=public as $$
  select coalesce(round((coalesce(n1,0)*0.40 + coalesce(n2,0)*0.35 + coalesce(n3,0)*0.25) * 2, 3), 0)
    from public.place_analysis where store_id = p_store
   order by analyzed_at desc nulls last limit 1;
$$;

-- ── 5) 활성 광고 공개 조회 (옥션 정렬 + 키워드 필터). 입찰가/소유자 비노출. ──────
--   p_keyword=null  : 전체 활성광고, "가중 랜덤" 순서(노출빈도 경쟁) — 배너/인피드/스토어 부스트용.
--   p_keyword 지정  : 해당 키워드 매칭 플레이스 광고만, "점수 내림차순"(상위노출 경쟁) + matched keyword 반환.
drop function if exists public.active_ads_public();
drop function if exists public.active_ads_public(text);
create or replace function public.active_ads_public(p_keyword text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare res jsonb;
begin
  select coalesce(jsonb_agg(j order by ord), '[]'::jsonb) into res
  from (
    select
      jsonb_build_object(
        'id', a.id, 'format', a.format, 'headline', a.headline,
        'banner_image', a.banner_image, 'store_id', a.store_id,
        'keyword', k.keyword,
        'stores', case when s.id is null then null else jsonb_build_object(
            'name', s.name, 'category', s.category, 'rating', s.rating,
            'review_count', s.review_count, 'address', s.address, 'photo', s.photo) end
      ) as j,
      case when p_keyword is null
           then -ln(random()) / greatest(sc.score, 0.001)  -- 지수가중 샘플링(점수 클수록 앞쪽 확률↑). ⚠️부호 필수: ln(random())=음수라 부호 없으면 저점수가 상위로 반전됨
           else -sc.score                                  -- 키워드: 점수순 결정적
      end as ord
    from public.ads a
    left join public.stores s on s.id = a.store_id
    left join lateral (
      select kk.keyword, kk.bid_amount
        from public.ad_keywords kk
       where p_keyword is not null and kk.ad_id = a.id
         and kk.keyword ilike '%' || p_keyword || '%'
       order by kk.bid_amount desc limit 1
    ) k on true
    cross join lateral (
      select (coalesce(
                case when a.format = 'banner'        then a.monthly_fee
                     when p_keyword is not null       then k.bid_amount
                     else a.bid_amount end, 0))
             * (1 + (public._n_score(a.store_id) + coalesce(s.w_score, 0)) / 2) as score
    ) sc
    where a.status = 'active'
      and (p_keyword is null
           or (a.format in ('place','rank') and k.keyword is not null))
    order by ord
    limit 50
  ) q;
  return res;
end $$;
revoke all on function public.active_ads_public(text) from public;
grant execute on function public.active_ads_public(text) to anon, authenticated;

-- ── 6) 클릭/노출 기록 + 과금 (키워드별 단가, 배너는 클릭과금 제외=정액) ──────────
drop function if exists public.log_ad_event(uuid, text);
drop function if exists public.log_ad_event(uuid, text, text);
create or replace function public.log_ad_event(p_ad_id uuid, p_type text, p_keyword text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_format text; v_status text; v_bid int; v_owner uuid; v_store uuid;
        v_admin boolean; v_bal int; v_new int; v_charge int;
begin
  if p_type not in ('impression','click') then return; end if;
  select format, status, coalesce(bid_amount,0), owner_id, store_id
    into v_format, v_status, v_bid, v_owner, v_store
    from public.ads where id = p_ad_id;
  if not found then return; end if;
  insert into public.ad_events(ad_id, store_id, type, keyword) values (p_ad_id, v_store, p_type, p_keyword);

  -- 배너(banner)는 정액제 → 클릭당 과금 없음. CPC 포맷만 과금.
  if p_type = 'click' and v_format in ('rank','place','infeed') and v_status = 'active' then
    -- 단가: 플레이스+키워드면 그 키워드 단가, 아니면 기본 입찰가
    if v_format in ('place','rank') and p_keyword is not null then
      select bid_amount into v_charge from public.ad_keywords
       where ad_id = p_ad_id and keyword ilike '%' || p_keyword || '%'
       order by bid_amount desc limit 1;
    end if;
    v_charge := coalesce(v_charge, v_bid);
    if v_charge <= 0 then return; end if;

    select coalesce(is_admin,false) into v_admin from public.profiles where id = v_owner;
    if v_admin then return; end if;                          -- 개발자 무제한
    perform public._expire_free(v_owner);
    select ad_balance into v_bal from public.profiles where id = v_owner for update;
    v_bal := coalesce(v_bal, 0);
    v_new := greatest(v_bal - v_charge, 0);
    update public.profiles set ad_balance = v_new, ad_free = greatest(0, ad_free - (v_bal - v_new)) where id = v_owner;  -- 무료 우선
    insert into public.ad_ledger(user_id, type, amount, balance_after, ref, memo)
      values (v_owner, 'deduct', -(v_bal - v_new), v_new, p_ad_id::text,
              case when p_keyword is not null then '클릭 광고비 (' || p_keyword || ')' else '클릭 광고비' end);
    if v_new <= 0 then
      update public.ads set status = 'paused' where id = p_ad_id;
      update public.stores set is_ad = false, ad_weight = 0 where id = v_store;
    end if;
  end if;
end $$;
revoke all on function public.log_ad_event(uuid, text, text) from public;
grant execute on function public.log_ad_event(uuid, text, text) to anon, authenticated;

-- ── 7) 🔐 키워드 단가 동결 — 광고주가 active 광고의 키워드 단가를 낮춰 CPC 회피 차단 ──────────
create or replace function public.adkw_guard_bid()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated','anon')
     and exists (select 1 from public.ads a where a.id = old.ad_id and a.status = 'active') then
    new.bid_amount := old.bid_amount;
  end if;
  return new;
end; $$;
drop trigger if exists trg_adkw_guard_bid on public.ad_keywords;
create trigger trg_adkw_guard_bid before update on public.ad_keywords
  for each row execute function public.adkw_guard_bid();

notify pgrst, 'reload schema';

-- ========================== [3] 32_geo_targeting_v2 ========================
-- 32_geo_targeting_v2.sql — 다중 읍면동 + 반경 조합(OR) 타게팅 + 춘천밖 집주소 폴백.
-- ⚠️ Supabase SQL Editor 에서 Run. 멱등. 31을 안 돌렸어도 이 파일만으로 자족(관련 컬럼 재정의).

-- (1) 광고 타게팅 컬럼 — 31 것 포함 재선언(자족) + 다중동 배열 신규.
alter table public.ads add column if not exists starts_at        timestamptz;
alter table public.ads add column if not exists target_gender    text;
alter table public.ads add column if not exists target_age_min   int;
alter table public.ads add column if not exists target_age_max   int;
alter table public.ads add column if not exists target_radius_km numeric;      -- null=반경무관, 매장좌표 기준 1~5km
alter table public.ads add column if not exists target_dongs     text[];       -- null/빈=동 제한없음, 여러 동 OR
alter table public.ads add column if not exists target_dong      text;         -- (구) 단일동 — 하위호환용, 신규는 target_dongs 사용

-- (2) 프로필: 집주소(춘천 밖 접속 시 커뮤니티·광고 폴백 기준) + 인구통계.
alter table public.profiles add column if not exists home_dong  text;            -- 집 동네(읍면동)
alter table public.profiles add column if not exists home_lat   double precision; -- 집 좌표(폴백 거리계산)
alter table public.profiles add column if not exists home_lng   double precision;
alter table public.profiles add column if not exists birth_year int;             -- 출생연도(나이 타게팅)
alter table public.profiles add column if not exists gender     text;            -- 'male'/'female'/null

-- (3) 광고 노출 RPC 확장 — 24의 옥션 로직(가중랜덤/키워드점수) 그대로 유지 +
--     타게팅 필드·매장좌표·일정창(now 사이) 추가. 실제 매칭은 클라이언트(뷰어 실시간위치=GPS/집주소 폴백은 서버가 모름).
drop function if exists public.active_ads_public();
drop function if exists public.active_ads_public(text);
create or replace function public.active_ads_public(p_keyword text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare res jsonb;
begin
  select coalesce(jsonb_agg(j order by ord), '[]'::jsonb) into res
  from (
    select
      jsonb_build_object(
        'id', a.id, 'format', a.format, 'headline', a.headline,
        'banner_image', a.banner_image, 'store_id', a.store_id,
        'keyword', k.keyword,
        -- 타게팅(클라 필터용)
        'target_gender', a.target_gender, 'target_age_min', a.target_age_min, 'target_age_max', a.target_age_max,
        'target_dongs', a.target_dongs, 'target_dong', a.target_dong, 'target_radius_km', a.target_radius_km,
        'store_lat', s.lat, 'store_lng', s.lng,
        'stores', case when s.id is null then null else jsonb_build_object(
            'name', s.name, 'category', s.category, 'rating', s.rating,
            'review_count', s.review_count, 'address', s.address, 'photo', s.photo,
            'lat', s.lat, 'lng', s.lng) end
      ) as j,
      case when p_keyword is null
           then -ln(random()) / greatest(sc.score, 0.001)  -- 지수가중 샘플링
           else -sc.score                                  -- 키워드: 점수순 결정적
      end as ord
    from public.ads a
    left join public.stores s on s.id = a.store_id
    left join lateral (
      select kk.keyword, kk.bid_amount
        from public.ad_keywords kk
       where p_keyword is not null and kk.ad_id = a.id
         and kk.keyword ilike '%' || p_keyword || '%'
       order by kk.bid_amount desc limit 1
    ) k on true
    cross join lateral (
      select (coalesce(
                case when a.format = 'banner'        then a.monthly_fee
                     when p_keyword is not null       then k.bid_amount
                     else a.bid_amount end, 0))
             * (1 + (public._n_score(a.store_id) + coalesce(s.w_score, 0)) / 2) as score
    ) sc
    where a.status = 'active'
      and (a.starts_at is null or a.starts_at <= now())         -- 광고 시작일 창
      and (a.ends_at   is null or a.ends_at   >= now())         -- 광고 종료일 창
      and (p_keyword is null
           or (a.format in ('place','rank') and k.keyword is not null))
    order by ord
    limit 50
  ) q;
  return res;
end $$;
revoke all on function public.active_ads_public(text) from public;
grant execute on function public.active_ads_public(text) to anon, authenticated;

-- (4) 서버측 매칭 헬퍼(방어/향후용) — 다중동 배열 + 집주소 폴백 반영. 미로그인/미상=노출(도달 극대화).
--     활성 경로는 클라이언트 필터지만, 정의만 있던 31의 profiles.dong 참조 버그를 home_dong으로 교정.
create or replace function public.ad_matches_viewer(
  p_gender text, p_age_min int, p_age_max int, p_dongs text[], p_radius_km numeric,
  p_store_lat numeric, p_store_lng numeric, p_view_lat numeric, p_view_lng numeric
) returns boolean language plpgsql stable security definer set search_path=public as $$
declare v_by int; v_g text; v_dong text; v_age int; v_km numeric; v_ok boolean;
begin
  select birth_year, gender, home_dong into v_by, v_g, v_dong from public.profiles where id = auth.uid();
  if p_gender is not null and p_gender <> 'all' and v_g is not null and v_g <> p_gender then return false; end if;
  if v_by is not null then
    v_age := extract(year from now())::int - v_by;
    if p_age_min is not null and v_age < p_age_min then return false; end if;
    if p_age_max is not null and v_age > p_age_max then return false; end if;
  end if;
  -- 지역: 다중동 OR 반경(둘 중 하나라도 충족). 둘 다 미설정=지역제한 없음.
  if (p_dongs is not null and array_length(p_dongs,1) > 0) or p_radius_km is not null then
    v_ok := false;
    if p_dongs is not null and v_dong is not null and v_dong = any(p_dongs) then v_ok := true; end if;
    if not v_ok and p_radius_km is not null and p_store_lat is not null and p_view_lat is not null then
      v_km := 6371 * acos( least(1, greatest(-1,
        cos(radians(p_store_lat))*cos(radians(p_view_lat))*cos(radians(p_view_lng)-radians(p_store_lng))
        + sin(radians(p_store_lat))*sin(radians(p_view_lat)) )));
      if v_km <= p_radius_km then v_ok := true; end if;
    end if;
    -- 뷰어 정보 부족(동·위치 모두 모름)=노출
    if v_dong is null and p_view_lat is null then v_ok := true; end if;
    if not v_ok then return false; end if;
  end if;
  return true;
end $$;
grant execute on function public.ad_matches_viewer(text,int,int,text[],numeric,numeric,numeric,numeric,numeric) to anon, authenticated;

notify pgrst, 'reload schema';

-- ========================== [4] 29_superadmin (A~4, Z 제외) ================
-- 29_superadmin.sql — 슈퍼관리자(is_admin) 콘솔용 RPC + 보안 하드닝.
-- 관리자 RPC는 전부 SECURITY DEFINER + is_admin() 게이트. is_admin()은 25/28에서 생성.
-- ⚠️ Supabase SQL Editor 에 통째로 붙여넣고 Run. 멱등(여러 번 실행 안전).
--    한 트랜잭션이라 중간에 하나라도 에러나면 전체 취소됨 → 에러 뜨면 그 메시지 그대로 알려줘.

-- ========================================================================
-- (0) is_admin 컬럼 보장 (is_admin()이 읽는 컬럼).
-- ========================================================================
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- ========================================================================
-- (A) 🔐 남 비즈머니 잔액 열람 차단 + 본인/관리자 조회 RPC
--     Supabase 기본 grant 가 테이블단위라 남의 ad_balance 를 로그인 유저 누구나 읽을 수 있었음.
-- ========================================================================
revoke select (ad_balance) on public.profiles from authenticated, anon;
revoke update (is_admin)   on public.profiles from authenticated, anon;

-- 본인 전체행(잔액/관리자여부 포함) — SECURITY DEFINER 라 컬럼회수 우회.
create or replace function public.my_profile()
returns json language sql stable security definer set search_path = public as $$
  select to_json(p) from public.profiles p where p.id = auth.uid();
$$;
revoke all on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- 관리자 전용 유저목록(비즈머니 충전 대상) — is_admin 게이트.
create or replace function public.admin_list_users(p_q text default null)
returns table(id uuid, nickname text, role text, ad_balance int, is_admin boolean, biz_verified boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select p.id, p.nickname::text, p.role::text,
           coalesce(p.ad_balance, 0)::int, coalesce(p.is_admin, false), coalesce(p.biz_verified, false)
    from public.profiles p
    where p_q is null or btrim(p_q) = '' or p.nickname ilike '%' || btrim(p_q) || '%'
    order by coalesce(p.ad_balance, 0) desc
    limit 40;
end; $$;
revoke all on function public.admin_list_users(text) from public, anon;
grant execute on function public.admin_list_users(text) to authenticated;

-- ========================================================================
-- (B) 🔐 권한상승 차단 트리거 — authenticated/anon 세션이 신뢰필드를 직접 바꾸면 안전값 강제.
--     (컬럼 grant/RLS 우회와 무관. 관리자 RPC·service_role·SQL Editor 는 current_user 가 달라 통과.)
-- ========================================================================
create or replace function public.profiles_guard_privileged()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if TG_OP = 'UPDATE' then
      new.is_admin        := old.is_admin;
      new.ad_balance      := old.ad_balance;
      new.biz_verified    := old.biz_verified;
      new.company_id      := old.company_id;
      new.place_plan      := old.place_plan;
      new.place_pass_until := old.place_pass_until;
      -- role 은 동결 안 함: 손님↔사장님 전환은 set_role 로 사용자가 바꾸는 정상 기능(권한은 biz_verified·매장소유로 게이팅).
    elsif TG_OP = 'INSERT' then
      new.is_admin     := false;
      new.biz_verified := false;
      new.ad_balance   := 0;
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard before insert or update on public.profiles
  for each row execute function public.profiles_guard_privileged();

-- ========================================================================
-- (C) 🔐 승인된 광고 입찰가 동결 — 광고주가 자기 active 광고 bid 를 0으로 낮춰 무료노출·CPC회피 차단.
-- ========================================================================
create or replace function public.ads_guard_active_bid()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and old.status = 'active' then
    new.bid_amount  := old.bid_amount;
    new.monthly_fee := old.monthly_fee;
  end if;
  return new;
end; $$;
drop trigger if exists trg_ads_guard_bid on public.ads;
create trigger trg_ads_guard_bid before update on public.ads
  for each row execute function public.ads_guard_active_bid();

-- ========================================================================
-- (D) 매장 부스트 재계산 — 광고 하나 승인/반려/정지가 매장의 다른 활성광고 부스트를
--     덮어쓰거나 끄지 않도록, 매장의 'active non-banner 광고 집합'에서 도출.
-- ========================================================================
create or replace function public.recompute_store_boost(p_store uuid)
returns void language plpgsql security definer set search_path = public as $$
declare w int;
begin
  select coalesce(max(
           case when a.plan = 'bid' then least(round(coalesce(a.bid_amount,0) / 500.0)::int, 18)
                when coalesce(a.monthly_fee,0) >= 90000 then 12
                when coalesce(a.monthly_fee,0) >= 50000 then 8 else 5 end
         ), 0)
    into w
  from public.ads a
  where a.store_id = p_store and a.status = 'active' and coalesce(a.format,'') <> 'banner';
  update public.stores set is_ad = (w > 0), ad_weight = w where id = p_store;
end; $$;

-- ========================================================================
-- (1) 비즈머니 임의 충전 — 관리자만.
-- ========================================================================
create or replace function public.admin_credit_ad_balance(p_user uuid, p_amount int, p_memo text default '관리자 충전')
returns int language plpgsql security definer set search_path = public as $$
declare v_after int;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.profiles set ad_balance = coalesce(ad_balance, 0) + p_amount where id = p_user
    returning ad_balance into v_after;
  if v_after is null then raise exception 'user not found'; end if;
  begin
    insert into public.ad_ledger(user_id, type, amount, balance_after, ref, memo)
    values (p_user, 'charge', p_amount, v_after, 'admin', p_memo);
  exception when others then null; end;
  return v_after;
end; $$;
revoke all on function public.admin_credit_ad_balance(uuid, int, text) from public, anon;
grant execute on function public.admin_credit_ad_balance(uuid, int, text) to authenticated;

-- ========================================================================
-- (2) 광고 승인·활성화 — 관리자만.
-- ========================================================================
create or replace function public.admin_activate_ad(p_ad uuid, p_days int default 30)
returns text language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select id, store_id into r from public.ads where id = p_ad;
  if r.id is null then raise exception 'ad not found'; end if;
  update public.ads set status = 'active', starts_at = now(), ends_at = now() + (p_days || ' days')::interval where id = p_ad;
  perform public.recompute_store_boost(r.store_id);
  return 'active';
end; $$;
revoke all on function public.admin_activate_ad(uuid, int) from public, anon;
grant execute on function public.admin_activate_ad(uuid, int) to authenticated;

-- ========================================================================
-- (3) 광고 반려/일시정지/재검수 — 관리자만.
-- ========================================================================
create or replace function public.admin_set_ad_status(p_ad uuid, p_status text, p_reason text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_store uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('rejected', 'paused', 'under_review') then raise exception 'bad status'; end if;
  select store_id into v_store from public.ads where id = p_ad;
  update public.ads set status = p_status,
         reject_reason = case when p_status = 'rejected' then p_reason else reject_reason end
   where id = p_ad;
  if v_store is not null then perform public.recompute_store_boost(v_store); end if;
  return p_status;
end; $$;
revoke all on function public.admin_set_ad_status(uuid, text, text) from public, anon;
grant execute on function public.admin_set_ad_status(uuid, text, text) to authenticated;

-- ========================================================================
-- (4) reports(신고/문의) — 관리자 SELECT + 신고 INSERT 정책(순서안전).
-- ========================================================================
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='reports') then
    execute 'alter table public.reports enable row level security';
    execute 'drop policy if exists reports_admin_read on public.reports';
    execute 'create policy reports_admin_read on public.reports for select to authenticated using (public.is_admin() or reporter_id = auth.uid())';
    if not exists (select 1 from pg_policies where schemaname='public' and tablename='reports' and cmd='INSERT') then
      execute 'create policy reports_insert_self on public.reports for insert to authenticated with check (reporter_id = auth.uid())';
    end if;
  end if;
end $$;

notify pgrst, 'reload schema';


-- ========================== [9] 보안: anon 민감테이블 권한 회수 =================
-- 검증 CONFIRMED: payments·billing_keys·ad_ledger·messages·conversations·notifications 가
-- anon 테이블 SELECT grant를 보유(현재 0행이나 RLS 한 번 어긋나면 카드토큰·결제·DM 유출).
-- 앱/웹은 로그인(authenticated) 후에만 조회 → anon 회수는 무영향(회귀 0). profiles 사고와 동일 패턴.
revoke select, insert, update, delete on public.payments      from anon;
revoke select, insert, update, delete on public.billing_keys  from anon;
revoke select, insert, update, delete on public.ad_ledger     from anon;
revoke select, insert, update, delete on public.messages      from anon;
revoke select, insert, update, delete on public.conversations from anon;
revoke select, insert, update, delete on public.notifications from anon;
notify pgrst, 'reload schema';

-- ── (읽기전용 확인 쿼리) 회수만으론 부족 — RLS가 실제 켜졌고 정책이 본인/참여자 한정인지 확인하세요.
-- select relname, relrowsecurity from pg_class
--   where relname in ('payments','billing_keys','ad_ledger','messages','conversations','notifications');
-- select tablename, policyname, cmd, qual from pg_policies
--   where tablename in ('payments','billing_keys','messages','conversations');
-- ↑ relrowsecurity=false 인 테이블이 있으면 그게 진짜 구멍 → 그 테이블 RLS enable + 본인행 정책 필요(리포트 참고).


-- ============================================================================
--  [제외] 29의 (Z) 슈퍼관리자 재지정 — 아래는 자동실행 안 함(락아웃 위험).
--  wavely1213@motmot.co.kr(폐도메인 추정) 하나만 관리자로 남기고 나머지 강등하는 블록.
--  본인 관리자 이메일(예: mulgyeoli2@gmail.com)을 확인·수정한 뒤에만 수동 실행하세요.
-- ============================================================================
