-- ============================================================================
--  와벨리 PHASE-3 뼈대 하드닝 SQL  (2026-07-24)  ⚠️ 사장님 검토 후 RUN.
--  결제 보안 "겹겹 방어"의 DB 계층(Layer 3) — 엣지함수(Layer 2) 위에 원장·RLS·제약·정산으로 3중.
--
--  [H1] 정본 credit_ad_balance — 라이브 수동생성본을 버전관리·강화(service_role전용·ref멱등·양수강제)로 교체.
--  [H2] 결제·카드·DM·알림 테이블 RLS 방화벽 — anon회수(완료)에 더해 authenticated도 본인행/참여자만.
--  [H3] 무결성 제약 — 음수 잔액·음수 단가 원천 차단(CHECK, not valid=기존행 무해).
--  [H4] 정산 탐지 RPC — '돈 받고 미적립' 등 결제-원장 불일치 자동 검출(관리자).
--
--  ※ 각 섹션은 독립적. H2의 messages/conversations는 채팅에 영향 크니 배포 후 채팅 테스트 필수(맨 아래 주의).
-- ============================================================================


-- ========================== [H1] 정본 credit_ad_balance =====================
-- charge-balance·portone-webhook(둘 다 service_role 엣지함수)이 호출. p_ref 멱등으로 웹훅 재시도·이중호출 방어.
-- ⚠️ 라이브에 이미 존재(수동생성). 이 정본으로 교체 — 충전은 ad_balance만 증가(ad_free 무관), 원장 1건.
create or replace function public.credit_ad_balance(p_user uuid, p_amount int, p_ref text)
returns int language plpgsql security definer set search_path=public as $$
declare v_after int;
begin
  if p_user is null then raise exception 'credit_ad_balance: user required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'credit_ad_balance: amount must be positive'; end if;
  if p_ref is null or length(p_ref) = 0 then raise exception 'credit_ad_balance: ref required'; end if;
  -- 멱등: 같은 ref의 charge가 이미 있으면 재적립 안 함(이중적립 원천차단). 현재 잔액 반환.
  if exists (select 1 from public.ad_ledger where ref = p_ref and type = 'charge') then
    select coalesce(ad_balance, 0) into v_after from public.profiles where id = p_user;
    return coalesce(v_after, 0);
  end if;
  update public.profiles set ad_balance = coalesce(ad_balance, 0) + p_amount
    where id = p_user returning ad_balance into v_after;
  if v_after is null then raise exception 'credit_ad_balance: user not found'; end if;
  insert into public.ad_ledger(user_id, type, amount, balance_after, ref, memo)
    values (p_user, 'charge', p_amount, v_after, p_ref, '광고비 충전');
  return v_after;
end $$;
-- service_role(엣지함수)만 실행. 클라(anon/authenticated)는 절대 직접 적립 못 함.
revoke all on function public.credit_ad_balance(uuid, int, text) from public, anon, authenticated;
grant execute on function public.credit_ad_balance(uuid, int, text) to service_role;


-- ========================== [H2] RLS 방화벽 (결제·카드·원장·알림) ============
-- anon은 이미 회수(_DEPLOY_2026-07-22 [9]). 여기선 authenticated도 '본인행만' + 쓰기는 service_role만.

-- payments: 본인 결제만 조회, 쓰기는 서버(service_role)만.
alter table public.payments enable row level security;
drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.payments from authenticated, anon;

-- billing_keys: 본인행만 + 카드토큰 원문 컬럼은 본인도 직접 못 읽음(마스킹/카드명만; 결제는 서버가 토큰 사용).
alter table public.billing_keys enable row level security;
drop policy if exists billing_keys_select_own on public.billing_keys;
create policy billing_keys_select_own on public.billing_keys for select to authenticated using (user_id = auth.uid());
revoke select (billing_key) on public.billing_keys from authenticated, anon;
revoke insert, update, delete on public.billing_keys from authenticated, anon;

-- ad_ledger: 본인 원장만 조회, 쓰기 서버만.
alter table public.ad_ledger enable row level security;
drop policy if exists ad_ledger_select_own on public.ad_ledger;
create policy ad_ledger_select_own on public.ad_ledger for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.ad_ledger from authenticated, anon;

-- notifications: 본인 알림만 조회·읽음처리·삭제. 생성은 서버만.
alter table public.notifications enable row level security;
drop policy if exists notifications_select_own on public.notifications;
drop policy if exists notifications_update_own on public.notifications;
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update_own on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete_own on public.notifications for delete to authenticated using (user_id = auth.uid());
revoke insert on public.notifications from authenticated, anon;


