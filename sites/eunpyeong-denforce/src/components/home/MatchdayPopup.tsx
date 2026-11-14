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
 * 모양은 시안 P3 '포스터만 크게'(피그마 295:31549), 위치는 휴대폰 가운데 / PC 오른쪽 아래(P2 자리).
 * X 없이 아래 줄 [오늘 하루 보지 않기 | 닫기] (소유자 지시 2026-11-15). Esc, 바깥 누르기로도 닫힌다.
 * 포스터를 누르면 구단 인스타그램 게시물로(새 창, config.link 있을 때).
 * 시간 판정은 브라우저에서(페이지 캐시 때문, D-092 와 같음).
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
    if (d && !d.open) {
      d.showModal();
      // 처음 초점은 대화 상자 자체로 — 첫 버튼(포스터 링크)에 초점 테두리가 저절로 보이지 않게(소유자 지적). Tab 으로 버튼에 간다.
      d.focus();
    }
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

  // eslint-disable-next-line @next/next/no-img-element -- 이미지 최적화 끔(원본 그대로, D-073)
  const poster = <img ref={imgRef} className={styles.poster} alt={config.alt} width={1199} height={1600} />;

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label="매치데이 포스터"
      tabIndex={-1}
      // 바깥(덮개)을 누르면 닫기 — 대화 상자 자체가 눌렸을 때만(안쪽 내용 클릭은 제외)
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div>
        {config.link ? (
          // 포스터를 누르면 구단 인스타그램 게시물(새 창, 소유자 지시) — 이름은 포스터 설명 + 숨긴 안내
          <a href={config.link} target="_blank" rel="noopener noreferrer" className={styles.posterLink}>
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
    </dialog>
  );
}
