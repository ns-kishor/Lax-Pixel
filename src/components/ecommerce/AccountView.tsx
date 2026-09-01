'use client';

import { useEffect, useState, useRef } from 'react';
import { useStore, authHeaders } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Phone, MapPin, Save, Heart, Package, ArrowRight, Camera, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export function AccountView() {
  const { user, setUser, goBack, setView, showToast, wishlistIds, logout } = useStore();
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', address: user?.address || '', city: user?.city || '', country: user?.country || '', zipCode: user?.zipCode || '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showPwForm, setShowPwForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);

  useEffect(() => {
    if (!user) return;
    fetch('/api/wishlist', { headers: authHeaders(useStore.getState) }).then(r => r.json()).then(setWishlistItems);
  }, [user?.id]);

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-light">Sign in to view your account</p>
          <Button className="mt-4 bg-foreground text-background text-xs tracking-wider" onClick={() => setView('auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  const saveProfile = async () => {
    const res = await fetch('/api/user', { method: 'PUT', headers: authHeaders(useStore.getState), body: JSON.stringify(form) });
    const data = await res.json();
    if (data.error) { showToast(data.error, 'error'); return; }
    setUser(data);
    showToast('Profile updated');
  };

  const changePassword = async () => {
    if (!passwordForm.current || !passwordForm.newPw) { showToast('Enter current and new password', 'error'); return; }
    if (passwordForm.newPw !== passwordForm.confirm) { showToast('New passwords do not match', 'error'); return; }
    if (passwordForm.newPw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    const res = await fetch('/api/user/password', { method: 'PUT', headers: authHeaders(useStore.getState), body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.newPw }) });
    const data = await res.json();
    if (data.error) { showToast(data.error, 'error'); return; }
    showToast('Password changed');
    setPasswordForm({ current: '', newPw: '', confirm: '' });
    setShowPwForm(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB', 'error'); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const saveAvatar = async () => {
    if (!avatarPreview) return;
    setUploading(true);
    try {
      const res = await fetch('/api/user/avatar', { method: 'PUT', headers: authHeaders(useStore.getState), body: JSON.stringify({ avatar: avatarPreview }) });
      const data = await res.json();
      if (data.error) { showToast(data.error, 'error'); return; }
      setUser(data);
      showToast('Avatar updated');
      setAvatarPreview(null);
    } catch { showToast('Failed to upload avatar', 'error'); }
    finally { setUploading(false); }
  };

  const isWished = wishlistIds.has(user.id);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <button onClick={goBack} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="p-6 rounded-xl bg-secondary border border-border text-center">
              <div className="relative w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-light mx-auto mb-4 overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : user.avatar ? (
                  <Image src={user.avatar} alt={user.name} fill className="object-cover" />
                ) : (
                  <span className="text-2xl font-light">{user.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <h2 className="text-lg font-medium">{user.name}</h2>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <Badge variant="secondary" className="mt-3 text-[10px] tracking-wider">{user.role}</Badge>
              <Separator className="bg-secondary my-4" />
              <Button variant="outline" size="sm" className="w-full text-xs gap-2" onClick={() => fileRef.current?.click()}>
                <Camera className="w-3.5 h-3.5" /> {avatarPreview ? 'Save Photo' : 'Change Photo'}
              </Button>
              {avatarPreview && (
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground mt-2" onClick={() => setAvatarPreview(user?.avatar || null)}>Cancel</Button>
              )}
              <Separator className="bg-secondary my-4" />
              <div className="space-y-2">
                <button onClick={() => setView('orders')} className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary text-sm text-muted-foreground hover:text-foreground transition-colors"><span className="flex items-center gap-2"><Package className="w-4 h-4" /> My Orders</span><ArrowRight className="w-3.5 h-3.5" /></button>
                {user.role === 'SELLER' && (
                  <button onClick={() => setView('seller-dashboard')} className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary text-sm text-muted-foreground hover:text-foreground transition-colors"><span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Seller Dashboard</span><ArrowRight className="w-3.5 h-3.5" /></button>
                )}
              </div>
              <Separator className="bg-secondary my-4" />
              <Button variant="ghost" size="sm" className="w-full text-xs text-destructive hover:text-destructive hover:bg-secondary" onClick={() => { logout(); setView('home'); }}>Sign Out</Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Edit Profile */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-xl bg-secondary border border-border">
              <h3 className="text-sm font-medium tracking-wide mb-5">Profile Information</h3>
              <div className="space-y-4">
                <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Full Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" /></div>
                  <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Email</Label><Input value={user.email} disabled className="mt-1.5 h-10 bg-secondary border-border text-sm text-muted-foreground" /></div>
                </div>
                <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" placeholder="Street address" /></div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" /></div>
                  <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Country</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" /></div>
                  <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">ZIP</Label><Input value={form.zipCode} onChange={e => setForm({ ...form, zipCode: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" /></div>
                </div>
                <Button size="sm" className="bg-foreground text-background text-xs tracking-wider" onClick={saveProfile}><Save <Save className="w-3.5 h-3.5 mr-2" />Save Changes</Button>
              </div>
            </motion.div>

            {/* Change Password */
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 rounded-xl bg-secondary border border-border">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-medium tracking-wide flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</h3>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowPwForm(!showPwForm)}>
                  {showPwForm ? 'Cancel' : 'Change'}
                </Button>
              </div>
              {showPwForm && (
                <div className="space-y-4">
                  <div className="relative">
                    <Eye className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="password" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} className="pl-10 h-10 bg-secondary border-border text-sm" placeholder="Current password" />
                  </div>
                  <div className="relative">
                    <EyeOff className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="password" value={passwordForm.newPw} onChange={e => setPasswordForm({ ...passwordForm, newPw: e.target.value })} className="pl-10 h-10 bg-secondary border-border text-sm" placeholder="New password (min 6 chars)" />
                  </div>
                  <div className="relative">
                    <EyeOff className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="pl-10 h-10 bg-secondary border-border text-sm" placeholder="Confirm new password" onKeyDown={e => e.key === 'Enter' && changePassword()} />
                  </div>
                  <Button size="sm" className="bg-foreground text-background text-xs tracking-wider" onClick={changePassword} disabled={uploading}><Lock className="w-3.5 h-3.5 mr-2" /> Update Password</Button>
                </div>
              )}
            </motion.div>

            {/* Wishlist */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 rounded-xl bg-secondary border border-border">
              <h3 className="text-sm font-medium tracking-wide mb-5 flex items-center gap-2"><Heart className="w-4 h-4" /> Wishlist ({wishlistItems.length})</h3>
              {wishlistItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Your wishlist is empty</p>
              ) : (
                <div className="space-y-3">
                  {wishlistItems.map((w: any) => (
                    <div key={w.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary cursor-pointer transition-colors" onClick={() => useStore.getState().selectProduct(w.product)}>
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-background relative shrink-0"><Image src={safeImgSrc(w.product.image)} alt={w.product.name} fill className="object-cover" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{w.product.name}</p>
                        <p className="text-xs text-muted-foreground">${w.product.price.toLocaleString()}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
    </div>
  );
}
