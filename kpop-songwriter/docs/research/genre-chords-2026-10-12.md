# K-pop 코드 진행 카탈로그와 앱 프리셋 점검

## 요약

- 앱 프리셋 15개 중 8개(hope·emotional·royal·dreamy·ballad·dark·sad·epic)는 K-pop에서 흔한 진행이에요. 국내 곡 근거도 충분해요.
- 나머지 7개는 근거가 약하거나 이름이 틀려요.
  - descend: 이름이 '안달루시안'인데 실제로는 5도가 단3화음으로 나와요. 안달루시안은 5도가 장3화음이어야 해요.
  - trap [1,6]: 출처에서 한 번도 안 나와요.
  - mystic: 곡 근거 없이 일반론만 있어요.
  - citypop: 시티팝이라는 근거가 약해요. 3이 III7 대신 iii7로 나와요.
  - dreamy: '몽환'이라는 근거가 없어요.
  - build·simple: 근거가 1~2곡뿐이에요.
- 카탈로그 진행 62개를 앱과 맞춰 봤어요.
  - 있음 9개, 비슷함 11개예요.
  - 없음 21개는 지금 구조에서 프리셋만 추가하면 돼요.
  - 표현 불가 21개예요.
- 장르를 가리지 않는 가장 큰 구멍은 네 가지예요.
  1. 단조의 5도가 늘 단3화음(v)이에요. 화성단음계 V를 못 내요.
  2. 발라드 후렴의 핵심 `4-4m-3-6-2-5-1`을 못 내요.
  3. III7(마루사·세컨더리)을 못 내요.
  4. 마디당 2코드를 못 내요.
- 섹션 기본값(BY_TYPE)은 장르를 보지 않아요. 장조는 벌스와 브릿지가 같고, 단조는 네 섹션이 모두 sad예요.
- AI 편곡에는 곡의 `style.genre`가 넘어가지 않아요.
- 마지막 후렴 반음 키업 근거는 발라드에만 있어요. 다크·클럽·밴드에서는 확인된 사례가 없어요.

확인한 파일(읽기만 했어요):
- /home/user/wavely/kpop-songwriter/src/js/music/theory.js
- /home/user/wavely/kpop-songwriter/src/js/music/arrangement.js
- /home/user/wavely/kpop-songwriter/src/js/ai-music.js
- /home/user/wavely/kpop-songwriter/src/js/constants.js
- /home/user/wavely/kpop-songwriter/docs/DECISION_LOG.md (D-003, D-020)

저장소 파일은 고치지 않았어요.

---

## 0. 읽는 법

**장르 약칭**
- 발라드 = K-발라드(정통·OST·아이돌 발라드·락 발라드)
- 청량 = 밝은 댄스 팝·청량·이지리스닝
- 다크 = 걸크러시·다크·하드 EDM·힙합 팝
- R&B = R&B·시티팝·뉴잭스윙·디스코
- 클럽 = 하우스·저지 클럽·UK 개러지·DnB·뭄바톤·아프로
- 밴드 = 밴드·록·팝펑크·힙합/트랩

**도수 표기**
- 장조는 숫자로 써요. 다이아토닉 기본 화음은 숫자만 써요(6 = 6m).
- 바뀐 화음만 표시해요.
  - `3(7)`은 3도 속7(V/vi)이에요. `3(장)`은 3도 장3화음이에요.
  - `4m`은 차용한 마이너 4도예요. `♭6`·`♭7`은 차용한 장3화음이에요.
  - `5/7`은 분수코드예요. 슬래시 뒤가 베이스음이에요.
- 단조는 로마숫자로 써요. 자연단음계 기준이에요(III = ♭III, VI = ♭VI, VII = ♭VII).
  - 대문자 `V`는 화성단음계의 장3화음이에요. 소문자 `v`는 단3화음이에요.
- 앱 표기 `[4,5,3,6]`은 PROGRESSIONS의 degrees 배열이에요.

**화성 리듬**
- 마디당 코드 수예요. 대부분 추정이에요.
- 발라드는 채보에 마디선이 없어서 템포로 짐작했어요(low).
- Hooktheory BPM이 150 넘게 적힌 곡은 체감상 하프타임으로 봐야 해요.

**확신도**
- 그 곡, 그 섹션에서 그 진행이 쓰였는지에 대한 값이에요.
- 출처는 대부분 사용자 채보(Hooktheory·코드표)예요.
- 명칭 확신도는 따로 적었어요. '(통칭)'은 국내 페이지로 확인하지 못한 이름이에요.

**출처 약칭**
- `HT:x` = https://www.hooktheory.com/theorytab/view/x
- `GTE:x` = https://www.guitartabsexplorer.com/x
- `KC:x` = https://www.kpopchords.com/x.html
- `GT:x` = https://www.guitaretab.com/x.html
- `DC:n` = https://gall.dcinside.com/board/view/?id=compose&no=n (디시 작곡갤)
- `DC베이스` = https://gall.dcinside.com/mgallery/board/view/?id=bass&no=420230
- `wiki:x` = https://en.wikipedia.org/wiki/x
- `ko.wiki:x` = https://ko.wikipedia.org/wiki/x
- `논문` = https://koreascience.kr/article/CFKO201433752814184.pdf (박은지·이승연 2014, 200곡 분석)
- `brunch` = https://brunch.co.kr/@@ePjx/4
- `fmkorea` = https://www.fmkorea.com/1736308388
- `studionol1` = https://studionol.co.kr/ko/stories/chordprog1
- `studionol2` = https://studionol.co.kr/ko/stories/chord-progression1
- `idology:n` = https://idology.kr/n

**코드에서 확인한 앱의 사실**
- 단조 스케일은 자연단음계예요(`[0,2,3,5,7,8,10]`).
  - 5도는 v(Em), 7도는 VII(G), 2도는 ii°예요.
  - seventh를 켜면 v7·VII7(속7)·iiø7이 돼요.
- seventh는 섹션 단위 플래그예요. 섹션 안의 모든 코드에 7th가 붙어요.
- AI 출력은 도수 1~7만 받아요. 섹션당 최대 16개예요.
- 진행이 마디 수보다 짧으면 반복해요.
  - 그래서 7코드 진행을 8마디에 넣으면 8마디째가 첫 코드가 돼요.
  - 3코드 진행은 4마디 프레이즈와 어긋나요.

---

## 1. 장르별 코드 진행 카탈로그

### 1-1. 여러 장르가 같이 쓰는 진행

