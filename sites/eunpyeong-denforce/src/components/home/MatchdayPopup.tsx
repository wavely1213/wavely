"use client";

import { useEffect, useRef } from "react";
import type { MatchdayPopupConfig } from "@/config/matchday";
import styles from "./MatchdayPopup.module.css";

/** 오늘 날짜(서울) — '오늘 하루 보지 않기' 저장값 */
function seoulToday(now: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(now));
}

const keyOf = (id: string) => `matchday-popup-hide:${id}`;

/**
 * 매치데이 포스터 팝업 — 홈을 열면 맨 앞(브라우저 top layer, <dialog> showModal)에 뜬다.
 * 우측 위 X(닫기), 아래 '오늘 하루 보지 않기'. Esc 로도 닫힌다. 시간 판정은 브라우저에서(페이지 캐시 때문, D-092 와 같음).
 * 저장값(localStorage)은 막혀 있어도 팝업은 동작한다(그때는 '오늘 하루 보지 않기'가 이번 열람에만 적용).
 */
export function MatchdayPopup({ config }: { config: MatchdayPopupConfig }) {
  const ref = useRef<HTMLDialogElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const now = Date.now();
    if (now < Date.parse(config.from) || now >= Date.parse(config.until)) return;
    try {
      if (window.localStorage.getItem(keyOf(config.id)) === seoulToday(now)) return;
    } catch {
      /* 저장소를 못 쓰면 그냥 띄운다 */
    }
    const d = ref.current;
    // 띄울 때만 포스터를 받는다(창 밖 시간·이미 닫은 날에는 내려받지 않음)
    if (imgRef.current && !imgRef.current.getAttribute("src")) imgRef.current.src = config.image;
    if (d && !d.open) d.showModal();
  }, [config.id, config.from, config.until, config.image]);

  const close = () => ref.current?.close();
  const hideToday = () => {
    try {
      window.localStorage.setItem(keyOf(config.id), seoulToday(Date.now()));
    } catch {
      /* 저장 못 해도 닫기는 한다 */
    }
    close();
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label="매치데이 포스터"
      // 바깥(덮개)을 누르면 닫기 — 대화 상자 자체가 눌렸을 때만(안쪽 내용 클릭은 제외)
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className={styles.panel}>
        <button type="button" className={styles.close} onClick={close} aria-label="닫기">
          <span aria-hidden="true">×</span>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element -- 이미지 최적화 끔(원본 그대로, D-073) */}
        <img ref={imgRef} className={styles.poster} alt={config.alt} width={1199} height={1600} />
        <div className={styles.bar}>
          <button type="button" className={styles.today} onClick={hideToday}>
            오늘 하루 보지 않기
          </button>
        </div>
      </div>
    </dialog>
  );
}
