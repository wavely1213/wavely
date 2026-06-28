-- ============================================================
--   SQL    (2026-06-26)
-- Supabase SQL    RUN.  .
-- : 19(RLS+) 20(CPC rank/place/infeed) 21(promo)
--       22(active_ads_public RPC) 23(/  )
-- ============================================================


--  19_rls_followup.sql 
-- 19_rls_followup.sql   (2026-06-25, )  RLS  
-- ============================================================================
--     .   Supabase(ref: tjsjxbbqyrtjblajmose)
--    Supabase SQL   . Vercel     .
--  likes/scraps/ads  DDL      /
--     DB    .  information_schema  + drop-if-exists
--     ,   ()()()    .
-- : data-security  4 (#13 likes/scraps, #14 ad_events, #15#16 ads, #17 profiles)
-- ============================================================================

-- 
-- (#13) likes / scraps   INSERT/DELETE ( user_id    )
--   user_id   likes (post_id vs target_type/target_id)  .
-- 
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='likes') then
    execute 'alter table public.likes enable row level security';
    execute 'drop policy if exists likes_read on public.likes';
    execute 'create policy likes_read on public.likes for select using (true)';          --   
    execute 'drop policy if exists likes_owner_ins on public.likes';
    execute 'create policy likes_owner_ins on public.likes for insert with check (auth.uid() = user_id)';
    execute 'drop policy if exists likes_owner_del on public.likes';
    execute 'create policy likes_owner_del on public.likes for delete using (auth.uid() = user_id)';
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='scraps') then
    execute 'alter table public.scraps enable row level security';
    execute 'drop policy if exists scraps_read on public.scraps';
    execute 'create policy scraps_read on public.scraps for select using (auth.uid() = user_id)';   --  
    execute 'drop policy if exists scraps_owner_ins on public.scraps';
    execute 'create policy scraps_owner_ins on public.scraps for insert with check (auth.uid() = user_id)';
    execute 'drop policy if exists scraps_owner_del on public.scraps';
    execute 'create policy scraps_owner_del on public.scraps for delete using (auth.uid() = user_id)';
  end if;
end $$;

-- 
-- (#14) ad_events   INSERT ,  log_ad_event RPC.
--    /      .
--   ( logAdEvent  sb.rpc('log_ad_event')  .)
--    2026-06-15        .
-- 
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='ad_events') then
    execute 'revoke insert on public.ad_events from anon, authenticated';
  end if;
end $$;
-- anon() /  RPC  ( ).
grant execute on function public.log_ad_event(uuid, text) to anon, authenticated;

-- 
-- (#15 #16) ads    +    ,   .
--    ads  RLS/   ( ).  :
--   -  fetchActiveAds() status='active'   select  SELECT active  .
--   - status='active'  INSERT    INSERT under_review/pending_payment .
-- 
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='ads') then
    execute 'alter table public.ads enable row level security';

    execute 'drop policy if exists ads_read on public.ads';
    execute $p$create policy ads_read on public.ads for select using (
      status = 'active'
      or auth.uid() = owner_id
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    )$p$;

    execute 'drop policy if exists ads_owner_ins on public.ads';
    execute $p$create policy ads_owner_ins on public.ads for insert with check (
      auth.uid() = owner_id
      and status in ('under_review','pending_payment')
      and exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
    )$p$;

    execute 'drop policy if exists ads_owner_upd on public.ads';
    execute 'create policy ads_owner_upd on public.ads for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id)';
  end if;
end $$;

-- (#16b) ads       client UPDATE status 'active'  .
--     (ad-activate , service_role) /  RPC .  'active'
--       (pausedactive  ).
create or replace function public.guard_ad_active() returns trigger language plpgsql security definer set search_path=public as $fn$
begin
  if new.status = 'active' and (old.status is distinct from 'active') then
    if not exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.is_admin,false)) then
      new.status := old.status;   --    
    end if;
  end if;
  return new;
end $fn$;
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='ads') then
    execute 'drop trigger if exists trg_guard_ad_active on public.ads';
    execute 'create trigger trg_guard_ad_active before update on public.ads for each row execute function public.guard_ad_active()';
  end if;
end $$;

-- 
-- (#17) profiles  (anon)    (HIGH)
--    profiles_read = using(true)   anon   
--   ad_balance()roleis_adminbiz_no( PII) enumeration .
--   anon posts_read=authenticated  /     anon  .
-- 
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='profiles') then
    execute 'drop policy if exists profiles_read on public.profiles';
    execute 'create policy profiles_read on public.profiles for select using (auth.role() = ''authenticated'')';
    execute 'revoke select on public.profiles from anon';
  end if;
end $$;
--  ():     profiles    select .
--     (a)  column-level revoke + (id,nickname,avatar_url) grant,
--   (b)   SECURITY DEFINER RPC(my_profile())  (/) .
--     select('...,ad_balance')     (a) (b)    .

notify pgrst, 'reload schema';
--  19_rls_followup.sql 


