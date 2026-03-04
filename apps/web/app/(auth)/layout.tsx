import { useTranslations } from 'next-intl';

function AuthLayoutContent({ children }: { children: React.ReactNode }) {
  const t = useTranslations('auth');

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">JouBuild</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('tagline')}</p>
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
