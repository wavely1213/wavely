-- 축제 공개알림 — 프로그램·참여업체가 공식 공개되면 알려달라는 신청을 받아둔다.
-- 왜: 축제탭의 '타임테이블'·'매장' 탭이 아직 "준비 중"만 띄운다. 기다리라고만 하면 빈 화면이
--     아무 일도 안 한다. 공개 시점에 연락할 대상을 미리 모아두면 그 화면이 일을 하게 된다.
--
-- 이 테이블이 없으면 소비자웹은 버튼을 아예 그리지 않는다(festFeatures() 기능감지).
-- 즉 이 SQL을 돌리기 전까지는 화면이 지금과 똑같고, 돌리는 순간 버튼이 나타난다.

create table if not exists public.festival_interests (
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('program', 'store')),
  created_at timestamptz not null default now(),
  primary key (user_id, kind)
);

alter table public.festival_interests enable row level security;

-- 본인 것만 보고, 본인 것만 넣고, 본인 것만 뺀다.
drop policy if exists fi_select_own on public.festival_interests;
create policy fi_select_own on public.festival_interests
  for select using (auth.uid() = user_id);

drop policy if exists fi_insert_own on public.festival_interests;
create policy fi_insert_own on public.festival_interests
  for insert with check (auth.uid() = user_id);

drop policy if exists fi_delete_own on public.festival_interests;
create policy fi_delete_own on public.festival_interests
  for delete using (auth.uid() = user_id);

grant select, insert, delete on public.festival_interests to authenticated;

-- 확인
select 'festival_interests 준비 완료' as status;

-- 나중에 공개할 때 대상 뽑는 법(참고):
--   select kind, count(*) from public.festival_interests group by kind;
--   select u.email from auth.users u
--     join public.festival_interests fi on fi.user_id = u.id
--    where fi.kind = 'program';