| ID | 도수 (장조 / 단조) | 국내 이름 | 장르 | 섹션 | 화성 리듬 | 코드 색 | 대표곡 | 근거 | 확신도 |
|---|---|---|---|---|---|---|---|---|---|
| P01 | `4-5-3-6` / `VI–VII–v–i` | 4536 왕도 (DC:312971). 일본 王道進行 | 발라드·청량·밴드 | 후렴 첫머리, 프리, 인트로, 브릿지 | 발라드 2, 청량 1.5~2 | IVmaj7·iii7·vi7, V7sus4. 3 자리에 III7이 자주 와요 | 아이유 「좋은 날」(2010), TWICE 「YES or YES」(2018), iKON 「사랑을 했다」(2018), 멜로망스 「사랑인가 봐」(2022) | GTE:iu/good-day-chords, HT:twice/yes-or-yes, HT:ikon/love-scenario, GTE:melomance/love-maybe-chords | high (진행) / medium (명칭) |
| P02 | `4-5-3-6-2-5-1` / `VI–VII–v–i–iv–VII–III` | 왕도 확장형 (명칭 미확인) | 발라드·청량 | 후렴 | 2 | 3화음, 끝 5sus4→5 | 「좋은 날」, 이하이 「한숨」(2016), 오마이걸 「Remember Me」(2018, 4-5-3-6-4-5-1), GFRIEND 「오늘부터 우리는」(2015, 프리 4-5-3-6-2-3(7)-6) | GTE:iu/good-day-chords, GTE:lee-hi-Tabs/breathe-acoustic-crd.php, HT:oh-my-girl/remember-me, HT:gfriend/me-gustas-tu | high |
| P03 | `6-3-4-5` (변형 `6-3-1-4`, `6-3-4-1-5`) / `i–v–VI–VII` | 명칭 없음 | 청량·다크·밴드 | 후렴·인트로·벌스 | 1 | 단3화음 v·v7. TT는 전부 7th, 끝 III7 | TWICE 「TT」(2016), BTS 「DNA」(2017, 인트로), BTS 「Anpanman」(2018), BLACKPINK 「How You Like That」(2020, 벌스 6-3-1-4) | HT:twice/tt, HT:bts/dna, HT:bts/anpanman, HT:blackpink/how-you-like-that | medium-high |
| P04 | `1-5-6-4` / `III–VII–i–VI` | 1564, 머니코드 (brunch, DC:145139) | 발라드·청량·밴드 | 벌스·후렴 | 1 | 3화음, add9, 5sus4 | 버즈 「가시」(2005, 벌스), 아이유 「첫 이별 그날 밤」(2017), IU 「Celebrity」(2021, 벌스), YB 「나는 나비」(2006, 벌스) | brunch, GTE:buzz/thorn-chords, HT:iu/celebrity, HT:yb/flying-butterfly | high / 명칭 medium |
| P05 | `6-4-1-5` / `i–VI–III–VII` | 6415 팝펑크 "순환가능" (DC:312971) | 발라드·청량·다크·밴드·클럽 | 벌스·인트로·프리·후렴 | 1 | 3화음, i7, III 1전위 | 아이유 「Love poem」(2019, 벌스), 소녀시대 「Oh!」(2010, 후렴), LE SSERAFIM 「ANTIFRAGILE」(2022), The Rose 「Take Me Down」(2018) | KC:2021/04/iu-love-poem-chords, HT:girls-generation/oh, HT:le-sserafim/antifragile, GT:the-rose_take-me-down_415761 | high |
| P06 | `4-1-5-6` / `VI–III–VII–i` | 4156 (1564 회전형, DC:145139) | 다크·밴드 | 후렴·프리 | 1 | 3화음. 단조 곡의 나란한 장조 후렴 | BLACKPINK 「마지막처럼」(2017), ITZY 「WANNABE」(2020), YB 「나는 나비」(프리·후렴) | HT:blackpink/as-if-its-your-last, HT:itzy/wannabe, HT:yb/flying-butterfly | high |
| P07 | `6-5-1-4` (변형 `6-1-5-4`) / `i–VII–III–VI` | 6514 (통칭) | 다크·밴드 | 후렴·프리·인트로 | 1 | 파워코드 | BLACKPINK 「Lovesick Girls」(2020, 후렴), 「마지막처럼」(프리), 「PLAYING WITH FIRE」(2016, 인트로), LE SSERAFIM 「FEARLESS」(2022) | HT:blackpink/lovesick-girls, HT:blackpink/playing-with-fire, HT:le-sserafim/fearless | medium |
| P08 | `1-6-4-5` / `1-6-5-4` | 명칭 미확인 | 발라드·청량 | 벌스·후렴 | 1 | 6m7, 5sus4 | 아이유 「Love wins all」(2024), NCT DREAM 「Candy」(2022, 벌스), Red Velvet 「빨간 맛」(2017, 후렴) | HT:iu/love-wins-all, HT:nct-dream/candy, HT:red-velvet/red-flavor | high |
| P09 | `1-5-6-3-4-1-4(2)-5` | 캐논 진행, 캐논 코드 | 발라드·청량 | 후렴·벌스 | 2 (Heart Shaker도 체감 2) | 3화음. 1/3 분수코드로 잇기도 해요 | 백지영 「사랑 안 해」(2006), DAY6 「Congratulations」(2015), 이승철 「그런 사람 또 없습니다」(2006, 1-5-6-3-4-5-1), TWICE 「Heart Shaker」(2017) | ko.wiki:파헬벨의_카논, GTE:day6/congratulations-chords, GTE:lee-seung-chul/no-one-else-chords, HT:twice/heart-shaker | high |
| P10 | `1-5/7-6-3/5-4-1/3-2-5` (베이스 1-7-6-5-4-3-2) | 베이스 하행, 분수코드 진행 | 발라드·청량 | 벌스·도입부·후렴 | 2 | 분수코드, m7, add9. 변형 `3(장)/#5`, 경과 `#5°7` | 폴킴 「너를 만나」(2018), 규현 「광화문에서」(2014), 태양 「눈,코,입」(2014), 아이유 「이런 엔딩」(2017), 「Heart Shaker」 후렴 | fmkorea, HT:kyuhyun/at-gwanghwamun, HT:taeyang/eyes-nose-lips, GTE:iu/ending-scene-chords | high |
| P11 | `1-7-6-5m-4` 하강, `1-5/7-4/6-3/5-2/4` | 1-7-6-5 하강 (G선상의 아리아) | 청량·R&B | 프리·후렴 | 1 | maj9, ø7, 차용 5m7, 1(7)=V/IV | Red Velvet 「Feel My Rhythm」(2022), BTS 「Permission to Dance」(2021), 오마이걸 「Windy Day」(2016) | HT:red-velvet/feel-my-rhythm, HT:bts/permission-to-dance, HT:oh-my-girl/windy-day | high |
| P12 | `4-5-6` (변형 `4-5-1-6`) / `VI–VII–i` | 456 (DC:312971), ♭6-♭7-1 | 청량·다크·밴드·R&B | 후렴 상승부·프리 | 1~1.5 | VImaj7, i7, 끝 5sus4→5 | 소녀시대 「다시 만난 세계」(2007), BTS 「FAKE LOVE」(2018), N.Flying 「옥탑방」(2019), BTS 「Butter」(2021), BLACKPINK 「Whistle」(2016, 4-5-1-6) | HT:girls-generation/into-the-new-world, HT:bts/fake-love, HT:n-flying/rooftop, HT:bts/butter, HT:blackpink/whistle | high |
| P13 | `4-5-6-1` (회전 `6-1-4-5`) / `VI–VII–i–III` (`i–III–VI–VII`) | 4561 (통칭) | 청량·다크·밴드 | 프리·벌스·리드아웃 | 1 | 3화음, VImaj7 | IVE 「LOVE DIVE」(2022, 프리), BLACKPINK 「Lovesick Girls」(벌스·프리), BTS 「DOPE」(2015, 프리) | HT:ive/love-dive, HT:blackpink/lovesick-girls, HT:bts/dope | high |
| P14 | `4maj7-3(7)-6m7` + `1` / `5m7-1(7)` / `2m7-5(7)` / `VImaj7–V7–i7` | 436(5)1 마루사 (DC:312971, DC베이스). "Just the Two of Us 진행"은 국내 명칭 미확인 | 청량·R&B·클럽·밴드 | 후렴 위주, 프리 | 1 (Feel Special 16코드/16마디). JTTOU형은 마지막 마디에 2코드 | maj7, III7(♭9), 1(7)=V/IV, 차용 5m7 | TWICE 「Feel Special」(2019), ILLIT 「Magnetic」(2024), 정국 「Seven」(2023), Red Velvet 「Queendom」(2021), QWER 「Discord」(2023) | HT:twice/feel-special, HT:illit/magnetic, HT:jungkook/seven-ft-latto, HT:red-velvet/queendom, HT:qwer/discord | high |
| P15 | `4-3-6` (+`-2-5-1`, `4-3-2-5-1`), 전부 7th / `VI–v–i` | 4-3-6 진행 (서술형, 명칭 low) | 발라드·청량·R&B·클럽 | 인트로·벌스·후렴 | 1~2 | maj7·m7 일색, 끝 5(7♭5)·sus4 | 이하이 「한숨」(인트로·벌스), 태연 「Rain」(2016), NewJeans 「Ditto」(2022, 4-3-6-2-5), f(x) 「4 Walls」(2015) | GTE:lee-hi-Tabs/breathe-acoustic-crd.php, KC:2022/05/taeyeon-rain-chords, HT:newjeans/ditto, HT:fx/4-walls | high |
| P16 | `4-2-3-6` (`2-3-6`) / `VI–iv–v–i` | 명칭 미확인 (다크 노트: "단조 4-2-3-6") | 청량·R&B·클럽·다크 | 벌스·후렴 루프·인트로·브릿지 | 1~2 | m7·m9·add9. 다크는 끝을 장3화음 I로 | 소녀시대 「Gee」(2009), IU 「LILAC」(2021), NewJeans 「Hype Boy」(2022), NMIXX 「Party O'Clock」(2023), TWICE 「FANCY」(2019, 브릿지) | HT:girls-generation/gee, HT:iu/lilac, HT:newjeans/hype-boy, HT:nmixx/party-oclock, HT:twice/fancy | high (곡) / medium (묶음) |
| P17 | `2-5-1-6`, `6-2-5-1`, `2-5-3-6-2-5-1` | 251, 투파이브원 (DC:145139, studionol2) | R&B·발라드·밴드(힙합) | 벌스부터 후렴까지 전부 | 1 (발라드 2) | m7·속7·7sus4·add13·9·13 | FIFTY FIFTY 「Cupid」(2023, 2-5-1-6 그대로), Red Velvet 「Bad Boy」(2018), 폴킴 「너를 만나」, ZICO 「아무노래」(2020) | HT:fifty-fifty/cupid, HT:red-velvet/bad-boy, GTE:paul-kim/me-after-you-chords, HT:zico/any-song | high |
| P18 | `6-2-5-1` / `i–iv–VII–III` | 6251 (DC:312971), 단조 투파이브원 | 다크·청량·발라드·R&B | 벌스·후렴·리드아웃 | 1 | m7, IIImaj7 | LE SSERAFIM 「HOT」(2025), 선미 「가시나」(2017, 벌스), GFRIEND 「해야」(2019), IVE 「After Like」(2022, 리드아웃) | HT:le-sserafim/hot, HT:sunmi/gashina, HT:gfriend/sunrise, HT:ive/after-like | high |
| P19 | `4-7-3-6-2-5-1`, `2-5-1-4-7-3-6`, `3-6-2-5-1` / `i–iv–VII–III–VI–ii°–V–i` | 순환 진행, 5도권, 서클 진행 | 청량·발라드·밴드·R&B | 후렴·벌스·인트로 | 약 2 | 전부 7th, ø7. 단조 5는 화성단음계 V7 | 러블리즈 「Destiny (나의 지구)」(2016), 「WoW!」(2016), 태연 「사계」(2019), 김범수 「보고싶다」(2002, 3-6-2-5-1), DAY6 「Hurt Road」 | HT:lovelyz/destiny, HT:lovelyz/wow, GTE:taeyeon/four-seasons-chords, GTE:kim-bum-soo/bogoshipda-chords, GT:day6_hurt-road_402676 | high (밴드 medium) |
| P20 | `1-3-6-4` (끝에 `4m`) / `III–v–i–VI` | 1-3-6-4 (명칭 없음) | 발라드·밴드 | 후렴·벌스 | 1~2 | 5sus4→5 | 아이유 「Love poem」(후렴), 크러쉬 「Beautiful」(2016), BTS 「봄날」(2017, 벌스), LE SSERAFIM 「Crazier」(2024) | KC:2021/04/iu-love-poem-chords, KC:2020/10/crush-beautiful-chords, wiki:Spring_Day_(BTS_song), HT:le-sserafim/crazier | high |
| P21 | `1-3(7)-4-4m-2-5`, `1-3(7)-4-5-1`, `1-3(7)-6-4` | 세컨더리 도미넌트 (DC:145139 "C E7 Am F") | 발라드·R&B·밴드 | 후렴 | 1~2 | III7 = V/vi | 다비치 「이 사랑」(2016), 버즈 「가시」(후렴), Red Velvet 「Psycho」(2019), QWER 「고민중독」(2024), BIGBANG 「LOSER」(2015) | KC:2020/12/davichi-this-love-chords, GTE:buzz/thorn-chords, HT:red-velvet/psycho, HT:qwer/tbh, HT:bigbang/loser | high |
| P22 | 장조 차용 `1-6-♭6-♭7`, `1-♭7-4-♭6`, `1-♭6-5`, `1-♭7-4-5`, `1-♭7-♭6-1` | 모달 인터체인지 (명칭 없음) | 청량·다크·밴드 | 후렴·프리·인트로 | 약 1 | 3화음, 파워코드 | Red Velvet 「Power Up」(2018), 「음파음파」(2019), IVE 「ELEVEN」(2021), TWICE 「FANCY」(프리), DAY6 「Marathon」 | HT:red-velvet/power-up, HT:red-velvet/umpah-umpah, HT:ive/eleven, HT:twice/fancy, GT:day6_marathon_395904 | high (밴드 medium) |
| P23 | 단조 장3화음 IV: `i–VII–IV–Vsus4`, `i–VII–IV–♭VI`, `i–III–IV–VI`, `i–IV–VII–III` | 도리안 IV (통칭) | 다크·밴드·발라드 | 프리·후렴·인트로 | 1 | Vsus4 | LE SSERAFIM 「UNFORGIVEN」(2023), 「FEARLESS」(프리), 「No Celestial」(2022), BLACKPINK 「JUMP」(2025), 에일리 「첫눈처럼 너에게 가겠다」(2017) | HT:le-sserafim/unforgiven, HT:le-sserafim/no-celestial, HT:blackpink/jump, KC:2021/02/ailee-first-snow-chords | medium (첫눈처럼 high) |
| P24 | 화성단음계 V: `i–V`, `VI–V–i`, `i–VI–V`, `VI–III–V7–i`, `i–iv–V7`, `i–VI–III–V7` | 하모닉 마이너. 논문은 V를 v보다 일반적으로 봐요 | 다크·밴드·발라드·클럽 | 후렴·벌스·랩 | 1 | V, V7, V7(♭9) | BLACKPINK 「Shut Down」(2022), Red Velvet 「Peek-A-Boo」(2017), EXID 「위아래」(2014), iKON 「KILLING ME」(2018), 태연 「사계」(벌스) | HT:blackpink/shut-down, HT:red-velvet/peek-a-boo, HT:exid/up-and-down, HT:ikon/killing-me, 논문 | high |
| P25 | `i–VII–VI–V` (V 장3화음) / 자연단음계형 `i–VII–VI–v–iv` | 안달루시안 진행 (ko.wiki:코드_진행) | 다크·클럽 | 후렴 | 1 | V·V7, VII 2전위 | KISS OF LIFE 「Midas Touch」(2024), (G)I-DLE 「Good Thing」(2025), EVERGLOW 「LA DI DA」(2020, 자연단음계형) | HT:kiss-of-life/midas-touch, HT:i-dle/good-thing, HT:everglow/la-di-da | medium |
| P26 | `i–♭II` 뱀프, `i–III–VI–i–♭II`, 프리지안 도미넌트 `I–♭II` | 프리지안 투코드 (통칭) | 다크·밴드·클럽 | 후렴·드롭·인트로 | 코드 하나에 1~2마디 | 파워코드(no3), ♭IImaj7 | BLACKPINK 「How You Like That」(2020), aespa 「Supernova」(2024), NCT 127 「Sticker」(2021), BLACKPINK 「Pink Venom」(2022), LE SSERAFIM 「Eve, Psyche & the Bluebeard's Wife」(2023) | HT:blackpink/how-you-like-that, HT:aespa/supernova, HT:nct-127/sticker, HT:blackpink/pink-venom | high (계열) |
| P27 | 단조 2코드 `i7–iv7`, `VII–i`, `i–v` | 투코드 (통칭) | 다크·밴드 | 벌스·후렴·랩 | 1 | m7, add9 | EXO 「Call Me Baby」(2015), NMIXX 「DASH」(2024), NMIXX 「O.O」(2022) | HT:exo/call-me-baby, HT:nmixx/dash, HT:nmixx/o.o | medium |
| P28 | 선법 2코드 `i–IV`(도리안), `ii7–i7`(도리안), `i9↔I9` | 도리안 투코드 (통칭) | 다크·밴드·청량·R&B·클럽 | 벌스·프리·후렴 | 1 (Super Shy는 약 2마디에 1코드) | m7·m9 | BLACKPINK 「붐바야」(2016, 프리), BIGBANG 「BAE BAE」(2015), NewJeans 「Super Shy」(2023), NCT 127 「Kick It」(2020) | HT:blackpink/boombayah, HT:bigbang/bae-bae, HT:newjeans/super-shy, HT:nct-127/kick-it | medium-high |
| P29 | 원코드 `i` (장조는 `1` 뱀프) | 원 코드 진행 (논문 용어) | 다크·R&B | 후렴·드롭·벌스 | 코드 하나로 8~16마디 | 808·리프 중심 | BLACKPINK 「뚜두뚜두」(2018, 후렴), BTS 「Butter」(벌스) | 논문, HT:blackpink/ddu-du-ddu-du, HT:bts/butter | high (논문: 록·댄스 15곡) / medium (곡) |
| P30 | `6-5-2-4` / `i–VII–iv–VI` | 명칭 없음 | 다크·R&B | 곡 전체 | 1 | m7 | TWICE 「I CAN'T STOP ME」(2020) | HT:twice/i-cant-stop-me | high (1곡) |
| P31 | `2-5-6-3` / `iv–VII–i–v` | 2536 (DC:179077 "설레는 느낌") | 청량·다크 | 후렴 | 약 1 | m7, add9, 끝 V7/ii | TWICE 「Talk that Talk」(2022), STAYC 「RUN2U」(2022) | HT:twice/talk-that-talk, HT:stayc/run2u | medium |
| P32 | 평행 9th 하강 (플레이닝) | 패럴렐 코드 (명칭 low) | R&B·클럽 | 후렴·드롭 | 미확인 | m9·9 반음 평행 이동 | NewJeans 「How Sweet」(2024), LE SSERAFIM 「CRAZY」(2024) | HT:newjeans/how-sweet, HT:le-sserafim/crazy | medium |
| P33 | 도미넌트 없는 단조 루프 `i7–v7–iv7–v7`, `i7–VImaj9–v7`, `i–iv–VI–v` | 마이너 루프 (서술형) | 클럽·R&B·다크·밴드 | 인스트·후렴 | 1 | m7·m9·maj9 | SHINee 「View」(2015), NewJeans 「Bubble Gum」(2024), LE SSERAFIM 「EASY」(2024) | HT:shinee/view, HT:newjeans/bubble-gum, HT:le-sserafim/easy | medium (Bubble Gum high) |
| P34 | 믹솔리디안 `1-5m-4` | 믹솔리디안 I–v–IV | 클럽·밴드 | 인트로·벌스·브릿지 | 1 | add9, 리프 | LE SSERAFIM 「Eve…」(인트로·브릿지), ITZY 「SNEAKERS」(2022) | HT:le-sserafim/eve-psyche--and-amp-the-bluebeards-wife, HT:itzy/sneakers | medium |

