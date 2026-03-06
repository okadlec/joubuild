import { useTranslations } from 'next-intl';

function AuthLayoutContent({ children }: { children: React.ReactNode }) {
  const t = useTranslations('auth');

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-950 p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.15)_0%,_transparent_50%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-3xl font-bold text-transparent">JouBuild</h1>
          <p className="mt-1 text-sm text-gray-400">{t('tagline')}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayoutContent>{children}</AuthLayoutContent>;
}
