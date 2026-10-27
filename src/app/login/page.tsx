'use client';

import { useRouter } from 'next/navigation';
import { LoginPage } from '@/views/LoginPage';

export default function Page() {
  const router = useRouter();

  return <LoginPage onSuccess={() => router.push('/dashboard')} />;
}