### 1-2. 발라드에서만 확인된 진행

| ID | 도수 | 국내 이름 | 섹션 | 화성 리듬 | 코드 색 | 대표곡 | 근거 | 확신도 |
|---|---|---|---|---|---|---|---|---|
| B01 | `4maj7-4m6-3m7-6m7-2m7-5(7sus4→7)-1maj7` | "4-4m-3-6", 4도 마이너 차용 | 후렴 (정통·OST의 핵심) | 2 | IVmaj7, iv6, 7sus4→7 | 아이유 「이런 엔딩」(2017), 정승환 「너였다면」(2016), 김범수 「보고싶다」(2002) | GTE:iu/ending-scene-chords, GTE:jung-seung-hwan/if-it-is-you-chords, GTE:kim-bum-soo/bogoshipda-chords | high (진행) / low (명칭) |
| B02 | `4-4m-3m-6m-2m-3(장)-6m` | 같음 | 후렴 | 2 | III 장3화음 | 아이유 「밤편지」(2017) | GTE:iu/through-the-night-chords | medium-high |
| B03 | `1-3m-4-4m`, `1-3m-6m-4m` | 4m 차용 | 후렴 | 1 | iv | BTS 「봄날」(후렴), 폴킴 「Dream」(2020) | wiki:Spring_Day_(BTS_song), KC:2021/10/paul-kim-dream-chords | high |
| B04 | `1-4-7m7-3(7)-6m` / `III–VI–ii°7–V7–i` | 4-7-3-6 (단조 2-5-1) | 후렴 | 2 | III7 | 성시경 「희재」(2003) | GTE:sung-si-kyung/heejae--chords | medium-high |
| B05 | `1maj7-4maj7-3m7-6(7)` | VI7 (V/ii) 경유 | 벌스 | 2 | maj7·m7·7 | 태연 「Rain」(2016) | KC:2022/05/taeyeon-rain-chords | high |
| B06 | 세컨더리 2-5 `5m7-1(7)-4maj7`, `#4m7-7(7)-3m`, `3m-6(sus4→장)-2m` | 세컨더리 2-5 | 프리·브릿지 | 2 | 7, sus4 | 폴킴 「너를 만나」, 규현 「하루종일」(2020) | GTE:paul-kim/me-after-you-chords, KC:2021/02/kyuhyun-all-day-long-chords | high |
| B07 | `1-4-5sus4-1-6m` | 명칭 없음 | 후렴 | 1 (65 BPM) | 5sus4 | AKMU 「어떻게 이별까지 사랑하겠어, 널 사랑하는 거지」(2019) | HT:akmu/how-can-i-love-the-heartbreak-youre-the-one-i-love | high |

### 1-3. 청량 댄스 팝에서만 확인된 진행

