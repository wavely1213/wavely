import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { ReactionBar } from '@/components/ReactionBar';
import { VideoPost } from '@/components/VideoPost';
import { boardLabel, parseHashtags } from '@/constants/app';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Post = { id: string; board: string; author_id: string; title: string; body: string | null; body_preview: string | null; image_url: string | null; media_type: string | null; place_name: string | null; place_address: string | null; place_link: string | null; created_at: string; anonymous: boolean; profiles: { nickname: string; avatar_url: string | null } | null };
type Comment = { id: string; body: string; created_at: string; anonymous: boolean; author_id: string; profiles: { nickname: string; avatar_url: string | null } | null };

export default function PostDetailScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [commentAnon, setCommentAnon] = useState(true);
  const [confirmDel, setConfirmDel] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setFailed(false);
    // 비로그인은 본문·사진·댓글 열람 불가 → 제목 등 최소 컬럼만
    const authed = !!session;
    if (!authed) {
      const { data: p, error } = await supabase.from('posts').select('id,title,dong,board,created_at').eq('id', id).single();
      if (error && error.code !== 'PGRST116') { setFailed(true); setLoading(false); return; }
      setPost((p as unknown as Post) ?? null);
      setComments([]);
      setLoading(false);
      return;
    }
    const cols = 'id,board,author_id,title,body,body_preview,image_url,media_type,place_name,place_address,place_link,created_at,anonymous,profiles(nickname,avatar_url)';
    const { data: p, error } = await supabase.from('posts').select(cols).eq('id', id).single();
    if (error && error.code !== 'PGRST116') { setFailed(true); setLoading(false); return; }
    setPost((p as unknown as Post) ?? null);
    const { data: cs } = await supabase
      .from('comments').select('id,body,created_at,anonymous,author_id,profiles(nickname,avatar_url)').eq('post_id', id).order('created_at', { ascending: true });
    setComments((cs as unknown as Comment[]) ?? []);
    setLoading(false);
  }, [id, session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addComment = async () => {
    if (!session || !text.trim() || sending) return;
    const body = text.trim();
    setSending(true);
    const { error } = await supabase.from('comments').insert({ post_id: id, author_id: session.user.id, body, anonymous: commentAnon });
    setSending(false);
    if (error) { setActionMsg('댓글 등록 실패: ' + error.message); return; }
    setText('');
    load();
  };

  const isMine = !!session && post?.author_id === session.user.id;
  const deletePost = async () => {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) { setConfirmDel(false); setActionMsg('삭제 실패: ' + error.message); return; }
    router.back();
  };
  const deleteComment = async (cmId: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', cmId);
    if (error) { setActionMsg('댓글 삭제 실패: ' + error.message); return; }
    if (editingId === cmId) { setEditingId(null); setEditText(''); }
    load();
  };
  const startEdit = (cm: Comment) => { setEditingId(cm.id); setEditText(cm.body); setActionMsg(''); };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };
  const saveEdit = async (cmId: string) => {
    if (!editText.trim()) return;
    setSavingEdit(true);
    const { error } = await supabase.from('comments').update({ body: editText.trim() }).eq('id', cmId);
    setSavingEdit(false);
    if (error) { setActionMsg('댓글 수정 실패: ' + error.message); return; }
    setEditingId(null); setEditText('');
    load();
  };

  const tags = post ? parseHashtags(`${post.title} ${post.body ?? ''}`) : [];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border, backgroundColor: c.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}>
          <Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text>
        </Pressable>
        {post && session ? (
          isMine ? (
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <Pressable onPress={() => router.push(`/write?edit=${id}`)} hitSlop={8}><Text style={{ color: c.primary, fontSize: 13, fontWeight: '800' }}>✏️ 수정</Text></Pressable>
              <Pressable onPress={() => setConfirmDel(true)} hitSlop={8}><Text style={{ color: '#E5484D', fontSize: 13, fontWeight: '800' }}>🗑 삭제</Text></Pressable>
            </View>
          ) : (
            <Pressable onPress={() => router.push(`/report?type=post&id=${id}&label=${encodeURIComponent(post.title)}`)} hitSlop={8}>
              <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '700' }}>🚩 신고</Text>
            </Pressable>
          )
        ) : null}
      </View>
      {confirmDel && (
        <View style={[styles.confirmBar, { backgroundColor: c.card, borderColor: '#E5484D' }]}>
          <Text style={{ color: c.text, fontWeight: '700', flex: 1 }}>이 글을 삭제할까요? (되돌릴 수 없어요)</Text>
          <Pressable onPress={() => setConfirmDel(false)} style={[styles.cBtn, { borderColor: c.border, borderWidth: 1 }]}><Text style={{ color: c.textSecondary, fontWeight: '800' }}>취소</Text></Pressable>
          <Pressable onPress={deletePost} style={[styles.cBtn, { backgroundColor: '#E5484D' }]}><Text style={{ color: '#fff', fontWeight: '800' }}>삭제</Text></Pressable>
        </View>
      )}
      {actionMsg ? (
        <Pressable onPress={() => setActionMsg('')} style={[styles.actionMsg, { backgroundColor: '#E5484D' }]}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>{actionMsg} (탭하여 닫기)</Text>
        </Pressable>
      ) : null}

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={c.primary} /></View>
      ) : failed ? (
        <View style={styles.center}><Text style={{ color: c.textSecondary, marginBottom: 12 }}>불러오지 못했어요. 연결을 확인해주세요.</Text><Pressable onPress={() => { setLoading(true); load(); }} style={{ backgroundColor: c.primary, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 10 }}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>다시 시도</Text></Pressable></View>
      ) : !post ? (
        <View style={styles.center}><Text style={{ color: c.textSecondary }}>글을 찾을 수 없어요</Text></View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={{ padding: 16 }}>
            <View style={styles.metaRow}>
              {session ? (
                <>
                  <Avatar url={post.anonymous ? null : post.profiles?.avatar_url} fallback={post.anonymous ? '🕶️' : '🙂'} size={28} bg={c.primarySoft} />
                  <Text style={[styles.nick, { color: c.text }]}>{post.anonymous ? '익명' : (post.profiles?.nickname ?? '회원')}</Text>
                </>
              ) : null}
              <View style={[styles.tag, { backgroundColor: c.primarySoft }]}>
                <Text style={[styles.tagTxt, { color: c.primary }]}>{boardLabel(post.board)}</Text>
              </View>
            </View>

            <Text style={[styles.title, { color: c.text }]}>{post.title}</Text>
            {(post.body ?? post.body_preview) ? <Text style={[styles.body, { color: c.text }]}>{post.body ?? post.body_preview}</Text> : null}
            {post.image_url ? (
              post.media_type === 'video'
                ? <VideoPost uri={post.image_url} style={styles.photo} />
                : <Image source={{ uri: post.image_url }} style={styles.photo} contentFit="cover" transition={150} />
            ) : null}

            {post.place_name ? (
              <Pressable
                onPress={() => post.place_link && /^https?:\/\//i.test(post.place_link) && Linking.openURL(post.place_link)}
                style={[styles.placeCard, { backgroundColor: c.primarySoft, borderColor: c.primary }]}>
                <Text style={[styles.placeName, { color: c.primaryDeep }]}>📍 {post.place_name}</Text>
                {post.place_address ? <Text style={[styles.placeAddr, { color: c.textSecondary }]}>{post.place_address}</Text> : null}
                <Text style={[styles.placeOpen, { color: c.primary }]}>네이버 지도에서 보기 ›</Text>
              </Pressable>
            ) : null}

            {tags.length > 0 && (
              <View style={styles.tags}>
                {tags.map((t) => (
                  <Pressable key={t} onPress={() => router.push(`/?tag=${encodeURIComponent(t)}`)} style={[styles.hashChip, { backgroundColor: c.primarySoft }]}>
                    <Text style={[styles.hashTxt, { color: c.primaryDeep }]}>#{t}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {!session ? (
            <Pressable onPress={() => router.push('/login')} style={[styles.gate, { backgroundColor: c.primarySoft, borderColor: c.primary }]}>
              <Text style={{ color: c.primaryDeep, fontWeight: '800', fontSize: 14.5 }}>🔒 전체 내용과 댓글 보기</Text>
              <Text style={{ color: c.textSecondary, fontSize: 12.5, marginTop: 4, textAlign: 'center' }}>로그인하면 글 전체와 댓글을 볼 수 있어요{'\n'}우리 동네 이야기, 무료로 함께해요</Text>
              <View style={[styles.gateBtn, { backgroundColor: c.primary }]}><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 13.5 }}>로그인 / 가입하기</Text></View>
            </Pressable>
          ) : (
            <>
          <View style={{ paddingHorizontal: 16 }}>
            <ReactionBar targetType="post" targetId={String(id)} title={post.title} sharePath={`/post/${id}`} />
          </View>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <Text style={[styles.commentHead, { color: c.text }]}>댓글 {comments.length}</Text>
          {comments.length === 0 ? (
            <Text style={[styles.noComment, { color: c.textSecondary }]}>첫 댓글을 남겨보세요</Text>
          ) : (
            comments.map((cm) => (
              <View key={cm.id} style={[styles.comment, { borderColor: c.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Avatar url={cm.anonymous ? null : cm.profiles?.avatar_url} fallback={cm.anonymous ? '🕶️' : '🙂'} size={22} bg={c.primarySoft} />
                    <Text style={[styles.cNick, { color: c.text }]}>{cm.anonymous ? '익명' : (cm.profiles?.nickname ?? '회원')}</Text>
                    {!cm.anonymous ? <View style={[styles.realBadge, { backgroundColor: c.primarySoft }]}><Text style={[styles.realBadgeTxt, { color: c.primaryDeep }]}>공개</Text></View> : null}
                  </View>
                  {session ? (
                    cm.author_id === session.user.id ? (
                      editingId === cm.id ? null : (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <Pressable onPress={() => startEdit(cm)} hitSlop={6}>
                            <Text style={{ color: c.primary, fontSize: 11, fontWeight: '800' }}>✏️ 수정</Text>
                          </Pressable>
                          <Pressable onPress={() => deleteComment(cm.id)} hitSlop={6}>
                            <Text style={{ color: '#E5484D', fontSize: 11, fontWeight: '800' }}>🗑 삭제</Text>
                          </Pressable>
                        </View>
                      )
                    ) : (
                      <Pressable onPress={() => router.push(`/report?type=comment&id=${cm.id}&label=${encodeURIComponent(cm.body.slice(0, 30))}`)} hitSlop={6}>
                        <Text style={{ color: c.textSecondary, fontSize: 11, fontWeight: '700' }}>🚩</Text>
                      </Pressable>
                    )
                  ) : null}
                </View>
                {editingId === cm.id ? (
                  <View style={{ marginTop: 6 }}>
                    <TextInput
                      style={[styles.editInput, { color: c.text, backgroundColor: c.background, borderColor: c.primary }]}
                      value={editText}
                      onChangeText={setEditText}
                      multiline
                      autoFocus
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                      <Pressable onPress={cancelEdit} style={[styles.editBtn, { borderColor: c.border, borderWidth: 1 }]}><Text style={{ color: c.textSecondary, fontWeight: '800', fontSize: 12 }}>취소</Text></Pressable>
                      <Pressable onPress={() => saveEdit(cm.id)} disabled={savingEdit || !editText.trim()} style={[styles.editBtn, { backgroundColor: editText.trim() ? c.primary : c.border }]}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{savingEdit ? '저장중' : '저장'}</Text></Pressable>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.cBody, { color: c.textSecondary }]}>{cm.body}</Text>
                )}
              </View>
            ))
          )}
            </>
          )}
        </ScrollView>
      )}

      {/* 댓글 입력 */}
      {session ? (
        <View style={[styles.inputBar, { backgroundColor: c.card, borderColor: c.border }]}>
          <Pressable onPress={() => setCommentAnon((v) => !v)} style={[styles.anonToggle, { backgroundColor: commentAnon ? c.backgroundElement : c.primarySoft, borderColor: commentAnon ? c.border : c.primary }]}>
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: commentAnon ? c.textSecondary : c.primaryDeep }}>{commentAnon ? '익명' : '공개'}</Text>
          </Pressable>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, color: c.text, borderColor: c.border }]}
            placeholder={commentAnon ? '익명으로 댓글 달기...' : '닉네임 공개로 댓글 달기...'}
            placeholderTextColor={c.textSecondary}
            value={text}
            onChangeText={setText}
          />
          <Pressable onPress={addComment} disabled={sending || !text.trim()}>
            <Text style={[styles.send, { color: text.trim() ? c.primary : c.textSecondary }]}>등록</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={[styles.loginBar, { backgroundColor: c.card, borderColor: c.border }]} onPress={() => router.push('/login')}>
          <Text style={{ color: c.primary, fontWeight: '700' }}>로그인하고 댓글 달기</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  confirmBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1.5 },
  actionMsg: { paddingHorizontal: 14, paddingVertical: 9 },
  cBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9 },
  back: { fontSize: 16, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  anon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  anonTxt: { fontSize: 11, fontWeight: '800' },
  nick: { fontSize: 14, fontWeight: '700' },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  tagTxt: { fontSize: 11, fontWeight: '800' },
  title: { fontSize: 19, fontWeight: '800', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 23 },
  photo: { width: '100%', height: 240, borderRadius: 14, marginTop: 14 },
  placeCard: { marginTop: 14, padding: 14, borderRadius: 12, borderWidth: 1.5 },
  placeName: { fontSize: 15, fontWeight: '800' },
  placeAddr: { fontSize: 13, marginTop: 3 },
  placeOpen: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  hashChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  hashTxt: { fontSize: 13, fontWeight: '700' },
  gate: { margin: 16, padding: 20, borderRadius: 14, borderWidth: 1.5, alignItems: 'center' },
  gateBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 999 },
  divider: { height: 8 },
  commentHead: { fontSize: 14, fontWeight: '800', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  noComment: { fontSize: 13, paddingHorizontal: 16, paddingVertical: 10 },
  comment: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  cNick: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  cBody: { fontSize: 14, lineHeight: 20 },
  editInput: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, minHeight: 60 },
  editBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9 },
  realBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 },
  realBadgeTxt: { fontSize: 10, fontWeight: '800' },
  anonToggle: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14 },
  send: { fontSize: 15, fontWeight: '800', paddingHorizontal: 4 },
  loginBar: { alignItems: 'center', paddingVertical: 14, borderTopWidth: 1 },
});
