import { NAVER_MAP_KEY_ID, VENUE_PLACE } from "@/config/map";
import { naverDirectionsUrl, naverPlaceUrl } from "@/lib/naver-map";
import { NaverMap } from "./NaverMap";
import styles from "./VenueMap.module.css";

/** 오시는 길 지도 자리 — 지도 키가 있으면 네이버 지도, 없으면 장소 안내. 아래에 '네이버 지도에서 보기·길찾기' (D-026) */
export function VenueMap({ address }: { address: string | null }) {
  const place = VENUE_PLACE;
  const fallback = (
    <div className={`${styles.map} ${styles.fallback}`}>
      <strong className={styles.place}>{place.name}</strong>
      {address && <span className={styles.address}>{address}</span>}
      <span className={styles.hint}>아래 버튼을 누르면 네이버 지도에서 위치와 길찾기를 볼 수 있습니다.</span>
    </div>
  );
  return (
    <div>
      {NAVER_MAP_KEY_ID ? <NaverMap keyId={NAVER_MAP_KEY_ID} place={place} fallback={fallback} /> : fallback}
      <div className={styles.actions}>
        <a href={naverPlaceUrl(place)} target="_blank" rel="noopener noreferrer" className={styles.primary}>
          네이버 지도에서 보기<span className="sr-only"> (새 창)</span>
        </a>
        <a href={naverDirectionsUrl(place)} target="_blank" rel="noopener noreferrer" className={styles.secondary}>
          길찾기<span className="sr-only"> (새 창)</span>
        </a>
      </div>
    </div>
  );
}
