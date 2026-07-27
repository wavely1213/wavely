# 와벨리 — 네이버 지도 API 연동 스펙 (우리동네 매장)

> **무엇:** 소비자 웹·앱 "우리동네" 화면의 지도. 동봉 프로토타입은 **벡터 플레이스홀더 + 우리 쪽 지도 UI**(마커·클러스터·미리보기·목록 연동)를 1:1로 보여줍니다. 실제 배경 타일은 **네이버 지도 JS API**가 채웁니다 — 프로토타입의 마커/카드/상호작용을 네이버 지도 위에 그대로 얹으면 됩니다.
> **대상 화면:** 웹 `Neighborhood`(목록+지도 2-pane) · 앱 `AppMap`(풀스크린+바텀시트). 둘 다 같은 데이터·상호작용.

---

## 0. SDK 로드
```html
<!-- 웹: ncpKeyId (구 ncpClientId). geocoder 서브모듈 포함 -->
<script src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=YOUR_KEY&submodules=geocoder"></script>
```
- 앱(Expo RN): WebView로 위 지도를 띄우거나 `react-native-nmap`/공식 RN 모듈 사용. 마커 스타일·바텀시트는 RN으로 재구현(아래 스펙 동일).
- 키는 네이버 클라우드 플랫폼 콘솔에서 발급, 도메인/번들ID 등록.

## 1. 지도 초기화
```js
const map = new naver.maps.Map('map', {
  center: new naver.maps.LatLng(myLat, myLng), // 사용자 동(효자동) 중심
  zoom: 15,
  mapTypeControl: false, zoomControl: false, // 컨트롤은 우리 UI로 커스텀(아래)
  scaleControl: false, logoControl: true, mapDataControl: false,
});
```
- **일반/위성 토글** → `map.setMapTypeId(naver.maps.MapTypeId.NORMAL | .SATELLITE)`.
- **줌 ±**, **내 위치** 버튼은 우리 디자인(우하단 스택)으로: `map.setZoom(z±1)`, `map.panTo(myLatLng)`.

## 2. 데이터 매핑 (이미 존재 — 새 필드 최소화)
| 프로토타입 store 필드 | 소스 | 지도 용도 |
|---|---|---|
| `lat,lng` (신규) | `stores`에 컬럼 추가 또는 주소 **geocode** | 마커 좌표 |
| `main`(업종 대분류) | 기존 | 마커 색 (아래 팔레트) |
| `is_ad`/`ad_weight` | 기존 `stores` | **광고 강조 마커** + `광고` 플래그 + 노출 우선 |
| `biz_verified` | 기존 `stores` | 마커 **✓ 인증 배지** |
| `rating, review_count, categories, 대표이미지` | 기존 | 미리보기 카드 |
- 좌표 없으면 주소를 `naver.maps.Service.geocode`로 1회 변환 후 캐시.

## 3. 마커 (★ 사진 썸네일 원형 — 우리 시그니처)
- **HtmlMarker / CustomOverlay**로 구현 (기본 핀 대신). 프로토타입 `.web-mk` / `.wb-mmk` 마크업·CSS 그대로 이식.
- 구성: 원형 40px(흰 테두리 3px + 그림자) 안에 **매장 대표사진**(없으면 업종색 + 업종 글리프), 하단 포인터 꼬리, 우하단 **✓ 인증**(녹색), 상단 **광고** 플래그.
- **업종색 팔레트**(`MCOLOR`): 음식점 `#FF6B4A` · 카페 `#C9893F` · 미용 `#FF6FB5` · 의료 `#00BFA6` · 생활 `#8A94A6` · 쇼핑 `#4D96FF`.
- **광고 마커**: 48px + 스카이 테두리(`#0EA5E9`) + soft 글로우 + `광고` 칩. (다크모드는 스카이 한 톤 밝게 `#38BDF8`.)
- 선택/호버 시 1.15x 확대 + z-index 상승.

## 4. 클러스터링
- `naver.maps.MarkerClustering`(공식 예제 라이브러리) 사용 또는 동봉 프로토타입의 그리디 군집 로직.
- 클러스터 마커 = 스카이 원형 + 개수 + "매장". 탭 → `map.setZoom(+1)` & 군집 중심으로 `panTo`.

## 5. 미리보기 카드 (마커 탭)
- 마커 탭 → 카드 표시. 웹=마커 위 말풍선(`.web-mappreview`), 앱=하단 시트 위 카드(`.wb-mappv`).
- 내용: 대표사진 · 상호 · `✓인증`/`광고` 배지 · 별점·리뷰·업종·거리 · 한 줄 소식(note) · **[길찾기]**(네이버 `map.naver.com/v5/directions` 딥링크 또는 길찾기 API) · **[상세보기]**(매장 상세).

## 6. 목록 ↔ 지도 연동
- 같은 `filtered` 배열을 **목록과 마커가 공유**. 카테고리/인증/반경 필터 = 한 상태.
- 목록 행 hover/선택 → 해당 마커 `is-active`(확대) + `panTo`. 마커 탭 → 목록 행 하이라이트(앱은 바텀시트에서 해당 행로 스크롤).
- **반경**: 내 위치 기준 `naver.maps.Circle`(반경 1/3/5km, 파랑 20% 채움) + 필터에 `distance <= r`.
- **내 위치**: `navigator.geolocation` → 파란 점 + 펄스. 권한 거부 시 사용자 동 중심 폴백.

## 7. 노출 정렬 (광고/지수 연동)
- 목록·마커 우선순위 = `ad_weight DESC, exposureScore DESC`(explore.tsx 기존 공식). 광고 매장은 마커도 강조 + 상단 고정.
- **N지수/W지수**(관리자)와 동일 소스 — 지도는 읽기 표현 계층.

## 8. 다크모드
- 네이버 지도 `styleMapId`(커스텀 스타일, NCP 콘솔) 또는 야간 타일로 전환. 마커/카드/컨트롤은 `data-theme="dark"` 토큰이 자동 적용(프로토타입과 동일, OLED 완전검정).

> 시각·상호작용 단일 근거: 동봉 `와벨리 웹.html`(web/wavely-web-screens.jsx `StoreMap`) · `와벨리 프로토타입.html`(app/wabely-map.jsx `AppMap`).
