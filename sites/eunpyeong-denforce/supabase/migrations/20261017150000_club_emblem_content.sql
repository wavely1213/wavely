-- 관리자 개편 2단계 — 구단소개·엠블럼/유니폼 목록 (관리자 › 홈페이지 내용, D-049).
-- 그동안 src/data/club.ts 에 박혀 있던 값 그대로 넣는다 (목록마다 비어 있을 때만 — 다시 돌려도 중복되지 않는다).
-- 코드보다 먼저 적용한다: 새 코드는 목록이 비어 있으면 그 칸을 숨긴다.
-- 사진·섹션 제목·엠블럼 설명·유니폼 시즌은 site_content 값이라 넣을 것이 없다 (행이 없으면 코드 기본값).

-- 구단소개 '팀 조직' 카드 — body 는 항목 한 줄에 하나
insert into public.content_items (list, title, body, sort_order)
select 'club.organization', v.title, v.body, v.sort_order
from (values
  ('남자 성인', E'1군 서울은평 덴포스 (FK리그)\n2군 풋살사관학교 (생활체육)', 10),
  ('여자 성인', E'1군 서울은평 위민 (FK리그 참가 목표)\n2군 풋살사관학교 레이디스 (생활체육)', 20),
  ('유소년', E'U-18 (고등부)\nU-15 (중등부)\nU-12 (초등부)\nU-6 (유치부)', 30)
) as v(title, body, sort_order)
where not exists (select 1 from public.content_items where list = 'club.organization');

-- 구단소개 '지역 활동' 카드
insert into public.content_items (list, title, body, sort_order)
select 'club.community', v.title, v.body, v.sort_order
from (values
  ('지역 연계 프로그램', E'다문화 청년네트워크 풋살 교육\n이미자 통합센터 풋살 교육\n그루터기 지역아동센터 풋살 교육', 10),
  ('대회 유치', E'은평구청장배 풋살 대회\n서울특별시 은평구 i LEAGUE', 20),
  ('전국 풋살 순회교육', '국민체육진흥공단 파견 스포츠스타 풋살 교육', 30)
) as v(title, body, sort_order)
where not exists (select 1 from public.content_items where list = 'club.community');

-- 엠블럼 'Main Color' — body 는 색 코드 '#RRGGBB'
insert into public.content_items (list, title, body, sort_order)
select 'emblem.colors', v.title, v.body, v.sort_order
from (values
  ('로열블루', '#2B4FA2', 10),
  ('골드', '#E3A33A', 20),
  ('블랙', '#1A1715', 30),
  ('화이트', '#FFFFFF', 40)
) as v(title, body, sort_order)
where not exists (select 1 from public.content_items where list = 'emblem.colors');

-- 유니폼 사진 — title 은 사진 아래 이름, body 는 사진 설명(대체 글)
insert into public.content_items (list, title, body, image_url, sort_order)
select 'kit.images', v.title, v.body, v.image_url, v.sort_order
from (values
  ('홈', '2026-27 홈 유니폼 (로열블루)', '/photos/kit-2627-home.webp', 10),
  ('어웨이', '2026-27 어웨이 유니폼 (화이트/블루 스트라이프)', '/photos/kit-2627-away.webp', 20)
) as v(title, body, image_url, sort_order)
where not exists (select 1 from public.content_items where list = 'kit.images');
