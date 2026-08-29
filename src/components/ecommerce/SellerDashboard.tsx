'use client';

import { useEffect, useState } from 'react';
import { useStore, authHeaders } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Store, DollarSign, Package, Clock, Plus, Sparkles, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import type { Product } from '@/lib/store';

export function SellerDashboard() {
  const { user, sellerStats, sellerProducts, sellerOrders, setSellerData, categories, setView, selectProduct, showToast } = useStore();
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', comparePrice: '', categoryId: '', stock: '', description: '', tags: '', image: '/products/hero.png' });

  useEffect(() => {
    if (!user || user.role !== 'SELLER') return;
    fetch('/api/seller', { headers: authHeaders(useStore.getState) }).then(r => r.json()).then(data => {
      setSellerData(data);
      if (data.products) {
        useStore.getState().setProducts(data.products);
      }
    });
  }, [user?.id]);

  if (!user || user.role !== 'SELLER') {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-light">Seller access required</p>
          <Button className="mt-4 bg-foreground text-background text-xs tracking-wider" onClick={() => setView('auth')}>Sign In as Seller</Button>
        </div>
      </div>
    );
  }

  const createProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.categoryId) { showToast('Fill required fields', 'error'); return; }
    const res = await fetch('/api/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newProduct, sellerId: user.id, featured: false }),
    });
    if (res.ok) {
      showToast('Product created!');
      setAddProductOpen(false);
      setNewProduct({ name: '', price: '', comparePrice: '', categoryId: '', stock: '', description: '', tags: '', image: '/products/hero.png' });
      fetch('/api/seller', { headers: authHeaders(useStore.getState) }).then(r => r.json()).then(setSellerData);
    } else showToast('Failed to create product', 'error');
  };

  const aiGenerateDesc = async () => {
    showToast('Generating with AI...', 'info');
    const res = await fetch('/api/ai/describe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productName: newProduct.name, productDetails: `Price: $${newProduct.price}, Category: ${categories.find(c => c.id === newProduct.categoryId)?.name}`, type: 'description' }),
    });
    const data = await res.json();
    if (data.result) { setNewProduct({ ...newProduct, description: data.result }); showToast('AI description generated!'); }
  };

  const aiGenerateTags = async () => {
    const res = await fetch('/api/ai/describe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productName: newProduct.name, productDetails: newProduct.description, type: 'tags' }),
    });
    const data = await res.json();
    if (data.result) { setNewProduct({ ...newProduct, tags: data.result }); showToast('Tags generated!'); }
  };

  const stats = sellerStats || { productCount: 0, totalRevenue: 0, totalOrders: 0, pendingOrders: 0 };
  const statCards = [
    { label: 'Total Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-400' },
    { label: 'Products', value: stats.productCount, icon: Package, color: 'text-blue-400' },
    { label: 'Total Orders', value: stats.totalOrders, icon: TrendingUp, color: 'text-purple-400' },
    { label: 'Pending', value: stats.pendingOrders, icon: Clock, color: 'text-yellow-400' },
  ];

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    CONFIRMED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    PROCESSING: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    SHIPPED: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    DELIVERED: 'bg-green-500/10 text-green-500 border-green-500/20',
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-light tracking-tight">Seller Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-1">Manage your products and orders</p>
          </div>
          <Button className="bg-foreground text-background text-xs tracking-wider h-10" onClick={() => setAddProductOpen(!addProductOpen)}>
            <Plus className="w-4 h-4 mr-2" /> {addProductOpen ? 'Cancel' : 'Add Product'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="p-4 rounded-xl bg-secondary border border-white/5">
              <div className="flex items-center justify-between">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-light mt-3">{s.value}</p>
              <p className="text-[10px] tracking-wider uppercase text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Add Product Form */}
        {addProductOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-8 p-6 rounded-xl bg-secondary border border-white/5">
            <h3 className="text-sm font-medium tracking-wide mb-5 flex items-center gap-2"><Plus className="w-4 h-4" /> New Product</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Product Name *</Label><Input value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="mt-1.5 h-10 bg-white/5 border-white/10 text-sm" /></div>
              <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Category *</Label>
                <select value={newProduct.categoryId} onChange={e => setNewProduct({ ...newProduct, categoryId: e.target.value })} className="mt-1.5 h-10 w-full px-3 bg-white/5 border border-white/10 rounded-md text-sm">
                  <option value="">Select...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Price ($) *</Label><Input type="number" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} className="mt-1.5 h-10 bg-white/5 border-white/10 text-sm" /></div>
              <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Compare Price ($)</Label><Input type="number" value={newProduct.comparePrice} onChange={e => setNewProduct({ ...newProduct, comparePrice: e.target.value })} className="mt-1.5 h-10 bg-white/5 border-white/10 text-sm" /></div>
              <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Stock</Label><Input type="number" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} className="mt-1.5 h-10 bg-white/5 border-white/10 text-sm" /></div>
              <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Image URL</Label><Input value={newProduct.image} onChange={e => setNewProduct({ ...newProduct, image: e.target.value })} className="mt-1.5 h-10 bg-white/5 border-white/10 text-sm" /></div>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Description</Label>
                  <Button variant="ghost" size="sm" className="text-[10px] gap-1 h-7" onClick={aiGenerateDesc}><Sparkles className="w-3 h-3" /> AI Generate</Button>
                </div>
                <textarea value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} rows={3} className="mt-1.5 w-full p-3 bg-white/5 border border-white/10 rounded-md text-sm resize-none" />
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Tags</Label>
                  <Button variant="ghost" size="sm" className="text-[10px] gap-1 h-7" onClick={aiGenerateTags}><Sparkles className="w-3 h-3" /> AI Generate</Button>
                </div>
                <Input value={newProduct.tags} onChange={e => setNewProduct({ ...newProduct, tags: e.target.value })} className="mt-1.5 h-10 bg-white/5 border-white/10 text-sm" placeholder="luxury, premium, handmade" />
              </div>
            </div>
            <Button className="mt-4 bg-foreground text-background text-xs tracking-wider" onClick={createProduct}>Create Product</Button>
          </motion.div>
        )}

        {/* Tabs: Products / Orders */}
        <Tabs defaultValue="products">
          <TabsList className="bg-secondary h-10 p-1">
            <TabsTrigger value="products" className="text-xs tracking-wider h-8 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-md">Products ({sellerProducts.length})</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs tracking-wider h-8 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-md">Orders ({sellerOrders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-6">
            {sellerProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No products yet. Add your first product above.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sellerProducts.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="p-4 rounded-xl bg-secondary border border-white/5 hover:border-white/10 cursor-pointer transition-colors" onClick={() => selectProduct(p)}>
                    <div className="w-full aspect-video rounded-lg overflow-hidden bg-background relative mb-3"><Image src={p.image} alt={p.name} fill className="object-cover" /></div>
                    <div className="flex items-start justify-between">
                      <div><h4 className="text-sm font-medium">{p.name}</h4><p className="text-xs text-muted-foreground mt-0.5">{p.category?.name} • {p.stock} in stock</p></div>
                      <span className="text-sm font-light">${p.price.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-[9px]">{p.salesCount} sold</Badge>
                      {p.aiGenerated && <Badge variant="outline" className="text-[9px] gap-1 border-white/10"><Sparkles className="w-2.5 h-2.5" /> AI</Badge>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            {sellerOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No orders yet.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sellerOrders.map(o => (
                  <div key={o.id} className="p-4 rounded-xl bg-secondary border border-white/5 hover:border-white/10 cursor-pointer transition-colors" onClick={() => useStore.getState().selectOrder(o)}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-3"><p className="text-sm font-medium">{o.orderNumber}</p><Badge variant="outline" className={`text-[9px] ${statusColors[o.status] || ''}`}>{o.status}</Badge></div>
                        <p className="text-xs text-muted-foreground mt-1">{o.user?.name} • {new Date(o.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-light">${o.totalAmount.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">{o.items.length} item{o.items.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}