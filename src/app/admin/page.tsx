import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth/adminAuth';
import AdminDashboard from './AdminDashboard';

export default async function AdminPage() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect('/admin/login');
  }

  return <AdminDashboard />;
}
