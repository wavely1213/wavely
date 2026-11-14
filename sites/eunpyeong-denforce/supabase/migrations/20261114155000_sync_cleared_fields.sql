-- 관리자가 지운 칸은 자동 연결이 다시 채우지 않게 (총괄 검토 2026-11-15, D-090 / D-096)
-- 자동 연결(kfl-video-sync, matchday-poster-sync)은 '자기가 넣었던 칸이 지금 비어 있으면 관리자가 지운 것'으로 보는데,
-- 관리자가 직접 넣었다가 지운 칸은 기록이 없어 다시 채워졌다. matches 에서 값 → null 로 바뀌면 그 칸을 기록 표에 남긴다.
-- 동기화는 null 인 칸만 채우므로(값 → 값, null → 값) 이 트리거를 스스로 부르지 않는다. 다시 실행해도 된다.

-- 관리자가 지운 칸은 영상/파일 ID 가 없다
alter table public.kfl_video_sync_applied alter column video_id drop not null;
alter table public.matchday_poster_sync_applied alter column file_id drop not null;

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
  return null;
end;
$$;
revoke execute on function public.record_cleared_sync_fields() from public, anon, authenticated;

drop trigger if exists matches_record_cleared_sync_fields on public.matches;
create trigger matches_record_cleared_sync_fields
  after update of replay_url, highlight_url, matchday_poster_url, fulltime_poster_url on public.matches
  for each row execute function public.record_cleared_sync_fields();
