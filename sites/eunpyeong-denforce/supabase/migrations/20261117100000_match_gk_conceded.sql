-- 골키퍼별 실점 (D-098) — 연맹 결과기록지에 골키퍼 실점이 없어 관리자가 경기 폼에서 직접 넣는다.
-- 한 경기에 골키퍼 여러 명(교체)일 수 있다. 합계는 그 경기 상대 득점(matches.score_them)을 넘지 못한다.
-- 공개 읽기는 match_appearances 처럼 행 전체 공개, 화면 표시는 앱이 stats_live 로 가린다(C7).

create table public.match_gk_conceded (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,  -- 기록이 있는 선수는 지워지지 않는다
  conceded smallint not null check (conceded between 0 and 99),
  updated_at timestamptz not null default now(), updated_by text,
  primary key (match_id, player_id)
);

create index match_gk_conceded_player on public.match_gk_conceded (player_id);

create trigger match_gk_conceded_audit before insert or update on public.match_gk_conceded
  for each row execute function public.set_audit();

-- 합계 검사: 끝난 경기만, 합계 ≤ 상대 득점
create or replace function public.match_gk_conceded_check()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_them smallint;
  v_status text;
  v_sum integer;
begin
  select m.score_them, m.status into v_them, v_status from public.matches m where m.id = new.match_id;
  if v_status is distinct from 'finished' or v_them is null then
    raise exception using errcode = '23514', message = 'gk_conceded_not_finished',
      detail = '끝난 경기(스코어 있음)에만 골키퍼 실점을 넣을 수 있습니다.';
  end if;
  select coalesce(sum(c.conceded), 0) into v_sum from public.match_gk_conceded c where c.match_id = new.match_id;
  if v_sum > v_them then
    raise exception using errcode = '23514', message = 'gk_conceded_over_score',
      detail = format('골키퍼 실점 합계(%s)가 상대 득점(%s)보다 많습니다.', v_sum, v_them);
  end if;
  return null;
end;
$$;

create constraint trigger match_gk_conceded_sum after insert or update on public.match_gk_conceded
  deferrable initially deferred
  for each row execute function public.match_gk_conceded_check();

-- 시즌 합계 (대회 이름별) — 이 경기에 실점 줄이 있는 골키퍼의 경기 수와 실점
create view public.player_gk_season with (security_invoker = true) as
select m.competition, c.player_id,
       count(*)::int as games,
       coalesce(sum(c.conceded), 0)::int as conceded
from public.match_gk_conceded c
join public.matches m on m.id = c.match_id
where m.status = 'finished'  -- 경기를 다시 '예정'으로 돌리면 그 경기 줄은 합계에서 빠진다 (총괄 검토)
group by m.competition, c.player_id;

revoke all on public.match_gk_conceded, public.player_gk_season from anon, authenticated;
alter table public.match_gk_conceded enable row level security;

create policy match_gk_conceded_read on public.match_gk_conceded for select to anon, authenticated using (true);
create policy match_gk_conceded_admin_insert on public.match_gk_conceded for insert to authenticated with check (public.is_admin());
create policy match_gk_conceded_admin_update on public.match_gk_conceded for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy match_gk_conceded_admin_delete on public.match_gk_conceded for delete to authenticated using (public.is_admin());

grant select (match_id, player_id, conceded) on public.match_gk_conceded to anon;
grant select, insert, update, delete on public.match_gk_conceded to authenticated;
grant select on public.player_gk_season to anon, authenticated;
