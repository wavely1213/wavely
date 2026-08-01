// 앱 기본 폰트 = Pretendard (디자인 정본 CLAUDE_RULES §'폰트 Pretendard 고정',
// NEIGHBORHOOD_LEVEL.md §9 '앱 Pretendard / 웹 Noto Sans KR').
//
// RN에는 CSS처럼 상속되는 전역 폰트가 없다. React 19부터 forwardRef 컴포넌트의 defaultProps가
// 무시되므로 예전에 쓰던 `Text.defaultProps.style` 패치도 동작하지 않는다.
// → react-native의 Text/TextInput을 감싼 이 모듈을 대신 import 한다.
//
// 굵기는 각 화면의 fontWeight를 그대로 쓴다(631곳). weight 매핑은 app.json의 expo-font 플러그인이
// 담당한다 — 안드로이드는 fontDefinitions(400/600/700/800)로 XML 폰트패밀리를 만들고,
// iOS는 폰트 파일 내부 이름으로 해석한다. 등록 안 된 굵기(500·900)는 가장 가까운 값으로 떨어진다.
import { forwardRef } from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type TextInput as RNTextInputType,
  type TextInputProps,
  type TextProps,
  type Text as RNTextType,
} from 'react-native';

const base = StyleSheet.create({ f: { fontFamily: 'Pretendard' } });

export const Text = forwardRef<RNTextType, TextProps>(function Text({ style, ...rest }, ref) {
  return <RNText ref={ref} {...rest} style={[base.f, style]} />;
});

export const TextInput = forwardRef<RNTextInputType, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} {...rest} style={[base.f, style]} />;
});
