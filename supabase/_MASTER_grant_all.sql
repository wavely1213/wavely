-- ============================================================
--  마스터 계정 전량 지급 — wavely1213@motmot.co.kr
--  · 모든 테두리(등급 5종 포함)·칭호·배경·뱃지 보유
--  · 등급 테두리(브론즈~다이아)는 레벨게이트라 lvl=50(다이아)로 올려 전부 착용 가능하게
--  · '와벨리 단골'(sponsor 슬롯) 활성화 = 착용 상태로 세팅
--  재실행 안전(idempotent). item_key 는 웹 UI(LV_BORDERS/LV_TITLES/LV_BGS)와 정확히 일치해야 함.
-- ============================================================
do $$
declare uid uuid;
begin
  select id into uid from auth.users where lower(email) = 'wavely1213@motmot.co.kr';
  if uid is null then
    raise notice '계정 없음: wavely1213@motmot.co.kr (가입 먼저 필요)';
    return;
  end if;

  -- 등급 테두리 전량 착용 가능하도록 다이아(최상위 tier=50)로. xp도 정합 맞춤.
  update public.profiles
     set lvl = 50,
         xp  = public.xp_for_level(50),
         equipped_border = 'sponsor'     -- 와벨리 단골 활성화
   where id = uid;

  -- 비(非)등급 수집품 전량 지급 (등급 5종은 user_unlocks 대상 아님 — 위 레벨로 해금)
  insert into public.user_unlocks(user_id, kind, item_key)
  select uid, t.kind, t.item_key from (values
    -- 테두리(특수)
    ('border','founder'), ('border','streak_30'), ('border','season_sakura'), ('border','sponsor'),
    -- 칭호 전량
    ('title','rookie'), ('title','guardian'), ('title','chatter'), ('title','localboss'),
    ('title','hunter'), ('title','beloved'), ('title','evangelist'), ('title','captain'), ('title','regular'),
    -- 배경 전량 (plain은 기본제공이라 불필요)
    ('background','wave'), ('background','dots'), ('background','ripple'), ('background','mountain'),
    ('background','lake'), ('background','sakura'), ('background','firework'), ('background','founder'),
    -- 뱃지 전량
    ('badge','owner'), ('badge','biz'), ('badge','resident_6m'), ('badge','popular'), ('badge','neighbor')
  ) as t(kind, item_key)
  on conflict do nothing;

  raise notice '마스터 지급 완료: % (lvl 50 · 전 수집품)', uid;
end $$;

notify pgrst, 'reload schema';
