-- 2026-11-14 2026-27 FK1 1R(2026-11-15 14:00, 노원제너FS 원정, 파주 NFC 풋살장) 경기 영상 주소 — 소유자가 준 연맹 유튜브 링크
-- 영상 제목(YouTube oEmbed 확인): '[FK1] 노원제너FS VS 서울은평덴포스 (2026.11.15.) - 1R' = 연맹 생중계 → replay_url(다시보기).
-- 화면에는 경기가 '종료'로 바뀐 뒤 경기결과 표와 홈 경기 띠 카드에 '다시보기' 버튼으로 나온다(lib/match hasMatchDetails).
-- 운영 반영 2026-11-14(총괄, 1행 확인). 비어 있을 때만 넣으므로 다시 실행해도 관리자가 고친 값은 덮지 않는다.
do $$
declare n int;
begin
  update public.matches
     set replay_url = 'https://www.youtube.com/watch?v=DUZ1QRRCkQQ'
   where id = 'adf1a613-9349-4c01-a307-2d75e3c412ab'
     and round = '1R' and opponent = '노원제너FS' and replay_url is null;
  get diagnostics n = row_count;
  raise notice 'updated %', n;
end $$;
