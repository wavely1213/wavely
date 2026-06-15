import { NaverMapMarkerOverlay, NaverMapView } from '@mj-studio/react-native-naver-map';
import { useMemo } from 'react';

export type DongMapItem = {
  id: string;
  storeId: string | null;
  name: string;
  color: string;
  lat: number | null;
  lng: number | null;
  verified: boolean;
};

type Props = {
  items: DongMapItem[];
  center: { lat: number; lng: number };
  onPressItem: (item: DongMapItem) => void;
};

// 네이티브(iOS/Android) 전용 네이버 지도. 웹에서는 NativeDongMap.web.tsx(스텁)가 사용됨.
export default function NativeDongMap({ items, center, onPressItem }: Props) {
  const valid = useMemo(() => items.filter((i) => i.lat != null && i.lng != null), [items]);
  return (
    <NaverMapView
      style={{ flex: 1 }}
      initialCamera={{ latitude: center.lat, longitude: center.lng, zoom: 12 }}
      isShowLocationButton
      isShowZoomControls
      isShowScaleBar
    >
      {valid.map((i) => (
        <NaverMapMarkerOverlay
          key={i.id}
          latitude={i.lat as number}
          longitude={i.lng as number}
          onTap={() => onPressItem(i)}
          tintColor={i.color}
          width={26}
          height={34}
          caption={{ text: i.name, textSize: 11, color: '#222', haloColor: '#fff' }}
        />
      ))}
    </NaverMapView>
  );
}
