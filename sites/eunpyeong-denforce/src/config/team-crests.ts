// 상대팀 엠블럼 원본 목록 (D-069 2단계 보류 중 자료 모으기).
// 조건: 투명 PNG/SVG, 긴 변 256px 이상, 원/그림자/흰 원판이 들어가지 않은 것, 공식 경로(구단 홈페이지, 공식 SNS, 연맹 공식 자료)만.
// futsal.or.kr 의 team_*.png(92px, 흰 원과 그림자 포함)는 쓰지 않는다. 못 구한 팀은 file 을 null 로 두고 note 에 이유를 적는다.
// 관리자 화면 업로드 칸은 아직 없다 (KNOWN_ISSUES [관리자 칸 필요]).

export type TeamCrestEntry = {
  /** 대표 이름 (경기 데이터의 지금 이름) */
  name: string;
  /** 예전 이름, 줄인 이름 (띄어쓰기, 대소문자 차이는 crestFor 가 무시하므로 넣지 않음) */
  aliases: string[];
  /** public 아래 경로. 못 구했으면 null */
  file: string | null;
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
    file: null,
    pixels: null,
    source: "http://www.futsal.or.kr/mng_HwaseongFS.action",
    fetchedAt: null,
    note: "못 구함: 공식 홈페이지 없음(연맹 소개에 인스타그램 hwaseong_fs 만). 인스타그램은 로그인 없이 원본을 받을 수 없고 프로필 사진은 JPG",
  },
  {
    name: "고양불스풋살클럽",
    aliases: ["고양불스", "고양불스FS"],
    file: null,
    pixels: null,
    source: "http://www.futsal.or.kr/mng_GoYang.action",
    fetchedAt: null,
    note: "못 구함: 연맹 소개의 홈페이지 goyangbulls.com 접속 안 됨. 연맹 소개 이미지는 JPG. 인스타그램 goyang_bulls_officiel 은 원본 받기 불가",
  },
  {
    name: "용인지솔FS",
    aliases: ["용인대흥FS", "용인FS"],
    file: null,
    pixels: null,
    source: "http://www.futsal.or.kr/mng_Yongin.action",
    fetchedAt: null,
    note: "못 구함: 공식 홈페이지 없음(연맹 소개 인스타그램은 예전 이름 yongin_daeheungfs). 2025 시즌 용인대흥FS에서 용인지솔FS로 이름 변경(스폰서 변경), 엠블럼이 바뀌었는지 공식 자료로 확인 못 함",
  },
  {
    name: "노원제너FS",
    aliases: ["노원HR FS", "노원선덜랜드FS", "노원FS"],
    file: null,
    pixels: null,
    source: null,
    fetchedAt: null,
    note: "못 구함: 연맹 FK리그 구단 목록에 노원 구단 소개 페이지가 없고 공식 홈페이지/SNS를 찾지 못함. 이름이 노원FS, 노원선덜랜드FS, 노원HR FS 로 여러 번 바뀜",
  },
  {
    name: "전주시민풋살구단",
    aliases: ["전주매그풋살클럽", "전주매그", "전주시민FS"],
    file: null,
    pixels: null,
    source: "http://www.futsal.or.kr/mng_JeonJu.action",
    fetchedAt: null,
    note: "못 구함: 연맹 소개의 홈페이지 jeonjumag.com 접속 안 됨. 2025.07 전주매그풋살클럽에서 이름 변경",
  },
  {
    name: "경기LBFS",
    aliases: [],
    file: null,
    pixels: null,
    source: "http://www.futsal.or.kr/mng_Lbfs.action",
    fetchedAt: null,
    note: "못 구함: 공식 홈페이지 없음(인스타그램 gyeonggi_lbfs 만). 인스타그램은 원본 받기 불가",
  },
  {
    name: "인천ZD스포츠",
    aliases: [],
    file: null,
    pixels: null,
    source: null,
    fetchedAt: null,
    note: "못 구함: 연맹 자료에서 이 이름의 구단을 찾지 못함(인천 구단 소개는 인스타그램 incheon_futsal_official). 같은 팀인지 확인 필요",
  },
];
