-- 1R 매치데이 포스터 데이터 (D-096) — 마이그레이션 20261114150000 뒤, 정식판 배포 때 실행. 비어 있을 때만 넣는다(여러 번 실행해도 같음).
-- 포스터 = 운영 임시판(I-065)이 쓰던 저장소 그림, 게시물 = 소유자가 준 1R MATCH DAY 인스타 게시물.
-- 2R 부터는 드라이브(matchday-poster-sync)와 instagram-sync 가 빈 칸을 채운다.
begin;
update public.matches
set matchday_poster_url = coalesce(matchday_poster_url, 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/content/matchday-2627-1r.jpg'),
    matchday_post_url = coalesce(matchday_post_url, 'https://www.instagram.com/p/DfuejQEzCn7/')
where competition = '키움증권 2026-27 FK리그1' and round = '1R' and opponent = '노원제너FS';

do $$
begin
  if (select count(*) from public.matches where competition = '키움증권 2026-27 FK리그1' and round = '1R' and opponent = '노원제너FS' and matchday_post_url is not null) <> 1 then
    raise exception '1R 노원제너FS 경기가 정확히 1개가 아님';
  end if;
end $$;
commit;
