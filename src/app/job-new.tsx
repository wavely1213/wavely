import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DongPicker } from '@/components/DongPicker';
import { Icon } from '@/components/Icon';
import { mergeDongs } from '@/constants/app';
import { Colors } from '@/constants/theme';
import { useScheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PAY_TYPES, fromJobPost, toJobPost, JOB_AGEBANDS } from './jobs';

export default function JobNewScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session, profile } = useAuth();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editId = Array.isArray(edit) ? edit[0] : edit;

  const [kind, setKind] = useState<'hiring' | 'seeking'>('hiring');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [payType, setPayType] = useState<string>('hourly');
  const [pay, setPay] = useState('');
  const [workTime, setWorkTime] = useState('');
  const [contact, setContact] = useState('');
  const [ageRange, setAgeRange] = useState('');   // 익명 구직 나이대
  const [gender, setGender] = useState('');       // 익명 구직 성별
  const [dong, setDong] = useState<string | null>(null);
  const [dongOptions, setDongOptions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // 동네 선택지(GPS가 틀리거나 꺼져 있을 때 직접 고를 수 있게)
  useEffect(() => {
    supabase.rpc('dong_list').then(({ data }) => setDongOptions(mergeDongs(((data as any[]) ?? []).map((d) => d.dong))));
  }, []);

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
    supabase.from('job_posts').select('*').eq('id', editId).single().then(({ data }) => {
      if (!data) return;
      const d = fromJobPost(data);   // 웹 shape → 앱 shape
      setKind(d.kind); setTitle(d.title ?? ''); setBody(d.body ?? ''); setPayType(d.pay_type ?? 'hourly');
      setPay(d.pay ? String(d.pay) : ''); setWorkTime(d.work_time ?? ''); setContact(d.contact ?? ''); setDong(d.dong ?? null);
      setAgeRange((data as any).age_range ?? ''); setGender((data as any).gender ?? '');
    });
  }, [editId]);

  const submit = async () => {
    setMsg('');
    if (!session) { router.replace('/login'); return; }
    if (!title.trim()) { setMsg('제목을 입력해주세요'); return; }
    setBusy(true);
    // 앱 입력 → 웹 job_posts payload 변환(어댑터). 구인(hire)은 job_posts RLS가 owner/staff만 허용(서버강제).
    const payload = toJobPost({
      kind, title: title.trim(), body: body.trim() || null, pay_type: payType,
      pay: payType === 'negotiable' ? null : Math.max(parseInt(pay.replace(/[^0-9]/g, '') || '0', 10), 0) || null,
      work_time: workTime.trim() || null, contact: contact.trim() || null, dong,
      age_range: ageRange || null, gender: gender || null,
    });
    const { error } = editId
      ? await supabase.from('job_posts').update(payload).eq('id', editId)
      : await supabase.from('job_posts').insert({ author_id: session.user.id, ...payload });
    setBusy(false);
    if (error) { setMsg(/policy|row-level|permission/i.test(error.message) ? '구인 공고는 사장님·직장인만 올릴 수 있어요.' : '등록 실패: ' + error.message); return; }
    router.replace('/jobs');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/jobs'))} hitSlop={8}><Icon name="x" size={18} color={c.textSecondary} /></Pressable>
        <Text style={[styles.hTitle, { color: c.text }]}>{editId ? '공고 수정' : '공고 올리기'}</Text>
        <Pressable onPress={submit} disabled={busy} hitSlop={8}><Text style={{ color: c.primary, fontWeight: '800', fontSize: 15 }}>{busy ? '...' : '등록'}</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([['hiring', '🙋 구인 (알바·직원 구해요)'], ['seeking', '✋ 구직 (일자리 찾아요)']] as const).map(([k, l]) => (
            <Pressable key={k} onPress={() => setKind(k)} style={[styles.kindBtn, { backgroundColor: kind === k ? c.primary : c.card, borderColor: kind === k ? c.primary : c.border }]}>
              <Text style={{ color: kind === k ? c.onPrimary : c.text, fontWeight: '800', fontSize: 12.5, textAlign: 'center' }}>{l}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder={kind === 'hiring' ? '제목 (예: 주말 홀서빙 구해요)' : '제목 (예: 카페 알바 구해요)'} placeholderTextColor={c.textSecondary} value={title} onChangeText={setTitle} maxLength={120} />

        <View>
          <Text style={[styles.label, { color: c.textSecondary }]}>급여</Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {Object.entries(PAY_TYPES).map(([k, l]) => (
              <Pressable key={k} onPress={() => setPayType(k)} style={[styles.chip, { backgroundColor: payType === k ? c.primary : c.card, borderColor: payType === k ? c.primary : c.border }]}>
                <Text style={{ color: payType === k ? c.onPrimary : c.text, fontWeight: '700', fontSize: 12.5 }}>{l}</Text>
              </Pressable>
            ))}
          </View>
          {payType !== 'negotiable' ? (
            <View style={[styles.input, { backgroundColor: c.card, borderColor: c.border, flexDirection: 'row', alignItems: 'center' }]}>
              <TextInput style={{ flex: 1, fontSize: 15, color: c.text }} placeholder="금액" placeholderTextColor={c.textSecondary} value={pay} onChangeText={setPay} keyboardType="number-pad" />
              <Text style={{ color: c.text, fontWeight: '700' }}>원</Text>
            </View>
          ) : null}
        </View>

        <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="근무시간·기간 (예: 평일 18~22시, 주 3일)" placeholderTextColor={c.textSecondary} value={workTime} onChangeText={setWorkTime} />
        <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text, height: 120, textAlignVertical: 'top' }]} placeholder="상세 내용 (업무·자격·우대사항 등)" placeholderTextColor={c.textSecondary} value={body} onChangeText={setBody} multiline maxLength={5000} />
        <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="연락 방법 (선택 · 비우면 앱 채팅으로 받아요)" placeholderTextColor={c.textSecondary} value={contact} onChangeText={setContact} />

        {kind === 'seeking' ? (
          <View style={[styles.anonBox, { backgroundColor: c.primarySoft, borderColor: c.border }]}>
            <Text style={{ color: c.primaryDeep, fontWeight: '800', fontSize: 12.5, marginBottom: 2 }}>🙈 익명 구직</Text>
            <Text style={{ color: c.textSecondary, fontSize: 11.5, marginBottom: 10, lineHeight: 16 }}>이름·연락처는 공개되지 않아요. 사장님이 러브콜을 보내고 내가 수락하면 채팅이 열려요.</Text>
            <Text style={[styles.label, { color: c.textSecondary }]}>나이대 (선택)</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {JOB_AGEBANDS.map((a) => (
                <Pressable key={a} onPress={() => setAgeRange((cur) => (cur === a ? '' : a))} style={[styles.chip, { backgroundColor: ageRange === a ? c.primary : c.card, borderColor: ageRange === a ? c.primary : c.border }]}>
                  <Text style={{ color: ageRange === a ? c.onPrimary : c.text, fontWeight: '700', fontSize: 12.5 }}>{a}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.label, { color: c.textSecondary }]}>성별 (선택)</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {['남', '여'].map((g) => (
                <Pressable key={g} onPress={() => setGender((cur) => (cur === g ? '' : g))} style={[styles.chip, { backgroundColor: gender === g ? c.primary : c.card, borderColor: gender === g ? c.primary : c.border }]}>
                  <Text style={{ color: gender === g ? c.onPrimary : c.text, fontWeight: '700', fontSize: 12.5 }}>{g}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <Text style={[styles.label, { color: c.textSecondary }]}>동네 {dong ? '· 📍 자동감지됨' : '(위치 자동 — 직접 선택도 가능)'}</Text>
        <DongPicker value={dong} options={dongOptions} onChange={setDong} allLabel="동네 선택" />
        {msg ? <Text style={{ color: '#E5484D', fontWeight: '700', marginTop: 8 }}>{msg}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  x: { fontSize: 18, fontWeight: '700' },
  hTitle: { fontSize: 16, fontWeight: '800' },
  kindBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  label: { fontSize: 12.5, fontWeight: '800', marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  anonBox: { borderWidth: 1, borderRadius: 12, padding: 14 },
});
