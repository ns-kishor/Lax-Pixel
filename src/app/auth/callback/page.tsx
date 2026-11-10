'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useStore } from '@/lib/store';
import { Loader2, AlertCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function processCallback() {
      try {
        // Check if there is an auth error in URL hash or search params
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const errDescription = urlParams.get('error_description') || hashParams.get('error_description');

        if (errDescription) {
          throw new Error(decodeURIComponent(errDescription));
        }

        // 1. If code parameter exists (PKCE flow), exchange it
        const code = urlParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        // 2. Retrieve session from Supabase client
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
          if (mounted) await syncUser(session);
        } else {
          // Listen for auth state change if session isn't available immediately
          const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (currentSession?.user && mounted) {
              await syncUser(currentSession);
            }
          });

          return () => {
            authListener.subscription.unsubscribe();
          };
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        if (mounted) {
          setErrorMsg(err.message || 'Authentication failed');
        }
      }
    }

    async function syncUser(session: any) {
      const email = session.user.email;
      const metadata = session.user.user_metadata || {};
      const name = metadata.full_name || metadata.name || email.split('@')[0] || 'Google User';
      const avatar = metadata.avatar_url || metadata.picture || '';

      const requestedRole = typeof window !== 'undefined' ? (sessionStorage.getItem('lp-oauth-role') || 'BUYER') : 'BUYER';
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('lp-oauth-role');
      }

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, avatar, role: requestedRole }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to sync account with Lax Pixel database');
      }

      useStore.getState().setUser(data.user, data.sellerProfile);
      useStore.getState().showToast(`Welcome, ${data.user.name}!`);

      // Clean redirect to dashboard or home
      if (data.user.role === 'SELLER') {
        useStore.getState().setView('seller-dashboard');
        router.replace('/seller');
      } else {
        useStore.getState().setView('home');
        router.replace('/');
      }
    }

    processCallback();

    return () => {
      mounted = false;
    };
  }, []);

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full p-6 rounded-2xl border border-destructive/20 bg-destructive/5 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-light tracking-tight">Authentication Notice</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">{errorMsg}</p>
          <a
            href="/auth"
            className="inline-block px-5 py-2.5 bg-foreground text-background text-xs tracking-wider uppercase rounded-lg hover:opacity-90 transition-opacity"
          >
            Back to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      <p className="text-sm font-light text-muted-foreground tracking-wide">Connecting your account...</p>
    </div>
  );
}

