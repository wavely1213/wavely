-- 수정/작성 기록(updated_by, created_by)에 이메일 대신 로그인 계정 ID(uuid)를 남긴다 (I-042).
-- 공개 행은 공개 키나 아무 가입 계정으로도 읽히므로, 관리자 로그인 이메일이 드러나지 않게 한다.
-- 사이트 가입이 열려 있어(Supabase Auth 'Allow new users to sign up') 열 권한을 익명만 막아서는 부족하다.
-- 앱(검토 대기/미디어 자기 글)도 이메일 대신 ID 로 비교한다 — 앱을 먼저 배포하고 바로 이 마이그레이션을 적용한다
-- (그 사이 앱은 admin_user_ids() 가 없어 검토 대기 표시만 잠깐 빠진다). 다시 실행해도 된다.
-- 주의: 글의 주인은 로그인 계정 ID 다. Auth 사용자를 지우고 같은 이메일로 다시 만들면 ID 가 바뀌어 옛 글/사진과 끊긴다 —
-- 비밀번호는 사용자를 지우지 말고 바꾼다 (docs/SUPABASE_SETUP.md 운영 메모, 다시 잇는 SQL 도 거기).

create or replace function public.set_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce((select auth.uid())::text, new.updated_by);
  return new;
end;
$$;

create or replace function public.set_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_by := coalesce((select auth.uid())::text, new.created_by);
  return new;
end;
$$;

-- 미디어 정책의 '자기 글' — 로그인 계정 ID 로 비교
create or replace function public.is_own_post(created_by text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select created_by is not null and created_by = (select auth.uid())::text;
$$;

-- 최고 관리자/관리자 로그인 계정 ID — 검토 대기(관리자가 아닌 계정이 올린 비공개 글) 판단용. 최고 관리자/관리자만 (아니면 빈 결과)
create or replace function public.admin_user_ids()
returns table (user_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id::text
  from public.admins a
  join auth.users u on lower(u.email) = a.email
  where a.role in ('owner', 'admin')
    and public.is_admin();
$$;

revoke all on function public.admin_user_ids() from public;
revoke execute on function public.admin_user_ids() from anon;
grant execute on function public.admin_user_ids() to authenticated;

-- 이미 남은 이메일 기록을 로그인 계정 ID 로 (로그인 계정이 없는 이메일은 비운다). updated_at 은 지금 시각으로 바뀐다 (화면에 쓰지 않음)
do $$
declare t text;
begin
  foreach t in array array['club_settings', 'players', 'staff', 'matches', 'standings', 'news_posts', 'sponsors',
                           'history_items', 'national_team_alumni', 'postings', 'site_content', 'content_items']
  loop
    execute format(
      'update public.%I x set updated_by = (select u.id::text from auth.users u where lower(u.email) = lower(x.updated_by)) where x.updated_by like %L',
      t, '%@%');
  end loop;
  update public.news_posts x set created_by = (select u.id::text from auth.users u where lower(u.email) = lower(x.created_by)) where x.created_by like '%@%';
  update public.postings x set created_by = (select u.id::text from auth.users u where lower(u.email) = lower(x.created_by)) where x.created_by like '%@%';
end;
$$;
