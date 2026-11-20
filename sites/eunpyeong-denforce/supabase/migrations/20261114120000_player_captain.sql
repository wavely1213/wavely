-- 주장단 표식 (D-093) — 주장 'C' / 부주장 'VC', 없으면 null. 관리자 › 선수에서 고른다.
-- 사이트는 select('*') 로 읽으므로 열이 생기기 전에도 화면은 그대로(표식 없음). 관리자 저장은 이 마이그레이션 뒤에 쓴다.
alter table public.players
  add column if not exists captain text;

alter table public.players drop constraint if exists players_captain_check;
alter table public.players add constraint players_captain_check check (captain is null or captain in ('C', 'VC'));
