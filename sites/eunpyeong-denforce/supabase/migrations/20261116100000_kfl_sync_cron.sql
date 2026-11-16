-- 연맹 결과기록지 자동 수집 예약 실행 (D-082, 명세 2.4 / C6) — 매시 7분, 37분 (instagram 의 :00/:15/:30/:45, 포스터 4/19/34/49, 영상 17 과 겹치지 않게)
-- 호출 확인 값은 Vault(kfl_sync_secret, 20261114140000)에서 꺼내 헤더로 보낸다. 함수가 30분마다 할 일을 정한다(하루 한 번 일정표 전체, 확인할 때가 된 우리 경기).
-- 명세의 이름(20261114110000_kfl_sync_cron)은 D-090 과 시각이 겹쳐 뒤로 옮겼다.
-- 멈추기: select cron.unschedule('kfl-sync');  (반영된 데이터는 남는다)  다시 켜기: 이 파일의 cron.schedule 다시 실행

create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'kfl-sync',
  '7,37 * * * *',
  $$
  select net.http_post(
    url := 'https://vunnzagbsrujdernvetl.supabase.co/functions/v1/kfl-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'kfl_sync_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);
