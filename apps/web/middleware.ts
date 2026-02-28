import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

// Static files that must never go through auth middleware
const STATIC_FILES = new Set(['/manifest.json', '/sw.js', '/favicon.ico']);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for static assets (safety net in case matcher leaks)
  if (STATIC_FILES.has(pathname) || pathname.startsWith('/icons/')) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mjs|js|css)$).*)',
  ],
};
