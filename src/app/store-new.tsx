import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { canEditStore, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const OSM = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const NAVER_ID = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID || '';
const USE_NAVER = !!NAVER_ID;
const CC: [number, number] = [37.8813, 127.7298]; // 춘천 중심

function loadLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = globalThis as any;
    if (w.L) return resolve(w.L);
    const d = w.document;
    if (!d) return reject(new Error('웹 전용'));
    if (!d.getElementById('leaflet-css')) {
      const link = d.createElement('link');
      link.id = 'leaflet-css'; link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
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

function loadNaver(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = globalThis as any;
    const d = w.document;
    if (!d) return reject(new Error('웹 전용'));
    if (w.naver?.maps) return resolve(w.naver);
    const done = () => { let n = 0; const t = setInterval(() => { if (w.naver?.maps) { clearInterval(t); resolve(w.naver); } else if (++n > 40) { clearInterval(t); reject(new Error('네이버 지도 로드 실패')); } }, 50); };
    const ex = d.getElementById('naver-maps-js');
    if (ex) { ex.addEventListener('load', done); if ((ex as any)._loaded) done(); return; }
    const s = d.createElement('script');
    s.id = 'naver-maps-js'; s.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_ID}`;
    s.onload = () => { (s as any)._loaded = true; done(); };
    s.onerror = () => reject(new Error('네이버 지도 로드 실패'));
    d.head.appendChild(s);
  });
}

export default function StoreFormScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session, profile } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [existingStore, setExistingStore] = useState<any>(null);
  const [existingPhoto, setExistingPhoto] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ name: string; category: string; address: string; lat: number | null; lng: number | null }[]>([]);
  const [searching, setSearching] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [hours, setHours] = useState('');
  const [phone, setPhone] = useState('');
  const [naverPlaceId, setNaverPlaceId] = useState('');
  const [coord, setCoord] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const mapRef = useRef<any>(null);
  const pendingCenter = useRef<[number, number] | null>(null);

  // 위치 지정 지도
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    (async () => {
      const d = (globalThis as any).document;
      try {
        if (USE_NAVER) {
          // ── 네이버 지도 ──
          const naver = await loadNaver();
          if (cancelled) return;
          const host = d.getElementById('store-loc-map');
          if (!host || (host as any)._wvMap) return;
          let inner = host.querySelector('#store-loc-map-inner') as any;
          if (!inner) { inner = d.createElement('div'); inner.id = 'store-loc-map-inner'; inner.style.width = '100%'; inner.style.height = '100%'; host.appendChild(inner); }
          const start = pendingCenter.current ?? CC;
          const map = new naver.maps.Map(inner, { center: new naver.maps.LatLng(start[0], start[1]), zoom: pendingCenter.current ? 17 : 15, mapTypeControl: false, logoControlOptions: { position: naver.maps.Position.RIGHT_BOTTOM } });
          (host as any)._wvMap = true;
          const marker = new naver.maps.Marker({ position: new naver.maps.LatLng(start[0], start[1]), map, draggable: true });
          naver.maps.Event.addListener(marker, 'dragend', () => { const p = marker.getPosition(); setCoord({ lat: p.lat(), lng: p.lng() }); });
          naver.maps.Event.addListener(map, 'click', (e: any) => { marker.setPosition(e.coord); setCoord({ lat: e.coord.lat(), lng: e.coord.lng() }); });
          mapRef.current = {
            provider: 'naver', naver, map, marker,
            setPoint: (lat: number, lng: number, zoom = 17) => { const ll = new naver.maps.LatLng(lat, lng); marker.setPosition(ll); map.setCenter(ll); map.setZoom(zoom); },
          };
          setTimeout(() => { try { naver.maps.Event.trigger(map, 'resize'); } catch {} }, 350);
          return;
        }
        // ── OSM(Leaflet) 폴백 ──
        const L = await loadLeaflet();
        if (cancelled) return;
        const el = d.getElementById('store-loc-map');
        if (!el || el._leaflet_id) return;
        const start = pendingCenter.current ?? CC;
        const map = L.map(el).setView(start, pendingCenter.current ? 17 : 15);
        L.tileLayer(OSM, { maxZoom: 19 }).addTo(map);
        const marker = L.marker(start, { draggable: true }).addTo(map);
        const upd = (ll: any) => setCoord({ lat: ll.lat, lng: ll.lng });
        marker.on('dragend', () => upd(marker.getLatLng()));
        map.on('click', (e: any) => { marker.setLatLng(e.latlng); upd(e.latlng); });
        mapRef.current = {
          provider: 'leaflet', L, map, marker,
          setPoint: (lat: number, lng: number, zoom = 17) => { marker.setLatLng([lat, lng]); map.setView([lat, lng], zoom); },
        };
        setTimeout(() => { try { map.invalidateSize(); } catch {} }, 250);
      } catch (e) { console.warn('[store-loc-map] init failed', e); }
    })();
    return () => {
      cancelled = true;
      const m = mapRef.current;
      if (m?.provider === 'naver') { try { m.map.destroy(); } catch {} const el = (globalThis as any).document?.getElementById('store-loc-map'); if (el) (el as any)._wvMap = false; }
      else if (m?.map) { try { m.map.remove(); } catch {} }
      mapRef.current = null;
    };
  }, []);

  // 수정/신청 모드: 기존 매장 불러오기
  useEffect(() => {
    if (!id) return;
    supabase.from('stores').select('*').eq('id', id).single().then(({ data }) => {
      if (!data) return;
      setExistingStore(data);
      setName(data.name ?? '');
      setCategory(data.categories?.length ? data.categories.join(', ') : (data.category ?? ''));
      setAddress(data.address ?? '');
      setHours(data.hours ?? '');
      setPhone(data.phone ?? '');
      setNaverPlaceId(data.naver_place_id ?? '');
      setCoord({ lat: data.lat, lng: data.lng });
      setExistingPhoto(data.photo ?? null);
      if (data.lat != null && data.lng != null) {
        if (mapRef.current) mapRef.current.setPoint(data.lat, data.lng, 17);
        else pendingCenter.current = [data.lat, data.lng];
      }
    });
  }, [id]);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled && res.assets[0]) setImage(res.assets[0]);
  };
  const uploadImage = async (asset: ImagePicker.ImagePickerAsset): Promise<string | null> => {
    const contentType = asset.mimeType ?? 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const path = `${session!.user.id}/store-${Date.now()}.${ext}`;
    const resp = await fetch(asset.uri);
    const arrayBuffer = await resp.arrayBuffer();
    const { error } = await supabase.storage.from('post-images').upload(path, arrayBuffer, { contentType });
    if (error) return null;
    return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
  };

  // 권한
  const canEdit = isEdit ? canEditStore(profile, existingStore) : profile?.role === 'owner';
  const mode: 'create' | 'edit' | 'request' = !isEdit ? 'create' : canEdit ? 'edit' : 'request';

  // 접근 가드
  if (!session) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
        <Pressable style={styles.close} onPress={() => router.back()}><Text style={[styles.closeTxt, { color: c.textSecondary }]}>✕</Text></Pressable>
        <View style={styles.guideBox}><Text style={[styles.guideTxt, { color: c.text }]}>로그인 후 이용해주세요</Text></View>
      </SafeAreaView>
    );
  }
  if (!isEdit && profile?.role !== 'owner') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
        <Pressable style={styles.close} onPress={() => router.back()}><Text style={[styles.closeTxt, { color: c.textSecondary }]}>✕</Text></Pressable>
        <View style={styles.guideBox}><Text style={[styles.guideTxt, { color: c.text }]}>매장 등록은 사업자 인증을 마친{'\n'}사업주 회원만 가능해요</Text></View>
      </SafeAreaView>
    );
  }

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const { data } = await supabase.from('places').select('name,category,address,lat,lng').ilike('name', `%${query.trim()}%`).limit(8);
    setSearching(false);
    setResults((data as any[]) ?? []);
  };
  const pick = (r: { name: string; category: string; address: string; lat: number | null; lng: number | null }) => {
    setName(r.name); setCategory(r.category ?? ''); setAddress(r.address ?? '');
    setCoord({ lat: r.lat, lng: r.lng });
    if (mapRef.current && r.lat != null && r.lng != null) mapRef.current.setPoint(r.lat, r.lng, 17);
    setResults([]); setQuery('');
  };

  const canSubmit = name.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    setErrorMsg(''); setOkMsg('');
    setSubmitting(true);

    let photoUrl: string | null = existingPhoto;
    if (image) {
      photoUrl = await uploadImage(image);
      if (!photoUrl) { setErrorMsg('사진 업로드 실패. 잠시 후 다시 시도해주세요.'); setSubmitting(false); return; }
    }
    let lat = coord.lat, lng = coord.lng;
    if ((lat == null || lng == null) && address.trim()) {
      const m = address.match(/([가-힣]+(?:동|읍|면|리))\s+([가-힣0-9]+(?:대로|로|길))/);
      const q = m ? `${m[1]} ${m[2]}` : address.trim().replace(/\s*\d[\d-]*$/, '');
      const { data: g } = await supabase.from('places').select('lat,lng').ilike('address', `%${q}%`).not('lat', 'is', null).limit(1);
      if (g && g[0]) { lat = (g[0] as any).lat; lng = (g[0] as any).lng; }
    }
    const cats = category.split(',').map((s) => s.trim()).filter(Boolean);
    const fields = { name: name.trim(), category: category.trim() || null, categories: cats.length ? cats : null, address: address.trim() || null, hours: hours.trim() || null, phone: phone.trim() || null, lat, lng, photo: photoUrl,
      // 네이버 플레이스 ID: 소유자(create/edit)만 저장 → 플레이스 분석에 자동 사용. 변경신청 경로엔 미포함(승인 화이트리스트에서도 제외)
      ...(mode !== 'request' ? { naver_place_id: naverPlaceId.trim() || null } : {}) };

    let error;
    if (mode === 'create') {
      // biz_verified는 클라이언트에서 절대 설정하지 않음 — 사업자 인증(biz-cert) 통과 시 서버에서만 부여
      ({ error } = await supabase.from('stores').insert({ owner_id: session.user.id, ...fields }));
    } else if (mode === 'edit') {
      ({ error } = await supabase.from('stores').update(fields).eq('id', id));
    } else {
      ({ error } = await supabase.from('store_change_requests').insert({ store_id: id, requester_id: session.user.id, payload: fields }));
    }
    setSubmitting(false);
    if (error) { setErrorMsg('실패: ' + error.message); return; }
    if (mode === 'request') { setOkMsg('✅ 변경 신청이 접수됐어요. 사장님·관리자 검토 후 반영됩니다.'); return; }
    router.replace(isEdit ? `/store/${id}` : '/explore');
  };

  const handleDelete = async () => {
    if (!id || !canEdit) return;
    setSubmitting(true);
    const { error } = await supabase.from('stores').delete().eq('id', id);
    setSubmitting(false);
    if (error) { setErrorMsg('삭제 실패: ' + error.message); return; }
    router.replace('/explore');
  };

  const title = mode === 'create' ? '매장 등록' : mode === 'edit' ? '매장 수정' : '정보 수정 신청';
  const submitLabel = mode === 'create' ? '등록' : mode === 'edit' ? '저장' : '신청';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}><Text style={[styles.closeTxt, { color: c.textSecondary }]}>✕</Text></Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>{title}</Text>
        <Pressable onPress={handleSubmit} disabled={!canSubmit} hitSlop={8}>
          <Text style={[styles.post, { color: canSubmit ? c.primary : c.textSecondary }]}>{submitting ? '...' : submitLabel}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {mode === 'request' && (
          <View style={[styles.banner, { backgroundColor: c.primarySoft }]}>
            <Text style={[styles.bannerTxt, { color: c.primaryDeep }]}>손님·알바는 즉시 반영이 아니라 변경 신청만 가능해요. 사장님·직원·관리자가 검토 후 반영합니다.</Text>
          </View>
        )}

        <Text style={[styles.label, { color: c.textSecondary }]}>① 매장 검색해서 불러오기</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput style={[styles.input, { flex: 1, backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="매장 이름 검색" placeholderTextColor={c.textSecondary} value={query} onChangeText={setQuery} onSubmitEditing={search} />
          <Pressable style={[styles.searchBtn, { backgroundColor: c.primary }]} onPress={search}>
            <Text style={{ color: c.onPrimary, fontWeight: '800' }}>{searching ? '검색중' : '검색'}</Text>
          </Pressable>
        </View>
        {results.map((r, i) => (
          <Pressable key={`${r.name}-${i}`} onPress={() => pick(r)} style={[styles.result, { borderColor: c.border, backgroundColor: c.card }]}>
            <Text style={[styles.rName, { color: c.text }]}>{r.name}</Text>
            <Text style={[styles.rSub, { color: c.textSecondary }]}>{r.category} · {r.address}</Text>
          </Pressable>
        ))}

        <Text style={[styles.label, { color: c.textSecondary, marginTop: 8 }]}>② 정보 확인·수정</Text>
        <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="매장 이름" placeholderTextColor={c.textSecondary} value={name} onChangeText={setName} />
        <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="업종 · 쉼표로 여러 개 (예: 카페, 수영장)" placeholderTextColor={c.textSecondary} value={category} onChangeText={setCategory} />
        <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="주소" placeholderTextColor={c.textSecondary} value={address} onChangeText={setAddress} />
        <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="🕒 영업시간 (예: 매일 10:00–22:00 / 월 휴무)" placeholderTextColor={c.textSecondary} value={hours} onChangeText={setHours} />
        <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="📞 매장 안내 전화번호 (예: 033-123-4567)" placeholderTextColor={c.textSecondary} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        {mode !== 'request' && (
          <>
            <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="📈 네이버 플레이스 ID (선택 · 플레이스 분석용)" placeholderTextColor={c.textSecondary} value={naverPlaceId} onChangeText={setNaverPlaceId} keyboardType="number-pad" />
            <Text style={{ color: c.textSecondary, fontSize: 11.5, marginTop: -4, marginBottom: 2, lineHeight: 16 }}>네이버 지도에서 내 매장 URL의 숫자예요(예: …/place/2006014171). 입력하면 플레이스 분석에 자동으로 쓰여요.</Text>
          </>
        )}

        <Text style={[styles.label, { color: c.textSecondary, marginTop: 8 }]}>③ 지도에서 정확한 위치 찍기</Text>
        {Platform.OS === 'web' ? (
          <View nativeID="store-loc-map" style={[styles.locMap, { borderColor: c.border }]} />
        ) : (
          <Text style={[styles.hint, { color: c.textSecondary }]}>위치 지정은 웹에서 가능해요 (앱은 준비중)</Text>
        )}
        <Text style={[styles.hint, { color: c.textSecondary }]}>지도를 클릭하거나 핀을 드래그해 정확한 위치를 맞춰주세요.{coord.lat != null ? `  📍 ${coord.lat.toFixed(5)}, ${coord.lng?.toFixed(5)}` : ''}</Text>

        <Text style={[styles.label, { color: c.textSecondary, marginTop: 8 }]}>④ 매장 사진</Text>
        {name.trim() ? (
          <Pressable onPress={() => Linking.openURL(`https://map.naver.com/v5/search/${encodeURIComponent(name.trim())}`)}>
            <Text style={[styles.naverLink, { color: c.primary }]}>🔍 네이버 플레이스에서 "{name.trim()}" 사진 비교하기 ›</Text>
          </Pressable>
        ) : null}
        {image || existingPhoto ? (
          <View style={styles.preview}>
            <Image source={{ uri: image?.uri ?? existingPhoto! }} style={styles.previewImg} contentFit="cover" />
            <Pressable style={[styles.removeBtn, { backgroundColor: c.text }]} onPress={() => { setImage(null); setExistingPhoto(null); }}>
              <Text style={{ color: c.background, fontWeight: '900', fontSize: 13 }}>✕</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={[styles.photoBtn, { borderColor: c.border }]} onPress={pickImage}>
            <Text style={[styles.photoBtnTxt, { color: c.textSecondary }]}>📷 매장 사진 추가</Text>
          </Pressable>
        )}

        {okMsg ? <Text style={{ color: c.verify, fontWeight: '700', marginTop: 6 }}>{okMsg}</Text> : null}
        {errorMsg ? <Text style={{ color: '#E5484D', fontWeight: '700' }}>{errorMsg}</Text> : null}

        {mode === 'edit' && (
          <Pressable style={[styles.deleteBtn, { borderColor: '#E5484D' }]} onPress={handleDelete} disabled={submitting}>
            <Text style={{ color: '#E5484D', fontWeight: '800' }}>매장 삭제</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  close: { padding: 16 },
  closeTxt: { fontSize: 20, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  post: { fontSize: 15, fontWeight: '800' },
  banner: { padding: 12, borderRadius: 10 },
  bannerTxt: { fontSize: 12.5, fontWeight: '700', lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  searchBtn: { paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  result: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  rName: { fontSize: 14, fontWeight: '700' },
  rSub: { fontSize: 12, marginTop: 2 },
  locMap: { height: 220, borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginTop: 6 },
  naverLink: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  photoBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  photoBtnTxt: { fontSize: 14, fontWeight: '700' },
  preview: { position: 'relative', alignSelf: 'flex-start' },
  previewImg: { width: 120, height: 120, borderRadius: 12 },
  removeBtn: { position: 'absolute', top: -8, right: -8, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  deleteBtn: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 20 },
  guideBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  guideTxt: { fontSize: 15, fontWeight: '700', textAlign: 'center', lineHeight: 24 },
});
