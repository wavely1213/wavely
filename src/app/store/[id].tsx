import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReactionBar } from '@/components/ReactionBar';
import { Colors } from '@/constants/theme';
import { canEditStore, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// 두 좌표 사이 거리(m)
function distM(la1: number, lo1: number, la2: number, lo2: number): number {
  const R = 6371000, rad = Math.PI / 180;
  const dLa = (la2 - la1) * rad, dLo = (lo2 - lo1) * rad;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * rad) * Math.cos(la2 * rad) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const VISIT_RADIUS = 300; // 방문인증 허용 반경(m)

type Store = { id: string; name: string; category: string | null; categories: string[] | null; address: string | null; photo: string | null; biz_verified: boolean; is_ad: boolean; rating: number | null; review_count: number | null; lat: number | null; lng: number | null };
type Review = { id: string; rating: number; body: string | null; created_at: string; author_id: string; verify_method: string | null; verified: boolean; receipt_url: string | null; profiles: { nickname: string } | null };

export default function StoreDetailScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();

  const [store, setStore] = useState<Store | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
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

  const doGps = async () => {
    setMsg('');
    if (store?.lat == null || store?.lng == null) { setMsg('이 매장은 위치 정보가 없어 방문 인증이 어려워요. 영수증으로 인증해주세요.'); return; }
    setVerifying(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setMsg('위치 권한을 허용해주세요.'); setVerifying(false); return; }
      const pos = await Location.getCurrentPositionAsync({});
      const d = distM(pos.coords.latitude, pos.coords.longitude, store.lat, store.lng);
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

  const load = useCallback(async () => {
    if (!id) return;
    const { data: s } = await supabase.from('stores').select('id,name,category,categories,address,photo,biz_verified,is_ad,rating,review_count,lat,lng,owner_id,hours,phone').eq('id', id).single();
    setStore((s as Store) ?? null);
    const { data: r } = await supabase.from('reviews').select('id,rating,body,created_at,author_id,verify_method,verified,receipt_url,profiles(nickname)').eq('store_id', id).order('verified', { ascending: false }).order('created_at', { ascending: false });
    setReviews((r as unknown as Review[]) ?? []);
    const { data: cr } = await supabase.from('store_change_requests').select('id,payload,note,status,created_at,requester_id').eq('store_id', id).eq('status', 'pending').order('created_at', { ascending: false });
    setRequests((cr as any[]) ?? []);
    setLoading(false);
  }, [id]);

  const canEdit = canEditStore(profile, store);
  const approve = async (req: any) => {
    await supabase.from('stores').update(req.payload).eq('id', id);
    await supabase.from('store_change_requests').update({ status: 'approved' }).eq('id', req.id);
    load();
  };
  const reject = async (req: any) => {
    await supabase.from('store_change_requests').update({ status: 'rejected' }).eq('id', req.id);
    load();
  };
  const approveReview = async (rid: string) => { await supabase.from('reviews').update({ verified: true }).eq('id', rid); load(); };
  const rejectReview = async (rid: string) => { await supabase.from('reviews').update({ verify_method: 'none' }).eq('id', rid); load(); };
  const deleteReview = async (rid: string) => { await supabase.from('reviews').delete().eq('id', rid); load(); };
  const pendingReceipts = reviews.filter((r) => r.verify_method === 'receipt' && !r.verified);

  const openStoreRoom = async () => {
    if (!session) { router.push('/login'); return; }
    const { data, error } = await supabase.rpc('get_or_create_store_room', { sid: id, sname: store?.name ?? '매장', me_nick: profile?.nickname ?? '회원' });
    if (!error && data) router.push(`/chat/${data}`);
  };
  const messageOwner = async () => {
    if (!session) { router.push('/login'); return; }
    const ownerId = (store as any)?.owner_id;
    if (!ownerId) return;
    const { data: own } = await supabase.from('profiles').select('nickname').eq('id', ownerId).single();
    const { data, error } = await supabase.rpc('get_or_create_dm', { target: ownerId, target_nick: (own as any)?.nickname ?? '사장님', me_nick: profile?.nickname ?? '회원' });
    if (error) { setMsg('상대가 차단했거나 요청할 수 없어요'); return; }
    if (data) router.push(`/chat/${data}`);
  };

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submit = async () => {
    setMsg('');
    if (!session) { router.push('/login'); return; }
    if (rating < 1) { setMsg('별점을 선택해주세요'); return; }
    setSending(true);
    let receiptUrl: string | null = null;
    let vm: string = 'none';
    if (method === 'gps' && gpsVerified) { vm = 'gps'; }
    else if (method === 'receipt' && receipt) {
      receiptUrl = await uploadReceipt(receipt);
      if (!receiptUrl) { setMsg('영수증 업로드 실패'); setSending(false); return; }
      vm = 'receipt';
    }
    // 인증 플래그는 클라이언트가 정하지 않음(서버 트리거가 막음) → 항상 false로 넣고 서버 함수가 판정
    const { data: up, error } = await supabase.from('reviews').upsert(
      { store_id: id, author_id: session.user.id, rating, body: body.trim() || null, verify_method: vm, verified: false, receipt_url: receiptUrl },
      { onConflict: 'store_id,author_id' },
    ).select('id').single();
    if (error) { setSending(false); setMsg('등록 실패: ' + error.message); return; }
    const reset = () => { setRating(0); setBody(''); setMethod('none'); setGpsVerified(false); setGpsCoords(null); setReceipt(null); };

    // GPS 방문 인증 → 서버 거리 재검증
    if (vm === 'gps' && up?.id && gpsCoords) {
      setMsg('📍 방문 위치를 확인하는 중...');
      const { data: g } = await supabase.functions.invoke('gps-verify', { body: { review_id: up.id, lat: gpsCoords.lat, lng: gpsCoords.lng } });
      setSending(false); reset();
      setMsg((g as any)?.matched ? '✅ 방문 인증 완료! 인증 리뷰로 등록됐어요' : '리뷰는 등록됐지만 위치 인증은 실패했어요');
      load();
      return;
    }
    // 영수증 → OCR 자동 인증
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

  const cats = store ? (store.categories && store.categories.length ? store.categories.join(' · ') : store.category) : '';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border, backgroundColor: c.card }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={c.primary} /></View>
      ) : !store ? (
        <View style={styles.center}><Text style={{ color: c.textSecondary }}>매장을 찾을 수 없어요</Text></View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }}>
          {store.photo ? <Image source={{ uri: store.photo }} style={styles.hero} contentFit="cover" /> : <View style={[styles.hero, { backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ fontSize: 40 }}>🏪</Text></View>}

          <View style={{ padding: 16 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.name, { color: c.text }]}>{store.name}</Text>
              {store.is_ad && <View style={[styles.badge, { backgroundColor: c.primary }]}><Text style={styles.badgeTxt}>광고</Text></View>}
              {store.biz_verified && <View style={[styles.badge, { backgroundColor: c.verify }]}><Text style={styles.badgeTxt}>✓ 인증</Text></View>}
            </View>
            <Text style={[styles.rating, { color: c.text }]}>⭐ {(store.rating ?? 0) > 0 ? (store.rating ?? 0).toFixed(1) : '신규'} <Text style={{ color: c.textSecondary, fontWeight: '600' }}>· 리뷰 {store.review_count ?? 0}</Text></Text>
            <Text style={[styles.cat, { color: c.textSecondary }]}>{cats}</Text>
            {store.address ? (
              <Pressable onPress={() => Linking.openURL(`https://map.naver.com/v5/search/${encodeURIComponent(store.name)}`)}>
                <Text style={[styles.addr, { color: c.textSecondary }]}>📍 {store.address}  <Text style={{ color: c.primary, fontWeight: '700' }}>지도 ›</Text></Text>
              </Pressable>
            ) : null}
            {(store as any).hours ? <Text style={[styles.addr, { color: c.textSecondary }]}>🕒 {(store as any).hours}</Text> : null}
            {(store as any).phone ? (
              <Pressable onPress={() => Linking.openURL(`tel:${String((store as any).phone).replace(/[^0-9+]/g, '')}`)}>
                <Text style={[styles.addr, { color: c.textSecondary }]}>📞 {(store as any).phone}  <Text style={{ color: c.primary, fontWeight: '700' }}>전화 ›</Text></Text>
              </Pressable>
            ) : null}

            <View style={{ marginTop: 4 }}>
              <ReactionBar targetType="store" targetId={String(id)} title={store.name} sharePath={`/store/${id}`} />
            </View>

            <Pressable style={[styles.roomBtn, { backgroundColor: c.primary, marginTop: 12 }]} onPress={openStoreRoom}>
              <Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 14 }}>💬 실시간 소식방 — “오늘 영업해요?” 물어보기</Text>
            </Pressable>
            {session && (store as any)?.owner_id && (store as any).owner_id !== session.user.id ? (
              <Pressable style={[styles.editBtn, { borderColor: c.primary, marginTop: 8 }]} onPress={messageOwner}>
                <Text style={{ color: c.primary, fontWeight: '800', fontSize: 13 }}>✉️ 사장님께 1:1 문의</Text>
              </Pressable>
            ) : null}

            <Pressable style={[styles.editBtn, { borderColor: c.border, marginTop: 8 }]} onPress={() => (session ? router.push(`/store-new?id=${id}`) : router.push('/login'))}>
              <Text style={{ color: canEdit ? c.primary : c.textSecondary, fontWeight: '800', fontSize: 13 }}>{canEdit ? '✏️ 매장 정보 수정' : '✏️ 정보 수정 신청'}</Text>
            </Pressable>
            {session && (store as any)?.owner_id === session.user.id ? (
              <Pressable style={[styles.editBtn, { borderColor: c.primary, marginTop: 8 }]} onPress={() => router.push(`/ad?store=${id}`)}>
                <Text style={{ color: c.primary, fontWeight: '800', fontSize: 13 }}>📢 광고 신청 · 관리{store.is_ad ? ' (노출중)' : ''}</Text>
              </Pressable>
            ) : null}
          </View>

          {/* 변경 신청 검토 (사장님·직원·관리자) */}
          {canEdit && requests.length > 0 && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
              <Text style={[styles.sect, { color: c.text, marginBottom: 8 }]}>📨 변경 신청 {requests.length}건</Text>
              {requests.map((req) => (
                <View key={req.id} style={[styles.reqCard, { borderColor: c.border, backgroundColor: c.card }]}>
                  <Text style={[styles.reqName, { color: c.text }]}>{req.payload?.name ?? '(이름 없음)'}</Text>
                  <Text style={[styles.reqSub, { color: c.textSecondary }]} numberOfLines={2}>
                    {req.payload?.categories?.join(' · ') ?? req.payload?.category ?? ''}{req.payload?.address ? ` · ${req.payload.address}` : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <Pressable style={[styles.reqApprove, { backgroundColor: c.primary }]} onPress={() => approve(req)}><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 12 }}>승인(반영)</Text></Pressable>
                    <Pressable style={[styles.reqReject, { borderColor: c.border }]} onPress={() => reject(req)}><Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 12 }}>거절</Text></Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {/* 리뷰 작성 */}
          <View style={{ padding: 16 }}>
            <Text style={[styles.sect, { color: c.text }]}>리뷰 쓰기</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRating(n)} hitSlop={4}>
                  <Text style={{ fontSize: 30 }}>{n <= rating ? '⭐' : '☆'}</Text>
                </Pressable>
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

            <TextInput
              style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
              placeholder="이 매장은 어땠나요? (선택)"
              placeholderTextColor={c.textSecondary}
              value={body}
              onChangeText={setBody}
              multiline
            />
            {msg ? <Text style={{ color: '#E5484D', fontWeight: '700', marginTop: 6 }}>{msg}</Text> : null}
            <Pressable style={[styles.btn, { backgroundColor: c.primary }]} onPress={submit} disabled={sending}>
              <Text style={[styles.btnTxt, { color: c.onPrimary }]}>{sending ? '등록중...' : session ? '리뷰 등록' : '로그인하고 리뷰 쓰기'}</Text>
            </Pressable>
          </View>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {/* 영수증 검토 (OCR 자동인증 실패분만 관리자 수동 확인) */}
          {profile?.is_admin && pendingReceipts.length > 0 && (
            <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
              <Text style={[styles.sect, { color: c.text, marginBottom: 8 }]}>🧾 영수증 수동 검토 {pendingReceipts.length}건 (OCR 자동인증 실패분)</Text>
              {pendingReceipts.map((rv) => (
                <View key={rv.id} style={[styles.reqCard, { borderColor: c.border, backgroundColor: c.card }]}>
                  <Text style={[styles.reqName, { color: c.text }]}>{rv.profiles?.nickname ?? '회원'} · {'⭐'.repeat(rv.rating)}</Text>
                  {rv.body ? <Text style={[styles.reqSub, { color: c.textSecondary }]} numberOfLines={2}>{rv.body}</Text> : null}
                  {rv.receipt_url ? <Image source={{ uri: rv.receipt_url }} style={styles.receiptImg} contentFit="cover" /> : null}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <Pressable style={[styles.reqApprove, { backgroundColor: c.primary }]} onPress={() => approveReview(rv.id)}><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 12 }}>승인(인증)</Text></Pressable>
                    <Pressable style={[styles.reqReject, { borderColor: c.border }]} onPress={() => rejectReview(rv.id)}><Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 12 }}>거절</Text></Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* 리뷰 목록 */}
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
  hero: { width: '100%', height: 200 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 22, fontWeight: '900' },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  badgeTxt: { fontSize: 11, fontWeight: '800', color: '#fff' },
  rating: { fontSize: 16, fontWeight: '800', marginTop: 8 },
  cat: { fontSize: 13, marginTop: 6 },
  addr: { fontSize: 13, marginTop: 6, lineHeight: 20 },
  editBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center', marginTop: 14 },
  roomBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  reqCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  reqName: { fontSize: 14, fontWeight: '800' },
  reqSub: { fontSize: 12, marginTop: 3 },
  reqApprove: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  reqReject: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  receiptImg: { width: 100, height: 100, borderRadius: 8, marginTop: 8 },
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
});
