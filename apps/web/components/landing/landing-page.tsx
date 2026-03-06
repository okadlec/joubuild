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
    <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white/80 px-1 py-0.5 text-sm backdrop-blur-sm">
      <button
        onClick={() => setLocale('cs')}
        className="rounded-full px-2.5 py-1 font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
      >
        CZ
      </button>
      <button
        onClick={() => setLocale('en')}
        className="rounded-full px-2.5 py-1 font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
      >
        EN
      </button>
    </div>
  );
}

export function LandingPage() {
  const t = useTranslations('landing');

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      {/* Nav */}
      <nav className="fixed top-0 right-0 left-0 z-50 border-b border-gray-100/80 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="text-xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Jou
            </span>
            Build
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              {t('nav.signIn')}
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-gray-800 hover:shadow-lg"
            >
              {t('nav.register')}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-[92vh] items-center justify-center overflow-hidden pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-white" />
        <div className="pointer-events-none absolute top-1/4 right-0 h-96 w-96 rounded-full bg-blue-100/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-1/4 left-0 h-96 w-96 rounded-full bg-indigo-100/30 blur-3xl" />

        <div className="landing-fade-in relative z-10 mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-5xl leading-tight font-extrabold tracking-tight text-gray-900 sm:text-6xl md:text-7xl">
            {t('hero.title')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl">
            {t('hero.subtitle')}
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="group relative inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-gray-900/10 transition-all hover:bg-gray-800 hover:shadow-2xl hover:shadow-gray-900/20"
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
      <section className="relative py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="landing-fade-in text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('features.title')}</h2>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featureKeys.map((key, i) => {
              const Icon = featureIcons[i];
              return (
                <div
                  key={key}
                  className="landing-fade-in group rounded-2xl border border-gray-100 bg-gray-50/50 p-8 transition-all hover:border-gray-200 hover:bg-white hover:shadow-lg hover:shadow-gray-100/80"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="mb-5 inline-flex rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 text-white shadow-lg shadow-blue-500/20">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{t(`features.${key}.title`)}</h3>
                  <p className="leading-relaxed text-gray-500">{t(`features.${key}.description`)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-28">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-blue-50/60 to-white" />
        <div className="landing-fade-in relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('cta.title')}</h2>
          <p className="mt-4 text-lg text-gray-500">{t('cta.subtitle')}</p>
          <div className="mt-10">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-gray-900/10 transition-all hover:bg-gray-800 hover:shadow-2xl"
            >
              {t('cta.button')}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-400">
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
