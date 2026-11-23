-- 2026-10-19 푸터 맨 아래 오른쪽에 구단 소유 사업자 정보 (소유자: 사업자등록증 공유 + "푸터 맨 아래에"). 운영 DB 적용 2026-10-19.
-- 관리자 › 홈페이지 내용 › 공통 '맨 아래 오른쪽 정보'(footer.legal)와 같은 값 — 관리자에서 고칠 수 있다.
-- 사업자등록증의 생년월일 등 개인정보는 싣지 않는다. 대표 이름은 {대표}(관리자 기본 정보 '대표')에서 온다.
insert into public.site_content (key, value)
values ('footer.legal', '**상호** 풋볼아카데미 **대표** {대표} **사업자등록번호** 110-19-57248')
on conflict (key) do update set value = excluded.value;
