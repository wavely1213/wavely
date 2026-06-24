import { Tabs } from 'expo-router';
import { Platform, useWindowDimensions, View } from 'react-native';

import { FloatingTabBar } from '@/components/FloatingTabBar';
import { DesktopSidebar, DesktopRightRail, DESKTOP_MIN, RAIL_MIN } from '@/components/DesktopShell';
import { useScheme } from '@/lib/theme';
import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const scheme = useScheme();
  const c = Colors[scheme];
  const desktop = Platform.OS === 'web' && width >= DESKTOP_MIN;

  const tabs = (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={desktop ? () => null : (props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: '커뮤니티' }} />
      <Tabs.Screen name="explore" options={{ title: '우리동네' }} />
      <Tabs.Screen name="chats" options={{ title: '채팅' }} />
      <Tabs.Screen name="account" options={{ title: '내정보' }} />
    </Tabs>
  );

  if (!desktop) return tabs;

  // 데스크톱 3-Column 셸: 사이드바 + 센터(Tabs) + 우레일(>=1180)
  // 웹 높이 전파 안정화를 위해 flex:1 + height:'100%' 병기.
  return (
    <View style={{ flex: 1, height: '100%', alignItems: 'center', backgroundColor: c.background } as any}>
      <View style={{ flex: 1, height: '100%', width: '100%', maxWidth: 1320, flexDirection: 'row' } as any}>
        <DesktopSidebar />
        <View style={{ flex: 1, height: '100%', minWidth: 0 } as any}>{tabs}</View>
        {width >= RAIL_MIN ? <DesktopRightRail /> : null}
      </View>
    </View>
  );
}
