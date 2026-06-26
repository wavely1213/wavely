-- 21_board_promo_check.sql — 게시판 CHECK 제약에 'promo'(홍보) 추가 (검토 후 적용)
-- ============================================================================
-- 문제: schema.sql:43 posts.board CHECK가 ('free','owner','staff')만 허용 → 'promo' 누락.
--   앱(constants/app.ts BOARDS)·소비자웹(main.jsx BOARDS)은 '홍보(promo)' 게시판을 노출하고
--   해당 board로 INSERT를 시도하므로, 라이브 DB가 schema.sql 그대로면 홍보 글쓰기가 CHECK 위반(23514)으로 실패.
-- ⚠️ 적용 전 라이브 DB 실제 제약 확인:
--   select pg_get_constraintdef(oid) from pg_constraint where conname like '%board%' and conrelid='public.posts'::regclass;
--   이미 promo 포함이면 적용 불필요(멱등).
-- ============================================================================
do $$
declare cname text;
begin
  select conname into cname from pg_constraint
   where conrelid = 'public.posts'::regclass and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%board%';
  if cname is not null then
    execute format('alter table public.posts drop constraint %I', cname);
  end if;
  alter table public.posts add constraint posts_board_check
    check (board in ('free','owner','staff','promo'));
end $$;
