-- 2026-10-19 스폰서 추가: 토탈스포츠컴퍼니 (소유자 "토탈스포츠컴퍼니도 파트너임"). 운영 DB 적용 2026-10-19.
-- 등급 partner(지시 없음 — 관리자 › 스폰서에서 바꿀 수 있음), 순서는 맨 뒤.
-- 업체: 풋살/축구 대회 기획/운영 대행 단체 'Total Sports Company'(대표 배종현 = 구단 단장, 인스타 소개글에 구단 계정을 걸어 둠).
--   별도 홈페이지가 없어 링크는 공식 인스타그램.
-- 로고: 원본 파일을 못 받아 공식 인스타 게시물(2026 CI 'TS Management / Total Sports Company')에서 잘라 배경을 지운 것
--   (Storage media/sponsors/total-sports-company.png, 729x180 투명 PNG). 원본을 받으면 관리자 › 스폰서에서 바꾼다.
-- 다시 돌려도 한 번만 들어간다.
insert into public.sponsors (name, tier, logo_url, url, sort_order)
select '토탈스포츠컴퍼니', 'partner',
       'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/sponsors/total-sports-company.png',
       'https://www.instagram.com/totalsports_company/',
       coalesce(max(sort_order), 0) + 1
from public.sponsors
where not exists (select 1 from public.sponsors where name = '토탈스포츠컴퍼니');
