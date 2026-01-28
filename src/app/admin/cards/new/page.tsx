import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth/adminAuth';
import CardEditForm from '../[id]/CardEditForm';

export default async function NewCardPage() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect('/admin/login');
  }

  return <CardEditForm cardId="new" />;
}
