import { redirect } from 'next/navigation';
import { getCurrentAdminContext, type AdminContext } from '@/lib/supabase/admin';
import { AdminShell, type NavItem } from './admin-shell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentAdminContext();

  if (!ctx) {
    redirect('/projects');
  }

  const navItems: NavItem[] = ctx.isSuperadmin
    ? [
        { label: 'Prehled', href: '/admin', icon: 'LayoutDashboard' },
        { label: 'Organizace', href: '/admin/organizations', icon: 'Building2' },
        { label: 'Uzivatele', href: '/admin/users', icon: 'Users' },
      ]
    : [
        { label: 'Prehled', href: '/admin', icon: 'LayoutDashboard' },
        { label: 'Clenove', href: '/admin/users', icon: 'Users' },
      ];

  const title = ctx.isSuperadmin ? 'Admin Dashboard' : 'Sprava organizace';
  const subtitle = ctx.isSuperadmin
    ? 'Sprava platformy JouBuild'
    : 'Sprava clenu a projektu vasi organizace';

  return (
    <AdminShell title={title} subtitle={subtitle} navItems={navItems}>
      {children}
    </AdminShell>
  );
}
