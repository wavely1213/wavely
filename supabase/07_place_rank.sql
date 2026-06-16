-- 07_place_rank.sql
-- 플레이스랭크(사장님 전용 네이버 순위 대시보드) — 와벨리 쪽 스키마.
-- 수집은 집 PC 수집기(Playwright)가 담당하고, 결과만 여기에 적재→사장님이 RLS로 본인것만 조회.
-- 적용: Supabase SQL Editor 또는 supabase db push.

------------------------------------------------------------
-- 1) 추적 키워드 (매장당 최대 5개 — 인증매장 소유자만)
------------------------------------------------------------
create table if not exists public.place_rank_keywords (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  keyword    text not null,
  created_at timestamptz default now()
);
create unique index if not exists place_rank_keywords_uq
  on public.place_rank_keywords (store_id, lower(keyword));

-- 매장당 5개 제한 (서버 강제)
create or replace function public.guard_keyword_limit()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (select count(*) from public.place_rank_keywords where store_id = new.store_id) >= 5 then
    raise exception '키워드는 매장당 최대 5개까지 등록할 수 있어요.';
  end if;
  return new;
end; $$;
drop trigger if exists trg_keyword_limit on public.place_rank_keywords;
create trigger trg_keyword_limit before insert on public.place_rank_keywords
  for each row execute function public.guard_keyword_limit();

------------------------------------------------------------
-- 2) 순위 스냅샷 (수집기가 service key로 upsert)
------------------------------------------------------------
create table if not exists public.place_rankings (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  keyword       text not null,
  rank          int,            -- 오가닉 순위(광고 제외). 미노출이면 null
  save_count    int,            -- 저장수
  visitor_review int,           -- 방문자 리뷰수
  blog_review   int,            -- 블로그/카페 리뷰수
  snap_date     date not null,
  created_at    timestamptz default now()
);
create unique index if not exists place_rankings_uq
  on public.place_rankings (store_id, keyword, snap_date);
create index if not exists place_rankings_store_kw_idx
  on public.place_rankings (store_id, keyword, snap_date desc);

------------------------------------------------------------
-- 3) RLS — 본인 매장(소유자) 또는 관리자만 조회. 키워드는 소유자가 관리.
------------------------------------------------------------
alter table public.place_rank_keywords enable row level security;
alter table public.place_rankings      enable row level security;

-- 소유 매장 판별 헬퍼(서브쿼리 인라인)
-- 키워드: 인증매장 소유자만 SELECT/INSERT/DELETE
drop policy if exists prk_select on public.place_rank_keywords;
create policy prk_select on public.place_rank_keywords for select
  using (exists (select 1 from public.stores s
                 where s.id = store_id
                   and (s.owner_id = auth.uid()
                        or coalesce((select is_admin from public.profiles where id=auth.uid()),false))));

drop policy if exists prk_insert on public.place_rank_keywords;
create policy prk_insert on public.place_rank_keywords for insert
  with check (exists (select 1 from public.stores s
                      where s.id = store_id and s.owner_id = auth.uid()
                        and coalesce(s.biz_verified,false) = true));

drop policy if exists prk_delete on public.place_rank_keywords;
create policy prk_delete on public.place_rank_keywords for delete
  using (exists (select 1 from public.stores s
                 where s.id = store_id and s.owner_id = auth.uid()));

-- 순위: 소유자/관리자만 SELECT. INSERT/UPDATE는 정책 없음 →
--       수집기는 service_role 키로 쓰므로 RLS 우회(정상). 일반 사용자는 쓰기 불가.
drop policy if exists pr_select on public.place_rankings;
create policy pr_select on public.place_rankings for select
  using (exists (select 1 from public.stores s
                 where s.id = store_id
                   and (s.owner_id = auth.uid()
                        or coalesce((select is_admin from public.profiles where id=auth.uid()),false))));

notify pgrst, 'reload schema';

------------------------------------------------------------
-- 4) 수집기(daily.py) 연동 메모
--   매일 수집 후, naver_place_id 가 채워진 stores + place_rank_keywords 를 읽어
--   각 (store, keyword) 의 순위를 스크랩 → place_rankings 에 (store_id,keyword,snap_date) upsert.
--   쓰기는 SUPABASE_SERVICE_ROLE_KEY 사용(RLS 우회). 키는 수집기 .env 에만 보관, 외부노출 금지.
