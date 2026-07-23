// 게시판·플레이스 목록 위에 얕고 길게 깔리는 스트립 배너 광고.
// 사진은 정사각 썸네일로 깔끔하게, 옆에 문구·매장명·CTA. 여러 개면 자동 회전 + 노출·클릭 집계.
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { prettyCat } from '@/constants/app';
import { Colors, UI } from '@/constants/theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type Banner = { id: string; banner_image: string; headline: string | null; store_id: string; stores: { name: string | null; category: string | null } | null };

// #RRGGBB → rgba(r,g,b,a) — 페이드 그라데이션용
function hexA(hex: string, a: number) {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${a})`;
}

export function StripBanner({ scheme, mainCat }: { scheme: 'light' | 'dark'; mainCat?: string | null }) {
  const c = Colors[scheme];
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);
  const logged = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    // 공개 RPC active_ads_public(웹과 동일 소스): 활성광고 중 배너만 필터. 입찰가·결제정보 비노출, 일정창(starts/ends) 서버 반영.
    // (구 active_banners는 미버전화라 폐기. 타게팅 뷰어필터는 viewer 컨텍스트 prop이 필요해 후속.)
    supabase.rpc('active_ads_public').then(({ data }) => {
      if (!alive) return;
      const rows = ((data as any[]) ?? []).filter((b) => b.format === 'banner' && b.banner_image);
      setBanners(rows.map((b) => ({ id: b.id, banner_image: b.banner_image, headline: b.headline, store_id: b.store_id, stores: { name: b.stores?.name ?? null, category: b.stores?.category ?? null } })));
    });
    return () => { alive = false; };
  }, []);

  // 여러 배너 자동 회전
  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 4500);
    return () => clearInterval(t);
  }, [banners.length]);

  // 현재 보이는 배너 노출 1회 집계
  useEffect(() => {
    const b = banners[idx];
    if (b && !logged.current.has(b.id)) {
      logged.current.add(b.id);
      supabase.rpc('log_ad_event', { p_ad_id: b.id, p_type: 'impression' });
    }
  }, [banners, idx]);

  if (banners.length === 0) return null;
  const b = banners[idx % banners.length];
  const name = b.stores?.name ?? '';
  const cat = b.stores?.category ? prettyCat(b.stores.category) : '';

  return (
    <Pressable
      onPress={() => {
        supabase.rpc('log_ad_event', { p_ad_id: b.id, p_type: 'click' });
        router.push(`/store/${b.store_id}`);
      }}
      style={[s.strip, { borderColor: hexA(c.primary, 0.55), backgroundColor: c.primarySoft, height: UI.bannerHeight, borderRadius: UI.radius }]}
    >
      <View style={s.imgWrap}>
        <Image source={{ uri: b.banner_image }} style={s.img} contentFit="cover" transition={150} />
        {/* 오른쪽 가장자리를 패널 색으로 부드럽게 녹여 하드 테두리 제거 */}
        <View pointerEvents="none" style={[s.fade, Platform.OS === 'web' ? ({ backgroundImage: `linear-gradient(90deg, ${hexA(c.primarySoft, 0)} 0%, ${hexA(c.primarySoft, 0)} 50%, ${c.primarySoft} 100%)` } as any) : { backgroundColor: 'transparent' }]} />
        <View style={[s.tag, { backgroundColor: hexA('#000000', 0.5) }]}><Text style={s.tagTxt}>광고</Text></View>
      </View>
      <View style={s.body}>
        <Text style={[s.headline, { color: c.text }]} numberOfLines={1}>{b.headline || name}</Text>
        <Text style={[s.sub, { color: c.textSecondary }]} numberOfLines={1}>{b.headline ? name : cat}{b.headline && cat ? ` · ${cat}` : ''}</Text>
      </View>
      <View style={s.right}>
        <View style={[s.cta, { backgroundColor: c.primary }]}><Text style={s.ctaTxt}>보기</Text></View>
        {banners.length > 1 && (
          <View style={s.dots}>
            {banners.map((_, i) => (
              <View key={i} style={[s.dot, { backgroundColor: c.primary, opacity: i === idx ? 1 : 0.28 }]} />
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', height: 88, marginHorizontal: 12, marginTop: 12, marginBottom: 12, borderRadius: 14, borderWidth: 1.5, overflow: 'hidden', boxShadow: '0 2px 8px rgba(122,43,196,0.18)' },
  imgWrap: { width: 124, height: '100%', position: 'relative' },
  img: { width: '100%', height: '100%' },
  fade: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  tag: { position: 'absolute', top: 7, left: 7, paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4 },
  tagTxt: { fontSize: 9.5, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  body: { flex: 1, minWidth: 0, paddingRight: 8, paddingVertical: 8, justifyContent: 'center', gap: 3 },
  headline: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 12, fontWeight: '600' },
  right: { alignItems: 'center', justifyContent: 'center', gap: 7, paddingRight: 12, paddingLeft: 2 },
  cta: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  ctaTxt: { fontSize: 12.5, fontWeight: '800', color: '#fff' },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
