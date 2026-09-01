'use client';

import { useState } from 'react';
import { useStore, authHeaders } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Store, User, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';

export function AuthView() {
  const { goBack, setUser, showToast, setCart, setOrders, setWishlist, setView, setAdminUser, setAdminAuthed } = useStore();
  const [loading, setLoading] = useState(false);
  const [loginTerms, setLoginTerms] = useState(false);
  const [registerTerms, setRegisterTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', role: 'BUYER', phone: '', address: '', city: '', country: '', zipCode: '', companyName: '', companyDescription: '' });

  const loadUserData = async (userData: any) => {
    const [cartRes, ordersRes, wishRes] = await Promise.all([
      fetch('/api/cart', { headers: authHeaders(useStore.getState) }),
      fetch('/api/orders', { headers: authHeaders(useStore.getState) }),
      fetch('/api/wishlist', { headers: authHeaders(useStore.getState) }),
    ]);
    setCart(await cartRes.json());
    setOrders(await ordersRes.json());
    const wishItems = await wishRes.json();
    setWishlist(wishItems.map((w: any) => w.productId));
    return userData;
  };

  const login = async () => {
    if (!loginForm.email || !loginForm.password) { showToast('Please fill in all fields', 'error'); return; }
    if (!loginTerms) { showToast('Please accept the Terms and Conditions', 'error'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...loginForm, termsAccepted: true }) });
      const data = await res.json();
      if (data.error) { showToast(data.error, 'error'); return; }

      if (data.isAdmin) {
        localStorage.setItem('admin-token', data.token);
        setAdminUser(data.admin);
        setAdminAuthed(true);
        setView('admin');
        showToast(`Welcome back, ${data.admin.name}`);
        return;
      }

      setUser(data.user, data.sellerProfile);
      await loadUserData(data.user);
      showToast(`Welcome back, ${data.user.name}`);
      goBack();
    } catch (err) {
      showToast('Login failed: ' + (err instanceof Error ? err.message : 'Network error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    if (!registerForm.name || !registerForm.email || !registerForm.password) { showToast('Please fill required fields', 'error'); return; }
    if (!registerTerms) { showToast('Please accept the Terms and Conditions', 'error'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...registerForm, termsAccepted: true }) });
      const data = await res.json();
      if (data.error) { showToast(data.error, 'error'); return; }
      setUser(data.user, data.sellerProfile);
      showToast(`Welcome to Lax Pixel, ${data.user.name}`);
      if (data.user.role === 'SELLER') setView('seller-dashboard');
      else goBack();
    } catch (err) {
      showToast('Registration failed: ' + (err instanceof Error ? err.message : 'Network error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const googleAuth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: `user_${Date.now()}_google_oauth_sim` }),
      });
      const data = await res.json();
      if (data.error) { showToast(data.error, 'error'); return; }
      setUser(data.user, data.sellerProfile);
      await loadUserData(data.user);
      showToast(`Welcome, ${data.user.name}`);
      goBack();
    } catch (err) {
      showToast('Google sign-in failed: ' + (err instanceof Error ? err.message : 'Network error'), 'error');
    } finally {
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
            <TabsTrigger value="login" className="flex-1 text-xs tracking-wider h-9 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-md">Sign In</TabsTrigger>
            <TabsTrigger value="register" className="flex-1 text-xs tracking-wider h-9 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-md">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-6 space-y-4">
            <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Email</Label><Input value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" placeholder="your@email.com" /></div>
            <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Password</Label><Input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" onKeyDown={e => e.key === 'Enter' && login()} /></div>
            <div className="flex items-start gap-2.5 pt-1">
              <Checkbox id="login-terms" checked={loginTerms} onCheckedChange={(v) => setLoginTerms(v === true)} className="mt-0.5" />
              <Label htmlFor="login-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                I accept the{' '}
                <button type="button" onClick={() => setTermsOpen(true)} className="text-foreground underline underline-offset-2 hover:no-underline">Terms and Conditions</button>
              </Label>
            </div>
            <Button className="w-full h-11 bg-foreground text-background text-xs tracking-[0.15em] uppercase rounded-lg hover:bg-foreground/90" onClick={login} disabled={loading || !loginTerms}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </Button>

            <div className="relative flex items-center justify-center my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <span className="relative bg-background px-3 text-[10px] text-muted-foreground uppercase tracking-wider">or</span>
            </div>

            <Button variant="outline" className="w-full h-11 border-border text-xs tracking-wider gap-2 rounded-lg" onClick={googleAuth} disabled={loading}>
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </Button>
          </TabsContent>

          <TabsContent value="register" className="mt-6 space-y-4">
            <div>
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2 block">Account Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setRegisterForm({ ...registerForm, role: 'BUYER' })}
                  className={`p-4 rounded-lg border text-center transition-all ${registerForm.role === 'BUYER' ? 'border-foreground bg-secondary' : 'border-border hover:border'}`}>
                  <User className={`w-5 h-5 mx-auto mb-2 ${registerForm.role === 'BUYER' ? '' : 'text-muted-foreground'}`} />
                  <p className="text-xs font-medium">Buyer</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Shop luxury products</p>
                </button>
                <button onClick={() => setRegisterForm({ ...registerForm, role: 'SELLER' })}
                  className={`p-4 rounded-lg border text-center transition-all ${registerForm.role === 'SELLER' ? 'border-foreground bg-secondary' : 'border-border hover:border'}`}>
                  <Store className={`w-5 h-5 mx-auto mb-2 ${registerForm.role === 'SELLER' ? '' : 'text-muted-foreground'}`} />
                  <p className="text-xs font-medium">Seller</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Sell your products</p>
                </button>
              </div>
            </div>
            <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Full Name *</Label><Input value={registerForm.name} onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" /></div>
            <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Email *</Label><Input type="email" value={registerForm.email} onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" /></div>
            <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Password *</Label><Input type="password" value={registerForm.password} onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" /></div>
            {registerForm.role === 'SELLER' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 p-4 rounded-lg bg-accent/50 border border-border">
                <p className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Seller Information</p>
                <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Company Name</Label><Input value={registerForm.companyName} onChange={e => setRegisterForm({ ...registerForm, companyName: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" /></div>
                <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Company Description</Label><Input value={registerForm.companyDescription} onChange={e => setRegisterForm({ ...registerForm, companyDescription: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" /></div>
              </motion.div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">City</Label><Input value={registerForm.city} onChange={e => setRegisterForm({ ...registerForm, city: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" /></div>
              <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Country</Label><Input value={registerForm.country} onChange={e => setRegisterForm({ ...registerForm, country: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" /></div>
            </div>
            <div className="flex items-start gap-2.5 pt-1">
              <Checkbox id="register-terms" checked={registerTerms} onCheckedChange={(v) => setRegisterTerms(v === true)} className="mt-0.5" />
              <Label htmlFor="register-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                I accept the{' '}
                <button type="button" onClick={() => setTermsOpen(true)} className="text-foreground underline underline-offset-2 hover:no-underline">Terms and Conditions</button>
              </Label>
            </div>
            <Button className="w-full h-11 bg-foreground text-background text-xs tracking-[0.15em] uppercase rounded-lg hover:bg-foreground/90" onClick={register} disabled={loading || !registerTerms}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
            </Button>

            <div className="relative flex items-center justify-center my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <span className="relative bg-background px-3 text-[10px] text-muted-foreground uppercase tracking-wider">or</span>
            </div>

            <Button variant="outline" className="w-full h-11 border-border text-xs tracking-wider gap-2 rounded-lg" onClick={googleAuth} disabled={loading}>
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
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
                <p className="text-xs text-muted-foreground leading-relaxed">By accessing and using Lax Pixel, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our services. Your continued use of the platform following the posting of changes constitutes your acceptance of such changes.</p>
              </div>
              <div className="border-b border-border pb-4">
                <h3 className="text-sm font-medium mb-2">2. Account Responsibilities</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating an account. You agree to notify us immediately of any unauthorized access to your account.</p>
              </div>
              <div className="border-b border-border pb-4">
                <h3 className="text-sm font-medium mb-2">3. Product Listings & Pricing</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">All product listings are provided by verified sellers. While we strive for accuracy, we do not guarantee that all product information is error-free. Prices are subject to change without notice. We reserve the right to refuse or cancel any order.</p>
              </div>
              <div className="border-b border-border pb-4">
                <h3 className="text-sm font-medium mb-2">4. Payments & Orders</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">All payments are processed according to the selected payment method. Orders placed with manual payment methods require proof of payment and will be processed upon verification. Cash on Delivery orders do not require upfront payment.</p>
              </div>
              <div className="border-b border-border pb-4">
                <h3 className="text-sm font-medium mb-2">5. Seller Agreement</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">Sellers agree to list only authentic products, provide accurate descriptions, and fulfill orders in a timely manner. Sellers must comply with all applicable laws and regulations. Lax Pixel reserves the right to suspend seller accounts that violate these terms.</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">6. Limitation of Liability</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">Lax Pixel provides the platform on an "as is" basis. We are not liable for any indirect, incidental, or consequential damages arising from your use of our services. Our total liability shall not exceed the amount paid by you for the relevant transaction.</p>
              </div>
              <Button className="w-full mt-4" onClick={() => setTermsOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
