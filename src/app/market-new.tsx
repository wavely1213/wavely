import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useScheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { MARKET_CATS } from './market';

export default function MarketNewScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session } = useAuth();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editId = Array.isArray(edit) ? edit[0] : edit;

  const [imgs, setImgs] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [keepUrls, setKeepUrls] = useState<string[]>([]); // 수정 시 기존 이미지
  const [title, setTitle] = useState('');
  const [free, setFree] = useState(false);
  const [price, setPrice] = useState('');
  const [cat, setCat] = useState<string>(MARKET_CATS[0]);
  const [body, setBody] = useState('');
  const [dong, setDong] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // 동네 자동(GPS)
  useEffect(() => {
    if (editId) return;
    (async () => {
      try {
        let lat: number | undefined, lng: number | undefined;
        if (Platform.OS === 'web') {
          const g = (globalThis as any).navigator?.geolocation; if (!g) return;
          await new Promise<void>((res) => g.getCurrentPosition((p: any) => { lat = p.coords.latitude; lng = p.coords.longitude; res(); }, () => res(), { timeout: 8000, maximumAge: 300000 }));
        } else {
          const Location = await import('expo-location');
          const { status } = await Location.requestForegroundPermissionsAsync(); if (status !== 'granted') return;
          const pos = await Location.getCurrentPositionAsync({}); lat = pos.coords.latitude; lng = pos.coords.longitude;
        }
        if (lat == null) return;
        const { data } = await supabase.rpc('nearest_dong', { p_lat: lat, p_lng: lng });
        if (typeof data === 'string') setDong((cur) => cur ?? data);
      } catch {}
    })();
  }, [editId]);

  useEffect(() => {
    if (!editId) return;
    supabase.from('market_items').select('*').eq('id', editId).single().then(({ data }) => {
      if (!data) return;
      setTitle(data.title ?? ''); setBody(data.body ?? ''); setCat(data.category ?? MARKET_CATS[0]);
      setFree(data.price === 0); setPrice(data.price ? String(data.price) : ''); setDong(data.dong ?? null);
      setKeepUrls(data.images ?? []);
    });
  }, [editId]);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: true, selectionLimit: 8 });
    if (!res.canceled) setImgs((cur) => [...cur, ...res.assets].slice(0, 8));
  };
  const upload = async (a: ImagePicker.ImagePickerAsset): Promise<string | null> => {
    try {
      const resp = await fetch(a.uri); const ab = await resp.arrayBuffer();
      const ct = a.mimeType ?? 'image/jpeg'; const ext = ct.includes('png') ? 'png' : 'jpg';
      const path = `market/${session!.user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error } = await supabase.storage.from('post-images').upload(path, ab, { contentType: ct });
      if (error) return null;
      return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
    } catch { return null; }
  };

  const submit = async () => {
    setMsg('');
    if (!session) { router.replace('/login'); return; }
    if (!title.trim()) { setMsg('제목을 입력해주세요'); return; }
    const p = free ? 0 : Math.max(parseInt(price.replace(/[^0-9]/g, '') || '0', 10), 0);
    if (!free && p <= 0) { setMsg('가격을 입력하거나 ‘나눔’을 선택해주세요'); return; }
    if (keepUrls.length + imgs.length === 0) { setMsg('사진을 한 장 이상 올려주세요'); return; }
    setBusy(true);
    const uploaded: string[] = [];
    for (const a of imgs) { const u = await upload(a); if (u) uploaded.push(u); }
    const images = [...keepUrls, ...uploaded];
    const payload = { title: title.trim(), body: body.trim() || null, price: p, category: cat, images, dong };
    const { error } = editId
      ? await supabase.from('market_items').update(payload).eq('id', editId)
      : await supabase.from('market_items').insert({ seller_id: session.user.id, ...payload });
    setBusy(false);
    if (error) { setMsg('등록 실패: ' + error.message); return; }
    router.replace('/market');
  };

  const allImgs = [...keepUrls.map((u) => ({ url: u, keep: true })), ...imgs.map((a) => ({ url: a.uri, keep: false, asset: a }))];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/market'))} hitSlop={8}><Text style={[styles.x, { color: c.textSecondary }]}>✕</Text></Pressable>
        <Text style={[styles.hTitle, { color: c.text }]}>{editId ? '글 수정' : '판매하기'}</Text>
        <Pressable onPress={submit} disabled={busy} hitSlop={8}><Text style={{ color: c.primary, fontWeight: '800', fontSize: 15 }}>{busy ? '...' : '등록'}</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pressable onPress={pick} style={[styles.addImg, { borderColor: c.border }]}><Text style={{ fontSize: 22 }}>📷</Text><Text style={{ color: c.textSecondary, fontSize: 11, fontWeight: '700' }}>{allImgs.length}/8</Text></Pressable>
          {allImgs.map((im, i) => (
            <View key={i} style={styles.imgWrap}>
              <Image source={{ uri: im.url }} style={styles.img} contentFit="cover" />
              <Pressable onPress={() => { if (im.keep) setKeepUrls((u) => u.filter((x) => x !== im.url)); else setImgs((a) => a.filter((x) => x.uri !== im.url)); }} style={styles.imgDel}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✕</Text></Pressable>
            </View>
          ))}
        </ScrollView>

        <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="제목" placeholderTextColor={c.textSecondary} value={title} onChangeText={setTitle} />

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable onPress={() => setFree((v) => !v)} style={[styles.freeBtn, { backgroundColor: free ? c.primary : c.card, borderColor: free ? c.primary : c.border }]}>
            <Text style={{ color: free ? c.onPrimary : c.textSecondary, fontWeight: '800', fontSize: 13 }}>🧡 나눔</Text>
          </Pressable>
          <View style={[styles.input, { flex: 1, backgroundColor: c.card, borderColor: c.border, flexDirection: 'row', alignItems: 'center', opacity: free ? 0.5 : 1 }]}>
            <TextInput style={{ flex: 1, fontSize: 15, color: c.text }} editable={!free} placeholder="가격" placeholderTextColor={c.textSecondary} value={price} onChangeText={setPrice} keyboardType="number-pad" />
            <Text style={{ color: c.text, fontWeight: '700' }}>원</Text>
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: c.textSecondary }]}>카테고리</Text>
          <View style={styles.cats}>
            {MARKET_CATS.map((k) => (
              <Pressable key={k} onPress={() => setCat(k)} style={[styles.catChip, { backgroundColor: cat === k ? c.primary : c.card, borderColor: cat === k ? c.primary : c.border }]}>
                <Text style={{ color: cat === k ? c.onPrimary : c.text, fontSize: 12.5, fontWeight: '700' }}>{k}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text, height: 140, textAlignVertical: 'top' }]} placeholder="설명 (상태·구입시기·거래방법 등)" placeholderTextColor={c.textSecondary} value={body} onChangeText={setBody} multiline />

        <Text style={[styles.label, { color: c.textSecondary }]}>거래 동네 {dong ? `· 📍${dong}` : '(위치 자동)'}</Text>
        {msg ? <Text style={{ color: '#E5484D', fontWeight: '700' }}>{msg}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  x: { fontSize: 18, fontWeight: '700' },
  hTitle: { fontSize: 16, fontWeight: '800' },
  addImg: { width: 72, height: 72, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  imgWrap: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  imgDel: { position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  freeBtn: { paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12, borderWidth: 1 },
  label: { fontSize: 12.5, fontWeight: '800', marginBottom: 8 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
});
