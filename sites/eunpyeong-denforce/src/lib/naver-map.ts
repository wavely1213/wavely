// 네이버 지도 주소 만들기 (순수 함수, 테스트: naver-map.test.ts, D-026)

/** 위경도 → 웹 메르카토르(EPSG:3857) 미터 좌표 — 네이버 지도 길찾기 주소가 이 좌표를 쓴다 */
export function toWebMercator(lat: number, lng: number): { x: number; y: number } {
  const R = 20037508.34;
  const x = (lng * R) / 180;
  const y = ((Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180)) * R) / 180;
  return { x, y };
}

export type MapPlace = { name: string; placeId: string; lat: number; lng: number };

/** 네이버 지도 장소 페이지 */
export function naverPlaceUrl(p: MapPlace): string {
  return `https://map.naver.com/p/entry/place/${p.placeId}`;
}

/** 네이버 지도 길찾기 — 도착지만 채워 연다 (출발지는 방문자가 입력, 기본 대중교통) */
export function naverDirectionsUrl(p: MapPlace): string {
  const { x, y } = toWebMercator(p.lat, p.lng);
  const goal = `${x.toFixed(7)},${y.toFixed(7)},${encodeURIComponent(p.name)},${p.placeId},PLACE_POI`;
  return `https://map.naver.com/p/directions/-/${goal}/-/transit`;
}
