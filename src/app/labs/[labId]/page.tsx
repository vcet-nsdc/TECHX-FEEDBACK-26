'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import LabMapView from '@/components/LabMapView';

export default function LabProductsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useUser();
  const labId = (params.labId as string) || 'a';

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

    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#0d0a08' }}>
      <LabMapView labId={labId} />
    </main>
  );
}