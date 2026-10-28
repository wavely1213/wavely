-- 2026-10-19 스폰서 3곳 추가 (소유자 "스매싱스포츠 / 스카로 / 엑스트라조스 (풋살사관학교 앞순위)", "스폰서는 일단 넣어줘", 등급은 소유자가 관리자 › 스폰서에서 정리)
-- 로고: 받은 .ai 를 투명 PNG(높이 180px)로 바꿔 Storage media/sponsors/<이름>.png (스카로는 세로형)
-- 주소: 스매싱스포츠 공식 홈페이지 겸 쇼핑몰((주)스매싱스포츠), 스카로 공식사이트, 엑스트라조스 국내 네이버 스마트스토어(국내 공식 홈페이지 없음) — 2026-10-19 조사
-- 운영 DB 적용 2026-10-19. 다시 실행하면 같은 이름이 또 들어가므로 1번만.
begin;
update public.sponsors set sort_order = 8 where name = '풋살사관학교';
update public.sponsors set sort_order = 9 where name = '꽁병지TV';
insert into public.sponsors (name, tier, logo_url, url, sort_order) values
  ('스매싱스포츠', 'partner', 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/sponsors/smashing-sports.png', 'https://www.smashingsports.co.kr/', 5),
  ('스카로', 'partner', 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/sponsors/skaro.png', 'https://skaro.co.kr/', 6),
  ('엑스트라조스', 'partner', 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/sponsors/extra-joss.png', 'https://smartstore.naver.com/extrajosskorea', 7);
commit;
