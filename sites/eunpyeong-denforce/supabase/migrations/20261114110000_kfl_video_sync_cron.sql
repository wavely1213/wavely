-- 연맹 유튜브 경기 영상 자동 연결 예약 실행 (D-090) — 3시간마다 (매시 17분) 서버 함수 kfl-video-sync 를 부른다
-- 호출 확인 값은 Vault(kfl_video_sync_secret)에서 꺼내 헤더로 보낸다 — 값이 SQL/저장소에 적히지 않는다.
-- 멈추기: select cron.unschedule('kfl-video-sync');  다시 켜기: 이 파일의 cron.schedule 다시 실행

create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'kfl-video-sync',
  '17 */3 * * *',
  $$
  select net.http_post(
    url := 'https://vunnzagbsrujdernvetl.supabase.co/functions/v1/kfl-video-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'kfl_video_sync_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
