'use client';

import { useRouter } from 'next/navigation';
import { DocumentationPage } from '@/views/DocumentationPage';

export default function Page() {
  const router = useRouter();

  const handleNavigate = (page: string) => {
    if (page === 'home') router.push('/');
    else if (page === 'dashboard' || page === 'creator') router.push('/creator');
    else if (page === 'pricing') router.push('/pricing');
    else if (page === 'documentation') router.push('/documentation');
    else router.push(`/${page}`);
  };

  return <DocumentationPage onNavigate={handleNavigate} />;
}
