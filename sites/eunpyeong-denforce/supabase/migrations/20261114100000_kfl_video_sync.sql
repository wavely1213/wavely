-- 연맹 유튜브 경기 영상 자동 연결 (D-090) — 서버 함수 kfl-video-sync 의 실행 상태 + 호출 확인
-- 한국풋살연맹 - KFL 공개 RSS 에서 우리 경기 영상을 찾아 matches.replay_url / highlight_url 이 비어 있을 때만 넣는다.
-- 쓰기는 서버 함수(서버 키)만. 관리자(최고 관리자/관리자)는 상태 읽기만.

-- 실행 상태 (한 줄) — 넣은 것(last_applied), 건너뛴 이유(last_notes: 날짜 없음, 후보 둘 이상, 맞는 경기 없음 등)
create table public.kfl_video_sync_state (
  id smallint primary key default 1 check (id = 1),
  last_run_at timestamptz,
  last_ok_at timestamptz,
  last_error text check (last_error is null or length(last_error) <= 500),
  last_applied text check (last_applied is null or length(last_applied) <= 2000),
  last_notes text check (last_notes is null or length(last_notes) <= 2000)
);
insert into public.kfl_video_sync_state (id) values (1);

alter table public.kfl_video_sync_state enable row level security;
create policy kfl_video_sync_state_admin_read on public.kfl_video_sync_state for select to authenticated using (public.is_admin());
revoke all on public.kfl_video_sync_state from anon, authenticated;
grant select on public.kfl_video_sync_state to authenticated;

-- 호출 확인용 비밀 값 — DB 안에서 만들어 Vault 에만 둔다 (예약 실행이 헤더로 보내고, 서버 함수가 이 함수로 비교)
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'kfl_video_sync_secret', '연맹 유튜브 영상 자동 연결 예약 실행 확인용 (D-090)');

create or replace function public.kfl_video_sync_secret_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'kfl_video_sync_secret' and decrypted_secret = p_secret and length(p_secret) >= 32
  );
$$;
revoke execute on function public.kfl_video_sync_secret_ok(text) from public, anon, authenticated;
grant execute on function public.kfl_video_sync_secret_ok(text) to service_role;
