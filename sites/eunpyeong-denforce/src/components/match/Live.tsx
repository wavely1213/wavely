"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { isLive, msUntilChange, type LiveWindow } from "@/lib/live";
import styles from "./Live.module.css";

/**
 * 경기 당일 LIVE (D-092) — 화면은 미리 만들어 캐시하므로 '지금'은 브라우저에서 잰다.
 * 처음 그릴 때는 LIVE 가 아닌 모양(서버와 같음)이고, 붙은 뒤 시간을 재서 바꾼다. 창 시작/끝 때 다시 잰다(최대 1분 간격).
 * 결과 입력(종료)은 데이터 캐시(최대 몇 분) 뒤 반영 — 그 사이 LIVE 가 조금 더 보일 수 있다.
 */
export function useLive(w: LiveWindow | null): boolean {
  const [live, setLive] = useState(false);
  const start = w?.start;
  const end = w?.end;
  useEffect(() => {
    if (start === undefined || end === undefined) return;
    const win = { start, end, href: "" };
    let timer: number | undefined;
    const tick = () => {
      const now = Date.now();
      setLive(isLive(win, now));
      const ms = msUntilChange(win, now);
      if (ms !== null) timer = window.setTimeout(tick, Math.min(ms + 500, 60_000));
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [start, end]);
  return live;
}

/** LIVE 배지 — LIVE 시간에만 */
export function LiveBadge({ window: w }: { window: LiveWindow | null }) {
  const live = useLive(w);
  if (!live) return null;
  return (
    <span className={styles.badge}>
      <span className={styles.dot} aria-hidden="true" />
      LIVE
    </span>
  );
}

/** '생중계 보기 ↗' 버튼 — LIVE 시간에만, 새 창. 모양은 놓인 곳의 영상 버튼(className) */
export function LiveButton({
  window: w,
  className,
  wrapClassName,
  game,
}: {
  window: LiveWindow | null;
  className?: string;
  wrapClassName?: string;
  /** 읽기 프로그램용 경기 이름 — '2026-11-21 (토) 용인지솔FS vs 서울은평 덴포스' */
  game?: string;
}) {
  const live = useLive(w);
  if (!live || !w) return null;
  const a = (
    <a href={w.href} target="_blank" rel="noopener noreferrer" className={className} aria-label={`생중계 보기${game ? ` - ${game}` : ""} (새 창)`}>
      생중계 보기 <span aria-hidden="true">↗</span>
    </a>
  );
  return wrapClassName ? <div className={wrapClassName}>{a}</div> : a;
}

/** LIVE 가 아닐 때의 내용 — LIVE 시간에는 liveClassName 으로 감싸(예: 휴대폰에서만 보이게) 그린다 */
export function NotLive({ window: w, liveClassName, children }: { window: LiveWindow | null; liveClassName: string; children: ReactNode }) {
  const live = useLive(w);
  return live ? <span className={liveClassName}>{children}</span> : <>{children}</>;
}

/**
 * 휴대폰 다음 홈경기 띠의 링크 (D-092 L4 (가)) — 평소 경기일정(/match/schedule), LIVE 시간에는 생중계(새 창).
 * data-live 로 → / ↗, 숨김 글자(', 경기일정 보기' / ', 생중계 보기 (새 창)')를 CSS 가 바꾼다.
 */
export function LiveLink({
  window: w,
  href,
  className,
  style,
  children,
}: {
  window: LiveWindow | null;
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const live = useLive(w);
  if (live && w) {
    return (
      <a href={w.href} target="_blank" rel="noopener noreferrer" className={className} style={style} data-live="">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}
