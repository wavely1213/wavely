-- 드라이브 자료함 (D-081) — 구글 공유 드라이브 폴더(링크 공개)를 관리자 화면에서 탐색하고, 고른 파일만 사이트 저장소로 가져온다.
-- 자동 게시 없음. 키(GOOGLE_DRIVE_API_KEY)는 Edge Function 비밀값에만 있다 — DB, 사이트 코드, Vercel env 에 두지 않는다.
-- 쓰기는 서버 함수 drive-library(서버 키)만 한다. 관리자 화면(최고 관리자/관리자/미디어)은 기록 읽기만.
-- 다시 실행해도 된다.

-- ── 연결 설정: 루트 폴더 ID (관리자 › 설정, 최고 관리자가 링크를 넣으면 ID 만 뽑아 저장) ──
alter table public.club_settings
  add column if not exists drive_folder_id text;

alter table public.club_settings drop constraint if exists club_settings_drive_folder_id_check;
alter table public.club_settings add constraint club_settings_drive_folder_id_check
  check (drive_folder_id is null or drive_folder_id ~ '^[A-Za-z0-9_-]{10,100}$');

-- ── 가져온 파일 기록: 같은 파일(file id)은 다시 받지 않는다 ──
create table if not exists public.drive_imports (
  file_id text primary key check (file_id ~ '^[A-Za-z0-9_-]{10,100}$'),
  -- image: 사진(긴 변 약 1600) / video_cover: 영상 표지 (영상 파일은 옮기지 않고 보기 링크만)
  kind text not null check (kind in ('image', 'video_cover')),
  -- 가져온 곳 (어느 칸에서 골랐는지) — library: 자료함 화면
  purpose text not null check (purpose in ('library', 'news', 'players', 'video', 'crest')),
  file_name text not null default '' check (length(file_name) <= 300),
  url text not null check (length(url) <= 1000),
  -- 영상이면 드라이브 보기 링크
  view_url text check (view_url is null or length(view_url) <= 300),
  imported_by uuid references auth.users (id) on delete set null,
  imported_at timestamptz not null default now()
);
create index if not exists drive_imports_imported_at_idx on public.drive_imports (imported_at desc);

alter table public.drive_imports enable row level security;

drop policy if exists drive_imports_staff_read on public.drive_imports;
create policy drive_imports_staff_read on public.drive_imports for select to authenticated using (public.is_staff());
-- insert/update/delete 정책 없음 — 서버 함수(서버 키)만 쓴다
