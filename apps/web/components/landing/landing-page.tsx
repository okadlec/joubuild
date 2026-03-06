'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  FileText,
  CheckSquare,
  Camera,
  ClipboardList,
  Users,
  Smartphone,
} from 'lucide-react';

const featureIcons = [FileText, CheckSquare, Camera, ClipboardList, Users, Smartphone] as const;
const featureKeys = ['plans', 'tasks', 'photos', 'forms', 'realtime', 'offline'] as const;

function LanguageToggle() {
  const setLocale = (locale: string) => {
    document.cookie = `locale=${locale};path=/;max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-1 py-0.5 text-sm backdrop-blur-sm">
      <button
        onClick={() => setLocale('cs')}
        className="rounded-full px-2.5 py-1 font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        CZ
      </button>
      <button
        onClick={() => setLocale('en')}
        className="rounded-full px-2.5 py-1 font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        EN
      </button>
    </div>
  );
}

export function LandingPage() {
  const t = useTranslations('landing');

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 antialiased">
      {/* Nav */}
      <nav className="fixed top-0 right-0 left-0 z-50 border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="text-xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Jou
            </span>
            <span className="text-white">Build</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              {t('nav.signIn')}
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25"
            >
              {t('nav.register')}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-[92vh] items-center justify-center overflow-hidden pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/50 via-gray-950 to-gray-950" />
        <div className="pointer-events-none absolute top-1/4 right-0 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-1/4 left-0 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />

        <div className="landing-fade-in relative z-10 mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-5xl leading-tight font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl">
            {t('hero.title')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
            {t('hero.subtitle')}
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="group relative inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-blue-600/20 transition-all hover:bg-blue-500 hover:shadow-2xl hover:shadow-blue-500/30"
            >
              {t('hero.cta')}
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative border-t border-white/5 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="landing-fade-in text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{t('features.title')}</h2>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featureKeys.map((key, i) => {
              const Icon = featureIcons[i];
              return (
                <div
                  key={key}
                  className="landing-fade-in group rounded-2xl border border-white/10 bg-white/5 p-8 transition-all hover:border-blue-500/30 hover:bg-white/10 hover:shadow-lg hover:shadow-blue-500/5"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="mb-5 inline-flex rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 text-white shadow-lg shadow-blue-500/20">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">{t(`features.${key}.title`)}</h3>
                  <p className="leading-relaxed text-gray-400">{t(`features.${key}.description`)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-white/5 py-28">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gray-950 via-blue-950/20 to-gray-950" />
        <div className="landing-fade-in relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{t('cta.title')}</h2>
          <p className="mt-4 text-lg text-gray-400">{t('cta.subtitle')}</p>
          <div className="mt-10">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-blue-600/20 transition-all hover:bg-blue-500 hover:shadow-2xl hover:shadow-blue-500/30"
            >
              {t('cta.button')}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-500">
          {t('footer.copyright')}
        </div>
      </footer>

      <style jsx global>{`
        @keyframes landingFadeIn {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .landing-fade-in {
          animation: landingFadeIn 0.7s ease-out both;
        }
      `}</style>
    </div>
  );
}