--  20_ad_format_billing.sql 
-- 20_ad_format_billing.sql   format       (DRAFT,   )
-- ============================================================================
-- : log_ad_event(18_biz_money_reward.sql)   v_format='rank' .
--    (wavely-admin) CPC  format='place'|'infeed'   active
--      0   (  =  ).  'rank'  .
-- :    format ('rank','place','infeed') . (  18 )
--      . Supabase SQL   RUN. 18  (create or replace).
--
--          (2026-06-26):
--   (a)  AdBuilder CPC  bid_amount ' '( 220 180,  )
--        . ''      DB  .   1=  ().
--        ad_weight=round(bid/500)  (     18   ).
--   (b) (explore.tsx)(main.jsx)      active_ads_public() store_idad_id
--        log_ad_event('click')  (22_active_ads_public.sql   ).
--     : 18  (19)  20( )  22.    place/infeed CPC   .
-- ============================================================================
create or replace function public.log_ad_event(p_ad_id uuid, p_type text)
returns void language plpgsql security definer set search_path=public as $function$
declare v_format text; v_status text; v_bid int; v_owner uuid; v_store uuid; v_admin boolean; v_bal int; v_new int;
begin
  if p_type not in ('impression','click') then return; end if;
  select format, status, coalesce(bid_amount,0), owner_id, store_id into v_format, v_status, v_bid, v_owner, v_store
  from public.ads where id = p_ad_id;
  if not found then return; end if;
  insert into public.ad_events(ad_id, store_id, type) values (p_ad_id, v_store, p_type);
  if p_type = 'click' and v_format in ('rank','place','infeed') and v_status = 'active' and v_bid > 0 then
    select coalesce(is_admin,false) into v_admin from public.profiles where id = v_owner;
    if v_admin then return; end if;
    perform public._expire_free(v_owner);
    select ad_balance into v_bal from public.profiles where id = v_owner for update;
    v_bal := coalesce(v_bal, 0);
    v_new := greatest(v_bal - v_bid, 0);
    update public.profiles set ad_balance = v_new, ad_free = greatest(0, ad_free - (v_bal - v_new)) where id = v_owner;  --  
    insert into public.ad_ledger(user_id, type, amount, balance_after, ref, memo)
      values (v_owner, 'deduct', -(v_bal - v_new), v_new, p_ad_id::text, ' ');
    if v_new <= 0 then
      update public.ads set status = 'paused' where id = p_ad_id;
      update public.stores set is_ad = false, ad_weight = 0 where id = v_store;
    end if;
  end if;
end $function$;

notify pgrst, 'reload schema';
--  20_ad_format_billing.sql 


--  21_board_promo_check.sql 
-- 21_board_promo_check.sql   CHECK  'promo'()  (  )
-- ============================================================================
-- : schema.sql:43 posts.board CHECK ('free','owner','staff')   'promo' .
--   (constants/app.ts BOARDS)(main.jsx BOARDS) '(promo)'  
--    board INSERT ,  DB schema.sql    CHECK (23514) .
--     DB   :
--   select pg_get_constraintdef(oid) from pg_constraint where conname like '%board%' and conrelid='public.posts'::regclass;
--    promo   ().
-- ============================================================================
do $$
declare cname text;
begin
  select conname into cname from pg_constraint
   where conrelid = 'public.posts'::regclass and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%board%';
  if cname is not null then
    execute format('alter table public.posts drop constraint %I', cname);
  end if;
  alter table public.posts add constraint posts_board_check
    check (board in ('free','owner','staff','promo'));
end $$;
--  21_board_promo_check.sql 


--  22_active_ads_public.sql 
-- 22_active_ads_public.sql      RPC (DRAFT,   Supabase SQL  RUN)
-- ============================================================================
-- : ads  SELECT / (RLS).   fetchActiveAds()
--    `from('ads').select(...)` " "   []    
--        (  0 ).   
--    (is_ad  )  ad_id    CPC   0.
-- : //   ' '    RPC.
--   (  active_banners()  .  + store_idad_id     .)
--  : id, format, headline, banner_image, store_id,  (name/category/rating/
--   review_count/address/photo). bid_amountmonthly_feeowner_id   .
-- ============================================================================
create or replace function public.active_ads_public()
returns jsonb language sql security definer set search_path=public stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'format', a.format,
    'headline', a.headline,
    'banner_image', a.banner_image,
    'store_id', a.store_id,
    'stores', case when s.id is null then null else jsonb_build_object(
        'name', s.name, 'category', s.category, 'rating', s.rating,
        'review_count', s.review_count, 'address', s.address, 'photo', s.photo) end
  )), '[]'::jsonb)
  from (select id, format, headline, banner_image, store_id
        from public.ads where status = 'active'
        order by created_at desc limit 50) a
  left join public.stores s on s.id = a.store_id;
$$;

revoke all on function public.active_ads_public() from public;
grant execute on function public.active_ads_public() to anon, authenticated;

notify pgrst, 'reload schema';
--  22_active_ads_public.sql 


--  23_place_photos.sql 
-- 23_place_photos.sql  /   ()  
-- ============================================================================
--  stores.photo(cover 1) + (places photo ) ,   
-- 4~5    (photos jsonb) . photos[0] = cover(=  photo ).
-- : (biz_verified)   ' '      
--    (backfill_photos.py biz_verified ).  /   .
-- : 260616 place_collector/backfill_photos.py    photo(cover)+photos[] .
-- Supabase SQL  RUN.
-- ============================================================================

-- 1) stores:  ( photo cover ).
alter table public.stores
  add column if not exists photos jsonb not null default '[]'::jsonb;

-- 2) places(  ): cover +    .
alter table public.places
  add column if not exists photo text;
alter table public.places
  add column if not exists photos jsonb not null default '[]'::jsonb;

-- 3)   ( grant       ).
grant select (photos) on public.stores to anon, authenticated;
grant select (photo, photos) on public.places to anon, authenticated;

notify pgrst, 'reload schema';
--  23_place_photos.sql 

