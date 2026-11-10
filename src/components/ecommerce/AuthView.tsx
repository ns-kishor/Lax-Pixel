'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore, authHeaders } from '@/lib/store';
import { supabase } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Store, User, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';

export function AuthView() {
  const { goBack, setUser, showToast, setCart, setOrders, setWishlist, setView, setAdminUser, setAdminAuthed } = useStore();
  const [loading, setLoading] = useState(false);
  const [loginTerms, setLoginTerms] = useState(true);
  const [registerTerms, setRegisterTerms] = useState(true);
  const [termsOpen, setTermsOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'BUYER',
    phone: '',
    address: '',
    city: '',
    country: '',
    zipCode: '',
    companyName: '',
    companyDescription: '',
  });

  const loadUserData = async (userData: any) => {
    try {
      const [cartRes, ordersRes, wishRes] = await Promise.all([
        fetch('/api/cart', { headers: authHeaders(useStore.getState) }),
        fetch('/api/orders', { headers: authHeaders(useStore.getState) }),
        fetch('/api/wishlist', { headers: authHeaders(useStore.getState) }),
      ]);
      if (cartRes.ok) setCart(await cartRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (wishRes.ok) {
        const wishItems = await wishRes.json();
        setWishlist(Array.isArray(wishItems) ? wishItems.map((w: any) => w.productId) : []);
      }
    } catch (e) {
      console.error('Error fetching user cart/orders after login:', e);
    }
    return userData;
  };

  const login = async () => {
    const email = loginForm.email.trim();
    if (!email || !loginForm.password) {
      showToast('Please enter your email and password', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: loginForm.password, termsAccepted: true }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showToast(data.error || 'Login failed', 'error');
        setLoading(false);
        return;
      }

      if (data.isAdmin) {
        localStorage.setItem('admin-token', data.token);
        setAdminUser(data.admin);
        setAdminAuthed(true);
        setView('admin');
        showToast(`Welcome back, ${data.admin.name}`);
        return;
      }

      setUser(data.user, data.sellerProfile);
      loadUserData(data.user).catch(() => {});
      showToast(`Welcome back, ${data.user.name}`);

      if (data.user.role === 'SELLER') {
        setView('seller-dashboard');
      } else {
        goBack();
      }
    } catch (err) {
      showToast('Login failed: ' + (err instanceof Error ? err.message : 'Network error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    const name = registerForm.name.trim();
    const email = registerForm.email.trim();
    if (!name || !email || !registerForm.password) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    if (registerForm.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (!registerTerms) {
      showToast('Please accept the Terms and Conditions', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...registerForm, name, email, termsAccepted: true }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showToast(data.error || 'Registration failed', 'error');
        setLoading(false);
        return;
      }

      setUser(data.user, data.sellerProfile);
      showToast(`Welcome to Lax Pixel, ${data.user.name}!`);

      if (data.user.role === 'SELLER') {
        setView('seller-dashboard');
      } else {
        goBack();
      }
    } catch (err) {
      showToast('Registration failed: ' + (err instanceof Error ? err.message : 'Network error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleIdToken = useCallback(async (idToken: string) => {
    setLoading(true);
    try {
      const role = (typeof window !== 'undefined' ? sessionStorage.getItem('lp-oauth-role') : null) || 'BUYER';
      if (typeof window !== 'undefined') sessionStorage.removeItem('lp-oauth-role');

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, role }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showToast(data.error || 'Google sign-in failed', 'error');
        setLoading(false);
        return;
      }

      setUser(data.user, data.sellerProfile);
      showToast(`Welcome back, ${data.user.name}`);
      if (data.user.role === 'SELLER') {
        setView('seller-dashboard');
      } else {
        goBack();
      }
    } catch (err) {
      showToast('Google sign-in failed: ' + (err instanceof Error ? err.message : 'Network error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [goBack, setUser, setView, showToast]);

  // Initialize Google Identity Services if client ID is configured
  useEffect(() => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleClientId || typeof window === 'undefined') return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      try {
        if ((window as any).google?.accounts?.id) {
          (window as any).google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (response: any) => {
              if (response?.credential) {
                handleGoogleIdToken(response.credential);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });
        }
      } catch (err) {
        console.error('Google Identity init error:', err);
      }
    };
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [handleGoogleIdToken]);

  const runSupabaseOAuth = async (role: 'BUYER' | 'SELLER') => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lax-pixel-opal.vercel.app';
    const redirectUrl = `${origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      showToast(error.message, 'error');
      setLoading(false);
    }
  };

  const googleAuth = async (role: 'BUYER' | 'SELLER' = 'BUYER') => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('lp-oauth-role', role);
      }

      const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      // If Google Client ID is configured on the frontend, prompt native Google picker directly
      if (googleClientId && (window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.prompt((notification: any) => {
          if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
            runSupabaseOAuth(role);
          }
        });
        return;
      }

      await runSupabaseOAuth(role);
    } catch (err) {
      showToast('Google sign-in failed: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-start justify-center">
      <div className="w-full max-w-md px-4">
        <button onClick={goBack} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-light tracking-tight">Welcome to Lax Pixel</h1>
          <p className="text-sm text-muted-foreground mt-2">AI-powered luxury shopping</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="w-full bg-secondary h-11 p-1">
            <TabsTrigger value="login" className="flex-1 text-xs tracking-wider h-9 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-md">
              Sign In
            </TabsTrigger>
            <TabsTrigger value="register" className="flex-1 text-xs tracking-wider h-9 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-md">
              Create Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-6 space-y-4">
            <div>
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={loginForm.email}
                onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                className="mt-1.5 h-10 bg-secondary border-border text-sm"
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>
            <div>
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Password</Label>
              <Input
                type="password"
                value={loginForm.password}
                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                className="mt-1.5 h-10 bg-secondary border-border text-sm"
                placeholder="••••••••"
                autoComplete="current-password"
                onKeyDown={e => e.key === 'Enter' && login()}
              />
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <Checkbox id="login-terms" checked={loginTerms} onCheckedChange={(v) => setLoginTerms(v === true)} className="mt-0.5" />
              <Label htmlFor="login-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                I accept the{' '}
                <button type="button" onClick={() => setTermsOpen(true)} className="text-foreground underline underline-offset-2 hover:no-underline">
                  Terms and Conditions
                </button>
              </Label>
            </div>

            <Button
              className="w-full h-11 bg-foreground text-background text-xs tracking-[0.15em] uppercase rounded-lg hover:bg-foreground/90 font-medium"
              onClick={login}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </Button>

            <div className="relative flex items-center justify-center my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <span className="relative bg-background px-3 text-[10px] text-muted-foreground uppercase tracking-wider">or</span>
            </div>

            <Button
              variant="outline"
              type="button"
              className="w-full h-11 border-border text-xs tracking-wider gap-2 rounded-lg hover:bg-secondary transition-colors"
              onClick={() => googleAuth('BUYER')}
              disabled={loading}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
          </TabsContent>

          <TabsContent value="register" className="mt-6 space-y-4">
            <div>
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2 block">Account Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegisterForm({ ...registerForm, role: 'BUYER' })}
                  className={`p-4 rounded-lg border text-center transition-all ${registerForm.role === 'BUYER' ? 'border-foreground bg-secondary' : 'border-border hover:border'}`}
                >
                  <User className={`w-5 h-5 mx-auto mb-2 ${registerForm.role === 'BUYER' ? '' : 'text-muted-foreground'}`} />
                  <p className="text-xs font-medium">Buyer</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Shop luxury products</p>
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterForm({ ...registerForm, role: 'SELLER' })}
                  className={`p-4 rounded-lg border text-center transition-all ${registerForm.role === 'SELLER' ? 'border-foreground bg-secondary' : 'border-border hover:border'}`}
                >
                  <Store className={`w-5 h-5 mx-auto mb-2 ${registerForm.role === 'SELLER' ? '' : 'text-muted-foreground'}`} />
                  <p className="text-xs font-medium">Seller</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Sell your products</p>
                </button>
              </div>
            </div>

            <div>
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Full Name *</Label>
              <Input
                value={registerForm.name}
                onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })}
                className="mt-1.5 h-10 bg-secondary border-border text-sm"
                placeholder="Your Name"
              />
            </div>
            <div>
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Email *</Label>
              <Input
                type="email"
                value={registerForm.email}
                onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })}
                className="mt-1.5 h-10 bg-secondary border-border text-sm"
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>
            <div>
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Password *</Label>
              <Input
                type="password"
                value={registerForm.password}
                onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                className="mt-1.5 h-10 bg-secondary border-border text-sm"
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
              />
            </div>

            {registerForm.role === 'SELLER' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 p-4 rounded-lg bg-accent/50 border border-border">
                <p className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Seller Information
                </p>
                <div>
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Company Name</Label>
                  <Input
                    value={registerForm.companyName}
                    onChange={e => setRegisterForm({ ...registerForm, companyName: e.target.value })}
                    className="mt-1.5 h-10 bg-secondary border-border text-sm"
                    placeholder="Brand or business name"
                  />
                </div>
                <div>
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Company Description</Label>
                  <Input
                    value={registerForm.companyDescription}
                    onChange={e => setRegisterForm({ ...registerForm, companyDescription: e.target.value })}
                    className="mt-1.5 h-10 bg-secondary border-border text-sm"
                    placeholder="Short description of your business"
                  />
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">City</Label>
                <Input
                  value={registerForm.city}
                  onChange={e => setRegisterForm({ ...registerForm, city: e.target.value })}
                  className="mt-1.5 h-10 bg-secondary border-border text-sm"
                  placeholder="e.g. Dhaka"
                />
              </div>
              <div>
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Country</Label>
                <Input
                  value={registerForm.country}
                  onChange={e => setRegisterForm({ ...registerForm, country: e.target.value })}
                  className="mt-1.5 h-10 bg-secondary border-border text-sm"
                  placeholder="e.g. Bangladesh"
                />
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <Checkbox id="register-terms" checked={registerTerms} onCheckedChange={(v) => setRegisterTerms(v === true)} className="mt-0.5" />
              <Label htmlFor="register-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                I accept the{' '}
                <button type="button" onClick={() => setTermsOpen(true)} className="text-foreground underline underline-offset-2 hover:no-underline">
                  Terms and Conditions
                </button>
              </Label>
            </div>

            <Button
              className="w-full h-11 bg-foreground text-background text-xs tracking-[0.15em] uppercase rounded-lg hover:bg-foreground/90 font-medium"
              onClick={register}
              disabled={loading || !registerTerms}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
            </Button>

            <div className="relative flex items-center justify-center my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <span className="relative bg-background px-3 text-[10px] text-muted-foreground uppercase tracking-wider">or</span>
            </div>

            <Button
              variant="outline"
              type="button"
              className="w-full h-11 border-border text-xs tracking-wider gap-2 rounded-lg hover:bg-secondary transition-colors"
              onClick={() => googleAuth(registerForm.role as 'BUYER' | 'SELLER')}
              disabled={loading}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
          </TabsContent>
        </Tabs>

        <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-light tracking-wide">Terms of Service</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div className="border-b border-border pb-4">
                <h3 className="text-sm font-medium mb-2">1. Acceptance of Terms</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  By accessing and using Lax Pixel, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our services.
                </p>
              </div>
              <div className="border-b border-border pb-4">
                <h3 className="text-sm font-medium mb-2">2. Account Responsibilities</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized access.
                </p>
              </div>
              <div className="border-b border-border pb-4">
                <h3 className="text-sm font-medium mb-2">3. Product Listings & Pricing</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  All product listings are provided by verified sellers. Prices and inventory are subject to change.
                </p>
              </div>
              <div className="border-b border-border pb-4">
                <h3 className="text-sm font-medium mb-2">4. Payments & Orders</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  All payments are processed securely according to the selected payment method.
                </p>
              </div>
              <Button className="w-full mt-4" onClick={() => setTermsOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
