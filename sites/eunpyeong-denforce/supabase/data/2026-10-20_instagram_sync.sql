-- 구단 인스타그램 자동 확인(D-064)으로 찾은 게시물 반영 기록 — 2026-10-20 운영 DB 적용.
-- 사진은 scripts/instagram/check.ts --download 로 받고 scripts/instagram/upload.ts 로 media/postings 에 올렸다.

-- 10-20 첫 확인: 2026-10-16 GOOD LUCK 박영완(이적) 게시물이 포스팅에 빠져 있었다 (구단소식 기사·선수단 정리는 그때 반영됨)
insert into public.postings (kind, platform, title, author, excerpt, url, thumbnail_url, posted_on, published) values
 ('club','instagram',$t$GOOD LUCK 박영완 선수가 이적을 하며 은평과의 동행을 마무리하게 됐습니다.$t$,'@eunpyeong_denforce',$t$GOOD LUCK 박영완 선수가 이적을 하며 은평과의 동행을 마무리하게 됐습니다. 한 시즌동안 은평을 위해 헌신해준 열정을 기억하며 박영완 선수의 앞날을 응원하겠습니다🍀$t$,'https://www.instagram.com/p/DeifQk2TESF/','https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/postings/006db18fa3027e5d.jpg','2026-10-16',true)
on conflict (url) do nothing;
