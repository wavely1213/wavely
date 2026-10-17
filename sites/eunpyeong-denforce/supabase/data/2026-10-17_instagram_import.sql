-- 구단 인스타그램 새 게시물 2건 (2026-10-16 WELCOME 임우성·강민원) — 2026-10-17 운영 DB 에 넣은 내용 기록
-- 게시물 글·사진은 인스타그램 oEmbed(로그인 불필요)로 받았다. 사진은 운영 저장소 media/players·news·postings 에 따로 올렸다.
-- 등번호는 시즌 번호 확정 전이라 선수에는 넣지 않았다 (BR-025). 글에는 구단 발표 번호(No.1·No.5)를 그대로 적었다.
-- 강민원 포지션: 구단 발표에 없어 글에는 쓰지 않았고(BR-020), 선수 정보는 연맹 노원제너 FS 등록 명단(연맹 주소 mng_FSSeoul — 처음에 FS서울로 잘못 읽음) 포지션 아라(ALA)로 넣었다 — 확인 필요.
-- 추가만 하므로 두 번 실행하면 선수 주소(slug)가 겹쳐 실패한다.

insert into public.players (slug, number, name, position, photo_url, is_active) values
 ('lim-woosung', null, '임우성', 'GK', 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/lim-woosung-instagram.jpg', true),
 ('kang-minwon', null, '강민원', 'ALA', 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/kang-minwon-instagram.jpg', true);
insert into public.news_posts (category, title, date, summary, body, images, published) values
 ('news', '서울은평 덴포스, 골레이로 임우성 영입', '2026-10-16', '등번호 1번 골레이로(GK), 2026-27 시즌 FK리그 1부(FK1)에서 함께한다', $b$서울은평 덴포스가 골레이로 임우성을 영입했다.

서울은평 덴포스는 16일 구단 공식 SNS를 통해 임우성의 합류 소식을 전했다. 임우성은 2026-27 시즌 등번호 1번을 달고 골문을 지킨다.

구단은 "임우성 선수의 합류로 더욱 강해질 서울은평 덴포스에 많은 관심과 응원 부탁드린다"고 밝혔다.

서울은평 덴포스는 2026-27 시즌 FK리그 1부(FK1)에 나선다.

임우성 프로필
등번호: 1
포지션: 골레이로(GK)
선수 소개: https://eunpyeong-fs.com/team/players/lim-woosung$b$, array['https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/news/ig-DejG9ydTjGF-1.jpg'], true),
 ('news', '서울은평 덴포스, ''거침없는 질주'' 강민원 영입', '2026-10-16', '등번호 5번, 2026-27 시즌 FK리그 1부(FK1)에서 함께한다', $b$서울은평 덴포스가 강민원을 영입했다.

서울은평 덴포스는 16일 구단 공식 SNS를 통해 '거침없는 질주' 강민원의 합류 소식을 전했다. 강민원은 2026-27 시즌 등번호 5번을 단다.

구단은 "강민원 선수의 합류로 더욱 강해질 서울은평 덴포스에 많은 관심과 응원 부탁드린다"고 밝혔다.

서울은평 덴포스는 2026-27 시즌 FK리그 1부(FK1)에 나선다.

강민원 프로필
등번호: 5
선수 소개: https://eunpyeong-fs.com/team/players/kang-minwon$b$, array['https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/news/ig-DejMosnzCt7-1.jpg'], true);
insert into public.postings (kind, platform, title, author, excerpt, url, thumbnail_url, posted_on, published) values
 ('club','instagram',$t$𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝 서울은평덴포스가 No.1 임우성 선수를 영입했습니다.$t$,'@eunpyeong_denforce',$t$𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝 서울은평덴포스가 No.1 임우성 선수를 영입했습니다. 임우성 선수의 합류로 더욱 강해질 서울은평덴포스에 많은 관심과 응원 부탁드립니다. 💙$t$,'https://www.instagram.com/p/DejG9ydTjGF/','https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/postings/03d396ca3c938019.jpg','2026-10-16',true),
 ('club','instagram',$t$𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝 서울은평덴포스가 거침없는 질주 강민원 선수를 영입했습니다.$t$,'@eunpyeong_denforce',$t$𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝 서울은평덴포스가 거침없는 질주 강민원 선수를 영입했습니다. 강민원선수의 합류로 더욱 강해질 서울은평덴포스에 많은 관심과 응원 부탁드립니다. 💙$t$,'https://www.instagram.com/p/DejMosnzCt7/','https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/postings/980dc746469aa9d5.jpg','2026-10-16',true)
on conflict (url) do nothing;
