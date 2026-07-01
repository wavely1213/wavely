import { Image } from 'expo-image';
import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // 디버그용 로그 (LogBox가 가려도 콘솔에 남김)
    console.error('WV_ERR_BOUNDARY', error?.message, '\nSTACK:', error?.stack, '\nCOMPONENT:', info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <View style={styles.root}>
          <Image source={require('@/assets/images/wavely-logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.title}>잠시 문제가 생겼어요</Text>
          <Text style={styles.msg}>화면을 불러오는 중 오류가 발생했어요. 다시 시도해주세요.</Text>
          <Pressable style={styles.btn} onPress={() => this.setState({ error: null })}>
            <Text style={styles.btnTxt}>다시 시도</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8, backgroundColor: '#0C0C0E' },
  emoji: { fontSize: 44 },
  logo: { width: 72, height: 72, borderRadius: 20 },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 8 },
  msg: { fontSize: 13, color: '#9aa', textAlign: 'center', lineHeight: 19 },
  btn: { marginTop: 18, backgroundColor: '#7A2BC4', paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12 },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
