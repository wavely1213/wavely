import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// .env 파일의 값을 읽어옵니다. (EXPO_PUBLIC_ 로 시작해야 앱에서 보입니다)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 웹은 브라우저 저장소, 앱은 AsyncStorage 에 로그인 상태를 보관
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // 웹은 OAuth(네이버) 콜백 후 URL 해시의 세션을 자동 감지해야 함. 앱은 딥링크로 처리.
    detectSessionInUrl: Platform.OS === 'web',
  },
});
