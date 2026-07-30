import { S } from "./save.js";
import { host } from "./host.js";
import { shade } from "./color.js";
/* ═══════════════════════════════════════════════
   4. 게임 데이터
   ═══════════════════════════════════════════════ */

/* 4-1. 무기 · 장비 */
export const WEAPON = [
  null,
  { nm: "단일 파형",   desc: "직선 1발",            dmg: 10, rate: .17, shots: 1 },
  { nm: "이중 파형",   desc: "직선 2발",            dmg: 9,  rate: .155, shots: 2 },
  { nm: "확산 파형",   desc: "3방향 확산",          dmg: 9,  rate: .145, shots: 3 },
  { nm: "광역 파형",   desc: "3확산 + 측면 2발",    dmg: 9,  rate: .135, shots: 5 },
  { nm: "관통 파형",   desc: "5확산 + 중앙 관통",   dmg: 11, rate: .12,  shots: 5, pierce: 3 }
];
export const ENGINE = [null,
  { spd: 300, mul: 1.00 }, { spd: 340, mul: .94 }, { spd: 380, mul: .88 },
  { spd: 420, mul: .82 }, { spd: 470, mul: .74 }
];
export const SHIELD = [null,
  { hp: 3, bomb: 1 }, { hp: 4, bomb: 2 }, { hp: 5, bomb: 2 },
  { hp: 6, bomb: 3 }, { hp: 7, bomb: 4 }
];
export const MAXLV = 5;
/* 시뮬레이션 결과 전체 해금에 약 113판이 필요했다(코어 ~60/판, 총액 6,755).
   간단한 게임에 비해 과한 그라인드라 비용을 낮추고, 아래에 구역 클리어 보너스를 뒀다. */
export const upCost = lv => Math.round(18 * Math.pow(lv, 1.6) / 5) * 5;

export const EQUIP = [
  { id: "weapon", nm: "무기 코일", tbl: WEAPON, line: lv => WEAPON[lv].nm + " · " + WEAPON[lv].desc + " · 위력 " + WEAPON[lv].dmg },
  { id: "engine", nm: "추진 엔진", tbl: ENGINE, line: lv => "기동 " + ENGINE[lv].spd + " · 연사 " + Math.round((1 / ENGINE[lv].mul) * 100) + "%" },
  { id: "shield", nm: "차폐막",    tbl: SHIELD, line: lv => "내구 " + SHIELD[lv].hp + " · 폭탄 " + SHIELD[lv].bomb }
];

/* 4-1b. 탑승자 — 회피율 · 연사력 · 보급 아이템 종류가 갈린다
   rate는 사격 간격 배율(작을수록 빠름), 표시는 연사 %로 뒤집어 보여준다. */
export const PILOTS = [
  { id: "stray",  desig: "P-01", call: "스트레이", nm: "유리 카렌", cost: 0,
    bio: "정비반에서 올라온 대체 요원. 기체가 부서지는 소리를 남보다 먼저 듣는다.",
    evade: .06, rate: .89, drop: "repair",
    dropNm: "정비 부품", dropTx: "내구 1 회복" },

  { id: "hollow", desig: "P-02", call: "할로우",   nm: "진 나오미", cost: 240,
    bio: "관측 특기. 쏘는 것보다 보는 것이 빠르다는 이유로 배치되었다.",
    evade: .20, rate: 1.06, drop: "cluster",
    dropNm: "코어 뭉치", dropTx: "코어 5 즉시 회수" },

  { id: "torch",  desig: "P-03", call: "토치",     nm: "서 도윤",   cost: 320,
    bio: "돌입 성향. 관제 기록에 '제동 거리 미상'이라고 적혀 있다.",
    evade: .03, rate: .80, drop: "surge",
    dropNm: "과부하 셀", dropTx: "8초간 연사 +45%" },

  { id: "anchor", desig: "P-04", call: "앵커",     nm: "문 세라",   cost: 280, need: 2,
    bio: "포격 관제 출신. 탄도를 먼저 그리고 나서 방아쇠를 생각한다.",
    evade: .10, rate: 1.00, drop: "ord",
    dropNm: "예비 탄두", dropTx: "폭탄 1 보급" }
];

/* 4-1c. 기체 — 공격력 · 이동속도 · 연사력 · 부가효과
   실루엣도 기체마다 다르다(drawFrame). 도장은 그 위에 얹히는 색. */
