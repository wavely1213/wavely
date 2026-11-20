// 상대팀 엠블럼 원본 목록 (D-069 2단계 보류 중 자료 모으기).
// 조건: 투명 PNG/SVG, 긴 변 256px 이상, 원/그림자/흰 원판이 들어가지 않은 것, 공식 경로(구단 홈페이지, 공식 SNS, 연맹 공식 자료)만.
// 예외: 소유자가 직접 준 원본(source 가 '소유자 제공')은 받은 그대로 쓴다(긴 변 200 이상).
// futsal.or.kr 의 team_*.png(92px, 흰 원과 그림자 포함)는 쓰지 않는다. 못 구한 팀은 file 을 null 로 두고 note 에 이유를 적는다.
// 관리자 화면 업로드 칸은 아직 없다 (KNOWN_ISSUES [관리자 칸 필요]).

export type TeamCrestEntry = {
  /** 대표 이름 (경기 데이터의 지금 이름) */
  name: string;
  /** 예전 이름, 줄인 이름 (띄어쓰기, 대소문자 차이는 crestFor 가 무시하므로 넣지 않음) */
  aliases: string[];
  /** public 아래 경로. 못 구했으면 null. 흰 글자 로고처럼 어두운 면 전용이면 이 파일은 어두운 면용 */
  file: string | null;
  /** 흰 면(경기표, 순위표 등)에서 쓸 파일 — 흰 면에서 안 보이는 로고만 (같은 픽셀 크기) */
  fileOnLight?: string;
  /** 원본 픽셀 크기 [가로, 세로] — 비율 그대로 보이게. 못 구했으면 null */
  pixels: [number, number] | null;
  /** 받은 곳 (공식 경로). 못 구했으면 확인한 곳 */
  source: string | null;
  /** 받은 날짜 (YYYY-MM-DD) */
  fetchedAt: string | null;
  /** 상태, 못 구한 이유, 확인할 점 */
  note: string;
};

