import { NextRequest, NextResponse } from 'next/server';

const validThemes = ['light', 'dark', 'system'] as const;

export async function POST(request: NextRequest) {
  const { theme } = await request.json();

  if (!validThemes.includes(theme)) {
    return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
  }

  const response = NextResponse.json({ theme });
  response.cookies.set('theme', theme, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  });

  return response;
}
