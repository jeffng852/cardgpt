import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth/adminAuth';
import RuleForm from '../RuleForm';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewRulePage({ params }: PageProps) {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect('/admin/login');
  }

  const { id } = await params;

  return <RuleForm cardId={id} ruleIndex={null} />;
}
