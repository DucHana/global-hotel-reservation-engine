'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export function LoginForm() {
  const { login, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-2 border rounded"
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-2 border rounded"
      />

      {error && <div className="text-red-600">{error}</div>}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gold text-dark py-2 rounded font-semibold"
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
