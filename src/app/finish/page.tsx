'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import FinalCertificate from '@/components/FinalCertificate';

export default function FinishPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (!isLoading) {
      const hasStoredSession =
        typeof window !== 'undefined' &&
        (Boolean(localStorage.getItem('user_session')) ||
          localStorage.getItem('techx_certificate_downloaded_global') === 'true' ||
          localStorage.getItem('techx_expedition_concluded_global') === 'true');
      if (!user && !hasStoredSession) {
        router.push('/');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) return null;

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#0d0a08' }}>
      <FinalCertificate />
    </main>
  );
}

