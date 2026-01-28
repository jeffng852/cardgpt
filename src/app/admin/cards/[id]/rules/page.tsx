import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth/adminAuth';
import RuleListView from './RuleListView';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RulesPage({ params }: PageProps) {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect('/admin/login');
  }

  const { id } = await params;

  return <RuleListView cardId={id} />;
}
