'use client';

import { useRouter } from 'next/navigation';
import { ResourcesPage } from '@/views/ResourcesPage';

export default function Page() {
  const router = useRouter();

  const handleNavigate = (page: string) => {
    if (page === 'home') router.push('/');
    else if (page === 'dashboard') router.push('/dashboard');
    else if (page === 'pricing') router.push('/pricing');
    else router.push(`/${page}`);
  };

  return <ResourcesPage onNavigate={handleNavigate} />;
}
