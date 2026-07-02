import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Colors } from '@/constants/theme';
import { useScheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type KW = { id: number; keyword: string };

export default function KeywordsScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session } = useAuth();

  const [kws, setKws] = useState<KW[]>([]);
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => {
    if (!session) return;
    supabase.from('keyword_subs').select('id,keyword').order('created_at', { ascending: false }).then(({ data }) => setKws((data as KW[]) ?? []));
  };
  useEffect(load, [session]);

  const add = async () => {
    setMsg('');
    const k = input.trim();
    if (k.length < 2) { setMsg('2글자 이상 입력해주세요'); return; }
    if (kws.length >= 20) { setMsg('키워드는 최대 20개까지예요'); return; }
    if (kws.some((x) => x.keyword.toLowerCase() === k.toLowerCase())) { setMsg('이미 등록된 키워드예요'); return; }
    const { error } = await supabase.from('keyword_subs').insert({ user_id: session!.user.id, keyword: k });
    if (error) { setMsg('추가 실패: ' + error.message); return; }
    setInput(''); load();
  };
  const remove = async (id: number) => { await supabase.from('keyword_subs').delete().eq('id', id); load(); };

  if (!session) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
        <Header c={c} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View style={styles.center}><Text style={{ color: c.textSecondary }}>로그인 후 이용해주세요</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <Header c={c} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={[styles.desc, { color: c.textSecondary }]}>등록한 키워드가 들어간 새 글이 올라오면 푸시로 알려드려요. (예: 닭갈비, 이사, 과외, 중고)</Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="키워드 입력 (예: 닭갈비)" placeholderTextColor={c.textSecondary} value={input} onChangeText={setInput} onSubmitEditing={add} returnKeyType="done" />
          <Pressable onPress={add} style={[styles.addBtn, { backgroundColor: c.primary }]}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>추가</Text></Pressable>
        </View>
        {msg ? <Text style={{ color: '#E5484D', fontWeight: '700', marginTop: 8 }}>{msg}</Text> : null}

        <Text style={[styles.sect, { color: c.text }]}>내 키워드 {kws.length}/20</Text>
        {kws.length === 0 ? (
          <Text style={{ color: c.textSecondary, paddingVertical: 14 }}>아직 등록한 키워드가 없어요.</Text>
        ) : (
          <View style={styles.chips}>
            {kws.map((k) => (
              <View key={k.id} style={[styles.chip, { backgroundColor: c.primarySoft, borderColor: c.primary }]}>
                <Text style={{ color: c.primaryDeep, fontWeight: '700', fontSize: 13.5 }}>#{k.keyword}</Text>
                <Pressable onPress={() => remove(k.id)} hitSlop={6} style={{ marginLeft: 4 }}><Icon name="x" size={14} color={c.primaryDeep} strokeWidth={2} /></Pressable>
              </View>
            ))}
          </View>
        )}
        <Text style={[styles.note, { color: c.textSecondary }]}>※ 푸시 알림을 받으려면 알림 권한이 켜져 있어야 해요.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ c, onBack }: { c: any; onBack: () => void }) {
  return (
    <View style={[styles.header, { borderColor: c.border }]}>
      <Pressable onPress={onBack} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="bell" size={16} color={c.text} strokeWidth={2} />
        <Text style={[styles.hTitle, { color: c.text }]}>키워드 알림</Text>
      </View>
      <View style={{ width: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  hTitle: { fontSize: 16, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  desc: { fontSize: 13, lineHeight: 19 },
  input: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  addBtn: { paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sect: { fontSize: 14, fontWeight: '800', marginTop: 22, marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  note: { fontSize: 11.5, marginTop: 20, lineHeight: 17 },
});
