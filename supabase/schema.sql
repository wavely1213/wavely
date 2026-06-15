-- ============================================================
--  와벨리(Wavely) 데이터베이스 설계
--  Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 RUN 하세요.
-- ============================================================

-- 1) 회원 프로필 (로그인 계정과 1:1로 연결)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null,
  role        text not null check (role in ('owner','staff','parttime','guest')),
  biz_no      text,                       -- 사업주: 사업자등록번호
  biz_verified boolean default false,     -- 사업자 인증 통과 여부
  company_id  uuid,                        -- 정직원/알바: 소속 매장 (stores.id)
  created_at  timestamptz default now()
);

-- 2) 매장/회사 (사업주가 등록, 사업자번호 인증된 곳만)
create table if not exists public.stores (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references public.profiles(id) on delete set null,
  name         text not null,
  category     text,
  address      text,
  lat          double precision,          -- 위도 (지역 정렬용)
  lng          double precision,          -- 경도
  photo        text,                       -- 대표 사진 (네이버 플레이스 등)
  naver_place_id text,
  biz_no       text,
  biz_verified boolean default false,
  created_at   timestamptz default now()
);

-- profiles.company_id 가 stores 를 가리키도록 연결
alter table public.profiles
  drop constraint if exists profiles_company_fk,
  add  constraint profiles_company_fk
       foreign key (company_id) references public.stores(id) on delete set null;

-- 3) 게시글 (자유/사장님/직장인 게시판)
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid references public.profiles(id) on delete cascade,
  board      text not null check (board in ('free','owner','staff')),
  title      text not null,
  body       text,
  created_at timestamptz default now()
);

-- 4) 댓글
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.posts(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz default now()
);

-- ============================================================
--  보안 규칙 (RLS: 로그인한 사람만, 자기 글만 수정)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.stores   enable row level security;
alter table public.posts    enable row level security;
alter table public.comments enable row level security;

-- 프로필: 누구나 읽기 / 본인 것만 생성·수정
create policy "profiles_read"   on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- 매장: 누구나 읽기(검색용) / 본인(사업주) 것만 생성·수정
create policy "stores_read"   on public.stores for select using (true);
create policy "stores_insert" on public.stores for insert with check (auth.uid() = owner_id);
create policy "stores_update" on public.stores for update using (auth.uid() = owner_id);

-- 게시글: 로그인하면 읽기 / 본인 글만 작성·수정·삭제
create policy "posts_read"   on public.posts for select using (auth.role() = 'authenticated');
create policy "posts_insert" on public.posts for insert with check (auth.uid() = author_id);
create policy "posts_update" on public.posts for update using (auth.uid() = author_id);
create policy "posts_delete" on public.posts for delete using (auth.uid() = author_id);

-- 댓글: 동일
create policy "comments_read"   on public.comments for select using (auth.role() = 'authenticated');
create policy "comments_insert" on public.comments for insert with check (auth.uid() = author_id);
create policy "comments_delete" on public.comments for delete using (auth.uid() = author_id);

-- ============================================================
--  (선택) 테스트용 등록 매장 몇 개 미리 넣기
--  ※ owner_id 없이도 검색 풀에는 보입니다.
-- ============================================================
insert into public.stores (name, category, address, biz_verified) values
  ('역삼 숯불갈비', '음식점', '서울 강남구 역삼동', true),
  ('테헤란 우동집', '음식점', '서울 강남구 테헤란로', true),
  ('로스터리 1F',  '카페',   '서울 강남구 역삼동', true),
  ('(주)강남테크',  'IT·회사', '서울 강남구 테헤란로', true),
  ('와벨리컴퍼니',  'IT·회사', '서울 강남구 역삼동', true),
  ('역삼 GS25 본점','편의점', '서울 강남구 역삼동', true)
on conflict do nothing;
