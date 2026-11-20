"use client";

import Script from "next/script";
import { useCallback, useRef, useState, type ReactNode } from "react";
import type { MapPlace } from "@/lib/naver-map";
import styles from "./VenueMap.module.css";

// 네이버 지도 JavaScript API v3 — 필요한 부분만 타입으로 적는다
type NaverMaps = {
  maps: {
    Map: new (el: HTMLElement, opts: { center: unknown; zoom: number; zoomControl?: boolean }) => unknown;
    LatLng: new (lat: number, lng: number) => unknown;
    Marker: new (opts: { position: unknown; map: unknown; title?: string }) => unknown;
  };
};

declare global {
  interface Window {
    naver?: NaverMaps;
    /** 키가 틀리거나 등록되지 않은 주소일 때 네이버 지도 스크립트가 부른다 */
    navermap_authFailure?: () => void;
  }
}

/** 움직이는 네이버 지도 + 위치 표시. 불러오지 못하면(키·주소 등록 문제) fallback 을 보여준다 (D-026) */
export function NaverMap({ keyId, place, fallback }: { keyId: string; place: MapPlace; fallback: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  const draw = useCallback(() => {
    const naver = window.naver;
    if (!naver || !box.current) return;
    const center = new naver.maps.LatLng(place.lat, place.lng);
    const map = new naver.maps.Map(box.current, { center, zoom: 16, zoomControl: true });
    new naver.maps.Marker({ position: center, map, title: place.name });
  }, [place]);

  if (failed) return <>{fallback}</>;

  return (
    <>
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(keyId)}`}
        strategy="afterInteractive"
        onReady={() => {
          window.navermap_authFailure = () => setFailed(true);
          draw();
        }}
        onError={() => setFailed(true)}
      />
      <div ref={box} className={styles.map} role="region" aria-label={`${place.name} 위치 지도`} />
    </>
  );
}
