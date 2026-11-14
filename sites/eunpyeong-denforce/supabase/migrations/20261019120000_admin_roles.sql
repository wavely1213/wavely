-- 관리자 등급 (D-057) — owner(최고 관리자) / admin(관리자) / media(미디어)
-- 최고 관리자: 모든 메뉴 + 관리자 계정 추가/변경/삭제
-- 관리자    : 모든 메뉴 (관리자 계정 관리는 빼고) — 지금까지의 '관리자'와 같다
-- 미디어    : 구단소식/포스팅 글과 사진만 올린다. 기본은 '비공개(검토 대기)'로만 저장 — 최고 관리자가 검토해 공개한다.
--             최고 관리자가 계정마다 고르는 권한: can_publish(직접 공개), can_feature(메인 배너 고정),
--             can_set_date(구단소식 글 날짜 정하기), can_edit_published(공개된 글 고치기/지우기)
-- 기존 정책은 모두 public.is_admin() 을 쓰므로, is_admin() 을 '최고 관리자 또는 관리자'로 좁히면 미디어는 그 밖의 쓰기를 할 수 없다.
-- 다시 실행해도 된다.

-- ── 등급·권한 칸 ──
alter table public.admins
  add column if not exists role text not null default 'admin',
  add column if not exists can_publish boolean not null default false,
  add column if not exists can_feature boolean not null default false,
  add column if not exists can_set_date boolean not null default false,
  add column if not exists can_edit_published boolean not null default false;

alter table public.admins drop constraint if exists admins_role_check;
alter table public.admins add constraint admins_role_check check (role in ('owner', 'admin', 'media'));

-- ── 권한 함수 (모두 로그인 + 이메일 인증 완료 + 허용 목록 기준, RLS 와 앱이 같이 쓴다) ──
-- 지금 사용자의 등급 (관리자 목록에 없거나 인증 전이면 null)
create or replace function public.admin_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select a.role
  from auth.users u
  join public.admins a on a.email = lower(u.email)
  where u.id = auth.uid()
    and u.email_confirmed_at is not null;
$$;

-- 최고 관리자 또는 관리자 (기존 정책의 '관리자') — 미디어는 false
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.admin_role() in ('owner', 'admin'), false);
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.admin_role() = 'owner', false);
$$;

create or replace function public.is_media()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.admin_role() = 'media', false);
$$;

-- 관리자 화면에 들어올 수 있는 사람 (최고 관리자/관리자/미디어) — 비공개 글 조회에 쓴다
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.admin_role() is not null;
$$;

-- 미디어 계정의 권한 하나 ('publish' | 'feature' | 'set_date' | 'edit_published'). 미디어가 아니면 false
create or replace function public.media_can(perm text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case perm
      when 'publish' then a.can_publish
      when 'feature' then a.can_feature
      when 'set_date' then a.can_set_date
      when 'edit_published' then a.can_edit_published
      else false
    end
    from auth.users u
    join public.admins a on a.email = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
      and a.role = 'media'
  ), false);
$$;

