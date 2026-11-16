'use client';

import { useEffect, useState } from 'react';
import { useStore, authHeaders, safeImgSrc } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Store, DollarSign, Package, Clock, Plus, CheckCircle2,
  XCircle, TrendingUp, Upload, User, MapPin, Phone, Mail, FileText,
  AlertCircle, ShieldCheck, Eye, Loader2, Save, Settings, Check, CreditCard,
  MessageCircle, ExternalLink, HelpCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import type { Product } from '@/lib/store';

export interface SellerPaymentConfigItem {
  name: string;
  icon?: string;
  active: boolean;
  accountNumber: string;
  accountType: 'PERSONAL' | 'AGENT' | 'MERCHANT';
  instructions: string;
}

const DEFAULT_METHODS: SellerPaymentConfigItem[] = [
  { name: 'bKash', icon: '/payment-methods/bkash.png', active: true, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'Nagad', icon: '/payment-methods/nagad.png', active: false, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'Rocket', icon: '/payment-methods/rocket.png', active: false, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'Upay', icon: '/payment-methods/upay.png', active: false, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'mCash', icon: '/payment-methods/mcash.webp', active: false, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'GPay', icon: '/payment-methods/gpay.png', active: false, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'Cellfin', icon: '/payment-methods/cellfin.jpg', active: false, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'Mukto-Pay', icon: '/payment-methods/muktopay.webp', active: false, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'Nexus-Pay', icon: '/payment-methods/nexuspay.png', active: false, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'Pathao-Pay', icon: '/payment-methods/pathaopay.png', active: false, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'cash_on_delivery', icon: '/payment-methods/cash_on_delivery.jpg', active: true, accountNumber: '', accountType: 'PERSONAL', instructions: 'ক্যাশ অন ডেলিভারি প্রযোজ্য' },
];

