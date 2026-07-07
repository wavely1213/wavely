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
