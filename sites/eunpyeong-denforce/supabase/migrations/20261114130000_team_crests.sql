-- 상대팀 엠블럼 DB (D-094, I-048) — 코드(src/config/team-crests.ts)의 목록은 기본값으로 남고, 이 표의 줄이 같은 팀(이름/별칭)을 덮는다.
-- 관리자 › 경기 › 상대팀 엠블럼에서 올린다(최고 관리자/관리자). 파일은 media 버킷 crests/ 또는 드라이브 자료함(media/drive/).
-- 누구나 읽기(공개 화면), 쓰기는 관리자만. 다시 실행해도 된다.

create table if not exists public.team_crests (
  id uuid primary key default gen_random_uuid(),
  -- 대표 이름 (경기 데이터의 지금 이름)
  name text not null unique check (length(name) between 1 and 40),
  -- 예전 이름, 줄인 이름
  aliases text[] not null default '{}' check (cardinality(aliases) <= 10),
  -- 기본(어두운 면) 파일 — 비우면 코드 기본값(있으면) 또는 대체 방패
  file_url text check (file_url is null or length(file_url) <= 1000),
  -- 흰 면용 파일 — 흰 면에서 안 보이는 로고만 (인천ZD 흰 글씨 로고)
  file_on_light_url text check (file_on_light_url is null or length(file_on_light_url) <= 1000),
  -- 원본 픽셀 크기 (비율 그대로 보이게) — 올릴 때 파일에서 읽는다
  width integer check (width is null or width between 1 and 10000),
  height integer check (height is null or height between 1 and 10000),
  source text check (source is null or length(source) <= 300),
  note text not null default '' check (length(note) <= 500),
  updated_at timestamptz not null default now(),
  constraint team_crests_size_pair check ((width is null) = (height is null))
);

alter table public.team_crests enable row level security;

drop policy if exists team_crests_public_read on public.team_crests;
create policy team_crests_public_read on public.team_crests for select to anon, authenticated using (true);
drop policy if exists team_crests_admin_write on public.team_crests;
create policy team_crests_admin_write on public.team_crests for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.team_crests to anon, authenticated;
grant insert, update, delete on public.team_crests to authenticated;
