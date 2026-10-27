'use client';

import { useRouter } from 'next/navigation';
import { DonatePage } from '@/views/DonatePage';

export default function Page() {
  const router = useRouter();

  return (
    <DonatePage
      username="neonstreamer"
      onNavigate={(page) => {
        if (page === 'home') router.push('/');
        else router.push(`/${page}`);
      }}
    />
  );
}
