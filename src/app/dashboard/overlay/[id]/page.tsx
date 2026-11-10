'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function Page() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id ? String(params.id) : '';

  useEffect(() => {
    if (id) {
      router.replace(`/creator?tab=donation&id=${encodeURIComponent(id)}`);
    } else {
      router.replace('/creator?tab=donation');
    }
  }, [router, id]);

  return null;
}
