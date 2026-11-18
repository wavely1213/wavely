-- 1R(노원제너FS, adf1a613) 출장 명단 14줄을 제안 선수로 연결 — 소유자 "1R 명단 연결해"(2026-11-17), 관리자 [제안대로 모두 연결]과 같음. 운영 적용.
-- 검사: 14줄 모두 review + 기록지 이름 = 선수 이름 + 활동 선수 + 제안 겹침 없음. 1R 골 0 이라 득점자 줄은 그대로.
begin;
do $$
declare n int;
begin
  select count(*) into n
  from public.match_appearances a join public.players p on p.id = a.suggested_player_id
  where a.match_id = 'adf1a613-9349-4c01-a307-2d75e3c412ab' and a.link = 'review'
    and p.is_active and p.name = a.sheet_name;
  if n <> 14 then raise exception '1R 연결 검사: 맞는 줄 % (14 이어야 함)', n; end if;
  if (select count(distinct suggested_player_id) from public.match_appearances where match_id = 'adf1a613-9349-4c01-a307-2d75e3c412ab' and link = 'review') <> 14 then
    raise exception '1R 연결 검사: 같은 선수가 두 줄에 제안됨';
  end if;
  update public.match_appearances
     set link = 'confirmed', player_id = suggested_player_id, suggested_player_id = null
   where match_id = 'adf1a613-9349-4c01-a307-2d75e3c412ab' and link = 'review' and suggested_player_id is not null;
  get diagnostics n = row_count;
  if n <> 14 then raise exception '1R 연결: % 줄만 바뀜', n; end if;
end $$;
commit;
