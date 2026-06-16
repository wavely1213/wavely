-- 05_store_insert_guard.sql
-- 목적: stores 인서트 시 신뢰 플래그(biz_verified)를 클라이언트가 임의로 켜지 못하게 방지.
-- 배경: 앱 클라이언트는 더이상 biz_verified 를 보내지 않지만(권한상승 수정 완료),
--       REST API 직접 호출로는 여전히 biz_verified=true 로 인서트 가능 → 서버에서 강제 차단.
-- 적용: Supabase SQL Editor 또는 `supabase db push` 로 1회 실행.

create or replace function public.guard_store_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 관리자가 아니면 신뢰 플래그는 무조건 기본값(false)으로 강제
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    new.biz_verified := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_store_insert on public.stores;
create trigger trg_guard_store_insert
  before insert on public.stores
  for each row execute function public.guard_store_insert();

-- 참고: is_ad / ad_weight 컬럼이 존재한다면(광고 시스템) 아래도 함께 강제 권장.
-- 컬럼 존재 여부가 확실하면 위 함수 본문에 new.is_ad := false; new.ad_weight := 0; 추가.
