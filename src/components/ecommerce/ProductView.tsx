'use client';

import { useEffect, useState } from 'react';
import { useStore, authHeaders } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Heart, ShoppingBag, ArrowLeft, Sparkles, Truck, Shield, RotateCcw, Minus, Plus, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export function ProductView() {
  const { selectedProduct: product, user, showToast, wishlistIds, toggleWishlist, setJustAddedToCart, setCart, goBack } = useStore();
  const [qty, setQty] = useState(1);
  const [reviews, setReviews] = useState<any[]>([]);
  const [aiDesc, setAiDesc] = useState('');
  const [showAiDesc, setShowAiDesc] = useState(false);

  useEffect(() => {
    if (!product) return;
    fetch(`/api/reviews?productId=${product.id}`).then(r => r.json()).then(setReviews);
  }, [product?.id]);

  if (!product) return <div className="pt-24 text-center">Product not found</div>;

  const discount = product.comparePrice ? Math.round((1 - product.price / product.comparePrice) * 100) : 0;

  const addToCart = async () => {
    if (!user) { useStore.getState().setView('auth'); return; }
    setJustAddedToCart(product.id);
    await fetch('/api/cart', { method: 'POST', headers: authHeaders(useStore.getState), body: JSON.stringify({ productId: product.id, quantity: qty }) });
    const res = await fetch('/api/cart', { headers: authHeaders(useStore.getState) });
    setCart(await res.json());
    showToast(`${product.name} added to bag`);
  };

  const generateAiDesc = async () => {
    setShowAiDesc(true);
    const res = await fetch('/api/ai/describe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productName: product.name, productDetails: product.description, type: 'description' }),
    });
    const data = await res.json();
    setAiDesc(data.result);
  };

  const isWished = wishlistIds.has(product.id);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <button onClick={goBack} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Image */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-secondary">
              <Image src={product.image} alt={product.name} fill className="object-cover" priority />
              {discount > 0 && <Badge className="absolute top-4 left-4 bg-foreground text-background text-xs">-{discount}%</Badge>}
              {product.aiTags && <Badge variant="secondary" className="absolute top-4 right-4 text-[10px] gap-1"><Sparkles className="w-3 h-3" /> {product.aiTags}</Badge>}
            </div>
          </motion.div>

          {/* Details */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">{product.category?.name}</p>
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight">{product.name}</h1>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1"><Star className="w-4 h-4 fill-foreground text-foreground" /><span className="text-sm">{product.rating}</span></div>
                <span className="text-xs text-muted-foreground">{product.reviewCount} reviews</span>
                <span className="text-xs text-muted-foreground">{product.salesCount} sold</span>
              </div>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-light">${product.price.toLocaleString()}</span>
              {product.comparePrice && (
                <span className="text-lg text-muted-foreground line-through">${product.comparePrice.toLocaleString()}</span>
              )}
            </div>

            <Separator className="bg-white/5" />

            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>

            {/* AI Enhancement */}
            <div className="p-4 rounded-lg bg-secondary border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs tracking-wider uppercase font-medium">AI Enhanced Description</span>
              </div>
              {showAiDesc ? (
                <p className="text-xs text-muted-foreground leading-relaxed">{aiDesc || 'Generating...'}</p>
              ) : (
                <Button variant="outline" size="sm" className="border-white/10 text-xs h-8" onClick={generateAiDesc}>
                  <Sparkles className="w-3 h-3 mr-2" /> Generate AI Description
                </Button>
              )}
            </div>

            {/* Quantity & Add to Cart */}
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-white/10 rounded-lg">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="w-4 h-4" /></Button>
                <span className="w-12 text-center text-sm font-medium">{qty}</span>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none" onClick={() => setQty(Math.min(product.stock, qty + 1))}><Plus className="w-4 h-4" /></Button>
              </div>
              <Button className="flex-1 h-12 bg-foreground text-background text-xs tracking-[0.2em] uppercase rounded-lg hover:bg-foreground/90" onClick={addToCart}>
                <ShoppingBag className="w-4 h-4 mr-2" /> Add to Bag — ${((product.price * qty) || 0).toLocaleString()}
              </Button>
              <Button variant="outline" size="icon" className={`h-12 w-12 rounded-lg border-white/10 ${isWished ? 'bg-foreground text-background' : ''}`} onClick={() => {
                if (!user) { useStore.getState().setView('auth'); return; }
                toggleWishlist(product.id);
                showToast(isWished ? 'Removed from wishlist' : 'Added to wishlist', 'info');
              }}>
                <Heart className={`w-4 h-4 ${isWished ? 'fill-current' : ''}`} />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'} • Free shipping on orders over $2,000</p>

            {/* Guarantees */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              {[{ icon: Truck, label: 'Free Shipping' }, { icon: Shield, label: 'Authenticity' }, { icon: RotateCcw, label: '30-Day Returns' }].map((g, i) => (
                <div key={i} className="text-center p-3 rounded-lg bg-secondary/50">
                  <g.icon className="w-4 h-4 mx-auto mb-1.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground tracking-wide">{g.label}</span>
                </div>
              ))}
            </div>

            {/* Tags */}
            {product.tags && (
              <div className="flex flex-wrap gap-2 pt-2">
                {product.tags.split(',').map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] tracking-wide">{tag.trim()}</Badge>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Reviews */}
        <div className="mt-16">
          <h2 className="text-xl font-light tracking-tight mb-6">Reviews ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <div className="text-center py-12 bg-secondary rounded-xl border border-white/5">
              <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review this product.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((r: any) => (
                <div key={r.id} className="p-4 rounded-lg bg-secondary border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium">{r.user?.name?.charAt(0) || 'U'}</div>
                      <div>
                        <p className="text-sm font-medium">{r.user?.name || 'User'}</p>
                        <div className="flex items-center gap-1 mt-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'fill-foreground text-foreground' : 'text-muted-foreground'}`} />)}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.title && <p className="text-sm font-medium mt-2">{r.title}</p>}
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
