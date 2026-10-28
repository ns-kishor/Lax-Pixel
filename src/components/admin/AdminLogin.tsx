'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { setAdminUser, setAdminAuthed, setView, showToast } = useStore();

  useEffect(() => {
    localStorage.removeItem('admin-token');
  }, []);

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
      const admin = data.admin;
      setAdminUser(admin);
      setAdminAuthed(true);
      setView('admin');
      showToast('Welcome back, ' + admin.name);
    } catch (err) {
      setError('Network error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth', { method: 'PUT' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Password reset successfully');
      } else {
        setError(data.error || 'Reset failed.');
      }
    } catch {
      setError('Network error during reset.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => setView('home');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-full border border-border mx-auto flex items-center justify-center mb-4">
            <span className="text-sm font-bold">LP</span>
          </div>
          <h1 className="text-xl font-extralight tracking-[0.2em] uppercase">Lax Pixel</h1>
          <p className="text-xs text-muted-foreground mt-2 tracking-wider">Administration</p>
        </div>

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
              placeholder="admin@example.com"
              required
              className="h-11 bg-secondary border-border text-sm"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password" className="text-[10px] tracking-wider uppercase text-muted-foreground">
              Password
            </Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 bg-secondary border-border text-sm pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3"
            >
              {error}
            </motion.div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-foreground text-background text-xs tracking-[0.2em] uppercase font-normal hover:opacity-90"
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

        <div className="mt-6 text-center">
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
