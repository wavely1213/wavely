-- 2026-11-13 드라이브 '프로필' 폴더(ALA/FX/GR/PV, 32장)대로 선수단 정리 — 소유자 지시 "여기 내용대로 로스터 수정할거야", "사진 없는 선수들은 로스터에서 빠지는거"
-- 등번호는 사진 속 2026/27 번호로 채움(소유자 선택, BR-025 해제). 선수 주소(slug)는 그대로. 사진은 드라이브 '누끼' 폴더 원본(투명 PNG)을 사진 칸 바탕 --c-black-soft(#1c1e24)에 얹은 JPEG, media/players/<slug>-2627.jpg (관리자 로그인으로 scripts/instagram/upload.ts)
-- 되돌리기: 2026-11-13_roster_drive_backup.sql
begin;
update public.players set number = 5, position = 'ALA', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/kang-minwon-2627.jpg', updated_at = now() where slug = 'kang-minwon' and name = '강민원' and is_active;
update public.players set number = 27, position = 'ALA', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/kim-namseok-2627.jpg', updated_at = now() where slug = 'kim-namseok' and name = '김남석' and is_active;
update public.players set number = 23, position = 'ALA', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/no-23-2627.jpg', updated_at = now() where slug = 'no-23' and name = '김선빈' and is_active;
update public.players set number = 30, position = 'ALA', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/kim-jongho-2627.jpg', updated_at = now() where slug = 'kim-jongho' and name = '김종호' and is_active;
update public.players set number = 66, position = 'ALA', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/park-jaehee-2627.jpg', updated_at = now() where slug = 'park-jaehee' and name = '박재희' and is_active;
update public.players set number = 17, position = 'ALA', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/no-17-2627.jpg', updated_at = now() where slug = 'no-17' and name = '서진영' and is_active;
update public.players set number = 14, position = 'ALA', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/no-14-2627.jpg', updated_at = now() where slug = 'no-14' and name = '안현국' and is_active;
update public.players set number = 20, position = 'ALA', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/no-20-2627.jpg', updated_at = now() where slug = 'no-20' and name = '오영택' and is_active;
update public.players set number = 47, position = 'ALA', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/no-47-2627.jpg', updated_at = now() where slug = 'no-47' and name = '이상욱' and is_active;
update public.players set number = 33, position = 'ALA', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/no-10-2627.jpg', updated_at = now() where slug = 'no-10' and name = '이상호' and is_active;
update public.players set number = 19, position = 'ALA', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/no-19-2627.jpg', updated_at = now() where slug = 'no-19' and name = '이효수' and is_active;
update public.players set number = 7, position = 'ALA', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/no-7-2627.jpg', updated_at = now() where slug = 'no-7' and name = '최진규' and is_active;
update public.players set number = 18, position = 'FIXO', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/no-18-2627.jpg', updated_at = now() where slug = 'no-18' and name = '김대현' and is_active;
update public.players set number = 6, position = 'FIXO', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/no-8-2627.jpg', updated_at = now() where slug = 'no-8' and name = '김대현' and is_active;
update public.players set number = 11, position = 'FIXO', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/no-11-2627.jpg', updated_at = now() where slug = 'no-11' and name = '부성인' and is_active;
update public.players set number = 1, position = 'GK', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/lim-woosung-2627.jpg', updated_at = now() where slug = 'lim-woosung' and name = '임우성' and is_active;
update public.players set number = 2, position = 'GK', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/no-2-2627.jpg', updated_at = now() where slug = 'no-2' and name = '정대연' and is_active;
update public.players set number = 12, position = 'GK', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/no-12-2627.jpg', updated_at = now() where slug = 'no-12' and name = '조현웅' and is_active;
update public.players set number = 10, position = 'PIVO', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/no-77-2627.jpg', updated_at = now() where slug = 'no-77' and name = '김영록' and is_active;
update public.players set number = 13, position = 'PIVO', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/no-13-2627.jpg', updated_at = now() where slug = 'no-13' and name = '김종문' and is_active;
update public.players set number = 22, position = 'PIVO', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/no-22-2627.jpg', updated_at = now() where slug = 'no-22' and name = '김종호' and is_active;
update public.players set number = 9, position = 'PIVO', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/no-9-2627.jpg', updated_at = now() where slug = 'no-9' and name = '안성혁' and is_active;
update public.players set number = 99, position = 'PIVO', photo_url = 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/no-99-2627.jpg', updated_at = now() where slug = 'no-99' and name = '한견희' and is_active;
insert into public.players (slug, number, name, position, photo_url, is_active) values
 ('kim-youngmin', 4, '김영민', 'ALA', 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/kim-youngmin-2627.jpg', true),
 ('kim-jinsu', 16, '김진수', 'ALA', 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/kim-jinsu-2627.jpg', true),
 ('won-haeyeon', 77, '원해연', 'ALA', 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/won-haeyeon-2627.jpg', true),
 ('lee-jihoon', 24, '이지훈', 'ALA', 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/lee-jihoon-2627.jpg', true),
 ('moon-jiksoo', 88, '문직수', 'FIXO', 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/moon-jiksoo-2627.jpg', true),
 ('yoon-changwook', 8, '윤창욱', 'FIXO', 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/yoon-changwook-2627.jpg', true),
 ('lee-junhyung', 15, '이준형', 'FIXO', 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/lee-junhyung-2627.jpg', true),
 ('jung-woomin', 44, '정우민', 'FIXO', 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/jung-woomin-2627.jpg', true),
 ('yang-jihoon', 37, '양지훈', 'GK', 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/yang-jihoon-2627.jpg', true);
update public.players set is_active = false, updated_at = now() where slug = 'no-26' and name = '하윤호';  -- 드라이브 프로필 폴더에 사진 없음 (소유자: 사진 없는 선수는 로스터에서 빠짐)
commit;

-- ── 운영 반영 메모 (2026-11-13) ──
-- 위 내용은 운영 DB 에 DO 블록으로 넣었다: 문마다 바뀐 행 수를 확인(수정 1행씩, 추가 9행, 숨김 1행)하고 다르면 전체 취소.
-- 반영 뒤 소유자 "누끼 테두리가 더럽네, 배경 있는 사진으로" → 사진을 드라이브 '프로필' 카드(배경 있음)로 바꿈. 누끼 판(-2627.jpg)은 저장소에 남김(안 씀).
update public.players set photo_url = replace(photo_url, '-2627.jpg', '-2627-card.jpg'), updated_at = now()
  where is_active and photo_url like '%/media/players/%-2627.jpg';  -- 32행
-- 윤창욱 2025-26 FK1 기록(연맹, KNOWN_ISSUES I-014): 8경기 4골
update public.players set apps = 8, goals = 4, updated_at = now() where slug = 'yoon-changwook' and name = '윤창욱';
