-- 1R 구단 소식 소급 (2026-11-16, 인스타 경기 글 → 구단 소식): 매치데이 기사 1 + 결과 기사 1. 총괄이 운영에 적용.
-- instagram-sync 의 matchdayNews / resultNews 와 같은 제목/요약 틀. 값은 경기 행(1R 노원제너FS)에서 읽는다.
-- 이미 같은 제목 기사가 있으면 넣지 않는다(여러 번 실행해도 같음). 경기 행이 정확히 1개가 아니거나 결과가 없으면 전체 취소.
begin;

do $$
declare
  m record;
  posted date;
  when_txt text;
  comp text;
  title_md text;
  title_res text;
  line text;
begin
  select * into m from public.matches
  where competition = '키움증권 2026-27 FK리그1' and round = '1R' and opponent = '노원제너FS';
  if not found then raise exception '1R 노원제너FS 경기 없음'; end if;
  if (select count(*) from public.matches where competition = '키움증권 2026-27 FK리그1' and round = '1R' and opponent = '노원제너FS') <> 1 then
    raise exception '1R 노원제너FS 경기가 정확히 1개가 아님';
  end if;
  if m.status <> 'finished' or m.score_us is null then raise exception '1R 결과가 아직 없음'; end if;

  -- '11.15 (일) 14:00' (한국 시간)
  when_txt := to_char(m.kickoff at time zone 'Asia/Seoul', 'FMMM.DD') || ' ('
    || (array['일','월','화','수','목','금','토'])[extract(dow from m.kickoff at time zone 'Asia/Seoul')::int + 1] || ') '
    || to_char(m.kickoff at time zone 'Asia/Seoul', 'HH24:MI');
  comp := m.competition || ' ' || m.round;
  -- 매치데이 글 올린 날(서울) — instagram_posts 기록, 없으면 경기 날
  select (posted_at at time zone 'Asia/Seoul')::date into posted from public.instagram_posts where code = 'DfuejQEzCn7';
  posted := coalesce(posted, (m.kickoff at time zone 'Asia/Seoul')::date);

  title_md := '[' || m.round || '] ' || m.opponent || '전 매치데이 — ' || when_txt || coalesce(' ' || nullif(m.venue, ''), '');
  if not exists (select 1 from public.news_posts where title = title_md) then
    insert into public.news_posts (category, title, date, summary, body, images, thumbnail_url, video_url, published, featured)
    values (
      'news', title_md, posted,
      comp || ' ' || m.opponent || '전, ' || when_txt || coalesce(' ' || nullif(m.venue, ''), '') || case when m.is_home then ' (홈)' else ' (원정)' end,
      comp || ' ' || m.opponent || '전, ' || when_txt || coalesce(' ' || nullif(m.venue, ''), '') || case when m.is_home then ' (홈)' else ' (원정)' end
        || E'\n\n구단 공식 인스타그램 게시물: https://www.instagram.com/p/DfuejQEzCn7/',
      case when m.matchday_poster_url is null then '{}'::text[] else array[m.matchday_poster_url] end,
      null, null, true, false
    );
  end if;

  -- 결과: 홈팀 먼저, 인스타 결과 글이 없어 링크 없음
  line := case when m.is_home
    then '서울은평 덴포스 ' || m.score_us || ' : ' || m.score_them || ' ' || m.opponent
    else m.opponent || ' ' || m.score_them || ' : ' || m.score_us || ' 서울은평 덴포스' end;
  title_res := '[' || m.round || ' 결과] ' || line;
  if not exists (select 1 from public.news_posts where title = title_res) then
    insert into public.news_posts (category, title, date, summary, body, images, thumbnail_url, video_url, published, featured)
    values (
      'news', title_res, (m.kickoff at time zone 'Asia/Seoul')::date,
      comp || ' ' || m.opponent || '전 ' || line || ' (' || when_txt || coalesce(' ' || nullif(m.venue, ''), '') || ')',
      comp || ' ' || m.opponent || '전 ' || line || ' (' || when_txt || coalesce(' ' || nullif(m.venue, ''), '') || ')'
        || coalesce(E'\n\n득점: ' || nullif(m.scorers, ''), ''),
      '{}'::text[], null, null, true, false
    );
  end if;
end $$;

commit;
