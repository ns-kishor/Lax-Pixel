'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

interface AdminLoginProps {
  onLogin: (admin: { id: string; email: string; name: string; role: string }) => void;
  goBack: () => void;
}

export function AdminLogin({ onLogin, goBack }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed.');
        return;
      }

      localStorage.setItem('admin-token', data.token);
      onLogin(data.admin);
      useStore.getState().showToast('Welcome back, Admin');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-full border border-border mx-auto flex items-center justify-center mb-4">
            <span className="text-sm font-bold">LP</span>
          </div>
          <h1 className="text-xl font-extralight tracking-[0.2em] uppercase">Lax Pixel</h1>
          <p className="text-xs text-muted-foreground mt-2 tracking-wider">Administration</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="admin-email" className="text-[10px] tracking-wider uppercase text-muted-foreground">
              Email
            </Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@laxpixel.com"
              required
              className="h-11 bg-secondary border-border text-sm"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password" className="text-[10px] tracking-wider uppercase text-muted-foreground">
              Password
            </Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="h-11 bg-secondary border-border text-sm"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-destructive"
            >
              {error}
            </motion.p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-foreground text-background text-xs tracking-[0.2em] uppercase font-normal"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in…
              </span>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* Back link */}
        <div className="mt-8 text-center">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to site
          </button>
        </div>
      </motion.div>
    </div>
  );
}
