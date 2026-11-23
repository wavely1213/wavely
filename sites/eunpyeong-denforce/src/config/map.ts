// 네이버 지도 설정 — 홈구장 위치(네이버 장소 번호·좌표, 2026-10-16 네이버 검색 기준)와 지도 키 (D-026)
import type { MapPlace } from "@/lib/naver-map";

export const VENUE_PLACE: MapPlace = {
  name: "은평다목적체육관",
  placeId: "35069965",
  lat: 37.6312223,
  lng: 126.9250849,
};

/**
 * 네이버 클라우드 플랫폼 Maps 'Client ID' — 공개용 값(등록한 사이트 주소에서만 동작)이라 NEXT_PUBLIC 으로 둔다.
 * 없으면 오시는 길에 지도 대신 '네이버 지도에서 보기·길찾기' 안내만 보인다.
 */
export const NAVER_MAP_KEY_ID = process.env.NEXT_PUBLIC_NAVER_MAP_KEY_ID || null;
