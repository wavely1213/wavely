import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Colors } from '@/constants/theme';
import { useScheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PAY_TYPES } from '../jobs';

type Job = {
  id: string; author_id: string; kind: string; title: string; body: string | null; store_id: string | null;
  pay_type: string | null; pay: number | null; work_time: string | null; contact: string | null; dong: string | null;
  status: string; created_at: string; profiles: { nickname: string; avatar_url: string | null } | null;
};

function ago(iso: string) { const d = (Date.now() - new Date(iso).getTime()) / 1000; if (d < 3600) return `${Math.max(1, Math.floor(d / 60))}분 전`; if (d < 86400) return `${Math.floor(d / 3600)}시간 전`; return `${Math.floor(d / 86400)}일 전`; }

export default function JobDetail() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    // 비로그인은 본문·연락처·작성자 정보 열람 불가 → 기본 정보만
    const cols = session
      ? '*,profiles:author_id(nickname,avatar_url)'
      : 'id,author_id,kind,title,pay_type,pay,work_time,dong,status,created_at';
    const { data } = await supabase.from('jobs').select(cols).eq('id', id).single();
    setJob((data as unknown as Job) ?? null);
    setLoading(false);
  }, [id, session]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const mine = !!session && job?.author_id === session.user.id;
  const toggleStatus = async () => { await supabase.from('jobs').update({ status: job!.status === 'open' ? 'closed' : 'open' }).eq('id', id); load(); };
  const del = async () => { await supabase.from('jobs').delete().eq('id', id); router.back(); };
  const chat = async () => {
    if (!session) { router.replace('/login'); return; }
    if (!job) return;
    const { data: convId } = await supabase.rpc('get_or_create_dm', { target: job.author_id, target_nick: job.profiles?.nickname ?? '회원', me_nick: profile?.nickname ?? '회원' });
    if (!convId) return;
    const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', convId);
    if (!count) {
      const intro = `[${job.kind === 'hiring' ? '구인' : '구직'}] "${job.title}" 문의드려요!`;
      await supabase.from('messages').insert({ conversation_id: convId, sender_id: session.user.id, sender_nick: profile?.nickname ?? '회원', body: intro });
      await supabase.from('conversations').update({ last_message: intro, last_at: new Date().toISOString() }).eq('id', convId);
    }
    router.push(`/chat/${convId}`);
  };

  if (loading) return <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}><ActivityIndicator color={c.primary} style={{ marginTop: 40 }} /></SafeAreaView>;
  if (!job) return <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}><View style={[styles.header, { borderColor: c.border }]}><Pressable onPress={() => router.back()}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable></View><View style={styles.center}><Text style={{ color: c.textSecondary }}>삭제됐거나 없는 공고예요</Text></View></SafeAreaView>;

  const payText = job.pay_type === 'negotiable' || !job.pay ? '협의' : `${PAY_TYPES[job.pay_type ?? ''] ?? ''} ${job.pay.toLocaleString()}원`;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/jobs'))} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        {mine ? (
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <Pressable onPress={() => router.push(`/job-new?edit=${id}`)} hitSlop={8}><Text style={{ color: c.primary, fontWeight: '800', fontSize: 13 }}>✏️ 수정</Text></Pressable>
            <Pressable onPress={() => setConfirmDel(true)} hitSlop={8}><Text style={{ color: '#E5484D', fontWeight: '800', fontSize: 13 }}>🗑 삭제</Text></Pressable>
          </View>
        ) : <Pressable onPress={() => router.push(`/report?type=job&id=${id}&label=${encodeURIComponent(job.title)}`)} hitSlop={8}><Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 13 }}>🚩 신고</Text></Pressable>}
      </View>
      {confirmDel && (
        <View style={[styles.confirm, { backgroundColor: c.card, borderColor: '#E5484D' }]}>
          <Text style={{ color: c.text, fontWeight: '700', flex: 1 }}>이 공고를 삭제할까요?</Text>
          <Pressable onPress={() => setConfirmDel(false)} style={[styles.cb, { borderColor: c.border, borderWidth: 1 }]}><Text style={{ color: c.textSecondary, fontWeight: '800' }}>취소</Text></Pressable>
          <Pressable onPress={del} style={[styles.cb, { backgroundColor: '#E5484D' }]}><Text style={{ color: '#fff', fontWeight: '800' }}>삭제</Text></Pressable>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <View style={[styles.kindBadge, { backgroundColor: job.kind === 'hiring' ? c.primarySoft : '#FFE7CC' }]}><Text style={{ color: job.kind === 'hiring' ? c.primaryDeep : '#D9730D', fontSize: 12, fontWeight: '800' }}>{job.kind === 'hiring' ? '🙋 구인' : '✋ 구직'}</Text></View>
          {job.status === 'closed' ? <View style={[styles.kindBadge, { backgroundColor: c.backgroundElement }]}><Text style={{ color: c.textSecondary, fontSize: 12, fontWeight: '800' }}>마감</Text></View> : null}
          <Text style={{ color: c.textSecondary, fontSize: 12, marginLeft: 'auto' }}>{job.dong ? `📍${job.dong} · ` : ''}{ago(job.created_at)}</Text>
        </View>

        <Text style={[styles.title, { color: c.text }]}>{job.title}</Text>
        <View style={[styles.payCard, { backgroundColor: c.primarySoft }]}>
          <Text style={{ color: c.primaryDeep, fontWeight: '900', fontSize: 17 }}>💰 {payText}</Text>
          {job.work_time ? <Text style={{ color: c.primaryDeep, fontSize: 13, marginTop: 4 }}>🕒 {job.work_time}</Text> : null}
        </View>

        {session && job.body ? <Text style={[styles.body, { color: c.text }]}>{job.body}</Text> : null}
        {session && job.contact ? <Text style={[styles.contact, { color: c.textSecondary }]}>📞 연락: {job.contact}</Text> : null}

        {session ? (
          <View style={[styles.author, { borderColor: c.border }]}>
            <Avatar url={job.profiles?.avatar_url} fallback="🙂" size={34} bg={c.primarySoft} />
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{job.profiles?.nickname ?? '회원'}</Text>
          </View>
        ) : (
          <Pressable onPress={() => router.push('/login')} style={[styles.gate, { backgroundColor: c.primarySoft, borderColor: c.primary }]}>
            <Text style={{ fontSize: 28 }}>🔒</Text>
            <Text style={{ color: c.primaryDeep, fontWeight: '800', fontSize: 14.5, marginTop: 6 }}>상세 내용·문의</Text>
            <Text style={{ color: c.textSecondary, fontSize: 12.5, marginTop: 4, textAlign: 'center' }}>로그인하면 상세 내용을 보고 바로 문의할 수 있어요</Text>
            <View style={[styles.gateBtn, { backgroundColor: c.primary }]}><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 13.5 }}>로그인 / 가입하기</Text></View>
          </Pressable>
        )}

        {mine ? (
          <Pressable onPress={toggleStatus} style={[styles.statusBtn, { borderColor: c.border }]}><Text style={{ color: c.text, fontWeight: '800' }}>{job.status === 'open' ? '🔒 마감하기' : '🔓 다시 모집' }</Text></Pressable>
        ) : null}
      </ScrollView>

      {session && !mine ? (
        <View style={[styles.bottomBar, { backgroundColor: c.card, borderColor: c.border }]}>
          {job.contact ? <Pressable onPress={() => Linking.openURL(`tel:${job.contact!.replace(/[^0-9]/g, '')}`)} style={[styles.callBtn, { borderColor: c.primary }]}><Text style={{ color: c.primary, fontWeight: '800' }}>📞 전화</Text></Pressable> : null}
          <Pressable onPress={chat} style={[styles.chatBtn, { backgroundColor: c.primary }]}><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 15 }}>💬 채팅 문의</Text></Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1.5 },
  cb: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9 },
  kindBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  title: { fontSize: 20, fontWeight: '800' },
  payCard: { padding: 14, borderRadius: 12, marginTop: 14 },
  body: { fontSize: 15, lineHeight: 23, marginTop: 16 },
  contact: { fontSize: 13.5, fontWeight: '700', marginTop: 14 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 18, paddingTop: 14, borderTopWidth: 1 },
  statusBtn: { marginTop: 16, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  gate: { marginTop: 18, paddingVertical: 22, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, alignItems: 'center' },
  gateBtn: { marginTop: 14, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 999 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  callBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  chatBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
});
