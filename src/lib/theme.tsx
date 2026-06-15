// 앱 전역 화면 테마(라이트/다크/시스템) 관리.
// mode='system'이면 기기 설정을 따르고, 'light'|'dark'면 사용자가 고른 값으로 고정한다.
// 선택값은 AsyncStorage에 저장돼 앱을 다시 켜도 유지된다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';
type Scheme = 'light' | 'dark';

const STORAGE_KEY = 'theme-mode';

type ThemeCtx = { mode: ThemeMode; setMode: (m: ThemeMode) => void; scheme: Scheme };
const Ctx = createContext<ThemeCtx>({ mode: 'system', setMode: () => {}, scheme: 'light' });

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useRNColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
    });
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  };

  const scheme: Scheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;

  return <Ctx.Provider value={{ mode, setMode, scheme }}>{children}</Ctx.Provider>;
}

// 화면에서 쓰는 현재 테마('light'|'dark')
export function useScheme(): Scheme {
  return useContext(Ctx).scheme;
}

// 설정 화면에서 모드 선택/변경
export function useThemeMode() {
  const { mode, setMode } = useContext(Ctx);
  return { mode, setMode };
}