국내 평론은 청량에 '아련청량'(마이너 코드, 발라드 정서)도 넣어요([머니투데이](https://www.mt.co.kr/entertainment/2020/10/15/2020101513527271189)). 그래서 단조로 읽히는 진행도 청량에 들어가요.

| ID | 도수 | 국내 이름 | 섹션 | 화성 리듬 | 코드 색 | 대표곡 | 근거 | 확신도 |
|---|---|---|---|---|---|---|---|---|
| L01 | `2-4-6-5`, `6-2-4-5(-3(7))` | 명칭 없음 | 후렴 | 약 1 | 2m7sus4, add9, 5sus4 | 소녀시대 「Genie」(2009), TWICE 「LIKEY」(2017), Apink 「덤더럼」(2020) | HT:girls-generation/genie, HT:twice/likey, HT:apink/dumhdurum | medium |
| L02 | `4-6-5(-3)` | 명칭 없음 | 후렴·프리 | 1~1.5 | 3화음 | TXT 「어느날 머리에서 뿔이 자랐다」(2019), BTS 「작은 것들을 위한 시」(2019, 프리) | HT:txt/crown, HT:bts/boy-with-luv-(with-halsey) | high |
| L03 | `6-4-3-2` 전부 7th / `i7–VI7–v7–iv7` | 명칭 없음 | 후렴 | 약 0.9 | 7th | TWICE 「SIGNAL」(2017) | HT:twice/signal | high |

### 1-4. 다크·걸크러시·힙합 팝에서만 확인된 진행

| ID | 도수 | 국내 이름 | 섹션 | 화성 리듬 | 코드 색 | 대표곡 | 근거 | 확신도 |
|---|---|---|---|---|---|---|---|---|
| D01 | `♭II7`/`♭II9 → I` (SubV) | 트라이톤 대리 (통칭) | 벌스·프리 | 1 | 9·13 도미넌트 | ITZY 「마.피.아. In the morning」 아님, ITZY 「Mr. Vampire」(2021), aespa 「Lucid Dream」(2021) | HT:itzy/mr-vampire, HT:aespa/lucid-dream | medium |
| D02 | `VI/3–i7–iv7–♭II` | 명칭 미확인 | 후렴 | 1 | 1전위, m7 | NMIXX 「Run For Roses」(2024) | HT:nmixx/run-for-roses | medium |
| D03 | `6-2(장)-4-1` | 명칭 미확인 | 후렴 | 1 | II = V/V | ITZY 「달라달라」(2019) | HT:itzy/dalla-dalla | medium |
| D04 | 도리안 파워코드 `i–♭V–IV–III`, 상행 `III–iv–v` | 명칭 미확인 | 인트로·프리·후렴 | 1 | no3, 트라이톤 | aespa 「Rich Man」(2025), 「Spicy」(2023) | HT:aespa/rich-man, HT:aespa/spicy | medium |
| D05 | 끝에 `V7(#9)`, `V+7(#5♭9)` | 얼터드 도미넌트 (통칭) | 프리·후렴 끝 | 1 | #9, #5♭9 | aespa 「Armageddon」(2024), Red Velvet 「러시안 룰렛」(2016) | HT:aespa/armageddon, HT:red-velvet/russian-roulette | medium |

### 1-5. R&B·시티팝·디스코에서만 확인된 진행

| ID | 도수 | 국내 이름 | 섹션 | 화성 리듬 | 코드 색 | 대표곡 | 근거 | 확신도 |
|---|---|---|---|---|---|---|---|---|
| R01 | `6-5-6-2-3` / `i–VII–i–iv7–v7` | 6-5 뱀프 | 인트로·벌스 | 1~2 | iv·v만 m7 | 원더걸스 「Tell Me」(2007) | HT:wonder-girls/tell-me | high |
| R02 | `6m7-2(7)-1maj7-3(7#5♭9)`. 프리는 `2m7-3m7-4(11)-5(11)` (Cm 해석으로는 `iv7–v7–♭VI11–♭VII11`) | 세컨더리 연쇄 | 후렴·솔로·프리 | 1 | 7·11, 얼터드 | Red Velvet 「러시안 룰렛」(2016) | HT:red-velvet/russian-roulette | high |
| R03 | 벌스 `1-4`, 프리 `2(장)-4-#4°-5`, 후렴 `5-1-5-6-3` | 모타운식 1-4 + 경과 감화음 | 벌스·프리·후렴 | 1 | #iv° | 소녀시대 「Lion Heart」(2015, 청량 노트도 다룸) | HT:girls-generation/lion-heart | high |

### 1-6. 클럽 계열에서만 확인된 진행

| ID | 도수 | 국내 이름 | 섹션 | 화성 리듬 | 코드 색 | 대표곡 | 근거 | 확신도 |
|---|---|---|---|---|---|---|---|---|
| K01 | `4maj7-3m7-2m7-3m7-6(7sus4)` | 4-3-2-3 순차 왕복 (명칭 low) | 인트로·벌스·후렴이 같은 루프 | 1 | 7sus4 = V7sus4/ii | LE SSERAFIM 「Perfect Night」(2023, 2스텝 개러지) | HT:le-sserafim/perfect-night | medium |
| K02 | `1maj7-6m7sus2-2m9-5(7♭9)` | I–vi–ii–V 턴어라운드 | 미확인 | 1 | sus2·m9·7♭9 | ILLIT 「Midnight Fiction」(장르 미확인) | HT:illit/midnight-fiction | medium |

### 1-7. 밴드·록·트랩에서만 확인된 진행

| ID | 도수 | 국내 이름 | 섹션 | 화성 리듬 | 코드 색 | 대표곡 | 근거 | 확신도 |
|---|---|---|---|---|---|---|---|---|
| N01 | 순차 상행 `2-3-4-5`, `3-4-5-6` | 명칭 없음 | 브릿지 | 1 | 7th | DAY6 「남겨둘게」(2017), DAY6 「예뻤어」(2017) | GT:day6_ill-remember_396044, GT:day6_you-were-beautiful_404913 | medium |
| N02 | 록 3코드 `1-5-4`, `4-1-6`, `1-5-2-4-5` | "블루스·록 기반" (studionol2) | 벌스·후렴 | 1 | 파워코드 | DAY6 「Nobody Knows」, The Rose 「Red」(2019), G-DRAGON 「삐딱하게」(2013) | GT:day6_nobody-knows_403781, GT:the-rose_red_420614, HT:g-dragon/crooked | medium |
| N03 | 단조 록 루프 `i–VI–VII`, `VI–iv–i–VII`, `i–VI–VII–iv`, `i–VI–VII–v` | 명칭 없음 | 후렴 | 1 | add9·add11 | LE SSERAFIM 「1-800-hot-n-fun」(2024), BTS 「Pied Piper」(2017), MONSTA X 「Who Do U Love」(2019), Dreamcatcher 「Good Night」(2017) | HT:le-sserafim/1-800-hot-n-fun, HT:bts/pied-piper, HT:monsta-x/who-do-u-love, HT:dreamcatcher/good-night | medium |
| N04 | 단조 라인 클리셰 (베이스 A–G#–G–F#–F), 장조 클리셰 `1-1maj7-6m-2m7` | 라인 클리셰 | 인트로·후렴·벌스 | 1~2 | aug, 분수코드 | DAY6 「Sweet Chaos」(2019), 혁오 「Gang Gang Schiele」(2018) | GT:day6_sweet-chaos_427026, GT:hyukoh_gang-gang-schiele_399066 | medium |
| N05 | 반음 하강 `#4m7-4m6-3m7-6(9)-2m7-5(7)` | 명칭 없음 | 벌스·후렴 | 2에서 1로 | m6, 9th | DAY6 「예뻤어」 | GT:day6_you-were-beautiful_404913 | medium |
| N06 | 턴어라운드 `2-5-1-6(7)`, `3-6(9)-2-5` | 251 | 후렴 끝 | 2 | 9, aug7, 분수 | DAY6 「Pandora」, 「예뻤어」 | GT:day6_pandora_400454 | medium |
| N07 | 파워코드 리프 `1-2-3`, `iv–i–III`, `i–v–♭VII–i–♭V` | 파워코드 (ko.wiki:파워_코드) | 후렴 드롭·인트로 | 1 | no3, ♭V | NMIXX 「Young, Dumb, Stupid」(2023), NCT 127 「Superhuman」(2019), Jessi 「What Type of X」(2020) | HT:nmixx/young-dumb-stupid, HT:nct-127/superhuman, HT:jessi/what-type-of-x | medium |
| N08 | 붐뱁·재즈 힙합 `2(9)-5(13)-1maj9`, `VI7–♭II9–v7–I7` | "ii7-V7-Imaj7 재즈 기본" (studionol2) | 벌스 루프 | 미확인 | 9·11·13 | ZICO 「아무노래」, 다이나믹 듀오 「AEAO」 | HT:zico/any-song, HT:dynamic-duo/aeao | low (붐뱁과 이 화성을 잇는 근거 없음) |

### 1-8. 루프가 아닌 기법

| 기법 | 쓰는 장르 | 예 | 확신도 |
|---|---|---|---|
| III7 (V/vi) | 발라드·청량·R&B·클럽·밴드 | 「이 사랑」, 「Feel Special」, 「Magnetic」, 「고민중독」, 「희재」 | high |
| VI7 (V/ii) | 발라드·청량·R&B·클럽 | 「Rain」, 「Bad Boy」, 「After Like」, 「Perfect Night」, 「RUN2U」 | high |
| II7 (V/V) | 발라드·청량·R&B | 「Dream」, 「첫눈처럼」, 「Lion Heart」 프리, 「Heart Shaker」 프리 | high |
| I7 (V/IV)와 IV로 가는 2-5 | 발라드·R&B·클럽 | 「너를 만나」 Gm7-C7-Fmaj7, 「Feel My Rhythm」, 「Magnetic」 | high |
| 4m 차용 | 발라드(압도적)·청량·밴드·다크·클럽 | 「이런 엔딩」, 「밤편지」, 「봄날」, TWICE 「Cheer Up」·「What is Love」, 「Crazier」, Red Velvet 「Chill Kill」, ILLIT 「Do the Dance」 | high |
| ♭VI·♭VII 차용 | 청량·밴드·발라드 | 「Power Up」, 「ELEVEN」, 「Marathon」, 「희재」 E-D-A-E | high |
| 단조 곡 끝을 장3화음 I로 (피카르디) | 청량·다크·R&B | TWICE 「Strategy」, NewJeans 「Attention」, 「Party O'Clock」, BTS 「RUN」 | medium-high |
| 같은 근음에서 단↔장 교대 | 다크·밴드·R&B·클럽 | 「Kick It」, 「How Sweet」 | medium |
| 분수코드 하강 베이스 | 발라드·청량·R&B·다크·클럽 | P10, 「Permission to Dance」, 「Good Thing」, 「ANTIFRAGILE」 A♭/C | high |
| 경과 감7 (#5°7→6m, #4°→5) | 발라드·청량·R&B·밴드 | 「이런 엔딩」 A#dim7, 「사랑인가 봐」 D#dim, 「Lion Heart」·「Queendom」 #iv°, 「고민중독」 D#°7, 다비치 「너를 잊는다」(KC:2021/04/davichi-forgetting-you-chords) | high |
| 반음 하강 경과 (3m–♭3m–2m) | 청량·밴드 | 러블리즈 「Ah-Choo」, 「Lucky Girl Syndrome」, 「예뻤어」 | high / medium |
| 라인 클리셰 | 발라드·청량·밴드 | 「사랑인가 봐」 G-Gaug-G6, 「Rain」 Am-AmMaj7-Am7, 「Windy Day」, 「Sweet Chaos」 | high / medium |
| sus4 해결 (5sus4→5) | 발라드(거의 모든 종지)·청량·다크·R&B | 「Love poem」, 「이런 엔딩」, 「다시 만난 세계」, 「UNFORGIVEN」 | high |
| add9·m9·maj7 색 | 모든 장르. R&B·클럽은 늘 써요 | 「Celebrity」, aespa 「Next Level」 Em11, 「Hype Boy」 | high |
| 파워코드 (no3) | 다크·밴드·클럽 | 「How You Like That」, 「PLAYING WITH FIRE」, 「Spicy」, 「Sticker」 | medium-high |
| 얼터드 도미넌트 | 청량·다크·R&B·클럽 | 「러시안 룰렛」, NewJeans 「OMG」, 「Magnetic」 V7(♭9) | medium-high |
| 페달·원코드 | 다크·발라드·밴드 | 「뚜두뚜두」, 「보고싶다」 B♭ 베이스, 혁오 G 페달 | medium |
| 섹션 사이 조·선법 전환 | 다크(핵심)·청량·클럽·밴드 | 「How You Like That」, 「붐바야」, 「FANCY」, 「Whistle」, 「Chill Kill」, 「4 Walls」 | high (다크) |
| 하프타임·더블타임 | 다크·클럽·밴드 | 「Run For Roses」 92↔184, 「O.O」 133→100 | medium (HT BPM) |

### 1-9. 마지막 후렴 전조

| 장르 | 확인된 마지막 후렴 키업 | 그 밖의 전조 | 기본값 제안 |
|---|---|---|---|
| 발라드 | 반음(+1) 4건이에요. 「좋은 날」, 「그런 사람 또 없습니다」는 직접 전조예요. 「첫눈처럼」은 sus4를 반음 밀어 올려요. 「이런 엔딩」은 후렴 후반에 올라가요. (GTE·KC) | 준비법은 새 키의 V7이나 IV/V–V7이에요(다음카페 레슨 글). 온음 업은 마지막 후렴 기준 0건이에요. | +1 켬. 큰 변경이라 결정이 필요해요. |
| 청량 | 국내 곡 출처는 0건이에요. 「좋은 날」은 발라드 노트 채보로 +1이에요. | 후렴 진입 전조가 있어요. 「모모모」는 온음, 「Candy」는 단3도, 「RUN2U」는 5도로 가요. 「Dynamite」 +2는 해외 작가 곡이에요. | 옵션 (+1·+2) |
| 다크 | 0건이에요. | 선법·조 전환, 드롭, 하프타임으로 대신해요(추정). | 끔 |
| R&B | 0건이에요. 「Dynamite」 +2는 해외 작가 곡이고, 「Cupid」는 폭이 미상이에요. | 「After Like」는 섹션 사이에서 전조해요. | 옵션 |
| 클럽 | 0건이에요. | 동주조·선법 전환이 있어요(「4 Walls」, 「Eve」). | 끔 |
| 밴드 | 볼빨간사춘기 「My Trouble」 아웃트로 +1 (GT:bolbbalgan4_my-trouble_416566) 1건이에요. DAY6 10곡은 0건이에요. | CRAVITY는 드롭 뒤 후렴에서 전조해요(idology:13243). | 끔, 옵션으로 둬요 |

### 1-10. 장르끼리 엇갈리는 점

1. **키업 기본값**: 발라드 노트는 "기본값 반음 업"이라고 해요. 다크·클럽 노트는 확인 0건이라 기본값을 반대해요. 밴드는 옵션으로 두자고 해요. → 장르별로 따로 정해야 해요.
2. **「좋은 날」 전조**: 청량 노트는 low예요(서울신문은 음 상승만 말해요). 발라드 노트는 GTE 채보로 +1을 확인했어요. → 채보를 근거로 medium으로 봐요.
3. **온음 키업**: 발라드 노트는 국내 사례 0건이라고 해요. 밴드 노트에는 「그땐 알지 못했나봐」 후렴 진입 C→D가 있어요(idology:4135). → 이건 마지막 후렴이 아니라서 모순은 아니에요.
4. **4536 명칭**: 발라드 노트는 국내 명칭을 확인하지 못했어요. 청량·밴드 노트는 DC 작곡갤 "4536 왕도"로 확인했어요. → medium이에요.
5. **"머니코드"가 가리키는 것**:
   - brunch는 1564 묶음이라고 해요.
   - DC:145139는 "가요계의 머니코드 F F/G Em Am", 즉 4536이라고 해요.
   - 나무위키 스니펫은 캐논이라고 해요.
   - → 앱 라벨에는 쓰지 않는 게 좋아요.
6. **마루사·JTTOU**: R&B·클럽 노트는 명칭 미확인이에요. 청량·밴드 노트는 DC로 "436(5)1 마루사"를 확인했어요. → '마루사'는 medium이에요. 'JTTOU 진행'의 국내 명칭 확신도는 low예요.
7. **「Dynamite」**: R&B 노트는 high 사례로 썼어요. 청량 노트는 해외 작가 영어곡이라 약하다고 봐요. → 국내 기준 대표 사례에서 빼요. 같은 6-2-5-1은 「HOT」·「해야」로 따로 근거가 있어요.
8. **같은 곡, 다른 장르**:
   - 「Ditto」·「Hype Boy」·「Super Shy」는 청량, R&B, 클럽 노트에 다 나와요.
   - 「LOVE DIVE」·「FANCY」는 청량과 다크 노트에 나와요.
   - 「Lion Heart」는 청량과 R&B 노트에 나와요.
   - 진행은 같고 장르 라벨만 달라요. 그래서 앱 장르 라벨은 소리 기준으로 붙여야 해요.
9. **「ANTIFRAGILE」 키**: TheoryTab은 F단조, 위키는 B♭단조예요. 도수 해석 확신도는 low예요.
10. **「Attention」 끝 화음**: 청량 노트는 I7이라고 해요. R&B 노트는 속7인지 maj7인지 불명확하다고 해요. → medium이에요.
11. **단조 5도**: 모든 장르가 화성단음계 V(장3화음)를 기본으로 봐요(사계·첫눈처럼·논문·Shut Down·Red Sun·Magnetic). 그런데 자연단음계 v도 확실히 있어요(HYLT·DNA·View·Ditto). → 둘 다 필요해요.
12. **화성 리듬**: 발라드는 2/마디예요(추정 low). 청량 4536은 1.5~2예요(박수 계산). 나머지는 1이에요(추정). 모두 추정이에요.
13. **`i–VII–VI–VII`(앱 mystic)**:
    - 발라드 노트는 이걸 studionol1을 근거로 발라드 맥락의 일반론으로 봐요.
    - 밴드 노트는 studionol2를 근거로 "힙합 마이너 루프"로 봐요.
    - 곡 근거는 둘 다 없어요.
14. **6415의 느낌**:
    - DC:312971은 "팝펑크"라고 해요. DC:201104는 "몽환적"이라고 해요.
    - 앱은 장조에서 '애절하고 감성적인', 단조에서 '다크·걸크러시'예요.
    - 같은 네 코드에 느낌 이름이 넷이에요.

### 1-11. 추정 (근거가 약해서 카탈로그에서 뺀 것)

- **발라드**
  - 진행을 텍스트로 확인한 페이지가 없는 곡들이에요: 박효신 「야생화」·「눈의 꽃」, 백지영 「총 맞은 것처럼」·「그 여자」, 엠씨더맥스 「어디에도」, 임재범 「너를 위해」, 이소라 「바람이 분다」, 윤종신 「좋니」, 멜로망스 「선물」.
  - 거미 「You Are My Everything」은 출처 URL이 없어요(음계 하강 브리지, A-A#dim-Bm).
  - 성시경 「너의 모든 순간」 키업은 미확인이에요. 아이유 「무릎」은 코드 순서가 미확인이에요.
- **청량**
  - SEVENTEEN 「아주 NICE」·「예쁘다」, TWICE 「Knock Knock」·「Dance The Night Away」, GFRIEND 「너 그리고 나」가 왕도/456이라는 통념은 확인하지 못했어요.
  - 「Darling」이 「Darl+ing」과 같은 곡인지 미확인이에요.
  - 텐아시아 「Remember」(Apink)의 "후렴구의 빠른 전조"는 폭이 미상이에요.
- **다크**
  - Stray Kids, ATEEZ, 「Kill This Love」, 「TOMBOY」, 「내가 제일 잘 나가」, 「Savage」는 코드를 확인하지 못했어요.
  - "키업 대신 드롭·템포 전환"은 추정이에요.
  - `i–VII–VI–iv` 안달루시안 변형은 국내 예시가 없어요.
- **R&B**
  - `4maj7-3m7-2m7-1maj7` 하강은 곡 근거가 없어요.
  - 뉴잭스윙 곡은 코드를 확인하지 못했어요: 듀스, EXID 「Lady」, NewJeans 「Supernatural」.
  - 한국 시티팝 원조도 코드를 확인하지 못했어요: 김현철 「춘천 가는 기차」, 빛과 소금, 태연 「Weekend」.
  - 디스코 옥타브 페달도 확인하지 못했어요.
- **클럽**
  - 「Smart」(아마피아노), 「Sticky」(아프로비트), 「Idol」(크쿰), 「ETA」, BOYNEXTDOOR는 코드 근거가 없어요.
  - 그래서 앱 장르 목록의 Afrobeats는 코드 근거가 없어요. moombahton은 「Hype Boy」·「ANTIFRAGILE」 2곡뿐이에요.
- **밴드**
  - DAY6 「한 페이지가 될 수 있게」·「Welcome to the Show」·「HAPPY」는 진행을 확인하지 못했어요.
  - LUCY·ONEWE·Xdinary Heroes, TXT 「Freeze」, 윤하 「사건의 지평선」도 확인하지 못했어요.
- **일반론만 있는 것**: studionol1의 `i–VII–VI–VII`, `i–iv–i–V`는 곡 예시가 없어요.

---

## 2. 앱 체크

### 2-1. 카탈로그에서 앱으로

판정은 네 가지예요.
- 있음 = 같은 도수의 프리셋이 있어요.
- 비슷함 = 근사형이 있거나 우회할 수 있어요.
- 없음 = 지금 구조로 낼 수 있는데 프리셋이 없어요.
- 표현 불가 = 지금 구조로는 못 내요.

| ID | 진행 | 판정 | 앱 프리셋 또는 쓸 수 있는 도수 | 이유 |
|---|---|---|---|---|
| P01 | 4536 | 있음 (royal) | 장 [4,5,3,6]. 단조형 [6,7,5,1]은 없어요 | III7형은 넌다이아토닉이라 불가예요. 청량의 1.5~2/마디는 마디당 2코드라 불가예요. |
| P02 | 왕도 확장 | 없음 | [4,5,3,6,2,5,1,1] | 7코드라 8칸으로 채워야 해요. 2/마디형은 불가예요. |
| P03 | 6-3-4-5 | 없음 | 장 [6,3,4,5] / 단 [1,5,6,7]. HYLT형 단 [1,5,3,6] | TT의 끝 III7은 불가예요. |
| P04 | 1564 | 있음 (hope) | — | add9·5sus4 색은 불가예요. |
| P05 | 6415 | 있음 (장 emotional, 단 dark) | — | i만 m7인 혼합과 A♭/C 분수는 불가예요. |
| P06 | 4156 | 없음 | 장 [4,1,5,6] / 단 [6,3,7,1] | 나란한 장조 후렴은 음 집합이 같아서 도수로 낼 수 있어요. |
| P07 | 6514 | 없음 | 단 [1,7,3,6], [1,3,7,6] | 파워코드 보이싱은 불가예요. |
| P08 | 1645·1654 | 없음 | [1,6,4,5], [1,6,5,4] | 5sus4는 불가예요. |
| P09 | 캐논 | 있음 (ballad). 화성 리듬은 달라요 | [1,5,6,3,4,1,4,5] | 실제는 8코드가 4마디예요. 앱은 8마디로 늘어져요. 1/3 분수도 불가예요. |
| P10 | 하행 베이스 캐논 | 표현 불가 | 가장 가까운 건 ballad | 분수 베이스, 마디당 2코드, 3(장)/#5, #5°7 때문이에요. |
| P11 | 1-7-6-5 하강 | 표현 불가 | 근사 [1,7,6,5,4]+7th. 5가 장3화음으로 나와요 | 차용 5m7, 1(7), 전위 베이스 때문이에요. |
| P12 | 456 | 있음 (단조 epic). 장조는 없음 | 장 [4,5,6,6] 등 | 장조 곡에서는 epic을 못 골라요. 5sus4→5도 불가예요. |
| P13 | 4561 | 없음 | 장 [4,5,6,1] / 단 [6,7,1,3], [1,3,6,7] | — |
| P14 | 마루사 | 표현 불가 | 근사 citypop [4,3,6,1]+7th | III7(♭9), 마지막 마디 2코드, 1(7) 때문이에요. |
| P15 | 다이아토닉 4-3-6 | 비슷함 (citypop) | [4,3,6,2,5,…]와 [4,3,2,5,1,…]는 없어요 | 끝 5(7♭5)·sus4는 불가예요. |
| P16 | 4-2-3-6 | 없음 | 장 [4,2,3,6]+7th / 단 [6,4,5,1]+7th | m9·add9, 끝 I7(피카르디)는 불가예요. |
| P17 | 2-5-1-6 | 있음 (dreamy = 「Cupid」) | 장조 6-2-5-1은 없어요 → [6,2,5,1] | VI7, 7sus4, 9·13은 불가예요. |
| P18 | i–iv–VII–III | 있음 (단조 sad) | — | 「첫눈처럼」의 장3화음 IV는 불가예요. |
| P19 | 순환 | 없음 (일부 불가) | 장 [4,7,3,6,2,5,1,1]+7th / 단 [1,4,7,3,6,2,5,1]+7th | 단조형 끝 V7이 v7로 나와요. 약 2/마디도 불가예요. |
| P20 | 1-3-6-4 | 없음 | [1,3,6,4] | 끝 4m은 불가예요. |
| P21 | III7 경유 | 표현 불가 | — | III7, 4m 때문이에요. |
| P22 | 장조 ♭6·♭7 | 표현 불가 | — | 음계 밖 화음이에요. |
| P23 | 도리안 IV | 표현 불가 | 근사 [1,7,4,6]. iv로 바꾸면 P30이 돼요 | 단조의 장3화음 IV, Vsus4 때문이에요. |
| P24 | 화성단음계 V | 표현 불가 | 근사로 descend 등이 있지만 v로 나와요 | 앱의 단조가 자연단음계라서요. |
| P25 | 안달루시안 | 비슷함 (descend = 자연단음계형 앞 4코드). V형은 불가 | 「LA DI DA」 전체는 [1,7,6,5,4] | 장3화음 V와 VII 2전위는 불가예요. |
| P26 | 프리지안 i–♭II | 비슷함 (관계장조 우회) | 관계장조 [3,4]. 예: E 프리지안 Em–F = C장조 [3,4] | 키 이름과 Suno 키 문구(style.key), 멜로디 으뜸음이 관계장조로 나가요. 프리지안 도미넌트는 불가예요. |
| P27 | 단조 2코드 | 없음 | [1,4]+7th, [7,1], [1,5] | 앱의 trap [1,6]은 출처에 없는 조합이에요. |
| P28 | 선법 2코드 | 비슷함 (관계장조 우회). i9↔I9는 불가 | 도리안 i–IV = 관계장조 [2,5]. 「Super Shy」 = E♭장조 [3,2]+7th | 우회 단점은 P26과 같아요. |
| P29 | 원코드 | 없음 | [1] | — |
| P30 | i–VII–iv–VI | 없음 | 단 [1,7,4,6]+7th | m7과 3화음 혼합은 불가예요. |
| P31 | 2536 | 없음 | [2,5,6,3] | 끝 V7/ii는 불가예요. |
| P32 | 평행 9th | 표현 불가 | — | 평행 이동은 음계 밖이에요. |
| P33 | 단조 m7 루프 | 없음 | 단 [1,5,4,5]+7th (View), [1,4,6,5] (EASY) | 3코드 「Bubble Gum」은 4칸으로 채워야 해요. m9·maj9는 불가예요. |
| P34 | 믹솔리디안 I–v–IV | 비슷함 (관계장조 우회) | 관계장조 [5,2,1] | 우회 단점은 P26과 같아요. |
| B01 | 4-4m-3-6-2-5-1 | 표현 불가 | 근사 [4,3,6,2,5,1,…]. 4m이 빠져요 | 4m, 2/마디, 7sus4 때문이에요. 발라드 후렴 핵심이라 영향이 가장 커요. |
| B02 | 밤편지형 | 표현 불가 | — | 4m, 3(장) 때문이에요. |
| B03 | 1-3-4-4m | 표현 불가 | 4m 앞부분만 P20과 비슷해요 | 4m 때문이에요. |
| B04 | 희재형 | 표현 불가 | — | III7 때문이에요. |
| B05 | Rain 벌스 | 비슷함 | [1,4,3,6]+7th. 6(7)이 6m7로 나와요 | VI7 때문이에요. |
| B06 | 세컨더리 2-5 | 표현 불가 | 다이아토닉 근사 [3,6,2,5]+7th | 세컨더리 도미넌트 때문이에요. |
| B07 | 1-4-5sus4-1-6 | 비슷함 | [1,4,5,1,6]. 5칸이라 8칸 배치가 필요해요 | 5sus4는 불가예요. |
| L01 | 2-4-6-5 | 없음 | [2,4,6,5], [6,2,4,5] | sus4·add9는 불가예요. |
| L02 | 4-6-5 | 없음 | [4,6,5,3] 또는 3코드를 4칸으로 | — |
| L03 | 6-4-3-2 | 없음 | [6,4,3,2]+7th | — |
| D01 | SubV | 표현 불가 | — | ♭II7 때문이에요. |
| D02 | Run For Roses | 표현 불가 | — | ♭II, 분수, 템포 전환 때문이에요. |
| D03 | 달라달라 | 표현 불가 | 근사 [6,2,4,1] | 장3화음 II 때문이에요. |
| D04 | Rich Man·Spicy | 표현 불가 (Rich Man). Spicy 상행은 없음 | 단 [3,4,5,5] | ♭V, no3 때문이에요. |
| D05 | 얼터드 도미넌트 | 표현 불가 | — | 텐션과 화성단음계 V 때문이에요. |
| R01 | Tell Me | 없음 | 단 [1,7] 인트로, [1,7,1,4,5] | iv·v만 m7인 혼합은 불가예요. |
| R02 | 러시안 룰렛 | 표현 불가 (후렴). 프리는 build와 같은 뼈대예요 | 프리 = 장 build [2,3,4,5]+7th | II7, 얼터드 III7 때문이에요. |
| R03 | Lion Heart | 있음 (simple, 벌스만) | 후렴 [5,1,5,6,3]은 없어요 | 프리의 II·#iv°는 불가예요. |
| K01 | Perfect Night | 비슷함 | [4,3,2,3,6]+7th. 끝이 6m7로 나와요 | V7sus4/ii는 불가예요. |
| K02 | Midnight Fiction | 비슷함 | [1,6,2,5]+7th | sus2·m9·7♭9는 불가예요. |
| N01 | 순차 상행 | 있음 (장조 build) | 3-4-5-6은 없어요 → [3,4,5,6] | — |
| N02 | 록 3코드 | 없음 | [1,5,4,4], [1,5,2,4] 등 | 파워코드는 불가예요. |
| N03 | 단조 록 루프 | 없음 | [1,6,7,7], [6,4,1,7], [1,6,7,4], [1,6,7,5] | — |
| N04 | 라인 클리셰 | 표현 불가 | 혁오형 근사 [1,1,6,2] | aug, 분수, 내성 반음, 7th 혼합 때문이에요. |
| N05 | 반음 하강 | 표현 불가 | — | #4m7, 4m6 때문이에요. |
| N06 | 턴어라운드 | 비슷함 (dreamy) | [2,5,1,6]+7th | 6(7), 2/마디는 불가예요. |
| N07 | 파워코드 리프 | 없음 (일부 불가) | [1,2,3,3], [4,1,3,3] | ♭V, no3는 불가예요. |
| N08 | 붐뱁 9th | 비슷함 (dreamy) | [2,5,1,…]+7th | 9·11·13, ♭II9는 불가예요. |

### 2-2. 앱 프리셋에서 카탈로그로 (역방향)

실제 코드는 C장조와 A단조 기준이에요.

| 프리셋 | 앱이 내는 코드 | 카탈로그 대응 | 판정 | 고칠 점 |
|---|---|---|---|---|
| 장 hope [1,5,6,4] | C G Am F | P04 | 전형적 (발라드·청량·밴드) | 없어요. 밝은 타이틀은 이 진행을 그대로 쓰기보다 변형한다는 점만 참고하세요. |
| 장 emotional [6,4,1,5] | Am F C G | P05 | 전형적 | 단조 dark와 같은 네 코드인데 이름이 '애절'과 '다크'로 갈려요. 통일할지는 결정이 필요해요. |
| 장 royal [4,5,3,6] | F G Em Am | P01 | 전형적 | 국내 이름 '4536 왕도'를 덧붙이면 좋아요. |
| 장 dreamy [2,5,1,6]+7th | Dm7 G7 Cmaj7 Am7 | P17 (「Cupid」 그대로) | 전형적. 이름이 일부 틀려요 | '몽환'은 근거가 없어요. 출처에서는 디스코 팝·R&B의 251이에요. |
| 장 build [2,3,4,5] | Dm Em F G | N01, R02 프리 | 근거 2곡이에요 (러시안 룰렛 프리 high, 남겨둘게 브릿지 medium) | '프리코러스용'은 1곡 근거예요. 브릿지 근거도 있어요. |
| 장 ballad [1,5,6,3,4,1,4,5] | C G Am Em F C F G | P09 | 전형적. 진행 이름이 빠졌어요 | '캐논'이에요. 청량(「Heart Shaker」)도 써요. 화성 리듬이 실제보다 2배 느려요. |
| 장 simple [1,4] | C F | R03 (「Lion Heart」 벌스) | 근거 1곡이에요 | Rap·Dance Break 기본값으로 쓰는 근거는 없어요. |
| 장 citypop [4,3,6,1]+7th | Fmaj7 Em7 Am7 Cmaj7 | P14 근사, P15 | 장르 라벨이 좁고 근거가 약해요 | 이 진행은 댄스 팝·하우스·개러지·볼티모어 클럽·발라드에 두루 나와요. 코드로 확인한 국내 시티팝풍 곡은 「LILAC」(4-2-3-6)과 「Bubble Gum」(6-4-3)뿐이에요. 원형의 III7이 iii7로 나와요. |
| 단 dark [1,6,3,7] | Am F C G | P05 (「ANTIFRAGILE」) | 전형적 | 단조 섹션 기본값에는 한 번도 안 쓰여요. |
| 단 sad [1,4,7,3] | Am Dm G C | P18 | 전형적 | 다크(「HOT」·「가시나」)와 청량(「해야」)에도 나와요. '슬픈' 진행만은 아니에요. 참고만 하세요. |
| 단 epic [6,7,1,1] | F G Am Am | P12 | 전형적 | 없어요. |
| 단 build [4,5,6,7] | Dm Em F G | R02 프리 (Cm 해석 그대로) | 근거 1곡이에요 | 단조 프리코러스는 `VI–VII–i–III`(P13) 근거가 더 많아요. |
| 단 trap [1,6] | Am F | 없음 | 출처가 없어요. 장르 라벨 근거도 없어요 | 출처의 트랩·힙합 2코드는 i–iv, VII–i, i–v예요(낼 수 있어요). i–V, i–♭II, i–IV는 못 내요. |
| 단 mystic [1,7,6,7]+7th | Am7 G7 Fmaj7 G7 | 일반론만 있어요 (studionol1·2, 곡 없음) | 근거가 약해요. 이름도 틀려요 | studionol은 '힙합 마이너 루프'라고 불러요. '몽환·미스터리'는 근거가 없어요. |
| 단 descend [1,7,6,5] | Am G F Em | P25 자연단음계형 (「LA DI DA」) | 이름이 틀려요 | 안달루시안은 5가 장3화음(E)이에요. 지금은 Em이 나와요. |

---

## 3. 섹션 기본값 체크

### 3-1. 지금 기본값의 문제

1. **장르를 안 봐요.**
   - BY_TYPE은 하나뿐이에요.
   - `song.style.genre`(기본 'K-pop dance pop')와 `concept.moods`(청량·걸크러시·다크·서정…)를 쓰지 않아요.
   - AI 편곡의 conceptBrief도 장르를 넘기지 않아요. 넘기는 건 제목·주제·스토리·분위기·키워드뿐이에요.
2. **장조의 Verse와 Bridge가 둘 다 emotional이에요.** 브릿지 대비가 없어요. AI 원칙 "브릿지는 한 번 꺾는다"와 어긋나요.
3. **단조는 Intro·Verse·Bridge·Outro가 모두 sad예요.** 네 섹션이 같아요. 가장 많이 확인된 단조 루프 dark는 기본값에 없어요.
4. **Pre-Chorus build는 근거가 1곡이에요.** 청량·다크의 프리코러스 근거는 4536, `4-5-6-1`, `VI–VII–i–III`예요.
5. **Chorus royal과 단조 epic은 맞아요.** royal은 발라드·청량·밴드에 맞고, epic은 다크(「FAKE LOVE」·「Whistle」·「FANCY」)에 맞아요. 하지만 R&B·클럽(마루사·251·m7 루프)에는 안 맞아요.
6. **Rap과 Dance Break가 simple/trap이에요.**
   - trap [1,6]은 출처가 없어요.
   - 드롭 근거는 원코드예요(논문 15곡, 「뚜두뚜두」).
   - 단조 랩 근거는 i–iv, VII–i, i–v예요.
7. **Post-Chorus와 Hook은 Chorus와 같아요.** 찬성 근거도 반대 근거도 없어요. 유지해도 돼요.
8. **Intro와 Outro는 hope예요.**
   - 클럽·R&B는 인트로·벌스·후렴이 같은 루프인 곡이 많아요(「Hype Boy」, 「Super Shy」, 「Perfect Night」, 「I CAN'T STOP ME」).
   - 발라드는 도입부와 아웃트로 직전에 캐논 하행이 나와요(「광화문에서」, 「오랜 날 오랜 밤」).
9. **발라드 화성 리듬이 달라요.** 앱은 마디당 1코드예요. 60~80 BPM 발라드의 실제는 2코드예요(추정). 바꾸려면 모델 변경(4-b4)이 필요해요.

### 3-2. 장르별 섹션 기본값 제안

★는 새 프리셋(가칭)이에요. 모두 지금 모델로 낼 수 있어요. 모두 소유자 결정이 필요해요(D-020).

| 섹션 | 발라드 | 청량 댄스 팝 | 다크·걸크러시·힙합 (단조) | R&B·시티팝 | 클럽 (하우스·개러지·저지) | 밴드·록 |
|---|---|---|---|---|---|---|
| Intro | ballad (P09, 도입부) | royal (P01, 「YES or YES」 인트로) | ★turn6345_m [1,5,6,7] (P03, 「DNA」) | ★lilac [4,2,3,6]+7th (P16, 「Hype Boy」) | ★view [1,5,4,5]+7th (P33). 곡 전체를 같은 루프로 | hope (P04) |
| Verse | ballad (P09·P10) | ★lilac (P16, 「Gee」) | sad 유지 (P18, 「가시나」) | ★lilac (P16) | ★view | hope (P04, 「나는 나비」) |
| Pre-Chorus | ★chain [3,6,2,5]+7th (B06 근사, low) | ★rise [4,5,6,1] (P13, 「LOVE DIVE」) | ★rise_m [6,7,1,3] (P13) | build+7th (R02 프리) | ★view | ★rise (P12·P13) |
| Chorus | ★royal8 [4,5,3,6,2,5,1,1] (P02) | royal 유지 (P01) | epic 유지 (P12) | citypop (P14 근사) | ★view. 장조 곡이면 citypop | ★band4156 [4,1,5,6] (P06) |
| Post-Chorus | 후렴과 같게 (근거 없음) | royal 유지 (근거 없음) | ★drop [1] (P29) | 후렴과 같게 | ★view | 후렴과 같게 |
| Rap | 해당 없음 | 벌스와 같게 (추정) | ★vamp_iv [1,4]+7th (P27, 「Call Me Baby」) | 벌스와 같게 (추정) | ★view | 해당 없음 |
| Bridge | ★circle [4,7,3,6,2,5,1,1]+7th (P19·B06 근사, low) | 근거 없음. 결정 필요 (임시로 build) | ★bridge4236_m [6,4,5,1]+7th (P16, 「FANCY」 브릿지) | dreamy (P17, 「Cupid」 브리지) | ★view, 드럼 빼고 | build 유지 (N01) |
| Dance Break | 해당 없음 | 후렴과 같게 (추정) | ★drop (P29) | 해당 없음 | ★view 또는 ★drop | 해당 없음 |
| Hook | 후렴과 같게 | royal | epic | 후렴과 같게 | ★view | 후렴과 같게 |
| Outro | ballad (「광화문에서」) | 후렴과 같게 | 후렴과 같게 | 후렴과 같게 | ★view | 후렴과 같게 |
| 조 | 장조 | 장조 (아련청량은 단조 TT형) | 단조 | 장조 | 단조 위주 | 장조 |
| 7th | 켬 (maj7·m7 색이 많아요) | 섹션별 (lilac 켬, royal 끔) | 끔 (aespa·NMIXX풍은 켬) | 켬 | 켬 | 끔 |
| 마디당 코드 | 2 (4-b4 뒤) | 1~2 | 1 | 1 | 1 | 1 |
| 마지막 후렴 키업 | +1 (4-b6 뒤) | 옵션 | 끔 | 옵션 | 끔 | 끔 |

앱 장르 목록(`GENRES`)을 이렇게 묶는 걸 제안해요. 이 매핑도 결정이 필요해요.
- 'K-pop ballad' → 발라드
- 'K-pop dance pop', 'synth-pop' → 청량. 분위기에 걸크러시·다크가 있으면 다크로요.
- 'K-pop EDM', 'K-pop hip hop' → 다크
- 'K-pop R&B' → R&B
- 'UK garage', 'Jersey club', 'house' → 클럽
- 'Afrobeats', 'moombahton' → 클럽. 코드 근거가 약해요.
- 'pop rock' → 밴드

`style.genre`는 자유 입력이라, 목록에 없는 값의 기본 묶음도 정해야 해요.

---

## 4. 제안

### (a) 지금 모델 안에서 (프리셋 추가·이름 고치기)

| # | 제안 | 크기 | 결정 필요 | 근거 |
|---|---|---|---|---|
| a1 | 이름 고치기 (아래 목록) | S | 예 (라벨 문구, D-003 느낌 이름 원칙) | 2-2 |
| a2 | trap [1,6]을 그대로 둘지 정하기. 출처 있는 2코드 ★vamp_iv [1,4]+7th, ★vamp_7 [7,1]을 따로 추가하기. 도수를 바꾸면 저장된 곡에서 프리셋 이름이 사라져요(findProgression이 정확히 맞춰 봐요) | S | 예 | P27 |
| a3 | 1순위 새 프리셋 추가. 장조: ★royal8 [4,5,3,6,2,5,1,1], ★rise [4,5,6,1], ★lilac [4,2,3,6]+7th, ★poem [1,3,6,4], ★band4156 [4,1,5,6], ★drop [1]. 단조: ★rise_m [6,7,1,3], ★loop6514_m [1,7,3,6], ★chorus4156_m [6,3,7,1], ★vamp_iv, ★drop | S~M | 예 (선택 목록이 8·7개에서 14·12개로 늘어요) | P02·P13·P16·P20·P06·P07·P27·P29 |
| a4 | 2순위 새 프리셋 추가. 장조: ★turn6345 [6,3,4,5], ★loop1645 [1,6,4,5], ★circle [4,7,3,6,2,5,1,1]+7th, ★chain [3,6,2,5]+7th, ★set2536 [2,5,6,3], ★climb [3,4,5,6], [6,2,4,5]. 단조: ★turn6345_m [1,5,6,7], ★icsm [1,7,4,6]+7th, ★view [1,5,4,5]+7th, ★bridge4236_m [6,4,5,1]+7th, ★circle_m [1,4,7,3,6,2,5,1]+7th, ★vamp_7 | S | 예 | 1-1·1-3·1-7 |
| a5 | 장르를 보지 않는 BY_TYPE부터 고치기. 장조 Bridge를 emotional 말고 build로 바꿔요. 단조 Intro·Outro를 dark로, 단조 Pre를 rise_m으로, 단조 Rap을 vamp_iv로, 단조 Dance Break를 drop으로 바꿔요. minorId 매핑표를 고치면 돼요 | S | 예 | 3-1 |
| a6 | 장르별 BY_TYPE을 3-2 표대로 만들기. style.genre와 moods로 고르게 해요 | M | 예 (자유 입력 장르 매핑 규칙) | 3-2 |
| a7 | 관계장조 우회(도리안·프리지안·믹솔리디안 2코드)는 넣지 않기. 키 이름, Suno 스타일 키(style.key), 멜로디 으뜸음 안내가 틀어져요. b7에서 정식으로 지원해요 | — | 예 (추천은 '넣지 않음') | P26·P28·P34 |
| a8 | 데이터 규칙. 7코드 진행은 8칸, 3코드·5코드 진행은 4칸·8칸으로 맞춰요 | S | 아니요 | 0. 앱의 사실 |

a1 이름 제안이에요. 모두 가칭이에요.
- ballad '발라드 (8마디)' → '캐논 (8코드, 발라드·청량)'
- citypop '시티팝 (세련된 7th)' → '마루사 4-3-6 (세련된 7th)'
- dreamy '몽환·R&B' → '투파이브 2-5-1-6 (R&B·디스코)'
- descend '내려가는 긴장감 (안달루시안)' → '내려가는 긴장감 (i–VII–VI–v)'. 진짜 안달루시안은 b1 뒤에 따로 둬요.
- build(장조) '빌드업 (프리코러스용)' → '순차 상행 (프리·브릿지)'
- mystic '몽환·미스터리' → '마이너 루프 i–VII–VI–VII (힙합)'으로 바꾸거나 목록에서 내려요.
- 선택: emotional·dark(같은 네 코드)와 royal에 국내 통칭(6415, 4536)을 덧붙여요.

### (b) 모델 바꾸기

| # | 제안 | 크기 | 결정 필요 | 풀리는 것 | 영향 범위 |
|---|---|---|---|---|---|
| b1 | 단조 화성단음계 V 토글 (프리셋·섹션 단위 `harmonicV`) | M | 예 | P24, P25 진짜 안달루시안, P19 단조 끝 V7, 「사계」, 「Shut Down」 i–V. 자연단음계 v도 남겨야 해요(1-10의 11) | theory.js chordNotes/chordName, 멜로디 스케일 안내(이끎음), DEGREE_FEEL, AI 검사 |
| b2 | 7th를 코드마다 켜고 끄기 | S~M | 예 (영향 작음) | 「FAKE LOVE」 B♭maj7–C–Dm7, 「Feel Special」 끝 I 3화음, 「Tell Me」 | 저장 형식, 칩 UI |
| b3 | 코드 객체 `{d, q, ext, bass}`. 숫자 배열도 계속 읽어요 | L | 예 | III7·VI7·II7·I7, 4m, ♭6·♭7·♭2, 도리안 IV, 피카르디 I, sus4·add9·m9·aug, 분수 베이스. P10·P14·P21·P22·P23·P26, B01~B06 등 21개 중 대부분 | theory.js, 신스 보이싱, 베이스 패턴(근음 대신 bass), ai-music.js 112행 코드톤 안내, findProgression, MIDI, 칩 select(1~7), AI 출력 검사(1~7, 16개), 저장 데이터 이전 |
| b4 | 반 마디 코드. 섹션별 마디당 1·2코드, 또는 코드별 박 수 | M | 예 | 캐논·하행 베이스(발라드 2/마디), 4536(청량 1.5~2), 순환, JTTOU 마지막 마디 | AI 16개 제한, 드럼·베이스 시간축, 멜로디 '마디별코드' 안내 |
| b5 | 종지 sus4. 섹션 마지막 마디를 5sus4→5로 | b3 뒤면 S, 따로 하면 M | 예 (영향 작음) | 발라드 거의 모든 종지, 「다시 만난 세계」, 「UNFORGIVEN」 | 보이싱 |
| b6 | 마지막 후렴 키업. 곡 단위 `modulation {fromSectionId, semitones: 1·2, method: direct·sus4Push·newV7}` | M | 예 (장르별 기본값: 발라드 +1 켬 / 청량·R&B 옵션 / 다크·클럽·밴드 끔) | 1-9의 발라드 4건 | 플레이어, MIDI, range.js 음역 점검, Suno 스타일 키 문구 |
| b7 | 섹션별 조성·선법. 동주조 장↔단, 프리지안·도리안 섹션 | L | 예 | 「Whistle」, 「Chill Kill」, 「4 Walls」, 「How You Like That」, 「붐바야」, 「Kick It」. 나란한조는 지금도 도수로 돼요 | 키 표시, 멜로디 스케일, Suno 키 |
| b8 | 파워코드(no3) 보이싱 옵션 (악기 쪽) | S~M | 예 (영향 작음) | 다크·밴드·클럽 드롭 | instruments, synth |

추천 순서는 b1 → b2 → b4 → b6 → b3 → b5 → b7·b8이에요. b1·b2만 해도 단조 곡 전반과 「FAKE LOVE」류가 좋아져요. b3는 범위가 커서 따로 계획하는 게 좋아요.

### (c) AI 편곡 프롬프트 규칙

| # | 제안 | 크기 | 결정 필요 |
|---|---|---|---|
| c0 | `style.genre`와 프리셋 목록(id·도수·쓰는 장르)을 프롬프트에 넣기 | S | 예 |
| c1 | 아래 공통 규칙 넣기 | S | 예 (문구) |
| c2 | 아래 장르별 규칙 넣기 (지금 모델 기준) | S | 예 (문구) |
| c3 | 모델 변경(b1·b3·b6) 뒤 규칙 추가 | S | 예 |

**c1 공통 규칙 (붙여 넣을 문장)**
- 프리코러스와 코러스는 서로 다른 진행을 쓴다. 브릿지는 벌스와 다른 진행을 쓴다.
- chords 길이는 마디 수에 맞춘다. 4코드는 4칸, 7코드는 마지막 코드를 한 번 더 넣어 8칸, 3코드는 4칸으로 채운다.
- 단조의 5도 코드는 단3화음(v)으로 나온다. 그러니 장3화음 V가 필요한 진행(안달루시안, i–V)은 고르지 않는다.
- 섹션 안에서 모든 코드에 7th가 붙는다. 7th가 어울리는 장르에서만 seventh를 켠다.
- 흔한 코드 진행 틀은 써도 된다. 멜로디와 가사는 실존 곡에서 베끼지 않는다. 이 문장은 지금 프롬프트의 "실존 곡을 복제하지 않는다"를 어떻게 다듬을지 결정이 필요해요.

**c2 장르별 규칙**
- **발라드**
  - 장조, BPM 60~80, seventh 켬.
  - 벌스: [1,5,6,3,4,1,4,5], [1,5,6,4], [6,4,1,5], [1,6,4,5]
  - 후렴: [4,5,3,6,2,5,1,1], [4,5,3,6], [1,3,6,4]
  - 프리: [3,6,2,5]. 브릿지: [4,7,3,6,2,5,1,1]
  - 단조 발라드: 벌스 [1,6,3,7], 후렴 [1,4,7,3] 또는 [1,4,7,3,6,2,5,1]
- **청량**
  - 장조. 벌스는 [4,2,3,6](seventh 켬), [1,6,4,5], [1,5,6,4]
  - 프리: [4,5,6,1], [4,5,3,6]
  - 후렴: [4,5,3,6], [4,5,3,6,2,5,1,1], [2,5,6,3], [2,4,6,5]
  - 분위기에 '청량'과 '서정'·'감성'이 같이 있으면 단조 [1,5,6,7](TT형)이나 장조 [6,4,3,2]+7th(SIGNAL형)를 쓴다.
- **다크·걸크러시·힙합**
  - 단조, seventh 끔. aespa·NMIXX처럼 세련된 다크면 켬.
  - 벌스: [1,4,7,3], [1,5,6,3]. 프리: [6,7,1,3]
  - 후렴: [6,7,1,1], [1,6,3,7]. 나란한 장조 후렴은 [6,3,7,1], [1,7,3,6]
  - 랩: [1,4](seventh 켬), [7,1], [1,5]. 드롭·댄스 브레이크: [1]. 브릿지: [6,4,5,1]
- **R&B·시티팝**
  - seventh 켬. 벌스: [4,2,3,6], [2,5,1,6]. 프리: [2,3,4,5]
  - 후렴: [4,3,6,1], [2,5,1,6], [4,2,3,6]. 단조 곡이면 [1,5,4,5], [1,7,4,6]
- **클럽 (house·UK garage·Jersey club·Afrobeats·moombahton)**
  - 단조 위주, seventh 켬.
  - 곡 전체에 같은 2~4코드 루프를 써도 된다. 섹션 대비는 energy·drum·instruments로 준다.
  - 루프: [1,5,4,5], [1,4,6,5], [6,5,1,4]. 장조는 [4,3,6,2], [4,3,2,3]
  - 키를 올리지 않는다. Afrobeats·moombahton은 코드 근거가 약해서, 이 규칙을 그대로 쓸지 결정이 필요해요.
- **밴드·록**
  - 장조, seventh 끔. 벌스: [1,5,6,4]. 프리: [4,5,6,1]
  - 후렴: [4,1,5,6], [6,4,1,5], [4,5,6,5]. 브릿지: [2,3,4,5], [3,4,5,6]
  - 단조 록: [1,6,7,7], [6,4,1,7]

**c3 모델 변경 뒤 추가할 규칙**
- b1 뒤: 단조 종지와 안달루시안에는 V를 장3화음으로 쓴다. 자연단음계 v는 다크·클럽 루프에만 쓴다.
- b3 뒤:
  - 발라드 후렴은 4 다음에 4m을 넣는다(`4-4m-3-6-2-5-1`).
  - 청량·R&B 후렴의 3은 III7로 바꿀 수 있다(마루사).
  - 종지는 5sus4→5로 한다.
- b6 뒤: 발라드의 마지막 후렴은 반음 올린다. 다크·클럽·밴드는 올리지 않는다.