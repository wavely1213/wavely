-- 08_place_analysis.sql
-- 온디맨드 종합분석(버튼 누르면 수집 시작) — adlog식.
-- 구조: 와벨리가 요청을 큐에 넣음 → 집 PC 수집기가 폴링해서 수집·N지수 계산·결과 적재 → 와벨리가 표시.
-- (스크래핑은 와벨리/클라우드 불가 → 반드시 가정IP 수집기가 처리)

------------------------------------------------------------
-- 1) 종합분석 요청 큐
------------------------------------------------------------
create table if not exists public.place_analysis_requests (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores(id) on delete cascade,
  status       text not null default 'pending',   -- pending | running | done | failed
  requested_by uuid,
  requested_at timestamptz default now(),
  finished_at  timestamptz,
  error        text
);
create index if not exists par_pending_idx on public.place_analysis_requests (status, requested_at);

------------------------------------------------------------
-- 2) 종합분석 결과 스냅샷 (매장 단위 — N지수 등). 키워드별 순위/변화는 place_rankings 사용.
------------------------------------------------------------
create table if not exists public.place_analysis (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references public.stores(id) on delete cascade,
  place_id       text,
  n1             numeric,   -- N1 지수
  n2             numeric,   -- N2 지수
  n3             numeric,   -- N3 지수
  save_count     int,       -- 저장수
  visitor_review int,       -- 방문자 리뷰수
  blog_review    int,       -- 블로그/카페 리뷰수
  keyword_count  int,       -- 추적 키워드 수
  exposed_count  int,       -- 순위권(노출) 키워드 수
  best_rank      int,       -- 최고 순위
  avg_rank       numeric,   -- 평균 순위
  analyzed_at    timestamptz default now()
);
create index if not exists place_analysis_store_idx on public.place_analysis (store_id, analyzed_at desc);

------------------------------------------------------------
-- 3) RLS
------------------------------------------------------------
alter table public.place_analysis_requests enable row level security;
alter table public.place_analysis          enable row level security;

-- 요청: 소유자만 자기 매장 요청 insert/select. 상태변경(running/done)은 수집기(service_role)가 RLS 우회.
drop policy if exists par_insert on public.place_analysis_requests;
create policy par_insert on public.place_analysis_requests for insert
  with check (exists (select 1 from public.stores s
                      where s.id = store_id and s.owner_id = auth.uid()
                        and coalesce(s.biz_verified,false) = true));
drop policy if exists par_select on public.place_analysis_requests;
create policy par_select on public.place_analysis_requests for select
  using (exists (select 1 from public.stores s
                 where s.id = store_id
                   and (s.owner_id = auth.uid()
                        or coalesce((select is_admin from public.profiles where id=auth.uid()),false))));

-- 결과: 소유자/관리자만 조회. 적재는 수집기(service_role)가 RLS 우회.
drop policy if exists pa_select on public.place_analysis;
create policy pa_select on public.place_analysis for select
  using (exists (select 1 from public.stores s
                 where s.id = store_id
                   and (s.owner_id = auth.uid()
                        or coalesce((select is_admin from public.profiles where id=auth.uid()),false))));

notify pgrst, 'reload schema';

------------------------------------------------------------
-- 4) 수집기(집 PC) 워커 명세 — 이걸 구현해야 버튼이 실제로 동작함
--   루프(예: 10~20초 간격):
--   a) select * from place_analysis_requests where status='pending' order by requested_at limit 1;
--   b) update ... set status='running' where id=:id;  (service_role 키 사용)
--   c) 해당 store 의 naver_place_id 로 종합 수집 (adlog식 — 키워드 자동 발견):
--        - place_id가 노출되는 키워드 전체를 자동 탐색(사용자가 키워드 미지정해도 OK)
--        - 키워드별 오가닉 순위(rank) → place_rankings upsert (store_id,keyword,snap_date)
--          (place_rank_keywords[사용자 고정 키워드]는 선택사항 — 있으면 우선/병합, 없어도 자동탐색)
--        - 저장수/방문리뷰/블로그 + N1~3 지수 계산 → place_analysis insert
--   d) update ... set status='done', finished_at=now() where id=:id;  (실패 시 status='failed', error=...)
--   RATE 제한(2.5~5초 간격, 일일3000) 준수. service_role 키는 수집기 .env 에만.
