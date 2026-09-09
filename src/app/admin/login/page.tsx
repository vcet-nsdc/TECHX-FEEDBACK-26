'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAdmin, isLoading: authLoading } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && isAdmin) {
      router.push('/admin');
    }
  }, [isAdmin, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const success = await login(username, password);
      if (success) router.push('/admin');
      else setError('Invalid credentials');
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm">Redirecting…</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0e0905] px-4 py-8 text-[#f5efe6]">
      <div className="relative w-full max-w-md rounded-2xl border border-[#382314] bg-[#18110a] p-8 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#24170d] border border-[#3d2614] text-2xl text-[#c99f58] shadow-2xs">
            ⚙️
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#a89078]">
            TechX 2026
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#fdfbf7]">
            Admin Sign In
          </h1>
          <p className="mt-1 text-xs text-[#a89078]">
            Sign in to manage products and inspect feedback ledger
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-[#662222] bg-[#2b1111] p-3 text-center text-xs font-bold text-[#fca5a5]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-bold text-[#c99f58]">
            <span>Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
              className="rounded-xl border border-[#382314] bg-[#0e0905] px-3.5 py-2.5 text-sm font-semibold text-[#fdfbf7] placeholder-[#7d6550] outline-none transition focus:border-[#c99f58] disabled:opacity-50"
              placeholder="Enter admin username"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-bold text-[#c99f58]">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="rounded-xl border border-[#382314] bg-[#0e0905] px-3.5 py-2.5 text-sm font-semibold text-[#fdfbf7] placeholder-[#7d6550] outline-none transition focus:border-[#c99f58] disabled:opacity-50"
              placeholder="••••••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#c99f58] hover:bg-[#dfb46e] border border-[#a88242] py-3 text-sm font-bold text-[#140c06] shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin text-[#140c06]" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Authenticating…</span>
              </>
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
