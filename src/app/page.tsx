'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LandingReveal from '@/components/scroll/LandingReveal';

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isConcluded =
        localStorage.getItem('techx_certificate_downloaded_global') === 'true' ||
        localStorage.getItem('techx_expedition_concluded_global') === 'true';

      if (isConcluded) {
        router.replace('/finish');
      }
    }
  }, [router]);

  return <LandingReveal />;
}

