import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth/adminAuth';
import CardEditForm from './CardEditForm';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CardEditPage({ params }: PageProps) {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect('/admin/login');
  }

  const { id } = await params;

  return <CardEditForm cardId={id} />;
}
