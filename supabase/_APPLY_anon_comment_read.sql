-- ============================================================
--  비로그인(anon)에게 댓글 읽기 허용 — 댓글 수가 0으로 보이던 문제
--  실행: Supabase SQL Editor 에 붙여넣고 RUN. 재실행 안전(idempotent).
--
--  현재(schema.sql:83): comments_read = using (auth.role() = 'authenticated')
--    → 비로그인 방문자에게 댓글이 아예 안 보이고, posts의 comments(count) 집계도 전부 0.
--    → 홈 '인기 글'이 통째로 사라지고, 피드 카드도 "💬 0"으로 표시됨(실측 확인).
--
--  게시글(posts)은 이미 비로그인에게 공개돼 있다. 그 글의 댓글만 가리는 것은
--  일관성도 없고, 커뮤니티가 비어 보이게 만드는 손해가 크다.
--  ⚠ 익명 글의 작성자 신원은 별개다 — comments.author_id 는 profiles 조인을 통해서만 노출되고
--     profiles 는 25_profiles_pii_lockdown 의 컬럼권한으로 이미 보호된다.
-- ============================================================

drop policy if exists "comments_read" on public.comments;
create policy "comments_read" on public.comments
  for select using (true);        -- 읽기만 공개. insert/delete 정책은 그대로(본인만).

-- PostgREST가 anon 롤로 테이블을 읽을 수 있어야 정책이 의미를 가진다.
grant select on public.comments to anon;

notify pgrst, 'reload schema';

-- 확인용 — 아래에 comments_read 가 'true' 로 출력되면 성공.
select polname, pg_get_expr(polqual, polrelid) as using_expr
  from pg_policy
 where polrelid = 'public.comments'::regclass
 order by polname;
