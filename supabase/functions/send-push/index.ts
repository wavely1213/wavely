// 푸시 발송 Edge Function — notifications 테이블 트리거(notify_push)가 x-push-secret 헤더로 호출.
// 해당 유저의 expo push 토큰을 찾아 Expo Push API로 발송. 무효 토큰은 정리.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUSH_SECRET = Deno.env.get('PUSH_SECRET')!;

Deno.serve(async (req) => {
  if (req.headers.get('x-push-secret') !== PUSH_SECRET) {
    return new Response('forbidden', { status: 403 });
  }
  const { user_id, title, body, link } = await req.json().catch(() => ({} as any));
  if (!user_id || !title) return new Response('bad request', { status: 400 });

  const admin = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: rows } = await admin.from('push_tokens').select('token').eq('user_id', user_id);
  const tokens = (rows ?? []).map((r: any) => r.token).filter((t: string) => typeof t === 'string' && t.startsWith('ExponentPushToken'));
  if (!tokens.length) return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });

  const messages = tokens.map((to: string) => ({
    to,
    title,
    body: body || '',
    sound: 'default',
    data: link ? { link } : {},
    channelId: 'default',
  }));

  let result: any = {};
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate' },
      body: JSON.stringify(messages),
    });
    result = await res.json().catch(() => ({}));
  } catch (_e) {
    return new Response(JSON.stringify({ sent: 0, error: 'push_api_failed' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // DeviceNotRegistered 토큰 삭제
  try {
    const data = result?.data ?? [];
    const dead = tokens.filter((_: string, i: number) => data[i]?.details?.error === 'DeviceNotRegistered');
    if (dead.length) await admin.from('push_tokens').delete().in('token', dead);
  } catch (_e) { /* ignore */ }

  return new Response(JSON.stringify({ sent: tokens.length }), { headers: { 'Content-Type': 'application/json' } });
});