-- 지금 사용자 정보 — 앱이 메뉴/입력 칸을 고를 때 (없으면 빈 결과)
create or replace function public.my_admin_profile()
returns table (email text, role text, can_publish boolean, can_feature boolean, can_set_date boolean, can_edit_published boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select a.email, a.role, a.can_publish, a.can_feature, a.can_set_date, a.can_edit_published
  from auth.users u
  join public.admins a on a.email = lower(u.email)
  where u.id = auth.uid()
    and u.email_confirmed_at is not null;
$$;

-- 관리자 계정 목록 (최고 관리자만 — 아니면 빈 결과). 로그인 계정이 있는지/인증했는지/마지막 로그인
create or replace function public.admin_accounts()
returns table (
  email text, role text, can_publish boolean, can_feature boolean, can_set_date boolean, can_edit_published boolean,
  created_at timestamptz, has_login boolean, confirmed boolean, last_sign_in_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.email, a.role, a.can_publish, a.can_feature, a.can_set_date, a.can_edit_published, a.created_at,
         u.id is not null, u.email_confirmed_at is not null, u.last_sign_in_at
  from public.admins a
  left join auth.users u on lower(u.email) = a.email
  where public.is_owner()
  order by case a.role when 'owner' then 0 when 'admin' then 1 else 2 end, a.created_at;
$$;

revoke all on function public.admin_role() from public;
revoke all on function public.is_owner() from public;
revoke all on function public.is_media() from public;
revoke all on function public.is_staff() from public;
revoke all on function public.media_can(text) from public;
revoke all on function public.my_admin_profile() from public;
revoke all on function public.admin_accounts() from public;
grant execute on function public.admin_role() to anon, authenticated;
grant execute on function public.is_owner() to anon, authenticated;
grant execute on function public.is_media() to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.media_can(text) to anon, authenticated;
grant execute on function public.my_admin_profile() to authenticated;
grant execute on function public.admin_accounts() to authenticated;

-- ── 관리자 목록은 최고 관리자만 바꾼다 (조회는 최고 관리자/관리자) ──
drop policy if exists "admins: 최고 관리자 추가" on public.admins;
drop policy if exists "admins: 최고 관리자 수정" on public.admins;
drop policy if exists "admins: 최고 관리자 삭제" on public.admins;
create policy "admins: 최고 관리자 추가" on public.admins for insert to authenticated with check (public.is_owner());
create policy "admins: 최고 관리자 수정" on public.admins for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "admins: 최고 관리자 삭제" on public.admins for delete to authenticated using (public.is_owner());

-- 최고 관리자가 한 명도 남지 않게 되는 변경은 막는다 (실수로 아무도 계정을 관리할 수 없게 되지 않도록)
create or replace function public.keep_one_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.admins where role = 'owner') then
    raise exception '최고 관리자는 한 명 이상 있어야 합니다' using errcode = '23514';
  end if;
  return null;
end;
$$;

drop trigger if exists admins_keep_one_owner on public.admins;
create constraint trigger admins_keep_one_owner after update or delete on public.admins
  deferrable initially immediate
  for each row execute function public.keep_one_owner();

-- ── 누가 올렸는지 (검토 대기 표시용) ──
alter table public.news_posts add column if not exists created_by text;
alter table public.postings add column if not exists created_by text;

create or replace function public.set_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_by := coalesce(auth.jwt() ->> 'email', new.created_by);
  return new;
end;
$$;

drop trigger if exists news_posts_created_by on public.news_posts;
create trigger news_posts_created_by before insert on public.news_posts for each row execute function public.set_created_by();
drop trigger if exists postings_created_by on public.postings;
create trigger postings_created_by before insert on public.postings for each row execute function public.set_created_by();

-- ── 미디어 계정의 글 규칙 (권한이 없으면 막거나 값을 되돌린다) ──
create or replace function public.news_media_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_media() then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.published and not public.media_can('edit_published') then
    raise exception '미디어 계정은 공개된 글을 고칠 수 없습니다' using errcode = '42501';
  end if;
  if new.published and (tg_op = 'INSERT' or not old.published) and not public.media_can('publish') then
    raise exception '미디어 계정은 글을 공개할 수 없습니다 (검토 후 공개)' using errcode = '42501';
  end if;
  if new.featured and (tg_op = 'INSERT' or not old.featured) and not public.media_can('feature') then
    raise exception '미디어 계정은 메인 배너 고정을 켤 수 없습니다' using errcode = '42501';
  end if;
  if not public.media_can('set_date') then
    if tg_op = 'INSERT' then
      new.date := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM-DD');
    else
      new.date := old.date;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists news_posts_media_rules on public.news_posts;
create trigger news_posts_media_rules before insert or update on public.news_posts
  for each row execute function public.news_media_rules();

create or replace function public.postings_media_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_media() then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.published and not public.media_can('edit_published') then
    raise exception '미디어 계정은 공개된 글을 고칠 수 없습니다' using errcode = '42501';
  end if;
  if new.published and (tg_op = 'INSERT' or not old.published) and not public.media_can('publish') then
    raise exception '미디어 계정은 글을 공개할 수 없습니다 (검토 후 공개)' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists postings_media_rules on public.postings;
create trigger postings_media_rules before insert or update on public.postings
  for each row execute function public.postings_media_rules();

-- ── 구단소식/포스팅 RLS — 비공개 글 조회는 관리자 화면 계정 모두, 미디어 쓰기 정책 추가 ──
drop policy if exists "news_posts: 공개 글 조회" on public.news_posts;
create policy "news_posts: 공개 글 조회" on public.news_posts for select to anon, authenticated using (published or public.is_staff());
drop policy if exists "news_posts: 미디어 추가" on public.news_posts;
drop policy if exists "news_posts: 미디어 수정" on public.news_posts;
drop policy if exists "news_posts: 미디어 삭제" on public.news_posts;
create policy "news_posts: 미디어 추가" on public.news_posts for insert to authenticated with check (public.is_media());
create policy "news_posts: 미디어 수정" on public.news_posts for update to authenticated using (public.is_media()) with check (public.is_media());
create policy "news_posts: 미디어 삭제" on public.news_posts for delete to authenticated
  using (public.is_media() and (not published or public.media_can('edit_published')));

drop policy if exists "postings: 공개 글 조회" on public.postings;
create policy "postings: 공개 글 조회" on public.postings for select to anon, authenticated using (published or public.is_staff());
drop policy if exists "postings: 미디어 추가" on public.postings;
drop policy if exists "postings: 미디어 수정" on public.postings;
drop policy if exists "postings: 미디어 삭제" on public.postings;
create policy "postings: 미디어 추가" on public.postings for insert to authenticated with check (public.is_media());
create policy "postings: 미디어 수정" on public.postings for update to authenticated using (public.is_media()) with check (public.is_media());
create policy "postings: 미디어 삭제" on public.postings for delete to authenticated
  using (public.is_media() and (not published or public.media_can('edit_published')));

-- ── 사진 올리기 — 미디어는 news/·postings/ 폴더에 올리기만 (지우기·바꾸기 없음: 공개된 글 사진을 지울 수 없게) ──
drop policy if exists "media: 미디어 업로드" on storage.objects;
create policy "media: 미디어 업로드" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_media() and (name like 'news/%' or name like 'postings/%'));
