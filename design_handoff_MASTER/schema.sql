-- 와벨리 — Supabase 스키마 (앱·소비자웹·관리자웹 공용 / 단일 프로젝트)
-- 사용: Supabase SQL Editor에 실행. 이미 있는 테이블은 건너뛰고 diff만 적용.
-- 프로토타입 목업 상수 ↔ 이 스키마 매핑은 SUPABASE_INTEGRATION.md 참고.

create extension if not exists "uuid-ossp";
-- 반경 검색을 PostGIS로 할 경우: create extension if not exists postgis;

-- ── 역할/프로필 ───────────────────────────────────────────
create type user_role as enum ('guest','part','staff','owner');   -- 손님/알바/직장인/사장님
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  role user_role not null default 'guest',
  dong text,                       -- 인증 동 (효자동 …)
  avatar_url text,
  created_at timestamptz default now()
);

-- ── 매장/장소 ─────────────────────────────────────────────
create table if not exists stores (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references profiles(id),
  name text not null,
  main text,                       -- 대분류: 음식점/카페/미용·뷰티/의료/생활서비스/쇼핑 …
  categories text,                 -- '음식점 · 고기집'
  dong text,
  addr text,
  lat double precision, lng double precision,   -- 지도 마커 (없으면 geocode 캐시)
  rating numeric(2,1) default 0,
  review_count int default 0,
  biz_verified boolean default false,           -- ✓ 인증매장 배지
  is_ad boolean default false,                  -- 광고 강조 마커
  ad_weight int default 0,                       -- 노출 가중(정렬)
  note text,                       -- 한 줄 소식 ('런치 특선 9,900원')
  created_at timestamptz default now()
);
create index if not exists stores_geo on stores(lat,lng);

create table if not exists store_news (        -- 우리동네 새 소식 (오픈/영업중/마감세일)
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id) on delete cascade,
  status text,                     -- '오픈' | '영업중' | '마감세일'
  note text,
  created_at timestamptz default now()
);

-- ── 커뮤니티 ──────────────────────────────────────────────
create table if not exists posts (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid references profiles(id),
  board text not null,             -- free/promo/owner/staff …
  dong text,
  title text not null,
  body text,
  anonymous boolean default false,
  place_name text,
  image_url text,
  hot boolean default false,
  tags text[] default '{}',
  like_count int default 0,
  comment_count int default 0,
  created_at timestamptz default now()
);
create index if not exists posts_board_time on posts(board, created_at desc);

create table if not exists comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references posts(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade,  -- 대댓글
  author_id uuid references profiles(id),
  body text not null,
  anonymous boolean default false,
  like_count int default 0,
  created_at timestamptz default now()
);

create table if not exists post_likes ( post_id uuid references posts(id) on delete cascade, user_id uuid references profiles(id), primary key(post_id,user_id) );
create table if not exists scraps     ( post_id uuid references posts(id) on delete cascade, user_id uuid references profiles(id), created_at timestamptz default now(), primary key(post_id,user_id) );
create table if not exists follows    ( follower uuid references profiles(id), followee uuid references profiles(id), primary key(follower,followee) );

-- ── 플레이스 지수 (N지수=네이버 외부 / W지수=와벨리 자체) ──
create table if not exists place_analysis (
  store_id uuid primary key references stores(id) on delete cascade,
  n3 numeric(4,2),                 -- N지수 (네이버 플레이스, 1~3 척도)
  w_index int,                     -- W지수 (와벨리 자체, 0~100)
  breakdown jsonb,                 -- { star, review, info, verify_bonus, ad_bonus, follower, news_activity, response_rate, ... }
  analyzed_at timestamptz default now()
);

-- ── 광고 / 정산 ───────────────────────────────────────────
create table if not exists ad_campaigns (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id) on delete cascade,
  product text not null,           -- 'banner' | 'infeed' | 'place'
  name text,
  status text default 'review',    -- 'review'(검수) | 'active'(진행중) | 'ended'(종료)
  budget int,
  keywords text[] default '{}',
  region text[] default '{}',
  imp int default 0, clk int default 0, conv int default 0, spend int default 0,
  starts_on date, ends_on date,
  created_at timestamptz default now()
);
create table if not exists ad_billing (   -- 잔액 + 청구 내역
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id) on delete cascade,
  kind text,                       -- 'charge' | 'invoice'
  desc text,
  amount int,
  created_at timestamptz default now()
);

-- ── 채팅 ──────────────────────────────────────────────────
create table if not exists chats ( id uuid primary key default uuid_generate_v4(), kind text, name text, created_at timestamptz default now() );
create table if not exists chat_members ( chat_id uuid references chats(id) on delete cascade, user_id uuid references profiles(id), primary key(chat_id,user_id) );
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  chat_id uuid references chats(id) on delete cascade,
  sender_id uuid references profiles(id),
  body text,
  created_at timestamptz default now()
);
create index if not exists messages_chat_time on messages(chat_id, created_at);

-- ── 마케팅 입점/대기 (랜딩) ───────────────────────────────
create table if not exists leads ( id uuid primary key default uuid_generate_v4(), email text, store_name text, phone text, created_at timestamptz default now() );

-- ── RPC / 뷰 (프로토타입 정렬·집계 대체) ──────────────────
-- 인기글: 좋아요+댓글 가중, 최근 N시간
create or replace function hot_posts(hours int default 24, lim int default 5)
returns setof posts language sql stable as $$
  select * from posts where created_at > now() - (hours||' hours')::interval
  order by (like_count + comment_count*2) desc limit lim;
$$;
-- 가까운 동 (앱 위치 매칭) · 키워드 순위 · KPI 집계는 비즈니스 로직에 맞게 구현
-- create function nearest_dong(lat,lng) … / place_keyword_rank(store_id) … / ad_kpis(store_id,days) …

-- ── RLS (요점: 읽기 공개, 쓰기 본인 소유만) ───────────────
alter table profiles      enable row level security;
alter table posts         enable row level security;
alter table comments      enable row level security;
alter table stores        enable row level security;
alter table ad_campaigns  enable row level security;
alter table messages      enable row level security;

create policy "read all"      on posts  for select using (true);
create policy "insert own"    on posts  for insert with check (auth.uid() = author_id);
create policy "update own"    on posts  for update using (auth.uid() = author_id);
create policy "stores read"   on stores for select using (true);
create policy "stores owner"  on stores for all   using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "ads owner"     on ad_campaigns for all using (
  auth.uid() = (select owner_id from stores where stores.id = ad_campaigns.store_id)
);
-- comments/messages/profiles 도 동일 패턴(본인 row write, 채팅은 chat_members 한정).
