-- ============================================================
--  와벨리 — stores.n_score 캐시 컬럼 + place_analysis 자동 동기화
--  소비자웹 우리동네 랭킹이 N지수를 읽을 수 있게 캐시(w_score와 동형).
--  Supabase > SQL Editor 붙여넣기 → RUN. idempotent.
--  선행: 24_ad_auction_keywords.sql (_n_score 함수 + stores.w_score).
--
--  _n_score()가 이미 (n1·0.40 + n2·0.35 + n3·0.25)×2 로 계산 → 그대로 재사용(옥션과 100% 일치).
--  분석(place_analysis)이 들어오는 매장만 n_score>0 (현재 커버리지=분석요청 매장). 나머지는 0→거리·별점·리뷰 폴백.
-- ============================================================

-- 0) _n_score 헬퍼(24와 동일) — 24 미적용 대비 자체 생성(idempotent)
create or replace function public._n_score(p_store uuid)
returns numeric language sql stable security definer set search_path=public as $$
  select coalesce(round((coalesce(n1,0)*0.40 + coalesce(n2,0)*0.35 + coalesce(n3,0)*0.25) * 2, 3), 0)
    from public.place_analysis where store_id = p_store
   order by analyzed_at desc nulls last limit 1;
$$;

-- 1) N지수 캐시 컬럼 (0~2, w_score와 동형)
alter table public.stores add column if not exists n_score numeric not null default 0;

-- 2) place_analysis insert/update 시 stores.n_score 자동 갱신 (기존 _n_score 재사용)
create or replace function public.sync_store_nscore()
returns trigger language plpgsql security definer set search_path=public as $$
declare v numeric;
begin
  v := coalesce(public._n_score(NEW.store_id), 0);
  update public.stores set n_score = v
   where id = NEW.store_id and n_score is distinct from v;
  return NEW;
end $$;

drop trigger if exists trg_sync_store_nscore on public.place_analysis;
create trigger trg_sync_store_nscore
  after insert or update on public.place_analysis
  for each row execute function public.sync_store_nscore();

-- 3) 기존 분석매장 1회 백필
update public.stores s
   set n_score = coalesce(public._n_score(s.id), 0)
 where exists (select 1 from public.place_analysis pa where pa.store_id = s.id)
   and s.n_score is distinct from coalesce(public._n_score(s.id), 0);

notify pgrst, 'reload schema';

-- 확인(선택): select id,name,n_score,w_score from public.stores where n_score > 0 order by n_score desc limit 20;
