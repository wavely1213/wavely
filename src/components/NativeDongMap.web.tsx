// 웹 스텁: 웹에서는 explore.tsx가 자체 네이버 JS 지도를 그리므로 이 컴포넌트는 렌더되지 않음.
// (네이티브 전용 라이브러리를 웹 번들에 import하지 않기 위한 플랫폼 분기 파일)
export type DongMapItem = {
  id: string;
  storeId: string | null;
  name: string;
  color: string;
  lat: number | null;
  lng: number | null;
  verified: boolean;
};

export default function NativeDongMap(_props: {
  items: DongMapItem[];
  center: { lat: number; lng: number };
  onPressItem: (item: DongMapItem) => void;
}) {
  return null;
}
