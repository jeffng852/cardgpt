import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth/adminAuth';
import UploadExtractor from './UploadExtractor';

export default async function UploadPage() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect('/admin/login');
  }

  return <UploadExtractor />;
}