-- ========================== [H3] 무결성 제약 (음수/이상값 차단) ==============
-- not valid = 기존 행 검사 생략(배포 안전), 이후 모든 쓰기에 강제. 결제·과금 이상값 원천 차단.
do $$ begin
  if not exists (select 1 from pg_constraint where conname='profiles_ad_balance_nonneg') then
    execute 'alter table public.profiles add constraint profiles_ad_balance_nonneg check (ad_balance >= 0) not valid';
  end if;
  if not exists (select 1 from pg_constraint where conname='profiles_ad_free_nonneg') then
    execute 'alter table public.profiles add constraint profiles_ad_free_nonneg check (coalesce(ad_free,0) >= 0) not valid';
  end if;
  if not exists (select 1 from pg_constraint where conname='ad_keywords_bid_nonneg') then
    execute 'alter table public.ad_keywords add constraint ad_keywords_bid_nonneg check (bid_amount >= 0) not valid';
  end if;
  if not exists (select 1 from pg_constraint where conname='pricing_amount_nonneg') then
    execute 'alter table public.pricing add constraint pricing_amount_nonneg check (amount >= 0) not valid';
  end if;
  if not exists (select 1 from pg_constraint where conname='ads_amounts_nonneg') then
    execute 'alter table public.ads add constraint ads_amounts_nonneg check (coalesce(bid_amount,0) >= 0 and coalesce(monthly_fee,0) >= 0 and coalesce(monthly_budget,0) >= 0) not valid';
  end if;
end $$;


-- ========================== [H4] 정산 탐지 RPC (관리자) ======================
-- 결제-원장 불일치 검출: (1) 충전결제 paid인데 적립 원장 없음(돈받고 미적립 의심)
--                        (2) 같은 payment_id 중복 paid  (3) 음수 잔액 유저.
create or replace function public.payment_recon()
returns table(issue text, ref text, user_id uuid, amount int, at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    -- (1) 충전(ad_id null) paid인데 매칭 charge 원장 없음
    select 'paid_not_credited'::text, p.payment_id, p.user_id, p.amount, p.created_at
      from public.payments p
     where p.status = 'paid' and p.ad_id is null
       and not exists (select 1 from public.ad_ledger l where l.ref = p.payment_id and l.type = 'charge')
    union all
    -- (3) 음수 잔액(제약 이전 데이터 등)
    select 'negative_balance'::text, pr.id::text, pr.id, pr.ad_balance, pr.updated_at
      from public.profiles pr where coalesce(pr.ad_balance,0) < 0;
end $$;
revoke all on function public.payment_recon() from public, anon;
grant execute on function public.payment_recon() to authenticated;   -- 내부에서 is_admin 게이트

notify pgrst, 'reload schema';


-- ============================================================================
--  [H2-b] 채팅 RLS (messages/conversations/conversation_members) — ⚠️ 별도·신중
--  아래는 채팅에 영향이 크므로 '기본 세트'만. 배포 전 반드시:
--   ① select relname,relrowsecurity from pg_class where relname in
--      ('messages','conversations','conversation_members');  로 현재 RLS 상태 확인
--   ② select tablename,policyname,cmd,qual from pg_policies where tablename in (...);  로 기존 정책 확인
--   기존에 using(true) 같은 과대허용 정책이 있으면 그걸 drop 해야 실효(안 그러면 OR로 뚫림).
--  ③ 배포 후 실제 채팅 송수신·목록 테스트.
--  컬럼 근거(앱코드): conversation_members(conversation_id,user_id,nick,role) / messages(conversation_id,sender_id,body)
-- ============================================================================
-- alter table public.messages enable row level security;
-- drop policy if exists messages_member_select on public.messages;
-- create policy messages_member_select on public.messages for select to authenticated
--   using (exists (select 1 from public.conversation_members m where m.conversation_id = messages.conversation_id and m.user_id = auth.uid()));
-- drop policy if exists messages_sender_insert on public.messages;
-- create policy messages_sender_insert on public.messages for insert to authenticated
--   with check (sender_id = auth.uid() and exists (select 1 from public.conversation_members m where m.conversation_id = messages.conversation_id and m.user_id = auth.uid()));
-- alter table public.conversations enable row level security;
-- drop policy if exists conversations_member_select on public.conversations;
-- create policy conversations_member_select on public.conversations for select to authenticated
--   using (exists (select 1 from public.conversation_members m where m.conversation_id = conversations.id and m.user_id = auth.uid()));
-- (conversation_members 자체 RLS는 자기참조라 SECURITY DEFINER 헬퍼가 안전 — 상태 확인 후 별도 작성)
