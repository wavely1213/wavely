// 관리자 폼 입력 검증 — 서버 액션에서 FormData 를 읽고 필드별 오류를 모은다.
// 순수 로직만 둔다 (테스트: form.test.ts). DB 제약(마이그레이션 check)과 같은 범위를 쓴다.

export type ActionState = {
  /** 폼 상단에 보여줄 메시지 (성공·실패) */
  message?: string;
  ok?: boolean;
  /** 필드 이름 → 오류 문구 */
  errors?: Record<string, string>;
  /**
   * 제출했던 값 — React 19 는 액션 후 폼을 초기화하므로, 오류 시 입력값을 되살리는 데 쓴다.
   * (파일·비밀번호는 담지 않는다)
   */
  values?: Record<string, string>;
};

type TextOpts = { label: string; max?: number; required?: boolean; pattern?: RegExp; patternHint?: string };
type IntOpts = { label: string; min?: number; max?: number; required?: boolean };

export class FormReader {
  readonly errors: Record<string, string> = {};
  private readonly fd: FormData;

  constructor(fd: FormData) {
    this.fd = fd;
  }

  private raw(name: string): string {
    const v = this.fd.get(name);
    return typeof v === "string" ? v.trim() : "";
  }

  private fail(name: string, message: string) {
    if (!this.errors[name]) this.errors[name] = message;
  }

  /** 정규식으로 못 거르는 검사(예: 영상 주소 해석)를 액션에서 직접 할 때 오류를 남긴다 */
  reject(name: string, message: string) {
    this.fail(name, message);
  }

  /** 필수 문자열 (비면 오류) */
  text(name: string, opts: TextOpts): string {
    const v = this.raw(name);
    if (!v) {
      if (opts.required !== false) this.fail(name, `${opts.label}을(를) 입력해 주세요.`);
      return v;
    }
    if (opts.max && v.length > opts.max) this.fail(name, `${opts.label}은(는) ${opts.max}자 이하로 입력해 주세요.`);
    if (opts.pattern && !opts.pattern.test(v)) this.fail(name, opts.patternHint ?? `${opts.label} 형식이 올바르지 않습니다.`);
    return v;
  }

  /** 선택 문자열 — 비면 null */
  optText(name: string, opts: Omit<TextOpts, "required">): string | null {
    const v = this.text(name, { ...opts, required: false });
    return v === "" ? null : v;
  }

  /** 정수. 선택 필드는 비면 null */
  int(name: string, opts: IntOpts & { required: true }): number;
  int(name: string, opts: IntOpts): number | null;
  int(name: string, opts: IntOpts): number | null {
    const v = this.raw(name);
    if (v === "") {
      if (opts.required) this.fail(name, `${opts.label}을(를) 입력해 주세요.`);
      return opts.required ? 0 : null;
    }
    if (!/^-?\d+$/.test(v)) {
      this.fail(name, `${opts.label}은(는) 숫자로 입력해 주세요.`);
      return opts.required ? 0 : null;
    }
    const n = Number(v);
    if (opts.min !== undefined && n < opts.min) this.fail(name, `${opts.label}은(는) ${opts.min} 이상이어야 합니다.`);
    if (opts.max !== undefined && n > opts.max) this.fail(name, `${opts.label}은(는) ${opts.max} 이하여야 합니다.`);
    return n;
  }

  /** 체크박스 */
  bool(name: string): boolean {
    const v = this.fd.get(name);
    return v === "on" || v === "true" || v === "1";
  }

  /** 정해진 값 중 하나 */
  choice<T extends string>(name: string, options: readonly T[], label: string): T {
    const v = this.raw(name);
    if (!(options as readonly string[]).includes(v)) {
      this.fail(name, `${label}을(를) 선택해 주세요.`);
      return options[0];
    }
    return v as T;
  }

  /** http(s) 주소 (선택) */
  optUrl(name: string, label: string): string | null {
    return this.optText(name, { label, max: 500, pattern: /^https?:\/\/\S+$/, patternHint: `${label}은(는) http:// 또는 https:// 로 시작해야 합니다.` });
  }

  /** YYYY-MM-DD (선택) */
  optDate(name: string, label: string): string | null {
    const v = this.optText(name, { label, pattern: /^\d{4}-\d{2}-\d{2}$/, patternHint: `${label}은(는) YYYY-MM-DD 형식으로 입력해 주세요.` });
    if (v && !isCalendarDate(v)) this.fail(name, `${label}이(가) 올바른 날짜가 아닙니다.`);
    return v;
  }

  /** YYYY-MM-DD (필수) */
  date(name: string, label: string): string {
    const v = this.text(name, { label, pattern: /^\d{4}-\d{2}-\d{2}$/, patternHint: `${label}은(는) YYYY-MM-DD 형식으로 입력해 주세요.` });
    if (v && !this.errors[name] && !isCalendarDate(v)) this.fail(name, `${label}이(가) 올바른 날짜가 아닙니다.`);
    return v;
  }

  /** http(s) 주소 (필수) */
  url(name: string, label: string, max = 1000): string {
    return this.text(name, { label, max, pattern: /^https?:\/\/\S+$/, patternHint: `${label}은(는) http:// 또는 https:// 로 시작해야 합니다.` });
  }

  /** 업로드 파일 (선택) — 비어 있으면 null */
  file(name: string): File | null {
    const v = this.fd.get(name);
    return v instanceof File && v.size > 0 ? v : null;
  }

  /** 업로드 파일 여러 개 (multiple) — 빈 칸은 뺀다 */
  files(name: string): File[] {
    return this.fd.getAll(name).filter((v): v is File => v instanceof File && v.size > 0);
  }

  /** 같은 이름의 문자열 값 전부 (여러 체크박스) */
  values(name: string): string[] {
    return this.fd.getAll(name).filter((v): v is string => typeof v === "string");
  }

  get hasErrors() {
    return Object.keys(this.errors).length > 0;
  }

  /** 오류 상태 (폼에 그대로 반환) */
  state(message = "입력값을 확인해 주세요."): ActionState {
    return { message, errors: { ...this.errors }, values: submittedValues(this.fd) };
  }
}

/** YYYY-MM-DD 가 실제 달력 날짜인지 (Date.parse 는 2000-02-30 을 3월로 넘기므로 왕복 비교). 0000년 제외 */
export function isCalendarDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v.startsWith("0000")) return false;
  const t = Date.parse(`${v}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v;
}

/** 폼 재표시용 제출값 (문자열만, 비밀번호 제외) */
export function submittedValues(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$") && !/password/i.test(k)) out[k] = v;
  });
  return out;
}

/** "2026-10-24" + "15:00" (한국 시간) → ISO 문자열. 형식이 틀리면 null */
export function kstToIso(date: string, time: string): string | null {
  if (!isCalendarDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const iso = `${date}T${time}:00+09:00`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

/** ISO → 한국 시간 { date: "YYYY-MM-DD", time: "HH:mm" } (폼 기본값용) */
export function isoToKst(iso: string): { date: string; time: string } {
  const d = new Date(Date.parse(iso) + 9 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  };
}

/** Postgres 오류 → 사용자용 문구 (내부 정보는 노출하지 않는다) */
export function dbErrorMessage(error: { code?: string; message?: string } | null): string {
  if (!error) return "저장하지 못했습니다.";
  if (error.code === "23505") return "이미 같은 값이 있습니다. (중복)";
  if (error.code === "23514") return "입력값이 허용 범위를 벗어났습니다.";
  if (error.code === "42501") return "권한이 없습니다. 관리자 계정으로 다시 로그인해 주세요.";
  return "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}
