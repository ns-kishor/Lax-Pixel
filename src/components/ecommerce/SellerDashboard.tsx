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
  Store, DollarSign, Package, Clock, Plus, Sparkles, CheckCircle2,
  XCircle, TrendingUp, Upload, User, MapPin, Phone, Mail, FileText,
  AlertCircle, ShieldCheck, Eye, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import type { Product } from '@/lib/store';

export function SellerDashboard() {
  const { user, sellerStats, sellerProducts, sellerOrders, setSellerData, categories, setView, selectProduct, showToast } = useStore();
  const [approved, setApproved] = useState(false);
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);
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
    website: '',
    description: '',
  });

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
        if (data.verification) {
          setVerificationForm({
            businessName: data.verification.businessName || '',
            businessType: data.verification.businessType || 'Retailer',
            businessAddress: data.verification.businessAddress || '',
            businessCity: data.verification.businessCity || '',
            businessCountry: data.verification.businessCountry || 'Bangladesh',
            nidNumber: data.verification.nidNumber || '',
            phone: data.verification.phone || '',
            website: data.verification.website || '',
            description: data.verification.description || '',
          });
        }
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

    setSubmittingVerification(true);
    try {
      const res = await fetch('/api/seller/verification', {
        method: 'POST',
        headers: { ...authHeaders(useStore.getState), 'Content-Type': 'application/json' },
        body: JSON.stringify(verificationForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Verification submitted! Admin will review your details.');
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
        image: newProduct.image || '/products/hero.png',
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

  const aiGenerateDesc = async () => {
    showToast('Generating with AI...', 'info');
    try {
      const res = await fetch('/api/ai/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: newProduct.name,
          productDetails: `Price: $${newProduct.price}, Category: ${categories.find(c => c.id === newProduct.categoryId)?.name || ''}`,
          type: 'description',
        }),
      });
      const data = await res.json();
      if (data.result) {
        setNewProduct(prev => ({ ...prev, description: data.result }));
        showToast('AI description generated!');
      }
    } catch {
      showToast('AI generation failed', 'error');
    }
  };

  const aiGenerateTags = async () => {
    try {
      const res = await fetch('/api/ai/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: newProduct.name,
          productDetails: newProduct.description,
          type: 'tags',
        }),
      });
      const data = await res.json();
      if (data.result) {
        setNewProduct(prev => ({ ...prev, tags: data.result }));
        showToast('Tags generated!');
      }
    } catch {
      showToast('AI generation failed', 'error');
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

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
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
              Store: <span className="text-foreground font-medium">{verificationForm.businessName || user.name}</span> • Manage your exclusive catalog and customer orders
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
                      আপনার ব্যবসায়ের তথ্যাদি অ্যাডমিনের কাছে পৌঁছানো হয়েছে। অ্যাডমিন তথ্যগুলো যাচাই করে এপ্রুভ করলেই আপনি সরাসরি প্রোডাক্ট আপলোড ও সেল শুরু করতে পারবেন।
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
                        <span className="text-muted-foreground block text-[10px] uppercase">NID / Trade License</span>
                        <span className="font-mono font-medium">{verification.nidNumber}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Phone</span>
                        <span>{verification.phone}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground block text-[10px] uppercase">Address</span>
                        <span>{verification.businessAddress}, {verification.businessCity}, {verification.businessCountry}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8 rounded-2xl bg-secondary/60 border border-border shadow-sm">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-5 h-5 text-foreground" />
                    <h2 className="text-lg font-medium">সেলার অ্যাকাউন্ট ভেরিফিকেশন ফর্ম (Seller Verification)</h2>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                    ল্যাক্স পিক্সেলে প্রোডাক্ট বিক্রি শুরু করতে আপনার ব্যবসায়ের সঠিক বিবরণ প্রদান করে নিচের ফর্মটি পূরণ করুন। তথ্যগুলো সরাসরি অ্যাডমিনের কাছে পৌঁছে যাবে এবং যাচাই শেষে অ্যাকাউন্ট সক্রিয় করা হবে।
                  </p>

                  {verification?.status === 'REJECTED' && (
                    <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                      <p className="font-semibold mb-1">পূর্বের আবেদনটি রিজেক্ট করা হয়েছিল:</p>
                      <p>{verification.rejectReason || 'প্রদত্ত তথ্যসমূহ সঠিক ছিল না। অনুগ্রহ করে সঠিক তথ্য দিয়ে পুনরায় জমা দিন।'}</p>
                    </div>
                  )}

                  <form onSubmit={handleVerificationSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Business / Store Name *</Label>
                        <Input
                          required
                          value={verificationForm.businessName}
                          onChange={e => setVerificationForm({ ...verificationForm, businessName: e.target.value })}
                          placeholder="e.g. Royal Fashion Boutique"
                          className="mt-1.5 h-10 bg-background border-border text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Business Type *</Label>
                        <select
                          value={verificationForm.businessType}
                          onChange={e => setVerificationForm({ ...verificationForm, businessType: e.target.value })}
                          className="mt-1.5 h-10 w-full px-3 bg-background border border-border rounded-md text-xs"
                        >
                          <option value="Retailer">Retailer (খুচরা বিক্রেতা)</option>
                          <option value="Wholesaler">Wholesaler (পাইকারি বিক্রেতা)</option>
                          <option value="Brand / Manufacturer">Brand / Manufacturer (ব্র্যান্ড বা প্রস্তুতকারক)</option>
                          <option value="Artisan / Designer">Artisan / Designer (শিল্পী বা ডিজাইনার)</option>
                          <option value="Individual Seller">Individual Seller (ব্যক্তিগত বিক্রেতা)</option>
                        </select>
                      </div>

                      <div>
                        <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Phone Number *</Label>
                        <Input
                          required
                          value={verificationForm.phone}
                          onChange={e => setVerificationForm({ ...verificationForm, phone: e.target.value })}
                          placeholder="+880 1XXXXXXXXX"
                          className="mt-1.5 h-10 bg-background border-border text-xs"
                        />
                      </div>

                      <div>
                        <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">NID / Trade License / Tax ID *</Label>
                        <Input
                          required
                          value={verificationForm.nidNumber}
                          onChange={e => setVerificationForm({ ...verificationForm, nidNumber: e.target.value })}
                          placeholder="National ID or Trade License #"
                          className="mt-1.5 h-10 bg-background border-border text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Full Business Address *</Label>
                        <Input
                          required
                          value={verificationForm.businessAddress}
                          onChange={e => setVerificationForm({ ...verificationForm, businessAddress: e.target.value })}
                          placeholder="Shop/Office number, Street, Area"
                          className="mt-1.5 h-10 bg-background border-border text-xs"
                        />
                      </div>

                      <div>
                        <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">City *</Label>
                        <Input
                          required
                          value={verificationForm.businessCity}
                          onChange={e => setVerificationForm({ ...verificationForm, businessCity: e.target.value })}
                          placeholder="Dhaka, Chittagong, etc."
                          className="mt-1.5 h-10 bg-background border-border text-xs"
                        />
                      </div>

                      <div>
                        <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Country *</Label>
                        <Input
                          required
                          value={verificationForm.businessCountry}
                          onChange={e => setVerificationForm({ ...verificationForm, businessCountry: e.target.value })}
                          placeholder="Bangladesh"
                          className="mt-1.5 h-10 bg-background border-border text-xs"
                        />
                      </div>

                      <div>
                        <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Website / Facebook Page (Optional)</Label>
                        <Input
                          value={verificationForm.website}
                          onChange={e => setVerificationForm({ ...verificationForm, website: e.target.value })}
                          placeholder="https://..."
                          className="mt-1.5 h-10 bg-background border-border text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Business Description / Details</Label>
                        <textarea
                          rows={3}
                          value={verificationForm.description}
                          onChange={e => setVerificationForm({ ...verificationForm, description: e.target.value })}
                          placeholder="Tell us about the products you intend to sell, your business background, etc."
                          className="mt-1.5 w-full p-3 bg-background border border-border rounded-md text-xs resize-none"
                        />
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
                        'Submit Verification to Admin'
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
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Description</Label>
                  <Button variant="ghost" size="sm" className="text-[10px] gap-1 h-7" onClick={aiGenerateDesc}>
                    <Sparkles className="w-3 h-3" /> AI Generate
                  </Button>
                </div>
                <textarea
                  value={newProduct.description}
                  onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  rows={3}
                  className="mt-1.5 w-full p-3 bg-background border border-border rounded-md text-sm resize-none"
                  placeholder="Describe craftsmanship, materials, dimensions..."
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Tags</Label>
                  <Button variant="ghost" size="sm" className="text-[10px] gap-1 h-7" onClick={aiGenerateTags}>
                    <Sparkles className="w-3 h-3" /> AI Generate
                  </Button>
                </div>
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

        {/* ─── Products & Orders Tabs ──────────────────────────────────────── */}
        <Tabs defaultValue="products">
          <TabsList className="bg-secondary h-11 p-1 rounded-xl">
            <TabsTrigger value="products" className="text-xs tracking-wider h-9 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-lg">
              My Products ({sellerProducts.length})
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs tracking-wider h-9 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-lg">
              Customer Orders ({sellerOrders.length})
            </TabsTrigger>
          </TabsList>

          {/* Products Content */}
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
                        <h4 className="text-sm font-medium truncate">{p.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.category?.name} • {p.stock} in stock
                        </p>
                      </div>
                      <span className="text-sm font-medium shrink-0">${p.price.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] bg-foreground/5 font-medium">
                          {p.salesCount || 0} Sold
                        </Badge>
                        {p.aiGenerated && (
                          <Badge variant="outline" className="text-[9px] gap-1 border-border">
                            <Sparkles className="w-2.5 h-2.5" /> AI
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
                        View Product →
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Orders Content */}
          <TabsContent value="orders" className="mt-6">
            {sellerOrders.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                <Store className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-sm font-medium">No customer orders yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Orders placed for your products will appear here with customer details and items.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sellerOrders.map(o => (
                  <div
                    key={o.id}
                    className="p-5 rounded-2xl bg-secondary/60 border border-border hover:border-foreground/30 transition-all cursor-pointer"
                    onClick={() => setSelectedSellerOrder(o)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-medium font-mono">{o.orderNumber}</p>
                          <Badge variant="outline" className={`text-[10px] ${statusColors[o.status] || ''}`}>
                            {o.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span>Buyer: <strong className="text-foreground">{o.user?.name || 'Customer'}</strong> ({o.user?.email})</span>
                          <span>•</span>
                          <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6">
                        <div className="text-right">
                          <p className="text-base font-medium text-green-500">
                            ${(o.sellerTotal || o.totalAmount).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {o.items?.length || 1} item{((o.items?.length || 1) > 1) ? 's' : ''} from your store
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg">
                          <Eye className="w-3.5 h-3.5 mr-1.5" /> Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ─── Customer Order Details Modal ─────────────────────────────────── */}
        <Dialog open={!!selectedSellerOrder} onOpenChange={open => !open && setSelectedSellerOrder(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center justify-between">
                <span>Order #{selectedSellerOrder?.orderNumber}</span>
                {selectedSellerOrder && (
                  <Badge variant="outline" className={`text-[10px] ${statusColors[selectedSellerOrder.status] || ''}`}>
                    {selectedSellerOrder.status}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            {selectedSellerOrder && (
              <div className="space-y-4 pt-2">
                {/* Customer Information */}
                <div className="p-4 rounded-xl bg-secondary/50 border border-border text-xs space-y-2">
                  <h4 className="text-[10px] tracking-wider uppercase text-muted-foreground font-semibold">Customer / Buyer Details</h4>
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
