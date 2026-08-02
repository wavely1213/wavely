-- ============================================================
--  비로그인(anon)에게 '꾸미기 컬럼'만 공개 — 동네 랭킹·인라인 등급 링용
--  실행: Supabase SQL Editor 에 붙여넣고 RUN. 재실행 안전(idempotent).
--
--  배경: 25_profiles_pii_lockdown 이 anon 의 profiles SELECT 를 통째로 회수했다(옳은 조치).
--    그 결과 비로그인 방문자에게는 홈 '동네 랭킹'과 글·댓글의 등급 링이 뜨지 않는다(401 실측).
--
--  ⚠ 이 파일은 PII 를 열지 않는다. 아래 5개 컬럼만 anon 에게 준다:
--       nickname, lvl, xp, equipped_border, avatar_url
--    phone·biz_no·biz_rep_name·real_name·home_lat/lng·username·friend_code 등은
--    계속 잠겨 있다(컬럼 단위 GRANT 라 명시한 것만 열림).
--    닉네임·아바타·레벨은 이미 글·댓글에 공개 표시되는 값이라 노출 범위가 늘지 않는다.
-- ============================================================

-- (1) 행 접근 정책 — anon 은 정책이 없어 전부 막혀 있었다. 읽기만 허용.
drop policy if exists profiles_read_anon on public.profiles;
create policy profiles_read_anon on public.profiles
  for select to anon using (true);

-- (2) 컬럼 권한 — 명시한 것만. 여기 없는 컬럼은 anon 이 select 하면 42501 로 막힌다.
grant select (nickname, lvl, xp, equipped_border, avatar_url) on public.profiles to anon;

notify pgrst, 'reload schema';

-- 확인용 — anon 에게 부여된 profiles 컬럼 목록. 위 5개만 나와야 정상.
select grantee, string_agg(column_name, ', ' order by column_name) as anon_columns
  from information_schema.column_privileges
 where table_schema = 'public' and table_name = 'profiles'
   and grantee = 'anon' and privilege_type = 'SELECT'
 group by grantee;
