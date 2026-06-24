-- 17_ad_reject_notify.sql
-- 광고 검토반려: 사유 저장 + 소유주 알림(반려+사유), 소유주의 재검토 요청 기능.

-- 1) 반려 사유 컬럼
alter table public.ads add column if not exists reject_reason text;

-- 2) 반려 함수 — 사유 받아 저장 + 소유주에게 알림. (status='rejected' → 관리자 대시보드 목록에서 사라짐)
create or replace function public.admin_reject_ad(target uuid, reason text default null)
returns text language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); adm boolean; o uuid;
begin
  if uid is null then return 'no_auth'; end if;
  select is_admin into adm from public.profiles where id = uid;
  if not coalesce(adm, false) then return 'not_admin'; end if;

  update public.ads set status = 'rejected', reject_reason = reason
    where id = target
    returning owner_id into o;

  if o is not null then
    insert into public.notifications(user_id, type, title, body, link)
    values (o, 'ad_rejected', '광고 검토 반려',
            case when coalesce(reason,'') <> '' then '반려 사유: ' || reason
                 else '광고가 반려됐어요. 수정 후 다시 검토 요청할 수 있어요.' end,
            '/ad');
  end if;
  return 'ok';
end; $$;

-- 3) 재검토 요청 — 소유주가 반려된 본인 광고를 다시 검토대기로. 관리자에게 알림.
create or replace function public.request_ad_rereview(target uuid)
returns text language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); o uuid; st text;
begin
  if uid is null then return 'no_auth'; end if;
  select owner_id, status into o, st from public.ads where id = target;
  if o is null or o <> uid then return 'not_owner'; end if;
  if st <> 'rejected' then return 'not_rejected'; end if;

  update public.ads set status = 'under_review', reject_reason = null where id = target;

  insert into public.notifications(user_id, type, title, body, link)
  select id, 'ad_rereview', '광고 재검토 요청', '반려된 광고의 재검토 요청이 들어왔어요.', '/admin-dashboard'
  from public.profiles where is_admin = true;
  return 'ok';
end; $$;

revoke all on function public.request_ad_rereview(uuid) from anon, public;
grant execute on function public.request_ad_rereview(uuid) to authenticated;

notify pgrst, 'reload schema';
