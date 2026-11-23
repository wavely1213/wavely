-- 스폰서 등급에 'sub'(서브 스폰서) 추가 — 등급은 높은 순으로 네이밍 / 메인(official) / 서브(sub) / 후원사(partner) (소유자 결정)
-- 'official' 과 'partner' 는 키 그대로 두고 화면 이름만 '메인 스폰서' / '후원사' 로 바꾼다 (src/data/sponsors.ts SPONSOR_TIER_LABEL). 기존 행은 그대로.
-- 처음 제약은 init 마이그레이션의 열 안 check 라 기본 이름 sponsors_tier_check. 관리자 서버 액션 검증(SPONSOR_TIER_ORDER)과 같은 4개.
-- 다시 실행해도 된다 (제약을 지우고 같은 이름으로 다시 만든다).
alter table public.sponsors drop constraint if exists sponsors_tier_check;
alter table public.sponsors add constraint sponsors_tier_check check (tier in ('naming', 'official', 'sub', 'partner'));
