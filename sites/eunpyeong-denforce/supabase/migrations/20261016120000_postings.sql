-- 포스팅 — 구단 이름(서울은평 덴포스·ZD스포츠·나인티플러스·FS·풋볼아카데미)으로 올라온 바깥 글 모음 (D-022)
-- 원문은 옮기지 않고 제목·짧은 요약·대표 사진만 두고, 카드를 누르면 원문(url)으로 간다.
-- kind     : club(구단이 올린 글) / news(언론 기사·연맹 영상) / fan(팬·외부 글)
-- platform : 출처 표시(배지)용
create table public.postings (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('club', 'news', 'fan')),
  platform text not null check (platform in ('naver_blog', 'naver_cafe', 'article', 'youtube', 'instagram', 'web')),
  title text not null check (length(title) between 1 and 200),
  -- 블로그 이름·언론사·채널 이름
  author text not null default '' check (length(author) <= 60),
  excerpt text not null default '' check (length(excerpt) <= 300),
  url text not null check (url ~ '^https?://' and length(url) <= 1000),
  thumbnail_url text,
  posted_on date not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text,
  constraint postings_url_key unique (url)
);

create index postings_posted_on_idx on public.postings (posted_on desc);

create trigger postings_audit before insert or update on public.postings
  for each row execute function public.set_audit();

alter table public.postings enable row level security;
create policy "postings: 공개 글 조회" on public.postings for select to anon, authenticated using (published or public.is_admin());
create policy "postings: 관리자 추가" on public.postings for insert to authenticated with check (public.is_admin());
create policy "postings: 관리자 수정" on public.postings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "postings: 관리자 삭제" on public.postings for delete to authenticated using (public.is_admin());
