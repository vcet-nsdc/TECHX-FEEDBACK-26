'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import RouteSelection from '@/components/RouteSelection';

export default function LabsPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();

  // Redirect to finish if expedition was already concluded/downloaded
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const emailKey = (user?.email || '').trim().toLowerCase();
      const isConcluded =
        localStorage.getItem('techx_certificate_downloaded_global') === 'true' ||
        localStorage.getItem('techx_expedition_concluded_global') === 'true' ||
        (emailKey && localStorage.getItem(`techx_certificate_downloaded_${emailKey}`) === 'true') ||
        (emailKey && localStorage.getItem(`techx_expedition_concluded_${emailKey}`) === 'true');

      if (isConcluded) {
        router.replace('/finish');
        return;
      }
    }

    // Redirect to home if user is not logged in
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  return (
    <main>
      <RouteSelection />
    </main>
  );
}

