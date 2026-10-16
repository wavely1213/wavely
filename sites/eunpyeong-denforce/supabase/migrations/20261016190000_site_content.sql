-- 홈페이지 내용(총괄 관리자) — 화면 곳곳에 박혀 있던 문구·사진·설정을 관리자 화면에서 고친다 (D-046)
-- site_content : 한 칸짜리 값 (구단 이름·슬로건·메인 사진 주소·섹션 제목 등). 키 목록·기본값·글자 수는 코드
--                (src/lib/content/fields.ts)가 정한다. 행이 없으면 코드 기본값 — 바꾼 값만 저장한다.
-- content_items: 목록 (메인 바로가기 카드·팀 조직 카드 등). list 로 어느 목록인지 나눈다 (src/lib/content/lists.ts).
create table public.site_content (
  key text primary key check (key ~ '^[a-z][a-zA-Z0-9_.]*$' and length(key) <= 80),
  value text not null check (length(value) between 1 and 20000),
  updated_at timestamptz not null default now(),
  updated_by text
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  list text not null check (list ~ '^[a-z][a-zA-Z0-9_.]*$' and length(list) <= 60),
  title text not null default '' check (length(title) <= 200),
  body text not null default '' check (length(body) <= 5000),
  link text not null default '' check (length(link) <= 500),
  image_url text check (image_url is null or length(image_url) <= 1000),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text
);
create index content_items_list_idx on public.content_items (list, sort_order);

create trigger site_content_audit before insert or update on public.site_content
  for each row execute function public.set_audit();
create trigger content_items_audit before insert or update on public.content_items
  for each row execute function public.set_audit();

alter table public.site_content enable row level security;
create policy "site_content: 공개 조회" on public.site_content for select to anon, authenticated using (true);
create policy "site_content: 관리자 추가" on public.site_content for insert to authenticated with check (public.is_admin());
create policy "site_content: 관리자 수정" on public.site_content for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "site_content: 관리자 삭제" on public.site_content for delete to authenticated using (public.is_admin());

alter table public.content_items enable row level security;
create policy "content_items: 공개 조회" on public.content_items for select to anon, authenticated using (true);
create policy "content_items: 관리자 추가" on public.content_items for insert to authenticated with check (public.is_admin());
create policy "content_items: 관리자 수정" on public.content_items for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "content_items: 관리자 삭제" on public.content_items for delete to authenticated using (public.is_admin());

-- 메인 바로가기 카드 — 그동안 components/home/QuickLinks.tsx 에 박혀 있던 다섯 개 그대로 (목록이 비어 있을 때만)
insert into public.content_items (list, title, body, link, sort_order)
select 'home.quicklinks', v.title, v.body, v.link, v.sort_order
from (values
  ('경기일정', '시즌 일정·장소', '/match/schedule', 10),
  ('선수단', '선수·코칭스태프', '/team/players', 20),
  ('오시는 길', '은평다목적체육관', '/club/location', 30),
  ('스폰서', '함께하는 파트너', '/sponsors', 40),
  ('문의', '제휴·후원·입단', '/contact', 50)
) as v(title, body, link, sort_order)
where not exists (select 1 from public.content_items where list = 'home.quicklinks');
