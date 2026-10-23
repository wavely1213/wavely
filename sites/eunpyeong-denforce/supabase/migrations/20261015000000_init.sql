-- 서울은평 덴포스 구단 사이트 — 초기 스키마
-- 공개 읽기: 누구나 / 쓰기: admins 허용 목록에 있고 이메일 인증된 로그인 사용자만 (RLS)
-- 적용: Supabase 대시보드 SQL Editor 에 붙여넣어 실행하거나 `supabase db push`

-- ─────────────────────────────────────────────
-- 관리자 허용 목록 + 권한 함수
-- ─────────────────────────────────────────────
create table public.admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

-- 로그인 사용자의 (인증 완료된) 이메일이 허용 목록에 있으면 true.
-- JWT 의 email 클레임만 믿지 않고 auth.users 의 email_confirmed_at 까지 확인한다.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.admins a on a.email = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 수정 시각·수정자 기록
create or replace function public.set_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', new.updated_by);
  return new;
end;
$$;

-- ─────────────────────────────────────────────
-- 구단 정보 (단일 행)
-- ─────────────────────────────────────────────
create table public.club_settings (
  id smallint primary key default 1 check (id = 1),
  intro text not null default '',
  contact_email text,
  contact_phone text,
  contact_address text,
  instagram_url text,
  youtube_url text,
  venue_address text,
  venue_transit text,
  venue_parking text,
  updated_at timestamptz not null default now(),
  updated_by text
);

create table public.history_items (
  id uuid primary key default gen_random_uuid(),
  year text not null check (length(year) between 1 and 20),
  text text not null check (length(text) between 1 and 300),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- ─────────────────────────────────────────────
-- 선수단
-- ─────────────────────────────────────────────
create table public.players (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  number integer check (number between 0 and 99),
  name text not null check (length(name) between 1 and 40),
  position text not null check (position in ('GK', 'FIXO', 'ALA', 'PIVO')),
  photo_url text,
  birth date,
  height_cm integer check (height_cm between 100 and 250),
  apps integer not null default 0 check (apps >= 0),
  goals integer not null default 0 check (goals >= 0),
  assists integer not null default 0 check (assists >= 0),
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by text
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  role text not null check (length(role) between 1 and 40),
  name text not null check (length(name) between 1 and 40),
  photo_url text,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- ─────────────────────────────────────────────
-- 경기 · 순위
-- ─────────────────────────────────────────────
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  competition text not null check (length(competition) between 1 and 60),
  round text not null default '' check (length(round) <= 30),
  kickoff timestamptz not null,
  venue text not null default '' check (length(venue) <= 60),
  is_home boolean not null default true,
  opponent text not null check (length(opponent) between 1 and 40),
  status text not null default 'scheduled' check (status in ('scheduled', 'finished')),
  score_us integer check (score_us between 0 and 99),
  score_them integer check (score_them between 0 and 99),
  updated_at timestamptz not null default now(),
  updated_by text,
  -- 불변식: 종료 경기는 스코어가 있고, 예정 경기는 스코어가 없다
  constraint matches_score_matches_status check (
    (status = 'finished' and score_us is not null and score_them is not null)
    or (status = 'scheduled' and score_us is null and score_them is null)
  )
);

create index matches_kickoff_idx on public.matches (kickoff);

-- 승점(3-1-0)과 경기 수는 승·무·패에서 계산 (BR-005)
create table public.standings (
  id uuid primary key default gen_random_uuid(),
  team text not null check (length(team) between 1 and 40),
  win integer not null default 0 check (win >= 0),
  draw integer not null default 0 check (draw >= 0),
  loss integer not null default 0 check (loss >= 0),
  goals_for integer not null default 0 check (goals_for >= 0),
  goals_against integer not null default 0 check (goals_against >= 0),
  played integer generated always as (win + draw + loss) stored,
  points integer generated always as (win * 3 + draw) stored,
  is_us boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- ─────────────────────────────────────────────
-- 구단소식
-- ─────────────────────────────────────────────
create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('notice', 'news', 'photo', 'video')),
  title text not null check (length(title) between 1 and 120),
  -- YYYY-MM-DD · 날짜를 모르면 YYYY 또는 빈 문자열
  date text not null default '' check (date ~ '^([0-9]{4}(-[0-9]{2}-[0-9]{2})?)?$'),
  thumbnail_url text,
  summary text not null default '' check (length(summary) <= 300),
  body text not null default '',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text
);

create index news_posts_category_idx on public.news_posts (category, date desc);

-- ─────────────────────────────────────────────
-- 스폰서
-- ─────────────────────────────────────────────
create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 60),
  tier text not null check (tier in ('naming', 'official', 'partner')),
  logo_url text,
  url text check (url is null or url ~ '^https?://'),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- ─────────────────────────────────────────────
-- 감사 트리거
-- ─────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['club_settings', 'history_items', 'players', 'staff', 'matches', 'standings', 'news_posts', 'sponsors']
  loop
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.set_audit()', t || '_audit', t);
  end loop;
end;
$$;

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table public.admins enable row level security;
create policy "admins: 관리자만 조회" on public.admins for select to authenticated using (public.is_admin());

do $$
declare t text;
begin
  foreach t in array array['club_settings', 'history_items', 'players', 'staff', 'matches', 'standings', 'sponsors']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || ': 공개 조회', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin())', t || ': 관리자 추가', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t || ': 관리자 수정', t);
    -- 구단 정보(club_settings)는 단일 행이라 삭제 정책을 만들지 않는다
    if t <> 'club_settings' then
      execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())', t || ': 관리자 삭제', t);
    end if;
  end loop;
end;
$$;

alter table public.news_posts enable row level security;
create policy "news_posts: 공개 글 조회" on public.news_posts for select to anon, authenticated using (published or public.is_admin());
create policy "news_posts: 관리자 추가" on public.news_posts for insert to authenticated with check (public.is_admin());
create policy "news_posts: 관리자 수정" on public.news_posts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "news_posts: 관리자 삭제" on public.news_posts for delete to authenticated using (public.is_admin());

-- ─────────────────────────────────────────────
-- 이미지 저장소 (공개 버킷, 관리자만 업로드)
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- 파일 삭제(remove)는 대상 행 조회 권한도 필요하다
create policy "media: 관리자 조회" on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_admin());
create policy "media: 관리자 업로드" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
create policy "media: 관리자 수정" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());
create policy "media: 관리자 삭제" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());
