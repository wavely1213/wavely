"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { activePoster, hideKey, kstDay, msUntilPosterChange, shouldShowPoster, type ActivePoster, type PosterWindow } from "@/lib/matchday";
import styles from "./MatchdayPopup.module.css";

const KIND_LABEL = { matchday: "MATCH DAY", fulltime: "FULL TIME" } as const;
/** 포스터를 받기 전 기본 비율 (1R MATCH DAY 3:4). 받으면 그림의 원래 비율로 바뀐다 */
const DEFAULT_RATIO = 3 / 4;

/** 읽기 프로그램용 설명 — 'MATCH DAY 포스터, 11월 21일 (토) 14:00 용인지솔FS 원정' */
function altOf(a: ActivePoster): string {
  const d = new Date(Date.parse(a.window.kickoff) + 9 * 3600_000);
  const day = "일월화수목금토"[d.getUTCDay()];
  const time = d.toISOString().slice(11, 16);
  return `${KIND_LABEL[a.kind]} 포스터, ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${day}) ${time} ${a.window.opponent} ${a.window.isHome ? "홈" : "원정"}`;
}

/**
 * 매치데이 포스터 팝업 (D-096) — 홈을 열면 맨 앞(<dialog> showModal)에 뜬다. 모양은 소유자 확정 P3 '포스터만 크게'(피그마 297:29767 등),
 * 운영 임시판(85e57d4, c97fbd3)과 같다: X 없이 아래 줄 [오늘 하루 보지 않기 | 닫기], 휴대폰 가운데 / 721 이상 오른쪽 아래 폭 360.
 * 포스터를 누르면 그 경기 인스타 게시물(새 창, 주소가 있을 때). 열 때 초점은 대화 상자 자체(버튼 테두리가 저절로 보이지 않게).
 * MATCH DAY / FULL TIME 둘 다 같은 틀에 이미지 한 장, 비율은 그림의 원래 비율. 시각은 브라우저에서 잰다(캐시 때문).
 * 경계(0시, 킥오프 + 4시간, 다음 날 0시)에 다시 재서 MATCH DAY → FULL TIME 으로 바뀐다. '오늘 하루 보지 않기'는 종류별.
 * 저장소(localStorage)가 막혀 있어도 동작한다(그때는 '오늘 하루 보지 않기'가 이번 열람에만 적용).
 */
export function MatchdayPopup({ windows }: { windows: PosterWindow[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [shown, setShown] = useState<ActivePoster | null>(null);
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  // 이번 열람에서 이미 띄운 포스터 — 같은 것을 다시 띄우지 않는다
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (windows.length === 0) return;
    let timer: number | undefined;
    const tick = () => {
      const now = Date.now();
      const a = activePoster(windows, now);
      const key = a ? hideKey(a.window.matchId, a.kind) : null;
      if (a && key && !seen.current.has(key)) {
        let hidden: string | null = null;
        try {
          hidden = window.localStorage.getItem(key);
        } catch {
          /* 저장소를 못 쓰면 그냥 띄운다 */
        }
        if (shouldShowPoster(hidden, now)) {
          seen.current.add(key);
          setShown(a);
        }
      } else if (!a) {
        // 창이 끝나면(다음 날 0시, 경기 끝) 열려 있던 팝업도 닫는다
        ref.current?.close();
      }
      const ms = msUntilPosterChange(windows, now);
      if (ms !== null) timer = window.setTimeout(tick, Math.min(ms + 500, 60_000));
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [windows]);

  // 띄울 포스터가 정해진 뒤에만 이미지를 받고 연다
  useEffect(() => {
    const d = ref.current;
    if (!shown || !d) return;
    if (!d.open) d.showModal();
    // 처음 초점은 대화 상자 자체로 — 첫 버튼(포스터 링크)에 초점 테두리가 저절로 보이지 않게(소유자 지적). Tab 으로 버튼에 간다.
    d.focus();
  }, [shown]);

  const close = () => ref.current?.close();
  const hideToday = () => {
    if (shown) {
      try {
        window.localStorage.setItem(hideKey(shown.window.matchId, shown.kind), kstDay(Date.now()));
      } catch {
        /* 저장 못 해도 닫기는 한다 */
      }
    }
    close();
  };

  const link = shown ? (shown.kind === "fulltime" ? shown.window.fulltimePost : shown.window.matchdayPost) : null;
  const poster = shown && (
    // eslint-disable-next-line @next/next/no-img-element -- 이미지 최적화 끔(원본 그대로, D-073)
    <img
      key={shown.image}
      src={shown.image}
      className={styles.poster}
      alt={altOf(shown)}
      onLoad={(e) => {
        const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
        if (w > 0 && h > 0) setRatio(w / h);
      }}
    />
  );

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      // 폭 계산에 쓰는 포스터 비율 (CSS --poster-ratio)
      style={{ "--poster-ratio": String(ratio) } as CSSProperties}
      aria-label={shown ? `${KIND_LABEL[shown.kind]} 포스터` : "매치데이 포스터"}
      tabIndex={-1}
      // 바깥(덮개)을 누르면 닫기 — 대화 상자 자체가 눌렸을 때만(안쪽 내용 클릭은 제외)
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      // 초점 가두기 — showModal 은 바깥을 막지만 Tab 이 브라우저 주소창 쪽으로 한 번 빠진다. 안쪽 링크/버튼 사이에서만 돈다
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const items = [...e.currentTarget.querySelectorAll<HTMLElement>("a[href], button")];
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === e.currentTarget)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }}
    >
      {shown && (
        <div>
          {link ? (
            // 포스터를 누르면 그 경기 인스타그램 게시물(새 창, 소유자 지시) — 이름은 포스터 설명 + 숨긴 안내
            <a href={link} target="_blank" rel="noopener noreferrer" className={styles.posterLink}>
              {poster}
              <span className="sr-only">, 구단 인스타그램 게시물 보기 (새 창)</span>
            </a>
          ) : (
            poster
          )}
          <div className={styles.bar}>
            <button type="button" className={styles.textButton} onClick={hideToday}>
              오늘 하루 보지 않기
            </button>
            <button type="button" className={styles.textButton} onClick={close}>
              닫기
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
