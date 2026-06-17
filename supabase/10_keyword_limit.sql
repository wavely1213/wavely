-- 10_keyword_limit.sql  (D1 결정: 키워드 개수 제한 사실상 제거)
-- 07_place_rank.sql 의 매장당 5개 제한 트리거를 30개로 상향(수집 서버 부하 보호용 안전상한).
-- 완전 무제한을 원하면 아래 DROP 한 줄만 실행(단, 한 매장이 수천 키워드 등록 시 수집 서버 과부하 위험).
create or replace function public.guard_keyword_limit()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (select count(*) from public.place_rank_keywords where store_id = new.store_id) >= 30 then
    raise exception '키워드는 매장당 최대 30개까지 등록할 수 있어요.';
  end if;
  return new;
end; $$;
-- 완전 무제한:  drop trigger if exists trg_keyword_limit on public.place_rank_keywords;
