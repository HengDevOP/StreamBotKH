'use client';

import { useRouter } from 'next/navigation';
import { DiscordPage } from '@/views/DiscordPage';

export default function Page() {
  const router = useRouter();

  const handleNavigate = (page: string) => {
    if (page === 'home') router.push('/');
    else if (page === 'dashboard') router.push('/dashboard');
    else router.push(`/${page}`);
  };

  return <DiscordPage onNavigate={handleNavigate} />;
}
