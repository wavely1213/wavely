import { Tabs } from 'expo-router';

import { FloatingTabBar } from '@/components/FloatingTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: '커뮤니티' }} />
      <Tabs.Screen name="explore" options={{ title: '우리동네' }} />
      <Tabs.Screen name="chats" options={{ title: '채팅' }} />
      <Tabs.Screen name="account" options={{ title: '내정보' }} />
    </Tabs>
  );
}
