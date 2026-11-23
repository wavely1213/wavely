-- 구단소식: 영상 주소(구단영상 — 유튜브·인스타그램, 상세에서 재생) + 메인 배너 고정 (D-035)
-- video_url : 유튜브(watch·shorts·youtu.be)·인스타그램(p·reel) 주소. 형식 검사는 관리자 서버 액션(lib/video parseVideoUrl)에서.
-- featured  : 구단소식 맨 위 슬라이드 배너에 고정. 고정한 글이 없으면 최근 소식(이적·작별 제외) 자동.
alter table public.news_posts
  add column video_url text check (video_url is null or (video_url ~ '^https://' and length(video_url) <= 300)),
  add column featured boolean not null default false;
