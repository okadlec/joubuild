import { cookies } from 'next/headers';

export type Theme = 'light' | 'dark' | 'system';

export async function getTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value as Theme | undefined;
  if (theme && ['light', 'dark', 'system'].includes(theme)) {
    return theme;
  }
  return 'light';
}
