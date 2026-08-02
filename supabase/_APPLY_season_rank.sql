-- ============================================================
--  시즌 랭킹 리워드 + 순위 숨김
--  실행: Supabase SQL Editor 에 붙여넣고 RUN. 재실행 안전(idempotent).
--
--  설계 근거 (NEIGHBORHOOD_LEVEL.md):
--   · 최상위 원칙 = **cosmetic-only**. 이 순위·보상은 검색순위·광고노출·매장추천에
--     어떤 가중치도 주지 않고, 그렇게 "보여서도" 안 된다.
--   · '동네 리그' 화면은 v2 보류 상태 → 여기서는 리그 UI를 만들지 않고
--     **보상 지급 + 숨김 플래그**만 서버에 둔다.
--   · 새 비주얼을 발명하지 않는다. 이미 정의된 시즌 키를 보상으로 재사용한다:
--       테두리 season_sakura(벚꽃 시즌) / 배경 sakura · firework
-- ============================================================

-- ---------- 1) 순위 숨김 플래그 ----------
-- 랭킹은 재미 요소이지 강제가 아니다. 끄면 어떤 순위에도 집계되지 않는다.
alter table public.profiles
  add column if not exists rank_hidden boolean not null default false;

comment on column public.profiles.rank_hidden is
  '동네 랭킹 노출 거부. true면 랭킹 조회에서 제외된다(본인 레벨·아이템은 그대로).';

-- ---------- 2) 시즌 정의 ----------
create table if not exists public.level_seasons (
  key         text primary key,                  -- 예: '2026-spring'
  label       text not null,                     -- 예: '2026 봄 시즌'
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  -- 상위 n명에게 줄 보상. user_unlocks.kind/item_key 와 동일한 키를 쓴다.
  reward_border text,                            -- 예: 'season_sakura'
  reward_bg     text,                            -- 예: 'sakura'
  top_n       int not null default 3,
  granted_at  timestamptz                        -- 지급 완료 시각(있으면 재지급 안 함)
);

-- 시즌 순위 스냅샷 — 시즌 종료 시점의 결과를 남긴다(나중에 XP가 변해도 수상 내역은 불변).
create table if not exists public.season_ranks (
  season_key text not null references public.level_seasons(key) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  rank       int  not null,
  xp         bigint not null,
  primary key (season_key, user_id)
);

-- ---------- 3) 현재 랭킹 조회 ----------
-- 관리자·숨김 유저·XP 0 은 제외. 2명 미만이면 클라가 위젯을 숨긴다.
create or replace function public.get_top_users(p_limit int default 3)
returns table (user_id uuid, nickname text, lvl int, xp bigint, equipped_border text, avatar_url text)
language sql security definer stable set search_path=public as $$
  select p.id, p.nickname, coalesce(p.lvl,1), coalesce(p.xp,0), p.equipped_border, p.avatar_url
    from public.profiles p
   where coalesce(p.xp,0) > 0
     and not coalesce(p.is_admin,false)      -- 운영자가 1위면 조작된 리더보드로 보인다
     and not coalesce(p.rank_hidden,false)
   order by p.xp desc, p.created_at asc      -- 동점은 먼저 가입한 쪽이 위
   limit greatest(1, least(p_limit, 20));
$$;

-- ---------- 4) 시즌 마감 · 보상 지급 ----------
-- 운영자가 시즌 종료 후 1회 호출. 순위를 스냅샷하고 상위 n명에게 아이템을 지급한다.
create or replace function public.close_season(p_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.level_seasons; n int := 0;
begin
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    return jsonb_build_object('ok', false, 'reason', '권한이 없어요');
  end if;
  select * into s from public.level_seasons where key = p_key;
  if not found then return jsonb_build_object('ok', false, 'reason', '없는 시즌'); end if;
  if s.granted_at is not null then return jsonb_build_object('ok', false, 'reason', '이미 지급된 시즌'); end if;
  if now() < s.ends_at then return jsonb_build_object('ok', false, 'reason', '아직 진행 중인 시즌'); end if;

  -- 순위 스냅샷 — 시즌 기간에 쌓은 XP만 센다(누적 XP가 아니라 xp_ledger 구간 합).
  insert into public.season_ranks(season_key, user_id, rank, xp)
  select p_key, t.user_id, t.rn, t.gained
    from (
      select l.user_id,
             sum(l.delta) as gained,
             row_number() over (order by sum(l.delta) desc, min(l.created_at) asc) as rn
        from public.xp_ledger l
        join public.profiles p on p.id = l.user_id
       where l.created_at >= s.starts_at and l.created_at < s.ends_at
         and l.delta > 0
         and not coalesce(p.is_admin,false)
         and not coalesce(p.rank_hidden,false)
       group by l.user_id
      having sum(l.delta) > 0
    ) t
   where t.rn <= s.top_n
  on conflict do nothing;

  -- 보상 지급
  if s.reward_border is not null then
    insert into public.user_unlocks(user_id, kind, item_key)
    select r.user_id, 'border', s.reward_border from public.season_ranks r where r.season_key = p_key
    on conflict do nothing;
  end if;
  if s.reward_bg is not null then
    insert into public.user_unlocks(user_id, kind, item_key)
    select r.user_id, 'background', s.reward_bg from public.season_ranks r where r.season_key = p_key
    on conflict do nothing;
  end if;

  select count(*) into n from public.season_ranks where season_key = p_key;
  update public.level_seasons set granted_at = now() where key = p_key;
  return jsonb_build_object('ok', true, 'season', p_key, 'awarded', n);
end; $$;

-- ---------- 5) 권한 ----------
alter table public.level_seasons enable row level security;
alter table public.season_ranks  enable row level security;
drop policy if exists level_seasons_read on public.level_seasons;
create policy level_seasons_read on public.level_seasons for select using (true);
drop policy if exists season_ranks_read on public.season_ranks;
create policy season_ranks_read on public.season_ranks for select using (true);
grant select on public.level_seasons, public.season_ranks to anon, authenticated;

-- 본인만 자기 숨김 플래그를 바꾼다(다른 컬럼은 09/25 하드닝 그대로).
grant update (rank_hidden) on public.profiles to authenticated;

grant execute on function public.get_top_users(int) to anon, authenticated;
grant execute on function public.close_season(text) to authenticated;   -- 내부에서 is_admin 재확인

-- ---------- 6) 시즌 시드 (원하면 날짜만 바꿔 쓰세요) ----------
insert into public.level_seasons(key, label, starts_at, ends_at, reward_border, reward_bg, top_n)
values
  ('2026-autumn', '2026 가을 시즌', '2026-09-01', '2026-11-01', 'season_sakura', 'sakura', 3),
  ('2026-festival', '2026 축제 시즌', '2026-10-14', '2026-10-19', null, 'firework', 3)
on conflict (key) do nothing;

notify pgrst, 'reload schema';

-- 확인용
select key, label, starts_at::date, ends_at::date, reward_border, reward_bg, top_n, granted_at
  from public.level_seasons order by starts_at;
