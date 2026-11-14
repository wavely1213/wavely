-- 구단 인스타그램 새 게시물 3건 (2026-10-19 WELCOME 김종호·박재희·김남석) — 2026-10-20 운영 DB 에 넣은 내용 기록
-- 게시물 글·사진은 인스타그램 oEmbed(로그인 불필요)로 받았다. 게시물 주소는 공개 프로필 임베드의 미디어 ID로 구했고, 게시일도 미디어 ID에서 읽었다.
-- 사진은 운영 저장소 media/players·news·postings 에 따로 올렸다 (2026-10-17_instagram_import.sql 과 같은 방식).
-- 등번호는 시즌 번호 확정 전이라 선수에는 넣지 않았다 (BR-025). 글에는 구단 발표 번호(No.30·No.66·No.27)를 그대로 적었다.
-- 김종호: 2025-26 시즌 피보 김종호(옛 22번, 주소 no-22)와 **동명이인** (소유자 판단 2026-10-20 + 연맹 화성FS 명단 30번 아라 — 발표 번호 30과 같음). 합치지 말 것.
-- 포지션: 박재희는 구단 발표('지치지 않는 피보') + 연맹 용인대흥FS 명단 66번 피보. 김종호·김남석은 구단 발표에 없어 글에는 쓰지 않았고(BR-020),
--   선수 정보는 연맹 명단(김종호: 화성FS 30번 아라, 김남석: 고양불스 20번 아라 — 김남석은 번호가 달라 확인 필요)으로 넣었다.
-- 추가만 하므로 두 번 실행하면 선수 주소(slug)가 겹쳐 실패한다.

insert into public.players (slug, number, name, position, photo_url, is_active) values
 ('kim-jongho', null, '김종호', 'ALA', 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/kim-jongho-instagram.jpg', true),
 ('park-jaehee', null, '박재희', 'PIVO', 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/park-jaehee-instagram.jpg', true),
 ('kim-namseok', null, '김남석', 'ALA', 'https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/players/kim-namseok-instagram.jpg', true);
insert into public.news_posts (category, title, date, summary, body, images, published) values
 ('news', '서울은평 덴포스, ''확실한 존재감'' 김종호 영입', '2026-10-19', '등번호 30번, 2026-27 시즌 FK리그 1부(FK1)에서 함께한다', $b$서울은평 덴포스가 김종호를 영입했다.

서울은평 덴포스는 19일 구단 공식 SNS를 통해 '확실한 존재감' 김종호의 합류 소식을 전했다. 김종호는 2026-27 시즌 등번호 30번을 단다.

구단은 "김종호 선수의 합류로 더욱 강해질 서울은평 덴포스에 많은 관심과 응원 부탁드린다"고 밝혔다.

서울은평 덴포스는 2026-27 시즌 FK리그 1부(FK1)에 나선다.

김종호 프로필
등번호: 30
https://eunpyeong-fs.com/team/players/kim-jongho$b$, array['https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/news/ig-DerArQ-TWEJ-1.jpg'], true),
 ('news', '서울은평 덴포스, ''지치지 않는 피보'' 박재희 영입', '2026-10-19', '등번호 66번 피보(PIVO), 2026-27 시즌 FK리그 1부(FK1)에서 함께한다', $b$서울은평 덴포스가 피보 박재희를 영입했다.

서울은평 덴포스는 19일 구단 공식 SNS를 통해 '지치지 않는 피보' 박재희의 합류 소식을 전했다. 박재희는 2026-27 시즌 등번호 66번을 달고 피보 포지션에서 뛴다.

구단은 "박재희 선수의 합류로 더욱 강해질 서울은평 덴포스에 많은 관심과 응원 부탁드린다"고 밝혔다.

서울은평 덴포스는 2026-27 시즌 FK리그 1부(FK1)에 나선다.

박재희 프로필
등번호: 66
포지션: 피보(PIVO)
https://eunpyeong-fs.com/team/players/park-jaehee$b$, array['https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/news/ig-Deq4jF5Tgs1-1.jpg'], true),
 ('news', '서울은평 덴포스, ''베테랑'' 김남석 영입', '2026-10-19', '등번호 27번, 2026-27 시즌 FK리그 1부(FK1)에서 함께한다', $b$서울은평 덴포스가 베테랑 김남석을 영입했다.

서울은평 덴포스는 19일 구단 공식 SNS를 통해 '베테랑' 김남석의 합류 소식을 전했다. 김남석은 2026-27 시즌 등번호 27번을 단다.

구단은 "김남석 선수의 합류로 더욱 강해질 서울은평 덴포스에 많은 관심과 응원 부탁드린다"고 밝혔다.

서울은평 덴포스는 2026-27 시즌 FK리그 1부(FK1)에 나선다.

김남석 프로필
등번호: 27
https://eunpyeong-fs.com/team/players/kim-namseok$b$, array['https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/news/ig-DeqyKrQz1Vq-1.jpg'], true);
insert into public.postings (kind, platform, title, author, excerpt, url, thumbnail_url, posted_on, published) values
 ('club','instagram',$t$𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝 서울은평덴포스가 확실한 존재감 김종호 선수를 영입했습니다.$t$,'@eunpyeong_denforce',$t$𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝 서울은평덴포스가 확실한 존재감 김종호 선수를 영입했습니다. 김종호 선수의 합류로 더욱 강해질 서울은평덴포스에 많은 관심과 응원 부탁드립니다. 💙$t$,'https://www.instagram.com/p/DerArQ-TWEJ/','https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/postings/387d638e50ae7a8d.jpg','2026-10-19',true),
 ('club','instagram',$t$𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝 서울은평덴포스가 지치지 않는 피보 박재희 선수를 영입했습니다.$t$,'@eunpyeong_denforce',$t$𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝 서울은평덴포스가 지치지 않는 피보 박재희 선수를 영입했습니다. 박재희 선수의 합류로 더욱 강해질 서울은평덴포스에 많은 관심과 응원 부탁드립니다. 💙$t$,'https://www.instagram.com/p/Deq4jF5Tgs1/','https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/postings/5e3e5d108f452611.jpg','2026-10-19',true),
 ('club','instagram',$t$𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝 서울은평덴포스가 베테랑 김남석 선수를 영입했습니다.$t$,'@eunpyeong_denforce',$t$𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝 서울은평덴포스가 베테랑 김남석 선수를 영입했습니다. 김남석 선수의 합류로 더욱 강해질 서울은평덴포스에 많은 관심과 응원 부탁드립니다. 💙$t$,'https://www.instagram.com/p/DeqyKrQz1Vq/','https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/postings/d360cac622252d89.jpg','2026-10-19',true)
on conflict (url) do nothing;
