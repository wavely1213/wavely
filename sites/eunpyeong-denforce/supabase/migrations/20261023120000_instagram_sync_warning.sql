-- 인스타그램 자동 반영 (D-065) — 실행은 성공했지만 사람이 볼 것 (최근 6개가 모두 처음 보는 글 → 빠진 글이 있을 수 있음)
alter table public.instagram_sync_state add column if not exists last_warning text check (last_warning is null or length(last_warning) <= 500);
