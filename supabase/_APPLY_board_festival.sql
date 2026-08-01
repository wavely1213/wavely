-- ============================================================
--  축제 게시판 추가 — posts.board CHECK 제약에 'festival' 허용
--  실행: Supabase SQL Editor 에 붙여넣고 RUN. 재실행 안전(idempotent).
--
--  현재 제약(실측 확인): posts_board_check = board in ('free','owner','staff','promo')
--    → 'festival'로 글을 쓰면 23514(check constraint 위반)로 거부된다.
--  기존 행에는 영향 없음 — 허용값을 넓히기만 한다.
-- ============================================================

alter table public.posts drop constraint if exists posts_board_check;

alter table public.posts add constraint posts_board_check
  check (board in ('free', 'owner', 'staff', 'promo', 'festival'));

notify pgrst, 'reload schema';

-- 확인용 — 아래에 새 제약 정의가 출력되면 성공.
select conname, pg_get_constraintdef(oid) as definition
  from pg_constraint
 where conrelid = 'public.posts'::regclass
   and conname = 'posts_board_check';
