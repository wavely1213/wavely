import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { prettyCat } from '@/constants/app';
import { ReactionBar } from '@/components/ReactionBar';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function distM(la1: number, lo1: number, la2: number, lo2: number): number {
  const R = 6371000, rad = Math.PI / 180;
  const dLa = (la2 - la1) * rad, dLo = (lo2 - lo1) * rad;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * rad) * Math.cos(la2 * rad) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const VISIT_RADIUS = 300;

type Place = { id: number; name: string; category: string | null; address: string | null; lat: number | null; lng: number | null; rating: number | null; review_count: number | null };
type Review = { id: string; rating: number; body: string | null; verify_method: string | null; verified: boolean; receipt_url: string | null; author_id: string; profiles: { nickname: string } | null };

export default function PlaceDetailScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();

  const [place, setPlace] = useState<Place | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [method, setMethod] = useState<'none' | 'gps' | 'receipt'>('none');
  const [gpsVerified, setGpsVerified] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [receipt, setReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    const { data: p } = await supabase.from('places').select('id,name,category,address,lat,lng,rating,review_count').eq('id', id).single();
    setPlace((p as Place) ?? null);
    const { data: r } = await supabase.from('reviews').select('id,rating,body,verify_method,verified,receipt_url,author_id,profiles(nickname)').eq('place_id', id).order('verified', { ascending: false }).order('created_at', { ascending: false });
    setReviews((r as unknown as Review[]) ?? []);
    setLoading(false);
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const approveReview = async (rid: string) => { await supabase.from('reviews').update({ verified: true }).eq('id', rid); load(); };
  const rejectReview = async (rid: string) => { await supabase.from('reviews').update({ verify_method: 'none' }).eq('id', rid); load(); };
  const deleteReview = async (rid: string) => { await supabase.from('reviews').delete().eq('id', rid); load(); };
  const pendingReceipts = reviews.filter((rv) => rv.verify_method === 'receipt' && !rv.verified);

  const doGps = async () => {
    setMsg('');
    if (place?.lat == null || place?.lng == null) { setMsg('이 가게는 위치 정보가 없어 영수증으로 인증해주세요.'); return; }
    setVerifying(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setMsg('위치 권한을 허용해주세요.'); setVerifying(false); return; }
      const pos = await Location.getCurrentPositionAsync({});
      const d = distM(pos.coords.latitude, pos.coords.longitude, place.lat, place.lng);
      if (d <= VISIT_RADIUS) { setMethod('gps'); setGpsVerified(true); setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setReceipt(null); setMsg(`✅ 방문 확인됨 (약 ${Math.round(d)}m) — 등록 시 인증돼요`); }
      else { setGpsVerified(false); setGpsCoords(null); setMsg(`매장에서 약 ${Math.round(d)}m 떨어져 있어요. ${VISIT_RADIUS}m 이내에서 인증해주세요.`); }
    } catch (e: any) { setMsg('위치 확인 실패: ' + (e?.message ?? e)); }
    setVerifying(false);
  };
  const pickReceipt = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!res.canceled && res.assets[0]) { setReceipt(res.assets[0]); setMethod('receipt'); setGpsVerified(false); setMsg('🧾 영수증 첨부됨'); }
  };
  const uploadReceipt = async (asset: ImagePicker.ImagePickerAsset): Promise<string | null> => {
    const ct = asset.mimeType ?? 'image/jpeg';
    const ext = ct.includes('png') ? 'png' : 'jpg';
    const path = `${session!.user.id}/receipt-${Date.now()}.${ext}`;
    const resp = await fetch(asset.uri); const ab = await resp.arrayBuffer();
    const { error } = await supabase.storage.from('post-images').upload(path, ab, { contentType: ct });
    if (error) return null;
    return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
  };

  const submit = async () => {
    setMsg('');
    if (!session) { router.push('/login'); return; }
    if (rating < 1) { setMsg('별점을 선택해주세요'); return; }
    setSending(true);
    let receiptUrl: string | null = null, vm = 'none';
    if (method === 'gps' && gpsVerified) { vm = 'gps'; }
    else if (method === 'receipt' && receipt) {
      receiptUrl = await uploadReceipt(receipt);
      if (!receiptUrl) { setMsg('영수증 업로드 실패'); setSending(false); return; }
      vm = 'receipt';
    }
    // 인증 플래그는 서버 함수만 설정 (트리거가 클라이언트 위조 차단)
    const { data: up, error } = await supabase.from('reviews').upsert(
      { place_id: Number(id), author_id: session.user.id, rating, body: body.trim() || null, verify_method: vm, verified: false, receipt_url: receiptUrl },
      { onConflict: 'place_id,author_id' },
    ).select('id').single();
    if (error) { setSending(false); setMsg('등록 실패: ' + error.message); return; }
    const reset = () => { setRating(0); setBody(''); setMethod('none'); setGpsVerified(false); setGpsCoords(null); setReceipt(null); };

    if (vm === 'gps' && up?.id && gpsCoords) {
      setMsg('📍 방문 위치를 확인하는 중...');
      const { data: g } = await supabase.functions.invoke('gps-verify', { body: { review_id: up.id, lat: gpsCoords.lat, lng: gpsCoords.lng } });
      setSending(false); reset();
      setMsg((g as any)?.matched ? '✅ 방문 인증 완료! 인증 리뷰로 등록됐어요' : '리뷰는 등록됐지만 위치 인증은 실패했어요');
      load();
      return;
    }
    if (vm === 'receipt' && up?.id) {
      setMsg('🧾 영수증을 확인하는 중...');
      const { data: ocr } = await supabase.functions.invoke('receipt-ocr', { body: { review_id: up.id } });
      setSending(false); reset();
      setMsg((ocr as any)?.matched ? '✅ 영수증 인증 완료! 방문 인증 리뷰로 등록됐어요' : '🧾 영수증에서 매장명을 못 찾았어요 — 관리자 확인 후 반영돼요');
      load();
      return;
    }
    setSending(false); reset(); setMsg(''); load();
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border, backgroundColor: c.card }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/explore'))} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={c.primary} /></View>
      ) : !place ? (
        <View style={styles.center}><Text style={{ color: c.textSecondary }}>가게를 찾을 수 없어요</Text></View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }}>
          <View style={{ padding: 16 }}>
            <Text style={[styles.name, { color: c.text }]}>{place.name}</Text>
            <Text style={[styles.rating, { color: c.text }]}>⭐ {(place.rating ?? 0) > 0 ? (place.rating ?? 0).toFixed(1) : '신규'} <Text style={{ color: c.textSecondary, fontWeight: '600' }}>· 리뷰 {place.review_count ?? 0}</Text></Text>
            <Text style={[styles.cat, { color: c.textSecondary }]}>{prettyCat(place.category)}</Text>
            {place.address ? (
              <Pressable onPress={() => Linking.openURL(`https://map.naver.com/v5/search/${encodeURIComponent(place.name)}`)}>
                <Text style={[styles.addr, { color: c.textSecondary }]}>📍 {place.address}  <Text style={{ color: c.primary, fontWeight: '700' }}>지도 ›</Text></Text>
              </Pressable>
            ) : null}

            {session && (profile?.role === 'owner' ? (
              <Pressable style={[styles.claimBtn, { borderColor: c.border }]} onPress={() => router.push('/store-new')}>
                <Text style={{ color: c.primary, fontWeight: '800', fontSize: 13 }}>🏪 이 가게 사장님이세요? 매장 등록하기</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.claimBtn, { borderColor: c.border }]} onPress={() => router.push('/account-edit')}>
                <Text style={{ color: c.primary, fontWeight: '800', fontSize: 13 }}>💼 사업주세요? 사업자 인증하고 매장 등록하기</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ paddingHorizontal: 16 }}>
            <ReactionBar targetType="place" targetId={String(id)} title={place.name} sharePath={`/place/${id}`} />
          </View>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <View style={{ padding: 16 }}>
            <Text style={[styles.sect, { color: c.text }]}>리뷰 쓰기</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRating(n)} hitSlop={4}><Text style={{ fontSize: 30 }}>{n <= rating ? '⭐' : '☆'}</Text></Pressable>
              ))}
            </View>
            <View style={styles.verifyRow}>
              <Pressable onPress={doGps} style={[styles.vBtn, { borderColor: method === 'gps' && gpsVerified ? c.verify : c.border, backgroundColor: method === 'gps' && gpsVerified ? c.verify : c.card }]}>
                <Text style={{ color: method === 'gps' && gpsVerified ? '#fff' : c.text, fontWeight: '700', fontSize: 13 }}>{verifying ? '확인중...' : method === 'gps' && gpsVerified ? '✅ 방문 인증됨' : '📍 방문 인증'}</Text>
              </Pressable>
              <Pressable onPress={pickReceipt} style={[styles.vBtn, { borderColor: method === 'receipt' && receipt ? c.verify : c.border, backgroundColor: method === 'receipt' && receipt ? c.verify : c.card }]}>
                <Text style={{ color: method === 'receipt' && receipt ? '#fff' : c.text, fontWeight: '700', fontSize: 13 }}>🧾 영수증 {receipt ? '첨부됨' : '인증'}</Text>
              </Pressable>
            </View>
            <Text style={[styles.vNote, { color: c.textSecondary }]}>인증한 리뷰만 별점에 반영돼요 · 미인증 리뷰는 표시되지만 점수엔 미반영</Text>
            <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="이 가게는 어땠나요? (선택)" placeholderTextColor={c.textSecondary} value={body} onChangeText={setBody} multiline />
            {msg ? <Text style={{ color: msg.startsWith('✅') || msg.startsWith('🧾') ? c.verify : '#E5484D', fontWeight: '700', marginTop: 6 }}>{msg}</Text> : null}
            <Pressable style={[styles.btn, { backgroundColor: c.primary }]} onPress={submit} disabled={sending}>
              <Text style={[styles.btnTxt, { color: c.onPrimary }]}>{sending ? '등록중...' : session ? '리뷰 등록' : '로그인하고 리뷰 쓰기'}</Text>
            </Pressable>
          </View>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {profile?.is_admin && pendingReceipts.length > 0 && (
            <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
              <Text style={[styles.sect, { color: c.text, marginBottom: 8 }]}>🧾 영수증 수동 검토 {pendingReceipts.length}건 (OCR 실패분)</Text>
              {pendingReceipts.map((rv) => (
                <View key={rv.id} style={[styles.reqCard, { borderColor: c.border, backgroundColor: c.card }]}>
                  <Text style={[styles.rNick, { color: c.text }]}>{rv.profiles?.nickname ?? '회원'} · {'⭐'.repeat(rv.rating)}</Text>
                  {rv.receipt_url ? <Image source={{ uri: rv.receipt_url }} style={styles.receiptImg} contentFit="cover" /> : null}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <Pressable style={[styles.reqApprove, { backgroundColor: c.primary }]} onPress={() => approveReview(rv.id)}><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 12 }}>승인</Text></Pressable>
                    <Pressable style={[styles.reqReject, { borderColor: c.border }]} onPress={() => rejectReview(rv.id)}><Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 12 }}>거절</Text></Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Text style={[styles.sect, { color: c.text, paddingHorizontal: 16, paddingTop: 14 }]}>리뷰 {reviews.length}</Text>
          {reviews.length === 0 ? (
            <Text style={[styles.empty, { color: c.textSecondary }]}>아직 리뷰가 없어요. 첫 리뷰를 남겨보세요!</Text>
          ) : (
            reviews.map((rv) => (
              <View key={rv.id} style={[styles.review, { borderColor: c.border }]}>
                <View style={styles.reviewTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={[styles.rNick, { color: c.text }]}>{rv.profiles?.nickname ?? '회원'}</Text>
                    {rv.verified ? (
                      <View style={[styles.vBadge, { backgroundColor: c.verify }]}><Text style={styles.vBadgeTxt}>{rv.verify_method === 'gps' ? '✅ 방문' : '🧾 영수증'}</Text></View>
                    ) : rv.verify_method === 'receipt' ? (
                      <View style={[styles.vBadge, { backgroundColor: c.primarySoft }]}><Text style={[styles.vBadgeTxt, { color: c.primaryDeep }]}>🧾 검토중</Text></View>
                    ) : (
                      <View style={[styles.vBadge, { backgroundColor: c.backgroundElement }]}><Text style={[styles.vBadgeTxt, { color: c.textSecondary }]}>미인증</Text></View>
                    )}
                  </View>
                  <Text style={styles.rStars}>{'⭐'.repeat(rv.rating)}</Text>
                </View>
                {rv.body ? <Text style={[styles.rBody, { color: c.textSecondary }]}>{rv.body}</Text> : null}
                {session && rv.author_id === session.user.id ? (
                  <Pressable onPress={() => deleteReview(rv.id)} hitSlop={6} style={{ alignSelf: 'flex-end', marginTop: 4 }}>
                    <Text style={{ color: '#E5484D', fontSize: 11, fontWeight: '800' }}>🗑 삭제</Text>
                  </Pressable>
                ) : session ? (
                  <Pressable onPress={() => router.push(`/report?type=review&id=${rv.id}&label=${encodeURIComponent((rv.body ?? '리뷰').slice(0, 30))}`)} hitSlop={6} style={{ alignSelf: 'flex-end', marginTop: 4 }}>
                    <Text style={{ color: c.textSecondary, fontSize: 11, fontWeight: '700' }}>🚩 신고</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 22, fontWeight: '900' },
  rating: { fontSize: 16, fontWeight: '800', marginTop: 8 },
  cat: { fontSize: 13, marginTop: 6 },
  addr: { fontSize: 13, marginTop: 6, lineHeight: 20 },
  claimBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center', marginTop: 14 },
  divider: { height: 8 },
  sect: { fontSize: 15, fontWeight: '800' },
  stars: { flexDirection: 'row', gap: 4, marginTop: 10, marginBottom: 10 },
  verifyRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  vBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  vNote: { fontSize: 11.5, lineHeight: 17, marginBottom: 10 },
  vBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  vBadgeTxt: { fontSize: 10, fontWeight: '800', color: '#fff' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 70, textAlignVertical: 'top' },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  btnTxt: { fontSize: 15, fontWeight: '800' },
  empty: { fontSize: 13, paddingHorizontal: 16, paddingVertical: 16 },
  review: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rNick: { fontSize: 13, fontWeight: '700' },
  rStars: { fontSize: 12 },
  rBody: { fontSize: 14, lineHeight: 20, marginTop: 5 },
  reqCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  reqApprove: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  reqReject: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  receiptImg: { width: 100, height: 100, borderRadius: 8, marginTop: 8 },
});
