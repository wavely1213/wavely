// 네이티브(iOS/Android) 푸시 토큰 등록. 웹에서는 push.web.ts(no-op)가 사용됨.
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

// 앱이 켜져 있을 때도 알림 배너 표시
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getProjectId(): string | undefined {
  return (
    (Constants.expoConfig as any)?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId
  );
}

// 로그인 시 호출: 권한 요청 → Expo 푸시 토큰 → DB 저장
export async function registerPush(userId: string): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '기본 알림',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return;

    const projectId = getProjectId();
    const resp = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const token = resp.data;
    if (!token) return;
    await supabase.from('push_tokens').upsert(
      { token, user_id: userId, platform: Platform.OS },
      { onConflict: 'token' },
    );
  } catch (_e) {
    // 권한 거부·시뮬레이터·네트워크 등은 조용히 무시
  }
}

// 로그아웃 시 호출: 이 기기 토큰 제거
export async function unregisterPush(): Promise<void> {
  try {
    const projectId = getProjectId();
    const resp = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (resp.data) await supabase.from('push_tokens').delete().eq('token', resp.data);
  } catch (_e) {
    /* ignore */
  }
}
