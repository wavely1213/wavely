// 네이버 지도 주소 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { naverDirectionsUrl, naverPlaceUrl, toWebMercator } from "../src/lib/naver-map.ts";

const venue = { name: "은평다목적체육관", placeId: "35069965", lat: 37.6312223, lng: 126.9250849 };

test("toWebMercator: 은평다목적체육관 좌표 (네이버 지도 길찾기에서 확인한 값)", () => {
  const { x, y } = toWebMercator(venue.lat, venue.lng);
  assert.ok(Math.abs(x - 14129235.818) < 0.01);
  assert.ok(Math.abs(y - 4527460.083) < 0.01);
  const origin = toWebMercator(0, 0);
  assert.ok(Math.abs(origin.x) < 1e-6 && Math.abs(origin.y) < 1e-6);
});

test("naverPlaceUrl / naverDirectionsUrl: 장소 번호·도착지 이름이 들어간다", () => {
  assert.equal(naverPlaceUrl(venue), "https://map.naver.com/p/entry/place/35069965");
  const url = naverDirectionsUrl(venue);
  assert.match(url, /^https:\/\/map\.naver\.com\/p\/directions\/-\/14129235\.\d{7},4527460\.\d{7},/);
  assert.ok(url.includes(encodeURIComponent("은평다목적체육관") + ",35069965,PLACE_POI/-/transit"));
});
