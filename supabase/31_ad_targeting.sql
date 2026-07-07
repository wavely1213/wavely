-- 31_ad_targeting.sql — 광고 자유금액·일정·타게팅 기반 컬럼. ⚠️ Supabase SQL Editor Run. 멱등.

-- (1) ads: 일정(시작·종료는 기존 ends_at) + 타게팅 조건. null = 제한 없음(전체).
alter table public.ads add column if not exists starts_at       timestamptz;   -- 광고 시작일(null=즉시)
alter table public.ads add column if not exists target_gender   text;          -- null/'all'=전체, 'male','female'
alter table public.ads add column if not exists target_age_min  int;           -- null=전체
alter table public.ads add column if not exists target_age_max  int;
alter table public.ads add column if not exists target_dong     text;          -- null=춘천 전체, 특정 읍·면·동
alter table public.ads add column if not exists target_radius_km numeric;       -- null=반경무관, 매장 좌표 기준 반경(km, 1~10)

-- (2) profiles: 타게팅용 뷰어 속성(선택 입력 — 내 정보 수정/가입에서). 모르면 targeting 통과(노출).
alter table public.profiles add column if not exists birth_year int;            -- 출생연도(나이 계산)
alter table public.profiles add column if not exists gender     text;           -- 'male'/'female'/null

-- (3) 뷰어 프로필로 광고 타게팅 매칭 판정 헬퍼(SECURITY DEFINER — 남 profiles 안 열고 서버서 판정).
--     unknown(뷰어 정보 없음/미로그인)이면 true(노출) = 광고주 도달 극대화 + 빈 피드 방지.
create or replace function public.ad_matches_viewer(
  p_gender text, p_age_min int, p_age_max int, p_dong text, p_radius_km numeric,
  p_store_lat numeric, p_store_lng numeric, p_view_lat numeric, p_view_lng numeric
) returns boolean language plpgsql stable security definer set search_path=public as $$
declare v_by int; v_g text; v_dong text; v_age int; v_km numeric;
begin
  select birth_year, gender, dong into v_by, v_g, v_dong from public.profiles where id = auth.uid();
  -- 성별
  if p_gender is not null and p_gender <> 'all' and v_g is not null and v_g <> p_gender then return false; end if;
  -- 나이(출생연도로 대략): 모르면 통과
  if v_by is not null then
    v_age := extract(year from now())::int - v_by;
    if p_age_min is not null and v_age < p_age_min then return false; end if;
    if p_age_max is not null and v_age > p_age_max then return false; end if;
  end if;
  -- 지역: 특정 읍면동 지정 시 뷰어 동과 일치해야(뷰어 동 모르면 통과)
  if p_dong is not null and v_dong is not null and btrim(v_dong) <> '' and lower(btrim(v_dong)) <> lower(btrim(p_dong)) then return false; end if;
  -- 반경: 매장 좌표 기준, 뷰어 위치 있을 때만. 하버사인(km)
  if p_radius_km is not null and p_store_lat is not null and p_view_lat is not null then
    v_km := 6371 * acos( least(1, greatest(-1,
      cos(radians(p_store_lat))*cos(radians(p_view_lat))*cos(radians(p_view_lng)-radians(p_store_lng))
      + sin(radians(p_store_lat))*sin(radians(p_view_lat)) )));
    if v_km > p_radius_km then return false; end if;
  end if;
  return true;
end $$;
grant execute on function public.ad_matches_viewer(text,int,int,text,numeric,numeric,numeric,numeric,numeric) to anon, authenticated;

notify pgrst, 'reload schema';
