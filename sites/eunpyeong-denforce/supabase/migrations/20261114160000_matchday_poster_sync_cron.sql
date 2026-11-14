-- 매치데이 포스터 자동 연결 예약 실행 (D-096) — 15분마다 부르고, 함수가 판단한다:
-- 경기 날(서울)이면 매번 드라이브를 읽고(FULL TIME 이 빨리 바뀌게), 아니면 마지막 성공 뒤 3시간이 지났을 때만 읽는다.
-- 호출 확인 값은 Vault(matchday_poster_sync_secret)에서 꺼내 헤더로 보낸다.
-- 멈추기: select cron.unschedule('matchday-poster-sync');  다시 켜기: 이 파일의 cron.schedule 다시 실행

create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'matchday-poster-sync',
  '4,19,34,49 * * * *',
  $$
  select net.http_post(
    url := 'https://vunnzagbsrujdernvetl.supabase.co/functions/v1/matchday-poster-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'matchday_poster_sync_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