export const FRAMES = [
  { id: "grail",  desig: "TR-04", nm: "그레일", cost: 0, cls: "표준 강습",
    bio: "제식 채용기. 특출난 곳이 없다는 것이 유일한 특징으로 남았다.",
    atk: 1.00, spd: 1.00, rate: 1.00, perk: "output",
    perkNm: "정격 출력", perkTx: "콤보 배율 상한 ×6",
    arm: "std",  armNm: "제식 사격", armTx: "무기 코일 기본 배치" },

  { id: "bore",   desig: "HV-09", nm: "보어",   cost: 340, cls: "중장 돌파",
    bio: "장갑을 두르는 대신 관절을 포기했다. 앞으로만 잘 간다.",
    atk: 1.34, spd: .82, rate: 1.14, perk: "pierce",
    perkNm: "천공 탄심", perkTx: "관통 +1",
    arm: "lance", armNm: "집속 랜스", armTx: "탄을 중앙으로 모아 굵게 쏜다" },

  { id: "whim",   desig: "SL-02", nm: "윔지",   cost: 300, cls: "경량 정찰",
    bio: "장갑판을 전부 떼어낸 시험 사양. 맞으면 끝이지만, 잘 안 맞는다.",
    atk: .84, spd: 1.28, rate: .86, perk: "magnet",
    perkNm: "견인장 확대", perkTx: "보급품 회수 범위 ×1.8",
    arm: "fan",  armNm: "광각 산탄", armTx: "더 넓게 퍼진다 · 화면을 훑는다" },

  { id: "cage",   desig: "XN-11", nm: "케이지", cost: 420, need: 3, cls: "시제 실험기",
    bio: "육각 차폐 실증기. 관제국은 아직 이 기체의 도면을 공개하지 않았다.",
    atk: 1.08, spd: .96, rate: 1.00, perk: "guard",
    perkNm: "육각 차폐", perkTx: "6초마다 피탄 1회 무효",
    arm: "flank", armNm: "측면 사출", armTx: "후방 2발이 비스듬히 되돌아 나간다" }
];
export const GUARD_CD = 6;

export function loadout() {
  return {
    pilot: PILOTS.find(p => p.id === S.pilot) || PILOTS[0],
    frame: FRAMES.find(f => f.id === S.frame) || FRAMES[0],
    skin:  SKINS.find(k => k.id === S.skin)   || SKINS[0],
    trail: TRAILS.find(t => t.id === S.trail) || TRAILS[0]
  };
}

/* 최종 스펙 = 장비 × 기체 × 탑승자 */
export function stats() {
  const w = WEAPON[S.eq.weapon], e = ENGINE[S.eq.engine], s = SHIELD[S.eq.shield];
  const { pilot, frame } = loadout();
  return {
    shots:  w.shots,
    dmg:    Math.round(w.dmg * frame.atk),
    pierce: (w.pierce || 0) + (frame.perk === "pierce" ? 1 : 0),
    speed:  Math.round(e.spd * frame.spd),
    rate:   w.rate * e.mul * frame.rate * pilot.rate,
    hp: s.hp, bomb: s.bomb,
    evade:  pilot.evade,
    drop:   pilot.drop,
    magnet: frame.perk === "magnet" ? 198 : 110,
    comboCap: frame.perk === "output" ? 6 : 5,
    guard:  frame.perk === "guard"
  };
}

/* 4-2. 치장 — 도장(색)만 담당. 실루엣은 기체가 정한다. */
/* 주색 + 보조색 2톤. 보조색은 어깨·날개 끝 등 '패널 일부'에만 얹혀
   단색 도장보다 기계 도장처럼 읽힌다. */
export const SKINS = [
  { id: "std",    nm: "정격 도장", sub: "관제국 제식 배색",   cost: 0,
    col: () => host.color("signal"), col2: () => shade(host.color("signal"), -.5) },
  { id: "azure",  nm: "창공",      sub: "고고도 정찰 배색",   cost: 210,
    col: () => host.color("drift"),  col2: () => host.color("field") },
  { id: "verdant",nm: "초원",      sub: "지상 지원 배색",     cost: 210,
    col: () => host.color("moss"),   col2: () => shade(host.color("moss"), -.45) },
  { id: "ink",    nm: "흑요",      sub: "3구역 돌파 증표",    cost: 0, need: 3,
    col: () => host.color("fg"),     col2: () => host.color("signal") }
];
export const TRAILS = [
  { id: "ember", nm: "잔불", sub: "표준 배기",        cost: 0 },
  { id: "ion",   nm: "이온", sub: "냉각 배기",        cost: 160 },
  { id: "echo",  nm: "잔향", sub: "위상 잔상",        cost: 300 },
  { id: "bloom", nm: "개화", sub: "유기 촉매",        cost: 260 }
];