export const TEAM_CRESTS: TeamCrestEntry[] = [
  {
    name: "강원FS",
    aliases: [],
    file: "/crests/gangwon.png",
    pixels: [256, 264],
    source: "https://gangwon-fc.com/club/emblem",
    fetchedAt: "2026-11-10",
    note: "강원FC 공식 홈페이지 엠블럼(256x264 투명 PNG). 연맹 구단 소개에 강원FS 홈페이지가 강원FC로 적혀 있음(2024.06 강원FC 산하 재창단). 풋살팀 전용 엠블럼이 따로 있는지는 확인 필요",
  },
  {
    name: "화성FS",
    aliases: [],
    file: "/crests/hwaseong.png",
    pixels: [512, 512],
    source: "https://www.xenor.co.kr/images/logo/03_hwaseong_fs_logo.png",
    fetchedAt: "2026-11-10",
    note: "XENOR(구단 파트너) 로고, 연맹 2026 중계 그래픽과 같음(총괄 반박 검증)",
  },
  {
    name: "고양불스풋살클럽",
    aliases: ["고양불스", "고양불스FS"],
    file: "/crests/goyang.png",
    pixels: [512, 509],
    source: "https://www.youtube.com/channel/UC4MXLbhy8sKrFGSImHuui9A",
    fetchedAt: "2026-11-10",
    note: "구단 유튜브 채널 프로필, 흰 배경 제거(총괄 반박 검증)",
  },
  {
    name: "용인지솔FS",
    aliases: ["용인대흥FS", "용인FS"],
    file: "/crests/yongin.png",
    pixels: [257, 258],
    source: "https://i.ytimg.com/vi/X6rLYBNc1eA/maxresdefault.jpg",
    fetchedAt: "2026-11-10",
    note: "연맹 유튜브 중계 썸네일에서 원 모양대로 잘라냄(총괄 반박 검증)",
  },
  {
    name: "노원제너FS",
    aliases: ["노원HR FS", "노원선덜랜드FS", "노원FS"],
    file: "/crests/nowon.png",
    pixels: [377, 512],
    source: "https://www.xenor.co.kr/images/logo/01_nowon_xenor_logo.png",
    fetchedAt: "2026-11-10",
    note: "XENOR(구단 이름 후원사) 로고(총괄 반박 검증)",
  },
  {
    name: "전주시민풋살구단",
    aliases: ["전주매그풋살클럽", "전주매그", "전주시민FS"],
    file: "/crests/jeonju.png",
    pixels: [403, 512],
    source: "https://www.youtube.com/@jeonjucitizen",
    fetchedAt: "2026-11-10",
    note: "구단 유튜브 채널 프로필, 배경 제거(총괄 반박 검증)",
  },
  {
    name: "경기LBFS",
    aliases: [],
    file: "/crests/lbfs.png",
    pixels: [233, 281],
    source: "https://i.ytimg.com/vi/2ofcJvy3mLk/maxresdefault.jpg",
    fetchedAt: "2026-11-10",
    note: "연맹 유튜브 중계 썸네일, 별 3개 지금 엠블럼(총괄 반박 검증)",
  },
  {
    name: "인천ZD스포츠",
    aliases: ["인천ZD"],
    file: "/crests/incheon-zd.png",
    fileOnLight: "/crests/incheon-zd-on-light.png",
    pixels: [266, 218],
    source: "https://www.youtube.com/watch?v=CVy3g6RNsAA",
    fetchedAt: "2026-11-12",
    note: "한국풋살연맹 유튜브 영상 썸네일의 붓글씨 '仁川 無缺點'(소유자 지정 2026-11-12). 흰 글씨는 어두운 면, 검정(#0e0f12) 글씨는 흰 면",
  },
  {
    name: "구미FS",
    aliases: [],
    file: "/crests/gumi.png",
    pixels: [262, 303],
    source: "https://i.ytimg.com/vi/4bYF_J0EcZI/maxresdefault.jpg",
    fetchedAt: "2026-11-10",
    note: "연맹 유튜브 중계 썸네일에서 잘라냄(총괄 반박 검증)",
  },
  {
    name: "대구FS",
    aliases: [],
    file: "/crests/daegu.png",
    pixels: [493, 493],
    source: "https://www.youtube.com/@daegu_fs",
    fetchedAt: "2026-11-10",
    note: "구단 유튜브 프로필(총괄 반박 검증)",
  },
  {
    name: "드림허브군산FS",
    aliases: ["군산FS"],
    file: "/crests/gunsan.png",
    pixels: [277, 367],
    source: "https://i.ytimg.com/vi/Z70lMVxoq8Q/maxresdefault.jpg",
    fetchedAt: "2026-11-10",
    note: "연맹 유튜브 중계 썸네일, 방패만(총괄 반박 검증)",
  },
  {
    name: "청주팔라시오FS",
    aliases: ["청주풋살클럽"],
    file: "/crests/cheongju.png",
    pixels: [371, 475],
    source: "https://ldb-phinf.pstatic.net/20251031_41/1761920251242g3kgL_PNG/KakaoTalk_20250805_144018531.png",
    fetchedAt: "2026-11-10",
    note: "오송 팔라시오 축구 아카데미 네이버 플레이스(구단 관계 채널, m.place.naver.com/place/2070103404)(총괄 반박 검증)",
  },
  {
    name: "제천FS",
    aliases: [],
    file: "/crests/jecheon.png",
    pixels: [200, 200],
    source: "소유자 제공 (2026-11-15, JECHEON FUTSAL CLUB 원형 엠블럼)",
    fetchedAt: "2026-11-15",
    note: "소유자 지정(I-051 해결). 200x200 투명 PNG — 긴 변 256 기준보다 작아 PC 가장 큰 자리(112)에서 2배 화면이면 살짝 늘어남. 바깥 검정 원은 엠블럼 자체 모양",
  },
];
