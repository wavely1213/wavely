import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DongPicker } from '@/components/DongPicker';
import { BOARDS, type BoardKey, canPostTo, mergeDongs } from '@/constants/app';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function WriteScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session, profile } = useAuth();

  // 처음 선택 게시판: 내가 쓸 수 있는 첫 번째
  const firstAllowed = BOARDS.find((b) => canPostTo(profile?.role, b.key))?.key ?? 'free';
  const [board, setBoard] = useState<BoardKey>(firstAllowed);

  // 동네(동) 선택 — 커뮤니티에서 넘어온 동을 기본값으로
  const params = useLocalSearchParams<{ dong?: string; edit?: string }>();
  const dongParam = Array.isArray(params?.dong) ? params.dong[0] : params?.dong;
  const editId = Array.isArray(params?.edit) ? params.edit[0] : params?.edit;
  const [dong, setDong] = useState<string | null>(dongParam ? String(dongParam) : null);
  const [dongOptions, setDongOptions] = useState<string[]>([]);
  const [existingMedia, setExistingMedia] = useState<{ url: string; type: string } | null>(null);
  useEffect(() => {
    supabase.rpc('dong_list').then(({ data }) => setDongOptions(mergeDongs(((data as any[]) ?? []).map((d) => d.dong))));
  }, []);

  // 동네 미선택 시, 내 위치로 자동 채움 (위치 기반 노출에 잡히게) — 사용자가 다시 바꿀 수 있음
  useEffect(() => {
    if (editId || dongParam || dong) return;
    let alive = true;
    (async () => {
      try {
        let lat: number | undefined, lng: number | undefined;
        if (Platform.OS === 'web') {
          const g = (globalThis as any).navigator?.geolocation;
          if (!g) return;
          await new Promise<void>((res) => g.getCurrentPosition(
            (p: any) => { lat = p.coords.latitude; lng = p.coords.longitude; res(); },
            () => res(), { timeout: 8000, maximumAge: 300000 }));
        } else {
          const Location = await import('expo-location');
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;
          const pos = await Location.getCurrentPositionAsync({});
          lat = pos.coords.latitude; lng = pos.coords.longitude;
        }
        if (lat == null || lng == null) return;
        const { data } = await supabase.rpc('nearest_dong', { p_lat: lat, p_lng: lng });
        if (alive && typeof data === 'string' && data) setDong((cur) => cur ?? data);
      } catch {}
    })();
    return () => { alive = false; };
  }, [editId, dongParam]);

  // 수정 모드: 기존 글 불러오기
  useEffect(() => {
    if (!editId) return;
    supabase.from('posts').select('*').eq('id', editId).single().then(({ data }) => {
      if (!data) return;
      setBoard(data.board); setTitle(data.title ?? ''); setBody(data.body ?? ''); setDong(data.dong ?? null);
      setAnon(data.anonymous ?? true);
      if (data.image_url) setExistingMedia({ url: data.image_url, type: data.media_type ?? 'image' });
      if (data.place_name) setPlace({ name: data.place_name, address: data.place_address ?? '', link: data.place_link ?? '' });
    });
  }, [editId]);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [anon, setAnon] = useState(true); // 작성자 표시: 익명(기본) / 닉네임 공개
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const pickMedia = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.7, videoMaxDuration: 60 });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      const isVideo = a.type === 'video' || (a.mimeType ?? '').startsWith('video');
      setMediaType(isVideo ? 'video' : 'image');
      setImage(a);
    }
  };

  const uploadMedia = async (asset: ImagePicker.ImagePickerAsset): Promise<string | null> => {
    const isVideo = mediaType === 'video';
    const contentType = asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg');
    const ext = isVideo ? (contentType.includes('quicktime') || contentType.includes('mov') ? 'mov' : 'mp4') : (contentType.includes('png') ? 'png' : 'jpg');
    const path = `${session!.user.id}/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
    const resp = await fetch(asset.uri);
    const arrayBuffer = await resp.arrayBuffer();
    const { error } = await supabase.storage.from('post-images').upload(path, arrayBuffer, { contentType });
    if (error) return null;
    return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
  };

  // 장소(네이버 지역검색)
  const [place, setPlace] = useState<{ name: string; address: string; link: string } | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<{ name: string; address: string; category: string; link: string }[]>([]);
  const [searchingPlace, setSearchingPlace] = useState(false);

  const searchPlaces = async () => {
    if (!placeQuery.trim()) return;
    setErrorMsg('');
    setSearchingPlace(true);
    // 우리 places DB에서 검색 (서버 조회 → IP 차단 없음, 웹·앱 모두 작동)
    const { data, error } = await supabase
      .from('places')
      .select('name,category,address')
      .ilike('name', `%${placeQuery.trim()}%`)
      .limit(8);
    setSearchingPlace(false);
    if (error) { setErrorMsg('장소 검색 실패: ' + error.message); return; }
    setPlaceResults(
      (data ?? []).map((d: any) => ({
        name: d.name,
        address: d.address ?? '',
        category: d.category ?? '',
        link: `https://map.naver.com/v5/search/${encodeURIComponent(d.name)}`,
      })),
    );
  };

  // 로그인 안 했으면 안내
  if (!session || !profile) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
        <Pressable style={styles.close} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <Text style={[styles.closeTxt, { color: c.textSecondary }]}>✕</Text>
        </Pressable>
        <View style={styles.guideBox}>
          <Text style={[styles.guideTxt, { color: c.text }]}>로그인 후 글을 쓸 수 있어요</Text>
          <Pressable style={[styles.btn, { backgroundColor: c.primary }]} onPress={() => router.replace('/login')}>
            <Text style={[styles.btnTxt, { color: c.onPrimary }]}>로그인하러 가기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = title.trim().length > 0 && canPostTo(profile.role, board) && !submitting;

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!canPostTo(profile.role, board)) { setErrorMsg('이 게시판에 글쓰기 권한이 없어요.'); return; }
    setSubmitting(true);

    // 사진·영상: 새로 고르면 업로드, 수정 모드에서 그대로면 기존 유지
    let mediaUrl: string | null = existingMedia?.url ?? null;
    let finalMediaType: string = existingMedia?.type ?? 'image';
    if (image) {
      const up = await uploadMedia(image);
      if (!up) { setErrorMsg(`${mediaType === 'video' ? '영상' : '사진'} 업로드 실패. 잠시 후 다시 시도해주세요.`); setSubmitting(false); return; }
      mediaUrl = up; finalMediaType = mediaType;
    }

    const payload = {
      board,
      dong,
      title: title.trim(),
      body: body.trim(),
      image_url: mediaUrl,
      media_type: finalMediaType,
      anonymous: anon,
      place_name: place?.name ?? null,
      place_address: place?.address ?? null,
      place_link: place?.link ?? null,
    };
    const { error } = editId
      ? await supabase.from('posts').update(payload).eq('id', editId)
      : await supabase.from('posts').insert({ author_id: session.user.id, ...payload });
    setSubmitting(false);
    if (error) { setErrorMsg('저장 실패: ' + error.message); return; }
    if (editId) router.replace(`/post/${editId}`); else router.replace('/');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}>
          <Text style={[styles.closeTxt, { color: c.textSecondary }]}>✕</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>{editId ? '글 수정' : '글쓰기'}</Text>
        <Pressable onPress={handleSubmit} disabled={!canSubmit} hitSlop={8}>
          <Text style={[styles.post, { color: canSubmit ? c.primary : c.textSecondary }]}>
            {submitting ? '저장중' : editId ? '수정' : '등록'}
          </Text>
        </Pressable>
      </View>

      <View style={{ padding: 16, gap: 14 }}>
        {/* 게시판 선택 (내가 쓸 수 있는 게시판만 보임) */}
        <View style={styles.boards}>
          {BOARDS.filter((b) => canPostTo(profile.role, b.key)).map((b) => {
            const on = board === b.key;
            return (
              <Pressable
                key={b.key}
                onPress={() => setBoard(b.key)}
                style={[styles.boardChip, {
                  backgroundColor: on ? c.primary : c.card,
                  borderColor: on ? c.primary : c.border,
                }]}>
                <Text style={[styles.boardTxt, { color: on ? c.onPrimary : c.textSecondary }]}>{b.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* 동네(동) 선택 — 단일 버튼 + 드롭다운 */}
        <View>
          <Text style={[styles.dongLabel, { color: c.textSecondary }]}>동네 선택 <Text style={{ fontWeight: '500' }}>(어느 동네 커뮤니티에 올릴까요?)</Text></Text>
          <DongPicker value={dong} options={dongOptions} onChange={setDong} allLabel="춘천시 전체" />
        </View>

        {/* 작성자 표시: 익명 / 공개 */}
        <View>
          <Text style={[styles.dongLabel, { color: c.textSecondary }]}>작성자 표시</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([['익명', true], ['닉네임 공개', false]] as const).map(([label, val]) => {
              const on = anon === val;
              return (
                <Pressable key={label} onPress={() => setAnon(val)} style={[styles.boardChip, { backgroundColor: on ? c.primary : c.card, borderColor: on ? c.primary : c.border }]}>
                  <Text style={[styles.boardTxt, { color: on ? c.onPrimary : c.textSecondary }]}>{val ? '🕶️ ' : '🙂 '}{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.anonHint, { color: c.textSecondary }]}>{anon ? '닉네임 없이 “익명”으로 올라가요' : `“${profile.nickname}” 닉네임이 함께 보여요`}</Text>
        </View>

        <TextInput
          style={[styles.title, { color: c.text, borderColor: c.border }]}
          placeholder="제목"
          placeholderTextColor={c.textSecondary}
          value={title}
          onChangeText={setTitle}
          maxLength={120}
        />
        <TextInput
          style={[styles.body, { color: c.text }]}
          placeholder="내용을 입력하세요  (#해시태그 도 쓸 수 있어요)"
          placeholderTextColor={c.textSecondary}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          maxLength={5000}
        />

        {/* 사진·영상 */}
        {image || existingMedia ? (
          <View style={styles.preview}>
            {(image ? mediaType : existingMedia?.type) === 'video' ? (
              <View style={[styles.previewImg, { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 30 }}>🎬</Text>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 4 }}>영상 첨부됨</Text>
              </View>
            ) : (
              <Image source={{ uri: image ? image.uri : existingMedia!.url }} style={styles.previewImg} contentFit="cover" />
            )}
            <Pressable style={[styles.removeBtn, { backgroundColor: c.text }]} onPress={() => { setImage(null); setExistingMedia(null); }}>
              <Text style={{ color: c.background, fontWeight: '900', fontSize: 13 }}>✕</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={[styles.photoBtn, { borderColor: c.border }]} onPress={pickMedia}>
            <Text style={[styles.photoBtnTxt, { color: c.textSecondary }]}>📷 사진 · 🎬 영상 추가</Text>
          </Pressable>
        )}

        {/* 장소 첨부 */}
        {place ? (
          <View style={[styles.placePicked, { backgroundColor: c.primarySoft, borderColor: c.primary }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.placeName, { color: c.primaryDeep }]}>📍 {place.name}</Text>
              <Text style={[styles.placeAddr, { color: c.textSecondary }]}>{place.address}</Text>
            </View>
            <Pressable onPress={() => setPlace(null)} hitSlop={8}>
              <Text style={[styles.change, { color: c.primary }]}>제거</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.placeBox, { borderColor: c.border }]}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.bizInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                placeholder="📍 장소 검색 (예: 명동 닭갈비골목)"
                placeholderTextColor={c.textSecondary}
                value={placeQuery}
                onChangeText={setPlaceQuery}
                onSubmitEditing={searchPlaces}
              />
              <Pressable style={[styles.bizBtn, { backgroundColor: c.primary }]} onPress={searchPlaces}>
                <Text style={{ color: c.onPrimary, fontWeight: '800' }}>{searchingPlace ? '검색중' : '검색'}</Text>
              </Pressable>
            </View>
            {placeResults.map((r, i) => (
              <Pressable
                key={`${r.name}-${i}`}
                onPress={() => { setPlace({ name: r.name, address: r.address, link: r.link }); setPlaceResults([]); setPlaceQuery(''); }}
                style={[styles.placeResult, { borderColor: c.border }]}>
                <Text style={[styles.placeName, { color: c.text }]}>{r.name}</Text>
                <Text style={[styles.placeAddr, { color: c.textSecondary }]}>{r.category} · {r.address}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {errorMsg ? <Text style={{ color: '#E5484D', fontWeight: '700' }}>{errorMsg}</Text> : null}
      </View>
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
  boards: { flexDirection: 'row', gap: 8 },
  boardChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5 },
  boardTxt: { fontSize: 13, fontWeight: '700' },
  dongLabel: { fontSize: 12.5, fontWeight: '800', marginBottom: 8 },
  anonHint: { fontSize: 11.5, fontWeight: '600', marginTop: 6 },
  dongChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  dongTxt: { fontSize: 12.5, fontWeight: '700' },
  title: { fontSize: 17, fontWeight: '700', borderBottomWidth: 1, paddingVertical: 10 },
  body: { fontSize: 15, lineHeight: 22, minHeight: 140, paddingTop: 6 },
  photoBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  photoBtnTxt: { fontSize: 14, fontWeight: '700' },
  preview: { position: 'relative', alignSelf: 'flex-start' },
  previewImg: { width: 120, height: 120, borderRadius: 12 },
  removeBtn: { position: 'absolute', top: -8, right: -8, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  placeBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  placePicked: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5 },
  placeName: { fontSize: 14, fontWeight: '800' },
  placeAddr: { fontSize: 12, marginTop: 2 },
  placeResult: { paddingVertical: 9, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1 },
  guideBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  guideTxt: { fontSize: 16, fontWeight: '700' },
  btn: { alignSelf: 'stretch', paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  btnTxt: { fontSize: 16, fontWeight: '800' },
});
