-- 배출 풋살 국가대표 — 구단소개 페이지 표를 관리자 화면(구단정보)에서 추가·수정·삭제 (D-043)
-- 전에는 src/data/club.ts NATIONAL_TEAM_ALUMNI 에 박혀 있던 11명을 그대로 옮긴다 (표가 비어 있을 때만).
create table public.national_team_alumni (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 30),
  -- FP(필드)·GK(골레이로) 등 — 짧은 표기
  position text not null default '' check (length(position) <= 10),
  -- 발탁 연도 (예: "2014, 2015, 2019")
  years text not null check (length(years) between 1 and 100),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text
);

create trigger national_team_alumni_audit before insert or update on public.national_team_alumni
  for each row execute function public.set_audit();

alter table public.national_team_alumni enable row level security;
create policy "national_team_alumni: 공개 조회" on public.national_team_alumni for select to anon, authenticated using (true);
create policy "national_team_alumni: 관리자 추가" on public.national_team_alumni for insert to authenticated with check (public.is_admin());
create policy "national_team_alumni: 관리자 수정" on public.national_team_alumni for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "national_team_alumni: 관리자 삭제" on public.national_team_alumni for delete to authenticated using (public.is_admin());

insert into public.national_team_alumni (name, position, years, sort_order)
select v.name, v.position, v.years, v.sort_order
from (values
  ('최경진', 'FP', '2013, 2014, 2017', 10),
  ('이우진', 'GK', '2014, 2015, 2019, 2020, 2021, 2022', 20),
  ('전원조', 'FP', '2014, 2015', 30),
  ('이경호', 'GK', '2014', 40),
  ('이주섭', 'FP', '2014', 50),
  ('박영재', 'FP', '2018', 60),
  ('조병걸', 'FP', '2018, 2019', 70),
  ('이안', 'FP', '2018, 2021', 80),
  ('이준원', 'FP', '2019, 2020, 2021', 90),
  ('이한울', 'FP', '2020, 2021, 2022', 100),
  ('강주광', 'FP', '2020, 2021, 2022', 110)
) as v(name, position, years, sort_order)
where not exists (select 1 from public.national_team_alumni);
