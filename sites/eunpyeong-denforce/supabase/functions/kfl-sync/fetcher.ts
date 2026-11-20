// 연맹 요청 예산 (D-082, 명세 2.5) — 바깥(fetch, 시계, 잠자기)은 deps 로 받아 테스트에서 가짜로 바꾼다 (테스트: kfl-fetcher.test.ts)
// 호스트 하나(HTTP — 연맹 HTTPS 인증서가 깨져 있음, TLS 검증을 끄지 않는다), GET 만, 요청 사이 1.5초, 실행당 8건, 하루 60건, 실행 90초.
import { decodeUtf8 } from "./html.ts";

export const HOST = "http://www.futsal.or.kr";
export const HEADERS = {
  "User-Agent": "eunpyeong-fs.com record sync (+https://eunpyeong-fs.com/contact)",
  Referer: `${HOST}/`,
  "Accept-Language": "ko",
};
export const GAP_MS = 1500;
export const TIMEOUT_MS = 20_000;
export const MAX_PER_RUN = 8;
export const MAX_PER_DAY = 60;
/** 응답 본문 상한 (기록지 원본은 약 60KB) */
export const MAX_BODY_BYTES = 2 * 1024 * 1024;
/** 실행이 이만큼 지나면 새 요청을 하지 않는다 (무료 플랜 150초 벽시계) */
export const RUN_BUDGET_MS = 90_000;

/** 예산이 다 됨 — 이번 실행의 요청을 멈춘다(실패 아님) */
export class BudgetExhausted extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BudgetExhausted";
  }
}

/** 연맹이 거절/서버 오류/네트워크 오류 — 이번 실행 요청을 멈추고 fail_streak 를 올린다 */
export class KflRequestError extends Error {
  status: number | null;
  constructor(message: string, status: number | null) {
    super(message);
    this.name = "KflRequestError";
    this.status = status;
  }
}

export type FetcherDeps = {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  /** 오늘(서울) 이미 한 요청 수 */
  dayCount: number;
  startedAt: number;
};

/** 서울 날짜 'YYYY-MM-DD' — 하루 상한(req_day) 기준 */
export const seoulDay = (ms: number) => new Date(ms + 9 * 3_600_000).toISOString().slice(0, 10);

/** club id 는 [A-Za-z0-9_]{2,30}, 나머지는 숫자만 — 파싱한 값으로만 주소를 만든다 */
const CLUB = /^[A-Za-z0-9_]{2,30}$/;
const int = (n: number) => {
  if (!Number.isInteger(n) || n <= 0) throw new Error(`주소 값이 숫자가 아님: ${n}`);
  return String(n);
};

export const schedulePath = (leagueSeq: number, leagueType: number, page: number) =>
  `/game_leagueTab03.action?league_seq=${int(leagueSeq)}&league_type=${int(leagueType)}&divisionPage=mainPage&pageNum=${int(page)}`;

export function sheetPath(home: string, away: string, leagueSeq: number, leagueType: number, gameNumber: number): string {
  if (!CLUB.test(home) || !CLUB.test(away)) throw new Error("club id 모양이 다름");
  return `/gameLeagueRecord.action?club1_id=${home}&club2_id=${away}&league_seq=${int(leagueSeq)}&league_type=${int(leagueType)}&game_number=${int(gameNumber)}`;
}

export const CLUB_PAGE = "/mng_EunPyeong.action";

export class Fetcher {
  deps: FetcherDeps;
  /** 이번 실행에서 한 요청 수 */
  count = 0;
  /** 이번 실행에서 성공한 요청이 있었는지 (fail_streak 초기화) */
  anyOk = false;
  last = 0;
  constructor(deps: FetcherDeps) {
    this.deps = deps;
  }

  /** 이번 실행/오늘 남은 요청이 있는지 */
  canRequest(): boolean {
    return (
      this.count < MAX_PER_RUN && this.deps.dayCount + this.count < MAX_PER_DAY && this.deps.now() - this.deps.startedAt < RUN_BUDGET_MS
    );
  }

  /** GET 하나 — 예산, 간격, 시간 제한, UTF-8 만. 실패는 KflRequestError */
  async get(path: string): Promise<string> {
    if (!this.canRequest()) throw new BudgetExhausted(`요청 예산 끝 (이번 ${this.count}, 오늘 ${this.deps.dayCount + this.count})`);
    // 간격은 앞 요청이 끝난 때부터 1.5초
    const wait = this.last + GAP_MS - this.deps.now();
    if (this.last && wait > 0) await this.deps.sleep(wait);
    this.count++;
    let res: Response;
    let bytes: Uint8Array;
    try {
      res = await this.deps.fetch(`${HOST}${path}`, { headers: HEADERS, redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.status !== 200) {
        await res.body?.cancel().catch(() => {});
        throw new KflRequestError(`연맹 응답 ${res.status} (${path.split("?")[0]})`, res.status);
      }
      // 본문 읽기 중 시간 초과/끊김도 요청 실패
      bytes = new Uint8Array(await res.arrayBuffer());
    } catch (e) {
      if (e instanceof KflRequestError) throw e;
      throw new KflRequestError(`네트워크 오류: ${String(e instanceof Error ? e.message : e).slice(0, 200)}`, null);
    } finally {
      this.last = this.deps.now();
    }
    if (bytes.byteLength > MAX_BODY_BYTES) throw new KflRequestError(`응답이 너무 큼 (${bytes.byteLength})`, res.status);
    const text = decodeUtf8(bytes, res.headers.get("content-type"));
    this.anyOk = true;
    return text;
  }
}

/** 연속 실패 → 멈춤 시간: min(24h, 1h × 2^(fail_streak-1)) */
export function pauseUntil(failStreak: number, now: number): string {
  return new Date(now + Math.min(24 * 3_600_000, 3_600_000 * 2 ** Math.max(0, failStreak - 1))).toISOString();
}
