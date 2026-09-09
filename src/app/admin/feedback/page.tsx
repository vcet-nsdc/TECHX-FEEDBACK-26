'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminFeedbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f5ee] text-[#1c120c]">
      <p className="text-xs font-bold text-[#735138]">Redirecting to Admin Dashboard…</p>
    </div>
  );
}
