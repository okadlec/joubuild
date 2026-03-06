'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function NavigationProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<'idle' | 'loading' | 'complete'>('idle');
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      setState('loading');
      const timer = setTimeout(() => {
        setState('complete');
        const fadeTimer = setTimeout(() => setState('idle'), 300);
        return () => clearTimeout(fadeTimer);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  if (state === 'idle') return null;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 z-50 h-[3px] bg-primary transition-all',
        state === 'loading' && 'duration-700 ease-out w-[90%]',
        state === 'complete' && 'duration-200 ease-in w-full opacity-0'
      )}
    />
  );
}
