import { redirect } from 'next/navigation';
import { checkAdminAccess } from '@/lib/supabase/admin';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await checkAdminAccess();

  if (!isAdmin) {
    redirect('/projects');
  }

  return <>{children}</>;
}
