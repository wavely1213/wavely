-- ============================================================
--  핫픽스: 레벨 꾸미기 컬럼 SELECT 부여 (이미 _DRAFT_level_system.sql 을 RUN 한 경우 이것만 추가 실행)
--  이유: 25_profiles_pii_lockdown 이 '당시 존재하던' 컬럼만 개별 grant 했다.
--        이후 추가된 lvl/equipped_* 는 grant 대상에서 빠져, 피드·댓글의 인라인 등급 링 조인
--        (profiles(nickname,lvl,equipped_border,equipped_title))이 권한오류로 실패한다.
--  레벨·장착은 cosmetic(공개 표시용)이므로 노출 무방. 재실행 안전.
-- ============================================================
grant select (lvl, equipped_title, equipped_border, equipped_background)
  on public.profiles to authenticated;

notify pgrst, 'reload schema';
