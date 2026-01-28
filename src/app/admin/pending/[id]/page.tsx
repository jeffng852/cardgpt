import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth/adminAuth';
import PendingReviewView from './PendingReviewView';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PendingReviewPage({ params }: PageProps) {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect('/admin/login');
  }

  const { id } = await params;

  return <PendingReviewView pendingId={id} />;
}
