import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/lib/auth';
import { requestAdPayment, requestBillingKey, PAY_AVAILABLE } from '@/lib/pay';
import { supabase } from '@/lib/supabase';

const BANNER_TIERS = [
  { fee: 60000, label: '동네 배너', desc: '목록 상단 배너 노출' },
  { fee: 100000, label: '프리미엄 배너', desc: '상단 + 노출 빈도 ↑' },
];
const STATUS_LABEL: Record<string, string> = { pending_payment: '결제 대기', under_review: '🕒 검토중', active: '노출중', paused: '일시정지', expired: '종료', rejected: '반려' };
const TOPUP_AMOUNTS = [10000, 30000, 50000, 100000];

type Store = { id: string; name: string; is_ad: boolean; ad_weight: number | null };
type Ad = { id: string; store_id: string; format: string; plan: string; bid_amount: number; monthly_fee: number; status: string; ends_at: string | null; reject_reason: string | null };

export default function AdScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session, profile } = useAuth();
  const { store: storeParam } = useLocalSearchParams<{ store?: string }>();
  const isAdmin = !!profile?.is_admin;

  const [stores, setStores] = useState<Store[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [adStats, setAdStats] = useState<Record<string, { impressions: number; clicks: number }>>({});
  const [daily, setDaily] = useState<{ d: string; impressions: number; clicks: number }[]>([]);
  const [wallet, setWallet] = useState<{ balance: number; free?: number; paid?: number; free_expires_at?: string | null; unlimited?: boolean; card: { id: string; card_name: string; masked: string | null } | null; ledger: any[] }>({ balance: 0, free: 0, card: null, ledger: [] });
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletMsg, setWalletMsg] = useState('');
  const [pendingAll, setPendingAll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selStore, setSelStore] = useState<string>('');
  const [format, setFormat] = useState<'rank' | 'banner'>('rank');
  const [bid, setBid] = useState('300');
  const [bannerTier, setBannerTier] = useState(BANNER_TIERS[0].fee);
  const [bannerPay, setBannerPay] = useState<'wallet' | 'card'>(PAY_AVAILABLE ? 'card' : 'wallet');
  const [bannerImg, setBannerImg] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [headline, setHeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const pickBanner = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled && res.assets[0]) setBannerImg(res.assets[0]);
  };
  const uploadBanner = async (asset: ImagePicker.ImagePickerAsset): Promise<string | null> => {
    try {
      const resp = await fetch(asset.uri);
      const ab = await resp.arrayBuffer();
      const ct = asset.mimeType ?? 'image/jpeg';
      const ext = ct.includes('png') ? 'png' : 'jpg';
      const path = `ads/${session!.user.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('post-images').upload(path, ab, { contentType: ct });
      if (error) return null;
      return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
    } catch { return null; }
  };

  const load = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    const { data: st } = await supabase.from('stores').select('id,name,is_ad,ad_weight').eq('owner_id', session.user.id);
    const list = (st as Store[]) ?? [];
    setStores(list);
    if (!selStore && list.length) setSelStore(storeParam && list.find((s) => s.id === storeParam) ? String(storeParam) : list[0].id);
    const { data: ad } = await supabase.from('ads').select('id,store_id,format,plan,bid_amount,monthly_fee,status,ends_at,reject_reason').eq('owner_id', session.user.id).order('created_at', { ascending: false });
    setAds((ad as Ad[]) ?? []);
    // 내 광고 성과(노출·클릭)
    const { data: statRows } = await supabase.rpc('my_ad_stats');
    const sm: Record<string, { impressions: number; clicks: number }> = {};
    ((statRows as any[]) ?? []).forEach((r) => { sm[r.ad_id] = { impressions: Number(r.impressions) || 0, clicks: Number(r.clicks) || 0 }; });
    setAdStats(sm);
    const { data: dd } = await supabase.rpc('my_ad_daily', { p_days: 14 });
    setDaily(((dd as any[]) ?? []).map((r) => ({ d: String(r.d), impressions: Number(r.impressions) || 0, clicks: Number(r.clicks) || 0 })));
    // 광고비 지갑 (잔액·카드·내역)
    const { data: w } = await supabase.rpc('my_wallet');
    if (w) setWallet({ balance: 0, free: 0, unlimited: false, card: null, ledger: [], ...(w as any) });
    if (profile?.is_admin) {
      const { data: pa } = await supabase.from('ads').select('id,store_id,format,plan,bid_amount,monthly_fee,status,ends_at,banner_image,headline,stores(name)').eq('status', 'under_review').order('created_at', { ascending: false });
      setPendingAll((pa as any[]) ?? []);
    }
    setLoading(false);
  }, [session, profile?.is_admin]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const apply = async () => {
    setMsg('');
    if (!selStore) { setMsg('매장을 선택해주세요'); return; }
    const bidNum = Math.max(parseInt(bid || '0', 10) || 0, 0);
    if (format === 'rank' && bidNum < 100) { setMsg('입찰가는 100원 이상으로 설정해주세요'); return; }
    if (format === 'banner' && !bannerImg) { setMsg('배너 이미지를 첨부해주세요'); return; }
    if (format === 'banner' && bannerPay === 'card' && !profile?.phone) { setMsg('카드 결제엔 전화번호가 필요해요. [내정보 수정]에서 전화번호를 먼저 등록해주세요.'); return; }
    if (format === 'banner' && bannerPay === 'wallet' && !wallet.unlimited && wallet.balance < bannerTier) { setMsg(`지갑 잔액이 부족해요 (잔액 ${wallet.balance.toLocaleString()}원 / 필요 ${bannerTier.toLocaleString()}원). 아래 [광고비 지갑]에서 충전해주세요.`); return; }
    setBusy(true);

    // 배너 이미지 업로드
    let bannerUrl: string | null = null;
    if (format === 'banner' && bannerImg) {
      bannerUrl = await uploadBanner(bannerImg);
      if (!bannerUrl) { setBusy(false); setMsg('배너 이미지 업로드 실패'); return; }
    }

    // 1) 광고 신청 생성 (결제 대기) — 가산점형은 입찰만
    const isBanner = format === 'banner';
    const { data: ins, error } = await supabase.from('ads').insert({
      store_id: selStore, owner_id: session!.user.id,
      format, plan: isBanner ? 'flat' : 'bid',
      monthly_fee: isBanner ? bannerTier : 0,
      bid_amount: isBanner ? 0 : bidNum,
      banner_image: bannerUrl, headline: isBanner ? (headline.trim() || null) : null,
      status: isBanner ? 'pending_payment' : 'under_review',
    }).select('id').single();
    if (error || !ins) { setBusy(false); setMsg('신청 실패: ' + (error?.message ?? '')); return; }

    // 2) 결제
    if (isBanner && bannerPay === 'wallet') {
      // 배너 = 지갑 잔액으로 결제 (서버에서 차감 + 검토중 전환)
      const { data: v } = await supabase.rpc('pay_ad_from_balance', { p_ad_id: ins.id });
      setBusy(false);
      if ((v as any)?.ok) setMsg('✅ 지갑 결제 완료! 관리자가 내용·사진을 검토한 뒤 노출돼요. (검토중)');
      else {
        setMsg('지갑 결제 실패: ' + ((v as any)?.reason ?? '다시 시도해주세요'));
        await supabase.from('ads').delete().eq('id', ins.id); // 실패한 신청 정리
      }
    } else if (isBanner) {
      // 배너 = 정액 선결제 (PortOne 카드)
      const orderName = `${stores.find((s) => s.id === selStore)?.name ?? '매장'} 배너광고`;
      // 주문번호(oid)는 PG 제한(이니시스 40자)이 있어 짧고 유일하게 생성 (ad_id는 verify-payment에 별도 전달)
      const paymentId = `ad-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const pay = await requestAdPayment({ paymentId, orderName, amount: bannerTier, email: session!.user.email ?? undefined, fullName: profile?.nickname, phoneNumber: profile?.phone ?? undefined });
      if (!pay.ok) { setBusy(false); setMsg('결제가 완료되지 않았어요: ' + pay.reason); load(); return; }
      const { data: v } = await supabase.functions.invoke('verify-payment', { body: { ad_id: ins.id, payment_id: paymentId, expected_amount: bannerTier } });
      setBusy(false);
      if ((v as any)?.ok) setMsg('✅ 결제 완료! 관리자가 내용·사진을 검토한 뒤 노출돼요. (검토중)');
      else setMsg('결제 검증 실패: ' + ((v as any)?.reason ?? '잠시 후 다시 시도해주세요'));
    } else {
      // 입찰형(클릭당 과금) = 광고비 지갑에서 클릭당 차감. 관리자 검토 후 노출, 잔액이 있어야 노출 유지.
      setBusy(false);
      setMsg('✅ 클릭 광고 신청 접수! 아래 [광고비 지갑]에서 충전해두면 검토 후 노출돼요. (잔액에서 클릭당 차감)');
    }
    load();
  };

  const adminActivate = async (adId: string) => { await supabase.functions.invoke('ad-activate', { body: { ad_id: adId, days: 30 } }); load(); };
  const adminReject = async (adId: string) => { await supabase.rpc('admin_reject_ad', { target: adId }); load(); };
  const requestRereview = async (adId: string) => { await supabase.rpc('request_ad_rereview', { target: adId }); load(); };

  // 자동결제 카드 등록 (빌링키 발급 → 서버 검증·저장)
  const registerCard = async () => {
    setWalletMsg('');
    if (!profile?.phone) { setWalletMsg('카드 등록엔 전화번호가 필요해요. [내정보 수정]에서 먼저 등록해주세요.'); return; }
    setWalletBusy(true);
    const issueId = `bk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const r = await requestBillingKey({ issueId, fullName: profile?.nickname, phoneNumber: profile?.phone ?? undefined, email: session!.user.email ?? undefined });
    if (!r.ok) { setWalletBusy(false); setWalletMsg('카드 등록 실패: ' + r.reason); return; }
    const { data: v } = await supabase.functions.invoke('register-billing-key', { body: { billing_key: r.billingKey } });
    setWalletBusy(false);
    if ((v as any)?.ok) { setWalletMsg('✅ 카드 등록 완료!'); load(); }
    else setWalletMsg('카드 저장 실패: ' + ((v as any)?.reason ?? '다시 시도해주세요'));
  };

  // 광고비 충전 (등록 카드로 결제 → 잔액 적립)
  const topUp = async (amount: number) => {
    setWalletMsg('');
    if (!wallet.card) { setWalletMsg('먼저 카드를 등록해주세요.'); return; }
    setWalletBusy(true);
    const { data: v } = await supabase.functions.invoke('charge-balance', { body: { amount } });
    setWalletBusy(false);
    if ((v as any)?.ok) { setWalletMsg(`✅ ${amount.toLocaleString()}원 충전 완료!`); load(); }
    else setWalletMsg('충전 실패: ' + ((v as any)?.reason ?? '다시 시도해주세요'));
  };

  // 사업주 인증 안된 경우
  if (session && profile && !(profile.role === 'owner' && profile.biz_verified)) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
        <Header c={c} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View style={styles.center}>
          <Icon name="megaphone" size={40} color={c.textSecondary} />
          <Text style={[styles.bigTxt, { color: c.text }]}>광고는 사업주만 신청할 수 있어요</Text>
          <Text style={[styles.subTxt, { color: c.textSecondary }]}>사업자 인증 후 내 매장을 등록하면{'\n'}동네 상위 노출 광고를 쓸 수 있어요</Text>
          <Pressable style={[styles.btn, { backgroundColor: c.primary, marginTop: 18 }]} onPress={() => router.push('/account-edit')}>
            <Text style={[styles.btnTxt, { color: c.onPrimary }]}>사업자 인증하러 가기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <Header c={c} onBack={goBack} />
      {loading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 30 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={[styles.banner, { backgroundColor: c.primarySoft }]}>
            <Text style={[styles.bannerTxt, { color: c.primaryDeep }]}>우리 동네 사람들에게 매장을 상위 노출하세요. 광고는 가산점이라 별점·리뷰 관리도 함께 하면 효과가 커져요.</Text>
          </View>

          {stores.length === 0 ? (
            <View style={[styles.box, { backgroundColor: c.card, borderColor: c.border, alignItems: 'center' }]}>
              <Text style={{ color: c.text, fontWeight: '700', marginBottom: 6 }}>등록된 내 매장이 없어요</Text>
              <Pressable style={[styles.btn, { backgroundColor: c.primary }]} onPress={() => router.push('/store-new')}><Text style={[styles.btnTxt, { color: c.onPrimary }]}>매장 등록하기</Text></Pressable>
            </View>
          ) : (
            <>
              <Text style={[styles.label, { color: c.textSecondary }]}>광고할 매장</Text>
              <View style={styles.chips}>
                {stores.map((s) => (
                  <Pressable key={s.id} onPress={() => setSelStore(s.id)} style={[styles.chip, { backgroundColor: selStore === s.id ? c.primary : c.card, borderColor: selStore === s.id ? c.primary : c.border }]}>
                    <Text style={[styles.chipTxt, { color: selStore === s.id ? c.onPrimary : c.text }]}>{s.name}{s.is_ad ? ' · 광고중' : ''}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.label, { color: c.textSecondary, marginTop: 16 }]}>광고 형태</Text>
              <View style={styles.chips}>
                <Pressable onPress={() => setFormat('rank')} style={[styles.planTab, { backgroundColor: format === 'rank' ? c.primary : c.card, borderColor: format === 'rank' ? c.primary : c.border, flexDirection: 'row', gap: 6 }]}>
                  <Icon name="chart" size={14} color={format === 'rank' ? c.onPrimary : c.text} />
                  <Text style={[styles.planTabTxt, { color: format === 'rank' ? c.onPrimary : c.text }]}>노출 가산점</Text>
                </Pressable>
                <Pressable onPress={() => setFormat('banner')} style={[styles.planTab, { backgroundColor: format === 'banner' ? c.primary : c.card, borderColor: format === 'banner' ? c.primary : c.border, flexDirection: 'row', gap: 6 }]}>
                  <Icon name="image" size={14} color={format === 'banner' ? c.onPrimary : c.text} />
                  <Text style={[styles.planTabTxt, { color: format === 'banner' ? c.onPrimary : c.text }]}>노출 배너</Text>
                </Pressable>
              </View>
              <Text style={[styles.notice, { color: c.textSecondary, marginTop: 6 }]}>
                {format === 'rank' ? '검색·목록에서 순위를 올려주는 광고 (별점이 낮으면 한계가 있어요).' : '동네 목록 맨 위에 이미지 배너로 크게 노출되는 광고예요.'}
              </Text>

              {/* 가산점형 — 입찰(클릭당)만 */}
              {format === 'rank' && (
                <View style={[styles.box, { backgroundColor: c.card, borderColor: c.border, marginTop: 12 }]}>
                  <Text style={[styles.tierName, { color: c.text }]}>클릭당 입찰가</Text>
                  <Text style={[styles.tierDesc, { color: c.textSecondary, marginBottom: 8 }]}>입찰가가 높을수록 같은 동네 광고 중 위로 올라가요 (상한 있음 · 클릭당 과금).</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput style={[styles.input, { flex: 1, backgroundColor: c.background, borderColor: c.border, color: c.text }]} value={bid} onChangeText={setBid} keyboardType="number-pad" placeholder="300" placeholderTextColor={c.textSecondary} />
                    <Text style={{ color: c.text, fontWeight: '700' }}>원 / 클릭</Text>
                  </View>
                </View>
              )}

              {/* 배너형 */}
              {format === 'banner' && (
                <>
                  <Text style={[styles.label, { color: c.textSecondary, marginTop: 16 }]}>매장 사진/로고 (정사각형 — 잘림 없이 깔끔하게 보여요)</Text>
                  <Pressable onPress={pickBanner} style={[styles.bannerPick, { borderColor: c.border, backgroundColor: c.card }]}>
                    {bannerImg ? (
                      <Image source={{ uri: bannerImg.uri }} style={styles.bannerPreview} contentFit="cover" />
                    ) : (
                      <Text style={{ color: c.textSecondary, fontWeight: '700' }}>＋ 배너 이미지 선택</Text>
                    )}
                  </Pressable>
                  <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text, marginTop: 10 }]} placeholder="배너 문구 (예: 오픈 기념 20% 할인!)" placeholderTextColor={c.textSecondary} value={headline} onChangeText={setHeadline} />

                  <Text style={[styles.label, { color: c.textSecondary, marginTop: 16 }]}>배너 요금제 (정액)</Text>
                  <View style={{ gap: 10, marginTop: 8 }}>
                    {BANNER_TIERS.map((t) => (
                      <Pressable key={t.fee} onPress={() => setBannerTier(t.fee)} style={[styles.tierCard, { backgroundColor: c.card, borderColor: bannerTier === t.fee ? c.primary : c.border, borderWidth: bannerTier === t.fee ? 2 : 1 }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.tierName, { color: c.text }]}>{t.label}</Text>
                          <Text style={[styles.tierDesc, { color: c.textSecondary }]}>{t.desc}</Text>
                        </View>
                        <Text style={[styles.tierFee, { color: c.primaryDeep }]}>월 {t.fee.toLocaleString()}원</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={[styles.label, { color: c.textSecondary, marginTop: 16 }]}>결제 방법</Text>
                  <View style={styles.chips}>
                    <Pressable onPress={() => setBannerPay('wallet')} style={[styles.planTab, { backgroundColor: bannerPay === 'wallet' ? c.primary : c.card, borderColor: bannerPay === 'wallet' ? c.primary : c.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Icon name="wallet" size={14} color={bannerPay === 'wallet' ? c.onPrimary : c.text} />
                        <Text style={[styles.planTabTxt, { color: bannerPay === 'wallet' ? c.onPrimary : c.text }]}>지갑 잔액</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '700', marginTop: 2, color: bannerPay === 'wallet' ? c.onPrimary : c.textSecondary }}>{wallet.unlimited ? '무제한' : `${wallet.balance.toLocaleString()}원`}</Text>
                    </Pressable>
                    {PAY_AVAILABLE && (
                      <Pressable onPress={() => setBannerPay('card')} style={[styles.planTab, { backgroundColor: bannerPay === 'card' ? c.primary : c.card, borderColor: bannerPay === 'card' ? c.primary : c.border }]}>
                        <Text style={[styles.planTabTxt, { color: bannerPay === 'card' ? c.onPrimary : c.text }]}>🧾 카드 결제</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', marginTop: 2, color: bannerPay === 'card' ? c.onPrimary : c.textSecondary }}>바로 결제</Text>
                      </Pressable>
                    )}
                  </View>
                  {bannerPay === 'wallet' && !wallet.unlimited && wallet.balance < bannerTier && (
                    <Text style={[styles.notice, { color: '#E5484D', marginTop: 6 }]}>잔액이 {(bannerTier - wallet.balance).toLocaleString()}원 부족해요. 아래 지갑에서 충전해주세요.</Text>
                  )}
                </>
              )}

              {msg ? <Text style={{ color: msg.startsWith('✅') ? c.verify : '#E5484D', fontWeight: '700', marginTop: 12 }}>{msg}</Text> : null}
              <Pressable style={[styles.btn, { backgroundColor: c.primary, marginTop: 14 }]} onPress={apply} disabled={busy}>
                <Text style={[styles.btnTxt, { color: c.onPrimary }]}>{busy ? '처리중...' : format === 'banner' ? `${bannerPay === 'wallet' ? '지갑으로 ' : '카드로 '}${bannerTier.toLocaleString()}원 결제 · 배너 광고 시작` : `입찰가 ${(parseInt(bid || '0', 10) || 0).toLocaleString()}원 · 광고 시작`}</Text>
              </Pressable>
              <Text style={[styles.notice, { color: c.textSecondary }]}>※ 배너 광고는 결제 확인 후 관리자 검토를 거쳐 노출돼요. 입찰 광고는 클릭당 과금이라 선결제 없이 지갑 잔액에서 빠져요.</Text>

              {/* 광고비 지갑 — 클릭 광고비 충전·자동결제 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 26, marginBottom: 10 }}>
                <Icon name="wallet" size={15} color={c.text} />
                <Text style={[styles.sect, { color: c.text, marginTop: 0, marginBottom: 0 }]}>광고비 지갑</Text>
              </View>
              <View style={[styles.box, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 13 }}>현재 잔액{wallet.unlimited ? ' · 개발자' : ''}</Text>
                  <Text style={{ color: c.primaryDeep, fontWeight: '900', fontSize: 26 }}>{wallet.unlimited ? '무제한' : `${wallet.balance.toLocaleString()}원`}</Text>
                </View>
                {!wallet.unlimited && (wallet.free ?? 0) > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <View style={{ backgroundColor: c.primarySoft, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}>
                      <Text style={{ color: c.verify, fontSize: 11.5, fontWeight: '800' }}>🎁 무료 {(wallet.free ?? 0).toLocaleString()}원</Text>
                    </View>
                    <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}>
                      <Text style={{ color: c.textSecondary, fontSize: 11.5, fontWeight: '700' }}>유료 {(wallet.paid ?? Math.max(0, wallet.balance - (wallet.free ?? 0))).toLocaleString()}원</Text>
                    </View>
                    {wallet.free_expires_at ? <Text style={{ color: c.textSecondary, fontSize: 10.5 }}>· 무료 만료 {String(wallet.free_expires_at).slice(0, 10)}</Text> : null}
                  </View>
                )}
                {!wallet.unlimited && (
                  <Text style={{ color: c.textSecondary, fontSize: 11.5, marginTop: 8, lineHeight: 17 }}>🎁 게시글·채팅·출석으로 <Text style={{ color: c.verify, fontWeight: '800' }}>무료 광고비</Text>가 쌓여요. 광고비 차감 시 무료분이 먼저 쓰여요. (1년 유효)</Text>
                )}

                {/* 등록 카드 — 실결제(카드등록·충전)는 웹 전문가센터에서. 네이티브에선 잔액·내역만 표시(스토어 정책). */}
                {PAY_AVAILABLE && (
                  <View style={{ marginTop: 14 }}>
                    {wallet.card ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.primarySoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
                          <Icon name="card" size={15} color={c.text} />
                          <Text style={{ color: c.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>{wallet.card.card_name}{wallet.card.masked ? ` · ${wallet.card.masked}` : ''}</Text>
                        </View>
                        <Pressable onPress={registerCard} disabled={walletBusy} style={[styles.chip, { borderColor: c.border, backgroundColor: c.card }]}><Text style={[styles.chipTxt, { color: c.textSecondary }]}>변경</Text></Pressable>
                      </View>
                    ) : (
                      <Pressable onPress={registerCard} disabled={walletBusy} style={[styles.btn, { backgroundColor: c.primary }]}><Text style={[styles.btnTxt, { color: c.onPrimary }]}>＋ 자동결제 카드 등록</Text></Pressable>
                    )}
                  </View>
                )}

                {/* 충전 */}
                {PAY_AVAILABLE && wallet.card && (
                  <>
                    <Text style={[styles.label, { color: c.textSecondary, marginTop: 16 }]}>충전 금액</Text>
                    <View style={[styles.chips, { marginTop: 8 }]}>
                      {TOPUP_AMOUNTS.map((a) => (
                        <Pressable key={a} onPress={() => topUp(a)} disabled={walletBusy} style={[styles.chip, { borderColor: c.primary, backgroundColor: c.primarySoft }]}>
                          <Text style={[styles.chipTxt, { color: c.primaryDeep }]}>{(a / 10000).toLocaleString()}만원</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}

                {walletBusy ? <ActivityIndicator color={c.primary} style={{ marginTop: 12 }} /> : null}
                {walletMsg ? <Text style={{ color: walletMsg.startsWith('✅') ? c.verify : '#E5484D', fontWeight: '700', marginTop: 12 }}>{walletMsg}</Text> : null}

                {/* 최근 내역 */}
                {wallet.ledger.length > 0 && (
                  <View style={{ marginTop: 16, borderTopWidth: 1, borderColor: c.border, paddingTop: 12 }}>
                    <Text style={[styles.label, { color: c.textSecondary, marginBottom: 6 }]}>최근 내역</Text>
                    {wallet.ledger.slice(0, 6).map((l, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 }}>
                        <Text style={{ color: c.textSecondary, fontSize: 12.5 }}>{(l.memo ?? l.type)} · {String(l.created_at).slice(5, 10).replace('-', '/')}</Text>
                        <Text style={{ color: l.amount > 0 ? c.verify : '#E5484D', fontSize: 13, fontWeight: '800' }}>{l.amount > 0 ? '+' : ''}{Number(l.amount).toLocaleString()}원</Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={[styles.notice, { color: c.textSecondary }]}>※ 클릭 광고는 클릭당 입찰가만큼 잔액에서 빠져요. 잔액이 0원이 되면 자동으로 일시정지돼요.</Text>
              </View>
            </>
          )}

          {/* 내 광고 성과 (광고주 대시보드) */}
          {ads.length > 0 && (() => {
            const totImp = ads.reduce((s, a) => s + (adStats[a.id]?.impressions ?? 0), 0);
            const totClick = ads.reduce((s, a) => s + (adStats[a.id]?.clicks ?? 0), 0);
            const ctr = totImp > 0 ? ((totClick / totImp) * 100).toFixed(1) : '0.0';
            const spend = ads.reduce((s, a) => s + (a.format === 'banner' ? (a.status === 'active' || a.status === 'under_review' ? a.monthly_fee : 0) : (adStats[a.id]?.clicks ?? 0) * a.bid_amount), 0);
            return (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 26, marginBottom: 10 }}>
                  <Icon name="chart" size={15} color={c.text} />
                  <Text style={[styles.sect, { color: c.text, marginTop: 0, marginBottom: 0 }]}>내 광고 성과</Text>
                </View>
                <View style={styles.statRow}>
                  <View style={[styles.dashStat, { backgroundColor: c.card, borderColor: c.border }]}><Text style={[styles.dashVal, { color: c.text }]}>{totImp.toLocaleString()}</Text><Text style={[styles.dashLabel, { color: c.textSecondary }]}>총 노출</Text></View>
                  <View style={[styles.dashStat, { backgroundColor: c.card, borderColor: c.border }]}><Text style={[styles.dashVal, { color: c.text }]}>{totClick.toLocaleString()}</Text><Text style={[styles.dashLabel, { color: c.textSecondary }]}>총 클릭</Text></View>
                  <View style={[styles.dashStat, { backgroundColor: c.primarySoft, borderColor: c.primary }]}><Text style={[styles.dashVal, { color: c.primaryDeep }]}>{ctr}%</Text><Text style={[styles.dashLabel, { color: c.textSecondary }]}>클릭률</Text></View>
                </View>
                <View style={[styles.spendBox, { backgroundColor: c.primarySoft }]}>
                  <Text style={[styles.spendLabel, { color: c.primaryDeep }]}>예상 광고료 (누적)</Text>
                  <Text style={[styles.spendVal, { color: c.primaryDeep }]}>{spend.toLocaleString()}원</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, marginBottom: 8 }}>
                  <Icon name="chart" size={14} color={c.text} />
                  <Text style={[styles.chartTitle, { color: c.text, marginTop: 0, marginBottom: 0 }]}>최근 14일 추이</Text>
                </View>
                <DailyChart data={daily} c={c} />

                {ads.map((a) => {
                  const stt = adStats[a.id] ?? { impressions: 0, clicks: 0 };
                  const aCtr = stt.impressions > 0 ? ((stt.clicks / stt.impressions) * 100).toFixed(1) : '0.0';
                  const cost = a.format === 'banner' ? a.monthly_fee : stt.clicks * a.bid_amount;
                  const stColor = a.status === 'active' ? c.verify : a.status === 'under_review' ? '#FF9F40' : a.status === 'rejected' ? '#E5484D' : c.backgroundElement;
                  const stText = a.status === 'active' || a.status === 'under_review' || a.status === 'rejected' ? '#fff' : c.textSecondary;
                  return (
                    <View key={a.id} style={[styles.campaignCard, { backgroundColor: c.card, borderColor: c.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.adName, { color: c.text, flex: 1 }]} numberOfLines={1}>{stores.find((s) => s.id === a.store_id)?.name ?? '매장'}</Text>
                        <View style={[styles.statusChip, { backgroundColor: stColor }]}><Text style={{ color: stText, fontSize: 11, fontWeight: '800' }}>{STATUS_LABEL[a.status] ?? a.status}</Text></View>
                      </View>
                      <Text style={[styles.adMeta, { color: c.textSecondary, marginTop: 3 }]}>{a.format === 'banner' ? `배너 · 월 ${a.monthly_fee.toLocaleString()}원` : `입찰 ${a.bid_amount.toLocaleString()}원/클릭`}{a.ends_at ? ` · ~${a.ends_at.slice(0, 10)}` : ''}</Text>
                      <View style={styles.metricRow}>
                        <View style={styles.metric}><Text style={[styles.metricVal, { color: c.text }]}>{stt.impressions.toLocaleString()}</Text><Text style={[styles.metricLabel, { color: c.textSecondary }]}>노출</Text></View>
                        <View style={styles.metric}><Text style={[styles.metricVal, { color: c.text }]}>{stt.clicks.toLocaleString()}</Text><Text style={[styles.metricLabel, { color: c.textSecondary }]}>클릭</Text></View>
                        <View style={styles.metric}><Text style={[styles.metricVal, { color: c.text }]}>{aCtr}%</Text><Text style={[styles.metricLabel, { color: c.textSecondary }]}>클릭률</Text></View>
                        <View style={styles.metric}><Text style={[styles.metricVal, { color: c.text }]}>{cost.toLocaleString()}</Text><Text style={[styles.metricLabel, { color: c.textSecondary }]}>광고료</Text></View>
                      </View>
                      {a.status === 'rejected' ? (
                        <View style={{ marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: c.background, borderWidth: 1, borderColor: '#E5484D' }}>
                          <Text style={{ color: '#E5484D', fontWeight: '800', fontSize: 12.5 }}>검토 반려됨</Text>
                          {a.reject_reason ? <Text style={{ color: c.text, fontSize: 12, marginTop: 3, lineHeight: 17 }}>사유: {a.reject_reason}</Text> : null}
                          <Pressable onPress={() => requestRereview(a.id)} disabled={busy} style={{ marginTop: 8, paddingVertical: 8, borderRadius: 8, backgroundColor: c.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: busy ? 0.6 : 1 }}>
                            <Icon name="refresh" size={13} color={c.onPrimary} />
                            <Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 12.5 }}>재검토 요청</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
                <Text style={[styles.notice, { color: c.textSecondary }]}>※ 노출·클릭은 실시간 집계돼요. 입찰 광고료는 클릭수×입찰가 추정치예요.</Text>
              </>
            );
          })()}

          {/* 관리자: 대시보드로 이동 (검토·노출·정지 관리 + 통계) */}
          {isAdmin && (
            <Pressable style={[styles.dashLink, { borderColor: c.primary, backgroundColor: c.primarySoft }]} onPress={() => router.push('/admin-dashboard')}>
              <Icon name="chart" size={15} color={c.primaryDeep} />
              <Text style={{ color: c.primaryDeep, fontWeight: '800', flex: 1 }}>관리자 대시보드{pendingAll.length > 0 ? ` · 검토 대기 ${pendingAll.length}` : ''}</Text>
              <Text style={{ color: c.primaryDeep, fontWeight: '800' }}>›</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Header({ c, onBack }: { c: any; onBack: () => void }) {
  return (
    <View style={[styles.header, { borderColor: c.border }]}>
      <Pressable onPress={onBack} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="megaphone" size={16} color={c.text} />
        <Text style={[styles.title, { color: c.text }]}>광고 센터</Text>
      </View>
      <View style={{ width: 40 }} />
    </View>
  );
}

function Legend({ c, color, label }: { c: any; color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 11.5, color: c.textSecondary, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function hexToRgba(hex: string, a: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function DailyChart({ data, c }: { data: { d: string; impressions: number; clicks: number }[]; c: any }) {
  const H = 96;
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.impressions));
  const allZero = data.every((d) => d.impressions === 0 && d.clicks === 0);
  const impColor = hexToRgba(c.primary, 0.3);
  const impBorder = hexToRgba(c.primary, 0.45);
  const n = data.length;
  const sel = active != null ? data[active] : null;
  const selCtr = sel && sel.impressions > 0 ? ((sel.clicks / sel.impressions) * 100).toFixed(1) : '0.0';
  // 툴팁이 가장자리에서 잘리지 않게 정렬 위치 계산
  const tipAlign = active == null ? 'center' : active <= 1 ? 'left' : active >= n - 2 ? 'right' : 'center';
  return (
    <View style={[styles.chartBox, { borderColor: c.border, backgroundColor: c.card }]}>
      <View style={{ flexDirection: 'row', gap: 14, marginBottom: 10 }}>
        <Legend c={c} color={impColor} label="노출" />
        <Legend c={c} color={c.primary} label="클릭" />
      </View>
      {allZero ? (
        <Text style={{ color: c.textSecondary, fontSize: 12.5, textAlign: 'center', paddingVertical: 24, lineHeight: 18 }}>아직 노출·클릭 데이터가 없어요{'\n'}동네 화면에서 광고가 노출·클릭되면 쌓여요</Text>
      ) : (
        <>
          <View style={{ position: 'relative' }}>
            {/* 툴팁 */}
            {sel && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: -6,
                  left: `${(active! + 0.5) / n * 100}%`,
                  transform: [{ translateX: tipAlign === 'left' ? -8 : tipAlign === 'right' ? -132 : -70 }],
                  zIndex: 10,
                  width: 140,
                  backgroundColor: c.text,
                  borderRadius: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 11,
                  shadowColor: '#000',
                  shadowOpacity: 0.18,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 4,
                }}
              >
                <Text style={{ color: c.card, fontSize: 12, fontWeight: '800', marginBottom: 3 }}>{sel.d.slice(5).replace('-', '/')}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: c.card, fontSize: 11.5, opacity: 0.85 }}>노출</Text>
                  <Text style={{ color: c.card, fontSize: 11.5, fontWeight: '700' }}>{sel.impressions.toLocaleString()}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 1 }}>
                  <Text style={{ color: c.card, fontSize: 11.5, opacity: 0.85 }}>클릭</Text>
                  <Text style={{ color: c.card, fontSize: 11.5, fontWeight: '700' }}>{sel.clicks.toLocaleString()}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 1 }}>
                  <Text style={{ color: c.card, fontSize: 11.5, opacity: 0.85 }}>클릭률</Text>
                  <Text style={{ color: c.card, fontSize: 11.5, fontWeight: '700' }}>{selCtr}%</Text>
                </View>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: H, gap: 3 }}>
              {data.map((d, i) => (
                <Pressable
                  key={i}
                  style={{ flex: 1, height: H, justifyContent: 'flex-end', alignItems: 'center' }}
                  onHoverIn={() => setActive(i)}
                  onHoverOut={() => setActive(null)}
                  onPress={() => setActive(active === i ? null : i)}
                >
                  {/* 호버/선택 시 컬럼 하이라이트 */}
                  {active === i && <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: hexToRgba(c.primary, 0.07), borderRadius: 4 }} />}
                  <View
                    style={{
                      width: '72%',
                      height: Math.max(2, (d.impressions / max) * H),
                      backgroundColor: active === i ? hexToRgba(c.primary, 0.42) : impColor,
                      borderWidth: 1,
                      borderColor: impBorder,
                      borderRadius: 3,
                      justifyContent: 'flex-end',
                    }}
                  >
                    <View style={{ width: '100%', height: Math.max(0, (d.clicks / max) * (H - 2)), backgroundColor: active === i ? c.primaryDeep : c.primary, borderRadius: 2 }} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            {data.map((d, i) => (
              <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 8.5, color: active === i ? c.primary : c.textSecondary, fontWeight: active === i ? '800' : '400' }}>{i % 3 === 0 || active === i ? d.d.slice(5).replace('-', '/') : ''}</Text>
            ))}
          </View>
          <Text style={{ color: c.textSecondary, fontSize: 10.5, textAlign: 'center', marginTop: 7 }}>막대를 누르거나 마우스를 올리면 상세가 보여요</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 6 },
  bigTxt: { fontSize: 17, fontWeight: '800', marginTop: 10 },
  subTxt: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  banner: { borderRadius: 12, padding: 14, marginBottom: 16 },
  bannerTxt: { fontSize: 13, fontWeight: '600', lineHeight: 19 },
  box: { borderWidth: 1, borderRadius: 12, padding: 16 },
  label: { fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  chipTxt: { fontSize: 13, fontWeight: '700' },
  planTab: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  planTabTxt: { fontSize: 14, fontWeight: '800' },
  bannerPick: { width: 120, height: 120, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 8 },
  bannerPreview: { width: '100%', height: '100%' },
  tierCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 16 },
  tierName: { fontSize: 15, fontWeight: '800' },
  tierDesc: { fontSize: 12.5, marginTop: 2 },
  tierFee: { fontSize: 15, fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, fontWeight: '700' },
  btn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  btnTxt: { fontSize: 15, fontWeight: '800' },
  notice: { fontSize: 11.5, lineHeight: 17, marginTop: 10 },
  sect: { fontSize: 15, fontWeight: '800', marginTop: 26, marginBottom: 10 },
  adRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8 },
  reviewCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  reviewImg: { width: '100%', height: 130, borderRadius: 10, marginTop: 10, backgroundColor: '#0002' },
  reviewHeadline: { fontSize: 14, fontWeight: '700', marginTop: 8 },
  reviewBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  dashLink: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginTop: 26 },
  statRow: { flexDirection: 'row', gap: 8 },
  dashStat: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  dashVal: { fontSize: 20, fontWeight: '900' },
  dashLabel: { fontSize: 11.5, fontWeight: '700', marginTop: 3 },
  spendBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginTop: 8 },
  chartTitle: { fontSize: 14, fontWeight: '800', marginTop: 18, marginBottom: 8 },
  chartBox: { borderWidth: 1, borderRadius: 14, padding: 14 },
  spendLabel: { fontSize: 13, fontWeight: '800' },
  spendVal: { fontSize: 18, fontWeight: '900' },
  campaignCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 10 },
  statusChip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7 },
  metricRow: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.18)' },
  metric: { flex: 1, alignItems: 'center' },
  metricVal: { fontSize: 16, fontWeight: '900' },
  metricLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  adName: { fontSize: 14, fontWeight: '800' },
  adMeta: { flex: 1, fontSize: 12 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
});
