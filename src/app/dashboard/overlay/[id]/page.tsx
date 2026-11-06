'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function Page() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id ? String(params.id) : '';

  useEffect(() => {
    if (id) {
      router.replace(`/dashboard?tab=donation&id=${encodeURIComponent(id)}`);
    } else {
      router.replace('/dashboard?tab=donation');
    }
  }, [router, id]);

  return null;
}
