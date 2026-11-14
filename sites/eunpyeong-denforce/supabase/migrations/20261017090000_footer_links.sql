-- 푸터 맨 아래 링크 (관리자 › 홈페이지 내용 › 공통, D-048) — 그동안 Footer.tsx 에 박혀 있던 '개인정보처리방침' 그대로 (목록이 비어 있을 때만).
-- 푸터 정보 줄·저작권 문구·대표 줄은 site_content 값이라 넣을 것이 없다 (행이 없으면 코드 기본값).
insert into public.content_items (list, title, body, link, sort_order)
select 'footer.links', '개인정보처리방침', '', '/privacy', 10
where not exists (select 1 from public.content_items where list = 'footer.links');
