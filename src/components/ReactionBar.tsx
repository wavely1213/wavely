import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Props = {
  targetType: 'post' | 'place' | 'store';
  targetId: string;
  title?: string;        // 공유 텍스트용
  sharePath?: string;    // 예: /post/123  (없으면 type/id 조합)
};

export function ReactionBar({ targetType, targetId, title, sharePath }: Props) {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session } = useAuth();
  const tid = String(targetId);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [scrapped, setScrapped] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { count } = await supabase.from('likes').select('id', { count: 'exact', head: true }).eq('target_type', targetType).eq('target_id', tid);
    setLikeCount(count ?? 0);
    if (session) {
      const [{ data: l }, { data: s }] = await Promise.all([
        supabase.from('likes').select('id').eq('target_type', targetType).eq('target_id', tid).eq('user_id', session.user.id).maybeSingle(),
        supabase.from('scraps').select('id').eq('target_type', targetType).eq('target_id', tid).eq('user_id', session.user.id).maybeSingle(),
      ]);
      setLiked(!!l); setScrapped(!!s);
    } else { setLiked(false); setScrapped(false); }
  }, [targetType, tid, session]);
  useEffect(() => { load(); }, [load]);

  const toggleLike = async () => {
    if (!session) { router.push('/login'); return; }
    if (busy) return; setBusy(true);
    if (liked) {
      setLiked(false); setLikeCount((n) => Math.max(0, n - 1));
      await supabase.from('likes').delete().eq('target_type', targetType).eq('target_id', tid).eq('user_id', session.user.id);
    } else {
      setLiked(true); setLikeCount((n) => n + 1);
      await supabase.from('likes').insert({ target_type: targetType, target_id: tid, user_id: session.user.id });
    }
    setBusy(false);
  };

  const toggleScrap = async () => {
    if (!session) { router.push('/login'); return; }
    if (scrapped) {
      setScrapped(false);
      await supabase.from('scraps').delete().eq('target_type', targetType).eq('target_id', tid).eq('user_id', session.user.id);
    } else {
      setScrapped(true);
      await supabase.from('scraps').insert({ target_type: targetType, target_id: tid, user_id: session.user.id });
    }
  };

  const share = async () => {
    const path = sharePath ?? `/${targetType}/${tid}`;
    const origin = Platform.OS === 'web' ? (globalThis as any).location?.origin ?? '' : 'https://wavely.app';
    const url = `${origin}${path}`;
    const message = title ? `${title}\n${url}` : url;
    try {
      const nav = (globalThis as any).navigator;
      if (Platform.OS === 'web' && nav?.share) { await nav.share({ title: title ?? '와벨리', url }); return; }
      if (Platform.OS === 'web' && nav?.clipboard) { await nav.clipboard.writeText(url); return; }
      await Share.share({ message, url });
    } catch {}
  };

  const Btn = ({ icon, label, active, onPress, activeColor }: { icon: string; label: string; active?: boolean; onPress: () => void; activeColor?: string }) => (
    <Pressable onPress={onPress} style={styles.btn} hitSlop={6}>
      <Text style={[styles.icon, active && { color: activeColor }]}>{icon}</Text>
      <Text style={[styles.label, { color: active ? (activeColor ?? c.primary) : c.textSecondary }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.bar, { borderColor: c.border }]}>
      <Btn icon={liked ? '❤️' : '🤍'} label={`좋아요${likeCount > 0 ? ` ${likeCount}` : ''}`} active={liked} activeColor="#E5484D" onPress={toggleLike} />
      <Btn icon={scrapped ? '🔖' : '📑'} label="스크랩" active={scrapped} activeColor={c.primary} onPress={toggleScrap} />
      <Btn icon="🔗" label="공유" onPress={share} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 10, marginTop: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4 },
  icon: { fontSize: 17 },
  label: { fontSize: 13.5, fontWeight: '700' },
});
