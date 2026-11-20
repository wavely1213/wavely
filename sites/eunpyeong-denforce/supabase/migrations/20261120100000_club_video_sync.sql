-- 구단 유튜브 롱폼 → 구단영상 자동 반영 (D-101) — 서버 함수 club-video-sync 의 실행 상태 + 넣은 영상 기록 + 호출 확인
-- 채널 '덴포스 DENFORCE SPORTS'(UC_834SREJnoVt5QTTqL-fuw)의 롱폼 중 제목에 '은평'이 든 영상만 news_posts(category 'video')에 넣는다.
-- 쓰기는 서버 함수(서버 키)만. 관리자(최고 관리자/관리자)는 상태 읽기만.

-- 실행 상태 (한 줄) — 넣은 것(last_applied), 건너뛴 이유(last_notes: 쇼츠, 은평 아님 등), 어떤 목록을 읽었는지(last_source)
create table public.club_video_sync_state (
  id smallint primary key default 1 check (id = 1),
  last_run_at timestamptz,
  last_ok_at timestamptz,
  last_error text check (last_error is null or length(last_error) <= 500),
  last_applied text check (last_applied is null or length(last_applied) <= 2000),
  last_notes text check (last_notes is null or length(last_notes) <= 2000),
  last_source text check (last_source is null or last_source in ('longform', 'uploads'))
);
insert into public.club_video_sync_state (id) values (1);

alter table public.club_video_sync_state enable row level security;
create policy club_video_sync_state_admin_read on public.club_video_sync_state for select to authenticated using (public.is_admin());
revoke all on public.club_video_sync_state from anon, authenticated;
grant select on public.club_video_sync_state to authenticated;

-- 이 함수가 넣은(또는 이미 있던) 영상 기록 — 한 번 기록된 영상은 다시 넣지 않는다.
-- 관리자가 그 구단영상 글을 지우면 news_id 만 비고 기록은 남아 다시 들어오지 않는다 (D-090 / D-096 방식)
create table public.club_video_sync_applied (
  video_id text primary key check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  news_id uuid references public.news_posts (id) on delete set null,
  title text not null default '' check (length(title) <= 200),
  applied_at timestamptz not null default now()
);

alter table public.club_video_sync_applied enable row level security;
create policy club_video_sync_applied_admin_read on public.club_video_sync_applied for select to authenticated using (public.is_admin());
revoke all on public.club_video_sync_applied from anon, authenticated;
grant select on public.club_video_sync_applied to authenticated;

-- 호출 확인용 비밀 값 — DB 안에서 만들어 Vault 에만 둔다 (예약 실행이 헤더로 보내고, 서버 함수가 이 함수로 비교)
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'club_video_sync_secret', '구단 유튜브 롱폼 구단영상 자동 반영 예약 실행 확인용 (D-101)');

create or replace function public.club_video_sync_secret_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'club_video_sync_secret' and decrypted_secret = p_secret and length(p_secret) >= 32
  );
$$;
revoke execute on function public.club_video_sync_secret_ok(text) from public, anon, authenticated;
grant execute on function public.club_video_sync_secret_ok(text) to service_role;
