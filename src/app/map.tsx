import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// 웹에서 Leaflet(지도 라이브러리)을 한 번만 로드
function loadLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = globalThis as any;
    if (w.L) return resolve(w.L);
    const d = w.document;
    if (!d) return reject(new Error('웹 전용'));
    if (!d.getElementById('leaflet-css')) {
      const link = d.createElement('link');
      link.id = 'leaflet-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      d.head.appendChild(link);
    }
    const ex = d.getElementById('leaflet-js');
    if (ex) { ex.addEventListener('load', () => resolve(w.L)); return; }
    const s = d.createElement('script');
    s.id = 'leaflet-js'; s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => resolve(w.L); s.onerror = () => reject(new Error('지도 로드 실패'));
    d.head.appendChild(s);
  });
}

export default function MapScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const ctx = useRef<any>(null);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    (async () => {
      const L = await loadLeaflet();
      if (cancelled) return;
      const el = (globalThis as any).document.getElementById('wavely-map');
      if (!el || el._leaflet_id) return;
      const map = L.map(el, { zoomControl: true }).setView([37.8813, 127.7298], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      const layer = L.layerGroup().addTo(map);
      const loadMarkers = async () => {
        const b = map.getBounds();
        const { data } = await supabase
          .from('places').select('name,category,lat,lng')
          .gte('lat', b.getSouth()).lte('lat', b.getNorth())
          .gte('lng', b.getWest()).lte('lng', b.getEast())
          .not('lat', 'is', null).limit(300);
        layer.clearLayers();
        (data ?? []).forEach((p: any) => {
          if (p.lat && p.lng) {
            L.marker([p.lat, p.lng]).addTo(layer)
              .bindPopup(`<b>${p.name}</b><br><span style="color:#888">${p.category ?? ''}</span>`);
          }
        });
        setNotice(`이 지역 ${(data ?? []).length}곳 표시${(data ?? []).length >= 300 ? ' (확대하면 더 정확)' : ''}`);
      };
      map.on('moveend', loadMarkers);
      loadMarkers();
      ctx.current = { L, map, layer };
    })();
    return () => { cancelled = true; if (ctx.current?.map) ctx.current.map.remove(); };
  }, []);

  const search = async () => {
    if (!query.trim() || !ctx.current) return;
    const { data } = await supabase.from('places').select('name,category,lat,lng').ilike('name', `%${query.trim()}%`).not('lat', 'is', null).limit(1);
    const p = (data ?? [])[0] as any;
    if (!p) { setNotice('검색 결과가 없어요'); return; }
    const { L, map, layer } = ctx.current;
    map.setView([p.lat, p.lng], 17);
    L.marker([p.lat, p.lng]).addTo(layer).bindPopup(`<b>${p.name}</b><br>${p.category ?? ''}`).openPopup();
  };

  // 네이티브(앱)는 추후 네이티브 지도 — 지금은 웹 전용
  if (Platform.OS !== 'web') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
        <Pressable style={styles.close} onPress={() => router.back()}><Text style={[styles.closeTxt, { color: c.textSecondary }]}>✕</Text></Pressable>
        <View style={styles.center}><Text style={{ color: c.text, fontWeight: '700' }}>지도는 현재 웹에서 지원해요{'\n'}(앱 버전은 준비 중)</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      {/* 지도 영역 */}
      <View nativeID="wavely-map" style={StyleSheet.absoluteFill as any} />

      {/* 상단 검색바 (네이버 지도풍) */}
      <SafeAreaView edges={['top']} style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.searchBar, { backgroundColor: c.card }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹</Text></Pressable>
          <TextInput
            style={[styles.input, { color: c.text }]}
            placeholder="장소·가게 검색 (춘천)"
            placeholderTextColor={c.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            returnKeyType="search"
          />
          <Pressable onPress={search} hitSlop={8}><Text style={[styles.searchBtn, { color: c.primary }]}>검색</Text></Pressable>
        </View>
        {notice ? (
          <View style={[styles.notice, { backgroundColor: c.card }]}><Text style={[styles.noticeTxt, { color: c.textSecondary }]}>{notice}</Text></View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  close: { padding: 16 },
  closeTxt: { fontSize: 20, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, boxShadow: '0 2px 10px rgba(0,0,0,0.15)' },
  back: { fontSize: 24, fontWeight: '800', width: 18 },
  input: { flex: 1, fontSize: 15 },
  searchBtn: { fontSize: 15, fontWeight: '800' },
  notice: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginTop: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' },
  noticeTxt: { fontSize: 12, fontWeight: '600' },
});
