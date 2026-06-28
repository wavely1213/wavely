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
           then ln(random()) / greatest(sc.score, 0.001)   -- 가중 랜덤(점수 클수록 앞쪽 확률↑)
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

notify pgrst, 'reload schema';
