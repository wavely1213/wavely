-- 16_admin_free_analysis.sql
-- 관리자(개발자) 계정은 플레이스 분석 쿼터·결제 면제(무료 무제한). 15의 enforce_place_quota 갱신.
-- 적용: SQL Editor 또는 Management API.

create or replace function public.enforce_place_quota()
returns trigger language plpgsql security definer set search_path=public as $$
declare paid boolean; premium boolean; probe boolean; recent_cnt int;
begin
  if new.requested_by is null then
    return new;                          -- 워커 자동갱신 등 시스템 요청 통과
  end if;

  -- 관리자(개발자)는 면제 — 무료·무제한·경쟁사 포함
  if coalesce((select is_admin from public.profiles where id = new.requested_by), false) then
    return new;
  end if;

  paid    := public.has_place_pass(new.requested_by);
  premium := public.has_place_premium(new.requested_by);
  select coalesce(is_probe, false) into probe from public.stores where id = new.store_id;

  if probe then
    if not premium then
      raise exception 'PAYWALL_COMPETITOR' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if paid then
    return new;
  end if;

  select count(*) into recent_cnt
  from public.place_analysis_requests
  where requested_by = new.requested_by
    and requested_at > now() - interval '7 days';
  if recent_cnt >= 1 then
    raise exception 'PAYWALL_WEEKLY_LIMIT' using errcode = 'P0001';
  end if;

  return new;
end; $$;

notify pgrst, 'reload schema';
