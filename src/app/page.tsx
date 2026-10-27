'use client';

import { useRouter } from 'next/navigation';
import { HomePage } from '@/views/HomePage';

export default function Page() {
  const router = useRouter();

  const handleNavigate = (page: string, params?: any) => {
    if (page === 'home') router.push('/');
    else if (page === 'dashboard') router.push('/dashboard');
    else if (page === 'pricing') router.push('/pricing');
    else if (page === 'resources') router.push('/resources');
    else if (page === 'discord') router.push('/discord');
    else if (page === 'login') router.push('/login');
    else if (page === 'donate') {
      const u = params?.username || 'neonstreamer';
      router.push(`/@${u}`);
    } else {
      router.push(`/${page}`);
    }
  };

  return <HomePage onNavigate={handleNavigate} />;
}
