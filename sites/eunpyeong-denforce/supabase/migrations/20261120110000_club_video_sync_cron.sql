-- 구단 유튜브 롱폼 → 구단영상 예약 실행 (D-101) — 3시간마다 (매시 47분, kfl-video-sync 17분과 겹치지 않게) 서버 함수 club-video-sync 를 부른다
-- 호출 확인 값은 Vault(club_video_sync_secret)에서 꺼내 헤더로 보낸다 — 값이 SQL/저장소에 적히지 않는다.
-- 멈추기: select cron.unschedule('club-video-sync');  다시 켜기: 이 파일의 cron.schedule 다시 실행

create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'club-video-sync',
  '47 */3 * * *',
  $$
  select net.http_post(
    url := 'https://vunnzagbsrujdernvetl.supabase.co/functions/v1/club-video-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'club_video_sync_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
