-- 1R 구단 소식 소급 (2026-11-16, 인스타 경기 글 → 구단 소식): 매치데이 기사 1 + 결과 기사 1. 총괄이 운영에 적용.
-- 결과 기사는 실제 인스타 결과 글 DfydP8oBq0V (2026-11-16 13:05 KST, '1라운드 경기결과🔵⚪ / 서울은평덴포스 0 : 7 노원제너FS') 기준:
-- 날짜 = 그 글 날짜, 본문 = 요약 + 정리한 글(이모지/해시태그 줄 빼고, 중간점 → /) + 인스타 링크, 사진 = 포스팅의 그 글 사진(있으면).
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
  res_posted date;
  res_caption text;
  res_image text;
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

  -- 결과: 홈팀 먼저. 인스타 결과 글 DfydP8oBq0V 의 날짜/글/사진
  select (posted_at at time zone 'Asia/Seoul')::date, caption into res_posted, res_caption from public.instagram_posts where code = 'DfydP8oBq0V';
  select thumbnail_url into res_image from public.postings where url = 'https://www.instagram.com/p/DfydP8oBq0V/';
  -- 글 정리: 해시태그만 있는 줄 빼고, 이모지/변형 선택자 빼고, 중간점 → / (BR-024), 줄 앞뒤 공백 정리
  res_caption := (
    select string_agg(t, E'\n')
    from (
      select btrim(regexp_replace(replace(l, '·', '/'), '[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F\u200D\u20E3]', '', 'g')) as t
      from unnest(string_to_array(coalesce(res_caption, ''), E'\n')) with ordinality as x(l, n)
      where btrim(l) <> '' and btrim(l) !~ '^(#[^[:space:]#]+[[:space:]]*)+$'
      order by n
    ) y
    where t <> ''
  );
  line := case when m.is_home
    then '서울은평 덴포스 ' || m.score_us || ' : ' || m.score_them || ' ' || m.opponent
    else m.opponent || ' ' || m.score_them || ' : ' || m.score_us || ' 서울은평 덴포스' end;
  title_res := '[' || m.round || ' 결과] ' || line;
  -- 같은 경기 결과 기사(점수 제목 또는 점수 없는 제목)가 있으면 넣지 않는다
  if not exists (select 1 from public.news_posts where category = 'news' and title in (title_res, '[' || m.round || '] ' || m.opponent || '전 경기 결과')) then
    insert into public.news_posts (category, title, date, summary, body, images, thumbnail_url, video_url, published, featured)
    values (
      'news', title_res, coalesce(res_posted, (m.kickoff at time zone 'Asia/Seoul')::date),
      comp || ' ' || m.opponent || '전 ' || line || ' (' || when_txt || coalesce(' ' || nullif(m.venue, ''), '') || ')',
      comp || ' ' || m.opponent || '전 ' || line || ' (' || when_txt || coalesce(' ' || nullif(m.venue, ''), '') || ')'
        || coalesce(E'\n\n득점: ' || nullif(m.scorers, ''), '')
        || coalesce(E'\n\n' || nullif(res_caption, ''), '')
        || case when res_posted is null then '' else E'\n\n구단 공식 인스타그램 게시물: https://www.instagram.com/p/DfydP8oBq0V/' end,
      case when res_image is null then '{}'::text[] else array[res_image] end,
      null, null, true, false
    );
  end if;
end $$;

commit;
