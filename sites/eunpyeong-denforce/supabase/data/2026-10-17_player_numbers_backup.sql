-- 2026-10-17 등번호 전원 공란 처리 전 번호 (소유자 지시: 2026-27 등번호 미확정·중복 — BR-025).
-- 공란 처리: update public.players set number = null where is_active;  (비활동 선수는 그대로)
-- 되돌리려면 아래를 실행한다 (선수 주소 slug 는 바뀌지 않았다). 확정 번호가 다르면 관리자 › 선수에서 하나씩 고친다.
-- 임우성(No.1)·강민원(No.5)은 이날 등번호 없이 새로 넣었다 — 인스타그램 WELCOME 게시물의 번호는 1·5.
update public.players set number = 2 where slug = 'no-2'; -- 정대연
update public.players set number = 5 where slug = 'no-5'; -- 송민혁
update public.players set number = 7 where slug = 'no-7'; -- 최진규
update public.players set number = 8 where slug = 'no-8'; -- 김대현
update public.players set number = 9 where slug = 'no-9'; -- 안성혁
update public.players set number = 10 where slug = 'no-10'; -- 이상호
update public.players set number = 11 where slug = 'no-11'; -- 부성인
update public.players set number = 12 where slug = 'no-12'; -- 조현웅
update public.players set number = 13 where slug = 'no-13'; -- 김종문
update public.players set number = 14 where slug = 'no-14'; -- 안현국
update public.players set number = 15 where slug = 'no-15'; -- 유혁희
update public.players set number = 17 where slug = 'no-17'; -- 서진영
update public.players set number = 18 where slug = 'no-18'; -- 김대현
update public.players set number = 19 where slug = 'no-19'; -- 이효수
update public.players set number = 20 where slug = 'no-20'; -- 오영택
update public.players set number = 21 where slug = 'no-21'; -- 최은우
update public.players set number = 22 where slug = 'no-22'; -- 김종호
update public.players set number = 23 where slug = 'no-23'; -- 김선빈
update public.players set number = 24 where slug = 'no-24'; -- 정해원
update public.players set number = 26 where slug = 'no-26'; -- 하윤호
update public.players set number = 30 where slug = 'no-30'; -- 김용수
update public.players set number = 47 where slug = 'no-47'; -- 이상욱
update public.players set number = 77 where slug = 'no-77'; -- 김영록
update public.players set number = 95 where slug = 'no-95'; -- 박결
update public.players set number = 99 where slug = 'no-99'; -- 한견희
