-- 구단 인스타그램 자동 반영 (D-065, BR-029) — 서버 함수 instagram-sync 의 기록 표 + 실행 상태 + 호출 확인
-- 쓰기는 서버 함수(서버 키)만. 관리자(최고 관리자/관리자)는 읽기 + '확인함' 표시만 한다.

-- 처리한 게시물 — 무엇을 넣었는지(actions), 사람이 확인할 것(note)
create table public.instagram_posts (
  code text primary key check (code ~ '^[A-Za-z0-9_-]{5,40}$'),
  kind text not null check (kind in ('reel', 'welcome', 'farewell', 'matchday', 'result', 'photo', 'other')),
  posted_at timestamptz not null,
  caption text not null default '' check (length(caption) <= 2000),
  -- done: 다 넣음 / review: 넣었지만 확인할 것 있음 / reviewed: 관리자가 확인함 / error: 실패 (다시 시도)
  status text not null check (status in ('done', 'review', 'reviewed', 'error')),
  actions text not null default '' check (length(actions) <= 2000),
  note text check (note is null or length(note) <= 2000),
  attempts integer not null default 1 check (attempts >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index instagram_posts_status_idx on public.instagram_posts (status) where status in ('review', 'error');

-- 실행 상태 (한 줄) — 대시보드 '자동 확인 멈춤' 알림, 겹쳐 돌지 않게 running_since
create table public.instagram_sync_state (
  id smallint primary key default 1 check (id = 1),
  running_since timestamptz,
  last_run_at timestamptz,
  last_ok_at timestamptz,
  last_error text check (last_error is null or length(last_error) <= 500),
  last_processed integer not null default 0
);
insert into public.instagram_sync_state (id) values (1);

alter table public.instagram_posts enable row level security;
alter table public.instagram_sync_state enable row level security;

create policy instagram_posts_admin_read on public.instagram_posts for select to authenticated using (public.is_admin());
-- 관리자는 '확인 필요/오류' 를 '확인함' 으로만 바꿀 수 있다
create policy instagram_posts_admin_review on public.instagram_posts for update to authenticated
  using (public.is_admin() and status in ('review', 'error'))
  with check (public.is_admin() and status = 'reviewed');
create policy instagram_sync_state_admin_read on public.instagram_sync_state for select to authenticated using (public.is_admin());

revoke all on public.instagram_posts from anon, authenticated;
revoke all on public.instagram_sync_state from anon, authenticated;
grant select on public.instagram_posts to authenticated;
grant update (status, updated_at) on public.instagram_posts to authenticated;
grant select on public.instagram_sync_state to authenticated;

-- 호출 확인용 비밀 값 — DB 안에서 만들어 Vault 에만 둔다 (예약 실행이 헤더로 보내고, 서버 함수가 이 함수로 비교)
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'instagram_sync_secret', '인스타그램 자동 반영 예약 실행 확인용 (D-065)');

create or replace function public.instagram_sync_secret_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'instagram_sync_secret' and decrypted_secret = p_secret and length(p_secret) >= 32
  );
$$;
revoke execute on function public.instagram_sync_secret_ok(text) from public, anon, authenticated;
grant execute on function public.instagram_sync_secret_ok(text) to service_role;