/* 4-3. 스테이지 · 스토리 */
export const STAGES = [
  null,
  { nm: "정적 지대",   en: "STATIC FIELD" },
  { nm: "간섭 구역",   en: "INTERFERENCE BELT" },
  { nm: "반향의 벽",   en: "ECHO WALL" },
  { nm: "백색 소음",   en: "WHITE NOISE" },
  { nm: "근원",        en: "THE SOURCE" }
];
export const ENDLESS_NM = "잔향";

/* 구역별로 [기록 나레이션, 관제 지시]는 고정, 마지막 한 줄은 탑승자마다 다르다.
   탑승자 선택이 스토리에서도 실제로 갈리도록. */
export const STORY_FIXED = {
  1: [
    [null,  "기계화 3세기. 인간은 더 이상 하늘을 걷지 않는다. 기체를 입고 걷는다."],
    ["관제", "정격관제국 관제다. 파장-7, 1구역 진입 승인. 군체 밀도 낮음 — 몸 풀 시간은 준다."]
  ],
  2: [
    [null,  "군체는 같은 실수를 두 번 하지 않는다. 그것이 기계라는 것의 유일한 예의다."],
    ["관제", "간섭 수치가 올라간다. 저쪽이 대형을 짜기 시작했어."]
  ],
  3: [
    [null,  "벽은 이쪽이 낸 소리를 1.4초 늦게 되돌려준다."],
    ["관제", "반향 경보. 네 기체 신호가 복제되고 있다 — 조준을 믿지 마라."]
  ],
  4: [
    [null,  "모든 주파수가 동시에 켜지면, 아무것도 들리지 않는다."],
    ["관제", "여기서 통신이 끊긴다. 파장-7 — 이제부터는 네 판단이다."]
  ],
  5: [
    [null,  "군체를 움직인 것은 명령이 아니었다. 그저 꺼지지 않은 송신이었다."],
    ["관제", "…근원이 잡힌다. 끊어라, 파장-7. 그거면 전부 멈춘다."]
  ]
};

export const STORY_PILOT = {
  stray: {
    1: "정비 끝났습니다. 어디가 먼저 부러질지는 알고 갑니다.",
    2: "대형을 짠다는 건 저쪽도 부품을 아끼기 시작했다는 뜻이에요.",
    3: "제 소리를 흉내 내네요. 볼트 푸는 소리까지 똑같이.",
    4: "관제 없이도 기체는 돌아갑니다. 그게 정비반이 하는 일이고요.",
    5: "이건 고쳐 쓸 수 있는 고장이 아니네요. 뜯어야겠어요.",
    end: "돌아가면 제일 먼저 기체부터 볼게요."
  },
  hollow: {
    1: "밀도 낮음 확인. …낮은 게 아니라, 비켜준 겁니다.",
    2: "저쪽이 우리를 세고 있어요. 하나, 라고.",
    3: "둘 중 하나는 접니다. 어느 쪽인지는 나중에 정하죠.",
    4: "조용하네요. 드디어 제대로 볼 수 있겠습니다.",
    5: "몇 백 년을 계속 말하고 있었어요. 아무도 안 듣는데.",
    end: "조용해지니까 오히려 안 들리는 게 무섭네요."
  },
  torch: {
    1: "몸 풀 시간 필요 없습니다. 그냥 뚫죠.",
    2: "짜라고 하세요. 어차피 가운데부터 뚫습니다.",
    3: "복제든 뭐든, 맞으면 부서지는 건 똑같습니다.",
    4: "안 들리면 안 들리는 대로. 방아쇠는 제 손에 있으니까.",
    5: "길었습니다. 마지막 한 발까지 갑니다.",
    end: "다음 대역은 언제 엽니까?"
  },
  anchor: {
    1: "탄도 계산 완료. 1구역은 예열로 씁니다.",
    2: "대형은 좋아합니다. 한 발에 두 대씩 지워지니까요.",
    3: "표적이 둘로 늘었군요. 탄약도 두 배 씁시다.",
    4: "좌표 마지막 갱신 확인. 나머지는 눈으로 쏩니다.",
    5: "최종 탄도 입력. 이걸로 조용해집니다.",
    end: "탄약 재고 보고 올리겠습니다."
  }
};

