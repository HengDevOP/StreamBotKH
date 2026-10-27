'use client';

import { useRouter } from 'next/navigation';
import { PricingPage } from '@/views/PricingPage';

export default function Page() {
  const router = useRouter();

  const handleNavigate = (page: string) => {
    if (page === 'home') router.push('/');
    else if (page === 'dashboard') router.push('/dashboard');
    else if (page === 'login') router.push('/login');
    else router.push(`/${page}`);
  };

  return <PricingPage onNavigate={handleNavigate} />;
}