export function SellerDashboard() {
  const { user, sellerStats, sellerProducts, sellerOrders, setSellerData, categories, setView, selectProduct, showToast } = useStore();
  const [approved, setApproved] = useState(false);
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [selectedSellerOrder, setSelectedSellerOrder] = useState<any>(null);

  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    comparePrice: '',
    categoryId: '',
    stock: '',
    description: '',
    tags: '',
    image: '',
  });

  const [verificationForm, setVerificationForm] = useState({
    businessName: '',
    businessType: 'Retailer',
    businessAddress: '',
    businessCity: '',
    businessCountry: 'Bangladesh',
    nidNumber: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    description: '',
    paymentMethod: 'bKash',
    transactionId: '',
    senderNumber: '',
  });

  const [storeProfileForm, setStoreProfileForm] = useState({
    companyName: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: '',
    country: 'Bangladesh',
    website: '',
    description: '',
  });

  const [verificationFee, setVerificationFee] = useState<number>(500);
  const [digitalPaymentMethods, setDigitalPaymentMethods] = useState<any[]>([]);
  const [sellerPaymentMethods, setSellerPaymentMethods] = useState<SellerPaymentConfigItem[]>(DEFAULT_METHODS);

  const loadSellerData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await fetch('/api/seller', { headers: authHeaders(useStore.getState) });
      if (res.ok) {
        const data = await res.json();
        setSellerData(data);
        setApproved(Boolean(data.approved));
        setVerification(data.verification || null);
        if (data.feeAmount !== undefined) {
          setVerificationFee(data.feeAmount);
        }
        if (data.paymentMethods && Array.isArray(data.paymentMethods)) {
          setDigitalPaymentMethods(data.paymentMethods);
        }

        // Initialize seller payment methods config
        const platformMethods = (data.allPaymentMethods && data.allPaymentMethods.length > 0)
          ? data.allPaymentMethods
          : DEFAULT_METHODS;

        let savedConfig: any[] = [];
        if (data.profile?.paymentMethodsConfig) {
          try {
            savedConfig = JSON.parse(data.profile.paymentMethodsConfig);
          } catch {}
        } else if (data.verification?.paymentMethodsData) {
          try {
            savedConfig = JSON.parse(data.verification.paymentMethodsData);
          } catch {}
        }

        const savedMap = new Map((Array.isArray(savedConfig) ? savedConfig : []).map(m => [String(m.name).toLowerCase(), m]));

        const initializedMethods: SellerPaymentConfigItem[] = platformMethods.map((pm: any) => {
          const saved = savedMap.get(String(pm.name).toLowerCase());
          const isCod = ['cash_on_delivery', 'Cash on Delivery', 'COD'].includes(pm.name);
          return {
            name: pm.name,
            icon: pm.icon || `/payment-methods/${pm.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`,
            active: saved ? Boolean(saved.active) : (pm.name === 'bKash' || isCod),
            accountNumber: saved?.accountNumber || (isCod ? '' : (data.verification?.phone || user.phone || '')),
            accountType: (saved?.accountType as any) || 'PERSONAL',
            instructions: saved?.instructions || (isCod ? 'ক্যাশ অন ডেলিভারি প্রযোজ্য' : ''),
          };
        });

        setSellerPaymentMethods(initializedMethods);

        // Verification Form state
        if (data.verification) {
          setVerificationForm({
            businessName: data.verification.businessName || '',
            businessType: data.verification.businessType || 'Retailer',
            businessAddress: data.verification.businessAddress || '',
            businessCity: data.verification.businessCity || '',
            businessCountry: data.verification.businessCountry || 'Bangladesh',
            nidNumber: data.verification.nidNumber || '',
            phone: data.verification.phone || user.phone || '',
            whatsapp: data.verification.whatsapp || '',
            email: data.verification.email || user.email || '',
            website: data.verification.website || '',
            description: data.verification.description || '',
            paymentMethod: data.verification.paymentMethod || (data.paymentMethods?.[0]?.name ?? 'bKash'),
            transactionId: data.verification.transactionId || '',
            senderNumber: data.verification.senderNumber || '',
          });
        } else {
          setVerificationForm(prev => ({
            ...prev,
            phone: prev.phone || user.phone || '',
            email: prev.email || user.email || '',
          }));
        }

        // Store profile state
        setStoreProfileForm({
          companyName: data.profile?.companyName || data.verification?.businessName || '',
          phone: data.profile?.phone || data.verification?.phone || user.phone || '',
          whatsapp: data.profile?.whatsapp || data.verification?.whatsapp || '',
          email: data.profile?.email || data.verification?.email || user.email || '',
          address: data.profile?.address || data.verification?.businessAddress || '',
          city: data.profile?.city || data.verification?.businessCity || '',
          country: data.profile?.country || data.verification?.businessCountry || 'Bangladesh',
          website: data.profile?.website || data.verification?.website || '',
          description: data.profile?.description || data.verification?.description || '',
        });
      }
    } catch (e) {
      console.error('Failed to load seller info:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSellerData();
  }, [user?.id]);

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-light">Sign in to access Seller Dashboard</p>
          <Button className="mt-4 bg-foreground text-background text-xs tracking-wider" onClick={() => setView('auth')}>
            Sign In / Register
          </Button>
        </div>
      </div>
    );
  }

  const updateSellerMethod = (index: number, patch: Partial<SellerPaymentConfigItem>) => {
    setSellerPaymentMethods(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  // Handle image upload for product
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-user-id': user.id },
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setNewProduct(prev => ({ ...prev, image: data.url }));
        showToast('Image uploaded successfully');
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch {
      showToast('Image upload failed', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // Submit business verification form
  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationForm.businessName || !verificationForm.businessType || !verificationForm.phone || !verificationForm.nidNumber || !verificationForm.businessAddress) {
      showToast('Please fill all required business fields', 'error');
      return;
    }

    if (!verificationForm.whatsapp.trim()) {
      showToast('Please enter your WhatsApp number for communication', 'error');
      return;
    }

    if (!verificationForm.email.trim()) {
      showToast('Please enter your contact email address', 'error');
      return;
    }

    // Check that at least one product payment method is active
    const activeMethods = sellerPaymentMethods.filter(m => m.active);
    if (activeMethods.length === 0) {
      showToast('Please select at least one payment method for your products', 'error');
      return;
    }

    // Validate account numbers for active digital methods
    for (const m of activeMethods) {
      const isCod = ['cash_on_delivery', 'Cash on Delivery', 'COD'].includes(m.name);
      if (!isCod && !m.accountNumber.trim()) {
        showToast(`Please enter the account number for ${m.name}`, 'error');
        return;
      }
    }

    if (!verificationForm.paymentMethod || !verificationForm.transactionId.trim() || !verificationForm.senderNumber.trim()) {
      showToast('Please select payment method and provide Transaction ID (TrxID) and Sender Phone Number for verification fee', 'error');
      return;
    }

    setSubmittingVerification(true);
    try {
      const res = await fetch('/api/seller/verification', {
        method: 'POST',
        headers: { ...authHeaders(useStore.getState), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...verificationForm,
          paymentMethodsData: sellerPaymentMethods,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Verification and profile details submitted! Admin will review your account.');
        loadSellerData();
      } else {
        showToast(data.error || 'Submission failed', 'error');
      }
    } catch {
      showToast('Failed to submit verification', 'error');
    } finally {
      setSubmittingVerification(false);
    }
  };

  // Save profile and payment methods (for approved sellers)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeProfileForm.companyName.trim()) {
      showToast('Store name is required', 'error');
      return;
    }

    const activeMethods = sellerPaymentMethods.filter(m => m.active);
    if (activeMethods.length === 0) {
      showToast('Please enable at least one payment method for your products', 'error');
      return;
    }

    for (const m of activeMethods) {
      const isCod = ['cash_on_delivery', 'Cash on Delivery', 'COD'].includes(m.name);
      if (!isCod && !m.accountNumber.trim()) {
        showToast(`Please enter the account number for ${m.name}`, 'error');
        return;
      }
    }

    setSavingProfile(true);
    try {
      const res = await fetch('/api/seller', {
        method: 'PUT',
        headers: { ...authHeaders(useStore.getState), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...storeProfileForm,
          paymentMethodsConfig: sellerPaymentMethods,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Store profile & payment methods saved successfully!');
        loadSellerData();
      } else {
        showToast(data.error || 'Failed to update profile', 'error');
      }
    } catch {
      showToast('Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const createProduct = async () => {
    if (!approved) {
      showToast('You must be verified by admin before uploading products', 'error');
      return;
    }
    if (!newProduct.name || !newProduct.price || !newProduct.categoryId) {
      showToast('Name, price and category are required', 'error');
      return;
    }
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newProduct,
        sellerId: user.id,
        price: parseFloat(newProduct.price) || 0,
        comparePrice: newProduct.comparePrice ? parseFloat(newProduct.comparePrice) : null,
        stock: parseInt(newProduct.stock, 10) || 0,
        image: newProduct.image || '/products/hero.png',
        images: newProduct.image || '/products/hero.png',
        featured: false,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Product created successfully!');
      setAddProductOpen(false);
      setNewProduct({ name: '', price: '', comparePrice: '', categoryId: '', stock: '', description: '', tags: '', image: '' });
      loadSellerData();
    } else {
      showToast(data.error || 'Failed to create product', 'error');
    }
  };

  const stats = sellerStats || {
    productCount: 0,
    totalRevenue: 0,
    totalSales: 0,
    totalOrders: 0,
    pendingOrders: 0,
    conversionRate: 0,
  };

  const statCards = [
    { label: 'Total Revenue', value: `$${(stats.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, color: 'text-green-500' },
    { label: 'Items Sold', value: (stats.totalSales || 0).toLocaleString(), icon: TrendingUp, color: 'text-blue-500' },
    { label: 'Products', value: stats.productCount || 0, icon: Package, color: 'text-purple-500' },
    { label: 'Orders', value: `${stats.totalOrders || 0} (${stats.pendingOrders || 0} Pending)`, icon: Clock, color: 'text-amber-500' },
  ];

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    CONFIRMED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    PROCESSING: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    SHIPPED: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    DELIVERED: 'bg-green-500/10 text-green-500 border-green-500/20',
    CANCELLED: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  // Reusable Component: Payment Methods Config List
  const renderPaymentMethodsManager = () => {
    return (
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
          <div>
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> আপনার প্রোডাক্টের পেমেন্ট মেথড নির্ধারণ করুন
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              আপনার আপলোড করা প্রডাক্টের ক্ষেত্রে ক্রেতা কোন কোন মাধ্যমে টাকা পাঠাবে তা নির্ধারণ করুন। নির্বাচিত মেথডের নাম্বার ও ধরণ (Personal / Agent) সঠিকভাবে দিন।
            </p>
          </div>
          <Badge variant="secondary" className="self-start sm:self-auto text-[10px] font-mono">
            {sellerPaymentMethods.filter(m => m.active).length}টি মেথড সক্রিয়
          </Badge>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-1">
          {sellerPaymentMethods.map((m, idx) => {
            const isCod = ['cash_on_delivery', 'Cash on Delivery', 'COD'].includes(m.name);
            return (
              <div
                key={m.name}
                className={`p-3.5 rounded-xl border transition-all ${
                  m.active
                    ? 'border-foreground/40 bg-background shadow-sm ring-1 ring-foreground/10'
                    : 'border-border bg-secondary/30 opacity-75 hover:opacity-100'
                }`}
              >
                {/* Header row: Icon, Name, and Toggle */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {m.icon ? (
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-secondary/60 border border-border">
                        <img src={m.icon} alt={m.name} className="w-6 h-6 object-contain" />
                      </div>
                    ) : null}
                    <div>
                      <span className="font-semibold text-xs tracking-tight block truncate text-foreground">{m.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {isCod ? 'Cash on Delivery' : 'Mobile / Digital Payment'}
                      </span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
                    <input
                      type="checkbox"
                      checked={m.active}
                      onChange={e => updateSellerMethod(idx, { active: e.target.checked })}
                      className="w-4 h-4 rounded text-foreground accent-foreground cursor-pointer"
                    />
                    <span className="text-[11px] font-medium text-foreground">
                      {m.active ? 'সক্রিয়' : 'বন্ধ'}
                    </span>
                  </label>
                </div>

                {/* Sub-inputs when active */}
                {m.active && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    {isCod ? (
                      <p className="text-[11px] text-green-600 dark:text-green-400 font-medium">
                        ✓ ক্যাশ অন ডেলিভারি সক্রিয় (ক্রেতা সরাসরি হোম ডেলিভারির সময় মূল্য পরিশোধ করবেন)
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">
                              অ্যাকাউন্ট নাম্বার *
                            </Label>
                            <Input
                              required={m.active}
                              value={m.accountNumber}
                              onChange={e => updateSellerMethod(idx, { accountNumber: e.target.value })}
                              placeholder="e.g. 017XXXXXXXX"
                              className="mt-1 h-8 bg-secondary/60 border-border text-xs font-mono"
                            />
                          </div>

                          <div>
                            <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">
                              অ্যাকাউন্টের ধরণ *
                            </Label>
                            <select
                              value={m.accountType}
                              onChange={e => updateSellerMethod(idx, { accountType: e.target.value as any })}
                              className="mt-1 h-8 w-full px-2 bg-secondary/60 border border-border rounded-md text-xs font-medium"
                            >
                              <option value="PERSONAL">Personal (পার্সোনাল)</option>
                              <option value="AGENT">Agent (এজেন্ট)</option>
                              <option value="MERCHANT">Merchant (মার্চেন্ট)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            বিশেষ নির্দেশনা (ঐচ্ছিক)
                          </Label>
                          <Input
                            value={m.instructions}
                            onChange={e => updateSellerMethod(idx, { instructions: e.target.value })}
                            placeholder={`e.g. ${m.name} নাম্বারে সেন্ড মানি করুন...`}
                            className="mt-1 h-8 bg-secondary/60 border-border text-xs"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-light tracking-tight">Seller Dashboard</h1>
              {approved ? (
                <Badge className="bg-green-500/10 text-green-600 border border-green-500/20 gap-1.5 py-1 px-2.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Seller
                </Badge>
              ) : verification?.status === 'PENDING' ? (
                <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 gap-1.5 py-1 px-2.5">
                  <Clock className="w-3.5 h-3.5" /> Verification Pending Review
                </Badge>
              ) : (
                <Badge className="bg-destructive/10 text-destructive border border-destructive/20 gap-1.5 py-1 px-2.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Verification Required
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Store: <span className="text-foreground font-medium">{storeProfileForm.companyName || verificationForm.businessName || user.name}</span> • Manage your exclusive catalog, payment methods, and customer orders
            </p>
          </div>

          <div>
            {approved ? (
              <Button
                className="bg-foreground text-background text-xs tracking-wider h-10 px-5"
                onClick={() => setAddProductOpen(!addProductOpen)}
              >
                <Plus className="w-4 h-4 mr-2" /> {addProductOpen ? 'Cancel' : 'Add New Product'}
              </Button>
            ) : (
              <Button
                disabled
                className="bg-secondary text-muted-foreground text-xs tracking-wider h-10 px-5 opacity-70"
                title="Complete account verification to upload products"
              >
                <Plus className="w-4 h-4 mr-2" /> Verification Required to Add Products
              </Button>
            )}
          </div>
        </div>

        {/* ─── Verification State Banner (When not approved) ───────────────── */}
        {!approved && (
          <div className="mb-10">
            {verification?.status === 'PENDING' ? (
              <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-foreground">
                      ভেরিফিকেশন রিকোয়েস্ট সফলভাবে জমা হয়েছে (Under Review)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      আপনার ব্যবসায়ের তথ্যাদি ও নির্বাচিত প্রোডাক্ট পেমেন্ট মেথড অ্যাডমিনের কাছে পৌঁছানো হয়েছে। অ্যাডমিন তথ্যগুলো যাচাই করে এপ্রুভ করলেই আপনি সরাসরি প্রোডাক্ট আপলোড ও সেল শুরু করতে পারবেন।
                    </p>

                    <div className="mt-4 p-4 rounded-xl bg-secondary/50 border border-border grid sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Business Name</span>
                        <span className="font-medium">{verification.businessName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Business Type</span>
                        <span className="font-medium">{verification.businessType}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Phone / Mobile</span>
                        <span className="font-mono">{verification.phone}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">WhatsApp</span>
                        <span className="font-mono text-green-600 dark:text-green-400 font-medium">{verification.whatsapp || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Email</span>
                        <span>{verification.email || user.email}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">NID / Trade License</span>
                        <span className="font-mono font-medium">{verification.nidNumber}</span>
                      </div>
                      <div className="sm:col-span-3">
                        <span className="text-muted-foreground block text-[10px] uppercase">Address</span>
                        <span>{verification.businessAddress}, {verification.businessCity}, {verification.businessCountry}</span>
                      </div>

                      {/* Display summary of chosen seller payment methods */}
                      <div className="sm:col-span-3 pt-2 border-t border-border/60">
                        <span className="text-muted-foreground block text-[10px] uppercase mb-1.5">আপনার প্রোডাক্টের জন্য নির্বাচিত পেমেন্ট মেথড</span>
                        <div className="flex flex-wrap gap-2">
                          {sellerPaymentMethods.filter(m => m.active).map(m => (
                            <Badge key={m.name} variant="secondary" className="text-[10px] px-2 py-0.5">
                              {m.name} {m.accountType ? `(${m.accountType})` : ''}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {verification.paymentMethod && (
                        <div className="sm:col-span-3 p-3 rounded-lg bg-background/60 border border-border mt-1 grid sm:grid-cols-3 gap-2">
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase">Approval Fee</span>
                            <span className="font-medium text-foreground">{verification.feeAmount ? `৳ ${verification.feeAmount}` : 'Paid'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase">Method</span>
                            <span className="font-medium text-foreground">{verification.paymentMethod}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase">TrxID / Sender</span>
                            <span className="font-mono text-foreground">{verification.transactionId || '—'} ({verification.senderNumber || '—'})</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8 rounded-2xl bg-secondary/60 border border-border shadow-sm">
                <div className="max-w-4xl">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-5 h-5 text-foreground" />
                    <h2 className="text-lg font-medium">সেলার অ্যাকাউন্ট ভেরিফিকেশন ও প্রোফাইল ফর্ম (Seller Verification & Profile)</h2>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                    ল্যাক্স পিক্সেলে সফলভাবে বিক্রেতা হতে আপনার যোগাযোগের তথ্য, ব্যবসার সঠিক বিবরণ এবং আপনার প্রোডাক্ট বিক্রির টাকা গ্রহণের জন্য পছন্দসই পেমেন্ট মেথডগুলো সেট করুন।
                  </p>

                  {verification?.status === 'REJECTED' && (
                    <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                      <p className="font-semibold mb-1">পূর্বের আবেদনটি রিজেক্ট করা হয়েছিল:</p>
                      <p>{verification.rejectReason || 'প্রদত্ত তথ্যসমূহ সঠিক ছিল না। অনুগ্রহ করে সঠিক তথ্য দিয়ে পুনরায় জমা দিন।'}</p>
                    </div>
                  )}

                  <form onSubmit={handleVerificationSubmit} className="space-y-6">
                    {/* 1. Contact Information Section */}
                    <div className="p-5 rounded-xl bg-background border border-border space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <Phone className="w-4 h-4 text-foreground" />
                        <h3 className="text-sm font-medium">১. বিক্রেতা যোগাযোগের তথ্য (Seller Contact Information)</h3>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Mobile Phone Number *</Label>
                          <Input
                            required
                            value={verificationForm.phone}
                            onChange={e => setVerificationForm({ ...verificationForm, phone: e.target.value })}
                            placeholder="e.g. 017XXXXXXXX"
                            className="mt-1.5 h-10 bg-secondary/50 border-border text-xs font-mono"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">সরাসরি কল যোগাযোগের জন্য ফোন নাম্বার</p>
                        </div>

                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-green-500" /> WhatsApp Number *
                          </Label>
                          <Input
                            required
                            value={verificationForm.whatsapp}
                            onChange={e => setVerificationForm({ ...verificationForm, whatsapp: e.target.value })}
                            placeholder="e.g. 017XXXXXXXX"
                            className="mt-1.5 h-10 bg-secondary/50 border-border text-xs font-mono"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">গ্রাহক ও অ্যাডমিনের সাথে হোয়াটসঅ্যাপ চ্যাটের জন্য</p>
                        </div>

                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" /> Email Address *
                          </Label>
                          <Input
                            required
                            type="email"
                            value={verificationForm.email}
                            onChange={e => setVerificationForm({ ...verificationForm, email: e.target.value })}
                            placeholder="seller@example.com"
                            className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">অর্ডার নোটিফিকেশন ও যোগাযোগ ইমেইল</p>
                        </div>
                      </div>
                    </div>

                    {/* 2. Business Details Section */}
                    <div className="p-5 rounded-xl bg-background border border-border space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <Store className="w-4 h-4 text-foreground" />
                        <h3 className="text-sm font-medium">২. ব্যবসায় ও স্টোর সংক্রান্ত তথ্য (Store Details)</h3>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Business / Store Name *</Label>
                          <Input
                            required
                            value={verificationForm.businessName}
                            onChange={e => setVerificationForm({ ...verificationForm, businessName: e.target.value })}
                            placeholder="e.g. Royal Fashion Boutique"
                            className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Business Type *</Label>
                          <select
                            value={verificationForm.businessType}
                            onChange={e => setVerificationForm({ ...verificationForm, businessType: e.target.value })}
                            className="mt-1.5 h-10 w-full px-3 bg-secondary/50 border border-border rounded-md text-xs font-medium"
                          >
                            <option value="Retailer">Retailer (খুচরা বিক্রেতা)</option>
                            <option value="Wholesaler">Wholesaler (পাইকারি বিক্রেতা)</option>
                            <option value="Brand / Manufacturer">Brand / Manufacturer (ব্র্যান্ড বা প্রস্তুতকারক)</option>
                            <option value="Artisan / Designer">Artisan / Designer (শিল্পী বা ডিজাইনার)</option>
                            <option value="Individual Seller">Individual Seller (ব্যক্তিগত বিক্রেতা)</option>
                          </select>
                        </div>

                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">NID / Trade License / Tax ID *</Label>
                          <Input
                            required
                            value={verificationForm.nidNumber}
                            onChange={e => setVerificationForm({ ...verificationForm, nidNumber: e.target.value })}
                            placeholder="National ID or Trade License #"
                            className="mt-1.5 h-10 bg-secondary/50 border-border text-xs font-mono"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Website / Facebook Page (Optional)</Label>
                          <Input
                            value={verificationForm.website}
                            onChange={e => setVerificationForm({ ...verificationForm, website: e.target.value })}
                            placeholder="https://..."
                            className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Full Business / Pickup Address *</Label>
                          <Input
                            required
                            value={verificationForm.businessAddress}
                            onChange={e => setVerificationForm({ ...verificationForm, businessAddress: e.target.value })}
                            placeholder="Shop/Office number, Street, Area"
                            className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">City / District *</Label>
                          <Input
                            required
                            value={verificationForm.businessCity}
                            onChange={e => setVerificationForm({ ...verificationForm, businessCity: e.target.value })}
                            placeholder="Dhaka, Chittagong, Sylhet, etc."
                            className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Country *</Label>
                          <Input
                            required
                            value={verificationForm.businessCountry}
                            onChange={e => setVerificationForm({ ...verificationForm, businessCountry: e.target.value })}
                            placeholder="Bangladesh"
                            className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Business Description / Bio</Label>
                          <textarea
                            rows={3}
                            value={verificationForm.description}
                            onChange={e => setVerificationForm({ ...verificationForm, description: e.target.value })}
                            placeholder="Tell us about the products you intend to sell, your business background, etc."
                            className="mt-1.5 w-full p-3 bg-secondary/50 border border-border rounded-md text-xs resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. Product Payment Methods Section */}
                    <div className="p-5 rounded-xl bg-background border border-border">
                      {renderPaymentMethodsManager()}
                    </div>

                    {/* 4. Verification & Approval Fee Payment Section */}
                    <div className="p-5 rounded-xl bg-background border border-border space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
                        <div>
                          <h3 className="text-sm font-medium text-foreground">৪. প্ল্যাটফর্ম ভেরিফিকেশন ও অনুমোদন ফি (Approval Fee)</h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            সেলার অ্যাকাউন্ট ভেরিফিকেশনের জন্য নির্ধারিত ফি প্রদান করে নিচে ট্রানজেকশন আইডি ও আপনার সেন্ডার নাম্বার দিন।
                          </p>
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-sm self-start sm:self-auto shrink-0">
                          ফি: ৳ {verificationFee}
                        </div>
                      </div>

                      {/* Payment Method Selector Grid */}
                      <div className="space-y-2 mb-4">
                        <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">অ্যাডমিন ফি পেমেন্ট মেথড সিলেক্ট করুন *</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {digitalPaymentMethods.map((m) => {
                            const isSelected = verificationForm.paymentMethod === m.name;
                            return (
                              <button
                                key={m.id || m.name}
                                type="button"
                                onClick={() => setVerificationForm({ ...verificationForm, paymentMethod: m.name })}
                                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                                  isSelected
                                    ? 'border-foreground bg-secondary ring-1 ring-foreground'
                                    : 'border-border bg-card hover:border-muted-foreground/40'
                                }`}
                              >
                                {m.icon && (
                                  <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                                    <img src={m.icon} alt={m.name} className="w-full h-full object-contain" />
                                  </div>
                                )}
                                <span className="text-[11px] font-medium leading-tight">{m.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Selected Method Instructions */}
                      {(() => {
                        const activeMethod = digitalPaymentMethods.find(m => m.name === verificationForm.paymentMethod);
                        return activeMethod?.instructions ? (
                          <div className="p-3 rounded-lg bg-secondary/80 border border-border text-xs text-muted-foreground mb-4">
                            <p className="font-medium text-foreground mb-1">{activeMethod.name} পেমেন্ট নির্দেশনা:</p>
                            <p className="leading-relaxed">{activeMethod.instructions}</p>
                          </div>
                        ) : null;
                      })()}

                      {/* TrxID & Sender Phone Number inputs */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">
                            Transaction ID (TrxID) *
                          </Label>
                          <Input
                            required
                            value={verificationForm.transactionId}
                            onChange={e => setVerificationForm({ ...verificationForm, transactionId: e.target.value })}
                            placeholder="e.g. 9J8B7C6D5E"
                            className="mt-1.5 h-10 bg-secondary/50 border-border font-mono text-xs uppercase"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">পেমেন্ট সফল হওয়ার পর প্রাপ্ত ট্রানজেকশন আইডি দিন</p>
                        </div>
                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">
                            Sender Phone Number * (প্রেরকের নাম্বার)
                          </Label>
                          <Input
                            required
                            value={verificationForm.senderNumber}
                            onChange={e => setVerificationForm({ ...verificationForm, senderNumber: e.target.value })}
                            placeholder="e.g. 017XXXXXXXX"
                            className="mt-1.5 h-10 bg-secondary/50 border-border font-mono text-xs"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">যে মোবাইল নাম্বার থেকে ফি পাঠিয়েছেন</p>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={submittingVerification}
                      className="bg-foreground text-background text-xs tracking-wider h-11 px-8 rounded-lg mt-2"
                    >
                      {submittingVerification ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                        </span>
                      ) : (
                        'Submit Verification & Profile to Admin'
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Seller Personal Stats ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 rounded-xl bg-secondary/60 border border-border/80"
            >
              <div className="flex items-center justify-between">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">My Store</span>
              </div>
              <p className="text-2xl font-light mt-3">{s.value}</p>
              <p className="text-[10px] tracking-wider uppercase text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ─── Add Product Modal Form ──────────────────────────────────────── */}
        {addProductOpen && approved && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-8 p-6 rounded-2xl bg-secondary/80 border border-border shadow-sm"
          >
            <h3 className="text-sm font-medium tracking-wide mb-5 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Product Under Your Store
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Product Name *</Label>
                <Input
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g. Handmade Silk Scarf"
                  className="mt-1.5 h-10 bg-background border-border text-sm"
                />
              </div>

              <div>
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Category *</Label>
                <select
                  value={newProduct.categoryId}
                  onChange={e => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                  className="mt-1.5 h-10 w-full px-3 bg-background border border-border rounded-md text-sm"
                >
                  <option value="">Select Category...</option>
                  {(categories || []).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Price ($) *</Label>
                <Input
                  type="number"
                  value={newProduct.price}
                  onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="mt-1.5 h-10 bg-background border-border text-sm"
                />
              </div>

              <div>
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Compare Price ($)</Label>
                <Input
                  type="number"
                  value={newProduct.comparePrice}
                  onChange={e => setNewProduct({ ...newProduct, comparePrice: e.target.value })}
                  className="mt-1.5 h-10 bg-background border-border text-sm"
                />
              </div>

              <div>
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Stock Available</Label>
                <Input
                  type="number"
                  value={newProduct.stock}
                  onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                  className="mt-1.5 h-10 bg-background border-border text-sm"
                />
              </div>

              {/* Image Upload Component */}
              <div>
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Product Image *</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 h-10 rounded-md border border-border bg-background cursor-pointer hover:bg-secondary text-xs transition-colors shrink-0">
                    <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{uploadingImage ? 'Uploading...' : 'Choose File'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleProductImageUpload} disabled={uploadingImage} />
                  </label>
                  {newProduct.image ? (
                    <div className="relative w-10 h-10 rounded-md overflow-hidden border border-border shrink-0">
                      <Image src={safeImgSrc(newProduct.image)} alt="Preview" fill className="object-cover" />
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground truncate">Upload from device or enter URL</span>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Description</Label>
                <textarea
                  value={newProduct.description}
                  onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  rows={3}
                  className="mt-1.5 w-full p-3 bg-background border border-border rounded-md text-sm resize-none"
                  placeholder="Describe craftsmanship, materials, dimensions..."
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Tags</Label>
                <Input
                  value={newProduct.tags}
                  onChange={e => setNewProduct({ ...newProduct, tags: e.target.value })}
                  className="mt-1.5 h-10 bg-background border-border text-sm"
                  placeholder="luxury, handmade, authentic"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border">
              <Button className="bg-foreground text-background text-xs tracking-wider h-10 px-6 rounded-lg" onClick={createProduct}>
                Create Product
              </Button>
              <Button variant="outline" className="h-10 text-xs px-4 rounded-lg" onClick={() => setAddProductOpen(false)}>
                Cancel
              </Button>
            </div>
          </motion.div>
        )}

        {/* ─── Main Tabs ────────────────────────────────────────────────────── */}
        <Tabs defaultValue="products">
          <TabsList className="bg-secondary h-11 p-1 rounded-xl">
            <TabsTrigger value="products" className="text-xs tracking-wider h-9 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-lg">
              My Products ({sellerProducts.length})
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs tracking-wider h-9 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-lg">
              Customer Orders ({sellerOrders.length})
            </TabsTrigger>
            <TabsTrigger value="profile" className="text-xs tracking-wider h-9 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-lg">
              Store Profile & Payments
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Products Content */}
          <TabsContent value="products" className="mt-6">
            {sellerProducts.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-sm font-medium">No products listed yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {approved
                    ? 'Click "Add New Product" above to list your first luxury item for customers worldwide.'
                    : 'Once your seller verification is approved by admin, you will be able to upload products.'}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {sellerProducts.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="p-4 rounded-2xl bg-secondary/60 border border-border hover:border-foreground/30 transition-all cursor-pointer group"
                    onClick={() => selectProduct(p)}
                  >
                    <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-background relative mb-3">
                      <Image src={safeImgSrc(p.image)} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] tracking-wider uppercase text-muted-foreground">{p.category?.name}</p>
                        <h4 className="text-sm font-medium tracking-wide truncate mt-0.5">{p.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-semibold">${p.price.toLocaleString()}</span>
                          {p.comparePrice && <span className="text-xs text-muted-foreground line-through">${p.comparePrice.toLocaleString()}</span>}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                        Stock: {p.stock}
                      </Badge>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{p.salesCount || 0} sold</span>
                      <span>Rating: {p.rating} ★</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Orders Content */}
          <TabsContent value="orders" className="mt-6">
            {sellerOrders.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-sm font-medium">No customer orders yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  When customers purchase your listed products, their orders and items will appear right here.
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-2xl overflow-hidden bg-secondary/40 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/80 text-muted-foreground border-b border-border">
                      <tr>
                        <th className="p-3 text-left font-medium">Order Number</th>
                        <th className="p-3 text-left font-medium">Customer</th>
                        <th className="p-3 text-left font-medium">Your Items</th>
                        <th className="p-3 text-right font-medium">Your Total</th>
                        <th className="p-3 text-center font-medium">Status</th>
                        <th className="p-3 text-center font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sellerOrders.map((order: any) => (
                        <tr key={order.id} className="hover:bg-secondary/60 transition-colors">
                          <td className="p-3 font-mono font-medium">
                            {order.orderNumber}
                            <span className="block text-[10px] text-muted-foreground font-normal">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-medium text-foreground">{order.user?.name || 'Customer'}</span>
                            <span className="block text-[10px] text-muted-foreground">{order.shippingCity}, {order.shippingCountry}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-medium">{order.items?.length || 0} item(s)</span>
                            <span className="block text-[10px] text-muted-foreground truncate max-w-[200px]">
                              {order.items?.map((i: any) => i.productName).join(', ')}
                            </span>
                          </td>
                          <td className="p-3 text-right font-semibold text-green-500">
                            ${(order.sellerTotal || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className={`text-[10px] ${statusColors[order.status] || ''}`}>
                              {order.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs hover:bg-secondary gap-1"
                              onClick={() => setSelectedSellerOrder(order)}
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab 3: Store Profile & Payment Methods Settings */}
          <TabsContent value="profile" className="mt-6">
            <div className="p-6 sm:p-8 rounded-2xl bg-secondary/40 border border-border space-y-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="w-5 h-5 text-foreground" />
                  <h3 className="text-lg font-medium text-foreground">স্টোর প্রোফাইল ও পেমেন্ট মেথড সেটিংস</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  আপনার যোগাযোগের নাম্বারসমূহ, স্টোরের তথ্যাদি এবং আপনার প্রোডাক্ট চেকআউটে প্রদর্শিত পেমেন্ট মেথডগুলো এখান থেকে যেকোনো সময় আপডেট করতে পারবেন।
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Contact info */}
                <div className="p-5 rounded-xl bg-background border border-border space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <Phone className="w-4 h-4 text-foreground" />
                    <h4 className="text-sm font-medium">যোগাযোগের তথ্য (Contact Information)</h4>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Mobile Phone Number *</Label>
                      <Input
                        required
                        value={storeProfileForm.phone}
                        onChange={e => setStoreProfileForm({ ...storeProfileForm, phone: e.target.value })}
                        placeholder="e.g. 017XXXXXXXX"
                        className="mt-1.5 h-10 bg-secondary/50 border-border text-xs font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5 text-green-500" /> WhatsApp Number *
                      </Label>
                      <Input
                        required
                        value={storeProfileForm.whatsapp}
                        onChange={e => setStoreProfileForm({ ...storeProfileForm, whatsapp: e.target.value })}
                        placeholder="e.g. 017XXXXXXXX"
                        className="mt-1.5 h-10 bg-secondary/50 border-border text-xs font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> Email Address *
                      </Label>
                      <Input
                        required
                        type="email"
                        value={storeProfileForm.email}
                        onChange={e => setStoreProfileForm({ ...storeProfileForm, email: e.target.value })}
                        placeholder="seller@example.com"
                        className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Store info */}
                <div className="p-5 rounded-xl bg-background border border-border space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <Store className="w-4 h-4 text-foreground" />
                    <h4 className="text-sm font-medium">স্টোর তথ্য (Store Details)</h4>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Store / Company Name *</Label>
                      <Input
                        required
                        value={storeProfileForm.companyName}
                        onChange={e => setStoreProfileForm({ ...storeProfileForm, companyName: e.target.value })}
                        placeholder="e.g. Royal Fashion Boutique"
                        className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Website / Social Page (Optional)</Label>
                      <Input
                        value={storeProfileForm.website}
                        onChange={e => setStoreProfileForm({ ...storeProfileForm, website: e.target.value })}
                        placeholder="https://..."
                        className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Business / Pickup Address</Label>
                      <Input
                        value={storeProfileForm.address}
                        onChange={e => setStoreProfileForm({ ...storeProfileForm, address: e.target.value })}
                        placeholder="Shop/Office number, Street, Area"
                        className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">City / District</Label>
                      <Input
                        value={storeProfileForm.city}
                        onChange={e => setStoreProfileForm({ ...storeProfileForm, city: e.target.value })}
                        placeholder="Dhaka, Chittagong, etc."
                        className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Country</Label>
                      <Input
                        value={storeProfileForm.country}
                        onChange={e => setStoreProfileForm({ ...storeProfileForm, country: e.target.value })}
                        placeholder="Bangladesh"
                        className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Store Bio / Description</Label>
                      <textarea
                        rows={3}
                        value={storeProfileForm.description}
                        onChange={e => setStoreProfileForm({ ...storeProfileForm, description: e.target.value })}
                        placeholder="Describe your brand, craftsmanship, customer guarantee..."
                        className="mt-1.5 w-full p-3 bg-secondary/50 border border-border rounded-md text-xs resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Methods Config */}
                <div className="p-5 rounded-xl bg-background border border-border">
                  {renderPaymentMethodsManager()}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={savingProfile}
                    className="bg-foreground text-background text-xs tracking-wider h-11 px-8 rounded-lg gap-2"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save Profile & Payment Methods
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>
        </Tabs>

        {/* ─── Order Detail Modal for Seller ───────────────────────────────── */}
        <Dialog open={Boolean(selectedSellerOrder)} onOpenChange={() => setSelectedSellerOrder(null)}>
          <DialogContent className="max-w-lg bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-base font-medium flex items-center justify-between">
                <span>Order #{selectedSellerOrder?.orderNumber}</span>
                <Badge variant="outline" className={`text-xs ${selectedSellerOrder ? statusColors[selectedSellerOrder.status] : ''}`}>
                  {selectedSellerOrder?.status}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            {selectedSellerOrder && (
              <div className="space-y-4 text-xs mt-2">
                {/* Customer Details */}
                <div className="p-3.5 bg-secondary/50 rounded-xl space-y-1.5 border border-border">
                  <h4 className="text-[10px] tracking-wider uppercase text-muted-foreground font-semibold mb-1">
                    Customer Delivery Information
                  </h4>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{selectedSellerOrder.user?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{selectedSellerOrder.user?.email}</span>
                  </div>
                  {selectedSellerOrder.user?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{selectedSellerOrder.user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 pt-1 border-t border-border/50">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span>
                      {[selectedSellerOrder.shippingAddress, selectedSellerOrder.shippingCity, selectedSellerOrder.shippingCountry, selectedSellerOrder.shippingZip].filter(Boolean).join(', ')}
                    </span>
                  </div>
                </div>

                {/* Items from this Seller */}
                <div>
                  <h4 className="text-[10px] tracking-wider uppercase text-muted-foreground font-semibold mb-2">
                    Your Products in this Order
                  </h4>
                  <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
                    {selectedSellerOrder.items?.map((item: any) => (
                      <div key={item.id} className="p-3 flex items-center justify-between text-xs bg-secondary/20">
                        <div className="flex items-center gap-3">
                          {item.productImage ? (
                            <img src={item.productImage} alt="" className="w-9 h-9 rounded-lg object-cover" />
                          ) : null}
                          <div>
                            <p className="font-medium text-foreground">{item.productName}</p>
                            <p className="text-[10px] text-muted-foreground">Qty: {item.quantity} × ${item.price}</p>
                          </div>
                        </div>
                        <span className="font-medium">${(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between p-3 bg-secondary/40 rounded-xl text-xs">
                    <span className="text-muted-foreground">Your Total for this Order:</span>
                    <span className="text-sm font-semibold text-green-500">${(selectedSellerOrder.sellerTotal || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => setSelectedSellerOrder(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
