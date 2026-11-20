-- 경기: 하이라이트·다시보기 영상 주소 + 우리 팀 득점자 (경기결과 화면, 관리자 › 경기에서 입력)
-- highlight_url : 하이라이트 영상 (연맹 유튜브 '[하이라이트] …' 등). https 주소만, 500자 이하
-- replay_url    : 경기 전체 다시보기 (연맹 생중계 '[LIVE] …' 등). https 주소만, 500자 이하
-- scorers       : 우리 팀 득점자 한 줄, 자유 글 (예: '원해연 2, 김민성'). 300자 이하. 관리자는 종료 경기만 저장한다
-- 모두 비워 둘 수 있다(null). 형식 검사는 관리자 서버 액션(FormReader.optHttpsUrl)에서도 같은 범위로 한다.
-- 다시 실행해도 된다 (열이 이미 있으면 건너뛴다).
alter table public.matches
  add column if not exists highlight_url text
    constraint matches_highlight_url_check check (highlight_url is null or (highlight_url ~ '^https://' and length(highlight_url) <= 500)),
  add column if not exists replay_url text
    constraint matches_replay_url_check check (replay_url is null or (replay_url ~ '^https://' and length(replay_url) <= 500)),
  add column if not exists scorers text
    constraint matches_scorers_check check (scorers is null or length(scorers) between 1 and 300);
