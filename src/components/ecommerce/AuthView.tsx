'use client';

import { useState } from 'react';
import { useStore, authHeaders } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Store, User, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function AuthView() {
  const { goBack, setUser, showToast, setCart, setOrders, setWishlist, setView } = useStore();
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', role: 'BUYER', phone: '', address: '', city: '', country: '', zipCode: '', companyName: '', companyDescription: '' });

  const login = async () => {
    if (!loginForm.email || !loginForm.password) { showToast('Please fill in all fields', 'error'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginForm) });
      const data = await res.json();
      if (data.error) { showToast(data.error, 'error'); return; }
      setUser(data.user, data.sellerProfile);
      // Load user data
      const [cartRes, ordersRes, wishRes] = await Promise.all([
        fetch('/api/cart', { headers: authHeaders(useStore.getState) }),
        fetch('/api/orders', { headers: authHeaders(useStore.getState) }),
        fetch('/api/wishlist', { headers: authHeaders(useStore.getState) }),
      ]);
      setCart(await cartRes.json());
      setOrders(await ordersRes.json());
      const wishItems = await wishRes.json();
      setWishlist(wishItems.map((w: any) => w.productId));
      showToast(`Welcome back, ${data.user.name}`);
      goBack();
    } catch { showToast('Login failed', 'error'); }
    setLoading(false);
  };

  const register = async () => {
    if (!registerForm.name || !registerForm.email || !registerForm.password) { showToast('Please fill required fields', 'error'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registerForm) });
      const data = await res.json();
      if (data.error) { showToast(data.error, 'error'); return; }
      setUser(data.user, data.sellerProfile);
      showToast(`Welcome to Lax Pixel, ${data.user.name}`);
      if (data.user.role === 'SELLER') setView('seller-dashboard');
      else goBack();
    } catch { showToast('Registration failed', 'error'); }
    setLoading(false);
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
            <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Email</Label><Input value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} className="mt-1.5 h-10 bg-white/5 border-white/10 text-sm" placeholder="your@email.com" /></div>
            <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Password</Label><Input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} className="mt-1.5 h-10 bg-white/5 border-white/10 text-sm" placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && login()} /></div>
            <Button className="w-full h-11 bg-foreground text-background text-xs tracking-[0.15em] uppercase rounded-lg hover:bg-foreground/90" onClick={login} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </Button>
            <div className="text-center pt-2">
              <p className="text-[10px] text-muted-foreground">Demo: buyer@noir.com / buyer123</p>
              <p className="text-[10px] text-muted-foreground">Seller: seller@noir.com / seller123</p>
            </div>
          </TabsContent>

          <TabsContent value="register" className="mt-6 space-y-4">
            {/* Account Type */}
            <div>
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2 block">Account Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setRegisterForm({ ...registerForm, role: 'BUYER' })}
                  className={`p-4 rounded-lg border text-center transition-all ${registerForm.role === 'BUYER' ? 'border-foreground bg-white/5' : 'border-white/10 hover:border-white/20'}`}>
                  <User className={`w-5 h-5 mx-auto mb-2 ${registerForm.role === 'BUYER' ? '' : 'text-muted-foreground'}`} />
                  <p className="text-xs font-medium">Buyer</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Shop luxury products</p>
                </button>
                <button onClick={() => setRegisterForm({ ...registerForm, role: 'SELLER' })}
                  className={`p-4 rounded-lg border text-center transition-all ${registerForm.role === 'SELLER' ? 'border-foreground bg-white/5' : 'border-white/10 hover:border-white/20'}`}>
                  <Store className={`w-5 h-5 mx-auto mb-2 ${registerForm.role === 'SELLER' ? '' : 'text-muted-foreground'}`} />
                  <p className="text-xs font-medium">Seller</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Sell your products</p>
                </button>
              </div>
            </div>
            <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Full Name *</Label><Input value={registerForm.name} onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })} className="mt-1.5 h-10 bg-white/5 border-white/10 text-sm" /></div>
            <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Email *</Label><Input type="email" value={registerForm.email} onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })} className="mt-1.5 h-10 bg-white/5 border-white/10 text-sm" /></div>
            <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Password *</Label><Input type="password" value={registerForm.password} onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })} className="mt-1.5 h-10 bg-white/5 border-white/10 text-sm" /></div>
            {registerForm.role === 'SELLER' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 p-4 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Seller Information</p>
                <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Company Name</Label><Input value={registerForm.companyName} onChange={e => setRegisterForm({ ...registerForm, companyName: e.target.value })} className="mt-1.5 h-10 bg-white/5 border-white/10 text-sm" /></div>
                <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Company Description</Label><Input value={registerForm.companyDescription} onChange={e => setRegisterForm({ ...registerForm, companyDescription: e.target.value })} className="mt-1.5 h-10 bg-white/5 border-white/10 text-sm" /></div>
              </motion.div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">City</Label><Input value={registerForm.city} onChange={e => setRegisterForm({ ...registerForm, city: e.target.value })} className="mt-1.5 h-10 bg-white/5 border-white/10 text-sm" /></div>
              <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Country</Label><Input value={registerForm.country} onChange={e => setRegisterForm({ ...registerForm, country: e.target.value })} className="mt-1.5 h-10 bg-white/5 border-white/10 text-sm" /></div>
            </div>
            <Button className="w-full h-11 bg-foreground text-background text-xs tracking-[0.15em] uppercase rounded-lg hover:bg-foreground/90" onClick={register} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