export const STORY_END_FIXED = [
  [null,  "송신이 끊겼다. 군체는 처음으로, 서 있던 자리에서 그대로 멈췄다."],
  ["관제", "전 대역 정적 확인. 파장-7, 귀환하라. …잔향은 아직 남아 있다."]
];

/* 무한 모드 「잔향」 — 엔딩이 "잔향은 아직 남아 있다"로 끝나는데
   정작 그 구간에 대사가 하나도 없었다. 이정표 구역에만 짧게 붙인다. */
export const STORY_REVERB = {
  6: {
    fixed: [
      [null,  "근원은 껐다. 그런데 군체는 여전히 움직인다."],
      ["관제", "송신원 없음. 반복한다 — 송신원이 없다. 그런데 대역이 다시 차오르고 있어."]
    ],
    pilot: {
      stray:  "꺼진 기계가 도는 건 두 가지예요. 여분 전원이거나, 다른 손이거나.",
      hollow: "관측 결과는 하나예요. 이건 잔향이 아니라 응답입니다.",
      torch:  "원인은 나중에 찾죠. 지금은 눈앞부터.",
      anchor: "탄도 재계산. 표적이 줄지 않는다는 전제로 다시 짭니다."
    }
  },
  10: {
    fixed: [
      [null,  "다섯 구역째. 군체는 줄지 않고, 대신 조금씩 다르게 움직인다."],
      ["관제", "패턴이 갱신되고 있다. 누군가 이걸 계속 고쳐 쓰고 있어."]
    ],
    pilot: {
      stray:  "정비 흔적이에요. 이건 부서진 게 아니라 손질된 겁니다.",
      hollow: "우리 기록을 읽고 있어요. 우리가 이긴 방식만 골라서.",
      torch:  "학습하는 상대는 처음 아닙니다. 더 빨리 끝내면 됩니다.",
      anchor: "같은 탄도를 두 번 쓰지 않겠습니다."
    }
  },
  15: {
    fixed: [
      [null,  "열 구역째. 대역 어디에도 송신원은 없다. 군체 자신을 빼면."],
      ["관제", "…결론이 나왔다. 근원을 끈 게 아니야. 옮겨간 거다."]
    ],
    pilot: {
      stray:  "그럼 이건 고장이 아니라 이사네요. 계속 뜯겠습니다.",
      hollow: "처음부터 대답을 기다린 게 아니었어요. 이어받을 상대를 찾은 거죠.",
      torch:  "몇 번을 옮기든 상관없습니다. 그때마다 갑니다.",
      anchor: "장기전 편성으로 전환합니다. 탄약 계산 다시."
    }
  }
};

/* 고정 줄 + 현재 탑승자 줄을 합쳐 한 편으로 만든다 */
export function storyFor(stage) {
  const p = loadout().pilot;
  const rv = STORY_REVERB[stage];
  if (rv) {
    const line = rv.pilot[p.id];
    return line ? [...rv.fixed, [p.call, line]] : [...rv.fixed];
  }
  const fixed = STORY_FIXED[stage];
  if (!fixed) return null;
  const line = (STORY_PILOT[p.id] || {})[stage];
  return line ? [...fixed, [p.call, line]] : [...fixed];
}
export function storyEnd() {
  const p = loadout().pilot;
  const line = (STORY_PILOT[p.id] || {}).end;
  return line ? [...STORY_END_FIXED, [p.call, line]] : [...STORY_END_FIXED];
}

/* 4-4. 도감 */
export const CODEX = [
  { id: "drone",  nm: "MD-1 표류기", tx: "군체의 최소 단위. 조립 라인에서 그대로 떨어져 나온 골격에 추진기 하나를 붙였다. 판단하지 않고, 대신 수가 많다." },
  { id: "weaver", nm: "MW-3 직조기", tx: "좌우로 궤도를 짜며 내려온다. 조준해서 쏜다 — 즉 광학 계통이 살아 있다는 뜻이다." },
  { id: "turret", nm: "MT-7 고정포", tx: "공중에서 관절을 잠그고 포대가 된다. 냉각 한계 탓에 오래 머물지 못하는 것이 유일한 자비." },
  { id: "rusher", nm: "MR-0 돌입기", tx: "무장이 없다. 그냥 온다. 군체가 가장 정직해지는 형태이고, 가장 싸게 찍어낼 수 있는 형태다." },
  { id: "boss",   nm: "AX 증폭 코어", tx: "구역마다 하나씩 매달린 중계 증폭기. 육각 차폐를 두르고 송신을 되뿌린다. 부수면 그 구간의 군체가 잠시 손을 놓는다." }
];
