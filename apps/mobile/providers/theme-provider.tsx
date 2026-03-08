import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/lib/colors';

type ThemeMode = 'light' | 'dark' | 'system';
type ThemeColors = {
  background: string;
  surface: string;
  surfaceBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  tabBar: string;
  tabBarBorder: string;
  header: string;
  input: string;
  inputBorder: string;
};

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  theme: ThemeColors;
}

const STORAGE_KEY = '@joubuild/theme';

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  setMode: () => {},
  isDark: true,
  theme: colors.dark,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
      setIsReady(true);
    });
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode);
  };

  const isDark =
    mode === 'system' ? systemScheme !== 'light' : mode === 'dark';

  const theme = isDark ? colors.dark : colors.light;

  if (!isReady) return null;

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
