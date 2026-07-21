import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Colors } from '@/constants/theme';
import { useScheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PAY_TYPES, fromJobPost } from '../jobs';

type Job = {
  id: string; author_id: string; kind: string; title: string; body: string | null; store_id: string | null;
  pay_type: string | null; pay: number | null; work_time: string | null; contact: string | null; dong: string | null;
  status: string; created_at: string; age_range?: string | null; gender?: string | null;
  profiles: { nickname: string; avatar_url: string | null } | null;
};
type LoveCall = { from: string; nick: string; message: string; status: string; at: string };

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
  const [chatBusy, setChatBusy] = useState(false);
  const [chatErr, setChatErr] = useState('');
  const [failed, setFailed] = useState(false);
  // ★2 러브콜(익명 구직). loveOn=job_love_calls 라이브(43 미적용 시 dormant → 현행 채팅으로 폴백).
  const [loveOn, setLoveOn] = useState(false);
  const [calls, setCalls] = useState<LoveCall[] | null>(null);      // 구직자(mine)가 받은 러브콜
  const [sentState, setSentState] = useState<'none' | 'sent' | 'accepted'>('none');   // 매장(내가 보낸) 상태
  const [loveBusy, setLoveBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setFailed(false);
    // 비로그인은 본문·연락처·작성자 정보 열람 불가 → 기본 정보만(익명 나이대·성별은 포함)
    const cols = session
      ? '*,profiles:author_id(nickname,avatar_url)'
      : 'id,author_id,kind,title,wage,wage_type,work_time,dong,status,age_range,gender,created_at';
    const { data, error } = await supabase.from('job_posts').select(cols).eq('id', id).single();
    if (error && error.code !== 'PGRST116') { setFailed(true); setLoading(false); return; }
    const j = (fromJobPost(data) as unknown as Job) ?? null;   // 웹 shape → 앱 shape
    setJob(j);
    setLoading(false);
    if (j && j.kind === 'seeking' && session) loadLove(j);   // ★2 익명 구직 = 러브콜 플로우
  }, [id, session, profile?.id, profile?.role]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const mine = !!session && job?.author_id === session.user.id;
  const seek = job?.kind === 'seeking';
  const canHire = profile?.role === 'owner' || profile?.role === 'staff';   // 러브콜 발송 자격(사장님·직장인). RLS도 강제.

  // 러브콜 로드: 글주인=받은 목록 전체 / 매장=내가 보낸 상태 / 그 외=라이브 여부만(익명 안내용).
  const loadLove = async (j: Job) => {
    const iAmAuthor = j.author_id === session!.user.id;
    const iCanHire = profile?.role === 'owner' || profile?.role === 'staff';
    try {
      if (iAmAuthor) {
        // from_user는 auth.users FK(→profiles 암시조인 불가) → 2단계: 콜 조회 후 닉네임 별도 조회.
        const { data, error } = await supabase.from('job_love_calls')
          .select('from_user, message, status, created_at')
          .eq('job_id', j.id).order('created_at', { ascending: false });
        if (error) return;   // 43 미적용 → dormant(현행 플로우 유지)
        setLoveOn(true);
        const rows = (data ?? []) as any[];
        const ids = [...new Set(rows.map((r) => r.from_user))];
        const nickBy: Record<string, string> = {};
        if (ids.length) {
          const { data: profs } = await supabase.from('profiles').select('id,nickname').in('id', ids);
          for (const p of (profs ?? []) as any[]) nickBy[p.id] = p.nickname ?? '매장';
        }
        setCalls(rows.map((r) => ({ from: r.from_user, nick: nickBy[r.from_user] ?? '매장', message: r.message ?? '', status: r.status ?? 'pending', at: r.created_at })));
      } else if (iCanHire) {
        const { data, error } = await supabase.from('job_love_calls').select('from_user, status').eq('job_id', j.id).eq('from_user', session!.user.id);
        if (error) return;
        setLoveOn(true);
        const m = (data ?? [])[0] as any;
        if (m) setSentState(m.status === 'accepted' ? 'accepted' : 'sent');
      } else {
        const { error } = await supabase.from('job_love_calls').select('job_id').limit(1);
        if (!error) setLoveOn(true);
      }
    } catch {}
  };

  const toggleStatus = async () => { await supabase.from('job_posts').update({ status: job!.status === 'open' ? 'closed' : 'open' }).eq('id', id); load(); };
  const del = async () => { await supabase.from('job_posts').delete().eq('id', id); router.back(); };

  // DM 열기(공용): 기존 채팅 재사용 or 신규 + 인사말 1회.
  const openDM = async (targetId: string, targetNick: string, intro: string): Promise<string | null> => {
    const { data: convId, error } = await supabase.rpc('get_or_create_dm', { target: targetId, target_nick: targetNick, me_nick: profile?.nickname ?? '회원' });
    if (error || !convId) return null;
    const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', convId);
    if (!count) {
      await supabase.from('messages').insert({ conversation_id: convId, sender_id: session!.user.id, sender_nick: profile?.nickname ?? '회원', body: intro });
      await supabase.from('conversations').update({ last_message: intro, last_at: new Date().toISOString() }).eq('id', convId);
    }
    return convId as string;
  };

  const chat = async () => {
    if (!session) { router.replace('/login'); return; }
    if (!job || chatBusy) return;
    setChatBusy(true); setChatErr('');
    const convId = await openDM(job.author_id, job.profiles?.nickname ?? '회원', `[${job.kind === 'hiring' ? '구인' : '구직'}] "${job.title}" 문의드려요!`);
    setChatBusy(false);
    if (!convId) { setChatErr('채팅을 열 수 없어요. 상대가 차단했거나 일시적 오류일 수 있어요.'); return; }
    router.push(`/chat/${convId}`);
  };

  // 매장 → 구직자 러브콜 발송(익명 유지, 수락 전엔 신원 비공개).
  const sendLove = async () => {
    if (!session || !job || loveBusy) return;
    setLoveBusy(true); setChatErr('');
    const { error } = await supabase.from('job_love_calls').upsert({ job_id: job.id, from_user: session.user.id, message: null }, { onConflict: 'job_id,from_user' });
    setLoveBusy(false);
    if (error) { setChatErr(/policy|row-level|permission/i.test(error.message) ? '러브콜은 사장님·직장인만 보낼 수 있어요.' : '러브콜을 보내지 못했어요. 잠시 후 다시 시도해주세요.'); return; }
    setSentState('sent');
  };

  // 구직자 → 러브콜 수락/거절. 수락 시 그 매장과 채팅 오픈(신원 공개).
  const respondLove = async (fromUser: string, nick: string, accept: boolean) => {
    if (!job || loveBusy) return;
    setLoveBusy(true);
    const { error } = await supabase.from('job_love_calls').update({ status: accept ? 'accepted' : 'declined' }).eq('job_id', job.id).eq('from_user', fromUser);
    if (error) { setLoveBusy(false); setChatErr('처리하지 못했어요. 잠시 후 다시 시도해주세요.'); return; }
    if (accept) {
      const convId = await openDM(fromUser, nick || '매장', `러브콜 수락했어요! 「${job.title}」 관련해 이야기 나눠요.`);
      setLoveBusy(false);
      if (convId) { router.push(`/chat/${convId}`); return; }
    }
    setLoveBusy(false);
    loadLove(job);   // 목록 갱신
  };

  if (loading) return <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}><ActivityIndicator color={c.primary} style={{ marginTop: 40 }} /></SafeAreaView>;
  if (failed) return <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}><View style={[styles.header, { borderColor: c.border }]}><Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/jobs'))}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable></View><View style={styles.center}><Text style={{ color: c.textSecondary, marginBottom: 12 }}>불러오지 못했어요. 연결을 확인해주세요.</Text><Pressable onPress={() => { setLoading(true); load(); }} style={[styles.chatBtn, { backgroundColor: c.primary, flex: 0, paddingHorizontal: 24 }]}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>다시 시도</Text></Pressable></View></SafeAreaView>;
  if (!job) return <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}><View style={[styles.header, { borderColor: c.border }]}><Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/jobs'))}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable></View><View style={styles.center}><Text style={{ color: c.textSecondary }}>삭제됐거나 없는 공고예요</Text></View></SafeAreaView>;

  const payText = job.pay_type === 'negotiable' || !job.pay ? '협의' : `${PAY_TYPES[job.pay_type ?? ''] ?? ''} ${job.pay.toLocaleString()}원`;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/jobs'))} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        {mine ? (
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <Pressable onPress={() => router.push(`/job-new?edit=${id}`)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="edit" size={13} color={c.primary} /><Text style={{ color: c.primary, fontWeight: '800', fontSize: 13 }}>수정</Text></Pressable>
            <Pressable onPress={() => setConfirmDel(true)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="trash" size={13} color="#E5484D" /><Text style={{ color: '#E5484D', fontWeight: '800', fontSize: 13 }}>삭제</Text></Pressable>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="wallet" size={17} color={c.primaryDeep} /><Text style={{ color: c.primaryDeep, fontWeight: '900', fontSize: 17 }}>{payText}</Text></View>
          {job.work_time ? <Text style={{ color: c.primaryDeep, fontSize: 13, marginTop: 4 }}>🕒 {job.work_time}</Text> : null}
        </View>

        {session && job.body ? <Text style={[styles.body, { color: c.text }]}>{job.body}</Text> : null}
        {/* 익명 구직(러브콜)이면 연락처 비공개 — 수락 후 채팅으로만 */}
        {session && job.contact && !(seek && loveOn) ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14 }}><Icon name="phone" size={13.5} color={c.textSecondary} /><Text style={[styles.contact, { color: c.textSecondary, marginTop: 0 }]}>연락: {job.contact}</Text></View> : null}

        {seek && loveOn ? (
          <View style={[styles.author, { borderColor: c.border, flexDirection: 'column', alignItems: 'flex-start', gap: 7 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.kindBadge, { backgroundColor: c.primarySoft }]}><Text style={{ color: c.primaryDeep, fontSize: 12, fontWeight: '800' }}>🙈 익명 구직자</Text></View>
              {(job.age_range || job.gender) ? <Text style={{ color: c.text, fontWeight: '700', fontSize: 13.5 }}>{[job.age_range, job.gender].filter(Boolean).join(' · ')}</Text> : null}
            </View>
            <Text style={{ color: c.textSecondary, fontSize: 12, lineHeight: 17 }}>🔒 이름·연락처는 비공개예요. 러브콜을 보내고 상대가 수락하면 채팅으로 연결돼요.</Text>
          </View>
        ) : session ? (
          <View style={[styles.author, { borderColor: c.border }]}>
            <Avatar url={job.profiles?.avatar_url} fallback="🙂" size={34} bg={c.primarySoft} />
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{job.profiles?.nickname ?? '회원'}</Text>
          </View>
        ) : (
          <Pressable onPress={() => router.push('/login')} style={[styles.gate, { backgroundColor: c.primarySoft, borderColor: c.primary }]}>
            <Icon name="lock" size={28} color={c.primaryDeep} />
            <Text style={{ color: c.primaryDeep, fontWeight: '800', fontSize: 14.5, marginTop: 6 }}>상세 내용·문의</Text>
            <Text style={{ color: c.textSecondary, fontSize: 12.5, marginTop: 4, textAlign: 'center' }}>로그인하면 상세 내용을 보고 바로 문의할 수 있어요</Text>
            <View style={[styles.gateBtn, { backgroundColor: c.primary }]}><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 13.5 }}>로그인 / 가입하기</Text></View>
          </Pressable>
        )}

        {/* 내가 올린 익명 구직글 = 받은 러브콜 관리(수락 시 채팅 오픈) */}
        {mine && seek && loveOn ? (
          <View style={{ marginTop: 20 }}>
            <Text style={{ color: c.text, fontWeight: '800', fontSize: 14, marginBottom: 8 }}>💌 받은 러브콜 {calls?.length ? calls.length : ''}</Text>
            {calls === null ? <ActivityIndicator color={c.primary} style={{ marginTop: 6 }} />
              : calls.length === 0 ? <Text style={{ color: c.textSecondary, fontSize: 12.5, marginTop: 4 }}>아직 러브콜이 없어요. 매장이 관심을 보내면 여기에 표시돼요.</Text>
              : calls.map((cl) => (
                <View key={cl.from} style={[styles.callCard, { backgroundColor: c.card, borderColor: c.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontWeight: '800', fontSize: 13.5 }}>{cl.status === 'accepted' ? cl.nick : '🏪 매장'}</Text>
                    {cl.message ? <Text style={{ color: c.textSecondary, fontSize: 12.5, marginTop: 2 }} numberOfLines={2}>{cl.message}</Text> : null}
                  </View>
                  {cl.status === 'accepted' ? (
                    <Pressable onPress={() => openDM(cl.from, cl.nick, `「${job.title}」 러브콜 수락 감사해요! 이야기 나눠요.`).then((cid) => cid && router.push(`/chat/${cid}`))} style={[styles.cb, { backgroundColor: c.primary }]}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>채팅</Text></Pressable>
                  ) : cl.status === 'declined' ? (
                    <Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 12.5 }}>거절함</Text>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pressable onPress={() => respondLove(cl.from, cl.nick, false)} disabled={loveBusy} style={[styles.cb, { borderColor: c.border, borderWidth: 1 }]}><Text style={{ color: c.textSecondary, fontWeight: '800' }}>거절</Text></Pressable>
                      <Pressable onPress={() => respondLove(cl.from, cl.nick, true)} disabled={loveBusy} style={[styles.cb, { backgroundColor: c.primary }]}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>수락</Text></Pressable>
                    </View>
                  )}
                </View>
              ))}
          </View>
        ) : null}

        {mine ? (
          <Pressable onPress={toggleStatus} style={[styles.statusBtn, { borderColor: c.border }]}><Text style={{ color: c.text, fontWeight: '800' }}>{job.status === 'open' ? '🔒 마감하기' : '🔓 다시 모집' }</Text></Pressable>
        ) : null}
      </ScrollView>

      {/* 익명 구직(러브콜) 하단바: 매장=러브콜 상태머신, 그 외=안내 */}
      {session && !mine && seek && loveOn ? (
        <View>
          {chatErr ? <Pressable onPress={() => setChatErr('')} style={{ backgroundColor: '#E5484D', paddingHorizontal: 14, paddingVertical: 9 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>{chatErr} (탭하여 닫기)</Text></Pressable> : null}
          <View style={[styles.bottomBar, { backgroundColor: c.card, borderColor: c.border }]}>
            {!canHire ? (
              <View style={[styles.loveNotice, { borderColor: c.border }]}><Text style={{ color: c.textSecondary, fontSize: 12.5, textAlign: 'center', lineHeight: 17 }}>러브콜은 사장님·직장인만 보낼 수 있어요</Text></View>
            ) : sentState === 'accepted' ? (
              <Pressable onPress={() => openDM(job.author_id, '구직자', `「${job.title}」 러브콜 수락 감사해요! 이야기 나눠요.`).then((cid) => cid && router.push(`/chat/${cid}`))} style={[styles.chatBtn, { backgroundColor: c.primary, flexDirection: 'row', gap: 6 }]}><Icon name="chat" size={15} color={c.onPrimary} /><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 15 }}>채팅하기</Text></Pressable>
            ) : sentState === 'sent' ? (
              <View style={[styles.loveNotice, { borderColor: c.primary, borderStyle: 'solid', backgroundColor: c.primarySoft }]}><Text style={{ color: c.primaryDeep, fontSize: 13, fontWeight: '800', textAlign: 'center' }}>💌 러브콜 보냄 · 수락 대기중</Text></View>
            ) : (
              <Pressable onPress={sendLove} disabled={loveBusy} style={[styles.chatBtn, { backgroundColor: c.primary, opacity: loveBusy ? 0.6 : 1 }]}><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 15 }}>💌 {loveBusy ? '보내는 중…' : '러브콜 보내기'}</Text></Pressable>
            )}
          </View>
        </View>
      ) : session && !mine ? (
        <View>
          {chatErr ? <Pressable onPress={() => setChatErr('')} style={{ backgroundColor: '#E5484D', paddingHorizontal: 14, paddingVertical: 9 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>{chatErr} (탭하여 닫기)</Text></Pressable> : null}
          <View style={[styles.bottomBar, { backgroundColor: c.card, borderColor: c.border }]}>
            {job.contact ? <Pressable onPress={() => Linking.openURL(`tel:${job.contact!.replace(/[^0-9]/g, '')}`)} style={[styles.callBtn, { borderColor: c.primary, flexDirection: 'row', alignItems: 'center', gap: 5 }]}><Icon name="phone" size={15} color={c.primary} /><Text style={{ color: c.primary, fontWeight: '800' }}>전화</Text></Pressable> : null}
            <Pressable onPress={chat} disabled={chatBusy} style={[styles.chatBtn, { backgroundColor: c.primary, opacity: chatBusy ? 0.6 : 1, flexDirection: 'row', gap: 6 }]}>{chatBusy ? null : <Icon name="chat" size={15} color={c.onPrimary} />}<Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 15 }}>{chatBusy ? '여는 중…' : '채팅 문의'}</Text></Pressable>
          </View>
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
  callCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  loveNotice: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  statusBtn: { marginTop: 16, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  gate: { marginTop: 18, paddingVertical: 22, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, alignItems: 'center' },
  gateBtn: { marginTop: 14, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 999 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  callBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  chatBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
});
