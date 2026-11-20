"use client";

import { useId, useRef, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import styles from "./ContentTabs.module.css";

export type ContentTab = { id: string; label: string; panel: ReactNode };

// 주소 끝 #id 가 고른 탭 — 탭을 누르면 주소만 바꾸고(기록·스크롤 없이) 같은 신호로 다시 읽는다.
// Next 의 링크 이동(같은 페이지 메뉴를 눌러 #이 사라질 때 등)은 hashchange 가 안 나므로
// 지원하는 브라우저에서는 Navigation API 의 currententrychange 로도 다시 읽는다.
type NavigationLike = EventTarget;
function subscribe(onChange: () => void) {
  const nav = (window as Window & { navigation?: NavigationLike }).navigation;
  // Next 는 주소를 useInsertionEffect 안에서 바꾸고, 그 안에서는 React 업데이트를 걸 수 없어 한 박자 늦춘다
  const deferred = () => queueMicrotask(onChange);
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  nav?.addEventListener("currententrychange", deferred);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
    nav?.removeEventListener("currententrychange", deferred);
  };
}
// '%' 가 깨진 주소(#%, 잘린 #%EC%9C 등)에서 decodeURIComponent 가 던지면 페이지 전체가 오류 화면이 되므로 원문으로
const readHash = () => {
  const raw = window.location.hash.slice(1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};
const noHash = () => "";

/**
 * 한 페이지 안의 탭 (엠블럼·유니폼 등). 패널은 모두 서버에서 그려 두고 고른 것만 보인다 — 검색엔진은 전부 읽는다.
 * 주소에 #id 를 붙이면 그 탭으로 열린다 (예: /club/emblem#uniform).
 */
export function ContentTabs({ tabs, label }: { tabs: ContentTab[]; label: string }) {
  const hash = useSyncExternalStore(subscribe, readHash, noHash);
  const active = tabs.some((t) => t.id === hash) ? hash : tabs[0]?.id;
  const base = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  function select(id: string) {
    // Next.js 가 history.replaceState 를 라우터와 맞춰 준다 (공식 문서 방식 — 첫 인자 null)
    window.history.replaceState(null, "", `#${encodeURIComponent(id)}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  // 좌우 화살표·Home·End 로 탭 이동 (WAI-ARIA 탭 방식)
  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    select(tabs[next].id);
    buttons.current[next]?.focus();
  }

  return (
    <div data-content-tabs="">
      {/* 자바스크립트가 없으면 탭을 못 누르므로 패널을 모두 펼쳐 보인다 */}
      <noscript>
        <style>{"[data-content-tabs] [role=tabpanel][hidden]{display:block}[data-content-tabs] [role=tablist]{display:none}"}</style>
      </noscript>
      <div className={styles.tabs} role="tablist" aria-label={label}>
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${t.id}`}
            aria-controls={`${base}-panel-${t.id}`}
            aria-selected={t.id === active}
            tabIndex={t.id === active ? 0 : -1}
            className={styles.tab}
            onClick={() => select(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${base}-panel-${t.id}`}
          aria-labelledby={`${base}-tab-${t.id}`}
          hidden={t.id !== active}
          tabIndex={0}
          className={styles.panel}
        >
          {t.panel}
        </div>
      ))}
    </div>
  );
}
