import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth/adminAuth';
import RuleForm from '../RuleForm';

type PageProps = {
  params: Promise<{ id: string; ruleId: string }>;
};

export default async function EditRulePage({ params }: PageProps) {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect('/admin/login');
  }

  const { id, ruleId } = await params;
  const ruleIndex = parseInt(ruleId, 10);

  return <RuleForm cardId={id} ruleIndex={isNaN(ruleIndex) ? null : ruleIndex} />;
}
