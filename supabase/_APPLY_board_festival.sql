-- ============================================================
--  축제 게시판 추가 — posts.board CHECK 제약에 'festival' 허용
--  실행: Supabase SQL Editor 에 붙여넣고 RUN. 재실행 안전(idempotent).
--
--  현재 제약(실측): posts_board_check = board in ('free','owner','staff','promo')
--  → 'festival'을 추가하지 않으면 축제 게시판 글쓰기가 23514로 거부된다.
--  기존 행에는 영향 없음(허용값을 넓히기만 함).
-- ============================================================
do $$
declare v_name text;
begin
  -- 제약 이름이 환경마다 다를 수 있어 posts의 board 관련 CHECK를 찾아 교체한다.
  select con.conname into v_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
   where ns.nspname = 'public' and rel.relname = 'posts'
     and con.contype = 'c' and pg_get_constraintdef(con) ilike '%board%'
   limit 1;

  if v_name is not null then
    execute format('alter table public.posts drop constraint %I', v_name);
  end if;

  alter table public.posts add constraint posts_board_check
    check (board in ('free','owner','staff','promo','festival'));

  raise notice '축제 게시판 허용 완료 (이전 제약: %)', coalesce(v_name, '없음');
end $$;

notify pgrst, 'reload schema';
