-- 구단 인스타그램 자동 반영 예약 실행 (D-065) — 15분마다 서버 함수 instagram-sync 를 부른다 (AI 를 쓰지 않음)
-- 호출 확인 값은 Vault(instagram_sync_secret)에서 꺼내 헤더로 보낸다 — 값이 SQL/저장소에 적히지 않는다.
-- 멈추기: select cron.unschedule('instagram-sync');  다시 켜기: 이 파일의 cron.schedule 다시 실행

create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'instagram-sync',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://vunnzagbsrujdernvetl.supabase.co/functions/v1/instagram-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'instagram_sync_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
