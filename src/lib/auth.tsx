import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';

import { registerPush, unregisterPush } from './push';
import { isSupabaseConfigured, supabase } from './supabase';

export type Profile = {
  id: string;
  nickname: string;
  role: 'owner' | 'staff' | 'parttime' | 'guest';
  biz_verified: boolean;
  company_id: string | null;
  is_admin: boolean;
  friend_code: string | null;
  username: string | null;
  avatar_url: string | null;
  phone: string | null;
  place_pass_until: string | null;   // 플레이스 분석 이용권 만료일시(null=무료). > now 면 유료.
  place_plan: 'basic' | 'premium' | null;   // 활성 등급
};

// 활성 이용권(등급 무관: basic/premium) 여부
export function hasPlacePass(profile: Profile | null): boolean {
  return !!profile?.place_pass_until && new Date(profile.place_pass_until).getTime() > Date.now();
}
// 활성 프리미엄(경쟁사 분석 가능) 여부
export function isPlacePremium(profile: Profile | null): boolean {
  return hasPlacePass(profile) && profile?.place_plan === 'premium';
}

// 매장 수정/삭제 권한: 관리자 · 매장 사장님 · 매장 소속 직원
export function canEditStore(profile: Profile | null, store: { owner_id?: string | null; id: string } | null): boolean {
  if (!profile || !store) return false;
  if (profile.is_admin) return true;
  if (store.owner_id && store.owner_id === profile.id) return true;
  if (profile.role === 'staff' && profile.company_id === store.id) return true;
  return false;
}

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const sel = 'id,nickname,role,biz_verified,company_id,is_admin,friend_code,username,avatar_url,phone,place_pass_until,place_plan';
    let { data } = await supabase.from('profiles').select(sel).eq('id', userId).maybeSingle();
    if (!data) {
      // 프로필이 없으면 자동 생성 후 재조회 (소셜 로그인·구 계정 안전장치 → 1계정=1프로필 보장)
      await supabase.rpc('ensure_profile');
      ({ data } = await supabase.from('profiles').select(sel).eq('id', userId).maybeSingle());
    }
    setProfile((data as Profile) ?? null);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
        registerPush(data.session.user.id);
        supabase.rpc('earn_biz_money', { p_action: 'attendance' }).then(() => {}, () => {}); // 출석 적립(사장님, 1일 1회)
      } else setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        loadProfile(newSession.user.id);
        registerPush(newSession.user.id);
        supabase.rpc('earn_biz_money', { p_action: 'attendance' }).then(() => {}, () => {}); // 출석 적립(사장님, 1일 1회)
      } else setProfile(null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (session) await loadProfile(session.user.id);
  };

  const signOut = async () => {
    await unregisterPush(); // 세션 있을 때 이 기기 토큰 제거 (RLS)
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
