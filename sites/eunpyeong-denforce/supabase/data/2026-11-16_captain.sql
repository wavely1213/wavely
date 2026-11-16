-- 주장단 (D-093) — 구단 인스타그램 2026/27 SQUAD NUMBERS (https://www.instagram.com/reel/Dfl_gSbT06w/) 기준.
-- 최진규 7 주장(C), 김대현 6 · 윤창욱 8 · 김종문 13 부주장(VC). 비어 있을 때만 넣는다(관리자 값 우선). 2026-11-16 운영 적용.
begin;
update public.players set captain = 'C' where slug = 'no-7' and number = 7 and name = '최진규' and captain is null;
update public.players set captain = 'VC' where captain is null and (slug, number, name) in (('no-8', 6, '김대현'), ('yoon-changwook', 8, '윤창욱'), ('no-13', 13, '김종문'));
do $$
begin
  if (select count(*) from public.players where captain = 'C') <> 1 or (select count(*) from public.players where captain = 'VC') <> 3 then
    raise exception '주장단 수가 C 1 / VC 3 이 아님';
  end if;
end $$;
commit;
