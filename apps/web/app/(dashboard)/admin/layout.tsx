import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
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

  const t = await getTranslations('admin');

  const navItems: NavItem[] = ctx.isSuperadmin
    ? [
        { label: t('overview'), href: '/admin', icon: 'LayoutDashboard' },
        { label: t('organizations'), href: '/admin/organizations', icon: 'Building2' },
        { label: t('users'), href: '/admin/users', icon: 'Users' },
        { label: t('trash'), href: '/admin/trash', icon: 'Trash2' },
      ]
    : [
        { label: t('overview'), href: '/admin', icon: 'LayoutDashboard' },
        { label: t('members'), href: '/admin/users', icon: 'Users' },
        { label: t('trash'), href: '/admin/trash', icon: 'Trash2' },
      ];

  const title = ctx.isSuperadmin ? t('title') : t('orgAdminTitle');
  const subtitle = ctx.isSuperadmin
    ? t('superadminSubtitle')
    : t('orgAdminSubtitle');

  return (
    <AdminShell title={title} subtitle={subtitle} navItems={navItems}>
      {children}
    </AdminShell>
  );
}
