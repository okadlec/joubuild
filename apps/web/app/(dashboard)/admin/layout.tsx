import { redirect } from 'next/navigation';
import { checkSuperadmin } from '@/lib/supabase/admin';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await checkSuperadmin();

  if (!isAdmin) {
    redirect('/projects');
  }

  return <>{children}</>;
}
