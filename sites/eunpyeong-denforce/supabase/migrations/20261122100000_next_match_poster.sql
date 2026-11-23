-- NEXT MATCH 포스터 팝업 (D-102) — 경기 전날까지 홈 팝업에 보이는 다음 경기 포스터와 그 인스타 게시물.
-- instagram-sync 가 첫 줄 'NEXT MATCH' 글을 같은 서울 날짜 + 같은 상대 경기에 연결한다(빈 칸만). 관리자는 경기 폼에서 고친다.
-- 관리자가 지운 칸은 다시 채우지 않는다 (sync_cleared_fields 와 같은 규칙 — matchday_poster_sync_applied 에 기록).

alter table public.matches
  add column if not exists next_poster_url text
    constraint matches_next_poster_url_check check (next_poster_url is null or (next_poster_url ~ '^https://' and length(next_poster_url) <= 500)),
  add column if not exists next_post_url text
    constraint matches_next_post_url_check check (next_post_url is null or (next_post_url ~ '^https://www\.instagram\.com/' and length(next_post_url) <= 500));

-- 인스타그램 글 종류에 'nextmatch' (관리자 › 인스타 자동 반영 표시용)
alter table public.instagram_posts drop constraint if exists instagram_posts_kind_check;
alter table public.instagram_posts add constraint instagram_posts_kind_check
  check (kind in ('reel', 'welcome', 'farewell', 'matchday', 'nextmatch', 'result', 'photo', 'other'));

-- 넣은 칸 / 관리자가 지운 칸 기록에 NEXT 두 칸 (file_id = 인스타 게시물 코드, 관리자가 지운 칸은 null)
alter table public.matchday_poster_sync_applied drop constraint if exists matchday_poster_sync_applied_field_check;
alter table public.matchday_poster_sync_applied add constraint matchday_poster_sync_applied_field_check
  check (field in ('matchday_poster_url', 'fulltime_poster_url', 'next_poster_url', 'next_post_url'));

create or replace function public.record_cleared_sync_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.replay_url is not null and new.replay_url is null then
    insert into public.kfl_video_sync_applied (match_id, field, video_id) values (new.id, 'replay_url', null) on conflict do nothing;
  end if;
  if old.highlight_url is not null and new.highlight_url is null then
    insert into public.kfl_video_sync_applied (match_id, field, video_id) values (new.id, 'highlight_url', null) on conflict do nothing;
  end if;
  if old.matchday_poster_url is not null and new.matchday_poster_url is null then
    insert into public.matchday_poster_sync_applied (match_id, field, file_id) values (new.id, 'matchday_poster_url', null) on conflict do nothing;
  end if;
  if old.fulltime_poster_url is not null and new.fulltime_poster_url is null then
    insert into public.matchday_poster_sync_applied (match_id, field, file_id) values (new.id, 'fulltime_poster_url', null) on conflict do nothing;
  end if;
  if old.next_poster_url is not null and new.next_poster_url is null then
    insert into public.matchday_poster_sync_applied (match_id, field, file_id) values (new.id, 'next_poster_url', null) on conflict do nothing;
  end if;
  if old.next_post_url is not null and new.next_post_url is null then
    insert into public.matchday_poster_sync_applied (match_id, field, file_id) values (new.id, 'next_post_url', null) on conflict do nothing;
  end if;
  return null;
end;
$$;
revoke execute on function public.record_cleared_sync_fields() from public, anon, authenticated;

drop trigger if exists matches_record_cleared_sync_fields on public.matches;
create trigger matches_record_cleared_sync_fields
  after update of replay_url, highlight_url, matchday_poster_url, fulltime_poster_url, next_poster_url, next_post_url on public.matches
  for each row execute function public.record_cleared_sync_fields();
