'use client';

import { useRouter, useParams } from 'next/navigation';
import { DonatePage } from '@/views/DonatePage';

export default function Page() {
  const router = useRouter();
  const params = useParams();
  const rawUsername = (params?.username as string) || '';
  const cleanUsername = decodeURIComponent(rawUsername).replace(/^@/, '');

  return (
    <DonatePage
      username={cleanUsername}
      onNavigate={(page) => {
        if (page === 'home') router.push('/');
        else router.push(`/${page}`);
      }}
    />
  );
}
