export const colors = {
  light: {
    background: '#ffffff',
    surface: '#f5f5f5',
    surfaceBorder: '#e5e5e5',
    text: '#171717',
    textSecondary: '#737373',
    textMuted: '#a3a3a3',
    primary: '#3B82F6',
    tabBar: '#ffffff',
    tabBarBorder: '#e5e5e5',
    header: '#ffffff',
    input: '#f5f5f5',
    inputBorder: '#d4d4d4',
  },
  dark: {
    background: '#0a0a0a',
    surface: '#171717',
    surfaceBorder: '#262626',
    text: '#ffffff',
    textSecondary: '#a3a3a3',
    textMuted: '#737373',
    primary: '#3B82F6',
    tabBar: '#171717',
    tabBarBorder: '#262626',
    header: '#171717',
    input: '#262626',
    inputBorder: '#404040',
  },
} as const;

export type ThemeColors = (typeof colors)['dark'] | (typeof colors)['light'];
